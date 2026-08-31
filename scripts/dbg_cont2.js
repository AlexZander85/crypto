const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v12.5.html'));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done','1'); });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    localStorage.setItem('cn_learn_test', JSON.stringify({ testId: 'p2', pos: 0, ph: 2, salt: 1, answers: { 0: 2 }, numeric: {}, updatedTs: Date.now() }));
  });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const b = document.getElementById('lp_header_btn'); b.focus(); b.click(); });
  await page.waitForTimeout(400);
  const dbg = await page.evaluate(() => {
    const secs = document.querySelectorAll('.lp3-sec');
    const cont = secs[0];
    return {
      nSecs: secs.length,
      contHtml: cont ? cont.outerHTML.slice(0, 900) : null,
      mainCard: (document.querySelector('.lp3-card.main') || {}).outerHTML || null
    };
  });
  console.log(JSON.stringify(dbg, null, 1));
  await browser.close();
})();
