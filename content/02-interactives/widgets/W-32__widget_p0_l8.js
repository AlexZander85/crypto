/*
 * W-32 · widget_p0_l8 · 0.8 «Живая свеча OHLC»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: понять, какое из четырёх чисел (Open/High/Low/Close) меняет каждая новая сделка, и что закрытая свеча — факт прошлого, а не прогноз следующей.
 *   Задание: перед каждой сделкой (цена объявлена заранее) выбрать, что изменится; после 8 сделок свеча запечатывается и задаётся главный вопрос урока: «какой будет следующая?».
 *   Ага: (1) Open не меняется никогда, Close меняется всегда; (2) после ответа на финальный вопрос из одного и того же прошлого «вырастают» три разных будущих — зелёное и красные.
 *   Дефолты: цена ≈ 100 000–102 000 $, шаг 50 $ (пример из ТЗ: 101 200), 8 сделок в свече; пресет «Пример из урока 0.7»: 100 → 120 → 90 → 115.
 *   Артефакт: {widget, seed, ohlcOk, ohlcTotal, candles, futureAnswerCorrect} — «свеча ≠ прогноз» понято/не понято.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p0_l8'] = function(box){
  /* ---------- 0. чистим прошлый запуск ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const cssVar = (n, fb)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || fb; };
  const C = {
    acc: cssVar('--acc2','#06b6d4'), ok: cssVar('--ok','#22c55e'), bad: cssVar('--bad','#ef4444'),
    warn: cssVar('--warn','#eab308'), txt: cssVar('--txt','#eef1ff'), mut: cssVar('--mut','#9aa3c7'),
    line: cssVar('--line','rgba(154,163,199,.25)')
  };
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const TICK = 50, TICKS_PER_CANDLE = 8;

  box.innerHTML = `
  <style>
    .xw8{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}
    .xw8 *{box-sizing:border-box}
    .xw8 [hidden]{display:none!important}
    .xw8-head{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}
    .xw8-head b{font-size:16px}
    .xw8-goal{color:var(--mut,#9aa3c7);font-size:13px}
    .xw8-task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:8px 0;border-radius:0 8px 8px 0;background:rgba(6,182,212,.08);font-size:13px}
    .xw8-task.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.10)}
    .xw8-task.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.10)}
    .xw8-task.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.10)}
    .xw8-body{display:flex;gap:12px;flex-wrap:wrap}
    .xw8-chart{flex:1 1 280px;min-width:0}
    .xw8-chart canvas{display:block;width:100%;border-radius:10px;background:rgba(255,255,255,.02)}
    .xw8-side{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:10px}
    .xw8-ohlc{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .xw8-o{border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 4px;text-align:center;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--mut,#9aa3c7);transition:border-color .3s}
    .xw8-o b{display:block;font-size:13px;color:var(--txt,#eef1ff)}
    .xw8-o.chg{border-color:var(--acc2,#06b6d4);animation:xw8f .8s ease-out}
    @keyframes xw8f{0%{background:rgba(6,182,212,.35)}100%{background:transparent}}
    .xw8-q{border:1px solid var(--line,rgba(154,163,199,.25));border-radius:10px;padding:10px 12px;font-size:13px;background:rgba(255,255,255,.02)}
    .xw8-q h4{margin:0 0 8px;font-size:14px}
    .xw8-q h4 b{color:var(--acc2,#06b6d4);font-family:ui-monospace,monospace}
    .xw8-opts{display:flex;flex-direction:column;gap:6px}
    .xw8 button{cursor:pointer;border:1px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.12);color:var(--txt,#eef1ff);border-radius:8px;padding:8px 12px;font:13px system-ui,sans-serif;text-align:left}
    .xw8 button.ghost{border-color:var(--line,rgba(154,163,199,.25));background:transparent;color:var(--mut,#9aa3c7)}
    .xw8 button.opt{width:100%}
    .xw8 button.opt.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.16)}
    .xw8 button.opt.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.16)}
    .xw8 button.opt.dim{opacity:.45}
    .xw8 button:disabled{cursor:default}
    .xw8-why{margin-top:8px;color:var(--mut,#9aa3c7);font-size:13px}
    .xw8-why b{color:var(--txt,#eef1ff)}
    .xw8-next{margin-top:8px;text-align:right}
    .xw8-ctrl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
    .xw8-score{color:var(--mut,#9aa3c7);font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .xw8-chip{border:1px solid var(--ok,#22c55e);color:var(--ok,#22c55e);border-radius:999px;padding:1px 8px}
    .xw8-hist{color:var(--mut,#9aa3c7);font-size:12px}
  </style>
  <div class="xw8">
    <div class="xw8-head">
      <b>Прочитай свечу</b>
      <span class="xw8-goal">Цель: понять, какое из четырёх чисел меняет каждая новая сделка — и почему закрытая свеча ничего не обещает о следующей.</span>
    </div>
    <div class="xw8-task" data-el="task"></div>
    <div class="xw8-body">
      <div class="xw8-chart"><canvas></canvas></div>
      <div class="xw8-side">
        <div class="xw8-ohlc" data-el="ohlc"></div>
        <div class="xw8-q" data-el="q"></div>
      </div>
    </div>
    <div class="xw8-ctrl">
      <div class="xw8-score" data-el="score"></div>
      <button data-a="demo" class="ghost">Пример из урока 0.7 ▶</button>
      <button data-a="new" class="ghost">Новый раунд</button>
    </div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const elTask = $('[data-el=task]'), elQ = $('[data-el=q]'), elOhlc = $('[data-el=ohlc]'), elScore = $('[data-el=score]');
  const S = {};

  const setTask = (t, cls)=>{ elTask.textContent = t; elTask.className = 'xw8-task' + (cls ? ' ' + cls : ''); };
  const colorOf = c => c.c > c.o ? C.ok : c.c < c.o ? C.bad : C.mut;

  /* ---------- модель свечи ---------- */
  function newCandle(open){
    S.candle = { o: open, h: open, l: open, c: open, trades: [open], sealed: false };
    S.disp = { o: open, h: open, l: open, c: open };
    S.prev = { o: open, h: open, l: open, c: open };
  }

  function reset(seed){
    S.seed = seed; S.rnd = mulberry32(seed);
    S.hist = []; S.futures = null; S.anim = null; S.hold = false; S.demo = null;
    S.score = { ok: 0, total: 0 }; S.candles = 0; S.finalAsked = false; S.finalOk = null; S.artifact = null;
    newCandle(100000 + Math.round(S.rnd()*40)*TICK);
    S.phase = 'quiz';
    makeQuestion();
    renderOHLC(); renderScore();
  }

  function genPending(type){
    const c = S.candle; let p = c.h + TICK;
    for(let tries = 0; tries < 40; tries++){
      const r = S.rnd(), range = c.h - c.l;
      if(range >= 2*TICK && r < 0.42) p = c.l + TICK*(1 + Math.floor(S.rnd()*(range/TICK - 1)));   // строго внутри диапазона
      else if(r < 0.71)               p = c.h + TICK*(1 + Math.floor(S.rnd()*8));                  // выше максимума
      else                            p = c.l - TICK*(1 + Math.floor(S.rnd()*8));                  // ниже минимума
      if(p === c.c) continue;
      if(type === 'color' && p === c.o) continue;
      return p;
    }
    return c.h + TICK;
  }

  function shuffle(arr){ for(let i = arr.length - 1; i > 0; i--){ const j = Math.floor(S.rnd()*(i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function makeQuestion(){
    const c = S.candle, n = c.trades.length;            // 1..8 уже есть, следующая — n-я по счёту после Open
    const type = (n === 4 || n === 8) ? 'color' : 'ohlc';
    const X = genPending(type);
    let options;
    if(type === 'ohlc'){
      const above = X > c.h, below = X < c.l, inside = !above && !below;
      const where = above ? `выше прежнего максимума ${fmt(c.h)}` : below ? `ниже прежнего минимума ${fmt(c.l)}` : `внутри уже пройденного диапазона ${fmt(c.l)}–${fmt(c.h)}`;
      options = [
        { text: `Изменится только Close → ${fmt(X)}`, ok: inside,
          why: inside ? `Сделка по ${fmt(X)} прошла внутри диапазона ${fmt(c.l)}–${fmt(c.h)}: максимум и минимум не сдвинулись. А Close — это цена последней сделки, она меняется каждый раз.`
                      : `${fmt(X)} — это ${where}, поэтому сдвинется не только Close, но и ${above ? 'High' : 'Low'}.` },
        { text: `High станет ${fmt(X)} (верхняя тень вырастет) и Close → ${fmt(X)}`, ok: above,
          why: above ? `${fmt(X)} выше прежнего максимума ${fmt(c.h)} → верхняя тень выросла. Close тоже стал ${fmt(X)}: это последняя сделка.`
                     : `High меняется только когда сделка проходит выше прежнего максимума ${fmt(c.h)}. А ${fmt(X)} — ${where}.` },
        { text: `Low станет ${fmt(X)} (нижняя тень вырастет) и Close → ${fmt(X)}`, ok: below,
          why: below ? `${fmt(X)} ниже прежнего минимума ${fmt(c.l)} → нижняя тень выросла. Close тоже стал ${fmt(X)}.`
                     : `Low меняется только когда сделка проходит ниже прежнего минимума ${fmt(c.l)}. А ${fmt(X)} — ${where}.` },
        { text: `Open станет ${fmt(X)} — свеча начнётся заново`, ok: false,
          why: `Open — цена ПЕРВОЙ сделки периода (${fmt(c.o)}). Она записана в первую секунду и не меняется, пока свеча не закроется и не начнётся новая.` }
      ];
    } else {
      const green = X > c.o;
      options = [
        { text: 'Зелёной: Close выше Open', ok: green,
          why: green ? `После сделки Close = ${fmt(X)} > Open ${fmt(c.o)} → тело зелёное.` : `Close станет ${fmt(X)} — это ниже Open ${fmt(c.o)}, тело будет красным. Цвет — только про Open и Close.` },
        { text: 'Красной: Close ниже Open', ok: !green,
          why: !green ? `После сделки Close = ${fmt(X)} < Open ${fmt(c.o)} → тело красное.` : `Close станет ${fmt(X)} — это выше Open ${fmt(c.o)}, тело будет зелёным.` },
        { text: 'Зависит от High и Low: где тень длиннее, туда и цвет', ok: false,
          why: 'Тени показывают размах цены, но цвет тела определяют только Open и Close. Свеча с огромной верхней тенью спокойно может быть красной.' },
        { text: 'Такого же цвета, как предыдущая свеча', ok: false,
          why: 'У свечи нет памяти о соседке: цвет — сравнение её собственных Open и Close.' }
      ];
    }
    S.q = { type, X, options: shuffle(options), answered: false, settled: false };
    S.pending = X;
    S.phase = 'quiz';
    setTask(type === 'ohlc'
      ? `Сделка №${n + 1} из ${TICKS_PER_CANDLE + 1}: объявлена цена ${fmt(X)} $. Выбери, что изменится, — ДО того, как она попадёт в свечу.`
      : `Сделка №${n + 1}: цена ${fmt(X)} $. Какого цвета станет свеча после неё?`);
    renderQ();
  }

  function answer(i){
    const q = S.q; if(!q || q.answered) return;
    q.answered = true; q.picked = i;
    const ok = q.options[i].ok;
    S.score.total++; if(ok) S.score.ok++;
    setTask(ok ? '✓ Верно. Смотри, как сделка влетает в свечу.' : '✗ Не так. Смотри, что реально изменилось.', ok ? 'ok' : 'bad');
    renderQ(); renderScore();
    S.anim = { at: performance.now(), dur: 450, price: S.pending }; S.hold = true;
    later(()=>{ applyTick(S.pending); S.hold = false; }, 450);
    later(()=>{ q.settled = true; renderQ(); }, 950);
  }

  function applyTick(p){
    const c = S.candle;
    S.prev = { o: c.o, h: c.h, l: c.l, c: c.c };
    c.trades.push(p); c.h = Math.max(c.h, p); c.l = Math.min(c.l, p); c.c = p;
    S.pending = null;
    renderOHLC();
  }

  function next(){
    if(S.candle.trades.length >= TICKS_PER_CANDLE + 1) seal();
    else makeQuestion();
  }

  function seal(){
    S.candle.sealed = true; S.candles++;
    S.pending = null; S.q = null;
    if(!S.finalAsked){ askFinal(); }
    else { S.phase = 'sealed'; setTask('Свеча закрыта: четыре числа зафиксированы навсегда. Дальше — следующая свеча.', 'warn'); renderQ(); }
    renderScore();
  }

  function askFinal(){
    const c = S.candle;
    const green = c.c > c.o;
    S.phase = 'final';
    S.final = { answered: false, options: shuffle([
      { text: `Точно ${green ? 'зелёной' : 'красной'} — импульс продолжится`, ok: false, why: 'Свеча — запись уже состоявшихся сделок. У неё нет данных о сделках, которых ещё не было.' },
      { text: `Скорее ${green ? 'зелёной' : 'красной'}: ${green ? 'покупатели' : 'продавцы'} были активнее`, ok: false, why: 'То, что за прошлый период одна сторона была активнее, — факт. Но он про прошлое: следующий период начинается с чистого листа.' },
      { text: 'Неизвестно: свеча — факт прошлого, следующая может быть любой', ok: true, why: 'Именно так. Большая зелёная свеча означает только то, что за ПРОШЛЫЙ период покупатели были активнее. Она не гарантирует следующую зелёную (урок 0.8).' },
      { text: `Точно ${green ? 'красной — после роста бывает откат' : 'зелёной — после падения бывает отскок'}`, ok: false, why: '«После роста должен быть откат» — та же ошибка с обратным знаком: свеча не помнит будущего ни в одну сторону.' }
    ]) };
    setTask(`Свеча закрылась ${green ? 'зелёной' : 'красной'} (Open ${fmt(c.o)} → Close ${fmt(c.c)}). Главный вопрос урока: какой будет СЛЕДУЮЩАЯ свеча?`, 'warn');
    renderQ();
  }

  function answerFinal(i){
    const f = S.final; if(f.answered) return;
    f.answered = true; f.picked = i; S.finalAsked = true; S.finalOk = f.options[i].ok;
    // три возможных «завтра» из одного прошлого
    const open = S.candle.c;
    const futs = [0, 1, 2].map(k => {
      const r = mulberry32(S.seed*31 + k*7919 + S.candles*13);
      let p = open, h = open, l = open;
      for(let n = 0; n < TICKS_PER_CANDLE; n++){ p += (r() < 0.5 ? -1 : 1)*TICK*(1 + Math.floor(r()*6)); h = Math.max(h, p); l = Math.min(l, p); }
      return { o: open, h, l, c: p };
    });
    const signs = futs.map(f => Math.sign(f.c - f.o));
    if(signs.every(s => s === signs[0])){ const f = futs[2]; futs[2] = { o: f.o, h: 2*f.o - f.l, l: 2*f.o - f.h, c: 2*f.o - f.c }; }
    S.futures = futs.map((f, k) => Object.assign(f, { at: performance.now() + k*350 }));
    setTask(S.finalOk ? '✓ Верно. Справа — три «завтра», выросшие из одной и той же закрытой свечи.' : '✗ Свеча не предсказывает. Справа — три «завтра», выросшие из одной и той же закрытой свечи.', S.finalOk ? 'ok' : 'bad');
    renderQ();
    emitArtifact({ widget: 'widget_p0_l8', seed: S.seed, ohlcOk: S.score.ok, ohlcTotal: S.score.total, candles: S.candles, futureAnswerCorrect: S.finalOk });
  }

  function nextCandle(){
    S.hist.push({ o: S.candle.o, h: S.candle.h, l: S.candle.l, c: S.candle.c });
    if(S.hist.length > 4) S.hist.shift();
    S.futures = null;
    newCandle(S.candle.c);
    makeQuestion(); renderOHLC();
  }

  /* ---------- пресет из урока 0.7: 100 → 120 → 90 → 115 ---------- */
  function runDemo(){
    S.futures = null; S.q = null; S.final = null; S.pending = null; S.hist = [];
    newCandle(100); S.phase = 'demo';
    const steps = [
      { p: 120, text: 'В пылу страстей цена взлетала до <b>$120</b> — это <b>High</b>, верхняя тень.' },
      { p: 90,  text: 'Падала от испуга до <b>$90</b> — это <b>Low</b>, нижняя тень.' },
      { p: 115, text: 'Закрылись на <b>$115</b> — это <b>Close</b>. Он выше Open ($100) → тело зелёное.' }
    ];
    S.demo = { step: -1, text: 'Аукцион длиною в час начали торги со <b>$100</b> — это <b>Open</b>.' };
    setTask('Пример из урока 0.7: смотрим, как четыре числа аукциона складываются в одну свечу.');
    renderOHLC(); renderQ();
    steps.forEach((s, k) => later(()=>{
      S.demo.step = k; S.demo.text = s.text;
      S.anim = { at: performance.now(), dur: 450, price: s.p }; S.pending = s.p; S.hold = true;
      later(()=>{ applyTick(s.p); S.hold = false; renderQ(); }, 450);
      renderQ();
    }, 900 + k*1500));
    later(()=>{ S.candle.sealed = true; S.demo.text = 'Свеча сохранила всю историю часа в одном значке: O 100 · H 120 · L 90 · C 115. Нажми «Новый раунд», чтобы вернуться к тренажёру.'; setTask('Пример завершён. Свеча — снимок прошлого часа, не более.', 'warn'); renderQ(); }, 900 + steps.length*1500 + 300);
  }

  /* ---------- артефакт ---------- */
  function emitArtifact(a){
    S.artifact = a; box.dataset.artifact = JSON.stringify(a);
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: a }));
    renderScore();
  }

  /* ---------- HTML ---------- */
  function renderOHLC(){
    const c = S.candle, pv = S.prev || c;
    const item = (k, label, v, hint) => `<div class="xw8-o ${pv[k] !== v ? 'chg' : ''}"><span>${label}</span><b>${fmt(v)}</b><span style="font-size:10px">${hint}</span></div>`;
    elOhlc.innerHTML = item('o', 'Open', c.o, 'первая') + item('h', 'High', c.h, 'макс') + item('l', 'Low', c.l, 'мин') + item('c', 'Close', c.c, 'последняя');
  }

  function renderScore(){
    elScore.innerHTML = `<span>прогнозов OHLC: ${S.score.ok}/${S.score.total}</span><span>свечей закрыто: ${S.candles}</span>` +
      (S.artifact ? `<span class="xw8-chip">артефакт: ${S.artifact.ohlcOk}/${S.artifact.ohlcTotal} · «свеча ≠ прогноз»: ${S.artifact.futureAnswerCorrect ? 'понято' : 'с подсказкой'}</span>` : '');
  }

  function optionsHTML(opts, picked, answered, handlerName){
    return `<div class="xw8-opts">${opts.map((o, i) => {
      let cls = 'opt';
      if(answered){ if(o.ok) cls += ' ok'; else if(i === picked) cls += ' bad'; else cls += ' dim'; }
      return `<button class="${cls}" data-${handlerName}="${i}" ${answered ? 'disabled' : ''}>${o.text}</button>`;
    }).join('')}</div>`;
  }

  function renderQ(){
    if(S.phase === 'demo'){
      elQ.innerHTML = `<h4>Аукцион из урока 0.7</h4><div class="xw8-why">${S.demo.text}</div>`;
      return;
    }
    if(S.phase === 'final'){
      const f = S.final;
      elQ.innerHTML = `<h4>Следующая свеча будет…</h4>` + optionsHTML(f.options, f.picked, f.answered, 'f') +
        (f.answered ? `<div class="xw8-why"><b>Почему:</b> ${f.options[f.picked].why}${f.options[f.picked].ok ? '' : ' ' + f.options.find(o => o.ok).why}
          <br><br>Три свечи справа выросли из одного и того же закрытия ${fmt(S.candle.c)} $: зелёная, красная, разные тени. Свеча — снимок погоды за прошлый час, а не прогноз на завтра.</div>
          <div class="xw8-next"><button data-next="1">Следующая свеча →</button></div>` : '');
      return;
    }
    if(S.phase === 'sealed'){
      elQ.innerHTML = `<h4>Свеча закрыта</h4><div class="xw8-why">Open ${fmt(S.candle.o)} · High ${fmt(S.candle.h)} · Low ${fmt(S.candle.l)} · Close ${fmt(S.candle.c)} — эти числа больше не изменятся.</div><div class="xw8-next"><button data-next="1">Следующая свеча →</button></div>`;
      return;
    }
    const q = S.q; if(!q) return;
    const c = S.candle;
    const dir = q.X > c.c ? '▲ выше текущей цены' : '▼ ниже текущей цены';
    elQ.innerHTML = `<h4>Следующая сделка: <b>${fmt(q.X)} $</b> <span style="color:${C.mut};font-weight:normal;font-size:12px">(${dir} ${fmt(c.c)})</span></h4>` +
      `<div style="margin-bottom:8px;color:${C.mut}">${q.type === 'ohlc' ? 'Что изменится в свече?' : 'Какого цвета станет свеча?'}</div>` +
      optionsHTML(q.options, q.picked, q.answered, 'o') +
      (q.answered ? `<div class="xw8-why"><b>Почему:</b> ${q.options[q.picked].why}${q.options[q.picked].ok ? '' : ' <b>Правильно:</b> ' + q.options.find(o => o.ok).why}</div>
        <div class="xw8-next"><button data-next="1" ${q.settled ? '' : 'disabled'}>${c.trades.length >= TICKS_PER_CANDLE + 1 ? 'Запечатать свечу →' : 'Следующая сделка →'}</button></div>` : '');
  }

  /* ---------- канвас ---------- */
  function fit(){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(260, cv.parentNode.clientWidth || 300);
    const h = Math.max(260, Math.min(360, Math.round(w*0.8)));
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); cv.style.height = h + 'px';
  }

  function drawCandle(x, w, c, alpha, col){
    // c — {o,h,l,c}; координаты y берём из замыкания draw через S._yOf
    const y = S._yOf;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, w*0.06);
    ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
    const top = Math.min(y(c.o), y(c.c)), bh = Math.max(Math.abs(y(c.o) - y(c.c)), 2);
    ctx.fillStyle = col; ctx.fillRect(x - w/2, top, w, bh);
    ctx.globalAlpha = 1;
  }

  function draw(now){
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width/dpr, H = cv.height/dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    // плавное «дорастание» отображаемых значений
    if(!S.hold){ ['o','h','l','c'].forEach(k => { S.disp[k] += (S.candle[k] - S.disp[k])*0.18; if(Math.abs(S.candle[k] - S.disp[k]) < 0.5) S.disp[k] = S.candle[k]; }); }

    const padL = 10, padR = 74, top = 22, bottom = 22;
    const all = [S.disp, S.candle].concat(S.hist, S.futures || []);
    let lo = Infinity, hi = -Infinity;
    all.forEach(c => { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); });
    if(S.pending != null){ lo = Math.min(lo, S.pending); hi = Math.max(hi, S.pending); }
    const unit = S.phase === 'demo' ? 5 : TICK;
    if(hi - lo < 6*unit){ const m = (hi + lo)/2; lo = m - 3*unit; hi = m + 3*unit; }
    const pad = (hi - lo)*0.14; lo -= pad; hi += pad;
    const plotH = H - top - bottom;
    const yOf = p => top + (hi - p)/(hi - lo)*plotH; S._yOf = yOf;

    // сетка
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    for(let k = 0; k <= 4; k++){ const v = lo + (hi - lo)*k/4, y = yOf(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); }
    ctx.setLineDash([]);

    // геометрия
    const hasFut = !!S.futures;
    const plotW = W - padL - padR;
    const cx = padL + plotW*(hasFut ? 0.36 : 0.52);
    const cw = Math.min(46, plotW*0.14);

    // история
    S.hist.forEach((c, k) => { const x = padL + 16 + k*22; drawCandle(x, 12, c, 0.5, colorOf(c)); });
    if(S.hist.length){ ctx.fillStyle = C.mut; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('закрытые', padL + 8, H - 6); }

    // главная свеча
    const d = S.disp;
    const col = d.c > d.o ? C.ok : d.c < d.o ? C.bad : C.mut;
    drawCandle(cx, cw, d, 1, col);
    if(S.candle.sealed){
      ctx.fillStyle = C.ok; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✓ закрыта', cx, yOf(d.h) - 8);
    } else {
      const pulse = 0.5 + 0.5*Math.sin(now/280);
      const gy = yOf(d.c);
      const g = ctx.createRadialGradient(cx + cw/2 + 4, gy, 0, cx + cw/2 + 4, gy, 8 + 6*pulse);
      g.addColorStop(0, 'rgba(6,182,212,0.6)'); g.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + cw/2 + 4, gy, 8 + 6*pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.mut; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`сделок: ${S.candle.trades.length}/${TICKS_PER_CANDLE + 1}`, cx, H - 6);
    }

    // подписи O/H/L/C с разводкой наложений
    const items = [
      { k: 'H', v: d.h, col: C.ok }, { k: 'C', v: d.c, col: C.acc }, { k: 'O', v: d.o, col: C.txt }, { k: 'L', v: d.l, col: C.bad }
    ].sort((a, b) => b.v - a.v).map(it => Object.assign(it, { y: yOf(it.v) }));
    for(let i = 1; i < items.length; i++){ if(items[i].y - items[i-1].y < 13) items[i].y = items[i-1].y + 13; }
    const lx = W - padR + 6;
    items.forEach(it => {
      ctx.strokeStyle = it.col; ctx.globalAlpha = 0.55; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + cw/2 + 10, yOf(it.v)); ctx.lineTo(lx - 4, it.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = it.col; ctx.textAlign = 'left'; ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.fillText(`${it.k} ${fmt(it.v)}`, lx, it.y + 4);
    });

    // объявленная сделка: маркер у правой кромки + полёт
    if(S.pending != null || (S.anim && now - S.anim.at < S.anim.dur)){
      const price = S.pending != null ? S.pending : S.anim.price;
      const py = yOf(price), mx = W - padR - 14;
      let dotX = mx, dotY = py, a = 1;
      if(S.anim && now - S.anim.at < S.anim.dur){
        const t = (now - S.anim.at)/S.anim.dur, e = 1 - Math.pow(1 - t, 3);
        dotX = mx + (cx + cw/2 - mx)*e; dotY = py + (yOf(price) - py)*e; a = 1;
      } else if(S.anim){ S.anim = null; }
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.warn; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(mx, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.warn; ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0d1022'; ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.warn; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`сделка → ${fmt(price)}`, mx + 6, top - 8);
      ctx.globalAlpha = 1;
    }

    // три возможных «завтра»
    if(S.futures){
      S.futures.forEach((f, k) => {
        const t = Math.min(1, Math.max(0, (now - f.at)/500));
        if(t <= 0) return;
        const x = padL + plotW*(0.62 + k*0.13), w = Math.min(20, plotW*0.06);
        drawCandle(x, w, f, 0.35 + 0.55*t, colorOf(f));
        ctx.fillStyle = C.mut; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`завтра ${k + 1}`, x, H - 6);
      });
      ctx.fillStyle = C.mut; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('одно прошлое →', cx + cw/2 + 14, yOf(S.candle.c) - 10);
    }
  }

  function loop(now){ draw(now); box._expRaf = requestAnimationFrame(loop); }

  /* ---------- события ---------- */
  elQ.addEventListener('click', e => {
    const b = e.target.closest('button'); if(!b || b.disabled) return;
    if(b.dataset.o != null) answer(+b.dataset.o);
    else if(b.dataset.f != null) answerFinal(+b.dataset.f);
    else if(b.dataset.next != null){
      if(S.phase === 'quiz') next();
      else nextCandle();
    }
  });
  $('[data-a=demo]').addEventListener('click', ()=>{ box._expTimers.forEach(t => clearTimeout(t)); box._expTimers = []; runDemo(); });
  $('[data-a=new]').addEventListener('click', ()=>{ box._expTimers.forEach(t => clearTimeout(t)); box._expTimers = []; reset((Date.now() & 0xffff) || 1); });
  box._expResize = fit;
  window.addEventListener('resize', fit);

  /* ---------- старт ---------- */
  fit();
  reset(7);
  box._expRaf = requestAnimationFrame(loop);
};
