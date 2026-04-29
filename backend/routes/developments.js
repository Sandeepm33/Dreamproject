const express = require('express');
const router = express.Router();
const { createRequest, getRequests, updateStatus } = require('../controllers/developmentController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('panchayat_secretary', 'admin'), createRequest);
router.get('/', protect, authorize('panchayat_secretary', 'collector', 'secretariat_office', 'admin'), getRequests);
router.put('/:id/status', protect, authorize('collector', 'secretariat_office', 'admin'), updateStatus);

module.exports = router;
