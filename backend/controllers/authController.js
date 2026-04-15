const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, mobile, password, role, village, villageCode, department, district } = req.body;
    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ success: false, message: 'Mobile already registered' });

    const user = await User.create({ name, mobile, password, role: 'citizen', village, villageCode, department, district });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ success: false, message: 'Provide mobile and password' });

    const user = await User.findOne({ mobile }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user._id);
    const populatedUser = await User.findById(user._id).populate('village district');
    res.json({ success: true, token, user: populatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, village, language, notificationsEnabled } = req.body;
    
    const updateData = { name, email, language, notificationsEnabled };
    // Only update village if it's a valid ObjectId to prevent CastError
    if (village && require('mongoose').Types.ObjectId.isValid(village)) {
      updateData.village = village;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).populate('village district');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
