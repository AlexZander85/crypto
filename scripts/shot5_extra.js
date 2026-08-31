// ===== Этап 5, скриншоты: конспект с кнопкой скачивания + недавние тесты в хабе =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.7.html';
const SHOT_DIR = '/home/z/my-project/download/скриншоты_этап5';

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // хаб с «Недавними тестами» (2 открытия тестов + заметки)
  await page.evaluate(async () => {
    localStorage.setItem('cn_learn_notes', JSON.stringify([
      { id: 'n1', lessonId: 'p0_l1', stepIdx: 0, quote: 'Криптовалюта — цифровые деньги на блокчейне', note: 'базовое определение', ts: Date.now() },
      { id: 'n2', lessonId: 'p1_l1', stepIdx: 1, quote: 'Маркетмейкер зарабатывает на спреде', note: '', ts: Date.now() - 1000 }
    ]));
    localStorage.removeItem('cn_learn_test');
    LearnPlayer.openTest('p1'); await new Promise(r => setTimeout(r, 350));
    try { LearnPlayer.close(); } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
    LearnPlayer.openTest('math_core'); await new Promise(r => setTimeout(r, 350));
    try { LearnPlayer.close(); } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
    LearnPlayer.openHome();
    await new Promise(r => setTimeout(r, 450));
    const s = document.getElementById('lp5_recent_tests');
    if (s) s.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot5_recent_tests.png') });
  await page.evaluate(() => { try { LearnPlayer.closeHome(); } catch (e) {} });
  await page.waitForTimeout(250);

  // панель конспекта с кнопкой скачивания
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(450);
  await page.evaluate(() => new Promise(r => setTimeout(() => {
    const tab = document.querySelector('[data-lp3-tab="notes"]');
    if (tab) tab.click();
    setTimeout(r, 300);
  }, 0)));
  await page.evaluate(() => { const m = document.querySelector('.learn-map'); if (m) m.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot5_notes_download.png') });
  await browser.close();
  console.log('screenshots done');
})().catch(e => { console.error('ERR', e); process.exit(2); });
