const mongoose = require('mongoose');
require('dotenv').config();

async function wipeDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Wipe all collections
    await mongoose.connection.db.dropDatabase();
    
    console.log('Database completely wiped! All synthetic/seeded data is gone.');
    process.exit(0);
  } catch (err) {
    console.error('Error wiping DB:', err);
    process.exit(1);
  }
}

wipeDB();
