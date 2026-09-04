/*
 * W-46 · widget_p610_clob · Б10/6.10 «CLOB: стакан YES/NO»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, как «YES+NO < $1» мигает как бесплатные деньги, а комиссия по кривой p(1−p),
 *   Задание:  дождаться мигающего «АРБИТРАЖ», купить обе стороны и найти параметры
 *   Ага:      водопад «брутто 3¢ → нетто ≈ 0» строится на глазах; зелёное «АРБИТРАЖ» становится красным «НЕТТО».
 *   Дефолты:  200 шт. на сторону, C = 1 (fee = C·0.06·p·(1−p)), 30 дней, 8 % годовых; кейсы CN_MINI — режим «Разбор».
 *   Артефакт: box.dataset.artifact = {gross_c, slip_c, fee_c, lock_c, net_c, pairs, params}; событие 'expert:artifact'.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p610_clob'] = function(box){
  /* 0. чистим прошлый запуск */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  box._expTimers = []; box._expRaf = null; box._expRO = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const cs = getComputedStyle(box), tok = (n,d)=>(cs.getPropertyValue(n)||'').trim()||d;
  const COL = { txt:tok('--txt','#eef1ff'), mut:tok('--mut','#9aa3c7'), line:tok('--line','#232a4a'),
                acc:tok('--acc2','#06b6d4'), ok:tok('--ok','#22c55e'), bad:tok('--bad','#ef4444'), warn:tok('--warn','#eab308') };
  const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

  /* Кейсы CN_MINI — замени числа/тексты на реальные кейсы урока, структура сохраняется */
  const CASES = [
    { id:'CN_MINI_1', name:'«Три цента на столе»', yes:0.55, no:0.42, depth:150, size:200, C:1,   days:30,  alt:8,
      note:'Сумма 0.97 — «3 % даром». Но на лучших уровнях всего по 150 шт.: твои 200 шт. проедают второй уровень.' },
    { id:'CN_MINI_2', name:'«Глубоко, но тонко»',  yes:0.60, no:0.39, depth:5000, size:1000, C:1, days:7,   alt:8,
      note:'Ликвидности море, спред всего 1¢. Комиссия по кривой p(1−p) у середины шкалы — максимальна.' },
    { id:'CN_MINI_3', name:'«Дальняя резолюция»',  yes:0.48, no:0.47, depth:300, size:250, C:0.5, days:150, alt:10,
      note:'5¢ маржи и низкая комиссия. Но $0.95 на пару замораживаются на 150 дней — считай, что они могли бы приносить.' }
  ];

  box.innerHTML = `
<style>
.cw46{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#232a4a);border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.cw46 h3{margin:0 0 4px;font-size:16px}
.cw46 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin:0 0 10px}
.cw46 .goal b{color:var(--txt,#eef1ff);font-weight:600}
.cw46 canvas{width:100%;display:block;border-radius:8px;background:#070a18;border:1px solid var(--line,#232a4a)}
.cw46 .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.cw46 label{font-size:12px;color:var(--mut,#9aa3c7);display:flex;flex-direction:column;gap:2px;flex:1 1 150px;min-width:140px}
.cw46 label b{color:var(--txt,#eef1ff);font-weight:500;font-family:${MONO}}
.cw46 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:0}
.cw46 button{background:transparent;border:1px solid var(--acc2,#06b6d4);color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px}
.cw46 button.pri{background:var(--acc2,#06b6d4);color:#031018;font-weight:600}
.cw46 button.on{box-shadow:inset 0 0 0 2px var(--acc2,#06b6d4)}
.cw46 button:disabled{opacity:.4;cursor:default}
.cw46 .mono{font-family:${MONO};font-size:12px}
.cw46 .note{color:var(--mut,#9aa3c7);font-size:12px}
.cw46 .wf{display:grid;grid-template-columns:minmax(120px,1.3fr) 2fr 72px;gap:5px 8px;align-items:center;font-size:13px;margin-top:8px}
.cw46 .wf .n{color:var(--mut,#9aa3c7)}
.cw46 .wf .v{text-align:right;font-family:${MONO};font-size:12px}
.cw46 .tr{height:14px;border-radius:4px;background:rgba(255,255,255,.04)}
.cw46 .bar{height:14px;border-radius:4px;width:0;transition:width .6s ease}
.cw46 .verdict{margin-top:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--line,#232a4a);font-size:13px}
</style>
<div class="cw46">
  <h3>Стакан YES/NO: куда деваются «бесплатные 3 %»</h3>
  <p class="goal"><b>Цель:</b> увидеть, как арбитраж YES+NO&nbsp;&lt;&nbsp;$1 исчезает после комиссии, проскальзывания и заморозки капитала.<br>
  <b>Задание:</b> дождись мигающего «АРБИТРАЖ», купи обе стороны и найди условия, при которых нетто остаётся положительным.</p>
  <div class="row"><button data-m="live" class="on">Живой стакан</button><button data-m="case">Разбор кейсов</button><span id="tinfo" class="mono note"></span></div>
  <canvas id="cv"></canvas>
  <div class="row">
    <button id="buy" class="pri" disabled>Купить YES + NO</button>
    <button id="cont" disabled>Продолжить торги</button>
    <button id="round">Новый раунд</button>
    <span id="score" class="mono note"></span>
  </div>
  <div class="row">
    <label>Размер, шт. на каждую сторону: <b id="v_size">200</b><input id="size" type="range" min="10" max="2000" step="10" value="200"></label>
    <label>Коэффициент комиссии C (fee = C·0.06·p·(1−p)): <b id="v_C">1.0</b><input id="C" type="range" min="0" max="2" step="0.1" value="1"></label>
    <label>Дней до резолюции: <b id="v_days">30</b><input id="days" type="range" min="1" max="180" step="1" value="30"></label>
    <label>Альтернативная ставка, % годовых: <b id="v_alt">8</b><input id="alt" type="range" min="0" max="20" step="0.5" value="8"></label>
  </div>
  <div class="row" id="cases" hidden></div>
  <div id="cnote" class="note"></div>
  <div id="res"></div>
</div>`;

  const $ = s => box.querySelector(s);
  const cv = $('#cv'); const H = 280; let W = 320, g = null;
  function fit(){
    W = Math.max(300, ($('.cw46').clientWidth || 330) - 30);
    const dpr = window.devicePixelRatio || 1;
    cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H+'px';
    g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  }
  fit();
  if(window.ResizeObserver){ box._expRO = new ResizeObserver(()=>fit()); box._expRO.observe(box); }

  /* состояние */
  const S = { rnd:null, fair:0.5, yes:null, no:null, tick:0, frozen:false, bought:false, snap:null,
              mode:'live', attempts:0, wins:0, best:null, caseIdx:-1 };
  function reseed(seed){ S.rnd = mulberry32(seed); S.fair = 0.45 + S.rnd()*0.10; S.tick = 0; }
  const lvl = (p,q)=>({ p:Math.round(p*100)/100, q:Math.max(1,Math.round(q)) });
  function mkBook(mid, hs, jit, base){
    const asks=[], bids=[];
    const ba = Math.min(0.98, Math.max(0.02, mid+hs+jit)); const bb = Math.max(0.01, ba-2*hs);
    for(let i=0;i<5;i++){
      asks.push(lvl(ba+i*0.01, base*(1+i*0.6)*(0.6+S.rnd()*0.8)));
      bids.push(lvl(bb-i*0.01, base*(1+i*0.6)*(0.6+S.rnd()*0.8)));
    }
    return {asks,bids};
  }
  function step(){
    S.tick++;
    S.fair = Math.min(0.7, Math.max(0.3, S.fair + (S.rnd()-0.5)*0.03));
    const arbEvent = S.rnd() < 0.14;                  // «щель» появляется примерно каждый 7-й тик
    const hsY = 0.005+S.rnd()*0.01, hsN = 0.005+S.rnd()*0.01;
    let jY = (S.rnd()-0.5)*0.05, jN = (S.rnd()-0.5)*0.05;
    if(arbEvent){ jY = -(0.015+S.rnd()*0.02); jN = -(0.015+S.rnd()*0.02); }
    const base = 60 + S.rnd()*300;
    S.yes = mkBook(S.fair, hsY, jY, base);
    S.no  = mkBook(1-S.fair, hsN, jN, base*(0.7+S.rnd()*0.6));
  }
  const arbNow = ()=> S.yes && (S.yes.asks[0].p + S.no.asks[0].p < 0.9999);

  /* ползунки */
  const params = ()=>({ size:+$('#size').value, C:+$('#C').value, days:+$('#days').value, alt:+$('#alt').value });
  const syncLabels = ()=>{ $('#v_size').textContent=$('#size').value; $('#v_C').textContent=(+$('#C').value).toFixed(1); $('#v_days').textContent=$('#days').value; $('#v_alt').textContent=$('#alt').value; };
  ['size','C','days','alt'].forEach(id=>$('#'+id).addEventListener('input', ()=>{ syncLabels(); if(S.snap && S.bought) showResult(calc(), false); }));

  /* расчёт исполнения */
  function walk(levels, size){ let rem=size, cost=0, filled=0;
    for(const l of levels){ if(rem<=0) break; const q=Math.min(rem,l.q); cost+=q*l.p; filled+=q; rem-=q; }
    return { filled, avg: filled ? cost/filled : levels[0].p };
  }
  function calc(){
    const P = params(), y = S.snap.yes, n = S.snap.no;
    const wy = walk(y.asks, P.size), wn = walk(n.asks, P.size);
    const pairs = Math.min(wy.filled, wn.filled);
    const top  = 1 - (y.asks[0].p + n.asks[0].p);                                  // «обещанные» центы
    const slip = (wy.avg - y.asks[0].p) + (wn.avg - n.asks[0].p);                  // съеденные уровни
    const fee  = P.C*0.06*(wy.avg*(1-wy.avg) + wn.avg*(1-wn.avg));                 // две ноги по кривой p(1−p)
    const lock = (wy.avg + wn.avg) * P.alt/100 * P.days/365;                       // капитал заперт до резолюции
    const net  = top - slip - fee - lock;
    return { P, pairs, top, slip, fee, lock, net, ay:wy.avg, an:wn.avg, short:P.size-pairs };
  }

  function showResult(r, animate){
    const c = v => (v*100).toFixed(2)+'¢';
    const maxAbs = Math.max(0.005, Math.abs(r.top), Math.abs(r.net), r.slip, r.fee, r.lock);
    const pct = v => Math.min(100, Math.abs(v)/maxAbs*100).toFixed(1);
    const rows = [
      ['Брутто по лучшим ценам',                         r.top,  COL.ok],
      ['Проскальзывание (съели уровни)',                -r.slip, COL.bad],
      ['Комиссия ×2 ноги, C·0.06·p·(1−p)',              -r.fee,  COL.bad],
      ['Заморозка капитала ('+r.P.days+' дн × '+r.P.alt+' %)', -r.lock, COL.bad],
      ['НЕТТО на одну пару',                             r.net,  r.net>0?COL.ok:COL.bad]
    ];
    const total = r.net*r.pairs, invest = (r.ay+r.an)*r.pairs;
    let html = `<div class="wf">` + rows.map(([n,v,col],i)=>`
      <div class="n">${n}</div><div class="tr"><div class="bar" data-w="${pct(v)}" style="background:${col};${animate?'':'width:'+pct(v)+'%'}"></div></div>
      <div class="v" style="color:${col}">${v>=0?'+':'−'}${c(Math.abs(v))}</div>`).join('') + `</div>`;
    html += `<div class="verdict" style="border-color:${r.net>0?COL.ok:COL.bad}">
      <div><b>Куплено пар: ${r.pairs}</b> из ${r.P.size}${r.short>0?` — на ${r.short} шт. ликвидности не хватило`:''}.
      Вложено $${invest.toFixed(2)}, средние цены YES $${r.ay.toFixed(3)} / NO $${r.an.toFixed(3)}.</div>
      <div style="margin-top:6px;font-size:15px;color:${r.net>0?COL.ok:COL.bad}"><b>Итог позиции: ${total>=0?'+':'−'}$${Math.abs(total).toFixed(2)}</b>
      (${r.net>0?'нетто положительное':'«бесплатные '+(r.top*100).toFixed(0)+'¢» кончились'})</div>
      <div class="note" style="margin-top:6px">${r.net>0
        ? 'Редкий случай. Вопрос второй: сколько миллисекунд такой стакан живёт в реальности и кто быстрее тебя? Попробуй увеличить размер — проскальзывание растёт первым.'
        : 'Это не сбой рынка, а его цена входа: комиссия у середины шкалы максимальна, а $'+(r.ay+r.an).toFixed(2)+' лежат без дела до резолюции. Меняй C, срок и размер — найди, где нетто переходит через ноль.'}</div>
    </div>`;
    $('#res').innerHTML = html;
    if(animate){ box.querySelectorAll('.cw46 .bar').forEach((b,i)=>later(()=>{ b.style.width = b.dataset.w+'%'; }, 60+i*260)); }
  }

  function artifact(r){
    const a = { widget:'widget_p610_clob', mode:S.mode, caseId:S.caseIdx>=0?CASES[S.caseIdx].id:null,
      pairs:r.pairs, gross_c:+(r.top*100).toFixed(2), slip_c:+(r.slip*100).toFixed(2), fee_c:+(r.fee*100).toFixed(2),
      lock_c:+(r.lock*100).toFixed(2), net_c:+(r.net*100).toFixed(2), params:r.P, attempts:S.attempts, wins:S.wins };
    box.dataset.artifact = JSON.stringify(a);
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail:a }));
  }

  function buy(){
    if(S.mode==='live'){ S.snap = { yes:S.yes, no:S.no }; S.frozen = true; }
    S.bought = true; S.attempts++;
    const r = calc(); if(r.net>0) S.wins++;
    if(S.best===null || r.net>S.best) S.best = r.net;
    showResult(r, true); artifact(r); updBtns();
  }

  function updBtns(){
    const canBuy = S.mode==='live' ? (!S.frozen && arbNow()) : (!!S.snap && !S.bought);
    $('#buy').disabled = !canBuy;
    $('#cont').disabled = !(S.mode==='live' && S.frozen);
    $('#tinfo').textContent = S.mode==='live' ? ('тик '+S.tick+(S.frozen?' · стакан заморожен':' · жду щель…')) : (S.caseIdx>=0?'кейс: '+CASES[S.caseIdx].name:'выбери кейс');
    $('#score').textContent = `попыток: ${S.attempts} · нетто > 0: ${S.wins}` + (S.best!==null?` · лучшее нетто: ${(S.best*100).toFixed(2)}¢`:'');
  }

  /* режимы */
  function setMode(m){
    S.mode = m; S.snap=null; S.bought=false; S.caseIdx=-1; $('#res').innerHTML=''; $('#cnote').textContent='';
    box.querySelectorAll('.cw46 [data-m]').forEach(b=>b.classList.toggle('on', b.dataset.m===m));
    $('#cases').hidden = m!=='case';
    if(m==='live'){ S.frozen=false; } else { S.frozen=true; }
    updBtns();
  }
  box.querySelectorAll('.cw46 [data-m]').forEach(b=>b.addEventListener('click', ()=>setMode(b.dataset.m)));
  $('#cases').innerHTML = CASES.map((c,i)=>`<button data-c="${i}">${c.name}</button>`).join('');
  box.querySelectorAll('.cw46 [data-c]').forEach(b=>b.addEventListener('click', ()=>{
    const c = CASES[+b.dataset.c]; S.caseIdx = +b.dataset.c;
    box.querySelectorAll('.cw46 [data-c]').forEach(x=>x.classList.toggle('on', x===b));
    const mk = p=>({ asks:[0,1,2,3,4].map(i=>lvl(p+i*0.01, c.depth*(1+i*0.5))), bids:[0,1,2,3,4].map(i=>lvl(p-0.02-i*0.01, c.depth*(1+i*0.5))) });
    S.yes = mk(c.yes); S.no = mk(c.no); S.snap = { yes:S.yes, no:S.no }; S.frozen=true; S.bought=false;
    $('#size').value=c.size; $('#C').value=c.C; $('#days').value=c.days; $('#alt').value=c.alt; syncLabels();
    $('#cnote').textContent = c.note; $('#res').innerHTML=''; updBtns();
  }));
  $('#buy').addEventListener('click', buy);
  $('#cont').addEventListener('click', ()=>{ S.frozen=false; S.bought=false; S.snap=null; updBtns(); });
  $('#round').addEventListener('click', ()=>{ reseed(Date.now()); step(); S.frozen=false; S.bought=false; S.snap=null; $('#res').innerHTML=''; if(S.mode!=='live') setMode('live'); updBtns(); });

  /* сцена */
  function draw(now){
    if(!box.isConnected) return;
    g.clearRect(0,0,W,H);
    if(!S.yes){ raf(draw); return; }
    const pw = Math.floor(W*0.39), gapX = W-2*pw, rowH = (H-40)/10;
    const all = [...S.yes.asks,...S.yes.bids,...S.no.asks,...S.no.bids];
    const maxQ = Math.max(...all.map(l=>l.q));
    const sum = S.yes.asks[0].p + S.no.asks[0].p, arb = sum < 0.9999;
    const blink = 0.55 + 0.45*Math.sin(now/180);
    const panel = (book, x0, title)=>{
      g.fillStyle=COL.txt; g.font='600 13px system-ui,sans-serif'; g.textAlign='left'; g.fillText(title, x0+4, 16);
      g.fillStyle=COL.mut; g.font='11px system-ui,sans-serif'; g.textAlign='right'; g.fillText('цена · шт.', x0+pw-4, 16);
      const rows = [...book.asks].reverse().map(l=>({...l,side:'a'})).concat(book.bids.map(l=>({...l,side:'b'})));
      rows.forEach((r,i)=>{
        const y = 24+i*rowH, best = (i===4||i===5), bw = Math.max(2, (pw-96)*r.q/maxQ);
        g.globalAlpha = best?0.85:0.42; g.fillStyle = r.side==='a'?COL.bad:COL.ok; g.fillRect(x0+48, y+3, bw, rowH-6); g.globalAlpha=1;
        g.fillStyle = best?COL.txt:COL.mut; g.font=(best?'600 ':'')+'12px '+MONO; g.textAlign='left'; g.fillText('$'+r.p.toFixed(2), x0+4, y+rowH/2+4);
        g.fillStyle=COL.mut; g.font='11px '+MONO; g.textAlign='right'; g.fillText(r.q, x0+pw-4, y+rowH/2+4);
        if(i===4 && arb){ g.strokeStyle=COL.acc; g.globalAlpha=blink; g.lineWidth=2; g.strokeRect(x0+1, y+1, pw-2, rowH-2); g.globalAlpha=1; g.lineWidth=1; }
      });
      const ys = 24+5*rowH; g.strokeStyle=COL.line; g.setLineDash([3,3]); g.beginPath(); g.moveTo(x0,ys); g.lineTo(x0+pw,ys); g.stroke(); g.setLineDash([]);
      g.fillStyle=COL.mut; g.font='10px system-ui,sans-serif'; g.textAlign='left'; g.fillText('↑ продают (ask)   ↓ покупают (bid)', x0+4, H-6);
    };
    panel(S.yes, 0, 'YES — «да»'); panel(S.no, W-pw, 'NO — «нет»');
    /* центр: сумма лучших асков */
    const cx = W/2, top = 46, bot = H-26, yOf = v => bot - (v-0.94)/(1.06-0.94)*(bot-top);
    g.strokeStyle=COL.line; g.beginPath(); g.moveTo(cx,top); g.lineTo(cx,bot); g.stroke();
    g.strokeStyle=COL.warn; g.setLineDash([4,3]); g.beginPath(); g.moveTo(cx-gapX/2+6, yOf(1)); g.lineTo(cx+gapX/2-6, yOf(1)); g.stroke(); g.setLineDash([]);
    g.fillStyle=COL.warn; g.font='10px '+MONO; g.textAlign='center'; g.fillText('$1.00', cx, yOf(1)-4);
    const sy = yOf(Math.min(1.06, Math.max(0.94, sum)));
    g.fillStyle = arb?COL.ok:COL.mut; g.beginPath(); g.arc(cx, sy, 7, 0, Math.PI*2); g.fill();
    g.fillStyle=COL.txt; g.font='600 12px '+MONO; g.fillText('YES+NO', cx, 16); g.fillText('$'+sum.toFixed(2), cx, 31);
    if(arb){ const ty = sy < (top+bot)/2 ? sy+22 : sy-30; g.globalAlpha=blink; g.fillStyle=COL.ok; g.font='700 12px system-ui,sans-serif';
      g.fillText('АРБИТРАЖ', cx, ty); g.fillText(((1-sum)*100).toFixed(0)+'¢ «даром»', cx, ty+14); g.globalAlpha=1; }
    if(S.frozen){ g.fillStyle=COL.warn; g.font='11px system-ui,sans-serif'; g.textAlign='center'; g.fillText('стакан заморожен', cx, H-8); }
    raf(draw);
  }

  /* запуск */
  reseed(42); step(); syncLabels(); updBtns();
  later(()=>{ if(S.mode==='live' && !S.frozen){ step(); updBtns(); } }, 900, true);
  raf(draw);
};
