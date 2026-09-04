/*
 * W-19 · widget_ps_l6_dopamine_detector · П6 «Качели как сахар»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     прочувствовать, что «тяга к действию» растёт от яркости движения, а не от пользы события; скука при работающей системе — норма.
 *   Задание:  за 36 событий (~1 мин) удержать бота работающим, не кормя качели: каждый импульс «глянуть» — плюсик; тягу не подавлять, а пересаживать (журнал/движение); единственное полезное событие («мир») — поймать кнопкой «Проверить факт».
 *   Ага:      график тяги повторяет жёлтые всплески яркости и никак не реагирует на красный ромб пользы (r с яркостью ≫ r с пользой); полезных событий 1–2 из 36; плюсиков — сравнимо с недельными 40–60 у новичка; каждая «сделка для тонуса» имеет цену в деньгах.
 *   Дефолты:  36 событий по 1,5 с; бот +0,05%/событие (+50 ₽ на 100 000 ₽); ручная сделка EV −0,3% ± 1,5%; полезных событий 1–2 (3 ошибки API подряд), окно реакции — 3 события; пропуск факта = бот виснет, −0,6%; seed 42; спокойствие 100; тяга 10.
 *   Артефакт: правило «Тяга пересаживается, а не подавляется: журнал, движение, разбор кейса. Ручные сделки при работающем боте — не больше одной в квартал и только с письменным „почему это система, а не тяга“» + метрики сессии.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l6_dopamine_detector'] = function(box){
  /* 0. чистим прошлый запуск */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const gauss = rnd => { let u = 0, v = 0; while(u === 0) u = rnd(); while(v === 0) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* канон */
  const N = 36, STEP = 1500, CAP = 100000, BOT = 0.0005, MEV = -0.003, MSIG = 0.015, MISS = 0.006;
  const rub = v => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.round(Math.abs(v)).toLocaleString('ru-RU') + ' ₽';
  const cssv = (n, f) => { const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: cssv('--txt','#eef1ff'), mut: cssv('--mut','#9aa3c7'), line: cssv('--line','rgba(154,163,199,.25)'),
              acc: cssv('--acc2','#06b6d4'), ok: cssv('--ok','#22c55e'), bad: cssv('--bad','#ef4444'), warn: cssv('--warn','#eab308') };

  /* раунд */
  const PAIRS = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE'];
  const genRound = seed => {
    const rnd = mulberry32(seed); const useful = rnd() < 0.5 ? 2 : 1; const starts = [];
    while(starts.length < useful){ const s = 4 + Math.floor(rnd()*(N - 8)); if(starts.every(x => Math.abs(x - s) > 5)) starts.push(s); }
    const ev = [];
    for(let i = 0; i < N; i++){
      let move = gauss(rnd)*0.5; if(rnd() < 0.18) move += (rnd() < 0.5 ? -1 : 1)*(1.5 + 2.5*rnd());
      move = clamp(move, -5, 5);
      const u = starts.filter(s => i >= s && i < s + 3)[0];
      const isU = u !== undefined;
      ev.push({ i, move: isU ? 0 : move, bright: isU ? 0.25 : Math.min(4, Math.abs(move)), pair: PAIRS[Math.floor(rnd()*PAIRS.length)],
                useful: isU, uStart: isU ? u : -1, uIdx: isU ? i - u : -1, manualZ: gauss(rnd) });
    }
    return { seed, ev, starts };
  };

  const st = { seed: 42, round: null, idx: -1, running: false, done: false, craving: 10, calm: 100,
               botPnl: 0, manPnl: 0, peeks: 0, manuals: 0, reroutes: 0, reCool: 0, caught: [], missed: [],
               S: { craving: [], calm: [], bright: [], useful: [] }, marks: [], timer: null, msg: '' };

  box.innerHTML = `
<style>
.xw19{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(160deg,#040714,#0d1022);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.xw19 *{box-sizing:border-box}
.xw19 h4{margin:0 0 4px;font-size:16px}
.xw19 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:12px}
.xw19 .stage{position:relative;border-radius:10px;padding:14px 12px;min-height:84px;border:1px solid var(--line,rgba(154,163,199,.25));background:rgba(255,255,255,.02);transition:box-shadow .25s,border-color .25s;margin-bottom:8px}
.xw19 .stage .big{font-size:22px;font-weight:700;font-family:var(--mono,ui-monospace,Menlo,monospace)}
.xw19 .stage .small{font-size:12px;color:var(--mut,#9aa3c7);margin-top:4px}
.xw19 .stage .cnt{position:absolute;right:10px;top:8px;font-size:11px;color:var(--mut,#9aa3c7)}
.xw19 .meters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.xw19 .m{font-size:12px;color:var(--mut,#9aa3c7)}
.xw19 .m b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,monospace)}
.xw19 .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:3px}
.xw19 .bar i{display:block;height:100%;border-radius:5px;transition:width .3s}
.xw19 .acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
@media(min-width:560px){.xw19 .acts{grid-template-columns:repeat(4,1fr)}}
.xw19 button{background:transparent;color:var(--txt,#eef1ff);border:1px solid var(--acc2,#06b6d4);border-radius:8px;padding:9px 8px;font-size:13px;cursor:pointer;line-height:1.2}
.xw19 button:hover:not(:disabled){background:rgba(6,182,212,.12)}
.xw19 button:disabled{opacity:.4;cursor:default}
.xw19 button.re{border-color:var(--ok,#22c55e)}
.xw19 button.man{border-color:var(--warn,#eab308)}
.xw19 button.fact{border-color:var(--bad,#ef4444)}
.xw19 .msg{min-height:20px;font-size:13px;color:var(--mut,#9aa3c7);margin:2px 0 8px}
.xw19 canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02)}
.xw19 .leg{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--mut,#9aa3c7);margin:6px 0 8px}
.xw19 .leg i{display:inline-block;width:12px;height:3px;vertical-align:middle;margin-right:4px;border-radius:2px}
.xw19 .stats{font-size:13px;display:grid;gap:4px;margin-top:6px}
.xw19 .stats .num{font-family:var(--mono,ui-monospace,Menlo,monospace)}
.xw19 .aha{border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px;border:1px solid var(--ok,#22c55e);background:rgba(34,197,94,.08)}
.xw19 .btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.xw19 textarea{width:100%;min-height:190px;margin-top:10px;background:rgba(0,0,0,.35);color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:10px;font:12px/1.4 var(--mono,ui-monospace,Menlo,monospace);resize:vertical}
</style>
<div class="xw19">
  <h4>Детектор тяги: минута у работающего бота</h4>
  <div class="goal">Бот исправен и зарабатывает по плану. Лента подкидывает яркие движения. Твоя задача — продержать бота включённым 36 событий, не кормя качели, и поймать единственное событие, которое требует тебя: 3 ошибки API подряд («мир»). Каждый импульс «глянуть» — плюсик в блокнот.</div>
  <div class="stage" data-k="stage"><div class="cnt" data-k="cnt">событие 0 / 36</div><div class="big" data-k="big">Нажми «Старт»</div><div class="small" data-k="sm">Бот: стоит, ждёт запуска</div></div>
  <div class="meters">
    <div class="m">Тяга к действию <b data-k="crv">10</b><div class="bar"><i data-k="crvb" style="background:${C.warn};width:10%"></i></div></div>
    <div class="m">Спокойствие <b data-k="clm">100</b><div class="bar"><i data-k="clmb" style="background:${C.acc};width:100%"></i></div></div>
  </div>
  <div class="acts">
    <button data-k="peek" disabled>Глянуть в терминал<br><span style="font-size:11px;opacity:.7">+1 плюсик</span></button>
    <button data-k="man" class="man" disabled>Сделка «для тонуса»<br><span style="font-size:11px;opacity:.7">EV −0,3% ± 1,5%</span></button>
    <button data-k="re" class="re" disabled>Пересадить тягу<br><span style="font-size:11px;opacity:.7">журнал / движение</span></button>
    <button data-k="fact" class="fact" disabled>Проверить факт<br><span style="font-size:11px;opacity:.7">только если «мир»</span></button>
  </div>
  <div class="msg" data-k="msg"></div>
  <canvas data-k="chart" height="210"></canvas>
  <div class="leg">
    <span><i style="background:${C.warn}"></i>яркость движения</span>
    <span><i style="background:#f472b6"></i>тяга</span>
    <span><i style="background:${C.acc}"></i>спокойствие</span>
    <span style="color:${C.bad}">◆ полезное событие («мир»)</span>
    <span>+ плюсик &nbsp; <span style="color:${C.warn}">₽</span> ручная сделка &nbsp; <span style="color:${C.ok}">↻</span> пересадка &nbsp; <span style="color:${C.ok}">✓</span> факт пойман</span>
  </div>
  <div class="stats" data-k="stats"></div>
  <div class="aha" data-k="aha" hidden></div>
  <div class="btns">
    <button data-k="start">Старт (seed 42)</button>
    <button data-k="new">Новый раунд</button>
    <button data-k="art" hidden>Собрать артефакт</button>
    <button data-k="copy" hidden>Скопировать</button>
  </div>
  <textarea data-k="artout" readonly hidden></textarea>
</div>`;

  const $ = k => box.querySelector('[data-k="' + k + '"]');
  const chart = $('chart');
  const fit = (cv, h) => { const w = Math.max(300, box.clientWidth - 30); const dpr = window.devicePixelRatio || 1;
    cv.width = w*dpr; cv.height = h*dpr; cv.style.height = h + 'px'; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w, h }; };
  const setActs = on => ['peek', 'man', 're', 'fact'].forEach(k => { $(k).disabled = !on; });
  const say = (t) => { st.msg = t; $('msg').textContent = t; };

  /* ---- график ---- */
  const draw = () => {
    const { c, w, h } = fit(chart, 210), L = 30, R = 8, T = 8, B = 20, bh = 56, gap = 14;
    const pw = w - L - R, x = i => L + pw*(i + 0.5)/N, sw = pw/N;
    const ly0 = T + bh + gap, lh = h - ly0 - B, y = v => ly0 + lh*(1 - v/100);
    c.clearRect(0, 0, w, h);
    // оси
    c.strokeStyle = C.line; c.lineWidth = 1; c.fillStyle = C.mut; c.font = '10px system-ui';
    [0, 50, 100].forEach(v => { c.beginPath(); c.moveTo(L, y(v)); c.lineTo(w - R, y(v)); c.stroke(); c.fillText(v, 4, y(v) + 3); });
    c.fillText('яркость', 4, T + 10);
    // будущие полезные события — ромбы видны заранее? нет: только пройденные
    const n = st.S.bright.length;
    for(let i = 0; i < n; i++){
      const b = st.S.bright[i]; c.fillStyle = C.warn; c.globalAlpha = 0.85;
      c.fillRect(x(i) - sw*0.35, T + bh - bh*b/4, sw*0.7, bh*b/4); c.globalAlpha = 1;
      if(st.S.useful[i]){ c.fillStyle = C.bad; const px = x(i), py = T + bh + 6; c.beginPath(); c.moveTo(px, py - 5); c.lineTo(px + 4, py); c.lineTo(px, py + 5); c.lineTo(px - 4, py); c.closePath(); c.fill(); }
    }
    const line = (arr, col, wd) => { if(arr.length < 1) return; c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); arr.forEach((v, i) => i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))); c.stroke(); };
    line(st.S.calm, C.acc, 1.6); line(st.S.craving, '#f472b6', 2.2);
    // маркеры действий
    c.font = 'bold 12px system-ui'; c.textAlign = 'center';
    st.marks.forEach(m => { const px = x(m.i), py = h - 6;
      if(m.t === 'peek'){ c.fillStyle = C.mut; c.fillText('+', px, py); }
      else if(m.t === 'man'){ c.fillStyle = C.warn; c.fillText('₽', px, py); }
      else if(m.t === 're'){ c.fillStyle = C.ok; c.fillText('↻', px, py); }
      else if(m.t === 'fact'){ c.fillStyle = C.ok; c.fillText('✓', px, py); }
      else if(m.t === 'miss'){ c.fillStyle = C.bad; c.fillText('✗', px, py); } });
    c.textAlign = 'start';
    if(st.running && st.idx >= 0){ c.strokeStyle = C.txt; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x(st.idx), T); c.lineTo(x(st.idx), h - B); c.stroke(); c.setLineDash([]); }
  };

  const meters = () => {
    $('crv').textContent = Math.round(st.craving); $('crvb').style.width = st.craving + '%';
    $('clm').textContent = Math.round(st.calm); $('clmb').style.width = st.calm + '%';
    $('stats').innerHTML =
      '<div>Бот, по плану: <span class="num">' + rub(st.botPnl) + '</span> · Ручные сделки: <span class="num">' + st.manuals + ' → ' + rub(st.manPnl) + '</span></div>' +
      '<div>Плюсиков «глянуть»: <span class="num">' + st.peeks + '</span> · Пересадок: <span class="num">' + st.reroutes + '</span> · Фактов поймано: <span class="num">' + st.caught.length + ' / ' + (st.round ? st.round.starts.length : 0) + '</span></div>';
  };

  const stage = e => {
    const s = $('stage');
    $('cnt').textContent = 'событие ' + (st.idx + 1) + ' / ' + N;
    if(e.useful){ s.style.borderColor = C.bad; s.style.boxShadow = 'none';
      $('big').innerHTML = '<span style="color:' + C.bad + '">◆</span> Ошибка API: timeout (' + (e.uIdx + 1) + '/3)';
      $('sm').textContent = 'Бот ждёт ответа биржи. Тускло, не ярко — но это единственное, что требует тебя.'; return; }
    const glow = e.bright/4; const col = e.move >= 0 ? C.ok : C.bad;
    s.style.borderColor = glow > 0.5 ? C.warn : 'var(--line,rgba(154,163,199,.25))';
    s.style.boxShadow = '0 0 ' + Math.round(4 + 36*glow) + 'px rgba(234,179,8,' + (0.05 + 0.5*glow).toFixed(2) + ')';
    $('big').innerHTML = e.pair + ' <span style="color:' + col + '">' + (e.move >= 0 ? '+' : '−') + Math.abs(e.move).toFixed(1) + '%</span> за минуту' + (glow > 0.6 ? ' <span style="font-size:14px;color:' + C.warn + '">!!!</span>' : '');
    $('sm').textContent = 'Бот: сделка по плану, ' + rub(CAP*BOT) + '. Для системы ничего не изменилось.';
  };

  const finish = () => {
    st.running = false; st.done = true; setActs(false); clearInterval(st.timer);
    // пропущенные окна, дожившие до конца
    st.round.starts.forEach(s => { if(!st.caught.includes(s) && !st.missed.includes(s)){ st.missed.push(s); st.botPnl -= CAP*MISS; st.marks.push({ i: Math.min(N - 1, s + 2), t: 'miss' }); } });
    const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0)/n, mb = b.reduce((x, y) => x + y, 0)/n;
      let sab = 0, saa = 0, sbb = 0; for(let i = 0; i < n; i++){ sab += (a[i] - ma)*(b[i] - mb); saa += (a[i] - ma)*(a[i] - ma); sbb += (b[i] - mb)*(b[i] - mb); }
      return saa && sbb ? sab/Math.sqrt(saa*sbb) : 0; };
    const rB = corr(st.S.craving, st.S.bright), rU = corr(st.S.craving, st.S.useful.map(v => v ? 1 : 0));
    const useful = st.round.starts.length;
    const el = $('aha'); el.hidden = false;
    el.innerHTML = '<b>Ага.</b> Линия тяги ходила за жёлтыми столбиками (корреляция с яркостью r = ' + rB.toFixed(2) + ') и не заметила красные ромбы (с пользой r = ' + rU.toFixed(2) + '). ' +
      'Полезных событий было ' + useful + ' из 36 — ' + (st.caught.length === useful ? 'ты поймал ' + (useful === 1 ? 'его' : 'оба') + ' кнопкой «Проверить факт».' : 'пропущено ' + st.missed.length + ': бот завис, это стоило ' + rub(-CAP*MISS*st.missed.length) + '.') +
      ' Плюсиков за минуту — ' + st.peeks + '; у новичка за неделю набегает 40–60, и каждый из них — щель, через которую выходит дисциплина. ' +
      (st.manuals ? 'Ручные сделки «для тонуса»: ' + st.manuals + ', итог ' + rub(st.manPnl) + ' — против ' + rub(st.botPnl) + ' у скучного бота.' : 'Ручных сделок — ноль: качели остались голодными, бот принёс ' + rub(st.botPnl) + '.') +
      ' Скука при работающей системе — норма; тягу пересаживают, а не подавляют.';
    st.aha = { rB, rU }; $('art').hidden = false; meters(); raf(draw);
    $('big').textContent = 'Минута прошла. Бот работал всё время' + (st.missed.length ? ', кроме пропущенного сбоя' : '') + '.'; $('sm').textContent = 'Смотри разбор ниже.'; $('stage').style.boxShadow = 'none';
  };

  const tick = () => {
    st.idx++;
    if(st.idx >= N){ finish(); return; }
    const e = st.round.ev[st.idx];
    // закрываем окна, чей 3-й тик прошёл
    st.round.starts.forEach(s => { if(st.idx === s + 3 && !st.caught.includes(s)){ st.missed.push(s); st.botPnl -= CAP*MISS; st.marks.push({ i: s + 2, t: 'miss' }); say('✗ Три ошибки API прошли мимо — бот завис в позиции: ' + rub(-CAP*MISS) + '. Это и был «мир».'); } });
    st.craving = clamp(st.craving*0.82 + e.bright*16, 0, 100);
    st.botPnl += CAP*BOT;
    if(st.craving > 70) st.calm = clamp(st.calm - 1.5, 0, 100);
    if(st.reCool > 0) st.reCool--;
    $('re').disabled = st.reCool > 0;
    st.S.craving.push(st.craving); st.S.calm.push(st.calm); st.S.bright.push(e.bright); st.S.useful.push(e.useful);
    stage(e); meters(); raf(draw);
  };

  const reset = seed => {
    clearInterval(st.timer); st.seed = seed; st.round = genRound(seed);
    Object.assign(st, { idx: -1, running: false, done: false, craving: 10, calm: 100, botPnl: 0, manPnl: 0, peeks: 0, manuals: 0, reroutes: 0, reCool: 0, caught: [], missed: [], S: { craving: [], calm: [], bright: [], useful: [] }, marks: [], msg: '' });
    setActs(false); $('aha').hidden = true; $('art').hidden = true; $('copy').hidden = true; $('artout').hidden = true;
    $('start').textContent = 'Старт (seed ' + seed + ')'; $('start').disabled = false;
    $('big').textContent = 'Нажми «Старт»'; $('sm').textContent = 'Бот: стоит, ждёт запуска'; $('cnt').textContent = 'событие 0 / 36'; $('stage').style.boxShadow = 'none'; $('stage').style.borderColor = '';
    say(''); meters(); raf(draw);
  };

  /* ---- действия ---- */
  const cur = () => st.running && st.idx >= 0 ? st.round.ev[st.idx] : null;
  const doPeek = (why) => { st.peeks++; st.craving = clamp(st.craving - 8, 0, 100); st.calm = clamp(st.calm - 3, 0, 100); st.marks.push({ i: st.idx, t: 'peek' });
    say((why || 'Плюсик #' + st.peeks + '.') + ' В терминале — то же, что и минуту назад. Тяга спала на секунду и вернётся ярче.'); meters(); raf(draw); };
  $('peek').addEventListener('click', () => { if(cur()) doPeek(); });
  $('man').addEventListener('click', () => { const e = cur(); if(!e) return; st.manuals++; const r = MEV + MSIG*e.manualZ; st.manPnl += CAP*r;
    st.craving = clamp(st.craving - 25, 0, 100); st.calm = clamp(st.calm - 8, 0, 100); st.marks.push({ i: st.idx, t: 'man' });
    say('Сделка руками «для тонуса»: ' + (r >= 0 ? '+' : '−') + Math.abs(r*100).toFixed(2) + '% → ' + rub(CAP*r) + '. Кайф был, эдж — нет: EV −0,3%.'); meters(); raf(draw); });
  $('re').addEventListener('click', () => { if(!cur() || st.reCool > 0) return; st.reroutes++; st.reCool = 1; $('re').disabled = true;
    st.craving = clamp(st.craving - 30, 0, 100); st.calm = clamp(st.calm + 2, 0, 100); st.marks.push({ i: st.idx, t: 're' });
    say('↻ Записал строку в журнал / вышел пройтись. Тяга не подавлена — пересажена. Бот всё это время работал.'); meters(); raf(draw); });
  $('fact').addEventListener('click', () => { const e = cur(); if(!e) return;
    if(e.useful && !st.caught.includes(e.uStart)){ st.caught.push(e.uStart); st.marks.push({ i: st.idx, t: 'fact' });
      say('✓ Мир: три ошибки API подряд — факт, а не чувство. Переподключил, бот цел. Строка в журнал: «мир».'); meters(); raf(draw); }
    else if(e.useful){ say('Факт уже зафиксирован. Дальше — руки прочь.'); }
    else { doPeek('«Проверить факт» без факта — это плюсик #' + (st.peeks + 1) + '.'); } });

  $('start').addEventListener('click', () => { if(st.running || st.done) return; st.running = true; setActs(true); $('start').disabled = true;
    say('Поехали. Бот торгует по плану. Твоё дело — не мешать и поймать «мир».'); tick(); st.timer = later(tick, STEP, true); });
  $('new').addEventListener('click', () => reset((Date.now() % 1000000000) | 0));
  $('art').addEventListener('click', () => {
    const useful = st.round.starts.length, d = new Date();
    const txt = 'ПРАВИЛО (урок П6) — ' + d.toLocaleDateString('ru-RU') + '\n' +
      'Тяга пересаживается, а не подавляется: журнал, движение, разбор кейса. Ручные сделки при работающем боте — не больше одной в квартал и только с письменным «почему это система, а не тяга».\n\n' +
      'Метрики сессии (seed ' + st.seed + ', 36 событий):\n' +
      '• полезных событий («мир»): ' + useful + ' из 36; поймано: ' + st.caught.length + ', пропущено: ' + st.missed.length + (st.missed.length ? ' (цена ' + rub(-CAP*MISS*st.missed.length) + ')' : '') + '\n' +
      '• плюсиков «глянуть»: ' + st.peeks + ' (ориентир новичка — 40–60 за неделю)\n' +
      '• ручных сделок «для тонуса»: ' + st.manuals + ', итог ' + rub(st.manPnl) + '; бот по плану: ' + rub(st.botPnl) + '\n' +
      '• пересадок тяги: ' + st.reroutes + '; спокойствие на финише: ' + Math.round(st.calm) + '/100\n' +
      '• корреляция тяги с яркостью движения: r = ' + st.aha.rB.toFixed(2) + '; с пользой события: r = ' + st.aha.rU.toFixed(2) + '\n' +
      'Вывод: тяга следует за яркостью, не за пользой. Скука при исправной системе — норма, азарт — признак, что система уже не моя.\n' +
      'Модель иллюстративная: капитал 100 000 ₽, бот +0,05%/событие, ручная сделка EV −0,3% ± 1,5%, пропуск факта −0,6%.';
    const ta = $('artout'); ta.value = txt; ta.hidden = false; $('copy').hidden = false; ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('copy').addEventListener('click', () => { const ta = $('artout'); ta.select();
    const done = () => { $('copy').textContent = 'Скопировано ✓'; later(() => { $('copy').textContent = 'Скопировать'; }, 1500); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand('copy'); done(); }); }
    else { document.execCommand('copy'); done(); } });

  box._expResize = () => raf(draw);
  window.addEventListener('resize', box._expResize);
  reset(42);
};
