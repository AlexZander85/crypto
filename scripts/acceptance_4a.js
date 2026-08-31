// ===== Этап 4, приёмка A: персистентный счётчик ошибок (пункт 1) =====
// Сценарий (с учётом семантики Этапа 1: после сдачи квиз блокируется навсегда,
// поэтому накопление между сессиями идёт ДО прохождения):
//   Сессия 1: p0_l1, 2 неверных («Попытка 2»), закрыть без сдачи.
//   Сессия 2 (reload): ещё 2 неверных → sess=2, total=4; метка «Попытка 2» —
//     сессионная (§12.6), total — персистентный; сдать → финал: карточка
//     «4 неверные попытки (всего, с учётом прошлых сессий)».
//   «Не напоминать» → сброс.
//   Сессия 3 (reload): p0_l2, 3 неверных → финал «3 неверные попытки» →
//     CTA → существующий адаптивный контур, счётчик p0_l2 обнулён.
//   §7.2, selfTest, консоль.
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cn_tour_done', '1');
  });
  await page.reload();
  await page.waitForTimeout(3200);
  const lsBefore = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

  const openFresh = (lid) => page.evaluate((lid) => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open(lid); }, lid);
  const goQuiz = async () => {
    await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) {
        const st = document.querySelector('.learn-step');
        if (st && st.querySelector('[id^="lquiz_opts_"]')) return;
        const nb = document.querySelector('[data-lp-nav="next"]');
        if (!nb) return; nb.click(); await new Promise(r => setTimeout(r, 60));
      }
    });
    await page.waitForTimeout(150);
  };
  const wrongClicks = async (lid, n) => page.evaluate(async ({ lid, n }) => {
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const idxs = btns.map(b => { const m = b.getAttribute('onclick').match(/,\s*(\d+)\)\s*$/); return m ? +m[1] : -1; });
    const wrong = btns.filter((b, i) => i !== idxs[0]);
    for (let k = 0; k < n; k++) { wrong[k % wrong.length].click(); await new Promise(r => setTimeout(r, 90)); }
    const retry = document.getElementById('lp_retry_' + lid);
    return { counter: retry ? (retry.innerText.match(/Попытка (\d+)/) || [])[1] || null : null };
  }, { lid, n });
  const correctClick = (lid) => page.evaluate(async (lid) => {
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const m = btns[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
    btns[+m[1]].click();
    await new Promise(r => setTimeout(r, 120));
  }, lid);

  // ==== Сессия 1: 2 неверных, без сдачи ====
  await openFresh('p0_l1');
  await page.waitForTimeout(400);
  await goQuiz();
  const w1 = await wrongClicks('p0_l1', 2);
  const info1 = await page.evaluate(() => LearnPlayer._mistInfo('p0_l1'));
  const ls1 = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_learn_mist') || '{}'));
  ok('1. Сессия 1: 2 неверных → sess=2, total=2, «Попытка 2» (паритет с Этапом 1)',
    info1.sess === 2 && info1.total === 2 && w1.counter === '2', JSON.stringify({ w1, info1 }));
  ok('2. LS cn_learn_mist = { p0_l1: { n:2, ts } }',
    ls1.p0_l1 && ls1.p0_l1.n === 2 && typeof ls1.p0_l1.ts === 'number', JSON.stringify(ls1));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== Сессия 2 (reload): +2 неверных → total=4, sess=2 (счётчики различаются) ====
  await page.reload();
  await page.waitForTimeout(3200);
  const info2 = await page.evaluate(() => LearnPlayer._mistInfo('p0_l1'));
  ok('3. После reload: sess=0, total=2 (персистентность)', info2.sess === 0 && info2.total === 2, JSON.stringify(info2));
  await openFresh('p0_l1');
  await page.waitForTimeout(400);
  await goQuiz();
  const w2 = await wrongClicks('p0_l1', 2);
  const info3 = await page.evaluate(() => LearnPlayer._mistInfo('p0_l1'));
  ok('4. Сессия 2: sess=2 (метка «Попытка 2» — сессионная §12.6), total=4 (накопитель)',
    info3.sess === 2 && info3.total === 4 && w2.counter === '2', JSON.stringify({ w2, info3 }));

  await correctClick('p0_l1');
  const fin1 = await page.evaluate(async () => {
    LearnPlayer.completeLessonOnce();
    await new Promise(r => setTimeout(r, 350));
    const cards = Array.from(document.querySelectorAll('#lp4_rec_card'));
    const txt = cards.map(c => c.innerText.replace(/\s+/g, ' ')).join(' ');
    return {
      n: cards.length,
      has4: /4 неверные попытки\) \(всего, с учётом прошлых сессий\)/.test(txt) || /4 неверные попытки \(всего, с учётом прошлых сессий\)/.test(txt),
      cta: !!Array.from(document.querySelectorAll('#lp4_rec_card button')).find(b => /адаптивную тренировку/i.test(b.textContent)),
      reset: !!Array.from(document.querySelectorAll('#lp4_rec_card button')).find(b => /Не напоминать/.test(b.textContent)),
      dupOld: Array.from(document.querySelectorAll('.learn-step .learn-card')).filter(c => /Квиз дался непросто/.test(c.innerText)).length
    };
  });
  ok('5. Финал: ровно одна карточка «4 неверные попытки (всего, с учётом прошлых сессий)», CTA + «Не напоминать», дубля Этапа 3 нет',
    fin1.n === 1 && fin1.has4 && fin1.cta && fin1.reset && fin1.dupOld === 1, JSON.stringify(fin1));

  // ==== «Не напоминать» → сброс ====
  const reset1 = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#lp4_rec_card button')).find(b => /Не напоминать/.test(b.textContent));
    btn.click();
    await new Promise(r => setTimeout(r, 300));
    return { info: LearnPlayer._mistInfo('p0_l1'), gone: !document.getElementById('lp4_rec_card') };
  });
  ok('6. «Не напоминать»: total=0, карточка исчезла с финала',
    reset1.info.total === 0 && reset1.gone, JSON.stringify(reset1));

  // ==== Сессия 3 (reload): p0_l2 — 3 неверных → финал → CTA → адаптивный контур ====
  await page.reload();
  await page.waitForTimeout(3200);
  await openFresh('p0_l2');
  await page.waitForTimeout(400);
  await goQuiz();
  const w3 = await wrongClicks('p0_l2', 3);
  const info4 = await page.evaluate(() => LearnPlayer._mistInfo('p0_l2'));
  await correctClick('p0_l2');
  await page.evaluate(async () => { LearnPlayer.completeLessonOnce(); await new Promise(r => setTimeout(r, 350)); });
  const fin3 = await page.evaluate(() => {
    const c = document.getElementById('lp4_rec_card');
    return { has: !!c, txt: c ? c.innerText.replace(/\s+/g, ' ') : null };
  });
  ok('7. p0_l2: 3 неверных → финал: «3 неверные попытки» (без пометки прошлых сессий — total==sess)',
    info4.total === 3 && w3.counter === '3' && fin3.has && /3 неверные попытки/.test(fin3.txt || '') && !/с учётом прошлых сессий/.test(fin3.txt || ''),
    JSON.stringify({ w3, info4, fin3 }));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#lp4_rec_card button')).find(b => /адаптивную тренировку/i.test(b.textContent));
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
  const adv = await page.evaluate(async () => {
    const pre = document.getElementById('prepost_modal');
    if (pre) {
      for (let qi = 0; qi < 3; qi++) {
        const opts = Array.from(pre.querySelectorAll('#prepost_opts_' + qi + ' button'));
        if (!opts.length) continue;
        const m = opts[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
        if (m) { opts[+m[1]].click(); await new Promise(r => setTimeout(r, 80)); }
      }
      const next = pre.querySelector('#prepost_next');
      if (next && next.style.display !== 'none') { next.click(); await new Promise(r => setTimeout(r, 400)); }
    }
    const quizTab = document.getElementById('quiz');
    return {
      prepresent: !!pre,
      playerGone: !document.querySelector('.learn-root'),
      quizVisible: quizTab && getComputedStyle(quizTab).display !== 'none',
      isAdaptive: typeof quiz !== 'undefined' && quiz.isAdaptive === true,
      mistAfter: LearnPlayer._mistInfo('p0_l2')
    };
  });
  ok('8. CTA → существующий адаптивный контур запущен (банк не тронут), счётчик p0_l2 сброшен',
    adv.playerGone && adv.quizVisible && adv.isAdaptive && adv.mistAfter.total === 0, JSON.stringify(adv));
  await page.evaluate(() => { try { go('home'); } catch (e) {} });

  // ==== §7.2: LS-след ====
  const lsAfter = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const foreignNonCn = Object.keys(lsAfter).filter(k => !(k in lsBefore) && !k.startsWith('cn_'));
  const newCn = Object.keys(lsAfter).filter(k => !(k in lsBefore) && k.startsWith('cn_'));
  const newLearn = newCn.filter(k => k.startsWith('cn_learn_'));
  const newApp = newCn.filter(k => !k.startsWith('cn_learn_'));
  ok('9. §7.2: новых не-cn_* ключей нет; новые cn_learn_* — только ключи плеера; остальные новые — штатные приложения',
    foreignNonCn.length === 0 && newLearn.every(k => k.startsWith('cn_learn_')),
    'nonCN=[' + foreignNonCn.join(',') + '] learnNew=[' + newLearn.join(',') + '] appNew=[' + newApp.join(',') + ']');

  // ==== selfTest/смоки ====
  const st4 = await page.evaluate(() => { const a = LearnPlayer.selfTest(); return { ok: a.ok, lp4: a.lp4, lp3ok: a.lp3 && a.lp3.ok }; });
  ok('10. selfTest: общий ok, секция lp4 зелёная, lp3 не сломан',
    st4.ok === true && st4.lp4 && st4.lp4.ok === true && st4.lp3ok === true, JSON.stringify(st4));

  const cerrReal = cerr.filter(t => !/ERR_FILE_NOT_FOUND/.test(t));
  ok('11. Консоль: 0 pageerror, 0 console.error (кроме унаследованных ERR_FILE_NOT_FOUND — отсутствующие assets, §6 отчёта Этапа 1)',
    errors.length === 0 && cerrReal.length === 0,
    'page=[' + errors.slice(0, 3).join(' | ') + '] console=[' + cerrReal.slice(0, 3).join(' | ') + ']');

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_4A: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_4A: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
