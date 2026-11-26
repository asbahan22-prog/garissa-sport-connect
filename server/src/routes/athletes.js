import express from 'express';
import {
  AthleteProfile,
  SavedAthlete,
  User,
} from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import {
  accessLevelForAthlete,
  canDiscover,
  escapeRegex,
  isMinorDob,
  isSafeHttpUrl,
  pageQuery,
  serializeAthlete,
} from '../utils.js';

const router = express.Router();

function cleanList(value, maxItems, maxLen) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return source
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLen));
}

async function loadOwnProfile(user) {
  let profile = await AthleteProfile.findOne({ user: user._id }).populate('club', 'name verificationStatus').populate('user');
  if (!profile) {
    const minor = isMinorDob(user.dateOfBirth);
    profile = await AthleteProfile.create({
      user: user._id,
      isMinor: minor,
      visibility: minor ? 'scouts' : 'public',
    });
    profile = await AthleteProfile.findById(profile._id).populate('club', 'name verificationStatus').populate('user');
  }
  return profile;
}

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'athlete') return fail(res, 403, 'Only athlete accounts have a talent profile.');
    const profile = await loadOwnProfile(req.user);
    return ok(res, serializeAthlete(profile, 'self'));
  })
);

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'athlete') return fail(res, 403, 'Only athlete accounts can edit a talent profile.');
    const profile = await loadOwnProfile(req.user);
    const body = req.body || {};

    if (body.name) req.user.name = String(body.name).trim().slice(0, 80);
    if (body.phone !== undefined) req.user.phone = String(body.phone).slice(0, 20);
    if (body.subCounty !== undefined) req.user.subCounty = String(body.subCounty).slice(0, 60);
    if (body.county !== undefined) req.user.county = String(body.county || 'Garissa').slice(0, 60);
    if (body.dateOfBirth) {
      const next = new Date(body.dateOfBirth);
      if (Number.isNaN(next.getTime())) return fail(res, 400, 'Enter a valid date of birth.');
      req.user.dateOfBirth = next;
    }

    const minor = isMinorDob(req.user.dateOfBirth);
    if (minor) {
      const guardian = body.guardian || req.user.guardian || {};
      if (!guardian.consent || !guardian.name || !guardian.phone) {
        return fail(res, 400, 'Under-18 profiles need guardian name, phone, and consent.');
      }
      req.user.guardian = {
        name: String(guardian.name).slice(0, 80),
        phone: String(guardian.phone).slice(0, 20),
        relationship: String(guardian.relationship || '').slice(0, 40),
        consent: true,
      };
    }
    await req.user.save();

    const fields = ['sport', 'position', 'dominantSide', 'bio'];
    for (const field of fields) {
      if (body[field] !== undefined) profile[field] = String(body[field] || '').slice(0, field === 'bio' ? 1500 : 60);
    }
    if (body.secondarySports !== undefined) profile.secondarySports = cleanList(body.secondarySports, 4, 40);
    if (body.skills !== undefined) profile.skills = cleanList(body.skills, 12, 40);
    if (body.heightCm !== undefined) profile.heightCm = body.heightCm === '' || body.heightCm == null ? undefined : Number(body.heightCm);
    if (body.weightKg !== undefined) profile.weightKg = body.weightKg === '' || body.weightKg == null ? undefined : Number(body.weightKg);
    if (body.yearsActive !== undefined) profile.yearsActive = body.yearsActive === '' || body.yearsActive == null ? undefined : Number(body.yearsActive);
    if (body.achievements !== undefined) {
      const items = Array.isArray(body.achievements) ? body.achievements : [];
      profile.achievements = items.slice(0, 20).map((item) => ({
        title: String(item.title || '').slice(0, 120),
        year: item.year ? Number(item.year) : undefined,
        description: String(item.description || '').slice(0, 300),
      })).filter((item) => item.title);
    }
    if (body.photos !== undefined) {
      const photos = Array.isArray(body.photos) ? body.photos : [];
      const safe = [];
      for (const photo of photos.slice(0, 8)) {
        if (!isSafeHttpUrl(photo.url)) return fail(res, 400, 'Photo links must be http(s) addresses or uploaded images.');
        safe.push({
          url: photo.url,
          caption: String(photo.caption || '').slice(0, 140),
          isPublic: minor ? false : photo.isPublic !== false,
        });
      }
      profile.photos = safe;
    }

    profile.isMinor = minor;
    if (body.discoverable !== undefined) profile.discoverable = Boolean(body.discoverable);
    if (body.visibility) {
      const requested = ['public', 'scouts', 'private'].includes(body.visibility) ? body.visibility : profile.visibility;
      profile.visibility = minor && requested === 'public' ? 'scouts' : requested;
    } else if (minor && profile.visibility === 'public') {
      profile.visibility = 'scouts';
    }

    await profile.save();
    const fresh = await AthleteProfile.findById(profile._id).populate('club', 'name verificationStatus').populate('user');
    return ok(res, serializeAthlete(fresh, 'self'), 'Profile saved.');
  })
);

router.get(
  '/shortlist',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'scout' && req.user.role !== 'super_admin') {
      return fail(res, 403, 'Shortlists are available to scout accounts.');
    }
    const saved = await SavedAthlete.find({ scout: req.user._id }).sort({ createdAt: -1 });
    const profiles = await AthleteProfile.find({ user: { $in: saved.map((item) => item.athlete) } })
      .populate('user', 'name email phone county subCounty dateOfBirth guardian')
      .populate('club', 'name verificationStatus');
    const notes = new Map(saved.map((item) => [String(item.athlete), item.note]));
    const items = [];
    for (const profile of profiles) {
      const level = await accessLevelForAthlete(req.user, profile);
      const card = serializeAthlete(profile, level);
      card.note = notes.get(String(profile.user?._id || profile.user)) || '';
      card.saved = true;
      items.push(card);
    }
    return ok(res, items);
  })
);

router.get(
  '/',
  optionalProtect,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageQuery(req);
    const role = req.user?.role;
    const privilegedBrowse = ['scout', 'coach', 'club_admin', 'organizer', 'super_admin'].includes(role);
    const filter = { discoverable: true };
    if (role === 'super_admin' && req.query.includePrivate === 'true') {
      delete filter.discoverable;
    } else if (privilegedBrowse) {
      filter.visibility = { $in: ['public', 'scouts'] };
    } else {
      filter.visibility = 'public';
      filter.isMinor = { $ne: true };
    }

    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.position) filter.position = new RegExp(escapeRegex(req.query.position), 'i');
    if (req.query.skill) filter.skills = new RegExp(escapeRegex(req.query.skill), 'i');

    if (req.query.subCounty || req.query.q) {
      const userFilter = { role: 'athlete' };
      if (req.query.subCounty) userFilter.subCounty = req.query.subCounty;
      if (req.query.q) {
        const expression = new RegExp(escapeRegex(req.query.q), 'i');
        userFilter.$or = [{ name: expression }, { subCounty: expression }];
      }
      const users = await User.find(userFilter).select('_id');
      const userIds = users.map((user) => user._id);
      if (req.query.q) {
        const expression = new RegExp(escapeRegex(req.query.q), 'i');
        filter.$or = [
          { user: { $in: userIds } },
          { sport: expression },
          { position: expression },
          { skills: expression },
          { bio: expression },
        ];
      } else {
        filter.user = { $in: userIds };
      }
    }

    const [total, profiles] = await Promise.all([
      AthleteProfile.countDocuments(filter),
      AthleteProfile.find(filter)
        .populate('user', 'name county subCounty dateOfBirth')
        .populate('club', 'name verificationStatus')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const level = privilegedBrowse ? 'scout' : 'public';
    return ok(res, {
      items: profiles.map((profile) => serializeAthlete(profile, level)),
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
    const profile = await AthleteProfile.findById(req.params.id)
      .populate('user', 'name email phone county subCounty dateOfBirth guardian isSuspended')
      .populate('club', 'name verificationStatus');
    if (!profile || profile.user?.isSuspended) return fail(res, 404, 'Athlete profile not found.');
    const level = await accessLevelForAthlete(req.user, profile);
    if (!canDiscover(level, profile)) return fail(res, 404, 'Athlete profile not found.');
    const data = serializeAthlete(profile, level);
    if (req.user?.role === 'scout' || req.user?.role === 'super_admin') {
      data.saved = Boolean(await SavedAthlete.exists({ scout: req.user._id, athlete: profile.user._id }));
    }
    return ok(res, data);
  })
);

router.post(
  '/:id/save',
  protect,
  asyncHandler(async (req, res) => {
    if (!['scout', 'super_admin'].includes(req.user.role)) return fail(res, 403, 'Only scouts can shortlist athletes.');
    const profile = await AthleteProfile.findById(req.params.id);
    if (!profile) return fail(res, 404, 'Athlete profile not found.');
    await SavedAthlete.findOneAndUpdate(
      { scout: req.user._id, athlete: profile.user },
      { note: String(req.body.note || '').slice(0, 300) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return ok(res, { saved: true }, 'Athlete added to your shortlist.');
  })
);

router.delete(
  '/:id/save',
  protect,
  asyncHandler(async (req, res) => {
    const profile = await AthleteProfile.findById(req.params.id);
    if (!profile) return fail(res, 404, 'Athlete profile not found.');
    await SavedAthlete.deleteOne({ scout: req.user._id, athlete: profile.user });
    return ok(res, { saved: false }, 'Removed from shortlist.');
  })
);

export default router;
