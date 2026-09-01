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
const SAAS_DIR = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
// Стадия 1: свежие паки → локальные R2/KV перед прогоном (воспроизводимость в чистом клоне)
execSync('node tools/upload-packs.mjs --local', { cwd: SAAS_DIR, stdio: 'pipe', shell: true });
execSync('npx wrangler d1 migrations apply DB --local', { cwd: SAAS_DIR, stdio: 'pipe', shell: true });
const child = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--config', 'wrangler.test.jsonc'], {
  cwd: SAAS_DIR,
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

  // 8. content: манифест гостя и free-юзера — только демо-паки (core_demo + books, §4.2)
  const mfGuest = await api('/api/content/manifest?locale=ru');
  check('guest manifest = demo packs only', mfGuest.body?.packs?.length === 2 && mfGuest.body?.packs?.every(p => p.demo === true),
    `packs=${mfGuest.body?.packs?.length}`);
  const mfFree = await api('/api/content/manifest?locale=ru', { headers: { authorization: `Bearer ${jwt}` } });
  check('free manifest = demo packs only', mfFree.body?.packs?.length === 2);
  const manifestFile = JSON.parse(fs.readFileSync(new URL('../content/manifest.json', import.meta.url), 'utf8'));
  check('manifest version from generated manifest.json', mfGuest.body?.version === manifestFile.version,
    `api=${mfGuest.body?.version} file=${manifestFile.version}`);
  check('pack versions present (per-pack cache keys)', typeof mfGuest.body?.packs?.[0]?.version === 'string' && mfGuest.body?.packs?.[0]?.version.length === 12);

  // 9. демо-пак отдаётся с реальным контентом v12.9 (Ф0 = 20 + П1–П8 = 8), платный закрыт
  const demoPack = await api('/api/content/pack/ru/core_demo');
  check('demo pack public with real v12.9 lessons', demoPack.status === 200 && demoPack.body?.meta?.demo === true && demoPack.body?.registers?.LESSONS?.length === 20 && demoPack.body?.registers?.PSY_LESSONS?.length === 8,
    `status=${demoPack.status} lessons=${demoPack.body?.registers?.LESSONS?.length} psy=${demoPack.body?.registers?.PSY_LESSONS?.length}`);
  const booksPack = await api('/api/content/pack/ru/books');
  check('books pack free (витрина RAG)', booksPack.status === 200 && booksPack.body?.registers?.BOOKS?.length === 10);
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
  check('paid phase pack with watermark after grant', paidLite.status === 200 && paidLite.body?.registers?.LESSONS?.length === 12 && paidLite.body?.meta?.wm === userId,
    `status=${paidLite.status} lessons=${paidLite.body?.registers?.LESSONS?.length}`);
  // 11c. полный платный манифест = все паки v12.9 (15)
  const mfPaidAll = await api('/api/content/manifest?locale=ru', { headers: { authorization: `Bearer ${jwt}` } });
  check('paid manifest = all 15 packs', mfPaidAll.body?.packs?.length === 15, `packs=${mfPaidAll.body?.packs?.length}`);
  const p9 = await api('/api/content/pack/ru/core_p9', { headers: { authorization: `Bearer ${jwt}` } });
  check('FT pack: 27 lessons + 27 labs', p9.status === 200 && p9.body?.registers?.FT?.length === 27 && Object.keys(p9.body?.registers?.V11_FT_LABS || {}).length === 27);
  const p8 = await api('/api/content/pack/ru/core_p8', { headers: { authorization: `Bearer ${jwt}` } });
  check('psy pack: П9–П26 + П27–П56', p8.status === 200 && p8.body?.registers?.PSY_LESSONS?.length === 18 && p8.body?.registers?.PSY_LESSONS_2?.length === 30);
  const testsPack = await api('/api/content/pack/ru/tests', { headers: { authorization: `Bearer ${jwt}` } });
  check('tests pack: 6 фаз + 3 мат + capstone 30 + psy_cum 21', testsPack.status === 200 && testsPack.body?.registers?.PHASE_TESTS?.length === 6 && testsPack.body?.registers?.MATH_TESTS?.length === 3 && testsPack.body?.registers?.CAPSTONE_EXAM?.questions?.length === 30 && testsPack.body?.registers?.PSY_CUMULATIVE_QUESTIONS?.length === 21);

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
  const prices = await api('/api/pay/prices');
  check('pay/prices отдаёт витрину тарифов', prices.status === 200 && prices.body?.tiers?.lite && prices.body?.tiers?.pro && prices.body?.tiers?.max
    && prices.body?.tiers?.lite?.pay?.yookassa === true);
  const ykCreateNoAuth = await api('/api/pay/yookassa/create', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier: 'lite' })
  });
  check('yookassa/create требует JWT', ykCreateNoAuth.status === 401);
  const ykCreate = await api('/api/pay/yookassa/create', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` }, body: JSON.stringify({ tier: 'lite' })
  });
  check('yookassa/create без SHOP_ID честно 501', ykCreate.status === 501 && ykCreate.body?.error === 'not_configured');
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

  // 15. наставник §10/§19.4 (dev-фикстура MENTOR_MOCK_MODEL): лимиты free 3/день, фильтр, вердикт
  const mentorReq = (body, token) => api('/api/mentor/ask', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const dev = 'dev-' + Date.now();
  // гость по deviceId: 3 вопроса ок, 4-й → 402
  const g1 = await mentorReq({ action: 'hint', lessonId: 'p0_l1', deviceId: dev, lessonText: 'урок', payload: {} });
  check('mentor guest: 1-й вопрос ok', g1.status === 200 && typeof g1.body?.text === 'string', `status=${g1.status}`);
  await mentorReq({ action: 'hint', lessonId: 'p0_l1', deviceId: dev, lessonText: 'урок' });
  await mentorReq({ action: 'hint', lessonId: 'p0_l1', deviceId: dev, lessonText: 'урок' });
  const g4 = await mentorReq({ action: 'hint', lessonId: 'p0_l1', deviceId: dev, lessonText: 'урок' });
  check('mentor guest: 4-й вопрос → 402 (лимит free 3/день)', g4.status === 402 && g4.body?.error === 'limit', `status=${g4.status}`);
  // без deviceId и без JWT → 401
  const mNoAuth = await mentorReq({ action: 'hint', lessonId: 'p0_l1' });
  check('mentor без JWT и deviceId → 401', mNoAuth.status === 401);
  // новый email (fresh user) с JWT: feynman-вердикт в формате json
  const emailM = `mentor-${Date.now()}@example.com`;
  const mr2 = await api('/api/auth/magic-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: emailM }) });
  const mcM = await api(new URL(mr2.body.dev_link).pathname + new URL(mr2.body.dev_link).search, { headers: { accept: 'application/json' } });
  const jwt2 = mcM.body.token;
  const uid2 = mcM.body.user?.id;
  const fj = await mentorReq({ action: 'feynman', lessonId: 'p0_l1', lessonText: 'урок', payload: { explanation: 'объяснение' } }, jwt2);
  check('feynman: verdict json (partial/advice/gaps)', fj.status === 200 && fj.body?.json?.verdict === 'partial' && typeof fj.body?.json?.advice === 'string' && Array.isArray(fj.body?.json?.gaps),
    JSON.stringify(fj.body?.json || {}));
  // выходной фильтр: banned-фраза в ответе модели заменяется
  const fl = await mentorReq({ action: 'rephrase', lessonId: 'p0_l1', lessonText: '__TEST_FILTER__' }, jwt2);
  check('серверный фильтр: banned → замена', fl.status === 200 && !String(fl.body?.text || '').toLowerCase().includes('покупай') && String(fl.body?.text || '').includes('материале урока'),
    String(fl.body?.text || '').slice(0, 50));
  // лимит free для этого пользователя: уже 2 запроса → до 3-го ок, 4-й 402
  await mentorReq({ action: 'hint', lessonId: 'p0_l1', lessonText: 'урок' }, jwt2);
  const m4 = await mentorReq({ action: 'hint', lessonId: 'p0_l1', lessonText: 'урок' }, jwt2);
  check('mentor user: 4-й вопрос → 402', m4.status === 402, `status=${m4.status}`);
  // admin ai_model: 401 без секрета; bad sku 400; смена ок и в audit
  const amNo = await api('/admin/api/ai_model');
  check('admin ai_model требует секрет', amNo.status === 401);
  const amBad = await api('/admin/api/ai_model', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' }, body: JSON.stringify({ sku: 'nope' }) });
  check('admin ai_model bad sku → 400', amBad.status === 400);
  const amOk = await api('/admin/api/ai_model', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' }, body: JSON.stringify({ sku: 'cf-glm-4.7-flash' }) });
  check('admin ai_model смена ок', amOk.status === 200 && amOk.body?.ok === true);
  const amGet = await api('/admin/api/ai_model', { headers: { authorization: 'Bearer dev-only-admin' } });
  check('admin ai_model GET отражает смену', amGet.status === 200 && amGet.body?.sku === 'cf-glm-4.7-flash');
  // смена модели в admin_actions
  const admAudit = await api('/admin/api/overview?days=30', { headers: { authorization: 'Bearer dev-only-admin' } });
  check('telemetry/audit живы после mentor', admAudit.status === 200);

  // 15b. дашборд «Нейроны»: usage ловится из ответов наставника и пишется в D1
  const nrNo = await api('/admin/api/neurons');
  check('admin neurons требует секрет', nrNo.status === 401);
  await new Promise(r => setTimeout(r, 2000)); // запись через waitUntil — даём догореть
  const nr = await api('/admin/api/neurons?days=7', { headers: { authorization: 'Bearer dev-only-admin' } });
  check('admin neurons: лимит 10000 и остаток', nr.status === 200 && nr.body?.limit === 10000 && typeof nr.body?.remaining === 'number',
    `limit=${nr.body?.limit} remaining=${nr.body?.remaining}`);
  check('admin neurons: расход после mentor-вызовов > 0', (nr.body?.today?.neurons || 0) > 0 && (nr.body?.today?.requests || 0) >= 6,
    `neurons=${nr.body?.today?.neurons} requests=${nr.body?.today?.requests}`);
  check('admin neurons: by_model с тарифами и средней ценой', Array.isArray(nr.body?.by_model) && nr.body.by_model.length >= 1
    && typeof nr.body.by_model[0].avg_neurons === 'number' && nr.body.by_model[0].avg_neurons > 0
    && nr.body.by_model[0].neurons > 0 && typeof nr.body.by_model[0].tasks_left === 'number',
    JSON.stringify(nr.body?.by_model?.[0] || {}));
  check('admin neurons: avg_per_task и tasks_left согласованы', typeof nr.body?.avg_per_task === 'number' && nr.body.avg_per_task > 0
    && nr.body?.tasks_left > 0 && nr.body.tasks_left <= 10000,
    `avg=${nr.body?.avg_per_task} tasks_left=${nr.body?.tasks_left}`);
  check('admin neurons: тарифы всех 5 моделей в ответе', nr.body?.pricing && Object.keys(nr.body.pricing).length === 5
    && nr.body.pricing['cf-glm-5.3-flash'].in === 13636 && nr.body.pricing['cf-deepseek-v4-flash'].out === 120000);
  check('mentor: _neurons в ответе наставника', typeof g1.body?._neurons === 'object' && g1.body._neurons.neurons >= 0
    && ['cf-glm-5.3-flash', 'cf-glm-4.7-flash', 'cf-deepseek-v4-flash'].includes(g1.body._neurons.model),
    JSON.stringify(g1.body?._neurons || {}));

  // 16. живой рынок §11: гейтинг ДО обращения к внешним источникам
  const lvPaid = await api('/api/live/orderbook');
  check('live: гость orderbook → 402 (гейтинг)', lvPaid.status === 402 && lvPaid.body?.error === 'payment_required');
  const lvLite = await api('/api/live/klines', { headers: { authorization: `Bearer ${jwt}` } });
  check('live: lite klines → 402 (upsell pro)', lvLite.status === 402 && lvLite.body?.upsell === 'pro');
  const lvFree = await api('/api/live/fng');
  check('live: гость fng (витрина) — не 402/403', lvFree.status === 200 || lvFree.status === 502, `status=${lvFree.status} (upstream: ${lvFree.status === 502 ? 'недоступен' : 'ok'})`);
  // pro-пользователь: грант + полный доступ (если upstream доступен из песочницы — 200)
  await api('/admin/api/grant_tier', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' }, body: JSON.stringify({ user_id: userId, tier: 'pro', reason: 'test-live' }) });
  const lvPro = await api('/api/live/btc-fees', { headers: { authorization: `Bearer ${jwt}` } });
  check('live: pro btc-fees — не 402', lvPro.status !== 402, `status=${lvPro.status}`);

  // 17. серверный RAG §10.3: BM25 по 302 атомам, provenance в ответе
  // (у jwt2 квота free исчерпана шагом ранее — поднимаем до pro, лимит 10/день)
  await api('/admin/api/grant_tier', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' }, body: JSON.stringify({ user_id: uid2, tier: 'pro', reason: 'test-rag' }) });
  const rg = await mentorReq({ action: 'rag', lessonId: 'ps_l1', lessonText: '', payload: { __rag: 1, query: 'страх сделки и вероятностное мышление' } }, jwt2);
  check('RAG: ответ с provenance-источниками', rg.status === 200 && Array.isArray(rg.body?.rag?.sources) && rg.body.rag.sources.length > 0,
    `sources=${JSON.stringify((rg.body?.rag?.sources || []).slice(0, 1))}`);

  // 18. админка §13: полный API — 401 без секрета, маски, карточка, удаление GDPR
  const authH = { authorization: 'Bearer dev-only-admin' };
  const usersL = await api('/admin/api/users', { headers: authH });
  check('admin users: список с масками', usersL.status === 200 && usersL.body?.users?.length >= 1 && String(usersL.body.users[0].email_masked).includes('***'),
    JSON.stringify(usersL.body?.users?.[0] || {}));
  const uc = await api('/admin/api/user/' + uid2, { headers: authH });
  check('admin user: карточка с платежами/LTV', uc.status === 200 && uc.body?.id === uid2 && typeof uc.body?.ltv_minor === 'number' && uc.body?.email_masked?.includes('***'));
  const ucNo = await api('/admin/api/user/' + uid2);
  check('admin user без секрета → 401', ucNo.status === 401);
  const au = await api('/admin/api/ai_usage?days=30', { headers: authH });
  check('admin ai_usage: фичи и фильтрации', au.status === 200 && typeof au.body?.total_calls === 'number' && Array.isArray(au.body?.by_feature));
  const cf = await api('/admin/api/content_funnel', { headers: authH });
  check('admin content_funnel: ок', cf.status === 200);
  const cp = await api('/admin/api/content_packs', { headers: authH });
  check('admin content_packs: 15 паков', cp.status === 200 && cp.body?.packs?.length === 15, `packs=${cp.body?.packs?.length}`);
  // удаление GDPR: стирает пользователя, покупки остаются анонимными
  const delEmail = `del-${Date.now()}@example.com`;
  const dr = await api('/api/auth/magic-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: delEmail }) });
  const dc = await api(new URL(dr.body.dev_link).pathname + new URL(dr.body.dev_link).search, { headers: { accept: 'application/json' } });
  const delUid = dc.body.user.id;
  await api('/api/progress', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${dc.body.token}` }, body: JSON.stringify({ state: { cn_learned: { p0_l1: 1 } } }) });
  const del = await api('/admin/api/delete_user', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-only-admin' }, body: JSON.stringify({ user_id: delUid }) });
  check('admin delete_user: ok', del.status === 200 && del.body?.ok === true);
  const meDel = await api('/api/me', { headers: { authorization: `Bearer ${dc.body.token}` } });
  check('после удаления: JWT недействителен (пользователь стёрт)', meDel.status === 401);
  const acts = await api('/admin/api/actions', { headers: authH });
  check('admin actions: audit-лог пишется', acts.status === 200 && acts.body?.actions?.length >= 1);

  // 19. cron scheduled: свёртка stats_daily пишется и читается (§12.2)
  // (вызываем scheduled напрямую через dev-роут /admin/api/cron-run — только ENV=dev)
  const cronRun = await api('/admin/api/cron-run', { method: 'POST', headers: authH });
  check('cron-run: свёртка выполнена', cronRun.status === 200 && cronRun.body?.ok === true, JSON.stringify(cronRun.body || {}));
  const cronStats = await api('/admin/api/stats?days=7', { headers: authH });
  check('admin stats: свёртка читается', cronStats.status === 200 && typeof cronStats.body?.days === 'object' && Object.keys(cronStats.body.days).length > 0);

} catch (e) {
  check('suite completed', false, String(e?.message || e).slice(0, 200));
} finally {
  try { child.kill(); } catch {}
  try { if (child.pid) execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', shell: true }); } catch {}
}

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + failed} (${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
