// Точка входа API «КриптоНавигатор» (§6). Роутер без зависимостей.
import { json, cors } from './util.js';
import * as auth from './auth.js';
import * as progress from './progress.js';
import * as content from './content.js';
import * as payments from './payments.js';
import * as paymentsCrypto from './payments-crypto.js';
import { adminOverview, adminGrantTier } from './admin.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    const C = cors(env);
    const H = { 'access-control-allow-origin': C['access-control-allow-origin'] };

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: C });

    try {
      // health
      if (path === '/api/health') return json({ ok: true, env: env.ENV }, 200, H);

      // ---- auth ----
      if (path === '/api/auth/magic-request' && req.method === 'POST') return auth.magicRequest({ env, ctx }, req);
      if (path === '/api/auth/magic-confirm' && req.method === 'GET') return auth.magicConfirm({ env, ctx }, req);
      let m;
      if ((m = path.match(/^\/api\/auth\/oauth\/(google|github)\/?$/)) && req.method === 'GET') {
        return auth.oauthStart({ env, ctx }, req, m[1]);
      }
      if ((m = path.match(/^\/api\/auth\/oauth\/(google|github)\/callback$/)) && req.method === 'GET') {
        return auth.oauthCallback({ env, ctx }, req, m[1]);
      }
      if (path === '/api/me' && req.method === 'GET') return auth.me({ env, ctx }, req);

      // ---- progress ----
      if (path === '/api/progress' && req.method === 'GET') return progress.getProgress({ env, ctx }, req);
      if (path === '/api/progress' && req.method === 'PUT') return progress.putProgress({ env, ctx }, req);

      // ---- content ----
      if (path === '/api/content/manifest' && req.method === 'GET') return content.manifest({ env, ctx }, req);
      if ((m = path.match(/^\/api\/content\/pack\/([a-z-]+)\/([a-z0-9_-]+)$/)) && req.method === 'GET') {
        return content.pack({ env, ctx }, req, m[1], m[2]);
      }

      // ---- payments ----
      if (path === '/api/pay/yookassa/webhook' && req.method === 'POST') return payments.yookassaWebhook({ env, ctx }, req);
      if (path === '/api/pay/lemonsqueezy/webhook' && req.method === 'POST') return payments.lemonsqueezyWebhook({ env, ctx }, req);
      if (path === '/api/pay/crypto/invoice' && req.method === 'POST') return paymentsCrypto.createInvoice({ env, ctx }, req);
      if (path === '/api/pay/crypto/webhook' && req.method === 'POST') return paymentsCrypto.cryptoWebhook({ env, ctx }, req);

      // ---- feedback ----
      if (path === '/api/feedback' && req.method === 'POST') {
        const claims = await auth.requireAuth(env, req);
        if (!claims) return json({ error: 'unauthorized' }, 401, H);
        const body = await req.json().catch(() => null);
        if (!body?.lesson_id) return json({ error: 'bad_request' }, 400, H);
        await env.DB.prepare('INSERT INTO feedback (id, user_id, lesson_id, score, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), claims.sub, String(body.lesson_id).slice(0, 64),
            Number.isFinite(body.score) ? Math.max(0, Math.min(5, body.score | 0)) : null,
            String(body.comment || '').slice(0, 2000), Date.now()).run();
        return json({ ok: true }, 200, H);
      }

      // ---- admin (за секретом; на проде дополнительно за Cloudflare Access) ----
      if (path === '/admin/api/overview' && req.method === 'GET') return adminOverview({ env, ctx }, req);
      if (path === '/admin/api/grant_tier' && req.method === 'POST') return adminGrantTier({ env, ctx }, req);

      return json({ error: 'not_found' }, 404, H);
    } catch (err) {
      // телеметрия ошибки без текста наружу
      try {
        const { track } = await import('./telemetry.js');
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(err?.message || err)));
        track({ env, ctx }, 'app_error', null, {
          where: path,
          msg_hash: [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
        });
      } catch { /* ignore */ }
      return json({ error: 'internal' }, 500, H);
    }
  }
};
