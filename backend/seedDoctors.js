const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revival';

const seedDoctors = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    for (let i = 1; i <= 20; i++) {
      const email = `doctor${i}@example.com`;
      
      const existing = await User.findOne({ email });
      if (!existing) {
        const doc = new User({
          name: i === 1 ? 'Dr. Viren' : `Dr. Smith ${i}`,
          username: i === 1 ? 'drviren' : `drsmith${i}`,
          email,
          password: 'password123',
          role: 'doctor'
        });
        await doc.save();
        created++;
      }
    }
    
    console.log(`Seeded ${created} doctors successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding doctors:', error);
    process.exit(1);
  }
};

seedDoctors();
