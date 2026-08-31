// ===== Этап 6, приёмка: практикумы внутри плеера, a11y фокуса, ИИ-Фейнман =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.8.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 380) : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 180)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errs.push('[c] ' + (m.text() || '').slice(0, 180)); });

  await page.goto('file://' + path.resolve(HTML) + '?mockai=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // ==== 1) Практикум открывается ВНУТРИ плеера (p0_l3 → firsttrade) ====
  const s1 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l3');
    await new Promise(r => setTimeout(r, 450));
    let cta = null;
    for (let i = 0; i < 30 && !cta; i++) {
      cta = Array.from(document.querySelectorAll('.learn-content button')).find(b => /_goSim/.test(b.getAttribute('onclick') || ''));
      if (cta) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    if (!cta) return { noCta: true, step: (document.querySelector('.learn-step-title') || {}).textContent };
    cta.click();
    await new Promise(r => setTimeout(r, 450));
    const root = document.querySelector('.learn-root');
    const ov = root.querySelector('.learn-overlay[data-ov="lp6sim"]');
    const box = document.getElementById('sim_firsttrade');
    return {
      overlay: !!ov, ariaModal: ov ? ov.querySelector('.lp6-sim-sheet').getAttribute('aria-modal') : null,
      boxInsideRoot: !!box && !!root.contains(box),
      boxUnique: document.querySelectorAll('#sim_firsttrade').length,
      playerOpen: !!root && !!document.querySelector('.learn-step'),
      focused: (document.activeElement || {}).getAttribute ? document.activeElement.getAttribute('data-lp6-sim-close') !== null : false,
      ctaText: cta.textContent.trim().slice(0, 40)
    };
  });
  ok('1. p0_l3: CTA симулятора открывает практикум оверлеем ВНУТРИ плеера (DOM-move, aria-modal, фокус на ✕)',
    s1.overlay && s1.boxInsideRoot && s1.boxUnique === 1 && s1.playerOpen && s1.ariaModal === 'true' && s1.focused, JSON.stringify(s1));

  // ==== 2) Закрытие практикума: бокс возвращён, плеер жив, фокус в шаге ====
  const s2 = await page.evaluate(async () => {
    const boxBefore = document.getElementById('sim_firsttrade').parentNode.className || 'overlay';
    const cb = document.querySelector('[data-lp6-sim-close]');
    cb.click();
    await new Promise(r => setTimeout(r, 300));
    const box = document.getElementById('sim_firsttrade');
    return {
      overlayGone: !document.querySelector('.learn-overlay[data-ov="lp6sim"]'),
      boxBack: !!box && !document.querySelector('.learn-root').contains(box),
      playerStillOpen: !!document.querySelector('.learn-step'),
      focusedInRoot: document.querySelector('.learn-root').contains(document.activeElement)
    };
  });
  ok('2. ✕ практикума: узел возвращён в подложку, оверлей закрыт, плеер и шаг на месте, фокус в плеере',
    s2.overlayGone && s2.boxBack && s2.playerStillOpen && s2.focusedInRoot, JSON.stringify(s2));

  // ==== 3) Esc закрывает практикум, не плеер (candle, p0_l6) ====
  const s3 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l6');
    await new Promise(r => setTimeout(r, 450));
    let cta = null;
    for (let i = 0; i < 30 && !cta; i++) {
      cta = Array.from(document.querySelectorAll('.learn-content button')).find(b => /_goSim/.test(b.getAttribute('onclick') || ''));
      if (cta) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    if (!cta) return { noCta: true };
    cta.click();
    await new Promise(r => setTimeout(r, 400));
    const candleRendered = document.querySelectorAll('#sim_candle input, #sim_candle button').length > 0;
    document.querySelector('[data-lp6-sim-close]').focus();
    document.querySelector('.learn-root').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    return {
      candleRendered,
      overlayGone: !document.querySelector('.learn-overlay[data-ov="lp6sim"]'),
      playerStillOpen: !!document.querySelector('.learn-step'),
      boxBack: !document.querySelector('.learn-root').contains(document.getElementById('sim_candle'))
    };
  });
  ok('3. candle (p0_l6): конструктор отрисован в оверлее; Esc закрывает практикум, плеер остаётся',
    s3.candleRendered && s3.overlayGone && s3.playerStillOpen && s3.boxBack, JSON.stringify(s3));

  // ==== 4) Критично: закрытие ПЛЕЕРА при открытом практикуме не теряет бокс ====
  const s4 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l4');
    await new Promise(r => setTimeout(r, 400));
    LearnPlayer._goSim('ob');
    await new Promise(r => setTimeout(r, 350));
    const ovOpen = !!document.querySelector('.learn-overlay[data-ov="lp6sim"]');
    LearnPlayer.close(); // крестик плеера при живом оверлее
    await new Promise(r => setTimeout(r, 350));
    const box = document.getElementById('sim_ob');
    return {
      ovOpen,
      boxAlive: !!box,
      boxUnique: document.querySelectorAll('#sim_ob').length,
      inBackground: !!box && !box.closest('.learn-root'),
      playerClosed: !document.querySelector('.learn-root')
    };
  });
  ok('4. p0_l4: закрытие плеера при открытом практикуме — бокс #sim_ob возвращён в приложение, не потерян',
    s4.ovOpen && s4.boxAlive && s4.boxUnique === 1 && s4.inBackground && s4.playerClosed, JSON.stringify(s4));

  // ==== 5) Фолбэк: несуществующий бокс → прежнее поведение (закрыть плеер → вкладка тренажёров) ====
  const s5 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    LearnPlayer._goSim('sim_nonexistent');
    await new Promise(r => setTimeout(r, 450));
    const simsView = document.getElementById('sims');
    return {
      playerClosed: !document.querySelector('.learn-root'),
      simsVisible: !!simsView && getComputedStyle(simsView).display !== 'none'
    };
  });
  ok('5. Фолбэк _goSim (нет бокса): прежний контур — плеер закрыт, вкладка «Тренажёры» видима',
    s5.playerClosed && s5.simsVisible, JSON.stringify(s5));

  // ==== 6) A11y: aria-modal + фокус при открытии/закрытии (урок, тест, хаб) ====
  const a1 = await page.evaluate(async () => {
    const out = {};
    document.getElementById('lp_header_btn').focus();
    out.entry = document.activeElement.id;
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    out.lessonAria = document.querySelector('.learn-root').getAttribute('aria-modal');
    out.lessonFocus = document.querySelector('.learn-root').contains(document.activeElement);
    LearnPlayer.close(); await new Promise(r => setTimeout(r, 250));
    out.returnFocus = document.activeElement.id === out.entry;
    LearnPlayer.openTest('p1');
    await new Promise(r => setTimeout(r, 400));
    out.testAria = document.querySelector('.learn-root').getAttribute('aria-modal');
    out.testFocus = document.querySelector('.learn-root').contains(document.activeElement);
    LearnPlayer.close(); await new Promise(r => setTimeout(r, 250));
    LearnPlayer.openHome();
    await new Promise(r => setTimeout(r, 350));
    out.hubAria = document.querySelector('.learn-home-root').getAttribute('aria-modal');
    LearnPlayer.closeHome(); await new Promise(r => setTimeout(r, 200));
    return out;
  });
  ok('6. A11y: aria-modal на плеере (урок/тест) и хабе; initial focus внутрь; return focus на точку входа',
    a1.lessonAria === 'true' && a1.lessonFocus && a1.returnFocus && a1.testAria === 'true' && a1.testFocus && a1.hubAria === 'true', JSON.stringify(a1));

  // ==== 7) A11y: вход «из ридера» → закрытие плеера возвращает фокус в ридер (не body) ====
  const a2 = await page.evaluate(async () => {
    openFullscreenLesson('p0_l2');
    await new Promise(r => setTimeout(r, 350));
    LearnPlayer.open('p0_l2');
    await new Promise(r => setTimeout(r, 400));
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 350));
    const m = document.getElementById('lessonFullscreenReaderModal');
    const inModal = document.activeElement && m.contains(document.activeElement);
    const notBody = document.activeElement !== document.body;
    return { readerOpen: !!m && getComputedStyle(m).display !== 'none', inModal, notBody, tag: document.activeElement.tagName };
  });
  ok('7. Вход из ридера: после закрытия плеера фокус внутри модала ридера (не на body)',
    a2.readerOpen && a2.inModal && a2.notBody, JSON.stringify(a2));
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 8) ИИ-Фейнман: кнопка на шаге, пустой/короткий ввод → подсказка; текст → вердикт (mock) ====
  const f1 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    // дойти до шага Фейнмана
    let found = false;
    for (let i = 0; i < 40; i++) {
      const t = (document.querySelector('.learn-step-title') || {}).textContent || '';
      if (/Метод Фейнмана/i.test(t)) { found = true; break; }
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    const btn = document.querySelector('[data-lp6-feynman="p0_l1"]');
    return { found, btn: !!btn, txt: btn ? btn.textContent.trim().slice(0, 50) : null };
  });
  ok('8a. Шаг Фейнмана в плеере: кнопка «🤖 Спросить Наставника: понятно ли я объяснил?»', f1.found && f1.btn, JSON.stringify(f1));
  const f2 = await page.evaluate(async () => {
    const ta = document.getElementById('feynman_input_p0_l1');
    const btn = document.querySelector('[data-lp6-feynman="p0_l1"]');
    ta.value = 'коротко';
    btn.click(); await new Promise(r => setTimeout(r, 200));
    const hint = /напиши объяснение/i.test(document.getElementById('feynman_ai_p0_l1').innerText);
    ta.value = 'Криптовалюта — это цифровые деньги в общей тетрадке (блокчейне), где каждый перевод проверяют тысячи участников сети, а не банк.';
    btn.click(); await new Promise(r => setTimeout(r, 600));
    const out = document.getElementById('feynman_ai_p0_l1').innerText;
    return { hint, verdict: /ПОНЯЛ|ЧАСТИЧНО|ПРОПУЩЕНО/.test(out), demo: /ДЕМО/.test(out), head: out.replace(/\s+/g, ' ').slice(0, 110) };
  });
  ok('8b. Вердикт наставника через существующий контур MENTOR (mock: честная пометка ДЕМО, advice + пробелы)',
    f2.hint && f2.verdict && f2.demo, JSON.stringify(f2));

  // ==== 9) Фейнман в ридере: кнопка тоже доступна ====
  const f3 = await page.evaluate(async () => {
    try { LearnPlayer.close(); } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
    openFullscreenLesson('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    const btn = document.querySelector('#lessonContentBox [data-lp6-feynman="p0_l1"]');
    const out = document.getElementById('feynman_ai_p0_l1');
    closeFullscreenLessonReader();
    return { btn: !!btn, out: !!out };
  });
  ok('9. Ридер: та же кнопка наставника в боксе Фейнмана (общий renderFeynmanBox)', f3.btn && f3.out, JSON.stringify(f3));

  // ==== 10) §7.2 + selfTest + смок + консоль ====
  const fin = await page.evaluate(() => {
    const foreign = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/^cn_/.test(k) && !/^mentor_cache_/.test(k)) foreign.push(k); }
    const all = (window.V10 && V10.smoke && V10.smoke.checks) || [];
    return {
      foreign, smokeFails: all.filter(c => !c.ok).map(c => c.name), smokeTotal: all.length,
      self: window.LearnPlayer.selfTest(), ver: window.LearnPlayer.version
    };
  });
  ok('10. §7.2 (только cn_*), V10.smoke ' + fin.smokeTotal + ' без FAIL, selfTest ok (lp3–lp6), версия ' + fin.ver,
    fin.foreign.length === 0 && fin.smokeFails.length === 0 && fin.self.ok && fin.self.lp3.ok && fin.self.lp4.ok && fin.self.lp5.ok && fin.self.lp6.ok,
    JSON.stringify({ foreign: fin.foreign, fails: fin.smokeFails, lp6: fin.self.lp6 }));

  ok('11. Консоль: 0 pageerror / 0 console.error (кроме ERR_FILE_NOT_FOUND)',
    errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e)).length === 0, JSON.stringify(errs.slice(0, 4)));

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_6: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_6: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
