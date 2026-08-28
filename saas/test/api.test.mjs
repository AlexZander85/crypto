// Приёмочный тест-сьют SaaS API (§12.6): гоняет wrangler dev (локальные D1/KV/R2) и проверяет
// полный контур: auth → me → progress → content-гейтинг → grant → вебхук LS с подписью и реплеем.
// Запуск: node test/api.test.mjs   (из папки saas/)
import { spawn, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const PORT = 8787;
const BASE = `http://localhost:${PORT}`;
const results = [];
let failed = 0;

function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond, extra });
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
}

const hmac = (secret, msg) => crypto.createHmac('sha256', secret).update(msg).digest('hex');

// ---- запуск wrangler dev ----
console.log('booting wrangler dev (local D1/KV/R2)…');
execSync('npx wrangler d1 migrations apply DB --local', { cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'pipe', shell: true });
const child = spawn('npx', ['wrangler', 'dev', '--port', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  shell: true, stdio: 'pipe', detached: true, windowsHide: true
});

const api = async (path, opts = {}) => {
  const r = await fetch(BASE + path, opts);
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body, headers: r.headers };
};

try {
  // ждём готовности
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { const h = await fetch(BASE + '/api/health'); if (h.ok) { up = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  check('worker is up', up);
  if (!up) throw new Error('wrangler dev не поднялся');

  // 1. health
  const health = await api('/api/health');
  check('health ok', health.status === 200 && health.body?.ok === true);

  // 2. magic-request (dev: ссылка в ответе, письма нет)
  const email = `test-${Date.now()}@example.com`;
  const mr = await api('/api/auth/magic-request', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email })
  });
  check('magic-request returns dev_link in dev', mr.status === 200 && typeof mr.body?.dev_link === 'string', `sent=${mr.body?.sent}`);

  // 3. невалидная почта
  const bad = await api('/api/auth/magic-request', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nope' })
  });
  check('magic-request rejects invalid email', bad.status === 400);

  // 4. magic-confirm → JWT
  const link = new URL(mr.body.dev_link);
  const mc = await api(link.pathname + link.search);
  check('magic-confirm issues JWT', mc.status === 200 && typeof mc.body?.token === 'string');
  const jwt = mc.body.token;
  const userId = mc.body.user?.id;
  check('new user is free tier', mc.body?.user?.tier === 'free');

  // 5. повторное подтверждение токена — уже использован
  const mc2 = await api(link.pathname + link.search);
  check('magic token is single-use', mc2.status === 400);

  // 6. /api/me
  const me = await api('/api/me', { headers: { authorization: `Bearer ${jwt}` } });
  check('me returns id+tier', me.status === 200 && me.body?.id === userId && me.body?.tier === 'free');
  const meNoAuth = await api('/api/me');
  check('me requires JWT', meNoAuth.status === 401);

  // 7. progress PUT/GET + stale-защита
  const put = await api('/api/progress', {
    method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ state: { cn_learned: { p0_l1: 1 } }, app_version: 'v7-test' })
  });
  check('progress put ok', put.status === 200 && put.body?.ok === true);
  const get = await api('/api/progress', { headers: { authorization: `Bearer ${jwt}` } });
  check('progress get roundtrip', get.body?.state?.cn_learned?.p0_l1 === 1 && get.body?.app_version === 'v7-test');
  const stale = await api('/api/progress', {
    method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ state: { x: 1 }, client_updated_at: 1 })
  });
  check('stale progress skipped', stale.body?.skipped === 'stale');

  // 8. content: манифест гостя и free-юзера — только demo; версия из content/manifest.json
  const mfGuest = await api('/api/content/manifest?locale=ru');
  check('guest manifest = demo only', mfGuest.body?.packs?.length === 1 && mfGuest.body?.packs?.[0]?.demo === true);
  const mfFree = await api('/api/content/manifest?locale=ru', { headers: { authorization: `Bearer ${jwt}` } });
  check('free manifest = demo only', mfFree.body?.packs?.length === 1);
  const manifestFile = JSON.parse(fs.readFileSync(new URL('../content/manifest.json', import.meta.url), 'utf8'));
  check('manifest version from generated manifest.json', mfGuest.body?.version === manifestFile.version,
    `api=${mfGuest.body?.version} file=${manifestFile.version}`);
  check('pack versions present (per-pack cache keys)', typeof mfGuest.body?.packs?.[0]?.version === 'string' && mfGuest.body?.packs?.[0]?.version.length === 12);

  // 9. демо-пак отдаётся, платный закрыт
  const demoPack = await api('/api/content/pack/ru/core_demo');
  check('demo pack public with real lessons', demoPack.status === 200 && demoPack.body?.meta?.demo === true && demoPack.body?.lessons?.length === 52,
    `status=${demoPack.status} lessons=${demoPack.body?.lessons?.length}`);
  const paidNoAuth = await api('/api/content/pack/ru/core_p1');
  check('paid pack 401 without JWT', paidNoAuth.status === 401);
  const paidFree = await api('/api/content/pack/ru/core_p1', { headers: { authorization: `Bearer ${jwt}` } });
  check('paid pack 403 on free tier', paidFree.status === 403);

  // 10. admin: без секрета 401, с секретом 200
  const admNo = await api('/admin/api/overview');
  check('admin requires secret', admNo.status === 401);
  const adm = await api('/admin/api/overview?days=30', { headers: { authorization: 'Bearer dev-only-admin' } });
  check('admin overview works', adm.status === 200 && typeof adm.body?.users_total === 'number' && adm.body.users_total >= 1);
  check('telemetry signup counted', adm.body?.signups >= 1, `signups=${adm.body?.signups}`);

  // 11. grant_tier → доступ к платному паку с водяным знаком
  const grant = await api('/admin/api/grant_tier', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' },
    body: JSON.stringify({ user_id: userId, tier: 'lite', reason: 'test' })
  });
  check('grant_tier ok', grant.status === 200);
  const me2 = await api('/api/me', { headers: { authorization: `Bearer ${jwt}` } });
  // JWT старый — tier в токене free, но /api/me читает БД: ожидаем lite из БД
  check('tier updated in db', me2.body?.tier === 'lite');
  const mfPaid = await api('/api/content/manifest?locale=ru', { headers: { authorization: `Bearer ${jwt}` } });
  check('paid manifest opens after grant', mfPaid.body?.packs?.length >= 3, `packs=${mfPaid.body?.packs?.length}`);

  // 11b. платный пак после гранта: фаза 1 (12 уроков) + пер-пользовательский водяной знак (§22.1.3)
  const paidLite = await api('/api/content/pack/ru/core_p1', { headers: { authorization: `Bearer ${jwt}` } });
  check('paid phase pack with watermark after grant', paidLite.status === 200 && paidLite.body?.lessons?.length === 12 && paidLite.body?.meta?.wm === userId,
    `status=${paidLite.status} lessons=${paidLite.body?.lessons?.length}`);

  // 12. вебхук Lemon Squeezy: подпись обязательна
  const lsBody = JSON.stringify({
    meta: { event_name: 'order_created', custom_data: { user_id: userId } },
    data: { id: 'ord_' + Date.now(), attributes: { total: 1200, currency: 'usd' } }
  });
  const lsNoSig = await api('/api/pay/lemonsqueezy/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: lsBody
  });
  check('LS webhook rejects bad signature', lsNoSig.status === 401);
  const sig = hmac('dev-only-ls', lsBody);
  const lsOk = await api('/api/pay/lemonsqueezy/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body: lsBody
  });
  check('LS webhook accepted', lsOk.status === 200 && lsOk.body?.duplicate === false);
  const lsReplay = await api('/api/pay/lemonsqueezy/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body: lsBody
  });
  check('LS webhook idempotent on replay', lsReplay.body?.duplicate === true);

  // 13. feedback
  const fb = await api('/api/feedback', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ lesson_id: 'p0_l1', score: 5, comment: 'тест' })
  });
  check('feedback accepted', fb.status === 200 && fb.body?.ok === true);

  // 14. крипто-оплата: инвойс без MERCHANT_ID → 501; вебхук — подпись обязательна
  const inv = await api('/api/pay/crypto/invoice', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ tier: 'lite' })
  });
  check('crypto invoice 501 without merchant', inv.status === 501 && inv.body?.error === 'not_configured');
  const invNoAuth = await api('/api/pay/crypto/invoice', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier: 'lite' })
  });
  check('crypto invoice requires JWT', invNoAuth.status === 401);

  // sign передаётся ВНУТРИ JSON-тела (контракт Cryptomus), не в заголовке
  const cwPayload = { uuid: 'unknown-uuid', order_id: 'cn-x', status: 'paid', amount: '12.00' };
  const cwRaw = JSON.stringify(cwPayload);
  const cwNoSig = await api('/api/pay/crypto/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: cwRaw
  });
  check('crypto webhook rejects missing signature', cwNoSig.status === 401);
  const cwBadSig = await api('/api/pay/crypto/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...cwPayload, sign: 'deadbeef' })
  });
  check('crypto webhook rejects bad signature', cwBadSig.status === 401);
  const cwSig = crypto.createHash('md5')
    .update(Buffer.from(cwRaw).toString('base64') + 'dev-only-crypto')
    .digest('hex');
  const cwUnknown = await api('/api/pay/crypto/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...cwPayload, sign: cwSig })
  });
  // подпись верна → прошли гейт → неизвестная покупка честно 404
  check('crypto webhook signature gate works', cwUnknown.status === 404 && cwUnknown.body?.error === 'unknown_purchase',
    `status=${cwUnknown.status} body=${JSON.stringify(cwUnknown.body)}`);

} catch (e) {
  check('suite completed', false, String(e?.message || e).slice(0, 200));
} finally {
  try { child.kill(); } catch {}
  try { if (child.pid) execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', shell: true }); } catch {}
}

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + failed} (${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
