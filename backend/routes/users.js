const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

const ALLOWED_EXERCISE_SLUGS = new Set([
  'push-ups', 'squats', 'warrior-pose', 'lunges', 'burpees',
  'jumping-jacks', 'mountain-climbers', 'yoga-flow',
]);
const ALLOWED_GAME_SLUGS = new Set([
  'corsi-block-tapping', 'stroop-effect', '1-back-task', 'pattern-matrix', 'word-pairs',
]);

function sanitizeSlugs(input, allowedSet) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((s) => typeof s === 'string' && allowedSet.has(s)))];
}

// Get associated users based on role
router.get('/associations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'doctor') {
      // Find all patients who have this doctor in their assignedDoctors array
      const patients = await User.find({
        role: 'patient',
        assignedDoctors: user._id
      }).select('-password');
      
      return res.json({ role: 'doctor', patients });
    } else {
      // Find all doctors assigned to this patient
      await user.populate('assignedDoctors', '-password');
      return res.json({ role: 'patient', doctors: user.assignedDoctors });
    }
  } catch (error) {
    console.error('Fetch associations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctor: read patient activity plan (personalization)
router.get('/doctor/patients/:patientId/plan', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const patient = await User.findOne({
      _id: req.params.patientId,
      role: 'patient',
      assignedDoctors: doctor._id,
    }).select('doctorPersonalizationEnabled assignedExerciseSlugs assignedCognitiveGameSlugs name email');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' });
    }
    res.json({
      patientId: patient._id,
      name: patient.name,
      email: patient.email,
      doctorPersonalizationEnabled: !!patient.doctorPersonalizationEnabled,
      assignedExerciseSlugs: patient.assignedExerciseSlugs || [],
      assignedCognitiveGameSlugs: patient.assignedCognitiveGameSlugs || [],
    });
  } catch (error) {
    console.error('Get patient plan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: update which exercises / cognitive games the patient may access
router.patch('/doctor/patients/:patientId/plan', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const patient = await User.findOne({
      _id: req.params.patientId,
      role: 'patient',
      assignedDoctors: doctor._id,
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' });
    }

    const { doctorPersonalizationEnabled, exerciseSlugs, gameSlugs } = req.body;
    if (typeof doctorPersonalizationEnabled === 'boolean') {
      patient.doctorPersonalizationEnabled = doctorPersonalizationEnabled;
    }
    if (exerciseSlugs !== undefined) {
      patient.assignedExerciseSlugs = sanitizeSlugs(exerciseSlugs, ALLOWED_EXERCISE_SLUGS);
    }
    if (gameSlugs !== undefined) {
      patient.assignedCognitiveGameSlugs = sanitizeSlugs(gameSlugs, ALLOWED_GAME_SLUGS);
    }

    await patient.save();
    res.json({
      doctorPersonalizationEnabled: patient.doctorPersonalizationEnabled,
      assignedExerciseSlugs: patient.assignedExerciseSlugs,
      assignedCognitiveGameSlugs: patient.assignedCognitiveGameSlugs,
    });
  } catch (error) {
    console.error('Update patient plan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: get patient's OCR-extracted medical history
router.get('/doctor/patients/:patientId/medical-history', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const patient = await User.findOne({
      _id: req.params.patientId,
      role: 'patient',
      assignedDoctors: doctor._id,
    }).select('medicalHistory name');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' });
    }
    res.json({ medicalHistory: patient.medicalHistory || null, name: patient.name });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
