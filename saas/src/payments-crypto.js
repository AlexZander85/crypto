// Крипто-оплата §4.4 (Cryptomus Merchant API).
// Контракт (doc.cryptomus.com + кросс-чек интеграций):
//   create: POST api.cryptomus.com/v1/payment, headers merchant + sign = MD5(base64(body) + PAYMENT_API_KEY)
//   webhook: JSON c полем sign; проверка = MD5(base64(JSON.stringify(body без sign)) + PAYMENT_API_KEY)
//   статусы: paid | paid_over → успех; cancel | fail | system_fail → отказ; прочие — ожидание.
// Refunds — только вручную из дашборда Cryptomus (у провайдера нет API refund).
// В Workers crypto.subtle не поддерживает MD5 → локальная реализация ниже.

import { json, readJson } from './util.js';
import { requireAuth } from './auth.js';

// ---------- MD5 (hex) — компактная реализация для Workers ----------
export function md5(str) {
  const rl = (n, c) => (n << c) | (n >>> (32 - c));
  const au = (x, y) => {
    const l = (x & 0xFFFF) + (y & 0xFFFF);
    return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF);
  };
  const cmn = (q, a, b, x, s, t) => au(rl(au(au(a, q), au(x, t)), s), b);
  const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t);
  const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t);
  const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);
  const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t);

  // UTF-8
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const withLen = (((len + 8) >> 6) + 1) * 16;
  const words = new Uint32Array(withLen);
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  words[withLen - 2] = len * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  const x = new Int32Array(withLen);
  for (let i = 0; i < words.length; i++) x[i] = words[i] | 0;

  for (let i = 0; i < withLen; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a=ff(a,b,c,d,x[i],7,-680876936); d=ff(d,a,b,c,x[i+1],12,-389564586); c=ff(c,d,a,b,x[i+2],17,606105819); b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897); d=ff(d,a,b,c,x[i+5],12,1200080426); c=ff(c,d,a,b,x[i+6],17,-1473231341); b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416); d=ff(d,a,b,c,x[i+9],12,-1958414417); c=ff(c,d,a,b,x[i+10],17,-42063); b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682); d=ff(d,a,b,c,x[i+13],12,-40341101); c=ff(c,d,a,b,x[i+14],17,-1502002290); b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510); d=gg(d,a,b,c,x[i+6],9,-1069501632); c=gg(c,d,a,b,x[i+11],14,643717713); b=gg(b,c,d,a,x[i],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691); d=gg(d,a,b,c,x[i+10],9,38016083); c=gg(c,d,a,b,x[i+15],14,-660478335); b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438); d=gg(d,a,b,c,x[i+14],9,-1019803690); c=gg(c,d,a,b,x[i+3],14,-187363961); b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467); d=gg(d,a,b,c,x[i+2],9,-51403784); c=gg(c,d,a,b,x[i+7],14,1735328473); b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558); d=hh(d,a,b,c,x[i+8],11,-2022574463); c=hh(c,d,a,b,x[i+11],16,1839030562); b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060); d=hh(d,a,b,c,x[i+4],11,1272893353); c=hh(c,d,a,b,x[i+7],16,-155497632); b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174); d=hh(d,a,b,c,x[i],11,-358537222); c=hh(c,d,a,b,x[i+3],16,-722521979); b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487); d=hh(d,a,b,c,x[i+12],11,-421815835); c=hh(c,d,a,b,x[i+15],16,530742520); b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i],6,-198630844); d=ii(d,a,b,c,x[i+7],10,1126891415); c=ii(c,d,a,b,x[i+14],15,-1416354905); b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571); d=ii(d,a,b,c,x[i+3],10,-1894986606); c=ii(c,d,a,b,x[i+10],15,-1051523); b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359); d=ii(d,a,b,c,x[i+15],10,-30611744); c=ii(c,d,a,b,x[i+6],15,-1560198380); b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070); d=ii(d,a,b,c,x[i+11],10,-1120210379); c=ii(c,d,a,b,x[i+2],15,718787259); b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=au(a,oa); b=au(b,ob); c=au(c,oc); d=au(d,od);
  }
  const hex = n => {
    let s = '';
    for (let j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 15).toString(16) + ((n >> (j * 8)) & 15).toString(16);
    return s;
  };
  return hex(a) + hex(b) + hex(c) + hex(d);
}

const b64 = str => btoa(String.fromCharCode(...new TextEncoder().encode(str)));

function cryptomusSign(bodyJson, apiKey) {
  return md5(b64(bodyJson) + apiKey);
}

const OK_STATUSES = new Set(['paid', 'paid_over']);
const FAIL_STATUSES = new Set(['cancel', 'fail', 'system_fail']);

function tierPrice(env, tier) {
  const map = JSON.parse(env.CRYPTO_PRICE_JSON || '{}');
  return map[tier] || map.lite || { amount: '12.00', currency: 'USD' };
}

// POST /api/pay/crypto/invoice  (JWT) {tier: 'lite'|'pro'|'max'}
export async function createInvoice(ctx, req) {
  const { env } = ctx;
  const claims = await requireAuth(env, req);
  if (!claims) return json({ error: 'unauthorized' }, 401);
  if (!env.CRYPTOMUS_MERCHANT_ID || !env.CRYPTOMUS_API_KEY) {
    return json({ error: 'not_configured' }, 501);
  }

  const body = await readJson(req);
  const allowed = new Set(['lite', 'pro', 'max']);
  const tier = allowed.has(body?.tier) ? body.tier : 'lite';
  const price = tierPrice(env, tier);

  const origin = new URL(req.url).origin;
  const orderId = `cn-${claims.sub.slice(0, 8)}-${Date.now().toString(36)}`;
  const payload = {
    amount: price.amount,
    currency: price.currency,
    order_id: orderId,
    url_callback: `${origin}/api/pay/crypto/webhook`,
    url_return: `${env.APP_ORIGIN || origin}/index.html?payment=done`,
    url_success: `${env.APP_ORIGIN || origin}/index.html?payment=done`,
    lifetime: 3600
  };
  const payloadJson = JSON.stringify(payload);

  let res;
  try {
    res = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        merchant: env.CRYPTOMUS_MERCHANT_ID,
        sign: cryptomusSign(payloadJson, env.CRYPTOMUS_API_KEY),
        'content-type': 'application/json'
      },
      body: payloadJson
    });
  } catch {
    return json({ error: 'provider_unreachable' }, 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.state !== 0 || !data.result?.uuid || !data.result?.url) {
    return json({ error: 'provider_error', detail: data?.message || data?.result || null }, 502);
  }

  // pending-покупка: user/tier — наши, вебхук найдёт по external_id = uuid
  const { track } = await import('./telemetry.js');
  await env.DB.prepare(
    `INSERT INTO purchases (id, user_id, provider, external_id, amount_minor, currency, status, tier, created_at)
     VALUES (?, ?, 'crypto', ?, ?, ?, 'pending', ?, ?)`
  ).bind(crypto.randomUUID(), claims.sub, data.result.uuid,
    Math.round(Number(price.amount) * 100), price.currency, tier, Date.now()).run();
  track(ctx, 'crypto_invoice_created', claims.sub, { uuid: data.result.uuid, tier, amount: price.amount, currency: price.currency });

  return json({ ok: true, url: data.result.url, uuid: data.result.uuid, order_id: orderId });
}

// POST /api/pay/crypto/webhook
export async function cryptoWebhook(ctx, req) {
  const { env } = ctx;
  if (!env.CRYPTOMUS_API_KEY) return json({ error: 'not_configured' }, 501);

  const raw = await req.text();
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const { sign, ...rest } = body;
  if (!sign) return json({ error: 'no_signature' }, 401);
  const expected = cryptomusSign(JSON.stringify(rest), env.CRYPTOMUS_API_KEY);
  if (sign !== expected) return json({ error: 'bad_signature' }, 401);

  const uuid = String(body.uuid || '');
  const orderId = String(body.order_id || '');
  const status = String(body.status || '');
  if (!uuid && !orderId) return json({ error: 'no_id' }, 400);

  // ищем нашу pending-запись по uuid, фолбэк — по order_id
  const row = (uuid && await env.DB.prepare('SELECT * FROM purchases WHERE external_id = ?').bind(uuid).first())
    || (orderId && await env.DB.prepare("SELECT * FROM purchases WHERE external_id LIKE ? AND provider = 'crypto'").bind(orderId + '%').first());
  if (!row) return json({ error: 'unknown_purchase' }, 404);

  if (OK_STATUSES.has(status)) {
    // идемпотентность: повторный вебхук по уже оплаченной записи ничего не меняет
    if (row.status !== 'paid') {
      await env.DB.prepare("UPDATE purchases SET status = 'paid', amount_minor = ? WHERE id = ?")
        .bind(Math.round(Number(body.amount || 0) * 100) || row.amount_minor, row.id).run();
      await env.DB.prepare('UPDATE users SET access_tier = ?, access_changed_at = ? WHERE id = ?')
        .bind(row.tier || 'lite', Date.now(), row.user_id).run();
      const { track } = await import('./telemetry.js');
      track(ctx, 'pay_webhook', row.user_id, { status: 'paid', amount_minor: row.amount_minor, currency: row.currency, external_id: uuid || orderId });
      track(ctx, 'tier_change', row.user_id, { to: row.tier || 'lite', reason: 'purchase' });
    }
    return json({ ok: true });
  }
  if (FAIL_STATUSES.has(status)) {
    await env.DB.prepare("UPDATE purchases SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(row.id).run();
    return json({ ok: true });
  }
  // waiting / confirm_check / … — ожидание, ответ 200 чтобы провайдер не ретраил ошибкой
  return json({ ok: true, ignored: status });
}
