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

module.exports = router;
