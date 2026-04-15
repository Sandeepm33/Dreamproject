const mongoose = require('mongoose');
require('dotenv').config();
const District = require('../models/District');
const Village = require('../models/Village');

const setupYadadriBhongir = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Delete all existing districts and villages
        const villageDelete = await Village.deleteMany({});
        const districtDelete = await District.deleteMany({});
        console.log(`🗑️ Deleted ${villageDelete.deletedCount} villages and ${districtDelete.deletedCount} districts.`);

        // 2. Create Yadadri Bhongir District
        const yadadri = new District({
            name: 'Yadadri Bhongir',
            state: 'Telangana'
        });
        await yadadri.save();
        console.log('✅ Created district: Yadadri Bhongir');

        // 3. Create Villages for Yadadri Bhongir
        const villages = [
            { name: 'Bhongir', villageCode: 'BHR', mandal: 'Bhongir', district: yadadri._id },
            { name: 'Bhuvanagiri', villageCode: 'BVG', mandal: 'Bhuvanagiri', district: yadadri._id },
            { name: 'Yadagirigutta', villageCode: 'YDG', mandal: 'Yadagirigutta', district: yadadri._id },
            { name: 'Alair', villageCode: 'ALR', mandal: 'Alair', district: yadadri._id },
            { name: 'Choutuppal', villageCode: 'CHP', mandal: 'Choutuppal', district: yadadri._id },
            { name: 'Mothkur', villageCode: 'MTR', mandal: 'Mothkur', district: yadadri._id },
            { name: 'Bibinagar', villageCode: 'BBN', mandal: 'Bibinagar', district: yadadri._id },
            { name: 'Pochampally', villageCode: 'PCP', mandal: 'Pochampally', district: yadadri._id }
        ];

        for (const v of villages) {
            await new Village(v).save();
        }
        console.log(`✅ Created ${villages.length} villages for Yadadri Bhongir.`);

        console.log('🎉 Database cleanup and setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

setupYadadriBhongir();
