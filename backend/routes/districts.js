const express = require('express');
const router = express.Router();
const District = require('../models/District');
const { protect, authorize } = require('../middleware/auth');

// Public route to get districts for signup/dropdowns
router.get('/', async (req, res) => {
  try {
    const districts = await District.find({ active: true });
    res.json({ success: true, districts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin/Collector can manage districts (if needed, but usually pre-populated)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const district = await District.create(req.body);
    res.status(201).json({ success: true, district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
