// Отладка p8 resume: что лежит в LS до/после перезагрузки
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('index_v12.4.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE_ERR:', String(e).slice(0, 200)));
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const s1 = await page.evaluate(async () => {
    LearnPlayer.openTest('p8', 'tests');
    await new Promise(r => setTimeout(r, 120));
    const view = window._ptView[8];
    for (let qi = 0; qi < 5; qi++) {
      const q = view[qi];
      const cont = document.getElementById('ptest_8_' + qi);
      if (!cont) return { err: 'no cont ' + qi };
      const btns = cont.querySelectorAll('button.ans');
      btns[(q.a + 1) % btns.length].click();
      await new Promise(r => setTimeout(r, 30));
    }
    LearnPlayer.next();
    await new Promise(r => setTimeout(r, 80));
    for (let qi = 5; qi < 7; qi++) {
      const q = view[qi];
      const cont = document.getElementById('ptest_8_' + qi);
      const btns = cont.querySelectorAll('button.ans');
      btns[q.a].click();
      await new Promise(r => setTimeout(r, 30));
    }
    return {
      draft: JSON.parse(localStorage.getItem('cn_learn_test')),
      label: document.querySelector('.learn-progress-label').textContent
    };
  });
  console.log('SESSION1:', JSON.stringify(s1));

  await page.goto('about:blank');
  await page.goto(FILE);
  await page.waitForTimeout(3500);

  const s2 = await page.evaluate(async () => {
    const out = {};
    out.draftRaw = localStorage.getItem('cn_learn_test');
    LearnPlayer.openTest('p8', 'tests');
    await new Promise(r => setTimeout(r, 150));
    out.label = (document.querySelector('.learn-progress-label') || {}).textContent;
    const ov = document.querySelector('.learn-overlay[data-ov="test-resume"]');
    out.dialogText = ov ? ov.textContent.replace(/\s+/g, ' ').slice(0, 100) : null;
    if (ov) { ov.querySelector('[data-lp2-resume="1"]').click(); await new Promise(r => setTimeout(r, 100)); }
    out.label2 = (document.querySelector('.learn-progress-label') || {}).textContent;
    const map0 = document.querySelector('.learn-map [data-lp2-map="0"]');
    out.map0disabled = map0 ? map0.disabled : null;
    if (map0 && !map0.disabled) { map0.click(); await new Promise(r => setTimeout(r, 100)); }
    out.label3 = (document.querySelector('.learn-progress-label') || {}).textContent;
    out.cont0 = !!document.getElementById('ptest_8_0');
    return out;
  });
  console.log('SESSION2:', JSON.stringify(s2, null, 1));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
