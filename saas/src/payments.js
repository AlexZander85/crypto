// Платежи §4.4/§9: Lemon Squeezy (мир, HMAC-подпись) + ЮKassa (РФ) + витрина цен.
// Идемпотентность по external_id (§5). Вебхук ставит tier и пишет телеметрию.
import { json, readJson } from './util.js';
import { requireAuth } from './auth.js';

const enc = new TextEncoder();

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function setTier(ctx, userId, tier, reason) {
  const { env } = ctx;
  await env.DB.prepare('UPDATE users SET access_tier = ?, access_changed_at = ? WHERE id = ?')
    .bind(tier, Date.now(), userId).run();
  const { track } = await import('./telemetry.js');
  track(ctx, 'tier_change', userId, { from: null, to: tier, reason });
}

async function recordPurchase(ctx, { userId, provider, externalId, amountMinor, currency, status, tier }) {
  const { env } = ctx;
  // идемпотентность: UNIQUE(external_id) — повторный вебхук не создаёт вторую покупку
  const dup = await env.DB.prepare('SELECT id FROM purchases WHERE external_id = ?').bind(externalId).first();
  if (dup) return { duplicate: true };
  await env.DB.prepare(
    `INSERT INTO purchases (id, user_id, provider, external_id, amount_minor, currency, status, tier, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), userId, provider, externalId, amountMinor, currency, status, tier, Date.now()).run();
  const { track } = await import('./telemetry.js');
  track(ctx, 'pay_webhook', userId, { status, amount_minor: amountMinor, currency, external_id: externalId });
  return { duplicate: false };
}

// GET /api/pay/prices — витрина тарифов из env-конфига (§9: цены только в конфиге, не в коде).
// PRICES_JSON: { lite: { title, price, note, pay: { lemonsqueezy?: url, yookassa?: true, crypto?: true } }, pro: …, max: … }
export async function prices(ctx) {
  const { env } = ctx;
  let prices = null;
  try { prices = JSON.parse(env.PRICES_JSON || 'null'); } catch { prices = null; }
  if (!prices) return json({ error: 'not_configured' }, 501);
  return json({ tiers: prices });
}

// POST /api/pay/yookassa/create { tier } — создание платежа ЮKassa (§9).
// Требует YOOKASSA_SHOP_ID + YOOKASSA_SECRET; сумма/валюта — из PRICES_JSON[tier].amount_rub.
export async function yookassaCreate(ctx, req) {
  const { env } = ctx;
  const claims = await requireAuth(env, req);
  if (!claims) return json({ error: 'unauthorized' }, 401);
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET) return json({ error: 'not_configured' }, 501);
  const body = await readJson(req);
  const tier = String(body?.tier || '');
  if (!['lite', 'pro', 'max'].includes(tier)) return json({ error: 'bad_tier' }, 400);

  let prices = null;
  try { prices = JSON.parse(env.PRICES_JSON || 'null'); } catch { prices = null; }
  const cfg = prices && prices[tier];
  const amountRub = cfg && cfg.amount_rub;
  if (!amountRub) return json({ error: 'price_not_configured' }, 501);

  const origin = new URL(req.url).origin;
  const idempKey = crypto.randomUUID();
  const r = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotence-Key': idempKey,
      authorization: 'Basic ' + btoa(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET}`)
    },
    body: JSON.stringify({
      amount: { value: String(amountRub), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: `${origin}/?paid=1` },
      description: `КриптоНавигатор — тариф ${tier}`,
      metadata: { user_id: claims.sub, tier }
    })
  });
  if (!r.ok) return json({ error: 'provider_error' }, 502);
  const data = await r.json();
  // pending-покупка: вебхук по payment id поднимет tier (идемпотентно по external_id)
  try {
    await env.DB.prepare(
      `INSERT INTO purchases (id, user_id, provider, external_id, amount_minor, currency, status, tier, created_at)
       VALUES (?, ?, 'yookassa', ?, ?, 'RUB', 'pending', ?, ?)`
    ).bind(crypto.randomUUID(), claims.sub, String(data.id), Math.round(Number(amountRub) * 100), tier, Date.now()).run();
  } catch { /* повторный клик по кнопке: external_id UNIQUE — ок */ }
  return json({ ok: true, confirmation_url: data.confirmation?.confirmation_url || null });
}

// POST /api/pay/lemonsqueezy/webhook
// Подпись: X-Signature = HMAC-SHA256(rawBody, LS_SIGNING_SECRET) — официальная схема LS.
export async function lemonsqueezyWebhook(ctx, req) {
  const { env } = ctx;
  if (!env.LS_SIGNING_SECRET) return json({ error: 'not_configured' }, 501);
  const raw = await req.text();
  const sig = (req.headers.get('x-signature') || '').toLowerCase();
  const expected = await hmacHex(env.LS_SIGNING_SECRET, raw);
  if (sig !== expected) return json({ error: 'bad_signature' }, 401);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const eventName = body?.meta?.event_name || '';
  const custom = body?.meta?.custom_data || {};
  const userId = custom.user_id;
  if (!userId) return json({ error: 'no_user' }, 400);

  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'no_user' }, 404);

  const tierMap = JSON.parse(env.LS_TIER_MAP || '{}');
  const productId = String(body?.data?.relationships?.['order-items']?.data?.[0]?.id ?? body?.data?.id ?? '');
  const tier = tierMap[productId] || custom.tier || 'lite';
  const externalId = String(body?.data?.id || body?.meta?.custom_data?.order_id || '');
  if (!externalId) return json({ error: 'no_external_id' }, 400);

  if (eventName === 'order_created' || eventName === 'subscription_payment_success') {
    const amount = Number(body?.data?.attributes?.total ?? 0); // в центах
    const currency = String(body?.data?.attributes?.currency || 'usd').toUpperCase();
    const res = await recordPurchase(ctx, {
      userId, provider: 'lemonsqueezy', externalId,
      amountMinor: amount, currency, status: 'paid', tier
    });
    if (!res.duplicate) await setTier(ctx, userId, tier, 'purchase');
    return json({ ok: true, duplicate: res.duplicate });
  }
  if (eventName === 'order_refunded') {
    await recordPurchase(ctx, {
      userId, provider: 'lemonsqueezy', externalId: externalId + ':refund',
      amountMinor: 0, currency: '—', status: 'refunded', tier: null
    });
    await setTier(ctx, userId, 'free', 'refund');
    return json({ ok: true });
  }
  return json({ ok: true, ignored: eventName });
}

// POST /api/pay/yookassa/webhook
// ЮKassa подписывает уведомления IP-allowlist'ом; здесь дополнительно общий секрет в заголовке.
export async function yookassaWebhook(ctx, req) {
  const { env } = ctx;
  if (!env.YOOKASSA_WEBHOOK_SECRET) return json({ error: 'not_configured' }, 501);
  if (req.headers.get('x-webhook-secret') !== env.YOOKASSA_WEBHOOK_SECRET) {
    return json({ error: 'bad_secret' }, 401);
  }
  const body = await readJson(req);
  const event = body?.event || body?.type || '';
  const obj = body?.object || {};
  const externalId = String(obj.id || '');
  if (!externalId) return json({ error: 'no_external_id' }, 400);

  // user_id передаётся в metadata платежа при создании
  const userId = obj?.metadata?.user_id;
  if (!userId) return json({ error: 'no_user' }, 400);
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'no_user' }, 404);

  if (event === 'payment.succeeded') {
    const tierMap = JSON.parse(env.YK_TIER_MAP || '{}');
    const tier = tierMap[String(obj.payment_method?.id || '')] || obj?.metadata?.tier || 'lite';
    const res = await recordPurchase(ctx, {
      userId, provider: 'yookassa', externalId,
      amountMinor: Math.round(Number(obj.amount?.value || 0) * 100),
      currency: String(obj.amount?.currency || 'RUB'),
      status: 'paid', tier
    });
    if (!res.duplicate) await setTier(ctx, userId, tier, 'purchase');
    return json({ ok: true, duplicate: res.duplicate });
  }
  if (event === 'payment.canceled') {
    await recordPurchase(ctx, {
      userId, provider: 'yookassa', externalId: externalId + ':cancel',
      amountMinor: 0, currency: 'RUB', status: 'pending', tier: null
    });
    return json({ ok: true });
  }
  if (event === 'refund.succeeded') {
    await setTier(ctx, userId, 'free', 'refund');
    return json({ ok: true });
  }
  return json({ ok: true, ignored: event });
}
