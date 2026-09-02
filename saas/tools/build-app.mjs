// build-app.mjs v2 — сборка SaaS-фронта из index_v12.9.html (§5 промта v2.0).
//
//   node tools/build-app.mjs                        # Стадия B: контент ТОЛЬКО из паков (гейтинг) — ПРОД
//   node tools/build-app.mjs --inline-content       # Стадия A: инлайн-фолбэк (эквивалентность, до продаж)
//   node tools/build-app.mjs --src index_v13.html   # будущий источник
//
// Выход в saas/public/:
//   index.html      — шелл: head/CSS/разметка БЕЗ инлайн-скриптов + boot-загрузчик (~5 КБ)
//   app.js          — движок v12.9 (все inline-блоки в исходном порядке), контентные
//                     объявления заменены на CN_CONTENT.ensure('ИМЯ'); Стадия A —
//                     + window.CN_CONTENT_FALLBACK (паковый фолбэк для офлайна)
//   saas-front.js   — SaaS-слой (layer/saas-front.js → public, §6)
//   build-info.json — хэш сборки, источник, режим
//
// Красные линии: index_v12.9.html не редактируется; все трансформации — здесь, аддитивно.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { scanStructures } from './lib-structures.mjs';

const SAAS = path.dirname(new URL('../tools/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(SAAS, '..');
const PUBLIC = path.join(SAAS, 'public');
fs.mkdirSync(PUBLIC, { recursive: true });

const args = process.argv.slice(2);
// По умолчанию — Стадия B (платный контент никогда не отдаётся статикой, §22.1).
// Стадия A (--inline-content) — только для приёмки эквивалентности, до включения платежей.
const noInline = !args.includes('--inline-content');
const srcArgIdx = args.indexOf('--src');
const srcPath = srcArgIdx > -1
  ? (path.isAbsolute(args[srcArgIdx + 1]) ? args[srcArgIdx + 1] : path.join(ROOT, args[srcArgIdx + 1]))
  : fs.existsSync(path.join(ROOT, 'index_v13.0.html')) ? path.join(ROOT, 'index_v13.0.html')
  : fs.existsSync(path.join(ROOT, 'index_v12.9.html')) ? path.join(ROOT, 'index_v12.9.html')
  : path.join(ROOT, 'index.html');

console.log(`Сборка SaaS: ${path.relative(ROOT, srcPath)} · ${noInline ? 'Стадия B (без инлайн-контента)' : 'Стадия A (инлайн-фолбэк)'}`);
const html = fs.readFileSync(srcPath, 'utf8');

// ------------------------------------------------------------------
// 1. Сканируем структуры и вырезаем их объявления (§5.2)
// ------------------------------------------------------------------
const { values, spans } = scanStructures(html);
let engine = html;
for (let i = spans.length - 1; i >= 0; i--) {
  const s = spans[i];
  const replacement = `const ${s.name} = CN_CONTENT.ensure('${s.name}')`;
  engine = engine.slice(0, s.start) + replacement + engine.slice(s.end);
}
console.log(`Вырезано структур: ${spans.length} (${spans.map(s => s.name).join(', ')})`);

// ------------------------------------------------------------------
// 2. Разделяем на блоки скриптов и разметку (браузерная семантика:
//    блок закрывается на первом </script> — как парсит и браузер)
// ------------------------------------------------------------------
const blockRe = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
const blocks = [];
let markup = engine.replace(blockRe, (m, attrs, body, off) => {
  if (attrs && /\bsrc\s*=/.test(attrs)) return m; // внешние скрипты остаются (в v12.9 их нет)
  blocks.push(body);
  return `<!--CN-BLOCK-${blocks.length - 1}-->`;
});
if (blocks.length === 0) { console.error('FAIL: инлайн-скрипты не найдены'); process.exit(1); }

// Крупные changelog-комментарии (история версий) не нужны в рантайме — история в git.
// Коммент-подсказки <300 символов и conditional-конструкции сохраняются.
markup = markup.replace(/<!--[\s\S]*?-->/g, (m) => m.length > 300 ? '' : m);

// ------------------------------------------------------------------
// 3. app.js: блоки в исходном порядке, разделитель ';' против ASI-склейки
// ------------------------------------------------------------------
let appJs = blocks.join('\n;\n');

// ------------------------------------------------------------------
// 3.1 Стадия 11: современный каталог Workers AI (09.2026).
//     v10-список наставника (llama-3.x, mistral-7b, qwen2.5, gemma-7b) устарел —
//     заменяем на актуальные модели по выбору владельца. index_v12.9.html не
//     редактируется: замена выполняется ТОЛЬКО здесь, сборочной трансформацией.
//     Список синхронизирован с MODEL_WHITELIST в src/mentor.js (источник истины).
//     Старые id в localStorage клиента мигрируют на дефолт силами mentorModelGet
//     (значение не из списка → дефолт) — отдельная миграция не нужна.
// ------------------------------------------------------------------
const MODERN_MODELS_JS = `[
  { id: 'cf-gpt-oss-120b', label: '🚀 GPT OSS 120B', desc: '@cf/openai/gpt-oss-120b — по умолчанию, самая быстрая (5–9 с), доступна на Free. ✓ каталог 09.2026', ok: true },
  { id: 'cf-glm-4.7-flash', label: '💡 GLM 4.7 Flash', desc: '@cf/zai-org/glm-4.7-flash — быстрая альтернатива, доступна на Free. ✓ каталог 09.2026', ok: true },
  { id: 'cf-qwen3.8-27b', label: '🐉 Qwen 3.8 27B', desc: '@cf/qwen/qwen3.8-27b — мультиязычная, сильна в JSON-структурах. Доступна на Free. ✓ каталог 09.2026', ok: true },
  { id: 'cf-gemma-4-26b-a4b-it', label: '💎 Gemma 4 26B A4B', desc: '@cf/google/gemma-4-26b-a4b-it — компактная MoE от Google. Доступна на Free. ✓ каталог 09.2026', ok: true }
]`;
const modelsRe = /const MENTOR_MODELS = \[[\s\S]*?\n\]/;
if (!modelsRe.test(appJs)) {
  console.error('FAIL: MENTOR_MODELS не найден в исходнике — структура v12.9 изменилась, проверь трансформацию Стадии 11');
  process.exit(1);
}
appJs = appJs.replace(modelsRe, 'const MENTOR_MODELS = ' + MODERN_MODELS_JS);
// дефолтный SKU в mentorModelGet (2 вхождения после замены массива) → новый дефолт
const legacyDefaultRe = /'cf-llama-3.1-8b-instruct'/g;
const legacyDefaults = (appJs.match(legacyDefaultRe) || []).length;
appJs = appJs.replace(legacyDefaultRe, "'cf-gpt-oss-120b'");
console.log(`Стадия 11: MENTOR_MODELS → 4 модели Free-плана (gpt-oss-120b дефолт); дефолтных SKU заменено: ${legacyDefaults}`);

// Стадия A: инлайн-фолбэк всего контента (§5.3) — движок работает без сети/паков
if (!noInline) {
  const fallback = {};
  for (const name of Object.keys(values)) fallback[name] = values[name];
  const fbJson = JSON.stringify(fallback).replace(/<\//g, '<\\/');
  appJs = `/* CN_CONTENT_FALLBACK: инлайн-фолбэк Стадии A (§5.3) — байт-эквивалент v12.9 без паков */\nwindow.CN_CONTENT_FALLBACK=${fbJson};\n;\n` + appJs;
} else {
  appJs = `/* Стадия B: контент только из паков (§5.3) */\nwindow.CN_CONTENT_FALLBACK=null;\n` + appJs;
}

// хеш покрывает и движок, и SaaS-слой: иначе правка saas-front.js не меняет ?v= и
// браузеры отдают закэшированную старую версию SaaS-слоя
const layerSrcForHash = path.join(SAAS, 'layer', 'saas-front.js');
const layerForHash = fs.existsSync(layerSrcForHash) ? fs.readFileSync(layerSrcForHash, 'utf8') : '';
const buildHash = crypto.createHash('sha256').update(appJs + '\n;saas-front:' + layerForHash).digest('hex').slice(0, 12);
console.log(`app.js: ${(appJs.length / 1024 / 1024).toFixed(2)} МБ символов · hash ${buildHash} · блоков ${blocks.length}`);

// ------------------------------------------------------------------
// 4. Boot-загрузчик в шелл (§5.2): регистр, экран загрузки, паки, инъекция
// ------------------------------------------------------------------
const manifestPath = path.join(SAAS, 'content', 'manifest.json');
const manifestFile = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { registers: {} };
// kind-карта регистров — вшивается в шелл (офлайн-старт не зависит от сети)
const registersJson = JSON.stringify(manifestFile.registers || {}).replace(/<\//g, '<\\/');

const bootScript = `
<script id="cn_boot">
/* Boot-загрузчик SaaS (§5.2): контент-регистр → паки → движок → SaaS-слой. */
(function () {
  'use strict';
  window.CN_REGISTERS = ${registersJson};
  window.CN_BUILD = { app: '${buildHash}', source: '${path.basename(srcPath)}', stageB: ${noInline} };
  window.CN_CONTENT = {
    data: {},
    ensure: function (k) {
      if (k in this.data) return this.data[k];
      var fb = window.CN_CONTENT_FALLBACK;
      if (fb && (k in fb)) return fb[k];
      var spec = window.CN_REGISTERS[k];
      return (spec && spec.kind === 'object') ? {} : [];
    }
  };

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function authHeaders() { var j = ls('cn_jwt'); return j ? { authorization: 'Bearer ' + j } : {}; }

  var scr = document.createElement('div');
  scr.id = 'cn_boot_screen';
  scr.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0d1022;display:flex;flex-direction:column;align-items:center;justify-content:center;font:16px/1.5 system-ui,-apple-system,sans-serif;color:#e8eaf2;transition:opacity .35s';
  scr.innerHTML = '<div style="font-size:46px;line-height:1">🧭</div>' +
    '<div style="font-size:21px;font-weight:700;margin:12px 0 4px">КриптоНавигатор</div>' +
    '<div id="cn_boot_status" style="opacity:.65;font-size:14px">Загружаем курс…</div>' +
    '<div style="width:230px;height:6px;border-radius:3px;background:#1b2040;margin-top:16px;overflow:hidden">' +
    '<div id="cn_boot_bar" style="height:100%;width:0;background:linear-gradient(90deg,#6c5ce7,#00cec9);transition:width .25s"></div></div>';
  document.body.appendChild(scr);
  var status = document.getElementById('cn_boot_status');
  var bar = document.getElementById('cn_boot_bar');
  function progress(txt, pct) { if (status) status.textContent = txt; if (bar) bar.style.width = Math.round(pct * 100) + '%'; }

  // PWA (§15): service worker — после успешного старта, не мешаем первому запуску.
  // SW доступен на https и на localhost (для локальной приёмки).
  function registerSW() {
    try {
      var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if ('serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
        navigator.serviceWorker.register('/service-worker.js').catch(function () {});
      }
    } catch (e) {}
  }
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
  function showRetry(msg) {
    if (!scr) return;
    scr.innerHTML = '<div style="font-size:46px">📡</div><div style="margin:12px 0 6px;font-weight:700">' + (msg || 'Нет соединения') + '</div>' +
      '<div style="opacity:.65;font-size:14px;max-width:280px;text-align:center">Курс не удалось загрузить. Проверь сеть и попробуй ещё раз.</div>' +
      '<button id="cn_boot_retry" style="margin-top:18px;padding:10px 26px;border-radius:12px;border:0;background:#6c5ce7;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Повторить</button>';
    document.getElementById('cn_boot_retry').addEventListener('click', function () { location.reload(); });
  }

  function getJSON(url, timeoutMs) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, timeoutMs || 15000);
    return fetch(url, { signal: c.signal, headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }

  function cacheOpen() {
    try { return caches.open('cn-v1-packs'); } catch (e) { return Promise.resolve(null); }
  }

  function loadPack(p) {
    var url = p.url || ('/api/content/pack/ru/' + p.name);
    var key = url + '?v=' + p.version;
    return cacheOpen().then(function (cache) {
      return cache && cache.match(key) ? cache.match(key) : Promise.reject(new Error('miss'));
    }).then(function (hit) { return hit.json(); }).catch(function () {
      return getJSON(url, 30000).then(function (j) {
        return cacheOpen().then(function (cache) {
          if (cache) {
            try { cache.put(key, new Response(JSON.stringify(j), { headers: { 'content-type': 'application/json' } })); } catch (e) {}
          }
          return j;
        });
      }).catch(function () {
        // фолбэк: кэш по базовому url (старые ключи)
        return cacheOpen().then(function (cache) {
          if (!cache) throw new Error('nocache');
          return cache.keys().then(function (keys) {
            var k = keys.filter(function (x) { return x.url.indexOf(url) >= 0; })[0];
            return k ? cache.match(k).then(function (r) { return r.json(); }) : Promise.reject(new Error('miss2'));
          });
        });
      });
    });
  }

  function inject(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('load fail: ' + src)); };
      document.body.appendChild(s);
    });
  }

  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    inject('/app.js?v=${buildHash}').then(function () {
      return inject('/saas-front.js?v=${buildHash}');
    }).then(function () {
      // Движок вставлен после парсинга DOM: переотправим DOMContentLoaded,
      // чтобы сработали неподстрахованные подписчики v12.9 (§5.2).
      try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch (e) {}
      try { window.dispatchEvent(new Event('DOMContentLoaded')); } catch (e) {}
      if (scr) { scr.style.opacity = '0'; setTimeout(function () { scr.remove(); }, 400); }
    }).catch(function () { showRetry('Не удалось запустить курс'); });
  }

  (async function () {
    // 1) манифест: сеть → localStorage-кэш
    var manifest = null;
    try { manifest = await getJSON('/api/content/manifest'); } catch (e) {}
    if (manifest) { try { localStorage.setItem('cn_manifest_cache', JSON.stringify(manifest)); } catch (e) {} }
    else { try { manifest = JSON.parse(ls('cn_manifest_cache') || 'null'); } catch (e) {} }

    // 2) паки из манифеста (для гостя сервер отдаёт только демо — это и есть гейтинг)
    var packs = (manifest && manifest.packs) || [];
    var loaded = 0, data = {};
    progress(packs.length ? 'Паков 0/' + packs.length : 'Загружаем курс…', 0.02);

    await Promise.all(packs.map(function (p) {
      return loadPack(p).then(function (j) {
        data[p.name] = j; loaded++;
        progress('Паков ' + loaded + '/' + packs.length, 0.05 + 0.9 * loaded / Math.max(packs.length, 1));
        try {
          var jt = ls('cn_jwt');
          if (jt && j && j.meta && j.meta.name) {
            fetch('/api/telemetry', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + jt },
              body: JSON.stringify({ type: 'pack_download', meta: { name: j.meta.name, version: p.version } }) }).catch(function () {});
          }
        } catch (e) {}
      }).catch(function () { loaded++; });
    }));

    // 3) сборка регистров по карте (порядок concat — из манифеста, §4.3).
    // Стадия A (stageB=false): регистры ЦЕЛИКОМ из инлайн-фолбэка — байт-эквивалент v12.9;
    //   частичная сборка регистра затенила бы фолбэк (демо-LESSONS 20 вместо 76) и сломала
    //   эквивалентность: движок мутирует массивы (LESSONS.push.apply(LESSONS, MATH…) — строка 27331 исходника).
    //   Паки при этом только прогревают кэш — подготовка к переключению на Стадию B.
    // Стадия B (stageB=true) или ?cn_assemble=1: регистры собираются из паков (гейтинг).
    var forceAssemble = /([?&])cn_assemble=1/.test(location.search);
    var assemble = window.CN_BUILD.stageB || forceAssemble;
    if (assemble) {
      var REG = window.CN_REGISTERS || {};
      Object.keys(REG).forEach(function (k) {
        var spec = REG[k];
        var parts = (spec.packs || []).filter(function (n) { return data[n] && data[n].registers && (k in data[n].registers); })
          .map(function (n) { return data[n].registers[k]; });
        if (!parts.length) return;
        if (spec.kind === 'object') {
          var o = {}; parts.forEach(function (p) { Object.assign(o, p); });
          window.CN_CONTENT.data[k] = o;
        } else {
          window.CN_CONTENT.data[k] = [].concat.apply([], parts);
        }
      });
    }

    // 4) Стадия B без сети и без кэша (или паки недоступны) → честный экран повтора
    var anyData = Object.keys(window.CN_CONTENT.data).length > 0;
    var hasFallback = !window.CN_BUILD.stageB;
    if (!anyData && !hasFallback) { showRetry(); return; }
    progress('Запускаем…', 0.97);
    boot();
  })().catch(function () { showRetry(); });
})();
</script>
`;

// ------------------------------------------------------------------
// 5. Шелл: разметка + boot перед </body>
// ------------------------------------------------------------------
if (!markup.includes('</body>')) { console.error('FAIL: нет </body>'); process.exit(1); }
// manifest в head (§15) — один тег (идемпотентно)
let shell = markup;
if (!shell.includes('rel="manifest"')) {
  shell = shell.replace('</head>', '<link rel="manifest" href="/manifest.json">\n<meta name="theme-color" content="#0d1022">\n</head>');
}
shell = shell.replace('</body>', bootScript + '\n</body>');

// ------------------------------------------------------------------
// 6. Выход + проверка бюджетов §5.4 (чек-лист §20: скрипт проверки в сборке)
// ------------------------------------------------------------------
fs.writeFileSync(path.join(PUBLIC, 'index.html'), shell);
fs.writeFileSync(path.join(PUBLIC, 'app.js'), appJs);

// saas-front.js — SaaS-слой из layer/
const layerSrc = path.join(SAAS, 'layer', 'saas-front.js');
if (fs.existsSync(layerSrc)) fs.copyFileSync(layerSrc, path.join(PUBLIC, 'saas-front.js'));
else console.warn('WARN: layer/saas-front.js нет — SaaS-слой не подключён');

fs.writeFileSync(path.join(PUBLIC, 'build-info.json'), JSON.stringify({
  hash: buildHash, builtAt: new Date().toISOString(), source: path.basename(srcPath),
  stageB: noInline, structures: spans.length, blocks: blocks.length,
  inlineContent: !noInline
}, null, 2));

// --- бюджеты §5.4 (brotli q11) ---
const br = buf => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const brShell = br(Buffer.from(shell)), brApp = br(Buffer.from(appJs));
const budgetShell = 40 * 1024, budgetApp = 1.1 * 1024 * 1024;
const shellOk = brShell <= budgetShell, appOk = brApp <= budgetApp;

console.log(`Шелл: ${(shell.length / 1024).toFixed(1)} КБ raw · ${(brShell / 1024).toFixed(1)} КБ brotli · app.js: ${(brApp / 1024 / 1024).toFixed(2)} МБ brotli (${noInline ? 'движок без контента' : 'движок + инлайн-фолбэк'}) · saas-front.js подключён`);
console.log(`Бюджеты §5.4: шелл ≤40 КБ ${shellOk ? '✓' : '⚠ ПРЕВЫШЕН'}, app.js ≤1.1 МБ ${appOk ? '✓' : '✗ ПРЕВЫШЕН'}; пак ≤150 КБ — проверяется extract-content`);
console.log(`Готово: public/index.html, public/app.js?v=${buildHash}, public/build-info.json`);

if (!appOk) { console.error('БЮДЖЕТ app.js НАРУШЕН — сборка падает (§20)'); process.exit(1); }
if (!shellOk) console.warn('⚠ Бюджет шелла превышен — некритично (CSS+разметка v12.9 фактично больше оценки §5.4), но требует внимания');
