const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' }); // Ensure correct path to .env
const District = require('../models/District');
const Mandal = require('../models/Mandal');
const Village = require('../models/Village');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Delete all existing districts, mandals, and villages
        const villageDelete = await Village.deleteMany({});
        const mandalDelete = await Mandal.deleteMany({});
        const districtDelete = await District.deleteMany({});
        console.log(`🗑️ Deleted ${villageDelete.deletedCount} villages, ${mandalDelete.deletedCount} mandals, and ${districtDelete.deletedCount} districts.`);

        // 2. Create Yadadri Bhuvanagiri District
        const yadadri = new District({
            name: 'YADADRI BHUVANAGIRI',
            state: 'Telangana'
        });
        await yadadri.save();
        console.log('✅ Created district: YADADRI BHUVANAGIRI');

        // 3. Create Athmakur m Mandal
        const athmakurMandal = new Mandal({
            name: 'Athmakur m',
            district: yadadri._id
        });
        await athmakurMandal.save();
        console.log('✅ Created mandal: Athmakur m');

        // 4. Create Villages for Athmakur m
        const villageNames = [
            'Athmakur', 'Chada', 'Chamapur', 'Chandepally', 'Duppelli', 'Katepally',
            'Khapuraipally', 'Kondapur', 'Koratikal', 'Kurella', 'Lingarajpally', 
            'Modumaigudem', 'Moripirala', 'Nancharipet', 'Narsapur', 'Pallerla', 
            'Pothireddypally', 'Pullaigudem', 'Raghavapur', 'Rahimkhanpet', 'Raipally', 
            'Singaram', 'T Repaka', 'Thimmapur', 'Sarvepally', 'Thukkapur', 'Uppalaphad'
        ];

        for (const [index, name] of villageNames.entries()) {
            const code = name.substring(0, 3).toUpperCase() + index; // Simple unique code
            await new Village({
                name: name,
                villageCode: code,
                mandal: athmakurMandal._id,
                district: yadadri._id
            }).save();
        }
        
        console.log(`✅ Created ${villageNames.length} villages for Athmakur m.`);

        console.log('🎉 Database seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedData();
