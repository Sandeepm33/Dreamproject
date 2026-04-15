const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

const sendNotification = async (userId, title, message, type, complaintId) => {
  try {
    await Notification.create({ user: userId, title, message, type, complaint: complaintId });
  } catch (err) { console.error('Notification error:', err); }
};

// POST /api/complaints
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, villageCode, media, citizenId } = req.body;
    const User = require('../models/User');

    // Use citizenId if provided and user is admin/panchayat_secretary/officer
    let reportee = req.user;
    if (citizenId && ['admin', 'panchayat_secretary', 'officer'].includes(req.user.role)) {
      reportee = await User.findById(citizenId).populate('village district');
      if (!reportee) return res.status(404).json({ success: false, message: 'Citizen not found' });
    }

    // Duplicate detection
    const recent = await Complaint.findOne({
      'location.lat': location?.lat, 'location.lng': location?.lng,
      category, status: { $ne: 'resolved' },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const complaint = await Complaint.create({
      title, description, category,
      citizen: reportee._id,
      village: reportee.village?._id || reportee.village,
      district: reportee.district?._id || reportee.district,
      location: {
        ...location,
        villageLabel: location?.village,
        districtLabel: location?.district
      },
      villageCode: villageCode || reportee.village?.villageCode || reportee.villageCode || 'VLG',
      media: media || [],
      beforeImage: media && media.length > 0 ? media[0].url : '',
      isDuplicate: !!recent,
      duplicateOf: recent?._id,
      statusHistory: [{ status: 'pending', changedBy: req.user._id, note: 'Complaint submitted' }]
    });

    await sendNotification(reportee._id, 'Complaint Submitted', `Your complaint ${complaint.complaintId} has been submitted successfully.`, 'complaint_created', complaint._id);
    const populated = await complaint.populate('citizen', 'name mobile village');
    res.status(201).json({ success: true, complaint: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/complaints
exports.getComplaints = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20, search, sortBy = 'createdAt', order = 'desc', isMine, lat, lng, radius } = req.query;
    const query = {};

    if (req.user) {
      if (req.user.role === 'citizen' || isMine === 'true') {
        query.citizen = req.user._id;
      } else if (req.user.role === 'panchayat_secretary') {
        query.village = req.user.village;
      } else if (req.user.role === 'collector') {
        query.district = req.user.district;
      } else if (req.user.role === 'officer') {
        query.assignedTo = req.user._id;
      }
    }

    if (status) query.status = status;
    if (category) query.category = category;
    
    // Auto-visibility: If status is 'escalated', it should be flagged for Collector attention
    // (Already handled by district filter for Collector)
    
    // Geographic Filtering
    if (lat && lng) {
      const r = parseFloat(radius) || 5; // km
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      // Rough approximation: 1 degree approx 111km
      const latDelta = r / 111;
      const lngDelta = r / (111 * Math.cos(latitude * Math.PI / 180));
      
      query['location.lat'] = { $gte: latitude - latDelta, $lte: latitude + latDelta };
      query['location.lng'] = { $gte: longitude - lngDelta, $lte: longitude + lngDelta };
    }

    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { complaintId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('citizen', 'name mobile email village district avatar')
      .populate('assignedTo', 'name role department')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, complaints, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/complaints/:id
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name mobile email village district state avatar')
      .populate('assignedTo', 'name role department')
      .populate('remarks.addedBy', 'name role')
      .populate('statusHistory.changedBy', 'name role');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/complaints/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, note, afterImage } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = status;
    complaint.statusHistory.push({ status, changedBy: req.user._id, note: note || `Status updated to ${status}` });
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      if (afterImage) complaint.afterImage = afterImage;
      complaint.resolutionApproval.status = 'pending';
    }
    await complaint.save();

    await sendNotification(complaint.citizen, 'Status Updated', `Your complaint ${complaint.complaintId} status changed to ${status}.`, 'status_update', complaint._id);
    const updated = await complaint.populate('citizen assignedTo');
    res.json({ success: true, complaint: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/complaints/:id/assign
exports.assignComplaint = async (req, res) => {
  try {
    const { officerId, department } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, {
      assignedTo: officerId, department, status: 'assigned',
      $push: { statusHistory: { status: 'assigned', changedBy: req.user._id, note: `Assigned to ${department}` } }
    }, { new: true }).populate('citizen assignedTo');
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    await sendNotification(complaint.citizen._id, 'Complaint Assigned', `Your complaint ${complaint.complaintId} has been assigned to ${department}.`, 'status_update', complaint._id);
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/complaints/:id/remark
exports.addRemark = async (req, res) => {
  try {
    const { text } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, {
      $push: { remarks: { text, addedBy: req.user._id, role: req.user.role } }
    }, { new: true }).populate('remarks.addedBy', 'name role');
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/complaints/:id/approve-resolution
exports.approveResolution = async (req, res) => {
  try {
    const { approved, feedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    if (complaint.citizen.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only the complaint owner can approve' });

    complaint.resolutionApproval = { status: approved ? 'approved' : 'rejected', approvedBy: req.user._id, approvedAt: new Date(), feedback };
    if (!approved) { complaint.status = 'in_progress'; complaint.resolvedAt = null; }
    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
