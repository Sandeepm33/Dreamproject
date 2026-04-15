const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

// POST /api/votes/:complaintId
router.post('/:complaintId', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const userId = req.user._id.toString();
    const hasVoted = complaint.votes.map(v => v.toString()).includes(userId);

    if (hasVoted) {
      complaint.votes = complaint.votes.filter(v => v.toString() !== userId);
      complaint.voteCount = Math.max(0, complaint.voteCount - 1);
    } else {
      complaint.votes.push(req.user._id);
      complaint.voteCount += 1;
    }
    await complaint.save();
    res.json({ success: true, voted: !hasVoted, voteCount: complaint.voteCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
