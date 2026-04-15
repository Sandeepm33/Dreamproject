const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['complaint_created', 'status_update', 'escalation', 'vote', 'resolution', 'general'], default: 'general' },
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  imageUrl: { type: String },
  audioUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
