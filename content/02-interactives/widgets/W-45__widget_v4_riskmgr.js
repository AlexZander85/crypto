/*
 * W-45 · widget_v4_riskmgr · 0.12 «Спаси депозит»
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_v4_riskmgr'] = function (box) {
  /* ───────── 0. чистим прошлый запуск ───────── */
  if (box._expTimers) { box._expTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); }
  if (box._expRaf) { cancelAnimationFrame(box._expRaf); }
  if (box._expResize) { window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expResize = null;
  const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { const id = requestAnimationFrame(fn); box._expRaf = id; return id; };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ───────── 1. канон и состояние ───────── */
  const CANON = { deposit: 1000, risk: 2, pain: 20, win: 55, payoff: 1.3, trades: 500, paths: 300, seed: 42 };
  const RISK_MIN = 0.25, RISK_MAX = 20, RISK_STEP = 0.25;
  const riskGrid = [];
  for (let r = RISK_MIN; r <= RISK_MAX + 1e-9; r += RISK_STEP) riskGrid.push(Math.round(r * 100) / 100);
  const SHOW_PATHS = 90;            // сколько линий рисуем в веере (из 300)
  const ANIM_MS = 2400;

  const S = Object.assign({}, CANON, { series: 8, seriesAuto: true, attempts: 0 });

  /* ───────── 2. цвета темы ───────── */
  const cs = getComputedStyle(box);
  const V = n => cs.getPropertyValue(n).trim();
  const C = {
    txt: V('--txt') || '#eef1ff', mut: V('--mut') || '#9aa3c7',
    line: V('--line') || 'rgba(154,163,199,.22)', acc: V('--acc2') || '#06b6d4',
    ok: V('--ok') || '#22c55e', bad: V('--bad') || V('--err') || '#ef4444', warn: V('--warn') || '#eab308',
    mono: V('--mono') || 'ui-monospace, Menlo, Consolas, monospace'
  };
  function rgba(c, a) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
    if (!m) return c;
    let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  const FONT = '11px ' + C.mono;

  /* ───────── 3. форматирование ───────── */
  function fmt(x, d) {
    d = d == null ? 1 : d;
    const parts = Math.abs(x).toFixed(d).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return (x < 0 ? '−' : '') + parts[0] + (d > 0 ? ',' + parts[1] : '');
  }
  const pct = (x, d) => fmt(x * 100, d == null ? 1 : d) + ' %';
  const money = x => '$' + fmt(x, 0);
  const posOf = r => (r - RISK_MIN) / (RISK_MAX - RISK_MIN) * 100;

  /* ───────── 4. разметка ───────── */
  box.innerHTML = `
  <style>
  .rm{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:${C.txt};background:linear-gradient(180deg,#0d1022,#040714);border:1px solid ${C.line};border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
  .rm *{box-sizing:border-box}
  .rm h3{margin:0 0 4px;font-size:17px}
  .rm .sub{color:${C.mut};font-size:13px;margin:0 0 10px}
  .rm .task{background:${rgba(C.acc, .08)};border-left:3px solid ${C.acc};padding:8px 10px;border-radius:6px;font-size:13px;margin-bottom:12px}
  .rm .grid{display:grid;grid-template-columns:1fr;gap:12px}
  @media(min-width:700px){.rm .grid2{grid-template-columns:1fr 1fr}}
  .rm .ctl{margin-bottom:12px}
  .rm label{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:${C.mut};margin-bottom:4px}
  .rm label b{color:${C.txt};font-family:${C.mono};font-weight:600;white-space:nowrap}
  .rm input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:10px;border-radius:6px;background:${rgba(C.mut, .25)};outline:none;margin:4px 0;cursor:pointer}
  .rm input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${C.txt};border:3px solid ${C.acc};box-shadow:0 0 0 3px rgba(0,0,0,.4)}
  .rm input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:${C.txt};border:3px solid ${C.acc}}
  .rm input[type=range]::-moz-range-track{background:transparent}
  .rm .ticks{position:relative;height:20px;font-size:11px;color:${C.mut}}
  .rm .tick{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;text-align:center}
  .rm .tick:before{content:'';display:block;width:1px;height:6px;background:${C.mut};margin:0 auto 1px}
  .rm .tick.rule{color:${C.ok};font-weight:600}.rm .tick.rule:before{background:${C.ok}}
  .rm .legend{display:flex;gap:10px;font-size:11px;color:${C.mut};flex-wrap:wrap;margin-top:2px}
  .rm .dot{display:inline-block;width:9px;height:9px;border-radius:2px;vertical-align:-1px;margin-right:4px}
  .rm .scene{background:rgba(0,0,0,.28);border:1px solid ${C.line};border-radius:10px;padding:8px;min-width:0}
  .rm .cap{font-size:12px;color:${C.mut};margin-bottom:4px;display:flex;justify-content:space-between;gap:8px}
  .rm canvas{display:block;width:100%}
  .rm .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0 8px}
  @media(min-width:560px){.rm .cards{grid-template-columns:repeat(4,1fr)}}
  .rm .card{background:rgba(255,255,255,.03);border:1px solid ${C.line};border-radius:8px;padding:8px 10px;min-width:0}
  .rm .card .k{font-size:11px;color:${C.mut}}
  .rm .card .v{font-size:19px;font-family:${C.mono};font-weight:700;line-height:1.2;margin:2px 0}
  .rm .card .s{font-size:11px;color:${C.mut}}
  .rm .callout{border-radius:8px;padding:10px 12px;font-size:13px;margin-top:12px;border:1px solid;transition:background .3s,border-color .3s}
  .rm .callout.ok{background:${rgba(C.ok, .08)};border-color:${rgba(C.ok, .5)}}
  .rm .callout.warn{background:${rgba(C.warn, .08)};border-color:${rgba(C.warn, .5)}}
  .rm .callout.bad{background:${rgba(C.bad, .08)};border-color:${rgba(C.bad, .5)}}
  .rm details{margin:8px 0}.rm summary{cursor:pointer;color:${C.acc};font-size:13px;user-select:none}
  .rm .adv{padding:10px 0 0}
  .rm table{width:100%;border-collapse:collapse;font-size:12px;font-family:${C.mono};margin-top:6px}
  .rm th,.rm td{padding:5px 4px;text-align:right;border-bottom:1px solid ${C.line};white-space:nowrap}
  .rm th{color:${C.mut};font-weight:500}.rm th:first-child,.rm td:first-child{text-align:left}
  .rm tr.cur td{background:${rgba(C.acc, .12)}}
  .rm .art{background:${rgba(C.ok, .06)};border:1px dashed ${rgba(C.ok, .45)};border-radius:8px;padding:10px 12px;font-size:13px;margin-top:10px}
  .rm .art.draft{background:rgba(255,255,255,.03);border-color:${C.line}}
  .rm .btn{background:rgba(255,255,255,.06);color:${C.txt};border:1px solid ${C.line};border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer}
  .rm .btn:hover{background:rgba(255,255,255,.1)}
  .rm .btn.pri{background:${rgba(C.acc, .18)};border-color:${rgba(C.acc, .6)}}
  .rm .btn.sm{padding:4px 10px;font-size:13px}
  .rm .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .rm .mini{font-size:12px;color:${C.mut}}
  .rm .mono{font-family:${C.mono}}
  </style>
  <div class="rm">
    <h3>Спаси депозит</h3>
    <p class="sub">Размер ставки решает выживание: серия убытков перемножается, а дорога обратно всегда длиннее дороги вниз.</p>
    <div class="task"><b>Задание.</b> Подбери риск на сделку так, чтобы серия из <b class="mono" data-r="taskN">8</b> убытков подряд не пробила твой порог боли, — и проверь на <b class="mono" data-r="taskP">300</b> симулированных «годах» по <b class="mono" data-r="taskT">500</b> сделок.</div>

    <div class="ctl">
      <label><span>Риск на сделку</span><b data-r="riskV"></b></label>
      <input type="range" data-r="risk" min="${RISK_MIN}" max="${RISK_MAX}" step="${RISK_STEP}" value="${S.risk}" aria-label="Риск на сделку, процентов">
      <div class="ticks" data-r="ticks"></div>
      <div class="legend">
        <span><i class="dot" style="background:${C.ok}"></i>≥ 95 % лет внутри порога</span>
        <span><i class="dot" style="background:${C.warn}"></i>80–95 %</span>
        <span><i class="dot" style="background:${C.bad}"></i>&lt; 80 %</span>
        <span data-r="zoneHint"></span>
      </div>
    </div>
    <div class="ctl">
      <label><span>Порог боли — просадка, которую переживу без паники</span><b data-r="painV"></b></label>
      <input type="range" data-r="pain" min="5" max="50" step="1" value="${S.pain}" aria-label="Порог боли, процентов">
    </div>
    <details>
      <summary>Параметры стратегии (канон урока: 55 % · 1,3:1 · 500 сделок)</summary>
      <div class="adv">
        <div class="ctl"><label><span>Доля выигрышных сделок</span><b data-r="winV"></b></label><input type="range" data-r="win" min="40" max="70" step="1" value="${S.win}"></div>
        <div class="ctl"><label><span>Выплата: средний плюс к среднему минусу</span><b data-r="payV"></b></label><input type="range" data-r="pay" min="0.8" max="2.5" step="0.1" value="${S.payoff}"></div>
        <div class="ctl"><label><span>Сделок в году</span><b data-r="trV"></b></label><input type="range" data-r="tr" min="100" max="1000" step="50" value="${S.trades}"></div>
        <div class="ctl">
          <label><span>Длина серии убытков для лестницы</span><b><span data-r="serV"></span> <span class="mini" data-r="serMode"></span></b></label>
          <div class="row"><button class="btn sm" data-r="serM">−</button><button class="btn sm" data-r="serP">+</button><button class="btn sm" data-r="serA">авто: ln N / ln(1/q)</button></div>
        </div>
      </div>
    </details>

    <div class="grid grid2">
      <div class="scene"><div class="cap"><span>Лестница вниз: <span data-r="stairTitle"></span></span><span data-r="stairCap"></span></div><canvas data-r="stairs" data-h="230"></canvas></div>
      <div class="scene"><div class="cap"><span>Веер просадок: <span data-r="fanTitle"></span></span><span data-r="fanCap"></span></div><canvas data-r="fan" data-h="230"></canvas></div>
    </div>

    <div class="callout" data-r="callout"></div>
    <div class="cards" data-r="cards"></div>
    <div class="mini" data-r="formula"></div>

    <details open><summary>Сравнение: тот же год при разном риске</summary><table data-r="table"></table></details>

    <div class="art" data-r="art">
      <div data-r="artText"></div>
      <div class="row" style="margin-top:8px"><button class="btn pri" data-r="copy">Скопировать в профиль</button><span class="mini" data-r="toast" aria-live="polite"></span></div>
    </div>
    <div class="row" style="margin-top:10px;justify-content:space-between">
      <span class="mini">seed <span class="mono" data-r="seed"></span> · попыток: <span class="mono" data-r="att">0</span></span>
      <span class="row"><button class="btn" data-r="round">Новый раунд</button><button class="btn" data-r="reset">Сброс к канону</button></span>
    </div>
  </div>`;

  const el = {};
  box.querySelectorAll('[data-r]').forEach(n => { el[n.getAttribute('data-r')] = n; });

  /* ───────── 5. математика ───────── */
  const expectedStreak = () => Math.log(S.trades) / Math.log(1 / (1 - S.win / 100));
  function seriesStats() {
    const r = S.risk / 100, n = S.series, pain = S.pain / 100;
    const dd = 1 - Math.pow(1 - r, n), rec = 1 / (1 - dd) - 1;
    let breachStep = -1;
    for (let i = 1; i <= n; i++) { if (1 - Math.pow(1 - r, i) > pain) { breachStep = i; break; } }
    return { dd: dd, rec: rec, breachStep: breachStep };
  }
  function percentile(arr, q) {
    const a = Array.prototype.slice.call(arr).sort((x, y) => x - y);
    const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  }

  let outcomes, ddGrid, finGrid, CUR;
  function genOutcomes() {                       // исходы фиксированы seed'ом, риск их не меняет
    const rnd = mulberry32(S.seed), p = S.win / 100, n = S.paths * S.trades;
    outcomes = new Uint8Array(n);
    for (let i = 0; i < n; i++) outcomes[i] = rnd() < p ? 1 : 0;
  }
  function computeGrid() {                       // макс. просадка и итог каждого пути для всех рисков сетки
    const P = S.paths, T = S.trades, b = S.payoff, G = riskGrid.length;
    ddGrid = new Float32Array(G * P); finGrid = new Float32Array(G * P);
    for (let g = 0; g < G; g++) {
      const r = riskGrid[g] / 100, up = 1 + r * b, dn = 1 - r;
      for (let k = 0; k < P; k++) {
        let e = 1, peak = 1, mdd = 0; const base = k * T;
        for (let t = 0; t < T; t++) {
          e *= outcomes[base + t] ? up : dn;
          if (e > peak) peak = e; else { const d = 1 - e / peak; if (d > mdd) mdd = d; }
        }
        ddGrid[g * P + k] = mdd; finGrid[g * P + k] = e;
      }
    }
  }
  const gIndex = risk => Math.max(0, Math.min(riskGrid.length - 1, Math.round((risk - RISK_MIN) / RISK_STEP)));
  function survivalAt(g, pain) {
    const P = S.paths; let c = 0;
    for (let k = 0; k < P; k++) if (ddGrid[g * P + k] < pain) c++;
    return c / P;
  }
  function computeCurrent() {                    // кривые просадки для текущего риска
    const P = S.paths, T = S.trades, r = S.risk / 100, b = S.payoff, up = 1 + r * b, dn = 1 - r;
    const stride = Math.max(1, Math.floor(P / SHOW_PATHS)), shown = [];
    for (let k = 0; k < P && shown.length < SHOW_PATHS; k += stride) shown.push(k);
    const allDD = new Float32Array(P * T);
    for (let k = 0; k < P; k++) {
      let e = 1, peak = 1; const base = k * T;
      for (let t = 0; t < T; t++) { e *= outcomes[base + t] ? up : dn; if (e > peak) peak = e; allDD[base + t] = 1 - e / peak; }
    }
    const p95 = new Float32Array(T), tmp = new Float32Array(P);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < P; k++) tmp[k] = allDD[k * T + t];
      const a = Array.prototype.slice.call(tmp).sort((x, y) => x - y);
      p95[t] = a[Math.floor((P - 1) * 0.95)];
    }
    const g = gIndex(S.risk);
    const mdd = ddGrid.subarray(g * P, (g + 1) * P), fin = finGrid.subarray(g * P, (g + 1) * P);
    CUR = { shown: shown, allDD: allDD, p95: p95, mdd: mdd, breach: new Int32Array(P),
      dd95: percentile(mdd, .95), dd50: percentile(mdd, .5), medFin: percentile(fin, .5), g: g };
    computeBreach();
  }
  function computeBreach() {                     // индекс сделки, на которой путь пробил порог (зависит только от порога)
    const P = S.paths, T = S.trades, pain = S.pain / 100;
    for (let k = 0; k < P; k++) {
      let idx = -1; const base = k * T;
      for (let t = 0; t < T; t++) { if (CUR.allDD[base + t] >= pain) { idx = t; break; } }
      CUR.breach[k] = idx;
    }
    CUR.surv = survivalAt(CUR.g, pain);
  }
  const zoneColor = s => s >= 0.95 ? C.ok : s >= 0.8 ? C.warn : C.bad;
  function greenLimit() {                        // максимальный риск, при котором ≥95 % лет внутри порога
    let best = null;
    for (let g = 0; g < riskGrid.length; g++) { if (survivalAt(g, S.pain / 100) >= 0.95) best = riskGrid[g]; else break; }
    return best;
  }

  /* ───────── 6. канвас-утилиты ───────── */
  function fit(cv) {
    const w = cv.clientWidth || 320, h = parseInt(cv.getAttribute('data-h'), 10) || 220;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  const ease = t => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  function dashLine(ctx, x1, y1, x2, y2, color, width) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = color; ctx.lineWidth = width || 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }

  /* ───────── 7. сцена А: лестница вниз ───────── */
  function drawStairs(prog) {
    const f = fit(el.stairs), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    const n = S.series, st = seriesStats(), dep = S.deposit, r = S.risk / 100;
    const padL = 46, padR = 100, padT = 20, padB = 28, plotW = w - padL - padR, plotH = h - padT - padB;
    const yOf = v => padT + plotH * (1 - v / dep);
    const gap = plotW / (n + 1), barW = Math.min(34, gap * 0.7);
    ctx.font = FONT; ctx.textBaseline = 'alphabetic';

    // сетка и подписи оси
    ctx.strokeStyle = rgba(C.mut, .18); ctx.lineWidth = 1; ctx.fillStyle = C.mut; ctx.textAlign = 'right';
    [0, .25, .5, .75, 1].forEach(fr => { const y = yOf(dep * fr); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillText(money(dep * fr), padL - 6, y + 4); });

    // порог боли
    const painLvl = dep * (1 - S.pain / 100), painY = yOf(painLvl);
    dashLine(ctx, padL, painY, w - padR + 4, painY, rgba(C.bad, .8), 1.5);
    ctx.fillStyle = C.bad; ctx.textAlign = 'left'; ctx.fillText('порог боли −' + S.pain + ' %', w - padR + 8, painY + 4);

    // столбики
    const visible = prog * (n + 1);
    let lastTop = yOf(dep), lastX = padL;
    for (let i = 0; i <= n; i++) {
      let show = visible - i; if (show <= 0) break; show = Math.min(1, show);
      const val = dep * Math.pow(1 - r, i), x = padL + gap * i + (gap - barW) / 2;
      const target = yOf(val);
      const prev = i === 0 ? yOf(0) : yOf(dep * Math.pow(1 - r, i - 1));
      const top = lerp(prev, target, ease(show));
      const col = val < painLvl ? C.bad : C.acc;
      ctx.fillStyle = rgba(col, .85);
      ctx.fillRect(x, top, barW, yOf(0) - top);
      ctx.fillStyle = rgba(col, .35); ctx.fillRect(x, top, barW, 3);
      // монеты сыплются
      if (show < 1 && i > 0) {
        ctx.fillStyle = C.warn;
        for (let c = 0; c < 3; c++) {
          const tt = Math.max(0, Math.min(1, show * 1.4 - c * 0.18));
          ctx.beginPath(); ctx.arc(x + barW / 2 + (c - 1) * 6, lerp(prev, top, tt) - 4, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // подпись оси X
      ctx.fillStyle = C.mut; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'старт' : String(i), x + barW / 2, h - padB + 14);
      if (show >= 1 && (i === 0 || i === st.breachStep)) { ctx.fillStyle = C.txt; ctx.fillText(money(val), x + barW / 2, top - 6); }
      if (show >= 1 && i === n) { ctx.fillStyle = st.dd > S.pain / 100 ? C.bad : C.txt; ctx.font = 'bold ' + FONT; ctx.fillText('−' + pct(st.dd), x + barW / 2, top - 6); ctx.font = FONT; }
      if (show >= 1 && i === st.breachStep) { ctx.fillStyle = C.bad; ctx.font = 'bold 12px ' + C.mono; ctx.fillText('!', x + barW / 2, top - 18); ctx.font = FONT; }
      lastTop = top; lastX = x;
    }
    ctx.fillStyle = C.mut; ctx.textAlign = 'center'; ctx.fillText('убыток №', padL + plotW / 2, h - 4);

    // стрелка «дорога обратно»
    if (prog >= 1) {
      const ax = lastX + barW + 14, y0 = yOf(dep);
      ctx.strokeStyle = C.ok; ctx.fillStyle = C.ok; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, lastTop); ctx.lineTo(ax, y0 + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, y0); ctx.lineTo(ax - 5, y0 + 9); ctx.lineTo(ax + 5, y0 + 9); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'left'; ctx.font = 'bold 13px ' + C.mono;
      const my = (lastTop + y0) / 2;
      ctx.fillText('+' + pct(st.rec), ax + 8, my + 1);
      ctx.font = FONT; ctx.fillStyle = C.mut; ctx.fillText('чтобы вернуться', ax + 8, my + 14);
    }
  }

  /* ───────── 8. сцена Б: веер просадок ───────── */
  function drawFan(prog) {
    const f = fit(el.fan), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    const T = S.trades, P = S.paths, pain = S.pain / 100;
    const padL = 44, padR = 10, padT = 16, padB = 24, plotW = w - padL - padR, plotH = h - padT - padB;
    const maxY = Math.min(1, Math.ceil(Math.max(pain * 1.6, CUR.dd95 * 1.15, 0.3) * 10) / 10);
    const xOf = t => padL + plotW * t / (T - 1), yOf = d => padT + plotH * Math.min(d, maxY) / maxY;
    const k = Math.max(2, Math.floor(prog * T));
    const step = Math.max(1, Math.floor(T / plotW));
    ctx.font = FONT;

    // сетка
    ctx.strokeStyle = rgba(C.mut, .18); ctx.lineWidth = 1; ctx.fillStyle = C.mut; ctx.textAlign = 'right';
    for (let d = 0; d <= maxY + 1e-9; d += 0.1) { const y = yOf(d); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillText(d === 0 ? '0 %' : '−' + Math.round(d * 100) + ' %', padL - 6, y + 4); }

    // пути: сначала выжившие, сверху — пробившие порог
    let survivedNow = 0;
    for (let kk = 0; kk < P; kk++) { const b = CUR.breach[kk]; if (b < 0 || b >= k) survivedNow++; }
    const drawPath = (s, breached) => {
      const idx = CUR.shown[s], base = idx * T, br = CUR.breach[idx];
      ctx.strokeStyle = breached ? rgba(C.bad, .5) : rgba(C.acc, .3);
      ctx.beginPath();
      for (let t = 0; t < k; t += step) { const x = xOf(t), y = yOf(CUR.allDD[base + t]); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      if (breached) { ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(xOf(br), yOf(CUR.allDD[base + br]), 2.5, 0, Math.PI * 2); ctx.fill(); }
    };
    ctx.lineWidth = 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let s = 0; s < CUR.shown.length; s++) {
        const br = CUR.breach[CUR.shown[s]], breached = br >= 0 && br < k;
        if ((pass === 1) === breached) drawPath(s, breached);
      }
    }
    // 95-й процентиль просадки
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.warn; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let t = 0; t < k; t += step) { const x = xOf(t), y = yOf(CUR.p95[t]); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
    if (prog >= 1) { ctx.fillStyle = C.warn; ctx.textAlign = 'right'; ctx.fillText('95-й процентиль −' + pct(CUR.dd95, 0), w - padR - 2, yOf(CUR.p95[T - 1]) + 12); }

    // порог боли
    const py = yOf(pain);
    dashLine(ctx, padL, py, w - padR, py, rgba(C.bad, .9), 1.5);
    ctx.fillStyle = C.bad; ctx.textAlign = 'left'; ctx.fillText('порог боли −' + S.pain + ' %', padL + 4, py - 4);

    // счётчик
    ctx.fillStyle = C.txt; ctx.textAlign = 'right';
    ctx.fillText('сделка ' + k + ' из ' + T + ' · выжило ' + survivedNow + '/' + P, w - padR - 2, padT - 4);
    // ось X
    ctx.fillStyle = C.mut; ctx.textAlign = 'center';
    ctx.fillText('0', xOf(0), h - 6); ctx.fillText(Math.round(T / 2) + '', xOf(T / 2), h - 6); ctx.fillText(T + ' сделок', xOf(T - 1) - 20, h - 6);
  }

  /* ───────── 9. панели ───────── */
  function paintSlider() {
    const G = riskGrid.length, pain = S.pain / 100, stops = [];
    for (let g = 0; g < G; g++) {
      const c = rgba(zoneColor(survivalAt(g, pain)), .7), a = (g / G * 100).toFixed(2), b = ((g + 1) / G * 100).toFixed(2);
      stops.push(c + ' ' + a + '%', c + ' ' + b + '%');
    }
    el.risk.style.background = 'linear-gradient(90deg,' + stops.join(',') + ')';
    const lim = greenLimit();
    el.zoneHint.innerHTML = lim == null
      ? 'зелёной зоны нет: при таком пороге даже ' + fmt(RISK_MIN, 2) + ' % не держит 95 % лет'
      : 'зелёная зона: до <b class="mono" style="color:' + C.ok + '">' + fmt(lim, 2) + ' %</b> на сделку';
    el.ticks.innerHTML = [[1, 'устав ≤1 %', 'rule'], [5, '5 %', ''], [10, '10 %', ''], [20, '20 %', '']]
      .map(t => '<span class="tick ' + t[2] + '" style="left:' + Math.min(96, posOf(t[0])) + '%">' + t[1] + '</span>').join('');
  }
  function renderLabels() {
    el.riskV.textContent = fmt(S.risk, 2) + ' %'; el.painV.textContent = S.pain + ' %';
    el.winV.textContent = S.win + ' %'; el.payV.textContent = fmt(S.payoff, 1) + ' : 1'; el.trV.textContent = S.trades + '';
    el.serV.textContent = S.series + ''; el.serMode.textContent = S.seriesAuto ? '(авто)' : '(вручную)';
    el.taskN.textContent = S.series; el.taskP.textContent = S.paths; el.taskT.textContent = S.trades;
    el.seed.textContent = S.seed; el.att.textContent = S.attempts;
    el.stairTitle.textContent = 'серия из ' + S.series + ' убытков';
    el.fanTitle.textContent = S.paths + ' лет по ' + S.trades + ' сделок';
    el.stairCap.textContent = 'риск ' + fmt(S.risk, 2) + ' %';
    el.fanCap.textContent = 'выживаемость ' + pct(CUR.surv, 0);
  }
  function renderCards() {
    const st = seriesStats(), ratio = st.rec / st.dd, painBad = st.dd > S.pain / 100;
    el.cards.innerHTML = [
      ['Серия из ' + S.series + ' убытков', '−' + pct(st.dd), money(S.deposit) + ' → ' + money(S.deposit * (1 - st.dd)), painBad ? C.bad : C.txt],
      ['Дорога обратно', '+' + pct(st.rec), 'в ' + fmt(ratio, 2) + ' раза длиннее спуска', C.ok],
      ['Выживаемость', pct(CUR.surv, 0), 'лет без пробоя −' + S.pain + ' %', zoneColor(CUR.surv)],
      ['Просадка худших 5 % лет', '−' + pct(CUR.dd95, 0), 'медиана −' + pct(CUR.dd50, 0), CUR.dd95 > S.pain / 100 ? C.bad : C.txt]
    ].map(c => '<div class="card"><div class="k">' + c[0] + '</div><div class="v" style="color:' + c[3] + '">' + c[1] + '</div><div class="s">' + c[2] + '</div></div>').join('');
    const q = 1 - S.win / 100;
    el.formula.innerHTML = 'Ожидаемая максимальная серия убытков при ' + S.win + ' % и ' + S.trades + ' сделках: ln(' + S.trades + ') / ln(1/' + fmt(q, 2) + ') ≈ ' +
      fmt(expectedStreak(), 1) + ' → <b class="mono">' + Math.round(expectedStreak()) + '</b> подряд (урок 5.5). ' +
      'Медианный итог года при риске ' + fmt(S.risk, 2) + ' %: <b class="mono">×' + fmt(CUR.medFin, CUR.medFin < 10 ? 2 : 0) + '</b> — но путь к нему лежит через просадку до −' + pct(CUR.dd95, 0) + '.';
  }
  function renderCallout() {
    const st = seriesStats(), s = CUR.surv, ratio = st.rec / st.dd; let cls, txt;
    if (st.breachStep > 0) {
      cls = 'bad'; txt = '<b>Порог пробит.</b> Серия из ' + S.series + ' убытков ломает порог −' + S.pain + ' % уже на убытке №' + st.breachStep +
        ' и заканчивается на −' + pct(st.dd) + '. Чтобы вернуться, нужно +' + pct(st.rec) + ' — дорога назад в ' + fmt(ratio, 1) + ' раза длиннее спуска. Двигай ползунок влево.';
    } else if (s < 0.8) {
      cls = 'bad'; txt = '<b>Серия терпима, год — нет.</b> ' + S.series + ' убытков подряд стоят −' + pct(st.dd) + ', но за ' + S.trades + ' сделок порог −' + S.pain +
        ' % пробивают ' + pct(1 - s, 0) + ' симулированных лет: серии складываются, а между ними идут обычные убытки. Одной «лестницы» мало — смотри веер.';
    } else if (s < 0.95) {
      cls = 'warn'; txt = '<b>Почти.</b> Серия из ' + S.series + ' → −' + pct(st.dd) + ', обратно +' + pct(st.rec) + '. Но в ' + pct(1 - s, 0) +
        ' лет просадка глубже порога. Один-два шага влево — и зона зелёная.';
    } else {
      cls = 'ok'; txt = '<b>Лимит найден: ' + fmt(S.risk, 2) + ' % на сделку.</b> Серия из ' + S.series + ' → −' + pct(st.dd) + ', обратно +' + pct(st.rec) + '; ' +
        pct(s, 0) + ' лет держатся внутри порога −' + S.pain + ' %. Заметь асимметрию: вниз −' + pct(st.dd) + ', а обратно +' + pct(st.rec) + ' — закон из урока 0.12 никуда не делся.';
    }
    el.callout.className = 'callout ' + cls; el.callout.innerHTML = txt;
    return cls === 'ok';
  }
  function renderTable() {
    const rows = [0.5, 1, 2, 5, 10]; if (rows.indexOf(S.risk) < 0) rows.push(S.risk); rows.sort((a, b) => a - b);
    const pain = S.pain / 100, n = S.series;
    let html = '<tr><th>риск</th><th>серия ' + n + '</th><th>вернуть</th><th>выживаемость</th></tr>';
    rows.forEach(rk => {
      const dd = 1 - Math.pow(1 - rk / 100, n), rec = 1 / (1 - dd) - 1, s = survivalAt(gIndex(rk), pain);
      html += '<tr class="' + (rk === S.risk ? 'cur' : '') + '"><td>' + fmt(rk, rk % 1 ? 2 : 0) + ' %' + (rk === 1 ? ' <span style="color:' + C.ok + '">устав</span>' : '') +
        (rk === S.risk ? ' ◂' : '') + '</td><td style="color:' + (dd > pain ? C.bad : C.txt) + '">−' + pct(dd) + '</td><td style="color:' + C.ok + '">+' + pct(rec) +
        '</td><td><i class="dot" style="background:' + zoneColor(s) + '"></i>' + pct(s, 0) + '</td></tr>';
    });
    el.table.innerHTML = html;
  }
  function artifactText() {
    const st = seriesStats();
    return 'Мой лимит: ' + fmt(S.risk, 2) + ' % на сделку при пороге ' + S.pain + ' % · серия ' + S.series + ' → просадка −' + pct(st.dd) +
      ', восстановление +' + pct(st.rec) + ', выживаемость ' + pct(CUR.surv, 0) +
      ' (' + S.win + ' % · ' + fmt(S.payoff, 1) + ':1 · ' + S.trades + ' сделок · ' + S.paths + ' путей · seed ' + S.seed + ')';
  }
  function renderArtifact(done) {
    el.art.className = 'art' + (done ? '' : ' draft');
    el.artText.innerHTML = '<span class="mini">' + (done ? 'Артефакт готов:' : 'Черновик артефакта (задание ещё не выполнено):') + '</span><br>' + artifactText();
  }
  function renderAll() {
    renderLabels(); renderCards(); const done = renderCallout(); renderTable(); renderArtifact(done);
  }

  /* ───────── 10. анимация ───────── */
  let prog = 1, animStart = 0;
  const drawAll = p => { drawStairs(Math.min(1, p * 1.6)); drawFan(p); };
  function restartAnim() {
    if (box._expRaf) cancelAnimationFrame(box._expRaf);
    animStart = performance.now(); prog = 0;
    const step = now => { prog = Math.min(1, (now - animStart) / ANIM_MS); drawAll(prog); if (prog < 1) raf(step); else box._expRaf = null; };
    raf(step);
  }
  const redraw = () => { if (!box._expRaf) drawAll(prog); };

  /* ───────── 11. пересчёты ───────── */
  function fullRecompute() {
    genOutcomes(); computeGrid();
    if (S.seriesAuto) S.series = Math.max(1, Math.min(15, Math.round(expectedStreak())));
    computeCurrent(); paintSlider(); renderAll();
  }

  /* ───────── 12. события ───────── */
  el.risk.addEventListener('input', () => { S.risk = +el.risk.value; computeCurrent(); renderAll(); restartAnim(); });
  el.risk.addEventListener('change', () => { S.attempts++; el.att.textContent = S.attempts; });
  el.pain.addEventListener('input', () => { S.pain = +el.pain.value; computeBreach(); paintSlider(); renderAll(); redraw(); });

  el.win.addEventListener('input', () => { S.win = +el.win.value; el.winV.textContent = S.win + ' %'; });
  el.pay.addEventListener('input', () => { S.payoff = +el.pay.value; el.payV.textContent = fmt(S.payoff, 1) + ' : 1'; });
  el.tr.addEventListener('input', () => { S.trades = +el.tr.value; el.trV.textContent = S.trades + ''; });
  ['win', 'pay', 'tr'].forEach(k => el[k].addEventListener('change', () => { fullRecompute(); restartAnim(); }));

  const setSeries = (v, auto) => { S.seriesAuto = !!auto; S.series = Math.max(1, Math.min(15, v)); renderAll(); restartAnim(); };
  el.serM.addEventListener('click', () => setSeries(S.series - 1, false));
  el.serP.addEventListener('click', () => setSeries(S.series + 1, false));
  el.serA.addEventListener('click', () => setSeries(Math.round(expectedStreak()), true));

  el.round.addEventListener('click', () => { S.seed = (Date.now() % 90000) + 1000; fullRecompute(); restartAnim(); });
  el.reset.addEventListener('click', () => {
    Object.assign(S, CANON, { seriesAuto: true });
    el.risk.value = S.risk; el.pain.value = S.pain; el.win.value = S.win; el.pay.value = S.payoff; el.tr.value = S.trades;
    fullRecompute(); restartAnim();
  });

  function copyText(t) {
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; box.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      box.removeChild(ta); return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, () => fallback());
    return Promise.resolve(fallback());
  }
  el.copy.addEventListener('click', () => {
    const text = artifactText(), st = seriesStats();
    copyText(text).then(ok => {
      el.toast.textContent = ok ? 'Скопировано ✓' : 'Не удалось скопировать — выдели текст выше вручную';
      el.toast.style.color = ok ? C.ok : C.warn;
      later(() => { el.toast.textContent = ''; }, 2200);
    });
    box.dispatchEvent(new CustomEvent('expert-artifact', { bubbles: true, detail: {
      widget: 'widget_v4_riskmgr', lesson: '0.12', text: text, done: seriesStats().dd <= S.pain / 100 && CUR.surv >= 0.95,
      values: { risk: S.risk, pain: S.pain, series: S.series, seriesDD: st.dd, recovery: st.rec, survival: CUR.surv, dd95: CUR.dd95, seed: S.seed, attempts: S.attempts }
    } }));
  });

  box._expResize = () => { drawAll(prog); };
  window.addEventListener('resize', box._expResize);

  /* ───────── 13. старт ───────── */
  fullRecompute();
  restartAnim();
};
