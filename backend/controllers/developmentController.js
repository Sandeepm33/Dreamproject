const DevelopmentRequest = require('../models/DevelopmentRequest');
const Notification = require('../models/Notification');
const fcm = require('../services/fcmService');

const sendNotification = async (userId, title, message, type, requestId) => {
  try {
    await Notification.create({ user: userId, title, message, type, developmentRequest: requestId });
    
    // Fire real push notification (non-blocking)
    fcm.sendToUser(userId, {
      title: `🏗️ ${title}`,
      body: message,
      data: { type: 'development_update', requestId: requestId.toString(), url: '/dashboard/citizen/developments' }
    }).catch(() => { });
  } catch (err) { console.error('Notification error:', err); }
};

// POST /api/developments
exports.createRequest = async (req, res) => {
  try {
    const { title, description, category, priority, estimatedBudget, attachments } = req.body;

    const request = await DevelopmentRequest.create({
      title, description, category, priority, estimatedBudget, attachments,
      requestedBy: req.user._id,
      village: req.user.village,
      district: req.user.district
    });

    // Notify all collectors in this district (or just a general notification)
    // For now, just create the request.

    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/developments
exports.getRequests = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'panchayat_secretary') {
      query.village = req.user.village;
    } else if (req.user.role === 'collector') {
      query.district = req.user.district;
    } else if (req.user.role === 'secretariat_office') {
      // Secretariat office sees all forwarded requests or requests in their district if they have one
      if (req.user.district) {
        query.$or = [
          { district: req.user.district },
          { forwardedToSecretariat: true }
        ];
      } else {
        query.forwardedToSecretariat = true;
      }
    } else if (req.user.role === 'admin') {
      // Admin sees all or restricted by village/district if applicable
    }

    const requests = await DevelopmentRequest.find(query)
      .populate('requestedBy', 'name role')
      .populate('village', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/developments/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, collectorNote, secretariatNote } = req.body;
    const request = await DevelopmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (req.user.role === 'collector') {
      if (status === 'forwarded') {
        request.forwardedToSecretariat = true;
      }
      if (collectorNote) request.collectorNote = collectorNote;
    } else if (req.user.role === 'secretariat_office') {
      if (secretariatNote) request.secretariatNote = secretariatNote;
    }

    request.status = status;
    await request.save();

    let notificationMsg = `Your request ${request.requestId} status changed to ${status}.`;
    if (status === 'forwarded') {
      notificationMsg = `Your request ${request.requestId} has been forwarded to the Secretariat Office for review.`;
    }

    await sendNotification(request.requestedBy, 'Development Request Updated', notificationMsg, 'development_update', request._id);

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
