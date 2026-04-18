const mongoose = require('mongoose');
const { getFirebaseAdmin } = require('./config/firebase-admin');
const { broadcastToAll } = require('./services/fcmService');
require('dotenv').config();

async function test() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  console.log('Starting FCM test...');
  const result = await broadcastToAll({
    title: 'Test Notification',
    body: 'If you see this, Firebase is working!',
    data: { url: '/dashboard' }
  });
  console.log('Test result:', result);
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
