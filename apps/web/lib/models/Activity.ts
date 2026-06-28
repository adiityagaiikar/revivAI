import mongoose, { Schema, model, models } from 'mongoose'

const activitySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Fitness', 'Cognitive'],
      required: true,
    },
    duration: {
      type: String,
    },
    score: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    calories: {
      type: Number,
      default: 0,
    },
    clinicalNote: {
      type: String,
    },
  },
  {
    collection: 'activities',
    timestamps: false,
  }
)

export default models.Activity || model('Activity', activitySchema)