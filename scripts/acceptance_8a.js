// Приёмка Этапа 8, часть A: хаб «Моё обучение» (чек-лист §11: №5–9 частично, данные трека)
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v13.0.html';
let okN = 0, failN = 0;
const ok = (c, name) => { if (c) { okN++; console.log('  OK', name); } else { failN++; console.log('  FAIL', name); } };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(HTML));
  await page.waitForTimeout(3200);

  console.log('--- A1. Данные трека и self-test');
  const data = await page.evaluate(() => ({
    coreCount: CNTracks.data.coreCount,
    blocks: CNTracks.data.electives.length,
    blockLessons: CNTracks.data.electives.reduce((s, b) => s + b.lessons.length, 0),
    anchors: Object.keys(CNTracks.data.electivesByAnchor).length,
    stages: CNTracks.data.coreStages.filter(s => s.id !== 'PSY').map(s => s.id),
    psyAnchors: CNTracks.data.coreStages.find(s => s.id === 'PSY').anchors,
    total: LESSONS.length
  }));
  ok(data.coreCount === 79, 'coreCount=79');
  ok(data.blockLessons === 134, 'факультативных уроков 134');
  ok(data.blocks === 41, 'блоков 41');
  ok(data.anchors === 29, 'якорей предложения 29');
  ok(JSON.stringify(data.stages) === JSON.stringify(['A','B','C','D','E','F']), 'стадии A–F');
  ok(data.psyAnchors.ps_l1 === 'p4_l5' && data.psyAnchors.ps_l55 === 'p5_l6', 'якоря псих-минимума');

  console.log('--- A2. Хаб: секция «Маршрут»');
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(400);
  const route = await page.evaluate(() => {
    const root = document.querySelector('.learn-home-root');
    if (!root) return null;
    const r = root.querySelector('.trk-route');
    if (!r) return { exists: false };
    return {
      exists: true,
      isFirst: !!root.querySelector('.lp3-col') && root.querySelector('.lp3-col').firstElementChild === r.parentElement ? root.querySelector('.lp3-col').children[0].classList.contains('trk-route') : false,
      profileBtns: r.querySelectorAll('[data-trk-act="profile"]').length,
      stages: r.querySelectorAll('.trk-stage').length,
      pctText: (r.querySelector('.trk-pct') || {}).textContent || '',
      gateBtns: r.querySelectorAll('[data-trk-act="gate"]').length,
      note: (r.querySelector('.trk-note') || {}).textContent || ''
    };
  });
  ok(route && route.exists, 'секция «Маршрут» отрендерена');
  ok(route && route.stages === 6, '6 карточек стадий');
  ok(route && route.profileBtns === 2, 'две кнопки профиля');
  ok(route && /0%/.test(route.pctText) && /0\/79/.test(route.pctText) && /0\/5/.test(route.pctText), 'счётчики 0%, 0/79, 0/5');
  ok(route && route.gateBtns === 5, '5 гейт-кнопок «Сдать» (E — проект, без кнопки)');
  ok(route && route.note.length > 10, 'подпись про факультативы');
  const routeFirst = await page.evaluate(() => {
    const col = document.querySelector('.learn-home-root .lp3-col');
    return col.firstElementChild.classList.contains('trk-route');
  });
  ok(routeFirst, '«Маршрут» — первая секция колонки');

  console.log('--- A3. Хаб: «Библиотека роста»');
  const lib = await page.evaluate(() => {
    const root = document.querySelector('.learn-home-root');
    const l = root.querySelector('.trk-lib');
    if (!l) return null;
    const blocks = l.querySelectorAll('.trk-block');
    let sum = 0, done0 = 0;
    blocks.forEach(b => { const m = (b.querySelector('.trk-block-h .m') || {}).textContent || ''; const mm = m.match(/(\d+)\/(\d+)/); if (mm) { sum += +mm[2]; if (+mm[1] === 0) done0++; } });
    const pr = {};
    l.querySelectorAll('.trk-block-h .pr').forEach(e => { pr[e.textContent] = (pr[e.textContent] || 0) + 1; });
    return { exists: true, blocks: blocks.length, sum, pr, last: root.querySelector('.lp3-col').lastElementChild.classList.contains('trk-lib') };
  });
  ok(lib && lib.exists, 'секция «Библиотека роста» отрендерена');
  ok(lib && lib.blocks === 41, '41 блок в библиотеке');
  ok(lib && lib.sum === 134, 'сумма уроков блоков 134');
  ok(lib && lib.pr['🔥'] === 15 && lib.pr['⭐'] === 20 && lib.pr['💤'] === 6, 'приоритеты 🔥15/⭐20/💤6');
  ok(lib && lib.last, '«Библиотека» — последняя секция колонки');

  console.log('--- A4. Библиотека: клик по блоку открывает первый урок в плеере');
  await page.evaluate(() => {
    const l = document.querySelector('.learn-home-root .trk-lib');
    const btns = l.querySelectorAll('.trk-block-h');
    // MF-C2 → первый урок m_kelly_criterion
    for (const b of btns) { if (b.textContent.includes('Критерий Келли')) { b.click(); return; } }
  });
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => ({
    active: window.LearnPlayer && LearnPlayer._isActive(),
    lessonId: (JSON.parse(localStorage.getItem('cn_learn_pos') || '{}') || {}).lessonId || null,
    hubClosed: !document.querySelector('.learn-home-root')
  }));
  ok(opened.active && opened.lessonId === 'm_kelly_criterion', 'клик по блоку MF-C2 открыл m_kelly_criterion');
  ok(opened.hubClosed, 'хаб закрыт при открытии урока');

  console.log('--- A5. «Продолжить» по треку (без черновиков → p0_l1)');
  await page.evaluate(() => LearnPlayer.close());
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    try { LearnPlayer.closeHome(); } catch (e) {}
    localStorage.removeItem('cn_learn_pos');
    localStorage.removeItem('cn_learn_test');
    LearnPlayer.openHome();
  });
  await page.waitForTimeout(300);
  const cont = await page.evaluate(() => {
    // текст главной CTA продолжения (без черновиков) — из lp3ContinueHtml: data-lp3-open
    const big = document.querySelector('.learn-home-root .lp3-card.main[data-lp3-open]');
    return big ? big.getAttribute('data-lp3-open') : null;
  });
  ok(cont === 'p0_l1', 'CTA «Продолжить» ведёт по треку → p0_l1 (глобальный порядок совпадает в начале)');
  // Ручная сверка «первого непройденного» после сдвига прогресса: без черновиков, пройдём p0_l1..p0_l2
  await page.evaluate(() => { LearnPlayer.close(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    localStorage.removeItem('cn_learn_pos');
    localStorage.removeItem('cn_learn_test');
    ['p0_l1','p0_l2'].forEach(id => { lessonsDone[id] = 1; });
    try { localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone)); } catch(e) {}
  });
  await page.reload();
  await page.waitForTimeout(3000);
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(300);
  const nextTrk = await page.evaluate(() => {
    const big = document.querySelector('.learn-home-root .lp3-card.main[data-lp3-open]');
    return big ? big.getAttribute('data-lp3-open') : null;
  });
  ok(nextTrk === 'p0_l3', 'после p0_l1..p0_l2 «Продолжить» = p0_l3 (по треку)');
  await page.evaluate(() => LearnPlayer.close());
  // сдвиг сильнее: пройдём ядро 0.1–0.13 и электив p0_l17 → трек ведёт на p0_l14, а не на 0.17-соседа/0.18
  await page.evaluate(() => {
    localStorage.removeItem('cn_learn_pos');
    localStorage.removeItem('cn_learn_test');
    ['p0_l1','p0_l2','p0_l3','p0_l4','p0_l5','p0_l6','p0_l7','p0_l8','p0_l9','p0_l10','p0_l11','p0_l12','p0_l13','p0_l17'].forEach(id => { lessonsDone[id] = 1; });
    try { localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone)); } catch(e) {}
  });
  await page.reload();
  await page.waitForTimeout(3000);
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(300);
  const nextTrk2 = await page.evaluate(() => {
    const big = document.querySelector('.learn-home-root .lp3-card.main[data-lp3-open]');
    return big ? big.getAttribute('data-lp3-open') : null;
  });
  ok(nextTrk2 === 'p0_l14', 'пройдено ядро 0.1–0.13 + электив 0.17: трек ведёт на p0_l14 (НЕ на p0_l18 по глобальному порядку)');

  console.log('--- A6. Программа «По треку»: дерево стадий + вплетённые псих-уроки');
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(300);
  const prog = await page.evaluate(() => {
    const root = document.querySelector('.learn-home-root');
    const sec = root.querySelector('#lp3_program_sec');
    const phs = [...sec.querySelectorAll('.lp3-ph > .lp3-ph-h .t')].map(e => e.textContent);
    const woven = [...sec.querySelectorAll('.lp3-les.trk-woven .t')].map(e => e.textContent);
    const toggle = sec.querySelector('.trk-view-toggle');
    const kelly = !!sec.querySelector('[data-lp3-open="m_kelly_criterion"]');
    const psyInStages = woven.some(t => t.includes('Сломался') ) && woven.length === 8;
    return { phs, woven: woven.length, toggle: !!toggle, kelly, psyInStages, anyMath: !!sec.querySelector('[data-lp3-open^="m_"]') };
  });
  ok(prog.phs.length === 6 && prog.phs[0].startsWith('A ·') && prog.phs[5].startsWith('F ·'), 'дерево стадий A–F');
  ok(prog.woven === 8, 'все 8 вплетённых псих-уроков в дереве');
  ok(prog.psyInStages, 'П1 «Сломался или просто страшно?» присутствует как вплетённый');
  ok(prog.toggle, 'переключатель «По треку / По фазам»');
  ok(!prog.anyMath, 'матфак в программе трека отсутствует (он в Библиотеке роста)');

  console.log('--- A7. Переключение вида: По фазам ↔ По треку, переживает reload');
  await page.evaluate(() => { document.querySelector('#lp3_program_sec [data-trk-act="view"][data-trk-v="phases"]').click(); });
  await page.waitForTimeout(400);
  const phasesView = await page.evaluate(() => {
    const sec = document.querySelector('#lp3_program_sec');
    const t = (sec.querySelector('.lp3-ph-h .t') || {}).textContent || '';
    return { isPhase: /Фаза 0|Фаза 9|Матмышление|Академия/.test(t), toggleBack: !!sec.querySelector('[data-trk-act="view"][data-trk-v="track"]'), lsView: localStorage.getItem('cn_track_view') };
  });
  ok(phasesView.isPhase, 'вид «По фазам» — исходный рендер');
  ok(phasesView.toggleBack, 'в виде «По фазам» есть кнопка возврата «По треку»');
  ok(phasesView.lsView === '"phases"', 'выбор вида записан в LS cn_track_view');
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(() => LearnPlayer.openHome()); await page.waitForTimeout(300);
  const stillPhases = await page.evaluate(() => {
    const sec = document.querySelector('#lp3_program_sec');
    const t = (sec.querySelector('.lp3-ph-h .t') || {}).textContent || '';
    return /Фаза 0|Фаза 9|Матмышление|Академия/.test(t);
  });
  ok(stillPhases, 'выбор вида пережил перезагрузку');
  await page.evaluate(() => { document.querySelector('#lp3_program_sec [data-trk-act="view"][data-trk-v="track"]').click(); });
  await page.waitForTimeout(300);
  const backTrack = await page.evaluate(() => {
    const t = (document.querySelector('#lp3_program_sec .lp3-ph-h .t') || {}).textContent || '';
    return t.startsWith('A ·');
  });
  ok(backTrack, 'возврат к «По треку»');

  console.log('--- A8. Гейт-кнопка «Сдать» из Маршрута открывает тестовый режим плеера');
  await page.evaluate(() => { LearnPlayer.close(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.trk-route [data-trk-act="gate"][data-trk-g="p0"]').click(); });
  await page.waitForTimeout(700);
  const gateTest = await page.evaluate(() => ({
    active: window.LearnPlayer && LearnPlayer._isActive(),
    testMode: document.querySelectorAll('[data-lp2-q]').length > 0,
    title: (document.querySelector('.learn-progress-title') || {}).textContent || '',
    hubClosed: !document.querySelector('.learn-home-root')
  }));
  ok(gateTest.testMode && /Тест Фазы 0/.test(gateTest.title), 'гейт p0 открыл тестовый режим плеера');
  ok(gateTest.hubClosed, 'хаб закрыт перед тестом');

  console.log('--- A9. 360px: маршрут и библиотека без горизонтального переполнения');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} LearnPlayer.openHome(); });
  await page.waitForTimeout(400);
  const mob = await page.evaluate(() => {
    const root = document.querySelector('.learn-home-root');
    const col = root.querySelector('.lp3-col');
    return { overflowX: col.scrollWidth - col.clientWidth, route: !!root.querySelector('.trk-route'), lib: !!root.querySelector('.trk-lib') };
  });
  ok(mob.overflowX <= 1, 'нет горизонтального скролла на 360px (' + mob.overflowX + 'px)');
  ok(mob.route && mob.lib, 'секции на месте на 360px');
  await page.screenshot({ path: '/home/z/my-project/download/скриншоты_этап8/shot8_home_360.png' });

  ok(errors.length === 0, 'консоль чистая за всю сессию A');
  if (errors.length) console.log(errors);
  console.log(`\nИТОГО A: OK=${okN} FAIL=${failN}`);
  await browser.close();
  process.exit(failN ? 1 : 0);
})();
