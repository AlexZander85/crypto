/*
 * W-41 · widget_g01_blockrace · 0.1 «Гонка блоков» (честная экономика майнинга)
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:      увидеть, что майнинг — лотерея с платными билетами: монету за блок получает один, счёт за электричество приходит всем и каждый блок.
 *   Задание:   выбери железо (домашний ПК → старый ASIC → новый ASIC → ферма), задай тариф ₽/кВт·ч и курс монеты, нажми «Найти блок» 20+ раз (или ×25). Проверь правило: чистый доход = доля хэшрейта × награда − электричество. Включи «Пул», «Халвинг», «Сеть ×2» и посмотри, что меняется.
 *   Ага:       после ~20 блоков доля твоих побед сходится к доле хэшрейта (закон больших чисел из 0.13), а красная линия «счёт за свет» растёт без остановки у всех пяти; знак чистого дохода решает тариф, а не удача. Точка безубыточности — конкретное число ₽/кВт·ч.
 *   Дефолты:   учебная сеть из 5 майнеров (соперники 300/500/400/800 TH); ты — новый ASIC 200 TH / 3,5 кВт / 250 000 ₽; блок = 10 мин; награда 1 монета (халвинг → 0,5); курс 80 ₽/монета (20–200); тариф 6 ₽/кВт·ч (2–15); пул: комиссия 2 %; seed 42.
 *   Артефакт:  строка «моя точка безубыточности: тариф ≤ X ₽/кВт·ч (после халвинга — Y)», EV на блок/месяц, окупаемость железа и правило 72 (месяцев до удвоения вложенного при текущей марже).
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_g01_blockrace'] = function(box){
  // ---------- 0. чистим прошлый запуск ----------
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const sparkRnd = mulberry32(99); // только визуальные искры

  // ---------- 1. канон чисел ----------
  const HW = [
    {label:'Домашний ПК',        th:0.5,  kw:0.3,  price:60000},
    {label:'Старый ASIC (S9)',   th:14,   kw:1.4,  price:15000},
    {label:'Новый ASIC',         th:200,  kw:3.5,  price:250000},
    {label:'Ферма из 10 ASIC',   th:2000, kw:35,   price:2500000}
  ];
  const RIVALS = [{name:'Ферма А',th:300,kw:5.2},{name:'Ферма Б',th:500,kw:8.7},{name:'Ферма В',th:400,kw:7.0},{name:'Ферма Г',th:800,kw:14.0}];
  const BLOCK_H = 10/60, BLOCKS_MONTH = 4320, POOL_FEE = 0.02;

  // ---------- 2. стили ----------
  const CSS = `
  .br-root{--br-acc:var(--acc2,#06b6d4);--br-ok:var(--ok,#22c55e);--br-bad:var(--bad,var(--err,#ef4444));--br-warn:var(--warn,#eab308);
    --br-txt:var(--txt,#eef1ff);--br-mut:var(--mut,#9aa3c7);--br-line:var(--line,rgba(154,163,199,.25));--br-mono:var(--mono,ui-monospace,Menlo,Consolas,monospace);
    background:linear-gradient(160deg,#0d1022,#040714);color:var(--br-txt);border:1px solid var(--br-line);border-radius:12px;padding:14px;font-size:15px;line-height:1.45;max-width:100%;box-sizing:border-box}
  .br-root *{box-sizing:border-box}
  .br-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
  .br-tag{font-size:12px;color:var(--br-mut);border:1px solid var(--br-line);border-radius:999px;padding:2px 8px}
  .br-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:640px){.br-grid{grid-template-columns:1fr}}
  .br-panel{background:rgba(255,255,255,.03);border:1px solid var(--br-line);border-radius:10px;padding:10px}
  .br-panel h4{margin:0 0 8px;font-size:13px;color:var(--br-mut);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .br-hw{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  @media(max-width:400px){.br-hw{grid-template-columns:1fr}}
  .br-hw label{border:1px solid var(--br-line);border-radius:8px;padding:6px 8px;cursor:pointer;font-size:13px;display:block}
  .br-hw label.on{border-color:var(--br-acc);background:rgba(6,182,212,.1)}
  .br-hw input{display:none}
  .br-hw small{display:block;color:var(--br-mut);font-family:var(--br-mono);font-size:11px}
  .br-ctl{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px;flex-wrap:wrap}
  .br-ctl input[type=range]{flex:1;min-width:120px;accent-color:var(--br-acc)}
  .br-ctl b{font-family:var(--br-mono);min-width:76px;text-align:right}
  .br-tog{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  .br-tog label{border:1px solid var(--br-line);border-radius:999px;padding:4px 10px;font-size:13px;cursor:pointer;user-select:none}
  .br-tog label.on{border-color:var(--br-warn);background:rgba(234,179,8,.12)}
  .br-tog input{display:none}
  canvas.br-race{display:block;width:100%;height:190px;border-radius:8px;background:rgba(0,0,0,.28)}
  canvas.br-econ{display:block;width:100%;height:150px;border-radius:8px;background:rgba(0,0,0,.28);margin-top:8px}
  .br-btn{cursor:pointer;border:1px solid var(--br-line);background:rgba(255,255,255,.05);color:var(--br-txt);border-radius:10px;padding:9px 13px;font-size:14px}
  .br-btn.br-primary{background:var(--br-acc);color:#041017;border-color:transparent;font-weight:600}
  .br-btn:disabled{opacity:.45;cursor:default}
  .br-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .br-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin-top:8px}
  .br-stat{background:rgba(0,0,0,.25);border-radius:8px;padding:6px 8px;font-size:12px;color:var(--br-mut)}
  .br-stat b{display:block;font-family:var(--br-mono);font-size:15px;color:var(--br-txt)}
  .br-stat b.ok{color:var(--br-ok)}.br-stat b.bad{color:var(--br-bad)}
  .br-aga{border-left:3px solid var(--br-acc);padding:8px 10px;background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;margin-top:10px;font-size:14px;min-height:40px}
  .br-art{font-family:var(--br-mono);font-size:12.5px;white-space:pre-wrap;background:rgba(0,0,0,.35);border:1px solid var(--br-line);border-radius:8px;padding:10px;margin-top:8px}
  .br-note{font-size:12px;color:var(--br-mut);margin-top:6px}
  `;

  box.innerHTML = `<style>${CSS}</style>
  <div class="br-root">
    <div class="br-head"><b>Гонка блоков: кто получит монету, а кто — счёт за свет</b><span class="br-tag">учебная сеть из 5 майнеров · блок = 10 минут</span></div>
    <div class="br-grid">
      <div class="br-panel">
        <h4>1. Твоё железо</h4>
        <div class="br-hw" data-role="hw"></div>
        <h4 style="margin-top:10px">2. Что если</h4>
        <div class="br-ctl"><span>Тариф</span><input type="range" min="2" max="15" step="0.5" value="6" data-role="tariff"><b data-role="tariffv">6,0 ₽/кВт·ч</b></div>
        <div class="br-ctl"><span>Курс монеты</span><input type="range" min="20" max="200" step="5" value="80" data-role="price"><b data-role="pricev">80 ₽</b></div>
        <div class="br-tog">
          <label data-tog="pool"><input type="checkbox">Пул (комиссия 2 %)</label>
          <label data-tog="halving"><input type="checkbox">Халвинг (награда ×0,5)</label>
          <label data-tog="growth"><input type="checkbox">Сеть ×2 (сложность)</label>
        </div>
        <div class="br-note">Смена железа начинает новую партию. Тариф, курс и переключатели действуют со следующего блока — как в жизни.</div>
      </div>
      <div class="br-panel">
        <h4>3. Гонка за блок</h4>
        <canvas class="br-race"></canvas>
        <div class="br-row">
          <button class="br-btn br-primary" data-act="one">⛏ Найти блок</button>
          <button class="br-btn" data-act="many">⏩ 25 блоков</button>
          <button class="br-btn" data-act="reset">↺ Новый раунд</button>
        </div>
        <canvas class="br-econ"></canvas>
      </div>
    </div>
    <div class="br-stats" data-role="stats"></div>
    <div class="br-aga" data-role="aga">Пока блоков нет. Нажми «Найти блок»: монету получит один, а счёт за свет — все пятеро.</div>
    <div class="br-art" data-role="art"></div>
    <div class="br-row"><button class="br-btn" data-act="copy">Скопировать вывод</button></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const raceC = $('.br-race'), econC = $('.br-econ');

  // ---------- 3. состояние ----------
  const S = { seed:42, rnd:mulberry32(42), hw:2, tariff:6, price:80, pool:false, halving:false, growth:false,
    blocks:0, wins:0, coins:0, rev:0, spent:0, netHist:[0], evHist:[0], elecHist:[0], marks:[],
    rivals: RIVALS.map(r=>Object.assign({}, r, {coins:0, spent:0})), anim:null, busy:false };

  const you = ()=> Object.assign({name:'Ты'}, HW[S.hw]);
  const rivalTh = r => r.th*(S.growth?2:1);
  const totalTh = ()=> you().th + S.rivals.reduce((a,r)=>a+rivalTh(r),0);
  const share = ()=> you().th/totalTh();
  const reward = ()=> S.halving?0.5:1;
  const kwh = kw => kw*BLOCK_H;
  const costYou = ()=> kwh(you().kw)*S.tariff;
  const evNet = ()=> share()*reward()*S.price*(S.pool?1-POOL_FEE:1) - costYou();
  const breakeven = (hal)=> share()*(hal?0.5:1)*S.price/kwh(you().kw);

  const fmt = (n,d)=>{ d = d===undefined?1:d; const s = Math.abs(n).toFixed(d).replace('.',','); const parts=s.split(','); parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'\u202f'); return (n<0?'−':'')+parts.join(','); };
  const pct = p => fmt(p*100,1)+' %';

  function resetGame(){
    S.blocks=0; S.wins=0; S.coins=0; S.rev=0; S.spent=0; S.netHist=[0]; S.evHist=[0]; S.elecHist=[0]; S.marks=[]; S.anim=null; S.busy=false;
    S.rivals.forEach(r=>{ r.coins=0; r.spent=0; });
    render();
  }

  // ---------- 4. блок ----------
  function runBlock(cb){
    if(S.busy) return;
    const ths = [you().th].concat(S.rivals.map(rivalTh)); const tot = ths.reduce((a,b)=>a+b,0);
    let x = S.rnd()*tot, winner = ths.length-1;
    for(let i=0;i<ths.length;i++){ x -= ths[i]; if(x<=0){ winner=i; break; } }
    const ends = ths.map((t,i)=> i===winner ? 1 : 0.45 + 0.42*S.rnd());
    S.anim = {start:performance.now(), dur:1000, winner, ends, done:false};
    S.busy = true; setButtons();
    later(()=>{ settle(winner); S.anim.done=true; S.busy=false; setButtons(); render(); if(cb) cb(); }, 1080);
  }
  function settle(winner){
    S.blocks++;
    const rew = reward(), sh = share(), tot = totalTh();
    S.spent += costYou();                                      // свет платят все — каждый блок
    S.rivals.forEach(rv=>{ rv.spent += kwh(rv.kw)*S.tariff; });
    if(S.pool){                                                // пул: выплата по долям минус комиссия
      const mine = sh*rew*(1-POOL_FEE); S.coins += mine; S.rev += mine*S.price;
      S.rivals.forEach(rv=>{ rv.coins += rivalTh(rv)/tot*rew*(1-POOL_FEE); });
      if(winner===0) S.wins++;
    } else {                                                   // соло: монета одному
      if(winner===0){ S.wins++; S.coins += rew; S.rev += rew*S.price; }
      else S.rivals[winner-1].coins += rew;
    }
    S.netHist.push(S.rev - S.spent);
    S.evHist.push(S.evHist[S.evHist.length-1] + evNet());
    S.elecHist.push(S.spent);
  }
  function runMany(n){ if(n<=0) return; runBlock(()=>runMany(n-1)); }
  function setButtons(){ box.querySelectorAll('[data-act=one],[data-act=many]').forEach(b=> b.disabled = S.busy); }

  // ---------- 5. отрисовка ----------
  function fit(c, h){
    const dpr = Math.min(2, window.devicePixelRatio||1); const w = c.clientWidth||300;
    if(c.width!==Math.round(w*dpr) || c.height!==Math.round(h*dpr)){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); }
    const g=c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return [g,w,h];
  }
  const ease = e => 1-Math.pow(1-e,3);
  function drawRace(now){
    const [g,w,h] = fit(raceC, 190);
    g.clearRect(0,0,w,h);
    const miners = [you()].concat(S.rivals.map(r=>Object.assign({}, r, {th:rivalTh(r)})));
    const laneH = (h-16)/miners.length, x0 = 78, x1 = w-64;
    const a = S.anim; let e = 0;
    if(a){ e = a.done ? 1 : Math.min(1,(now-a.start)/a.dur); }
    g.font='11px ui-monospace,Menlo,Consolas,monospace';
    // финиш
    g.strokeStyle='rgba(154,163,199,.35)'; g.setLineDash([4,4]); g.beginPath(); g.moveTo(x1,8); g.lineTo(x1,h-8); g.stroke(); g.setLineDash([]);
    g.fillStyle='#9aa3c7'; g.textAlign='center'; g.fillText('блок', x1, h-1);
    miners.forEach((m,i)=>{
      const cy = 8 + laneH*(i+0.5);
      g.strokeStyle='rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x0,cy); g.lineTo(x1,cy); g.stroke();
      g.textAlign='left'; g.fillStyle = i===0 ? '#eef1ff' : '#9aa3c7';
      g.fillText(m.name, 4, cy-3); g.fillText(`${m.th<1?fmt(m.th,1):fmt(m.th,0)} TH`, 4, cy+9);
      const p = a ? ease(e)*a.ends[i] : 0;
      const x = x0 + p*(x1-x0);
      // искры хэшей
      if(a && !a.done){ g.fillStyle='rgba(6,182,212,.35)'; for(let k=0;k<3;k++){ g.fillRect(x-6-sparkRnd()*24, cy-6+sparkRnd()*12, 2, 2); } }
      g.beginPath(); g.arc(x, cy, 7, 0, Math.PI*2);
      g.fillStyle = i===0 ? '#06b6d4' : '#5b6488'; g.fill();
      if(a && a.done && a.winner===i){
        g.fillStyle='#22c55e'; g.textAlign='left';
        g.fillText(S.pool ? `+${fmt(reward(),1)} → пул` : `+${fmt(reward(),1)} монета`, x1+4, cy+4);
      }
      // счёт за свет — у всех
      const c = kwh(m.kw)*S.tariff;
      g.fillStyle='#ef4444'; g.textAlign='left';
      if(!(a && a.done && a.winner===i)) g.fillText(`−${fmt(c,2)} ₽`, x1+4, cy+4);
    });
    g.fillStyle='#9aa3c7'; g.textAlign='left'; g.font='11px sans-serif';
    g.fillText(a && a.done ? (S.pool ? 'пул нашёл блок — выплаты по долям хэшрейта' : `блок нашёл: ${miners[a.winner].name}; свет заплатили все пятеро`) : 'вероятность найти блок ∝ хэшрейту', 4, 10);
  }
  function drawEcon(){
    const [g,w,h] = fit(econC, 150);
    g.clearRect(0,0,w,h);
    const n = S.netHist.length; const L=44, R=8, T=14, B=18;
    const all = S.netHist.concat(S.evHist, S.elecHist.map(v=>-v), [0]);
    let mn = Math.min.apply(null,all), mx = Math.max.apply(null,all); if(mx-mn<1){ mn-=1; mx+=1; }
    const X = i => L + (n>1 ? i/(n-1) : 0)*(w-L-R), Y = v => T + (mx-v)/(mx-mn)*(h-T-B);
    g.strokeStyle='rgba(154,163,199,.35)'; g.beginPath(); g.moveTo(L,Y(0)); g.lineTo(w-R,Y(0)); g.stroke();
    g.fillStyle='#9aa3c7'; g.font='10px ui-monospace,Menlo,Consolas,monospace'; g.textAlign='right';
    g.fillText(fmt(mx,0), L-4, T+4); g.fillText(fmt(mn,0), L-4, h-B); g.fillText('0', L-4, Y(0)+3);
    // события
    S.marks.forEach(m=>{ const x=X(m.block); g.strokeStyle='rgba(234,179,8,.6)'; g.setLineDash([3,3]); g.beginPath(); g.moveTo(x,T); g.lineTo(x,h-B); g.stroke(); g.setLineDash([]); g.fillStyle='#eab308'; g.textAlign='left'; g.fillText(m.label, x+2, T+8); });
    const line = (arr, color, dash, width, tr)=>{ g.strokeStyle=color; g.lineWidth=width; g.setLineDash(dash); g.beginPath(); arr.forEach((v,i)=>{ const y=Y(tr?tr(v):v); if(i===0) g.moveTo(X(i),y); else g.lineTo(X(i),y); }); g.stroke(); g.setLineDash([]); };
    if(n>1){
      line(S.elecHist, '#ef4444', [], 1.2, v=>-v);
      line(S.evHist, '#9aa3c7', [5,4], 1.2);
      const last = S.netHist[n-1];
      line(S.netHist, last>=0?'#22c55e':'#ef4444', [], 2.2);
    }
    g.font='10px sans-serif'; g.textAlign='left'; g.fillStyle='#22c55e'; g.fillText('■ твой чистый итог, ₽', L, h-5);
    g.fillStyle='#9aa3c7'; g.fillText('- - ожидание (доля × награда − свет)', L+118, h-5);
    g.fillStyle='#ef4444'; g.fillText('■ счёт за свет', L+310, h-5);
  }
  function loop(now){
    drawRace(now); drawEcon();
    if(document.body.contains(box)) raf(loop);
  }

  // ---------- 6. статистика, ага, артефакт ----------
  function render(){
    const y = you(), sh = share(), ev = evNet(), be = breakeven(false), beH = breakeven(true);
    const net = S.rev - S.spent;
    const monthNet = ev*BLOCKS_MONTH;
    const payback = monthNet>0 ? y.price/monthNet : Infinity;
    const roi = monthNet/y.price*100;
    const dbl = roi>0 ? 72/roi : Infinity;
    const winShare = S.blocks ? S.wins/S.blocks : 0;
    $('[data-role=stats]').innerHTML = [
      ['Блоков', String(S.blocks), ''],
      ['Твоих блоков', `${S.wins} (${pct(winShare)})`, ''],
      ['Доля хэшрейта', pct(sh), ''],
      ['Монет / выручка', `${fmt(S.coins,2)} / ${fmt(S.rev,0)} ₽`, ''],
      ['Счёт за свет', `−${fmt(S.spent,1)} ₽`, 'bad'],
      ['Чистый итог', `${net>=0?'+':''}${fmt(net,1)} ₽`, net>=0?'ok':'bad'],
      ['Ожидание на блок', `${ev>=0?'+':''}${fmt(ev,2)} ₽`, ev>=0?'ok':'bad'],
      ['Безубыточный тариф', `${fmt(be,1)} ₽/кВт·ч`, be>S.tariff?'ok':'bad']
    ].map(s=>`<div class="br-stat">${s[0]}<b class="${s[2]}">${s[1]}</b></div>`).join('');

    let aga = '';
    if(S.blocks===0) aga = 'Пока блоков нет. Нажми «Найти блок»: монету получит один, а счёт за свет — все пятеро.';
    else if(S.blocks<20) aga = `${S.blocks} блок(ов): твоя доля побед ${pct(winShare)} при доле хэшрейта ${pct(sh)}. На короткой серии правит случайность — как 7 орлов из 10 в уроке 0.13. Свет при этом списан ${S.blocks} раз у каждого.`;
    else {
      const gap = Math.abs(winShare-sh);
      aga = `<b>Ага:</b> после ${S.blocks} блоков доля твоих побед ${pct(winShare)} ${gap<0.04?'почти сошлась с':'подтягивается к'} долей хэшрейта ${pct(sh)} — закон больших чисел. Награда ушла победителям по очереди, а красная линия «счёт за свет» росла у всех без единого пропуска. `;
      aga += ev>=0 ? `При тарифе ${fmt(S.tariff,1)} ₽ ты в плюсе: запас до безубыточности ${fmt(be-S.tariff,1)} ₽/кВт·ч${S.halving?'':`, а после халвинга он станет ${fmt(beH-S.tariff,1)} ₽`}.`
                   : `При тарифе ${fmt(S.tariff,1)} ₽ ты в минусе: чтобы выйти в ноль, свет должен стоить не дороже ${fmt(be,1)} ₽/кВт·ч — или монета дороже ${fmt(S.price*S.tariff/be,0)} ₽.`;
      if(S.pool) aga += ' Пул превратил лотерею в ровный ручеёк — за 2 % комиссии; знак итога он не меняет.';
    }
    $('[data-role=aga]').innerHTML = aga;

    $('[data-role=art]').textContent =
`Майнинг для меня (тренажёр 0.1, seed ${S.seed}): «${y.label}» — ${fmt(y.th,y.th<1?1:0)} TH, ${fmt(y.kw,1)} кВт, цена ${fmt(y.price,0)} ₽.
Учебная сеть: моя доля хэшрейта ${pct(sh)}${S.growth?' (после роста сети ×2)':''}, награда ${fmt(reward(),1)} монеты × ${fmt(S.price,0)} ₽${S.pool?', пул −2 %':''}.
Точка безубыточности: тариф ≤ ${fmt(be,1)} ₽/кВт·ч; после халвинга — ≤ ${fmt(beH,1)} ₽/кВт·ч. Мой тариф: ${fmt(S.tariff,1)} ₽.
Ожидание на блок: ${ev>=0?'+':''}${fmt(ev,2)} ₽ → ≈ ${monthNet>=0?'+':''}${fmt(monthNet,0)} ₽ в месяц (4 320 блоков).
Окупаемость железа: ${isFinite(payback)?fmt(payback,1)+' мес':'никогда при этих числах'}. Правило 72: при марже ${fmt(roi,1)} % в месяц вложенное удваивается за ${isFinite(dbl)?'≈ '+fmt(dbl,0)+' мес':'∞'}.
Правило: сначала считаю счёт за свет, потом мечтаю о наградах. Халвинг режет награду вдвое — счёт за свет не режет никто.`;
  }

  // ---------- 7. управление ----------
  const hwBox = $('[data-role=hw]');
  hwBox.innerHTML = HW.map((h,i)=>`<label data-i="${i}" class="${i===S.hw?'on':''}"><input type="radio" name="brhw-${Math.random().toString(36).slice(2)}">${h.label}<small>${h.th<1?fmt(h.th,1):fmt(h.th,0)} TH · ${fmt(h.kw,1)} кВт · ${fmt(h.price,0)} ₽</small></label>`).join('');
  hwBox.querySelectorAll('label').forEach(l=> l.onclick = e=>{ e.preventDefault(); if(S.busy) return; S.hw = +l.dataset.i; hwBox.querySelectorAll('label').forEach(x=>x.classList.toggle('on', x===l)); resetGame(); });
  $('[data-role=tariff]').oninput = e=>{ S.tariff = +e.target.value; $('[data-role=tariffv]').textContent = `${fmt(S.tariff,1)} ₽/кВт·ч`; render(); };
  $('[data-role=price]').oninput = e=>{ S.price = +e.target.value; $('[data-role=pricev]').textContent = `${fmt(S.price,0)} ₽`; render(); };
  box.querySelectorAll('[data-tog]').forEach(l=>{
    l.onclick = e=>{ e.preventDefault(); const k=l.dataset.tog; S[k]=!S[k]; l.classList.toggle('on', S[k]);
      const names = {pool:'пул', halving:'халвинг', growth:'сеть ×2'};
      S.marks.push({block:Math.max(0,S.netHist.length-1), label:(S[k]?'+':'−')+names[k]}); if(S.marks.length>6) S.marks.shift(); render(); };
  });
  $('[data-act=one]').onclick = ()=> runBlock();
  $('[data-act=many]').onclick = ()=> runMany(25);
  $('[data-act=reset]').onclick = ()=>{ if(S.busy) return; S.seed = Date.now() & 0x7fffffff; S.rnd = mulberry32(S.seed); resetGame(); };
  $('[data-act=copy]').onclick = e=>{
    const txt = $('[data-role=art]').textContent;
    const done = ()=>{ e.target.textContent='Скопировано ✓'; later(()=>{ e.target.textContent='Скопировать вывод'; }, 1500); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, done); }
    else { const ta=document.createElement('textarea'); ta.value=txt; box.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(err){} box.removeChild(ta); done(); }
  };

  render();
  raf(loop);
};
