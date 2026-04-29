const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('complaint', 'complaintId title')
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Clear all notifications
// @route   POST /api/notifications/clear-all
router.post('/clear-all', protect, async (req, res) => {
  try {
    const isSecretary = req.user.role === 'panchayat_secretary' || ['collector', 'secretariat_office'].includes(req.user.role);
    
    if (isSecretary) {
      // Robust village ID detection
      const villageId = req.user.village?._id || req.user.village || req.user.villageId;
      
      if (villageId) {
        // Find all users assigned to this village
        const users = await User.find({ village: villageId }).select('_id');
        const userIds = users.map(u => u._id);
        
        // GLOBAL CLEAR: Purge for every user in the village
        await Notification.deleteMany({ user: { $in: userIds } });
        console.log(`[NOTIFS] Global clear completed for village ${villageId} by Secretary ${req.user._id}`);
      } else {
        // Fallback if no village linked
        await Notification.deleteMany({ user: req.user._id });
      }
    } else {
      // Citizens only clear their own
      await Notification.deleteMany({ user: req.user._id });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Delete a notification
// @route   POST /api/notifications/:id/delete
router.post('/:id/delete', protect, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });

    const isSecretary = req.user.role === 'panchayat_secretary' || ['collector', 'secretariat_office'].includes(req.user.role);
    
    if (isSecretary) {
      // Robust village ID detection
      const villageId = req.user.village?._id || req.user.village || req.user.villageId;
      
      if (villageId) {
        // Find all users assigned to this village
        const users = await User.find({ village: villageId }).select('_id');
        const userIds = users.map(u => u._id);
        
        await Notification.deleteMany({ 
          user: { $in: userIds },
          title: notif.title,
          message: notif.message
        });
      } else {
        await notif.deleteOne();
      }
    } else {
      // Citizen security: check if it belongs to them
      if (notif.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      await notif.deleteOne();
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
