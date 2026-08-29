// Общие утилиты воркера: ответы, CORS, HMAC/JWT, rate-limit. Без зависимостей.
const enc = new TextEncoder();

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });
}

export function cors(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization',
    'access-control-max-age': '86400'
  };
}

export async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

// ---------- base64url ----------
export function b64urlFromBytes(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlToBytes(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
export function sha256hex(str) {
  return crypto.subtle.digest('SHA-256', enc.encode(str)).then(b => b64urlFromBytes(b));
}
export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return b64urlFromBytes(b);
}

// ---------- JWT (HS256) ----------
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signJWT(payload, secret, ttlSeconds) {
  const b64 = o => b64urlFromBytes(enc.encode(JSON.stringify(o)));
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, iat: now, exp: now + ttlSeconds })}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return `${data}.${b64urlFromBytes(sig)}`;
}
export async function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function bearer(req) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// ---------- rate limit (KV, best-effort) ----------
// KV без атомарного incr — лимит приблизительный, этого достаточно против грубого перебора.
export async function rateLimit(env, key, max, windowSec) {
  if (!env.KV) return true;
  const k = `rl:${key}`;
  const cur = parseInt(await env.KV.get(k) || '0', 10);
  if (cur >= max) return false;
  await env.KV.put(k, String(cur + 1), { expirationTtl: windowSec });
  return true;
}

export function clientIp(req) {
  return req.headers.get('cf-connecting-ip') || 'local';
}
