const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival';

const seedPatients = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all doctors
    const doctors = await User.find({ role: 'doctor' });
    if (doctors.length === 0) {
      console.log('No doctors found. Please run seedDoctors.js first.');
      process.exit(1);
    }

    let created = 0;
    for (let i = 1; i <= 50; i++) {
      const email = `patient${i}@example.com`;
      
      const existing = await User.findOne({ email });
      if (!existing) {
        // Pick 1 to 3 random doctors
        const numDoctors = Math.floor(Math.random() * 3) + 1;
        const shuffled = doctors.sort(() => 0.5 - Math.random());
        const assignedDoctors = shuffled.slice(0, numDoctors).map(d => d._id);

        const doc = new User({
          name: `Patient Name ${i}`,
          username: `patient${i}`,
          email,
          password: 'password123',
          role: 'patient',
          assignedDoctors
        });
        await doc.save();
        created++;
      }
    }
    
    console.log(`Seeded ${created} patients correctly associated with doctors.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding patients:', error);
    process.exit(1);
  }
};

seedPatients();
