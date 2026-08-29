// tools/verify_app_browser.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('.');
const INDEX_V9 = path.join(ROOT, 'index_v9.html');

console.log('--- Запуск верификации index_v9.html в браузере ---');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', err => {
  errors.push(err.message);
  console.error('PAGE ERROR:', err.message);
});

page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('CONSOLE ERROR:', msg.text());
  }
});

await page.goto('file:///' + INDEX_V9.replace(/\\/g, '/'), { waitUntil: 'load' });

const psyCount = await page.evaluate(() => {
  return typeof PSY_LESSONS !== 'undefined' ? PSY_LESSONS.length : 0;
});
console.log(`Количество уроков в PSY_LESSONS: ${psyCount}`);

const totalLessons = await page.evaluate(() => {
  return typeof LESSONS !== 'undefined' ? LESSONS.length : 0;
});
console.log(`Всего уроков в приложении LESSONS: ${totalLessons}`);

const widgetsRegistered = await page.evaluate(() => {
  let count = 0;
  for (let i = 1; i <= 52; i++) {
    const fnName = Object.keys(window).find(k => k.startsWith(`PSY_render_widget_ps_l${i}`));
    if (fnName && typeof window[fnName] === 'function') count++;
  }
  return count;
});
console.log(`Зарегистрировано интерактивных виджетов психологии: ${widgetsRegistered} из 52`);

// Test rendering all 52 widgets in virtual containers
const renderResults = await page.evaluate(() => {
  const results = [];
  for (let i = 1; i <= 52; i++) {
    const div = document.createElement('div');
    div.id = `test_widget_${i}`;
    document.body.appendChild(div);
    const fnName = Object.keys(window).find(k => k.startsWith(`PSY_render_widget_ps_l${i}`));
    if (fnName && typeof window[fnName] === 'function') {
      try {
        window[fnName](div);
        const hasContent = div.children.length > 0;
        results.push({ i, ok: hasContent, title: div.querySelector('b')?.innerText || '—' });
      } catch (e) {
        results.push({ i, ok: false, error: e.message });
      }
    } else {
      results.push({ i, ok: false, error: 'function missing' });
    }
  }
  return results;
});

const failedWidgets = renderResults.filter(r => !r.ok);
if (failedWidgets.length > 0) {
  console.error('Ошибки рендеринга виджетов:', failedWidgets);
} else {
  console.log('✅ Все 52 интерактивных виджета успешно и безошибочно рендерятся в DOM!');
}

await browser.close();

if (errors.length > 0 || psyCount !== 52 || widgetsRegistered !== 52 || failedWidgets.length > 0 || totalLessons !== 178) {
  console.error('❌ ТЕСТ НЕ ПРОЙДЕН');
  process.exit(1);
}

console.log('🎉 ВСЕ ПРОВЕРКИ УСПЕШНО ПРОЙДЕНЫ!');
