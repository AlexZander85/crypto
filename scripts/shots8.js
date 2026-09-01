// Финальные скриншоты Этапа 8 для отчёта
const { chromium } = require('playwright');
const path = require('path');
const OUT = '/home/z/my-project/download/скриншоты_этап8';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v13.0.html'));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(3200);

  // 1. Хаб: Маршрут (спринт, свежий) + Библиотека
  await page.evaluate(() => LearnPlayer.openHome());
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/shot8_hub_route.png' });
  await page.evaluate(() => { document.querySelector('.learn-home-root .lp3-body').scrollTop = 99999; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/shot8_hub_library.png' });

  // 2. Хаб: программа по треку с вплетёнными
  await page.evaluate(() => {
    ['p0_l1','p0_l2','p0_l3','p0_l4','p0_l5'].forEach(id => { lessonsDone[id] = 1; });
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
  });
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(() => { LearnPlayer.openHome(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('#lp3_program_sec').scrollIntoView(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/shot8_program_track.png' });

  // 3. Финал с треком: предложения + следующий по треку (0.13 → MF-A1)
  await page.evaluate(async () => {
    const n = window.LearnPlayer._buildStepsFor('p0_l13').length;
    LearnPlayer.open('p0_l13', n - 1);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/shot8_finish_track.png' });

  // 4. Гейт-карточка на финале последнего урока стадии
  await page.evaluate(async () => {
    ['p0_l14','p0_l15','p0_l16','p0_l18','p0_l20'].forEach(id => { lessonsDone[id] = 1; });
    localStorage.setItem('cn_lessons', JSON.stringify(lessonsDone));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    const n = window.LearnPlayer._buildStepsFor('p0_l20').length;
    LearnPlayer.open('p0_l20', n - 1);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/shot8_gate_card.png' });

  // 5. Чип стадии в шапке плеера
  await page.evaluate(async () => { LearnPlayer.close(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => LearnPlayer.open('p3_l3'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/shot8_chip.png' });

  await browser.close();
  console.log('screenshots done');
})();
