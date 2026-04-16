const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['FIRE', 'FLOOD', 'ELECTRICITY', 'MEDICAL', 'DANGER', 'OTHER']
  },
  message: {
    type: String,
    required: true
  },
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  villageCode: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RESOLVED'],
    default: 'ACTIVE'
  },
  severity: {
    type: String,
    enum: ['HIGH', 'CRITICAL'],
    default: 'CRITICAL'
  },
  location: {
    lat: Number,
    lng: Number,
    description: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 * 7 // Alerts deleted after 7 days automatically
  }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
