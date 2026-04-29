const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.get('/overview', protect, authorize('admin', 'panchayat_secretary', 'collector', 'secretariat_office'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const query = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const [byCategory, byStatus, byMonth, topIssues, officerPerformance] = await Promise.all([
      Complaint.aggregate([{ $match: query }, { $group: { _id: '$category', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } }]),
      Complaint.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        { 
          $group: { 
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, 
            count: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } }
          } 
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Complaint.find(query).sort({ voteCount: -1 }).limit(5).populate('citizen', 'name village'),
      Complaint.aggregate([
        { $match: { ...query, assignedTo: { $exists: true } } },
        { $group: { _id: '$assignedTo', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
        { $unwind: '$officer' },
        { $project: { name: '$officer.name', department: '$officer.department', total: 1, resolved: 1, rate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] } } },
        { $sort: { resolved: -1 } }, { $limit: 10 }
      ])
    ]);

    res.json({ success: true, byCategory, byStatus, byMonth, topIssues, officerPerformance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
