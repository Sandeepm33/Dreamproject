const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('./models/Notification');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await Notification.countDocuments();
  console.log(`Total notifications in DB: ${count}`);
  
  const latest = await Notification.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name role');
  console.log('--- LATEST 5 NOTIFICATIONS ---');
  latest.forEach(n => {
    console.log(`[${n.createdAt.toISOString()}] To: ${n.user?.name || 'Unknown'} | Title: ${n.title} | Type: ${n.type}`);
  });
  console.log('--- END ---');
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
