require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createCollector = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ mobile: '8000000000' });
    if (existing) {
      console.log('⚠️ Collector already exists');
      process.exit(0);
    }

    await User.create({
      name: 'District Collector',
      mobile: '8000000000',
      password: 'collector123',
      role: 'collector',
      district: 'Nalgonda',
      isActive: true
    });

    console.log('✅ Collector account created: 8000000000 / collector123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
};

createCollector();
