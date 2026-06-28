const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('assignedDoctors:')) {
    content = content.replace(/assignedDoctors:/g, 'assignedDoctor:');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', file);
  }
});
