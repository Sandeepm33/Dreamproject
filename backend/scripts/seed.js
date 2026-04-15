require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Notification.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create Users
    const hashPw = async (pw) => bcrypt.hash(pw, 10);

    const admin = await User.create({
      name: 'Panchayat Admin', mobile: '9000000000',
      password: 'admin123', role: 'admin',
      village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true
    });

    const panchayatSecretary = await User.create({
      name: 'Panchayat Secretary', mobile: '9000000001',
      password: 'super123', role: 'panchayat_secretary',
      village: 'District HQ', villageCode: 'DHQ', district: 'Nalgonda', isActive: true
    });

    const collector = await User.create({
      name: 'District Collector', mobile: '8000000000',
      password: 'collector123', role: 'collector',
      district: 'Nalgonda', isActive: true
    });

    const waterOfficer = await User.create({
      name: 'Ravi Kumar', mobile: '9100000001',
      password: 'officer123', role: 'officer',
      department: 'Water Department', village: 'Rampur', villageCode: 'RMP', isActive: true
    });

    const roadsOfficer = await User.create({
      name: 'Suresh Reddy', mobile: '9100000002',
      password: 'officer123', role: 'officer',
      department: 'Panchayat', village: 'Rampur', villageCode: 'RMP', isActive: true
    });

    const electricOfficer = await User.create({
      name: 'Prasad Rao', mobile: '9100000003',
      password: 'officer123', role: 'officer',
      department: 'Electricity Department', village: 'Rampur', villageCode: 'RMP', isActive: true
    });

    const citizensData = [
      { name: 'Ramesh Naidu', mobile: '9200000001', password: 'citizen123', role: 'citizen', village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true },
      { name: 'Lakshmi Devi', mobile: '9200000002', password: 'citizen123', role: 'citizen', village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true },
      { name: 'Venkat Swamy', mobile: '9200000003', password: 'citizen123', role: 'citizen', village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true },
      { name: 'Padma Reddy', mobile: '9200000004', password: 'citizen123', role: 'citizen', village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true },
      { name: 'Srinivas Goud', mobile: '9200000005', password: 'citizen123', role: 'citizen', village: 'Rampur', villageCode: 'RMP', district: 'Nalgonda', isActive: true },
    ];
    
    const citizens = [];
    for(const data of citizensData) {
      citizens.push(await User.create(data));
    }

    console.log(`✅ Created ${citizens.length + 5} users`);

    // Create Complaints
    const complaintData = [
      { title: 'Water pipe leakage near temple road', description: 'There is a major water pipe leakage near the temple road. Water has been wasting for 3 days affecting 50+ families.', category: 'water', status: 'resolved', citizen: citizens[0]._id, assignedTo: waterOfficer._id, voteCount: 23, villageCode: 'RMP', resolvedAt: new Date(), location: { address: 'Near Shiva Temple, Ward 3', village: 'Rampur', district: 'Nalgonda' } },
      { title: 'Large pothole on main bazaar road', description: 'A dangerous pothole has formed on the main bazaar road. Two bikes have already slipped. Immediate repair needed.', category: 'roads', status: 'in_progress', citizen: citizens[1]._id, assignedTo: roadsOfficer._id, voteCount: 45, villageCode: 'RMP', location: { address: 'Main Bazaar Road near bus stop', village: 'Rampur' } },
      { title: 'Streetlight not working near school', description: 'The streetlight near the government school has been non-functional for 2 weeks causing safety issues for children.', category: 'electricity', status: 'assigned', citizen: citizens[2]._id, assignedTo: electricOfficer._id, voteCount: 31, villageCode: 'RMP', location: { address: 'Near Govt. School, Ward 2', village: 'Rampur' } },
      { title: 'Garbage pile up behind community hall', description: 'Large garbage accumulation behind the community hall. Foul smell and health hazard. Sanitation team not collecting for 5 days.', category: 'sanitation', status: 'pending', citizen: citizens[3]._id, voteCount: 18, villageCode: 'RMP', location: { address: 'Behind Community Hall, Ward 4', village: 'Rampur' } },
      { title: 'Drinking water supply irregular', description: 'Water supply coming only every alternate day. Cannot store enough water. Elderly people are suffering.', category: 'water', status: 'escalated', citizen: citizens[4]._id, assignedTo: waterOfficer._id, voteCount: 67, villageCode: 'RMP', location: { address: 'Colony G, Rampur Village', village: 'Rampur' } },
      { title: 'Road blockage due to waterlogging', description: 'Road near the pump house gets waterlogged after every rain. Connection road to farms is blocked.', category: 'roads', status: 'pending', citizen: citizens[0]._id, voteCount: 12, villageCode: 'RMP', location: { address: 'Near Pump House, Agricultural Road', village: 'Rampur' } },
      { title: 'Electric transformer overloaded', description: 'Transformer serving our area is overloaded causing frequent outages. Need an additional transformer urgently.', category: 'electricity', status: 'pending', citizen: citizens[1]._id, voteCount: 8, villageCode: 'RMP', location: { address: 'Colony D, Rampur', village: 'Rampur' } },
      { title: 'Open drainage causing health hazard', description: 'Open drainage beside the main road is breeding mosquitoes. Cases of dengue have been reported in nearby houses.', category: 'sanitation', status: 'assigned', citizen: citizens[2]._id, assignedTo: roadsOfficer._id, voteCount: 29, villageCode: 'RMP', location: { address: 'Main Road beside Ward 5 Drainage', village: 'Rampur' } },
    ];

    const createdComplaints = [];
    for (const data of complaintData) {
      const c = new Complaint(data);
      // Add status history
      c.statusHistory = [{ status: 'pending', changedBy: data.citizen, note: 'Complaint submitted', changedAt: new Date(Date.now() - 7*24*60*60*1000) }];
      if (data.status !== 'pending') {
        c.statusHistory.push({ status: 'assigned', changedBy: admin._id, note: 'Assigned to department', changedAt: new Date(Date.now() - 5*24*60*60*1000) });
      }
      if (['in_progress','resolved'].includes(data.status)) {
        c.statusHistory.push({ status: 'in_progress', changedBy: data.assignedTo, note: 'Officer working on issue', changedAt: new Date(Date.now() - 2*24*60*60*1000) });
      }
      if (data.status === 'resolved') {
        c.statusHistory.push({ status: 'resolved', changedBy: data.assignedTo, note: 'Issue resolved, work completed', changedAt: new Date() });
        c.resolutionApproval = { status: 'approved', approvedBy: data.citizen, approvedAt: new Date() };
      }
      if (data.status === 'escalated') {
        c.escalation = { level: 'mandal', triggeredAt: new Date(), reason: 'Not resolved within 3 days' };
      }
      c.votes = data.voteCount ? citizens.slice(0, Math.min(data.voteCount, citizens.length)).map(ci => ci._id) : [];
      await c.save();
      createdComplaints.push(c);
    }
    console.log(`✅ Created ${createdComplaints.length} complaints`);

    // Create notifications
    for (let i = 0; i < Math.min(5, citizens.length); i++) {
      await Notification.create({
        user: citizens[i]._id,
        title: 'Welcome to SGPIMS!',
        message: 'Your account is set up. You can now raise complaints and track their resolution.',
        type: 'general'
      });
    }
    for (const c of createdComplaints.filter(c => c.status !== 'pending')) {
      await Notification.create({
        user: c.citizen,
        title: 'Status Update',
        message: `Your complaint ${c.complaintId} status is now: ${c.status.replace('_',' ')}.`,
        type: 'status_update',
        complaint: c._id
      });
    }
    console.log('✅ Created notifications');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('─────────────────────────────────────');
    console.log('🏛️  Collector:   8000000000 / collector123');
    console.log('🛡️  Admin:       9000000000 / admin123');
    console.log('🏛️  Panchayat Secretary: 9000000001 / super123');
    console.log('💧  Water Officer: 9100000001 / officer123');
    console.log('🛣️  Roads Officer: 9100000002 / officer123');
    console.log('⚡  Elec. Officer: 9100000003 / officer123');
    console.log('👤  Citizen 1:  9200000001 / citizen123');
    console.log('👤  Citizen 2:  9200000002 / citizen123');
    console.log('─────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
