/*
 * W-48 · widget_g17_asic · Б1/6.1 «ASIC под напряжением»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     почувствовать экономику майнера как бизнес с переменными расходами: доход = хешрейт/сеть × награда × курс,
 *   Задание:  шаг 1 — при халвинге в 12‑м месяце (дефолт) найти тариф, при котором ASIC окупается за ≤ 18 месяцев;
 *   Ага:      золотые столбики дохода падают вдвое на глазах при перетаскивании халвинга; кривая накопленной прибыли
 *   Дефолты:  ASIC $2 500, 200 TH/s, 3 500 Вт, тариф 5 ₽/кВт·ч (курс 90 ₽/$), BTC $65 000, сеть 700 EH/s,
 *   Артефакт: строка «ASIC 200 TH/s · тариф X ₽ · халвинг мес N · окупаемость: M мес / нет · итог за 24 мес: $Y»
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_g17_asic'] = function(box){
  /* ── 0. чистим прошлый запуск ─────────────────────────────────────────── */
  if(box._expTimers){ box._expTimers.forEach(function(t){ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  box._expTimers = []; box._expRaf = null; box._expRO = null;
  const later = function(fn, ms, rep){ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = function(fn){ box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = function(seed){ return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }; };

  /* ── 1. канон чисел (из карточки урока Б1) ───────────────────────────── */
  const C = { asicUsd:2500, hashTH:200, watts:3500, rub:90, poolFee:0.015,
              reward:3.125, blocksDay:144, days:30.4, net0:700, months:24 };
  const D = { tariff:5, halving:12, btc:65000, growth:3 };
  const S = { tariff:D.tariff, halving:D.halving, btc:D.btc, growth:D.growth, seed:42 };
  const KWH = C.watts / 1000 * 24 * C.days;               // кВт·ч в месяц ≈ 2 554

  function compute(s){
    const rnd = mulberry32(s.seed); const noise = []; let lvl = 1;
    for(let i = 0; i < C.months; i++){                     // «шум рынка»: блуждание ±4 %/мес, коридор 0.7–1.4
      lvl = lvl * (1 + (rnd() - 0.5) * 0.08);
      lvl = Math.max(0.7, Math.min(1.4, lvl)); noise.push(lvl);
    }
    const inc = [], cst = [], cum = [], btcM = []; let acc = -C.asicUsd, payback = null;
    for(let m = 0; m < C.months; m++){
      const netEH = C.net0 * Math.pow(1 + s.growth / 100, m);
      const share = (C.hashTH * 1e12) / (netEH * 1e18);   // твоя доля хешрейта сети
      const rew   = m >= s.halving ? C.reward / 2 : C.reward;
      const b     = C.blocksDay * C.days * rew * share;    // BTC за месяц
      const i     = b * s.btc * noise[m] * (1 - C.poolFee);
      const c     = KWH * s.tariff / C.rub;
      acc += i - c; inc.push(i); cst.push(c); cum.push(acc); btcM.push(b);
      if(payback === null && acc >= 0) payback = m + 1;
    }
    const beBefore = inc[0] * C.rub / KWH;                 // порог тарифа: доход = свет (до халвинга)
    const hm = Math.min(s.halving, C.months - 1);
    const beAfter = (s.halving < C.months ? inc[hm] : inc[0] / 2) * C.rub / KWH;
    return { inc:inc, cst:cst, cum:cum, btcM:btcM, payback:payback, beBefore:beBefore, beAfter:beAfter, final:acc };
  }
  function maxTariffFor(months, halving){                  // максимальный тариф с окупаемостью ≤ months
    for(let t = 10; t >= 0; t -= 0.1){
      const r = compute({ tariff:t, halving:halving, btc:S.btc, growth:S.growth, seed:S.seed });
      if(r.payback !== null && r.payback <= months) return t;
    }
    return null;
  }

  /* ── 2. разметка ─────────────────────────────────────────────────────── */
  box.innerHTML = `
<style>
.g17{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#23284a);border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
.g17 *{box-sizing:border-box}
.g17-h{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.g17-h b{font-size:16px}
.g17-goal{color:var(--mut,#9aa3c7);font-size:13px}
.g17-fix{color:var(--mut,#9aa3c7);font-size:12px;font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace)}
.g17-task{display:grid;gap:6px;margin:8px 0 10px;padding:10px;border:1px dashed var(--line,#23284a);border-radius:10px;font-size:13px}
.g17-step{display:flex;gap:8px;align-items:flex-start}
.g17-step i{font-style:normal;flex:0 0 18px;text-align:center;font-weight:700}
.g17-step.done i{color:var(--ok,#22c55e)} .g17-step.wait i{color:var(--mut,#9aa3c7)} .g17-step.act i{color:var(--acc2,#06b6d4)}
.g17-aha{margin-top:2px;padding:8px 10px;border-radius:8px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.35);display:none;font-size:13px}
.g17-aha.on{display:block}
.g17 canvas{display:block;width:100%;border-radius:10px;background:#070a17;touch-action:none;cursor:default}
.g17-hint{font-size:12px;color:var(--mut,#9aa3c7);margin-top:4px}
.g17-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px;margin:10px 0}
.g17-ctl label{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
.g17-ctl label span{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);float:right}
.g17-ctl input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin-top:4px}
.g17-st{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 12px;font-size:12px;color:var(--mut,#9aa3c7)}
.g17-st b{display:block;font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-size:14px;color:var(--txt,#eef1ff);font-weight:600}
.g17-st b.bad{color:var(--bad,#ef4444)} .g17-st b.ok{color:var(--ok,#22c55e)} .g17-st b.warn{color:var(--warn,#eab308)}
.g17-f{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
.g17 button{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,#23284a);background:#111633;color:var(--txt,#eef1ff);cursor:pointer}
.g17 button:hover{border-color:var(--acc2,#06b6d4)}
.g17 button.pri{border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.15)}
.g17-art{font-size:12px;color:var(--mut,#9aa3c7);font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);flex:1 1 100%;min-height:1em}
</style>
<div class="g17">
  <div class="g17-h">
    <b>ASIC под напряжением</b>
    <span class="g17-goal">Цель: увидеть, что майнинг — бизнес с переменными расходами. Доход = твой хешрейт ÷ сеть × награда × курс; расход = киловатты × тариф; халвинг режет доход вдвое за один день.</span>
    <span class="g17-fix">ASIC $2 500 · 200 TH/s · 3 500 Вт · сеть 700 EH/s · пул 1.5 % · курс 90 ₽/$ · награда 3.125 BTC</span>
  </div>
  <div class="g17-task" data-task></div>
  <canvas data-cv></canvas>
  <div class="g17-hint">Жёлтую линию халвинга можно тащить мышью или пальцем прямо на графике.</div>
  <div class="g17-ctl">
    <label>Тариф на электричество <span data-v="tariff"></span><input type="range" data-k="tariff" min="0" max="10" step="0.1"></label>
    <label>Месяц халвинга <span data-v="halving"></span><input type="range" data-k="halving" min="0" max="24" step="1"></label>
    <label>Курс BTC <span data-v="btc"></span><input type="range" data-k="btc" min="20000" max="150000" step="1000"></label>
    <label>Рост хешрейта сети <span data-v="growth"></span><input type="range" data-k="growth" min="0" max="6" step="0.5"></label>
  </div>
  <div class="g17-st" data-st></div>
  <div class="g17-f">
    <button data-act="round">Новый раунд (другой шум цены)</button>
    <button data-act="reset">Сброс к дефолтам</button>
    <button data-act="art" class="pri">Записать в журнал</button>
    <div class="g17-art" data-art></div>
  </div>
</div>`;

  const q  = function(sel){ return box.querySelector(sel); };
  const qa = function(sel){ return Array.prototype.slice.call(box.querySelectorAll(sel)); };
  const cv = q('[data-cv]'); const ctx = cv.getContext('2d');
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const usd = function(v){ return (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('ru-RU'); };
  const rub = function(v){ return Math.round(v).toLocaleString('ru-RU') + ' ₽'; };

  /* ── 3. состояние анимации и задания ─────────────────────────────────── */
  let target = compute(S);
  const cur = { inc: target.inc.slice(), cst: target.cst.slice(), cum: target.cum.slice() };
  let animating = false, geo = { L:48, mw:10, W:300, H:300 }, drag = false;
  const task = { s1:false, s1Tariff:null, s2:false };

  /* ── 4. рисование ────────────────────────────────────────────────────── */
  function niceCeil(v){ const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); const f = v / p;
    const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * p; }

  function draw(){
    const W = cv.clientWidth || 300, H = cv.clientHeight || 300;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const L = 50, R = 14, T = 26, B = 26, gap = 24;
    const ph = H - T - B - gap, h1 = ph * 0.44, h2 = ph * 0.56, t1 = T, t2 = T + h1 + gap;
    const pw = W - L - R, mw = pw / C.months;
    geo = { L:L, mw:mw, W:W, H:H };
    const hx = L + S.halving * mw;
    const lineC = 'rgba(154,163,199,.22)', mutC = '#9aa3c7', gold = '#f2c14e', red = '#ef4444', cyan = '#06b6d4', green = '#22c55e';

    /* панель 1: столбики доход / электричество */
    ctx.fillStyle = 'rgba(234,179,8,.07)'; ctx.fillRect(hx, t1, Math.max(0, W - R - hx), h1);
    const maxBar = niceCeil(Math.max.apply(null, cur.inc.concat(cur.cst, [1])));
    const kb = h1 / maxBar;
    ctx.font = '11px ' + MONO; ctx.textBaseline = 'middle'; ctx.fillStyle = mutC; ctx.strokeStyle = lineC; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function(f){ const y = t1 + h1 - f * h1; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('$' + Math.round(maxBar * f), L - 6, y); });
    ctx.textAlign = 'left'; ctx.fillStyle = gold; ctx.fillRect(L, t1 - 16, 9, 9); ctx.fillStyle = mutC; ctx.fillText('доход, $/мес', L + 13, t1 - 11);
    ctx.fillStyle = red; ctx.fillRect(L + 112, t1 - 16, 9, 9); ctx.fillStyle = mutC; ctx.fillText('электричество, $/мес', L + 125, t1 - 11);
    for(let m = 0; m < C.months; m++){
      const x0 = L + m * mw, bw = mw * 0.34;
      ctx.fillStyle = gold; ctx.fillRect(x0 + mw * 0.12, t1 + h1 - cur.inc[m] * kb, bw, cur.inc[m] * kb);
      ctx.fillStyle = 'rgba(239,68,68,.85)'; ctx.fillRect(x0 + mw * 0.54, t1 + h1 - cur.cst[m] * kb, bw, cur.cst[m] * kb);
    }

    /* панель 2: накопленная прибыль */
    let cmin = -C.asicUsd * 1.08, cmax = 600;
    for(let m = 0; m < C.months; m++){ if(cur.cum[m] < cmin) cmin = cur.cum[m] * 1.05; if(cur.cum[m] * 1.12 > cmax) cmax = cur.cum[m] * 1.12; }
    const y2 = function(v){ return t2 + (cmax - v) / (cmax - cmin) * h2; };
    ctx.fillStyle = 'rgba(239,68,68,.05)'; ctx.fillRect(L, y2(0), pw, t2 + h2 - y2(0));
    ctx.fillStyle = 'rgba(34,197,94,.05)'; ctx.fillRect(L, t2, pw, y2(0) - t2);
    ctx.fillStyle = mutC; ctx.textAlign = 'right';
    [cmax, 0, cmin].forEach(function(v){ ctx.fillText((v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v) / 100) * 100, L - 6, y2(v)); });
    ctx.textAlign = 'left'; ctx.fillText('накопленная прибыль с учётом цены ASIC', L, t2 - 11);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = cyan; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, y2(0)); ctx.lineTo(W - R, y2(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = cyan; ctx.textAlign = 'right'; ctx.fillText('0 — окупился', W - R - 2, y2(0) - 8);
    ctx.beginPath(); ctx.strokeStyle = cyan; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.moveTo(L, y2(-C.asicUsd));
    for(let m = 0; m < C.months; m++) ctx.lineTo(L + (m + 0.5) * mw, y2(cur.cum[m]));
    ctx.stroke();
    if(target.payback !== null){
      const pm = target.payback, px = L + (pm - 0.5) * mw, py = y2(cur.cum[pm - 1]);
      ctx.fillStyle = green; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 12px ' + MONO; ctx.textAlign = px > W * 0.6 ? 'right' : 'left';
      ctx.fillText('окупился: ' + pm + ' мес', px + (px > W * 0.6 ? -9 : 9), py - 12);
    } else {
      const msg = 'не окупается за 24 мес'; ctx.font = 'bold 12px ' + MONO;
      const tw = ctx.measureText(msg).width + 18, bx = W - R - tw, by = t2 + 6;
      ctx.fillStyle = 'rgba(239,68,68,.18)'; ctx.strokeStyle = red; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(bx, by, tw, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = red; ctx.textAlign = 'left'; ctx.fillText(msg, bx + 9, by + 11);
    }

    /* линия халвинга + ручка */
    ctx.setLineDash([5, 4]); ctx.strokeStyle = gold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx, t1 - 2); ctx.lineTo(hx, t2 + h2); ctx.stroke(); ctx.setLineDash([]);
    const hyH = t2 - gap / 2, hw = 30;
    ctx.fillStyle = drag ? gold : 'rgba(242,193,78,.25)'; ctx.strokeStyle = gold;
    ctx.beginPath(); ctx.rect(hx - hw / 2, hyH - 8, hw, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = drag ? '#111' : gold; ctx.textAlign = 'center'; ctx.font = 'bold 11px ' + MONO; ctx.fillText('⇔', hx, hyH + 1);
    ctx.fillStyle = gold; ctx.textAlign = hx > W * 0.7 ? 'right' : 'left'; ctx.font = '11px ' + MONO;
    ctx.fillText(S.halving >= C.months ? 'халвинг — за окном' : 'халвинг · мес ' + S.halving, hx + (hx > W * 0.7 ? -8 : 8), t1 + 8);

    /* ось месяцев */
    ctx.fillStyle = mutC; ctx.textAlign = 'center'; ctx.font = '11px ' + MONO;
    for(let m = 0; m <= C.months; m += 3) ctx.fillText(m === 0 ? 'старт' : m + ' мес', L + m * mw, t2 + h2 + 13);
  }

  function step(){
    let maxd = 0;
    ['inc', 'cst', 'cum'].forEach(function(k){ for(let i = 0; i < C.months; i++){ const d = target[k][i] - cur[k][i]; cur[k][i] += d * 0.25; if(Math.abs(d) > maxd) maxd = Math.abs(d); } });
    draw();
    if(maxd > 0.5){ raf(step); }
    else { ['inc', 'cst', 'cum'].forEach(function(k){ cur[k] = target[k].slice(); }); draw(); animating = false; }
  }

  /* ── 5. панели: значения, статистика, задание ────────────────────────── */
  function labelFor(k){
    if(k === 'tariff') return S.tariff.toFixed(1) + ' ₽/кВт·ч';
    if(k === 'halving') return S.halving >= C.months ? 'нет в окне' : 'мес ' + S.halving;
    if(k === 'btc') return '$' + S.btc.toLocaleString('ru-RU');
    return S.growth + ' %/мес';
  }
  function syncUI(){ qa('input[data-k]').forEach(function(inp){ inp.value = S[inp.dataset.k]; }); qa('[data-v]').forEach(function(el){ el.textContent = labelFor(el.dataset.v); }); }

  function renderStats(){
    const r = target, pb = r.payback;
    const afterBad = S.tariff > r.beAfter, beforeBad = S.tariff > r.beBefore;
    q('[data-st]').innerHTML =
      '<div>Доход в 1‑й месяц<b>' + usd(r.inc[0]) + ' · ' + rub(r.inc[0] * C.rub) + '</b></div>' +
      '<div>Электричество в месяц<b class="' + (beforeBad ? 'bad' : '') + '">' + usd(r.cst[0]) + ' · ' + rub(r.cst[0] * C.rub) + '</b></div>' +
      '<div>Добыча в 1‑й месяц<b>' + r.btcM[0].toFixed(5) + ' BTC</b></div>' +
      '<div>Порог тарифа до халвинга (доход = свет)<b class="warn">' + r.beBefore.toFixed(1) + ' ₽/кВт·ч</b></div>' +
      '<div>Порог тарифа после халвинга<b class="' + (afterBad ? 'bad' : 'warn') + '">' + r.beAfter.toFixed(1) + ' ₽/кВт·ч' + (afterBad ? ' — ниже твоего!' : '') + '</b></div>' +
      '<div>Окупаемость ASIC<b class="' + (pb === null ? 'bad' : (pb <= 18 ? 'ok' : 'warn')) + '">' + (pb === null ? 'не окупается за 24 мес' : pb + ' мес') + '</b></div>' +
      '<div>Итог через 24 мес<b class="' + (r.final >= 0 ? 'ok' : 'bad') + '">' + usd(r.final) + '</b></div>';
  }

  function checkTask(){
    if(!task.s1 && S.halving === 12 && target.payback !== null && target.payback <= 18){ task.s1 = true; task.s1Tariff = S.tariff; }
    if(task.s1 && !task.s2 && S.halving === 0){ task.s2 = true; }
  }

  function renderTask(){
    const pb = target.payback;
    const now = pb === null ? 'не окупается за 24 мес' : 'окупаемость ' + pb + ' мес';
    let s1;
    if(task.s1){
      const th = maxTariffFor(18, 12);
      s1 = '<div class="g17-step done"><i>✓</i><span><b>Шаг 1.</b> Нашёл: при тарифе ' + task.s1Tariff.toFixed(1) + ' ₽ окупается за ≤ 18 мес. Порог — примерно <b>' + (th === null ? '—' : th.toFixed(1)) + ' ₽/кВт·ч</b>: квартирные 5–6 ₽ выше в ' + (th ? Math.round(5 / Math.max(th, 0.1)) : '—') + ' раз. Такое электричество бывает у ГЭС и на промышленных площадках, не в спальне.</span></div>';
    } else {
      s1 = '<div class="g17-step act"><i>1</i><span><b>Шаг 1.</b> Халвинг в 12‑м месяце (как сейчас). Двигай <b>тариф</b>, пока ASIC не окупится за ≤ 18 месяцев. Сейчас: <b>' + now + '</b>' + (S.halving !== 12 ? ' · верни халвинг на 12‑й месяц' : '') + '.</span></div>';
    }
    let s2;
    if(!task.s1){
      s2 = '<div class="g17-step wait"><i>2</i><span><b>Шаг 2.</b> Откроется после шага 1.</span></div>';
    } else if(!task.s2){
      s2 = '<div class="g17-step act"><i>2</i><span><b>Шаг 2.</b> Перетащи халвинг в <b>месяц 0</b> — «приехал в день халвинга». Что стало с окупаемостью?</span></div>';
    } else {
      s2 = '<div class="g17-step done"><i>✓</i><span><b>Шаг 2.</b> Столбики дохода вдвое ниже с первого месяца; ' + (pb === null ? 'кривая больше не пересекает ноль — <b>«не окупается за 24 мес»</b> при любом тарифе от 0 до 10 ₽.' : 'окупается за ' + pb + ' мес только потому, что ты поставил курс $' + S.btc.toLocaleString('ru-RU') + ' — а курс никто не обещал.') + '</span></div>';
    }
    const aha = task.s2 ? '<div class="g17-aha on"><b>Ага:</b> у майнера две переменные, которыми он не управляет — курс и сложность сети, — и одна постоянная, которую он платит всегда: счёт за свет. Халвинг не «мелкая новость»: он режет выручку пополам в один день, а расход остаётся тем же. Поэтому «считать доходность по сегодняшнему курсу навсегда» — главная ошибка из карточки урока.</div>' : '<div class="g17-aha"></div>';
    q('[data-task]').innerHTML = s1 + s2 + aha;
  }

  function kick(){
    target = compute(S); checkTask(); syncUI(); renderStats(); renderTask();
    if(!animating){ animating = true; raf(step); }
  }

  /* ── 6. события ──────────────────────────────────────────────────────── */
  qa('input[data-k]').forEach(function(inp){ inp.addEventListener('input', function(){ S[inp.dataset.k] = parseFloat(inp.value); kick(); }); });
  const px = function(e){ return e.clientX - cv.getBoundingClientRect().left; };
  const hxNow = function(){ return geo.L + S.halving * geo.mw; };
  cv.addEventListener('pointerdown', function(e){ if(Math.abs(px(e) - hxNow()) < 18){ drag = true; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'ew-resize'; draw(); } });
  cv.addEventListener('pointermove', function(e){
    const x = px(e);
    if(drag){ const v = Math.max(0, Math.min(C.months, Math.round((x - geo.L) / geo.mw))); if(v !== S.halving){ S.halving = v; kick(); } }
    else { cv.style.cursor = Math.abs(x - hxNow()) < 18 ? 'ew-resize' : 'default'; }
  });
  const stopDrag = function(){ if(drag){ drag = false; cv.style.cursor = 'default'; draw(); } };
  cv.addEventListener('pointerup', stopDrag); cv.addEventListener('pointercancel', stopDrag);

  q('[data-act="round"]').addEventListener('click', function(){ S.seed = (Date.now() % 2147483647) | 0; kick(); });
  q('[data-act="reset"]').addEventListener('click', function(){ S.tariff = D.tariff; S.halving = D.halving; S.btc = D.btc; S.growth = D.growth; S.seed = 42; kick(); });
  q('[data-act="art"]').addEventListener('click', function(){
    const pb = target.payback;
    const text = 'ASIC 200 TH/s · тариф ' + S.tariff.toFixed(1) + ' ₽/кВт·ч · халвинг мес ' + S.halving + ' · BTC $' + S.btc + ' · рост сети ' + S.growth + '%/мес · окупаемость: ' + (pb === null ? 'нет за 24 мес' : pb + ' мес') + ' · итог 24 мес: ' + usd(target.final) + ' · порог после халвинга ' + target.beAfter.toFixed(1) + ' ₽';
    box.dataset.artifact = text; q('[data-art]').textContent = '✓ записано: ' + text;
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail:{ widget:'widget_g17_asic', lesson:'6.1', text:text, payback:pb, tariff:S.tariff, halving:S.halving } }));
  });

  /* ── 7. размер и старт ───────────────────────────────────────────────── */
  function fit(){
    const w = Math.max(300, box.clientWidth - 30); const h = w < 520 ? 330 : 360;
    cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); draw();
  }
  if(window.ResizeObserver){ box._expRO = new ResizeObserver(function(){ fit(); }); box._expRO.observe(box); }
  syncUI(); renderStats(); renderTask(); fit();
};
