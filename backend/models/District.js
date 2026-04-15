const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  state: { type: String, default: 'Telangana' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('District', districtSchema);
