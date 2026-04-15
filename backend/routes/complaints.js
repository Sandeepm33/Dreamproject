const express = require('express');
const router = express.Router();
const {
  createComplaint, getComplaints, getComplaint,
  updateStatus, assignComplaint, addRemark, approveResolution
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, createComplaint);
router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaint);
router.put('/:id/status', protect, authorize('officer', 'admin', 'panchayat_secretary'), updateStatus);
router.put('/:id/assign', protect, authorize('admin', 'panchayat_secretary'), assignComplaint);
router.post('/:id/remark', protect, addRemark);
router.post('/:id/approve-resolution', protect, authorize('citizen'), approveResolution);

module.exports = router;
