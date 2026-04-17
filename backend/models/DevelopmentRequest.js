const mongoose = require('mongoose');

const developmentRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['roads', 'water', 'electricity', 'education', 'health', 'community_hall', 'others'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected', 'in_progress', 'completed'],
    default: 'pending'
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Panchayat Secretary
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true }, // Collector's District
  estimatedBudget: { type: Number },
  remarks: [{
    text: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    url: { type: String },
    name: { type: String }
  }],
  collectorNote: { type: String }
}, { timestamps: true });

developmentRequestSchema.pre('save', async function() {
  if (!this.requestId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('DevelopmentRequest').countDocuments() + 1;
    this.requestId = `DEV-${year}-${String(count).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('DevelopmentRequest', developmentRequestSchema);
