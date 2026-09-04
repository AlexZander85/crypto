/*
 * W-37 · widget_p0_l16 · 0.16 «Ликвидационный коридор»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l16'] = function (box) {
  /* ── 0. чистим прошлый запуск ── */
  if (box._expTimers) box._expTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
  if (box._expRaf) cancelAnimationFrame(box._expRaf);
  if (box._expResize) window.removeEventListener('resize', box._expResize);
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const stopTimers = () => { box._expTimers.forEach(t => { clearTimeout(t); clearInterval(t); }); box._expTimers = []; };

  /* ── seeded RNG ── */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  let seed = 42, rnd = mulberry32(seed);
  const gauss = () => { const u = Math.max(rnd(), 1e-9), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ── канон урока 0.16 ── */
  const DEPOSIT = 1000, ENTRY = 100000, MMR = 0.005, BAND = 5, YMAX = 12, CRASH = 15;
  const S = { lev: 20, path: [0], hour: 0, liqHour: -1, running: false, fast: false, queue: 0, dead: false,
              days: 0, streak: 0, liqs: 0, lost: 0, pnl: 0, aha1: false, aha2: false };
  const liqPct   = () => (1 / S.lev - MMR) * 100;                 // падение цены до ликвидации (лонг)
  const liqPrice = () => ENTRY * (1 - 1 / S.lev + MMR);
  const fmt$ = n => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('ru-RU');
  const fmtP = (n, d) => n.toFixed(d == null ? 1 : d).replace('.', ',');
  const equity = h => (S.liqHour >= 0 && h >= S.liqHour) ? 0 : DEPOSIT * (1 + S.lev * S.path[h] / 100);

  box.innerHTML = `
<style>
.xw16{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#1f2440);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font-size:14px;line-height:1.45;max-width:100%;box-sizing:border-box}
.xw16 *{box-sizing:border-box}
.xw16 h4{margin:0 0 4px;font-size:15px}
.xw16 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
.xw16 .task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:0 0 12px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
.xw16 canvas{width:100%;display:block;border-radius:8px;background:#070a18}
.xw16 .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
.xw16 .lev{flex:1 1 220px}
.xw16 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:4px 0 0}
.xw16 .kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px 12px;margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
.xw16 .kv b{display:block;font-family:var(--mono,ui-monospace,Menlo,monospace);font-weight:600;font-size:14px;color:var(--txt,#eef1ff)}
.xw16 button{background:#111631;color:var(--txt,#eef1ff);border:1px solid var(--line,#2a3155);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px}
.xw16 button.pri{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4)}
.xw16 button:disabled{opacity:.4;cursor:default}
.xw16 .msg{margin-top:10px;padding:8px 10px;border-radius:8px;font-size:13px;background:rgba(255,255,255,.03)}
.xw16 .msg:empty{display:none}
.xw16 .ok{color:var(--ok,#22c55e)} .xw16 .bad{color:var(--bad,#ef4444)} .xw16 .warn{color:var(--warn,#eab308)} .xw16 .mut{color:var(--mut,#9aa3c7)}
.xw16 .kv b.ok{color:var(--ok,#22c55e)} .xw16 .kv b.bad{color:var(--bad,#ef4444)} .xw16 .kv b.warn{color:var(--warn,#eab308)}
.xw16 .art{margin-top:8px;font-size:11px;color:var(--mut,#9aa3c7);font-family:var(--mono,ui-monospace,monospace);word-break:break-word}
</style>
<div class="xw16">
  <h4>Ликвидационный коридор: плечо против обычного дня</h4>
  <div class="goal">Цель: увидеть, что при ×20 обычное дневное движение крипты (3–5%) сжигает весь депозит.</div>
  <div class="task"><b>Задание.</b> 1) Двигай плечо и смотри, когда красная линия ликвидации заходит в жёлтую полосу «обычный день». 2) Проживи 30 дней при ×20. 3) Найди плечо, при котором 30 дней проходят без ликвидации, — и прочитай, что скажет курс.</div>
  <canvas class="cv"></canvas>
  <div class="row">
    <div class="lev"><div>Плечо: <b class="levv">×20</b> <span class="mut">(×1 … ×50)</span></div><input type="range" class="lev-in" min="1" max="50" step="1" value="20"></div>
  </div>
  <div class="kv">
    <div>Депозит на день<b>$1 000</b></div>
    <div>Размер позиции<b class="pos"></b></div>
    <div>Цена входа<b>$100 000</b></div>
    <div>Цена ликвидации<b class="liq"></b></div>
    <div>Запас до ликвидации<b class="gap"></b></div>
  </div>
  <div class="row">
    <button class="pri b-day">Прожить день ▶</button>
    <button class="b-30">30 дней ▶▶</button>
    <button class="b-top" style="display:none">Пополнить $1 000 и продолжить</button>
    <button class="b-new">Новый раунд ⟳</button>
  </div>
  <div class="kv">
    <div>Дней прожито<b class="days">0</b></div>
    <div>Подряд на этом плече<b class="streak">0</b></div>
    <div>Ликвидаций<b class="liqs">0</b></div>
    <div>Итог PnL<b class="pnl">$0</b></div>
  </div>
  <div class="msg live"></div>
  <div class="msg aha"></div>
  <div class="art"></div>
</div>`;

  const q = s => box.querySelector(s);
  const cv = q('.cv'), ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let W = 320, H = 260;

  function fit() {
    W = Math.max(300, cv.clientWidth || (box.clientWidth - 30));
    H = W < 420 ? 240 : 280;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
    draw();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const colW = Math.max(56, Math.round(W * 0.18)), padL = 46, padR = 10, padT = 18, padB = 22;
    const cx0 = padL, cx1 = W - colW - padR - 16, cy0 = padT, cy1 = H - padB;
    const yOf = p => cy1 - (Math.max(-YMAX, Math.min(YMAX, p)) + YMAX) / (2 * YMAX) * (cy1 - cy0);
    const xOf = hr => cx0 + hr / 24 * (cx1 - cx0);
    ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;

    // сетка %
    for (let p = -10; p <= 10; p += 5) {
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(cx0, yOf(p)); ctx.lineTo(cx1, yOf(p)); ctx.stroke();
      ctx.fillStyle = 'rgba(154,163,199,.9)'; ctx.textAlign = 'right'; ctx.fillText((p > 0 ? '+' : '') + p + '%', cx0 - 6, yOf(p));
    }
    // полоса обычного дня
    ctx.fillStyle = 'rgba(234,179,8,.10)'; ctx.fillRect(cx0, yOf(BAND), cx1 - cx0, yOf(-BAND) - yOf(BAND));
    ctx.fillStyle = 'rgba(234,179,8,.85)'; ctx.textAlign = 'left'; ctx.fillText('обычный день крипты ±' + BAND + '%', cx0 + 6, yOf(BAND) + 9);
    // вход
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(238,241,255,.5)'; ctx.beginPath(); ctx.moveTo(cx0, yOf(0)); ctx.lineTo(cx1, yOf(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(238,241,255,.7)'; ctx.textAlign = 'right'; ctx.fillText('вход $100 000', cx1 - 4, yOf(0) - 8);
    // линия ликвидации
    const lp = liqPct();
    if (lp <= YMAX) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx0, yOf(-lp)); ctx.lineTo(cx1, yOf(-lp)); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.fillText('ликвидация −' + fmtP(lp) + '%', cx1 - 4, yOf(-lp) + 9);
    } else {
      ctx.fillStyle = 'rgba(239,68,68,.85)'; ctx.textAlign = 'right'; ctx.fillText('ликвидация −' + fmtP(lp) + '% — за экраном ↓', cx1 - 4, cy1 - 8);
    }
    // путь цены за день
    const last = Math.min(S.hour, S.path.length - 1);
    if (last > 0) {
      const p = S.path[last];
      ctx.strokeStyle = p >= 0 ? '#22c55e' : '#f87171'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= last; i++) { const x = xOf(i), y = yOf(S.path[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(xOf(last), yOf(p), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(154,163,199,.8)'; ctx.textAlign = 'left'; ctx.fillText('0 ч', cx0, cy1 + 11); ctx.textAlign = 'right'; ctx.fillText('24 ч', cx1, cy1 + 11);

    // столбец капитала (депозит дня)
    const colX = W - padR - colW, eq = equity(last), scale = 2 * DEPOSIT;
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.strokeRect(colX, cy0, colW, cy1 - cy0);
    const hEq = Math.min(1, eq / scale) * (cy1 - cy0);
    ctx.fillStyle = eq >= DEPOSIT ? 'rgba(34,197,94,.75)' : eq > 0 ? 'rgba(234,179,8,.75)' : 'rgba(239,68,68,.25)';
    ctx.fillRect(colX + 1, cy1 - hEq, colW - 2, hEq);
    const yDep = cy1 - (DEPOSIT / scale) * (cy1 - cy0);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(238,241,255,.5)'; ctx.beginPath(); ctx.moveTo(colX, yDep); ctx.lineTo(colX + colW, yDep); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(238,241,255,.9)'; ctx.textAlign = 'center'; ctx.fillText(fmt$(eq), colX + colW / 2, cy0 - 8);
    ctx.fillStyle = 'rgba(154,163,199,.8)'; ctx.fillText('депозит дня', colX + colW / 2, cy1 + 11);

    // штамп ликвидации
    if (S.liqHour >= 0 && S.hour >= S.liqHour) {
      ctx.fillStyle = 'rgba(239,68,68,.15)'; ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
      const x = xOf(S.liqHour), y = yOf(-lp);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
      ctx.fillText('ЛИКВИДАЦИЯ  −$1 000', (cx0 + cx1) / 2, (cy0 + cy1) / 2);
    }
  }

  /* один торговый день: итог ±(1–5)%, внутри дня — броуновский мост с фитилями */
  function genDay() {
    const r = (rnd() < 0.5 ? -1 : 1) * (1 + 4 * rnd());
    const cum = [0]; let c = 0;
    for (let i = 1; i <= 24; i++) { c += gauss() * 0.7; cum.push(c); }
    const path = cum.map((v, i) => r * i / 24 + (v - cum[24] * i / 24));
    const lp = liqPct(); let liq = -1;
    for (let i = 1; i <= 24; i++) if (path[i] <= -lp) { liq = i; break; }
    S.path = path; S.liqHour = liq; S.hour = 0;
  }
  function startDays(n, fast) {
    if (S.running || S.dead) return;
    S.running = true; S.queue = n; S.fast = fast; setUI();
    if (fast) later(fastTick, 80, true); else { genDay(); later(hourTick, 55, true); }
  }
  function hourTick() {
    S.hour++;
    if (S.liqHour >= 0 && S.hour >= S.liqHour) { S.hour = S.liqHour; return liquidate(); }
    if (S.hour >= 24) { endDay(); S.queue--; if (S.queue > 0) genDay(); else return finish(); }
    draw();
  }
  function fastTick() {
    genDay();
    if (S.liqHour >= 0) { S.hour = S.liqHour; return liquidate(); }
    S.hour = 24; endDay(); S.queue--; draw(); setUI();
    if (S.queue <= 0) finish();
  }
  function endDay() { S.days++; S.streak++; S.pnl += DEPOSIT * S.lev * S.path[24] / 100; checkAha2(); }
  function finish() { stopTimers(); S.running = false; setUI(); draw(); saveArtifact(); }
  function liquidate() {
    stopTimers(); S.running = false; S.dead = true; S.liqs++; S.lost += DEPOSIT; S.pnl -= DEPOSIT; S.streak = 0;
    const lp = liqPct();
    let m = `<span class="bad"><b>Ликвидация на ${S.days + 1}-й день.</b></span> Цена прошла всего −${fmtP(lp)}% — обычное движение — и депозит $1 000 сгорел целиком (−100%). Отыгрывать нечего: позиции больше нет.`;
    if (S.lev >= 20 && !S.aha1) { S.aha1 = true; m += `<br><span class="ok">Ага №1 ✓</span> При ×${S.lev} обычный день убивает. Это не «невезение», а геометрия плеча: ×20 → −5% цены = −100% депозита (урок 0.16).`; }
    q('.aha').innerHTML = m;
    setUI(); draw(); saveArtifact();
  }
  function checkAha2() {
    if (S.aha2 || S.streak < 30 || S.lev < 2) return;
    S.aha2 = true; const lp = liqPct();
    q('.aha').innerHTML = `<span class="ok">Ага №2 ✓</span> При ×${S.lev} ты пережил 30 <i>обычных</i> дней подряд. Но 10 октября 2025 (урок 0.9) цена прошла −${CRASH}% за час: при ×${S.lev} это ` +
      (lp <= CRASH ? `ликвидация — депозит сгорает за один час.` : `−${Math.round(S.lev * CRASH)}% депозита за один час.`) +
      ` Толстые хвосты (урок 1.2) в жёлтую полосу не влезают. Канон курса: в первый год — плечо ×1.`;
  }
  function topup() { S.dead = false; S.path = [0]; S.hour = 0; S.liqHour = -1; q('.aha').innerHTML = ''; setUI(); draw(); }
  function newRound() {
    stopTimers(); seed = Date.now() & 0x7fffffff; rnd = mulberry32(seed);
    Object.assign(S, { path: [0], hour: 0, liqHour: -1, running: false, queue: 0, dead: false, days: 0, streak: 0, liqs: 0, lost: 0, pnl: 0 });
    q('.aha').innerHTML = ''; setUI(); draw(); saveArtifact();
  }

  function setUI() {
    const lp = liqPct();
    q('.levv').textContent = '×' + S.lev;
    q('.pos').textContent = fmt$(DEPOSIT * S.lev);
    q('.liq').textContent = S.lev === 1 ? 'нет (−99,5%)' : fmt$(liqPrice()) + ' (−' + fmtP(lp) + '%)';
    const g = q('.gap'); g.textContent = fmtP(lp) + '%'; g.className = 'gap ' + (lp > BAND ? 'ok' : lp > 3 ? 'warn' : 'bad');
    q('.days').textContent = S.days; q('.streak').textContent = S.streak;
    q('.liqs').textContent = S.liqs + (S.lost ? ' (' + fmt$(-S.lost) + ')' : '');
    const pn = q('.pnl'); pn.textContent = (S.pnl >= 0 ? '+' : '') + fmt$(S.pnl); pn.className = 'pnl ' + (S.pnl >= 0 ? 'ok' : 'bad');
    const busy = S.running || S.dead;
    q('.lev-in').disabled = S.running; q('.b-day').disabled = busy; q('.b-30').disabled = busy; q('.b-new').disabled = S.running;
    q('.b-top').style.display = S.dead ? '' : 'none';
    const live = q('.live');
    if (S.lev === 1) { live.className = 'msg live ok'; live.textContent = '×1: позиция на свои — линии ликвидации не существует. Это канон первого года курса.'; }
    else if (lp <= BAND) { live.className = 'msg live bad'; live.textContent = `Линия ликвидации внутри полосы «обычный день»: −${fmtP(lp)}% для крипты — не событие, а вторник. Одно такое движение — и депозита нет.`; }
    else { live.className = 'msg live warn'; live.textContent = `Обычный день переживаешь. Но −${CRASH}% за час (10.10.2025) при ×${S.lev} = ` + (lp <= CRASH ? 'ликвидация.' : `−${Math.round(S.lev * CRASH)}% депозита.`); }
  }
  function saveArtifact() {
    const a = { widget: 'widget_p0_l16', leverage: S.lev, liqPct: +liqPct().toFixed(2), days: S.days, liquidations: S.liqs, lost: S.lost, pnl: Math.round(S.pnl), seed: seed };
    box._artifact = a;
    q('.art').textContent = `Артефакт: плечо ×${a.leverage} · ликвидация при −${fmtP(a.liqPct)}% · дней прожито ${a.days} · ликвидаций ${a.liquidations} (−$${a.lost.toLocaleString('ru-RU')}) · seed ${a.seed}`;
    if (typeof window.EXPERT_ARTIFACT === 'function') window.EXPERT_ARTIFACT(a.widget, a);
  }

  q('.lev-in').addEventListener('input', e => {
    const v = +e.target.value;
    if (v !== S.lev) { S.lev = v; S.streak = 0; }
    if (!S.running) { S.path = [0]; S.hour = 0; S.liqHour = -1; }
    setUI(); draw();
  });
  q('.b-day').addEventListener('click', () => startDays(1, false));
  q('.b-30').addEventListener('click', () => startDays(30, true));
  q('.b-top').addEventListener('click', topup);
  q('.b-new').addEventListener('click', newRound);
  box._expResize = fit; window.addEventListener('resize', fit);

  setUI(); fit(); saveArtifact();
};
