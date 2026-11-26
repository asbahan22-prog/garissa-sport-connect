import express from 'express';
import { Application, AthleteProfile, Opportunity, User } from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import { escapeRegex, notify, pageQuery, sameId } from '../utils.js';

const router = express.Router();
const posterRoles = ['organizer', 'club_admin', 'scout', 'super_admin'];

function owns(user, opportunity) {
  return user?.role === 'super_admin' || sameId(opportunity.postedBy, user?._id);
}

router.get(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageQuery(req);
    const filter = {};
    if (req.query.mine === 'true' && req.user) filter.postedBy = req.user._id;
    else if (!(req.user?.role === 'super_admin' && req.query.all === 'true')) filter.status = 'published';
    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), 'i');
    const [total, items] = await Promise.all([
      Opportunity.countDocuments(filter),
      Opportunity.find(filter).sort({ deadline: 1, createdAt: -1 }).skip(skip).limit(limit).populate('postedBy', 'name'),
    ]);
    return ok(res, {
      items: items.map(present),
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  })
);

router.get(
  '/mine/posted',
  protect,
  asyncHandler(async (req, res) => {
    const items = await Opportunity.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    return ok(res, items.map(present));
  })
);

router.get(
  '/:id',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const opportunity = await Opportunity.findById(req.params.id).populate('postedBy', 'name');
    if (!opportunity) return fail(res, 404, 'Opportunity not found.');
    if (opportunity.status !== 'published' && !owns(req.user, opportunity)) return fail(res, 404, 'Opportunity not found.');
    const data = present(opportunity);
    data.owned = owns(req.user, opportunity);
    if (req.user?.role === 'athlete') {
      const application = await Application.findOne({ opportunity: opportunity._id, athlete: req.user._id });
      data.application = application ? { id: application._id, status: application.status, message: application.message } : null;
    }
    return ok(res, data);
  })
);

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    if (!posterRoles.includes(req.user.role)) return fail(res, 403, 'Your role cannot publish opportunities.');
    const { title, type, sport, description, requirements, organization, location, deadline, status } = req.body;
    if (!title || !type || !sport || !description) return fail(res, 400, 'Title, type, sport, and description are required.');
    if (!['trial', 'scholarship', 'recruitment', 'other'].includes(type)) return fail(res, 400, 'Choose a valid opportunity type.');
    const opportunity = await Opportunity.create({
      title: String(title).trim(),
      type,
      sport,
      description: String(description).slice(0, 3000),
      requirements: String(requirements || '').slice(0, 1000),
      organization: String(organization || '').slice(0, 160),
      location: String(location || 'Garissa').slice(0, 160),
      deadline: deadline ? new Date(deadline) : undefined,
      postedBy: req.user._id,
      status: status === 'draft' ? 'draft' : 'published',
    });
    if (opportunity.status === 'published') {
      const athletes = await User.find({ role: 'athlete', isSuspended: false }).select('_id');
      const profiles = await AthleteProfile.find({
        user: { $in: athletes.map((athlete) => athlete._id) },
        sport: opportunity.sport,
        discoverable: true,
      }).select('user');
      await Promise.all(profiles.slice(0, 200).map((profile) => notify(profile.user, {
        title: 'New opportunity',
        message: opportunity.title,
        type: 'opportunity',
        link: `/opportunities/${opportunity._id}`,
      })));
    }
    return ok(res, present(opportunity), 'Opportunity saved.', 201);
  })
);

router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return fail(res, 404, 'Opportunity not found.');
    if (!owns(req.user, opportunity)) return fail(res, 403, 'You cannot edit this opportunity.');
    const fields = ['title', 'type', 'sport', 'description', 'requirements', 'organization', 'location', 'status'];
    for (const field of fields) {
      if (req.body[field] !== undefined) opportunity[field] = req.body[field];
    }
    if (req.body.deadline !== undefined) opportunity.deadline = req.body.deadline ? new Date(req.body.deadline) : undefined;
    await opportunity.save();
    return ok(res, present(opportunity), 'Opportunity updated.');
  })
);

router.get(
  '/:id/applications',
  protect,
  asyncHandler(async (req, res) => {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return fail(res, 404, 'Opportunity not found.');
    if (!owns(req.user, opportunity)) return fail(res, 403, 'You cannot view these applications.');
    const applications = await Application.find({ opportunity: opportunity._id })
      .populate('athlete', 'name email subCounty')
      .sort({ createdAt: -1 });
    const profiles = await AthleteProfile.find({ user: { $in: applications.map((item) => item.athlete?._id) } }).select('user sport position isMinor');
    const map = new Map(profiles.map((profile) => [String(profile.user), profile]));
    return ok(res, applications.map((application) => ({
      id: application._id,
      message: application.message,
      status: application.status,
      createdAt: application.createdAt,
      athlete: {
        id: application.athlete?._id,
        name: application.athlete?.name,
        email: application.athlete?.email,
        subCounty: application.athlete?.subCounty,
        profileId: map.get(String(application.athlete?._id))?._id || null,
        sport: map.get(String(application.athlete?._id))?.sport || '',
        position: map.get(String(application.athlete?._id))?.position || '',
        isMinor: Boolean(map.get(String(application.athlete?._id))?.isMinor),
      },
    })));
  })
);

router.post(
  '/:id/apply',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'athlete') return fail(res, 403, 'Only athletes can apply.');
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity || opportunity.status !== 'published') return fail(res, 404, 'This opportunity is not open.');
    if (opportunity.deadline && new Date(opportunity.deadline) < new Date()) return fail(res, 400, 'The deadline has passed.');
    const profile = await AthleteProfile.findOne({ user: req.user._id });
    if (!profile?.sport) return fail(res, 400, 'Add your sport to your profile before applying.');
    const application = await Application.create({
      opportunity: opportunity._id,
      athlete: req.user._id,
      message: String(req.body.message || '').slice(0, 1000),
    });
    await notify(opportunity.postedBy, {
      title: 'New application',
      message: `${req.user.name} applied for ${opportunity.title}.`,
      type: 'application',
      link: `/app/opportunities/${opportunity._id}`,
    });
    return ok(res, application, 'Application submitted.', 201);
  })
);

const applicationRouter = express.Router();

applicationRouter.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'athlete') return fail(res, 403, 'Only athletes have applications.');
    const applications = await Application.find({ athlete: req.user._id }).populate('opportunity').sort({ createdAt: -1 });
    return ok(res, applications.map((application) => ({
      id: application._id,
      message: application.message,
      status: application.status,
      createdAt: application.createdAt,
      opportunity: application.opportunity ? present(application.opportunity) : null,
    })));
  })
);

applicationRouter.patch(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('opportunity');
    if (!application) return fail(res, 404, 'Application not found.');
    if (!owns(req.user, application.opportunity)) return fail(res, 403, 'You cannot review this application.');
    if (!['submitted', 'reviewing', 'accepted', 'rejected'].includes(req.body.status)) {
      return fail(res, 400, 'Invalid application status.');
    }
    application.status = req.body.status;
    await application.save();
    await notify(application.athlete, {
      title: 'Application update',
      message: `Your application for ${application.opportunity.title} is now ${application.status}.`,
      type: 'application',
      link: '/app/athlete/applications',
    });
    return ok(res, application, 'Application updated.');
  })
);

function present(opportunity) {
  const source = opportunity.toObject ? opportunity.toObject() : opportunity;
  return {
    id: source._id,
    title: source.title,
    type: source.type,
    sport: source.sport,
    description: source.description,
    requirements: source.requirements || '',
    organization: source.organization || '',
    location: source.location || '',
    deadline: source.deadline || null,
    status: source.status,
    postedBy: source.postedBy?.name || '',
    createdAt: source.createdAt,
  };
}

export { applicationRouter };
export default router;
