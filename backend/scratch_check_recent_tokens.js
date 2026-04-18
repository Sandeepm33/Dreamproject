const mongoose = require('mongoose');
require('dotenv').config();
require('./models/User'); // Register User model
const FcmToken = require('./models/FcmToken');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await FcmToken.countDocuments();
  console.log(`Total tokens in DB: ${count}`);
  
  const tokens = await FcmToken.find().sort({ lastUsed: -1 }).limit(10).populate('user', 'name role');
  console.log('--- RECENT TOKENS ---');
  tokens.forEach(t => {
    console.log(`[${t.lastUsed.toISOString()}] User: ${t.user?.name || 'Unknown'} | Token Start: ${t.token.substring(0, 15)}...`);
  });
  console.log('--- END ---');
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
