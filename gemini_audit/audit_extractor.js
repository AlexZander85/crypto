const fs = require('fs');
const html = fs.readFileSync('d:/crypto/index.html', 'utf8');

// We can evaluate the data structures in a safe VM context or extract them
const vm = require('vm');

// Extract script content or specific variables
// Let's create a sandbox with browser mocks if needed
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  console: console
};
sandbox.window = sandbox;

// Let's extract specific variable declarations
function extractVar(varName, nextVarName) {
  const regex = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*([\\s\\S]*?);\\s*(?:const|var|let|function|window|\\/\\/)`, 'm');
  const m = html.match(regex);
  if (m) {
    try {
      const script = new vm.Script(`res = ${m[1]}`);
      const ctx = vm.createContext({});
      return script.runInContext(ctx);
    } catch(e) {
      // console.log(`Failed to eval ${varName}:`, e.message);
      return null;
    }
  }
  return null;
}

// Let's extract PHASES
const phasesMatch = html.match(/const PHASES = (\[[\s\S]*?\n\]);/);
let phases = [];
if (phasesMatch) {
  try {
    phases = vm.runInNewContext(phasesMatch[1]);
  } catch(e) {
    console.log('Error parsing phases:', e.message);
  }
}

// Extract LESSONS
const lessonsMatch = html.match(/const LESSONS = (\[[\s\S]*?\n\]);\s*const PHASE_TESTS/);
let lessons = [];
if (lessonsMatch) {
  try {
    lessons = vm.runInNewContext(lessonsMatch[1]);
  } catch(e) {
    console.log('Error parsing lessons:', e.message);
  }
}

console.log('Total PHASES:', phases.length);
phases.forEach(p => console.log(`Phase ${p.id}: ${p.title} (${p.desc || ''})`));

console.log('\nTotal LESSONS:', lessons.length);
const phaseCounts = {};
lessons.forEach(l => {
  phaseCounts[l.phase] = (phaseCounts[l.phase] || 0) + 1;
});
console.log('Lessons per phase:', phaseCounts);

// Check lesson content attributes
if (lessons.length > 0) {
  const sample = lessons[0];
  console.log('Lesson keys:', Object.keys(sample));
  console.log('First 5 lessons:');
  lessons.slice(0, 5).forEach(l => console.log(` - [${l.num}] ${l.title} (Phase ${l.phase})`));
}

// Let's inspect Simulators and widgets
const simMapMatch = html.match(/const LESSON_SIM_MAP = ({[\s\S]*?\n});/);
let simMap = {};
if (simMapMatch) {
  try {
    simMap = vm.runInNewContext(simMapMatch[1]);
    console.log('\nLESSON_SIM_MAP keys count:', Object.keys(simMap).length);
    console.log('Sample mappings:', Object.entries(simMap).slice(0, 8));
  } catch(e) {}
}

fs.writeFileSync('d:/crypto/gemini_audit/curriculum_summary.json', JSON.stringify({
  phases,
  lessonCount: lessons.length,
  phaseCounts,
  lessonsSample: lessons.map(l => ({ id: l.id, phase: l.phase, num: l.num, title: l.title, hasQuiz: !!l.quiz, hasSim: !!(l.sim || simMap[l.id]), keywords: l.keywords }))
}, null, 2));

console.log('Saved curriculum_summary.json');
