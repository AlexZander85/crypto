/* service-worker.js — PWA/офлайн §15 (промта v2.0).
   Стратегии:
   - шелл (/, /index.html): network-first с фолбэком в кэш (свежий шелл, офлайн-старт);
   - /app.js?v=<hash>, /saas-front.js?v=…: cache-first (immutable по build-hash);
   - /api/content/pack/…?v=<packhash>: cache-first (паки immutable по хэшу);
   - /api/content/manifest: network-first (новая версия манифеста → новые паки);
   - прочие /api/*: network-only (прогресс/наставник — только сеть; сбой сети
     не кэшируется, прогресс живёт в localStorage);
   - иконки/админка: cache-first. */
const VERSION = 'cn-v1';
const SHELL_CACHE = VERSION + '-shell';
const ASSET_CACHE = VERSION + 'assets';
const PACK_CACHE = VERSION + '-packs';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    try { await shell.addAll(['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']); } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => !n.startsWith(VERSION)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) { try { await cache.put(request, res.clone()); } catch (e) {} }
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) { try { await cache.put(request, res.clone()); } catch (e) {} }
    return res;
  } catch (e) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // движок и SaaS-слой: immutable по build-hash
  if (url.pathname === '/app.js' || url.pathname === '/saas-front.js') {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
  // паки: immutable по pack-version в query
  if (url.pathname.startsWith('/api/content/pack/')) {
    event.respondWith(cacheFirst(req, PACK_CACHE));
    return;
  }
  // манифест: network-first (версия контента может обновиться без передеплоя)
  if (url.pathname === '/api/content/manifest') {
    event.respondWith(networkFirst(req, PACK_CACHE));
    return;
  }
  // прочее API — только сеть (прогресс защищён localStorage-синком)
  if (url.pathname.startsWith('/api/')) return;
  // шелл и статика
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }
  event.respondWith(cacheFirst(req, ASSET_CACHE));
});
