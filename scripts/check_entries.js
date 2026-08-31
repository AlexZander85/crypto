// Проверка точек входа P6: кнопки в слотах «Тесты», мат-тесты фазы 7, баннер главной, пикер
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve('index_v12.4.html'));
  await page.waitForTimeout(3500);

  const res = await page.evaluate(async () => {
    const out = {};
    // вкладка тестов: 7 слотов, у каждого — кнопка входа
    out.slots = [];
    for (const ph of [0, 1, 2, 3, 4, 5, 8, 6]) {
      switchPhaseTest(ph, undefined);
      await new Promise(r => setTimeout(r, 30));
      const btn = document.getElementById('lp_test_entry_' + ph);
      const box = document.getElementById('phaseTestBox');
      out.slots.push({
        ph,
        entry: !!btn,
        testRendered: !!box.querySelector('button[onclick^="calcPhaseTestResult"]'),
        h2: box.querySelector('h2') ? box.querySelector('h2').textContent.slice(0, 40) : null
      });
    }
    // фаза 7: мат-тесты
    renderPhaseLessonsView(7);
    await new Promise(r => setTimeout(r, 60));
    const grid = document.getElementById('phaseLessonCardsGrid');
    const finishBtns = grid ? grid.querySelectorAll('button[onclick^="finishMathTest"]') : [];
    const entries = grid ? grid.querySelectorAll('[data-lp2-mentry]') : [];
    out.math = { finishBtns: finishBtns.length, entries: entries.length };
    // клик по 🎓 мат-теста не проваливается в старый рендер
    if (entries[0]) {
      entries[0].click();
      await new Promise(r => setTimeout(r, 80));
      out.math.openedTest = window.LEARN_PLAYER_ACTIVE && document.querySelector('.learn-progress-title') ? document.querySelector('.learn-progress-title').textContent : null;
      out.math.stopPropagationOk = !document.getElementById('lessonFullscreenReaderModal') || document.getElementById('lessonFullscreenReaderModal').style.display !== 'flex';
      LearnPlayer.close();
      await new Promise(r => setTimeout(r, 60));
    }
    // пикер 🏁 в шапке плеера
    LearnPlayer.openTest('p0', 'tests');
    await new Promise(r => setTimeout(r, 80));
    const pk = document.querySelector('[data-lp2-act="picker"]');
    out.pickerBtn = !!pk;
    if (pk) {
      pk.click();
      await new Promise(r => setTimeout(r, 50));
      out.pickerRows = document.querySelectorAll('.lp2-bank-btn').length; // 13
      const diag = Array.from(document.querySelectorAll('[data-lp2-bank]')).map(b => b.getAttribute('data-lp2-bank'));
      out.pickerIds = diag;
      // клик по банку в пикере
      const cap = document.querySelector('[data-lp2-bank="capstone"]');
      cap.click();
      await new Promise(r => setTimeout(r, 80));
      out.pickerSwitch = document.querySelector('.learn-progress-title') ? document.querySelector('.learn-progress-title').textContent.slice(0, 45) : null;
      out.pickerClosed = !document.querySelector('.learn-overlay[data-ov="picker"]');
      LearnPlayer.close();
      await new Promise(r => setTimeout(r, 60));
    }
    // баннер на главной (черновик свежий) — создаём черновик p2
    LearnPlayer.openTest('p2', 'tests');
    await new Promise(r => setTimeout(r, 50));
    const opt = document.querySelector('#ptest_2_0 button.ans');
    if (opt) opt.click();
    await new Promise(r => setTimeout(r, 50));
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    go('home');
    await new Promise(r => setTimeout(r, 200));
    const tb = document.getElementById('learn_home_test_banner');
    out.homeBanner = tb ? tb.textContent.replace(/\s+/g, ' ').slice(0, 110) : null;
    if (tb) { const b = document.getElementById('lp_home_test_resume'); if (b) { b.click(); await new Promise(r => setTimeout(r, 100)); } }
    out.homeBannerResume = window.LEARN_PLAYER_ACTIVE ? (document.querySelector('.learn-progress-title') || {}).textContent : null;
    const label = document.querySelector('.learn-progress-label');
    out.homeBannerResumeLabel = label ? label.textContent : null;
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 60));
    out.homeBannerRemovedWhileActive = false;
    return out;
  });

  console.log(JSON.stringify(res, null, 1));
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
