require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await User.countDocuments();
    const users = await User.find({}, 'name mobile role').limit(10);
    console.log(`User count: ${count}`);
    console.log('Users:', JSON.stringify(users, null, 2));
    process.exit(0);
}

check();
