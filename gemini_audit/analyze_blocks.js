const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('d:/crypto/index.html', 'utf8');

const startIdx = html.indexOf('const LESSONS = [');
const endIdx = html.indexOf('const PHASE_TESTS = [');
const lessonsSlice = html.substring(startIdx + 'const LESSONS = '.length, endIdx).trim().replace(/;\s*$/, '');
const lessons = vm.runInNewContext(lessonsSlice).filter(Boolean);

const detailedStats = lessons.map(l => {
  const blockTypes = (l.blocks || []).map(b => b.type);
  const hasSimple = (l.blocks || []).some(b => b.simpleAnalogy || b.level1);
  const codeBlocks = (l.blocks || []).filter(b => b.type === 'code' || (b.level4 && b.level4.length > 20));
  const sim = l.sim || null;
  return {
    id: l.id,
    phase: l.phase,
    num: l.num,
    title: l.title,
    blockTypes,
    hasSimple,
    codeBlocksCount: codeBlocks.length,
    termsCount: (l.terms || []).length,
    hasQuiz: !!l.quiz
  };
});

fs.writeFileSync('d:/crypto/gemini_audit/detailed_lesson_analysis.json', JSON.stringify(detailedStats, null, 2), 'utf8');
console.log('Analyzed', detailedStats.length, 'lessons in detail.');
