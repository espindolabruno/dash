const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const jsCode = match[1];

let pos = 0;
const len = jsCode.length;

function getLineCol(p) {
  const lines = jsCode.substring(0, p).split('\n');
  return { line: lines.length + 251, col: lines[lines.length - 1].length + 1 };
}

let divStack = [];

while (pos < len) {
  const char = jsCode[pos];
  
  if (char === '/' && jsCode[pos + 1] === '/') {
    pos += 2; while (pos < len && jsCode[pos] !== '\n') pos++; continue;
  }
  if (char === '/' && jsCode[pos + 1] === '*') {
    pos += 2; while (pos < len && !(jsCode[pos] === '*' && jsCode[pos + 1] === '/')) pos++; pos += 2; continue;
  }
  if (char === '"' || char === "'") {
    const quote = char; pos++;
    while (pos < len && jsCode[pos] !== quote) {
      if (jsCode[pos] === '\\') pos += 2; else pos++;
    }
    pos++; continue;
  }
  if (char === '`') {
    pos++;
    while (pos < len && jsCode[pos] !== '`') {
      if (jsCode[pos] === '\\') pos += 2; else pos++;
    }
    pos++; continue;
  }

  if (char === '<') {
    const next = jsCode[pos + 1];
    
    if (next === '/') {
      const start = pos + 2;
      let end = start;
      while (end < len && /[a-zA-Z0-9_-]/.test(jsCode[end])) end++;
      const tagName = jsCode.substring(start, end);
      const lc = getLineCol(pos);
      
      while (pos < len && jsCode[pos] !== '>') pos++;
      pos++;
      
      if (tagName === 'div') {
        if (divStack.length === 0) {
          console.log(`[Line ${lc.line}] Error: Closed </div> but stack empty`);
        } else {
          const last = divStack.pop();
          console.log(`[Line ${lc.line}] Closed </div> (matching line ${last.line})`);
        }
      }
      continue;
    }

    if (/[a-zA-Z]/.test(next)) {
      const start = pos + 1;
      let end = start;
      while (end < len && /[a-zA-Z0-9_-]/.test(jsCode[end])) end++;
      const tagName = jsCode.substring(start, end);
      const lc = getLineCol(pos);
      
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
          inQuote = true; quoteChar = c;
        } else if (c === '{') {
          braceDepth++;
        } else if (c === '}') {
          braceDepth--;
        } else if (braceDepth === 0) {
          if (c === '/' && jsCode[tagEndPos + 1] === '>') {
            isSelfClosing = true; tagEndPos += 2; break;
          }
          if (c === '>') {
            tagEndPos++; break;
          }
        }
        tagEndPos++;
      }
      pos = tagEndPos;
      
      if (tagName === 'div' && !isSelfClosing) {
        divStack.push({ line: lc.line });
        console.log(`[Line ${lc.line}] Opened <div>`);
      }
      continue;
    }
  }
  pos++;
}

console.log("Remaining divs in stack:", divStack);
