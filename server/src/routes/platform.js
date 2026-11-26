import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import {
  AthleteProfile,
  Club,
  Match,
  Opportunity,
  Registration,
  Report,
  Team,
  Tournament,
  User,
} from '../models.js';
import { asyncHandler, fail, ok, optionalProtect, protect } from '../middleware.js';
import { computeStandings, notifyAdmins, serverRoot, SPORTS, SUB_COUNTIES } from '../utils.js';

const router = express.Router();

const uploadDir = path.join(serverRoot, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      const error = new Error('Only JPG, PNG, WEBP, and GIF images can be uploaded.');
      error.status = 400;
      cb(error, false);
      return;
    }
    cb(null, true);
  },
});

router.get('/sports', (_req, res) => {
  ok(res, { sports: SPORTS, subCounties: SUB_COUNTIES });
});

router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [athletes, clubs, tournaments, opportunities, profiles, featuredTournaments, openOpportunities] = await Promise.all([
      AthleteProfile.countDocuments({ visibility: 'public', discoverable: true, isMinor: { $ne: true } }),
      Club.countDocuments({ verificationStatus: 'verified' }),
      Tournament.countDocuments({ status: { $ne: 'draft' } }),
      Opportunity.countDocuments({ status: 'published' }),
      AthleteProfile.find({ visibility: 'public', discoverable: true, isMinor: { $ne: true }, sport: { $ne: '' } })
        .populate('user', 'name subCounty')
        .sort({ updatedAt: -1 })
        .limit(4),
      Tournament.find({ status: { $in: ['open', 'ongoing'] } }).sort({ startDate: 1 }).limit(3),
      Opportunity.find({ status: 'published' }).sort({ createdAt: -1 }).limit(3),
    ]);

    let standings = null;
    const featured = await Tournament.findOne({ format: 'league', status: { $in: ['open', 'ongoing', 'completed'] } }).sort({ updatedAt: -1 });
    if (featured) {
      const [registrations, matches] = await Promise.all([
        Registration.find({ tournament: featured._id, status: 'approved' }).populate('team', 'name sport'),
        Match.find({ tournament: featured._id }),
      ]);
      standings = {
        tournamentId: featured._id,
        tournamentName: featured.name,
        rows: computeStandings(registrations.map((item) => item.team).filter(Boolean), matches).slice(0, 5),
      };
    }

    return ok(res, {
      counts: { athletes, clubs, tournaments, opportunities },
      athletes: profiles.map((profile) => ({
        id: profile._id,
        name: profile.user?.name || 'Athlete',
        sport: profile.sport,
        position: profile.position,
        subCounty: profile.user?.subCounty || '',
        skills: (profile.skills || []).slice(0, 3),
      })),
      tournaments: featuredTournaments.map((item) => ({
        id: item._id,
        name: item.name,
        sport: item.sport,
        location: item.location,
        startDate: item.startDate,
        status: item.status,
        format: item.format,
      })),
      opportunities: openOpportunities.map((item) => ({
        id: item._id,
        title: item.title,
        type: item.type,
        sport: item.sport,
        organization: item.organization,
        location: item.location,
        deadline: item.deadline,
      })),
      standings,
    });
  })
);

router.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) return fail(res, 400, 'Name, email, and message are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Enter a valid email.');
    await notifyAdmins({
      title: `Contact: ${String(subject || 'General message').slice(0, 80)}`,
      message: `${String(name).slice(0, 80)} (${String(email).slice(0, 120)}): ${String(message).slice(0, 320)}`,
      type: 'contact',
      link: '/app/admin',
    });
    return ok(res, null, 'Message sent. The Garissa SportsConnect team will review it.');
  })
);

router.post(
  '/reports',
  protect,
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason } = req.body || {};
    if (!['user', 'athlete', 'club', 'opportunity'].includes(targetType)) return fail(res, 400, 'Choose what you are reporting.');
    if (!targetId || !reason || String(reason).trim().length < 8) return fail(res, 400, 'Describe the issue in at least a short sentence.');
    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason: String(reason).trim().slice(0, 1000),
    });
    await notifyAdmins({
      title: 'New report',
      message: `${req.user.name} reported a ${targetType}.`,
      type: 'report',
      link: '/app/admin',
    });
    return ok(res, { id: report._id }, 'Report submitted.', 201);
  })
);

router.post(
  '/upload',
  protect,
  (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error) return next(error);
      return next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) return fail(res, 400, 'Choose an image to upload.');
    const localUrl = `/uploads/${req.file.filename}`;
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      const absolute = process.env.SERVER_URL ? `${process.env.SERVER_URL.replace(/\/$/, '')}${localUrl}` : localUrl;
      return ok(res, { url: absolute }, 'Image uploaded.');
    }
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: 'garissa-sportsconnect' });
    fs.unlink(req.file.path, () => {});
    return ok(res, { url: uploaded.secure_url }, 'Image uploaded.');
  })
);

router.get(
  '/directory-meta',
  optionalProtect,
  asyncHandler(async (_req, res) => {
    const [clubs, teams, matches] = await Promise.all([
      Club.countDocuments({ verificationStatus: 'verified' }),
      Team.countDocuments(),
      Match.countDocuments({ status: 'completed' }),
    ]);
    return ok(res, { clubs, teams, matches });
  })
);

export default router;
