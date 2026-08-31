// P3+P4: живые ответы (семантика §11.0), resume черновика, стейт-заморозка §7.2
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('index_v12.4.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  // ======= P3: фазовый — ответ окончателен, пояснение сразу, счётчик =======
  const p3a = await page.evaluate(async () => {
    const out = {};
    LearnPlayer.openTest('p2', 'tests');
    await new Promise(r => setTimeout(r, 80));
    const view = window._ptView[2];
    const cont = document.getElementById('ptest_2_0');
    const btns = cont.querySelectorAll('button.ans');
    const wrongIdx = (view[0].a + 1) % btns.length;
    btns[wrongIdx].click();
    await new Promise(r => setTimeout(r, 60));
    out.locked = Array.from(btns).every(b => b.disabled);
    out.okOnCorrect = btns[view[0].a].classList.contains('ok');
    out.badOnWrong = btns[wrongIdx].classList.contains('bad');
    const exp = document.getElementById('ptest_exp_2_0');
    out.explainShown = exp && exp.style.display === 'block' && exp.textContent.indexOf('Разбор варианта') >= 0;
    out.explainText = exp ? exp.textContent.slice(0, 60) : null;
    out.counter = document.querySelector('.learn-progress-label').textContent;
    out.draft = JSON.parse(localStorage.getItem('cn_learn_test'));
    out.draftAnswer = out.draft.answers['0'];
    //journal-обёртка приложения добавилась в exp?
    out.journal = !!exp.querySelector('button');
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    return out;
  });

  // ======= P3: мат-тест — смена ответа разрешена, пояснение обновляется =======
  const p3b = await page.evaluate(async () => {
    const out = {};
    LearnPlayer.openTest('math_core', 'math');
    await new Promise(r => setTimeout(r, 80));
    const qi = 0, ti = 0;
    const sh = shuffledOptions(MATH_TESTS[ti].questions[qi], qi * 17 + 3 + ti * 9);
    let mq = document.querySelector('[data-lp2-mq="0"]');
    let btns = mq.querySelectorAll('button.ans');
    btns[(sh.a + 1) % btns.length].click();           // неверный
    await new Promise(r => setTimeout(r, 150));
    mq = document.querySelector('[data-lp2-mq="0"]'); // шаг перерисован — обновляем ссылку
    out.badAfterFirst = mq.querySelector('button.ans.bad') !== null;
    out.explain1 = mq.querySelector('.lp2-exp') ? mq.querySelector('.lp2-exp').textContent.slice(0, 40) : null;
    out.stateAfterFirst = JSON.parse(JSON.stringify(mathTestState[0].answers));
    btns = document.querySelector('[data-lp2-mq="0"]').querySelectorAll('button.ans');
    btns[sh.a].click();                                // смена на верный
    await new Promise(r => setTimeout(r, 120));
    mq = document.querySelector('[data-lp2-mq="0"]');
    out.okAfterChange = mq.querySelector('button.ans.ok') !== null && mq.querySelector('button.ans.bad') === null;
    out.stateAfterChange = JSON.parse(JSON.stringify(mathTestState[0].answers));
    out.answersKept = Object.keys(mathTestState[0].answers).length === 1;
    out.counter = document.querySelector('.learn-progress-label').textContent;
    // подложка фазы 7 перерисована answerMathTest (A19) и не падает
    out.backgroundAlive = !!document.getElementById('phaseLessonCardsGrid');
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    return out;
  });

  // ======= P3: числовой вопрос (p1 — numeric в хвосте) =======
  const p3c = await page.evaluate(async () => {
    const out = {};
    LearnPlayer.openTest('p1', 'tests');
    await new Promise(r => setTimeout(r, 80));
    const view = window._ptView[1];
    const numQs = view.map((q, i) => q.type === 'numeric' ? i : -1).filter(i => i >= 0);
    out.numericIdx = numQs;
    async function gotoQi(qi) {
      const port = Math.floor(qi / 5); // целевой шаг (порции 0-based)
      for (let k = 0; k < 12; k++) {
        const lbl = document.querySelector('.learn-progress-label').textContent;
        const m = /Шаг (\d+) из/.exec(lbl);
        if (m && parseInt(m[1], 10) - 1 === port) return;
        LearnPlayer.next();
        await new Promise(r => setTimeout(r, 70));
      }
    }
    const qi = numQs[0], q = view[qi];
    await gotoQi(qi);
    const inp = document.getElementById('pnum_in_1_' + qi);
    inp.value = String(q.answer);
    document.querySelector('#ptest_1_' + qi + ' button.btn').click();
    await new Promise(r => setTimeout(r, 60));
    const cont = document.getElementById('ptest_1_' + qi);
    out.markerOk = !!cont.querySelector('span.ans.ok');
    out.inputDisabled = inp.disabled;
    const exp = document.getElementById('ptest_exp_1_' + qi);
    out.expShown = exp.style.display === 'block' && exp.textContent.indexOf('Эталон') >= 0;
    out.markerHidden = getComputedStyle(cont.querySelector('span.ans.ok')).display === 'none';
    out.draftNumeric = JSON.parse(localStorage.getItem('cn_learn_test')).numeric;
    // неверный — вторая числовая
    const qi2 = numQs[1], q2 = view[qi2];
    await gotoQi(qi2);
    const inp2 = document.getElementById('pnum_in_1_' + qi2);
    inp2.value = String(q2.answer + 1000);
    document.querySelector('#ptest_1_' + qi2 + ' button.btn').click();
    await new Promise(r => setTimeout(r, 60));
    out.markerBad = !!document.getElementById('ptest_1_' + qi2).querySelector('span.ans.bad');
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    return out;
  });

  // ======= P4: resume p8 — закрыть страницу, открыть заново, продолжить с 7 =======

  // отвечаем 7 вопросов в p8
  const p8draft = await page.evaluate(async () => {
    LearnPlayer.openTest('p8', 'tests');
    await new Promise(r => setTimeout(r, 120));
    const view = window._ptView[8];
    const answered = {};
    // порция 1 (qi 0-4): 5 ответов
    for (let qi = 0; qi < 5; qi++) {
      const q = view[qi];
      if (q.type === 'numeric') continue;
      const cont = document.getElementById('ptest_8_' + qi);
      const btns = cont.querySelectorAll('button.ans');
      btns[(q.a + 1) % btns.length].click();
      await new Promise(r => setTimeout(r, 30));
      answered[qi] = (q.a + 1) % btns.length;
    }
    LearnPlayer.next(); // порция 2
    await new Promise(r => setTimeout(r, 80));
    for (let qi = 5; qi < 7; qi++) {
      const q = view[qi];
      const cont = document.getElementById('ptest_8_' + qi);
      const btns = cont.querySelectorAll('button.ans');
      btns[q.a].click();
      await new Promise(r => setTimeout(r, 30));
      answered[qi] = q.a;
    }
    const d = JSON.parse(localStorage.getItem('cn_learn_test'));
    return { draft: d, viewSnapshot: window._ptView[8].map(q => ({ a: q.a, opts: q.opts })), answered };
  });
  await page.goto('about:blank'); // закрытие «вкладки»
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const p4 = await page.evaluate(async (p8draft) => {
    const out = {};
    out.draftPersisted = !!localStorage.getItem('cn_learn_test');
    LearnPlayer.openTest('p8', 'tests');
    await new Promise(r => setTimeout(r, 120));
    out.viewSameAsBeforeClose = JSON.stringify(window._ptView[8].map(q => ({ a: q.a, opts: q.opts }))) === JSON.stringify(p8draft.viewSnapshot);
    // баннер
    const ov = document.querySelector('.learn-overlay[data-ov="test-resume"]');
    out.resumeBanner = ov ? ov.textContent.replace(/\s+/g, ' ').slice(0, 90) : null;
    const contBtn = ov && ov.querySelector('[data-lp2-resume="1"]');
    if (contBtn) contBtn.click();
    await new Promise(r => setTimeout(r, 80));
    // вернуться к порции 1 по карте (посещённые порции кликабельны)
    const map0 = document.querySelector('.learn-map [data-lp2-map="0"]');
    if (map0 && !map0.disabled) map0.click();
    await new Promise(r => setTimeout(r, 80));
    // порция 1: qi 0-4 залочены с теми же маркерами
    const view = window._ptView[8];
    let lockedOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const q = view[qi];
      if (q.type === 'numeric') continue;
      const cont = document.getElementById('ptest_8_' + qi);
      const btns = cont.querySelectorAll('button.ans');
      if (!Array.from(btns).every(b => b.disabled)) lockedOk = false;
      if (!btns[q.a].classList.contains('ok')) lockedOk = false;
      const chosen = p8draft.answered[qi];
      if (chosen !== q.a && !btns[chosen].classList.contains('bad')) lockedOk = false;
      const exp = document.getElementById('ptest_exp_8_' + qi);
      if (!exp || exp.style.display !== 'block') lockedOk = false;
    }
    out.portion1LockedSame = lockedOk;
    out.label = document.querySelector('.learn-progress-label').textContent;
    out.noDoubleMarkers = document.querySelectorAll('#ptest_8_0 .ans.ok').length === 1;
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    return out;
  }, p8draft);

  // ======= §7.2: стейт-заморозка после resume-сценариев =======
  const freeze = await page.evaluate(() => {
    return {
      phaseTestsDone: JSON.parse(JSON.stringify(phaseTestsDone)),
      mathTestState: JSON.parse(JSON.stringify(mathTestState)),
      lessonsDone: JSON.parse(JSON.stringify(lessonsDone)),
      lessonCheckState: JSON.parse(JSON.stringify(lessonCheckState)),
      cn_speedrun: localStorage.getItem('cn_speedrun')
    };
  });
  const empty = { phaseTestsDone: {}, mathTestState: {}, lessonsDone: {}, lessonCheckState: {} };
  const freezeOk =
    JSON.stringify(freeze.phaseTestsDone) === JSON.stringify(empty.phaseTestsDone) &&
    JSON.stringify(freeze.mathTestState) === JSON.stringify(empty.mathTestState) &&
    JSON.stringify(freeze.lessonsDone) === JSON.stringify(empty.lessonsDone) &&
    freeze.cn_speedrun === null || freeze.cn_speedrun === '{}' || true; // speedrun пишется только при сдаче

  console.log(JSON.stringify({ p3a, p3b, p3c, p4, freeze }, null, 1));
  console.log('STATE_FREEZE_OK:', JSON.stringify(freeze.phaseTestsDone) === '{}' && JSON.stringify(freeze.mathTestState) === '{}' && JSON.stringify(freeze.lessonsDone) === '{}');
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 5));
  console.log('CONSOLE_ERRORS:', consoleErrors.length, consoleErrors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
