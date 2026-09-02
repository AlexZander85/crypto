// КриптоНавигатор · SaaS-интеграция (аддитивный слой поверх приложения).
// Подключается сборкой build-app.mjs одним тегом перед </body>.
// Ничего не ломает офлайн-режим: все сетевые вызовы в try/catch, при недоступности API приложение живёт как раньше.
//
// Возможности (§4/§8/§12):
//  1. Вход по magic-link (модалка), JWT в localStorage cn_jwt, бейдж тарифа.
//  2. Слияние прогресса при первом логине: union cn_* ключей, локальный приоритет — «не затирается» (§8).
//  3. Авто-синк: перехват записи cn_* в localStorage → debounce 5с; flush при скрытии вкладки.
//  4. Content-loader (MVP): манифест + версия в кэше, паки в Cache Storage для офлайна;
//     живая подмена массивов движка — следующий шаг (требует хуков в движке).
(function () {
  'use strict';
  const API = '/api';
  const LS_JWT = 'cn_jwt';
  const SYNC_DEBOUNCE_MS = 5000;

  const $ = (s, c) => (c || document).querySelector(s);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    kids.flat().forEach(k => n.append(k.nodeType ? k : document.createTextNode(k)));
    return n;
  };

  // ---------- состояние ----------
  const getToken = () => { try { return localStorage.getItem(LS_JWT) || ''; } catch { return ''; } };
  const setToken = t => { try { t ? localStorage.setItem(LS_JWT, t) : localStorage.removeItem(LS_JWT); } catch {} };
  const authed = () => !!getToken();

  async function api(path, opts = {}) {
    const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
    if (authed()) headers.authorization = 'Bearer ' + getToken();
    const r = await fetch(API + path, { ...opts, headers });
    let body = null;
    try { body = await r.json(); } catch {}
    if (r.status === 401 && authed()) { setToken(''); render(); }
    return { status: r.status, body };
  }

  function toast(msg, ms = 3500) {
    const t = el('div', { style: 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:999999;background:#0F172A;color:#E2E8F0;border:1px solid #334155;border-radius:12px;padding:10px 18px;font:14px/1.4 system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:90vw' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- сбор/запись cn_* прогресса (§5: весь объект cn_* одним JSON) ----------
  const isCnKey = k => k.startsWith('cn_') && k !== LS_JWT && k !== 'cn_onboarded';
  function collectLocal() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!isCnKey(k)) continue;
      try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { out[k] = localStorage.getItem(k); }
    }
    return out;
  }
  function writeLocal(state) {
    for (const [k, v] of Object.entries(state || {})) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
    }
  }

  // Слияние §8: union ключей, локальный приоритет на конфликте — ничего не теряется.
  function mergeState(local, server) {
    const merged = {};
    const keys = new Set([...Object.keys(local || {}), ...Object.keys(server || {})]);
    for (const k of keys) {
      const l = local?.[k], s = server?.[k];
      if (l && s && typeof l === 'object' && typeof s === 'object' && !Array.isArray(l) && !Array.isArray(s)) {
        merged[k] = { ...s, ...l };
      } else if (Array.isArray(l) && Array.isArray(s)) {
        merged[k] = [...new Set([...s, ...l])];
      } else {
        merged[k] = l !== undefined ? l : s;
      }
    }
    return merged;
  }

  // ---------- синк ----------
  let syncTimer = null, syncing = false;
  async function pushProgress() {
    if (!authed() || syncing) return;
    syncing = true;
    try {
      const state = collectLocal();
      await api('/progress', { method: 'PUT', body: JSON.stringify({ state, app_version: 'v7' }) });
      render();
    } catch {} // офлайн — молча, локально и так сохранено
    syncing = false;
  }
  function scheduleSync() {
    if (!authed()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushProgress, SYNC_DEBOUNCE_MS);
  }

  // перехват записи cn_* в localStorage
  const _setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    _setItem.call(this, k, v);
    if (this === localStorage && isCnKey(k)) scheduleSync();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(syncTimer); pushProgress(); } });

  // вход: тянем серверный прогресс, сливаем с локальным, пишем обе стороны
  async function pullAndMerge() {
    const server = await api('/progress');
    if (server.status !== 200) return toast('Не удалось получить облачный прогресс');
    const localState = collectLocal();
    const serverState = server.body?.state || {};
    const serverKeys = Object.keys(serverState);
    const merged = mergeState(localState, serverState);
    const hadServer = serverKeys.length > 0;
    await writeLocalAndPush(merged);
    toast(hadServer ? 'Облачный прогресс объединён с локальным' : 'Локальный прогресс отправлен в облако');
  }

  async function writeLocalAndPush(merged) {
    writeLocal(merged);
    await api('/progress', { method: 'PUT', body: JSON.stringify({ state: merged, app_version: 'v7' }) });
  }

  async function logout() {
    setToken('');
    render();
    toast('Вышли из аккаунта (прогресс остался локально)');
  }

  // ---------- content-loader MVP (§12.1): манифест + кэш паков ----------
  async function refreshContent() {
    try {
      const m = await api('/content/manifest?locale=ru');
      if (m.status !== 200 || !m.body?.version) return;
      const prev = localStorage.getItem('cn_content_version');
      localStorage.setItem('cn_content_version', m.body.version);
      localStorage.setItem('cn_content_manifest', JSON.stringify(m.body));
      // кэшируем доступные паки в Cache Storage — офлайн-first (§8)
      if ('caches' in window) {
        const c = await caches.open('cn-content-v1');
        for (const p of m.body.packs.slice(0, 12)) {
          try { await c.add(API + '/content/pack/ru/' + p.name); } catch {}
        }
      }
      if (prev && prev !== m.body.version) toast('Контент обновлён до ' + m.body.version);
    } catch {}
  }

  // ---------- UI ----------
  let panel;
  function render() {
    if (!panel) return;
    panel.innerHTML = '';
    if (authed()) {
      api('/me').then(me => {
        if (me.status !== 200) return;
        const tierNames = { free: 'Демо', lite: 'Лайт', pro: 'Про', max: 'Макс' };
        panel.append(
          el('span', { style: 'opacity:.85' }, '☁ ' + (me.body.email || '').replace(/^(.).*(@.*)$/, '$1***$2') + ' · ' + (tierNames[me.body.tier] || me.body.tier)),
          el('button', { onclick: () => pullAndMerge(), title: 'Скачать и объединить прогресс' }, '⟳'),
          el('button', { onclick: logout, title: 'Выйти' }, '×')
        );
      }).catch(() => {});
    } else {
      panel.append(el('button', { onclick: openLogin }, '☁ Вход · синхронизация'));
    }
  }

  let modal;
  function openLogin() {
    if (modal) { modal.remove(); modal = null; return; }
    modal = el('div', { style: 'position:fixed;inset:0;z-index:999998;background:rgba(2,6,17,.7);display:flex;align-items:center;justify-content:center' },
      el('div', { role: 'dialog', 'aria-modal': 'true', style: 'background:#0F172A;color:#E2E8F0;border:1px solid #334155;border-radius:16px;padding:24px;width:min(400px,92vw);font:15px/1.5 system-ui' },
        el('h3', { style: 'margin:0 0 6px;font-size:18px' }, 'Вход без пароля'),
        el('p', { style: 'margin:0 0 14px;opacity:.7;font-size:13px' }, 'Одна ссылка на почту. Прогресс объединится с облачным — ничего не потеряется.'),
        (input = el('input', { type: 'email', placeholder: 'you@example.com', style: 'width:100%;box-sizing:border-box;background:#0B1220;border:1px solid #334155;border-radius:10px;color:inherit;padding:10px 12px;font:inherit;margin-bottom:10px' })),
        (msg = el('div', { style: 'font-size:13px;min-height:18px;margin-bottom:8px;opacity:.85' })),
        el('div', { style: 'display:flex;gap:8px' },
          el('button', {
            onclick: async () => {
              const email = input.value.trim();
              msg.style.color = '';
              msg.textContent = 'Отправляем…';
              try {
                const r = await api('/auth/magic-request', { method: 'POST', body: JSON.stringify({ email }) });
                if (r.status === 429) return (msg.textContent = 'Слишком много попыток. Час не трогаем.');
                if (r.status !== 200) return (msg.textContent = 'Похоже, в почте опечатка.');
                if (r.body?.dev_link) {
                  // dev-режим: подтверждаем ссылку fetch'ем, не покидая приложение
                  msg.textContent = 'Подтверждаем…';
                  const c = await fetch(r.body.dev_link);
                  const cb = await c.json();
                  if (c.status === 200 && cb.token) {
                    setToken(cb.token);
                    modal.remove(); modal = null;
                    await pullAndMerge();
                    await refreshContent();
                    render();
                    toast(cb.is_new ? 'Аккаунт создан. Фаза 0 и психология открыты' : 'С возвращением');
                  } else {
                    msg.textContent = 'Ссылка истекла — попробуй ещё раз';
                  }
                  return;
                }
                msg.textContent = 'Ссылка отправлена на почту. Открой её на этом устройстве.';
              } catch { msg.textContent = 'Сеть недоступна — офлайн-режим, прогресс локальный.'; }
            },
            style: 'flex:1;background:#22C55E;color:#052E16;border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer'
          }, 'Получить ссылку'),
          el('button', { onclick: () => { modal.remove(); modal = null; }, style: 'background:none;border:none;color:inherit;opacity:.7;cursor:pointer' }, 'Позже')
        )
      )
    );
    document.body.append(modal);
    input.focus();
  }
  let input, msg;

  // magic-confirm может открыть страницу как GET — перехватываем токен из URL
  async function handleMagicRedirect() {
    const u = new URL(location.href);
    if (!u.searchParams.has('token')) return false;
    const token = u.searchParams.get('token');
    try {
      const r = await fetch(API + '/auth/magic-confirm?token=' + encodeURIComponent(token));
      const body = await r.json();
      if (r.status === 200 && body.token) {
        setToken(body.token);
        history.replaceState(null, '', u.pathname);
        await pullAndMerge();
        await refreshContent();
        render();
        toast(body.is_new ? 'Аккаунт создан. Фаза 0 и психология открыты' : 'С возвращением');
        return true;
      }
      toast('Ссылка истекла — запроси новую');
    } catch {}
    return false;
  }

  function init() {
    panel = el('div', {
      id: 'cn-cloud-panel',
      style: 'position:fixed;right:14px;bottom:14px;z-index:999997;display:flex;gap:8px;align-items:center;background:rgba(15,23,42,.92);color:#E2E8F0;border:1px solid #334155;border-radius:999px;padding:6px 8px 6px 14px;font:13px/1 system-ui;backdrop-filter:blur(6px)'
    });
    document.body.append(panel);
    render();
    handleMagicRedirect().then(done => { if (!done && authed()) refreshContent(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // экспорт для тестов и отладки
  window.CN_INTEGRATION = { collectLocal, mergeState, pullAndMerge, pushProgress, refreshContent };
})();
