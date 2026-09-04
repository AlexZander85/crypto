/*
 * W-25 · widget_ps_l12_mental_battery · П12 «Ментальный капитал»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что каждое решение дня (не только торговое) разряжает одну и ту же батарею, и что правка
 *   Задание:  1) прожить день с дефолтной нагрузкой и заметить час, когда батарея входит в красную зону; 2) двигая
 *   Ага:      при переносе ползунка за 15:00–16:00 рука на ползунке начинает дрожать, батарея краснеет, а в 20
 *   Дефолты:  заряд 100% (сон 8 ч) / 72% (сон 5 ч); 18 микрорешений по расписанию; лента новостей −3.5% ×6;
 *   Артефакт: «Правка в HH:MM · заряд NN% · ошибок K/20 · тишина: вкл/выкл · сон: 8ч/5ч» → expert:artifact + box.dataset.artifact.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_ps_l12_mental_battery'] = function (box) {
  // ── 0. чистим прошлый запуск ─────────────────────────────────────────
  if (box._expTimers) box._expTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  if (box._expRaf) cancelAnimationFrame(box._expRaf);
  if (box._expResize) window.removeEventListener('resize', box._expResize);
  box._expTimers = []; box._expRaf = null;

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const SEED = 42;

  const cs = getComputedStyle(box);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  const C = { txt: v('--txt', '#eef1ff'), mut: v('--mut', '#9aa3c7'), line: v('--line', 'rgba(255,255,255,.14)'),
              acc: v('--acc2', '#06b6d4'), ok: v('--ok', '#22c55e'), bad: v('--bad', v('--err', '#ef4444')),
              warn: v('--warn', '#eab308') };

  // ── модель дня ───────────────────────────────────────────────────────
  // [час, подпись, стоимость %, тип: m — микрорешение, n — лента, t — терминал, r — восстановление]
  const EVENTS = [
    [7.0, 'подъём: что надеть, что есть', 1.5, 'm'], [7.6, 'маршрут до работы', 1, 'm'], [8.2, 'почта: 12 ответов', 3, 'm'],
    [9.0, 'планёрка, спор с коллегой', 3, 'm'], [10.2, 'выбор между тремя задачами', 2, 'm'], [11.1, 'звонок банка: перевыпуск карты', 2, 'm'],
    [12.1, 'обед: где и что', 1.5, 'm'], [12.6, 'прогулка 20 минут', -4, 'r'], [13.3, 'спор в семейном чате', 3, 'm'],
    [14.1, 'отчёт: шесть правок', 3, 'm'], [15.2, '«срочно посмотри» от друга', 2, 'm'], [16.1, 'покупки: сравнение вариантов', 2, 'm'],
    [17.2, 'дорога домой', 1, 'm'], [18.1, 'ужин, дети, уроки', 3, 'm'], [19.3, 'что смотреть вечером', 1, 'm'],
    [20.2, 'разговор о деньгах с партнёром', 3, 'm'], [21.4, 'рабочее письмо «на минутку»', 2, 'm'], [22.3, 'сериал или сон?', 1, 'm'],
  ];
  const NEWS = [8.5, 10.6, 12.9, 15.6, 17.6, 20.6].map(h => [h, 'лента новостей 15 минут', 3.5, 'n']);
  const TERM = [8, 10, 12, 14, 16, 18, 20, 22].map(h => [h + 0.3, 'глянул график бота', 2, 't']);
  const ERR = ['stake 150 → 1500 (лишний ноль)', 'dry_run: true → false (не тот файл)', 'stoploss −0.10 → −0.01 (сдвинул точку)',
               'pair_whitelist ↔ pair_blacklist перепутаны', 'сохранил, не прогнав show-config', 'max_open_trades 3 → 30'];
  const ZONE = c => c >= 65 ? 0 : c >= 45 ? 1 : 2;               // 0 зелёная, 1 жёлтая, 2 красная
  const PERR = [0.04, 0.08, 0.16], ZCOL = [C.ok, C.warn, C.bad], ZNAME = ['свежая голова', 'устал', 'разряжен'];

  let sleep5 = false, silence = false, hour = 9, playing = false, pt = 6, lastTs = 0, hist = [];
  const schedule = () => (silence ? EVENTS.slice() : EVENTS.concat(NEWS, TERM)).sort((a, b) => a[0] - b[0]);
  function charge(t) {
    let c = (sleep5 ? 72 : 100) - (sleep5 ? 2.1 : 1.5) * Math.max(0, t - 6);
    for (const e of schedule()) if (e[0] <= t) c -= e[2];
    return Math.max(0, Math.min(100, c));
  }
  const fmt = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;

  // ── разметка ─────────────────────────────────────────────────────────
  box.innerHTML = `
  <style>
    .w25{font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${C.txt};background:linear-gradient(180deg,#0d1022,#040714);
         border:1px solid ${C.line};border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
    .w25 *{box-sizing:border-box}
    .w25-head b{font-size:15px;display:block;margin-bottom:2px} .w25-head span{color:${C.mut}}
    .w25-ctl,.w25-row{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:10px 0}
    .w25 label{color:${C.mut};display:flex;gap:5px;align-items:center;cursor:pointer}
    .w25 button{font:inherit;color:${C.txt};background:transparent;border:1px solid ${C.line};border-radius:8px;padding:6px 10px;cursor:pointer}
    .w25 button:hover{border-color:${C.acc}}
    .w25 button.pri{background:${C.acc};color:#04121a;border-color:${C.acc};font-weight:600}
    .w25 canvas{display:block;width:100%;border-radius:10px;background:#0a0e1e}
    .w25-slider{margin:8px 0} .w25-slider input{width:100%;accent-color:${C.acc};margin-top:4px}
    .w25-slider b{color:${C.acc};font-family:ui-monospace,Menlo,Consolas,monospace}
    .w25-p{font-family:ui-monospace,Menlo,Consolas,monospace;color:${C.mut}}
    .w25-grid{display:grid;grid-template-columns:repeat(20,1fr);gap:3px;margin:8px 0}
    .w25-grid i{display:block;aspect-ratio:1;border-radius:3px;background:${C.ok}} .w25-grid i.e{background:${C.bad}}
    .w25-errs{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:${C.bad}}
    .w25-verdict{padding:10px 12px;border-left:3px solid ${C.acc};background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;margin:8px 0;min-height:20px}
    .w25-verdict b{color:${C.acc}}
    .w25-hist{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
    .w25-hist td,.w25-hist th{padding:4px 6px;border-bottom:1px solid ${C.line};text-align:left;color:${C.mut}}
    .w25-hist td.n{font-family:ui-monospace,Menlo,monospace;color:${C.txt}}
    .w25-art{margin-top:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:${C.mut}}
  </style>
  <div class="w25">
    <div class="w25-head"><b>Батарейка решений</b>
      <span>Цель: увидеть, что каждое решение дня разряжает одну батарею — и правка конфига вечером делается разряженной головой.</span></div>
    <div class="w25-ctl">
      <label><input type="checkbox" class="w25-sleep"> сон 5 часов вместо 8</label>
      <label><input type="checkbox" class="w25-silence"> информационная тишина (без ленты и подглядываний)</label>
      <button class="w25-play">Прожить день ▶</button>
    </div>
    <canvas></canvas>
    <div class="w25-slider"><label>Во сколько трогаешь конфиг бота: <b class="w25-hh">09:00</b></label>
      <input type="range" min="6" max="23.5" step="0.5" value="9"></div>
    <div class="w25-row"><button class="w25-run pri">Прогнать 20 правок конфига</button><span class="w25-p"></span></div>
    <div class="w25-res"></div>
    <div class="w25-verdict">Задание: сначала прогони правку в 09:00, потом передвинь ползунок на 21:00 и прогони ещё раз.</div>
    <table class="w25-hist"></table>
    <div class="w25-art"></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d'); let W = 0, H = 0;
  const slider = $('.w25-slider input');

  // ── рисование ────────────────────────────────────────────────────────
  function resize() {
    const w = Math.max(320, (box.clientWidth || 360) - 30), h = w < 480 ? 300 : 280;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h;
  }
  const padL = 34, padR = 16;
  const X = h => padL + (h - 6) / 18 * (W - padL - padR);
  function draw(ts) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const c = playing ? charge(pt) : charge(hour), z = ZONE(c);
    // батарея
    const bx = 16, by = 14, bw = W - 60, bh = 30;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh); ctx.fillStyle = C.line; ctx.fillRect(bx + bw + 2, by + 9, 5, 12);
    ctx.fillStyle = ZCOL[z]; ctx.shadowColor = ZCOL[z]; ctx.shadowBlur = z === 2 ? 14 : 4;
    ctx.fillRect(bx + 3, by + 3, (bw - 6) * c / 100, bh - 6); ctx.shadowBlur = 0;
    ctx.fillStyle = C.txt; ctx.font = '700 13px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(c)}%  · ${ZNAME[z]} · ${playing ? fmt(Math.floor(pt * 2) / 2) : fmt(hour)}`, bx + 8, by + bh / 2);
    // шкала времени
    const top = 66, bot = H - 26, Y = val => bot - val / 100 * (bot - top);
    ctx.fillStyle = 'rgba(239,68,68,.10)'; ctx.fillRect(padL, Y(45), W - padL - padR, bot - Y(45));
    ctx.fillStyle = 'rgba(234,179,8,.07)'; ctx.fillRect(padL, Y(65), W - padL - padR, Y(45) - Y(65));
    ctx.font = '10px system-ui'; ctx.fillStyle = C.mut; ctx.textAlign = 'right';
    [0, 45, 65, 100].forEach(val => ctx.fillText(val, padL - 4, Y(val)));
    ctx.textAlign = 'center';
    for (let h = 6; h <= 24; h += 3) { ctx.fillText(h + ':00', X(h), bot + 12); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(h), top); ctx.lineTo(X(h), bot); ctx.stroke(); }
    // кривая заряда (до плейхеда, если день проигрывается)
    const end = playing ? pt : 24;
    ctx.beginPath(); for (let h = 6; h <= end + 1e-9; h += 0.1) { const x = X(Math.min(h, 24)), y = Y(charge(h)); h === 6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.stroke();
    // события
    schedule().forEach(e => { if (e[0] > end) return;
      ctx.fillStyle = e[3] === 'm' ? C.mut : e[3] === 'n' ? C.warn : e[3] === 't' ? C.acc : C.ok;
      ctx.beginPath(); ctx.arc(X(e[0]), Y(charge(e[0])), 3, 0, 6.283); ctx.fill(); });
    if (playing) { ctx.strokeStyle = C.txt; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(pt), top); ctx.lineTo(X(pt), bot); ctx.stroke(); ctx.setLineDash([]); }
    // маркер правки конфига + дрожащая рука
    const hc = charge(hour), hz = ZONE(hc), amp = hz === 0 ? 0 : (65 - hc) / 65 * 7;
    const jx = amp * Math.sin(ts * 0.031) + amp * .6 * Math.sin(ts * 0.077), jy = amp * Math.cos(ts * 0.043) + amp * .5 * Math.sin(ts * 0.061);
    const mx = X(hour), my = Y(hc);
    ctx.strokeStyle = ZCOL[hz]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, bot); ctx.stroke();
    // рука-курсор
    const hx = mx + jx + 4, hy = my + jy - 4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 17); ctx.lineTo(hx + 4, hy + 13); ctx.lineTo(hx + 7, hy + 19); ctx.lineTo(hx + 10, hy + 17);
    ctx.lineTo(hx + 7, hy + 12); ctx.lineTo(hx + 12, hy + 12); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = ZCOL[hz]; ctx.font = '600 11px system-ui'; ctx.textAlign = mx > W / 2 ? 'right' : 'left';
    ctx.fillText(`правка в ${fmt(hour)} · заряд ${Math.round(hc)}% · p(ошибки) ${Math.round(PERR[hz] * 100)}%${amp > 3 ? ' · рука дрожит' : ''}`, mx + (mx > W / 2 ? -8 : 8), top + 8);
    ctx.textAlign = 'left'; ctx.fillStyle = C.mut; ctx.font = '10px system-ui';
    ctx.fillText('● микрорешение  ● лента  ● терминал  ● прогулка', padL, H - 4);
  }

  // ── цикл ─────────────────────────────────────────────────────────────
  function frame(ts) {
    const dt = Math.min(64, ts - lastTs || 16); lastTs = ts;
    if (playing) { pt += dt / 2000; if (pt >= 24) { pt = 24; playing = false; $('.w25-play').textContent = 'Прожить день заново ▶'; } }
    draw(ts); box._expRaf = requestAnimationFrame(frame);
  }

  // ── 20 попыток правки ────────────────────────────────────────────────
  function run(h) {
    const c = charge(h), z = ZONE(c), p = PERR[z];
    const rnd = mulberry32(SEED * 7919 + Math.round(h * 10) * 31 + (sleep5 ? 3 : 0) + (silence ? 5 : 0));
    const res = []; for (let i = 0; i < 20; i++) res.push(rnd() < p ? ERR[Math.floor(rnd() * ERR.length)] : null);
    return { h, c, z, p, res, errs: res.filter(Boolean).length };
  }
  function doRun() {
    const r = run(hour), ref = run(9);
    $('.w25-res').innerHTML = `<div class="w25-grid">${r.res.map(e => `<i class="${e ? 'e' : ''}"></i>`).join('')}</div>`
      + `<div class="w25-errs">${r.res.map((e, i) => e ? `попытка ${i + 1}: ${e}` : null).filter(Boolean).join('<br>') || '<span style="color:' + C.ok + '">без ошибок</span>'}</div>`;
    const cmp = hour === 9 ? 'Теперь передвинь ползунок на 21:00 и прогони ещё раз.'
      : `Та же правка в 09:00 (заряд ${Math.round(ref.c)}%) — ${ref.errs} из 20. ${r.errs > ref.errs ? 'Разница — не в знаниях, а в заряде.' : 'Сегодня повезло; вероятность ошибки всё равно ' + Math.round(r.p * 100) + '% против ' + Math.round(ref.p * 100) + '%.'}`;
    $('.w25-verdict').innerHTML = `<b>${fmt(hour)} · заряд ${Math.round(r.c)}% (${ZNAME[r.z]})</b> → ошибок ${r.errs} из 20 при p = ${Math.round(r.p * 100)}%. ${cmp} Одна ошибка в конфиге = реальные деньги (FT-04). Вечер — время журнала, не хирургии.`;
    hist.unshift(r); hist = hist.slice(0, 5);
    $('.w25-hist').innerHTML = `<tr><th>час правки</th><th>заряд</th><th>ошибок / 20</th><th>условия</th></tr>` +
      hist.map(x => `<tr><td class="n">${fmt(x.h)}</td><td class="n" style="color:${ZCOL[x.z]}">${Math.round(x.c)}%</td><td class="n">${x.errs}</td><td>${silence ? 'тишина' : 'лента+терминал'}, сон ${sleep5 ? '5' : '8'} ч</td></tr>`).join('');
    const txt = `Правка в ${fmt(hour)} · заряд ${Math.round(r.c)}% · ошибок ${r.errs}/20 · тишина: ${silence ? 'вкл' : 'выкл'} · сон: ${sleep5 ? '5ч' : '8ч'}`;
    box.dataset.artifact = txt; $('.w25-art').textContent = 'Артефакт: ' + txt;
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: { id: 'widget_ps_l12_mental_battery', text: txt } }));
  }
  const showP = () => { const c = charge(hour); $('.w25-p').textContent = `заряд в ${fmt(hour)}: ${Math.round(c)}% · p(ошибки) ${Math.round(PERR[ZONE(c)] * 100)}%`; };

  // ── события UI ───────────────────────────────────────────────────────
  slider.addEventListener('input', () => { hour = +slider.value; $('.w25-hh').textContent = fmt(hour); showP(); });
  $('.w25-sleep').addEventListener('change', e => { sleep5 = e.target.checked; showP(); });
  $('.w25-silence').addEventListener('change', e => { silence = e.target.checked; showP(); });
  $('.w25-play').addEventListener('click', () => { pt = 6; playing = true; $('.w25-play').textContent = 'Проживаем…'; });
  $('.w25-run').addEventListener('click', doRun);
  box._expResize = resize; window.addEventListener('resize', resize);

  resize(); showP(); pt = 6; playing = true; $('.w25-play').textContent = 'Проживаем…';
  box._expRaf = requestAnimationFrame(frame);
};
