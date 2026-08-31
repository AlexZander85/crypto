// Дамп состояния приложения (протокол §7.1 патч-плана Этапа 2)
// Использование: node dump_state.js <file.html> <out.json> [profileDir]
// Съём: LESSONS + все банки, JSON-сериализация, сортировка ключей стабильна
// (порядок вставки), двойной съём — проверка стабильности.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [,, htmlFile, outFile] = process.argv;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(htmlFile));
  await page.waitForTimeout(3500); // полная загрузка всех скриптов

  const dumpFn = () => {
    const snap = (o) => JSON.parse(JSON.stringify(o === undefined ? null : o));
    return {
      lessons: snap(typeof LESSONS !== 'undefined' ? LESSONS : null),
      phaseTests: snap(typeof PHASE_TESTS !== 'undefined' ? PHASE_TESTS : null),
      mathTests: snap(typeof MATH_TESTS !== 'undefined' ? MATH_TESTS : null),
      capstone: snap(typeof CAPSTONE_EXAM !== 'undefined' ? CAPSTONE_EXAM : null),
      literacy: snap(typeof CRYPTO_LITERACY_EXAM !== 'undefined' ? CRYPTO_LITERACY_EXAM : null),
      psyCum: snap(typeof PSY_CUMULATIVE_QUESTIONS !== 'undefined' ? PSY_CUMULATIVE_QUESTIONS : null),
      quizPsy: snap(typeof QUIZ_PSY !== 'undefined' ? QUIZ_PSY : null),
      termsRaw: snap(typeof TERMS_RAW !== 'undefined' ? TERMS_RAW : null),
      abbr: snap(typeof ABBREVIATION_GLOSSARY !== 'undefined' ? ABBREVIATION_GLOSSARY : null),
      phases: snap(typeof PHASES !== 'undefined' ? PHASES : null),
      passports: snap(typeof PHASE_PASSPORTS !== 'undefined' ? PHASE_PASSPORTS : null),
      // Стейт-снимок для §7.2
      phaseTestsDone: snap(typeof phaseTestsDone !== 'undefined' ? phaseTestsDone : null),
      mathTestState: snap(typeof mathTestState !== 'undefined' ? mathTestState : null),
      lessonsDone: snap(typeof lessonsDone !== 'undefined' ? lessonsDone : null),
      lsAll: snap((() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; })())
    };
  };

  const d1 = await page.evaluate(dumpFn);
  const d2 = await page.evaluate(dumpFn); // двойной съём — стабильность
  const stable = JSON.stringify(d1) === JSON.stringify(d2);

  // Убираем волатильные ключи LS из сравнения (токены сессии и т.п. не должно быть, но на всякий случай фиксируем список)
  fs.writeFileSync(outFile, JSON.stringify(d1));
  const sizes = {
    lessons: d1.lessons ? d1.lessons.length : null,
    phaseTests: d1.phaseTests ? d1.phaseTests.map(t => (t.questions || (t.questions === undefined ? null : [])).length || (t.questions ? t.questions.length : 0)) : null,
    mathTests: d1.mathTests ? d1.mathTests.map(t => t.questions.length) : null,
    capstone: d1.capstone ? d1.capstone.questions.length : null,
    literacy: d1.literacy ? d1.literacy.questions.length : null,
    psyCum: d1.psyCum ? d1.psyCum.length : null,
    quizPsy: d1.quizPsy ? d1.quizPsy.length : null,
    bytes: fs.statSync(outFile).size,
    stable
  };
  console.log(JSON.stringify(sizes, null, 1));
  await browser.close();
})().catch(e => { console.error('DUMP_FAIL', e.message); process.exit(1); });
