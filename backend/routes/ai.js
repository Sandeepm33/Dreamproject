const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage (for direct buffer processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/chat', aiController.chat);
router.post('/translate', protect, aiController.translate);
router.post('/transcribe', protect, upload.single('audio'), aiController.transcribe);

module.exports = router;
