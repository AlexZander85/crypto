/*
 * W-12 · widget_m_mediana_i_kvantili · М26 «Медиана и квантили»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что среднее и медиана отвечают на разные вопросы: одна сделка-«мем» тащит среднее, а медиана стоит на месте; квантиль — это «сколько процентов сделок левее».
 *   Задание: прикинуть заранее, сколько сделок по +1000 надо добавить к 200, чтобы среднее оказалось выше 90% всех сделок (P90); затем добавлять по одной и следить за оранжевой (среднее) и голубой (медиана) линиями.
 *   Ага: оранжевый маркер уезжает в «хвост» за разрыв оси, голубой почти не шевелится; подпись «N сделок из 20x сдвинули среднее правее 90% всех сделок».
 *   Дефолты: 200 сделок ≈ N(+4, 18) с одним «мемом» +700; ползунок P50; пресет «Пример урока: 2, 3, 5, 7, 100 → медиана 5, среднее 23.4»; seed 7.
 *   Артефакт: {outliers_needed, mean, median, p90, dataset, seed}.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_mediana_i_kvantili'] = function (box) {
  const L = window.__EXP_LIB__;
  if (!L) { box.textContent = 'Не подключён общий блок §0 (__EXP_LIB__)'; return; }
  L.ensureCss();
  const { later, raf, stopRaf, observe } = L.setupBox(box);
  const C = L.colors();

  const LESSON = [2, 3, 5, 7, 100];                 // числа урока М26
  const OUT = 1000;                                  // размер одного выброса
  let seed = 7, mode = 'trades', q = 50, base = [], extra = [], dispMean = null, solvedAt = null;

  box.innerHTML = `
  <div class="xw">
    <p class="xw-goal"><b>Цель:</b> увидеть, что среднее и медиана отвечают на разные вопросы. Внутри 200 сделок спрятан один «мем» +700.
      Квантиль <span class="xw-mono">P<sub>q</sub></span> — это цена, левее которой лежит q% сделок.</p>
    <div class="xw-task">🎯 <b>Задание.</b> Прикинь заранее: сколько сделок по +1000 надо добавить к 200, чтобы среднее стало выше 90% всех сделок (P90)?
      Потом добавляй по одной и следи за двумя линиями: <span style="color:${C.warn}">оранжевая — среднее</span>, <span style="color:${C.acc}">голубая — медиана</span>.</div>
    <div class="xw-row">
      <button class="xw-btn on" data-m="trades">200 сделок</button>
      <button class="xw-btn" data-m="lesson">Пример урока: 2, 3, 5, 7, 100</button>
      <span style="flex:1 1 auto"></span>
      <button class="xw-btn" data-b="new">🎲 Новый раунд</button>
    </div>
    <div class="xw-row">
      <span class="xw-lbl">Квантиль:</span>
      <input class="xw-range" type="range" min="1" max="99" step="1" value="50" data-r="q" aria-label="квантиль в процентах">
      <span class="xw-mono" data-t="qval"></span>
      <button class="xw-btn" data-q="25">P25</button><button class="xw-btn" data-q="50">P50</button>
      <button class="xw-btn" data-q="75">P75</button><button class="xw-btn" data-q="90">P90</button>
    </div>
    <canvas data-c="h" style="height:270px" aria-label="гистограмма результатов сделок"></canvas>
    <div class="xw-row">
      <button class="xw-btn" data-b="add">＋ добавить 1 выброс (+1000)</button>
      <button class="xw-btn" data-b="clear">убрать выбросы</button>
      <span class="xw-pill">выбросов: <span data-t="nout">0</span></span>
    </div>
    <div class="xw-stats">
      <div class="xw-stat"><div class="k">Среднее</div><div class="v" data-t="mean" style="color:${C.warn}"></div></div>
      <div class="xw-stat"><div class="k">Медиана (P50)</div><div class="v" data-t="med" style="color:${C.acc}"></div></div>
      <div class="xw-stat"><div class="k" data-t="qk">P50</div><div class="v" data-t="pq"></div></div>
      <div class="xw-stat"><div class="k">IQR (P75 − P25)</div><div class="v" data-t="iqr"></div></div>
      <div class="xw-stat"><div class="k">Среднее выше, чем у</div><div class="v" data-t="above"></div></div>
      <div class="xw-stat"><div class="k">Сделок всего</div><div class="v" data-t="n"></div></div>
    </div>
    <div class="xw-aha neutral" data-t="aha"></div>
    <div class="xw-row" style="margin-top:10px">
      <button class="xw-btn" data-b="save">💾 Зафиксировать результат</button>
      <span class="xw-note" data-t="saved"></span>
    </div>
    <div class="xw-note">Сделки левее выбранного квантиля подсвечены ярче. Разрыв оси «//» отделяет основную массу от хвоста выбросов — иначе 200 сделок сжались бы в одну полоску.</div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('[data-c="h"]'), aha = $('[data-t="aha"]'), slider = $('[data-r="q"]');

  function gen() {
    const rnd = L.mulberry32(seed); base = [];
    for (let i = 0; i < 199; i++) base.push(Math.round(4 + 18 * L.gauss(rnd)));
    base.push(700);                                    // «мем» внутри выборки
  }
  const data = () => (mode === 'trades' ? base : LESSON).concat(extra);
  function stats(arr) {
    const s = arr.slice().sort((a, b) => a - b), n = s.length;
    const mean = s.reduce((a, b) => a + b, 0) / n;
    return { s, n, mean, med: L.quantile(s, 0.5), p25: L.quantile(s, 0.25), p75: L.quantile(s, 0.75), p90: L.quantile(s, 0.9),
      pq: L.quantile(s, q / 100), above: s.filter(v => v < mean).length / n };
  }

  function draw() {
    const vals = data(), S = stats(vals);
    const { ctx, w, h } = L.fitCanvas(cv); ctx.clearRect(0, 0, w, h);
    const pl = 34, pr = 10, pt = 44, pb = 26, pw = w - pl - pr, ph = h - pt - pb;
    const isL = mode === 'lesson';
    const lo = isL ? 0 : -70, hi = isL ? 110 : 130, bin = isL ? 5 : 10;
    const maxV = Math.max(...vals), hasTail = maxV > hi;
    const tailHi = hasTail ? Math.max(hi + 300, Math.ceil(maxV / 100) * 100 + 100) : hi;
    const bulkW = hasTail ? (pw - 26) * 0.74 : pw, tailX0 = pl + bulkW + 26, tailW = pw - bulkW - 26;
    const X = v => v <= hi ? pl + bulkW * (Math.max(lo, v) - lo) / (hi - lo) : tailX0 + tailW * (v - hi) / (tailHi - hi);

    // корзины основной массы + отдельные столбики хвоста
    const nb = Math.round((hi - lo) / bin), bins = new Array(nb).fill(0), tail = new Map();
    vals.forEach(v => { if (v > hi) tail.set(v, (tail.get(v) || 0) + 1); else bins[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / bin)))]++; });
    const maxC = Math.max(1, ...bins, ...tail.values());
    const Y = c => pt + ph * (1 - c / maxC);
    // сетка
    ctx.strokeStyle = C.line; ctx.fillStyle = C.mut; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const stepC = maxC > 20 ? 10 : maxC > 8 ? 5 : 1;
    for (let c = 0; c <= maxC; c += stepC) { ctx.beginPath(); ctx.moveTo(pl, Y(c)); ctx.lineTo(w - pr, Y(c)); ctx.stroke(); ctx.fillText(c, pl - 4, Y(c)); }
    // столбики
    for (let i = 0; i < nb; i++) {
      const a = lo + i * bin, b = a + bin, x0 = X(a), x1 = X(b), left = (a + b) / 2 <= S.pq;
      ctx.fillStyle = left ? C.acc : C.mut; ctx.globalAlpha = left ? 0.55 : 0.28;
      ctx.fillRect(x0 + 1, Y(bins[i]), Math.max(1, x1 - x0 - 2), ph - (Y(bins[i]) - pt));
    }
    ctx.globalAlpha = 1;
    tail.forEach((c, v) => {
      const x = X(v); ctx.fillStyle = v === 700 ? C.acc : C.warn; ctx.globalAlpha = 0.75;
      ctx.fillRect(x - 4, Y(c), 8, ph - (Y(c) - pt)); ctx.globalAlpha = 1;
      L.tag(ctx, `+${v}${c > 1 ? ' ×' + c : ''}${v === 700 ? ' «мем»' : ''}`, x, Y(c) - 10, v === 700 ? C.acc : C.warn, 'center');
    });
    // подписи оси X
    ctx.fillStyle = C.mut; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = lo; v <= hi; v += isL ? 20 : 50) ctx.fillText(L.sgn(v, 0), X(v), h - pb + 6);
    if (hasTail) {
      ctx.fillText('//', pl + bulkW + 13, h - pb + 6); ctx.fillText('+' + tailHi, w - pr, h - pb + 6);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(pl + bulkW + 13, pt); ctx.lineTo(pl + bulkW + 13, h - pb); ctx.stroke();
    }
    ctx.fillText('результат сделки', pl + pw / 2, h - 12);
    // линии: квантиль, медиана, среднее (анимированное)
    L.vline(ctx, X(S.pq), pt, h - pb, C.txt, [4, 3]);
    L.tag(ctx, `P${q} = ${L.sgn(S.pq, 1)} · ${q}% сделок левее`, X(S.pq) + 6, h - pb - 12, C.txt, X(S.pq) > w * 0.6 ? 'right' : 'left');
    L.vline(ctx, X(S.med), pt, h - pb, C.acc); L.tag(ctx, `медиана ${L.sgn(S.med, 1)}`, X(S.med) + 6, pt - 8, C.acc, X(S.med) > w * 0.6 ? 'right' : 'left');
    const m = dispMean == null ? S.mean : dispMean;
    L.vline(ctx, X(m), pt, h - pb, C.warn);
    ctx.fillStyle = C.warn; ctx.beginPath(); ctx.moveTo(X(m), pt - 2); ctx.lineTo(X(m) - 6, pt - 12); ctx.lineTo(X(m) + 6, pt - 12); ctx.fill();
    L.tag(ctx, `среднее ${L.sgn(m, 1)}`, X(m) + 6, pt - 26, C.warn, X(m) > w * 0.6 ? 'right' : 'left');
    return S;
  }

  function updText(S) {
    const baseS = stats(mode === 'trades' ? base : LESSON);
    $('[data-t="qval"]').textContent = `P${q}`; $('[data-t="qk"]').textContent = `P${q}`;
    $('[data-t="mean"]').textContent = L.sgn(S.mean, 1); $('[data-t="med"]').textContent = L.sgn(S.med, 1);
    $('[data-t="pq"]').textContent = L.sgn(S.pq, 1); $('[data-t="iqr"]').textContent = (S.p75 - S.p25).toFixed(1);
    $('[data-t="above"]').textContent = L.pct(S.above) + ' сделок'; $('[data-t="n"]').textContent = S.n;
    $('[data-t="nout"]').textContent = extra.length;
    const k = extra.length, dMean = S.mean - baseS.mean, dMed = S.med - baseS.med;
    let cls = 'neutral', txt;
    if (mode === 'lesson' && !k) {
      txt = `Числа урока: 2, 3, 5, 7, 100 → медиана 5, среднее 23.4. Одна сделка +100 утащила среднее выше четырёх из пяти результатов. Добавь выброс — и посмотри, кто из двух сдвинется.`;
    } else if (!k) {
      txt = `200 сделок, внутри один «мем» +700. Среднее ${L.sgn(S.mean, 1)}, медиана ${L.sgn(S.med, 1)}, P90 = ${L.sgn(S.p90, 1)}.
        Потяни ползунок квантиля — подсветка показывает, какая доля сделок левее. Потом добавляй выбросы.`;
    } else if (S.mean < S.p90) {
      cls = 'warn';
      txt = `Добавлено ${k} × (+1000): среднее ${L.sgn(baseS.mean, 1)} → <b>${L.sgn(S.mean, 1)}</b> (сдвиг ${L.sgn(dMean, 1)}),
        медиана ${L.sgn(baseS.med, 1)} → ${L.sgn(S.med, 1)} (сдвиг ${L.sgn(dMed, 1)}). Среднее уже выше ${L.pct(S.above)} сделок; до P90 (${L.sgn(S.p90, 1)}) осталось ${(S.p90 - S.mean).toFixed(1)}.`;
    } else {
      cls = 'ok'; if (solvedAt == null) { solvedAt = k; L.pulse(aha); }
      txt = `✅ Ага: <b>${k} сделок из ${S.n}</b> сдвинули среднее правее 90% всех сделок: среднее ${L.sgn(baseS.mean, 1)} → ${L.sgn(S.mean, 1)},
        а медиана всего ${L.sgn(baseS.med, 1)} → ${L.sgn(S.med, 1)}. Отчёт «средняя сделка ${L.sgn(S.mean, 1)}» без медианы — половина правды (М5, М25):
        типичная сделка по-прежнему около ${L.sgn(S.med, 1)}.`;
    }
    aha.className = 'xw-aha ' + cls; aha.innerHTML = txt;
  }

  // плавный «переезд» маркера среднего
  function animateMeanTo(target) {
    stopRaf(); if (dispMean == null) dispMean = target;
    const step = () => {
      const diff = target - dispMean;
      if (Math.abs(diff) < 0.05) { dispMean = target; updText(draw()); return; }
      dispMean += diff * 0.18; draw(); raf(step);
    };
    raf(step);
  }
  function refresh(animate) {
    const S = stats(data());
    if (animate) { animateMeanTo(S.mean); updText(S); } else { dispMean = S.mean; updText(draw()); }
  }

  slider.addEventListener('input', () => { q = parseInt(slider.value, 10); refresh(false); });
  box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { q = parseInt(b.dataset.q, 10); slider.value = q; refresh(false); }));
  box.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m; box.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
    extra = []; solvedAt = null; refresh(false);
  }));
  $('[data-b="add"]').addEventListener('click', () => { if (extra.length < 40) { extra.push(OUT); refresh(true); } });
  $('[data-b="clear"]').addEventListener('click', () => { extra = []; solvedAt = null; refresh(true); });
  $('[data-b="new"]').addEventListener('click', () => { seed = Date.now() >>> 0; gen(); extra = []; solvedAt = null; refresh(false); });
  $('[data-b="save"]').addEventListener('click', () => {
    const S = stats(data());
    const d = { outliers_needed: solvedAt, outliers_now: extra.length, mean: S.mean, median: S.med, p90: S.p90, dataset: mode, seed };
    L.artifact(box, 'widget_m_mediana_i_kvantili', d);
    $('[data-t="saved"]').textContent = solvedAt == null
      ? `сохранено (задание ещё не выполнено): среднее ${L.sgn(S.mean, 1)}, медиана ${L.sgn(S.med, 1)}`
      : `сохранено: ${solvedAt} выбросов хватило, чтобы среднее обогнало P90`;
    later(() => { $('[data-t="saved"]').textContent = ''; }, 6000);
  });
  observe(() => draw());

  gen(); refresh(false);
};
