// E2E §12.6: регистрация → слияние прогресса → второе устройство видит тот же прогресс.
// Запуск из saas/:  node test/e2e.mjs   (поднимает свой wrangler dev на :8788)
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright';

const PORT = 8788;
const BASE = `http://localhost:${PORT}`;
const SAAS = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const results = [];
let failed = 0;
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond });
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

// сборка SaaS-приложения из актуального исходника
execSync('node tools/build-app.mjs', { cwd: SAAS, stdio: 'pipe', shell: true });

const child = spawn('npx', ['wrangler', 'dev', '--port', String(PORT)], {
  cwd: SAAS, shell: true, stdio: 'pipe', detached: true, windowsHide: true
});

try {
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { const h = await fetch(BASE + '/api/health'); if (h.ok) { up = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  check('worker up', up);
  if (!up) throw new Error('no server');

  // статика отдаётся тем же воркером
  const page1 = await (await chromium.launch()).newContext().then(c => c.newPage());
  const resp = await page1.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('app served by worker', resp.status() === 200);

  // интеграционная панель появилась
  await page1.waitForSelector('#cn-cloud-panel', { timeout: 20000 });
  check('integration panel present', true);

  // ---- Устройство A: локальный прогресс ДО регистрации ----
  await page1.evaluate(() => {
    localStorage.setItem('cn_learned', JSON.stringify({ p0_l1: 1, p0_l2: 1 }));
    localStorage.setItem('cn_quiz', JSON.stringify({ best: 42 }));
  });
  await page1.click('#cn-cloud-panel button'); // открыть модалку входа
  await page1.waitForSelector('input[type=email]', { timeout: 10000 });
  const email = `e2e-${Date.now()}@example.com`;
  await page1.fill('input[type=email]', email);
  await page1.getByText('Получить ссылку').click();
  // dev-режим: fetch по dev_link внутри страницы → токен в localStorage
  await page1.waitForFunction(() => !!localStorage.getItem('cn_jwt'), undefined, { timeout: 15000 });
  check('device A: JWT stored after magic-link', true);

  // слияние: сервер получил локальный прогресс
  const serverState = await page1.evaluate(async () => {
    const r = await fetch('/api/progress', { headers: { authorization: 'Bearer ' + localStorage.getItem('cn_jwt') } });
    return (await r.json()).state;
  });
  check('device A: local progress merged to cloud', serverState?.cn_learned?.p0_l1 === 1 && serverState?.cn_quiz?.best === 42,
    JSON.stringify(serverState || {}).slice(0, 80));

  // ---- Устройство B: чистый контекст, тот же аккаунт ----
  const ctxB = await (await chromium.launch()).newContext();
  const pageB = await ctxB.newPage();
  await pageB.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageB.waitForSelector('#cn-cloud-panel', { timeout: 20000 });
  await pageB.click('#cn-cloud-panel button');
  await pageB.waitForSelector('input[type=email]', { timeout: 10000 });
  await pageB.fill('input[type=email]', email);
  await pageB.getByText('Получить ссылку').click();
  await pageB.waitForFunction(() => !!localStorage.getItem('cn_jwt'), undefined, { timeout: 15000 });
  // пулл+merge происходит автоматически после входа
  await pageB.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem('cn_learned') || '{}').p0_l1 === 1; } catch { return false; }
  }, undefined, { timeout: 15000 });
  const bLearned = await pageB.evaluate(() => JSON.parse(localStorage.getItem('cn_learned') || '{}'));
  check('device B: same progress pulled from cloud', bLearned.p0_l1 === 1 && bLearned.p0_l2 === 1,
    JSON.stringify(bLearned).slice(0, 80));

  // ---- Контент: версия манифеста + кэш паков (§12.1 MVP) ----
  await pageB.waitForFunction(() => !!localStorage.getItem('cn_content_version'), undefined, { timeout: 15000 });
  const cv = await pageB.evaluate(() => localStorage.getItem('cn_content_version'));
  check('content version stored', /^ru\.[0-9a-f]{8}$/.test(cv || ''), cv);
  const cached = await pageB.waitForFunction(async () => {
    const c = await caches.open('cn-content-v1');
    return (await c.keys()).length;
  }, undefined, { timeout: 15000 }).then(h => h.jsonValue());
  check('content packs cached offline', cached >= 1, `entries=${cached}`);

  await ctxB.close();
  await page1.context().close();
} catch (e) {
  check('suite completed', false, String(e?.message || e).slice(0, 200));
} finally {
  try { child.kill(); } catch {}
  try { if (child.pid) execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', shell: true }); } catch {}
}

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + failed} (${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
