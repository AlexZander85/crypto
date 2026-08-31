const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', m => console.log('CON:', m.type(), m.text().slice(0, 200)));
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v12.5.html'));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done','1'); });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(500);
  const dbg = await page.evaluate(async () => {
    const out = { steps: [] };
    for (let i = 0; i < 8; i++) {
      const st = document.querySelector('.learn-step');
      if (st && st.querySelector('p, li') && st.innerText.length > 120) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 70));
    }
    const step = document.querySelector('.learn-step');
    out.stepText = step.innerText.slice(0, 60);
    const p = Array.from(step.querySelectorAll('p, li')).find(x => x.innerText.trim().length > 60);
    out.pFound = !!p;
    if (!p) return out;
    const node = p.firstChild;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(50, String(node.textContent).length));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    out.selLen = String(sel).length;
    out.selContent = String(sel).slice(0, 40);
    // проверка гардов напрямую недоступна (IIFE), диспетчеризуем событие
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 300, clientY: 300 }));
    await new Promise(r => setTimeout(r, 200));
    out.fab = !!document.getElementById('lp3_note_fab');
    out.selAfter = String(window.getSelection()).length;
    return out;
  });
  console.log(JSON.stringify(dbg, null, 1));
  await browser.close();
})();
