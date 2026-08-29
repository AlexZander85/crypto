const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('d:/crypto/index.html', 'utf8');

const startIdx = html.indexOf('const LESSONS = [');
const endIdx = html.indexOf('const PHASE_TESTS = [');

const lessonsSlice = html.substring(startIdx + 'const LESSONS = '.length, endIdx).trim().replace(/;\s*$/, '');
const lessons = vm.runInNewContext(lessonsSlice);
console.log('Successfully evaluated lessons count:', lessons.length);

const phaseMap = {};
lessons.filter(Boolean).forEach(l => {
  if (!phaseMap[l.phase]) phaseMap[l.phase] = [];
  phaseMap[l.phase].push({
    id: l.id,
    num: l.num,
    title: l.title,
    blocksCount: l.blocks ? l.blocks.length : 0,
    hasTerms: (l.terms || []).length,
    hasQuiz: !!l.quiz,
    caseTitle: l.case ? l.case.title : 'none',
    cognitiveLoad: l.cognitiveLoad,
    timeEst: l.timeEst
  });
});

for (const [p, list] of Object.entries(phaseMap)) {
  console.log(`Phase ${p}: ${list.length} lessons`);
  list.forEach(l => console.log(`   [${l.num}] ${l.title} (blocks: ${l.blocksCount}, terms: ${l.hasTerms}, quiz: ${l.hasQuiz})`));
}

fs.writeFileSync('d:/crypto/gemini_audit/lessons_dump.json', JSON.stringify(phaseMap, null, 2), 'utf8');
