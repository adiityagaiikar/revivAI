const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Activity = require('./models/Activity');
const Task = require('./models/Task');
const Report = require('./models/Report');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival';

const seedDashboards = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear previous generic seeds if you want, but appending is fine
    await Activity.deleteMany({});
    await Task.deleteMany({});
    await Report.deleteMany({});

    const patients = await User.find({ role: 'patient' });
    const doctors = await User.find({ role: 'doctor' });

    console.log(`Found ${patients.length} patients and ${doctors.length} doctors`);

    // Add activities for patients
    for (const patient of patients) {
      // 5 random activities
      for (let i=0; i<5; i++) {
        const isFitness = Math.random() > 0.5;
        await new Activity({
          userId: patient._id,
          name: isFitness ? 'Morning Yoga' : 'Memory Game',
          type: isFitness ? 'Fitness' : 'Cognitive',
          duration: isFitness ? '30 min' : undefined,
          score: !isFitness ? '85%' : undefined,
          calories: isFitness ? Math.floor(Math.random() * 300) : 0,
          date: new Date(Date.now() - Math.random() * 100000000)
        }).save();
      }
    }

    // Add tasks & reports for doctors
    for (const doctor of doctors) {
      const assignedPatients = await User.find({ role: 'patient', assignedDoctors: doctor._id });
      
      const numTasks = Math.floor(Math.random() * 5) + 3;
      for(let i=0; i<numTasks; i++) {
        const randomPatient = assignedPatients.length > 0 ? assignedPatients[Math.floor(Math.random() * assignedPatients.length)] : null;
        await new Task({
          doctorId: doctor._id,
          patientId: randomPatient?._id,
          title: `Review Chart for ${randomPatient?.name || 'Patient'}`,
          type: 'Clinical',
          urgency: Math.random() > 0.7 ? 'High' : (Math.random() > 0.5 ? 'Medium' : 'Low'),
          completed: Math.random() > 0.7,
          time: '2:00 PM'
        }).save();
      }

      const numReports = Math.floor(Math.random() * 5) + 2;
      for(let i=0; i<numReports; i++) {
        const randomPatient = assignedPatients.length > 0 ? assignedPatients[Math.floor(Math.random() * assignedPatients.length)] : null;
        if(randomPatient) {
          const isCritical = Math.random() > 0.8;
          await new Report({
            doctorId: doctor._id,
            patientId: randomPatient._id,
            type: Math.random() > 0.5 ? 'Blood Panel' : 'MRI Scan',
            status: isCritical ? 'Requires Attention' : (Math.random() > 0.5 ? 'Pending Review' : 'Normal'),
            critical: isCritical,
            reportId: `LAB-${Math.floor(Math.random() * 9000) + 1000}`
          }).save();
        }
      }
    }
    
    console.log(`Seeded activities, tasks, and reports successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDashboards();
