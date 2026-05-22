const fs = require('fs');
let content = fs.readFileSync('apps/web/lib/activity-catalog.ts', 'utf-8');
content = content.replace(/gifUrl:\s*'\/gifs\/(.*?)\.gif',/g, "thumbnailUrl: '/media/$1-thumbnail.jpg',\n    gifUrl: '/media/$1-demo.gif',");
content = content.replace(/gifUrl: string/g, "gifUrl: string\n  thumbnailUrl: string");
fs.writeFileSync('apps/web/lib/activity-catalog.ts', content);
