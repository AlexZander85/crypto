/*
 * W-30 · widget_p0_l4 · 0.4 «Живой мини-стакан»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *   ---: ---
 *   **Цель**: Увидеть, что цена на графике — это не бид и не аск, а **последняя сделка** двух терпеливых; бид/аск — намерения.
 *   **Задание**: Соверши 5 сделок тремя разными способами (поднять бид до аска, опустить аск до бида, «сдаться» — взять по рынку) и сожми спред до одного шага (10 $).
 *   **Ага**: Бид и аск двигаются несколько раз — а линия цены **не появляется**. Первая точка рождается только в момент сделки: вспышка принта, спред схлопывается. Пунктирные линии намерений vs сплошная линия фактов.
 *   **Дефолты**: BTC/USDT, бид 90 000, аск 90 100 (спред 100 $ ≈ 11 bps), шаг 10 $, 5 уровней глубины, seed 42; «другие участники» включены (только ставят/снимают лимитки; чужие рыночные ордера — не раньше первой сделки ученика).
 *   **Артефакт**: `{last, trades, ways, minSpread, movesWithoutTrade}` → `box.dataset.artifact` + событие `expert-artifact`.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l4'] = function (box) {
  const L = window.EXPERT_LIB, { later, raf } = L.setup(box);
  const TICK = 10, MID = 90000, DEPTH = 5, GOAL = { trades: 5, ways: 3 };
  const WAYS = { bid: 'бид ↑ до аска', ask: 'аск ↓ до бида', market: '«сдался» по рынку' };
  const r2 = x => Math.round(x * 100) / 100, fmt = n => Math.round(n).toLocaleString('ru-RU');
  let rnd = L.mulberry32(42), tk = L.tokens(box);
  const st = {};

  // ---------- модель ----------
  const bestBid = () => st.bids[0].p, bestAsk = () => st.asks[0].p, spread = () => bestAsk() - bestBid();
  function refill() {
    if (!st.asks.length) st.asks.push({ p: (st.last || MID) + TICK, q: r2(0.3 + rnd() * 1.7) });
    if (!st.bids.length) st.bids.push({ p: (st.last || MID) - TICK, q: r2(0.3 + rnd() * 1.7) });
    while (st.asks.length < DEPTH) st.asks.push({ p: st.asks[st.asks.length - 1].p + TICK, q: r2(0.3 + rnd() * 1.7) });
    while (st.bids.length < DEPTH) st.bids.push({ p: st.bids[st.bids.length - 1].p - TICK, q: r2(0.3 + rnd() * 1.7) });
    st.asks.length = Math.min(st.asks.length, DEPTH + 2); st.bids.length = Math.min(st.bids.length, DEPTH + 2);
  }
  function record() {
    st.t++; st.hist.push({ t: st.t, bid: bestBid(), ask: bestAsk() });
    if (st.hist.length > 400) st.hist.shift();
    st.minSpread = Math.min(st.minSpread, spread());
  }
  function reset(seed) {
    rnd = L.mulberry32(seed);
    st.asks = []; st.bids = [];
    for (let i = 0; i < DEPTH; i++) {
      st.asks.push({ p: MID + TICK * (10 + i), q: r2(0.3 + rnd() * 1.7) });
      st.bids.push({ p: MID - TICK * i, q: r2(0.3 + rnd() * 1.7) });
    }
    st.t = 0; st.hist = []; st.trades = []; st.last = null; st.minSpread = Infinity;
    st.ways = new Set(); st.moves = 0; st.flash = null; st.aha = false; st.done = false;
    st.msg = 'Бид <b>90 000</b> — лучшая цена, которую готовы дать покупатели. Аск <b>90 100</b> — лучшая, за которую готовы отдать продавцы. Между ними 100 $ спреда. Сделок ещё не было — на графике справа пусто.';
    st.msgKind = '';
    record();
  }
  // агрессор берёт лучшую цену противоположной стороны
  function trade(side, way, qty) {
    const book = side === 'buy' ? st.asks : st.bids, lvl = book[0];
    const q = r2(Math.min(qty, lvl.q)); lvl.q = r2(lvl.q - q);
    if (lvl.q <= 0.001) book.shift();
    refill();
    st.last = lvl.p; st.trades.push({ t: st.t + 1, p: lvl.p, side, q });
    if (way) st.ways.add(way);
    st.flash = { t0: performance.now(), p: lvl.p };
    return { p: lvl.p, q };
  }
  function setMsg(html, kind) { st.msg = html; st.msgKind = kind || ''; }
  function ahaCheck(byUser) {
    if (st.aha || !byUser) return;
    st.aha = true;
    setMsg(`<b>Ага-момент.</b> Бид и аск двигались ${st.moves} раз, а линия цены родилась <b>только сейчас</b> — в момент сделки. ` +
      `Пунктир слева от точки — намерения; сплошная линия — факты. Цена — это последняя сделка двух терпеливых, которые встретились.`, 'aha');
  }
  function raiseBid() {
    const np = bestBid() + TICK;
    if (np >= bestAsk()) {
      const r = trade('buy', 'bid', r2(0.2 + rnd() * 0.6)), was = st.aha;
      setMsg(`Покупатель поднял бид до ${fmt(np)} — это уже цена аска. Две терпеливые заявки встретились: <b>сделка по ${fmt(r.p)}</b>, ${r.q} BTC.`, 'ok');
      ahaCheck(!was);
    } else {
      st.bids.unshift({ p: np, q: r2(0.2 + rnd() * 0.8) }); st.moves++;
      setMsg(`Бид поднялся до ${fmt(np)}. Спред сузился до ${fmt(bestAsk() - np)} $. <b>Цена не изменилась</b> — сделки не было, это только намерение.`);
    }
    finish();
  }
  function lowerAsk() {
    const np = bestAsk() - TICK;
    if (np <= bestBid()) {
      const r = trade('sell', 'ask', r2(0.2 + rnd() * 0.6)), was = st.aha;
      setMsg(`Продавец опустил аск до ${fmt(np)} — это уже цена бида. Встретились: <b>сделка по ${fmt(r.p)}</b>, ${r.q} BTC.`, 'ok');
      ahaCheck(!was);
    } else {
      st.asks.unshift({ p: np, q: r2(0.2 + rnd() * 0.8) }); st.moves++;
      setMsg(`Аск опустился до ${fmt(np)}. Спред сузился до ${fmt(np - bestBid())} $. <b>Цена не изменилась</b> — никто ещё не уступил.`);
    }
    finish();
  }
  function market(side) {
    const was = st.aha, r = trade(side, 'market', 0.5);
    setMsg(side === 'buy'
      ? `Покупатель перестал ждать и <b>купил по аску ${fmt(r.p)}</b> (${r.q} BTC). Он заплатил спред за скорость.`
      : `Продавец перестал ждать и <b>продал по биду ${fmt(r.p)}</b> (${r.q} BTC). Он отдал спред за скорость.`, 'ok');
    ahaCheck(!was); finish();
  }
  function background() {
    if (!st.live || st.done || !box.isConnected) return;
    const r = rnd();
    if (r < 0.45) { const s = rnd() < 0.5 ? st.bids : st.asks; const i = Math.floor(rnd() * s.length); s[i].q = r2(s[i].q + 0.1 + rnd() * 0.5); }
    else if (r < 0.7) { const s = rnd() < 0.5 ? st.bids : st.asks; if (s.length > 1) { const i = 1 + Math.floor(rnd() * (s.length - 1)); s[i].q = r2(Math.max(0.05, s[i].q - 0.3)); } }
    else if (r < 0.78 && st.trades.length) {
      const side = rnd() < 0.5 ? 'buy' : 'sell', t = trade(side, null, r2(0.05 + rnd() * 0.15));
      setMsg(`Чужой участник ${side === 'buy' ? 'купил' : 'продал'} ${t.q} BTC по ${fmt(t.p)} — эту точку на графике поставил он, не ты.`, '');
    }
    finish(true);
  }
  function finish(quiet) {
    record();
    if (!st.done && st.trades.length >= GOAL.trades && st.ways.size >= GOAL.ways && st.minSpread <= TICK) {
      st.done = true;
      setMsg(`<b>Задание выполнено.</b> Последняя цена ${fmt(st.last)} — это последняя сделка, а не бид и не аск. ` +
        `Запомни: стакан — что участники <i>хотят</i>; график — что <i>случилось</i>. В уроке 0.9 ты увидишь, что при крупном ордере одной ценой сделка не ограничится.`, 'aha');
      L.artifact(box, 'widget_p0_l4', { last: st.last, trades: st.trades.length, ways: [...st.ways], minSpread: st.minSpread, movesWithoutTrade: st.moves });
    }
    renderPanel(quiet);
  }

  // ---------- разметка ----------
  box.innerHTML = `<style>${L.baseCSS('xw30')}</style>
<div class="xw30">
  <div class="goal"><b>Цель:</b> увидеть, что цена — это не бид и не аск, а <b>последняя сделка</b> двух терпеливых.<br>
  <b>Задание:</b> соверши ${GOAL.trades} сделок тремя способами и сожми спред до одного шага (${TICK} $).</div>
  <div class="track"></div>
  <canvas></canvas>
  <div class="btns">
    <button data-a="bid">▲ Покупатель повысил бид (+${TICK} $)</button>
    <button data-a="ask">▼ Продавец снизил аск (−${TICK} $)</button>
    <button data-a="mbuy">Покупатель сдался: купил по аску</button>
    <button data-a="msell">Продавец сдался: продал по биду</button>
  </div>
  <div class="msg"></div>
  <div class="foot">
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-a="live" checked> другие участники тоже ставят и снимают заявки</label>
    <button data-a="new" class="ghost">Новый раунд</button>
  </div>
</div>`;
  const cv = box.querySelector('canvas'), trackEl = box.querySelector('.track'), msgEl = box.querySelector('.msg');
  function renderPanel() {
    const ok = (v, g) => v >= g ? 'done' : '';
    trackEl.innerHTML =
      `<span class="${ok(st.trades.length, GOAL.trades)}">Сделок: <b>${st.trades.length}</b>/${GOAL.trades}</span>` +
      `<span class="${ok(st.ways.size, GOAL.ways)}">Способов: <b>${st.ways.size}</b>/${GOAL.ways} <span class="mut">(${[...st.ways].map(w => WAYS[w]).join(', ') || '—'})</span></span>` +
      `<span class="${st.minSpread <= TICK ? 'done' : ''}">Мин. спред: <b>${isFinite(st.minSpread) ? fmt(st.minSpread) + ' $' : '—'}</b></span>` +
      `<span>Движений без сделки: <b>${st.moves}</b></span>`;
    msgEl.className = 'msg ' + st.msgKind; msgEl.innerHTML = st.msg;
  }
  box.querySelector('.xw30').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'bid') raiseBid(); else if (a === 'ask') lowerAsk();
    else if (a === 'mbuy') market('buy'); else if (a === 'msell') market('sell');
    else if (a === 'new') { const live = st.live; reset(Date.now() | 0); st.live = live; renderPanel(); }
  });
  box.querySelector('[data-a=live]').addEventListener('change', e => { st.live = e.target.checked; });

  // ---------- сцена ----------
  function drawBook(ctx, b) {
    const pad = 8, titleH = 20, spreadH = 34, rowH = (b.h - titleH - spreadH - pad * 2) / (DEPTH * 2);
    const maxQ = Math.max(...st.asks.slice(0, DEPTH).map(l => l.q), ...st.bids.slice(0, DEPTH).map(l => l.q), 0.5);
    ctx.font = '12px system-ui'; ctx.fillStyle = tk.mut; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Стакан BTC/USDT', b.x + pad, b.y + titleH / 2 + 2);
    const row = (lvl, y, color, best) => {
      const w = (b.w - pad * 2) * Math.min(1, lvl.q / maxQ);
      ctx.fillStyle = color + (best ? '55' : '2a'); ctx.fillRect(b.x + pad, y + 2, w, rowH - 4);
      ctx.fillStyle = best ? tk.txt : tk.mut; ctx.font = (best ? 'bold ' : '') + '12px ui-monospace,Menlo,monospace';
      ctx.textAlign = 'left'; ctx.fillText(fmt(lvl.p), b.x + pad + 4, y + rowH / 2);
      ctx.textAlign = 'right'; ctx.fillText(lvl.q.toFixed(2), b.x + b.w - pad - 4, y + rowH / 2);
    };
    let y = b.y + titleH + pad;
    const asks = st.asks.slice(0, DEPTH).reverse();
    asks.forEach((l, i) => { row(l, y, '#ef4444', i === asks.length - 1); y += rowH; });
    // полоса спреда
    const sp = spread(), tight = sp <= TICK;
    ctx.fillStyle = tight ? 'rgba(6,182,212,.14)' : 'rgba(255,255,255,.04)'; ctx.fillRect(b.x + pad, y + 3, b.w - pad * 2, spreadH - 6);
    ctx.fillStyle = tight ? tk.acc : tk.txt; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`Спред ${fmt(sp)} $ · ${(sp / bestAsk() * 1e4).toFixed(1)} bps${tight ? ' · минимум' : ''}`, b.x + b.w / 2, y + spreadH / 2);
    if (st.flash) { // вспышка принта
      const k = (performance.now() - st.flash.t0) / 700;
      if (k < 1) { ctx.strokeStyle = tk.acc; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; L.roundRect(ctx, b.x + pad - 6 * k, y + 3 - 8 * k, b.w - pad * 2 + 12 * k, spreadH - 6 + 16 * k, 6); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    y += spreadH;
    st.bids.slice(0, DEPTH).forEach((l, i) => { row(l, y, '#22c55e', i === 0); y += rowH; });
    ctx.font = '10px system-ui'; ctx.fillStyle = tk.mut; ctx.textAlign = 'left';
    ctx.fillText('красное — продавцы (аск), зелёное — покупатели (бид), длина — объём', b.x + pad, b.y + b.h - 6);
  }
  function drawChart(ctx, c) {
    const pad = { l: 8, r: 52, t: 24, b: 22 }, x0 = c.x + pad.l, x1 = c.x + c.w - pad.r, y0 = c.y + pad.t, y1 = c.y + c.h - pad.b;
    ctx.font = '12px system-ui'; ctx.fillStyle = tk.mut; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Последняя цена = последняя сделка', x0, c.y + 11);
    const tmin = Math.max(1, st.t - 60), tmax = Math.max(st.t, tmin + 20);
    const hist = st.hist.filter(h => h.t >= tmin), tr = st.trades.filter(t => t.t >= tmin);
    let lo = Infinity, hi = -Infinity;
    hist.forEach(h => { lo = Math.min(lo, h.bid); hi = Math.max(hi, h.ask); }); tr.forEach(t => { lo = Math.min(lo, t.p); hi = Math.max(hi, t.p); });
    if (!isFinite(lo)) { lo = MID - 60; hi = MID + 160; }
    lo -= 20; hi += 20;
    const X = t => x0 + (t - tmin) / (tmax - tmin) * (x1 - x0), Y = p => y1 - (p - lo) / (hi - lo) * (y1 - y0);
    ctx.strokeStyle = tk.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = tk.mut; ctx.font = '10px ui-monospace,Menlo,monospace'; ctx.textAlign = 'left';
    ctx.fillText(fmt(hi - 20), x1 + 4, y0); ctx.fillText(fmt(lo + 20), x1 + 4, y1);
    // намерения — пунктир
    const dash = (key, color) => {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = color; ctx.globalAlpha = .7; ctx.beginPath();
      hist.forEach((h, i) => { const x = X(h.t), y = Y(h[key]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    dash('ask', '#ef4444'); dash('bid', '#22c55e');
    if (!tr.length) {
      ctx.fillStyle = tk.mut; ctx.font = 'italic 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Здесь пусто: линия цены появится только после сделки', (x0 + x1) / 2, (y0 + y1) / 2);
    } else {
      ctx.strokeStyle = tk.acc; ctx.lineWidth = 2; ctx.beginPath();
      tr.forEach((t, i) => { const x = X(t.t), y = Y(t.p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      tr.forEach(t => { ctx.fillStyle = tk.acc; ctx.beginPath(); ctx.arc(X(t.t), Y(t.p), 3, 0, 7); ctx.fill(); });
      const last = tr[tr.length - 1], lx = X(last.t), ly = Y(last.p);
      ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 7); ctx.fill();
      ctx.fillStyle = tk.txt; ctx.font = 'bold 12px ui-monospace,Menlo,monospace'; ctx.textAlign = 'right';
      ctx.fillText(fmt(last.p), lx - 8, ly - 10);
      if (st.flash) { const k = (performance.now() - st.flash.t0) / 700; if (k < 1) { ctx.strokeStyle = tk.acc; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, 5 + 22 * k, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; } }
    }
    ctx.font = '10px system-ui'; ctx.fillStyle = tk.mut; ctx.textAlign = 'left';
    ctx.fillText('пунктир — намерения (аск/бид) · сплошная с точками — сделки', x0, c.y + c.h - 7);
  }
  function draw() {
    if (!box.isConnected) return;
    const wide = cv.getBoundingClientRect().width >= 560, H = wide ? 300 : 430;
    const { ctx, W } = L.fitCanvas(cv, H);
    const book = wide ? { x: 0, y: 0, w: Math.floor(W * .44), h: H } : { x: 0, y: 0, w: W, h: 220 };
    const chart = wide ? { x: book.w + 10, y: 0, w: W - book.w - 10, h: H } : { x: 0, y: 228, w: W, h: H - 228 };
    if (wide) { ctx.strokeStyle = tk.line; ctx.beginPath(); ctx.moveTo(book.w + 5, 8); ctx.lineTo(book.w + 5, H - 8); ctx.stroke(); }
    drawBook(ctx, book); drawChart(ctx, chart);
    raf(draw);
  }

  reset(42); renderPanel(); raf(draw); later(background, 1700, true);
};
