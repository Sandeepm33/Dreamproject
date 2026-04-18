const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const fcm = require('../services/fcmService');

// Threshold for community vote notification (35%)
const VOTE_THRESHOLD = 0.35;

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

    // Check 35% vote threshold (only when vote was added, not removed)
    if (!hasVoted) {
      try {
        // Count total citizens in the same village
        const totalVillageUsers = await User.countDocuments({
          village: complaint.village,
          role: 'citizen',
          isActive: true,
        });

        if (totalVillageUsers > 0) {
          const percent = Math.round((complaint.voteCount / totalVillageUsers) * 100);

          // Notify once when crossing 35% (and exactly hitting other multiples of 10 above 35)
          const notifyThresholds = [35, 50, 75, 100];
          const prevPercent = Math.round(((complaint.voteCount - 1) / totalVillageUsers) * 100);

          const crossed = notifyThresholds.find(t => prevPercent < t && percent >= t);
          if (crossed) {
            // Notify the complaint owner + the panchayat secretary of this village
            const secretary = await User.findOne({ village: complaint.village, role: 'panchayat_secretary' });
            const notifyUsers = [complaint.citizen.toString()];
            if (secretary) notifyUsers.push(secretary._id.toString());

            fcm.notifyVotingThreshold(notifyUsers, complaint._id.toString(), complaint.complaintId, crossed).catch(() => {});
          }
        }
      } catch (notifyErr) {
        console.error('[Votes] Threshold notification error:', notifyErr.message);
      }
    }

    res.json({ success: true, voted: !hasVoted, voteCount: complaint.voteCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
