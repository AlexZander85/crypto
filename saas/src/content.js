// Контент §3/§4.3/§22.1: манифест по тарифу, выдача паков после JWT, водяной знак, rate limit.
// Манифест генерируется tools/extract-content.mjs (content/manifest.json, версия = хэш паков)
// и импортируется статически. KV-ключ manifest:<locale> переопределяет его —
// это позволяет обновлять контент БЕЗ передеплоя воркера (§3).
import { json, cors, rateLimit } from './util.js';
import { requireAuth } from './auth.js';
import generatedManifest from '../content/manifest.json';

// Манифест лежит в KV (ключ manifest:<locale>) либо в дефолтном импорте.
// Пак: { demo:true } доступен всем, остальные — только lite/pro/max (§14.1).
const PAID_TIERS = new Set(['lite', 'pro', 'max']);

async function getManifest(env, locale) {
  if (env.KV) {
    const hit = await env.KV.get(`manifest:${locale}`);
    if (hit) {
      try { return JSON.parse(hit); } catch { /* битый KV — фолбэк на импорт */ }
    }
  }
  return generatedManifest.locale === locale ? generatedManifest : { ...generatedManifest, locale };
}

// GET /api/content/manifest  (JWT опционален: гость видит демо-список)
// Тариф читается из БД, не из JWT: после покупки/гранта доступ открывается сразу,
// без перевыпуска токена (актуальность важнее лишнего чтения D1).
export async function manifest(ctx, req) {
  const { env } = ctx;
  const url = new URL(req.url);
  const locale = (url.searchParams.get('locale') || 'ru').slice(0, 5).replace(/[^a-z-]/gi, '');
  const claims = await requireAuth(env, req);
  let tier = 'free';
  if (claims) {
    const u = await env.DB.prepare('SELECT access_tier FROM users WHERE id = ?').bind(claims.sub).first();
    tier = u?.access_tier || 'free';
  }
  const full = PAID_TIERS.has(tier);
  const m = await getManifest(env, locale);
  return json({
    version: m.version,
    locale,
    tier,
    packs: m.packs
      .filter(p => full || p.demo)
      .map(p => ({ ...p, url: `/api/content/pack/${locale}/${p.name}` }))
  });
}

async function dbTier(env, sub) {
  const u = await env.DB.prepare('SELECT access_tier FROM users WHERE id = ?').bind(sub).first();
  return u?.access_tier || 'free';
}

// GET /api/content/pack/:locale/:name  (платные — только после JWT нужного тарифа, §22.1)
export async function pack(ctx, req, locale, name) {
  const { env } = ctx;
  locale = String(locale || '').replace(/[^a-z-]/gi, '').slice(0, 5);
  name = String(name || '').replace(/[^a-z0-9_-]/gi, '');
  const claims = await requireAuth(env, req);
  const m = await getManifest(env, locale);
  const meta = m.packs.find(p => p.name === name);
  if (!meta) return json({ error: 'not_found' }, 404);
  if (!meta.demo) {
    if (!claims) return json({ error: 'unauthorized' }, 401);
    const tier = await dbTier(env, claims.sub);
    if (!PAID_TIERS.has(tier)) return json({ error: 'payment_required' }, 403);
    // rate limit выгрузок: 30 паков в час на пользователя (§22.1.4)
    if (!(await rateLimit(env, `pack:${claims.sub}`, 30, 3600))) return json({ error: 'rate_limited' }, 429);
  }

  let raw = null;
  if (env.PACKS) {
    try {
      const obj = await env.PACKS.get(`packs/${locale}/${name}.json`);
      if (obj) raw = await obj.text();
    } catch {
      raw = null; // R2 недоступен → фолбэк ниже (демо) или 404
    }
  }
  if (raw === null && meta.demo && env.ENV === 'dev') {
    // локальный фолбэк на демо-пак из репозитория
    raw = JSON.stringify(DEMO_PACK);
  }
  if (raw === null) return json({ error: 'not_found' }, 404);

  // пер-пользовательский водяной знак для платных паков (§22.1.3)
  let data;
  try { data = JSON.parse(raw); } catch { return json({ error: 'pack_corrupt' }, 500); }
  if (!meta.demo && claims) {
    data.meta = { ...(data.meta || {}), wm: claims.sub, ts: Date.now() };
  }
  return json(data, 200, { 'cache-control': meta.demo ? 'public, max-age=300' : 'private, no-store' });
}

// Демо-пак-плейсхолдер: реальный контент появится после extract-content.mjs (подзадача §12.2)
export const DEMO_PACK = {
  meta: { placeholder: true, demo: true, locale: 'ru', note: 'Заполняется скриптом extract-content.mjs из index.html' },
  lessons: [],
  terms: [],
  tests: []
};
