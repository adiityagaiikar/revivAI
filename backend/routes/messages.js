const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * GET /api/messages/:doctorId
 *
 * Returns the full chronological message thread between the authenticated
 * user (patient) and the given doctor.  Works for both sides — if a doctor
 * calls this endpoint the roles are simply reversed.
 *
 * Response: { messages: Message[] }
 */
router.get('/:doctorId', auth, async (req, res) => {
  try {
    const userId = req.user;
    const { doctorId } = req.params;

    // Validate the other party exists
    const other = await User.findById(doctorId).select('_id');
    if (!other) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch messages in either direction between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: doctorId },
        { sender: doctorId, receiver: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'name role')
      .populate('receiver', 'name role');

    return res.json({ messages });
  } catch (err) {
    console.error('GET /messages error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/messages
 *
 * Body: { receiverId: string, text: string }
 *
 * Saves a new message from the authenticated user to `receiverId`.
 * Validates that a patient can only message their own assigned doctor,
 * and that the receiver exists.
 *
 * Response: { message: Message }
 */
router.post('/', auth, async (req, res) => {
  try {
    const senderId = req.user;
    const { receiverId, text } = req.body;

    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({ error: 'receiverId and text are required.' });
    }

    if (text.trim().length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars).' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId).select('_id role');
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found.' });
    }

    // If the sender is a patient, make sure the receiver is their assigned doctor
    const sender = await User.findById(senderId).select('role assignedDoctor');
    if (sender.role === 'patient') {
      const assignedId = sender.assignedDoctor?.toString();
      if (assignedId !== receiverId) {
        return res.status(403).json({ error: 'You can only message your assigned doctor.' });
      }
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      text: text.trim(),
    });

    await newMessage.save();
    await newMessage.populate('sender', 'name role');
    await newMessage.populate('receiver', 'name role');

    return res.status(201).json({ message: newMessage });
  } catch (err) {
    console.error('POST /messages error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
