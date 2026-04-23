const express = require('express');
const router = express.Router();
const Mandal = require('../models/Mandal');

// Get all mandals (can filter by district)
router.get('/', async (req, res) => {
  try {
    const { district } = req.query;
    const query = { active: true };
    if (district) query.district = district;

    const mandals = await Mandal.find(query).sort({ name: 1 }).populate('district', 'name');
    res.json({ success: true, mandals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Collector or Admin creates a mandal
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin', 'collector'), async (req, res) => {
  try {
    const { district } = req.body;
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Mandal name is required' });
    }
    
    // Auto-assign district if user is a Collector
    const mandalDistrict = req.user.role === 'collector' ? req.user.district : district;

    if (!mandalDistrict) {
      return res.status(400).json({ success: false, message: 'District is required to create a Mandal' });
    }

    // Check if mandal already exists (case-insensitive)
    // We check globally to satisfy "not added again with same name"
    const existingMandal = await Mandal.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    
    if (existingMandal) {
      return res.status(400).json({ success: false, message: 'Mandal with this name already exists' });
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

// Delete a mandal
router.delete('/:id', protect, authorize('admin', 'collector'), async (req, res) => {
  try {
    const mandal = await Mandal.findById(req.params.id);
    if (!mandal) {
      return res.status(404).json({ success: false, message: 'Mandal not found' });
    }

    // Security check for collector
    if (req.user.role === 'collector') {
      const userDistrictId = req.user.district?._id ? req.user.district._id.toString() : (req.user.district ? req.user.district.toString() : null);
      const mandalDistrictId = mandal.district?._id ? mandal.district._id.toString() : (mandal.district ? mandal.district.toString() : null);
      if (mandalDistrictId !== userDistrictId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete mandal in this district' });
      }
    }

    // Check if villages are assigned to this mandal
    const Village = require('../models/Village');
    const villageCount = await Village.countDocuments({ mandal: req.params.id });
    if (villageCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete mandal with assigned villages' });
    }

    await mandal.deleteOne();
    res.json({ success: true, message: 'Mandal deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
