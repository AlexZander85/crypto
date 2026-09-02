// ===== Этап 8, пост-аудит v13.0: приёмка фиксов F1–F4 (аудит_приёмки_v13.0.md) =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v13.0.html';
const R = []; const ok = (c, n, note) => { const line = (c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 300) : ''); R.push(line); console.log(line); };

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
    };
  });
  await defineHelpers();

  // ================= F1 =================
  console.log('=== F1. Стык фаз: межфазный глобальный CTA скрыт на финале p0_l20 ===');
  await page.evaluate(() => {
    const done = {};
    window.CNTracks.data.coreStages[0].lessons.forEach(id => done[id] = 1); // стадия A целиком
    localStorage.setItem('cn_lessons', JSON.stringify(done));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __openFinish('p0_l20'); });
  const f1 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.learn-root button.lp-btn')];
    const glob = btns.filter(b => b.textContent.indexOf('▸ Следующий урок:') === 0 || b.textContent.indexOf('▸ Следующий непройденный урок курса:') === 0);
    const f = document.getElementById('trk_finish');
    return {
      globalTexts: glob.map(b => b.textContent.slice(0, 45)),
      hiddenAll: glob.length > 0 && glob.every(b => b.style.display === 'none'),
      visibleGlobal: glob.filter(b => b.style.display !== 'none').length,
      trkNext: f && f.querySelector('.trk-next') ? f.querySelector('.trk-next').textContent.slice(0, 70) : null,
      gateCard: f && f.querySelector('.trk-card.gate') ? f.querySelector('.trk-card.gate').textContent.replace(/\s+/g, ' ').slice(0, 90) : null,
      chip: (document.getElementById('trk_chip') || {}).textContent || null
    };
  });
  ok(f1.globalTexts.some(t => /непройденный/.test(t)), 'F1-0: межфазный вариант CTA («…непройденный урок курса») присутствует в DOM — сценарий воспроизведён', JSON.stringify(f1.globalTexts));
  ok(f1.visibleGlobal === 0, 'F1-1: на финале p0_l20 НЕТ видимого глобального CTA (обе разновидности скрыты)', 'visible=' + f1.visibleGlobal + ' hiddenAll=' + f1.hiddenAll);
  ok(f1.trkNext && /Следующий по треку/.test(f1.trkNext), 'F1-2: CTA «Следующий по треку» на месте (единственный видимый CTA)', f1.trkNext);
  ok(f1.gateCard && /Осталось сдать тест стадии/.test(f1.gateCard), 'F1-3: гейт-карточка стадии A на месте (сценарий аудита воспроизведён)', f1.gateCard);

  // ================= F2 =================
  console.log('=== F2. Чип: гейт-CTA → тест in-place — чип снят; возврат к уроку — чип вернулся ===');
  await page.evaluate(() => {
    const f = document.getElementById('trk_finish');
    [...f.querySelectorAll('button')].find(b => /Сдать тест/.test(b.textContent)).click();
  });
  await page.waitForTimeout(800);
  const f2a = await page.evaluate(() => ({
    inTest: document.querySelectorAll('[data-lp2-q]').length > 0,
    chipText: (document.getElementById('trk_chip') || {}).textContent || null
  }));
  ok(f2a.inTest, 'F2-1: гейт-CTA открыл тестовый режим в окне плеера (порции Э2)');
  ok(!f2a.chipText, 'F2-2: чип стадии СНЯТ на экране теста (in-place переход урок→тест)', String(f2a.chipText));
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(250); LearnPlayer.open('p1_l1'); await __sleep(500); });
  const f2b = await page.evaluate(() => ({ chip: (document.getElementById('trk_chip') || {}).textContent || null }));
  ok(!!f2b.chip && /🚀/.test(f2b.chip), 'F2-3: чип вернулся при выходе из теста в урок стадии B', f2b.chip);

  // ================= F3 =================
  console.log('=== F3. offer_shown: ровно один раз на первый показ; ререндеры не дублируют ===');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __openFinish('p0_l3'); }); // якорь 0.3 → BN-7
  const ev1 = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'offer_shown'));
  ok(ev1.length === 1 && ev1[0].d && ev1[0].d.block === 'BN-7', 'F3-1: первый показ — ровно один offer_shown{BN-7}', JSON.stringify(ev1));
  const f3hide = await page.evaluate(() => {
    const glob = [...document.querySelectorAll('.learn-root button.lp-btn')].filter(b => b.textContent.indexOf('▸ Следующий урок:') === 0);
    return glob.length === 0 || glob.every(b => b.style.display === 'none');
  });
  ok(f3hide, 'F3-1б: внутрифазный вариант CTA («Следующий урок:») по-прежнему скрыт (регресс F1 исключён)');
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(250); await __openFinish('p0_l3'); });
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(250); await __openFinish('p0_l10'); await __sleep(250); LearnPlayer.close(); await __sleep(250); await __openFinish('p0_l3'); });
  const ev2 = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'offer_shown'));
  ok(ev2.length === 2 && ev2.filter(e => e.d.block === 'BN-7').length === 1, 'F3-2: три ререндера двух якорей — offer_shown без дублей (BN-7 ×1, BN-3 ×1)', JSON.stringify(ev2.map(e => e.d.block)));
  const f3ui = await page.evaluate(() => ({
    row7: !!document.getElementById('trk_offr_BN-7'),
    state7: (JSON.parse(localStorage.getItem('cn_track_offers') || '{}')['BN-7']) || null
  }));
  ok(f3ui.row7 && f3ui.state7 === 'shown', 'F3-3: UI предложения не сломан (строка на месте), состояние shown персистентно', JSON.stringify(f3ui));

  // ================= F4 =================
  console.log('=== F4. sprint_completed при закрытии спринта сдачей гейта Ф5 (последнее действие — тест) ===');
  await page.evaluate(() => {
    localStorage.clear(); localStorage.setItem('cn_tour_done', '1');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers(); // первая загрузка: migrate сработал (0 done → sprint), migrated=1
  await page.evaluate(() => {
    const done = {};
    window.CNTracks.data.coreStages.forEach(s => (s.lessons || []).forEach(id => done[id] = 1)); // 79 core, включая ft20
    localStorage.setItem('cn_lessons', JSON.stringify(done));
    const pt = {};
    ['p0', 'p1', 'p3', 'p4'].forEach(g => pt[g] = 100); // все гейты, КРОМЕ Ф5
    localStorage.setItem('cn_phase_tests', JSON.stringify(pt));
    localStorage.setItem('cn_track_events', '[]');
    localStorage.setItem('cn_track_profile', 'sprint');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers(); // миграция пропущена (guard), профиль sprint
  const pre = await page.evaluate(() => ({
    profile: window.CNTracks.stats().profile,
    sprintDone: window.CNTracks.stats().sprintDone,
    sprintEv: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'sprint_completed').length
  }));
  ok(pre.profile === 'sprint' && pre.sprintDone === false && pre.sprintEv === 0, 'F4-0: подготовка — sprint, 79 уроков + 4 гейта, Ф5 не сдан, вехи нет', JSON.stringify(pre));
  await page.evaluate(async () => { window.CNTracks.gate('p5'); await __sleep(800); });
  const inTest5 = await page.evaluate(() => document.querySelectorAll('[data-lp2-q]').length > 0);
  ok(inTest5, 'F4-1: CNTracks.gate(p5) открыл тест Ф5');
  const passed = await page.evaluate(async () => {
    const view = (window._ptView || {})[5] || []; // Ф5 → числовой ключ r.ph=5 (61273)
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
    if (sb) { sb.click(); await __sleep(600); }
    return (phaseTestsDone['p5'] || 0);
  });
  ok(passed >= 80, 'F4-2: Тест Ф5 сдан штатным контуром Этапа 2: best=' + passed + '%');
  const f4 = await page.evaluate(() => {
    const ev = JSON.parse(localStorage.getItem('cn_track_events') || '[]');
    return {
      sprint: ev.filter(e => e.ev === 'sprint_completed'),
      stageF: ev.filter(e => e.ev === 'stage_completed' && e.d.stage === 'F'),
      stats: window.CNTracks.stats()
    };
  });
  ok(f4.stageF.length === 1, 'F4-3: stage_completed{F} записан по факту сдачи', JSON.stringify(f4.stageF));
  ok(f4.sprint.length === 1, 'F4-4: sprint_completed записан СРАЗУ после сдачи гейта, ровно один (фикс F4)', JSON.stringify(f4.sprint));
  ok(f4.sprint.length === 1 && f4.sprint[0].d && f4.sprint[0].d.pct === 85, 'F4-5: pct вехи корректен (79/79×0,6 + 0 терминов×0,15 + 5/5×0,25 = 85%)', String(f4.sprint[0] && f4.sprint[0].d && f4.sprint[0].d.pct));
  ok(f4.stats.sprintDone === true, 'F4-6: stats().sprintDone === true');

  // ================= smoke + консоль =================
  const smoke = await page.evaluate(() => ({
    total: V10.smoke.checks.length,
    fails: V10.smoke.checks.filter(c => !c.ok).map(c => c.name),
    trk: V10.smoke.checks.filter(c => /^trk:/.test(c.name)).map(c => c.name + '=' + c.ok)
  }));
  ok(smoke.total === 70 && smoke.fails.length === 0, 'smoke 70/70 зелёные', JSON.stringify(smoke.fails) + ' total=' + smoke.total);
  ok(errors.length === 0, 'консоль чистая за всю сессию', JSON.stringify(errors.slice(0, 5)));

  const nOk = R.filter(l => l.startsWith('OK')).length, nFail = R.filter(l => l.startsWith('FAIL')).length;
  console.log('\nИТОГ post-аудит F1–F4: ' + nOk + ' OK / ' + nFail + ' FAIL');
  await browser.close();
  process.exit(nFail ? 1 : 0);
})();
