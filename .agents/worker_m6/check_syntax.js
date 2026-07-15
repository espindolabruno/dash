const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

// Find the script tag
const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!match) {
  console.error("Could not find script tag in agro.html");
  process.exit(1);
}

const jsCode = match[1];

// Write JS code to a temporary file
const tempPath = path.join(__dirname, 'temp_agro.js');
fs.writeFileSync(tempPath, jsCode);

console.log("Extracted JS code to temp_agro.js");

// Try to parse it using node
try {
  require('vm').Script(jsCode);
  console.log("No basic JS syntax errors! (Though Babel jsx syntax might still have issues)");
} catch (e) {
  console.error("Syntax Error found:");
  console.error(e);
}
