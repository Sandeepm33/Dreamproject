const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Running escalation job...');
  try {
    const now = new Date();

    // Level 1: 3 days → Mandal
    const level1 = await Complaint.find({
      status: { $nin: ['resolved', 'rejected', 'escalated'] },
      'escalation.level': 'none',
      createdAt: { $lte: new Date(now - 3 * 24 * 60 * 60 * 1000) }
    }).populate('citizen');

    for (const c of level1) {
      c.escalation = { level: 'mandal', triggeredAt: now, reason: 'Not resolved within 3 days' };
      c.status = 'escalated';
      c.statusHistory.push({ status: 'escalated', note: 'Auto-escalated to Mandal Officer (3 days)' });
      await c.save();
      await Notification.create({
        user: c.citizen._id,
        title: 'Complaint Escalated',
        message: `Your complaint ${c.complaintId} has been escalated to Mandal Officer as it was not resolved in 3 days.`,
        type: 'escalation',
        complaint: c._id
      });
      console.log(`⬆️ Escalated to Mandal: ${c.complaintId}`);
    }

    // Level 2: 7 days → District
    const level2 = await Complaint.find({
      status: 'escalated',
      'escalation.level': 'mandal',
      'escalation.triggeredAt': { $lte: new Date(now - 4 * 24 * 60 * 60 * 1000) }
    }).populate('citizen');

    for (const c of level2) {
      c.escalation = { level: 'district', triggeredAt: now, reason: 'Not resolved within 7 days' };
      c.statusHistory.push({ status: 'escalated', note: 'Auto-escalated to District Authority (7 days)' });
      await c.save();
      await Notification.create({
        user: c.citizen._id,
        title: 'Complaint Escalated to District',
        message: `Your complaint ${c.complaintId} has been escalated to District Authority as it was not resolved in 7 days.`,
        type: 'escalation',
        complaint: c._id
      });
      console.log(`⬆️ Escalated to District: ${c.complaintId}`);
    }

    console.log(`✅ Escalation job done. L1: ${level1.length}, L2: ${level2.length}`);
  } catch (err) {
    console.error('❌ Escalation job failed:', err);
  }
});

console.log('⏰ Escalation cron job scheduled');
