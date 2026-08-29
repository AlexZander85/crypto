const fs = require('fs');
const html = fs.readFileSync('d:/crypto/index.html', 'utf8');

const lines = html.split(/\r?\n/);
console.log('Total lines:', lines.length);

const varMatches = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.match(/^(const|var|let)\s+[a-zA-Z0-9_]+\s*=\s*[\[\{]/)) {
    varMatches.push({ line: i+1, code: l.slice(0, 120) });
  }
}
console.log('Top level objects/arrays:', JSON.stringify(varMatches, null, 2));
