// ===== Этап 5, проба №6: что именно монтируется в m_cpt =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('[pageerror] ' + String(e && e.message || e).slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE/.test(m.text())) console.log('[error] ' + (m.text() || '').slice(0, 120)); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  await page.evaluate(() => { try { window.openFullscreenLesson('m_cpt_centralnaya_predelnaya_teorema'); } catch (e) {} });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const modal = document.getElementById('lessonFullscreenReaderModal');
    const ids = modal ? Array.from(modal.querySelectorAll('[id^="m4"], [id^="widget"]')).map(e => e.id) : [];
    const keys = typeof MATH_WIDGETS === 'object' ? Object.keys(MATH_WIDGETS) : [];
    return { containers: ids, mathWidgetKeys: keys.length, hasM45: keys.indexOf('widget_m_cpt_centralnaya_predelnaya_teorema') >= 0, hasM46: keys.indexOf('widget_m_regressiya_k_srednemu') >= 0 };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
