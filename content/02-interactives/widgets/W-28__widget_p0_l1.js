/*
 * W-28 · widget_p0_l1 · 0.1 «Карта сети: перевод = объявление всем»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть физику одного перевода: транзакция подписывается ключом Алисы, рассылается ВСЕМ узлам
 *   Задание:  1) до «Отправить» предсказать, кто получит транзакцию первым (3 варианта); 2) отправить 0.1 BTC и
 *   Ага:      сцена 1 — волна расходится от Москвы по всем линиям, Боб в Сиднее загорается 5–6-м, вердикт: «Боб получил
 *   Дефолты:  6 узлов, 9 каналов, 0.1 BTC, подпись 900 мс, задержка канала 300–1200 мс, майнинг 2400 мс,
 *   Артефакт: «Блок #N · хэш 0000… · prev … · собрал: <узел> · прогноз: верно/нет» → expert:artifact + box.dataset.artifact.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p0_l1'] = function (box) {
  // ── 0. чистим прошлый запуск ─────────────────────────────────────────
  if (box._expTimers) box._expTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
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

  // ── палитра из CSS-переменных приложения (с фолбэками) ───────────────
  const cs = getComputedStyle(box);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  const C = { txt: v('--txt', '#eef1ff'), mut: v('--mut', '#9aa3c7'), line: v('--line', 'rgba(255,255,255,.14)'),
              acc: v('--acc2', '#06b6d4'), ok: v('--ok', '#22c55e'), bad: v('--bad', v('--err', '#ef4444')),
              warn: v('--warn', '#eab308'), bg: '#0a0e1e' };

  // ── константы сцены ──────────────────────────────────────────────────
  const NODES = [
    { name: 'Москва',    who: 'Алиса', x: .60, y: .26 },
    { name: 'Берлин',    who: '',      x: .48, y: .33 },
    { name: 'Нью-Йорк',  who: '',      x: .19, y: .38 },
    { name: 'Токио',     who: '',      x: .86, y: .40 },
    { name: 'Сан-Паулу', who: '',      x: .31, y: .74 },
    { name: 'Сидней',    who: 'Боб',   x: .86, y: .78 },
  ];
  const EDGES = [[0, 1], [0, 3], [0, 2], [1, 2], [1, 4], [2, 4], [3, 5], [4, 5], [1, 3]];
  const T_SIGN = 900, T_MINE = 2400, T_VERIFY = 450, AMOUNT = 0.1;
  const PRED = ['Боб — платёж адресован ему', 'Ближайший сосед Москвы по каналу', 'Все шесть одновременно'];
  const PRED_OK = 1;

  // хэш: FNV-1a → 16 hex-символов (учебный, детерминированный)
  const h32 = (s, h = 0x811c9dc5) => { h >>>= 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const hx = s => h32(s).toString(16).padStart(8, '0') + h32(s + '#2').toString(16).padStart(8, '0');
  const short = h => h.slice(0, 4) + '…' + h.slice(-4);
  const nb = i => EDGES.map((e, k) => e[0] === i ? { j: e[1], lat: S.lat[k] } : e[1] === i ? { j: e[0], lat: S.lat[k] } : null).filter(Boolean);

  // ── разметка ─────────────────────────────────────────────────────────
  box.innerHTML = `
  <style>
    .w28{font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${C.txt};background:linear-gradient(180deg,#0d1022,#040714);
         border:1px solid ${C.line};border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
    .w28 *{box-sizing:border-box}
    .w28-head b{font-size:15px;display:block;margin-bottom:2px}
    .w28-head span{color:${C.mut}}
    .w28-task{margin:12px 0 6px;color:${C.acc};font-weight:600}
    .w28-pred,.w28-row,.w28-forge{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}
    .w28 button{font:inherit;color:${C.txt};background:transparent;border:1px solid ${C.line};border-radius:8px;padding:6px 10px;cursor:pointer}
    .w28 button:hover{border-color:${C.acc}}
    .w28 button.on{border-color:${C.acc};background:rgba(6,182,212,.14)}
    .w28 button.pri{background:${C.acc};color:#04121a;border-color:${C.acc};font-weight:600}
    .w28 button:disabled{opacity:.4;cursor:default}
    .w28 select{font:inherit;color:${C.txt};background:#0d1022;border:1px solid ${C.line};border-radius:8px;padding:5px 8px}
    .w28 label{color:${C.mut};display:flex;gap:4px;align-items:center}
    .w28-bal{margin-left:auto;font-family:ui-monospace,Menlo,Consolas,monospace;color:${C.mut}}
    .w28 canvas{display:block;width:100%;border-radius:10px;margin:8px 0;background:${C.bg}}
    .w28-verdict{min-height:20px;padding:10px 12px;border-left:3px solid ${C.acc};background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;margin:8px 0}
    .w28-verdict b{color:${C.acc}}
    .w28-log{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;max-height:150px;overflow:auto;border:1px solid ${C.line};border-radius:8px;padding:8px;background:#070a17}
    .w28-log .t{color:${C.mut};margin-right:6px}
    .w28-log .ok{color:${C.ok}} .w28-log .bad{color:${C.bad}}
    .w28-art{margin-top:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:${C.mut}}
  </style>
  <div class="w28">
    <div class="w28-head"><b>Карта сети: перевод = объявление всем</b>
      <span>Цель: увидеть, что транзакция уходит всем узлам, а не Бобу, и что блок каждый узел проверяет сам.</span></div>
    <div class="w28-task">Шаг 1 · Прогноз: кто получит транзакцию Алисы первым?</div>
    <div class="w28-pred">${PRED.map((p, i) => `<button data-p="${i}">${p}</button>`).join('')}</div>
    <div class="w28-row">
      <button class="w28-send pri" disabled>Отправить 0.1 BTC</button>
      <label><input type="checkbox" class="w28-fast"> быстро ×2</label>
      <button class="w28-new">Новый раунд</button>
      <span class="w28-bal"></span>
    </div>
    <canvas></canvas>
    <div class="w28-forge" hidden>
      <span style="color:${C.acc};font-weight:600">Шаг 3 · Подделка:</span>
      <select>${NODES.map((n, i) => `<option value="${i}">${n.name}</option>`).join('')}</select>
      <button class="w28-doforge">приписать +100 BTC этому узлу</button>
    </div>
    <div class="w28-verdict"></div>
    <div class="w28-log"></div>
    <div class="w28-art"></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const elLog = $('.w28-log'), elVer = $('.w28-verdict'), elBal = $('.w28-bal'), elForge = $('.w28-forge');
  const predBtns = [...box.querySelectorAll('.w28-pred button')];
  let W = 0, H = 0, fast = false;

  // ── состояние раунда ─────────────────────────────────────────────────
  let S;
  function newRound(seed) {
    const rnd = mulberry32(seed);
    S = {
      seed, rnd,
      lat: EDGES.map(() => Math.round(300 + rnd() * 900)),
      miner: 1 + Math.floor(rnd() * 5),            // майнер — не Москва
      height: 840000 + Math.floor(rnd() * 9000),
      prev: '0000' + hx('prev' + seed).slice(4),
      phase: 'idle', prediction: null, predictionOk: null,
      now: 0, t0: 0, events: [], pulses: [], rankCounter: 0,
      nodes: NODES.map(n => ({ ...n, gotTx: false, rank: 0, cube: 'none', mark: '', hash: '' })),
      block: null, mineShown: '', alice: 1.0, bob: 0.0, pending: 0, log: []
    };
    predBtns.forEach(b => { b.classList.remove('on'); b.disabled = false; });
    $('.w28-send').disabled = true; elForge.hidden = true;
    elVer.innerHTML = ''; elLog.innerHTML = ''; $('.w28-art').textContent = '';
    balances(); draw();
  }

  const sched = (t, fn) => { S.events.push({ t, fn }); S.events.sort((a, b) => a.t - b.t); };
  function log(txt, cls) { S.log.push({ t: S.now, txt, cls }); if (S.log.length > 60) S.log.shift();
    elLog.innerHTML = S.log.map(l => `<div class="${l.cls || ''}"><span class="t">+${Math.round(l.t)} мс</span>${l.txt}</div>`).join('');
    elLog.scrollTop = elLog.scrollHeight; }
  const verdict = (title, txt) => { elVer.innerHTML = `<b>${title}</b> · ${txt}`; };
  const balances = () => { elBal.textContent = `Алиса ${S.alice.toFixed(1)} BTC · Боб ${S.bob.toFixed(1)} BTC` + (S.pending ? ` (ждёт блока: ${S.pending})` : ''); };

  // ── сцена 1: подпись и рассылка ──────────────────────────────────────
  function send() {
    if (S.phase !== 'idle' || S.prediction === null) return;
    predBtns.forEach(b => b.disabled = true); $('.w28-send').disabled = true;
    S.phase = 'signing'; log('Алиса подписывает транзакцию своим приватным ключом…');
    sched(S.now + T_SIGN, () => {
      log('Подпись готова. Транзакция уходит ВСЕМ соседям Москвы — не Бобу лично.');
      S.phase = 'propagating'; S.t0 = S.now; receiveTx(0, S.now);
    });
    kick();
  }
  function receiveTx(i, T) {
    const n = S.nodes[i]; if (n.gotTx) return;
    n.gotTx = true; n.rank = ++S.rankCounter;
    if (i !== 0) log(`${n.name}${n.who ? ' (' + n.who + ')' : ''} получил транзакцию ${n.rank}-м · +${Math.round(T - S.t0)} мс`);
    if (n.rank === 2) {
      S.predictionOk = (S.prediction === PRED_OK);
      log(`Прогноз «${PRED[S.prediction]}» — ${S.predictionOk ? 'верно' : 'мимо'}: первым получил ${n.name}, у него самый короткий канал до Москвы.`, S.predictionOk ? 'ok' : 'bad');
    }
    if (i === 5) { S.pending = AMOUNT; balances();
      verdict('Сцена 1', `Боб получил транзакцию ${n.rank}-м из 6 — как обычный участник сети, а не как адресат письма. Деньги ещё не его: блока нет.`); }
    nb(i).forEach(({ j, lat }) => { if (S.nodes[j].gotTx) return;
      S.pulses.push({ from: i, to: j, start: T, dur: lat, kind: 'tx' }); sched(T + lat, () => receiveTx(j, T + lat)); });
    if (S.rankCounter === 6) { S.phase = 'mempool'; log('Все 6 узлов держат транзакцию в мемпуле. Денег у Боба по-прежнему нет.'); sched(T + 600, startMining); }
  }

  // ── сцена 2: майнинг и проверка блока каждым узлом ───────────────────
  function mine() {
    const data = `#${S.height}|prev:${S.prev}|Алиса→Боб ${AMOUNT} BTC|`;
    let nonce = Math.floor(S.rnd() * 50000), hash = '';
    for (let k = 0; k < 400000; k++) { hash = hx(data + nonce); if (hash.startsWith('0000')) break; nonce++; }
    if (!hash.startsWith('0000')) hash = '0000' + hash.slice(4);   // страховка на 0.2% случаев
    return { data, nonce, hash };
  }
  function startMining() {
    S.phase = 'mining'; const m = S.nodes[S.miner];
    log(`${m.name} собирает блок #${S.height} и перебирает nonce…`);
    const tick = later(() => { S.mineShown = hx('try' + Math.floor(performance.now())).slice(0, 10); }, 90, true);
    sched(S.now + T_MINE, () => {
      clearInterval(tick); S.block = mine();
      log(`Блок найден: хэш <span class="ok">${S.block.hash.slice(0, 12)}…</span> nonce=${S.block.nonce}. ${m.name} рассылает блок всем.`);
      S.phase = 'blockprop'; receiveBlock(S.miner, S.now, true);
    });
  }
  function receiveBlock(i, T, isMiner) {
    const n = S.nodes[i]; if (n.cube !== 'none') return;
    n.cube = 'check'; n.hash = S.block.hash;
    sched(T + (isMiner ? 0 : T_VERIFY), () => {
      n.cube = 'ok'; n.mark = '✓';
      if (!isMiner) log(`${n.name}: проверил подписи, хэш и отсутствие двойной траты — записал блок в свою копию`);
      if (S.nodes.every(x => x.cube === 'ok')) confirmed();
    });
    nb(i).forEach(({ j, lat }) => { if (S.nodes[j].cube !== 'none') return;
      S.pulses.push({ from: i, to: j, start: T, dur: lat, kind: 'block' }); sched(T + lat, () => receiveBlock(j, T + lat, false)); });
  }
  function confirmed() {
    S.phase = 'confirmed'; S.alice -= AMOUNT; S.bob += AMOUNT; S.pending = 0; balances();
    verdict('Сцена 2', `Одинаковый блок ${short(S.block.hash)} лежит теперь под всеми шестью узлами. Никто не «доставлял» деньги Бобу — каждый узел сам проверил блок и записал его. Теперь 0.1 BTC — его.`);
    elForge.hidden = false;
    const txt = `Блок #${S.height} · хэш ${S.block.hash.slice(0, 8)}… · prev ${S.prev.slice(0, 8)}… · собрал: ${S.nodes[S.miner].name} · прогноз: ${S.predictionOk ? 'верно' : 'нет'}`;
    box.dataset.artifact = txt; $('.w28-art').textContent = 'Артефакт: ' + txt;
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: { id: 'widget_p0_l1', text: txt } }));
  }

  // ── сцена 3: подделка своей копии ────────────────────────────────────
  function forge(k) {
    if (S.phase !== 'confirmed') return; S.phase = 'forging';
    const n = S.nodes[k];
    const fake = hx(S.block.data + `|+100 BTC ${n.name}` + S.block.nonce);
    n.cube = 'bad'; n.hash = fake; n.mark = '✗';
    log(`${n.name} приписал себе +100 BTC в СВОЕЙ копии. Хэш блока стал <span class="bad">${fake.slice(0, 8)}…</span> — нули исчезли.`, 'bad');
    const T = S.now; let first = null;
    nb(k).forEach(({ j, lat }) => {
      S.pulses.push({ from: k, to: j, start: T, dur: lat, kind: 'ask' });
      sched(T + lat, () => {
        const m = S.nodes[j]; m.mark = '✓ у меня иначе';
        log(`${m.name}: сверил со своей копией — у меня ${short(S.block.hash)}, у тебя ${short(fake)}. Не принимаю.`);
        S.pulses.push({ from: j, to: k, start: T + lat, dur: lat, kind: 'block' });
        sched(T + 2 * lat, () => {
          if (first !== null) return; first = j;
          n.cube = 'check'; n.hash = S.block.hash; n.mark = '';
          log(`${n.name} перекачивает правильный блок у ${m.name} и проверяет его заново…`);
          sched(S.now + T_VERIFY, () => {
            n.cube = 'ok'; n.mark = '✓'; S.nodes.forEach(x => { if (x.mark.startsWith('✓ у')) x.mark = '✓'; });
            S.phase = 'confirmed';
            log('Подделка отброшена. Никто не голосовал — каждый узел проверил сам и остался при своей копии.', 'ok');
            verdict('Сцена 3', 'Никто не голосовал — каждый проверил сам. Правда в сети — та копия, которая проходит проверку у всех, а не та, за которую «больше рук». Подделать можно только свою тетрадку, и она тут же становится бесполезной.');
          });
        });
      });
    });
    kick();
  }

  // ── цикл симуляции (виртуальное время) ───────────────────────────────
  let running = false, lastTs = 0;
  function kick() { if (running) return; running = true; lastTs = performance.now(); box._expRaf = requestAnimationFrame(frame); }
  function frame(ts) {
    const dt = Math.min(64, ts - lastTs); lastTs = ts; S.now += dt * (fast ? 2 : 1);
    while (S.events.length && S.events[0].t <= S.now) S.events.shift().fn();
    S.pulses = S.pulses.filter(p => S.now < p.start + p.dur);
    draw();
    if (!S.events.length && !S.pulses.length) { running = false; box._expRaf = null; return; }
    box._expRaf = requestAnimationFrame(frame);
  }

  // ── рисование ────────────────────────────────────────────────────────
  function resize() {
    const w = Math.max(320, (box.clientWidth || 360) - 30);
    const h = Math.round(Math.min(440, Math.max(250, w * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h; draw();
  }
  const P = i => ({ x: S.nodes[i].x * W, y: S.nodes[i].y * H });
  function draw() {
    if (!W) return;
    const small = W < 480, R = small ? 11 : 13;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1022'); g.addColorStop(1, '#040714');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // каналы
    ctx.font = `${small ? 9 : 10}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    EDGES.forEach((e, k) => {
      const a = P(e[0]), b = P(e[1]);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = C.mut; ctx.fillText(S.lat[k] + ' мс', (a.x + b.x) / 2, (a.y + b.y) / 2 - 6);
    });
    // импульсы
    S.pulses.forEach(p => {
      const a = P(p.from), b = P(p.to), f = Math.min(1, (S.now - p.start) / p.dur);
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      const col = p.kind === 'tx' ? C.acc : p.kind === 'block' ? C.ok : C.bad;
      ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, p.kind === 'block' ? 5 : 4, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      if (p.kind === 'block') { ctx.fillStyle = '#04121a'; ctx.fillRect(x - 2.5, y - 2.5, 5, 5); }
    });
    // узлы
    S.nodes.forEach((n, i) => {
      const { x, y } = P(i);
      if (S.phase === 'mining' && i === S.miner) { ctx.strokeStyle = C.warn; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, R + 6, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = n.gotTx ? 'rgba(6,182,212,.28)' : '#141a33';
      ctx.strokeStyle = i === 0 ? C.acc : (n.gotTx ? C.acc : C.line); ctx.lineWidth = i === 0 ? 2 : 1.5;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.txt; ctx.font = `600 ${small ? 10 : 11}px system-ui,sans-serif`; ctx.fillText(n.name, x, y + R + 9);
      if (n.who) { ctx.fillStyle = C.acc; ctx.font = `${small ? 9 : 10}px system-ui,sans-serif`; ctx.fillText(n.who, x, y - R - 8); }
      if (n.rank) { ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(x + R - 1, y - R + 1, 7, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#04121a'; ctx.font = '700 9px system-ui'; ctx.fillText(n.rank, x + R - 1, y - R + 1.5); }
      if (S.phase === 'mining' && i === S.miner) { ctx.fillStyle = C.warn; ctx.font = '10px ui-monospace,Menlo,monospace'; ctx.fillText('⛏ ' + S.mineShown, x, y + R + 22); }
      // кубик блока под узлом
      if (n.cube !== 'none') {
        const cx = x - 6, cy = y + R + 15;
        if (n.cube === 'check') { ctx.strokeStyle = C.warn; ctx.setLineDash([2, 2]); ctx.strokeRect(cx, cy, 12, 12); ctx.setLineDash([]); }
        else { ctx.fillStyle = n.cube === 'ok' ? C.ok : C.bad; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = n.cube === 'bad' ? 14 : 6;
          ctx.fillRect(cx, cy, 12, 12); ctx.shadowBlur = 0; }
        ctx.font = '9px ui-monospace,Menlo,monospace'; ctx.textAlign = 'left';
        ctx.fillStyle = n.cube === 'bad' ? C.bad : C.mut; ctx.fillText((n.hash ? n.hash.slice(0, 6) + '…' : '') + (n.mark ? ' ' + n.mark : ''), cx + 16, cy + 6);
        ctx.textAlign = 'center';
      }
    });
    // легенда
    ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = C.mut;
    ctx.fillText('● транзакция   ■ блок   ● запрос соседям   номер = порядок получения', 10, H - 10);
    ctx.textAlign = 'center';
  }

  // ── события UI ───────────────────────────────────────────────────────
  predBtns.forEach(b => b.addEventListener('click', () => { if (S.phase !== 'idle') return;
    S.prediction = +b.dataset.p; predBtns.forEach(x => x.classList.toggle('on', x === b)); $('.w28-send').disabled = false; }));
  $('.w28-send').addEventListener('click', send);
  $('.w28-fast').addEventListener('change', e => { fast = e.target.checked; });
  $('.w28-new').addEventListener('click', () => newRound(Date.now() | 0));
  $('.w28-doforge').addEventListener('click', () => forge(+$('.w28-forge select').value));
  box._expResize = resize; window.addEventListener('resize', resize);

  newRound(42); resize();
};
