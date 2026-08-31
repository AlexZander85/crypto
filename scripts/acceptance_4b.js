// ===== Этап 4, приёмка B: наставник в потоке шагов (пункт 2) =====
// Сценарий: авто-контекст шага в панели (футер-кнопка и шапка-«💬»), карточка шага,
// подсказка через существующий MENTOR.ask (mockai=1), лимит-счётчик, v10-мост не сломан,
// demo-тире: апселл НАД плеером (CSS-фикс), вызов из приложения без шагового контекста,
// тестовый режим без шаговой карточки, 360px, §7.2, selfTest, консоль.
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

  await page.goto('file://' + path.resolve(HTML) + '?mockai=1');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cn_tour_done', '1');
    localStorage.setItem('cn_tier_override', 'max');
  });
  await page.reload();
  await page.waitForTimeout(3200);
  const lsBefore = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

  // ==== 1) Футер-кнопка на шаге-обложке → панель с шаговым контекстом ====
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  const btn1 = await page.evaluate(() => {
    const b = document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]');
    return { has: !!b, tag: b ? b.tagName : null, label: b ? b.textContent : null };
  });
  ok('1. Футер: кнопка «💬 Наставник» есть на шаге, это <button>', btn1.has && btn1.tag === 'BUTTON', JSON.stringify(btn1));
  await page.evaluate(() => { document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]').click(); });
  await page.waitForTimeout(350);
  const panel1 = await page.evaluate(() => {
    const p = document.getElementById('mentor_panel');
    if (!p) return { open: false };
    const body = document.getElementById('mentor_panel_body');
    const head = body ? body.firstElementChild.textContent : '';
    const card = document.getElementById('lp4_mentor_step');
    return {
      open: true,
      z: getComputedStyle(p).zIndex,
      head,
      card: !!card,
      cardTitle: card ? card.querySelector('b').textContent : null,
      askBtn: card ? !!Array.from(card.querySelectorAll('button')).find(b => /Подсказка по этому шагу/.test(b.textContent)) : false,
      excerpt: card ? /«.+»/.test(card.innerText) : false
    };
  });
  ok('2. Панель открыта над плеером (z≥1000002), заголовок «Шаг 1 из N», карточка шага с кнопкой подсказки и фрагментом материала',
    panel1.open && +panel1.z >= 1000002 && /Урок: p0_l1 · Шаг 1 из \d+:/.test(panel1.head) && panel1.card && panel1.cardTitle && panel1.askBtn && panel1.excerpt,
    JSON.stringify(panel1));

  // ==== 2) Подсказка по шагу → mock-ответ через существующий контур, лимит-счётчик ====
  const ask1 = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#lp4_mentor_step button')).find(b => /Подсказка по этому шагу/.test(b.textContent));
    btn.click();
    await new Promise(r => setTimeout(r, 400));
    const out = document.getElementById('mentor_result');
    return { txt: out ? out.innerText.slice(0, 160) : null, usage: JSON.parse(localStorage.getItem('cn_mentor_usage') || '{}') };
  });
  ok('3. «Подсказка по этому шагу» → ответ наставника в #mentor_result, cn_mentor_usage учтён (существующий контур MENTOR.ask)',
    /Хорошо|вопрос|материал/i.test(ask1.txt || '') && ask1.usage && ask1.usage.n >= 1, JSON.stringify(ask1));
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} });
  await page.waitForTimeout(150);

  // ==== 3) Следующий шаг → шапка-«💬» → авто-контекст шага 2; v10-мост жив ====
  await page.evaluate(() => { document.querySelector('[data-lp-nav="next"]').click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = document.querySelector('[data-lp-act="mentor"]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const panel2 = await page.evaluate(() => {
    const p = document.getElementById('mentor_panel');
    if (!p) return { open: false };
    const head = document.getElementById('mentor_panel_body').firstElementChild.textContent;
    return {
      open: true,
      head,
      card: !!document.getElementById('lp4_mentor_step'),
      bridge: !!document.getElementById('bridge_numbers_btn')
    };
  });
  ok('4. Шапка-«💬» на шаге 2: авто-контекст «Шаг 2 из N» без аргументов; v10-мост «числа рынка» на месте',
    panel2.open && /Шаг 2 из \d+:/.test(panel2.head) && panel2.card && panel2.bridge, JSON.stringify(panel2));
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} });

  // ==== 4) Шаг-квиз: контекст quiz-шага ====
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      if (st && st.querySelector('[id^="lquiz_opts_"]')) return;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) return; nb.click(); await new Promise(r => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => { document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]').click(); });
  await page.waitForTimeout(300);
  const panel3 = await page.evaluate(() => {
    const head = document.getElementById('mentor_panel_body').firstElementChild.textContent;
    return { head, card: !!document.getElementById('lp4_mentor_step') };
  });
  ok('5. На шаге-аттестации наставник видит quiz-шаг (заголовок шага в контексте)',
    /Шаг \d+ из \d+:/.test(panel3.head) && panel3.card, JSON.stringify(panel3));
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} });

  // ==== 5) Demo-тире: апселл НАД плеером ====
  await page.evaluate(() => {
    localStorage.removeItem('cn_tier_override');
    sessionStorage.removeItem('mentor_upsell_closed');
    try { window.mentorClosePanel(); } catch (e) {}
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => { document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]').click(); });
  await page.waitForTimeout(300);
  const ups = await page.evaluate(() => {
    const u = document.getElementById('mentor_upsell_modal');
    const p = document.getElementById('mentor_panel');
    const root = document.querySelector('.learn-root');
    return {
      upsell: !!u, z: u ? getComputedStyle(u).zIndex : null,
      panelOpen: !!p,
      rootZ: root ? getComputedStyle(root).zIndex : null,
      visible: u ? (u.offsetWidth > 0 && getComputedStyle(u).display !== 'none') : false
    };
  });
  ok('6. Demo-тире: апселл наставника видим НАД плеером (z 1000500 > root 1000001), панель не открыта',
    ups.upsell && ups.visible && +ups.z === 1000500 && +ups.rootZ === 1000001 && !ups.panelOpen, JSON.stringify(ups));
  await page.evaluate(() => {
    const u = document.getElementById('mentor_upsell_modal');
    if (u) u.remove();
    sessionStorage.setItem('mentor_upsell_closed', '1');
  });

  // ==== 6) Вызов из приложения при закрытом плеере — без шагового контекста ====
  await page.evaluate(() => {
    localStorage.setItem('cn_tier_override', 'max'); // панель доступна (шаг 6 переключал тир на demo)
    sessionStorage.removeItem('mentor_upsell_closed');
    try { LearnPlayer.close(); } catch (e) {}
  });
  await page.waitForTimeout(300);
  const appCall = await page.evaluate(() => {
    window.mentorOpenPanel('p0_l1');
    const p = document.getElementById('mentor_panel');
    const head = p ? document.getElementById('mentor_panel_body').firstElementChild.textContent : null;
    return { open: !!p, head, card: !!document.getElementById('lp4_mentor_step') };
  });
  ok('7. Вызов приложения (ридер/прочее) при закрытом плеере: панель как раньше, «Урок: …» без шага, карточки нет',
    appCall.open && /^Урок: p0_l1$/.test(appCall.head) && !appCall.card, JSON.stringify(appCall));
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} });

  // ==== 7) Тестовый режим (Этап 2): без шаговой карточки, футер без кнопки ====
  await page.evaluate(() => { localStorage.setItem('cn_tier_override', 'max'); LearnPlayer.openTest('p1'); });
  await page.waitForTimeout(400);
  const testMode = await page.evaluate(() => {
    const foot = document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]');
    const mb = document.querySelector('[data-lp-act="mentor"]');
    if (mb) mb.click();
    const p = document.getElementById('mentor_panel');
    return {
      footBtn: !!foot,
      panelOpen: !!p,
      head: p ? document.getElementById('mentor_panel_body').firstElementChild.textContent : null,
      card: !!document.getElementById('lp4_mentor_step')
    };
  });
  ok('8. Тестовый режим: футер без «💬 Наставник» (свой низ), шапка-«💬» открывает панель урока без шаговой карточки',
    !testMode.footBtn && testMode.panelOpen && !testMode.card, JSON.stringify(testMode));
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(300);

  // ==== 8) 360px: кнопка в футере доступна, горизонтального скролла нет ====
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  const mob = await page.evaluate(() => {
    const b = document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]');
    const c = document.querySelector('.learn-content');
    return {
      btn: !!b && b.offsetParent !== null,
      hscroll: c ? c.scrollWidth > c.clientWidth + 2 : null
    };
  });
  ok('9. 360px: кнопка «💬 Наставник» видима, горизонтального скролла контента нет',
    mob.btn && mob.hscroll === false, JSON.stringify(mob));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);

  // ==== §7.2 / selfTest / консоль ====
  const lsAfter = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const foreignNonCn = Object.keys(lsAfter).filter(k => !(k in lsBefore) && !k.startsWith('cn_') && !k.startsWith('mentor_cache_'));
  const newCn = Object.keys(lsAfter).filter(k => !(k in lsBefore) && k.startsWith('cn_'));
  const newLearn = newCn.filter(k => k.startsWith('cn_learn_'));
  const newApp = newCn.filter(k => !k.startsWith('cn_learn_'));
  const newMentorCache = Object.keys(lsAfter).filter(k => !(k in lsBefore) && k.startsWith('mentor_cache_'));
  const st4 = await page.evaluate(() => { const a = LearnPlayer.selfTest(); return { ok: a.ok, lp4: a.lp4, lp3ok: a.lp3 && a.lp3.ok }; });
  ok('10. §7.2: новых чужих ключей нет (cn_* — плеер/приложение; mentor_cache_* — существующий кэш наставника от MENTOR.ask); selfTest: ok, lp4 зелёная, lp3 не сломана',
    foreignNonCn.length === 0 && st4.ok === true && st4.lp4.ok === true && st4.lp3ok === true,
    'nonCN=[' + foreignNonCn.join(',') + '] mentorCache=[' + newMentorCache.join(',') + '] learnNew=[' + newLearn.join(',') + '] appNew=[' + newApp.join(',') + '] selfTest=' + JSON.stringify(st4));

  const cerrReal = cerr.filter(t => !/ERR_FILE_NOT_FOUND/.test(t));
  ok('11. Консоль: 0 pageerror, 0 console.error (кроме унаследованных ERR_FILE_NOT_FOUND)',
    errors.length === 0 && cerrReal.length === 0,
    'page=[' + errors.slice(0, 3).join(' | ') + '] console=[' + cerrReal.slice(0, 3).join(' | ') + ']');

  // ==== Скриншоты ====
  await page.evaluate(() => { localStorage.setItem('cn_tier_override', 'max'); localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]').click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/home/z/my-project/scripts/shot4_mentor_step.png' });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#lp4_mentor_step button')).find(b => /Подсказка по этому шагу/.test(b.textContent));
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/z/my-project/scripts/shot4_mentor_ask.png' });
  await page.evaluate(() => { try { window.mentorClosePanel(); } catch (e) {} try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    localStorage.removeItem('cn_tier_override');
    sessionStorage.removeItem('mentor_upsell_closed');
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.learn-bottom [data-lp-act="lp4-mentor"]').click(); });
  await page.waitForTimeout(350);
  await page.screenshot({ path: '/home/z/my-project/scripts/shot4_upsell_over_player.png' });

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_4B: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_4B: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
