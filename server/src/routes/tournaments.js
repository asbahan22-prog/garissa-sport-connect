import express from 'express';
import {
  Match,
  Registration,
  Team,
  TeamMember,
  Tournament,
  User,
} from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import { computeStandings, escapeRegex, isTeamManager, notifyMany, pageQuery, roundRobin, sameId } from '../utils.js';

const router = express.Router();

function canOrganize(user, tournament) {
  return user && (user.role === 'super_admin' || sameId(tournament.organizer, user._id));
}

async function managedTeamIds(user) {
  if (!user) return [];
  if (user.role === 'super_admin') {
    const all = await Team.find().select('_id');
    return all.map((team) => String(team._id));
  }
  if (user.role === 'coach') {
    const teams = await Team.find({ coach: user._id }).select('_id');
    return teams.map((team) => String(team._id));
  }
  if (user.role === 'club_admin') {
    const teams = await Team.find().populate('club', 'admin');
    return teams.filter((team) => sameId(team.club?.admin, user._id)).map((team) => String(team._id));
  }
  return [];
}

router.get(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageQuery(req);
    const filter = {};
    if (req.query.mine === 'true' && req.user) {
      if (req.user.role === 'organizer') filter.organizer = req.user._id;
      else if (req.user.role !== 'super_admin') filter.organizer = req.user._id;
    } else if (!(req.user?.role === 'super_admin' && req.query.all === 'true')) {
      filter.status = { $ne: 'draft' };
    }
    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
    const [total, items] = await Promise.all([
      Tournament.countDocuments(filter),
      Tournament.find(filter).sort({ startDate: -1, createdAt: -1 }).skip(skip).limit(limit).populate('organizer', 'name'),
    ]);
    return ok(res, {
      items: items.map((item) => ({
        id: item._id,
        name: item.name,
        sport: item.sport,
        description: item.description,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        format: item.format,
        status: item.status,
        maxTeams: item.maxTeams,
        organizer: item.organizer?.name || '',
      })),
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  })
);

router.get(
  '/:id',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id).populate('organizer', 'name');
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    const organizer = canOrganize(req.user, tournament);
    if (tournament.status === 'draft' && !organizer) return fail(res, 404, 'Tournament not found.');

    const [registrations, matches] = await Promise.all([
      Registration.find({ tournament: tournament._id }).populate({
        path: 'team',
        select: 'name sport coach club',
        populate: { path: 'club', select: 'name admin' },
      }),
      Match.find({ tournament: tournament._id })
        .populate('homeTeam', 'name')
        .populate('awayTeam', 'name')
        .sort({ scheduledAt: 1, round: 1 }),
    ]);

    const visibleRegistrations = organizer ? registrations : registrations.filter((item) => item.status === 'approved');
    const approvedTeams = registrations.filter((item) => item.status === 'approved').map((item) => item.team).filter(Boolean);
    const standings = tournament.format === 'league' ? computeStandings(approvedTeams, matches) : [];
    const myTeamIds = await managedTeamIds(req.user);

    return ok(res, {
      id: tournament._id,
      name: tournament.name,
      sport: tournament.sport,
      description: tournament.description,
      rules: tournament.rules,
      location: tournament.location,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      format: tournament.format,
      status: tournament.status,
      maxTeams: tournament.maxTeams,
      organizer: tournament.organizer?.name || '',
      managed: organizer,
      registrations: visibleRegistrations.map((item) => ({
        id: item._id,
        status: item.status,
        team: item.team ? { id: item.team._id, name: item.team.name, sport: item.team.sport } : null,
        canManage: item.team ? myTeamIds.includes(String(item.team._id)) : false,
      })),
      matches: matches.map((match) => ({
        id: match._id,
        round: match.round,
        scheduledAt: match.scheduledAt,
        venue: match.venue,
        status: match.status,
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
        homeTeam: match.homeTeam ? { id: match.homeTeam._id, name: match.homeTeam.name } : null,
        awayTeam: match.awayTeam ? { id: match.awayTeam._id, name: match.awayTeam.name } : null,
      })),
      standings,
    });
  })
);

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    if (!['organizer', 'super_admin'].includes(req.user.role)) {
      return fail(res, 403, 'Only tournament organizers can create competitions.');
    }
    const { name, sport, description, rules, location, startDate, endDate, format, maxTeams, status } = req.body;
    if (!name || !sport) return fail(res, 400, 'Tournament name and sport are required.');
    const tournament = await Tournament.create({
      name: String(name).trim(),
      sport,
      organizer: req.user._id,
      description: String(description || '').slice(0, 2000),
      rules: String(rules || '').slice(0, 2000),
      location: String(location || '').slice(0, 160),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format: format === 'knockout' ? 'knockout' : 'league',
      status: ['draft', 'open', 'ongoing', 'completed'].includes(status) ? status : 'open',
      maxTeams: Math.min(64, Math.max(2, Number(maxTeams) || 16)),
    });
    return ok(res, tournament, 'Tournament created.', 201);
  })
);

router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');
    const fields = ['name', 'sport', 'description', 'rules', 'location', 'format', 'status'];
    for (const field of fields) {
      if (req.body[field] !== undefined) tournament[field] = req.body[field];
    }
    if (req.body.startDate !== undefined) tournament.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    if (req.body.endDate !== undefined) tournament.endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
    if (req.body.maxTeams !== undefined) tournament.maxTeams = Math.min(64, Math.max(2, Number(req.body.maxTeams) || 16));
    await tournament.save();
    return ok(res, tournament, 'Tournament updated.');
  })
);

router.post(
  '/:id/register',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!['open', 'ongoing'].includes(tournament.status)) return fail(res, 400, 'Registration is closed for this tournament.');
    const team = await Team.findById(req.body.teamId).populate('club', 'admin');
    if (!team) return fail(res, 404, 'Team not found.');
    if (team.sport !== tournament.sport) return fail(res, 400, 'This team plays a different sport from the tournament.');
    if (!isTeamManager(req.user, team)) return fail(res, 403, 'Only the team coach or club administrator can register the team.');
    const approvedCount = await Registration.countDocuments({ tournament: tournament._id, status: 'approved' });
    const pendingCount = await Registration.countDocuments({ tournament: tournament._id, status: { $in: ['approved', 'pending'] } });
    if (pendingCount >= tournament.maxTeams) return fail(res, 400, 'This tournament is full.');
    const registration = await Registration.create({ tournament: tournament._id, team: team._id, status: 'pending' });
    await notifyMany([tournament.organizer], {
      title: 'Team registration',
      message: `${team.name} asked to enter ${tournament.name}.`,
      type: 'tournament',
      link: `/app/tournaments/${tournament._id}`,
    });
    return ok(res, { id: registration._id, status: registration.status, approvedCount }, 'Registration submitted.', 201);
  })
);

router.patch(
  '/:id/registrations/:registrationId',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');
    if (!['approved', 'rejected', 'pending'].includes(req.body.status)) return fail(res, 400, 'Invalid registration status.');
    const registration = await Registration.findOne({ _id: req.params.registrationId, tournament: tournament._id }).populate('team', 'name coach');
    if (!registration) return fail(res, 404, 'Registration not found.');
    if (req.body.status === 'approved') {
      const approvedCount = await Registration.countDocuments({ tournament: tournament._id, status: 'approved', _id: { $ne: registration._id } });
      if (approvedCount >= tournament.maxTeams) return fail(res, 400, 'The approved team limit has been reached.');
    }
    registration.status = req.body.status;
    registration.note = String(req.body.note || '').slice(0, 300);
    await registration.save();
    if (registration.team?.coach) {
      await notifyMany([registration.team.coach], {
        title: `Registration ${registration.status}`,
        message: `${registration.team.name} is ${registration.status} for ${tournament.name}.`,
        type: 'tournament',
        link: `/tournaments/${tournament._id}`,
      });
    }
    return ok(res, registration, 'Registration updated.');
  })
);

router.post(
  '/:id/fixtures',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');
    if (tournament.format !== 'league') return fail(res, 400, 'Automatic fixtures are available for league tournaments. Add knockout matches manually.');
    const existing = await Match.countDocuments({ tournament: tournament._id });
    if (existing && req.body.force !== true) return fail(res, 409, 'Fixtures already exist. Remove them before generating a new league.');
    if (existing && req.body.force === true) await Match.deleteMany({ tournament: tournament._id });

    const registrations = await Registration.find({ tournament: tournament._id, status: 'approved' }).populate('team', 'name coach');
    const teams = registrations.map((item) => item.team).filter(Boolean);
    if (teams.length < 2) return fail(res, 400, 'Approve at least two teams before generating fixtures.');

    const rounds = roundRobin(teams.map((team) => String(team._id)));
    const doubleRound = req.body.doubleRound !== false;
    const start = tournament.startDate ? new Date(tournament.startDate) : new Date();
    const docs = [];
    const pushRound = (pairs, offset, swap) => {
      pairs.forEach((pair, index) => {
        const [first, second] = swap ? [pair[1], pair[0]] : pair;
        const when = new Date(start);
        when.setDate(when.getDate() + (offset * 7));
        when.setHours(15 + index, 0, 0, 0);
        docs.push({
          tournament: tournament._id,
          homeTeam: first,
          awayTeam: second,
          scheduledAt: when,
          venue: tournament.location || '',
          round: `Round ${offset + 1}`,
          status: 'scheduled',
        });
      });
    };
    rounds.forEach((pairs, index) => pushRound(pairs, index, false));
    if (doubleRound) rounds.forEach((pairs, index) => pushRound(pairs, rounds.length + index, true));
    const matches = await Match.insertMany(docs);
    if (tournament.status === 'open' || tournament.status === 'draft') {
      tournament.status = 'ongoing';
      await tournament.save();
    }
    const coachIds = teams.map((team) => team.coach).filter(Boolean);
    await notifyMany(coachIds, {
      title: 'Fixtures published',
      message: `${tournament.name} fixtures are now on the calendar.`,
      type: 'match',
      link: `/tournaments/${tournament._id}`,
    });
    return ok(res, { created: matches.length }, `${matches.length} fixtures created.`);
  })
);

router.post(
  '/:id/matches',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');
    const { homeTeam, awayTeam, scheduledAt, venue, round } = req.body;
    if (!homeTeam || !awayTeam || String(homeTeam) === String(awayTeam)) return fail(res, 400, 'Choose two different teams.');
    const approved = await Registration.find({
      tournament: tournament._id,
      status: 'approved',
      team: { $in: [homeTeam, awayTeam] },
    });
    if (approved.length < 2) return fail(res, 400, 'Both teams must be approved for this tournament.');
    const match = await Match.create({
      tournament: tournament._id,
      homeTeam,
      awayTeam,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      venue: venue || tournament.location || '',
      round: round || '',
      status: 'scheduled',
    });
    return ok(res, match, 'Match added.', 201);
  })
);

router.delete(
  '/:id/matches',
  protect,
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return fail(res, 404, 'Tournament not found.');
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');
    await Match.deleteMany({ tournament: tournament._id });
    return ok(res, null, 'Fixtures removed.');
  })
);

const matchRouter = express.Router();

matchRouter.patch(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const match = await Match.findById(req.params.id).populate('homeTeam', 'name coach').populate('awayTeam', 'name coach');
    if (!match) return fail(res, 404, 'Match not found.');
    const tournament = await Tournament.findById(match.tournament);
    if (!canOrganize(req.user, tournament)) return fail(res, 403, 'You do not organize this tournament.');

    if (req.body.scheduledAt !== undefined) match.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined;
    if (req.body.venue !== undefined) match.venue = String(req.body.venue).slice(0, 160);
    if (req.body.round !== undefined) match.round = String(req.body.round).slice(0, 60);
    if (req.body.status && ['scheduled', 'live', 'completed'].includes(req.body.status)) match.status = req.body.status;

    const hasScore = req.body.homeScore !== undefined || req.body.awayScore !== undefined;
    if (hasScore || match.status === 'completed') {
      const homeScore = Number(req.body.homeScore ?? match.homeScore);
      const awayScore = Number(req.body.awayScore ?? match.awayScore);
      if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 999 || awayScore > 999) {
        return fail(res, 400, 'Scores must be whole numbers from 0 to 999.');
      }
      match.homeScore = homeScore;
      match.awayScore = awayScore;
      if (req.body.status !== 'live') match.status = 'completed';
      match.recordedBy = req.user._id;
    }
    await match.save();

    if (match.status === 'completed') {
      const members = await TeamMember.find({ team: { $in: [match.homeTeam._id, match.awayTeam._id] }, status: 'active' }).select('athlete');
      await notifyMany(
        [match.homeTeam.coach, match.awayTeam.coach, ...members.map((member) => member.athlete)],
        {
          title: 'Result recorded',
          message: `${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`,
          type: 'match',
          link: `/tournaments/${tournament._id}`,
        }
      );
    }
    return ok(res, match, 'Match updated.');
  })
);

export { matchRouter };
export default router;
