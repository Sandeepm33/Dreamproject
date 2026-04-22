const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['citizen', 'admin', 'officer', 'panchayat_secretary', 'collector'], default: 'citizen' },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  villageCode: { type: String }, // For historical/convenience use
  mandal: { type: mongoose.Schema.Types.ObjectId, ref: 'Mandal' },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
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
  // Hash password
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Enforce ONE Secretary per Village
  if (this.role === 'panchayat_secretary' && (this.isModified('role') || this.isModified('village'))) {
    const existing = await mongoose.model('User').findOne({ 
      village: this.village, 
      role: 'panchayat_secretary',
      _id: { $ne: this._id } 
    });
    if (existing) {
      throw new Error('This village already has a Panchayat Secretary assigned.');
    }
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
