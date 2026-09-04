/*
 * W-31 · widget_p0_l5 · 0.5 «Поток сделок → свеча»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что каждая точка графика — реальная сделка, а столбик объёма — сколько монет сменило владельцев за период.
 *   Задание: довести до 5 запечатанных минут (10 сделок = 1 минута) и нажать на столбик объёма той минуты, где прошло больше всего монет.
 *   Ага: переключатель «Как в приложении» — 50 точек-сделок на глазах схлопываются в 5 точек закрытий; клик по точке показывает, что «внутри» прячутся 10 сделок и четыре числа (первая/макс/мин/последняя) — мост к свече 0.7 и тренажёру 0.8.
 *   Дефолты: BTC ≈ 95 000 $ (цена из урока 0.9), шаг цены 10 $, 10 сделок в минуте, окно 6 минут, старт 10:00:00.
 *   Артефакт: {widget, seed, periods, trades, maxVolPeriod, maxVol, correctFirstTry} + чип в статусной строке.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p0_l5'] = function(box){
  /* ---------- 0. чистим прошлый запуск ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };

  /* ---------- утилиты ---------- */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const cssVar = (n, fb)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || fb; };
  const C = {
    acc: cssVar('--acc2','#06b6d4'), ok: cssVar('--ok','#22c55e'), bad: cssVar('--bad','#ef4444'),
    warn: cssVar('--warn','#eab308'), txt: cssVar('--txt','#eef1ff'), mut: cssVar('--mut','#9aa3c7'),
    line: cssVar('--line','rgba(154,163,199,.25)')
  };
  const fmt  = n => Math.round(n).toLocaleString('ru-RU');
  const fmtQ = q => q.toFixed(2).replace('.', ',');
  const clock = s => { const h = 10 + Math.floor(s/3600), m = Math.floor(s/60)%60; return `${h}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; };
  const clockMin = s => clock(s).slice(0,5);

  /* ---------- константы канона ---------- */
  const PER = 10;      // сделок в одной минуте
  const VIS = 6;       // минут на экране
  const QUIZ_AT = 5;   // после скольких запечатанных минут — задание
  const TICK = 10;     // шаг цены, $
  const BASE = 95000;  // цена BTC из урока 0.9
  const TASK0 = 'Задание: жми «+1 сделка» и смотри, как из точек растёт линия. Доведи до 5 запечатанных минут — появится вопрос про объём.';

  /* ---------- разметка ---------- */
  box.innerHTML = `
  <style>
    .xw5{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}
    .xw5 *{box-sizing:border-box}
    .xw5 [hidden]{display:none!important}
    .xw5-head{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}
    .xw5-head b{font-size:16px}
    .xw5-goal{color:var(--mut,#9aa3c7);font-size:13px}
    .xw5-task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:8px 0;border-radius:0 8px 8px 0;background:rgba(6,182,212,.08);font-size:13px}
    .xw5-task.quiz{border-color:var(--warn,#eab308);background:rgba(234,179,8,.10)}
    .xw5-task.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.10)}
    .xw5-task.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.10)}
    .xw5-body{display:flex;gap:12px;flex-wrap:wrap}
    .xw5-chart{flex:1 1 300px;min-width:0}
    .xw5-chart canvas{display:block;width:100%;border-radius:10px;background:rgba(255,255,255,.02);cursor:default}
    .xw5-chart canvas.pick{cursor:pointer}
    .xw5-tape{flex:0 0 168px;font:12px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    @media (max-width:560px){ .xw5-tape{flex:1 1 100%} }
    .xw5-tape-h{color:var(--mut,#9aa3c7);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;display:flex;justify-content:space-between}
    .xw5-row{display:grid;grid-template-columns:54px 1fr 50px;gap:6px;padding:3px 6px;border-radius:6px;color:var(--mut,#9aa3c7)}
    .xw5-row.new{animation:xw5in .35s ease-out;background:rgba(6,182,212,.14);color:var(--txt,#eef1ff)}
    @keyframes xw5in{from{transform:translateX(14px);opacity:0}to{transform:none;opacity:1}}
    .xw5-row .b{color:var(--ok,#22c55e)} .xw5-row .s{color:var(--bad,#ef4444)}
    .xw5-empty{color:var(--mut,#9aa3c7);padding:8px 6px;font-size:12px}
    .xw5-ctrl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .xw5 button{cursor:pointer;border:1px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.12);color:var(--txt,#eef1ff);border-radius:8px;padding:8px 12px;font:13px system-ui,sans-serif}
    .xw5 button.ghost{border-color:var(--line,rgba(154,163,199,.25));background:transparent;color:var(--mut,#9aa3c7)}
    .xw5 button.on{background:rgba(6,182,212,.28)}
    .xw5 button:disabled{opacity:.4;cursor:default}
    .xw5-stat{margin-top:8px;color:var(--mut,#9aa3c7);font-size:12px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .xw5-chip{border:1px solid var(--ok,#22c55e);color:var(--ok,#22c55e);border-radius:999px;padding:1px 8px}
    .xw5-panel{margin-top:10px;border:1px solid var(--line,rgba(154,163,199,.25));border-radius:10px;padding:10px 12px;font-size:13px;background:rgba(255,255,255,.02)}
    .xw5-panel h4{margin:0 0 6px;font-size:14px}
    .xw5-p-grid{display:flex;gap:12px;align-items:flex-start}
    .xw5-p-grid svg{flex:0 0 60px}
    .xw5-note{color:var(--mut,#9aa3c7);margin-top:6px}
    .xw5-panel table{width:100%;border-collapse:collapse;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:8px;color:var(--mut,#9aa3c7)}
    .xw5-panel td{padding:2px 4px;border-top:1px solid var(--line,rgba(154,163,199,.25))}
    .xw5-panel td.hl{color:var(--txt,#eef1ff)}
  </style>
  <div class="xw5">
    <div class="xw5-head">
      <b>График вырастает из сделок</b>
      <span class="xw5-goal">Цель: увидеть, что каждая точка графика — реальная сделка, а столбик снизу — сколько монет сменило владельцев за минуту.</span>
    </div>
    <div class="xw5-task" data-el="task"></div>
    <div class="xw5-body">
      <div class="xw5-chart"><canvas></canvas></div>
      <div class="xw5-tape">
        <div class="xw5-tape-h"><span>Лента сделок</span><span data-el="clock">10:00:00</span></div>
        <div data-el="tape"></div>
      </div>
    </div>
    <div class="xw5-ctrl">
      <button data-a="one">+1 сделка</button>
      <button data-a="ten">+10 = запечатать минуту</button>
      <button data-a="auto">Авто ▶</button>
      <button data-a="mode" class="ghost">Как в приложении</button>
      <button data-a="new" class="ghost">Новый раунд</button>
    </div>
    <div class="xw5-stat" data-el="stat"></div>
    <div class="xw5-panel" data-el="panel" hidden></div>
  </div>`;

  const $ = sel => box.querySelector(sel);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const elTask = $('[data-el=task]'), elTape = $('[data-el=tape]'), elClock = $('[data-el=clock]');
  const elStat = $('[data-el=stat]'), elPanel = $('[data-el=panel]');
  const btn = { one: $('[data-a=one]'), ten: $('[data-a=ten]'), auto: $('[data-a=auto]'), mode: $('[data-a=mode]'), new: $('[data-a=new]') };

  /* ---------- состояние ---------- */
  const S = {};

  function setTask(text, cls){ elTask.textContent = text; elTask.className = 'xw5-task' + (cls ? ' ' + cls : ''); }

  function reset(seed){
    stopAuto();
    S.seed = seed; S.rnd = mulberry32(seed);
    S.price = BASE - 200 + Math.round(S.rnd()*40)*TICK;
    S.dir = 1; S.t = 0;
    S.trades = []; S.periods = [];
    S.mode = 0; S.modeT = 0;              // 0 — все сделки, 1 — точки закрытий
    S.flash = null; S.quiz = null; S.locked = false; S.busy = false;
    S.dispVol = {}; S.bars = []; S.dots = [];
    S.artifact = null;
    elPanel.hidden = true; elPanel.innerHTML = '';
    btn.mode.classList.remove('on'); btn.mode.textContent = 'Как в приложении';
    setTask(TASK0);
    renderTape(); renderStat(); syncButtons();
  }

  /* ---------- генерация сделок ---------- */
  function nextTrade(){
    if(S.locked) return false;
    let cur = S.periods[S.periods.length - 1];
    if(!cur || cur.sealed){
      cur = { i: S.periods.length, o: null, h: -Infinity, l: Infinity, c: null, vol: 0, trades: [], sealed: false, t0: S.t };
      S.periods.push(cur);
    }
    if(S.rnd() > 0.6) S.dir = -S.dir;                       // лёгкая инерция направления
    const jump = Math.round(S.rnd()*S.rnd()*22) * TICK;      // 0–220 $, чаще мелкие
    S.price = Math.max(50000, S.price + S.dir*jump);
    S.t += 3 + Math.floor(S.rnd()*7);                         // 3–9 секунд между сделками
    const q = 0.02 + S.rnd()*S.rnd()*1.4;                     // 0.02–1.42 BTC, чаще мелкие
    const side = S.rnd() < 0.75 ? (S.dir > 0 ? 'buy' : 'sell') : (S.dir > 0 ? 'sell' : 'buy');
    const tr = { p: S.price, q, side, t: S.t, per: cur.i, j: cur.trades.length };
    S.trades.push(tr); cur.trades.push(tr);
    if(cur.o === null) cur.o = tr.p;
    cur.h = Math.max(cur.h, tr.p); cur.l = Math.min(cur.l, tr.p); cur.c = tr.p; cur.vol += q;
    if(cur.trades.length >= PER){
      cur.sealed = true; cur.t1 = S.t;
      S.flash = { at: performance.now(), per: cur.i };
      const sealed = S.periods.filter(p => p.sealed).length;
      if(sealed === QUIZ_AT && !S.quiz) later(startQuiz, 700);
    }
    renderTape(); renderStat();
    return true;
  }

  function addMany(n){
    if(S.busy || S.locked) return;
    S.busy = true; syncButtons();
    let k = 0;
    const step = ()=>{
      if(k < n && nextTrade()){ k++; later(step, 70); }
      else { S.busy = false; syncButtons(); }
    };
    step();
  }

  function startAuto(){
    if(S.auto || S.locked) return;
    S.auto = later(()=>{ if(!nextTrade()) stopAuto(); }, 260, true);
    btn.auto.textContent = 'Пауза ⏸'; btn.auto.classList.add('on');
  }
  function stopAuto(){
    if(S.auto){ clearInterval(S.auto); S.auto = null; }
    btn.auto.textContent = 'Авто ▶'; btn.auto.classList.remove('on');
  }
  function syncButtons(){
    const dis = S.locked || S.busy;
    btn.one.disabled = dis; btn.ten.disabled = dis; btn.auto.disabled = S.locked;
    cv.classList.toggle('pick', !!(S.quiz && !S.quiz.answered) || S.modeT > 0.5);
  }

  /* ---------- задание про объём ---------- */
  function startQuiz(){
    stopAuto(); S.locked = true;
    let best = null;
    S.periods.slice(0, QUIZ_AT).forEach(p => { if(!best || p.vol > best.vol) best = p; });
    S.quiz = { answered: false, target: best.i, tries: 0 };
    setTask('❓ Задание: нажми на столбик объёма той минуты, где сменило владельцев больше всего монет. (Подсказка: объём — это монеты, а не размах цены.)', 'quiz');
    syncButtons();
  }

  function answerQuiz(perIdx){
    const q = S.quiz; if(!q || q.answered) return;
    q.tries++;
    const ok = perIdx === q.target;
    const tp = S.periods[q.target], pp = S.periods[perIdx];
    if(!ok && q.tries < 2){
      setTask(`✗ Минута ${clockMin(pp.t0)}: ${fmtQ(pp.vol)} BTC. Есть столбик выше — попробуй ещё раз. Смотри на высоту столбца, а не на то, как сильно прыгала линия цены.`, 'bad');
      q.picked = perIdx; return;
    }
    q.answered = true; q.picked = perIdx; S.locked = false; syncButtons();
    const moveT = tp.c - tp.o;
    const swingMax = S.periods.slice(0, QUIZ_AT).reduce((a, p) => (p.h - p.l) > (a.h - a.l) ? p : a);
    setTask(ok
      ? `✓ Верно: минута ${clockMin(tp.t0)} — ${fmtQ(tp.vol)} BTC, самый высокий столбик.`
      : `✗ Правильный ответ — минута ${clockMin(tp.t0)} (${fmtQ(tp.vol)} BTC). Ты выбрал ${clockMin(pp.t0)} (${fmtQ(pp.vol)} BTC).`, ok ? 'ok' : 'bad');
    elPanel.hidden = false;
    elPanel.innerHTML = `
      <h4>Что показал столбик объёма</h4>
      <div>За минуту ${clockMin(tp.t0)} через рынок прошло <b>${fmtQ(tp.vol)} BTC</b> в ${tp.trades.length} сделках — больше, чем в любой другой из первых пяти минут.
      Цена за эту минуту сдвинулась на <b>${moveT >= 0 ? '+' : '−'}${fmt(Math.abs(moveT))} $</b>.</div>
      <div class="xw5-note">Высота столбца зависит только от количества монет в сделках, а не от размаха цены.
      ${swingMax.i !== tp.i ? `Самый большой размах цены был в минуту ${clockMin(swingMax.t0)} (${fmt(swingMax.h - swingMax.l)} $), но монет там прошло меньше: ${fmtQ(swingMax.vol)} BTC.` : 'В этом раунде большой объём совпал с большим размахом — так бывает, но не всегда.'}
      Движение на высоком объёме — реальный интерес участников; движение на низком объёме — чаще случайность нескольких заявок. В уроке 0.6 это назовут «рост с объёмом».</div>
      <div class="xw5-note">Теперь нажми «Как в приложении» и кликни по любой точке — увидишь, что она прячет внутри.</div>`;
    emitArtifact({ widget: 'widget_p0_l5', seed: S.seed, periods: QUIZ_AT, trades: S.trades.length,
      maxVolPeriod: clockMin(tp.t0), maxVol: +tp.vol.toFixed(2), correctFirstTry: ok && q.tries === 1 });
  }

  /* ---------- «внутри точки» ---------- */
  function showInside(p){
    const rng = Math.max(p.h - p.l, 1);
    const y = v => 8 + (p.h - v)/rng * 84;                    // SVG 60×100
    const green = p.c >= p.o;
    const col = green ? C.ok : C.bad;
    const bodyTop = Math.min(y(p.o), y(p.c)), bodyH = Math.max(Math.abs(y(p.o) - y(p.c)), 2);
    elPanel.hidden = false;
    elPanel.innerHTML = `
      <h4>Внутри точки «${clockMin(p.t0)}» — ${p.trades.length} сделок${p.sealed ? '' : ' (минута ещё идёт)'}</h4>
      <div class="xw5-p-grid">
        <svg viewBox="0 0 60 100" width="60" height="100" aria-hidden="true">
          <line x1="30" y1="${y(p.h)}" x2="30" y2="${y(p.l)}" stroke="${col}" stroke-width="2"/>
          <rect x="16" y="${bodyTop}" width="28" height="${bodyH}" rx="2" fill="${col}" opacity=".9"/>
          <text x="58" y="${y(p.h)+4}" font-size="8" fill="${C.mut}" text-anchor="end">макс</text>
          <text x="58" y="${y(p.l)+4}" font-size="8" fill="${C.mut}" text-anchor="end">мин</text>
        </svg>
        <div>
          Точка на «гладком» графике хранит только <b>последнюю цену минуты — ${fmt(p.c)} $</b>. Остальные ${p.trades.length - 1} сделок она прячет.
          <div class="xw5-note">Четыре числа, которые терять жалко: первая сделка <b>${fmt(p.o)}</b> · самая дорогая <b>${fmt(p.h)}</b> · самая дешёвая <b>${fmt(p.l)}</b> · последняя <b>${fmt(p.c)}</b>. Объём: ${fmtQ(p.vol)} BTC.</div>
          <div class="xw5-note">Слева — эти четыре числа, упакованные в один значок. В уроке 0.7 его назовут <b>японской свечой</b>, а в уроке 0.8 ты будешь читать такие свечи на тренажёре.</div>
        </div>
      </div>
      <table>${p.trades.map(t => `<tr><td>${clock(t.t)}</td><td class="${t.p === p.h || t.p === p.l ? 'hl' : ''}">${fmt(t.p)} $${t.p === p.h ? ' ← макс' : t.p === p.l ? ' ← мин' : ''}</td><td>${fmtQ(t.q)} BTC</td></tr>`).join('')}</table>`;
  }

  /* ---------- артефакт ---------- */
  function emitArtifact(a){
    S.artifact = a;
    box.dataset.artifact = JSON.stringify(a);
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: a }));
    renderStat();
  }

  /* ---------- HTML-части ---------- */
  function renderTape(){
    const rows = S.trades.slice(-8).reverse();
    elClock.textContent = clock(S.t);
    if(!rows.length){ elTape.innerHTML = '<div class="xw5-empty">Пока ни одной сделки. Нажми «+1 сделка».</div>'; return; }
    elTape.innerHTML = rows.map((t, k) =>
      `<div class="xw5-row${k === 0 ? ' new' : ''}"><span>${clock(t.t)}</span><span class="${t.side === 'buy' ? 'b' : 's'}">${fmt(t.p)}</span><span>${fmtQ(t.q)}</span></div>`).join('');
  }
  function renderStat(){
    const sealed = S.periods.filter(p => p.sealed).length;
    const cur = S.periods[S.periods.length - 1];
    const curVol = cur && !cur.sealed ? cur.vol : 0;
    elStat.innerHTML =
      `<span>сделок: ${S.trades.length}</span><span>минут запечатано: ${sealed}</span>` +
      `<span>цена: ${S.trades.length ? fmt(S.price) + ' $' : '—'}</span>` +
      `<span>объём текущей минуты: ${fmtQ(curVol)} BTC</span>` +
      (S.artifact ? `<span class="xw5-chip">артефакт: макс. объём ${S.artifact.maxVol} BTC в ${S.artifact.maxVolPeriod}</span>` : '');
  }

  /* ---------- канвас ---------- */
  function fit(){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, cv.parentNode.clientWidth || 320);
    const h = Math.max(250, Math.min(370, Math.round(w * 0.62)));
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
    cv.style.height = h + 'px';
  }

  function draw(now){
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width/dpr, H = cv.height/dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padL = 58, padR = 14, top = 26, bottom = 16;
    const volH = Math.round(H*0.20), gap = 22;
    const chartY0 = top, chartH = H - top - volH - gap - bottom;
    const volY1 = H - bottom, volY0 = volY1 - volH;
    const plotW = W - padL - padR, slotW = plotW / VIS;
    const start = Math.max(0, S.periods.length - VIS);
    const vis = S.periods.slice(start);

    // диапазон цен
    let lo = Infinity, hi = -Infinity;
    vis.forEach(p => p.trades.forEach(t => { lo = Math.min(lo, t.p); hi = Math.max(hi, t.p); }));
    if(!isFinite(lo)){ lo = S.price - 200; hi = S.price + 200; }
    if(hi - lo < 200){ const m = (hi + lo)/2; lo = m - 100; hi = m + 100; }
    const pad = (hi - lo)*0.15; lo -= pad; hi += pad;
    const yOf = p => chartY0 + (hi - p)/(hi - lo)*chartH;
    const slotX = i => padL + (i - start)*slotW;
    const xCenter = i => slotX(i) + slotW/2;
    const xTrade = t => slotX(t.per) + (t.j + 0.5)/PER*slotW;

    // оси
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.fillStyle = C.mut; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [hi - pad, (hi + lo)/2, lo + pad].forEach(v => {
      const y = yOf(v);
      ctx.fillText(fmt(v), padL - 8, y);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.save(); ctx.translate(14, chartY0 + chartH/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.fillStyle = C.mut; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('цена, $ ↑', 0, 0); ctx.restore();
    ctx.textAlign = 'right'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('время →', W - padR, H - 4);
    ctx.textAlign = 'left'; ctx.fillText('объём, BTC', padL, volY0 - 8);

    // фон минут + подписи
    vis.forEach(p => {
      ctx.fillStyle = p.i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0)';
      ctx.fillRect(slotX(p.i), chartY0, slotW, chartH + gap + volH);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(slotX(p.i), chartY0); ctx.lineTo(slotX(p.i), volY1); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = C.mut; ctx.fillText(clockMin(p.t0), xCenter(p.i), H - 6);
      ctx.fillStyle = p.sealed ? C.ok : C.acc;
      ctx.fillText(p.sealed ? '✓ запечатана' : `идёт · ${p.trades.length}/${PER}`, xCenter(p.i), chartY0 - 10);
    });

    // объём
    let maxVol = 0.5; vis.forEach(p => maxVol = Math.max(maxVol, p.vol));
    S.bars = [];
    const quizOpen = S.quiz && !S.quiz.answered;
    const pulse = 0.5 + 0.5*Math.sin(now/280);
    vis.forEach(p => {
      const d = S.dispVol[p.i] || 0; S.dispVol[p.i] = d + (p.vol - d)*0.2;
      const h = S.dispVol[p.i]/maxVol*(volH - 16);
      const bw = slotW*0.56, x = xCenter(p.i) - bw/2, y = volY1 - h;
      let col = C.acc, alpha = 0.7;
      if(S.quiz && S.quiz.answered){
        if(p.i === S.quiz.target){ col = C.ok; alpha = 0.95; }
        else if(p.i === S.quiz.picked){ col = C.bad; alpha = 0.9; }
      } else if(quizOpen && p.i < QUIZ_AT){ alpha = 0.55 + 0.35*pulse; }
      ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fillRect(x, y, bw, h); ctx.globalAlpha = 1;
      if(quizOpen && p.i < QUIZ_AT){ ctx.strokeStyle = C.warn; ctx.lineWidth = 1.5; ctx.strokeRect(x - 2, volY0, bw + 4, volH); }
      if(p.vol > 0){ ctx.fillStyle = C.txt; ctx.textAlign = 'center'; ctx.font = '10px ui-monospace, monospace'; ctx.fillText(fmtQ(p.vol), xCenter(p.i), Math.min(y - 7, volY1 - 8)); }
      S.bars.push({ x: x - 4, y: volY0, w: bw + 8, h: volH, per: p.i });
    });

    // сделки: положение интерполируется к точке закрытия своей минуты
    const mt = S.modeT;
    const pts = [];
    vis.forEach(p => p.trades.forEach(t => {
      const x0 = xTrade(t), y0 = yOf(t.p), x1 = xCenter(p.i), y1 = yOf(p.c);
      pts.push({ x: x0 + (x1 - x0)*mt, y: y0 + (y1 - y0)*mt, t });
    }));
    if(pts.length > 1 && mt < 0.999){
      ctx.globalAlpha = 1 - mt*0.9; ctx.strokeStyle = C.acc; ctx.lineWidth = 1.5;
      ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    pts.forEach(q => { ctx.globalAlpha = 1 - mt*0.92; ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // линия закрытий («как в приложении»)
    S.dots = [];
    if(mt > 0.01 && vis.length){
      const cl = vis.map(p => ({ x: xCenter(p.i), y: yOf(p.c), p }));
      ctx.globalAlpha = mt; ctx.strokeStyle = C.acc; ctx.lineWidth = 2.5;
      ctx.beginPath();
      cl.forEach((q, k) => {
        if(!k){ ctx.moveTo(q.x, q.y); return; }
        if(!q.p.sealed){ ctx.stroke(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cl[k-1].x, cl[k-1].y); }
        ctx.lineTo(q.x, q.y);
      });
      ctx.stroke(); ctx.setLineDash([]);
      cl.forEach(q => {
        ctx.fillStyle = q.p.sealed ? C.txt : C.acc; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.stroke();
        S.dots.push({ x: q.x, y: q.y, p: q.p });
      });
      ctx.globalAlpha = 1;
      if(mt > 0.98){
        ctx.fillStyle = C.mut; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`каждая точка = ${PER} сделок внутри · кликни по точке`, padL + 4, chartY0 + chartH - 6);
      }
    }

    // текущая цена: свечение + пунктир
    const last = S.trades[S.trades.length - 1];
    if(last){
      const lp = pts[pts.length - 1];
      const g = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 10 + 7*pulse);
      g.addColorStop(0, 'rgba(6,182,212,0.55)'); g.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lp.x, lp.y, 10 + 7*pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.txt; ctx.beginPath(); ctx.arc(lp.x, lp.y, 4, 0, Math.PI*2); ctx.fill();
      const y = yOf(last.p);
      ctx.strokeStyle = C.acc; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.acc; ctx.textAlign = 'right'; ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.fillText(fmt(last.p), padL - 8, y);
    }

    // вспышка запечатывания
    if(S.flash){
      const dt = (now - S.flash.at)/900;
      if(dt > 1) S.flash = null;
      else {
        const p = S.periods[S.flash.per];
        if(p.i >= start){
          const x = xCenter(p.i), y = yOf(p.c);
          ctx.globalAlpha = 1 - dt; ctx.strokeStyle = C.ok; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 6 + 26*dt, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle = C.ok; ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText('минута запечатана: 10 сделок → 1 точка', x, Math.max(chartY0 + 14, y - 18 - 10*dt));
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function loop(now){
    const target = S.mode;
    if(Math.abs(target - S.modeT) > 0.004) S.modeT += (target - S.modeT)*0.12; else S.modeT = target;
    draw(now);
    box._expRaf = requestAnimationFrame(loop);
  }

  /* ---------- события ---------- */
  btn.one.addEventListener('click', ()=> nextTrade());
  btn.ten.addEventListener('click', ()=> addMany(PER - (S.periods.length && !S.periods[S.periods.length-1].sealed ? S.periods[S.periods.length-1].trades.length : 0) || PER));
  btn.auto.addEventListener('click', ()=> S.auto ? stopAuto() : startAuto());
  btn.mode.addEventListener('click', ()=>{
    S.mode = 1 - S.mode;
    btn.mode.classList.toggle('on', S.mode === 1);
    btn.mode.textContent = S.mode ? 'Показать все сделки' : 'Как в приложении';
    if(S.mode && !S.quiz) setTask('Смотри: точки-сделки схлопнулись в одну точку на минуту — так рисует линию любое биржевое приложение. Кликни по точке, чтобы увидеть, что она прячет.');
    else if(!S.mode && !S.quiz) setTask(TASK0);
    syncButtons();
  });
  btn.new.addEventListener('click', ()=> reset((Date.now() & 0xffff) || 1));
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if(S.quiz && !S.quiz.answered){
      const b = S.bars.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if(b && b.per < QUIZ_AT) answerQuiz(b.per);
      return;
    }
    if(S.modeT > 0.5){
      const d = S.dots.find(d => Math.hypot(d.x - x, d.y - y) < 14);
      if(d) showInside(d.p);
    }
  });
  box._expResize = fit;
  window.addEventListener('resize', fit);

  /* ---------- старт ---------- */
  fit();
  reset(42);
  box._expRaf = requestAnimationFrame(loop);
};
