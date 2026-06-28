import mongoose, { Schema, model, models } from 'mongoose'

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor'],
      default: 'patient',
    },
    assignedDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    weeklySmartNudge: {
      type: String,
      default: '',
    },
    // Patient: reported health issues used for auto-triage matching
    issues: {
      type: [String],
      default: [],
    },
    // Doctor: clinical specialties used for auto-triage matching
    specialties: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

export default models.User || model('User', userSchema)
