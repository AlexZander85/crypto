/*
 * W-38 · widget_p0_l18 · 0.18 «Калькулятор разорения»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l18'] = function (box) {
  /* ── 0. чистим прошлый запуск ── */
  if (box._expTimers) box._expTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
  if (box._expRaf) cancelAnimationFrame(box._expRaf);
  if (box._expResize) window.removeEventListener('resize', box._expResize);
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ── канон ── */
  const STAKES = [1, 2, 5, 10, 25], PER = 20, RUIN = 0.10, M = 600;
  const COLORS = ['#22c55e', '#06b6d4', '#eab308', '#f97316', '#ef4444'];
  const S = { p: 0.486, N: 200, seed: 42, round: 0, cap: [], ruinedAt: [], expect: [], med: [], running: false, done: false };
  let rnd = mulberry32(S.seed);
  const fmtP = (n, d) => n.toFixed(d == null ? 1 : d).replace('.', ',');

  box.innerHTML = `
<style>
.xw18{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#1f2440);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font-size:14px;line-height:1.45;max-width:100%;box-sizing:border-box}
.xw18 *{box-sizing:border-box}
.xw18 h4{margin:0 0 4px;font-size:15px}
.xw18 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
.xw18 .task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:0 0 10px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
.xw18 .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.xw18 .sl{flex:1 1 200px;font-size:13px}
.xw18 .sl b{font-family:var(--mono,ui-monospace,monospace)}
.xw18 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:4px 0 0}
.xw18 button{background:#111631;color:var(--txt,#eef1ff);border:1px solid var(--line,#2a3155);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px}
.xw18 .chips button{padding:5px 9px;font-size:12px}
.xw18 button.pri{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4)}
.xw18 button:disabled{opacity:.4;cursor:default}
.xw18 canvas{width:100%;display:block;border-radius:8px;background:#070a18;margin-top:10px}
.xw18 .prog{font-size:12px;color:var(--mut,#9aa3c7);font-family:var(--mono,ui-monospace,monospace)}
.xw18 .tbl{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
.xw18 .tbl th,.xw18 .tbl td{padding:4px 6px;border-bottom:1px solid var(--line,#1f2440);text-align:left;font-family:var(--mono,ui-monospace,monospace)}
.xw18 .tbl th{color:var(--mut,#9aa3c7);font-weight:500;font-family:inherit}
.xw18 .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
.xw18 .small{font-size:11px;margin-top:4px}
.xw18 .msg{margin-top:10px;padding:8px 10px;border-radius:8px;font-size:13px;background:rgba(255,255,255,.03)}
.xw18 .msg:empty{display:none}
.xw18 .ok{color:var(--ok,#22c55e)} .xw18 .bad{color:var(--bad,#ef4444)} .xw18 .warn{color:var(--warn,#eab308)} .xw18 .mut{color:var(--mut,#9aa3c7)}
.xw18 .art{margin-top:8px;font-size:11px;color:var(--mut,#9aa3c7);font-family:var(--mono,ui-monospace,monospace);word-break:break-word}
</style>
<div class="xw18">
  <h4>Калькулятор разорения: 100 игроков, 5 размеров ставки</h4>
  <div class="goal">Цель: увидеть, что банкротство определяет размер ставки, а не процент выигрышей.</div>
  <div class="task"><b>Задание.</b> 1) Запусти рулетку (48,6% — красное/чёрное с зеро): у всех 100 одинаковый шанс, разный только размер ставки. Кто доживёт до последнего раунда? 2) Поставь 55% — теперь преимущество на твоей стороне — и найди ставку, которая всё равно разоряет большинство.</div>
  <div class="row chips"><span class="mut">Пресеты:</span><button data-p="48.6">Рулетка 48,6%</button><button data-p="50">Монетка 50%</button><button data-p="55">Эдж 55%</button></div>
  <div class="row">
    <div class="sl"><div>Шанс выигрыша ставки: <b class="pv">48,6%</b></div><input type="range" class="p-in" min="40" max="60" step="0.5" value="48.6"></div>
    <div class="sl"><div>Раундов: <b class="nv">200</b></div><input type="range" class="n-in" min="50" max="500" step="50" value="200"></div>
  </div>
  <div class="row">
    <button class="pri b-run">Запустить 100 игроков ▶</button>
    <button class="b-new">Новый раунд ⟳</button>
    <span class="prog"></span>
  </div>
  <div class="mut small">Разорение = потеря 90% банка (чтобы вернуться, нужно +900% — урок 0.12). Выплата 1:1.</div>
  <canvas class="cv"></canvas>
  <table class="tbl"><thead><tr><th>Ставка</th><th>Выжили</th><th>Медиана итога</th><th>Ожидание разорения*</th></tr></thead><tbody></tbody></table>
  <div class="mut small">* по 600 игрокам на каждую ставку с тем же шансом и числом раундов</div>
  <div class="msg aha"></div>
  <div class="art"></div>
</div>`;

  const q = s => box.querySelector(s);
  const cv = q('.cv'), ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const LO = Math.log10(0.05), HI = Math.log10(4);
  let L = null;

  /* ── модель ── */
  function init() {
    rnd = mulberry32(S.seed); S.round = 0; S.done = false; S.med = [];
    S.cap = STAKES.map(() => Array.from({ length: PER }, () => [1]));
    S.ruinedAt = STAKES.map(() => Array(PER).fill(-1));
  }
  function step() {
    S.round++;
    for (let g = 0; g < 5; g++) {
      const f = STAKES[g] / 100;
      for (let k = 0; k < PER; k++) {
        if (S.ruinedAt[g][k] >= 0) continue;
        const h = S.cap[g][k], c = h[h.length - 1];
        const nc = rnd() < S.p ? c * (1 + f) : c * (1 - f);
        h.push(nc); if (nc <= RUIN) S.ruinedAt[g][k] = S.round;
      }
    }
  }
  /* ожидание по 600 игрокам — отдельный поток случайности, не трогает основной seed */
  function expected() {
    const r = mulberry32((S.seed ^ 0x9e3779b9) | 0);
    return STAKES.map(st => {
      const f = st / 100; let ruined = 0; const fin = [];
      for (let k = 0; k < M; k++) {
        let c = 1, dead = false;
        for (let i = 0; i < S.N; i++) { c = r() < S.p ? c * (1 + f) : c * (1 - f); if (c <= RUIN) { dead = true; break; } }
        if (dead) ruined++; fin.push(dead ? RUIN : c);
      }
      fin.sort((a, b) => a - b);
      return { ruin: ruined / M, med: fin[M >> 1] };
    });
  }
  const ruinedCount = g => S.ruinedAt[g].filter(x => x >= 0 && x <= S.round).length;

  /* ── сцена ── */
  function fit() {
    const w = Math.max(300, cv.clientWidth || (box.clientWidth - 30));
    const cols = w < 520 ? 2 : 5, rows = Math.ceil(5 / cols), gap = 8;
    const pw = (w - gap * (cols - 1)) / cols, ph = cols === 2 ? 104 : 124;
    const top = rows * (ph + gap), chartH = 140;
    L = { w, h: top + chartH, cols, gap, pw, ph, top };
    cv.width = Math.round(L.w * dpr); cv.height = Math.round(L.h * dpr); cv.style.height = L.h + 'px';
    draw();
  }
  function draw() {
    if (!L) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, L.w, L.h);
    ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;

    // панели траекторий (лог-шкала)
    for (let g = 0; g < 5; g++) {
      const col = g % L.cols, row = Math.floor(g / L.cols);
      const x0 = col * (L.pw + L.gap), y0 = row * (L.ph + L.gap), x1 = x0 + L.pw, py0 = y0 + 18, py1 = y0 + L.ph - 4;
      ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x0, y0, L.pw, L.ph);
      const yOf = c => py1 - (Math.max(LO, Math.min(HI, Math.log10(Math.max(c, 1e-6)))) - LO) / (HI - LO) * (py1 - py0);
      const xOf = i => x0 + 4 + i / S.N * (L.pw - 8);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(238,241,255,.35)'; ctx.beginPath(); ctx.moveTo(x0, yOf(1)); ctx.lineTo(x1, yOf(1)); ctx.stroke();
      ctx.strokeStyle = 'rgba(239,68,68,.6)'; ctx.beginPath(); ctx.moveTo(x0, yOf(RUIN)); ctx.lineTo(x1, yOf(RUIN)); ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < PER; k++) {
        const hist = S.cap[g][k], ra = S.ruinedAt[g][k], dead = ra >= 0 && ra <= S.round;
        const end = Math.min(hist.length - 1, S.round);
        if (end < 1) continue;
        ctx.strokeStyle = dead ? 'rgba(154,163,199,.25)' : COLORS[g]; ctx.globalAlpha = dead ? 1 : 0.55;
        ctx.beginPath(); ctx.moveTo(xOf(0), yOf(hist[0]));
        for (let i = 1; i <= end; i++) ctx.lineTo(xOf(i), yOf(hist[i]));
        ctx.stroke();
        if (dead) { ctx.globalAlpha = 1; ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(xOf(ra), yOf(RUIN), 2.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      const rc = ruinedCount(g);
      ctx.fillStyle = COLORS[g]; ctx.textAlign = 'left'; ctx.fillText('ставка ' + STAKES[g] + '%', x0 + 5, y0 + 9);
      ctx.fillStyle = rc ? '#ef4444' : 'rgba(238,241,255,.85)'; ctx.textAlign = 'right'; ctx.fillText('разорены ' + rc + '/' + PER, x1 - 5, y0 + 9);
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(154,163,199,.7)'; ctx.fillText('×1', x0 + 4, yOf(1) - 7);
      ctx.fillStyle = 'rgba(239,68,68,.8)'; ctx.fillText('−90%', x0 + 4, yOf(RUIN) - 7);
    }
    // легенда в пустой ячейке (2-колоночный режим)
    if (L.cols === 2) {
      const x0 = L.pw + L.gap, y0 = 2 * (L.ph + L.gap);
      ctx.fillStyle = 'rgba(154,163,199,.85)'; ctx.textAlign = 'left';
      ['100 игроков, по 20 на ставку', 'шкала логарифмическая', 'пунктир ×1 — стартовый банк', 'красный пунктир — разорение', 'раунд ' + S.round + ' / ' + S.N]
        .forEach((t, i) => ctx.fillText(t, x0 + 6, y0 + 12 + i * 15));
    }
    if (S.round === 0) {
      ctx.fillStyle = 'rgba(238,241,255,.7)'; ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('нажми «Запустить 100 игроков»', L.w / 2, L.top / 2); ctx.font = '11px system-ui, sans-serif';
    }

    // кривая банкротства
    const cy0 = L.top + 22, cy1 = L.h - 18, ax0 = 32, sw = (L.w - ax0) / 5;
    ctx.fillStyle = 'rgba(238,241,255,.85)'; ctx.textAlign = 'left';
    ctx.fillText(`Кривая банкротства (N=${S.N}, шанс ${fmtP(S.p * 100)}%)`, 2, L.top + 8);
    for (let v = 0; v <= 1; v += 0.5) {
      const y = cy1 - v * (cy1 - cy0);
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(ax0, y); ctx.lineTo(L.w, y); ctx.stroke();
      ctx.fillStyle = 'rgba(154,163,199,.8)'; ctx.textAlign = 'right'; ctx.fillText(Math.round(v * 100) + '%', ax0 - 4, y);
    }
    for (let g = 0; g < 5; g++) {
      const cx = ax0 + (g + 0.5) * sw, bw = Math.min(40, sw * 0.45);
      const frac = ruinedCount(g) / PER, hb = frac * (cy1 - cy0);
      ctx.fillStyle = COLORS[g]; ctx.globalAlpha = 0.55; ctx.fillRect(cx - bw / 2, cy1 - hb, bw, hb); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(154,163,199,.9)'; ctx.textAlign = 'center'; ctx.fillText(STAKES[g] + '%', cx, cy1 + 9);
      if (frac > 0) { ctx.fillStyle = 'rgba(238,241,255,.9)'; ctx.fillText(Math.round(frac * 100) + '%', cx, cy1 - hb - 8); }
    }
    ctx.strokeStyle = 'rgba(238,241,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath();
    S.expect.forEach((e, g) => { const cx = ax0 + (g + 0.5) * sw, y = cy1 - e.ruin * (cy1 - cy0); g ? ctx.lineTo(cx, y) : ctx.moveTo(cx, y); });
    ctx.stroke(); ctx.lineWidth = 1;
    S.expect.forEach((e, g) => { const cx = ax0 + (g + 0.5) * sw, y = cy1 - e.ruin * (cy1 - cy0); ctx.fillStyle = '#eef1ff'; ctx.beginPath(); ctx.arc(cx, y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(238,241,255,.7)'; ctx.textAlign = 'right'; ctx.fillText('— ожидание по 600 игроков', L.w - 4, cy0 + 6);
  }

  /* ── запуск ── */
  function run() {
    if (S.running) return;
    init(); S.running = true; q('.aha').innerHTML = ''; setUI(); fillTable();
    const per = Math.max(1, Math.round(S.N / 200));
    const loop = () => {
      for (let i = 0; i < per && S.round < S.N; i++) step();
      q('.prog').textContent = 'раунд ' + S.round + ' / ' + S.N;
      draw();
      if (S.round < S.N) box._expRaf = requestAnimationFrame(loop); else finish();
    };
    box._expRaf = requestAnimationFrame(loop);
  }
  function finish() {
    S.running = false; S.done = true;
    S.med = S.cap.map(gr => { const f = gr.map(h => h[h.length - 1]).sort((a, b) => a - b); return (f[PER / 2 - 1] + f[PER / 2]) / 2; });
    fillTable(); setUI(); aha(); saveArtifact();
  }
  function fillTable() {
    q('tbody').innerHTML = STAKES.map((st, g) => {
      const rc = S.ruinedAt[g].filter(x => x >= 0).length;
      return `<tr><td><span class="dot" style="background:${COLORS[g]}"></span>${st}%</td>` +
             `<td class="${rc ? 'bad' : 'ok'}">${PER - rc}/${PER}</td>` +
             `<td>${S.done ? '×' + fmtP(S.med[g], 2) : '—'}</td>` +
             `<td>${Math.round(S.expect[g].ruin * 100)}%</td></tr>`;
    }).join('');
  }
  function aha() {
    const surv = g => S.ruinedAt[g].filter(x => x < 0).length, pc = fmtP(S.p * 100), out = [];
    if (S.p <= 0.5 && surv(0) >= 16 && surv(4) <= 8)
      out.push(`<span class="ok">Ага №1 ✓</span> Шанс выигрыша был одинаковый у всех — ${pc}%. Отличался только размер ставки: при 1% дожили ${surv(0)}/20, при 25% — ${surv(4)}/20. Разоряет не винрейт, а размер.`);
    if (S.p >= 0.55 && surv(4) <= 12) {
      const kelly = 2 * S.p - 1;
      out.push(`<span class="ok">Ага №2 ✓</span> Даже с преимуществом ${pc}% ставка 25% разорила ${PER - surv(4)} из 20. Критерий Келли для такого шанса: f* = 2p − 1 = ${fmtP(kelly * 100, 0)}% (урок М47). 25% — это ×${fmtP(0.25 / kelly, 1)} Келли: там рост капитала уже отрицательный, хотя матожидание каждой ставки положительное.`);
    }
    if (S.p < 0.5 && S.med[0] < 1)
      out.push(`<span class="warn">Заметь:</span> при отрицательном матожидании маленькая ставка не спасает — медиана игрока с 1% всё равно ×${fmtP(S.med[0], 2)}. Размер защищает от быстрой смерти, положительное матожидание — от медленного истощения (урок 0.18).`);
    if (S.p >= 0.5 && S.p < 0.55 && surv(4) <= 10)
      out.push(`<span class="warn">Заметь:</span> монетка без преимущества (${pc}%) — а ставка 25% всё равно разорила ${PER - surv(4)}/20: разброс размера убивает раньше, чем матожидание успевает проявиться.`);
    q('.aha').innerHTML = out.join('<br><br>') || `<span class="mut">Сравни столбики с белой линией ожидания — и попробуй пресет «Эдж 55%».</span>`;
  }
  function setUI() {
    q('.pv').textContent = fmtP(S.p * 100) + '%'; q('.nv').textContent = S.N;
    q('.p-in').disabled = S.running; q('.n-in').disabled = S.running;
    q('.b-run').disabled = S.running; q('.b-new').disabled = S.running;
    box.querySelectorAll('.chips button').forEach(b => { b.disabled = S.running; });
    if (!S.running && !S.done) q('.prog').textContent = '';
  }
  function saveArtifact() {
    const surv = STAKES.map((s, g) => S.ruinedAt[g].filter(x => x < 0).length);
    const a = { widget: 'widget_p0_l18', p: S.p, rounds: S.N, seed: S.seed, survivors: surv,
                medians: S.med.map(m => +m.toFixed(3)), expectedRuin: S.expect.map(e => +e.ruin.toFixed(3)) };
    box._artifact = a;
    q('.art').textContent = `Артефакт: p=${fmtP(S.p * 100)}% · N=${S.N} · seed ${S.seed} · выжили: ` + STAKES.map((s, g) => s + '%→' + surv[g]).join(', ');
    if (typeof window.EXPERT_ARTIFACT === 'function') window.EXPERT_ARTIFACT(a.widget, a);
  }

  /* ── пересчёт ожидания с дебаунсом (не дёргаем 600×5×N на каждый пиксель ползунка) ── */
  let debounce = null;
  function recompute() {
    if (debounce) clearTimeout(debounce);
    debounce = later(() => { S.expect = expected(); init(); fillTable(); setUI(); draw(); }, 120);
  }
  function setP(v) { S.p = v / 100; q('.p-in').value = v; q('.pv').textContent = fmtP(v) + '%'; recompute(); }

  q('.p-in').addEventListener('input', e => { if (!S.running) setP(+e.target.value); });
  q('.n-in').addEventListener('input', e => { if (!S.running) { S.N = +e.target.value; q('.nv').textContent = S.N; recompute(); } });
  box.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => { if (!S.running) setP(+b.dataset.p); }));
  q('.b-run').addEventListener('click', run);
  q('.b-new').addEventListener('click', () => { if (S.running) return; S.seed = Date.now() & 0x7fffffff; S.expect = expected(); run(); });
  box._expResize = fit; window.addEventListener('resize', fit);

  S.expect = expected(); init(); fillTable(); setUI(); fit(); saveArtifact();
};
