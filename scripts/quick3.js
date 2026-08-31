// Быстрый smoke Этапа 3: загрузка, консоль, lp3:* проверки, API
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.5.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto('file://' + path.resolve(HTML));
  await page.waitForTimeout(3500);

  const r = await page.evaluate(() => {
    const out = {};
    out.version = window.LearnPlayer && window.LearnPlayer.version;
    out.api = ['openHome','closeHome','search','openNote','exportNotesMarkdown','open','openTest','selfTest']
      .map(k => k + ':' + typeof window.LearnPlayer[k]).join(' ');
    out.pct = window.LearnPlayer._learnCoursePct ? window.LearnPlayer._learnCoursePct() : null;
    const sr = window.LearnPlayer.search('ликвидация');
    out.searchTotal = sr.results.length;
    out.searchLessons = sr.results.filter(x => x.it.type === 'lesson').length;
    out.searchTerms = sr.results.filter(x => x.it.type !== 'lesson').length;
    const oos = window.LearnPlayer.search('OOS');
    out.oosAbbr = oos.results.filter(x => x.it.type === 'abbr').length;
    const kel = window.LearnPlayer.search('Келли');
    out.kellyTerm = kel.results.filter(x => x.it.type === 'term').length;
    out.kellyLessons = kel.results.filter(x => x.it.type === 'lesson').length;
    const st = window.LearnPlayer.selfTest();
    out.selfTestOk = st.ok;
    out.selfTestErrors = (st.errors || []).concat(st.lp3 && st.lp3.errors || []).slice(0, 5);
    out.recent = JSON.parse(localStorage.getItem('cn_learn_recent') || '[]').length;
    return out;
  });

  // smoke-отчёт V10 (появляется ~1.2 c, ждём и читаем lp3:*)
  await page.waitForTimeout(1500);
  r.smoke = await page.evaluate(() => {
    try {
      const all = (window.V10 && window.V10.smoke && window.V10.smoke.checks) || [];
      return all.filter(x => /^lp3:/.test(x.name)).map(x => (x.ok ? 'OK ' : 'FAIL') + ' ' + x.name + (x.note ? ' — ' + x.note : ''));
    } catch (e) { return ['smoke-list-error: ' + e.message]; }
  });

  console.log(JSON.stringify(r, null, 1));
  console.log('PAGE_ERRORS:', errors.length, errors.slice(0, 3));
  console.log('CONSOLE_ERRORS:', consoleErrors.length, consoleErrors.slice(0, 3));
  await browser.close();
  process.exit(errors.length || consoleErrors.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
