const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function testTriage() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Find demo patient
  const patient = await User.findOne({ email: 'aditya.gaikar.patient@revivai.demo' });
  if (!patient) {
    console.log('Patient not found');
    process.exit(1);
  }
  
  console.log('Patient ID:', patient._id.toString());

  // Check doctors
  const allDoctors = await User.find({ role: 'doctor' }, { name: 1, specialties: 1 }).lean();
  console.log('Total doctors:', allDoctors.length);
  
  const selectedIssues = ['Post-Op Recovery', 'Joint Pain'];
  const issueSet = new Set(selectedIssues.map((s) => s.toLowerCase().trim()));

  const specialtyMatched = allDoctors.filter((doc) =>
    (doc.specialties ?? []).some((sp) =>
      issueSet.has(sp.toLowerCase().trim())
    )
  );
  
  console.log('Matched doctors:', specialtyMatched.length);

  process.exit(0);
}

testTriage().catch(console.error);
