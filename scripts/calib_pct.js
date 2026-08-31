// P0.3: калибровка реплики формулы «Курс %» против вкладки «Прогресс» (3 профиля)
const { chromium } = require('playwright');
const path = require('path');

const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.4.html';

// Реплика формулы §1.1 патч-плана Этапа 3 (дословно, ES5-совместимая запись)
const REPLICA_FN = `
function lp3CoursePctReplica(){
  var totalLessons = coreLessonList().length;
  var doneLessons = coreLessonsDoneCount();
  var totalTerms = TERMS.length;
  var doneTerms = Object.values(learned).filter(x=>x===1).length;
  var totalTests = 6;
  var passedTests = Object.entries(phaseTestsDone).filter(([k,v])=>k!=='exam_capstone' && v>=80).length;
  var capstoneScore = phaseTestsDone['exam_capstone'] || 0;
  var capstonePassed = capstoneScore >= 85;
  return Math.round(
    ((doneLessons / totalLessons) * 0.40 +
     (doneTerms / totalTerms) * 0.20 +
     (passedTests / totalTests) * 0.25 +
     (capstonePassed ? 0.15 : (capstoneScore / 100) * 0.15)) * 100
  );
}`;

async function probe(page, profile) {
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { } });
  for (const [k, v] of Object.entries(profile.ls || {})) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [k, v]);
  }
  await page.reload();
  await page.waitForTimeout(3200);
  return await page.evaluate((fnSrc) => {
    eval(fnSrc);
    // DOM-число вкладки «Прогресс»
    const tabBtn = Array.from(document.querySelectorAll('[onclick*="go("]')).find(b => /прогресс/i.test(b.textContent || ''));
    if (tabBtn) tabBtn.click();
    const stats = document.getElementById('stats');
    let domPct = null;
    if (stats) {
      const m = (stats.textContent || '').match(/Course Progress:\s*(\d+)%/i);
      if (m) domPct = parseInt(m[1], 10);
    }
    return {
      replica: lp3CoursePctReplica(),
      dom: domPct,
      coreTotal: coreLessonList().length,
      coreDone: coreLessonsDoneCount(),
      allLessons: LESSONS.length,
      allDone: LESSONS.filter(l => lessonsDone[l.id] === 1).length,
      terms: TERMS.length,
      doneTerms: Object.values(learned).filter(x => x === 1).length,
      passedTests: Object.entries(phaseTestsDone).filter(([k, v]) => k !== 'exam_capstone' && v >= 80).length
    };
  }, REPLICA_FN);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const profiles = [
    { name: '0% (чистый профиль)', clear: true },
    {
      name: 'частичный (2 урока, 10 терминов, p0 сдан)',
      clear: true,
      ls: (() => {
        const done = { p0_l1: 1, p0_l2: 1 };
        const learned = {}; for (let i = 0; i < 10; i++) learned['t' + i] = 1;
        return {
          cn_lessons: JSON.stringify(done),
          cn_learned: JSON.stringify(learned),
          cn_phase_tests: JSON.stringify({ p0: 84 })
        };
      })()
    },
    {
      name: '~50% (28 core-уроков, 150 терминов, 3 теста, капстоун 60)',
      clear: true,
      ls: (() => {
        const learned = {}; for (let i = 0; i < 150; i++) learned['t' + i] = 1;
        return {
          cn_lessons: JSON.stringify({ p0_l1: 1, p0_l2: 1, p0_l3: 1, p0_l4: 1, p0_l5: 1, p0_l6: 1, p0_l7: 1, p0_l8: 1, p0_l9: 1, p0_l10: 1, p0_l11: 1, p0_l12: 1, p0_l13: 1, p0_l14: 1, p0_l15: 1, p0_l16: 1, p0_l17: 1, p0_l18: 1, p0_l19: 1, p0_l20: 1, p1_l1: 1, p1_l2: 1, p1_l3: 1, p1_l4: 1, p1_l5: 1, p1_l6: 1, p1_l7: 1, p1_l8: 1 }),
          cn_learned: JSON.stringify(learned),
          cn_phase_tests: JSON.stringify({ p0: 92, p1: 83, p2: 80, exam_capstone: 60 })
        };
      })()
    }
  ];
  const rows = [];
  for (const p of profiles) {
    const r = await probe(page, p);
    const ok = r.replica === r.dom;
    rows.push(`${ok ? 'OK ' : 'FAIL'} | ${p.name} | реплика=${r.replica} DOM=${r.dom} | core ${r.coreDone}/${r.coreTotal} · все уроки ${r.allDone}/${r.allLessons} · термины ${r.doneTerms}/${r.terms} · тесты≥80 ${r.passedTests}`);
  }
  console.log(rows.join('\n'));
  await browser.close();
})().catch(e => { console.error('CALIB_FAIL', e); process.exit(1); });
