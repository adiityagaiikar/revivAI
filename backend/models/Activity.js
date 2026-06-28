const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // e.g. "Morning Yoga", "Memory Game"
  type: { type: String, enum: ['Fitness', 'Cognitive'], required: true },
  duration: { type: String }, // e.g. "30 min"
  score: { type: String }, // e.g. "85%"
  date: { type: Date, default: Date.now },
  calories: { type: Number, default: 0 },
  clinicalNote: { type: String }, // AI-generated SOAP note
});

module.exports = mongoose.model('Activity', activitySchema);
