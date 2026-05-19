const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  type: { type: String, enum: ['Clinical', 'Admin', 'Meeting'], required: true },
  urgency: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  completed: { type: Boolean, default: false },
  time: { type: String }, // e.g. "2:00 PM"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
