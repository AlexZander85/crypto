// Приёмка лендинга (ФАЗА E): Playwright-проверки всех локалей.
// Запуск из D:\crypto:  node landing2/tools/verify.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIR = path.resolve(import.meta.dirname, '..');
const OUT = path.join(DIR, 'reports');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIR, p);
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4173, r));
console.log('server :4173');

const LOCALES = ['ru', 'en', 'es', 'pt'];
const PAGE = (l) => `http://localhost:4173/${l === 'ru' ? '' : l + '/'}index.html`;
const browser = await chromium.launch();
const results = [];
let fails = 0;

for (const lang of LOCALES) {
  // --- мобильный контекст 360px ---
  const m = await browser.newContext({ viewport: { width: 360, height: 780 }, locale: lang });
  const page = await m.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto(PAGE(lang), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // ошибки консоли ДО взаимодействий (тест формы ниже даст ожидаемый 404 /api/auth/register)
  const errCount = errors.length;

  // 1. горизонтальный скролл на 360px
  const hscroll360 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  // 2. JSON-LD валиден как JSON и содержит FAQPage
  const jsonldOk = await page.evaluate(() => {
    const el = document.querySelector('script[type="application/ld+json"]');
    if (!el) return false;
    try { const d = JSON.parse(el.textContent); return !!d['@graph'].find((x) => x['@type'] === 'FAQPage'); } catch { return false; }
  });

  // 3. модалка: пустой сабмит → ошибки инлайн (клик по видимой кнопке героя)
  await page.click('#top .js-signup');
  await page.click('#f-submit');
  const errShown = await page.evaluate(() => document.querySelector('#e-email').textContent.length > 0 && document.querySelector('#e-pass').textContent.length > 0);

  // 4. waitlist fallback (запрос к /api/auth/register падает — сервер отдаёт 404 html)
  await page.fill('#f-email', 'test@example.com');
  await page.fill('#f-pass', 'password123');
  await page.check('#f-consent');
  await page.click('#f-submit');
  await page.waitForTimeout(800);
  const waitlistShown = await page.evaluate(() => {
    const m = document.querySelector('#f-msg');
    return m.classList.contains('warn') && m.textContent.includes('№1');
  });
  await page.keyboard.press('Escape');

  // 5. FAQ открывается
  await page.evaluate(() => { document.querySelector('#faq').scrollIntoView(); });
  await page.click('#faq details summary');
  const faqOpen = await page.evaluate(() => document.querySelector('#faq details').open);

  // скриншот мобайл (полная страница)
  await page.screenshot({ path: path.join(OUT, `${lang}-mobile-360.png`), fullPage: true });

  // метрики загрузки
  const metrics = await page.evaluate(() => new Promise((res) => {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      res({ lcpMs: Math.round(lcp.startTime), cls: Math.round(window.__cls * 100) / 100 });
    });
    window.__cls = window.__cls || 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res({ lcpMs: -1, cls: -1 }), 3000);
  }));

  const mobChecks = { hscroll360, jsonldOk, errShown, waitlistShown, faqOpen, errors: errCount };
  await m.close();

  // --- десктопный контекст 1366px ---
  const d = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: lang });
  const dp = await d.newPage();
  await dp.goto(PAGE(lang), { waitUntil: 'networkidle' });
  await dp.waitForTimeout(600);
  const hscrollD = await dp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await dp.screenshot({ path: path.join(OUT, `${lang}-desktop-1366.png`), fullPage: true });
  await d.close();

  const row = { lang, ...mobChecks, hscrollDesktop: hscrollD, ...metrics };
  results.push(row);
  const bad = row.hscroll360 || !row.jsonldOk || !row.errShown || !row.waitlistShown || !row.faqOpen || row.errors > 0 || row.hscrollDesktop;
  if (bad) fails++;
  console.log(JSON.stringify(row));
}

// --- happy-path регистрации с моком API (на корневой странице) ---
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();
let redirected = null;
await pg.route('**/api/auth/register', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
pg.on('framenavigated', (f) => { redirected = f.url(); });
await pg.goto(PAGE('ru'), { waitUntil: 'domcontentloaded' });
await pg.click('.js-signup');
await pg.fill('#f-email', 'happy@example.com');
await pg.fill('#f-pass', 'password123');
await pg.check('#f-consent');
await pg.click('#f-submit');
await pg.waitForTimeout(1200);
const happyRedirectedToApp = !!(redirected && redirected.includes('welcome=phase0'));
console.log(JSON.stringify({ happyRedirectedToApp, redirected }));
if (!happyRedirectedToApp) fails++;
await ctx.close();

await browser.close();
server.close();
fs.writeFileSync(path.join(OUT, 'verify-results.json'), JSON.stringify(results, null, 2));
console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\nFAILURES: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
