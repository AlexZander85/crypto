/*
 * W-11 · widget_m_kelly_criterion · М47 «Критерий Келли»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что перебор доли ставки — это не «меньше прибыли», а исчезновение капитала: при f > 2f* траектории ныряют за порог −99% и не возвращаются.
 *   Задание: ползунком 0→3× Келли найти наибольшую долю, при которой из 200 траекторий не разоряется ни одна и медиана ещё растёт; затем сдвинуть на 3× и увидеть, куда делись линии.
 *   Ага: те же 300 исходов (та же удача!) — но при 3× Келли веер сжимается к нулю, счётчик «разорилось» растёт на глазах; полный Келли даёт максимум g = +0,50%, но медианная просадка 70–90% «высоковероятна», не «гарантирована» (подпись канона на сцене).
 *   Дефолты: p = 55%, выплата 1:1, f* = 10%, 300 сделок, 200 траекторий, seed 42, порог разорения ×0.01.
 *   Артефакт: {k, f, g_per_trade, ruined, median_final, median_maxdd, seed} по кнопке «Зафиксировать».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_kelly_criterion'] = function (box) {
  const L = window.__EXP_LIB__;
  if (!L) { box.textContent = 'Не подключён общий блок §0 (__EXP_LIB__)'; return; }
  L.ensureCss();
  const { later, raf, stopRaf, observe } = L.setupBox(box);
  const C = L.colors();

  // ---- канон урока М47 ----
  const P = 0.55, B = 1, N = 300, M = 200, RUIN = 0.01, LOG_RUIN = Math.log10(RUIN);
  const F_STAR = (B * P - (1 - P)) / B;                                   // 0.10
  const g = f => f >= 1 ? -Infinity : P * Math.log(1 + B * f) + (1 - P) * Math.log(1 - f);
  const G_MAX = g(F_STAR);                                                // ≈ +0.0050

  let seed = 42, k = 1, outcomes = null, res = null;
  let shown = N, animT0 = 0, ruinSeen = false;

  box.innerHTML = `
  <div class="xw">
    <p class="xw-goal"><b>Цель:</b> увидеть, что перебор доли ставки — не «меньше прибыли», а исчезновение капитала.
      Стратегия честная: p = 55%, выплата 1:1 → полный Келли <span class="xw-mono">f* = 10%</span> (урок М47).</p>
    <div class="xw-task">🎯 <b>Задание.</b> Найди ползунком самую большую долю, при которой из 200 траекторий
      не разоряется ни одна, а медиана ещё растёт. Потом сдвинь на 3× Келли и посмотри, куда делись линии.</div>
    <div class="xw-row">
      <span class="xw-lbl">Доля ставки:</span>
      <input class="xw-range" type="range" min="0" max="3" step="0.05" value="1" data-r="k" aria-label="доля ставки в единицах Келли">
      <span class="xw-mono" data-t="kval"></span>
    </div>
    <div class="xw-row">
      <button class="xw-btn" data-k="0.25">¼ Келли</button>
      <button class="xw-btn" data-k="0.5">½ Келли</button>
      <button class="xw-btn" data-k="1">1× Келли</button>
      <button class="xw-btn" data-k="2">2×</button>
      <button class="xw-btn" data-k="3">3×</button>
      <span style="flex:1 1 auto"></span>
      <button class="xw-btn" data-b="replay">▶ Прожить заново</button>
      <button class="xw-btn" data-b="new">🎲 Новый раунд</button>
    </div>
    <canvas data-c="fan" style="height:280px" aria-label="веер из 200 траекторий капитала"></canvas>
    <canvas data-c="g" style="height:132px;margin-top:8px" aria-label="кривая роста g(f)"></canvas>
    <div class="xw-stats">
      <div class="xw-stat"><div class="k">f, доля капитала</div><div class="v" data-t="f"></div></div>
      <div class="xw-stat"><div class="k">g(f) за сделку</div><div class="v" data-t="g"></div></div>
      <div class="xw-stat" data-t="ruinBox"><div class="k">Разорилось</div><div class="v" data-t="ruin"></div></div>
      <div class="xw-stat"><div class="k">Медиана итога</div><div class="v" data-t="med"></div></div>
      <div class="xw-stat"><div class="k">Медианная макс. просадка</div><div class="v" data-t="dd"></div></div>
      <div class="xw-stat"><div class="k">Выше старта</div><div class="v" data-t="up"></div></div>
    </div>
    <div class="xw-aha neutral" data-t="aha"></div>
    <div class="xw-row" style="margin-top:10px">
      <button class="xw-btn" data-b="save">💾 Зафиксировать результат</button>
      <span class="xw-note" data-t="saved"></span>
      <span style="flex:1 1 auto"></span>
      <span class="xw-pill">раунд #<span data-t="seed"></span></span>
    </div>
    <div class="xw-note">Все 200 траекторий проживают <b>одну и ту же</b> последовательность выигрышей и проигрышей —
      меняется только размер ставки. Порог разорения ×0.01 (−99%): формально ноль недостижим, практически депозит уничтожен.</div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cvFan = $('[data-c="fan"]'), cvG = $('[data-c="g"]'), aha = $('[data-t="aha"]'), slider = $('[data-r="k"]');

  // ---- модель ----
  function genOutcomes() {                       // одна и та же «удача» для всех значений k
    const rnd = L.mulberry32(seed);
    outcomes = new Uint8Array(M * N);
    for (let i = 0; i < M * N; i++) outcomes[i] = rnd() < P ? 1 : 0;
  }
  function simulate() {
    const f = k * F_STAR, stride = N + 1;
    const logs = new Float32Array(M * stride), ruinedAt = new Int16Array(M).fill(-1);
    const finals = new Float64Array(M), dd = new Float64Array(M);
    const up = Math.log10(1 + B * f), dn = f > 0 ? Math.log10(1 - f) : 0;
    let yMax = 0.5;
    for (let i = 0; i < M; i++) {
      let c = 0, peak = 0, worst = 0, dead = false;
      for (let t = 1; t <= N; t++) {
        if (!dead) {
          c += outcomes[i * N + t - 1] ? up : dn;
          if (c > peak) peak = c;
          const d = 1 - Math.pow(10, c - peak); if (d > worst) worst = d;
          if (c <= LOG_RUIN) { dead = true; ruinedAt[i] = t; c = LOG_RUIN; worst = 1 - RUIN; }
        }
        logs[i * stride + t] = c;
      }
      finals[i] = c; dd[i] = worst; if (c > yMax) yMax = c;
    }
    const med = new Float32Array(stride), ruinCum = new Int16Array(stride), tmp = new Array(M);
    for (let t = 0; t <= N; t++) {
      for (let i = 0; i < M; i++) tmp[i] = logs[i * stride + t];
      const s = tmp.slice().sort((a, b) => a - b);
      med[t] = (s[M / 2 - 1] + s[M / 2]) / 2;
      let r = 0; for (let i = 0; i < M; i++) if (ruinedAt[i] >= 0 && ruinedAt[i] <= t) r++;
      ruinCum[t] = r;
    }
    const ddS = Array.from(dd).sort((a, b) => a - b);
    res = {
      logs, ruinedAt, finals, med, ruinCum, stride,
      yMax: Math.min(3, Math.max(0.5, Math.ceil(yMax * 2) / 2)),
      medDD: L.quantile(ddS, 0.5), maxDD: ddS[M - 1],
      upShare: Array.from(finals).filter(v => v > 0).length / M
    };
  }

  // ---- сцена 1: веер ----
  function drawFan() {
    if (!res) return;
    const { ctx, w, h } = L.fitCanvas(cvFan); ctx.clearRect(0, 0, w, h);
    const pl = 46, pr = 12, pt = 16, pb = 24, yMin = LOG_RUIN - 0.15, yMax = res.yMax;
    const X = t => pl + (w - pl - pr) * t / N;
    const Y = v => pt + (h - pt - pb) * (1 - (Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin));
    // сетка (лог-шкала)
    ctx.strokeStyle = C.line; ctx.fillStyle = C.mut; ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let e = -2; e <= Math.floor(yMax); e++) {
      const y = Y(e); ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke();
      ctx.fillText('×' + (e < 0 ? Math.pow(10, e).toString() : Math.pow(10, e)), pl - 4, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let t = 0; t <= N; t += 100) ctx.fillText(t ? t : 'сделка 0', X(t), h - pb + 6);
    // траектории
    const s = Math.round(shown), st = res.stride;
    ctx.lineWidth = 1;
    for (let i = 0; i < M; i++) {
      const ra = res.ruinedAt[i], dead = ra >= 0, end = dead ? Math.min(s, ra) : s;
      ctx.globalAlpha = dead ? 0.6 : 0.28; ctx.strokeStyle = dead ? C.bad : C.mut;
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (let t = 1; t <= end; t++) ctx.lineTo(X(t), Y(res.logs[i * st + t]));
      ctx.stroke();
      if (dead && ra <= s) {                      // крестик в точке разорения
        ctx.globalAlpha = 0.9; const x = X(ra), y = Y(LOG_RUIN);
        ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // медиана
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let t = 1; t <= s; t++) ctx.lineTo(X(t), Y(res.med[t]));
    ctx.stroke();
    // линии старта и разорения
    ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.strokeStyle = C.mut; ctx.beginPath(); ctx.moveTo(pl, Y(0)); ctx.lineTo(w - pr, Y(0)); ctx.stroke();
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(pl, Y(LOG_RUIN)); ctx.lineTo(w - pr, Y(LOG_RUIN)); ctx.stroke();
    ctx.restore();
    L.tag(ctx, '−99% · разорение', w - pr - 4, Y(LOG_RUIN) - 9, C.bad, 'right');
    L.tag(ctx, 'капитал, × от старта (лог-шкала) · голубая — медиана', pl + 2, pt - 6, C.mut, 'left');
    const r = res.ruinCum[s];
    if (r > 0) L.tag(ctx, `разорилось: ${r} / ${M}`, w - pr - 4, pt + 4, C.bad, 'right');
  }

  // ---- сцена 2: кривая g(f) ----
  function drawG() {
    const { ctx, w, h } = L.fitCanvas(cvG); ctx.clearRect(0, 0, w, h);
    const pl = 46, pr = 12, pt = 22, pb = 20, fMax = 0.35, gMin = g(fMax), gTop = G_MAX * 1.4;
    const X = f => pl + (w - pl - pr) * f / fMax, Y = v => pt + (h - pt - pb) * (1 - (v - gMin) / (gTop - gMin));
    ctx.fillStyle = 'rgba(239,68,68,0.10)'; ctx.fillRect(pl, Y(0), w - pl - pr, Y(gMin) - Y(0));
    ctx.fillStyle = 'rgba(34,197,94,0.08)'; ctx.fillRect(pl, pt, w - pl - pr, Y(0) - pt);
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(pl, Y(0)); ctx.lineTo(w - pr, Y(0)); ctx.stroke();
    ctx.fillStyle = C.mut; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('0', pl - 4, Y(0)); ctx.fillText(L.sgn(G_MAX * 100, 2) + '%', pl - 4, Y(G_MAX)); ctx.fillText(L.sgn(gMin * 100, 1) + '%', pl - 4, Y(gMin));
    [[1, 'f* = 10%'], [2, '2f* = 20% → g ≈ 0'], [3, '3f* = 30%']].forEach(([m, lbl]) => {
      L.vline(ctx, X(m * F_STAR), pt, h - pb, C.mut, [2, 3]);
      L.tag(ctx, lbl, X(m * F_STAR), h - pb + 10, C.mut, m === 3 ? 'right' : 'center');
    });
    ctx.strokeStyle = C.txt; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 140; i++) { const f = fMax * i / 140, y = Y(g(f)); i ? ctx.lineTo(X(f), y) : ctx.moveTo(X(f), y); }
    ctx.stroke();
    const f = k * F_STAR, gf = g(f);
    ctx.fillStyle = gf >= 0 ? C.ok : C.bad; ctx.beginPath(); ctx.arc(X(f), Y(gf), 5, 0, Math.PI * 2); ctx.fill();
    L.tag(ctx, `g = ${L.sgn(gf * 100, 2)}%/сделку при f = ${(f * 100).toFixed(1)}%`, X(f) + 8, Y(gf) - 12, gf >= 0 ? C.ok : C.bad, f > 0.2 ? 'right' : 'left');
    L.tag(ctx, 'рост за сделку g(f) = p·ln(1+bf) + (1−p)·ln(1−f)', pl + 2, 8, C.mut, 'left');
  }

  // ---- цифры и вердикт ----
  function updStats() {
    const s = Math.round(shown), f = k * F_STAR, gf = g(f), r = res.ruinCum[s];
    $('[data-t="f"]').textContent = (f * 100).toFixed(1) + '%';
    $('[data-t="g"]').textContent = L.sgn(gf * 100, 2) + '%';
    const rb = $('[data-t="ruin"]'); rb.textContent = `${r} / ${M}`; rb.style.color = r ? C.bad : C.ok;
    if (r > 0 && !ruinSeen) { ruinSeen = true; L.pulse($('[data-t="ruinBox"]'), 'xw-shake'); }
    $('[data-t="med"]').textContent = '×' + Math.pow(10, res.med[s]).toFixed(2);
    $('[data-t="dd"]').textContent = '−' + L.pct(res.medDD);
    $('[data-t="up"]').textContent = L.pct(res.upShare);
    $('[data-t="kval"]').textContent = `${k.toFixed(2)}× Келли`;
  }
  function setAha() {
    const f = k * F_STAR, gf = g(f), r = res.ruinCum[N], medFinal = Math.pow(10, res.med[N]);
    let cls = 'neutral', txt = '';
    if (k === 0) { txt = 'Доля 0 — капитал не растёт, но и не рискует. Преимущество стратегии не используется вовсе.'; }
    else if (k < 0.95) {
      cls = 'ok';
      txt = `Дробный Келли (${k.toFixed(2)}×, f = ${(f * 100).toFixed(1)}%): рост ${(gf / G_MAX * 100).toFixed(0)}% от максимума,
        медианная просадка −${L.pct(res.medDD)}, медиана итога ×${medFinal.toFixed(2)}, разорений: ${r}.
        Недобор до f* почти бесплатен — это и есть запас на ошибку в оценке p.`;
    } else if (k <= 1.05) {
      cls = 'warn';
      txt = `Полный Келли: максимум роста g = +${(gf * 100).toFixed(2)}%/сделку, медиана итога ×${medFinal.toFixed(2)} — но медианная максимальная
        просадка −${L.pct(res.medDD)}, у худших траекторий до −${L.pct(res.maxDD)}. Просадки 70–90% здесь <b>высоковероятны</b>,
        а не «гарантированы»: формула ничего не знает ни о твоих нервах, ни об ошибке в p.`;
    } else if (k < 2) {
      cls = 'warn';
      txt = `Перебор (${k.toFixed(2)}× Келли): рост упал до ${Math.max(0, gf / G_MAX * 100).toFixed(0)}% от максимума, а просадки выросли до −${L.pct(res.medDD)}.
        Та же серия выигрышей и проигрышей — а платишь за неё больше. Разорений: ${r}.`;
    } else {
      cls = 'bad';
      txt = `g(f) = ${L.sgn(gf * 100, 2)}%/сделку ≤ 0 при <b>плюсовом EV</b>: капитал в среднем тает. ${r} из ${M} траекторий пересекли порог −99%
        и уже не вернутся — это не «меньше прибыли», это исчезновение. Правило М47: перебор за 2f* наказывает сильнее, чем недобор.`;
    }
    aha.className = 'xw-aha ' + cls; aha.innerHTML = txt;
  }

  // ---- анимация «проживаем 300 сделок» ----
  function play() {
    stopRaf(); shown = 0; ruinSeen = false; animT0 = performance.now();
    aha.className = 'xw-aha neutral'; aha.textContent = '▶ проживаем 300 сделок…';
    const step = now => {
      const u = Math.min(1, (now - animT0) / 1500); shown = N * (1 - Math.pow(1 - u, 2));
      drawFan(); updStats();
      if (u < 1) raf(step); else { shown = N; drawFan(); updStats(); setAha(); }
    };
    raf(step);
  }
  function rerun() { simulate(); drawG(); play(); }

  // ---- события ----
  slider.addEventListener('input', () => { k = parseFloat(slider.value); $('[data-t="kval"]').textContent = `${k.toFixed(2)}× Келли`; rerun(); });
  box.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { k = parseFloat(b.dataset.k); slider.value = k; rerun(); }));
  $('[data-b="replay"]').addEventListener('click', play);
  $('[data-b="new"]').addEventListener('click', () => { seed = (Date.now() >>> 0); $('[data-t="seed"]').textContent = seed; genOutcomes(); rerun(); });
  $('[data-b="save"]').addEventListener('click', () => {
    const data = { k, f: k * F_STAR, g_per_trade: g(k * F_STAR), ruined: res.ruinCum[N], of: M,
      median_final: Math.pow(10, res.med[N]), median_maxdd: res.medDD, seed };
    L.artifact(box, 'widget_m_kelly_criterion', data);
    $('[data-t="saved"]').textContent = `сохранено: ${k.toFixed(2)}× Келли, разорений ${data.ruined}/${M}, медиана ×${data.median_final.toFixed(2)}`;
    later(() => { $('[data-t="saved"]').textContent = ''; }, 6000);
  });
  observe(() => { drawFan(); drawG(); });

  // ---- старт ----
  $('[data-t="seed"]').textContent = seed;
  genOutcomes(); simulate(); drawG(); play();
};
