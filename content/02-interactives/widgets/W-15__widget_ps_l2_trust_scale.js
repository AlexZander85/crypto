/*
 * W-15 · widget_ps_l2_trust_scale · П2 «Доверяй машину, но стой рядом»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что «верить всему» и «не верить ничему» — две разные дорогие ошибки, а здоровый режим — узкая полоса посередине.
 *   Задание:  ползунками (частота осмотров × порог вмешательства) найти режим, где цена опеки И цена слепоты малы одновременно.
 *   Ага:      карта режимов U-образная: слева дорого стоит пропущенный сбой, справа — отмены и нервы; зелёная полоса узкая (осмотр раз в 2–7 дней, вмешательство только по факту).
 *   Дефолты:  seed 42; 56 дней; бот +0,15%/день, σ 1,5%; один тихий сбой на 8–44-й день (течёт −0,4%/день до обнаружения); старт: «каждый день» и порог 4%.
 *   Артефакт: «Мой режим доверия» — 4 правила + числа последнего прогона; DD95 исправного бота считается Монте-Карло и вписывается как порог «нормальной плохой погоды».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l2_trust_scale'] = function(box){
  /* 0. чистим прошлый запуск */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };

  /* ГПСЧ */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const gauss = rnd => { let u = 0, v = 0; while(u === 0) u = rnd(); while(v === 0) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

  /* канон урока */
  const DAYS = 56, CAP = 100000, MU = 0.0015, SIG = 0.015;
  const BROKEN_MU = -0.004;          // тихий сбой: бот «течёт»
  const PAUSE = 3, FRICTION = 0.003; // цена одного вмешательства: 3 дня простоя + 0,3% трения
  const ATTENTION = 40;              // условная цена одного осмотра (15 минут + ночной пинг)
  const NERVE_INSP = 1, NERVE_INT = 4;
  const INTERVALS = [1,2,3,4,5,7,10,14,28,999];
  const THRESH = [0,0.12,0.10,0.08,0.06,0.04,0.03,0.02];
  const ivLabel = d => d >= 999 ? 'никогда' : d === 1 ? 'каждый день' : 'раз в ' + d + ' дн.';
  const ivShort = d => d >= 999 ? '—' : d + 'д';
  const thrLabel = t => t === 0 ? 'только по факту' : 'просадка ≥ ' + Math.round(t*100) + '%';
  const thrShort = t => t === 0 ? 'факт' : Math.round(t*100) + '%';
  const rub = v => (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString('ru-RU') + ' ₽';

  const cssv = (n, f) => { const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: cssv('--txt','#eef1ff'), mut: cssv('--mut','#9aa3c7'), line: cssv('--line','rgba(154,163,199,.25)'),
              acc: cssv('--acc2','#06b6d4'), ok: cssv('--ok','#22c55e'), bad: cssv('--bad','#ef4444'), warn: cssv('--warn','#eab308') };

  /* сценарий и модель */
  const makeScenario = seed => {
    const rnd = mulberry32(seed); const z = [0];
    for(let d = 1; d <= DAYS; d++) z.push(gauss(rnd));
    return { seed, z, fail: 8 + Math.floor(rnd()*37) }; // 8..44
  };
  const simulate = (scn, interval, thr) => {
    let eq = 1, peak = 1, ref = 1, broken = false, detect = null, pause = 0;
    let blind = 0, care = 0, nInsp = 0, nInt = 0, brokenDays = 0;
    const path = [1], refPath = [1], insp = [], ints = [];
    for(let d = 1; d <= DAYS; d++){
      const hr = MU + SIG*scn.z[d];
      if(d === scn.fail) broken = true;
      if(interval < 999 && d % interval === 0){
        nInsp++; insp.push(d);
        if(broken){ broken = false; detect = d; }                       // ФАКТ: сбой найден и починен
        else if(thr > 0 && pause === 0 && (1 - eq/peak) >= thr){        // ГОЛОВА: минус на экране
          nInt++; ints.push(d); pause = PAUSE; eq *= (1 - FRICTION); care += CAP*FRICTION;
        }
      }
      let r;
      if(pause > 0){ r = 0; pause--; care += CAP*MU; }                 // упущенный перевес
      else if(broken){ r = BROKEN_MU + SIG*scn.z[d]; brokenDays++; blind += CAP*(hr - r); }
      else r = hr;
      eq *= (1 + r); ref *= (1 + hr);
      path.push(eq); refPath.push(ref); if(eq > peak) peak = eq;
    }
    const attention = nInsp*ATTENTION;
    return { path, refPath, insp, ints, detect, fail: scn.fail, blind, care, attention,
             total: blind + care + attention, nInsp, nInt, brokenDays, nerves: nInsp*NERVE_INSP + nInt*NERVE_INT };
  };

  /* карта режимов: среднее по 24 сценариям */
  const mapScn = []; for(let s = 42; s < 66; s++) mapScn.push(makeScenario(s));
  const grid = THRESH.map(t => INTERVALS.map(iv => mapScn.reduce((a, s) => a + simulate(s, iv, t).total, 0) / mapScn.length));
  const gridAll = grid.reduce((a, r) => a.concat(r), []);
  const gMin = Math.min.apply(null, gridAll), gMax = Math.max.apply(null, gridAll);
  let best = { v: Infinity, ti: 0, ii: 0 };
  grid.forEach((row, ti) => row.forEach((v, ii) => { if(v < best.v) best = { v, ti, ii }; }));

  /* DD95 исправного бота (Монте-Карло) */
  const dds = []; { const rnd = mulberry32(777);
    for(let k = 0; k < 500; k++){ let eq = 1, pk = 1, dd = 0; for(let d = 0; d < DAYS; d++){ eq *= 1 + MU + SIG*gauss(rnd); pk = Math.max(pk, eq); dd = Math.max(dd, 1 - eq/pk); } dds.push(dd); }
    dds.sort((a, b) => a - b); }
  const DD95 = dds[Math.floor(0.95*dds.length)];

  /* состояние */
  const st = { seed: 42, iv: 0, thr: 5, scn: makeScenario(42), res: null };

  box.innerHTML = `
<style>
.xw15{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(160deg,#040714,#0d1022);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.xw15 *{box-sizing:border-box}
.xw15 h4{margin:0 0 4px;font-size:16px}
.xw15 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:12px}
.xw15 .ctrl{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px}
@media(min-width:560px){.xw15 .ctrl{grid-template-columns:1fr 1fr}}
.xw15 label{display:block;font-size:13px;color:var(--mut,#9aa3c7)}
.xw15 label b{color:var(--txt,#eef1ff);font-weight:600}
.xw15 input[type=range]{width:100%;margin:6px 0 0;accent-color:var(--acc2,#06b6d4)}
.xw15 canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02)}
.xw15 .leg{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--mut,#9aa3c7);margin:6px 0 10px}
.xw15 .leg i{display:inline-block;width:14px;height:3px;vertical-align:middle;margin-right:4px;border-radius:2px}
.xw15 .costs{display:grid;gap:6px;margin-bottom:10px}
.xw15 .row{display:grid;grid-template-columns:minmax(120px,1.4fr) 2fr auto;gap:8px;align-items:center;font-size:13px}
.xw15 .bar{height:10px;border-radius:5px;background:rgba(255,255,255,.06);overflow:hidden}
.xw15 .bar i{display:block;height:100%;border-radius:5px;transition:width .35s}
.xw15 .num{font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px;white-space:nowrap}
.xw15 .aha{border-radius:10px;padding:10px 12px;margin:8px 0 12px;font-size:13px;border:1px solid var(--line,rgba(154,163,199,.25))}
.xw15 .aha.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.08)}
.xw15 .aha.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.08)}
.xw15 .aha.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.08)}
.xw15 .sub{font-size:12px;color:var(--mut,#9aa3c7);margin:8px 0 6px}
.xw15 .btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.xw15 button{background:transparent;color:var(--txt,#eef1ff);border:1px solid var(--acc2,#06b6d4);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer}
.xw15 button:hover{background:rgba(6,182,212,.12)}
.xw15 textarea{width:100%;min-height:210px;margin-top:10px;background:rgba(0,0,0,.35);color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:10px;font:12px/1.4 var(--mono,ui-monospace,Menlo,monospace);resize:vertical}
</style>
<div class="xw15">
  <h4>Качели доверия: осмотр × вмешательство</h4>
  <div class="goal">Бот с честным перевесом торгует 56 дней. Один раз тихо ломается. Ты решаешь, как часто заглядывать и когда хватать руль. Найди режим, где и цена слепоты, и цена опеки — маленькие.</div>
  <div class="ctrl">
    <label>Как часто осматриваю бота: <b data-k="ivl"></b><input type="range" min="0" max="9" step="1" data-k="iv"></label>
    <label>Вмешиваюсь руками, если: <b data-k="thrl"></b><input type="range" min="0" max="7" step="1" data-k="thr"></label>
  </div>
  <canvas data-k="chart" height="230"></canvas>
  <div class="leg">
    <span><i style="background:${C.acc}"></i>твой капитал</span>
    <span><i style="background:${C.mut};height:2px"></i>«руки прочь + сбой найден мгновенно»</span>
    <span><i style="background:${C.bad}"></i>сбой живёт</span>
    <span style="color:${C.warn}">✕ вмешательство «по голове»</span>
    <span style="color:${C.ok}">● сбой найден</span>
    <span>| осмотр</span>
  </div>
  <div class="costs" data-k="costs"></div>
  <div class="aha" data-k="aha"></div>
  <div class="sub">Карта режимов: средняя цена за 56 дней по 24 сценариям сбоя. Клик по клетке ставит ползунки. Рамка — твой режим, точка — лучший.</div>
  <canvas data-k="map" height="230"></canvas>
  <div class="btns">
    <button data-k="new">Новый раунд (другой сбой)</button>
    <button data-k="art">Собрать артефакт «Мой режим доверия»</button>
    <button data-k="copy" hidden>Скопировать</button>
  </div>
  <textarea data-k="artout" readonly hidden></textarea>
</div>`;

  const $ = k => box.querySelector('[data-k="' + k + '"]');
  const chart = $('chart'), map = $('map');
  const fit = (cv, h) => { const w = Math.max(300, box.clientWidth - 30); const dpr = window.devicePixelRatio || 1;
    cv.width = w*dpr; cv.height = h*dpr; cv.style.height = h + 'px'; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w, h }; };

  /* ---- график капитала ---- */
  const drawChart = () => {
    const r = st.res, { c, w, h } = fit(chart, 230);
    const L = 46, R = 12, T = 12, B = 24, pw = w - L - R, ph = h - T - B;
    const pct = v => (v - 1)*100;
    const all = r.path.concat(r.refPath).map(pct);
    let lo = Math.min.apply(null, all), hi = Math.max.apply(null, all); const pad = (hi - lo)*0.12 + 0.5; lo -= pad; hi += pad;
    const x = d => L + pw*d/DAYS, y = v => T + ph*(1 - (v - lo)/(hi - lo));
    c.clearRect(0, 0, w, h);
    // сетка
    c.strokeStyle = C.line; c.fillStyle = C.mut; c.font = '11px system-ui'; c.lineWidth = 1;
    const step = (hi - lo) > 24 ? 10 : (hi - lo) > 12 ? 5 : 2;
    for(let v = Math.ceil(lo/step)*step; v <= hi; v += step){ c.beginPath(); c.moveTo(L, y(v)); c.lineTo(w - R, y(v)); c.stroke(); c.fillText((v > 0 ? '+' : '') + v + '%', 4, y(v) + 4); }
    for(let d = 0; d <= DAYS; d += 7){ c.fillText('д' + d, x(d) - 8, h - 6); }
    // зона сбоя
    const end = r.detect || DAYS;
    c.fillStyle = 'rgba(239,68,68,.16)'; c.fillRect(x(r.fail), T, x(end) - x(r.fail), ph);
    // осмотры
    c.strokeStyle = C.mut; r.insp.forEach(d => { c.beginPath(); c.moveTo(x(d), h - B); c.lineTo(x(d), h - B - 6); c.stroke(); });
    // эталон
    c.setLineDash([4, 4]); c.strokeStyle = C.mut; c.lineWidth = 1.5; c.beginPath();
    r.refPath.forEach((v, d) => d ? c.lineTo(x(d), y(pct(v))) : c.moveTo(x(d), y(pct(v)))); c.stroke(); c.setLineDash([]);
    // факт
    c.strokeStyle = C.acc; c.lineWidth = 2.2; c.beginPath();
    r.path.forEach((v, d) => d ? c.lineTo(x(d), y(pct(v))) : c.moveTo(x(d), y(pct(v)))); c.stroke();
    // маркеры
    r.ints.forEach(d => { const px = x(d), py = y(pct(r.path[d])); c.strokeStyle = C.warn; c.lineWidth = 2; c.beginPath(); c.moveTo(px - 5, py - 5); c.lineTo(px + 5, py + 5); c.moveTo(px + 5, py - 5); c.lineTo(px - 5, py + 5); c.stroke(); });
    { const px = x(r.fail), py = y(pct(r.path[r.fail])); c.fillStyle = C.bad; c.beginPath(); c.moveTo(px, py - 7); c.lineTo(px + 6, py); c.lineTo(px, py + 7); c.lineTo(px - 6, py); c.closePath(); c.fill(); }
    if(r.detect){ const px = x(r.detect), py = y(pct(r.path[r.detect])); c.fillStyle = C.ok; c.beginPath(); c.arc(px, py, 5, 0, Math.PI*2); c.fill(); }
    else { c.fillStyle = C.bad; c.font = '12px system-ui'; c.fillText('сбой так и не найден', Math.min(x(r.fail) + 6, w - 150), T + 14); }
  };

  /* ---- карта режимов ---- */
  const cellGeom = () => { const w = Math.max(300, box.clientWidth - 30), h = 230, L = 44, B = 26, T = 8, R = 8;
    return { w, h, L, B, T, R, cw: (w - L - R)/INTERVALS.length, ch: (h - T - B)/THRESH.length }; };
  const heat = v => { const t = Math.min(1, Math.max(0, (Math.log(v) - Math.log(gMin))/(Math.log(gMax) - Math.log(gMin))));
    const a = t < 0.5 ? [34,197,94] : [234,179,8], b = t < 0.5 ? [234,179,8] : [239,68,68], k = t < 0.5 ? t*2 : (t - 0.5)*2;
    return 'rgb(' + a.map((q, i) => Math.round(q + (b[i] - q)*k)).join(',') + ')'; };
  const drawMap = () => {
    const g = cellGeom(), { c } = fit(map, g.h);
    c.clearRect(0, 0, g.w, g.h); c.font = '11px system-ui';
    grid.forEach((row, ti) => row.forEach((v, ii) => {
      const x0 = g.L + ii*g.cw, y0 = g.T + ti*g.ch;
      c.fillStyle = heat(v); c.globalAlpha = 0.85; c.fillRect(x0 + 1, y0 + 1, g.cw - 2, g.ch - 2); c.globalAlpha = 1;
      if(v <= gMin*1.3){ c.strokeStyle = C.ok; c.lineWidth = 1.5; c.strokeRect(x0 + 2, y0 + 2, g.cw - 4, g.ch - 4); }
      if(g.cw > 34){ c.fillStyle = 'rgba(0,0,0,.65)'; c.fillText(Math.round(v/100)/10 + 'к', x0 + 4, y0 + g.ch/2 + 4); }
    }));
    c.fillStyle = C.mut;
    INTERVALS.forEach((d, ii) => c.fillText(ivShort(d), g.L + ii*g.cw + g.cw/2 - 8, g.h - 8));
    THRESH.forEach((t, ti) => c.fillText(thrShort(t), 4, g.T + ti*g.ch + g.ch/2 + 4));
    c.fillStyle = C.mut; c.fillText('осмотр →', g.w - 60, g.h - 8);
    // лучший
    c.fillStyle = C.txt; c.beginPath(); c.arc(g.L + best.ii*g.cw + g.cw/2, g.T + best.ti*g.ch + g.ch/2, 3.5, 0, Math.PI*2); c.fill();
    // текущий
    c.strokeStyle = C.txt; c.lineWidth = 2.5; c.strokeRect(g.L + st.iv*g.cw + 1.5, g.T + st.thr*g.ch + 1.5, g.cw - 3, g.ch - 3);
  };
  map.addEventListener('click', e => { const g = cellGeom(), rc = map.getBoundingClientRect();
    const ii = Math.floor((e.clientX - rc.left - g.L)/g.cw), ti = Math.floor((e.clientY - rc.top - g.T)/g.ch);
    if(ii >= 0 && ii < INTERVALS.length && ti >= 0 && ti < THRESH.length){ st.iv = ii; st.thr = ti; $('iv').value = ii; $('thr').value = ti; render(); } });

  /* ---- цены и «ага» ---- */
  const renderCosts = () => {
    const r = st.res, scale = Math.max(r.total, gMax)*1.05;
    const rows = [
      ['Цена слепоты — сбой жил ' + r.brokenDays + ' дн.', r.blind, C.bad],
      ['Цена опеки — вмешательств: ' + r.nInt, r.care, C.warn],
      ['Цена внимания — осмотров: ' + r.nInsp + ' × ' + ATTENTION + ' ₽', r.attention, C.mut],
      ['Итого цена режима', r.total, C.acc]];
    $('costs').innerHTML = rows.map(q => '<div class="row"><span>' + q[0] + '</span><div class="bar"><i style="width:' + (100*q[1]/scale).toFixed(1) + '%;background:' + q[2] + '"></i></div><span class="num">' + rub(q[1]) + '</span></div>').join('')
      + '<div class="row"><span>Ментальный капитал потрачен</span><div class="bar"><i style="width:' + Math.min(100, r.nerves) + '%;background:' + C.warn + '"></i></div><span class="num">' + r.nerves + ' ед. из 100</span></div>';
    const iv = INTERVALS[st.iv], thr = THRESH[st.thr], mapV = grid[st.thr][st.iv], green = mapV <= gMin*1.3;
    const el = $('aha'); let cls = 'warn', txt = '';
    if(green){ cls = 'ok'; txt = '<b>Ага.</b> Ты в зелёной полосе — она узкая: осмотр раз в 2–7 дней и вмешательство только по факту мира. Средняя цена режима ' + rub(mapV) + ' (лучший ' + rub(best.v) + '). Слева от полосы — «ничего не смотрю», справа — «дёргаю руль на минусе». Обе дорогие.'; }
    else if(iv >= 14 && thr === 0){ cls = 'bad'; txt = '<b>Слепая вера.</b> Ты не трогаешь бота — хорошо, но и не осматриваешь: сбой прожил ' + r.brokenDays + ' дн. и стоил ' + rub(r.blind) + '. Осмотр — это не вмешательство: пять галочек раз в неделю нашли бы поломку за дни.'; }
    else if(thr > 0 && thr < DD95){ cls = 'bad'; txt = '<b>Вечно сомневающийся рулевой.</b> Порог ' + Math.round(thr*100) + '% ниже обычной плохой погоды исправного бота (95-й процентиль просадки за 8 недель ≈ ' + (DD95*100).toFixed(1) + '%). Каждый раз ты отменял решения машины по знаку PnL: ' + r.nInt + ' вмешательств — ' + rub(r.care) + ' плюс нервы. Минус на экране — не факт мира.'; }
    else if(iv === 1){ txt = 'Ежедневный осмотр без вмешательств — не катастрофа, но ты платишь вниманием ' + rub(r.attention) + ' и приучаешь себя заглядывать. Попробуй реже: ищи полосу, где итог минимален.'; }
    else if(iv >= 14){ txt = 'Редкие осмотры: сбой живёт долго (' + r.brokenDays + ' дн.). Сдвинь частоту осмотров влево и посмотри, как падает цена слепоты.'; }
    else { txt = 'Порог выше нормальной погоды (' + (DD95*100).toFixed(1) + '%) срабатывает редко — но сработает именно в худший день. Сравни с «только по факту»: разница — цена одной ложной тревоги.'; }
    el.className = 'aha ' + cls; el.innerHTML = txt;
  };

  const render = () => {
    st.res = simulate(st.scn, INTERVALS[st.iv], THRESH[st.thr]);
    $('ivl').textContent = ivLabel(INTERVALS[st.iv]); $('thrl').textContent = thrLabel(THRESH[st.thr]);
    raf(() => { drawChart(); drawMap(); }); renderCosts();
  };

  /* ---- события ---- */
  $('iv').value = st.iv; $('thr').value = st.thr;
  $('iv').addEventListener('input', e => { st.iv = +e.target.value; render(); });
  $('thr').addEventListener('input', e => { st.thr = +e.target.value; render(); });
  $('new').addEventListener('click', () => { st.seed = (Date.now() % 1000000000) | 0; st.scn = makeScenario(st.seed); render(); });
  $('art').addEventListener('click', () => {
    const r = st.res, d = new Date();
    const txt = 'МОЙ РЕЖИМ ДОВЕРИЯ (урок П2) — ' + d.toLocaleDateString('ru-RU') + '\n\n' +
      '1. ОСМОТР — по расписанию: ' + ivLabel(INTERVALS[best.ii]) + ' (карта режимов), пять галочек: журнал ошибок пуст? сделки по плану? результат в пределах болтанки? издержки не поползли? биржа/инструмент не поменяли правила?\n' +
      '2. РУКИ — только по факту мира: нет связи с биржей, цены в боте не совпадают с биржей, ошибка API, я сам менял код. Знак PnL — не факт.\n' +
      '3. ПОГОДА — просадка до ' + (DD95*100).toFixed(1) + '% за 8 недель (95-й процентиль исправного бота) — норма, а не поломка. Всё, что глубже, останавливает не рука, а автоматический kill-switch; разбор — днём, на плановом осмотре.\n' +
      '4. ПЕРЕСМОТР СТРАТЕГИИ — в плановую дату (раз в квартал), как замена масла. Плохая неделя вне даты — не повод.\n\n' +
      'Числа последнего прогона (seed ' + st.seed + '): режим «' + ivLabel(INTERVALS[st.iv]) + '» × «' + thrLabel(THRESH[st.thr]) + '». Сбой на день ' + r.fail + ', найден ' + (r.detect ? 'на день ' + r.detect : 'не найден') + ' (жил ' + r.brokenDays + ' дн.). Цена слепоты ' + rub(r.blind) + ', вмешательств ' + r.nInt + ' (' + rub(r.care) + '), осмотров ' + r.nInsp + ' (' + rub(r.attention) + '), итого ' + rub(r.total) + ', ментальный капитал ' + r.nerves + ' ед.\n' +
      'Средняя цена моего режима по карте: ' + rub(grid[st.thr][st.iv]) + '; лучший режим: «' + ivLabel(INTERVALS[best.ii]) + '» × «' + thrLabel(THRESH[best.ti]) + '» — ' + rub(best.v) + '.\n' +
      'Модель иллюстративная: капитал 100 000 ₽, перевес +0,15%/день, σ 1,5%, сбой −0,4%/день, вмешательство = 3 дня простоя + 0,3% трения, осмотр = 40 ₽ внимания.';
    const ta = $('artout'); ta.value = txt; ta.hidden = false; $('copy').hidden = false; ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('copy').addEventListener('click', () => { const ta = $('artout'); ta.select();
    const done = () => { $('copy').textContent = 'Скопировано ✓'; later(() => { $('copy').textContent = 'Скопировать'; }, 1500); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand('copy'); done(); }); }
    else { document.execCommand('copy'); done(); } });

  box._expResize = () => raf(() => { drawChart(); drawMap(); });
  window.addEventListener('resize', box._expResize);
  render();
};
