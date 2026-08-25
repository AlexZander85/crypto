// Прогресс §8: одна строка на пользователя, last-write-wins по updated_at.
import { json, cors, readJson } from './util.js';
import { requireAuth } from './auth.js';

// GET /api/progress → { state, updated_at, app_version }
export async function getProgress(ctx, req) {
  const { env } = ctx;
  const claims = await requireAuth(env, req);
  if (!claims) return json({ error: 'unauthorized' }, 401);
  const row = await env.DB.prepare('SELECT state, app_version, updated_at FROM progress WHERE user_id = ?')
    .bind(claims.sub).first();
  if (!row) return json({ state: null, updated_at: null, app_version: null });
  return json({ state: JSON.parse(row.state), updated_at: row.updated_at, app_version: row.app_version });
}

// PUT /api/progress { state, app_version? }
// Идемпотентно: клиент может прислать client_updated_at — если он старее серверного, ничего не пишем.
export async function putProgress(ctx, req) {
  const { env } = ctx;
  const claims = await requireAuth(env, req);
  if (!claims) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(req);
  if (!body || typeof body.state !== 'object' || body.state === null) {
    return json({ error: 'bad_state' }, 400);
  }
  const state = JSON.stringify(body.state);
  if (state.length > 512 * 1024) return json({ error: 'state_too_large' }, 413);

  const now = Date.now();
  const clientTs = Number.isFinite(body.client_updated_at) ? body.client_updated_at : now;
  const existing = await env.DB.prepare('SELECT updated_at FROM progress WHERE user_id = ?').bind(claims.sub).first();
  if (existing && existing.updated_at > clientTs) {
    return json({ ok: true, skipped: 'stale', updated_at: existing.updated_at });
  }
  await env.DB.prepare(
    `INSERT INTO progress (user_id, state, app_version, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, app_version = excluded.app_version, updated_at = excluded.updated_at`
  ).bind(claims.sub, state, body.app_version || null, now).run();
  return json({ ok: true, updated_at: now });
}
