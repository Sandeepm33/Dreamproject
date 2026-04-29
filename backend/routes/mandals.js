const express = require('express');
const router = express.Router();
const Mandal = require('../models/Mandal');

// Get all mandals (can filter by district)
router.get('/', async (req, res) => {
  try {
    const { district, search } = req.query;
    const query = { active: true };
    if (district) query.district = district;
    if (search) query.name = { $regex: search, $options: 'i' };

    const mandals = await Mandal.find(query).sort({ name: 1 }).populate('district', 'name');
    res.json({ success: true, mandals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Collector or Admin creates a mandal
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin', 'collector', 'secretariat_office'), async (req, res) => {
  try {
    const { district } = req.body;
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Mandal name is required' });
    }
    
    // Auto-assign district if user is a Collector. 
    // Secretariat Office can specify a district or use their assigned one.
    let mandalDistrict = district;
    if (req.user.role === 'collector') {
      mandalDistrict = req.user.district;
    } else if (req.user.role === 'secretariat_office') {
      mandalDistrict = district || req.user.district;
    }

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
router.delete('/:id', protect, authorize('admin', 'collector', 'secretariat_office'), async (req, res) => {
  try {
    const mandal = await Mandal.findById(req.params.id);
    if (!mandal) {
      return res.status(404).json({ success: false, message: 'Mandal not found' });
    }

    // Security check: if role is restricted, ensure the district matches if user has one
    // Security check for collector
    if (req.user.role === 'collector') {
      const userDistrictId = req.user.district?._id ? req.user.district._id.toString() : (req.user.district ? req.user.district.toString() : null);
      const mandalDistrictId = mandal.district?._id ? mandal.district._id.toString() : (mandal.district ? mandal.district.toString() : null);
      if (mandalDistrictId !== userDistrictId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete mandal in this district' });
      }
    }

    // Cascading delete is not implemented, so we just delete the mandal.
    // (Integrity check removed as per user request to bypass 'Cannot delete mandal with assigned villages' error)

    await mandal.deleteOne();
    res.json({ success: true, message: 'Mandal deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a mandal
router.put('/:id', protect, authorize('admin', 'collector', 'secretariat_office'), async (req, res) => {
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
        return res.status(403).json({ success: false, message: 'Not authorized to update mandal in this district' });
      }
    }

    const { name, district, active } = req.body;
    if (name) mandal.name = name.trim();
    if (district && req.user.role !== 'collector') mandal.district = district;
    if (typeof active === 'boolean') mandal.active = active;

    await mandal.save();
    res.json({ success: true, mandal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
