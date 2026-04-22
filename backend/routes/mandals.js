const express = require('express');
const router = express.Router();
const Mandal = require('../models/Mandal');

// Get all mandals (can filter by district)
router.get('/', async (req, res) => {
  try {
    const { district } = req.query;
    const query = { active: true };
    if (district) query.district = district;

    const mandals = await Mandal.find(query).populate('district', 'name');
    res.json({ success: true, mandals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Collector or Admin creates a mandal
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin', 'collector'), async (req, res) => {
  try {
    const { name, district } = req.body;
    
    // Auto-assign district if user is a Collector
    const mandalDistrict = req.user.role === 'collector' ? req.user.district : district;

    if (!mandalDistrict) {
      return res.status(400).json({ success: false, message: 'District is required to create a Mandal' });
    }

    // Check if mandal already exists
    const existingMandal = await Mandal.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      district: mandalDistrict 
    });
    
    if (existingMandal) {
      return res.status(400).json({ success: false, message: 'Mandal already exists in this district' });
    }

    const mandal = await Mandal.create({
      name,
      district: mandalDistrict
    });

    res.status(201).json({ success: true, mandal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
