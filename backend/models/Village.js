const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  villageCode: { type: String, required: true, unique: true, trim: true },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true },
  mandal: { type: mongoose.Schema.Types.ObjectId, ref: 'Mandal', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure only one secretary per village
// This will be enforced at the User level by checking for a combination of village and role
// villageSchema.index({ villageCode: 1 });

module.exports = mongoose.model('Village', villageSchema);
