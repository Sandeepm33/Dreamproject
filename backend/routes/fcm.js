/**
 * FCM Token Routes
 * /api/fcm/token  – save / refresh token
 * /api/fcm/send   – send to specific user (admin only)
 * /api/fcm/broadcast – send to all users (admin only)
 */
const express = require('express');
const router = express.Router();
const FcmToken = require('../models/FcmToken');
const { protect, authorize } = require('../middleware/auth');
const { sendToUser, broadcastToAll } = require('../services/fcmService');

/* ─────────────────────────────────────────────────────────────
   POST /api/fcm/token
   Body: { token: string, platform?: 'web'|'android'|'ios' }
   Saves or refreshes the FCM token for the authenticated user.
───────────────────────────────────────────────────────────── */
router.post('/token', protect, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    const userAgent = req.headers['user-agent'] || '';

    // Upsert: if token already exists (possibly for a different user after
    // browser profile reset), update its owner. Otherwise create fresh.
    await FcmToken.findOneAndUpdate(
      { token },
      {
        user: req.user._id,
        platform,
        userAgent,
        isActive: true,
        lastUsed: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    console.error('[FCM Route] /token error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save FCM token' });
  }
});

/* ─────────────────────────────────────────────────────────────
   DELETE /api/fcm/token
   Body: { token: string }
   Removes a token (called on logout or permission revoked).
───────────────────────────────────────────────────────────── */
router.delete('/token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    await FcmToken.findOneAndDelete({ token, user: req.user._id });
    res.json({ success: true, message: 'FCM token removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/fcm/send
   Body: { userId, title, body, data? }
   Admin-only: send a push to a specific user.
───────────────────────────────────────────────────────────── */
router.post(
  '/send',
  protect,
  authorize('admin', 'panchayat_secretary', 'collector'),
  async (req, res) => {
    try {
      const { userId, title, body, data = {}, imageUrl } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ success: false, message: 'userId, title and body are required' });
      }

      const result = await sendToUser(userId, { title, body, data, imageUrl });
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
   POST /api/fcm/broadcast
   Body: { title, body, data? }
   Admin-only: send a push to ALL users.
───────────────────────────────────────────────────────────── */
router.post(
  '/broadcast',
  protect,
  authorize('admin', 'panchayat_secretary', 'collector'),
  async (req, res) => {
    try {
      const { title, body, data = {}, imageUrl } = req.body;
      if (!title || !body) {
        return res.status(400).json({ success: false, message: 'title and body are required' });
      }

      const result = await broadcastToAll({ title, body, data, imageUrl });
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ─────────────────────────────────────────────────────────────
   GET /api/fcm/tokens/me
   Returns all active tokens for the logged-in user (debug use).
───────────────────────────────────────────────────────────── */
router.get('/tokens/me', protect, async (req, res) => {
  try {
    const tokens = await FcmToken.find({ user: req.user._id, isActive: true }).select('platform lastUsed createdAt');
    res.json({ success: true, count: tokens.length, tokens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
