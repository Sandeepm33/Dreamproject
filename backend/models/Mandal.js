const mongoose = require('mongoose');

const mandalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Mandal', mandalSchema);
