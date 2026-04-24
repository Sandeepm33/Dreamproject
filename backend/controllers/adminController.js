const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const dashboardQuery = {};
    const complaintQuery = {};

    if (req.user.role === 'panchayat_secretary') {
      const vId = req.user.village?._id || req.user.village;
      if (vId) complaintQuery.village = vId;
    } else if (req.user.role === 'collector') {
      // Collector can see all villages as per user request
      // const dId = req.user.district?._id || req.user.district;
      // if (dId) complaintQuery.district = dId;
    }

    const [total, pending, assigned, inProgress, resolved, rejected, escalated] = await Promise.all([
      Complaint.countDocuments(complaintQuery),
      Complaint.countDocuments({ ...complaintQuery, status: 'pending' }),
      Complaint.countDocuments({ ...complaintQuery, status: 'assigned' }),
      Complaint.countDocuments({ ...complaintQuery, status: 'in_progress' }),
      Complaint.countDocuments({ ...complaintQuery, status: 'resolved' }),
      Complaint.countDocuments({ ...complaintQuery, status: 'rejected' }),
      Complaint.countDocuments({ ...complaintQuery, status: 'escalated' })
    ]);

    const categoryStats = await Complaint.aggregate([
      { $match: complaintQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const recentComplaints = await Complaint.find(complaintQuery)
      .populate('citizen', 'name mobile village')
      .populate('assignedTo', 'name department')
      .sort({ createdAt: -1 })
      .limit(10);

    // Filter user counts too
    const userQuery = { ...complaintQuery };
    const totalUsers = await User.countDocuments({ ...userQuery, role: 'citizen' });
    const totalOfficers = await User.countDocuments({ ...userQuery, role: 'officer' });

    // Resolution rate
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Average resolution time
    const resolvedComplaints = await Complaint.find({ ...complaintQuery, status: 'resolved', resolvedAt: { $exists: true } });
    let avgResolutionHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        return sum + (c.resolvedAt - (c.createdAt || c._id.getTimestamp())) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedComplaints.length);
    }

    // SLA breached
    const slaBreached = await Complaint.countDocuments({
      ...complaintQuery,
      status: { $nin: ['resolved', 'rejected'] },
      slaDeadline: { $lt: new Date() }
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Complaint.aggregate([
      { $match: { ...complaintQuery, createdAt: { $gte: sixMonthsAgo } } },
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
    let query = {};

    // 1. Enforce Jurisdictional Scoping first
    if (req.user.role === 'panchayat_secretary') {
      const vId = req.user.village?._id || req.user.village;
      if (!vId) return res.json({ success: true, users: [], total: 0 });

      query.village = vId;

      // Role restrictions for Secretary
      const allowedRoles = ['citizen', 'officer', 'admin', 'panchayat_secretary'];
      if (role) {
        if (!allowedRoles.includes(role)) return res.json({ success: true, users: [], total: 0 });
        query.role = role;
      } else {
        query.role = { $in: allowedRoles };
      }
    } else if (req.user.role === 'collector') {
      const dId = req.user.district?._id || req.user.district;
      if (dId) query.district = dId;
      if (role) query.role = role;
    } else {
      // Standard Admin
      if (role) query.role = role;
    }

    // 2. Add search filters if present
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('--- ADMIN GET USERS ---');
    console.log('Role Request:', role);
    console.log('User Role:', req.user.role);
    console.log('Constructed Query:', JSON.stringify(query));

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate({
        path: 'village',
        select: 'name villageCode mandal',
        populate: { path: 'mandal', select: 'name' }
      })
      .populate('mandal', 'name')
      .populate('district', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log(`Returning ${users.length} users and total: ${total}`);
    res.json({ success: true, users, total });
  } catch (err) {
    console.error('adminController.getUsers Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // --- Role-Based Permission Logic ---
    const requesterRole = req.user.role;
    const targetRole = targetUser.role;

    let isAuthorized = false;

    if (requesterRole === 'admin') {
      isAuthorized = true; // Global admin can update anyone
    } else if (requesterRole === 'collector') {
      // Collector can only update Panchayat Secretaries in their district
      if (targetRole === 'panchayat_secretary') {
        const collectorDistrict = req.user.district?._id || req.user.district;
        const targetDistrict = targetUser.district?._id || targetUser.district;
        if (String(collectorDistrict) === String(targetDistrict)) {
          isAuthorized = true;
        }
      }
    } else if (requesterRole === 'panchayat_secretary') {
      // Secretary can edit admin, officer, citizen in their village
      const allowedTargetRoles = ['admin', 'officer', 'citizen', 'panchayat_secretary']; // Including themselves
      if (allowedTargetRoles.includes(targetRole)) {
        const secretaryVillage = req.user.village?._id || req.user.village;
        const targetVillage = targetUser.village?._id || targetUser.village;

        // If updating themselves, always authorized
        if (String(req.user._id) === String(targetUser._id)) {
          isAuthorized = true;
        } else if (String(secretaryVillage) === String(targetVillage)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this user profile' });
    }

    // --- Prevent Escalation ---
    // A Secretary should not be able to promote someone to Admin or Collector if they aren't one
    if (updateData.role && updateData.role !== targetRole) {
      if (requesterRole !== 'admin') {
        // Only global admin can change roles to 'admin' or 'collector'
        if (['admin', 'collector'].includes(updateData.role)) {
          return res.status(403).json({ success: false, message: 'You cannot assign high-level administrative roles' });
        }
      }
    }

    Object.assign(targetUser, updateData);
    if (password) targetUser.password = password;

    await targetUser.save();
    res.json({ success: true, user: targetUser });
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
    const query = { role: { $in: ['officer', 'admin'] }, isActive: true };

    if (req.user.role === 'panchayat_secretary') {
      const vId = req.user.village?._id || req.user.village;
      if (vId) query.village = vId;
    } else if (req.user.role === 'collector') {
      const dId = req.user.district?._id || req.user.district;
      if (dId) query.district = dId;
    }

    const officers = await User.find(query).select('name role department village');
    res.json({ success: true, officers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/broadcast
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole, imageUrl, audioUrl } = req.body;
    let query = targetRole ? { role: targetRole } : {};

    // Enforce Jurisdictional Scoping
    if (req.user.role === 'panchayat_secretary') {
      const vId = req.user.village?._id || req.user.village;
      if (vId) query.village = vId;
      else return res.status(403).json({ success: false, message: 'You must be assigned to a village to broadcast' });
    } else if (req.user.role === 'collector') {
      const dId = req.user.district?._id || req.user.district;
      if (dId) query.district = dId;
      else return res.status(403).json({ success: false, message: 'You must be assigned to a district to broadcast' });
    }

    const users = await User.find(query).select('_id');
    const notifications = users.map(u => ({ user: u._id, title, message, type: 'general', imageUrl, audioUrl }));
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
