/**
 * routes/carePlan.js
 *
 * CRUD endpoints for the patient carePlan array.
 *
 * POST   /api/care-plan/assign          — doctor assigns a single task
 * POST   /api/care-plan/assign-many     — doctor assigns an array of tasks (AI batch)
 * GET    /api/care-plan/:patientId      — doctor or patient reads the plan
 * PATCH  /api/care-plan/:patientId/:taskId — mark task complete / update
 * DELETE /api/care-plan/:patientId/:taskId — remove a task
 */

const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const User    = require('../models/User')

const VALID_TASK_TYPES = new Set(['PHYSICAL', 'COGNITIVE'])
const VALID_DAYS = new Set([
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
  'Mon','Tue','Wed','Thu','Fri','Sat','Sun',
])

function validateTask(task) {
  const errors = []
  if (!VALID_TASK_TYPES.has(task.taskType))
    errors.push(`taskType must be PHYSICAL or COGNITIVE, got "${task.taskType}"`)
  if (!task.taskName || typeof task.taskName !== 'string' || !task.taskName.trim())
    errors.push('taskName is required')
  if (typeof task.targetValue !== 'number' || task.targetValue < 1)
    errors.push('targetValue must be a positive number')
  if (!task.assignedDay || !VALID_DAYS.has(task.assignedDay))
    errors.push(`assignedDay must be a valid day name, got "${task.assignedDay}"`)
  return errors
}

/* ── POST /api/care-plan/assign ── */
router.post('/assign', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role')
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' })
    }

    const { patientId, taskType, taskName, targetValue, assignedDay } = req.body
    if (!patientId) return res.status(400).json({ error: 'patientId is required.' })

    const task = { taskType, taskName, targetValue, assignedDay }
    const errors = validateTask(task)
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })

    const patient = await User.findOneAndUpdate(
      { _id: patientId, role: 'patient', assignedDoctor: req.user },
      {
        $push: {
          carePlan: {
            taskType:    task.taskType,
            taskName:    task.taskName.trim(),
            targetValue: task.targetValue,
            assignedDay: task.assignedDay.trim(),
            isCompleted: false,
            assignedAt:  new Date(),
          },
        },
      },
      { new: true, select: 'carePlan name' }
    )

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' })
    }

    const newTask = patient.carePlan[patient.carePlan.length - 1]
    return res.status(201).json({
      success: true,
      task:    newTask,
      message: `Task "${task.taskName}" assigned to ${patient.name} on ${task.assignedDay}.`,
    })
  } catch (err) {
    console.error('assign care task error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

/* ── POST /api/care-plan/assign-many ── */
/* Used by the AI batch endpoint to push an entire generated plan at once */
router.post('/assign-many', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role')
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' })
    }

    const { patientId, tasks, replaceExisting } = req.body
    if (!patientId) return res.status(400).json({ error: 'patientId is required.' })
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks must be a non-empty array.' })
    }

    // Validate all tasks before touching the DB
    const allErrors = []
    tasks.forEach((t, i) => {
      const errs = validateTask(t)
      if (errs.length) allErrors.push(`Task[${i}]: ${errs.join('; ')}`)
    })
    if (allErrors.length) return res.status(400).json({ error: allErrors.join(' | ') })

    const sanitised = tasks.map((t) => ({
      taskType:    t.taskType,
      taskName:    String(t.taskName).trim(),
      targetValue: Number(t.targetValue),
      assignedDay: String(t.assignedDay).trim(),
      isCompleted: false,
      assignedAt:  new Date(),
    }))

    const update = replaceExisting
      ? { $set: { carePlan: sanitised } }
      : { $push: { carePlan: { $each: sanitised } } }

    const patient = await User.findOneAndUpdate(
      { _id: patientId, role: 'patient', assignedDoctor: req.user },
      update,
      { new: true, select: 'carePlan name' }
    )

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' })
    }

    return res.status(201).json({
      success:      true,
      tasksAdded:   sanitised.length,
      totalInPlan:  patient.carePlan.length,
      message:      `${sanitised.length} task(s) added to ${patient.name}'s care plan.`,
    })
  } catch (err) {
    console.error('assign-many care tasks error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

/* ── GET /api/care-plan/:patientId ── */
router.get('/:patientId', auth, async (req, res) => {
  try {
    const requester = await User.findById(req.user).select('role')
    if (!requester) return res.status(401).json({ error: 'Unauthorized.' })

    let patient
    if (requester.role === 'doctor') {
      patient = await User.findOne({
        _id: req.params.patientId,
        role: 'patient',
        assignedDoctor: req.user,
      }).select('carePlan name condition')
    } else {
      // Patient reading their own plan
      if (String(req.user) !== String(req.params.patientId)) {
        return res.status(403).json({ error: 'You can only read your own care plan.' })
      }
      patient = await User.findById(req.params.patientId).select('carePlan name condition')
    }

    if (!patient) return res.status(404).json({ error: 'Patient not found.' })

    res.json({
      patientId:  patient._id,
      name:       patient.name,
      condition:  patient.condition,
      carePlan:   patient.carePlan || [],
    })
  } catch (err) {
    console.error('get care plan error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

/* ── PATCH /api/care-plan/:patientId/:taskId ── */
router.patch('/:patientId/:taskId', auth, async (req, res) => {
  try {
    const requester = await User.findById(req.user).select('role')
    if (!requester) return res.status(401).json({ error: 'Unauthorized.' })

    const { isCompleted, targetValue, assignedDay } = req.body
    const setFields = {}
    if (typeof isCompleted === 'boolean') setFields['carePlan.$.isCompleted'] = isCompleted
    if (typeof targetValue === 'number')  setFields['carePlan.$.targetValue'] = targetValue
    if (typeof assignedDay === 'string')  setFields['carePlan.$.assignedDay'] = assignedDay.trim()

    if (Object.keys(setFields).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' })
    }

    const filter = requester.role === 'doctor'
      ? { _id: req.params.patientId, role: 'patient', assignedDoctor: req.user, 'carePlan._id': req.params.taskId }
      : { _id: req.user, 'carePlan._id': req.params.taskId }

    const patient = await User.findOneAndUpdate(
      filter,
      { $set: setFields },
      { new: true, select: 'carePlan' }
    )

    if (!patient) return res.status(404).json({ error: 'Task not found.' })

    const updated = patient.carePlan.id(req.params.taskId)
    res.json({ success: true, task: updated })
  } catch (err) {
    console.error('patch care task error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

/* ── DELETE /api/care-plan/:patientId/:taskId ── */
router.delete('/:patientId/:taskId', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role')
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' })
    }

    const patient = await User.findOneAndUpdate(
      { _id: req.params.patientId, role: 'patient', assignedDoctor: req.user },
      { $pull: { carePlan: { _id: req.params.taskId } } },
      { new: true, select: 'carePlan' }
    )

    if (!patient) return res.status(404).json({ error: 'Patient or task not found.' })
    res.json({ success: true, message: 'Task removed.' })
  } catch (err) {
    console.error('delete care task error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

module.exports = router
