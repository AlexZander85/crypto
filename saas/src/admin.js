// Админ API §13 (промта v2.0). Доступ: ADMIN_SECRET (Bearer) + Cloudflare Access на деплое.
// Email маскирован по умолчанию; текстов конспектов/диалогов здесь нет (приватность §13).
import { json, readJson } from './util.js';

const TIERS = new Set(['free', 'lite', 'pro', 'max']);

function requireAdmin(ctx, req) {
  const { env } = ctx;
  const auth = req.headers.get('authorization') || '';
  return !!env.ADMIN_SECRET && auth === `Bearer ${env.ADMIN_SECRET}`;
}

function maskEmail(email) {
  if (!email) return null;
  const [name, domain] = String(email).split('@');
  if (!domain) return '***';
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}***@${domain}`;
}

async function respond(ctx, req, fn) {
  if (!requireAdmin(ctx, req)) return json({ error: 'unauthorized' }, 401);
  try {
    return await fn();
  } catch (e) {
    return json({ error: 'admin_error', detail: String(e && e.message || e).slice(0, 120) }, 500);
  }
}

// GET /admin/api/overview?days=30 — обзор: регистрации, DAU/WAU, тиры, выручка, воронка, ошибки
export async function adminOverview(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '30', 10)));
    const since = Date.now() - days * 86400000;
    const dayMs = 86400000;
    const sinceDau = Date.now() - Math.min(days, 30) * dayMs;

    const [users, signups, logins, tiers, revenue, payWebhooks, errors, eventsDau, completions, starts] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS n FROM users'),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='signup' AND ts > ?").bind(since),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='login' AND ts > ?").bind(since),
      env.DB.prepare('SELECT access_tier AS t, COUNT(*) AS n FROM users GROUP BY access_tier'),
      env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) AS s, currency FROM purchases WHERE status='paid' AND created_at > ? GROUP BY currency").bind(since),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='pay_webhook' AND ts > ?").bind(since),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='app_error' AND ts > ?").bind(since),
      env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE ts > ? AND user_id IS NOT NULL").bind(sinceDau),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='lesson_complete' AND ts > ?").bind(since),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='learn_open' AND ts > ?").bind(since)
    ]);

    const totalUsers = users.results[0]?.n ?? 0;
    const tierMap = Object.fromEntries(tiers.results.map(r => [r.t, r.n]));
    const demo = tierMap.free || 0;
    const paid = ['lite', 'pro', 'max'].reduce((s, t) => s + (tierMap[t] || 0), 0);
    return json({
      days,
      users_total: totalUsers,
      signups: signups.results[0]?.n ?? 0,
      logins: logins.results[0]?.n ?? 0,
      active_users: eventsDau.results[0]?.n ?? 0,
      tiers: tierMap,
      // воронка демо→лайт→про→макс (§13): распределение + конверсия по тирам
      funnel: {
        demo, paid,
        lite: tierMap.lite || 0, pro: tierMap.pro || 0, max: tierMap.max || 0,
        conversion_paid_pct: totalUsers ? Math.round(paid / totalUsers * 1000) / 10 : 0
      },
      lessons_opened: starts.results[0]?.n ?? 0,
      lessons_completed: completions.results[0]?.n ?? 0,
      revenue: revenue.results.map(r => ({ amount_minor: r.s, currency: r.currency })),
      pay_webhooks: payWebhooks.results[0]?.n ?? 0,
      errors: errors.results[0]?.n ?? 0
    });
  });
}

// GET /admin/api/ai_usage?days=30 — вызовы наставника по фичам/дням, доля фильтраций, топ-потребители (псевдонимно)
export async function adminAiUsage(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '30', 10)));
    const since = Date.now() - days * 86400000;
    const [byDay, byFeature, filtered, top, model] = await env.DB.batch([
      env.DB.prepare("SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM events WHERE type='mentor_call' AND ts > ? GROUP BY day ORDER BY day").bind(since),
      env.DB.prepare("SELECT json_extract(meta, '$.feature') AS feature, COUNT(*) AS n FROM events WHERE type='mentor_call' AND ts > ? GROUP BY feature ORDER BY n DESC").bind(since),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE type='mentor_call' AND json_extract(meta, '$.filtered') = 1 AND ts > ?").bind(since),
      env.DB.prepare("SELECT user_id, COUNT(*) AS n FROM events WHERE type='mentor_call' AND ts > ? AND user_id IS NOT NULL GROUP BY user_id ORDER BY n DESC LIMIT 10").bind(since),
      env.DB.prepare("SELECT value FROM settings WHERE key = 'ai_model'")
    ]);
    const total = byFeature.results.reduce((s, r) => s + r.n, 0);
    return json({
      days,
      by_day: byDay.results,
      by_feature: byFeature.results,
      total_calls: total,
      filtered_calls: filtered.results[0]?.n ?? 0,
      filtered_pct: total ? Math.round((filtered.results[0]?.n ?? 0) / total * 100) : 0,
      // псевдонимно: первые 8 символов uuid
      top_consumers: top.results.map(r => ({ user: String(r.user_id).slice(0, 8), calls: r.n })),
      active_model: model.results[0]?.value || 'cf-llama-3.1-8b-instruct'
    });
  });
}

// GET /admin/api/users?filter=&offset= — таблица: id, маск-email, tier, регистрация, last_login, уроков пройдено
export async function adminUsers(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const url = new URL(req.url);
    const filter = (url.searchParams.get('filter') || '').slice(0, 64);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const limit = 50;
    const like = `%${filter}%`;
    const rows = filter
      ? await env.DB.prepare(
          `SELECT u.id, u.email, u.access_tier, u.created_at, u.last_login_at,
                  (SELECT COUNT(*) FROM events e WHERE e.user_id = u.id AND e.type = 'lesson_complete') AS lessons_done
           FROM users u WHERE u.email LIKE ? ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).bind(like, limit, offset).all()
      : await env.DB.prepare(
          `SELECT u.id, u.email, u.access_tier, u.created_at, u.last_login_at,
                  (SELECT COUNT(*) FROM events e WHERE e.user_id = u.id AND e.type = 'lesson_complete') AS lessons_done
           FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return json({
      users: rows.results.map(r => ({
        id: r.id, email_masked: maskEmail(r.email), tier: r.access_tier,
        created_at: r.created_at, last_login_at: r.last_login_at || null, lessons_done: r.lessons_done
      })),
      offset, limit
    });
  });
}

// GET /admin/api/user/:id — карточка: платежи, подписка, LTV, прогресс-сводка (БЕЗ текстов конспектов)
export async function adminUser(ctx, req, userId) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const u = await env.DB.prepare('SELECT id, email, access_tier, created_at, last_login_at, access_expires_at FROM users WHERE id = ?').bind(userId).first();
    if (!u) return json({ error: 'no_user' }, 404);
    const [purchases, ltv, progressRow, recent] = await env.DB.batch([
      env.DB.prepare('SELECT provider, amount_minor, currency, status, tier, created_at FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(userId),
      env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) AS s FROM purchases WHERE user_id = ? AND status = 'paid'").bind(userId),
      env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND type = 'lesson_complete'").bind(userId),
      env.DB.prepare("SELECT ts, type FROM events WHERE user_id = ? ORDER BY ts DESC LIMIT 20").bind(userId)
    ]);
    return json({
      id: u.id,
      email_masked: maskEmail(u.email),
      email_full_available: true,
      tier: u.access_tier,
      created_at: u.created_at,
      last_login_at: u.last_login_at || null,
      access_expires_at: u.access_expires_at || null,
      ltv_minor: ltv.results[0]?.s ?? 0,
      lessons_done: progressRow.results[0]?.n ?? 0,
      purchases: purchases.results,
      recent_events: recent.results // только типы и время — без содержимого
    });
  });
}

// GET /admin/api/errors?days=7 — app_error по дням (msg_hash, без текстов)
export async function adminErrors(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const days = Math.min(90, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '7', 10)));
    const since = Date.now() - days * 86400000;
    const [byDay, top] = await env.DB.batch([
      env.DB.prepare("SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM events WHERE type='app_error' AND ts > ? GROUP BY day ORDER BY day").bind(since),
      env.DB.prepare("SELECT json_extract(meta, '$.where') AS where_, json_extract(meta, '$.msg_hash') AS hash, COUNT(*) AS n FROM events WHERE type='app_error' AND ts > ? GROUP BY where_, hash ORDER BY n DESC LIMIT 20").bind(since)
    ]);
    return json({ days, by_day: byDay.results, top: top.results });
  });
}

// GET /admin/api/content_funnel — завершения/оттоки по урокам, топ точек оттока
export async function adminContentFunnel(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const [opens, completes, topOpen] = await env.DB.batch([
      env.DB.prepare("SELECT json_extract(meta, '$.lesson_id') AS lesson, COUNT(*) AS n FROM events WHERE type='learn_open' GROUP BY lesson ORDER BY n DESC LIMIT 50"),
      env.DB.prepare("SELECT json_extract(meta, '$.lesson_id') AS lesson, COUNT(*) AS n FROM events WHERE type='lesson_complete' GROUP BY lesson ORDER BY n DESC LIMIT 50"),
      env.DB.prepare("SELECT type, COUNT(*) AS n FROM events WHERE type IN ('learn_open','lesson_complete') GROUP BY type")
    ]);
    const opensMap = Object.fromEntries(opens.results.map(r => [r.lesson, r.n]));
    const completesMap = Object.fromEntries(completes.results.map(r => [r.lesson, r.n]));
    const lessons = [...new Set([...Object.keys(opensMap), ...Object.keys(completesMap)])];
    const funnel = lessons.map(l => ({
      lesson: l, opens: opensMap[l] || 0, completes: completesMap[l] || 0,
      drop_pct: opensMap[l] ? Math.round((1 - (completesMap[l] || 0) / opensMap[l]) * 100) : 0
    })).sort((a, b) => b.opens - a.opens).slice(0, 50);
    return json({ funnel, totals: Object.fromEntries(completes.results.map(r => [r.type, r.n])) });
  });
}

// GET /admin/api/content_packs — версии паков, кто сколько скачал (из pack_download)
export async function adminContentPacks(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const [byPack, manifest] = await env.DB.batch([
      env.DB.prepare("SELECT json_extract(meta, '$.name') AS name, json_extract(meta, '$.version') AS version, COUNT(*) AS n FROM events WHERE type='pack_download' GROUP BY name, version ORDER BY n DESC")
    ]);
    let manifestPacks = [];
    try {
      const m = await import('../content/manifest.json');
      manifestPacks = (m.packs || []).map(p => ({ name: p.name, version: p.version, demo: p.demo, brotli_bytes: p.brotli_bytes }));
    } catch { /* манифест не найден */ }
    const downloads = Object.fromEntries(byPack.results.map(r => [`${r.name}@${r.version}`, r.n]));
    return json({
      packs: manifestPacks.map(p => ({ ...p, downloads: downloads[`${p.name}@${p.version}`] || 0 })),
      download_events: byPack.results
    });
  });
}

// POST /admin/api/grant_tier {user_id, tier, reason}
export async function adminGrantTier(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const body = await readJson(req);
    if (!body?.user_id || !TIERS.has(body?.tier)) return json({ error: 'bad_request' }, 400);
    const res = await env.DB.prepare('UPDATE users SET access_tier = ?, access_changed_at = ? WHERE id = ?')
      .bind(body.tier, Date.now(), body.user_id).run();
    if (!res.meta.changes) return json({ error: 'no_user' }, 404);
    await env.DB.prepare('INSERT INTO admin_actions (ts, action, target_user, detail) VALUES (?, ?, ?, ?)')
      .bind(Date.now(), 'grant_tier', body.user_id, JSON.stringify({ tier: body.tier, reason: body.reason || '' })).run();
    const { track } = await import('./telemetry.js');
    track(ctx, 'tier_change', body.user_id, { to: body.tier, reason: 'manual_grant' });
    return json({ ok: true });
  });
}

// POST /admin/api/delete_user {user_id} — GDPR (§7): стирает users/progress/events/feedback;
// покупки остаются анонимной записью (налоговая необходимость)
export async function adminDeleteUser(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const body = await readJson(req);
    if (!body?.user_id) return json({ error: 'bad_request' }, 400);
    const userId = body.user_id;
    const u = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first();
    if (!u) return json({ error: 'no_user' }, 404);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(userId),
      env.DB.prepare('DELETE FROM events WHERE user_id = ?').bind(userId),
      env.DB.prepare('DELETE FROM feedback WHERE user_id = ?').bind(userId),
      env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId),
      env.DB.prepare('DELETE FROM mentor_usage WHERE user_id = ?').bind(userId),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
    ]);
    // покупки обезличиваются (user_id → 'gdpr-deleted', email нигде не хранится)
    await env.DB.prepare("UPDATE purchases SET user_id = 'gdpr-deleted' WHERE user_id = ?").bind(userId).run();
    await env.DB.prepare('INSERT INTO admin_actions (ts, action, target_user, detail) VALUES (?, ?, ?, ?)')
      .bind(Date.now(), 'delete_user', userId, JSON.stringify({ email_masked: maskEmail(u.email) })).run();
    return json({ ok: true });
  });
}

// POST /admin/api/subscription_action {user_id, action: cancel|extend, days?}
export async function adminSubscriptionAction(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const body = await readJson(req);
    const userId = body?.user_id, action = body?.action;
    if (!userId || !['cancel', 'extend'].includes(action)) return json({ error: 'bad_request' }, 400);
    if (action === 'cancel') {
      await env.DB.prepare("UPDATE subscriptions SET status = 'canceled', canceled_at = ? WHERE user_id = ?").bind(Date.now(), userId).run();
      await env.DB.prepare('UPDATE users SET access_expires_at = ? WHERE id = ?').bind(Date.now(), userId).run();
    } else {
      const days = Math.min(365, Math.max(1, parseInt(body?.days || '30', 10)));
      const row = await env.DB.prepare('SELECT access_expires_at FROM users WHERE id = ?').bind(userId).first();
      const base = row?.access_expires_at && row.access_expires_at > Date.now() ? row.access_expires_at : Date.now();
      await env.DB.prepare('UPDATE users SET access_expires_at = ? WHERE id = ?').bind(base + days * 86400000, userId).run();
    }
    await env.DB.prepare('INSERT INTO admin_actions (ts, action, target_user, detail) VALUES (?, ?, ?, ?)')
      .bind(Date.now(), `subscription_${action}`, userId, JSON.stringify({ days: body?.days || null })).run();
    return json({ ok: true });
  });
}

// GET /admin/api/actions — audit-лог admin_actions (экран «Действия»)
export async function adminActions(ctx, req) {
  return respond(ctx, req, async () => {
    const { env } = ctx;
    const rows = await env.DB.prepare('SELECT ts, action, target_user, detail FROM admin_actions ORDER BY ts DESC LIMIT 100').all();
    return json({ actions: rows.results });
  });
}
