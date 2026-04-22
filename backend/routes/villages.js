const express = require('express');
const router = express.Router();
const Village = require('../models/Village');
const Mandal = require('../models/Mandal');
const { protect, authorize } = require('../middleware/auth');

// Get all villages (can filter by district) — includes assigned secretary
router.get('/', async (req, res) => {
  try {
    const { district, mandal } = req.query;
    const query = { active: true };
    if (district) query.district = district;
    if (mandal) query.mandal = mandal;

    const villages = await Village.find(query)
      .sort({ name: 1 })
      .populate('district', 'name')
      .populate('mandal', 'name');

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
        // Keep both for compatibility: object for filtering, string for display
        vObj.mandalName = vObj.mandal ? vObj.mandal.name : null;
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
    let villageDistrict = req.user.role === 'collector' ? req.user.district : district;

    // If still no district, but we have a mandal, infer district from the mandal
    if (!villageDistrict && req.body.mandal) {
      const Mandal = require('../models/Mandal');
      const mandalObj = await Mandal.findById(req.body.mandal);
      if (mandalObj) {
        villageDistrict = mandalObj.district;
      }
    }

    if (!villageDistrict) {
      return res.status(400).json({ success: false, message: 'District is required' });
    }

    // Security check: if collector, ensure the mandal belongs to their district
    if (req.user.role === 'collector' && req.body.mandal) {
      const Mandal = require('../models/Mandal');
      const mandalObj = await Mandal.findById(req.body.mandal);
      const userDistrictId = req.user.district?._id ? req.user.district._id.toString() : (req.user.district ? req.user.district.toString() : null);
      const mandalDistrictId = mandalObj && mandalObj.district?._id ? mandalObj.district._id.toString() : (mandalObj && mandalObj.district ? mandalObj.district.toString() : null);
      
      if (!userDistrictId || mandalDistrictId !== userDistrictId) {
        return res.status(403).json({ success: false, message: 'You can only add villages to your own district' });
      }
    }

    // Check if village already exists
    const existingVillage = await Village.findOne({
      $or: [
        { villageCode },
        { name: { $regex: new RegExp(`^${name}$`, 'i') }, mandal: req.body.mandal }
      ]
    });
    if (existingVillage) {
      return res.status(400).json({ success: false, message: 'Village with this name or code already exists in this mandal' });
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

// Delete a village
router.delete('/:id', protect, authorize('admin', 'collector'), async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);
    if (!village) {
      return res.status(404).json({ success: false, message: 'Village not found' });
    }

    // Optional: check if collector owns this district
    if (req.user.role === 'collector') {
      const villageDistrictId = village.district?._id ? village.district._id.toString() : (village.district ? village.district.toString() : null);
      const userDistrictId = req.user.district?._id ? req.user.district._id.toString() : (req.user.district ? req.user.district.toString() : null);
      
      if (!userDistrictId || villageDistrictId !== userDistrictId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete village in this district' });
      }
    }

    await village.deleteOne();
    res.json({ success: true, message: 'Village deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
