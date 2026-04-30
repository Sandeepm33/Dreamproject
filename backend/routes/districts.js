const express = require('express');
const router = express.Router();
const District = require('../models/District');
const { protect, authorize } = require('../middleware/auth');

// Public route to get districts for signup/dropdowns
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = { active: true };
    if (search) query.name = { $regex: search, $options: 'i' };

    const districts = await District.find(query).sort({ name: 1 });
    res.json({ success: true, districts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin/Collector can manage districts (if needed, but usually pre-populated)
router.post('/', protect, authorize('admin', 'secretariat_office'), async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'District name is required' });
    }

    // Check if district already exists (case-insensitive)
    const existingDistrict = await District.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingDistrict) {
      return res.status(400).json({ success: false, message: 'District with this name already exists' });
    }

    const district = await District.create({ ...req.body, name });
    res.status(201).json({ success: true, district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a district
router.delete('/:id', protect, authorize('admin', 'secretariat_office'), async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }

    // Check if mandals are assigned to this district
    const Mandal = require('../models/Mandal');
    const mandalCount = await Mandal.countDocuments({ district: req.params.id });
    if (mandalCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete district with assigned mandals' });
    }

    await district.deleteOne();
    res.json({ success: true, message: 'District deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a district
router.put('/:id', protect, authorize('admin', 'secretariat_office'), async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }

    const { name, state, active } = req.body;
    if (name) district.name = name.trim();
    if (state) district.state = state;
    if (typeof active === 'boolean') district.active = active;

    await district.save();
    res.json({ success: true, district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
