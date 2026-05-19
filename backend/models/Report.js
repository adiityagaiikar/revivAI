const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g. "Blood Panel", "MRI Scan"
  status: { type: String, enum: ['Normal', 'Requires Attention', 'Pending Review'], required: true },
  critical: { type: Boolean, default: false },
  reportId: { type: String, required: true }, // e.g. "LAB-9921"
  date: { type: Date, default: Date.now },
  // PDF snapshot generated when patient sends report to doctor (exercise + cognitive data)
  pdfData: { type: Buffer },
});

module.exports = mongoose.model('Report', reportSchema);
