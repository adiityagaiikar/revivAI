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
      'doctorPersonalizationEnabled assignedExerciseSlugs assignedCognitiveGameSlugs role'
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
          }
        : { enabled: false, exerciseSlugs: [], gameSlugs: [] };

    res.json({ activities, stats, weeklyProgress, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route for saving a new activity log
router.post('/activity', auth, async (req, res) => {
  try {
    const { name, type, duration, score, calories } = req.body;
    
    const newActivity = new Activity({
      userId: req.user,
      name,
      type,
      duration,
      score,
      calories
    });

    await newActivity.save();
    res.json({ message: 'Activity stored successfully', activity: newActivity });
  } catch (err) {
    console.error('Failed to create activity', err);
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
    if (!user.assignedDoctors || user.assignedDoctors.length === 0) {
      return res.status(400).json({ error: 'No doctors assigned to send report to.' });
    }

    const doctorId = user.assignedDoctors[0];
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
    const totalPatients = await User.countDocuments({ role: 'patient', assignedDoctors: doctorId });
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
      assignedDoctors: req.user,
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

module.exports = router;
