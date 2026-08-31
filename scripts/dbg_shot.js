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
  await page.screenshot({ path: 'dbg_cont_shot.png' });
  const cs = await page.evaluate(() => {
    const t = document.querySelector('.lp3-card.main .t');
    const k = document.querySelector('.lp3-card.main .k');
    const st = getComputedStyle(t), sk = getComputedStyle(k);
    return {
      tColor: st.color, tFs: st.fontSize, tDisp: st.display,
      kColor: sk.color, kFs: sk.fontSize,
      btnColor: getComputedStyle(document.querySelector('.lp3-card.main')).color
    };
  });
  console.log(JSON.stringify(cs, null, 1));
  await browser.close();
})();
