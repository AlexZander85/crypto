// ===== Этап 6, скриншоты: практикум внутри плеера + Фейнман с наставником =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.8.html';
const SHOT_DIR = '/home/z/my-project/download/скриншоты_этап6';

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('file://' + path.resolve(HTML) + '?mockai=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // 1) практикум внутри плеера (p0_l3 → firsttrade)
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l3');
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < 30; i++) {
      const cta = Array.from(document.querySelectorAll('.learn-content button')).find(b => /_goSim/.test(b.getAttribute('onclick') || ''));
      if (cta) { cta.click(); break; }
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    await new Promise(r => setTimeout(r, 500));
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot6_sim_overlay.png') });
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // 2) шаг Фейнмана с кнопкой наставника (p0_l1)
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < 40; i++) {
      const t = (document.querySelector('.learn-step-title') || {}).textContent || '';
      if (/Метод Фейнмана/i.test(t)) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    const ta = document.getElementById('feynman_input_p0_l1');
    if (ta) ta.value = 'Криптовалюта — это цифровые деньги в общей тетрадке (блокчейне), где каждый перевод проверяют тысячи участников, а не банк.';
    await new Promise(r => setTimeout(r, 150));
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot6_feynman_mentor.png') });
  await browser.close();
  console.log('screenshots done');
})().catch(e => { console.error('ERR', e); process.exit(2); });
