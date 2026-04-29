const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'panchayat_secretary', 'officer', 'collector'), async (req, res) => {
  try {
    const { mobile, role, village } = req.query;
    const query = {};
    if (mobile) query.mobile = { $regex: mobile, $options: 'i' };
    if (role) query.role = role;

    // Jurisdictional Scoping & Role Restricting
    if (req.user.role === 'panchayat_secretary') {
      const villageId = req.user.village?._id || req.user.village;
      if (!villageId) return res.json({ success: true, users: [] }); // No village assigned, can't manage anyone

      query.village = villageId.toString();

      // Secretary can only see these roles: admin, officer, citizen, and themselves
      const allowedRoles = ['citizen', 'officer', 'admin', 'panchayat_secretary'];

      if (!role) {
        query.role = { $in: allowedRoles };
      } else if (!allowedRoles.includes(role)) {
        return res.json({ success: true, users: [] }); // Reject bad role requests
      }
    } else if (['collector', 'secretariat_office'].includes(req.user.role)) {
      query.district = (req.user.district?._id || req.user.district)?.toString();
      if (village) query.village = village; // Collector can filter by specific village in their district
    }

    const users = await User.find(query)
      .select('-password -otp')
      .populate({
        path: 'village',
        select: 'name villageCode mandal',
        populate: { path: 'mandal', select: 'name' }
      })
      .populate('mandal', 'name')
      .populate('district', 'name')
      .limit(50);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/create', protect, authorize('admin', 'panchayat_secretary', 'collector', 'secretariat_office'), async (req, res) => {
  try {
    const { name, mobile, email, password, role, department, village, district, mandal } = req.body;

    // Role Authorization Logic
    if (req.user.role === 'collector') {
      if (role !== 'panchayat_secretary') {
        return res.status(403).json({ success: false, message: 'Collector can only create Panchayat Secretaries' });
      }
    } else if (req.user.role === 'secretariat_office') {
      if (!['panchayat_secretary', 'collector'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Secretariat can only create Collectors and Secretaries' });
      }
    } else if (req.user.role === 'panchayat_secretary') {
      if (!['officer', 'citizen'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Secretary can only create Officers or Citizens' });
      }
    }

    if (!['admin', 'officer', 'citizen', 'panchayat_secretary', 'collector'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const emailLower = email.trim().toLowerCase();

    // Check for existing mobile or email
    const existingUser = await User.findOne({ $or: [{ mobile }, { email: emailLower }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Mobile or Email already registered' });
    }

    // Auto-scope based on creator
    const userData = { name, mobile, email: emailLower, password, role, department, mandal };
    if (village && village !== '') userData.village = village;

    if (req.user.role === 'collector') {
      userData.district = req.user.district;
    } else if (req.user.role === 'secretariat_office') {
      if (district) userData.district = district;
      else if (req.user.district) userData.district = req.user.district;
    } else if (req.user.role === 'panchayat_secretary') {
      userData.district = req.user.district;
      userData.village = req.user.village?._id || req.user.village;
      userData.mandal = req.user.mandal?._id || req.user.mandal;
    } else if (district) {
      userData.district = district;
    }

    const user = await User.create(userData);

    // Send email with credentials
    try {
      const sendEmail = require('../utils/sendEmail');
      const message = `Hello ${user.name},\n\nAn account has been created for you on the Smart Gram Panchayat Portal by your administrator.\n\nYour Login Email: ${user.email}\nYour Temporary Password: ${password}\n\nPlease log in and change your password immediately for security purposes.`;

      await sendEmail({
        email: user.email,
        subject: 'Your SGPIMS Account Credentials',
        message: message
      });
    } catch (err) {
      console.error('Failed to send credentials email:', err);
    }

    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /users/:id/assign-village — Collector assigns a Secretary to a Village
router.patch('/:id/assign-village', protect, authorize('collector', 'admin'), async (req, res) => {
  try {
    const { villageId } = req.body;
    if (!villageId) return res.status(400).json({ success: false, message: 'villageId is required' });

    const Village = require('../models/Village');
    const mongoose = require('mongoose');

    // Validate village belongs to Collector's district
    if (['collector', 'secretariat_office'].includes(req.user.role)) {
      const collectorDistrictId = req.user.district?._id || req.user.district;
      const village = await Village.findById(villageId);
      if (!village) return res.status(404).json({ success: false, message: 'Village not found' });
      if (String(village.district) !== String(collectorDistrictId)) {
        return res.status(403).json({ success: false, message: 'Village does not belong to your district' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { village: villageId },
      { new: true }
    ).populate({
      path: 'village',
      select: 'name villageCode mandal',
      populate: { path: 'mandal', select: 'name' }
    }).populate('mandal', 'name').populate('district', 'name');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Send email about assignment update
    try {
      const sendEmail = require('../utils/sendEmail');
      const message = `Hello ${user.name},\n\nYour account has been updated in the Smart Gram Panchayat Portal.\n\nYou have been newly assigned to the village: ${user.village?.name || 'N/A'}.\n\nPlease log in to view your updated dashboard.`;
      await sendEmail({
        email: user.email,
        subject: 'SGPIMS Account Assignment Update',
        message: message
      });
    } catch (err) {
      console.error('Failed to send assignment update email:', err);
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /users/village-officers — Citizens see officers in their village
router.get('/village-officers', protect, async (req, res) => {
  try {
    const villageId = req.user.village?._id || req.user.village;
    if (!villageId) return res.json({ success: true, officers: [] });

    const officers = await User.find({
      village: villageId,
      role: { $in: ['panchayat_secretary', 'officer'] },
      isActive: true
    }).select('name role department avatar email mobile');

    res.json({ success: true, officers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
