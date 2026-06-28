const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace property access
  content = content.replace(/\.assignedDoctors/g, '.assignedDoctor');
  
  // If there's any length checks on assignedDoctor, fix them
  // e.g. user.assignedDoctor.length === 0 -> !user.assignedDoctor
  content = content.replace(/!user\.assignedDoctor \|\| user\.assignedDoctor\.length === 0/g, '!user.assignedDoctor');
  
  // user.assignedDoctor[0] -> user.assignedDoctor
  content = content.replace(/\.assignedDoctor\[0\]/g, '.assignedDoctor');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fully Updated references in:', file);
});
