import express from 'express';
import { AthleteProfile, Statistic } from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import { accessLevelForAthlete, canDiscover } from '../utils.js';

const router = express.Router();

router.get(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const athleteId = req.query.athleteId || (req.user?.role === 'athlete' ? req.user._id : null);
    if (!athleteId) return fail(res, 400, 'Choose an athlete to view statistics.');
    const profile = await AthleteProfile.findOne({ user: athleteId }).populate('user', 'name dateOfBirth isSuspended');
    if (!profile || profile.user?.isSuspended) return fail(res, 404, 'Athlete not found.');
    const level = await accessLevelForAthlete(req.user, profile);
    if (!canDiscover(level, profile)) return fail(res, 404, 'These statistics are private.');
    const items = await Statistic.find({ athlete: athleteId }).sort({ recordedAt: -1 }).limit(200);
    return ok(res, items.map(present));
  })
);

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    let athleteId = req.user.role === 'athlete' ? req.user._id : req.body.athleteId;
    if (!athleteId) return fail(res, 400, 'Choose an athlete.');
    const profile = await AthleteProfile.findOne({ user: athleteId }).populate('user');
    if (!profile) return fail(res, 404, 'Athlete profile not found.');
    if (req.user.role !== 'athlete') {
      const level = await accessLevelForAthlete(req.user, profile);
      if (!['coach', 'club', 'admin'].includes(level)) {
        return fail(res, 403, 'You can only record statistics for athletes you coach or administer.');
      }
    }
    const metrics = Array.isArray(req.body.metrics) ? req.body.metrics : [];
    const clean = metrics
      .map((metric) => ({
        key: String(metric.key || '').trim().slice(0, 40),
        value: Number(metric.value),
      }))
      .filter((metric) => metric.key && Number.isFinite(metric.value))
      .slice(0, 12);
    if (!clean.length) return fail(res, 400, 'Add at least one statistic with a name and a number.');
    const recordedAt = req.body.recordedAt ? new Date(req.body.recordedAt) : new Date();
    if (Number.isNaN(recordedAt.getTime())) return fail(res, 400, 'Enter a valid date.');
    const stat = await Statistic.create({
      athlete: athleteId,
      recordedBy: req.user._id,
      sport: req.body.sport || profile.sport,
      recordedAt,
      match: req.body.matchId || undefined,
      metrics: clean,
      notes: String(req.body.notes || '').slice(0, 300),
    });
    return ok(res, present(stat), 'Statistic recorded.', 201);
  })
);

router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const stat = await Statistic.findById(req.params.id);
    if (!stat) return fail(res, 404, 'Statistic not found.');
    const profile = await AthleteProfile.findOne({ user: stat.athlete }).populate('user');
    const level = profile ? await accessLevelForAthlete(req.user, profile) : 'public';
    const allowed = level === 'self' || level === 'admin' || String(stat.recordedBy) === String(req.user._id);
    if (!allowed) return fail(res, 403, 'You cannot delete this statistic.');
    await stat.deleteOne();
    return ok(res, null, 'Statistic removed.');
  })
);

function present(stat) {
  return {
    id: stat._id,
    athleteId: stat.athlete,
    sport: stat.sport,
    recordedAt: stat.recordedAt,
    metrics: stat.metrics,
    notes: stat.notes || '',
    matchId: stat.match || null,
  };
}

export default router;
