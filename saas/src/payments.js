// Платежи §4.4: Lemon Squeezy (мир, HMAC-подпись) + ЮKassa (РФ, общий секрет).
// Идемпотентность по external_id (§5). Вебхук ставит tier и пишет телеметрию.
import { json, readJson } from './util.js';

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
