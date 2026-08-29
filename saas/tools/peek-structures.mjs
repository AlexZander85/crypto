// Разведка структуры данных index_v9.html перед extract-content.mjs
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../index_v9.html', import.meta.url), 'utf8');

// Сканер сбалансированных скобок с учётом строк (", ', `) и экранирования
function grabArray(name) {
  const i = html.indexOf('const ' + name + ' =');
  if (i < 0) return null;
  const start = html.indexOf('[', i);
  let depth = 0, inStr = null, esc = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    if (ch === ']' || ch === '}' || ch === ')') { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  return null;
}

const targets = ['LESSONS', 'TERMS_RAW', 'PHASE_TESTS', 'EARNING_METHODS', 'MATH_LESSONS_SOURCE', 'MATH_TESTS', 'PSY_LESSONS', 'PSY_LESSONS_2', 'VIBECODING_LESSONS', 'V4_CONTENT_LESSONS'];
for (const n of targets) {
  const src = grabArray(n);
  if (!src) { console.log(n + ': NOT FOUND'); continue; }
  try {
    const val = new Function('return ' + src)();
    console.log(`=== ${n}: ${val.length} items, src ${(src.length / 1024).toFixed(0)}KB`);
    const first = val[0];
    console.log('  keys[0]:', first ? Object.keys(first).join(',') : '-');
    console.log('  sample:', JSON.stringify(first).slice(0, 200));
  } catch (e) {
    console.log(`=== ${n}: EVAL FAILED — ${e.message.slice(0, 120)}`);
  }
}
