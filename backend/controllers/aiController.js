const aiService = require('../services/aiService');

exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const response = await aiService.getChatResponse(history || [], message);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.translate = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const translated = await aiService.translateText(text, targetLanguage);
    res.json({ success: true, translated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.transcribe = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Audio file is required' });

    const result = await aiService.transcribeAudio(req.file.buffer, req.file.mimetype);
    if (!result) return res.status(500).json({ success: false, message: 'Transcription failed' });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
