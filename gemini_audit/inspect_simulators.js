const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('d:/crypto/index.html', 'utf8');

// Let's find all simulators and widgets
const simMapMatch = html.match(/const LESSON_SIM_MAP = ({[\s\S]*?\n});/);
let simMap = {};
if (simMapMatch) {
  try {
    simMap = vm.runInNewContext('(' + simMapMatch[1] + ')');
  } catch(e) {
    console.log('Error parsing simMap:', e.message);
  }
}

// Find all HTML simulator containers: id="sim-..." or class="sim-container" etc.
const simIds = [];
const simIdMatches = html.matchAll(/id="([^"]*sim[^"]*)"/gi);
for (const m of simIdMatches) {
  simIds.push(m[1]);
}

// Find all widget IDs
const widgetMatches = html.matchAll(/id="(widget_[^"]+)"/gi);
const widgetIds = [];
for (const m of widgetMatches) {
  widgetIds.push(m[1]);
}

// Find Math lessons
const mathMatch = html.match(/const MATH_LESSONS_SOURCE = (\[[\s\S]*?\]);\s*const MATH_TESTS/);
let mathLessons = [];
if (mathMatch) {
  try {
    mathLessons = vm.runInNewContext(mathMatch[1]);
  } catch(e) {
    console.log('Error parsing math lessons:', e.message);
  }
}

console.log('Math Lessons count:', mathLessons.length);
mathLessons.forEach(m => console.log(` - [${m.num}] ${m.title} (id: ${m.id})`));

console.log('\nTotal Simulators in LESSON_SIM_MAP:', Object.keys(simMap).length);
console.log('LESSON_SIM_MAP:', JSON.stringify(simMap, null, 2));

console.log('\nSimulator DOM elements:', simIds);
console.log('\nWidget elements count:', widgetIds.length);
console.log('Widget elements sample:', widgetIds.slice(0, 20));

// Check active recall / SRS / interleaving / tests implementation
const testMatches = html.match(/const PHASE_TESTS = (\[[\s\S]*?\]);\s*const/);
let phaseTests = [];
if (testMatches) {
  try {
    phaseTests = vm.runInNewContext(testMatches[1]);
    console.log('\nPhase Tests count:', phaseTests.length);
    phaseTests.forEach(t => console.log(` - Test for phase ${t.phase}: ${t.questions ? t.questions.length : 0} questions`));
  } catch(e) {
    console.log('Error parsing phaseTests:', e.message);
  }
}

// Check Capstone Exam & Chaos scenarios
const chaosMatch = html.match(/const CHAOS_SCENARIOS = (\[[\s\S]*?\]);\s*const CAPSTONE_EXAM/);
if (chaosMatch) {
  try {
    const chaos = vm.runInNewContext(chaosMatch[1]);
    console.log('\nChaos scenarios count:', chaos.length);
  } catch(e) {}
}

const capstoneMatch = html.match(/const CAPSTONE_EXAM = ({[\s\S]*?});\s*const PD_STAGES/);
if (capstoneMatch) {
  try {
    const capstone = vm.runInNewContext('(' + capstoneMatch[1] + ')');
    console.log('\nCapstone exam questions count:', capstone.questions ? capstone.questions.length : 0);
  } catch(e) {}
}
