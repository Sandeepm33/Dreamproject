const mongoose = require('mongoose');
require('dotenv').config();
const FcmToken = require('./models/FcmToken');
const User = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tokens = await FcmToken.find().populate('user', 'name role village');
  console.log('--- ACTIVE TOKENS IN DATABASE ---');
  tokens.forEach(t => {
    if (t.user) {
      console.log(`User: ${t.user.name} | Role: ${t.user.role} | Village: ${t.user.village}`);
    } else {
      console.log(`Token with NO USER: ${t.token.substring(0, 10)}...`);
    }
  });
  console.log('--- END ---');
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
