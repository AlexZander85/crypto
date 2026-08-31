// ===== Этап 5, проба №3: интроспекция виджета М46 (источник cy=NaN) =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  await page.evaluate(() => { try { window.openFullscreenLesson('m_regressiya_k_srednemu'); } catch (e) {} });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const gi = document.getElementById('m46w_i');
    const out = document.getElementById('m46out');
    const circles = Array.from(document.querySelectorAll('#m46out circle')).map(c => c.getAttribute('cx') + '/' + c.getAttribute('cy'));
    return {
      w_i: gi ? { tag: gi.tagName, value: gi.value, type: gi.type, outer: gi.outerHTML.slice(0, 200) } : null,
      m46out_head: out ? out.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 300) : null,
      circles
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // Поиск функции mrng — как называется инпут
  const src = await page.evaluate(() => {
    try { return (window.mrng || mrng).toString().slice(0, 400); } catch (e) { return 'mrng недоступна: ' + e.message; }
  });
  console.log('--- mrng(): ' + src);
  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
