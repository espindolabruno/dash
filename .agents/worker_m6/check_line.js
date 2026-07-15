const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../../agro.html'), 'utf8');
const lines = content.split('\n');
const line = lines[2439]; // 0-indexed line 2440 is index 2439
console.log("Line 2440 text:", JSON.stringify(line));
for (let i = 0; i < line.length; i++) {
  console.log(`${i}: ${line[i]} (code: ${line.charCodeAt(i)})`);
}
