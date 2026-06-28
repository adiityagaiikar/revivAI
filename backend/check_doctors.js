const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function checkDoctors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const allUsers = await User.find({}, { name: 1, role: 1, email: 1 }).lean();
    console.log('ALL USERS IN DB:');
    console.table(allUsers);

    const allDoctors = await User.find({ role: 'doctor' }).lean();
    console.log('DOCTORS QUERY COUNT:', allDoctors.length);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDoctors();
