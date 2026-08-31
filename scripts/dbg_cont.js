const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v12.5.html'));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done','1'); });
  await page.reload();
  await page.waitForTimeout(3200);
  // имитируем состояние regression3: черновик теста p2 с 1 ответом
  await page.evaluate(() => {
    LearnPlayer.openTest('p2', 'tests');
  });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const view = window._ptView[2];
    const btns = document.querySelectorAll('#ptest_2_0 button.ans');
    btns[view[0].a].click();
    await new Promise(r => setTimeout(r, 100));
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const dbg = await page.evaluate(() => {
    const card = document.querySelector('.lp3-card.main');
    return {
      draft: localStorage.getItem('cn_learn_test'),
      pos: localStorage.getItem('cn_learn_pos'),
      cardHtml: card ? card.outerHTML.slice(0, 500) : null,
      cardText: card ? card.innerText : null,
      contSec: (document.querySelector('.lp3-sec') || {}).outerHTML?.slice(0, 200)
    };
  });
  console.log(JSON.stringify(dbg, null, 1));
  await page.screenshot({ path: 'dbg_cont.png' });
  await browser.close();
})();
