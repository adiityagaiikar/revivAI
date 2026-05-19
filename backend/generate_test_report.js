const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');
const Activity = require('./models/Activity');
const { buildPdfForPatient } = require('./utils/patientReportPdf');
require('dotenv').config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/revival';
    await mongoose.connect(mongoUri);
    console.log("Connected to specific DB:", mongoUri);
    
    const user = await User.findOne();
    if (!user) {
        console.log("No users found in the database. Generated report bypassed.");
        process.exit(0);
    }
    console.log("Found patient:", user.name);

    const { buffer } = await buildPdfForPatient(user._id, User, Activity);
    
    const outputPath = 'patient_report_demo.pdf';
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Success! Real medical report generated at: ${outputPath}`);
  } catch (e) {
    console.error("Error generating report:", e);
  } finally {
    process.exit(0);
  }
}

run();
