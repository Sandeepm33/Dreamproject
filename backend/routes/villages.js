const express = require('express');
const router = express.Router();
const Village = require('../models/Village');
const { protect, authorize } = require('../middleware/auth');

// Get all villages (can filter by district) — includes assigned secretary
router.get('/', async (req, res) => {
  try {
    const { district } = req.query;
    const query = { active: true };
    if (district) query.district = district;

    const villages = await Village.find(query).populate('district', 'name').populate('mandal', 'name');

    // For each village, find the assigned Panchayat Secretary
    const User = require('../models/User');
    const villagesWithSecretary = await Promise.all(
      villages.map(async (v) => {
        const secretary = await User.findOne({ 
          village: v._id, 
          role: 'panchayat_secretary', 
          isActive: true 
        }).select('name mobile');
        const vObj = v.toObject();
        vObj.mandal = vObj.mandal ? vObj.mandal.name : null; // Send mandal name to frontend
        return { ...vObj, secretary: secretary || null };
      })
    );

    res.json({ success: true, villages: villagesWithSecretary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Collector or Admin creates a village
router.post('/', protect, authorize('admin', 'collector'), async (req, res) => {
  try {
    const { name, villageCode, district } = req.body;
    
    // Auto-assign district if user is a Collector
    const villageDistrict = req.user.role === 'collector' ? req.user.district : district;

    if (!villageDistrict) {
      return res.status(400).json({ success: false, message: 'District is required' });
    }

    const village = await Village.create({
      name,
      villageCode,
      district: villageDistrict,
      mandal: req.body.mandal
    });

    res.status(201).json({ success: true, village });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
