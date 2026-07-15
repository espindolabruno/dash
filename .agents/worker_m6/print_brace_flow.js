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

// First, run the brace state up to line 2395 (script line 2395 - 252 = 2143)
const startLineIndex = 2395 - 252;
const endLineIndex = 2610 - 252;

for (let i = 0; i < startLineIndex; i++) {
  const clean = getCleanLine(lines[i]);
  for (let c of clean) {
    if (c === '{') { braceCount++; stack.push(i + 252); }
    if (c === '}') { braceCount--; stack.pop(); }
  }
}

console.log(`State at line 2395: braceCount = ${braceCount}, Stack:`, stack);

for (let i = startLineIndex; i <= endLineIndex; i++) {
  const lineNum = i + 252;
  const clean = getCleanLine(lines[i]);
  const prevCount = braceCount;
  
  for (let c of clean) {
    if (c === '{') { braceCount++; stack.push(lineNum); }
    if (c === '}') { braceCount--; stack.pop(); }
  }
  
  if (braceCount !== prevCount) {
    console.log(`[Line ${lineNum}] "${lines[i].trim()}" -> Clean: "${clean.trim()}" -> braceCount: ${prevCount} => ${braceCount}`);
  }
}
