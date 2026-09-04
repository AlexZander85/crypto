/*
 * W-35 · widget_p0_l13 · 0.13 «Монетный двор»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l13'] = function(box){
  const C = window.EXPERT_COMMON;
  if (!C) { box.innerHTML = '<div style="color:#ef4444">Не загружен exp_common.js</div>'; return; }
  C.ensureStyle();
  const { raf, onResize } = C.lifecycle(box);
  const P = C.palette();
  const NMAX = 10000, STOPS = [10, 100, 1000, 10000];

  // ---- общий движок монетки (его же используют W-01/W-02 матфака) ----
  const ENG = window.EXPERT_ENGINES = window.EXPERT_ENGINES || {};
  ENG.coin = ENG.coin || {
    simulate(seed, p, N){
      const rnd = C.mulberry32(seed);
      const freq = new Float32Array(N + 1), streak = new Uint16Array(N + 1), out = new Uint8Array(N + 1);
      let heads = 0, cur = 0, best = 0, prev = -1;
      for (let m = 1; m <= N; m++){
        const h = rnd() < p ? 1 : 0; out[m] = h; heads += h; freq[m] = heads / m;
        if (h === prev) cur++; else { cur = 1; prev = h; }
        if (cur > best) best = cur; streak[m] = best;
      }
      return { freq, streak, out };
    },
    band(m){ return 1.96 * Math.sqrt(0.25 / m); },           // 95%-коридор честной монеты
    separation(freq, N){                                       // с какого броска ряд «навсегда» вне коридора
      let sep = Infinity;
      for (let m = N; m >= 1; m--){ if (freq[m] > 0.5 + 1.96 * Math.sqrt(0.25 / m)) sep = m; else break; }
      return sep < N ? sep : Infinity;
    }
  };

  // ---- состояние ----
  box._expScore = box._expScore || { g10: [0, 0], g1000: [0, 0] };  // сохраняется между раундами
  let seed = 42, pT = 0.55, coins, sepN, revealed = false;
  let cur = 0, target = 0, animFrom = 0, animT0 = 0, animating = false;
  let guess = { n10: null, n1000: null };
  let size = null;

  // ---- разметка ----
  box.innerHTML = `
  <div class="exp-card">
    <div class="exp-title">Монетный двор: честная монета против монеты трейдера</div>
    <div class="exp-goal">Цель: увидеть, что 55% против 50% не отличить от удачи на 10 бросках — и не спрятать на 10 000.</div>
    <div class="exp-task">Задание: перед тобой две монеты, A и B. Одна честная (50% орлов), вторая — трейдера (сейчас <b class="js-pv2">55%</b>). Угадай, где трейдер, после 10 бросков и после 1000. Потом докрути до 10 000 и найди, с какого броска кривые расходятся навсегда.</div>
    <canvas class="exp-canvas js-cv"></canvas>
    <div class="exp-legend">
      <span><i class="exp-dot js-la" style="background:${P.mut}"></i>монета A</span>
      <span><i class="exp-dot js-lb" style="background:${P.mut};opacity:.55"></i>монета B</span>
      <span><i class="exp-dot" style="background:${P.warn}"></i>орёл</span>
      <span><i class="exp-dot" style="background:#3a4160"></i>решка</span>
      <span><i class="exp-dot" style="background:rgba(154,163,199,.35)"></i>коридор удачи честной монеты (95%)</span>
    </div>
    <div class="exp-row js-stops"></div>
    <div class="exp-row">
      <label class="exp-slider">преимущество монеты трейдера: <b class="js-pv">55%</b>
        <input type="range" class="js-pr" min="51" max="60" step="0.5" value="55"></label>
      <button class="exp-btn js-new">Новый раунд</button>
    </div>
    <div class="exp-prompt js-prompt" hidden></div>
    <div class="exp-stats js-stats"></div>
    <div class="exp-aha js-aha" hidden></div>
    <div class="exp-artifact js-art"></div>
  </div>`;
  const $ = s => box.querySelector(s);
  const cv = $('.js-cv'), promptEl = $('.js-prompt'), ahaEl = $('.js-aha'), statsEl = $('.js-stats'), artEl = $('.js-art');

  STOPS.forEach(n => {
    const b = document.createElement('button'); b.className = 'exp-btn'; b.textContent = C.fmtNum(n) + ' бросков';
    b.addEventListener('click', () => go(n)); $('.js-stops').appendChild(b);
  });
  $('.js-pr').addEventListener('input', e => { pT = +e.target.value / 100; $('.js-pv').textContent = $('.js-pv2').textContent = C.fmtPct(pT, 1); newRound(seed); });
  $('.js-new').addEventListener('click', () => newRound((Date.now() % 2147483647) | 0));

  // ---- раунд ----
  function newRound(newSeed){
    seed = newSeed;
    const fair = ENG.coin.simulate(seed, 0.5, NMAX), trader = ENG.coin.simulate(seed ^ 0x5bd1e995, pT, NMAX);
    const swap = C.mulberry32(seed + 7)() < 0.5;
    coins = { A: swap ? trader : fair, B: swap ? fair : trader };
    coins.A.isTrader = swap; coins.B.isTrader = !swap;
    sepN = ENG.coin.separation(trader.freq, NMAX);
    revealed = false; cur = 0; target = 0; animating = false; guess = { n10: null, n1000: null };
    promptEl.hidden = true; ahaEl.hidden = true;
    updateUI(); draw();
  }

  // ---- анимация: интерполяция в лог-шкале, чтобы 10→10 000 не пролетало мгновенно ----
  function go(n){ if (n === cur && !animating) { onStop(); return; } animFrom = cur; target = n; animT0 = performance.now(); animating = true; promptEl.hidden = true; raf(step); }
  function step(ts){
    const D = 2400, t = Math.min(1, (ts - animT0) / D), e = 1 - Math.pow(1 - t, 3);
    const a = Math.log(Math.max(1, animFrom)), b = Math.log(Math.max(1, target));
    cur = Math.max(1, Math.round(Math.exp(a + (b - a) * e)));
    draw();
    if (t < 1) raf(step); else { cur = target; animating = false; draw(); onStop(); }
  }
  function onStop(){
    updateUI();
    if (!revealed){
      if (cur === 10 && guess.n10 === null) return showGuess(10);
      if (cur === 1000 && guess.n1000 === null) return showGuess(1000);
    }
    checkAha();
  }

  // ---- угадывание ----
  function showGuess(n){
    const hA = Math.round(coins.A.freq[n] * n), hB = Math.round(coins.B.freq[n] * n);
    let extra = '';
    if (n === 10) { const f = coins.A.isTrader ? hB : hA; if (f >= 7 || f <= 3) extra = ` Честная монета дала ${f} из 10 — это не сломанная монета, это короткая серия.`; }
    promptEl.hidden = false;
    promptEl.innerHTML = `<b>Прошло ${C.fmtNum(n)} бросков.</b> A — ${C.fmtNum(hA)} орлов, B — ${C.fmtNum(hB)}.${extra}<br>Какая монета — трейдера (${C.fmtPct(pT, 1)})?
      <div class="exp-row"><button class="exp-btn primary js-gA">Монета A</button><button class="exp-btn primary js-gB">Монета B</button><button class="exp-btn js-gS">Не знаю — покажи</button></div>`;
    promptEl.querySelector('.js-gA').addEventListener('click', () => answer(n, 'A'));
    promptEl.querySelector('.js-gB').addEventListener('click', () => answer(n, 'B'));
    promptEl.querySelector('.js-gS').addEventListener('click', () => { revealed = true; promptEl.innerHTML = `Открыли карты: трейдер — монета <b>${coins.A.isTrader ? 'A' : 'B'}</b>. Крути дальше и смотри, когда кривые разойдутся.`; updateUI(); draw(); checkAha(); });
  }
  function answer(n, k){
    const ok = coins[k].isTrader, key = n === 10 ? 'g10' : 'g1000';
    guess['n' + n] = k; box._expScore[key][0] += ok ? 1 : 0; box._expScore[key][1] += 1;
    const s = box._expScore;
    if (n === 10){
      promptEl.innerHTML = `Записано: ты поставил на <b>${k}</b>. Пока не раскрываем — на 10 бросках это угадывание, а не вывод.
        <div class="exp-row"><button class="exp-btn primary js-go">Крутить до 1 000</button></div>`;
      promptEl.querySelector('.js-go').addEventListener('click', () => go(1000));
    } else {
      revealed = true;
      const g10 = guess.n10 ? (coins[guess.n10].isTrader ? 'угадал' : 'не угадал') : 'пропустил';
      promptEl.innerHTML = `Трейдер — монета <b>${coins.A.isTrader ? 'A' : 'B'}</b>. На 1000 бросках ты <b>${ok ? 'угадал' : 'не угадал'}</b>, на 10 — ${g10}.
        Твой счёт за все раунды: на 10 бросках ${s.g10[0]}/${s.g10[1]}, на 1000 — ${s.g1000[0]}/${s.g1000[1]}.
        ${s.g10[1] >= 3 ? 'На короткой дистанции ты угадываешь как монетка — и это нормально: там просто нет информации.' : 'Сыграй ещё 2–3 раунда («Новый раунд») — увидишь, что на 10 бросках счёт держится около 50%.'}
        <div class="exp-row"><button class="exp-btn primary js-go">Докрутить до 10 000</button></div>`;
      promptEl.querySelector('.js-go').addEventListener('click', () => go(10000));
    }
    updateUI(); draw();
  }

  function checkAha(){
    if (revealed && isFinite(sepN) && cur >= sepN && cur >= 1000){
      ahaEl.hidden = false;
      ahaEl.innerHTML = `<b>Ага.</b> Начиная примерно с <b>${C.fmtNum(sepN)}</b>-го броска монета трейдера выходит из коридора удачи честной монеты и больше туда не возвращается. До этого числа отличить навык от везения нельзя — ни тебе, ни автору красивого скриншота. Именно поэтому в уроке сказано: «качество стратегии проверяется только на сотнях сделок».`;
    }
  }

  // ---- статистика и артефакт ----
  function updateUI(){
    const n = cur, s = box._expScore;
    const col = k => revealed ? (coins[k].isTrader ? P.ok : P.acc) : P.mut;
    $('.js-la').style.background = col('A'); $('.js-lb').style.background = col('B'); $('.js-lb').style.opacity = revealed ? 1 : .55;
    const card = (t, v, sub) => `<div class="exp-stat">${t}<b style="color:${sub || 'inherit'}">${v}</b></div>`;
    const name = k => k + (revealed ? (coins[k].isTrader ? ' · трейдер' : ' · честная') : '');
    statsEl.innerHTML =
      card('бросков', C.fmtNum(n)) +
      card(name('A'), n ? C.fmtPct(coins.A.freq[n]) + ' <small>серия ' + coins.A.streak[n] + '</small>' : '—', col('A')) +
      card(name('B'), n ? C.fmtPct(coins.B.freq[n]) + ' <small>серия ' + coins.B.streak[n] + '</small>' : '—', col('B')) +
      card('коридор удачи', n ? '±' + C.fmtPct(ENG.coin.band(n)) : '—') +
      card('угадал на 10 / на 1000', `${s.g10[0]}/${s.g10[1]} · ${s.g1000[0]}/${s.g1000[1]}`);
    if (n){
      const tr = coins.A.isTrader ? 'A' : 'B', fr = tr === 'A' ? 'B' : 'A';
      C.artifact(box, artEl,
        `0.13 · ${C.fmtNum(n)} бросков · честная ${C.fmtPct(coins[fr].freq[n])} (серия ${coins[fr].streak[n]}) · трейдер ${C.fmtPct(pT, 1)} дала ${C.fmtPct(coins[tr].freq[n])} (серия ${coins[tr].streak[n]}) · разделение ≈ ${isFinite(sepN) ? C.fmtNum(sepN) : 'нет'} · угадал: на 10 — ${s.g10[0]}/${s.g10[1]}, на 1000 — ${s.g1000[0]}/${s.g1000[1]}`,
        { widget: 'widget_p0_l13', n, pTrader: pT, sepN, score: s, seed });
    }
  }

  // ---- сцена ----
  function draw(){
    if (!size) return;
    const { ctx, w, h } = size, n = Math.min(NMAX, Math.max(0, cur));
    ctx.clearRect(0, 0, w, h);
    const stripH = 48, padL = 44, padR = 14, padT = stripH + 12, padB = 26, pw = w - padL - padR, ph = h - padT - padB;
    const col = k => revealed ? (coins[k].isTrader ? P.ok : P.acc) : P.mut;

    // верхняя полоса: монетки крутятся, лента последних исходов
    ['A', 'B'].forEach((k, i) => {
      const y = 13 + i * 22, c = coins[k];
      ctx.fillStyle = col(k); ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(k, 10, y);
      const flip = animating ? Math.abs(Math.cos(performance.now() / 55 + i * 1.3)) : 1, last = n >= 1 ? c.out[n] : -1;
      ctx.save(); ctx.translate(30, y); ctx.scale(Math.max(.08, flip), 1);
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fillStyle = last === 1 ? P.warn : (last === 0 ? '#3a4160' : '#20263f'); ctx.fill(); ctx.restore();
      const maxDots = Math.max(6, Math.min(30, Math.floor((pw - 110) / 11)));
      for (let j = 0; j < maxDots; j++){ const m = n - maxDots + 1 + j; if (m < 1) continue; ctx.beginPath(); ctx.arc(padL + 8 + j * 11, y, 4, 0, Math.PI * 2); ctx.fillStyle = c.out[m] === 1 ? P.warn : '#3a4160'; ctx.fill(); }
      if (n >= 1){ ctx.fillStyle = col(k); ctx.textAlign = 'right'; ctx.font = '12px ui-monospace,monospace'; ctx.fillText(C.fmtPct(c.freq[n]) + ' орлов', w - 10, y); }
    });

    // оси: X — логарифм числа бросков, Y — доля орлов 20…80%
    const xOf = m => padL + Math.log10(Math.max(1, m)) / Math.log10(NMAX) * pw;
    const yOf = f => padT + (0.8 - Math.min(0.8, Math.max(0.2, f))) / 0.6 * ph;
    ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.fillStyle = P.mut; ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0.3, 0.4, 0.5, 0.6, 0.7].forEach(f => { const y = yOf(f); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillText(Math.round(f * 100) + '%', padL - 6, y); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [1, 10, 100, 1000, 10000].forEach(m => { const x = xOf(m); ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke(); ctx.fillText(C.fmtNum(m), x, padT + ph + 6); });

    // коридор удачи честной монеты
    ctx.beginPath();
    for (let m = 1; m <= NMAX; m = Math.max(m + 1, Math.ceil(m * 1.05))){ const x = xOf(m), y = yOf(0.5 + ENG.coin.band(m)); m === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineTo(xOf(NMAX), yOf(0.5 + ENG.coin.band(NMAX)));
    for (let m = NMAX; m >= 1; m = Math.min(m - 1, Math.floor(m / 1.05))) ctx.lineTo(xOf(m), yOf(0.5 - ENG.coin.band(m)));
    ctx.closePath(); ctx.fillStyle = 'rgba(154,163,199,.14)'; ctx.fill();
    ctx.fillStyle = P.mut; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText('коридор удачи честной монеты', w - padR - 4, yOf(0.5 + ENG.coin.band(NMAX)) - 3);

    // линии 50% и p трейдера
    ctx.setLineDash([3, 4]); ctx.strokeStyle = P.mut; ctx.beginPath(); ctx.moveTo(padL, yOf(0.5)); ctx.lineTo(w - padR, yOf(0.5)); ctx.stroke();
    if (revealed){ ctx.strokeStyle = P.ok; ctx.beginPath(); ctx.moveTo(padL, yOf(pT)); ctx.lineTo(w - padR, yOf(pT)); ctx.stroke();
      ctx.fillStyle = P.ok; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('монета трейдера ' + C.fmtPct(pT, 1), padL + 4, yOf(pT) - 3); }
    ctx.setLineDash([]);

    // линия разделения
    if (revealed && isFinite(sepN) && n >= sepN){
      const x = xOf(sepN), pulse = 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 400));
      ctx.setLineDash([6, 4]); ctx.strokeStyle = P.ok; ctx.globalAlpha = pulse; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = P.ok; ctx.textAlign = x > w / 2 ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.font = 'bold 11px system-ui,sans-serif';
      ctx.fillText('разделение ≈ ' + C.fmtNum(sepN), x + (x > w / 2 ? -6 : 6), padT + 4);
      if (!animating) raf(draw); // мягкая пульсация после остановки
    }

    // кривые частот — выборка точек в лог-шкале, чтобы начало ряда не терялось
    if (n >= 1) ['A', 'B'].forEach(k => {
      const c = coins[k]; ctx.strokeStyle = col(k); ctx.lineWidth = 2; if (!revealed && k === 'B') ctx.setLineDash([5, 4]);
      ctx.beginPath(); let first = true;
      for (let m = 1; m <= n; m = Math.max(m + 1, Math.ceil(m * 1.006))){ const x = xOf(m), y = yOf(c.freq[m]); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
      ctx.lineTo(xOf(n), yOf(c.freq[n])); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(xOf(n), yOf(c.freq[n]), 4, 0, Math.PI * 2); ctx.fillStyle = col(k); ctx.fill();
      ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(k, Math.min(xOf(n) + 7, w - padR - 10), yOf(c.freq[n]) + (k === 'A' ? -8 : 8));
    });
    ctx.lineWidth = 1;

    // заголовок сцены
    ctx.fillStyle = P.txt; ctx.font = '12px ui-monospace,monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('бросков: ' + C.fmtNum(n), padL + 4, padT + 4);
  }

  function fit(){ size = C.fitCanvas(cv, 0.62, 250, 380); draw(); }
  onResize(fit);
  newRound(seed);   /* фикс сборки: до fit() — иначе первый draw() читает coins до инициализации */
  fit();
};
