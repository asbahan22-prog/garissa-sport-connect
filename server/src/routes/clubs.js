import express from 'express';
import { Club, Team, TeamMember, User } from '../models.js';
import { asyncHandler, authorize, fail, ok, optionalProtect, protect } from '../middleware.js';
import { escapeRegex, notify, pageQuery, sameId } from '../utils.js';

const router = express.Router();

function canEditClub(user, club) {
  return user.role === 'super_admin' || sameId(club.admin, user._id);
}

router.get(
  '/mine',
  protect,
  authorize('club_admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'super_admin' ? {} : { admin: req.user._id };
    const clubs = await Club.find(filter).sort({ createdAt: -1 }).populate('admin', 'name email');
    return ok(res, clubs);
  })
);

router.get(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageQuery(req);
    const filter = {};
    const seeAll = req.user && (req.user.role === 'super_admin' || req.query.mine === 'true');
    if (req.query.mine === 'true' && req.user?.role === 'club_admin') filter.admin = req.user._id;
    else if (!seeAll) filter.verificationStatus = 'verified';
    if (req.query.sport && req.query.sport !== 'multi') filter.sport = { $in: [req.query.sport, 'multi'] };
    if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
    if (req.query.subCounty) filter.subCounty = req.query.subCounty;

    const [total, clubs] = await Promise.all([
      Club.countDocuments(filter),
      Club.find(filter).sort({ name: 1 }).skip(skip).limit(limit).populate('admin', 'name'),
    ]);
    const ids = clubs.map((club) => club._id);
    const teams = await Team.find({ club: { $in: ids } }).select('club');
    const counts = teams.reduce((map, team) => {
      const key = String(team.club);
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());

    return ok(res, {
      items: clubs.map((club) => ({
        id: club._id,
        name: club.name,
        description: club.description,
        sport: club.sport,
        location: club.location,
        subCounty: club.subCounty,
        founded: club.founded,
        contactEmail: club.verificationStatus === 'verified' ? club.contactEmail : '',
        contactPhone: club.verificationStatus === 'verified' ? club.contactPhone : '',
        logoUrl: club.logoUrl,
        verificationStatus: club.verificationStatus,
        verificationNote: canEditClub(req.user || {}, club) ? club.verificationNote : '',
        adminName: club.admin?.name || '',
        teamCount: counts.get(String(club._id)) || 0,
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
    const club = await Club.findById(req.params.id).populate('admin', 'name email');
    if (!club) return fail(res, 404, 'Club not found.');
    const editor = req.user && canEditClub(req.user, club);
    if (club.verificationStatus !== 'verified' && !editor) return fail(res, 404, 'Club not found.');
    const teams = await Team.find({ club: club._id }).populate('coach', 'name');
    const members = await TeamMember.find({ team: { $in: teams.map((team) => team._id) }, status: 'active' })
      .populate('athlete', 'name subCounty');
    return ok(res, {
      id: club._id,
      name: club.name,
      description: club.description,
      sport: club.sport,
      location: club.location,
      subCounty: club.subCounty,
      founded: club.founded,
      contactEmail: editor || club.verificationStatus === 'verified' ? club.contactEmail : '',
      contactPhone: editor || club.verificationStatus === 'verified' ? club.contactPhone : '',
      logoUrl: club.logoUrl,
      verificationStatus: club.verificationStatus,
      verificationNote: editor ? club.verificationNote : '',
      adminName: club.admin?.name || '',
      owned: Boolean(editor),
      teams: teams.map((team) => ({
        id: team._id,
        name: team.name,
        sport: team.sport,
        homeGround: team.homeGround,
        coach: team.coach?.name || 'Coach not assigned',
        players: members.filter((member) => String(member.team) === String(team._id)).map((member) => member.athlete?.name).filter(Boolean),
      })),
    });
  })
);

router.post(
  '/',
  protect,
  authorize('club_admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { name, description, sport, location, subCounty, founded, contactEmail, contactPhone, logoUrl } = req.body;
    if (!name || String(name).trim().length < 3) return fail(res, 400, 'Enter the club name.');
    let adminId = req.user._id;
    if (req.user.role === 'super_admin' && req.body.adminEmail) {
      const admin = await User.findOne({ email: String(req.body.adminEmail).toLowerCase(), role: 'club_admin' });
      if (!admin) return fail(res, 400, 'No club administrator account uses that email.');
      adminId = admin._id;
    }
    const club = await Club.create({
      name: String(name).trim(),
      description: String(description || '').slice(0, 2000),
      sport: sport || 'multi',
      location: location || '',
      subCounty: subCounty || '',
      founded: founded ? Number(founded) : undefined,
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      logoUrl: logoUrl || '',
      admin: adminId,
      verificationStatus: req.user.role === 'super_admin' ? 'verified' : 'pending',
    });
    if (club.verificationStatus === 'pending') {
      const { notifyAdmins } = await import('../utils.js');
      await notifyAdmins({
        title: 'Club awaiting verification',
        message: `${club.name} was submitted and needs review.`,
        type: 'club',
        link: '/app/admin',
      });
    }
    return ok(res, club, 'Club submitted.', 201);
  })
);

router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const club = await Club.findById(req.params.id);
    if (!club) return fail(res, 404, 'Club not found.');
    if (!canEditClub(req.user, club)) return fail(res, 403, 'You cannot edit this club.');
    const fields = ['name', 'description', 'sport', 'location', 'subCounty', 'contactEmail', 'contactPhone', 'logoUrl'];
    for (const field of fields) {
      if (req.body[field] !== undefined) club[field] = req.body[field];
    }
    if (req.body.founded !== undefined) club.founded = req.body.founded ? Number(req.body.founded) : undefined;
    if (req.user.role !== 'super_admin' && club.verificationStatus === 'rejected') {
      club.verificationStatus = 'pending';
    }
    await club.save();
    return ok(res, club, 'Club updated.');
  })
);

router.patch(
  '/:id/verification',
  protect,
  authorize('super_admin'),
  asyncHandler(async (req, res) => {
    const club = await Club.findById(req.params.id);
    if (!club) return fail(res, 404, 'Club not found.');
    if (!['verified', 'rejected', 'pending'].includes(req.body.status)) {
      return fail(res, 400, 'Status must be verified, rejected, or pending.');
    }
    club.verificationStatus = req.body.status;
    club.verificationNote = String(req.body.note || '').slice(0, 300);
    await club.save();
    await notify(club.admin, {
      title: `Club ${club.verificationStatus}`,
      message: `${club.name} is now ${club.verificationStatus}. ${club.verificationNote}`.trim(),
      type: 'club',
      link: '/app/club',
    });
    return ok(res, club, 'Verification updated.');
  })
);

export default router;
