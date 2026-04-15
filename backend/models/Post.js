const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
