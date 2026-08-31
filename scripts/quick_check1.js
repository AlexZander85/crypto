// Смоук-загрузка v12.4: консоль, lp2-smoke, API, каркас тестового режима (P1)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto('file://' + path.resolve('index_v12.4.html'));
  await page.waitForTimeout(3500);

  const res = await page.evaluate(async () => {
    const out = {};
    out.smoke = (window.V10 && V10.smoke) ? V10.smoke.checks.filter(c => c.name.startsWith('lp2')).map(c => c.name + (c.ok ? ' ✓' : ' ✗ ' + c.note)) : null;
    out.api = {
      openTest: typeof LearnPlayer.openTest,
      onTestResult: typeof LearnPlayer.onTestResult,
      openFlashcards: typeof LearnPlayer.openFlashcards,
      selfTest: typeof LearnPlayer.selfTest,
      version: LearnPlayer.version
    };
    const st = LearnPlayer.selfTest();
    out.selfTest = { ok: st.ok, banks: st.banks.length, errors: st.errors.slice(0, 5) };

    // P1.5: openTest('p1') рисует каркас
    LearnPlayer.openTest('p1', 'tests');
    await new Promise(r => setTimeout(r, 100));
    const root = document.querySelector('.learn-root');
    out.p1 = {};
    out.p1.active = !!(root && window.LEARN_PLAYER_ACTIVE);
    const label = root ? root.querySelector('.learn-progress-label') : null;
    out.p1.label = label ? label.textContent : null;
    const title = root ? root.querySelector('.learn-progress-title') : null;
    out.p1.title = title ? title.textContent : null;
    out.p1.portions = document.querySelectorAll('.learn-map .learn-map-item').length; // 3 порции + врата = 4
    out.p1.cards = root ? root.querySelectorAll('.learn-card').length : 0;
    out.p1.optBtns = root ? root.querySelectorAll('#ptest_1_0 button.ans').length : 0;
    out.p1.ptviewSalt = !!(window._ptView && window._ptView[1] && window._ptView[1].length === 12);
    out.p1.draft = localStorage.getItem('cn_learn_test');
    // Esc закрывает и восстанавливает подложку
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    root.dispatchEvent(esc);
    await new Promise(r => setTimeout(r, 100));
    out.p1.closed = !window.LEARN_PLAYER_ACTIVE;
    out.p1.testBoxRestored = !!(document.getElementById('phaseTestBox') && document.getElementById('phaseTestBox').querySelector('button[onclick^="calcPhaseTestResult"]'));
    out.p1.entryBtn = !!document.getElementById('lp_test_entry_1');
    // повторное открытие не плодит узлы
    LearnPlayer.openTest('p1', 'tests');
    await new Promise(r => setTimeout(r, 50));
    out.p1.singleRoot = document.querySelectorAll('.learn-root').length;
    LearnPlayer.close();
    await new Promise(r => setTimeout(r, 50));
    out.p1.entryBtnAfterReopen = !!document.getElementById('lp_test_entry_1');
    return out;
  });

  console.log(JSON.stringify(res, null, 1));
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 3));
  console.log('CONSOLE_ERRORS:', consoleErrors.length, consoleErrors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
