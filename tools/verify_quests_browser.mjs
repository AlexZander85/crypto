// tools/verify_quests_browser.mjs
import { chromium } from 'playwright';
import path from 'node:path';

const HTML_PATH = path.resolve('index.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', err => {
  errors.push(err.message);
  console.error('PAGE ERROR:', err.message);
});

await page.goto('file:///' + HTML_PATH.replace(/\\/g, '/'), { waitUntil: 'load' });

console.log('--- Проверка навигации и хаба квестов ---');

// 1. Check nav bar
const navTabs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('nav .tab')).map(t => ({
    tab: t.dataset.tab,
    text: t.innerText.trim()
  }));
});
console.log('Элементы верхней панели:', navTabs.map(t => t.text).join(' | '));

const questTab = navTabs.find(t => t.tab === 'quests');
if (!questTab) {
  console.error('❌ ОШИБКА: вкладка "quests" не найдена в nav!');
  process.exit(1);
}

// 2. Click Quests Tab
await page.click('button[data-tab="quests"]');
await page.waitForTimeout(100);

const questsGridCards = await page.evaluate(() => {
  const grid = document.getElementById('quests_cards_grid');
  return grid ? grid.children.length : 0;
});
console.log(`Карточек квестов в хабе: ${questsGridCards} из 9`);

if (questsGridCards !== 9) {
  console.error('❌ ОШИБКА: в хабе квестов должно быть ровно 9 карточек!');
  process.exit(1);
}

// 3. Test entering and rendering each of the 9 quests
const questViews = [
  { id: 'quest', boxId: 'sq_box', name: 'Криптик против Мошенника' },
  { id: 'psyquest', boxId: 'pq_box', name: 'Семь дней' },
  { id: 'panicquest', boxId: 'pn_box', name: 'Симулятор паники' },
  { id: 'marginquest', boxId: 'mc_box', name: 'Маржин-колл' },
  { id: 'curvequest', boxId: 'cv_box', name: 'Кривая-обманщица' },
  { id: 'yieldquest', boxId: 'yh_box', name: 'Охотник за доходностью' },
  { id: 'firstquest', boxId: 'fm_box', name: 'Первые деньги' },
  { id: 'launchquest', boxId: 'ln_box', name: 'Первый запуск' },
  { id: 'prodquest', boxId: 'pr_box', name: 'Ночь в проде' }
];

for (const q of questViews) {
  await page.evaluate((viewId) => {
    window.go(viewId);
  }, q.id);
  await page.waitForTimeout(50);

  const boxContent = await page.evaluate((bId) => {
    const el = document.getElementById(bId);
    return el ? el.innerText.trim() : '';
  }, q.boxId);

  if (!boxContent || boxContent.length < 20) {
    console.error(`❌ Квест ${q.name} (${q.id}) ПУСТОЙ! Контент: "${boxContent}"`);
    process.exit(1);
  } else {
    console.log(`✅ Квест "${q.name}" (${q.id}) успешно отрисован (${boxContent.length} символов)`);
  }
}

// 4. Test back to quests hub from one of the quests
await page.evaluate(() => {
  window.qBack();
});
await page.waitForTimeout(50);

const isQuestsActive = await page.evaluate(() => {
  const sec = document.getElementById('quests');
  return sec && sec.classList.contains('active');
});

if (isQuestsActive) {
  console.log('✅ Кнопка "← К квестам" корректно возвращает в хаб квестов!');
} else {
  console.error('❌ Кнопка возврата не вернула в секцию quests!');
  process.exit(1);
}

await browser.close();

if (errors.length > 0) {
  console.error('Ошибки JavaScript во время теста:', errors);
  process.exit(1);
}

console.log('🎉 ВСЕ ПРОВЕРКИ КВЕСТОВ И НАВИГАЦИИ УСПЕШНО ПРОЙДЕНЫ!');
