// A11y-аудит (axe-core) + клавиатурная навигация модалки. Запуск: node landing2/tools/a11y.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require_ = createRequire(import.meta.url);
const axeSrc = fs.readFileSync(require_.resolve('axe-core/axe.min.js'), 'utf8');

const DIR = path.resolve(import.meta.dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIR, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4176, r));

const browser = await chromium.launch();
let critical = 0;

for (const lang of ['ru', 'en', 'es', 'pt']) {
  const url = `http://localhost:4176/${lang === 'ru' ? '' : lang + '/'}index.html`;
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // прокрутка до низа: демо-стакан и lazy-контент должны отрендериться до аудита
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const crit = res.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  critical += crit.length;
  console.log(lang + ': violations=' + res.violations.length + ' critical/serious=' + crit.length +
    (crit.length ? ' :: ' + crit.map((v) => v.id + '(' + v.nodes.length + ')').join(',') : ''));
  if (crit.length) for (const v of crit) console.log('   ' + v.id + ': ' + v.help + ' → ' + v.nodes[0].html.slice(0, 120));

  // клавиатура: добраться до кнопки героя табом, открыть модалку, Tab внутрь, Esc закрыть
  let reached = false;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const cls = await page.evaluate(() => String(document.activeElement.className));
    if (cls.includes('js-signup')) { reached = true; break; }
  }
  if (reached) {
    await page.keyboard.press('Enter');
    const opened = await page.evaluate(() => document.querySelector('#signup').open);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const inModal = await page.evaluate(() => !!document.activeElement.closest('dialog'));
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !document.querySelector('#signup').open);
    console.log('  keyboard: open=' + opened + ' focusInside=' + inModal + ' escClose=' + closed);
    if (!opened || !inModal || !closed) critical++;
  } else {
    console.log('  keyboard: js-signup button not reached in 10 tabs');
    critical++;
  }
  await page.close();
}

await browser.close();
server.close();
console.log(critical === 0 ? '\nA11Y: 0 critical/serious violations, keyboard OK' : `\nA11Y FAILURES: ${critical}`);
process.exit(critical === 0 ? 0 : 1);
