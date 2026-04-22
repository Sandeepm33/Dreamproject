const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    let { name, mobile, email, password, role, village, villageCode, department, district } = req.body;

    if (name) name = name.trim();
    if (mobile) mobile = mobile.trim();
    if (email) email = email.trim().toLowerCase();
    if (password) password = password.trim();

    // Check for existing mobile
    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) return res.status(400).json({ success: false, message: 'Mobile number already registered' });

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered' });

    const userData = { name, mobile, email, password, role: 'citizen', village, villageCode, department, district };

    const user = await User.create(userData);

    // Send welcome email to citizen
    try {
      const sendEmail = require('../utils/sendEmail');
      const message = `Hello ${user.name},\n\nWelcome to the Smart Gram Panchayat Portal!\n\nYour account has been successfully created. You can now log in using your registered email: ${user.email} or mobile number.\n\nThank you for joining us!`;
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Smart Gram Panchayat Portal',
        message: message
      });
    } catch (error) {
      console.error('Welcome email sending failed', error);
    }

    const token = generateToken(user._id);
    const populatedUser = await User.findById(user._id).populate('village district');
    res.status(201).json({ success: true, token, user: populatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login  (supports mobile OR email as identifier)
exports.login = async (req, res) => {
  try {
    let { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ success: false, message: 'Provide mobile/email and password' });

    mobile = mobile.trim();
    password = password.trim();

    // Search for user by mobile OR email
    const user = await User.findOne({
      $or: [
        { mobile: mobile },
        { email: mobile.toLowerCase() }
      ]
    }).select('+password');

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
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
    let { name, email, village, language, notificationsEnabled } = req.body;
    
    if (name) name = name.trim();
    if (!email || email.trim() === '') return res.status(400).json({ success: false, message: 'Email is required' });
    email = email.trim().toLowerCase();
    
    // Check if email belongs to someone else
    const existingEmail = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already in use' });
    
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

    // Send email notification for password change
    try {
      const sendEmail = require('../utils/sendEmail');
      const message = `Hello ${user.name},\n\nYour password for the Smart Gram Panchayat Portal has been changed successfully.\n\nIf you did not make this change, please contact your system administrator immediately.`;
      await sendEmail({
        email: user.email,
        subject: 'SGPIMS Password Changed Successfully',
        message: message
      });
    } catch (err) {
      console.error('Failed to send password change email:', err);
    }

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
