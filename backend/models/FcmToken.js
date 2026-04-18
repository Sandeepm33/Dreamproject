/**
 * FcmToken Model
 * Stores FCM push tokens keyed per user + device.
 * One user can have multiple tokens (multiple devices / browsers).
 */
const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // Prevents duplicates at DB level
    },
    // Useful for debugging / analytics
    platform: {
      type: String,
      enum: ['web', 'android', 'ios'],
      default: 'web',
    },
    userAgent: { type: String },
    // Mark as invalid after failed send attempt so we can clean up
    isActive: { type: Boolean, default: true },
    lastUsed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index so we can efficiently query all active tokens for a user
fcmTokenSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('FcmToken', fcmTokenSchema);
