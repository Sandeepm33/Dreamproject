const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String },
  role: { type: String, enum: ['citizen', 'admin', 'officer', 'panchayat_secretary', 'collector'], default: 'citizen' },
  village: { type: String, default: 'Default Village' },
  villageCode: { type: String, default: 'VLG' },
  district: { type: String },
  state: { type: String, default: 'Telangana' },
  department: { type: String },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  lastLogin: { type: Date },
  notificationsEnabled: { type: Boolean, default: true },
  language: { type: String, enum: ['en', 'te'], default: 'en' }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
