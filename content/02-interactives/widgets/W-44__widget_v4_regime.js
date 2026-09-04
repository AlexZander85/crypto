/*
 * W-44 · widget_v4_regime · 0.8 «Угадай режим рынка»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что «режим рынка» — не ощущение, а проверяемая структура вершин и впадин (HH/HL, LH/LL, один уровень, сжатие) — и что это всегда чтение прошлого.
 *   Задание: за 10 раундов определить режим по свечам; после каждого ответа — разбор с подсветкой фракталов; собрать серию из 5 верных (множитель ×16).
 *   Ага: правильный ответ каждый раз «читается» по последовательности вершин — и всё равно ничего не говорит о следующей свече (мысль урока 0.8). Ошибка сжигает множитель на глазах.
 *   Дефолты: seed 42, уровень «Средне» (30 свечей, шум 0,8%), 4 режима, множители 1·2·4·8·16, 10 очков за базовый ответ, артефакт каждые 10 раундов.
 *   Артефакт: строка «Читаю режим: N из M (X%) · лучшая серия K · точность по режимам» — в профиль.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_v4_regime'] = function (box) {
  /* 0. чистим прошлый запуск */
  if (box._expTimers) box._expTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
  if (box._expRaf) cancelAnimationFrame(box._expRaf);
  if (box._expResize) window.removeEventListener('resize', box._expResize);
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const gauss = rnd => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ---------- канон урока ---------- */
  const REG = {
    up:      { name: 'Восходящий тренд', icon: '↗', rule: 'вершины и впадины стоят выше предыдущих (HH + HL)' },
    down:    { name: 'Нисходящий тренд', icon: '↘', rule: 'вершины и впадины стоят ниже предыдущих (LH + LL)' },
    range:   { name: 'Боковик',          icon: '↔', rule: 'вершины упираются в один уровень, впадины — в другой' },
    squeeze: { name: 'Сжатие',           icon: '⋈', rule: 'вершины ниже, впадины выше — размах тает к точке' }
  };
  const ORDER = ['up', 'down', 'range', 'squeeze'];
  const LEVELS = {
    easy: { n: 40, sigma: 0.004, label: 'Легко · 40 свечей' },
    mid:  { n: 30, sigma: 0.008, label: 'Средне · 30 свечей' },
    hard: { n: 22, sigma: 0.012, label: 'Сложно · 22 свечи' }
  };
  const MULT = [1, 2, 4, 8, 16];   // нелинейное вознаграждение за серию
  const BASE = 10;                 // очков за верный ответ при ×1
  const ART_EVERY = 10;            // артефакт каждые 10 раундов
  const mono = 'ui-monospace,Menlo,Consolas,monospace';

  const cs = getComputedStyle(box);
  const cvar = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
  const col = { ok: cvar('--ok', '#22c55e'), bad: cvar('--bad', '#ef4444'), warn: cvar('--warn', '#eab308'), acc: cvar('--acc2', '#06b6d4'), mut: cvar('--mut', '#9aa3c7'), txt: cvar('--txt', '#eef1ff') };

  /* ---------- разметка ---------- */
  box.innerHTML = `
  <style>
    .rg{--l:var(--line,rgba(154,163,199,.18));font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--l);border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
    .rg *{box-sizing:border-box}
    .rg-head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
    .rg-title{font-weight:700;font-size:16px}
    .rg-goal{color:var(--mut,#9aa3c7);font-size:12.5px;flex:1 1 100%}
    .rg-bar{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:10px 0 8px;font-size:13px;color:var(--mut,#9aa3c7)}
    .rg-bar b{color:var(--txt,#eef1ff);font-family:var(--mono,${mono})}
    .rg-mult{display:flex;align-items:center;gap:4px;margin-left:auto}
    .rg-seg{width:14px;height:8px;border-radius:2px;background:rgba(154,163,199,.18);transition:background .35s,box-shadow .35s}
    .rg-seg.on{background:var(--warn,#eab308);box-shadow:0 0 8px var(--warn,#eab308)}
    .rg-mult.burn .rg-seg{background:var(--bad,#ef4444);box-shadow:0 0 10px var(--bad,#ef4444)}
    .rg-x{font-family:var(--mono,${mono});font-weight:700;color:var(--warn,#eab308);min-width:34px;text-align:right;transition:color .3s}
    .rg-mult.burn .rg-x{color:var(--bad,#ef4444)}
    .rg-cv{display:block;width:100%;height:220px;border-radius:8px;background:rgba(0,0,0,.25)}
    @media (max-width:420px){.rg-cv{height:190px}}
    .rg-task{margin:10px 0 8px;font-size:13px;color:var(--mut,#9aa3c7)}
    .rg-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .rg-opt{border:1px solid var(--l);background:rgba(255,255,255,.03);color:var(--txt,#eef1ff);border-radius:10px;padding:10px 8px;font:inherit;cursor:pointer;display:flex;gap:8px;align-items:center;justify-content:center;transition:transform .12s,border-color .2s,background .2s,opacity .2s}
    .rg-opt:hover:not(:disabled){transform:translateY(-1px);border-color:var(--acc2,#06b6d4)}
    .rg-opt:disabled{cursor:default;opacity:.5}
    .rg-opt .i{font-size:18px;font-family:var(--mono,${mono})}
    .rg-opt.hit{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.14);opacity:1}
    .rg-opt.miss{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.14);opacity:1}
    .rg-hint{margin-top:8px;font-size:12.5px;color:var(--warn,#eab308)}
    .rg-why{margin-top:10px;padding:10px 12px;border-radius:10px;border-left:3px solid var(--ok,#22c55e);background:rgba(34,197,94,.07);font-size:13.5px}
    .rg-why.bad{border-left-color:var(--bad,#ef4444);background:rgba(239,68,68,.07)}
    .rg-why h4{margin:0 0 4px;font-size:14px}
    .rg-why p{margin:4px 0}
    .rg-why .aha{color:var(--mut,#9aa3c7);font-size:12.5px}
    .rg-lab{display:inline-block;padding:0 5px;border-radius:4px;font-family:var(--mono,${mono});font-size:12px;background:rgba(255,255,255,.08)}
    .rg-pts{font-family:var(--mono,${mono});font-weight:700}
    .rg-foot{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
    .rg-btn{border:1px solid var(--l);background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer}
    .rg-btn.pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:700}
    .rg-btn:disabled{opacity:.45;cursor:default}
    .rg-sel{border:1px solid var(--l);background:#0b0f21;color:var(--txt,#eef1ff);border-radius:8px;padding:8px;font:inherit}
    .rg-art{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.35);font-size:13px}
    .rg-art code{display:block;margin-top:6px;padding:8px;background:rgba(0,0,0,.3);border-radius:6px;font-family:var(--mono,${mono});font-size:12px;word-break:break-word;user-select:all}
    .rg-art .m{margin-top:6px;color:var(--mut,#9aa3c7);font-size:12.5px}
    .rg [hidden]{display:none!important}
  </style>
  <div class="rg">
    <div class="rg-head">
      <div class="rg-title">Угадай режим рынка</div>
      <div class="rg-goal">Цель: увидеть, что режим — это проверяемая структура вершин и впадин, а не «ощущение». И что это чтение прошлого.</div>
    </div>
    <div class="rg-bar">
      <span>Раунд <b class="rg-r">1</b></span>
      <span>Очки <b class="rg-s">0</b></span>
      <span>Серия <b class="rg-k">0</b></span>
      <span>Лучшая <b class="rg-b">0</b></span>
      <div class="rg-mult" title="множитель за серию верных ответов">${'<i class="rg-seg"></i>'.repeat(5)}<span class="rg-x">×1</span></div>
    </div>
    <canvas class="rg-cv"></canvas>
    <div class="rg-task">Задание: определи режим по свечам. Верный ответ — ${BASE} очков, каждый следующий подряд удваивает множитель (до ×16). Одна ошибка сжигает серию.</div>
    <div class="rg-opts">${ORDER.map(k => `<button class="rg-opt" data-k="${k}"><span class="i">${REG[k].icon}</span>${REG[k].name}</button>`).join('')}</div>
    <div class="rg-hint" hidden>Подсказка: смотри только на вершины и впадины. Каждая выше предыдущей — тренд вверх; ниже — вниз; примерно на одном уровне — боковик; вершины ниже, а впадины выше — сжатие.</div>
    <div class="rg-why" hidden></div>
    <div class="rg-foot">
      <button class="rg-btn pri rg-next" disabled>Следующий раунд →</button>
      <select class="rg-sel rg-lvl">${Object.keys(LEVELS).map(k => `<option value="${k}">${LEVELS[k].label}</option>`).join('')}</select>
      <button class="rg-btn rg-reset" title="сброс счёта и новая случайная серия раундов">Новая серия</button>
    </div>
    <div class="rg-art" hidden></div>
  </div>`;

  const $ = s => box.querySelector(s), $$ = s => Array.from(box.querySelectorAll(s));

  /* ---------- состояние ---------- */
  const st = { baseSeed: 42, round: 0, score: 0, streak: 0, best: 0, level: 'mid', prev: [], cur: null, answered: false, appear: 1, reveal: 0, misses: 0, stats: {} };
  ORDER.forEach(k => st.stats[k] = { ok: 0, total: 0 });
  $('.rg-lvl').value = st.level;

  /* ---------- генерация раунда ---------- */
  function genRound(seed, lvKey) {
    const rnd = mulberry32(seed), L = LEVELS[lvKey];
    const last2 = st.prev.slice(-2);
    const pool = ORDER.filter(r => !(last2.length === 2 && last2[0] === r && last2[1] === r)); // не 3 раза подряд
    const regime = pool[Math.floor(rnd() * pool.length)];
    // путь строится «ногами»: детерминированная структура + шум вокруг неё (шум не накапливается — структура читаема)
    const closes = [];
    let p = 100, dir = rnd() < 0.5 ? 1 : -1, k = 0;
    while (closes.length < L.n) {
      let target, len;
      if (regime === 'up')        { target = p * (1 + (dir > 0 ? 0.06 + rnd() * 0.04 : -(0.02 + rnd() * 0.02))); len = dir > 0 ? 4 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 2); }
      else if (regime === 'down') { target = p * (1 + (dir > 0 ? 0.02 + rnd() * 0.02 : -(0.06 + rnd() * 0.04))); len = dir > 0 ? 2 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 3); }
      else if (regime === 'range'){ target = 100 * (1 + dir * (0.035 + rnd() * 0.015)); len = 3 + Math.floor(rnd() * 3); }
      else                        { target = 100 * (1 + dir * 0.09 * Math.pow(0.72, k)); len = 3 + Math.floor(rnd() * 2); }
      for (let i = 1; i <= len; i++) closes.push((p + (target - p) * i / len) * (1 + gauss(rnd) * L.sigma));
      p = target; dir = -dir; k++;
    }
    const c = closes.slice(0, L.n).map((cl, i, arr) => {
      const o = i ? arr[i - 1] : 100 * (1 + gauss(rnd) * L.sigma * 0.5);
      const w1 = Math.abs(gauss(rnd)) * L.sigma * 0.6, w2 = Math.abs(gauss(rnd)) * L.sigma * 0.6;
      return { o, c: cl, h: Math.max(o, cl) * (1 + w1), l: Math.min(o, cl) * (1 - w2) };
    });
    const sw = fractals(c);
    return { regime, c, sw, an: analyze(c, sw) };
  }

  // фракталы: вершина — максимум выше 2 соседей с каждой стороны; впадина — зеркально. Метки HH/LH, HL/LL относительно предыдущей вершины/впадины
  function fractals(c) {
    const k = 2, sw = [];
    for (let i = k; i < c.length - k; i++) {
      let isH = true, isL = true;
      for (let j = 1; j <= k; j++) {
        if (!(c[i].h > c[i - j].h && c[i].h > c[i + j].h)) isH = false;
        if (!(c[i].l < c[i - j].l && c[i].l < c[i + j].l)) isL = false;
      }
      if (isH) sw.push({ i, p: c[i].h, t: 'H' });
      if (isL) sw.push({ i, p: c[i].l, t: 'L' });
    }
    let lastH = null, lastL = null;
    sw.forEach(s => {
      if (s.t === 'H') { s.lab = lastH === null ? 'H' : (s.p > lastH ? 'HH' : 'LH'); lastH = s.p; }
      else             { s.lab = lastL === null ? 'L' : (s.p > lastL ? 'HL' : 'LL'); lastL = s.p; }
    });
    return sw;
  }

  function analyze(c, sw) {
    const cnt = { HH: 0, HL: 0, LH: 0, LL: 0 };
    sw.forEach(s => { if (cnt[s.lab] !== undefined) cnt[s.lab]++; });
    const n = c.length, third = Math.floor(n / 3);
    const rng = arr => Math.max(...arr.map(x => x.h)) - Math.min(...arr.map(x => x.l));
    const r1 = rng(c.slice(0, third)) || 1e-9, r3 = rng(c.slice(n - third));
    const hs = sw.filter(s => s.t === 'H'), ls = sw.filter(s => s.t === 'L');
    const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    return { cnt, shrink: r3 / r1, nH: hs.length, nL: ls.length, topLvl: mean(hs.map(s => s.p)), botLvl: mean(ls.map(s => s.p)) };
  }

  /* ---------- рисование ---------- */
  function draw() {
    const cv = $('.rg-cv'); if (!cv || !st.cur) return;
    const W = cv.clientWidth || 320, H = cv.clientHeight || 200, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const c = st.cur.c, n = c.length;
    const pL = 8, pR = 46, pT = 22, pB = 18;
    const pmin = Math.min(...c.map(x => x.l)), pmax = Math.max(...c.map(x => x.h)), span = (pmax - pmin) || 1;
    const Y = p => pT + (pmax - p) / span * (H - pT - pB);
    const xw = (W - pL - pR) / n, X = i => pL + (i + 0.5) * xw;

    // сетка и шкала
    ctx.strokeStyle = 'rgba(154,163,199,.12)'; ctx.lineWidth = 1; ctx.fillStyle = col.mut; ctx.font = '10px ' + mono; ctx.textAlign = 'left';
    for (let g = 0; g <= 4; g++) {
      const p = pmin + span * g / 4, y = Math.round(Y(p)) + .5;
      ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR + 4, y); ctx.stroke();
      ctx.fillText(p.toFixed(1), W - pR + 8, y + 3);
    }
    // свечи (появляются по одной)
    const shown = Math.max(1, Math.round(n * st.appear)), bw = Math.max(2, xw * 0.62);
    for (let i = 0; i < shown; i++) {
      const k = c[i], up = k.c >= k.o, x = X(i);
      ctx.strokeStyle = ctx.fillStyle = up ? col.ok : col.bad; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Y(k.h)); ctx.lineTo(x, Y(k.l)); ctx.stroke();
      const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
      ctx.fillRect(x - bw / 2, y1, bw, Math.max(1.5, y2 - y1));
    }
    if (!st.answered || st.reveal <= 0) return;

    // «почему»-разбор: наложения + маркеры фракталов
    ctx.globalAlpha = st.reveal;
    const { sw, regime: truth, an } = st.cur;
    const Hs = sw.filter(s => s.t === 'H'), Ls = sw.filter(s => s.t === 'L');
    const poly = (pts, color, dash) => {
      if (pts.length < 2) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash || []);
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.i), Y(p.p)) : ctx.moveTo(X(p.i), Y(p.p))); ctx.stroke(); ctx.restore();
    };
    const fitLine = (pts, color) => { // регрессия через вершины/впадины, продлённая вправо
      if (pts.length < 2) return;
      const xs = pts.map(p => X(p.i)), ys = pts.map(p => Y(p.p));
      const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
      let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
      const b = den ? num / den : 0, x0 = xs[0], x1 = W - pR;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(x0, my + b * (x0 - mx)); ctx.lineTo(x1, my + b * (x1 - mx)); ctx.stroke(); ctx.restore();
    };
    const hline = (p, color) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pL, Y(p)); ctx.lineTo(W - pR, Y(p)); ctx.stroke(); ctx.restore(); };

    if (truth === 'up')         { poly(Ls, col.ok); poly(Hs, col.ok, [4, 4]); }
    else if (truth === 'down')  { poly(Hs, col.bad); poly(Ls, col.bad, [4, 4]); }
    else if (truth === 'range') { hline(an.topLvl, col.acc); hline(an.botLvl, col.acc); }
    else                        { fitLine(Hs, col.warn); fitLine(Ls, col.warn); }

    ctx.font = 'bold 10px ' + mono; ctx.textAlign = 'center';
    sw.forEach(s => {
      const x = Math.min(Math.max(X(s.i), 12), W - pR - 12), y = Y(s.p), isH = s.t === 'H';
      const fits = (truth === 'up' && (s.lab === 'HH' || s.lab === 'HL')) ||
                   (truth === 'down' && (s.lab === 'LH' || s.lab === 'LL')) ||
                   (truth === 'squeeze' && (s.lab === 'LH' || s.lab === 'HL'));
      ctx.fillStyle = truth === 'range' ? col.acc : (fits ? (truth === 'squeeze' ? col.warn : (truth === 'up' ? col.ok : col.bad)) : col.mut);
      ctx.beginPath();
      if (isH) { ctx.moveTo(x, y - 3); ctx.lineTo(x - 4, y - 9); ctx.lineTo(x + 4, y - 9); }
      else     { ctx.moveTo(x, y + 3); ctx.lineTo(x - 4, y + 9); ctx.lineTo(x + 4, y + 9); }
      ctx.closePath(); ctx.fill();
      ctx.fillText(s.lab, x, isH ? y - 12 : y + 19);
    });
    ctx.globalAlpha = 1;
  }

  function animate(key, dur) {
    const t0 = performance.now();
    const step = now => { st[key] = Math.min(1, (now - t0) / dur); draw(); if (st[key] < 1) raf(step); };
    raf(step);
  }

  /* ---------- логика раундов ---------- */
  function updateBar() {
    $('.rg-r').textContent = st.round; $('.rg-s').textContent = st.score; $('.rg-k').textContent = st.streak; $('.rg-b').textContent = st.best;
    const lit = Math.min(st.streak, 5);
    $$('.rg-seg').forEach((s, i) => s.classList.toggle('on', i < lit));
    $('.rg-x').textContent = '×' + MULT[Math.min(st.streak, 4)]; // столько принесёт следующий верный
  }

  function newRound() {
    st.round++;
    st.cur = genRound((st.baseSeed + st.round * 7919) | 0, st.level);
    st.prev.push(st.cur.regime); if (st.prev.length > 2) st.prev.shift();
    st.answered = false; st.reveal = 0; st.appear = 0;
    $$('.rg-opt').forEach(b => { b.disabled = false; b.classList.remove('hit', 'miss'); });
    $('.rg-why').hidden = true; $('.rg-next').disabled = true; $('.rg-art').hidden = true;
    $('.rg-mult').classList.remove('burn');
    updateBar();
    animate('appear', 700);
  }

  function counterFact(k, an) { // чем опровергается ошибочный вариант
    const c = an.cnt;
    if (k === 'up')    return `Здесь HH только ${c.HH} из ${an.nH}, HL — ${c.HL} из ${an.nL}.`;
    if (k === 'down')  return `Здесь LL только ${c.LL} из ${an.nL}, LH — ${c.LH} из ${an.nH}.`;
    if (k === 'range') return st.cur.regime === 'squeeze' ? `Здесь размах не стоит, а тает: последняя треть — ${Math.round(an.shrink * 100)}% от первой.` : `Здесь вершины и впадины идут лестницей, а не упираются в уровень.`;
    return `Здесь размах последней трети — ${Math.round(an.shrink * 100)}% от первой: сжатия нет.`;
  }

  function renderWhy(k, ok, pts, burned) {
    const { regime: truth, an } = st.cur, c = an.cnt, lab = s => `<span class="rg-lab">${s}</span>`;
    let facts;
    if (truth === 'up')         facts = `Вершины: ${c.HH} из ${an.nH} выше предыдущей ${lab('HH')}, впадины: ${c.HL} из ${an.nL} выше предыдущей ${lab('HL')}. Лестница вверх — зелёная линия по впадинам.`;
    else if (truth === 'down')  facts = `Вершины: ${c.LH} из ${an.nH} ниже предыдущей ${lab('LH')}, впадины: ${c.LL} из ${an.nL} ниже ${lab('LL')}. Лестница вниз — красная линия по вершинам.`;
    else if (truth === 'range') facts = `Вершины кучкуются у ${an.topLvl.toFixed(1)}, впадины — у ${an.botLvl.toFixed(1)}: метки ${lab('HH')}/${lab('LH')} чередуются, лестницы нет. Размах последней трети — ${Math.round(an.shrink * 100)}% от первой: не сжимается.`;
    else                        facts = `Размах последней трети — всего ${Math.round(an.shrink * 100)}% от первой. Вершины ниже ${lab('LH')}, впадины выше ${lab('HL')}: жёлтые линии сходятся к точке.`;
    const pen = ok
      ? `<p>+<span class="rg-pts">${pts}</span> очков: серия ${st.streak}, множитель ×${MULT[Math.min(st.streak - 1, 4)]}${st.streak >= 5 ? ' — максимум, держи' : ''}.</p>`
      : `<p class="rg-pts">Серия из ${burned} сгорела: множитель ×${MULT[Math.min(burned, 4)]} → ×1. Верный ответ стоил бы ${BASE * MULT[Math.min(burned, 4)]} очков.</p>`;
    const el = $('.rg-why');
    el.className = 'rg-why' + (ok ? '' : ' bad'); el.hidden = false;
    el.innerHTML = `<h4>${ok ? '✓ Верно: ' : '✕ Это был '}${REG[truth].name} ${REG[truth].icon}</h4>
      <p>${facts}</p>
      ${ok ? '' : `<p>Почему не «${REG[k].name}»: для него нужно, чтобы ${REG[k].rule}. ${counterFact(k, an)}</p>`}
      ${pen}
      <p class="aha">Заметь: ответ найден в прошлых вершинах. Что сделает следующая свеча, эта структура не говорит — она описывает то, что уже случилось (урок 0.8).</p>`;
  }

  function answer(k) {
    if (st.answered) return;
    st.answered = true; st.appear = 1;
    const truth = st.cur.regime, ok = k === truth, burned = st.streak;
    st.stats[truth].total++;
    let pts = 0;
    if (ok) { pts = BASE * MULT[Math.min(st.streak, 4)]; st.streak++; st.score += pts; st.best = Math.max(st.best, st.streak); st.stats[truth].ok++; st.misses = 0; }
    else st.misses++;
    $$('.rg-opt').forEach(b => { b.disabled = true; if (b.dataset.k === truth) b.classList.add('hit'); else if (b.dataset.k === k) b.classList.add('miss'); });
    renderWhy(k, ok, pts, burned);
    $('.rg-hint').hidden = st.misses < 2;
    if (ok) updateBar();
    else {
      st.streak = 0;
      if (burned) { $('.rg-mult').classList.add('burn'); later(() => { $('.rg-mult').classList.remove('burn'); updateBar(); }, 900); }
      else updateBar();
    }
    $('.rg-next').disabled = false;
    animate('reveal', 450);
    if (st.round % ART_EVERY === 0) later(showArtifact, 500);
  }

  function showArtifact() {
    const tot = ORDER.reduce((a, k) => a + st.stats[k].total, 0), okn = ORDER.reduce((a, k) => a + st.stats[k].ok, 0);
    const per = ORDER.map(k => `${REG[k].icon} ${REG[k].name}: ${st.stats[k].ok}/${st.stats[k].total}`).join(' · ');
    const weakest = ORDER.filter(k => st.stats[k].total).sort((a, b) => st.stats[a].ok / st.stats[a].total - st.stats[b].ok / st.stats[b].total)[0];
    const acc = Math.round(okn / tot * 100);
    const el = $('.rg-art'); el.hidden = false;
    el.innerHTML = `<b>Итог ${tot} раундов.</b> Точность ${acc}%, лучшая серия ${st.best}, очков ${st.score}.
      ${weakest ? `Слабее всего читается «${REG[weakest].name}» — помни: ${REG[weakest].rule}.` : ''}
      <code>Читаю режим: ${okn} из ${tot} (${acc}%) · лучшая серия ${st.best} · ${per}</code>
      <div class="m">Артефакт для профиля: выдели строку и сохрани. Множитель ×16 даётся не за угадывание, а за пять подряд объяснённых структур.</div>`;
  }

  /* ---------- события ---------- */
  $$('.rg-opt').forEach(b => b.addEventListener('click', () => answer(b.dataset.k)));
  $('.rg-next').addEventListener('click', newRound);
  $('.rg-lvl').addEventListener('change', e => { st.level = e.target.value; if (!st.answered) st.round--; newRound(); });
  $('.rg-reset').addEventListener('click', () => {
    st.baseSeed = Date.now() | 0; st.round = 0; st.score = 0; st.streak = 0; st.best = 0; st.prev = []; st.misses = 0;
    ORDER.forEach(k => st.stats[k] = { ok: 0, total: 0 });
    $('.rg-hint').hidden = true; newRound();
  });
  box._expResize = draw; window.addEventListener('resize', box._expResize);

  newRound();
};
