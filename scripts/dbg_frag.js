const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v12.5.html'));
  await page.waitForTimeout(3200);
  const out = await page.evaluate(() => {
    const r = LearnPlayer.search('ликвидация');
    const lessonRes = r.results.filter(x => x.it.type === 'lesson').slice(0, 3);
    return lessonRes.map(x => ({
      id: x.it.id, pos: x.pos, textLen: x.it.text.length,
      textHead: x.it.text.slice(Math.max(0, x.pos - 10), x.pos + 20),
      hayProbe: (x.it.num + ' ' + x.it.title + ' ' + x.it.text).toLowerCase().slice(x.pos - 5, x.pos + 15)
    }));
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
