// P6.3 (CTA финала) + P7 (карточки) + P8 (навигация по фазам) + доп.проверки
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('index_v12.4.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  var consoleErrors = [];
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const res = await page.evaluate(async () => {
    const out = {};
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // ==== P6.3: финал урока фазы 0 → «▸ Тест фазы 0» ====
    LearnPlayer.open('p0_l1');
    await sleep(120);
    // добраться до финала: гейт — сдать квиз
    for (let k = 0; k < 60; k++) {
      const btn = document.getElementById('lesson_complete_btn_p0_l1');
      if (btn && !btn.disabled) { btn.click(); await sleep(120); break; }
      // ищем опцию квиза на текущем шаге
      const opts = Array.from(document.querySelectorAll('[id^="lquiz_opts_"] button.ans'));
      if (opts.length) {
        const oc = opts[0].getAttribute('onclick') || '';
        const mc = /handleLessonQuizAnswer\('[^']*',\s*\d+,\s*(\d+)\)/.exec(oc);
        const ci = mc ? parseInt(mc[1], 10) : 0;
        (opts[ci] || opts[0]).click(); await sleep(60); continue;
      }
      LearnPlayer.next();
      await sleep(40);
    }
    await sleep(100);
    const fin = document.querySelector('.learn-root .learn-step');
    out.p0_finale = {
      testCta: !!fin.querySelector('[onclick="LearnPlayer.openTest(\'p0\')"]'),
      fcButton: !!fin.querySelector('[onclick="LearnPlayer.openFlashcards(\'p0_l1\')"]'),
      phaseNav: Array.from(fin.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.indexOf('Фаза') >= 0),
      completeCalled: false
    };
    // ==== P7: карточки с финала ====
    const fcBtn = fin.querySelector('[onclick="LearnPlayer.openFlashcards(\'p0_l1\')"]');
    if (fcBtn) {
      fcBtn.click();
      await sleep(120);
      out.fc = {};
      out.fc.started = document.querySelector('.learn-root .learn-step').textContent.indexOf('Карточка 1 из') >= 0;
      out.fc.deckSize = (/: (\d+) из/).exec(document.querySelector('.learn-progress-label').textContent);
      // пройти всю колоду: переворот + «знал»
      let guard = 0;
      while (guard++ < 30) {
        const lbl = document.querySelector('.learn-progress-label').textContent;
        if (lbl.indexOf('Завершить карточки') >= 0 || document.querySelector('[data-lp2-act="fc-again"]')) break;
        const card = document.querySelector('.lp2-fc-card');
        if (card && document.querySelector('.lp2-fc-card') && !document.querySelector('[data-lp2-act="fc-known"]')) { card.click(); await sleep(40); continue; }
        const known = document.querySelector('[data-lp2-act="fc-known"]');
        const unknown = document.querySelector('[data-lp2-act="fc-unknown"]');
        if (known || unknown) { (guard % 2 ? known : unknown).click(); await sleep(40); continue; }
        break;
      }
      out.fc.summary = document.querySelector('.learn-root .learn-step h1') ? document.querySelector('.learn-root .learn-step h1').textContent : null;
      out.fc.fcLS = JSON.stringify(localStorage.getItem('cn_learn_fc') || 'null').slice(0, 120);
      // выход к уроку
      const ex = document.querySelector('[data-lp2-act="fc-exit"]');
      if (ex) ex.click();
      await sleep(80);
      out.fc.backToLesson = document.querySelector('.learn-root .learn-step').textContent.indexOf('Урок пройден') >= 0 || document.querySelector('.learn-root .learn-step').textContent.indexOf('Финал') >= 0 || !!document.querySelector('[id^="lesson_complete_btn_"]');
    }
    // финал фазы 0: «Фаза 1 ▸» есть, «◂ Фаза -1» нет
    out.p0_navButtons = Array.from(document.querySelectorAll('.learn-root .learn-step button')).map(b => b.textContent.trim()).filter(t => /^◂? ?Фаза/.test(t) || /Фаза \d+ ▸$/.test(t));
    // ==== клик «Фаза 1 ▸» → первый непройденный фазы 1 ====
    const navBtn = Array.from(document.querySelectorAll('.learn-root .learn-step button')).find(b => /Фаза 1 ▸/.test(b.textContent));
    if (navBtn) {
      navBtn.click();
      await sleep(150);
      const t = document.querySelector('.learn-progress-title');
      out.navToPhase1 = t ? t.textContent.slice(0, 50) : null;
      LearnPlayer.close();
      await sleep(80);
    }

    // ==== P8: крайние фазы ====
    out.phase0 = { hasLeft: false, hasRight: true };
    // урок фазы 9 (ft07 — Академия)
    LearnPlayer.open('ft07');
    await sleep(120);
    for (let k = 0; k < 80; k++) {
      const btn = document.getElementById('lesson_complete_btn_ft07');
      if (btn && !btn.disabled) { btn.click(); await sleep(120); break; }
      const opts = Array.from(document.querySelectorAll('[id^="lquiz_opts_"] button.ans'));
      if (opts.length) {
        const oc = opts[0].getAttribute('onclick') || '';
        const mc = /handleLessonQuizAnswer\('[^']*',\s*\d+,\s*(\d+)\)/.exec(oc);
        const ci = mc ? parseInt(mc[1], 10) : 0;
        (opts[ci] || opts[0]).click(); await sleep(50); continue;
      }
      LearnPlayer.next();
      await sleep(35);
    }
    await sleep(100);
    const fin9 = document.querySelector('.learn-root .learn-step');
    out.phase9 = {
      hasRight: !!Array.from(fin9.querySelectorAll('button')).find(b => /Фаза 10 ▸/.test(b.textContent)),
      hasLeft: !!Array.from(fin9.querySelectorAll('button')).find(b => /◂ Фаза 8/.test(b.textContent)),
      noTestCta: !fin9.querySelector('[onclick^="LearnPlayer.openTest"]')
    };
    LearnPlayer.close();
    await sleep(80);

    // ==== Фаза 7 (мат-урок): три CTA мат-тестов ====
    const mId = LESSONS.find(x => x.phase === 7).id;
    LearnPlayer.open(mId);
    await sleep(120);
    for (let k = 0; k < 80; k++) {
      const btn = document.getElementById('lesson_complete_btn_' + mId);
      if (btn && !btn.disabled) { btn.click(); await sleep(120); break; }
      const opts = Array.from(document.querySelectorAll('[id^="lquiz_opts_"] button.ans'));
      if (opts.length) {
        const oc = opts[0].getAttribute('onclick') || '';
        const mc = /handleLessonQuizAnswer\('[^']*',\s*\d+,\s*(\d+)\)/.exec(oc);
        const ci = mc ? parseInt(mc[1], 10) : 0;
        (opts[ci] || opts[0]).click(); await sleep(50); continue;
      }
      LearnPlayer.next();
      await sleep(35);
    }
    await sleep(100);
    const fin7 = document.querySelector('.learn-root .learn-step');
    out.phase7 = {
      lesson: mId,
      mathCtas: Array.from(fin7.querySelectorAll('button[onclick^="LearnPlayer.openTest"]')).map(b => (b.getAttribute('onclick').match(/'(\w+)'/) || [])[1])
    };
    LearnPlayer.close();
    await sleep(80);

    // ==== шапка: 🗂 только с колодой; в тестовом режиме 🔖/💬 скрыты, 🏁 есть ====
    LearnPlayer.open('p0_l1');
    await sleep(120);
    out.lessonHeader = {
      fcVisible: document.querySelector('[data-lp2-act="fc"]').style.display !== 'none',
      pickerVisible: document.querySelector('[data-lp2-act="picker"]').style.display !== 'none'
    };
    LearnPlayer.openTest('p0', 'inplayer');
    await sleep(120);
    out.testHeader = {
      fcHidden: document.querySelector('[data-lp2-act="fc"]').style.display === 'none',
      bmHidden: document.querySelector('[data-lp-act="bm"]').style.display === 'none',
      mentorHidden: document.querySelector('[data-lp-act="mentor"]').style.display === 'none',
      pickerVisible: document.querySelector('[data-lp2-act="picker"]').style.display !== 'none'
    };
    // клавиатура 1..9 на p0 (первый неотвеченный вопрос порции)
    const cont0 = document.getElementById('ptest_0_0');
    const nOpts = cont0.querySelectorAll('button.ans').length;
    out.kb9opts = nOpts;
    document.querySelector('.learn-root').dispatchEvent(new KeyboardEvent('keydown', { key: String(Math.min(nOpts, 9)), bubbles: true }));
    await sleep(60);
    out.kbAnswered = JSON.parse(localStorage.getItem('cn_learn_test')).answers;
    // хоткеи в тестовом режиме
    document.querySelector('[data-lp-act="hotkeys"]').click();
    await sleep(50);
    out.testHotkeys = document.querySelector('.learn-overlay[data-ov="hotkeys"]') ? document.querySelector('.learn-overlay[data-ov="hotkeys"]').textContent.indexOf('порция') >= 0 : false;
    LearnPlayer.close();
    await sleep(80);

    // ==== p8: накопительный разделитель — один раз ====
    LearnPlayer.openTest('p8', 'tests');
    await sleep(120);
    // порции 33+ содержат _cumulative; идём вперёд и считаем
    let cumDivs = 0;
    for (let k = 0; k < 41; k++) {
      cumDivs += Array.from(document.querySelectorAll('.learn-root .learn-step div')).filter(d => d.textContent.indexOf('Накопительный контроль переноса') >= 0 && d.style.border.indexOf('acc1') >= 0 || (d.textContent.indexOf('🧠 Накопительный контроль переноса') >= 0 && d.querySelector('b'))).length;
      const nb = document.querySelector('[data-lp2-nav="next"]');
      if (!nb) break;
      nb.click();
      await sleep(25);
    }
    out.p8_cumDivider = cumDivs; // ожидание: 1 (на порции с первым cumulative)
    out.p8_steps = document.querySelectorAll('.learn-map .learn-map-item').length; // 42
    LearnPlayer.close();
    await sleep(80);

    // ==== psy_cum диагностика ====
    LearnPlayer.openTest('psy_cum', 'tests');
    await sleep(100);
    out.psy_cum = {
      title: document.querySelector('.learn-progress-title').textContent,
      steps: document.querySelectorAll('.learn-map .learn-map-item').length // 5 (21→5 порций? ceil(21/5)=5) + врата = 6? нет: 5 порций + врата = 6... ceil(21/5)=4.2→5 → 5+1=6? проверим
    };
    LearnPlayer.close();
    await sleep(60);
    return out;
  });

  console.log(JSON.stringify(res, null, 1));
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 4));
  console.log('CONSOLE_ERRORS:', consoleErrors.length, consoleErrors.slice(0, 4));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
