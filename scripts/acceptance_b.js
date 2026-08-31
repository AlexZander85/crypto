// P5 + §7.3: сдача, граничные кейсы (порог/порог-1), паритет результатов со старым UI
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('index_v12.4.html');

// Сценарий ответов (общий для обоих путей)
const PLAN = {
  p1_a:   { wrong: [0, 1] },              // 10/12 → 83, сдан
  p1_b:   { wrong: [0, 1, 2] },           // 9/12 → 75, не сдан
  math_a: { wrong: [8, 9] },              // 8/10 → сдан
  math_b: { wrong: [7, 8, 9] },           // 7/10 → не сдан (correct=8 max)
  cap:    { wrong: [0, 1, 2, 3, 4] }      // 33/38 → 87, сдан (психоблок 8/8)
};

async function runPlayerPath(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 40)); await d.dismiss(); });
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const r = await page.evaluate(async (PLAN) => {
    const out = { steps: [] };
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function gotoPortion(qi) {
      const port = Math.floor(qi / 5);
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
        if (m && parseInt(m[1], 10) - 1 === port) return true;
        if (!document.querySelector('[data-lp2-nav="next"]')) return false;
        document.querySelector('[data-lp2-nav="next"]').click();
        await sleep(60);
      }
      return false;
    }
    async function answerPhase(ph, wrongList) {
      const view = window._ptView[ph];
      for (let qi = 0; qi < view.length; qi++) {
        await gotoPortion(qi);
        const q = view[qi];
        if (q.type === 'numeric') {
          const inp = document.getElementById('pnum_in_' + ph + '_' + qi);
          inp.value = String(q.answer); // числовые всегда верно
          document.querySelector('#ptest_' + ph + '_' + qi + ' button.btn').click();
        } else {
          const cont = document.getElementById('ptest_' + ph + '_' + qi);
          const btns = cont.querySelectorAll('button.ans');
          const idx = wrongList.indexOf(qi) >= 0 ? (q.a + 1) % btns.length : q.a;
          btns[idx].click();
        }
        await sleep(30);
      }
    }
    async function answerMath(ti, wrongList) {
      const t = MATH_TESTS[ti];
      for (let qi = 0; qi < t.questions.length; qi++) {
        await gotoPortion(qi);
        const sh = shuffledOptions(t.questions[qi], qi * 17 + 3 + ti * 9);
        const mq = document.querySelector('[data-lp2-mq="' + qi + '"]');
        const btns = mq.querySelectorAll('button.ans');
        const idx = wrongList.indexOf(qi) >= 0 ? (sh.a + 1) % btns.length : sh.a;
        btns[idx].click();
        await sleep(40);
      }
    }
    async function submit() {
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
        const total = document.querySelectorAll('.learn-map .learn-map-item').length;
        if (m && parseInt(m[1], 10) === total) break;
        document.querySelector('[data-lp2-nav="next"]').click();
        await sleep(50);
      }
      document.querySelector('[data-lp2-submit]').click();
      await sleep(250);
    }
    const state = () => ({
      ptd: JSON.parse(JSON.stringify(phaseTestsDone)),
      mts: JSON.parse(JSON.stringify(mathTestState)),
      draft: localStorage.getItem('cn_learn_test')
    });

    // === p1 попытка 1: ровно порог (10/12) ===
    LearnPlayer.openTest('p1', 'tests');
    await sleep(100);
    await answerPhase(1, PLAN.p1_a.wrong);
    await submit();
    await sleep(700); // консолидация 600 мс
    let s1 = {
      state: state(),
      consolZ: (document.getElementById('consolidation_overlay') || {}).style ? undefined : undefined
    };
    const ov = document.getElementById('consolidation_overlay');
    s1.consolZ = ov ? getComputedStyle(ov).zIndex : null;
    s1.consolAbovePlayer = ov ? parseInt(getComputedStyle(ov).zIndex) > 1000001 : null;
    s1.resultText = document.querySelector('.learn-root .learn-step').textContent.replace(/\s+/g, ' ').slice(0, 150);
    s1.nextLessonCta = !!document.querySelector('.learn-root [onclick^="LearnPlayer.open"]');
    s1.banner = !!document.querySelector('.learn-root .learn-card');
    out.p1_a = s1;
    // пересдача
    document.querySelector('[data-lp2-retake]').click();
    await sleep(120);
    await answerPhase(1, PLAN.p1_b.wrong);
    await submit();
    await sleep(700);
    out.p1_b = { state: state(), resultText: document.querySelector('.learn-root .learn-step').textContent.replace(/\s+/g, ' ').slice(0, 120) };
    LearnPlayer.close();
    await sleep(100);

    // === math_stats: 8/10, затем 7/10 ===
    LearnPlayer.openTest('math_stats', 'math');
    await sleep(100);
    await answerMath(1, PLAN.math_a.wrong);
    await submit();
    await sleep(200);
    out.math_a = { state: state(), resultText: document.querySelector('.learn-root .learn-step').textContent.replace(/\s+/g, ' ').slice(0, 120) };
    document.querySelector('[data-lp2-retake]').click();
    await sleep(120);
    await answerMath(1, PLAN.math_b.wrong);
    await submit();
    await sleep(200);
    out.math_b = { state: state() };
    LearnPlayer.close();
    await sleep(100);

    // === capstone 33/38 ===
    LearnPlayer.openTest('capstone', 'tests');
    await sleep(100);
    await answerPhase(6, PLAN.cap.wrong);
    await submit();
    await sleep(400);
    out.cap = {
      state: state(),
      cert: !!document.querySelector('.learn-root') && document.querySelector('.learn-root .learn-step').textContent.indexOf('СЕРТИФИКАТ') >= 0,
      resultText: document.querySelector('.learn-root .learn-step').textContent.replace(/\s+/g, ' ').slice(0, 120)
    };
    LearnPlayer.close();
    await sleep(100);

    // === literacy — диагностика: стейт не пишется ===
    LearnPlayer.openTest('literacy', 'tests');
    await sleep(100);
    const litView = window._ptView ? null : null; // у диагностики свой view (TS)
    await answerDiag(PLAN.lit || { wrong: [0, 1] });
    async function answerDiag(w) {
      // диагностика: первый неотвеченный — кликаем верно/неверно через делегат
      const total = 25;
      for (let qi = 0; qi < total; qi++) {
        await gotoPortion(qi);
        const qc = document.querySelector('[data-lp2-q="' + qi + '"]');
        const btns = qc.querySelectorAll('button.ans');
        btns[qi < 20 ? 0 : 1].click(); // часть неверно
        await sleep(15);
      }
    }
    await submit();
    await sleep(200);
    out.lit = {
      state: state(),
      hasKey: phaseTestsDone['test_literacy_zero'] !== undefined,
      resultText: document.querySelector('.learn-root .learn-step').textContent.replace(/\s+/g, ' ').slice(0, 140)
    };
    LearnPlayer.close();
    await sleep(80);
    return out;
  }, PLAN);

  const freeze = await page.evaluate(() => JSON.stringify({
    ptd: phaseTestsDone, mts: mathTestState, ld: lessonsDone
  }));
  await ctx.close();
  return { r, errors, dialogs, freeze };
}

async function runOldUIPath(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 40)); await d.dismiss(); });
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const r = await page.evaluate(async (PLAN) => {
    const out = {};
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const state = () => ({
      ptd: JSON.parse(JSON.stringify(phaseTestsDone)),
      mts: JSON.parse(JSON.stringify(mathTestState))
    });
    async function oldAnswerPhase(ph, wrongList, retake) {
      switchPhaseTest(ph); await sleep(100); // рендер/ре-рендер = новая соль («Пересдать» в старом UI)
      const view = window._ptView[ph];
      for (let qi = 0; qi < view.length; qi++) {
        const q = view[qi];
        if (q.type === 'numeric') {
          const inp = document.getElementById('pnum_in_' + ph + '_' + qi);
          inp.value = String(q.answer);
          document.querySelector('#ptest_' + ph + '_' + qi + ' button.btn').click();
        } else {
          const btns = document.getElementById('ptest_' + ph + '_' + qi).querySelectorAll('button.ans');
          const idx = wrongList.indexOf(qi) >= 0 ? (q.a + 1) % btns.length : q.a;
          btns[idx].click();
        }
        await sleep(15);
      }
      document.querySelector('button[onclick="calcPhaseTestResult(' + ph + ')"]').click();
      await sleep(120);
    }
    async function oldAnswerMath(ti, wrongList) {
      renderPhaseLessonsView(7);
      await sleep(120);
      const grid = document.getElementById('phaseLessonCardsGrid');
      const t = MATH_TESTS[ti];
      for (let qi = 0; qi < t.questions.length; qi++) {
        const sh = shuffledOptions(t.questions[qi], qi * 17 + 3 + ti * 9);
        // находим кнопки вопроса по префиксу onclick
        const qbtns = Array.from(grid.querySelectorAll('button.ans')).filter(b => (b.getAttribute('onclick') || '').startsWith('answerMathTest(' + ti + ',' + qi + ','));
        const idx = wrongList.indexOf(qi) >= 0 ? (sh.a + 1) % qbtns.length : sh.a;
        qbtns[idx].click();
        await sleep(15);
      }
      grid.querySelector('button[onclick="finishMathTest(' + ti + ')"]').click();
      await sleep(120);
    }
    await oldAnswerPhase(1, PLAN.p1_a.wrong, false);
    out.p1_a = state();
    await oldAnswerPhase(1, PLAN.p1_b.wrong, true);
    out.p1_b = state();
    await oldAnswerMath(1, PLAN.math_a.wrong);
    out.math_a = state();
    await oldAnswerMath(1, PLAN.math_b.wrong);
    out.math_b = state();
    await oldAnswerPhase(6, PLAN.cap.wrong, false);
    out.cap = state();
    return out;
  }, PLAN);
  await ctx.close();
  return { r, errors, dialogs };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const P = await runPlayerPath(browser);
  const O = await runOldUIPath(browser);

  // ==== Сравнение финального стейта (§7.3) ====
  const pf = JSON.parse(P.freeze || '{}');
  const cmp = {};
  const or = O.r;
  cmp.p1_a_pct_player = P.r.p1_a.state.ptd.p1;
  cmp.p1_a_pct_old = or.p1_a.ptd.p1;
  cmp.p1_final_player = P.r.p1_b.state.ptd.p1;
  cmp.p1_final_old = or.p1_b.ptd.p1;
  cmp.cap_player = P.r.cap.state.ptd.exam_capstone;
  cmp.cap_old = or.cap.ptd.exam_capstone;
  cmp.math_final_player = JSON.stringify(P.r.math_b.state.mts[1]);
  cmp.math_final_old = JSON.stringify(or.math_b.mts[1]);
  cmp.mathStateEqual = cmp.math_final_player === cmp.math_final_old;
  cmp.ptdEqual = cmp.p1_final_player === cmp.p1_final_old && cmp.cap_player === cmp.cap_old;
  cmp.lit_no_key = P.r.lit.hasKey === false;
  cmp.player_dialogs = P.dialogs.length;   // должно быть 0 (перехват)
  cmp.old_dialogs = O.dialogs.length;      // >0 (alert как раньше)

  console.log(JSON.stringify({
    player: {
      p1_a: { ptd: P.r.p1_a.state.ptd, draft: P.r.p1_a.state.draft, consolZ: P.r.p1_a.consolZ, consolAbove: P.r.p1_a.consolAbovePlayer, cta: P.r.p1_a.nextLessonCta, text: P.r.p1_a.resultText.slice(0, 90) },
      p1_b: { ptd: P.r.p1_b.state.ptd, text: P.r.p1_b.resultText.slice(0, 90) },
      math_a: { mts: P.r.math_a.state.mts[1], text: P.r.math_a.resultText.slice(0, 80) },
      math_b: { mts: P.r.math_b.state.mts[1] },
      cap: { ptd: P.r.cap.state.ptd.exam_capstone, cert: P.r.cap.cert, text: P.r.cap.resultText.slice(0, 90) },
      lit: { hasKey: P.r.lit.hasKey, text: P.r.lit.resultText.slice(0, 110) }
    },
    old: { p1_a: or.p1_a.ptd, p1_b: or.p1_b.ptd, math_b: or.math_b.mts[1], cap: or.cap.ptd.exam_capstone },
    cmp, dialogs: { player: P.dialogs, old: O.dialogs.slice(0, 6) },
    errors: { player: P.errors.length, old: O.errors.length }
  }, null, 1));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
