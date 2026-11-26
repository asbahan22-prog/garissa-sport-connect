import express from 'express';
import {
  Application,
  AthleteProfile,
  Club,
  Match,
  Opportunity,
  Report,
  Team,
  Tournament,
  User,
} from '../models.js';
import { asyncHandler, authorize, fail, ok, protect } from '../middleware.js';
import { escapeRegex, notify } from '../utils.js';

const router = express.Router();

router.use(protect, authorize('super_admin'));

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, athletes, clubs, teams, tournaments, matches, opportunities, applications, openReports, recentUsers] = await Promise.all([
      User.countDocuments(),
      AthleteProfile.countDocuments(),
      Club.countDocuments(),
      Team.countDocuments(),
      Tournament.countDocuments(),
      Match.countDocuments(),
      Opportunity.countDocuments(),
      Application.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email role createdAt isSuspended'),
    ]);
    const roles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const sports = await AthleteProfile.aggregate([
      { $match: { sport: { $ne: '' } } },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return ok(res, {
      totals: { users, athletes, clubs, teams, tournaments, matches, opportunities, applications, openReports },
      usersByRole: roles.map((row) => ({ role: row._id, count: row.count })),
      athletesBySport: sports.map((row) => ({ sport: row._id, count: row.count })),
      recentUsers,
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      const expression = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: expression }, { email: expression }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
    return ok(res, users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subCounty: user.subCounty,
      isSuspended: user.isSuspended,
      suspensionReason: user.suspensionReason,
      createdAt: user.createdAt,
    })));
  })
);

router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, 'User not found.');
    if (String(user._id) === String(req.user._id) && req.body.isSuspended) {
      return fail(res, 400, 'You cannot suspend your own account.');
    }
    const roles = ['athlete', 'coach', 'scout', 'club_admin', 'organizer', 'super_admin'];
    if (req.body.role) {
      if (!roles.includes(req.body.role)) return fail(res, 400, 'Unknown role.');
      if (String(user._id) === String(req.user._id) && req.body.role !== 'super_admin') {
        return fail(res, 400, 'You cannot remove your own administrator access.');
      }
      user.role = req.body.role;
    }
    if (req.body.isSuspended !== undefined) {
      user.isSuspended = Boolean(req.body.isSuspended);
      user.suspensionReason = user.isSuspended ? String(req.body.suspensionReason || 'Suspended by an administrator.').slice(0, 300) : '';
      if (user.isSuspended) user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await user.save();
    if (user.isSuspended) {
      await notify(user._id, {
        title: 'Account suspended',
        message: user.suspensionReason,
        type: 'account',
        link: '/contact',
      });
    }
    return ok(res, { id: user._id, role: user.role, isSuspended: user.isSuspended }, 'User updated.');
  })
);

router.get(
  '/clubs',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.verificationStatus = req.query.status;
    const clubs = await Club.find(filter).sort({ createdAt: -1 }).populate('admin', 'name email').limit(100);
    return ok(res, clubs);
  })
);

router.get(
  '/reports',
  asyncHandler(async (_req, res) => {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100).populate('reporter', 'name email');
    return ok(res, reports);
  })
);

router.patch(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const report = await Report.findById(req.params.id);
    if (!report) return fail(res, 404, 'Report not found.');
    if (!['open', 'reviewed', 'dismissed'].includes(req.body.status)) return fail(res, 400, 'Invalid report status.');
    report.status = req.body.status;
    await report.save();
    return ok(res, report, 'Report updated.');
  })
);

export default router;
