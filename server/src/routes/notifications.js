import express from 'express';
import { Notification } from '../models.js';
import { asyncHandler, ok, protect } from '../middleware.js';

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(80);
    const unread = items.filter((item) => !item.read).length;
    return ok(res, {
      unread,
      items: items.map((item) => ({
        id: item._id,
        title: item.title,
        message: item.message,
        type: item.type,
        link: item.link,
        read: item.read,
        createdAt: item.createdAt,
      })),
    });
  })
);

router.patch(
  '/:id/read',
  protect,
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    return ok(res, null, 'Notification marked read.');
  })
);

router.post(
  '/read-all',
  protect,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return ok(res, null, 'All notifications marked read.');
  })
);

export default router;
