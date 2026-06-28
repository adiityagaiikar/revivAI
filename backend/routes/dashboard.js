const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const Report = require('../models/Report');
const { buildPdfForPatient } = require('../utils/patientReportPdf');

function safePdfFilename(name) {
  const base = (name || 'patient').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'patient';
  return `RevivAI_Report_${base}.pdf`;
}

// Route for patient dashboard data
router.get('/patient', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select(
      'doctorPersonalizationEnabled assignedExerciseSlugs assignedCognitiveGameSlugs role carePlan weeklySmartNudge'
    );
    const activities = await Activity.find({ userId: req.user }).sort({ date: -1 }).limit(10);

    // Aggregations
    const totalWorkouts = await Activity.countDocuments({ userId: req.user, type: 'Fitness' });
    const totalCognitive = await Activity.countDocuments({ userId: req.user, type: 'Cognitive' });

    const allActivities = await Activity.find({ userId: req.user });
    const caloriesBurned = allActivities.reduce((acc, curr) => acc + (curr.calories || 0), 0);

    const stats = [
      { name: 'Workouts Completed', value: totalWorkouts.toString(), change: '+12%', iconName: 'Activity', color: 'text-blue-400' },
      { name: 'Calories Burned', value: caloriesBurned.toLocaleString(), change: '+8%', iconName: 'Flame', color: 'text-orange-400' },
      { name: 'Active Minutes', value: '340', change: '+15%', iconName: 'Timer', color: 'text-green-400' },
      { name: 'Achievement Points', value: ((totalWorkouts * 10) + (totalCognitive * 15)).toLocaleString(), change: '+5%', iconName: 'Trophy', color: 'text-yellow-400' }
    ];

    const weeklyProgress = [
      { label: 'Fitness Goals', value: Math.min(100, Math.round(totalWorkouts * 10)), color: 'bg-blue-400' },
      { label: 'Cognitive Training', value: Math.min(100, Math.round(totalCognitive * 10)), color: 'bg-purple-400' },
      { label: 'Daily Streak', value: 3, color: 'bg-green-400', max: 14 }
    ];

    const plan =
      user && user.role === 'patient'
        ? {
          enabled: !!user.doctorPersonalizationEnabled,
          exerciseSlugs: user.assignedExerciseSlugs || [],
          gameSlugs: user.assignedCognitiveGameSlugs || [],
          careTasks: user.carePlan || []
        }
        : { enabled: false, exerciseSlugs: [], gameSlugs: [], careTasks: [] };

    res.json({
      activities,
      stats,
      weeklyProgress,
      plan,
      weeklySmartNudge: user?.weeklySmartNudge || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route for saving a new activity log
router.post('/activity', auth, async (req, res) => {
  try {
    const { name, type, duration, score, calories, clinicalNote } = req.body;

    const newActivity = new Activity({
      userId: req.user,
      name,
      type,
      duration,
      score,
      calories,
      clinicalNote
    });

    await newActivity.save();
    res.json({ message: 'Activity stored successfully', activity: newActivity });
  } catch (err) {
    console.error('Failed to create activity', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/weekly-activity — per-day activity counts for the last 7 days
router.get('/weekly-activity', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      userId: req.user,
      date: { $gte: sevenDaysAgo },
    });

    const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = {
      Mon: { day: 'Mon', workouts: 0, games: 0 },
      Tue: { day: 'Tue', workouts: 0, games: 0 },
      Wed: { day: 'Wed', workouts: 0, games: 0 },
      Thu: { day: 'Thu', workouts: 0, games: 0 },
      Fri: { day: 'Fri', workouts: 0, games: 0 },
      Sat: { day: 'Sat', workouts: 0, games: 0 },
      Sun: { day: 'Sun', workouts: 0, games: 0 },
    };

    for (const activity of activities) {
      const dayAbbr = DAY_ABBRS[new Date(activity.date).getDay()];
      if (activity.type === 'Fitness') {
        dayMap[dayAbbr].workouts += 1;
      } else if (activity.type === 'Cognitive') {
        dayMap[dayAbbr].games += 1;
      }
    }

    // Return Mon → Sun order
    const result = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
      (day) => dayMap[day]
    );
    res.json(result);
  } catch (err) {
    console.error('Weekly activity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Patient: download PDF built from DB (exercise + cognitive activities)
router.get('/patient/report-pdf', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('role name');
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can download this report.' });
    }

    const { buffer, patient } = await buildPdfForPatient(req.user, User, Activity);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safePdfFilename(patient.name)}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Patient report PDF error', err);
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    res.status(500).json({ error: 'Could not generate PDF.' });
  }
});

// Route for sending a report to doctor (stores PDF snapshot for doctor download)
router.post('/patient/send-report', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can send reports to a doctor.' });
    }
    if (!user.assignedDoctor) {
      return res.status(400).json({ error: 'No doctors assigned to send report to.' });
    }

    const doctorId = user.assignedDoctor;
    const { buffer } = await buildPdfForPatient(req.user, User, Activity);
    const reportId = `REP-${Math.floor(Math.random() * 9000) + 1000}`;

    const newReport = new Report({
      doctorId,
      patientId: req.user,
      type: 'Comprehensive Health Analysis',
      status: 'Pending Review',
      critical: false,
      reportId,
      pdfData: buffer,
    });

    await newReport.save();
    res.json({
      message: 'Report generated and sent to your assigned doctor.',
      reportId,
      reportDbId: newReport._id,
    });
  } catch (err) {
    console.error('Failed to send report', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: download PDF for a report they received (regenerates if legacy record has no PDF)
router.get('/doctor/reports/:reportId/pdf', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can download patient reports.' });
    }

    const report = await Report.findOne({
      _id: req.params.reportId,
      doctorId: req.user,
    });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    let pdfBuffer = report.pdfData;
    if (!pdfBuffer || !pdfBuffer.length) {
      const { buffer } = await buildPdfForPatient(report.patientId, User, Activity);
      pdfBuffer = buffer;
      report.pdfData = buffer;
      await report.save();
    }

    const patient = await User.findById(report.patientId).select('name');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safePdfFilename(patient?.name)}_${report.reportId}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Doctor report PDF error', err);
    res.status(500).json({ error: 'Could not download PDF.' });
  }
});

// Route for doctor dashboard data
router.get('/doctor', auth, async (req, res) => {
  try {
    const doctorId = req.user;
    const totalPatients = await User.countDocuments({ role: 'patient', assignedDoctor: doctorId });
    const pendingReports = await Report.countDocuments({ doctorId, status: { $in: ['Pending Review', 'Requires Attention'] } });
    const tasksToday = await Task.countDocuments({ doctorId, completed: false });
    const criticalActivity = await Report.countDocuments({ doctorId, critical: true });

    const stats = [
      { title: "Total Patients", value: totalPatients.toString(), iconName: "Users", color: "text-blue-400", bg: "bg-blue-500/10" },
      { title: "Pending Reports", value: pendingReports.toString(), iconName: "FileText", color: "text-orange-400", bg: "bg-orange-500/10" },
      { title: "Tasks Today", value: tasksToday.toString(), iconName: "CheckSquare", color: "text-green-400", bg: "bg-green-500/10" },
      { title: "Critical Activity", value: criticalActivity.toString(), iconName: "Activity", color: "text-red-400", bg: "bg-red-500/10" },
    ];

    const actionItems = await Task.find({ doctorId, completed: false }).populate('patientId', 'name').sort({ createdAt: -1 }).limit(5);

    res.json({ stats, actionItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route for all doctor Tasks
router.get('/doctor/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ doctorId: req.user }).populate('patientId', 'name').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Route for all doctor Reports
router.get('/doctor/reports', auth, async (req, res) => {
  try {
    const reports = await Report.find({ doctorId: req.user }).populate('patientId', 'name').sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Doctor: PDF of a patient's exercise + cognitive data (must be assigned)
router.get('/doctor/patients/:patientId/health-report-pdf', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const patient = await User.findOne({
      _id: req.params.patientId,
      role: 'patient',
      assignedDoctor: req.user,
    }).select('name');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you.' });
    }
    const { buffer } = await buildPdfForPatient(req.params.patientId, User, Activity);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safePdfFilename(patient.name)}_health.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Doctor patient PDF error', err);
    res.status(500).json({ error: 'Could not generate PDF.' });
  }
});

// ── Doctor: triage table — enriched patient list ──────────────────────────
// GET /api/dashboard/doctor/triage
// Returns all patients assigned to this doctor with compliance + form scores
// computed live from Activity records, merged with any stored triage fields.
router.get('/doctor/triage', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }

    const patients = await User.find({
      role: 'patient',
      assignedDoctor: req.user,
    }).select('name email condition complianceScore recentFormScores nextAppointment createdAt');

    const enriched = await Promise.all(
      patients.map(async (p) => {
        // Pull last 5 scored activities for live form scores
        const recentActivities = await Activity.find({ userId: p._id, score: { $exists: true, $ne: '' } })
          .sort({ date: -1 })
          .limit(5)
          .select('score');

        const liveFormScores = recentActivities
          .map((a) => parseInt(a.score))
          .filter((n) => !isNaN(n));

        // Live compliance: average of recent form scores, fallback to stored value
        const liveCompliance =
          liveFormScores.length > 0
            ? Math.round(liveFormScores.reduce((a, b) => a + b, 0) / liveFormScores.length)
            : p.complianceScore ?? null;

        return {
          _id: p._id.toString(),
          name: p.name,
          email: p.email,
          condition: p.condition || 'General Rehabilitation',
          complianceScore: liveCompliance,
          recentFormScores: liveFormScores.length > 0 ? liveFormScores : (p.recentFormScores || []),
          nextAppointment: p.nextAppointment || null,
          createdAt: p.createdAt,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Triage route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/doctor/tasks/:taskId', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const task = await Task.findOne({ _id: req.params.taskId, doctorId: req.user });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    const { completed } = req.body;
    if (typeof completed === 'boolean') {
      task.completed = completed;
    }
    await task.save();
    await task.populate('patientId', 'name');
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/doctor/tasks', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const { title, type, urgency, time, patientId } = req.body;
    const task = new Task({
      doctorId: req.user,
      patientId: patientId || undefined,
      title: (title && String(title).trim()) || 'Untitled task',
      type: ['Clinical', 'Admin', 'Meeting'].includes(type) ? type : 'Clinical',
      urgency: ['Low', 'Medium', 'High'].includes(urgency) ? urgency : 'Medium',
      time: (time && String(time).trim()) || '—',
      completed: false,
    });
    await task.save();
    await task.populate('patientId', 'name');
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/doctor/tasks/:taskId', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, doctorId: req.user });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/doctor/reports/:reportId', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.user).select('role');
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const report = await Report.findOne({ _id: req.params.reportId, doctorId: req.user });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    const { status, critical } = req.body;
    if (status && ['Normal', 'Requires Attention', 'Pending Review'].includes(status)) {
      report.status = status;
    }
    if (typeof critical === 'boolean') {
      report.critical = critical;
    }
    await report.save();
    await report.populate('patientId', 'name');
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════
   GAMIFICATION ROUTES
══════════════════════════════════════════════════════════ */

// Theme unlock thresholds
const THEME_UNLOCKS = {
  'neon-cyan': 0,
  'matrix-green': 3,
  'cyberpunk-yellow': 7,
};

/**
 * Helper: update streak + weekly count after a workout is logged.
 * Called internally whenever a Fitness activity is saved.
 */
async function updateStreakAndWeekly(userId) {
  const user = await User.findById(userId).select(
    'currentStreak longestStreak lastWorkoutDate weeklyWorkoutCount weeklyWindowStart unlockedThemes'
  );
  if (!user) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // ── Streak logic ──────────────────────────────────────────
  if (user.lastWorkoutDate) {
    const last = new Date(user.lastWorkoutDate);
    const lastStr = last.toISOString().slice(0, 10);
    const diffDays = Math.floor((now - last) / 86400000);

    if (lastStr === todayStr) {
      // Already worked out today — no streak change
    } else if (diffDays === 1) {
      user.currentStreak += 1;
    } else {
      user.currentStreak = 1; // streak broken
    }
  } else {
    user.currentStreak = 1;
  }

  user.lastWorkoutDate = now;
  if (user.currentStreak > (user.longestStreak || 0)) {
    user.longestStreak = user.currentStreak;
  }

  // ── Weekly count (rolling 7-day window) ───────────────────
  const windowStart = user.weeklyWindowStart ? new Date(user.weeklyWindowStart) : null;
  if (!windowStart || now - windowStart > 7 * 86400000) {
    user.weeklyWorkoutCount = 1;
    user.weeklyWindowStart = now;
  } else {
    user.weeklyWorkoutCount += 1;
  }

  // ── Theme unlocks ─────────────────────────────────────────
  const unlocked = new Set(user.unlockedThemes || ['neon-cyan']);
  for (const [theme, required] of Object.entries(THEME_UNLOCKS)) {
    if (user.currentStreak >= required) unlocked.add(theme);
  }
  user.unlockedThemes = [...unlocked];

  await user.save();
  return user;
}

// Expose the helper so activity route can call it
router.updateStreakAndWeekly = updateStreakAndWeekly;

// GET /api/dashboard/gamification — current user's gamification state
router.get('/gamification', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select(
      'currentStreak longestStreak lastWorkoutDate weeklyWorkoutCount unlockedThemes activeTheme name'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastWorkoutDate: user.lastWorkoutDate || null,
      weeklyWorkoutCount: user.weeklyWorkoutCount || 0,
      unlockedThemes: user.unlockedThemes || ['neon-cyan'],
      activeTheme: user.activeTheme || 'neon-cyan',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/dashboard/gamification/theme — set active theme
router.patch('/gamification/theme', auth, async (req, res) => {
  try {
    const { theme } = req.body;
    const validThemes = Object.keys(THEME_UNLOCKS);
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    const user = await User.findById(req.user).select('unlockedThemes activeTheme');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(user.unlockedThemes || []).includes(theme)) {
      return res.status(403).json({ error: 'Theme not unlocked yet' });
    }
    user.activeTheme = theme;
    await user.save();
    res.json({ activeTheme: user.activeTheme });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/leaderboard — top 10 by weekly workout count
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Aggregate activity counts per user in the last 7 days
    const topUsers = await Activity.aggregate([
      { $match: { type: 'Fitness', date: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId', weeklyScore: { $sum: 1 } } },
      { $sort: { weeklyScore: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          weeklyScore: 1,
          currentStreak: '$user.currentStreak',
          activeTheme: '$user.activeTheme',
        },
      },
    ]);

    res.json(topUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
