import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import { body } from 'express-validator';
import { AthleteProfile, User } from '../models.js';
import { asyncHandler, fail, ok, protect, rateLimit, signToken, validate } from '../middleware.js';
import { isMinorDob, publicUser } from '../utils.js';

const router = express.Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name.'),
  body('email').trim().isEmail().withMessage('Enter a valid email.').customSanitizer((value) => value.toLowerCase()),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['athlete', 'coach', 'scout', 'club_admin', 'organizer']).withMessage('Choose a valid role.'),
  body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }),
  body('county').optional({ checkFalsy: true }).isLength({ max: 60 }),
  body('subCounty').optional({ checkFalsy: true }).isLength({ max: 60 }),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid date of birth.'),
];

router.post(
  '/register',
  authLimit,
  registerRules,
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, county, subCounty, dateOfBirth, guardian } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return fail(res, 409, 'An account with this email already exists.');

    if (role === 'athlete' && !dateOfBirth) {
      return fail(res, 400, 'Athletes must add a date of birth so the platform can apply safeguarding rules.');
    }

    const minor = role === 'athlete' && isMinorDob(dateOfBirth);
    if (minor && (!guardian?.consent || !guardian?.name || !guardian?.phone)) {
      return fail(res, 400, 'Athletes under 18 need a guardian name, phone number, and consent before an account can be created.');
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
      phone: phone || '',
      county: county || 'Garissa',
      subCounty: subCounty || '',
      dateOfBirth: dateOfBirth || undefined,
      guardian: minor || guardian?.name
        ? {
            name: guardian?.name || '',
            phone: guardian?.phone || '',
            relationship: guardian?.relationship || '',
            consent: Boolean(guardian?.consent),
          }
        : undefined,
    });

    if (role === 'athlete') {
      await AthleteProfile.create({
        user: user._id,
        isMinor: minor,
        visibility: minor ? 'scouts' : 'public',
        discoverable: true,
      });
    }

    return ok(res, { token: signToken(user), user: publicUser(user) }, 'Account created.', 201);
  })
);

router.post(
  '/login',
  authLimit,
  [body('email').trim().isEmail().customSanitizer((value) => value.toLowerCase()), body('password').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return fail(res, 401, 'Invalid email or password.');
    }
    if (user.isSuspended) {
      return fail(res, 403, user.suspensionReason || 'This account is suspended. Contact the platform administrator.');
    }
    return ok(res, { token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/logout',
  protect,
  asyncHandler(async (req, res) => {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    return ok(res, null, 'Signed out.');
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const profile = req.user.role === 'athlete' ? await AthleteProfile.findOne({ user: req.user._id }).select('_id sport visibility isMinor') : null;
    return ok(res, { ...publicUser(req.user), profileId: profile?._id || null, sport: profile?.sport || '' });
  })
);

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { name, phone, county, subCounty, avatarUrl } = req.body;
    if (name) req.user.name = String(name).trim().slice(0, 80);
    if (phone !== undefined) req.user.phone = String(phone).slice(0, 20);
    if (county !== undefined) req.user.county = String(county).slice(0, 60);
    if (subCounty !== undefined) req.user.subCounty = String(subCounty).slice(0, 60);
    if (avatarUrl !== undefined) req.user.avatarUrl = String(avatarUrl).slice(0, 400);
    await req.user.save();
    return ok(res, publicUser(req.user), 'Account updated.');
  })
);

router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Enter your current password.'),
    body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be at least 8 characters.'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    const matches = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!matches) return fail(res, 400, 'Current password is incorrect.');
    user.password = await bcrypt.hash(req.body.newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return ok(res, { token: signToken(user) }, 'Password updated. Other sessions were signed out.');
  })
);

router.post(
  '/forgot-password',
  authLimit,
  [body('email').trim().isEmail().customSanitizer((value) => value.toLowerCase())],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    const message = 'If that email is registered, a reset link is ready.';
    if (!user || user.isSuspended) return ok(res, { issued: false }, message);

    const raw = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${raw}`;
    const data = { issued: true };
    if (process.env.NODE_ENV !== 'production') {
      data.resetToken = raw;
      data.resetUrl = resetUrl;
    }
    return ok(res, data, message);
  })
);

router.post(
  '/reset-password/:token',
  [body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be at least 8 characters.')],
  validate,
  asyncHandler(async (req, res) => {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password');
    if (!user) return fail(res, 400, 'This reset link is invalid or has expired.');
    user.password = await bcrypt.hash(req.body.password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return ok(res, { token: signToken(user), user: publicUser(user) }, 'Password reset. You are signed in.');
  })
);

export default router;
