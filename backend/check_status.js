const mongoose = require('mongoose');
const EmergencyAlert = require('./models/EmergencyAlert');
require('dotenv').config();

async function checkAlerts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  
  const alerts = await EmergencyAlert.find({
    status: 'ACTIVE',
    createdAt: { $gte: twoMinutesAgo }
  });

  if (alerts.length === 0) {
    console.log('No active alerts found in the last 2 minutes.');
    // Check if there are ANY active alerts at all
    const allActive = await EmergencyAlert.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(1);
    if (allActive.length > 0) {
        const diff = now.getTime() - allActive[0].createdAt.getTime();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        console.log(`Latest ACTIVE alert (expired from fetch): Created ${mins}m ${secs}s ago (${allActive[0].createdAt.toISOString()})`);
    }
  } else {
    alerts.forEach(a => {
      const diff = now.getTime() - a.createdAt.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const remainingSecs = Math.max(0, 120 - Math.floor(diff / 1000));
      console.log(`Alert ID: ${a._id}`);
      console.log(`Created: ${a.createdAt.toISOString()}`);
      console.log(`Elapsed: ${mins}m ${secs}s`);
      console.log(`Remaining: ${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s`);
    });
  }
  await mongoose.disconnect();
}

checkAlerts();
