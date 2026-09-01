// peek-structures.mjs v2 — разведка структур index_v12.9.html перед extract-content.mjs (§4.3)
// Показывает: тип, размер, объём исходника, первые элементы. Техника — сканер сбалансированных скобок.
import fs from 'node:fs';

const srcArgIdx = process.argv.indexOf('--src');
const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const srcPath = srcArgIdx > -1 ? (process.argv[srcArgIdx + 1].startsWith('/')
  ? process.argv[srcArgIdx + 1] : ROOT + '/' + process.argv[srcArgIdx + 1])
  : ROOT + '/index_v12.9.html';
const html = fs.readFileSync(srcPath, 'utf8');

function grab(name) {
  const i = html.indexOf('const ' + name + ' =');
  if (i < 0) return null;
  let start = -1, openCh = null, closeCh = null;
  for (let j = i + ('const ' + name + ' =').length; j < html.length; j++) {
    const ch = html[j];
    if (ch === '[') { start = j; openCh = '['; closeCh = ']'; break; }
    if (ch === '{') { start = j; openCh = '{'; closeCh = '}'; break; }
    if (ch === ';') return null; // объявление без литерала
  }
  if (start < 0) return null;
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
    if (ch === ']' || ch === '}' || ch === ')') { depth--; if (depth === 0) return { openCh, src: html.slice(start, j + 1) }; }
  }
  return { openCh, src: null };
}

const targets = ['LESSONS', 'MATH_LESSONS_SOURCE', 'PSY_LESSONS', 'PSY_LESSONS_2', 'VIBECODING_LESSONS', 'V4_CONTENT_LESSONS',
  'V11_FT_LABS', 'TERMS_RAW', 'PHASE_TESTS', 'MATH_TESTS', 'QUIZ_PSY', 'PSY_CUMULATIVE_QUESTIONS', 'PSY_SITUATIONAL_DRILL',
  'CAPSTONE_EXAM', 'CRYPTO_LITERACY_EXAM', 'EARNING_METHODS', 'BOOKS', 'QUIZ_DATA', 'QUIZ_LEGAL', 'QUIZ_CALC', 'QUIZ_CASES'];

for (const n of targets) {
  const g = grab(n);
  if (!g || !g.src) { console.log(`${n}: NOT FOUND / not literal`); continue; }
  try {
    const val = new Function('return ' + g.src)();
    const kind = Array.isArray(val) ? `array[${val.length}]` : `object{${Object.keys(val).length}}`;
    console.log(`=== ${n}: ${kind}, src ${(g.src.length / 1024).toFixed(0)}KB (${g.openCh === '{' ? 'OBJECT' : 'array'})`);
    const sample = Array.isArray(val) ? val[0] : val[Object.keys(val)[0]];
    console.log('  sample:', JSON.stringify(sample).slice(0, 160));
    if (Array.isArray(val) && n === 'LESSONS') {
      const phases = val.map(l => l.phase);
      console.log('  phases order:', phases.join(','));
      const byPhase = {};
      val.forEach(l => { byPhase[l.phase] = (byPhase[l.phase] || 0) + 1; });
      console.log('  by phase:', JSON.stringify(byPhase));
    }
    if (Array.isArray(val) && (n === 'PSY_LESSONS' || n === 'PSY_LESSONS_2')) {
      console.log('  nums:', val.map(l => l.num).join(','));
    }
  } catch (e) {
    console.log(`=== ${n}: EVAL FAILED — ${e.message.slice(0, 120)}`);
  }
}

// FT-блок: const FT=[]; + function ft(...) + N вызовов
const ftStart = html.indexOf('const FT=[];');
const acaUp = html.indexOf('const ACADEMY_UPGRADE');
console.log(`\nFT-блок: start=${ftStart}, ACADEMY_UPGRADE=${acaUp}, block ${(acaUp - ftStart < 0 ? -1 : (acaUp - ftStart) / 1024).toFixed(1)}KB`);
if (ftStart > -1 && acaUp > ftStart) {
  const block = html.slice(ftStart, acaUp);
  const calls = (block.match(/^ ?ft\(/gm) || []).length;
  console.log(`  ft() вызовов в блоке: ${calls}`);
  try {
    const FT = new Function(block + '; return FT;')();
    console.log(`  FT: array[${FT.length}], phase9: ${FT.filter(l => l.phase === 9).length}, ids: ${FT.slice(0, 3).map(l => l.id).join(',')}…${FT.slice(-2).map(l => l.id).join(',')}`);
    console.log(`  FT без квиза: ${FT.filter(l => !l.quiz || (Array.isArray(l.quiz) ? l.quiz.length === 0 : Object.keys(l.quiz).length === 0)).length}`);
  } catch (e) {
    console.log('  FT EVAL FAILED — ' + e.message.slice(0, 160));
  }
}
