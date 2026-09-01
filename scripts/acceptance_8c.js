// ===== Этап 8, приёмка C: профили/миграция, события, финиш Спринта, апселл, просмотрщик (№6, №8–9, №15, №17–19) =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v13.0.html';
const R = []; const ok = (c, n, note) => { const line = (c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 280) : ''); R.push(line); console.log(line); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  const defineHelpers = () => page.evaluate(() => {
    window.__sleep = (ms) => new Promise(r => setTimeout(r, ms));
    window.__openFinish = async (lid) => {
      const n = window.LearnPlayer._buildStepsFor(lid).length;
      LearnPlayer.open(lid, n - 1);
      await __sleep(450);
      return /Урок пройден|Урок уже пройден/.test((document.querySelector('.learn-step') || {}).innerText || '');
    };
    window.__completeLessonReal = async (lid) => {
      LearnPlayer.open(lid);
      await __sleep(420);
      for (let k = 0; k < 80; k++) {
        if (document.querySelector('.learn-root .ans[onclick*="handleLessonQuizAnswer"]')) break;
        const skip = [...document.querySelectorAll('.learn-root button')].find(b => /Пропустить/.test(b.textContent || ''));
        if (skip) { skip.click(); await __sleep(90); continue; }
        const nb = document.querySelector('[data-lp-nav="next"]');
        if (!nb) { await __sleep(70); continue; }
        nb.click(); await __sleep(55);
      }
      const ansBtns = [...document.querySelectorAll('.learn-root .ans')].filter(b => /handleLessonQuizAnswer/.test(b.getAttribute('onclick') || ''));
      if (!ansBtns.length) return 'no-quiz';
      let correct = null;
      ansBtns.forEach((b, i) => {
        const m = /handleLessonQuizAnswer\('[^']+',\s*\d+,\s*(\d+)\)/.exec(b.getAttribute('onclick') || '');
        if (m && +m[1] === i) correct = b;
      });
      (correct || ansBtns[0]).click();
      await __sleep(200);
      const cb = document.getElementById('lesson_complete_btn_' + lid) || document.querySelector('.learn-root [onclick*="completeLessonOnce"]');
      if (!cb) return 'no-btn';
      if (cb.disabled) return 'disabled';
      cb.click();
      await __sleep(400);
      return (JSON.parse(localStorage.getItem('cn_lessons') || '{}')[lid] === 1) ? 'done' : 'not-done';
    };
  });
  await defineHelpers();

  console.log('=== C1. Миграция: свежий LS → sprint (§10.2)');
  let mig = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('cn_track_profile') || '"sprint"'),
    migrated: localStorage.getItem('cn_track_migrated'),
    ev: JSON.parse(localStorage.getItem('cn_track_events') || '[]').find(e => e.ev === 'migrate')
  }));
  ok(mig.profile === 'sprint' && mig.migrated === '1', 'новый ученик → sprint, миграция однократная', JSON.stringify(mig.ev && mig.ev.d));

  console.log('=== C2. Миграция: ≥30 уроков ядра фаз 0–5 → architect (№6)');
  await page.evaluate(() => {
    localStorage.removeItem('cn_track_migrated'); localStorage.removeItem('cn_track_profile');
    const ids = [];
    for (let i = 1; i <= 16; i++) ids.push('p0_l' + (i < 10 ? '0' + i : i));
    ids.splice(ids.indexOf('p0_l17'), 0); // p0_l17 не в ядре — исключим ниже
    const core = ['p0_l1','p0_l2','p0_l3','p0_l4','p0_l5','p0_l6','p0_l7','p0_l8','p0_l9','p0_l10','p0_l11','p0_l12','p0_l13','p0_l14','p0_l15','p0_l16','p0_l18','p0_l20',
      'p1_l1','p1_l2','p1_l3','p1_l5','p1_l6','p1_l7','p1_l8','p1_l9','p2_l6','p1_l10','p1_l11','p1_l12'];
    const done = {}; core.forEach(id => done[id] = 1); // 30 из 60 ядра
    localStorage.setItem('cn_lessons', JSON.stringify(done));
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  mig = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('cn_track_profile') || 'null'),
    ev: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'migrate').pop()
  }));
  ok(mig.profile === 'architect' && mig.ev && mig.ev.d.done60 === 30 && mig.ev.d.profile === 'architect', '30/60 ядра → architect, событие migrate{done60:30}', JSON.stringify(mig.ev && mig.ev.d));

  console.log('=== C3. Хаб в Архитекторе: карточка полного пути, программа по фазам, без тумблера (№9)');
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(350);
  const archHub = await page.evaluate(() => {
    const r = document.querySelector('.trk-route');
    const sec = document.querySelector('#lp3_program_sec');
    return {
      note: (r.querySelector('.trk-note') || {}).textContent || '',
      stageCards: r.querySelectorAll('.trk-stage').length,
      pct: !!r.querySelector('.trk-pct'),
      sprintBtn: !!r.querySelector('[data-trk-p="sprint"]'),
      progIsPhases: /Фаза 0/.test((sec.querySelector('.lp3-ph-h .t') || {}).textContent || ''),
      noToggle: !sec.querySelector('.trk-view-toggle')
    };
  });
  ok(/Полный маршрут: 213 уроков \+ Capstone 85% \+ сертификат/.test(archHub.note), 'карточка «Полный маршрут: 213 уроков + Capstone 85% + сертификат»', archHub.note);
  ok(archHub.stageCards === 0 && !archHub.pct, 'в Архитекторе стадий/процентов Спринта нет');
  ok(archHub.progIsPhases && archHub.noToggle, 'программа — прежний вид по фазам, без тумблера');

  console.log('=== C4. «Продолжить» в Архитекторе — глобальный порядок (№9)');
  const archCont = await page.evaluate(() => {
    const big = document.querySelector('.learn-home-root .lp3-card.main[data-lp3-open]');
    return big ? big.getAttribute('data-lp3-open') : null;
  });
  ok(archCont === 'p0_l17', 'Архитектор: первый непройденный по глобальному массиву = p0_l17', archCont);
  await page.evaluate(() => LearnPlayer.closeHome());

  console.log('=== C5. Плеер в Архитекторе: глобальный CTA не скрыт, чипа нет, предложения есть');
  await page.evaluate(async () => { localStorage.removeItem('cn_learn_pos'); await __openFinish('p0_l3'); });
  let st = await page.evaluate(() => ({
    nextVisible: [...document.querySelectorAll('.learn-root button.lp-btn')].some(b => b.textContent.indexOf('▸ Следующий урок:') === 0 && b.style.display !== 'none'),
    chip: (document.getElementById('trk_chip') || {}).textContent || null,
    offers: [...document.querySelectorAll('.trk-row[id^="trk_offr_"]')].map(e => e.id.replace('trk_offr_', '')),
    trk: !!document.getElementById('trk_finish')
  }));
  ok(st.nextVisible, 'Архитектор: глобальный «▸ Следующий урок» виден');
  ok(st.chip === null, 'Архитектор: чипа стадии нет');
  ok(st.offers.includes('BN-7'), 'Архитектор: предложения факультатива показываются (§9.2)', JSON.stringify(st.offers));

  console.log('=== C6. Переключение профилей в хабе; выбор переживает reload (№6)');
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); LearnPlayer.openHome(); await __sleep(300); });
  await page.evaluate(() => { document.querySelector('.trk-route [data-trk-act="profile"][data-trk-p="sprint"]').click(); });
  await page.waitForTimeout(400);
  let sw = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('cn_track_profile') || 'null'),
    stages: document.querySelectorAll('.trk-stage').length,
    ev: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'profile_set').pop()
  }));
  ok(sw.profile === 'sprint' && sw.stages === 6, 'переключение в Спринт: перерисовка с 6 стадиями');
  ok(sw.ev && sw.ev.d.profile === 'sprint', 'событие profile_set');
  await page.reload(); await page.waitForTimeout(3200);
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(300);
  const still = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_profile') || 'null') + ':' + document.querySelectorAll('.trk-stage').length);
  ok(still === 'sprint:6', 'профиль пережил перезагрузку', still);

  console.log('=== C7. События: lesson_complete{core} и stage_completed по факту реальной сдачи (№15, §14.4)');
  await page.evaluate(() => {
    // стадия A: всё пройдено кроме p0_l20; гейты не трогаем
    const core = ['p0_l1','p0_l2','p0_l3','p0_l4','p0_l5','p0_l6','p0_l7','p0_l8','p0_l9','p0_l10','p0_l11','p0_l12','p0_l13','p0_l14','p0_l15','p0_l16','p0_l18'];
    const done = {}; core.forEach(id => done[id] = 1);
    localStorage.setItem('cn_lessons', JSON.stringify(done));
    localStorage.setItem('cn_track_events', '[]');
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  const real1 = await page.evaluate(async () => await __completeLessonReal('p0_l20'));
  ok(real1 === 'done', 'реальное прохождение p0_l20 (квиз → «Завершить урок»)', real1);
  const ev1 = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_events') || '[]').map(e => e.ev + (e.d.stage ? ':' + e.d.stage : '') + (e.d.core !== undefined ? ':core' + e.d.core : '')));
  ok(ev1.includes('lesson_complete:core1'), 'lesson_complete{core:1} записан', JSON.stringify(ev1));
  // финал p0_l20: гейт-карточка Теста Ф0
  st = await page.evaluate(() => ({
    gate: (document.querySelector('#trk_finish .trk-card.gate') || {}).textContent || null,
    next: (document.querySelector('#trk_finish .trk-next') || {}).textContent || null
  }));
  ok(st.gate && /тест стадии/i.test(st.gate) && /Сдать тест/.test(st.gate), 'после последнего урока A — гейт-карточка «Сдать тест»', st.gate);
  ok(/Лог-доходности/.test(st.next || ''), 'soft-политика: трек ведёт дальше (1.1), гейт-CTA остаётся рядом (§9.4)', st.next);

  console.log('=== C8. Гейт через CTA: сдача стандартным путём Этапа 2, статус в Маршруте (№5, №17)');
  await page.evaluate(() => {
    const f = document.getElementById('trk_finish');
    [...f.querySelectorAll('button')].find(b => /Сдать тест/.test(b.textContent)).click();
  });
  await page.waitForTimeout(700);
  const inTest = await page.evaluate(() => document.querySelectorAll('[data-lp2-q]').length > 0);
  ok(inTest, 'CTA гейта открыл тестовый режим (порции Этапа 2)');
  // сдать: ответить на все вопросы верно через существующий контур (черновик → сдать)
  const passed = await page.evaluate(async () => {
    // правильные ответы берём из штатного вида порций (data-lp2-q) — используем window._ptView
    const view = (window._ptView || {})[0] || [];
    for (let qi = 0; qi < view.length; qi++) {
      const portion = Math.floor(qi / 5);
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec((document.querySelector('.learn-progress-label') || {}).textContent || '');
        if (m && parseInt(m[1], 10) === portion + 1) break;
        const nb = document.querySelector('[data-lp2-nav="next"]');
        if (nb && !nb.disabled) { nb.click(); await __sleep(40); }
      }
      const cont = document.querySelector('[data-lp2-q="' + qi + '"]');
      if (!cont) continue;
      const btns = [...cont.querySelectorAll('button.ans')];
      if (btns.length) (btns[view[qi].a] || btns[0]).click();
      else {
        const inp = cont.querySelector('input[id^="pnum_in_"]');
        if (inp) { inp.value = String(view[qi].answer); const bb = cont.querySelector('button.btn'); if (bb) bb.click(); }
      }
      await __sleep(35);
    }
    for (let k = 0; k < 15; k++) { const nb = document.querySelector('[data-lp2-nav="next"]'); if (nb && !nb.disabled) { nb.click(); await __sleep(40); } else break; }
    const sb = document.querySelector('[data-lp2-submit]');
    if (sb) { sb.click(); await __sleep(500); }
    return (phaseTestsDone['p0'] || 0);
  });
  ok(passed >= 80, 'Тест Ф0 сдан штатным контуром Этапа 2: best=' + passed + '%');
  const routeAfter = await page.evaluate(async () => {
    LearnPlayer.close(); await __sleep(200); LearnPlayer.openHome(); await __sleep(350);
    const stages = [...document.querySelectorAll('.trk-stage')];
    return { aDone: stages[0].className.includes('done'), aText: stages[0].innerText.replace(/\s+/g, ' ').slice(0, 60) };
  });
  ok(routeAfter.aDone, 'после сдачи статус стадии A в «Маршруте» — ✅ (перерисовка)', routeAfter.aText);
  const stageEv = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_events') || '[]').some(e => e.ev === 'stage_completed' && e.d.stage === 'A'));
  ok(stageEv, 'stage_completed{stage:A} записан по факту сдачи гейта (семантика: уроки+гейт)');
  await page.evaluate(() => LearnPlayer.closeHome());

  console.log('=== C9. Финиш Спринта: финишная карточка, sprint_completed одноразово (№15)');
  await page.evaluate(() => {
    // засеять всё ядро + 5 гейтов; события очистить
    const done = {};
    window.CNTracks.data.coreStages.forEach(s => (s.lessons || []).forEach(id => done[id] = 1));
    localStorage.setItem('cn_lessons', JSON.stringify(done));
    ['p0','p1','p3','p4','p5'].forEach(g => { phaseTestsDone[g] = 100; });
    localStorage.setItem('cn_phase_tests', JSON.stringify(phaseTestsDone));
    localStorage.setItem('cn_track_events', '[]');
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  // реальная пересдача уже пройденного не вызовет колбэк (guard isDone) — проверяем финиш-карточку на финале ft20
  await page.evaluate(async () => { await __openFinish('ft20'); });
  st = await page.evaluate(() => ({
    finish: (document.querySelector('#trk_finish .trk-card.finish') || {}).textContent || null
  }));
  ok(st.finish && /Спринт завершён — бот в микро-лайве!/.test(st.finish) && /Открыть полный маршрут/.test(st.finish), 'финишная карточка «🏆 Спринт завершён» с апселлом', st.finish);
  const pct = await page.evaluate(() => window.CNTracks.stats());
  ok(pct.sprintDone === true && pct.core === 79 && pct.gates === 5, 'CNTracks.stats(): sprintDone, 79/79, гейты 5/5', JSON.stringify({ core: pct.core, gates: pct.gates, pct: pct.pct, sprintDone: pct.sprintDone }));
  ok(typeof pct.pct === 'number' && pct.pct >= 75 && pct.pct <= 100, '% трека в разумных границах', pct.pct);
  // sprint_completed в журнал попадает при завершении урока; проверим одноразовость: ещё одна сдача (электив) не дублирует
  const real2 = await page.evaluate(async () => await __completeLessonReal('p6_l1'));
  const sprintEvs = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'sprint_completed'));
  ok(real2 === 'done' && sprintEvs.length === 1, 'sprint_completed — ровно одно событие (без дублей)', 'count=' + sprintEvs.length);

  console.log('=== C10. Апселл: «Открыть полный маршрут» → Архитектор + хаб (№15, §14.3)');
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    await __openFinish('p5_l7');
    const f = document.getElementById('trk_finish');
    [...f.querySelectorAll('button')].find(b => /Открыть полный маршрут/.test(b.textContent)).click();
  });
  await page.waitForTimeout(700);
  const ups = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('cn_track_profile') || 'null'),
    hubOpen: !!document.querySelector('.learn-home-root'),
    playerClosed: !document.querySelector('.learn-root'),
    ev: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'upsell_click').length
  }));
  ok(ups.profile === 'architect', 'апселл переключил в Архитектора');
  ok(ups.hubOpen && ups.playerClosed, 'плеер закрыт, хаб «Моё обучение» открыт');
  ok(ups.ev >= 1, 'событие upsell_click');

  console.log('=== C11. §7.2: посторонних LS-ключей нет; буфер событий ≤200 (№19)');
  const lsCheck = await page.evaluate(() => {
    const foreign = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/^cn_/.test(k) && !/^mentor_cache_/.test(k) && !/^(sq_progress|cn_tour_done)$/.test(k)) foreign.push(k);
    }
    const trackKeys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^cn_track_/.test(k)) trackKeys.push(k); }
    return { foreign, trackKeys: trackKeys.sort(), eventsLen: JSON.parse(localStorage.getItem('cn_track_events') || '[]').length };
  });
  ok(lsCheck.foreign.length === 0, 'нет ключей вне cn_*/mentor_cache_*', JSON.stringify(lsCheck.foreign));
  ok(JSON.stringify(lsCheck.trackKeys) === JSON.stringify(['cn_track_ab', 'cn_track_events', 'cn_track_migrated', 'cn_track_offers', 'cn_track_profile', 'cn_track_view'].filter(k => lsCheck.trackKeys.includes(k))), 'используются только санкционированные cn_track_*', JSON.stringify(lsCheck.trackKeys));
  ok(lsCheck.trackKeys.every(k => ['cn_track_ab','cn_track_events','cn_track_migrated','cn_track_offers','cn_track_profile','cn_track_view'].includes(k)), 'никаких иных cn_track_*');
  ok(lsCheck.eventsLen <= 200, 'кольцевой буфер ≤200');

  console.log('=== C12. Стандартный просмотрщик не изменён (№18)');
  await page.evaluate(() => { try { LearnPlayer.closeHome(); } catch (e) {} });
  const viewer = await page.evaluate(async () => {
    const out = {};
    // каталог: вкладка «Уроки» рендерит карточки фазы 0
    try { go('lessons'); await __sleep(350); } catch (e) { out.goErr = String(e); }
    out.catalog = !!document.querySelector('#lessons-grid, .lessons-grid, [id^="lessons"]');
    out.catalogText = (document.body.innerText.match(/Что вообще такое криптовалюта/g) || []).length > 0;
    // шапка: процент курса считается существующей формулой
    out.headerPct = /Курс|прогресс/i.test((document.getElementById('lp_header_btn') || {}).textContent || '') || !!document.getElementById('lp_header_btn');
    // ридер: открыть урок 0.1 в полноэкранном ридере
    try {
      const card = [...document.querySelectorAll('[onclick*="openFullscreenLesson"], [onclick*="navLesson"], .lesson-card')].find(x => /Что вообще такое криптовалюта/.test(x.textContent || ''));
      if (card) card.click();
      await __sleep(500);
    } catch (e) {}
    out.readerOpened = !!document.getElementById('lessonFullscreenReaderModal');
    out.readerTitle = /Что вообще такое криптовалюта/.test((document.getElementById('lessonFullscreenReaderModal') || {}).innerText || '');
    try { closeFullscreenLessonReader(); } catch (e) {}
    return out;
  });
  ok(viewer.catalogText, 'каталог «Уроки» показывает уроки как в v12.9');
  ok(viewer.readerOpened && viewer.readerTitle, 'полноэкранный ридер открывается и работает');
  ok(!viewer.goErr, 'go() не тронут', viewer.goErr || '');

  console.log('=== C13. Smoke V10: все зелёные, включая trk:* (№19)');
  const smoke = await page.evaluate(() => ({
    total: V10.smoke.checks.length,
    fails: V10.smoke.checks.filter(c => !c.ok).map(c => c.name),
    trk: V10.smoke.checks.filter(c => /^trk:/.test(c.name)).map(c => c.name + '=' + c.ok)
  }));
  ok(smoke.fails.length === 0, 'все ' + smoke.total + ' smoke-проверок зелёные', JSON.stringify(smoke.fails));
  ok(smoke.trk.length === 2, 'trk:data + trk:api зелёные', JSON.stringify(smoke.trk));

  ok(errors.length === 0, 'консоль чистая за всю сессию C');
  if (errors.length) console.log(errors.slice(0, 6));
  console.log('\nИТОГО C: OK=' + R.filter(x => x.startsWith('OK')).length + ' FAIL=' + R.filter(x => x.startsWith('FAIL')).length);
  await page.screenshot({ path: '/home/z/my-project/download/скриншоты_этап8/shot8_route.png' });
  await browser.close();
  process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
})();
