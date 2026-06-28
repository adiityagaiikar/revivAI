const mongoose = require('mongoose');

/**
 * Message — persists a single chat message between a patient and their doctor.
 *
 * sender   : ObjectId of the user who sent the message
 * receiver : ObjectId of the user who receives it
 * text     : message body (trimmed, max 2000 chars)
 * timestamp: defaults to Date.now so messages sort naturally
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Disable mongoose auto-timestamps (we manage `timestamp` ourselves)
    timestamps: false,
  }
);

// Index for fast thread lookup — retrieve all messages between two users
messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
