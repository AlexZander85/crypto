// ===== Этап 5, проба №7: быстрый автопрогон ВСЕХ уроков (2 прохода) — каталог ошибок =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const PACE = parseInt(process.argv[3] || '90', 10); // мс между открытиями

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = {};
  const key = t => {
    const m = String(t).replace(/\s+/g, ' ');
    return m.slice(0, 120);
  };
  page.on('pageerror', e => {
    const loc = (String(e && e.stack || '').match(/index_v12[^()]*:(\d+:\d+)/) || ['', '?'])[1];
    const k = '[pageerror] ' + (String(e && e.message || e)).slice(0, 110) + ' @' + loc;
    errs[k] = (errs[k] || 0) + 1;
  });
  page.on('console', m => {
    if (m.type() !== 'error' || /ERR_FILE_NOT_FOUND/.test(m.text() || '')) return;
    const loc = m.location();
    const k = '[svg/console] ' + (m.text() || '').slice(0, 110) + ' @' + (loc ? loc.lineNumber : '?');
    errs[k] = (errs[k] || 0) + 1;
  });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  const res = await page.evaluate(async (PACE) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const ids = LESSONS.map(l => l.id);
    const opened = [];
    for (let pass = 0; pass < 2; pass++) {
      for (const id of ids) {
        try { openFullscreenLesson(id); } catch (e) {}
        opened.push(id);
        await sleep(PACE);
      }
    }
    return opened.length;
  }, PACE);

  console.log('открытий: ' + res + ' (проходов: 2, темп: ' + PACE + ' мс)');
  const keys = Object.keys(errs);
  console.log('уникальных ошибок: ' + keys.length);
  keys.forEach(k => console.log('  [' + errs[k] + '×] ' + k));
  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
