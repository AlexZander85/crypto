// Админ: активная модель ИИ (§10.2). Смена без передеплоя, только SKU из белого списка.
import { json, readJson } from './util.js';
import { MODEL_WHITELIST, setActiveSku, DEFAULT_SKU } from './mentor.js';

function requireAdmin(ctx, req) {
  const { env } = ctx;
  const auth = req.headers.get('authorization') || '';
  return !!env.ADMIN_SECRET && auth === `Bearer ${env.ADMIN_SECRET}`;
}

export async function adminGetAiModel(ctx, req) {
  const { env } = ctx;
  if (!requireAdmin(ctx, req)) return json({ error: 'unauthorized' }, 401);
  let sku = DEFAULT_SKU;
  try {
    const row = await env.DB.prepare('SELECT value, updated_at FROM settings WHERE key = ?').bind('ai_model').first();
    if (row && MODEL_WHITELIST[row.value]) sku = row.value;
  } catch { /* до миграций — дефолт */ }
  return json({ sku, model: MODEL_WHITELIST[sku], whitelist: MODEL_WHITELIST });
}

export async function adminSetAiModel(ctx, req) {
  const { env } = ctx;
  if (!requireAdmin(ctx, req)) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(req);
  const sku = String(body?.sku || '');
  if (!MODEL_WHITELIST[sku]) return json({ error: 'bad_sku', whitelist: Object.keys(MODEL_WHITELIST) }, 400);
  const prev = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model').first().catch(() => null);
  await setActiveSku(env, sku);
  await env.DB.prepare('INSERT INTO admin_actions (ts, action, target_user, detail) VALUES (?, ?, ?, ?)')
    .bind(Date.now(), 'ai_model', null, JSON.stringify({ from: prev?.value || DEFAULT_SKU, to: sku })).run();
  return json({ ok: true, sku, model: MODEL_WHITELIST[sku] });
}
