const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  category: {
    type: String,
    enum: ['water', 'roads', 'electricity', 'sanitation', 'others'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated'],
    default: 'pending'
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: String },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true },
  location: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    villageLabel: { type: String }, // Human readable label
    districtLabel: { type: String }
  },
  media: [{
    url: { type: String },
    type: { type: String, enum: ['image', 'video'] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    isResolutionProof: { type: Boolean, default: false }
  }],
  beforeImage: { type: String },
  afterImage: { type: String },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  voteCount: { type: Number, default: 0 },
  remarks: [{
    text: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],
  statusHistory: [{
    status: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String }
  }],
  escalation: {
    level: { type: String, enum: ['none', 'mandal', 'district'], default: 'none' },
    triggeredAt: { type: Date },
    reason: { type: String }
  },
  resolutionApproval: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    feedback: { type: String }
  },
  slaDeadline: { type: Date },
  resolvedAt: { type: Date },
  villageCode: { type: String, default: 'VLG' },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }
}, { timestamps: true });

// Auto-generate complaint ID
complaintSchema.pre('save', async function() {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments() + 1;
    this.complaintId = `GP-${this.villageCode}-${year}-${String(count).padStart(4, '0')}`;
  }
  // Set SLA deadline based on category
  if (!this.slaDeadline) {
    const slaHours = { water: 24, roads: 120, electricity: 48, sanitation: 72, others: 96 };
    const hours = slaHours[this.category] || 96;
    this.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  // Auto-assign department
  if (!this.department) {
    const deptMap = { water: 'Water Department', roads: 'Panchayat', electricity: 'Electricity Department', sanitation: 'Sanitation Department', others: 'General' };
    this.department = deptMap[this.category] || 'General';
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
