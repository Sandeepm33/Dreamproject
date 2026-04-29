const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const Notification = require('../models/Notification');
const User = require('../models/User');
const fcm = require('../services/fcmService');
const { protect, authorize } = require('../middleware/auth');

// Helper: safely extract ObjectId from a populated field or raw id
function toId(field) {
  if (!field) return null;
  if (field._id) return field._id;
  return field;
}

// @desc    Create an emergency alert
// @route   POST /api/emergency-alerts
// @access  Private (Panchayat Secretary or Collector)
router.post('/', protect, authorize('panchayat_secretary', 'collector'), async (req, res) => {
  try {
    const { type, message, location } = req.body;

    if (!type || !message) {
      return res.status(400).json({ success: false, message: 'type and message are required' });
    }

    let targetVillageId = toId(req.user.village);
    
    // If collector, allow specifying villageId in body
    if (req.user.role === 'collector' && req.body.villageId) {
      targetVillageId = req.body.villageId;
    }

    if (!targetVillageId) {
      return res.status(400).json({ success: false, message: 'No village specified or assigned to your account.' });
    }

    const alert = await EmergencyAlert.create({
      type,
      message,
      village: targetVillageId,
      villageCode: req.user.villageCode,
      createdBy: req.user._id,
      location: location || null,
      status: 'ACTIVE'
    });

    // Find all users in the same village + collectors + relevant departments
    const usersInVillage = await User.find({
      $or: [
        { village: targetVillageId },
        { role: 'collector' },
        { department: { $in: ['Fire', 'Police', 'Medical'] } }
      ]
    }).select('_id').lean();

    const userIds = usersInVillage.map(u => u._id);

    if (userIds.length > 0) {
      // 1. Save to Database
      const notifications = userIds.map(uId => ({
        user: uId,
        type: 'EMERGENCY',
        title: `🚨 EMERGENCY: ${type}`,
        message: message,
        relatedId: alert._id
      }));

      await Notification.insertMany(notifications, { ordered: false });

      // 2. Fire Push Notifications (FCM)
      fcm.sendToUsers(userIds, {
        title: `🚨 EMERGENCY: ${type}`,
        body: message,
        data: { type: 'EMERGENCY', alertId: alert._id.toString(), url: '/dashboard/citizen/notifications' }
      }).catch(err => console.error('[Emergency FCM Error]', err));
    }

    // Simulate SMS / external API calls to emergency services
    console.log(`[EMERGENCY] Alert created for village: ${targetVillageId}`);
    console.log(`[EMERGENCY] Type: ${type} | Message: ${message}`);
    console.log(`[SIMULATION] Notified ${usersInVillage.length} users`);
    console.log(`[SIMULATION] Fire Station (101), Ambulance (108), Police (100) alerted`);

    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    console.error('[Emergency POST Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get active alerts for my village
// @route   GET /api/emergency-alerts/active
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const villageId = toId(req.user.village);
    const isCollector = req.user.role === 'collector';

    // Citizens with no village assigned see no alerts
    if (!villageId && !isCollector) {
      return res.json({ success: true, alerts: [] });
    }

    // Only fetch alerts from the last 1 minute
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const query = { 
      status: 'ACTIVE',
      createdAt: { $gte: oneMinuteAgo }
    };
    
    if (!isCollector) {
      query.village = villageId;
    }

    const alerts = await EmergencyAlert.find(query)
      .populate('createdBy', 'name role')
      .populate('village', 'name villageCode')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, alerts });
  } catch (err) {
    console.error('[Emergency GET Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Resolve an alert
// @route   PUT /api/emergency-alerts/:id/resolve
// @access  Private (Secretary or Collector)
router.put('/:id/resolve', protect, authorize('panchayat_secretary', 'collector'), async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    alert.status = 'RESOLVED';
    await alert.save();

    // Remove all notifications linked to this alert
    await Notification.deleteMany({ relatedId: alert._id });

    console.log(`[EMERGENCY] Alert ${alert._id} resolved and notifications purged`);
    res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[Emergency RESOLVE Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Delete an alert
// @route   POST /api/emergency-alerts/:id/delete
// @access  Private (Secretary or Collector)
router.post('/:id/delete', protect, authorize('panchayat_secretary', 'collector'), async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    
    // Safety: Secretary should only delete alerts from their own village
    if (req.user.role === 'panchayat_secretary' && String(alert.village) !== String(req.user.village)) {
      return res.status(403).json({ success: false, message: 'You can only delete alerts for your assigned village.' });
    }

    // Remove all notifications linked to this alert
    await Notification.deleteMany({ relatedId: alert._id });

    await alert.deleteOne();
    res.json({ success: true, message: 'Alert and all related notifications removed' });
  } catch (err) {
    console.error('[Emergency DELETE Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
