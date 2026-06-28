/**
 * routes/triage.js
 *
 * Auto-triage endpoint: matches a patient's reported issues to the
 * doctor whose specialties overlap most, then assigns that doctor.
 *
 * POST /api/triage/auto-assign
 *   Body: { patientId, reportedIssues: string[] }
 *   Auth: Bearer token (patient or admin)
 *
 * Algorithm:
 *   1. Save reportedIssues on the patient document.
 *   2. Load all doctors with their specialties.
 *   3. Score each doctor: count how many of their specialties appear
 *      in the patient's reportedIssues (case-insensitive substring match).
 *   4. Pick the highest-scoring doctor.
 *      Tie-break / fallback: fewest currently assigned patients.
 *   5. Add the winning doctor to patient.assignedDoctor (and set
 *      patient.assignedDoctor for the single-doctor convenience field).
 *   6. Return the assigned doctor's name and id.
 */

const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const User    = require('../models/User')

/* ── helpers ── */

/**
 * Score a doctor against a set of patient issues.
 * Returns the number of the doctor's specialties that match at least
 * one of the patient's reported issues (case-insensitive).
 */
function scoreDoctor(doctor, issuesLower) {
  if (!doctor.specialties || doctor.specialties.length === 0) return 0
  let score = 0
  for (const specialty of doctor.specialties) {
    const specLower = specialty.toLowerCase()
    // Match if any reported issue contains the specialty or vice-versa
    if (issuesLower.some(
      (issue) => issue.includes(specLower) || specLower.includes(issue)
    )) {
      score++
    }
  }
  return score
}

/**
 * Count how many patients are currently assigned to a doctor.
 */
async function patientCount(doctorId) {
  return User.countDocuments({ role: 'patient', assignedDoctor: doctorId })
}

/* ── POST /api/triage/auto-assign ── */
router.post('/auto-assign', auth, async (req, res) => {
  try {
    const { patientId, reportedIssues } = req.body

    /* ── Validate input ── */
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required.' })
    }
    if (!Array.isArray(reportedIssues) || reportedIssues.length === 0) {
      return res.status(400).json({ error: 'reportedIssues must be a non-empty array.' })
    }

    /* ── Load patient ── */
    const patient = await User.findOne({ _id: patientId, role: 'patient' })
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' })
    }

    /* ── Sanitise and save issues ── */
    const cleanIssues = reportedIssues
      .filter((i) => typeof i === 'string' && i.trim())
      .map((i) => i.trim())

    patient.issues = cleanIssues
    // Also update condition to the first issue for display convenience
    if (cleanIssues.length > 0 && !patient.condition) {
      patient.condition = cleanIssues[0]
    }

    /* ── Load all doctors ── */
    const doctors = await User.find({ role: 'doctor' }).select(
      '_id name email specialties'
    )

    if (doctors.length === 0) {
      await patient.save()
      return res.status(404).json({ error: 'No doctors available in the system.' })
    }

    /* ── Score each doctor ── */
    const issuesLower = cleanIssues.map((i) => i.toLowerCase())

    const scored = await Promise.all(
      doctors.map(async (doc) => ({
        doctor:       doc,
        matchScore:   scoreDoctor(doc, issuesLower),
        patientCount: await patientCount(doc._id),
      }))
    )

    /* ── Pick winner: highest match score, tie-break by fewest patients ── */
    scored.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      return a.patientCount - b.patientCount   // fewer patients wins tie
    })

    const winner = scored[0].doctor

    /* ── Assign doctor to patient ── */
    // assignedDoctors is the multi-doctor array used by the portal
    const alreadyAssigned = patient.assignedDoctor
      .map(String)
      .includes(String(winner._id))

    if (!alreadyAssigned) {
      patient.assignedDoctor.push(winner._id)
    }
    // assignedDoctor is the single convenience field
    patient.assignedDoctor = winner._id

    await patient.save()

    /* ── Response ── */
    return res.json({
      success:          true,
      assignedDoctorId: winner._id,
      assignedDoctor:   winner.name,
      matchScore:       scored[0].matchScore,
      message:
        scored[0].matchScore > 0
          ? `Matched to ${winner.name} based on ${scored[0].matchScore} specialty overlap(s).`
          : `No specialty match found. Assigned ${winner.name} (fewest patients).`,
    })
  } catch (err) {
    console.error('Auto-triage error:', err)
    res.status(500).json({ error: 'Server error during auto-triage.' })
  }
})

/* ── GET /api/triage/doctors ── */
/* Returns all doctors with their specialties — used by the frontend
   to populate the issue-selection UI. */
router.get('/doctors', auth, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('_id name email specialties')
      .lean()
    res.json(doctors)
  } catch (err) {
    console.error('Get doctors error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

/* ── PATCH /api/triage/specialties ── */
/* Allows a doctor to update their own specialties list. */
router.patch('/specialties', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user)
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' })
    }
    const { specialties } = req.body
    if (!Array.isArray(specialties)) {
      return res.status(400).json({ error: 'specialties must be an array.' })
    }
    doctor.specialties = specialties
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim())
    await doctor.save()
    res.json({ specialties: doctor.specialties })
  } catch (err) {
    console.error('Update specialties error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

module.exports = router
