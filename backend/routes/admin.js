const express = require('express');
const router = express.Router();
const { getDashboard, getUsers, updateUser, toggleUserStatus, getOfficers, broadcastNotification } = require('../controllers/adminController');
const { exportComplaints } = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = [protect, authorize('admin', 'panchayat_secretary', 'collector')];
router.get('/dashboard', ...adminOnly, getDashboard);
router.get('/users', protect, authorize('admin', 'panchayat_secretary', 'collector'), getUsers);
router.put('/users/:id', ...adminOnly, updateUser);
router.put('/users/:id/toggle', ...adminOnly, toggleUserStatus);
router.get('/officers', protect, getOfficers);
router.post('/broadcast', ...adminOnly, broadcastNotification);
router.get('/export-complaints', ...adminOnly, exportComplaints);

module.exports = router;
