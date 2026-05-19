const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const User = require('../models/User');
const auth = require('../middleware/auth'); // Use centralized auth that provides req.user correctly

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            'Extract the patient history, vital symptoms, and medical records from this file with 95%+ strict OCR accuracy. Summarize it concisely and bulleted so a doctor can evaluate it immediately for further exercises and treatments. Exclude footer noise.',
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype || 'application/pdf'
                }
            }
        ]
    });

    const extractedText = typeof response.text === 'function'
      ? response.text()
      : (response.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '');
    
    // In central auth, req.user is just the string ID
    await User.findByIdAndUpdate(req.user, {
        medicalHistory: extractedText
    });

    res.json({ success: true, history: extractedText });
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    res.status(500).json({ error: 'Failed to process medical record via Gemini.', detail: error.message });
  }
});

// GET /api/history/me — return current patient's extracted medical history
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('medicalHistory');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ medicalHistory: user.medicalHistory || null });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch medical history.' });
  }
});

module.exports = router;
