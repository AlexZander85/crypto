// Auth §4/§22.2: magic-link (email) + OAuth Google/GitHub. Паролей нет вообще.
import { json, cors, readJson, signJWT, verifyJWT, bearer, sha256hex, randomToken, rateLimit, clientIp } from './util.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const normalizeEmail = e => String(e || '').trim().toLowerCase();

// отметка последнего входа (миграция 0002) — не блокирует логин при сбое
async function touchLastLogin(env, userId, provider) {
  try {
    await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(Date.now(), userId).run();
  } catch { /* колонка может отсутствовать до миграции 0002 в старых окружениях */ }
}

async function getUserByEmail(env, email) {
  return env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}
async function createUser(env, email, provider) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO users (id, email, provider, created_at, access_tier, locale) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, email, provider, now, 'free', 'ru').run();
  return { id, email, provider, access_tier: 'free', locale: 'ru', created_at: now };
}
export async function issueJWT(env, user) {
  return signJWT(
    { sub: user.id, email: user.email, tier: user.access_tier, locale: user.locale },
    env.JWT_SECRET,
    parseInt(env.JWT_TTL_SECONDS || '2592000', 10)
  );
}
export async function requireAuth(env, req) {
  return verifyJWT(bearer(req), env.JWT_SECRET);
}

// ---------- Turnstile §22.2 ----------
async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // в dev без ключа не блокируем
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = await r.json();
  return !!d.success;
}

// ---------- отправка письма ----------
async function sendMagicEmail(env, email, link) {
  if (!env.RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'КриптоНавигатор <onboarding@resend.dev>',
      to: email,
      subject: 'Вход в КриптоНавигатор',
      html: `<p>Вход по одноразовой ссылке (действует 15 минут):</p><p><a href="${link}">${link}</a></p><p>Если это не ты — просто игнорируй письмо.</p>`
    })
  });
  return r.ok;
}

// POST /api/auth/magic-request  { email, turnstile? }
export async function magicRequest(ctx, req) {
  const { env } = ctx;
  const body = await readJson(req);
  const email = normalizeEmail(body?.email);
  if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, 400, { 'access-control-allow-origin': corsOrigin(env, req) });

  const ip = clientIp(req);
  // §22.2: 5/час по email и IP на проде. В dev (wrangler dev) cf-connecting-ip всегда
  // 'local' — один счётчик на все тесты, поэтому лимиты подняты только для dev-окружения.
  const devScale = env.ENV === 'dev' ? 200 : 1;
  if (!(await rateLimit(env, `auth:${ip}`, 10 * devScale, 3600)) || !(await rateLimit(env, `auth-em:${email}`, 5 * devScale, 3600))) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (!(await verifyTurnstile(env, body?.turnstile, ip))) return json({ error: 'captcha_failed' }, 403);

  // одноразовый токен: храним только хэш
  const token = randomToken(32);
  await env.DB.prepare('INSERT INTO auth_tokens (token, email, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256hex(token), email, Date.now() + 15 * 60 * 1000).run();

  const base = new URL(req.url).origin;
  const link = `${base}/api/auth/magic-confirm?token=${token}`;
  const sent = await sendMagicEmail(env, email, link);

  // dev-режим без почтового ключа: честно возвращаем ссылку (только ENV=dev)
  const resp = sent
    ? { ok: true, sent: true }
    : (env.ENV === 'dev' ? { ok: true, sent: false, dev_link: link } : { ok: true, sent: false });

  return json(resp, 200, { 'access-control-allow-origin': corsOrigin(env, req) });
}

// GET /api/auth/magic-confirm?token=…
export async function magicConfirm(ctx, req) {
  const { env } = ctx;
  const token = new URL(req.url).searchParams.get('token') || '';
  const hash = await sha256hex(token);
  const row = await env.DB.prepare('SELECT * FROM auth_tokens WHERE token = ?').bind(hash).first();
  if (!row || row.used_at || row.expires_at < Date.now()) {
    return json({ error: 'invalid_or_expired' }, 400);
  }
  await env.DB.prepare('UPDATE auth_tokens SET used_at = ? WHERE token = ?').bind(Date.now(), hash).run();

  const email = normalizeEmail(row.email);
  let user = await getUserByEmail(env, email);
  const isNew = !user;
  if (!user) user = await createUser(env, email, 'email');
  await touchLastLogin(env, user.id, 'email');
  const jwt = await issueJWT(env, user);

  const { track } = await import('./telemetry.js');
  track(ctx, isNew ? 'signup' : 'login', user.id, { provider: 'email', locale: user.locale });

  // Переход из письма (браузерная навигация): HTML-страница автолога на том же origin —
  // токен попадает в localStorage приложения, человека возвращает в курс.
  const accepts = req.headers.get('accept') || '';
  const secFetch = req.headers.get('sec-fetch-mode') || '';
  if (accepts.includes('text/html') || secFetch === 'navigate') {
    const ttl = parseInt(env.JWT_TTL_SECONDS || '2592000', 10);
    return new Response(
      `<!DOCTYPE html><meta charset="utf-8"><title>Вход…</title>` +
      `<script>try{localStorage.setItem('cn_jwt',${JSON.stringify(jwt)})}catch(e){}location.replace('/index.html');</script>`,
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }

  // JWT и в cookie, и в теле: фронт хранит в localStorage (§4.2)
  return json(
    { ok: true, token: jwt, user: { id: user.id, email: user.email, tier: user.access_tier, locale: user.locale }, is_new: isNew },
    200,
    {
      'access-control-allow-origin': corsOrigin(env, req),
      'set-cookie': `cn_jwt=${jwt}; HttpOnly; Secure; SameSite=Lax; Max-Age=${parseInt(env.JWT_TTL_SECONDS || '2592000', 10)}; Path=/`
    }
  );
}

// ---------- OAuth (§4.1 способ 1) ----------
const OAUTH = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email',
    idEnv: 'OAUTH_GOOGLE_ID',
    secretEnv: 'OAUTH_GOOGLE_SECRET'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'user:email',
    idEnv: 'OAUTH_GITHUB_ID',
    secretEnv: 'OAUTH_GITHUB_SECRET'
  }
};

// GET /api/auth/oauth/:provider → redirect (или честный 501, если не настроен)
export async function oauthStart(ctx, req, provider) {
  const { env } = ctx;
  const cfg = OAUTH[provider];
  const clientId = env[cfg.idEnv];
  if (!clientId || !env[cfg.secretEnv]) {
    return json({ error: 'oauth_not_configured', provider }, 501);
  }
  const state = randomToken(16);
  const origin = new URL(req.url).origin;
  await env.KV.put(`oauth-state:${state}`, '1', { expirationTtl: 600 });
  const url = new URL(cfg.authUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/oauth/${provider}/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', cfg.scope);
  url.searchParams.set('state', state);
  return Response.redirect(url.toString(), 302);
}

// GET /api/auth/oauth/:provider/callback?code&state
export async function oauthCallback(ctx, req, provider) {
  const { env } = ctx;
  const cfg = OAUTH[provider];
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !(await env.KV.get(`oauth-state:${state}`))) {
    return json({ error: 'bad_state' }, 400);
  }
  await env.KV.delete(`oauth-state:${state}`);
  if (!env[cfg.idEnv] || !env[cfg.secretEnv]) return json({ error: 'oauth_not_configured' }, 501);

  // обмен кода на токен
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      client_id: env[cfg.idEnv],
      client_secret: env[cfg.secretEnv],
      code,
      redirect_uri: `${url.origin}/api/auth/oauth/${provider}/callback`,
      grant_type: 'authorization_code'
    })
  });
  const tok = await tokenRes.json();
  if (!tok.access_token) return json({ error: 'token_exchange_failed' }, 502);

  // профиль + email
  let email = null;
  if (provider === 'google') {
    const u = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tok.access_token}` }
    })).json();
    email = normalizeEmail(u.email);
  } else {
    const u = await (await fetch('https://api.github.com/user', {
      headers: { authorization: `Bearer ${tok.access_token}`, 'user-agent': 'cryptonavigator' }
    })).json();
    if (u.email) email = normalizeEmail(u.email);
    else {
      const emails = await (await fetch('https://api.github.com/user/emails', {
        headers: { authorization: `Bearer ${tok.access_token}`, 'user-agent': 'cryptonavigator' }
      })).json();
      const primary = Array.isArray(emails) ? emails.find(e => e.primary) : null;
      email = primary ? normalizeEmail(primary.email) : null;
    }
  }
  if (!email) return json({ error: 'email_unavailable' }, 502);

  let user = await getUserByEmail(env, email);
  const isNew = !user;
  if (!user) user = await createUser(env, email, provider);
  await touchLastLogin(env, user.id, provider);
  const jwt = await issueJWT(env, user);

  const { track } = await import('./telemetry.js');
  track(ctx, isNew ? 'signup' : 'login', user.id, { provider, locale: user.locale });

  return json({ ok: true, token: jwt, user: { id: user.id, email, tier: user.access_tier, locale: user.locale }, is_new: isNew });
}

// GET /api/me (JWT)
export async function me(ctx, req) {
  const { env } = ctx;
  const claims = await requireAuth(env, req);
  if (!claims) return json({ error: 'unauthorized' }, 401);
  const user = await env.DB.prepare('SELECT id, email, access_tier, locale, created_at, access_expires_at FROM users WHERE id = ?')
    .bind(claims.sub).first();
  if (!user) return json({ error: 'unauthorized' }, 401);
  // подписка «Макс»: истёкший период → фактический даунгрейд при чтении (§9)
  let tier = user.access_tier;
  if (tier === 'max' && user.access_expires_at && user.access_expires_at < Date.now()) {
    const down = env.TIER_DOWNGRADE && env.TIER_DOWNGRADE !== 'max' ? env.TIER_DOWNGRADE : 'free';
    try {
      await env.DB.prepare('UPDATE users SET access_tier = ?, access_changed_at = ? WHERE id = ?')
        .bind(down, Date.now(), user.id).run();
      const { track } = await import('./telemetry.js');
      track(ctx, 'tier_change', user.id, { from: 'max', to: down, reason: 'subscription_expired' });
    } catch { /* даунгрейд не блокирует ответ */ }
    tier = down;
  }
  return json({ id: user.id, email: user.email, tier, locale: user.locale, access_expires_at: user.access_expires_at || null }, 200);
}

function corsOrigin(env, req) {
  return (env.ALLOWED_ORIGIN || '*');
}
