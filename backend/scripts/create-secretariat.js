require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createSecretariat = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ mobile: '9000000000' });
    if (existing) {
      console.log('⚠️ Secretariat Office account already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Secretariat Office',
      mobile: '9000000000',
      email: 'secretariat@grampanchayat.gov.in',
      password: 'secretariat123',
      role: 'secretariat_office',
      isActive: true
    });

    console.log('✅ Secretariat Office account created:');
    console.log('Mobile: 9000000000');
    console.log('Password: secretariat123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
};

createSecretariat();
