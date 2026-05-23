/**
 * seedTriagePatients.js
 *
 * Injects 3 realistic mock patients into MongoDB with triage fields populated.
 * One of them is "Aditya Gaikar" with a low compliance score (55).
 *
 * Usage:
 *   node backend/seedTriagePatients.js
 *
 * Prerequisites:
 *   - MongoDB running (or MONGODB_URI set in .env)
 *   - At least one doctor account in the DB (run seedDoctors.js first if needed)
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dotenv   = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival';

// ── Inline schemas (avoids circular require issues in seed scripts) ──────────

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  assignedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  doctorPersonalizationEnabled: { type: Boolean, default: false },
  medicalHistory:           { type: String, default: '' },
  assignedExerciseSlugs:    { type: [String], default: [] },
  assignedCognitiveGameSlugs: { type: [String], default: [] },
  // Triage fields
  condition:         { type: String, default: '' },
  complianceScore:   { type: Number, default: null },
  recentFormScores:  { type: [Number], default: [] },
  nextAppointment:   { type: Date, default: null },
  // Gamification
  currentStreak:     { type: Number, default: 0 },
  longestStreak:     { type: Number, default: 0 },
  lastWorkoutDate:   { type: Date, default: null },
  weeklyWorkoutCount:{ type: Number, default: 0 },
  weeklyWindowStart: { type: Date, default: null },
  unlockedThemes:    { type: [String], default: ['neon-cyan'] },
  activeTheme:       { type: String, default: 'neon-cyan' },
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  type:     { type: String, enum: ['Fitness', 'Cognitive'], required: true },
  duration: { type: String },
  score:    { type: String },
  date:     { type: Date, default: Date.now },
  calories: { type: Number, default: 0 },
});

const User     = mongoose.models.User     || mongoose.model('User',     userSchema);
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

// ── Mock patient definitions ─────────────────────────────────────────────────

const MOCK_PATIENTS = [
  {
    name:            'Aditya Gaikar',
    username:        'aditya_gaikar_patient',
    email:           'aditya.gaikar.patient@revivai.demo',
    condition:       'Post-op ACL Reconstruction',
    complianceScore: 55,
    recentFormScores:[52, 58, 50, 60, 55],
    nextAppointment: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    activities: [
      { name: 'Squats',         type: 'Fitness',   score: '52%', duration: '12 min', calories: 80 },
      { name: 'Lunges',         type: 'Fitness',   score: '58%', duration: '10 min', calories: 65 },
      { name: '1-Back Task',    type: 'Cognitive', score: '50%', duration: '8 min',  calories: 0  },
      { name: 'Squats',         type: 'Fitness',   score: '60%', duration: '15 min', calories: 90 },
      { name: 'Corsi Blocks',   type: 'Cognitive', score: '55%', duration: '6 min',  calories: 0  },
    ],
  },
  {
    name:            'Priya Sharma',
    username:        'priya_sharma_patient',
    email:           'priya.sharma.patient@revivai.demo',
    condition:       'Chronic Lower Back Pain',
    complianceScore: 82,
    recentFormScores:[80, 85, 78, 88, 82],
    nextAppointment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    activities: [
      { name: 'Warrior Pose',   type: 'Fitness',   score: '80%', duration: '20 min', calories: 110 },
      { name: 'Yoga Flow',      type: 'Fitness',   score: '85%', duration: '25 min', calories: 130 },
      { name: 'Word Pairs',     type: 'Cognitive', score: '78%', duration: '10 min', calories: 0   },
      { name: 'Warrior Pose',   type: 'Fitness',   score: '88%', duration: '22 min', calories: 120 },
      { name: 'Stroop Effect',  type: 'Cognitive', score: '82%', duration: '8 min',  calories: 0   },
    ],
  },
  {
    name:            'Rohan Mehta',
    username:        'rohan_mehta_patient',
    email:           'rohan.mehta.patient@revivai.demo',
    condition:       'Post-op Rotator Cuff Repair',
    complianceScore: 91,
    recentFormScores:[88, 92, 90, 95, 91],
    nextAppointment: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    activities: [
      { name: 'Push-ups',       type: 'Fitness',   score: '88%', duration: '15 min', calories: 95  },
      { name: 'Mountain Climbers', type: 'Fitness', score: '92%', duration: '18 min', calories: 140 },
      { name: 'Pattern Matrix', type: 'Cognitive', score: '90%', duration: '12 min', calories: 0   },
      { name: 'Push-ups',       type: 'Fitness',   score: '95%', duration: '16 min', calories: 100 },
      { name: '1-Back Task',    type: 'Cognitive', score: '91%', duration: '9 min',  calories: 0   },
    ],
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB:', MONGODB_URI);

  // Find the first doctor to assign patients to
  const doctor = await User.findOne({ role: 'doctor' });
  if (!doctor) {
    console.error('✗ No doctor found. Run seedDoctors.js first, then re-run this script.');
    process.exit(1);
  }
  console.log(`✓ Assigning patients to doctor: ${doctor.name} (${doctor.email})`);

  const hashedPassword = await bcrypt.hash('revivai_demo_2025', 10);

  for (const mock of MOCK_PATIENTS) {
    const { activities, ...patientFields } = mock;

    // Upsert patient by email
    let patient = await User.findOne({ email: patientFields.email });

    if (!patient) {
      patient = new User({
        ...patientFields,
        password: hashedPassword,
        role: 'patient',
        assignedDoctors: [doctor._id],
      });
      await patient.save();
      console.log(`  ✓ Created patient: ${patient.name}`);
    } else {
      // Update triage fields on existing record
      Object.assign(patient, {
        condition:         patientFields.condition,
        complianceScore:   patientFields.complianceScore,
        recentFormScores:  patientFields.recentFormScores,
        nextAppointment:   patientFields.nextAppointment,
      });
      if (!patient.assignedDoctors.map(String).includes(String(doctor._id))) {
        patient.assignedDoctors.push(doctor._id);
      }
      await patient.save();
      console.log(`  ↺ Updated patient: ${patient.name}`);
    }

    // Seed activities (skip if already seeded for this patient)
    const existingCount = await Activity.countDocuments({ userId: patient._id });
    if (existingCount === 0) {
      const docs = activities.map((a, i) => ({
        userId:   patient._id,
        name:     a.name,
        type:     a.type,
        score:    a.score,
        duration: a.duration,
        calories: a.calories,
        date:     new Date(Date.now() - (activities.length - i) * 24 * 60 * 60 * 1000),
      }));
      await Activity.insertMany(docs);
      console.log(`    ✓ Seeded ${docs.length} activities for ${patient.name}`);
    } else {
      console.log(`    ↺ Activities already exist for ${patient.name} (${existingCount} records)`);
    }
  }

  console.log('\n✓ Triage seed complete. Patients are now visible in the Doctor Dashboard.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
