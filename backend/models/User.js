const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    default: 'patient'
  },
  assignedDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // When true, patient sees only assigned exercises / games (dashboard + lists)
  doctorPersonalizationEnabled: {
    type: Boolean,
    default: false
  },
  medicalHistory: {
    type: String,
    default: ''
  },
  assignedExerciseSlugs: {
    type: [String],
    default: []
  },
  assignedCognitiveGameSlugs: {
    type: [String],
    default: []
  },
  // ── Clinical / Triage fields ──────────────────────────────
  condition: {
    type: String,
    default: ''
  },
  complianceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  recentFormScores: {
    type: [Number],
    default: []
  },
  nextAppointment: {
    type: Date,
    default: null
  },

  // ── Gamification ──────────────────────────────────────────
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastWorkoutDate: {
    type: Date,
    default: null
  },
  weeklyWorkoutCount: {
    type: Number,
    default: 0
  },
  weeklyWindowStart: {
    type: Date,
    default: null
  },
  unlockedThemes: {
    type: [String],
    default: ['neon-cyan']
  },
  activeTheme: {
    type: String,
    default: 'neon-cyan'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
