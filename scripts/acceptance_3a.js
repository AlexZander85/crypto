// ===== Этап 3, приёмка A: Learn Home (ТЗ §12.10.1, патч-план P1/P2) =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.5.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });

  // Профиль: 3 пройденных урока p0, позиция на p0_l4 шаг 2, закладка
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    localStorage.setItem('cn_tour_done', '1'); // онбординг-тур перехватывает pointer-события
    localStorage.setItem('cn_lessons', JSON.stringify({ p0_l1: 1, p0_l2: 1, p0_l3: 1 }));
    localStorage.setItem('cn_learn_pos', JSON.stringify({ lessonId: 'p0_l4', stepIdx: 2, ts: 1700000000000 }));
    localStorage.setItem('cn_learn_bookmarks', JSON.stringify([
      { lessonId: 'p0_l2', stepIdx: 4, stepTitle: 'Теория: уровни 1–4', lessonTitle: 'Урок p0_l2', phase: 0, ts: 1700000001000 }
    ]));
  });
  await page.reload();
  await page.waitForTimeout(3200);

  // 1. Точка входа: клик «🎓» открывает хаб (программный клик — кнопка под оверлеем хаба недостижима для хит-теста)
  const openHome = () => page.evaluate(() => { const b = document.getElementById('lp_header_btn'); b.focus(); b.click(); });
  await openHome();
  await page.waitForTimeout(300);
  let home = await page.$('.learn-home-root');
  ok('P2.1 клик «🎓» открывает хаб', !!home);

  // 2. Повторный клик — не плодит узлов
  await openHome();
  await page.waitForTimeout(200);
  const homes = await page.$$eval('.learn-home-root', els => els.length);
  ok('P2.3 повторный клик игнорируется', homes === 1, 'roots=' + homes);

  // 3. Секции хаба
  const secs = await page.evaluate(() => {
    const t = document.querySelector('.learn-home-root .lp3-body').innerText.toLowerCase();
    return {
      search: !!document.querySelector('.lp3-search-in'),
      continueSec: /▶ (продолжить|начать)/.test(t),
      bookmarks: /🔖 закладки/.test(t),
      recent: /🕘 недавние/.test(t),
      program: /📚 программа курса/.test(t),
      progress: /📈 прогресс/.test(t),
      tests: /🏁 тесты и экзамены/.test(t),
      cards: /🗂 карточки/.test(t),
      notes: /📝 конспект/.test(t)
    };
  });
  ok('P1.2 все 8 секций хаба', Object.values(secs).every(Boolean), JSON.stringify(secs));

  // 4. «Продолжить» — точно сохранённый шаг, без диалога
  const contText = await page.evaluate(() => document.querySelector('.lp3-card.main') ? document.querySelector('.lp3-card.main').innerText : '');
  const stepsP0l4 = await page.evaluate(() => LearnPlayer._buildStepsFor('p0_l4').length);
  ok('P1.2 CTA содержит «шаг 3 из N»', /шаг 3 из /.test(contText), contText.split('\n').join(' ¶ ').slice(0, 120) + ' / N=' + stepsP0l4);
  await page.click('.lp3-card.main');
  await page.waitForTimeout(400);
  const afterOpen = await page.evaluate(() => ({
    active: !!document.querySelector('.learn-root'),
    homeGone: !document.querySelector('.learn-home-root'),
    idx: (document.querySelector('.learn-step') || {}).getAttribute ? document.querySelector('.learn-step').getAttribute('data-lp-idx') : null,
    dialog: !!document.querySelector('.learn-overlay[data-ov="resume"]')
  }));
  ok('P1.5 «Продолжить» открывает точно шаг 2 (idx=2), без диалога',
    afterOpen.active && afterOpen.homeGone && afterOpen.idx === '2' && !afterOpen.dialog, JSON.stringify(afterOpen));

  // 5. Esc → возврат в хаб (from:'home')
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const backHome = await page.evaluate(() => !!document.querySelector('.learn-home-root'));
  ok('P1.4 закрытие плеера возвращает в хаб', backHome);

  // 6. Esc в хабе → фокус на кнопке шапки
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.id === 'lp_header_btn');
  ok('P1.5 Esc хаба возвращает фокус на «🎓»', focusBack);

  // 7. Программа: 10 фаз, сумма счётчиков = 213, галочки = lessonsDone (шаг 6 закрыл хаб — открываем заново)
  await openHome();
  await page.waitForTimeout(250);
  const prog = await page.evaluate(() => {
    const hs = Array.from(document.querySelectorAll('.lp3-ph-h'));
    let sum = 0, done = 0;
    hs.forEach(h => { const m = h.querySelector('.m').textContent.match(/(\d+)\s*\/\s*(\d+)/); if (m) { done += +m[1]; sum += +m[2]; } });
    const marks = Array.from(document.querySelectorAll('.lp3-les.done')).length;
    const lessonsDone = JSON.parse(localStorage.getItem('cn_lessons') || '{}');
    const doneTrue = Object.values(lessonsDone).filter(x => x === 1).length;
    return { phases: hs.length, sum, doneMarks: marks, doneTrue, doneSum: done };
  });
  ok('P1.5 программа: 10 фаз, сумма = 213, галочки = lessonsDone',
    prog.phases === 10 && prog.sum === 213 && prog.doneMarks === prog.doneTrue, JSON.stringify(prog));

  // 8. Аккордеон: клик по фазе раскрывает уроки; клик по уроку — плеер
  await page.click('.lp3-ph-h[data-lp3-ph="1"]');
  await page.waitForTimeout(250);
  const ph1Open = await page.evaluate(() => {
    const ph = document.querySelector('.lp3-ph-h[data-lp3-ph="1"]').closest('.lp3-ph');
    return ph.classList.contains('open') && ph.querySelectorAll('.lp3-les').length === 12;
  });
  ok('P1.2 клик по фазе 1 раскрывает 12 уроков', ph1Open);
  const savedPhase = await page.evaluate(() => (JSON.parse(localStorage.getItem('cn_learn_syllabus') || '{}').phase));
  ok('P1.2 раскрытая фаза в LS cn_learn_syllabus', savedPhase === 1, 'phase=' + savedPhase);
  await page.click('.lp3-ph.open .lp3-les');
  await page.waitForTimeout(400);
  const openedFromProgram = await page.evaluate(() => !!document.querySelector('.learn-root') && !document.querySelector('.learn-home-root'));
  ok('P1.2 клик по уроку программы открывает плеер', openedFromProgram);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // 9. Паритет «Курс %» с вкладкой «Прогресс» (хаб уже открыт — после Esc плеера)
  await page.waitForTimeout(250);
  const parity = await page.evaluate(() => {
    const body = document.querySelector('.learn-home-root .lp3-body').innerText;
    const m = body.match(/(\d+)%\s*\n?курс пройден/) || body.match(/(\d+)%/);
    const homePct = m ? +m[1] : null;
    // DOM вкладки «Прогресс»
    const tabBtn = Array.from(document.querySelectorAll('[onclick*="go("]')).find(b => /прогресс/i.test(b.textContent || ''));
    if (tabBtn) tabBtn.click();
    const stats = document.getElementById('stats');
    const dm = stats ? (stats.textContent || '').match(/Course Progress:\s*(\d+)%/i) : null;
    return { homePct, domPct: dm ? +dm[1] : null };
  });
  ok('§12.10.1 «Курс %» = вкладке «Прогресс» число-в-число',
    parity.homePct !== null && parity.homePct === parity.domPct, JSON.stringify(parity));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  // 10. Недавние: 6 уроков подряд → 5, свежий первым; переживает перезагрузку
  await page.evaluate(async () => {
    const ids = ['p1_l1', 'p1_l2', 'p2_l1', 'p3_l1', 'p4_l1', 'p5_l1'];
    for (const id of ids) { LearnPlayer.open(id); await new Promise(r => setTimeout(r, 60)); LearnPlayer.close(); }
  });
  await page.waitForTimeout(400);
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_learn_recent') || '[]').map(x => x.lessonId));
  ok('P7 open×6 → recent ≤5, LRU-порядок', rec.length === 5 && rec[0] === 'p5_l1' && !rec.includes('p1_l1'), rec.join(','));
  await page.reload();
  await page.waitForTimeout(3000);
  const rec2 = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_learn_recent') || '[]').map(x => x.lessonId));
  ok('P7 недавние переживают перезагрузку', JSON.stringify(rec) === JSON.stringify(rec2), rec2.join(','));

  // 11. Недавние/закладки в хабе кликабельны
  await openHome();
  await page.waitForTimeout(250);
  const bmClick = await page.evaluate(() => {
    const btn = document.querySelector('[data-lp3-bm]');
    return btn ? btn.innerText.slice(0, 60) : null;
  });
  ok('P1.2 закладка из профиля видна в хабе', !!bmClick, bmClick || '—');
  await page.click('[data-lp3-bm]');
  await page.waitForTimeout(400);
  const bmJump = await page.evaluate(() => ({
    active: !!document.querySelector('.learn-root'),
    idx: document.querySelector('.learn-step') ? document.querySelector('.learn-step').getAttribute('data-lp-idx') : null
  }));
  ok('§12.10.1 закладка открывает точно шаг', bmJump.active && bmJump.idx === '4', JSON.stringify(bmJump));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape'); // хаб закрыть
  await page.waitForTimeout(200);

  // 12. Тесты и экзамены: 13 банков с состояниями
  await openHome();
  await page.waitForTimeout(250);
  const tests = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.lp3-test'));
    return { n: rows.length, sample: rows.slice(0, 2).map(r => r.innerText.split('\n')[0]) };
  });
  ok('P1.2 «Тесты и экзамены»: 13 банков', tests.n === 13, 'n=' + tests.n + ' ' + tests.sample.join(' | '));

  // 13. Черновик теста попадает в «Продолжить», если свежее позиции
  await page.evaluate(() => {
    localStorage.setItem('cn_learn_test', JSON.stringify({ testId: 'p1', ph: 1, salt: 42, pos: 1, answers: { 0: 1, 1: 0, 2: 2 }, numeric: {}, updatedTs: 1800000000000 }));
  });
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await openHome(); await page.waitForTimeout(250);
  const contTest = await page.evaluate(() => (document.querySelector('.lp3-card.main') || {}).innerText || '');
  ok('P1.2 черновик теста свежее → главный CTA — попытка',
    /продолжить попытку/i.test(contTest) && /отвечено 3 из 12/.test(contTest), contTest.split('\n').join(' ¶ '));
  await page.click('.lp3-card.main');
  await page.waitForTimeout(500);
  const testResume = await page.evaluate(() => ({
    player: !!document.querySelector('.learn-root'),
    resumeDialog: !!document.querySelector('.learn-overlay[data-ov="test-resume"]')
  }));
  ok('P1.2 CTA попытки → openTest с resume-диалогом', testResume.player && testResume.resumeDialog, JSON.stringify(testResume));

  // 14. Кнопки хаба — все <button> (a11y §12.8)
  const clickables = await page.evaluate(() => {
    // закрываем плеер, открываем хаб заново
    const root = document.querySelector('.learn-root');
    if (root) { LearnPlayer.close(); }
    return null;
  });
  await page.waitForTimeout(300); // хаб вернулся (from home)
  const btnCheck = await page.evaluate(() => {
    const hr = document.querySelector('.learn-home-root');
    if (!hr) return { ok: false, why: 'нет хаба' };
    const bad = hr.querySelectorAll('div[onclick], span[onclick], li[onclick]');
    return { ok: bad.length === 0, why: 'non-button onclick=' + bad.length };
  });
  ok('§12.8 в хабе нет не-кнопок с onclick', btnCheck.ok, btnCheck.why || '');

  // 15. 360px: без горизонтального скролла
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(300);
  const mob = await page.evaluate(() => {
    const b = document.querySelector('.learn-home-root .lp3-body');
    return { hscroll: b ? b.scrollWidth > b.clientWidth + 2 : null };
  });
  ok('§12.10 360px хаб без горизонтального скролла', mob.hscroll === false, JSON.stringify(mob));

  ok('КОНСОЛЬ чистая', errors.length === 0 && cerr.length === 0,
    (errors.length ? 'page: ' + errors[0] : '') + (cerr.length ? ' console: ' + cerr[0] : ''));
  console.log(R.join('\n'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/home/z/my-project/scripts/shot3_home.png' });
  await browser.close();
  const fails = R.filter(x => x.startsWith('FAIL')).length;
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('A_FAIL', e); console.log(R.join('\n')); process.exit(1); });
