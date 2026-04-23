const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images, videos and audio files allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', protect, upload.array('files', 5), (req, res) => {
  try {
    const files = req.files.map(f => ({
      url: `/uploads/${f.filename}`,
      type: f.mimetype.startsWith('image') ? 'image' : f.mimetype.startsWith('video') ? 'video' : 'audio',
      filename: f.filename,
      size: f.size
    }));
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
