const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const fcm = require('../services/fcmService');

const sendNotification = async (userId, title, message, type, complaintId, data = {}) => {
  try {
    // 1. Save to Database
    await Notification.create({ user: userId, title, message, type, complaint: complaintId });
    
    // 2. Fire Real Push Notification (FCM)
    // We catch errors to ensure push failures don't break the main request flow
    fcm.sendToUser(userId, {
      title: title.startsWith('✅') || title.startsWith('📋') || title.startsWith('🛠️') ? title : `🔔 ${title}`,
      body: message,
      data: { 
        ...data, 
        type, 
        complaintId: complaintId?.toString(),
        url: data.url || `/dashboard/complaints/${complaintId}` 
      }
    }).catch(err => console.error('[FCM Push Error]', err.message));
  } catch (err) { console.error('Notification error:', err); }
};

// POST /api/complaints
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, villageCode, media, citizenId } = req.body;

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

    // Fire unified notification (DB + Push)
    await sendNotification(
      reportee._id, 
      '✅ Complaint Submitted', 
      `Your complaint ${complaint.complaintId} has been submitted successfully and is under review.`, 
      'complaint_created', 
      complaint._id
    );

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
          await sendNotification(
            secretary._id, 
            '🆕 New Complaint Received', 
            `A new complaint (${complaint.complaintId}) has been filed in your village. Please review it.`, 
            'complaint_created', 
            complaint._id,
            { url: `/dashboard/complaints/${complaint._id}` }
          );
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


    const conditions = [];

    if (req.user) {
      if (req.user.role === 'citizen' || isMine === 'true') {
        conditions.push({ citizen: req.user._id });
      } else if (req.user.role === 'panchayat_secretary') {
        conditions.push({ village: req.user.village });
      } else if (req.user.role === 'collector') {
        // Collector sees all in their district (or all villages if intended)
        // conditions.push({ district: req.user.district }); 
      } else if (req.user.role === 'officer') {
        conditions.push({ assignedTo: req.user._id });
      }
    }

    if (status) conditions.push({ status });
    if (category) conditions.push({ category });

    // Date Range Filtering (Received or Status Updated)
    if (req.query.startDate || req.query.endDate) {
      const start = req.query.startDate ? new Date(req.query.startDate) : null;
      const end = req.query.endDate ? new Date(req.query.endDate) : null;
      
      const dateQuery = {};
      if (start) dateQuery.$gte = start;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        dateQuery.$lte = endOfDay;
      }

      conditions.push({
        $or: [
          { createdAt: dateQuery },
          { 'statusHistory.changedAt': dateQuery }
        ]
      });
    }

    // Geographic Filtering
    if (lat && lng) {
      const r = parseFloat(radius) || 5;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const latDelta = r / 111;
      const lngDelta = r / (111 * Math.cos(latitude * Math.PI / 180));

      conditions.push({
        'location.lat': { $gte: latitude - latDelta, $lte: latitude + latDelta },
        'location.lng': { $gte: longitude - lngDelta, $lte: longitude + lngDelta }
      });
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { complaintId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

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

    await sendNotification(
      complaint.citizen, 
      status === 'resolved' ? '🎉 Complaint Resolved' : '📋 Status Updated', 
      status === 'resolved' 
        ? `Your complaint ${complaint.complaintId} has been resolved. Please review and confirm.`
        : `Your complaint ${complaint.complaintId} status changed to ${status.replace('_', ' ')}.`, 
      'status_update', 
      complaint._id
    );
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

    await sendNotification(
      complaint.citizen._id, 
      '🛠️ Complaint Assigned', 
      `Your complaint ${complaint.complaintId} has been assigned to the ${department} department.`, 
      'status_update', 
      complaint._id
    );

    // Notify the assigned Officer
    if (officerId) {
      await sendNotification(
        officerId, 
        '🛠️ New Work Assigned', 
        `You have been assigned to resolve complaint ${complaint.complaintId} (${department}).`, 
        'complaint_assigned', 
        complaint._id
      );
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

    // Notify the complaint owner
    if (String(req.user._id) !== String(complaint.citizen)) {
      await sendNotification(
        complaint.citizen, 
        '💬 New Remark Added', 
        `Officer/Secretary added a remark to your complaint ${complaint.complaintId}.`, 
        'status_update', 
        complaint._id,
        { type: 'remark_added' }
      );
    }

    // Also notify secretary if it was someone else
    const secretary = await User.findOne({ village: complaint.village, role: 'panchayat_secretary' });
    if (secretary && String(req.user._id) !== String(secretary._id)) {
      await sendNotification(
        secretary._id, 
        '💬 New Remark Added', 
        `A remark has been added to complaint ${complaint.complaintId} in your village.`, 
        'status_update', 
        complaint._id,
        { type: 'remark_added' }
      );
    }

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

    // Notify the Collector of this district
    try {
      const User = require('../models/User');
      const collector = await User.findOne({ district: complaint.district, role: 'collector' });
      if (collector) {
        await sendNotification(collector._id, 'High Priority Escalation', `Complaint ${complaint.complaintId} has been escalated to your office.`, 'complaint_escalated', complaint._id);
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
