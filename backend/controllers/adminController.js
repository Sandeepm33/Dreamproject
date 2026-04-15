const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [total, pending, assigned, inProgress, resolved, rejected, escalated] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'assigned' }),
      Complaint.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'resolved' }),
      Complaint.countDocuments({ status: 'rejected' }),
      Complaint.countDocuments({ status: 'escalated' })
    ]);

    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const recentComplaints = await Complaint.find()
      .populate('citizen', 'name mobile village')
      .populate('assignedTo', 'name department')
      .sort({ createdAt: -1 })
      .limit(10);

    const totalUsers = await User.countDocuments({ role: 'citizen' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });

    // Resolution rate
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Average resolution time
    const resolvedComplaints = await Complaint.find({ status: 'resolved', resolvedAt: { $exists: true } });
    let avgResolutionHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        return sum + (c.resolvedAt - c.createdAt) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedComplaints.length);
    }

    // SLA breached
    const slaBreached = await Complaint.countDocuments({
      status: { $nin: ['resolved', 'rejected'] },
      slaDeadline: { $lt: new Date() }
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: { total, pending, assigned, inProgress, resolved, rejected, escalated, resolutionRate, avgResolutionHours, slaBreached, totalUsers, totalOfficers },
      categoryStats,
      recentComplaints,
      monthlyTrend
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }];

    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id/toggle
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/officers
exports.getOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: { $in: ['officer', 'admin'] }, isActive: true }).select('name role department village');
    res.json({ success: true, officers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/broadcast
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole, imageUrl, audioUrl } = req.body;
    const query = targetRole ? { role: targetRole } : {};
    const users = await User.find(query).select('_id');
    const notifications = users.map(u => ({ user: u._id, title, message, type: 'general', imageUrl, audioUrl }));
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
