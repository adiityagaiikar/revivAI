/**
 * seedActivities.js
 * Seeds realistic exercise + cognitive activity data for ALL patients in MongoDB.
 * Run: node seedActivities.js
 */

const mongoose = require('mongoose')
const dotenv   = require('dotenv')
const User     = require('./models/User')
const Activity = require('./models/Activity')

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival'

// ── Exercise sessions ─────────────────────────────────────────────────────────
const EXERCISES = [
  { name: 'Squats',            calories: 60  },
  { name: 'Lunges',            calories: 70  },
  { name: 'Warrior Pose',      calories: 30  },
  { name: 'Push-ups',          calories: 50  },
  { name: 'Burpees',           calories: 100 },
  { name: 'Jumping Jacks',     calories: 80  },
  { name: 'Mountain Climbers', calories: 60  },
  { name: 'Yoga Flow',         calories: 90  },
]

// ── Cognitive game sessions ───────────────────────────────────────────────────
const GAMES = [
  'Corsi Block-Tapping',
  'Stroop Effect',
  '1-Back Task',
  'Pattern Matrix',
  'Word Pairs',
]

// Random int between min and max (inclusive)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Random date within the last N days
const daysAgo = (n) => new Date(Date.now() - rand(0, n) * 86400000 - rand(0, 86400000))

// Realistic score that trends upward over time (index = session number)
const trendingScore = (i, total) => {
  const base = rand(45, 65)
  const improvement = Math.floor((i / total) * 30)
  const noise = rand(-5, 5)
  return Math.min(100, Math.max(10, base + improvement + noise))
}

const seed = async () => {
  await mongoose.connect(MONGODB_URI)
  console.log('✓ Connected to MongoDB:', MONGODB_URI)

  const patients = await User.find({ role: 'patient' })
  if (patients.length === 0) {
    console.log('✗ No patients found. Register a patient account first, then re-run.')
    process.exit(1)
  }

  console.log(`Found ${patients.length} patient(s). Seeding activities…\n`)

  // Remove old seeded activities so we don't double-up
  const deleted = await Activity.deleteMany({ userId: { $in: patients.map(p => p._id) } })
  console.log(`  Cleared ${deleted.deletedCount} existing activity records.`)

  for (const patient of patients) {
    const activities = []

    // ── 30 exercise sessions spread over last 30 days ─────────────────────────
    for (let i = 0; i < 30; i++) {
      const ex = EXERCISES[i % EXERCISES.length]
      const reps = rand(8, 20)
      activities.push({
        userId:   patient._id,
        name:     ex.name,
        type:     'Fitness',
        duration: `${rand(5, 20)} mins`,
        calories: Math.round(ex.calories * (reps / 12) * (0.8 + Math.random() * 0.4)),
        date:     daysAgo(30),
      })
    }

    // ── 25 cognitive game sessions spread over last 30 days ───────────────────
    for (let i = 0; i < 25; i++) {
      const game = GAMES[i % GAMES.length]
      const score = trendingScore(i, 25)
      activities.push({
        userId:   patient._id,
        name:     game,
        type:     'Cognitive',
        score:    `${score}%`,
        calories: 0,
        date:     daysAgo(30),
      })
    }

    // Sort by date ascending so dashboard shows chronological order
    activities.sort((a, b) => a.date - b.date)

    await Activity.insertMany(activities)
    console.log(`  ✓ ${patient.name} (${patient.email}) — ${activities.length} activities seeded`)
  }

  console.log('\n✓ Done. Refresh the dashboard to see the data.')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
