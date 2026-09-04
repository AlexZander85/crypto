/*
 * W-21 · widget_ps_l8_match_judge · П8 «Судьи считают технику»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     Почувствовать разрыв между оценкой по табло (результат) и по технике (процесс) — и увидеть, что на коротком отрезке они не связаны.
 *   Задание:  10 сделок сезона. Трибуна ревёт от результата; ты — судья: смотри в журнал сделки и ставь оценку. Потом сверка с судьёй техники.
 *   Ага:      Диаграмма рассеяния «техника × результат» — облако, r ≈ 0; счётчик «сколько раз ты судил по табло» показывает, куда утекает самооценка.
 *   Дефолты:  10 сделок, seed 42; сделка 1 = «+2%, но с нарушением», сделка 2 = «−1% по уставу» (числа урока); 5 чистых / 5 с нарушениями, знаки распределены независимо.
 *   Артефакт: Двойная отметка недели (результат / процесс) + твоя доля судейства по технике, %.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l8_match_judge'] = function(box){
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const shuffle = (a, r)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const k=a[i]; a[i]=a[j]; a[j]=k; } return a; };
  const fmt = v => (v>0?'+':'') + v.toFixed(1) + '%';

  if(!document.getElementById('exp-css-w21')){
    const s=document.createElement('style'); s.id='exp-css-w21';
    s.textContent = `
.w21{color:var(--txt,#eef1ff);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.w21 *{box-sizing:border-box}
.w21 h4{margin:0;font-size:17px}
.w21 .hd{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px}
.w21 .mut{color:var(--mut,#9aa3c7);font-size:13px}
.w21 .mono{font-family:var(--mono,ui-monospace,monospace)}
.w21 .board{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0;font:13px var(--mono,ui-monospace,monospace)}
.w21 .board span{padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.1))}
.w21 .arena{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:520px){.w21 .arena{grid-template-columns:1fr}}
.w21 .pane{border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;padding:10px;background:rgba(255,255,255,.03);min-height:150px}
.w21 .pane h5{margin:0 0 6px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--mut,#9aa3c7)}
.w21 .crowd.roar{animation:w21shake .35s 3}
@keyframes w21shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.w21 .bars{display:flex;align-items:flex-end;gap:3px;height:56px;margin:6px 0}
.w21 .bars i{flex:1;background:var(--mut,#9aa3c7);border-radius:2px 2px 0 0;height:8%;transition:height .35s;transform-origin:bottom}
.w21 .bars.ok i{background:var(--ok,#22c55e)} .w21 .bars.bad i{background:var(--bad,#ef4444)}
.w21 .bars.live i{animation:w21pulse .5s infinite alternate}
@keyframes w21pulse{from{transform:scaleY(.7)}to{transform:scaleY(1.05)}}
.w21 .big{font-size:30px;font-weight:800;font-family:var(--mono,ui-monospace,monospace)}
.w21 .big.ok{color:var(--ok,#22c55e)} .w21 .big.bad{color:var(--bad,#ef4444)}
.w21 .shout{font-size:15px;font-weight:600}
.w21 .journal{margin-top:10px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;padding:10px;font:13px/1.5 var(--mono,ui-monospace,monospace);background:#070a19}
.w21 .journal div{display:flex;justify-content:space-between;gap:8px}
.w21 .journal .k{color:var(--mut,#9aa3c7)}
.w21 .chk{list-style:none;margin:0;padding:0;font-size:13px}
.w21 .chk li{padding:5px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08));display:flex;gap:8px;opacity:.25;transition:opacity .3s}
.w21 .chk li.on{opacity:1}
.w21 .chk b{width:18px;text-align:center}
.w21 .chk .ok b{color:var(--ok,#22c55e)} .w21 .chk .bad b{color:var(--bad,#ef4444)}
.w21 .verdict{margin-top:8px;font-weight:600}
.w21 .cmp{margin-top:8px;padding:8px 10px;border-radius:8px;font-size:13px}
.w21 .cmp.good{background:rgba(34,197,94,.12);border:1px solid var(--ok,#22c55e)} .w21 .cmp.crowd{background:rgba(234,179,8,.12);border:1px solid var(--warn,#eab308)}
.w21 .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.w21 .btn{border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);border-radius:8px;padding:10px 14px;font-size:14px;cursor:pointer}
.w21 .btn.pri{background:var(--acc2,#06b6d4);border-color:var(--acc2,#06b6d4);color:#03111a;font-weight:600}
.w21 .btn:disabled{opacity:.4;cursor:not-allowed}
.w21 canvas{width:100%;height:220px;display:block;border-radius:10px;background:#070a19;margin-top:8px}
.w21 table{width:100%;border-collapse:collapse;font:12px var(--mono,ui-monospace,monospace);margin-top:10px}
.w21 td,.w21 th{padding:5px 4px;border-bottom:1px solid var(--line,rgba(255,255,255,.08));text-align:left;white-space:nowrap}
.w21 .tw{overflow-x:auto}
.w21 .aha{margin-top:12px;padding:12px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid var(--acc2,#06b6d4);font-size:14px}
.w21 textarea{width:100%;min-height:120px;margin-top:8px;background:#070a19;color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:8px;font:12px/1.4 var(--mono,ui-monospace,monospace);resize:vertical}
`;
    document.head.appendChild(s);
  }

  const PAIRS = ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','AVAX/USDT'];
  function mkTrade(r, clean, sign, fixed){
    let rsiOk = clean || r()<0.5, sizeOk = clean || r()<0.5, stopOk = clean || r()<0.5;
    if(!clean && rsiOk && sizeOk && stopOk){ const k=Math.floor(r()*3); if(k===0) rsiOk=false; else if(k===1) sizeOk=false; else stopOk=false; }
    if(fixed && fixed.only==='stop'){ rsiOk=true; sizeOk=true; stopOk=false; }
    const pnl = fixed ? fixed.pnl : Math.round(sign*(0.4+r()*2.6)*10)/10;
    return {
      pair: PAIRS[Math.floor(r()*PAIRS.length)], pnl, rsiOk, sizeOk, stopOk,
      rsi: rsiOk ? 28+Math.floor(r()*7) : 40+Math.floor(r()*30),
      risk: sizeOk ? (0.6+r()*0.4) : (1.6+r()*1.6),
      stopTo: stopOk ? null : -(11+Math.floor(r()*6)),
      proc: (rsiOk?1:0)+(sizeOk?1:0)+(stopOk?1:0)
    };
  }
  function corr(a,b){
    const n=a.length, ma=a.reduce((s,v)=>s+v,0)/n, mb=b.reduce((s,v)=>s+v,0)/n;
    let num=0,da=0,db=0; for(let i=0;i<n;i++){ num+=(a[i]-ma)*(b[i]-mb); da+=(a[i]-ma)**2; db+=(b[i]-mb)**2; }
    const den=Math.sqrt(da*db); return den? num/den : 0;
  }
  function buildSeason(sd){
    let r = mulberry32(sd), best=null;
    for(let tries=0; tries<40; tries++){
      const t1 = mkTrade(r,false,1,{pnl:2.0, only:'stop'});   // +2% с нарушением
      const t2 = mkTrade(r,true,-1,{pnl:-1.0});               // −1% по уставу
      const rest = [1,1,1,-1].map(s=>mkTrade(r,true,s)).concat([1,1,-1,-1].map(s=>mkTrade(r,false,s)));
      const season = [t1,t2].concat(shuffle(rest,r));
      const rr = corr(season.map(t=>t.pnl), season.map(t=>t.proc));
      if(best===null || Math.abs(rr)<Math.abs(best.r)) best={season, r:rr};
      if(Math.abs(rr)<0.3) break;
    }
    return best;
  }

  let seed = 42, season = null, rCoef = 0, idx = 0, byTech = 0, byBoard = 0, votes = [];
  const q = sel => box.querySelector(sel);

  function start(){
    const b = buildSeason(seed); season = b.season; rCoef = b.r; idx=0; byTech=0; byBoard=0; votes=[];
    box.innerHTML = `
<div class="w21">
  <div class="hd"><h4>Судьи считают технику, а не один гол</h4><span class="mut">сезон из 10 сделок</span></div>
  <div class="mut">Трибуна видит только табло. Ты — судья: прочитай журнал сделки и поставь оценку. Судья техники объявит свою — сравним.</div>
  <div class="board"><span data-k>Сделка 1/10</span><span>По технике: <b data-tech>0</b></span><span>По табло: <b data-board>0</b></span></div>
  <div data-stage></div>
</div>`;
    renderTrade();
  }

  function renderTrade(){
    const t = season[idx]; const isWin = t.pnl>0;
    q('[data-k]').textContent = `Сделка ${idx+1}/10`;
    const bars = Array.from({length:14}, ()=>'<i></i>').join('');
    q('[data-stage]').innerHTML = `
<div class="arena">
  <div class="pane crowd" data-crowd>
    <h5>Трибуна · результат</h5>
    <div class="big ${isWin?'ok':'bad'}">${fmt(t.pnl)}</div>
    <div class="bars ${isWin?'ok':'bad'} live" data-bars>${bars}</div>
    <div class="shout">${isWin ? 'ГОООЛ! 🔥 Толпа в восторге' : 'Ууууу… 😩 Трибуна свистит'}</div>
    <div class="mut">${t.pair} · лонг · закрыта</div>
  </div>
  <div class="pane">
    <h5>Ложа судьи · техника</h5>
    <ul class="chk" data-chk>
      <li class="${t.rsiOk?'ok':'bad'}"><b>${t.rsiOk?'✓':'✗'}</b><span>Вход по сигналу системы</span></li>
      <li class="${t.sizeOk?'ok':'bad'}"><b>${t.sizeOk?'✓':'✗'}</b><span>Размер по уставу (≤ 1% риска)</span></li>
      <li class="${t.stopOk?'ok':'bad'}"><b>${t.stopOk?'✓':'✗'}</b><span>Стоп не передвигался</span></li>
    </ul>
    <div class="verdict mut" data-verdict>Судья ждёт твоей оценки…</div>
    <div data-cmp></div>
  </div>
</div>
<div class="journal">
  <div><span class="k">Сигнал</span><span>RSI ${t.rsi} при пороге &lt; 35 → ${t.rsiOk?'сигнал был':'сигнала не было'}</span></div>
  <div><span class="k">Размер</span><span>риск ${t.risk.toFixed(1)}% депозита (устав ≤ 1%)</span></div>
  <div><span class="k">Стоп</span><span>${t.stopOk?'−10%, не менялся':'передвинут: −10% → '+t.stopTo+'%'}</span></div>
</div>
<div class="actions">
  <button class="btn pri" data-vote="1">👍 Хорошая сделка</button>
  <button class="btn" data-vote="0">👎 Плохая сделка</button>
</div>`;
    const barsEl = q('[data-bars]'); const r = mulberry32(seed+idx*17);
    later(()=>{ barsEl.querySelectorAll('i').forEach(i=>{ i.style.height = Math.round(15+Math.min(80,Math.abs(t.pnl)*22)*(0.5+r()*0.6)) + '%'; }); }, 30);
    const crowd = q('[data-crowd]'); crowd.classList.remove('roar'); void crowd.offsetWidth; crowd.classList.add('roar');
    later(()=>barsEl.classList.remove('live'), 1400);
    box.querySelectorAll('[data-vote]').forEach(b=>{ b.onclick = ()=>vote(+b.getAttribute('data-vote')); });
  }

  function vote(good){
    const t = season[idx]; const judgeGood = t.proc===3;
    box.querySelectorAll('[data-vote]').forEach(b=>b.disabled=true);
    const items = q('[data-chk]').querySelectorAll('li');
    items.forEach((li,i)=>later(()=>li.classList.add('on'), 250*(i+1)));
    later(()=>{
      q('[data-verdict]').innerHTML = judgeGood
        ? `Судья: <span style="color:var(--ok,#22c55e)">хорошая сделка</span> — техника 3/3`
        : `Судья: <span style="color:var(--bad,#ef4444)">плохая сделка</span> — техника ${t.proc}/3, нарушений: ${3-t.proc}`;
      q('[data-verdict]').classList.remove('mut');
      const agree = (good===1)===judgeGood;
      if(agree) byTech++; else byBoard++;
      votes.push({good, judgeGood});
      q('[data-tech]').textContent = byTech; q('[data-board]').textContent = byBoard;
      let why;
      if(agree) why = judgeGood ? 'Минус на табло не сбил: процесс чист — это повторяемо.' : 'Плюс на табло не купил тебя: нарушение — трещина в заборе, повторить её нельзя.';
      else why = judgeGood ? 'Трибуна свистела — и ты засвистел. Но сделка сделана по правилам: её ты сможешь повторить всегда.' : 'Трибуна ревела «гол!» — и ты поставил плюс. Но результат случайный, а нарушение — системное: именно оно определит следующий квартал.';
      q('[data-cmp]').innerHTML = `<div class="cmp ${agree?'good':'crowd'}"><b>${agree?'Ты судил по технике ✓':'Ты судил по табло — как трибуна'}</b><br>${why}</div>`;
      const act = q('.actions'); act.innerHTML = `<button class="btn pri" data-next>${idx<9?'Следующая сделка →':'Итоги сезона →'}</button>`;
      q('[data-next]').onclick = ()=>{ idx++; idx<10 ? renderTrade() : renderSummary(); };
    }, 1000);
  }

  function drawScatter(canvas){
    const dpr=window.devicePixelRatio||1, W=canvas.clientWidth||320, H=canvas.clientHeight||220;
    if(canvas.width!==Math.round(W*dpr)){ canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); }
    const g=canvas.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    const L=44,R=14,T=16,B=30,pw=W-L-R,ph=H-T-B, maxAbs=Math.max.apply(null,season.map(t=>Math.abs(t.pnl)))*1.15;
    const X=p=>L+pw*(p+0.5)/4, Y=v=>T+ph*(1-(v+maxAbs)/(2*maxAbs));
    g.strokeStyle='rgba(255,255,255,.08)'; g.fillStyle='#9aa3c7'; g.font='11px system-ui'; g.textAlign='center';
    for(let p=0;p<=3;p++){ g.beginPath(); g.moveTo(X(p),T); g.lineTo(X(p),T+ph); g.stroke(); g.fillText('техника '+p+'/3', X(p), H-10); }
    g.setLineDash([4,4]); g.strokeStyle='rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(L,Y(0)); g.lineTo(L+pw,Y(0)); g.stroke(); g.setLineDash([]);
    g.textAlign='right'; g.fillText('0%', L-4, Y(0)+4); g.fillText('+'+maxAbs.toFixed(0)+'%', L-4, T+10); g.fillText('−'+maxAbs.toFixed(0)+'%', L-4, T+ph);
    const r = mulberry32(7);
    season.forEach((t,i)=>{ const x=X(t.proc)+(r()-0.5)*pw/9, y=Y(t.pnl);
      g.beginPath(); g.arc(x,y,7,0,Math.PI*2); g.fillStyle = t.pnl>0?'#22c55e':'#ef4444'; g.fill();
      g.fillStyle='#03111a'; g.font='bold 10px system-ui'; g.textAlign='center'; g.fillText(String(i+1), x, y+3.5); });
    g.fillStyle='#06b6d4'; g.font='bold 13px system-ui'; g.textAlign='left'; g.fillText('r = '+rCoef.toFixed(2)+' ≈ 0 — облако, не линия', L+6, T+14);
  }

  function renderSummary(){
    const sum = season.reduce((s,t)=>s+t.pnl,0), broken = season.filter(t=>t.proc<3).length;
    q('[data-k]').textContent = 'Сезон завершён';
    const rows = season.map((t,i)=>`<tr><td>${i+1}</td><td style="color:${t.pnl>0?'var(--ok,#22c55e)':'var(--bad,#ef4444)'}">${fmt(t.pnl)}</td><td>${t.proc}/3</td><td>${votes[i].good?'👍':'👎'}</td><td>${votes[i].judgeGood?'👍':'👎'}</td><td>${votes[i].good===(votes[i].judgeGood?1:0)?'техника':'табло'}</td></tr>`).join('');
    const pct = Math.round(byTech/10*100);
    const art = `Двойная отметка недели (шаблон П8)\nНеделя: ____\nРезультат: ____ %  (факт, без оценки)\nПроцесс: устав соблюдён — да / нет. Нарушения: ______________\nОценка недели = процесс. Плохая неделя = нарушение, независимо от знака.\n\nСезон-тренажёр: судил по технике ${byTech}/10 (${pct}%), по табло ${byBoard}/10.\nСумма сезона ${fmt(sum)}, нарушенных сделок ${broken} — ${broken} трещины в заборе.`;
    q('[data-stage]').innerHTML = `
<canvas></canvas>
<div class="aha"><b>Табло и техника за 10 сделок не связаны: r = ${rCoef.toFixed(2)}.</b> Сумма сезона ${fmt(sum)} — «в целом плюс, значит всё хорошо»? Взгляд процесса: <b>${broken} нарушенных сделок</b> — ${broken} трещины, и именно они определят следующий квартал. Ты судил по технике в ${byTech} из 10 (${pct}%). Всё, что ниже 100%, — самооценка в аренде у случая.</div>
<div class="tw"><table><tr><th>#</th><th>результат</th><th>техника</th><th>ты</th><th>судья</th><th>судил по</th></tr>${rows}</table></div>
<div class="mut" style="margin-top:12px">Артефакт: шаблон двойной отметки недели</div>
<textarea readonly data-art>${art}</textarea>
<div class="actions"><button class="btn" data-copy>Скопировать</button><button class="btn pri" data-new>Новый сезон</button></div>`;
    const cv = q('canvas'); drawScatter(cv);
    box._expResize = ()=>drawScatter(cv); window.addEventListener('resize', box._expResize);
    const ta=q('[data-art]'), cp=q('[data-copy]');
    cp.onclick=()=>{ ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} if(navigator.clipboard){navigator.clipboard.writeText(ta.value).catch(()=>{});} cp.textContent='Скопировано ✓'; };
    q('[data-new]').onclick=()=>{ seed = Date.now()%2147483647; window.removeEventListener('resize', box._expResize); box._expResize=null; start(); };
  }

  start();
};
