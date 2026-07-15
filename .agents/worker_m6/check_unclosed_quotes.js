const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const jsCode = match[1];

let inString = false;
let quoteChar = null;
let startPos = 0;

for (let j = 0; j < jsCode.length; j++) {
  const char = jsCode[j];
  if (inString) {
    if (char === quoteChar && jsCode[j - 1] !== '\\') {
      inString = false;
    }
  } else {
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quoteChar = char;
      startPos = j;
    }
  }
}

if (inString) {
  const lines = jsCode.substring(0, startPos).split('\n');
  const lineNum = lines.length + 251;
  console.log(`Unclosed string of type ${quoteChar} starting around line ${lineNum}:`);
  console.log(jsCode.substring(startPos, startPos + 100));
} else {
  console.log("No unclosed strings!");
}
