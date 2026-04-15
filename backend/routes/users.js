const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'panchayat_secretary', 'officer', 'collector'), async (req, res) => {
  try {
    const { mobile, role } = req.query;
    const query = {};
    if (mobile) query.mobile = { $regex: mobile, $options: 'i' };
    if (role) query.role = role;

    const users = await User.find(query).select('-password -otp').limit(20);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/create', protect, authorize('admin', 'panchayat_secretary', 'collector'), async (req, res) => {
  try {
    const { name, mobile, password, role, department, village } = req.body;

    // Role Authorization Logic
    if (req.user.role === 'collector') {
      if (role !== 'panchayat_secretary') {
        return res.status(403).json({ success: false, message: 'Collector can only create Panchayat Secretaries' });
      }
    } else {
      // Logic for Panchayat Secretary/Admin
      if (role === 'collector') {
        return res.status(403).json({ success: false, message: 'Only a Collector can create another Collector' });
      }

      if (role === 'panchayat_secretary' && req.user.role !== 'collector') {
        return res.status(403).json({ success: false, message: 'Only the Collector Office can create Panchayat Secretaries' });
      }

      if (role === 'admin' && !['panchayat_secretary', 'collector'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Only Panchayat Secretaries or collector can create admins' });
      }
    }

    if (!['admin', 'officer', 'citizen', 'panchayat_secretary', 'collector'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.create({ name, mobile, password, role, department, village });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
