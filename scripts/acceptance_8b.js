// ===== Этап 8, приёмка B: окно плеера — финал по треку, вплетение, предложения, гейт, чип =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v13.0.html';
const R = []; const ok = (c, n, note) => { const line = (c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 300) : ''); R.push(line); console.log(line); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // Помощники (переопределяются после каждого reload)
  const defineHelpers = () => page.evaluate(() => {
    window.__sleep = (ms) => new Promise(r => setTimeout(r, ms));
    window.__toFinish = async (lid) => {
      // открыть урок сразу на финальном шаге (явный stepIdx минует гейты навигации)
      const n = window.LearnPlayer._buildStepsFor(lid).length;
      LearnPlayer.open(lid, n - 1);
      await __sleep(450);
      return /Урок пройден|Урок уже пройден/.test((document.querySelector('.learn-step') || {}).innerText || '');
    };
    window.__finishState = () => {
      const step = document.querySelector('.learn-root .learn-step');
      const f = document.getElementById('trk_finish');
      const nextBtns = [...document.querySelectorAll('.learn-root button.lp-btn')].filter(b => b.textContent.indexOf('▸ Следующий урок:') === 0);
      return {
        isFinish: !!step && /Урок пройден|Урок уже пройден/.test(step.innerText),
        hasTrk: !!f,
        trkText: f ? f.innerText.replace(/\s+/g, ' ').slice(0, 500) : '',
        nextHidden: nextBtns.length ? nextBtns[0].style.display === 'none' : null,
        nextVisible: nextBtns.length ? nextBtns[0].style.display !== 'none' : null,
        nextByTrack: f ? (f.querySelector('.trk-next') || {}).textContent || null : null,
        offers: f ? [...f.querySelectorAll('.trk-card.offers .trk-row .pr')].map(e => e.textContent) : [],
        offerIds: f ? [...f.querySelectorAll('.trk-row[id^="trk_offr_"]')].map(e => e.id.replace('trk_offr_', '')) : [],
        wovenRows: f ? [...(f.querySelector('.trk-card.woven') || { querySelectorAll: () => [] }).querySelectorAll('.trk-row .t')].map(e => e.textContent) : [],
        gateCard: f ? (f.querySelector('.trk-card.gate') || {}).textContent || null : null,
        okCard: f ? (f.querySelector('.trk-card.ok') || {}).textContent || null : null,
        finishCard: f ? !!f.querySelector('.trk-card.finish') : false,
        chip: (document.getElementById('trk_chip') || {}).textContent || null
      };
    };
    window.__completeLessonReal = async (lid) => {
      // реальное прохождение: открыть → до квиза → верный ответ → «Завершить урок»
      LearnPlayer.open(lid);
      await __sleep(420);
      for (let k = 0; k < 60; k++) {
        if (document.querySelector('.learn-root .ans')) break;
        const nb = document.querySelector('[data-lp-nav="next"]');
        if (!nb) break;
        nb.click(); await __sleep(55);
      }
      const ansBtns = [...document.querySelectorAll('.learn-root .ans')];
      if (!ansBtns.length) return 'no-quiz';
      let correct = null;
      ansBtns.forEach((b, i) => {
        const m = /handleLessonQuizAnswer\('[^']+',\s*\d+,\s*(\d+)\)/.exec(b.getAttribute('onclick') || '');
        if (m && +m[1] === i) correct = b;
      });
      (correct || ansBtns[0]).click();
      await __sleep(160);
      const cb = document.getElementById('lesson_complete_btn_' + lid) || document.querySelector('.learn-root [onclick*="completeLessonOnce"]');
      if (!cb) return 'no-btn';
      cb.click();
      await __sleep(350);
      return isDone(lid) ? 'done' : 'not-done';
    };
  });
  await defineHelpers();

  console.log('=== B1. Финал core-урока в Спринте: CTA по треку, глобальный скрыт (№10)');
  await page.evaluate(() => {
    ['p0_l1','p0_l2','p0_l3'].forEach(id => { lessonsDone[id] = 1; });
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  let st = await page.evaluate(async () => { await __toFinish('p0_l3'); return __finishState(); });
  ok(st.isFinish && st.hasTrk, 'финал p0_l3: блок трека вставлен');
  ok(st.nextHidden === true, 'глобальный CTA «▸ Следующий урок» скрыт (DOM-level)');
  ok(/Следующий по треку:[^]*Как формируется цена/.test(st.nextByTrack || ''), '«Следующий по треку» = 0.4 (p0_l4)', st.nextByTrack);
  ok(st.offerIds.includes('BN-7'), 'предложение BN-7 (якорь 0.3) показано', JSON.stringify(st.offerIds));

  console.log('=== B2. Чип стадии (№14)');
  st = await page.evaluate(() => __finishState());
  ok(/🚀 A · \d+\/18/.test(st.chip || ''), 'чип «🚀 A · x/18» на core-уроке', st.chip);
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); LearnPlayer.open('m_kelly_criterion'); await __sleep(500); });
  st = await page.evaluate(() => __finishState());
  ok(st.chip === '🟠 факультатив', 'чип «🟠 факультатив» на элект-уроке', st.chip);
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); LearnPlayer.openTest('p1'); await __sleep(500); });
  st = await page.evaluate(() => ({ chip: (document.getElementById('trk_chip') || {}).textContent || null, testMode: document.querySelectorAll('[data-lp2-q]').length > 0 }));
  ok(st.testMode && st.chip === null, 'в тестовом режиме чипа нет', JSON.stringify(st));
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); });

  console.log('=== B3. Предложения: якорь 0.13 → MF-A1 🔥; «Позже» скрывает навсегда (№12)');
  await page.evaluate(async () => { localStorage.removeItem('cn_learn_pos'); await __toFinish('p0_l13'); });
  st = await page.evaluate(() => __finishState());
  ok(st.offerIds.includes('MF-A1') && st.offers.includes('🔥'), 'MF-A1 с приоритетом 🔥 показан на финале 0.13', JSON.stringify(st.offerIds));
  await page.evaluate(() => {
    const row = document.querySelector('#trk_offr_MF-A1');
    [...row.querySelectorAll('button')].find(b => /Позже/.test(b.textContent)).click();
  });
  await page.waitForTimeout(200);
  let offerState = await page.evaluate(() => ({
    ls: JSON.parse(localStorage.getItem('cn_track_offers') || '{}'),
    rowGone: !document.getElementById('trk_offr_MF-A1'),
    shownEvents: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'offer_shown').length,
    dismissedEvents: JSON.parse(localStorage.getItem('cn_track_events') || '[]').filter(e => e.ev === 'offer_dismissed').map(e => e.d.block)
  }));
  ok(offerState.ls['MF-A1'] === 'dismissed', '«Позже» записан в cn_track_offers как dismissed');
  ok(offerState.rowGone, 'карточка исчезла сразу');
  ok(offerState.dismissedEvents.includes('MF-A1') && offerState.shownEvents >= 1, 'события offer_shown/offer_dismissed');
  // повторный финал 0.13 (урок ещё не пройден — доходим снова): предложение не возвращается
  await page.evaluate(async () => { localStorage.removeItem('cn_learn_pos'); await __toFinish('p0_l13'); });
  st = await page.evaluate(() => __finishState());
  ok(!st.offerIds.includes('MF-A1'), 'после «Позже» предложение не возвращается на финале');
  // но в Библиотеке блок остаётся
  const libHas = await page.evaluate(() => {
    LearnPlayer.close(); LearnPlayer.openHome();
    return !!document.querySelector('.trk-lib .trk-block-h') && [...document.querySelectorAll('.trk-lib .trk-block-h')].some(b => b.textContent.includes('Вероятностная интуиция'));
  });
  ok(libHas, 'MF-A1 остаётся в «Библиотеке роста»');
  await page.evaluate(() => { LearnPlayer.closeHome(); });

  console.log('=== B4. «Открыть» предложения → первый урок блока + offer_accepted (№12)');
  await page.evaluate(async () => {
    localStorage.removeItem('cn_track_offers');
    localStorage.removeItem('cn_learn_pos');
    await __toFinish('p0_l13');
    const row = document.getElementById('trk_offr_MF-A1');
    [...row.querySelectorAll('button')].find(b => /Открыть/.test(b.textContent)).click();
  });
  await page.waitForTimeout(600);
  let acc = await page.evaluate(() => ({
    lessonId: (JSON.parse(localStorage.getItem('cn_learn_pos') || '{}') || {}).lessonId,
    accepted: JSON.parse(localStorage.getItem('cn_track_offers') || '{}')['MF-A1'],
    ev: JSON.parse(localStorage.getItem('cn_track_events') || '[]').some(e => e.ev === 'offer_accepted' && e.d.block === 'MF-A1')
  }));
  ok(acc.lessonId === 'm_chto_voobsche_takoe_veroyatnost', '«Открыть» начал первый урок блока MF-A1', acc.lessonId);
  ok(acc.accepted === 'accepted' && acc.ev, 'offer_accepted записан');
  await page.evaluate(() => { localStorage.removeItem('cn_track_offers'); LearnPlayer.close(); });

  console.log('=== B5. Вплетённые псих-уроки: финал 4.5 → П1/П2 «Обязательно» + очередь (№11)');
  await page.evaluate(() => {
    ['p0_l1','p0_l2','p0_l3','p0_l4','p0_l5','p0_l6','p0_l7','p0_l8','p0_l9','p0_l10','p0_l11','p0_l12','p0_l13','p0_l14','p0_l15','p0_l16','p0_l18','p0_l20',
     'p1_l1','p1_l2','p1_l3','p1_l5','p1_l6','p1_l7','p1_l8','p1_l9','p2_l6','p1_l10','p1_l11','p1_l12',
     'p3_l1','p3_l2','p3_l3','p3_l4','p3_l5','p3_l6',
     'p4_l1','p4_l2','p4_l3','p4_l4','p4_l5'].forEach(id => { lessonsDone[id] = 1; });
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __toFinish('p4_l5'); });
  st = await page.evaluate(() => __finishState());
  ok(st.wovenRows.length === 2 && /П1|Сломался/.test(st.wovenRows.join('|')) && /П2|Доверяй машине/.test(st.wovenRows.join('|')), 'финал 4.5: карточки П1 и П2 в «Обязательно перед следующим этапом»', JSON.stringify(st.wovenRows));
  ok(/Обязательный псих-урок:[^]*Сломался/.test(st.nextByTrack || ''), 'очередь трека: сразу после якоря 4.5 — 🛡️ П1 (интерливинг §3)', st.nextByTrack);

  console.log('=== B6. Очередь: П1 пройден → П2; оба пройдены → 4.6; якорь 5.1 → П20 (№11)');
  await page.evaluate(() => {
    lessonsDone['ps_l1'] = 1;
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __toFinish('p4_l5'); });
  st = await page.evaluate(() => __finishState());
  ok(st.wovenRows.length === 1 && /П2|Доверяй машине/.test(st.wovenRows.join('|')), 'после П1 осталась только П2', JSON.stringify(st.wovenRows));
  ok(/Обязательный псих-урок:[^]*Доверяй машине/.test(st.nextByTrack || ''), 'очередь: следующий — 🛡️ П2', st.nextByTrack);
  await page.evaluate(() => {
    lessonsDone['ps_l2'] = 1;
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __toFinish('p4_l5'); });
  st = await page.evaluate(() => __finishState());
  ok(st.wovenRows.length === 0, 'псих-минимум 4.5 закрыт — карточка исчезла');
  ok(/Следующий по треку:[^]*Российская специфика/.test(st.nextByTrack || ''), 'очередь пуста → следующий по треку 4.6', st.nextByTrack);
  await page.evaluate(() => {
    lessonsDone['p4_l6'] = 1; lessonsDone['p4_l7'] = 1; lessonsDone['p4_l8'] = 1;
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __toFinish('p5_l1'); });
  st = await page.evaluate(() => __finishState());
  ok(st.wovenRows.length === 1 && /П20|Дугласа/.test(st.wovenRows.join('|')), 'финал 5.1: П20 в «Обязательно»', JSON.stringify(st.wovenRows));

  console.log('=== B7. Стык D→E и гейт стадии с пропущенным псих-минимумом (№10, №13)');
  await page.evaluate(async () => { localStorage.removeItem('cn_learn_pos'); await __toFinish('p4_l8'); });
  st = await page.evaluate(() => __finishState());
  ok(/Следующий по треку:[^]*Что такое Freqtrade/.test(st.nextByTrack || ''), 'последний урок D → следующий по треку FT-01 (стык D→E)', st.nextByTrack);
  ok(!!st.gateCard && /тест Фазы 4/i.test(st.gateCard) && /Сдать тест/.test(st.gateCard), 'гейт-карточка «Осталось сдать тест стадии» (титул из bankMeta)', st.gateCard);

  console.log('=== B8. Гейт-CTA открывает тест стадии; после сдачи — «✅ Стадия сдана» (№13, №17)');
  await page.evaluate(() => {
    const f = document.getElementById('trk_finish');
    [...f.querySelectorAll('.trk-card.gate button')].find(b => /Сдать тест/.test(b.textContent)).click();
  });
  await page.waitForTimeout(700);
  let gate = await page.evaluate(() => ({ testMode: document.querySelectorAll('[data-lp2-q]').length > 0, title: (document.querySelector('.learn-progress-title') || {}).textContent || '' }));
  ok(gate.testMode && /фазы 4/i.test(gate.title), '«Сдать тест» открыл тест Ф4 в тестовом режиме плеера', JSON.stringify(gate));
  // сдача через LS-состояние (порог 80): phaseTestsDone — штатный ключ, запись идёт стандартным путём при сдаче;
  // для проверки карточки «✅» имитируем уже сданный тест и перезаходим на финал
  await page.evaluate(async () => {
    LearnPlayer.close(); await __sleep(200);
    phaseTestsDone['p4'] = 100;
    localStorage.setItem('cn_phase_tests', JSON.stringify(phaseTestsDone));
    localStorage.removeItem('cn_learn_pos');
    await __toFinish('p4_l8');
  });
  st = await page.evaluate(() => __finishState());
  ok(!!st.okCard && /Стадия D сдана/.test(st.okCard), 'после сдачи: «✅ Стадия D сдана»', st.okCard);

  console.log('=== B9. Стык E→F: финал ft20 → следующий p5_l1 + предложение FA-1 (№10, №12)');
  await page.evaluate(() => {
    for (let i = 1; i <= 20; i++) lessonsDone['ft' + String(i).padStart(2, '0')] = 1;
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3200); await defineHelpers();
  await page.evaluate(async () => { await __toFinish('ft20'); });
  st = await page.evaluate(() => __finishState());
  ok(/Следующий по треку:[^]*Микро-лайв/.test(st.nextByTrack || ''), 'финал ft20 → следующий по треку 5.1 (стык E→F)', st.nextByTrack);
  ok(st.offerIds.includes('FA-1') && st.offers.includes('⭐'), 'предложение FA-1 (якорь ft20)', JSON.stringify(st.offerIds));

  console.log('=== B10. Бейджи 🟢/🟠/🛡️ в панели «Программа» плеера (№16)');
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); LearnPlayer.open('p0_l10'); await __sleep(500); });
  let panel = await page.evaluate(async () => {
    const tab = [...document.querySelectorAll('.learn-root [data-lp3-tab]')].find(b => b.textContent.includes('Программа'));
    if (tab) tab.click();
    await __sleep(300);
    const badges = [...document.querySelectorAll('.learn-map .lp3-les')].map(b => {
      const bd = b.querySelector('.trk-badge');
      return (b.getAttribute('data-lp3-mopen') || '') + '=' + (bd ? bd.textContent : '-');
    });
    return { total: badges.length, green: badges.filter(x => x.endsWith('🟢')).length, orange: badges.filter(x => x.endsWith('🟠')).length, shield: badges.filter(x => x.includes('🛡')).length, sample: badges.slice(0, 8) };
  });
  ok(panel.total === 20 && panel.green === 18 && panel.orange === 2, 'панель Фазы 0: 18 🟢 + 2 🟠 (0.17, 0.19 — факультатив)', JSON.stringify(panel.sample) + ' g=' + panel.green + ' o=' + panel.orange);
  await page.evaluate(async () => { LearnPlayer.close(); await __sleep(200); LearnPlayer.open('ps_l5'); await __sleep(500); });
  panel = await page.evaluate(async () => {
    const tab = [...document.querySelectorAll('.learn-root [data-lp3-tab]')].find(b => b.textContent.includes('Программа'));
    if (tab) tab.click();
    await __sleep(300);
    const badges = [...document.querySelectorAll('.learn-map .lp3-les')].map(b => {
      const bd = b.querySelector('.trk-badge');
      return (b.getAttribute('data-lp3-mopen') || '') + '=' + (bd ? bd.textContent : '-');
    });
    return { total: badges.length, green: badges.filter(x => x.endsWith('🟢')).length, orange: badges.filter(x => x.endsWith('🟠')).length, shield: badges.filter(x => x.includes('🛡')).length, sample: badges.slice(0, 10) };
  });
  ok(panel.shield >= 8, 'панель психологии: вплетённые П-уроки помечены 🛡️', 'shield=' + panel.shield + ' total=' + panel.total + ' sample=' + JSON.stringify(panel.sample));
  const panelClick = await page.evaluate(async () => {
    const el = [...document.querySelectorAll('.learn-map .lp3-les')].find(b => (b.getAttribute('data-lp3-mopen') || '') === 'ps_l23');
    return el ? { id: el.getAttribute('data-lp3-mopen'), disabled: el.disabled } : 'not-found';
  });
  ok(panelClick && panelClick.id === 'ps_l23', 'элементы панели кликабельны (семантика Этапа 7 сохранена)', JSON.stringify(panelClick));

  ok(errors.length === 0, 'консоль чистая за всю сессию B');
  if (errors.length) console.log(errors.slice(0, 6));
  console.log('\nИТОГО B: OK=' + R.filter(x => x.startsWith('OK')).length + ' FAIL=' + R.filter(x => x.startsWith('FAIL')).length);
  R.forEach(x => console.log(x));
  await page.screenshot({ path: '/home/z/my-project/download/скриншоты_этап8/shot8_finish_track.png' });
  await browser.close();
  process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
})();
