/*
 * W-42 · widget_g02_mm_minute · 0.4 «Маркетмейкер на минуту»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: прочувствовать, что спред — это плата за риск маркетмейкера: доход капает по монетке, а один проскок информированного потока забирает всё.
 *   Задание: выставить котировки, подобрать спред и закончить минуту в плюсе; успеть снять котировки, когда полоса «поток тейкеров» становится односторонней.
 *   Ага: на графике справа кривая «доход от спреда» ползёт вверх, а кривая «итог» до секунды X идёт рядом — потом рушится вниз под красной заливкой: спред остался, запас переоценён.
 *   Дефолты: цена 95 000 $ (как в уроке 0.9), спред 40 $ (≈4,2 bps), минута = 60 тиков по 0,4 с, проскок на 28–50-й секунде с 5-секундным предупреждением; сид 42, «новый раунд» → новый сид.
 *   Артефакт: строка «MM-минута #N: спред … · сделок … · спред +… · запас −… · итог … · проскоков …» + JSON с числами.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_g02_mm_minute'] = function(box){
  // ── 0. чистка прошлого запуска ─────────────────────────────────────────
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const cssv = (n, f)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: cssv('--txt','#eef1ff'), mut: cssv('--mut','#9aa3c7'), line: cssv('--line','rgba(154,163,199,.25)'),
              acc: cssv('--acc2','#06b6d4'), ok: cssv('--ok','#22c55e'), bad: cssv('--bad','#ef4444'), warn: cssv('--warn','#eab308') };

  // ── 1. константы канона ────────────────────────────────────────────────
  const TICK_MS = 400, TICKS = 60, MID0 = 95000, RANGE = 260, DECAY = 25, LAMBDA = 0.55, WARN_TICKS = 5;
  const fmt$ = n => (n > 0 ? '+' : (n < 0 ? '−' : '')) + Math.abs(Math.round(n)).toLocaleString('ru-RU') + ' $';
  const fmtP = n => Math.round(n).toLocaleString('ru-RU');
  let seed = box._mmSeed || 42, attempts = box._mmAttempts || 0, rnd, st;

  // ── 2. разметка ────────────────────────────────────────────────────────
  box.innerHTML = `
  <style>
    .mm{color:var(--txt,#eef1ff);font:14px/1.45 system-ui,sans-serif;background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%}
    .mm *{box-sizing:border-box}
    .mm-title{font-weight:700;font-size:16px}
    .mm-goal{color:var(--mut,#9aa3c7);font-size:13px;margin:2px 0 10px}
    .mm-cv{width:100%;display:block;border-radius:8px;background:rgba(255,255,255,.02)}
    .mm-ctrl{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}
    .mm-ctrl label{flex:1 1 220px;font-size:13px;color:var(--mut,#9aa3c7)}
    .mm-ctrl label b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,monospace)}
    .mm-ctrl input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin-top:4px}
    .mm-btns{display:flex;flex-wrap:wrap;gap:6px;flex:2 1 260px}
    .mm button{background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.4);color:var(--txt,#eef1ff);border-radius:8px;padding:7px 10px;font-size:13px;cursor:pointer;transition:background .15s,transform .1s}
    .mm button:hover{background:rgba(6,182,212,.25)} .mm button:active{transform:scale(.97)}
    .mm button:disabled{opacity:.4;cursor:default}
    .mm button.mm-danger{border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.12)}
    .mm button.mm-on{background:var(--acc2,#06b6d4);color:#04121a;font-weight:700}
    .mm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
    .mm-stats div{background:rgba(255,255,255,.04);border-radius:8px;padding:8px 10px}
    .mm-stats span{display:block;font-size:11px;color:var(--mut,#9aa3c7)}
    .mm-stats b{font-family:var(--mono,ui-monospace,monospace);font-size:15px}
    .mm-msg{margin-top:10px;padding:10px 12px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px;min-height:38px}
    .mm-msg.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.1);animation:mmBlink .6s steps(2) infinite}
    .mm-msg.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.1)}
    @keyframes mmBlink{50%{opacity:.55}}
    .mm-debrief{margin-top:10px;padding:12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(154,163,199,.25))}
    .mm-debrief p{margin:0 0 8px} .mm-debrief p:last-child{margin:0}
    .mm-debrief .big{font-size:18px;font-family:var(--mono,ui-monospace,monospace)}
    @media (max-width:480px){.mm-stats{grid-template-columns:repeat(2,1fr)}}
  </style>
  <div class="mm">
    <div class="mm-title">Маркетмейкер на минуту</div>
    <div class="mm-goal">Цель: увидеть, что спред — доход, а запас монет — риск. Задание: закончить минуту в плюсе и не попасть под проскок.</div>
    <canvas class="mm-cv" aria-label="Стакан и график PnL"></canvas>
    <div class="mm-ctrl">
      <label>Спред: <b data-sp>40 $</b> <span data-bps>(4,2 bps)</span>
        <input type="range" min="6" max="200" step="2" value="40" data-spread></label>
      <div class="mm-btns">
        <button data-start>▶ Начать минуту</button>
        <button data-quote>Выставить котировки</button>
        <button data-move>Подвинуть к цене</button>
        <button data-aggr class="mm-danger" title="Смоделировать чужого агрессора прямо сейчас">Чужой агрессор</button>
        <button data-new>Новый раунд</button>
      </div>
    </div>
    <div class="mm-stats">
      <div><span>Секунда</span><b data-sec>0/60</b></div>
      <div><span>Сделок</span><b data-fills>0</b></div>
      <div><span>Запас, BTC</span><b data-inv>0</b></div>
      <div><span>Доход от спреда</span><b data-spi>0 $</b></div>
      <div><span>Переоценка запаса</span><b data-inp>0 $</b></div>
      <div><span>Итог минуты</span><b data-tot>0 $</b></div>
    </div>
    <div class="mm-msg" data-msg>Настрой спред, нажми «Выставить котировки» и запусти минуту. Следи за полосой «поток тейкеров» под стаканом.</div>
    <div class="mm-debrief" data-debrief hidden></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('.mm-cv'), ctx = cv.getContext('2d');
  const el = { sp:$('[data-sp]'), bps:$('[data-bps]'), range:$('[data-spread]'), start:$('[data-start]'), quote:$('[data-quote]'),
               move:$('[data-move]'), aggr:$('[data-aggr]'), nw:$('[data-new]'), sec:$('[data-sec]'), fills:$('[data-fills]'),
               inv:$('[data-inv]'), spi:$('[data-spi]'), inp:$('[data-inp]'), tot:$('[data-tot]'), msg:$('[data-msg]'), deb:$('[data-debrief]') };

  // ── 3. состояние ───────────────────────────────────────────────────────
  function reset(newSeed){
    if(newSeed) seed = (Date.now() % 1e9) | 0;
    box._mmSeed = seed; rnd = mulberry32(seed);
    const bg = []; for(let i = 0; i <= 26; i++) bg.push(0.25 + rnd() * 0.75);
    st = { tick:0, running:false, done:false, mid:MID0, view:MID0, quotes:false, bid:0, ask:0,
           half:parseFloat(el.range.value) / 2, cash:0, inv:0, fills:0, spi:0, stale:0, hist:[], particles:[],
           pressure:0, warn:0, jumpTick:28 + Math.floor(rnd() * 22), jumpDir:(rnd() < 0.5 ? -1 : 1),
           jumped:false, pulledAt:null, sweepHits:0, jumpSize:0, events:[], manual:0, bg:bg, maxInv:0, timer:null };
    el.quote.textContent = 'Выставить котировки'; el.quote.classList.remove('mm-on');
    el.start.textContent = '▶ Начать минуту'; el.start.disabled = false;
    el.deb.hidden = true; setMsg('Настрой спред, выставь котировки и запусти минуту. Следи за полосой «поток тейкеров».');
    updateStats();
  }
  function setMsg(t, cls){ el.msg.textContent = t; el.msg.className = 'mm-msg' + (cls ? ' ' + cls : ''); }
  const normal = ()=>{ const u = Math.max(rnd(), 1e-9), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pnl = ()=> st.cash + st.inv * st.mid;

  // ── 4. механика ────────────────────────────────────────────────────────
  function execute(side, label){
    const price = side === 'ask' ? st.ask : st.bid;
    if(side === 'ask'){ st.cash += price; st.inv -= 1; st.spi += Math.max(0, price - st.mid); }
    else              { st.cash -= price; st.inv += 1; st.spi += Math.max(0, st.mid - price); }
    st.fills++; st.maxInv = Math.max(st.maxInv, Math.abs(st.inv));
    st.particles.push({ side, price, born:performance.now(), label: label || ('+' + Math.round(Math.abs(price - st.mid)) + ' $') });
  }
  function fillSide(side, dist, mult){
    if(dist <= 0){ st.stale++; execute(side, 'проскок'); return; }           // лежачую котировку сняли по невыгодной цене
    const p = 1 - Math.exp(-LAMBDA * mult * Math.exp(-dist / DECAY));
    if(rnd() < p) execute(side);
  }
  function doAggressor(manual){
    const dir = manual ? (rnd() < 0.5 ? -1 : 1) : st.jumpDir;
    const k = 3 + Math.floor(rnd() * 3);
    let hits = 0;
    if(st.quotes){ for(let i = 0; i < k; i++){ execute(dir > 0 ? 'ask' : 'bid', 'информированный'); hits++; } }
    const jump = st.mid * (0.004 + rnd() * 0.005) * dir;
    st.mid += jump;
    st.events.push({ tick:st.tick, dir, hits, jump });
    if(manual){ st.manual++; } else { st.jumped = true; st.sweepHits = hits; st.jumpSize = Math.abs(jump); st.warn = 0; }
    if(hits) setMsg(`Агрессор снял ${hits} твоих котировок подряд и цена прыгнула на ${fmt$(jump)}. Ты ${dir > 0 ? 'продал ниже' : 'купил выше'} новой цены — запас переоценён.`, 'bad');
    else setMsg(`Скачок на ${fmt$(jump)}. Твоих котировок в стакане не было — переоценивать нечего.`);
  }
  function step(){
    st.tick++;
    st.mid += normal() * 6;
    let p = normal() * 0.25;
    const pre = st.jumpTick - st.tick;
    if(!st.jumped && pre <= WARN_TICKS && pre > 0){
      st.warn = pre; p = st.jumpDir * (0.85 + rnd() * 0.15);
      if(pre === WARN_TICKS) setMsg('Поток тейкеров стал односторонним. Кто-то знает больше тебя. Снять котировки? Расширить спред?', 'warn');
    }
    st.pressure = Math.max(-1, Math.min(1, p));
    if(!st.jumped && st.tick === st.jumpTick) doAggressor(false);
    if(st.quotes){
      fillSide('ask', st.ask - st.mid, 1 + st.pressure * 0.6);
      fillSide('bid', st.mid - st.bid, 1 - st.pressure * 0.6);
    }
    st.hist.push({ spi:st.spi, tot:pnl() });
    updateStats();
    if(st.tick >= TICKS) finish();
  }
  function updateStats(){
    const tot = pnl(), inp = tot - st.spi;
    el.sec.textContent = st.tick + '/60'; el.fills.textContent = st.fills; el.inv.textContent = (st.inv > 0 ? '+' : '') + st.inv;
    el.spi.textContent = fmt$(st.spi); el.spi.style.color = C.acc;
    el.inp.textContent = fmt$(inp); el.inp.style.color = inp < 0 ? C.bad : C.txt;
    el.tot.textContent = fmt$(tot); el.tot.style.color = tot > 0 ? C.ok : (tot < 0 ? C.bad : C.txt);
    const sp = st.half * 2; el.sp.textContent = sp + ' $'; el.bps.textContent = '(' + (sp / st.mid * 1e4).toFixed(1).replace('.', ',') + ' bps)';
  }
  function finish(){
    st.running = false; st.done = true; clearInterval(st.timer); attempts++; box._mmAttempts = attempts;
    el.start.textContent = '↻ Повторить этот раунд';
    const tot = pnl(), inp = tot - st.spi, sp = st.half * 2;
    const dodged = st.jumped && st.sweepHits === 0 && st.pulledAt !== null;
    const lines = [];
    lines.push(`<p class="big">Итог минуты: <b style="color:${tot >= 0 ? C.ok : C.bad}">${fmt$(tot)}</b> = спред <span style="color:${C.acc}">${fmt$(st.spi)}</span> + запас <span style="color:${inp < 0 ? C.bad : C.txt}">${fmt$(inp)}</span></p>`);
    lines.push(`<p>За минуту ты собрал ${fmt$(st.spi)} на спреде: ${st.fills} сделок по ~${st.half} $ с каждой. Это «монетка», ради которой маркетмейкер стоит в стакане.</p>`);
    if(st.sweepHits > 0) lines.push(`<p>Перед скачком на ${fmtP(st.jumpSize)} $ односторонний поток снял у тебя ${st.sweepHits} котировок подряд — те, кто знал о движении, взяли твою цену первыми. Это неблагоприятный отбор: спред за минуту ${fmt$(st.spi)}, один проскок — ${fmt$(inp)}.</p>`);
    else if(dodged) lines.push(`<p>Ты снял котировки за ${st.jumpTick - st.pulledAt} с до скачка. Именно так работает маркетмейкер: увидел перекос потока — ушёл из стакана или расширил спред. Потери избежаны.</p>`);
    else if(st.jumped) lines.push(`<p>В момент скачка твоих котировок в стакане не было — ты не заработал на спреде эти секунды, зато и не отдал запас.</p>`);
    if(st.stale > 0) lines.push(`<p>${st.stale} раз цена ушла сквозь твою лежачую котировку («проскок»): ты не двигал её за рынком, и тейкеры забрали её по невыгодной для тебя цене. Кнопка «Подвинуть к цене» — про это.</p>`);
    lines.push(`<p>${tot > 0 ? 'Плюс. Попробуй сузить спред — сделок станет больше, но проскок будет больнее.' : 'Минус. Полоса потока горела 5 секунд до скачка. В следующий раз — «Снять» или расширить спред.'} Для тебя как покупателя вывод один: спред ${sp} $ — это цена риска, который ты только что прочувствовал за маркетмейкера.</p>`);
    el.deb.innerHTML = lines.join(''); el.deb.hidden = false;
    const art = `MM-минута #${attempts}: спред ${sp}$ · сделок ${st.fills} · спред ${fmt$(st.spi)} · запас ${fmt$(inp)} · итог ${fmt$(tot)} · проскоков ${st.stale}`;
    box.dataset.artifact = art;
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail:{ id:'widget_g02_mm_minute', text:art,
      data:{ attempt:attempts, spread:sp, fills:st.fills, spreadIncome:Math.round(st.spi), inventoryPnl:Math.round(inp), total:Math.round(tot), stale:st.stale, dodged, sweepHits:st.sweepHits, seed } } }));
  }

  // ── 5. управление ──────────────────────────────────────────────────────
  el.range.addEventListener('input', ()=>{
    st.half = parseFloat(el.range.value) / 2;
    if(st.quotes){ const c = (st.bid + st.ask) / 2; st.bid = c - st.half; st.ask = c + st.half; }
    updateStats();
  });
  el.start.addEventListener('click', ()=>{
    if(st.running) return;
    if(st.done){ const q = st.quotes; reset(false); }
    st.running = true; el.start.disabled = true; el.start.textContent = '… идёт минута';
    if(!st.quotes) setMsg('Минута пошла, но котировок в стакане нет — ты не зарабатываешь спред. Нажми «Выставить котировки».');
    else setMsg('Минута пошла. Смотри, как капает доход от спреда и куда уходит цена.');
    st.timer = later(step, TICK_MS, true);
  });
  el.quote.addEventListener('click', ()=>{
    if(!st.quotes){
      st.quotes = true; st.bid = st.mid - st.half; st.ask = st.mid + st.half;
      el.quote.textContent = 'Снять котировки'; el.quote.classList.add('mm-on');
      if(!st.running) setMsg('Котировки в стакане: бид ' + fmtP(st.bid) + ' / аск ' + fmtP(st.ask) + '. Теперь «Начать минуту».');
    } else {
      st.quotes = false; el.quote.textContent = 'Выставить котировки'; el.quote.classList.remove('mm-on');
      if(st.running && st.warn > 0 && st.pulledAt === null){ st.pulledAt = st.tick; setMsg('Котировки сняты вовремя. Теперь смотри, что случится с ценой.'); }
      else if(st.running) setMsg('Котировки сняты. Спред не капает, но и рисков нет.');
    }
  });
  el.move.addEventListener('click', ()=>{ if(st.quotes){ st.bid = st.mid - st.half; st.ask = st.mid + st.half; setMsg('Котировки перецентрированы вокруг цены ' + fmtP(st.mid) + ' $.'); } });
  el.aggr.addEventListener('click', ()=>{ if(st.running) doAggressor(true); else setMsg('Агрессор приходит только в живой стакан — сначала запусти минуту.'); });
  el.nw.addEventListener('click', ()=>{ if(st.timer) clearInterval(st.timer); reset(true); setMsg('Новый раунд: другая цена, другой момент проскока. Попытка №' + (attempts + 1) + '.'); });

  // ── 6. рисование ───────────────────────────────────────────────────────
  function layout(){
    const w = Math.max(320, cv.clientWidth || box.clientWidth - 30), narrow = w < 520, h = narrow ? 340 : 270;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if(cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return narrow ? { w, h, L:{ x:0, y:0, w:w, h:210 }, R:{ x:0, y:218, w:w, h:122 } }
                  : { w, h, L:{ x:0, y:0, w:w * 0.55, h:h }, R:{ x:w * 0.58, y:0, w:w * 0.42, h:h } };
  }
  function drawLadder(a){
    const x0 = a.x + 8, y0 = a.y + 8, W = a.w - 16, H = a.h - 40, cy = y0 + H / 2, pxPer = (H / 2) / RANGE, xb = x0 + 60;
    st.view += (st.mid - st.view) * 0.15;
    const yOf = p => cy - (p - st.view) * pxPer;
    ctx.font = '11px system-ui,sans-serif'; ctx.textBaseline = 'middle';
    const base = Math.round(st.view / 50) * 50;
    for(let k = -6; k <= 6; k++){ const p = base + k * 50, y = yOf(p); if(y < y0 || y > y0 + H) continue;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(xb, y); ctx.lineTo(x0 + W, y); ctx.stroke();
      ctx.fillStyle = C.mut; ctx.textAlign = 'right'; ctx.fillText(fmtP(p), xb - 6, y); }
    const midR = Math.round(st.mid / 10) * 10;
    for(let i = 1; i <= 24; i++){
      const yA = yOf(midR + i * 10), yB = yOf(midR - i * 10), len = st.bg[i] * W * 0.35;
      if(yA > y0){ ctx.fillStyle = 'rgba(239,68,68,.22)'; ctx.fillRect(xb, yA - 3, len, 6); }
      if(yB < y0 + H){ ctx.fillStyle = 'rgba(34,197,94,.22)'; ctx.fillRect(xb, yB - 3, len, 6); }
    }
    const ym = yOf(st.mid); ctx.strokeStyle = C.acc; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xb, ym); ctx.lineTo(x0 + W, ym); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.acc; ctx.textAlign = 'left'; ctx.fillText('цена ' + fmtP(st.mid), xb + 4, ym - 9);
    if(st.quotes){
      const ya = yOf(st.ask), yb = yOf(st.bid), bw = W * 0.5;
      ctx.fillStyle = C.bad; ctx.fillRect(xb, ya - 4, bw, 8); ctx.fillStyle = C.txt; ctx.fillText('ТВОЙ АСК ' + fmtP(st.ask), xb + bw + 6, ya);
      ctx.fillStyle = C.ok; ctx.fillRect(xb, yb - 4, bw, 8); ctx.fillStyle = C.txt; ctx.fillText('ТВОЙ БИД ' + fmtP(st.bid), xb + bw + 6, yb);
      if(st.ask - st.mid <= 0 || st.mid - st.bid <= 0){ ctx.fillStyle = C.warn; ctx.fillText('цена ушла сквозь котировку!', xb + 4, ym + 10); }
    } else { ctx.fillStyle = C.mut; ctx.textAlign = 'center'; ctx.fillText('твоих котировок в стакане нет', xb + W * 0.4, y0 + 12); }
    // частицы исполнений
    const now = performance.now(); st.particles = st.particles.filter(p => now - p.born < 700);
    st.particles.forEach(p => { const k = Math.min(1, (now - p.born) / 300), y = yOf(p.price), x = x0 + W - (x0 + W - xb - 20) * k;
      ctx.globalAlpha = 1 - Math.max(0, (now - p.born - 300) / 400); ctx.fillStyle = p.side === 'ask' ? C.bad : C.ok;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.283); ctx.fill();
      if(k >= 1){ ctx.fillStyle = p.label === 'проскок' || p.label === 'информированный' ? C.warn : C.txt; ctx.textAlign = 'right'; ctx.fillText(p.label, x0 + W - 4, y - 12); }
      ctx.globalAlpha = 1; });
    // полоса потока
    const my = y0 + H + 18, mx = xb, mw = W - 60, half = mw / 2;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(mx, my - 4, mw, 8);
    ctx.fillStyle = Math.abs(st.pressure) > 0.7 ? C.bad : C.acc;
    if(st.pressure >= 0) ctx.fillRect(mx + half, my - 4, half * st.pressure, 8); else ctx.fillRect(mx + half + half * st.pressure, my - 4, -half * st.pressure, 8);
    ctx.fillStyle = C.mut; ctx.textAlign = 'left'; ctx.fillText('← продают', mx, my - 12); ctx.textAlign = 'right'; ctx.fillText('покупают →', mx + mw, my - 12);
    ctx.textAlign = 'center';
    if(st.warn > 0 && Math.floor(now / 250) % 2 === 0){ ctx.fillStyle = C.warn; ctx.font = 'bold 11px system-ui,sans-serif'; ctx.fillText('ОДНОСТОРОННИЙ ПОТОК ТЕЙКЕРОВ', mx + half, my + 12); }
    else { ctx.fillStyle = C.mut; ctx.fillText('поток тейкеров', mx + half, my + 12); }
  }
  function drawChart(a){
    const x0 = a.x + 36, y0 = a.y + 22, W = a.w - 44, H = a.h - 44;
    ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.txt; ctx.fillText('PnL за минуту, $', x0, a.y + 9);
    let m = 10; st.hist.forEach(h => { m = Math.max(m, Math.abs(h.spi), Math.abs(h.tot)); }); m *= 1.15;
    const yOf = v => y0 + H / 2 - v / m * (H / 2), xOf = t => x0 + t / TICKS * W;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, yOf(0)); ctx.lineTo(x0 + W, yOf(0)); ctx.stroke();
    ctx.fillStyle = C.mut; ctx.textAlign = 'right'; ctx.fillText(fmtP(m), x0 - 4, y0); ctx.fillText('0', x0 - 4, yOf(0)); ctx.fillText('−' + fmtP(m), x0 - 4, y0 + H);
    ctx.textAlign = 'center'; ctx.fillText('0 с', x0, y0 + H + 10); ctx.fillText('60 с', x0 + W, y0 + H + 10);
    // заливка провала (итог ниже спред-дохода)
    for(let i = 1; i < st.hist.length; i++){ const a1 = st.hist[i - 1], b1 = st.hist[i]; if(b1.tot >= b1.spi && a1.tot >= a1.spi) continue;
      ctx.fillStyle = 'rgba(239,68,68,.22)'; ctx.beginPath(); ctx.moveTo(xOf(i - 1), yOf(a1.spi)); ctx.lineTo(xOf(i), yOf(b1.spi)); ctx.lineTo(xOf(i), yOf(b1.tot)); ctx.lineTo(xOf(i - 1), yOf(a1.tot)); ctx.closePath(); ctx.fill(); }
    const line = (key, color, lw) => { if(!st.hist.length) return; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0));
      st.hist.forEach((h, i) => ctx.lineTo(xOf(i + 1), yOf(h[key]))); ctx.stroke(); ctx.lineWidth = 1; };
    line('spi', C.acc, 2); line('tot', C.txt, 2);
    st.events.forEach(e => { const x = xOf(e.tick); ctx.strokeStyle = C.bad; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.bad; ctx.textAlign = 'center'; ctx.fillText(e.hits ? 'проскок' : 'скачок', x, y0 - 2); });
    if(!st.jumped && st.warn > 0){ const x = xOf(st.tick); ctx.fillStyle = C.warn; ctx.textAlign = 'center'; ctx.fillText('?', x + 12, y0 + 6); }
    ctx.textAlign = 'left'; ctx.fillStyle = C.acc; ctx.fillText('— доход от спреда', x0, y0 + H + 22); ctx.fillStyle = C.txt; ctx.fillText('— итог (с переоценкой запаса)', x0 + 118, y0 + H + 22);
  }
  function draw(){
    if(!box.isConnected){ box._expRaf = null; return; }
    box._expRaf = requestAnimationFrame(draw);
    const L = layout(); ctx.clearRect(0, 0, L.w, L.h);
    drawLadder(L.L); drawChart(L.R);
  }

  reset(false);
  draw();
};
