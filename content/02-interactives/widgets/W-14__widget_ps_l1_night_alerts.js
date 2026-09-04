/*
 * W-14 · widget_ps_l1_night_alerts · П1 «Сломался или просто страшно?»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что из 6 ночных тревог факт мира — ровно одна; остальные утром «всё то же самое».
 *   Задание:  пройти ночь 01:40–04:50, не потеряв ни сна, ни денег: спать на «голове», действовать на «мире».
 *   Ага:      утренняя сводка — пять событий рассосались сами; единственный факт мира виден по одной строке журнала.
 *   Дефолты:  seed 42; 6 событий (1 мир + 5 голова из пула 3/6); сон 100, учебный счёт $1000; эталон протокола: сон 88, $995.
 *   Артефакт: белый список ночных событий + два вопроса перед касанием (текст в моноблоке).
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l1_night_alerts'] = function(box){
  // 0. чистим прошлый запуск
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => { seed|=0; seed = seed + 0x6D2B79F5|0; let t = Math.imul(seed ^ seed>>>15, 1|seed); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; };
  const $ = s => box.querySelector(s);
  const cssv = (n, f)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { acc:cssv('--acc2','#06b6d4'), ok:cssv('--ok','#22c55e'), bad:cssv('--bad','#ef4444'), warn:cssv('--warn','#eab308'), mut:cssv('--mut','#9aa3c7'), txt:cssv('--txt','#eef1ff') };
  const sg = n => (n>0?'+':'')+n;

  // ---------- данные сценария ----------
  const WORLD = [
    {src:'Монитор бота', txt:'Нет ответа от биржи 15 мин. Последний ордер SOL не подтверждён.', truth:'связь с биржей потеряна, ордер в неизвестном состоянии.', morn:'бот простоял 5 часов с открытой позицией без серверного стопа.'},
    {src:'Монитор бота', txt:'Отправлен ордер SELL ETH 4.0. Стратегия не торгует ETH.', truth:'бот отправил приказ, которого не мог. Поломка или чужой доступ.', morn:'серия чужих ордеров — часть депозита ушла.'},
    {src:'Монитор бота', txt:'Цена в боте BTC 61 240, на бирже 64 180. Расхождение 4,6%.', truth:'данные бота не совпадают с биржей — сигналы считаются по мусору.', morn:'бот наоткрывал сделок по ложным ценам.'}
  ];
  const HEAD = [
    {src:'Бот', txt:'Позиция BTC открыта. PnL: −1,8%.', truth:'минус в пределах обычной болтанки стратегии. Факта поломки нет.', morn:'−0,4%, позиция жива, стоп не задет.'},
    {src:'Канал «Крипто-срочно»', txt:'❗ ЭКСТРЕННО: регулятор запрещает ВСЁ. Продавайте, пока не поздно!', truth:'новость — не факт мира вокруг твоего бота. Бот не читает новости, и устав тоже.', morn:'«новость» — перепечатка прошлогоднего слуха.'},
    {src:'Бот', txt:'Позиция в плюсе +2,1%. До цели +4% ещё 1,9%.', truth:'жадность зовёт «забрать руками». Тейк стоит по уставу.', morn:'закрылась по тейку +4%.'},
    {src:'Саша (друг)', txt:'ты видел график?? я всё продал. сливай!!!', truth:'чужая паника. Саша торгует руками и без устава.', morn:'Саша откупает дороже, чем продал.'},
    {src:'Бот', txt:'Сигнал на вход SOL: RSI 34, фильтр EMA пройден.', truth:'обычный сигнал стратегии. «Странным» он кажется только в четыре утра.', morn:'сделка в работе, всё по правилам.'},
    {src:'Бот', txt:'PnL за сутки −2,5%. Дневной лимит −3%.', truth:'внутри лимита. Если лимит пробьётся, kill-switch сработает сам.', morn:'день закрылся −1,1%.'}
  ];
  const TIMES = ['01:40','02:15','02:50','03:25','04:05','04:50'];
  const CHOICES = [
    {id:'sleep', l:'😴 Спать дальше'},
    {id:'note',  l:'📝 Записать — разберу утром'},
    {id:'check', l:'👀 Открыть терминал'},
    {id:'kill',  l:'🛑 Аварийная кнопка'}
  ];
  // последствия: [сон, капитал $, вердикт, разбор]
  const OUT = {
    head: {
      sleep:[0, 0, 'ok',  'Верно. Факта нет — будильник звенел только в голове.'],
      note: [-4, 0, 'ok', 'Допустимо: строка в журнал стоит четырёх минут сна. Утром — разбор.'],
      check:[-12, -8, 'warn', '«Одним глазком» в три ночи не бывает: −12 сна и мелкое вмешательство «раз уж открыл».'],
      kill: [-20, -40, 'bad', 'Ты выключил исправную машину с положительным перевесом: комиссия тейкера + пропущенное движение.']
    },
    world: {
      sleep:[0, -70, 'bad', 'Это был единственный факт мира за ночь. Утром — сюрприз (и ещё −15 сна от нервов).'],
      note: [0, -70, 'bad', 'Записать — мало: факт мира требует действия сейчас. Утром — сюрприз.'],
      check:[-12, -5, 'ok', 'Верно: изменился мир. Проверил состояние ордера, перезапустил — цена вопроса минимальна.'],
      kill: [-18, -12, 'ok', 'Допустимо: при неизвестном состоянии ордера закрыть всё — грубо, но по белому списку.']
    }
  };
  const START_CAP = 1000, START_SLEEP = 100;

  // ---------- разметка ----------
  box.innerHTML = `
  <style>
  .w14{color:var(--txt,#eef1ff);background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;font-size:14px;line-height:1.4}
  .w14 *{box-sizing:border-box}
  .w14 .hd{font-size:13px;color:var(--mut,#9aa3c7);margin-bottom:12px}
  .w14 .hd b,.w14 .hd i{color:var(--txt,#eef1ff)}
  .w14 .wrap{display:flex;gap:14px;flex-wrap:wrap}
  .w14 .phone{flex:0 0 240px;max-width:100%;height:420px;border-radius:28px;border:3px solid #1c2140;background:linear-gradient(180deg,#0a0e22,#05081a);position:relative;overflow:hidden;transition:background .8s}
  .w14 .phone.morn{background:linear-gradient(180deg,#1b2145 0%,#6b3f2a 80%,#c2762d 100%)}
  .w14 .phone.buzz{animation:w14buzz .55s}
  @keyframes w14buzz{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
  .w14 .notch{position:absolute;top:8px;left:50%;width:90px;height:20px;margin-left:-45px;border-radius:12px;background:#000}
  .w14 .clock{text-align:center;margin-top:44px;font-size:46px;font-weight:600;font-family:var(--mono,ui-monospace,monospace);letter-spacing:1px}
  .w14 .date{text-align:center;font-size:11px;color:var(--mut,#9aa3c7)}
  .w14 .notif{position:absolute;left:10px;right:10px;top:150px;background:rgba(255,255,255,.09);backdrop-filter:blur(6px);border-radius:14px;padding:10px 12px;transform:translateY(-30px);opacity:0;transition:all .45s}
  .w14 .notif.in{transform:none;opacity:1}
  .w14 .notif .src{font-size:11px;color:var(--mut,#9aa3c7)}
  .w14 .notif .txt{font-size:13px;margin-top:4px}
  .w14 .snd{position:absolute;bottom:14px;left:0;right:0;text-align:center;font-size:11px;color:var(--mut,#9aa3c7);letter-spacing:2px}
  .w14 .side{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:10px}
  .w14 .meters{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .w14 .meter{border:1px solid var(--line,rgba(255,255,255,.08));border-radius:10px;padding:8px 10px}
  .w14 .meter .lbl{font-size:11px;color:var(--mut,#9aa3c7)}
  .w14 .meter .val{font-family:var(--mono,ui-monospace,monospace);font-size:20px;margin:2px 0 4px}
  .w14 .meter small{font-size:11px;color:var(--mut,#9aa3c7)}
  .w14 .bar{height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
  .w14 .bar i{display:block;height:100%;border-radius:4px;transition:width .6s,background .6s}
  .w14 .btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .w14 button{cursor:pointer;border-radius:9px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);padding:10px 8px;font-size:13px;line-height:1.25;font-family:inherit}
  .w14 button:hover{border-color:var(--acc2,#06b6d4)}
  .w14 button:disabled{opacity:.35;cursor:default}
  .w14 button.pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:600}
  .w14 .truth{border-radius:10px;padding:10px 12px;border:1px solid var(--line,rgba(255,255,255,.08));font-size:13px;min-height:64px;transition:border-color .3s}
  .w14 .truth.ok{border-color:var(--ok,#22c55e)} .w14 .truth.warn{border-color:var(--warn,#eab308)} .w14 .truth.bad{border-color:var(--bad,#ef4444)}
  .w14 .tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:6px;font-weight:700;margin-right:4px}
  .w14 .timeline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .w14 .dot{width:24px;height:24px;border-radius:50%;border:2px solid var(--line,rgba(255,255,255,.15));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--mut,#9aa3c7)}
  .w14 .dot.cur{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4);animation:w14pulse 1.2s infinite}
  @keyframes w14pulse{0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,.5)}50%{box-shadow:0 0 0 6px rgba(6,182,212,0)}}
  .w14 .sum{margin-top:14px;display:flex;flex-direction:column;gap:10px}
  .w14 canvas{width:100%;display:block}
  .w14 .list .row{display:flex;gap:8px;font-size:12px;padding:4px 6px;border-radius:6px;align-items:baseline}
  .w14 .list .row.wr{background:rgba(239,68,68,.12)}
  .w14 .list .tm{font-family:var(--mono,ui-monospace,monospace);color:var(--mut,#9aa3c7);flex:0 0 40px}
  .w14 .art{background:rgba(6,182,212,.07);border:1px dashed var(--acc2,#06b6d4);border-radius:10px;padding:10px 12px;font-size:12.5px;white-space:pre-wrap;font-family:var(--mono,ui-monospace,monospace)}
  @media(max-width:560px){.w14 .phone{flex:1 1 100%;height:340px}.w14 .clock{margin-top:36px;font-size:40px}}
  </style>
  <div class="w14">
    <div class="hd"><b>Тревога в 03:00</b> — ночная смена оператора. Задание: пройти ночь так, чтобы <b>не потерять ни сна, ни денег</b>. Из шести тревог только в одной изменился <i>мир</i>; остальные — погода в голове.</div>
    <div class="wrap">
      <div class="phone w14-ph">
        <div class="notch"></div>
        <div class="clock w14-clk">01:40</div>
        <div class="date w14-date">четверг · бот работает третью неделю</div>
        <div class="notif w14-nf"><div class="src"></div><div class="txt"></div></div>
        <div class="snd w14-snd"></div>
      </div>
      <div class="side">
        <div class="meters">
          <div class="meter"><div class="lbl">Сон и спокойствие</div><div class="val"><span class="w14-sl">100</span><small> /100</small></div><div class="bar"><i class="w14-slb" style="width:100%"></i></div></div>
          <div class="meter"><div class="lbl">Учебный счёт</div><div class="val w14-cp">$1000</div><div class="bar"><i class="w14-cpb" style="width:100%"></i></div></div>
        </div>
        <div class="truth w14-tr"></div>
        <div class="btns w14-btns"></div>
        <div class="timeline w14-tl"></div>
      </div>
    </div>
    <div class="sum w14-sum" style="display:none">
      <div class="w14-score" style="font-size:13px"></div>
      <canvas class="w14-cv" style="height:150px"></canvas>
      <div class="list w14-list"></div>
      <div class="art">БЕЛЫЙ СПИСОК НОЧНЫХ СОБЫТИЙ (имеют право будить):
  1) нет связи с биржей дольше 15 минут
  2) бот отправил ордер, которого не мог отправить
  3) цены в боте не совпадают с ценами биржи
Всё остальное — утренняя сводка в 07:30.

ПЕРЕД ЛЮБЫМ КАСАНИЕМ БОТА:
  вопрос 1 — назови ФАКТ: что изменилось в мире?
  вопрос 2 — если решу утром выспавшимся, решение будет тем же?
  после — строка в журнал: дата · мир/голова · действие · итог через 7 дней</div>
      <div class="btns"><button class="pri w14-new">🎲 Новая ночь</button><button class="w14-again">↺ Эта же ночь заново</button></div>
    </div>
  </div>`;

  // ---------- состояние ----------
  let seed = 42, ev = [], idx = 0, sleep = START_SLEEP, cap = START_CAP, hist = [], pCap = START_CAP, pHist = [], missedWorld = false;

  function newRound(s){
    seed = s; const rnd = mulberry32(seed);
    const shuf = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; };
    const world = Object.assign({kind:'world'}, WORLD[Math.floor(rnd()*WORLD.length)]);
    const heads = shuf(HEAD).slice(0,5).map(h=>Object.assign({kind:'head'}, h));
    ev = shuf([world].concat(heads)).map((e,i)=>Object.assign({t:TIMES[i]}, e));
    idx = 0; sleep = START_SLEEP; cap = START_CAP; hist = []; pHist = []; pCap = START_CAP; missedWorld = false;
    const ph = $('.w14-ph'); ph.classList.remove('morn'); $('.w14-date').textContent = 'четверг · бот работает третью неделю';
    $('.w14-sum').style.display = 'none';
    renderMeters(); renderTimeline(); showEvent();
  }

  function showEvent(){
    const e = ev[idx], nf = $('.w14-nf'), ph = $('.w14-ph');
    nf.classList.remove('in'); ph.classList.remove('buzz'); $('.w14-snd').textContent = '';
    $('.w14-clk').textContent = e.t;
    later(()=>{ nf.querySelector('.src').textContent = e.src; nf.querySelector('.txt').textContent = e.txt; nf.classList.add('in'); ph.classList.add('buzz'); $('.w14-snd').textContent = '· · вибрация · ·'; }, 380);
    const tr = $('.w14-tr'); tr.className = 'truth w14-tr';
    tr.innerHTML = 'Событие ' + (idx+1) + ' из 6. Что изменилось — <b>мир</b> или <b>голова</b>?';
    const b = $('.w14-btns'); b.innerHTML = '';
    CHOICES.forEach(c=>{ const el = document.createElement('button'); el.textContent = c.l; el.onclick = ()=>choose(c.id); b.appendChild(el); });
  }

  function choose(id){
    const e = ev[idx], o = OUT[e.kind][id];
    sleep = Math.max(0, sleep + o[0]); cap += o[1];
    const proto = e.kind === 'world' ? OUT.world.check : OUT.head.sleep;   // эталонный путь по протоколу
    pCap += proto[1];
    if(e.kind === 'world' && (id==='sleep'||id==='note')) missedWorld = true;
    hist.push({id:id, v:o[2], cap:cap}); pHist.push({cap:pCap});
    const tr = $('.w14-tr'); tr.className = 'truth w14-tr ' + o[2];
    const tag = e.kind === 'world'
      ? '<span class="tag" style="background:'+C.bad+';color:#fff">МИР</span>'
      : '<span class="tag" style="background:rgba(255,255,255,.14)">ГОЛОВА</span>';
    tr.innerHTML = tag + '<span style="color:var(--mut,#9aa3c7)">' + e.truth + '</span><br>' + o[3] +
      '<div style="margin-top:6px;font-family:var(--mono,ui-monospace,monospace)">сон ' + sg(o[0]) + ' · капитал ' + sg(o[1]) + ' $</div>';
    renderMeters(); renderTimeline();
    const b = $('.w14-btns'); b.innerHTML = '';
    const nx = document.createElement('button'); nx.className = 'pri'; nx.style.gridColumn = '1 / -1';
    nx.textContent = idx < 5 ? 'Дальше → ' + ev[idx+1].t : 'Утро → 07:30';
    nx.onclick = ()=>{ idx++; if(idx < 6) showEvent(); else morning(); };
    b.appendChild(nx);
  }

  function renderMeters(){
    $('.w14-sl').textContent = sleep;
    const sb = $('.w14-slb'); sb.style.width = sleep + '%'; sb.style.background = sleep > 70 ? C.ok : sleep > 45 ? C.warn : C.bad;
    $('.w14-cp').textContent = '$' + cap;
    const cb = $('.w14-cpb'); cb.style.width = Math.max(0, Math.min(100, (cap-850)/150*100)) + '%';
    cb.style.background = cap >= 990 ? C.ok : cap >= 950 ? C.warn : C.bad;
  }

  function renderTimeline(){
    const tl = $('.w14-tl'); tl.innerHTML = '';
    ev.forEach((e,i)=>{
      const d = document.createElement('div'); d.className = 'dot'; d.title = e.t;
      const h = hist[i];
      if(h){ const col = h.v==='ok' ? C.ok : h.v==='warn' ? C.warn : C.bad; d.textContent = h.v==='ok' ? '✓' : h.v==='warn' ? '!' : '✕'; d.style.borderColor = col; d.style.color = col; if(e.kind==='world') d.style.background = 'rgba(239,68,68,.18)'; }
      else if(i === idx){ d.classList.add('cur'); d.textContent = '•'; }
      tl.appendChild(d);
    });
    const s = document.createElement('span'); s.style.cssText = 'font-size:11px;color:var(--mut,#9aa3c7);margin-left:4px'; s.textContent = '→ 07:30 утро'; tl.appendChild(s);
  }

  function morning(){
    if(missedWorld) sleep = Math.max(0, sleep - 15);
    $('.w14-clk').textContent = '07:30'; $('.w14-ph').classList.add('morn'); $('.w14-nf').classList.remove('in');
    $('.w14-snd').textContent = '☀ утренняя сводка'; $('.w14-date').textContent = 'пятница · всё то же самое';
    renderMeters(); renderTimeline(); $('.w14-btns').innerHTML = '';
    const wi = ev.findIndex(e=>e.kind==='world'), wh = hist[wi];
    const falseAlarms = hist.filter((h,i)=>ev[i].kind==='head' && (h.id==='check'||h.id==='kill')).length;
    const caught = wh.id==='check' || wh.id==='kill';
    const tr = $('.w14-tr'); tr.className = 'truth w14-tr';
    tr.innerHTML = '<b>Утро.</b> Из шести тревог факт мира был <b>один</b> — в ' + ev[wi].t + '. Остальные пять при свете дня выглядят так: <span style="color:var(--mut,#9aa3c7)">всё то же самое</span>.';
    const sum = $('.w14-sum'); sum.style.display = 'flex';
    $('.w14-score').innerHTML = 'Ложных подъёмов: <b>' + falseAlarms + ' из 5</b> · Факт мира: <b style="color:' + (caught?C.ok:C.bad) + '">' + (caught?'пойман':'пропущен') + '</b> · Сон: <b>' + sleep + '/100</b> · Капитал: <b>$' + cap + '</b><br><span style="color:var(--mut,#9aa3c7)">Эталон протокола «мир или голова»: сон 88/100, капитал $995. Разница — цена решений, принятых головой в три ночи.</span>';
    $('.w14-list').innerHTML = ev.map((e,i)=>{
      const h = hist[i], col = h.v==='ok' ? C.ok : h.v==='warn' ? C.warn : C.bad, ic = h.v==='ok' ? '✓' : h.v==='warn' ? '!' : '✕';
      return '<div class="row' + (e.kind==='world'?' wr':'') + '"><span class="tm">' + e.t + '</span><span style="color:' + col + ';font-weight:700;flex:0 0 14px">' + ic + '</span><span><b>' + (e.kind==='world'?'МИР':'голова') + '</b> · утром: ' + e.morn + '</span></div>';
    }).join('');
    drawSum();
  }

  function drawSum(){
    const cv = $('.w14-cv'); if(!cv || $('.w14-sum').style.display === 'none') return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300, h = 150;
    cv.width = w*dpr; cv.height = h*dpr; const c = cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
    const you = [START_CAP].concat(hist.map(x=>x.cap)), pro = [START_CAP].concat(pHist.map(x=>x.cap));
    const all = you.concat(pro), lo = Math.min.apply(null, all) - 15, hi = Math.max.apply(null, all) + 15;
    const px = i => 30 + (w-44)*i/6, py = v => 22 + (h-46)*(1 - (v-lo)/(hi-lo));
    c.clearRect(0,0,w,h);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1;
    for(let i=0;i<=6;i++){ c.beginPath(); c.moveTo(px(i),18); c.lineTo(px(i),h-22); c.stroke(); }
    c.fillStyle = C.mut; c.font = '10px sans-serif'; c.textAlign = 'center';
    c.fillText('вечер', px(0), h-8); TIMES.forEach((t,i)=>c.fillText(t, px(i+1), h-8));
    const line = (arr,col,dash,lw)=>{ c.setLineDash(dash||[]); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); arr.forEach((v,i)=>{ i ? c.lineTo(px(i),py(v)) : c.moveTo(px(i),py(v)); }); c.stroke(); c.setLineDash([]); };
    line(pro, C.ok, [5,4], 1.5); line(you, C.acc, [], 2.2);
    hist.forEach((x,i)=>{ c.fillStyle = x.v==='ok' ? C.ok : x.v==='warn' ? C.warn : C.bad; c.beginPath(); c.arc(px(i+1), py(x.cap), 4.5, 0, 6.283); c.fill(); });
    c.textAlign = 'left'; c.fillStyle = C.acc; c.fillText('— твоя ночь', 32, 12); c.fillStyle = C.ok; c.fillText('- - по протоколу', 112, 12);
    c.textAlign = 'right'; c.fillStyle = C.mut; c.fillText('$' + Math.round(hi-15), w-2, py(hi-15)+3); c.fillText('$' + Math.round(lo+15), w-2, py(lo+15)+3);
  }

  $('.w14-new').onclick = ()=>newRound(Date.now());
  $('.w14-again').onclick = ()=>newRound(seed);
  box._expResize = ()=>drawSum(); window.addEventListener('resize', box._expResize);
  newRound(42);
};
