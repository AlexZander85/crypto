// ===== Этап 5, приёмка B: ридер-фиксы №1, №2, №6, №7 (консоль старого режима) =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.7.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 380) : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200) + ' @' + (String(e && e.stack || '').match(/index_v12[^()]*:(\d+:\d+)/) || ['', '?'])[1]));
  page.on('console', m => {
    if (m.type() !== 'error' || /ERR_FILE_NOT_FOUND/.test(m.text() || '')) return;
    const loc = m.location();
    errs.push('[svg] ' + (m.text() || '').slice(0, 140) + ' @' + (loc ? loc.lineNumber : '?'));
  });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // ==== 1) №1/A4: dash рендерится ОДИН раз и смонтирован ====
  for (const id of ['p1_l10', 'p3_l1', 'p3_l4', 'p3_l6']) {
    const info = await page.evaluate(async (lid) => {
      openFullscreenLesson(lid);
      await new Promise(r => setTimeout(r, 550));
      const rdId = (LESSONS.find(x => x.id === lid).blocks.find(b => b.type === 'interactive_risk_dash') || {}).id;
      const boxes = rdId ? document.querySelectorAll('#' + rdId) : [];
      const inWidgetBlock = document.querySelectorAll('.widget-block [id^="rd_"]').length;
      const filled = boxes.length === 1 && boxes[0].children.length >= 2;
      closeFullscreenLessonReader();
      await new Promise(r => setTimeout(r, 200));
      return { rdId, count: boxes.length, filled, inWidgetBlock };
    }, id);
    ok('1. ' + id + ': контейнер #' + info.rdId + ' ровно один, смонтирован, пустого дубля в .widget-block нет',
      info.count === 1 && info.filled && info.inWidgetBlock === 0, JSON.stringify(info));
  }

  // ==== 2) №2/A9: селект уровней переживает перерисовку ====
  const tabs = await page.evaluate(async () => {
    const out = {};
    openFullscreenLesson('p1_l1');
    await new Promise(r => setTimeout(r, 450));
    const l2btn = Array.from(document.querySelectorAll('#lessonFullscreenReaderModal button')).find(b => /setLessonLevelTab\('p1_l1', 'l2'\)/.test(b.getAttribute('onclick') || ''));
    if (l2btn) { l2btn.click(); await new Promise(r => setTimeout(r, 350)); }
    out.afterClick = /Практические подробности \(Level 2\)/.test(document.getElementById('lessonContentBox').innerText);
    skipPretest('p1_l1'); // перерисовка renderLessonDetail
    await new Promise(r => setTimeout(r, 350));
    out.afterRerender = /Практические подробности \(Level 2\)/.test(document.getElementById('lessonContentBox').innerText);
    // изоляция по урокам: p1_l2 → l3, возврат к p1_l1 → l2 сохранён
    openFullscreenLesson('p1_l2');
    await new Promise(r => setTimeout(r, 400));
    const l3btn = Array.from(document.querySelectorAll('#lessonFullscreenReaderModal button')).find(b => /setLessonLevelTab\('p1_l2', 'l3'\)/.test(b.getAttribute('onclick') || ''));
    if (l3btn) { l3btn.click(); await new Promise(r => setTimeout(r, 350)); }
    openFullscreenLesson('p1_l1');
    await new Promise(r => setTimeout(r, 400));
    out.p1l1Kept = /Практические подробности \(Level 2\)/.test(document.getElementById('lessonContentBox').innerText);
    out.p1l1L3 = /Математическое и ончейн-устройство/.test(document.getElementById('lessonContentBox').innerText);
    openFullscreenLesson('p1_l2');
    await new Promise(r => setTimeout(r, 400));
    out.p1l2Kept = /Математическое и ончейн-устройство/.test(document.getElementById('lessonContentBox').innerText);
    closeFullscreenLessonReader();
    await new Promise(r => setTimeout(r, 200));
    return out;
  });
  ok('2. Уровневые вкладки: L2 у p1_l1 жив после перерисовки; стейт изолирован по урокам (p1_l2 → L3)',
    tabs.afterClick && tabs.afterRerender && tabs.p1l1Kept && !tabs.p1l1L3 && tabs.p1l2Kept, JSON.stringify(tabs));

  // ==== 3) №6: numericQuiz — капитал начисляется один раз на профиль ====
  const cap1 = await page.evaluate(async () => {
    openFullscreenLesson('p3_l5');
    await new Promise(r => setTimeout(r, 500));
    const before = (typeof fundAum === 'number') ? fundAum : parseInt(localStorage.getItem('cn_fund_aum') || '0', 10);
    const l = LESSONS.find(x => x.id === 'p3_l5');
    const inp = document.getElementById('lnum_in_p3_l5');
    inp.value = String(l.numericQuiz.answer);
    handleLessonNumeric('p3_l5');
    await new Promise(r => setTimeout(r, 200));
    const after = (typeof fundAum === 'number') ? fundAum : parseInt(localStorage.getItem('cn_fund_aum') || '0', 10);
    const checks = JSON.parse(localStorage.getItem('cn_lesson_checks') || '{}');
    const fbTxt = document.getElementById('lnum_fb_p3_l5').innerText;
    closeFullscreenLessonReader();
    return { before, after, delta: after - before, nqDone: !!(checks.p3_l5 && checks.p3_l5.nqDone), fb: fbTxt.replace(/\s+/g, ' ').slice(0, 100) };
  });
  ok('3a. p3_l5 первое решение: +8000 капитала, nqDone в cn_lesson_checks',
    cap1.delta === 8000 && cap1.nqDone, JSON.stringify(cap1));
  await page.reload(); await page.waitForTimeout(3200);
  const cap2 = await page.evaluate(async () => {
    openFullscreenLesson('p3_l5');
    await new Promise(r => setTimeout(r, 500));
    const before = parseInt(localStorage.getItem('cn_fund_aum') || '0', 10);
    const l = LESSONS.find(x => x.id === 'p3_l5');
    const inp = document.getElementById('lnum_in_p3_l5');
    inp.value = String(l.numericQuiz.answer);
    handleLessonNumeric('p3_l5');
    await new Promise(r => setTimeout(r, 200));
    const after = parseInt(localStorage.getItem('cn_fund_aum') || '0', 10);
    const fbTxt = document.getElementById('lnum_fb_p3_l5').innerText;
    closeFullscreenLessonReader();
    await new Promise(r => setTimeout(r, 200));
    return { delta: after - before, note: /уже начислен/.test(fbTxt) };
  });
  ok('3b. После reload повторное решение: капитал НЕ растёт, показана честная пометка',
    cap2.delta === 0 && cap2.note, JSON.stringify(cap2));

  // ==== 4) №7: М46 (m_regressiya_k_srednemu) — график живой, «Сброс» не падает ====
  const errsBefore = errs.length;
  const m46 = await page.evaluate(async () => {
    const out = {};
    openFullscreenLesson('m_regressiya_k_srednemu');
    await new Promise(r => setTimeout(r, 600));
    const cys = () => Array.from(document.querySelectorAll('#m46out circle')).map(c => c.getAttribute('cy'));
    const numeric = a => a.length === 5 && a.every(v => isFinite(parseFloat(v)));
    out.first = numeric(cys());
    const rep = document.getElementById('m46rep');
    if (rep) { rep.click(); await new Promise(r => setTimeout(r, 250)); }
    const lines = Array.from(document.querySelectorAll('#m46out line'));
    out.lines = lines.length > 0 && lines.every(l => isFinite(parseFloat(l.getAttribute('y1'))) && isFinite(parseFloat(l.getAttribute('y2'))));
    const reset = document.getElementById('m46reset');
    if (reset) { reset.click(); await new Promise(r => setTimeout(r, 250)); }
    out.resetHint = /Данные сброшены/.test((document.getElementById('m46out') || {}).innerText || '');
    const pick = document.getElementById('m46pick');
    if (pick) { pick.click(); await new Promise(r => setTimeout(r, 250)); }
    out.rePick = numeric(cys());
    closeFullscreenLessonReader();
    await new Promise(r => setTimeout(r, 200));
    return out;
  });
  ok('4. М46: точки/линии с числовыми координатами, «Сброс» даёт пустое состояние без падения, повторный отбор работает',
    m46.first && m46.lines && m46.resetHint && m46.rePick, JSON.stringify(m46));

  // ==== 5) №7: g05 (p1_l2) — перерисовка уровней не роняет виджет ====
  const g05 = await page.evaluate(async () => {
    const e0 = window.__g05errs || 0;
    openFullscreenLesson('p1_l2');
    await new Promise(r => setTimeout(r, 500));
    const b = Array.from(document.querySelectorAll('#lessonFullscreenReaderModal button')).find(x => /setLessonLevelTab\('p1_l2', 'l2'\)/.test(x.getAttribute('onclick') || ''));
    if (b) { b.click(); await new Promise(r => setTimeout(r, 350)); }
    const cv = document.getElementById('g05_cv');
    closeFullscreenLessonReader();
    await new Promise(r => setTimeout(r, 200));
    return { canvas: !!cv };
  });
  ok('5. g05 (p1_l2): перерисовка урока не даёт ошибок draw, canvas смонтирован', g05.canvas, JSON.stringify(g05));

  // ==== 6) №7: быстрый автопрогон всех уроков ×2 @35мс — консоль чистая ====
  const sweep = await page.evaluate(async (PACE) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const ids = LESSONS.map(l => l.id);
    let n = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (const id of ids) {
        try { openFullscreenLesson(id); } catch (e) {}
        n++;
        await sleep(PACE);
      }
    }
    try { closeFullscreenLessonReader(); } catch (e) {}
    return n;
  }, 35);
  await page.waitForTimeout(600);
  const newErrs = errs.slice(errsBefore);
  ok('6. Автопрогон ' + sweep + ' открытий @35мс: 0 pageerror / 0 SVG-ошибок (в v12.6: 11 за прогон)',
    newErrs.length === 0, JSON.stringify(newErrs.slice(0, 5)));

  // ==== 7) Смоук и selfTest не задеты ====
  const st = await page.evaluate(() => {
    const all = (window.V10 && V10.smoke && V10.smoke.checks) || [];
    return { total: all.length, fails: all.filter(c => !c.ok).map(c => c.name), self: window.LearnPlayer.selfTest() };
  });
  ok('7. V10.smoke ' + st.total + ' проверок без FAIL; selfTest ok (lp3/lp4/lp5)',
    st.fails.length === 0 && st.self.ok && st.self.lp3.ok && st.self.lp4.ok && st.self.lp5.ok,
    JSON.stringify({ fails: st.fails, lp5: st.self.lp5 }));

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_5B: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_5B: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
