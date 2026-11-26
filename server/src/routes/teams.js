import express from 'express';
import {
  AthleteProfile,
  Attendance,
  Club,
  Team,
  TeamMember,
  TrainingSession,
  User,
} from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import { isMinorDob, isTeamManager, notify, sameId } from '../utils.js';

const router = express.Router();

async function loadTeam(id) {
  return Team.findById(id).populate('coach', 'name email').populate({
    path: 'club',
    select: 'name admin verificationStatus',
  });
}

async function assertManager(req, team) {
  if (!team) {
    const error = new Error('Team not found.');
    error.status = 404;
    throw error;
  }
  if (!isTeamManager(req.user, team)) {
    const error = new Error('You do not manage this team.');
    error.status = 403;
    throw error;
  }
}

router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    let teams = [];
    if (req.user.role === 'coach') {
      teams = await Team.find({ coach: req.user._id }).populate('club', 'name verificationStatus').sort({ name: 1 });
    } else if (req.user.role === 'club_admin') {
      const clubs = await Club.find({ admin: req.user._id }).select('_id');
      teams = await Team.find({ club: { $in: clubs.map((club) => club._id) } }).populate('club', 'name verificationStatus').sort({ name: 1 });
    } else if (req.user.role === 'athlete') {
      const memberships = await TeamMember.find({ athlete: req.user._id, status: 'active' }).select('team');
      teams = await Team.find({ _id: { $in: memberships.map((item) => item.team) } }).populate('club', 'name').populate('coach', 'name');
    } else if (req.user.role === 'super_admin') {
      teams = await Team.find().populate('club', 'name').populate('coach', 'name').sort({ name: 1 }).limit(100);
    } else {
      return fail(res, 403, 'Your role does not have a team list.');
    }
    const counts = await TeamMember.aggregate([
      { $match: { team: { $in: teams.map((team) => team._id) }, status: 'active' } },
      { $group: { _id: '$team', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
    return ok(
      res,
      teams.map((team) => ({
        id: team._id,
        name: team.name,
        sport: team.sport,
        description: team.description,
        homeGround: team.homeGround,
        club: team.club ? { id: team.club._id, name: team.club.name, verificationStatus: team.club.verificationStatus } : null,
        coach: team.coach?.name || '',
        playerCount: countMap.get(String(team._id)) || 0,
      }))
    );
  })
);

router.get(
  '/:id',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    if (!team) return fail(res, 404, 'Team not found.');
    const manager = req.user && isTeamManager(req.user, team);
    const membership = req.user ? await TeamMember.findOne({ team: team._id, athlete: req.user._id }) : null;
    if (team.club && team.club.verificationStatus !== 'verified' && !manager) {
      return fail(res, 404, 'Team not found.');
    }

    const members = await TeamMember.find({ team: team._id, status: 'active' })
      .populate('athlete', manager ? 'name email phone subCounty dateOfBirth guardian' : 'name subCounty dateOfBirth')
      .sort({ jerseyNumber: 1, createdAt: 1 });
    const profiles = await AthleteProfile.find({ user: { $in: members.map((member) => member.athlete?._id).filter(Boolean) } })
      .select('user sport position isMinor visibility');
    const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

    const roster = members
      .filter((member) => {
        const profile = profileMap.get(String(member.athlete?._id));
        if (manager || membership) return true;
        return profile && !profile.isMinor && profile.visibility === 'public';
      })
      .map((member) => {
        const profile = profileMap.get(String(member.athlete?._id));
        const minor = Boolean(profile?.isMinor || isMinorDob(member.athlete?.dateOfBirth));
        return {
          id: member._id,
          athleteId: member.athlete?._id,
          profileId: profile?._id || null,
          name: member.athlete?.name || 'Player',
          email: manager ? member.athlete?.email || '' : '',
          subCounty: member.athlete?.subCounty || '',
          sport: profile?.sport || team.sport,
          position: profile?.position || '',
          jerseyNumber: member.jerseyNumber ?? null,
          squadRole: member.squadRole,
          isMinor: manager || membership ? minor : false,
          guardian: manager && minor ? member.athlete?.guardian || null : null,
        };
      });

    return ok(res, {
      id: team._id,
      name: team.name,
      sport: team.sport,
      description: team.description,
      homeGround: team.homeGround,
      club: team.club ? { id: team.club._id, name: team.club.name } : null,
      coach: team.coach ? { id: team.coach._id, name: team.coach.name, email: manager ? team.coach.email : '' } : null,
      managed: Boolean(manager),
      member: Boolean(membership),
      roster,
    });
  })
);

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { name, sport, description, homeGround, clubId, coachEmail } = req.body;
    if (!name || !sport) return fail(res, 400, 'Team name and sport are required.');
    if (!['coach', 'club_admin', 'super_admin'].includes(req.user.role)) {
      return fail(res, 403, 'Only coaches, club administrators, and super admins can create teams.');
    }

    let club = null;
    if (clubId) {
      club = await Club.findById(clubId);
      if (!club) return fail(res, 404, 'Club not found.');
      if (req.user.role !== 'super_admin' && !sameId(club.admin, req.user._id)) {
        return fail(res, 403, 'You can only add teams to a club you administer.');
      }
    } else if (req.user.role === 'club_admin') {
      return fail(res, 400, 'Choose one of your clubs for this team.');
    }

    let coach = null;
    if (req.user.role === 'coach' && !coachEmail) coach = req.user;
    if (coachEmail) {
      coach = await User.findOne({ email: String(coachEmail).toLowerCase(), role: 'coach' });
      if (!coach) return fail(res, 400, 'No coach account uses that email.');
    }

    const team = await Team.create({
      name: String(name).trim(),
      sport,
      description: String(description || '').slice(0, 1000),
      homeGround: String(homeGround || '').slice(0, 160),
      club: club?._id,
      coach: coach?._id,
      createdBy: req.user._id,
    });
    if (coach && !sameId(coach._id, req.user._id)) {
      await notify(coach._id, {
        title: 'Team assigned',
        message: `You are now the coach of ${team.name}.`,
        type: 'team',
        link: `/app/teams/${team._id}`,
      });
    }
    return ok(res, team, 'Team created.', 201);
  })
);

router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    await assertManager(req, team);
    const { name, sport, description, homeGround, coachEmail } = req.body;
    if (name) team.name = String(name).trim();
    if (sport) team.sport = sport;
    if (description !== undefined) team.description = String(description).slice(0, 1000);
    if (homeGround !== undefined) team.homeGround = String(homeGround).slice(0, 160);
    if (coachEmail) {
      const coach = await User.findOne({ email: String(coachEmail).toLowerCase(), role: 'coach' });
      if (!coach) return fail(res, 400, 'No coach account uses that email.');
      team.coach = coach._id;
      await notify(coach._id, {
        title: 'Team assigned',
        message: `You are now the coach of ${team.name}.`,
        type: 'team',
        link: `/app/teams/${team._id}`,
      });
    }
    await team.save();
    return ok(res, team, 'Team updated.');
  })
);

router.post(
  '/:id/members',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    await assertManager(req, team);
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return fail(res, 400, 'Enter the athlete email.');
    const athlete = await User.findOne({ email, role: 'athlete' });
    if (!athlete) return fail(res, 404, 'No athlete account uses that email. Ask them to register first.');
    const jerseyNumber = req.body.jerseyNumber === '' || req.body.jerseyNumber == null ? undefined : Number(req.body.jerseyNumber);
    const member = await TeamMember.create({
      team: team._id,
      athlete: athlete._id,
      jerseyNumber: Number.isFinite(jerseyNumber) ? jerseyNumber : undefined,
      squadRole: req.body.squadRole === 'captain' ? 'captain' : 'player',
    });
    if (team.club) {
      await AthleteProfile.updateOne({ user: athlete._id, club: { $in: [null, undefined] } }, { club: team.club._id || team.club });
    }
    await AthleteProfile.updateOne({ user: athlete._id, sport: '' }, { sport: team.sport });
    await notify(athlete._id, {
      title: `Added to ${team.name}`,
      message: 'A coach or club administrator added you to the squad.',
      type: 'team',
      link: '/app/athlete',
    });
    return ok(res, member, `${athlete.name} added to the squad.`, 201);
  })
);

router.delete(
  '/:id/members/:memberId',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    await assertManager(req, team);
    const member = await TeamMember.findOneAndDelete({ _id: req.params.memberId, team: team._id });
    if (!member) return fail(res, 404, 'Player not found on this team.');
    return ok(res, null, 'Player removed from the squad.');
  })
);

router.get(
  '/:id/sessions',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    if (!team) return fail(res, 404, 'Team not found.');
    const member = await TeamMember.findOne({ team: team._id, athlete: req.user._id });
    if (!isTeamManager(req.user, team) && !member && req.user.role !== 'super_admin') {
      return fail(res, 403, 'Only the squad can view this training schedule.');
    }
    const sessions = await TrainingSession.find({ team: team._id }).sort({ startsAt: -1 });
    return ok(res, sessions);
  })
);

router.post(
  '/:id/sessions',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    await assertManager(req, team);
    const { title, startsAt, location, notes } = req.body;
    if (!title || !startsAt) return fail(res, 400, 'Title and date are required.');
    const when = new Date(startsAt);
    if (Number.isNaN(when.getTime())) return fail(res, 400, 'Enter a valid date and time.');
    const session = await TrainingSession.create({
      team: team._id,
      coach: req.user._id,
      title: String(title).slice(0, 140),
      startsAt: when,
      location: String(location || team.homeGround || '').slice(0, 160),
      notes: String(notes || '').slice(0, 500),
    });
    const members = await TeamMember.find({ team: team._id, status: 'active' }).select('athlete');
    await Promise.all(members.map((item) => notify(item.athlete, {
      title: `Training: ${session.title}`,
      message: `${team.name} trains ${when.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      type: 'training',
      link: '/app/athlete',
    })));
    return ok(res, session, 'Training session scheduled.', 201);
  })
);

router.get(
  '/sessions/:sessionId/attendance',
  protect,
  asyncHandler(async (req, res) => {
    const session = await TrainingSession.findById(req.params.sessionId);
    if (!session) return fail(res, 404, 'Training session not found.');
    const team = await loadTeam(session.team);
    await assertManager(req, team);
    const [members, records] = await Promise.all([
      TeamMember.find({ team: team._id, status: 'active' }).populate('athlete', 'name'),
      Attendance.find({ session: session._id }),
    ]);
    const recordMap = new Map(records.map((record) => [String(record.athlete), record.status]));
    return ok(res, {
      session,
      roster: members.map((member) => ({
        athleteId: member.athlete?._id,
        name: member.athlete?.name || 'Player',
        status: recordMap.get(String(member.athlete?._id)) || '',
      })),
    });
  })
);

router.post(
  '/sessions/:sessionId/attendance',
  protect,
  asyncHandler(async (req, res) => {
    const session = await TrainingSession.findById(req.params.sessionId);
    if (!session) return fail(res, 404, 'Training session not found.');
    const team = await loadTeam(session.team);
    await assertManager(req, team);
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    const allowed = new Set(['present', 'absent', 'late', 'excused']);
    for (const record of records) {
      if (!allowed.has(record.status)) continue;
      await Attendance.findOneAndUpdate(
        { session: session._id, athlete: record.athleteId },
        { status: record.status },
        { upsert: true, new: true }
      );
    }
    return ok(res, null, 'Attendance saved.');
  })
);

router.get(
  '/:id/attendance-summary',
  protect,
  asyncHandler(async (req, res) => {
    const team = await loadTeam(req.params.id);
    await assertManager(req, team);
    const [sessions, members] = await Promise.all([
      TrainingSession.find({ team: team._id }).select('_id'),
      TeamMember.find({ team: team._id, status: 'active' }).populate('athlete', 'name'),
    ]);
    const records = await Attendance.find({ session: { $in: sessions.map((session) => session._id) } });
    const summary = members.map((member) => {
      const mine = records.filter((record) => sameId(record.athlete, member.athlete?._id));
      const present = mine.filter((record) => record.status === 'present' || record.status === 'late').length;
      return {
        athleteId: member.athlete?._id,
        name: member.athlete?.name || 'Player',
        marked: mine.length,
        present,
        rate: mine.length ? Math.round((present / mine.length) * 100) : null,
      };
    });
    return ok(res, { sessions: sessions.length, players: summary });
  })
);

export default router;
