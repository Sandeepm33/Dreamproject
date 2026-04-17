const express = require('express');
const router = express.Router();
const {
  createComplaint, getComplaints, getComplaint,
  updateStatus, assignComplaint, addRemark, approveResolution
} = require('../controllers/complaintController');
const { protect, authorize, optionalProtect } = require('../middleware/auth');

router.post('/', protect, createComplaint);
router.get('/', optionalProtect, getComplaints);
router.get('/:id', protect, getComplaint);
router.put('/:id/status', protect, authorize('officer', 'admin', 'panchayat_secretary'), updateStatus);
router.put('/:id/assign', protect, authorize('admin', 'panchayat_secretary'), assignComplaint);
router.put('/:id/escalate', protect, authorize('admin', 'panchayat_secretary'), require('../controllers/complaintController').escalateToCollector);
router.post('/:id/remark', protect, addRemark);
router.post('/:id/approve-resolution', protect, authorize('citizen'), approveResolution);

module.exports = router;
