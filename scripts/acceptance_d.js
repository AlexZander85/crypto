// P10: автопрогон 13 банков (открытие → ответы → resume → сдача), 360px, скриншоты
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('index_v12.4.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], consoleErrors = [], dialogs = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 30)); await d.dismiss(); });
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const res = await page.evaluate(async () => {
    const out = { banks: [] };
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const ids = ['p0','p1','p2','p3','p4','p5','p8','capstone','math_core','math_stats','math_final_map','literacy','psy_cum'];

    for (const id of ids) {
      const rec = { id };
      // === открытие ===
      LearnPlayer.openTest(id, 'tests');
      await sleep(120);
      const total = document.querySelectorAll('.learn-map .learn-map-item').length;
      rec.steps = total;
      rec.label1 = document.querySelector('.learn-progress-label').textContent;
      // === ответить на 2-3 вопроса первой порции ===
      const q0 = document.querySelector('[id^="ptest_"][id$="_0"]');
      let answered = 0;
      for (let qi = 0; qi < 3; qi++) {
        const cont = document.querySelector('[data-lp2-q="' + qi + '"]') || document.querySelector('[data-lp2-mq="' + qi + '"]');
        if (!cont) break;
        const isNum = !!cont.querySelector('input');
        if (isNum) {
          const inp = cont.querySelector('input');
          const mm = /_(\d+)$/.exec(cont.querySelector('[id^="ptest_"]').id);
          inp.value = '1';
          cont.querySelector('button.btn').click();
        } else {
          const b = cont.querySelector('button.ans');
          if (b) b.click();
        }
        answered++;
        await sleep(30);
      }
      rec.answered3 = answered;
      rec.counterAfter = document.querySelector('.learn-progress-label').textContent;
      // === закрытие (resume-черновик) ===
      LearnPlayer.close();
      await sleep(80);
      rec.draftAfterClose = !!localStorage.getItem('cn_learn_test');
      // === resume ===
      LearnPlayer.openTest(id, 'tests');
      await sleep(120);
      const ov = document.querySelector('.learn-overlay[data-ov="test-resume"]');
      rec.resumeDialog = ov ? ov.textContent.indexOf('Продолжить попытку') >= 0 : false;
      if (ov) { ov.querySelector('[data-lp2-resume="1"]').click(); await sleep(80); }
      rec.counterResumed = document.querySelector('.learn-progress-label').textContent;
      // === добить все вопросы и сдать (осознанно «как получится» — важен сам факт записи) ===
      // навигация по всем порциям; в каждой отвечаем неотвеченные (для фазовых кнопки залочены)
      for (let k = 0; k < 50; k++) {
        const cur = document.querySelector('.learn-root .learn-step');
        if (!cur) break;
        const answeredInPortion = [];
        cur.querySelectorAll('[data-lp2-q], [data-lp2-mq]').forEach(cont => {
          const isNum = !!cont.querySelector('input');
          if (isNum) {
            const inp = cont.querySelector('input');
            if (inp.disabled) return;
            const view = window._ptView;
            inp.value = '0'; // неверно — ок для прогонки
            const chk = cont.querySelector('button.btn');
            if (chk && !chk.disabled) chk.click();
          } else {
            const free = Array.from(cont.querySelectorAll('button.ans')).filter(b => !b.disabled);
            if (free.length) free[free.length - 1].click();
          }
          answeredInPortion.push(1);
        });
        await sleep(20);
        // на вратах — сдача (проверяем ДО next, у врат нет кнопки «Дальше»)
        const submitBtn = document.querySelector('[data-lp2-submit]');
        if (submitBtn) { submitBtn.click(); await sleep(id === 'p8' ? 400 : 200); break; }
        const nextBtn = document.querySelector('[data-lp2-nav="next"]');
        if (!nextBtn) break;
        nextBtn.click();
        await sleep(40);
      }
      await sleep(150);
      rec.resultShown = !!document.querySelector('[data-lp2-review]');
      rec.stateAfter = {
        ptdKey: Object.keys(phaseTestsDone).filter(k => k === id || (id === 'capstone' && k === 'exam_capstone')).length
      };
      rec.draftClearedAfterSubmit = localStorage.getItem('cn_learn_test') === null;
      // === разбор ===
      const rv = document.querySelector('[data-lp2-review]');
      if (rv) { rv.click(); await sleep(100); }
      rec.reviewNavigable = !!document.querySelector('.learn-root .learn-step');
      LearnPlayer.close();
      await sleep(80);
      out.banks.push(rec);
    }
    out.finalState = {
      ptd: JSON.parse(JSON.stringify(phaseTestsDone)),
      mts: JSON.parse(JSON.stringify(mathTestState))
    };
    return out;
  });

  console.log(JSON.stringify(res, null, 1));
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 4));
  console.log('CONSOLE_ERRORS:', consoleErrors.length, consoleErrors.slice(0, 4));
  console.log('DIALOGS_IN_PLAYER:', dialogs.length);

  // ==== 360px мобильная проверка ====
  const page2 = await ctx.newPage();
  await page2.setViewportSize({ width: 360, height: 740 });
  await page2.goto(FILE);
  await page2.waitForTimeout(3000);
  const mob = await page2.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    LearnPlayer.openTest('p1', 'tests');
    await sleep(120);
    const root = document.querySelector('.learn-root');
    const map = root.querySelector('.learn-map');
    const content = root.querySelector('.learn-content');
    return {
      mapToggleVisible: getComputedStyle(root.querySelector('.learn-map-toggle')).display !== 'none',
      mapOffscreen: map.getBoundingClientRect().right <= 1,
      noHScroll: content.scrollWidth <= content.clientWidth + 1,
      label: root.querySelector('.learn-progress-label').textContent
    };
  });
  await page2.screenshot({ path: 'shot_mob360_test.png' });

  // ==== скриншоты для отчёта ====
  const page3 = await ctx.newPage();
  await page3.setViewportSize({ width: 1440, height: 900 });
  await page3.goto(FILE);
  await page3.waitForTimeout(3000);
  await page3.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    LearnPlayer.openTest('p1', 'tests');
    await sleep(150);
  });
  await page3.screenshot({ path: 'shot_player_p1.png' });
  await page3.evaluate(() => document.querySelector('[data-lp2-act="picker"]').click());
  await page3.waitForTimeout(200);
  await page3.screenshot({ path: 'shot_picker.png' });
  await page3.evaluate(() => { const o = document.querySelector('.learn-overlay[data-ov="picker"]'); if (o) o.remove(); });
  await page3.evaluate(async () => {
    // досдать p1 для экрана результата
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const gotoPortion = async (qi) => {
      const port = Math.floor(qi / 5);
      for (let k = 0; k < 12; k++) {
        const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
        if (m && parseInt(m[1], 10) - 1 === port) return;
        document.querySelector('[data-lp2-nav="next"]').click();
        await sleep(40);
      }
    };
    const view = window._ptView[1];
    for (let qi = 0; qi < view.length; qi++) {
      await gotoPortion(qi);
      const q = view[qi];
      if (q.type === 'numeric') {
        const inp = document.getElementById('pnum_in_1_' + qi);
        inp.value = String(q.answer);
        document.querySelector('#ptest_1_' + qi + ' button.btn').click();
      } else {
        const btns = document.getElementById('ptest_1_' + qi).querySelectorAll('button.ans');
        btns[qi < 2 ? (q.a + 1) % btns.length : q.a].click();
      }
      await sleep(25);
    }
    for (let k = 0; k < 15; k++) {
      const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
      const total = document.querySelectorAll('.learn-map .learn-map-item').length;
      if (m && parseInt(m[1], 10) === total) break;
      document.querySelector('[data-lp2-nav="next"]').click();
      await sleep(40);
    }
    document.querySelector('[data-lp2-submit]').click();
    await sleep(400);
  });
  await page3.screenshot({ path: 'shot_result.png' });

  console.log('MOBILE360:', JSON.stringify(mob));
  console.log('SCREENSHOTS saved: shot_player_p1.png, shot_picker.png, shot_result.png, shot_mob360_test.png');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
