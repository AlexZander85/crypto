// Админ §20: обзор за период. Доступ — только по ADMIN_SECRET (Cloudflare Access добавляется на деплое).
import { json } from './util.js';

export async function adminOverview(ctx, req) {
  const { env } = ctx;
  const auth = req.headers.get('authorization') || '';
  if (!env.ADMIN_SECRET || auth !== `Bearer ${env.ADMIN_SECRET}`) {
    return json({ error: 'unauthorized' }, 401);
  }
  const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '30', 10)));
  const since = Date.now() - days * 86400000;

  const [users, signups, logins, tiers, revenue, payWebhooks, errors] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM users'),
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='signup' AND ts > ?").bind(since),
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='login' AND ts > ?").bind(since),
    env.DB.prepare('SELECT access_tier AS t, COUNT(*) AS n FROM users GROUP BY access_tier'),
    env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) AS s, currency FROM purchases WHERE status='paid' AND created_at > ? GROUP BY currency").bind(since),
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='pay_webhook' AND ts > ?").bind(since),
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='app_error' AND ts > ?").bind(since)
  ]);

  return json({
    days,
    users_total: users.results[0]?.n ?? 0,
    signups: signups.results[0]?.n ?? 0,
    logins: logins.results[0]?.n ?? 0,
    tiers: Object.fromEntries(tiers.results.map(r => [r.t, r.n])),
    revenue: revenue.results.map(r => ({ amount_minor: r.s, currency: r.currency })),
    pay_webhooks: payWebhooks.results[0]?.n ?? 0,
    errors: errors.results[0]?.n ?? 0
  });
}

// POST /admin/api/grant_tier {user_id, tier, reason} — ручная выдача (гранты/компенсации)
export async function adminGrantTier(ctx, req) {
  const { env } = ctx;
  const auth = req.headers.get('authorization') || '';
  if (!env.ADMIN_SECRET || auth !== `Bearer ${env.ADMIN_SECRET}`) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => null);
  const allowed = new Set(['free', 'lite', 'pro', 'max']);
  if (!body?.user_id || !allowed.has(body?.tier)) return json({ error: 'bad_request' }, 400);
  const res = await env.DB.prepare('UPDATE users SET access_tier = ?, access_changed_at = ? WHERE id = ?')
    .bind(body.tier, Date.now(), body.user_id).run();
  if (!res.meta.changes) return json({ error: 'no_user' }, 404);
  await env.DB.prepare('INSERT INTO admin_actions (ts, action, target_user, detail) VALUES (?, ?, ?, ?)')
    .bind(Date.now(), 'grant_tier', body.user_id, JSON.stringify({ tier: body.tier, reason: body.reason || '' })).run();
  const { track } = await import('./telemetry.js');
  track(ctx, 'tier_change', body.user_id, { to: body.tier, reason: 'manual_grant' });
  return json({ ok: true });
}
