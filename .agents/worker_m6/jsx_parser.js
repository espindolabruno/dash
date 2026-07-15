const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const jsCode = match[1];

// Let's implement a parser that scans the code character by character
// to keep track of JSX tags.
let pos = 0;
const len = jsCode.length;

function getLineCol(p) {
  const lines = jsCode.substring(0, p).split('\n');
  return { line: lines.length + 251, col: lines[lines.length - 1].length + 1 };
}

let tagStack = [];

while (pos < len) {
  const char = jsCode[pos];
  
  // Handle comments
  if (char === '/' && jsCode[pos + 1] === '/') {
    pos += 2;
    while (pos < len && jsCode[pos] !== '\n') pos++;
    continue;
  }
  if (char === '/' && jsCode[pos + 1] === '*') {
    pos += 2;
    while (pos < len && !(jsCode[pos] === '*' && jsCode[pos + 1] === '/')) pos++;
    pos += 2;
    continue;
  }

  // Handle strings
  if (char === '"' || char === "'") {
    const quote = char;
    pos++;
    while (pos < len && jsCode[pos] !== quote) {
      if (jsCode[pos] === '\\') pos += 2;
      else pos++;
    }
    pos++;
    continue;
  }
  if (char === '`') {
    pos++;
    while (pos < len && jsCode[pos] !== '`') {
      if (jsCode[pos] === '\\') pos += 2;
      else pos++;
    }
    pos++;
    continue;
  }

  // Check for JSX tags
  if (char === '<') {
    const next = jsCode[pos + 1];
    
    // Check if it's a comment inside JSX
    if (next === '!' && jsCode.substring(pos, pos + 4) === '<!--') {
      pos += 4;
      while (pos < len && jsCode.substring(pos, pos + 3) !== '-->') pos++;
      pos += 3;
      continue;
    }

    // Check if it's a closing tag
    if (next === '/') {
      const start = pos + 2;
      let end = start;
      while (end < len && /[a-zA-Z0-9_-]/.test(jsCode[end])) end++;
      const tagName = jsCode.substring(start, end);
      const lc = getLineCol(pos);
      
      // Skip until closing '>'
      while (pos < len && jsCode[pos] !== '>') pos++;
      pos++; // consume '>'
      
      if (tagStack.length === 0) {
        console.log(`[Line ${lc.line}:${lc.col}] Closed tag </${tagName}> but stack was empty`);
      } else {
        const last = tagStack.pop();
        if (last.name !== tagName) {
          console.log(`[Line ${lc.line}:${lc.col}] Closed tag </${tagName}> but expected </${last.name}> (opened on Line ${last.line}:${last.col})`);
        }
      }
      continue;
    }

    // Check if it's an opening tag (must be followed by a letter)
    if (/[a-zA-Z]/.test(next)) {
      const start = pos + 1;
      let end = start;
      while (end < len && /[a-zA-Z0-9_-]/.test(jsCode[end])) end++;
      const tagName = jsCode.substring(start, end);
      const lc = getLineCol(pos);
      
      // Scan forward to see if it is self-closing
      let isSelfClosing = false;
      let tagEndPos = pos;
      let braceDepth = 0;
      let inQuote = false;
      let quoteChar = '';
      
      while (tagEndPos < len) {
        const c = jsCode[tagEndPos];
        if (inQuote) {
          if (c === quoteChar) inQuote = false;
        } else if (c === '"' || c === "'") {
          inQuote = true;
          quoteChar = c;
        } else if (c === '{') {
          braceDepth++;
        } else if (c === '}') {
          braceDepth--;
        } else if (braceDepth === 0) {
          if (c === '/' && jsCode[tagEndPos + 1] === '>') {
            isSelfClosing = true;
            tagEndPos += 2;
            break;
          }
          if (c === '>') {
            tagEndPos++;
            break;
          }
        }
        tagEndPos++;
      }
      
      pos = tagEndPos;
      
      if (!isSelfClosing) {
        tagStack.push({ name: tagName, line: lc.line, col: lc.col });
      }
      continue;
    }
  }

  pos++;
}

console.log("Parsing finished.");
console.log("Remaining unclosed tags in stack:", tagStack);
