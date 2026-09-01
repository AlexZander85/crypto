// saas-front.js — SaaS-слой (§6/§8/§12 промта v2.0). Замена integration.js.
// Аддитивный IIFE поверх движка v12.9. Офлайн-инвариант: любая сеть/ошибка — тихо,
// продукт живёт как локальный v12.9. Движок не редактируется — только обёртки.
//
// Возможности Стадии 3:
//   1. Вход: magic-link (dev — dev_link на месте), OAuth Google/GitHub, JWT cn_jwt.
//   2. Синк прогресса: перехват Storage.setItem для cn_*, политики P1–P4 (§8.2),
//      классифицированное слияние при первом логине, flush при скрытии вкладки.
//   3. Learn-first: режим «🎓 Обучение» по умолчанию + переключатель «Классика» (§6.2).
//   4. Телеметрия: learn_open, perf (§12.1) — fire-and-forget.
//   5. Панель «☁»: статус, тарифный бейдж, ручной синк.
(function () {
  'use strict';

  // ============================ политики синка (§8.2) ============================
  const P1 = new Set(['cn_learned', 'cn_lessons', 'cn_phase_tests', 'cn_math_tests', 'cn_lesson_checks',
    'cn_srs_state', 'cn_topic_stats', 'cn_sim_mastery', 'cn_sim_action_stats', 'cn_tasks',
    'cn_quiz_mistakes', 'cn_term_days', 'cn_key_outcomes_done', 'cn_checkins', 'cn_daily_quests',
    'cn_unlocked_skills', 'cn_art_progress', 'cn_curve_progress', 'cn_margin_progress', 'cn_prod_progress',
    'cn_ps_progress', 'cn_panic_progress', 'cn_launch_progress', 'cn_detective', 'cn_fund_aum',
    'cn_future_letter', 'cn_charter', 'cn_hypotheses', 'cn_triggers', 'cn_sparring_done',
    'cn_learn_checks_done', 'cn_learn_practice_done', 'cn_learn_selfcheck', 'cn_learn_widget_tried',
    'cn_learn_bookmarks', 'cn_learn_fc', 'cn_learn_notes', 'cn_learn_syllabus']);
  const P2 = new Set(['cn_user_xp', 'cn_feynman_xp', 'cn_feynman_portfolio', 'cn_mt_best', 'cn_brier',
    'cn_live_brier', 'cn_streak_count', 'cn_streak_last', 'cn_quiz', 'cn_interleaving_stats',
    'cn_news_stats', 'cn_news_word_counts', 'cn_hints']);
  const P3_PREFIX = ['cn_candle_'];
  const P4 = new Set(['cn_jwt', 'cn_mentor_device', 'cn_mentor_usage', 'cn_onboarded', 'cn_tour_done',
    'cn_news_cache', 'cn_news_timer', 'cn_live_seen', 'cn_live_think_first', 'cn_live_feynman',
    'cn_live_diff', 'cn_first_progress', 'cn_attention_warn', 'cn_saas_mode', 'cn_gloss_idx_migrated_v3',
    'cn_schema_version', 'cn_tier_override', 'cn_candle_builds', 'cn_news_loop',
    // SaaS-служебные (не являются прогрессом v12.9)
    'cn_manifest_cache', 'cn_sync_ts', 'cn_saas_welcomed', 'cn_perf_sent', 'cn_learn_open_sent']);
  const P4_PREFIX = ['cn_live_cache_', 'cn_saas_'];

  const isP4 = k => P4.has(k) || P4_PREFIX.some(p => k.startsWith(p));
  const isP1 = k => P1.has(k);
  const isP2 = k => P2.has(k);
  const isP3 = k => !isP1(k) && !isP2(k) && !isP4(k) && P3_PREFIX.some(p => k.startsWith(p));
  // неизвестные ключи: не P4 → синхронизируем как LWW («не знаешь формат — LWW, но не теряй ключ», §8.2)

  // ============================ утилиты ============================
  const $id = id => document.getElementById(id);
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function jparse(s) { try { return JSON.parse(s); } catch (e) { return s; } }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const CN_BUILD = window.CN_BUILD || {};
  const API = '/api';
  let JWT = lsGet('cn_jwt') || '';
  let me = null; // { id, email, tier, locale }

  function authed() { return !!JWT; }
  function setToken(t) {
    JWT = t || '';
    if (JWT) lsSet('cn_jwt', JWT); else lsDel('cn_jwt');
  }

  async function api(path, opts = {}) {
    const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
    if (JWT) headers.authorization = 'Bearer ' + JWT;
    // пути, уже начинающиеся с /api (например dev_link из magic-request), не дублируются
    const url = path.startsWith('/api/') ? path : API + path;
    const r = await fetch(url, { ...opts, headers });
    let body = null;
    try { body = await r.json(); } catch (e) {}
    if (r.status === 401 && authed()) { silentLogout(); }
    return { status: r.status, body };
  }

  function silentLogout() {
    setToken('');
    me = null;
    renderPanel();
  }

  // ============================ телеметрия (§12.1) ============================
  function telemetry(type, meta) {
    if (!authed()) return;
    try {
      fetch(API + '/telemetry', {
        method: 'POST', keepalive: true,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + JWT },
        body: JSON.stringify({ type, meta: meta || {} })
      }).catch(() => {});
    } catch (e) {}
  }

  // ============================ CSS ============================
  const CSS = `
#cn_cloud_btn{position:fixed;top:10px;right:12px;z-index:1100000;width:38px;height:38px;border-radius:50%;
  border:1px solid #2c3350;background:#141830;color:#e8eaf2;font-size:17px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4);
  display:flex;align-items:center;justify-content:center;transition:transform .15s}
#cn_cloud_btn:hover{transform:scale(1.08)}
#cn_panel{position:fixed;top:56px;right:12px;z-index:1100001;width:280px;background:#12162b;border:1px solid #2c3350;
  border-radius:14px;padding:14px;color:#e8eaf2;font:13.5px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.55);display:none}
#cn_panel.open{display:block}
#cn_panel .cn-title{font-weight:700;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
#cn_panel .cn-badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px}
.cn-badge.free{background:#2a3050;color:#9aa3c0}.cn-badge.lite{background:#1d3a2f;color:#5fd4a2}
.cn-badge.pro{background:#173047;color:#5cb8f7}.cn-badge.max{background:#33245c;color:#b78cff}
#cn_panel .cn-row{display:flex;gap:8px;margin-top:8px}
#cn_panel button{flex:1;padding:8px 10px;border-radius:10px;border:1px solid #2c3350;background:#1a2040;color:#e8eaf2;cursor:pointer;font-size:13px;font-weight:600}
#cn_panel button:hover{background:#232a52}
#cn_panel button.primary{background:linear-gradient(90deg,#6c5ce7,#5b4bd6);border-color:transparent}
#cn_panel .cn-muted{color:#8b93b5;font-size:12px;margin-top:8px}
.cn-modal-back{position:fixed;inset:0;z-index:1110000;background:rgba(5,8,20,.72);display:flex;align-items:center;justify-content:center;padding:16px}
.cn-modal{width:100%;max-width:380px;background:#12162b;border:1px solid #2c3350;border-radius:16px;padding:22px;color:#e8eaf2;
  font:14px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.cn-modal h3{margin:0 0 6px;font-size:18px}
.cn-modal .sub{color:#8b93b5;font-size:12.5px;margin-bottom:14px}
.cn-modal input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1px solid #2c3350;background:#0d1022;color:#e8eaf2;font-size:14px;margin:8px 0}
.cn-modal input:focus{outline:none;border-color:#6c5ce7}
.cn-modal .btn{width:100%;padding:11px;border-radius:10px;border:0;background:linear-gradient(90deg,#6c5ce7,#5b4bd6);color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
.cn-modal .btn.ghost{background:#1a2040;border:1px solid #2c3350}
.cn-modal .oauth{display:flex;gap:8px;margin-top:10px}
.cn-modal .oauth button{flex:1;padding:9px;border-radius:10px;border:1px solid #2c3350;background:#1a2040;color:#e8eaf2;cursor:pointer;font-size:13px}
.cn-modal .err{color:#ff7a8a;font-size:12.5px;min-height:16px;margin-top:6px}
.cn-modal .cn-x{float:right;background:none;border:0;color:#8b93b5;font-size:18px;cursor:pointer;padding:0 2px}
#cn_mode_chip{position:fixed;left:12px;bottom:12px;z-index:1100000;padding:7px 14px;border-radius:20px;border:1px solid #2c3350;
  background:#141830cc;color:#c7cde8;font-size:12.5px;cursor:pointer;backdrop-filter:blur(6px);font-family:system-ui,sans-serif}
#cn_mode_chip:hover{background:#1c2242}
.cn-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1120000;background:#0F172A;color:#E2E8F0;
  border:1px solid #334155;border-radius:12px;padding:10px 18px;font:13.5px/1.4 system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:88vw}
.cn-sync-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#5fd4a2}
.cn-sync-dot.dirty{background:#f6c86a}
.cn-sync-dot.off{background:#8b93b5}
`;

  // ============================ UI: панель «☁» ============================
  let panel, panelOpen = false;

  function ensureUI() {
    if ($id('cn_cloud_btn')) return;
    const st = document.createElement('style');
    st.id = 'cn_saas_css';
    st.textContent = CSS;
    document.head.appendChild(st);

    const btn = document.createElement('button');
    btn.id = 'cn_cloud_btn';
    btn.title = 'Аккаунт КриптоНавигатора';
    btn.textContent = '☁';
    btn.addEventListener('click', () => { panelOpen = !panelOpen; renderPanel(); });
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.id = 'cn_panel';
    document.body.appendChild(panel);
    document.addEventListener('click', e => {
      if (panelOpen && !$id('cn_panel').contains(e.target) && e.target !== btn) { panelOpen = false; renderPanel(); }
    });

    const chip = document.createElement('button');
    chip.id = 'cn_mode_chip';
    chip.addEventListener('click', toggleMode);
    document.body.appendChild(chip);
    renderChip();
  }

  function tierLabel(t) { return { free: '🌱 Демо', lite: '🔑 Лайт', pro: '📊 Про', max: '🤖 Макс' }[t] || t; }

  function renderPanel() {
    if (!panel) return;
    panel.classList.toggle('open', panelOpen);
    if (!panelOpen) return;
    if (authed() && me) {
      const syncTs = Number(lsGet('cn_sync_ts') || 0);
      const ago = syncTs ? Math.round((Date.now() - syncTs) / 60000) : null;
      panel.innerHTML =
        `<div class="cn-title"><span>${escapeHtml(me.email || 'Аккаунт')}</span>` +
        `<span class="cn-badge ${escapeHtml(me.tier || 'free')}">${tierLabel(me.tier)}</span></div>` +
        `<div class="cn-row"><button id="cn_tariffs">Тарифы</button><button id="cn_syncnow">Синк сейчас</button></div>` +
        `<div class="cn-row"><button id="cn_logout" class="ghost">Выйти</button><button id="cn_hidepanel" class="ghost">Скрыть</button></div>` +
        `<div class="cn-muted"><span class="cn-sync-dot ${syncDirty ? 'dirty' : ''}"></span>` +
        `${ago === null ? 'Синк: ожидание' : ago < 1 ? 'Синхронизировано только что' : 'Синхронизировано ' + ago + ' мин назад'}</div>`;
      $id('cn_tariffs').addEventListener('click', () => { panelOpen = false; renderPanel(); if (typeof window.CN_SAAS_showTariffs === 'function') window.CN_SAAS_showTariffs(); });
      $id('cn_syncnow').addEventListener('click', async () => { toast('Подтягиваем прогресс…'); await pullAndReload(); });
      $id('cn_logout').addEventListener('click', () => { flushNow(); setToken(''); me = null; panelOpen = false; renderPanel(); toast('Вы вышли. Прогресс остался на устройстве.'); });
      $id('cn_hidepanel').addEventListener('click', () => { panelOpen = false; renderPanel(); });
    } else {
      panel.innerHTML =
        `<div class="cn-title"><span>Гость</span><span class="cn-badge free">${tierLabel('free')}</span></div>` +
        `<div class="cn-muted">Демо-курс доступен без аккаунта. Войди — и прогресс будет синхронизироваться между устройствами.</div>` +
        `<div class="cn-row"><button id="cn_login" class="primary">Войти</button></div>` +
        `<div class="cn-row"><button id="cn_hidepanel2" class="ghost">Скрыть</button></div>`;
      $id('cn_login').addEventListener('click', () => { panelOpen = false; renderPanel(); showLoginModal(); });
      $id('cn_hidepanel2').addEventListener('click', () => { panelOpen = false; renderPanel(); });
    }
  }

  function renderChip() {
    const chip = $id('cn_mode_chip');
    if (!chip) return;
    const classic = getMode() === 'classic';
    chip.textContent = classic ? '🎓 Обучение' : '💻 Классический интерфейс';
  }

  function toast(msg, ms = 3200) {
    try {
      const t = document.createElement('div');
      t.className = 'cn-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), ms);
    } catch (e) {}
  }

  // ============================ вход (§6.1) ============================
  function showLoginModal() {
    if ($id('cn_login_back')) return;
    const back = document.createElement('div');
    back.className = 'cn-modal-back';
    back.id = 'cn_login_back';
    back.innerHTML = `<div class="cn-modal">
      <button class="cn-x" id="cn_login_x">✕</button>
      <h3>☁ Вход в КриптоНавигатор</h3>
      <div class="sub">Без пароля: пришлём одноразовую ссылку. Прогресс объединится автоматически — ничего не потеряется.</div>
      <input id="cn_email" type="email" placeholder="email@example.com" autocomplete="email">
      <div class="err" id="cn_login_err"></div>
      <button class="btn" id="cn_login_go">Войти по ссылке</button>
      <div class="oauth">
        <button id="cn_oauth_g">Google</button>
        <button id="cn_oauth_h">GitHub</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    $id('cn_login_x').addEventListener('click', () => back.remove());
    $id('cn_oauth_g').addEventListener('click', () => { location.href = API + '/auth/oauth/google'; });
    $id('cn_oauth_h').addEventListener('click', () => { location.href = API + '/auth/oauth/github'; });
    $id('cn_login_go').addEventListener('click', doMagicLogin);
    $id('cn_email').addEventListener('keydown', e => { if (e.key === 'Enter') doMagicLogin(); });
    setTimeout(() => $id('cn_email') && $id('cn_email').focus(), 50);

    async function doMagicLogin() {
      const email = ($id('cn_email').value || '').trim();
      const err = $id('cn_login_err');
      const btn = $id('cn_login_go');
      err.textContent = '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Проверь адрес почты'; return; }
      btn.disabled = true; btn.textContent = 'Отправляем…';
      try {
        const r = await api('/auth/magic-request', { method: 'POST', body: JSON.stringify({ email }) });
        if (r.status !== 200 || !r.body || r.body.ok !== true) {
          err.textContent = r.body && r.body.error === 'rate_limited' ? 'Слишком много попыток — попробуй через час' : 'Не удалось отправить письмо';
          btn.disabled = false; btn.textContent = 'Войти по ссылке';
          return;
        }
        if (r.body.dev_link) {
          // dev-режим: подтверждаем на месте (JSON, без навигации)
          const confirmPath = String(r.body.dev_link).replace(/^https?:\/\/[^/]+/, '');
          const c = await api(confirmPath, { headers: { accept: 'application/json' } });
          if (c.status === 200 && c.body && c.body.token) {
            await afterLogin(c.body.token, c.body.user);
            back.remove();
            toast('Вход выполнен. Прогресс синхронизирован.');
            return;
          }
          err.textContent = 'Ссылка не сработала — попробуй ещё раз';
        } else if (r.body.sent) {
          btn.textContent = 'Письмо отправлено ✓';
          err.textContent = 'Проверь почту: ссылка действует 15 минут.';
        } else {
          err.textContent = 'Почтовый сервис не настроен. Попробуй вход через Google/GitHub.';
        }
      } catch (e) {
        err.textContent = 'Сеть недоступна — попробуй позже';
      }
      btn.disabled = false; if (btn.textContent === 'Отправляем…') btn.textContent = 'Войти по ссылке';
    }
  }

  async function afterLogin(token, user) {
    setToken(token);
    await refreshMe();
    await pullMerge(false);  // классифицированное слияние (§8.3) + запись в localStorage
    // Движок v12.9 держит прогресс в памяти — любая пауза после записи даёт его save()
    // шанс перетереть слитые ключи устаревшим снимком. Поэтому reload СРАЗУ после записи,
    // в том же синхронном потоке (паки уже в кэше — старт быстрый).
    toast('Вход выполнен. Загружаем твой прогресс…');
    setTimeout(() => { try { location.reload(); } catch (e) {} }, 350);
  }

  async function refreshMe() {
    if (!authed()) { me = null; return; }
    try {
      const r = await api('/me');
      if (r.status === 200 && r.body && r.body.id) me = r.body;
      else me = null;
    } catch (e) { me = null; }
    const prevTier = lsGet('cn_saas_tier');
    if (me && prevTier && prevTier !== me.tier && typeof window.CN_SAAS_onTierChange === 'function') {
      try { window.CN_SAAS_onTierChange(prevTier, me.tier); } catch (e) {}
    }
    if (me) lsSet('cn_saas_tier', me.tier);
  }

  // ============================ синк: сбор, слияние, отправка (§8.3) ============================
  const SYNC_EXCLUDE = k => k === 'cn_jwt';
  function collectLocal() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('cn_') || SYNC_EXCLUDE(k) || isP4(k)) continue;
        out[k] = jparse(lsGet(k));
      }
    } catch (e) {}
    return out;
  }

  const isPlain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function deepMerge(L, S) {
    const out = isPlain(L) ? { ...L } : (L === undefined ? S : L);
    if (!isPlain(L) || !isPlain(S)) return (L === undefined ? S : L);
    for (const k of Object.keys(S)) {
      out[k] = (isPlain(L[k]) && isPlain(S[k])) ? deepMerge(L[k], S[k]) : (L[k] === undefined ? S[k] : L[k]);
    }
    return out;
  }

  function mergeKey(k, L, S) {
    if (L === undefined) return S;
    if (S === undefined) return L;
    if (isP1(k)) return deepMerge(L, S); // union, конфликт → локальное
    if (isP2(k)) {
      // числовые — максимум
      if (typeof L === 'number' && typeof S === 'number') return Math.max(L, S);
      if (k === 'cn_quiz' && isPlain(L) && isPlain(S)) {
        const o = { ...S, ...L }; // прочие поля — локальные
        o.best = Math.max(Number(S.best) || 0, Number(L.best) || 0);
        return o;
      }
      if (k === 'cn_interleaving_stats' && isPlain(L) && isPlain(S)) {
        const o = { ...S, ...L };
        for (const m of Object.keys(S)) if (typeof S[m] === 'number' && typeof L[m] === 'number') o[m] = Math.max(S[m], L[m]);
        return o;
      }
      return isPlain(L) && isPlain(S) ? deepMerge(L, S) : L; // нечисловое — локальное
    }
    // P3 и неизвестные: LWW — локальная сессия свежее
    return L;
  }

  function mergeState(localCapsule, serverState) {
    const out = {};
    const keys = new Set([...Object.keys(localCapsule), ...Object.keys(serverState || {})]);
    keys.forEach(k => { if (isP4(k)) return; out[k] = mergeKey(k, localCapsule[k], (serverState || {})[k]); });
    return out;
  }

  async function pullMerge(pushAfter) {
    if (!authed()) { try { console.warn('[saas-front] pullMerge: нет JWT'); } catch (e) {} return; }
    try {
      const r = await api('/progress');
      if (r.status !== 200) { try { console.warn('[saas-front] pullMerge: HTTP ' + r.status); } catch (e) {} return; }
      const serverState = (r.body && r.body.state) || {};
      const localCapsule = collectLocal();
      const merged = mergeState(localCapsule, serverState);
      // пишем только отличающееся; локальное — приоритет (§8.2)
      let written = 0;
      for (const k of Object.keys(merged)) {
        const val = merged[k];
        const cur = lsGet(k);
        const next = JSON.stringify(val);
        if (cur !== next) { origSetItem.call(localStorage, k, next); written++; }
      }
      try { console.warn('[saas-front] pullMerge: серверных ключей ' + Object.keys(serverState).length + ', записей ' + written); } catch (e) {}
      if (pushAfter) await pushProgress(true);
    } catch (e) { try { console.warn('[saas-front] pullMerge: ' + (e && e.message || e)); } catch (e2) {} }
  }

  async function pullMergePush() {
    await pullMerge(true);
  }

  // pull → запись → немедленная перезагрузка (без await после записи):
  // кнопка «Синк сейчас» и сценарии подтягивания прогресса с сервера
  async function pullAndReload() {
    await pullMerge(false);
    try { location.reload(); } catch (e) {}
  }

  let syncTimer = null, syncDirty = false, pushing = false;
  function appVersion() {
    const mv = jparse(lsGet('cn_manifest_cache') || 'null');
    return (mv && mv.version ? mv.version : 'ru.unknown') + '/' + (CN_BUILD.app || 'dev');
  }

  async function pushProgress(force) {
    if (!authed() || pushing) return;
    pushing = true;
    try {
      const r = await api('/progress', {
        method: 'PUT',
        body: JSON.stringify({ state: collectLocal(), app_version: appVersion() })
      });
      if (r.status === 200) { syncDirty = false; lsSet('cn_sync_ts', String(Date.now())); }
      else if (r.status === 401) { /* silentLogout уже вызван */ }
    } catch (e) { syncDirty = true; }
    pushing = false;
    if (panelOpen && force) renderPanel();
  }

  function queueSync() {
    if (!authed()) return;
    syncDirty = true;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { pushProgress(false); }, 5000);
  }

  function flushNow() {
    if (authed() && syncDirty) {
      try {
        fetch(API + '/progress', {
          method: 'PUT', keepalive: true,
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + JWT },
          body: JSON.stringify({ state: collectLocal(), app_version: appVersion() })
        }).catch(() => {});
      } catch (e) {}
    }
  }

  // перехват записи cn_* (§8.3) — оборачиваем оригинал, движок ничего не знает
  const origSetItem = Storage.prototype.setItem;
  const origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    origSetItem.call(this, k, v);
    try { if (typeof k === 'string' && k.startsWith('cn_') && k !== 'cn_jwt' && !isP4(k)) queueSync(); } catch (e) {}
  };
  Storage.prototype.removeItem = function (k) {
    origRemoveItem.call(this, k);
    try { if (typeof k === 'string' && k.startsWith('cn_') && !isP4(k)) queueSync(); } catch (e) {}
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushNow(); });
  window.addEventListener('pagehide', flushNow);

  // ============================ Learn-first (§6.2) ============================
  function getMode() {
    return lsGet('cn_saas_mode') === 'classic' ? 'classic' : 'learn';
  }
  function toggleMode() {
    const next = getMode() === 'classic' ? 'learn' : 'classic';
    lsSet('cn_saas_mode', next);
    renderChip();
    if (next === 'learn') {
      try { window.LearnPlayer && window.LearnPlayer.openHome(); } catch (e) {}
    } else {
      try { window.LearnPlayer && window.LearnPlayer.close && window.LearnPlayer.close(); } catch (e) {}
    }
  }

  // онбординг-шаг 0 SaaS (§16): «☁ синк между устройствами»
  function showWelcome() {
    if (lsGet('cn_saas_welcomed') || $id('cn_welcome_back')) return;
    const back = document.createElement('div');
    back.className = 'cn-modal-back';
    back.id = 'cn_welcome_back';
    back.innerHTML = `<div class="cn-modal" style="max-width:420px">
      <h3>🧭 Добро пожаловать!</h3>
      <div class="sub" style="font-size:13px">Это режим «Обучение» — пошаговые уроки как на Coursera.
      Пройди Фазу 0 бесплатно; заходи по почте — и прогресс будет ждать тебя на любом устройстве.</div>
      <div class="cn-muted" style="margin:0 0 12px">☁ Прогресс между устройствами · 🎓 213 уроков · 🤖 AI-наставник</div>
      <button class="btn" id="cn_welcome_go">Начать обучение</button>
      <button class="btn ghost" id="cn_welcome_skip">Сначала осмотрюсь</button>
    </div>`;
    document.body.appendChild(back);
    const done = (start) => {
      lsSet('cn_saas_welcomed', '1');
      back.remove();
      if (start) { try { window.LearnPlayer.openHome(); } catch (e) {} }
    };
    $id('cn_welcome_go').addEventListener('click', () => done(true));
    $id('cn_welcome_skip').addEventListener('click', () => done(false));
  }

  function onEngineReady(fn) {
    let done = false;
    const run = () => { if (!done && window.LearnPlayer && typeof window.LearnPlayer.openHome === 'function') { done = true; fn(); } };
    document.addEventListener('DOMContentLoaded', run);      // синтетическое событие бут-загрузчика
    if (document.readyState !== 'loading') setTimeout(run, 400);
    setTimeout(run, 4000);
  }

  // ============================ обёртка телеметрии плеера ============================
  function wrapLearnPlayer() {
    if (!window.LearnPlayer || window.LearnPlayer.__saas_wrapped) return;
    const origOpen = window.LearnPlayer.open;
    if (typeof origOpen === 'function') {
      window.LearnPlayer.open = function (lessonId, stepIdx) {
        const t0 = performance.now();
        const res = origOpen.apply(this, arguments);
        try {
          if (!jparse(lsGet('cn_learn_open_sent') || '{}')[lessonId]) {
            const map = jparse(lsGet('cn_learn_open_sent') || '{}');
            map[lessonId] = 1;
            origSetItem.call(localStorage, 'cn_learn_open_sent', JSON.stringify(map));
            telemetry('learn_open', { lesson_id: lessonId, open_ms: Math.round(performance.now() - t0) });
          }
        } catch (e) {}
        return res;
      };
      window.LearnPlayer.__saas_wrapped = true;
    }
  }

  function sendPerf() {
    if (lsGet('cn_perf_sent')) return;
    try {
      let fcp = 0;
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) fcp = Math.round(nav.domContentLoadedEventEnd || nav.loadEventEnd || 0);
      origSetItem.call(localStorage, 'cn_perf_sent', '1');
      telemetry('perf', { fcp_ms: fcp, stage_b: !!CN_BUILD.stageB });
    } catch (e) {}
  }

  // ============================ тарифный экран (§6.3) ============================
  let pricesCache = null;

  async function fetchPrices() {
    if (pricesCache) return pricesCache;
    try {
      const r = await api('/pay/prices');
      if (r.status === 200 && r.body && r.body.tiers) { pricesCache = r.body.tiers; return pricesCache; }
    } catch (e) {}
    return null;
  }

  async function startPayment(provider, tier) {
    if (!authed()) { showLoginModal(); return; }
    try {
      if (provider === 'lemonsqueezy') {
        const cfg = pricesCache && pricesCache[tier];
        const url = cfg && cfg.pay && cfg.pay.lemonsqueezy;
        if (typeof url === 'string' && url.startsWith('http')) { window.open(url, '_blank'); showWaitingScreen(tier); return; }
        toast('Оплата картой (глобально) скоро будет доступна');
        return;
      }
      if (provider === 'yookassa') {
        const r = await api('/pay/yookassa/create', { method: 'POST', body: JSON.stringify({ tier }) });
        if (r.status === 200 && r.body && r.body.confirmation_url) { location.href = r.body.confirmation_url; return; }
        if (r.status === 501) { toast('Оплата картой (мир) скоро будет доступна'); return; }
        toast('Не удалось создать платёж — попробуй позже');
        return;
      }
      if (provider === 'crypto') {
        const r = await api('/pay/crypto/invoice', { method: 'POST', body: JSON.stringify({ tier }) });
        if (r.status === 200 && r.body && (r.body.url || r.body.invoice_url)) {
          window.open(r.body.url || r.body.invoice_url, '_blank');
          showWaitingScreen(tier);
          return;
        }
        toast(r.status === 501 ? 'Крипто-оплата скоро будет доступна' : 'Не удалось создать инвойс');
        return;
      }
    } catch (e) { toast('Сеть недоступна — попробуй позже'); }
  }

  // Экран «Ждём подтверждения оплаты» (§6.3): poll /api/me раз в 30 с, максимум 5 мин
  function showWaitingScreen(tier) {
    if ($id('cn_wait_back')) return;
    const back = document.createElement('div');
    back.className = 'cn-modal-back';
    back.id = 'cn_wait_back';
    back.innerHTML = `<div class="cn-modal" style="text-align:center">
      <div style="font-size:40px">⏳</div>
      <h3>Ждём подтверждение оплаты…</h3>
      <div class="sub">Обычно это занимает меньше минуты. Не закрывай страницу — доступ откроется автоматически.</div>
      <div class="cn-muted" id="cn_wait_status">Проверяем статус…</div>
      <button class="btn ghost" id="cn_wait_close">Закрыть</button>
    </div>`;
    document.body.appendChild(back);
    $id('cn_wait_close').addEventListener('click', () => back.remove());
    const t0 = Date.now();
    const timer = setInterval(async () => {
      if (!$id('cn_wait_back')) { clearInterval(timer); return; }
      if (Date.now() - t0 > 5 * 60 * 1000) {
        $id('cn_wait_status').textContent = 'Время ожидания вышло. Если оплата прошла — доступ откроется при следующем входе.';
        clearInterval(timer);
        return;
      }
      await refreshMe();
      if (me && me.tier && me.tier !== 'free' && me.tier !== 'pending') {
        clearInterval(timer);
        back.remove();
        await onTierUnlocked();
      } else {
        $id('cn_wait_status').textContent = 'Проверяем статус… (' + Math.round((Date.now() - t0) / 1000) + ' с)';
      }
    }, 30000);
  }

  // tier_change → перезагрузка манифеста → докачка платных паков (§6.3)
  async function onTierUnlocked() {
    try {
      lsDel('cn_manifest_cache');
      try { const c = await caches.open('cn-content-v1'); const keys = await c.keys(); for (const k of keys) await c.delete(k); } catch (e) {}
      toast('Доступ открыт: весь курс из 213 уроков! Загружаем…');
      setTimeout(() => { try { location.reload(); } catch (e) {} }, 900);
    } catch (e) {}
  }

  window.CN_SAAS_onTierChange = function (prev, next) {
    // вызывается из refreshMe при смене тарифа (покупка на другом устройстве)
    if (next && next !== 'free' && prev === 'free') onTierUnlocked();
  };

  async function showTariffs() {
    if ($id('cn_tariffs_back')) return;
    const back = document.createElement('div');
    back.className = 'cn-modal-back';
    back.id = 'cn_tariffs_back';
    back.innerHTML = `<div class="cn-modal" style="max-width:640px">
      <button class="cn-x" id="cn_tariffs_x">✕</button>
      <h3>Тарифы КриптоНавигатора</h3>
      <div class="sub">Разовый доступ или подписка — весь курс из 213 уроков, живой рынок и AI-наставник.</div>
      <div id="cn_tariffs_grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px">
        <div class="cn-loader" style="grid-column:1/-1;text-align:center;color:#8b93b5;padding:24px 0">Загружаем тарифы…</div>
      </div>
    </div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    $id('cn_tariffs_x').addEventListener('click', () => back.remove());

    const tiers = await fetchPrices();
    const grid = $id('cn_tariffs_grid');
    if (!grid) return;
    const cards = [];
    cards.push(`<div style="background:#0d1022;border:1px solid #2c3350;border-radius:12px;padding:14px">
      <div style="font-weight:700;font-size:14px">🌱 Демо</div>
      <div style="color:#8b93b5;font-size:12px;margin:4px 0">бесплатно</div>
      <div style="font-size:12.5px;line-height:1.5">Фаза 0 + психология П1–П8<br>витрина живого рынка<br>наставник: 3 вопроса/день</div>
      <div class="cn-muted" style="margin-top:8px">${me ? 'Твой текущий тариф' : 'Доступен сразу'}</div>
    </div>`);
    const order = ['lite', 'pro', 'max'];
    if (!tiers) {
      cards.push('<div style="grid-column:1/-1;color:#8b93b5;font-size:13px;text-align:center;padding:8px 0">Тарифы временно недоступны — попробуй позже.</div>');
    } else {
      for (const t of order) {
        const cfg = tiers[t];
        if (!cfg) continue;
        const isCurrent = me && me.tier === t;
        const payBtns = [];
        const pay = cfg.pay || {};
        if (pay.yookassa) payBtns.push(`<button class="btn" style="margin-top:6px;padding:8px" data-cn-pay="yookassa:${t}">Карта (мир)</button>`);
        if (pay.lemonsqueezy) payBtns.push(`<button class="btn ghost" style="margin-top:6px;padding:8px" data-cn-pay="lemonsqueezy:${t}">Карта (глобально)</button>`);
        if (pay.crypto) payBtns.push(`<button class="btn ghost" style="margin-top:6px;padding:8px" data-cn-pay="crypto:${t}">Крипто</button>`);
        cards.push(`<div style="background:${isCurrent ? '#1a2450' : '#0d1022'};border:1px solid ${isCurrent ? '#4a5ad0' : '#2c3350'};border-radius:12px;padding:14px;display:flex;flex-direction:column">
          <div style="font-weight:700;font-size:14px">${escapeHtml(cfg.title || t)}</div>
          <div style="color:#c7cde8;font-size:15px;font-weight:700;margin:4px 0">${escapeHtml(cfg.price || '')}</div>
          <div style="color:#8b93b5;font-size:12px;flex:1">${escapeHtml(cfg.note || '')}</div>
          ${isCurrent ? '<div class="cn-muted" style="margin-top:8px">✓ Активен</div>' : payBtns.join('')}
        </div>`);
      }
    }
    grid.innerHTML = cards.join('');
    grid.querySelectorAll('[data-cn-pay]').forEach(b => {
      b.addEventListener('click', () => {
        const [provider, tier] = b.getAttribute('data-cn-pay').split(':');
        startPayment(provider, tier);
      });
    });
  }
  window.CN_SAAS_showTariffs = showTariffs;

  // ============================ замки платных модулей (§6.2/§6.4) ============================
  // Движок не трогаем: платные модули у гостя просто отсутствуют в регистрах —
  // карточка объясняет, где они и как открыть.
  function mountLockCards() {
    try {
      const sec = document.getElementById('lp3_program_sec');
      if (!sec || document.getElementById('cn_lock_card')) return;
      const tier = (me && me.tier) || 'free';
      if (tier !== 'free') return; // lite+: весь контент уже в манифесте
      const card = document.createElement('div');
      card.id = 'cn_lock_card';
      card.style.cssText = 'margin:10px 0 4px;padding:14px;border:1px solid #2c3350;border-radius:12px;background:#12162b;font:13.5px/1.5 system-ui,-apple-system,sans-serif;color:#e8eaf2';
      card.innerHTML =
        '<div style="font-weight:700;font-size:14px">🔒 Дальше — 205 уроков полной программы</div>' +
        '<div style="color:#8b93b5;font-size:12.5px;margin:4px 0 10px">Фазы 1–6, матфакультатив (48), психология до П56 (48) и Академия Freqtrade (27).</div>' +
        '<button id="cn_lock_open" style="padding:8px 16px;border-radius:10px;border:0;background:linear-gradient(90deg,#6c5ce7,#5b4bd6);color:#fff;font-size:13px;font-weight:700;cursor:pointer">Открыть доступ</button>' +
        '<span style="color:#8b93b5;font-size:12px;margin-left:10px">демо-часть остаётся бесплатной навсегда</span>';
      sec.appendChild(card);
      document.getElementById('cn_lock_open').addEventListener('click', () => showTariffs());
    } catch (e) {}
  }

  // перехват openHome — после рендера хаба навешиваем замки (и при каждом открытии)
  function wrapOpenHome() {
    if (!window.LearnPlayer || typeof window.LearnPlayer.openHome !== 'function' || window.LearnPlayer.__saas_home_wrapped) return;
    const orig = window.LearnPlayer.openHome;
    window.LearnPlayer.openHome = function () {
      const res = orig.apply(this, arguments);
      setTimeout(mountLockCards, 350);
      setTimeout(mountLockCards, 1200); // страховка на ленивый рендер
      return res;
    };
    window.LearnPlayer.__saas_home_wrapped = true;
  }

  // ============================ старт ============================
  ensureUI();

  // ============================ наставник: JWT-мост (§10) ============================
  // Клиентский MENTOR.ask не шлёт JWT (контракт v12.9). Оборачиваем аддитивно:
  // для авторизованных добавляем Authorization в запрос наставника, не трогая
  // существующие обёртки приложения (санитизация Т6, память AI5). Гость идёт
  // прежним путём — сервер авторизует его по deviceId (витрина 3/день).
  function wrapMentor() {
    if (!window.MENTOR || typeof window.MENTOR.ask !== 'function' || window.MENTOR.__saas_jwt_wrapped) return;
    const M = window.MENTOR;
    const orig = M.ask.bind(M);
    M.ask = async function (action, lessonId, payload) {
      if (M.mock || !JWT) return orig(action, lessonId, payload); // мок не считается (§10.2)
      const realFetch = window.fetch;
      window.fetch = function (input, init) {
        try {
          if (typeof input === 'string' && input.indexOf('/api/mentor/ask') >= 0) {
            init = init || {};
            init.headers = Object.assign({}, init.headers || {}, { authorization: 'Bearer ' + JWT });
          }
        } catch (e) {}
        return realFetch.call(this, input, init);
      };
      try {
        return await orig(action, lessonId, payload);
      } catch (e) {
        // исчерпана дневная квота тарифа → штатный апселл v12.6 (меаника «limit»)
        if (e && (e.message === 'HTTP 402' || e.message === 'HTTP 429')) throw new Error('limit');
        throw e;
      } finally {
        window.fetch = realFetch;
      }
    };
    M.__saas_jwt_wrapped = true;
  }

  onEngineReady(() => {
    wrapLearnPlayer();
    wrapOpenHome();
    wrapMentor();
    // Learn-first: режим по умолчанию (§6.2). Классика — только по явному выбору.
    if (getMode() !== 'classic') {
      const firstVisit = !lsGet('cn_saas_welcomed') && !lsGet('cn_tour_done') && !lsGet('cn_learn_pos');
      if (firstVisit) showWelcome();
      else { try { window.LearnPlayer.openHome(); } catch (e) {} }
    }
    sendPerf();
  });

  // восстановление сессии
  (async function init() {
    if (!authed()) { renderPanel(); return; }
    await refreshMe();
    renderPanel();
    // после перезагрузки (логин/подтягивание) сервер должен получить слитую капсулу:
    // даём движку 3 с на старт и его собственные записи, затем пушим
    setTimeout(() => { if (authed()) pushProgress(true); }, 3000);
    // периодический refreshMe (tier_change на другом устройстве)
    setInterval(() => { if (authed()) refreshMe().then(renderPanel); }, 5 * 60 * 1000);
  })();

  // экспорт для тарифного экрана (Стадия 4) и тестов
  window.CN_SAAS = {
    getMe: () => me,
    refreshMe,
    pushNow: pushProgress,
    pullMergePush,
    pullAndReload,
    mergeState,
    collectLocal,
    showLogin: showLoginModal,
    policies: { isP1, isP2, isP3, isP4 }
  };
})();
