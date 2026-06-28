const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

function buildScheduledAt(date, time) {
  const scheduledAt = new Date(`${date}T${time}:00`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

function serializeAppointment(appointment) {
  return {
    id: appointment._id.toString(),
    patientId: appointment.patientId ? appointment.patientId.toString() : undefined,
    patientName: appointment.patientName,
    date: appointment.date,
    time: appointment.time,
    type: appointment.type,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }

    const appointments = await Appointment.find({ doctorId: doctor._id }).sort({ scheduledAt: 1 });
    res.json(appointments.map(serializeAppointment));
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }

    const { patientName, date, time, type, patientId = null } = req.body;
    if (!patientName || !date || !time || !type) {
      return res.status(400).json({ error: 'patientName, date, time, and type are required.' });
    }

    const scheduledAt = buildScheduledAt(date, time);
    if (!scheduledAt) {
      return res.status(400).json({ error: 'Invalid appointment date or time.' });
    }

    const appointment = await Appointment.create({
      doctorId: doctor._id,
      patientId: patientId || null,
      patientName,
      date,
      time,
      type,
      scheduledAt,
    });

    res.status(201).json(serializeAppointment(appointment));
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }

    const updates = {};
    if (typeof req.body.patientName === 'string' && req.body.patientName.trim()) {
      updates.patientName = req.body.patientName.trim();
    }
    if (typeof req.body.date === 'string' && req.body.date.trim()) {
      updates.date = req.body.date.trim();
    }
    if (typeof req.body.time === 'string' && req.body.time.trim()) {
      updates.time = req.body.time.trim();
    }
    if (typeof req.body.type === 'string' && req.body.type.trim()) {
      updates.type = req.body.type.trim();
    }

    if (updates.date || updates.time) {
      const scheduledAt = buildScheduledAt(String(updates.date || req.body.date || ''), String(updates.time || req.body.time || ''));
      if (!scheduledAt) {
        return res.status(400).json({ error: 'Invalid appointment date or time.' });
      }
      updates.scheduledAt = scheduledAt;
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctorId: doctor._id },
      { $set: updates },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json(serializeAppointment(appointment));
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }

    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, doctorId: doctor._id });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;