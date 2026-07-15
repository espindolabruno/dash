const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const jsCode = match[1];

const lines = jsCode.split('\n');
let braceCount = 0;
let stack = [];

let inString = false;
let quoteChar = null;

// Helper to strip comments and strings
function getCleanLine(line) {
  let cleanLine = '';
  let inComment = false;
  let inBlockComment = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        j++;
      }
      continue;
    }
    if (inComment) {
      break;
    }
    if (inString) {
      if (char === quoteChar && line[j - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inComment = true;
      break;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      j++;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quoteChar = char;
      continue;
    }

    cleanLine += char;
  }
  return cleanLine;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 252;
  const clean = getCleanLine(line);
  
  for (let col = 0; col < clean.length; col++) {
    const char = clean[col];
    if (char === '{') {
      braceCount++;
      stack.push({ line: lineNum, col: col });
    } else if (char === '}') {
      braceCount--;
      if (stack.length === 0) {
        console.log(`[Line ${lineNum}:${col}] Extra closing brace '}' found!`);
      } else {
        stack.pop();
      }
    }
  }
}

console.log("Final brace count:", braceCount);
if (stack.length > 0) {
  console.log("Unclosed opening braces:", stack);
}
