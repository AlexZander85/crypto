// tools/verify_terms_browser.mjs
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

console.log('--- Проверка работы глоссария и модалок терминов ---');

const termCount = await page.evaluate(() => {
  return typeof TERMS !== 'undefined' ? TERMS.length : (window.TERMS ? window.TERMS.length : 0);
});
console.log(`Всего терминов в TERMS: ${termCount}`);
if (termCount < 280) {
  console.error(`❌ ОШИБКА: ожидалось не менее 280 терминов, получено ${termCount}`);
  process.exit(1);
}

// Test opening term by name (e.g. "Дофамин" or "Альтернативные истории" or "Инверсия Хоугаарда")
const testTerms = [
  'Дофамин',
  'Островковая доля',
  'Тильт',
  'Альтернативные истории',
  'Инверсия Хоугаарда',
  'Brier Score',
  'Уровни убежденности',
  'Индикатор обложки журнала'
];

for (const termName of testTerms) {
  const result = await page.evaluate((name) => {
    window.openTermByName(name);
    const modal = document.getElementById('termModal');
    const title = document.getElementById('mTerm') ? document.getElementById('mTerm').innerText : '';
    const def = document.getElementById('mDef') ? document.getElementById('mDef').innerText : '';
    const ana = document.getElementById('mAna') ? document.getElementById('mAna').innerText : '';
    const why = document.getElementById('mWhy') ? document.getElementById('mWhy').innerText : '';
    const isOpen = modal && modal.classList.contains('open');
    return { isOpen, title, def, ana, why };
  }, termName);

  if (!result.isOpen || !result.title || !result.def) {
    console.error(`❌ ОШИБКА при открытии термина "${termName}":`, result);
    process.exit(1);
  } else {
    console.log(`✅ Термин "${result.title}" успешно открывается в модалке (Определение: ${result.def.slice(0, 40)}...)`);
  }
}

// Test clicking terms inside a psychology lesson view
await page.evaluate(() => {
  const lesson = LESSONS.find(x => x.id === 'ps_l9');
  go('lessons');
  renderLessonDetail(lesson);
});
await page.waitForTimeout(100);

const lessonTermsRendered = await page.evaluate(() => {
  const tags = document.querySelectorAll('#lessonContentBox .term-tag');
  return Array.from(tags).map(t => t.innerText.trim());
});

console.log('Термины в уроке П9:', lessonTermsRendered);

if (lessonTermsRendered.length === 0) {
  console.error('❌ ОШИБКА: в уроке П9 не отрендерились теги терминов!');
  process.exit(1);
}

// Click the first term tag in the lesson via DOM click
await page.evaluate(() => {
  const firstTag = document.querySelector('#lessonContentBox .term-tag');
  if (firstTag) firstTag.click();
});
await page.waitForTimeout(100);

const modalState = await page.evaluate(() => {
  const modal = document.getElementById('termModal');
  const title = document.getElementById('mTerm') ? document.getElementById('mTerm').innerText : '';
  const def = document.getElementById('mDef') ? document.getElementById('mDef').innerText : '';
  return { isOpen: modal && modal.classList.contains('open'), title, def };
});

if (!modalState.isOpen || !modalState.title || !modalState.def) {
  console.error('❌ Клик по тегу термина внутри урока не открыл модалку!', modalState);
  process.exit(1);
} else {
  console.log(`✅ Клик по тегу термина внутри урока успешно открыл модалку: "${modalState.title}" (Определение: ${modalState.def.slice(0, 40)}...)`);
}

await browser.close();

if (errors.length > 0) {
  console.error('Ошибки JavaScript:', errors);
  process.exit(1);
}

console.log('🎉 ВСЕ ПРОВЕРКИ ТЕРМИНОВ И ГЛОССАРИЯ УСПЕШНО ПРОЙДЕНЫ!');
