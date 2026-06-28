const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./backend/models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival';

async function testTriage() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  // Get the patient
  const patient = await User.findOne({ email: 'aditya.gaikar.patient@revivai.demo' });
  if (!patient) {
    console.log('Patient not found');
    process.exit(1);
  }
  
  console.log('Patient ID:', patient._id);

  // Get doctors
  const allDoctors = await User.find({ role: 'doctor' }).lean();
  console.log('Doctors:', allDoctors.length);
  if (allDoctors.length > 0) {
      console.log('Sample doctor specialties:', allDoctors[0].specialties);
  }

  // Count workload
  const doctorIds = allDoctors.map(d => d._id);
  const counts = await User.aggregate([
    {
      $match: {
        role: 'patient',
        assignedDoctor: { $in: doctorIds },
      },
    },
    {
      $group: {
        _id: '$assignedDoctor',
        count: { $sum: 1 },
      },
    },
  ]);
  console.log('Workload counts:', counts);

  process.exit(0);
}

testTriage();
