const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require('multer-s3');
const path = require('path');
const { protect } = require('../middleware/auth');
const s3Client = require('../utils/s3Config');

const upload = multer({
  storage: s3Client ? multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
    }
  }) : multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.resolve(__dirname, '../uploads');
      const fs = require('fs');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images, videos and audio files allowed'), false);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/', protect, upload.array('files', 5), (req, res) => {
  try {
    const files = req.files.map(f => ({
      url: f.location || `/uploads/${f.filename}`, // Fallback to local path if S3 failed
      type: f.mimetype.startsWith('image') ? 'image' : f.mimetype.startsWith('video') ? 'video' : 'audio',
      filename: f.key || f.filename,
      size: f.size
    }));
    res.json({ success: true, files });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;

