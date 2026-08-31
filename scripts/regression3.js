// Регрессия существующего режима + скриншоты Этапа 3
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v12.5.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // Старый режим: карточка → ридер
  await page.evaluate(() => { go('lessons'); renderPhaseLessonsView(0); });
  await page.waitForTimeout(400);
  const oldFlow = await page.evaluate(() => {
    const card = document.getElementById('lesson_card_p0_l1');
    if (!card) return { card: false };
    card.click();
    return { card: true, reader: !!document.getElementById('lessonFullscreenReaderModal') };
  });
  ok('старый режим: карточка → ридер работает', oldFlow.card && oldFlow.reader, JSON.stringify(oldFlow));
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(200);

  // Старый тестовый UI: вкладка «Тесты» → renderPhaseTestView
  const oldTest = await page.evaluate(() => {
    try { go('tests'); renderPhaseTestView(1); } catch (e) { return { err: String(e) }; }
    return { box: !!document.querySelector('#phaseTestBox [id^="ptest_1_"]') || document.getElementById('phaseTestBox').innerHTML.length > 100 };
  });
  ok('старый режим: фазовый тест рендерится', !!oldTest.box, JSON.stringify(oldTest));

  // Этап 2 не сломан: openTest + сдача одной порции
  const s2 = await page.evaluate(async () => {
    LearnPlayer.openTest('p2', 'tests');
    await new Promise(r => setTimeout(r, 300));
    const view = window._ptView[2];
    const btns = document.querySelectorAll('#ptest_2_0 button.ans');
    btns[view[0].a].click();
    await new Promise(r => setTimeout(r, 100));
    return { locked: Array.from(btns).every(b => b.disabled), okMark: btns[view[0].a].classList.contains('ok') };
  });
  ok('Этап 2: тест в плеере работает (семантика §11.0)', s2.locked && s2.okMark, JSON.stringify(s2));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // ==== Скриншоты ====
  // 1. Хаб
  await page.evaluate(() => { const b = document.getElementById('lp_header_btn'); b.focus(); b.click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot3_home.png' });
  // 2. Поиск в хабе
  await page.fill('.lp3-search-in', 'ликвидация');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot3_search.png' });
  await page.evaluate(() => { const i = document.querySelector('.lp3-search-in'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  // 3. Syllabus в плеере
  await page.evaluate(() => { LearnPlayer.close(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(400);
  await page.click('[data-lp3-tab="program"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'shot3_syllabus.png' });
  // 4. Конспект + заметка
  await page.click('[data-lp3-tab="notes"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'shot3_notes.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  // 5. Финал с якорем фазы и адаптивной рекомендацией — подготовим профиль
  await page.evaluate(() => {
    localStorage.setItem('cn_lessons', JSON.stringify({ p0_l1: 1, p0_l2: 1, p0_l3: 1 }));
    localStorage.setItem('cn_lesson_checks', JSON.stringify({ p0_l4: { quizDone: true } }));
  });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => { LearnPlayer.open('p0_l4'); });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    // квиз уже сдан (quizDone) — идём к финалу
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      if (st && /Урок пройден|Урок уже был пройден/i.test(st.innerText)) return;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb || nb.disabled) { LearnPlayer.completeLessonOnce(); return; }
      nb.click(); await new Promise(r => setTimeout(r, 70));
    }
  });
  await page.waitForTimeout(400);
  // консолидация памяти (z 1001500) перекрывает финал — закрываем все её шаги
  await page.evaluate(async () => {
    for (let i = 0; i < 4; i++) {
      const ov = document.getElementById('consolidation_overlay');
      if (!ov || getComputedStyle(ov).display === 'none') return;
      const btn = Array.from(ov.querySelectorAll('button')).find(b => /Понял|Пропустить|гулять|Дальше|Продолжить/i.test(b.textContent || ''));
      if (!btn) return;
      btn.click();
      await new Promise(r => setTimeout(r, 350));
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot3_finale.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // 6. 360px хаб
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => { const b = document.getElementById('lp_header_btn'); b.focus(); b.click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot3_home_360.png' });

  ok('скриншоты сняты', true, '6 шт.');
  console.log(R.join('\n'));
  await browser.close();
  const fails = R.filter(x => x.startsWith('FAIL')).length;
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('REG_FAIL', e); console.log(R.join('\n')); process.exit(1); });
