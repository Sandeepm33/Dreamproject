const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const fcm = require('../services/fcmService');

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
    // Fire real push notification (non-blocking)
    fcm.notifyComplaintCreated(reportee._id, complaint._id.toString(), complaint.complaintId).catch(() => { });

    // Notify Panchayat Secretary of this village
    try {
      const villageId = reportee.village?._id || reportee.village;
      if (villageId) {
        const secretary = await User.findOne({
          village: villageId,
          role: 'panchayat_secretary',
          isActive: true
        });

        console.log(`[Notification Debug] Querying for Secretary in village: ${villageId}`);
        console.log(`[Notification Debug] Found Secretary: ${secretary ? (secretary.name + ' [ID: ' + secretary._id + ']') : 'NOT FOUND'}`);

        if (secretary) {
          const result = await fcm.sendToUser(secretary._id, {
            title: '🆕 New Complaint Received',
            body: `A new complaint (${complaint.complaintId}) has been filed in your village. Please review it.`,
            data: { type: 'new_complaint', complaintId: complaint._id.toString(), url: `/dashboard/admin/complaints` }
          });
          console.log(`[Notification Debug] FCM Send result to Secretary:`, result);

          await sendNotification(secretary._id, 'New Complaint Received', `A new complaint ${complaint.complaintId} has been filed in your village.`, 'complaint_created', complaint._id);
        }
      }
    } catch (secErr) {
      console.error('Failed to notify secretary:', secErr);
    }

    const populated = await complaint.populate({
      path: 'citizen',
      select: 'name mobile village',
      populate: { path: 'village', populate: { path: 'mandal', select: 'name' } }
    });
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
        // Collector sees all villages as per user request
        // query.district = req.user.district; // Removed district filter to allow "see all reports of all villages"
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
      .populate({
        path: 'citizen',
        select: 'name mobile email village mandal district avatar',
        populate: [
          { path: 'village', populate: { path: 'mandal', select: 'name' } },
          { path: 'mandal', select: 'name' }
        ]
      })
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
      .populate({
        path: 'citizen',
        select: 'name mobile email village mandal district state avatar',
        populate: [
          { path: 'village', populate: { path: 'mandal', select: 'name' } },
          { path: 'mandal', select: 'name' }
        ]
      })
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
    // Push: specific message for resolved status
    if (status === 'resolved') {
      fcm.notifyComplaintResolved(complaint.citizen, complaint._id.toString(), complaint.complaintId).catch(() => { });
    } else {
      fcm.sendToUser(complaint.citizen, {
        title: '📋 Status Updated',
        body: `Your complaint ${complaint.complaintId} status changed to ${status}.`,
        data: { type: 'status_update', complaintId: complaint._id.toString(), url: `/dashboard/complaints/${complaint._id}` },
      }).catch(() => { });
    }
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
    fcm.notifyComplaintAssigned(complaint.citizen._id, complaint._id.toString(), complaint.complaintId, department).catch(() => { });

    // Notify the assigned Officer
    if (officerId) {
      await sendNotification(officerId, 'New Work Assigned', `You have been assigned to handle complaint ${complaint.complaintId}.`, 'complaint_assigned', complaint._id);
      fcm.sendToUser(officerId, {
        title: '🛠️ New Work Assigned',
        body: `You have been assigned to resolve complaint ${complaint.complaintId} (${department}).`,
        data: { type: 'complaint_assigned', complaintId: complaint._id.toString(), url: `/dashboard/officer/complaints/${complaint._id}` }
      }).catch(() => { });
    }

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

// PUT /api/complaints/:id/escalate
exports.escalateToCollector = async (req, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = 'escalated';
    complaint.escalation = {
      level: 'district',
      triggeredAt: new Date(),
      reason: reason || 'Escalated by Panchayat Secretary for District Administration attention.'
    };
    complaint.statusHistory.push({
      status: 'escalated',
      changedBy: req.user._id,
      note: `Escalated to Collector: ${reason}`
    });

    await complaint.save();

    // Notify citizens
    await sendNotification(complaint.citizen, 'Complaint Escalated', `Your complaint ${complaint.complaintId} has been escalated to the Collector for district-level resolution.`, 'status_update', complaint._id);
    fcm.sendToUser(complaint.citizen, {
      title: '🚨 Complaint Escalated',
      body: `Your complaint ${complaint.complaintId} has been escalated to the District Collector.`,
      data: { type: 'complaint_escalated', complaintId: complaint._id.toString(), url: `/dashboard/complaints/${complaint._id}` }
    }).catch(() => { });

    // Notify the Collector of this district
    try {
      const User = require('../models/User');
      const collector = await User.findOne({ district: complaint.district, role: 'collector' });
      if (collector) {
        await sendNotification(collector._id, 'High Priority Escalation', `Complaint ${complaint.complaintId} has been escalated to your office.`, 'complaint_escalated', complaint._id);
        fcm.sendToUser(collector._id, {
          title: '⚠️ High Priority Escalation',
          body: `Complaint ${complaint.complaintId} has been escalated from ${complaint.villageCode}. Needs your attention.`,
          data: { type: 'complaint_escalated', complaintId: complaint._id.toString(), url: `/dashboard/admin/complaints` }
        }).catch(() => { });
      }
    } catch (collErr) {
      console.error('Failed to notify collector:', collErr);
    }

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET /api/complaints/export
exports.exportComplaints = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'panchayat_secretary') {
      query.village = req.user.village;
    } else if (req.user.role === 'collector') {
      // Collector can see all villages
    } else if (req.user.role === 'officer') {
      query.assignedTo = req.user._id;
    } else if (req.user.role === 'citizen') {
      query.citizen = req.user._id;
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name mobile village mandal')
      .populate({ path: 'citizen', populate: { path: 'mandal', select: 'name' } })
      .populate({
        path: 'village',
        select: 'name villageCode mandal',
        populate: { path: 'mandal', select: 'name' }
      })
      .populate('district', 'name')
      .populate('assignedTo', 'name role department')
      .sort({ createdAt: -1 });

    // Build CSV with expanded columns and better formatting
    const header = [
      'Complaint ID',
      'Title',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Citizen',
      'Mobile Number',
      'Village',
      'Village Code',
      'District',
      'Department',
      'Assigned To',
      'Created At',
      'Resolved At'
    ].join(',');

    const rows = complaints.map(c => {
      // Excel hack: prefixing with \t (tab) forces Excel to treat long numbers as text, 
      // preventing scientific notation (e.g. 9.7E+09)
      const mobile = c.citizen?.mobile || '';
      const formattedMobile = mobile ? `"\t${mobile}"` : '""';

      // Format dates to be human readable with time (DD/MM/YYYY HH:mm)
      // Excel hack: prefixing with \t (tab) forces Excel to treat this as text,
      // which prevents the '#########' display in narrow columns.
      const formatDate = (date) => {
        if (!date) return '"N/A"';
        const d = new Date(date);
        const pad = (n) => String(n).padStart(2, '0');
        const formatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return `"\t${formatted}"`;
      };

      const data = [
        `"${c.complaintId || ''}"`,
        `"${(c.title || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(c.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${c.category || ''}"`,
        `"${c.priority || 'medium'}"`,
        `"${c.status || ''}"`,
        `"${(c.citizen?.name || '').replace(/"/g, '""')}"`,
        formattedMobile,
        `"${(c.village?.name || '').replace(/"/g, '""')}"`,
        `"${c.villageCode || c.village?.villageCode || ''}"`,
        `"${(c.district?.name || '').replace(/"/g, '""')}"`,
        `"${c.department || 'N/A'}"`,
        `"${(c.assignedTo?.name || 'Unassigned').replace(/"/g, '""')}"`,
        formatDate(c.createdAt),
        formatDate(c.resolvedAt)
      ];
      return data.join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Set UTF-8 BOM to ensure Excel opens Indian languages/special chars correctly if any
    const BOM = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Complaints_Report_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(BOM + csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
