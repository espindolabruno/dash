const fs = require('fs');
const path = require('path');

const agroPath = path.join(__dirname, '../../agro.html');
const content = fs.readFileSync(agroPath, 'utf8');

const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!match) {
  console.error("Could not find script tag in agro.html");
  process.exit(1);
}
const jsCode = match[1];

// Let's write a simple scanner to trace unmatched JSX tags and braces starting from line 1490 of agro.html
// Which corresponds to the main return block
const lines = jsCode.split('\n');
console.log("Total lines in script:", lines.length);

// Let's analyze the lines from 1238 (return statement at line 1490 is index 1490 - 252 = 1238)
const startIndex = 1490 - 252;
console.log(`Starting analysis from line ${1490} (script index ${startIndex}):`);

let tagStack = [];
let braceCount = 0;
let parenCount = 0;

for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 252;
  
  // Clean comments
  let cleanLine = line.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  cleanLine = cleanLine.replace(/\/\/.*$/g, '');
  
  // Trace braces
  for (let char of cleanLine) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
  }

  // Simple tag matching using regex
  // Find all <TagName or </TagName>
  // Be careful with style, Card, input, img, br, hr (self closing)
  // Let's extract tags:
  const tagRegex = /<\/?([A-Za-z0-9_-]+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(cleanLine)) !== null) {
    const fullMatch = tagMatch[0];
    const tagName = tagMatch[1];
    
    // Ignore self-closing tags if the line has the self-closing slash for that tag
    // Or if the tag is known to be self-closing (img, input, br, hr)
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'link', 'meta', 'style'].includes(tagName.toLowerCase()) || 
                          (cleanLine.includes(tagName + ' ') && cleanLine.includes('/>')) ||
                          cleanLine.includes('/>'); // rough check
                          
    if (fullMatch.startsWith('</')) {
      // Closing tag
      if (tagStack.length === 0) {
        console.log(`[Line ${lineNum}] Error: Closed tag </${tagName}> but stack was empty`);
      } else {
        const last = tagStack.pop();
        if (last.name !== tagName) {
          console.log(`[Line ${lineNum}] Error: Closed tag </${tagName}> but expected </${last.name}> (opened on Line ${last.line})`);
        }
      }
    } else {
      // Opening tag
      // check if it's self-closing on the same line
      const lineSlice = cleanLine.substring(tagMatch.index);
      const isSelfClosedOnLine = lineSlice.includes('/>');
      if (!isSelfClosing && !isSelfClosedOnLine) {
        tagStack.push({ name: tagName, line: lineNum });
      }
    }
  }
}

console.log("\nFinished analysis.");
console.log("Remaining open tags in stack:", tagStack);
console.log("Final brace count:", braceCount);
console.log("Final paren/bracket count:", parenCount);
