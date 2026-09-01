// Проба: какие DOM-маркеры у тест-режима и урока в v13.0
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve('/home/z/my-project/download/index_v13.0.html'));
  await page.waitForTimeout(3200);

  const probe1 = await page.evaluate(() => {
    LearnPlayer.openTest('p0');
    return true;
  });
  await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => ({
    title: (document.querySelector('.learn-progress-title') || {}).textContent || null,
    label: (document.querySelector('.learn-progress-label') || {}).textContent || null,
    lp2q: document.querySelectorAll('[data-lp2-q]').length,
    rootText: (document.querySelector('.learn-root') || {}).innerText ? document.querySelector('.learn-root').innerText.slice(0, 150).replace(/\n/g, ' | ') : null,
    chip: (document.getElementById('trk_chip') || {}).textContent || null,
    pos: localStorage.getItem('cn_learn_pos')
  }));
  console.log('TEST MODE:', JSON.stringify(t1, null, 2));

  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(300);
  await page.evaluate(() => LearnPlayer.open('p3_l3'));
  await page.waitForTimeout(600);
  const t2 = await page.evaluate(() => ({
    title: (document.querySelector('.learn-progress-title') || {}).textContent || null,
    label: (document.querySelector('.learn-progress-label') || {}).textContent || null,
    chip: (document.getElementById('trk_chip') || {}).textContent || null,
    pos: JSON.parse(localStorage.getItem('cn_learn_pos') || '{}').lessonId
  }));
  console.log('LESSON MODE:', JSON.stringify(t2, null, 2));

  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(300);
  await page.evaluate(() => LearnPlayer.open('m_kelly_criterion'));
  await page.waitForTimeout(600);
  const t3 = await page.evaluate(() => ({
    chip: (document.getElementById('trk_chip') || {}).textContent || null,
    title: (document.querySelector('.learn-progress-title') || {}).textContent || null
  }));
  console.log('ELECTIVE MODE:', JSON.stringify(t3, null, 2));
  await browser.close();
})();
