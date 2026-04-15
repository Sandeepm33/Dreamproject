const mongoose = require('mongoose');
require('dotenv').config();
const District = require('../models/District');

const checkDistricts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const districts = await District.find({});
        console.log('Districts:', districts.map(d => d.name));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDistricts();
