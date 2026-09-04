/*
 * W-34 · widget_p0_l11 · 0.11 «Расчёт PnL»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, из чего складывается результат сделки (движение цены минус комиссии минус
 *   Задание:  (1) найти цену выхода, при которой сделка закрывается ровно в ноль после издержек;
 *   Ага:      «продал по той же цене» — уже минус; движение рынка симметрично, издержки — нет
 *   Дефолты:  позиция $1 000, вход $90 000, выход $95 000, комиссия 0.10 % за сторону, проскальзывание
 *   Артефакт: «безубыток $X (+Y %), результат при $95 000 +$A, зеркальный убыток −$B» →
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p0_l11'] = function(box){
  /* ───── 0. чистка ───── */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers=[]; box._expRaf=null; box._expRO=null; box._expResize=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); box._expTimers.push(t); return t; };
  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const MONO='ui-monospace,Menlo,Consolas,monospace';

  /* ───── 1. состояние (канон урока 0.11) ───── */
  const P={min:50000,max:130000};
  const S={entry:90000,exit:95000,posUsd:1000,qty:1000/90000,feeBps:10,slipBps:5,hist:[95000],live:false,liveTimer:null,realized:null,tries:0,revealBE:false,mirror:null,rnd:mulberry32(42)};
  const fmtP=p=>'$'+Math.round(p).toLocaleString('ru-RU');
  const fmtS=v=>(v<0?'−':'+')+'$'+Math.abs(v).toFixed(2);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

  function calc(en,ex,q,fb,sb){
    const f=fb/1e4,s=sb/1e4, enF=en*(1+s), exF=ex*(1-s);          // покупаешь чуть дороже, продаёшь чуть дешевле
    const gross=(ex-en)*q, slip=q*(en+ex)*s, fees=(q*enF+q*exF)*f;
    const net=q*exF*(1-f)-q*enF*(1+f);                              // == gross − slip − fees
    const be=en*(1+s)*(1+f)/((1-s)*(1-f));                          // цена выхода, при которой net = 0
    return {en,ex,q,gross,slip,fees,net,be,bePct:(be/en-1)*100};
  }
  const cur=()=>calc(S.entry,S.exit,S.qty,S.feeBps,S.slipBps);

  /* ───── 2. разметка ───── */
  box.innerHTML=`<style>
    .w34{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:#0d1022;border:1px solid var(--line,#232846);border-radius:12px;padding:14px;max-width:100%}
    .w34,.w34 *{box-sizing:border-box}
    .w34-head b{display:block;font-size:16px}
    .w34-mut{color:var(--mut,#9aa3c7);font-size:13px}
    .w34-task{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;font-size:13px}
    .w34-cv{width:100%;display:block;border-radius:8px;background:#080b18}
    .w34-big{margin:10px 0 2px;font-family:${MONO};font-size:28px;font-weight:700;transition:color .2s}
    .w34-big.pos{color:var(--ok,#22c55e)}.w34-big.neg{color:var(--bad,#ef4444)}
    .w34-big.pulse{animation:w34p .35s}
    @keyframes w34p{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
    .w34-status{font-size:12px;color:var(--mut,#9aa3c7);min-height:18px}
    .w34-status.fix{color:var(--warn,#eab308)}
    .w34-sl{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:10px}
    .w34-sl label{font-size:12px;color:var(--mut,#9aa3c7);display:block}
    .w34-sl label b{color:var(--txt,#eef1ff);font-family:${MONO};font-weight:600}
    .w34-sl input{width:100%;accent-color:var(--acc2,#06b6d4)}
    .w34-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
    .w34-btn{cursor:pointer;border:1px solid var(--line,#232846);background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;font:inherit;font-size:13px}
    .w34-btn.on{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4);background:rgba(6,182,212,.12)}
    .w34-btn.pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:600}
    .w34-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
    .w34-grid>div{background:rgba(255,255,255,.03);border:1px solid var(--line,#232846);border-radius:8px;padding:8px 10px}
    .w34-grid span{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
    .w34-grid b{font-family:${MONO};font-size:15px}
    .w34-net{grid-column:1/-1;border-color:var(--acc2,#06b6d4)!important}
    .w34-mirror{display:none;margin-top:8px;padding:8px 10px;border:1px dashed var(--warn,#eab308);border-radius:8px;font-size:13px}
    .w34-mirror table{width:100%;border-collapse:collapse;font-family:${MONO};font-size:13px;margin:6px 0}
    .w34-mirror td{padding:2px 4px}.w34-mirror td+td{text-align:right}
    .w34-verdict{margin-top:8px;padding:8px 10px;border-radius:8px;font-size:13px;min-height:20px}
    .w34-verdict.ok{background:rgba(34,197,94,.12);color:var(--ok,#22c55e)}
    .w34-verdict.warn{background:rgba(234,179,8,.12);color:var(--warn,#eab308)}
    .w34-verdict.bad{background:rgba(239,68,68,.12);color:var(--bad,#ef4444)}
    .w34-art{margin-top:8px;font-size:12px;color:var(--mut,#9aa3c7);font-family:${MONO};white-space:pre-wrap}
    @media (max-width:420px){.w34-sl,.w34-grid{grid-template-columns:1fr}.w34-big{font-size:24px}}
  </style>
  <div class="w34">
    <div class="w34-head"><b>Прибыль и убыток: из чего складывается результат</b>
      <span class="w34-mut">Цель: увидеть, что результат = движение цены − проскальзывание − комиссии, и чем «плавающий» PnL отличается от зафиксированного</span></div>
    <div class="w34-task"><b>Задание.</b> 1) Двигай «цену выхода», пока сделка не закроется <u>ровно в ноль</u> после издержек — нажми «Проверить безубыток». 2) Нажми «Перевернуть сделку». 3) Включи «Пусть цена подвигается», потом «Продать».</div>
    <canvas class="w34-cv"></canvas>
    <div class="w34-big"></div><div class="w34-status"></div>
    <div class="w34-sl">
      <label>Цена входа <b class="w34-v-en"></b><input type="range" class="w34-en" min="${P.min}" max="${P.max}" step="500"></label>
      <label>Цена выхода (текущая) <b class="w34-v-ex"></b><input type="range" class="w34-ex" min="${P.min}" max="${P.max}" step="50"></label>
      <label>Размер позиции <b class="w34-v-pos"></b><input type="range" class="w34-pos" min="100" max="5000" step="100"></label>
      <label>Комиссия за сторону <b class="w34-v-fee"></b><input type="range" class="w34-fee" min="0" max="50" step="1"></label>
      <label>Проскальзывание за сторону <b class="w34-v-slip"></b><input type="range" class="w34-slip" min="0" max="50" step="1"></label>
    </div>
    <div class="w34-row">
      <button class="w34-btn w34-live">Пусть цена подвигается</button>
      <button class="w34-btn pri w34-sell">Продать (зафиксировать)</button>
      <button class="w34-btn w34-flip">Перевернуть сделку</button>
      <button class="w34-btn w34-check">Проверить безубыток</button>
      <button class="w34-btn w34-reset">Сброс</button>
    </div>
    <div class="w34-grid">
      <div><span>Куплено монет</span><b class="w34-qty"></b></div>
      <div><span>Движение цены × количество</span><b class="w34-gross"></b></div>
      <div><span>− Проскальзывание (вход + выход)</span><b class="w34-slipv"></b></div>
      <div><span>− Комиссии (вход + выход)</span><b class="w34-feesv"></b></div>
      <div class="w34-net"><span>= Чистый результат</span><b class="w34-netv"></b></div>
    </div>
    <div class="w34-mirror"></div>
    <div class="w34-verdict"></div>
    <div class="w34-row"><button class="w34-btn w34-save">Записать вывод</button><span class="w34-mut w34-tries"></span></div>
    <div class="w34-art"></div>
  </div>`;

  const $=s=>box.querySelector(s);
  const root=$('.w34'), cv=$('.w34-cv'), ctx=cv.getContext('2d'), big=$('.w34-big'), status=$('.w34-status'), verdictEl=$('.w34-verdict');
  const sl={en:$('.w34-en'),ex:$('.w34-ex'),pos:$('.w34-pos'),fee:$('.w34-fee'),slip:$('.w34-slip')};
  let W=320,H=310;

  /* ───── 3. канвас: путь цены + водопад ───── */
  function size(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    W=Math.max(300,root.clientWidth-30); H=310;
    cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(){
    const r=cur(); ctx.clearRect(0,0,W,H);
    /* — путь цены — */
    const cT=10,cB=160,cL=10,cR=W-96;
    const pts=S.hist.length>1?S.hist:[S.hist[0],S.hist[0]];
    const prices=pts.concat([S.entry]); if(S.revealBE) prices.push(r.be);
    let lo=Math.min.apply(null,prices),hi=Math.max.apply(null,prices);
    const pad=Math.max((hi-lo)*0.2,S.entry*0.004); lo-=pad; hi+=pad;
    const yOf=p=>cB-(p-lo)/(hi-lo)*(cB-cT), xOf=i=>cL+i/(pts.length-1)*(cR-cL), yEn=yOf(S.entry);
    const poly=()=>{ ctx.beginPath(); pts.forEach((p,i)=>{ i?ctx.lineTo(xOf(i),yOf(p)):ctx.moveTo(xOf(i),yOf(p)); }); ctx.lineTo(xOf(pts.length-1),yEn); ctx.lineTo(xOf(0),yEn); ctx.closePath(); };
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,yEn); ctx.clip(); poly(); ctx.fillStyle='rgba(34,197,94,.22)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0,yEn,W,H-yEn); ctx.clip(); poly(); ctx.fillStyle='rgba(239,68,68,.22)'; ctx.fill(); ctx.restore();
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(154,163,199,.8)'; ctx.beginPath(); ctx.moveTo(cL,yEn); ctx.lineTo(cR+6,yEn); ctx.stroke(); ctx.setLineDash([]);
    if(S.revealBE){ const yB=yOf(r.be); ctx.setLineDash([2,4]); ctx.strokeStyle='#eab308'; ctx.beginPath(); ctx.moveTo(cL,yB); ctx.lineTo(cR+6,yB); ctx.stroke(); ctx.setLineDash([]);
      ctx.font='11px '+MONO; ctx.fillStyle='#eab308'; ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillText('безубыток '+fmtP(r.be)+' (+'+r.bePct.toFixed(2)+' %)',cL+4,yB-2); }
    ctx.strokeStyle='#eef1ff'; ctx.lineWidth=2; ctx.beginPath(); pts.forEach((p,i)=>{ i?ctx.lineTo(xOf(i),yOf(p)):ctx.moveTo(xOf(i),yOf(p)); }); ctx.stroke(); ctx.lineWidth=1;
    if(S.realized){ const xr=xOf(Math.min(S.realized.idx,pts.length-1)); ctx.setLineDash([3,3]); ctx.strokeStyle='#eab308'; ctx.beginPath(); ctx.moveTo(xr,cT); ctx.lineTo(xr,cB); ctx.stroke(); ctx.setLineDash([]);
      ctx.font='bold 11px system-ui,sans-serif'; ctx.fillStyle='#eab308'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('продал — результат заморожен',clamp(xr,70,cR-70),cT); }
    const xe=xOf(pts.length-1), ye=yOf(S.exit);
    ctx.fillStyle='#06b6d4'; ctx.beginPath(); ctx.arc(xe,ye,5,0,Math.PI*2); ctx.fill();
    ctx.font='11px '+MONO; ctx.textAlign='left'; ctx.textBaseline='middle';
    let yLabEx=ye, yLabEn=yEn; if(Math.abs(yLabEx-yLabEn)<14){ yLabEx=ye<yEn?ye-8:ye+8; yLabEn=ye<yEn?yEn+8:yEn-8; }
    ctx.fillStyle='#9aa3c7'; ctx.fillText('вход '+fmtP(S.entry),cR+10,yLabEn);
    ctx.fillStyle='#06b6d4'; ctx.fillText('цена '+fmtP(S.exit),cR+10,yLabEx);

    /* — водопад издержек — */
    const shown=S.realized?S.realized.res:r;
    const wT=196,wB=290,wL=14,wR=W-14;
    const steps=[{n:'Движение',v:shown.gross},{n:'Проскальз.',v:-shown.slip},{n:'Комиссии',v:-shown.fees},{n:'Итого',v:shown.net,total:true}];
    const levels=[0,shown.gross,shown.gross-shown.slip,shown.net];
    let vlo=Math.min.apply(null,levels),vhi=Math.max.apply(null,levels); if(vhi-vlo<1e-6){ vhi=1; vlo=-1; }
    const vpad=(vhi-vlo)*0.25; vlo-=vpad; vhi+=vpad;
    const vy=v=>wB-(v-vlo)/(vhi-vlo)*(wB-wT), y0=vy(0), bw=(wR-wL)/4-12;
    ctx.strokeStyle='rgba(154,163,199,.5)'; ctx.beginPath(); ctx.moveTo(wL,y0); ctx.lineTo(wR,y0); ctx.stroke();
    ctx.font='11px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillStyle='#9aa3c7';
    ctx.fillText('как из движения получается результат',W/2,wT-22);
    let run=0;
    steps.forEach((st,i)=>{
      const x=wL+i*((wR-wL)/4)+6, a=st.total?0:run, b=st.total?st.v:run+st.v;
      const y1=vy(Math.max(a,b)), y2=vy(Math.min(a,b));
      ctx.fillStyle=st.total?(st.v>=0?'rgba(34,197,94,.55)':'rgba(239,68,68,.55)'):(st.v>=0?'rgba(34,197,94,.45)':'rgba(239,68,68,.45)');
      ctx.fillRect(x,y1,bw,Math.max(2,y2-y1));
      if(st.total){ ctx.strokeStyle='#06b6d4'; ctx.strokeRect(x+.5,y1+.5,bw-1,Math.max(2,y2-y1)-1); }
      ctx.fillStyle='#9aa3c7'; ctx.font='11px system-ui,sans-serif'; ctx.textBaseline='top'; ctx.fillText(st.n,x+bw/2,wB+4);
      ctx.fillStyle=st.v>=0?'#22c55e':'#ef4444'; ctx.font='11px '+MONO; ctx.textBaseline='bottom'; ctx.fillText(fmtS(st.v),x+bw/2,y1-2);
      if(!st.total) run+=st.v;
    });
  }

  /* ───── 4. числа ───── */
  function pulse(){ big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse'); }
  function update(){
    const r=cur(), shown=S.realized?S.realized.res:r;
    $('.w34-v-en').textContent=fmtP(S.entry); $('.w34-v-ex').textContent=fmtP(S.exit);
    $('.w34-v-pos').textContent='$'+Math.round(S.posUsd).toLocaleString('ru-RU');
    $('.w34-v-fee').textContent=S.feeBps+' bps = '+(S.feeBps/100).toFixed(2)+' %';
    $('.w34-v-slip').textContent=S.slipBps+' bps';
    big.textContent=fmtS(shown.net); big.className='w34-big '+(shown.net>=0?'pos':'neg');
    if(S.realized){ status.className='w34-status fix'; status.textContent='Реализованный PnL — зафиксирован при '+fmtP(S.realized.res.ex)+'. Цена сейчас '+fmtP(S.exit)+', но позиция закрыта: на балансе ничего не меняется.'; }
    else { status.className='w34-status'; status.textContent='Нереализованный («бумажный») PnL — плавает вместе с ценой, на балансе его ещё нет.'; }
    $('.w34-qty').textContent=S.qty.toFixed(5)+' BTC';
    $('.w34-gross').textContent=fmtS(shown.gross)+'  ('+fmtS(shown.ex-shown.en).replace('.00','')+' × '+shown.q.toFixed(5)+')';
    $('.w34-slipv').textContent='−$'+shown.slip.toFixed(2);
    $('.w34-feesv').textContent='−$'+shown.fees.toFixed(2);
    $('.w34-netv').textContent=fmtS(shown.net);
    draw();
  }
  function pushHist(p){ S.hist.push(p); if(S.hist.length>80) S.hist.shift(); }
  function resetRealized(){ S.realized=null; }

  /* ───── 5. события ───── */
  sl.en.value=S.entry; sl.ex.value=S.exit; sl.pos.value=S.posUsd; sl.fee.value=S.feeBps; sl.slip.value=S.slipBps;
  sl.en.oninput=()=>{ S.entry=+sl.en.value; S.qty=S.posUsd/S.entry; resetRealized(); S.mirror=null; $('.w34-mirror').style.display='none'; update(); };
  sl.pos.oninput=()=>{ S.posUsd=+sl.pos.value; S.qty=S.posUsd/S.entry; resetRealized(); update(); };
  sl.ex.oninput=()=>{ S.exit=+sl.ex.value; pushHist(S.exit); update(); };
  sl.fee.oninput=()=>{ S.feeBps=+sl.fee.value; resetRealized(); update(); };
  sl.slip.oninput=()=>{ S.slipBps=+sl.slip.value; resetRealized(); update(); };

  const liveBtn=$('.w34-live');
  function stopLive(){ if(S.liveTimer){ clearInterval(S.liveTimer); S.liveTimer=null; } S.live=false; liveBtn.classList.remove('on'); liveBtn.textContent='Пусть цена подвигается'; }
  liveBtn.onclick=()=>{
    if(S.live){ stopLive(); return; }
    S.live=true; liveBtn.classList.add('on'); liveBtn.textContent='Остановить цену';
    S.liveTimer=later(()=>{
      const step=S.exit*(S.rnd()-0.5)*0.008;                          // ±0,4 % за тик, детерминированно
      S.exit=clamp(Math.round((S.exit+step)/50)*50,P.min,P.max); sl.ex.value=S.exit; pushHist(S.exit);
      update(); if(!S.realized) pulse();
    },600,true);
  };
  $('.w34-sell').onclick=()=>{
    if(S.realized) return;
    S.realized={res:cur(),idx:S.hist.length-1}; update();
    verdictEl.className='w34-verdict ok';
    verdictEl.textContent='Зафиксировано: '+fmtS(S.realized.res.net)+'. Это уже деньги на балансе. Продолжай двигать цену — заметь, что большое число больше не меняется: реализованный PnL не зависит от того, куда рынок пошёл после кнопки «Продать».';
  };
  $('.w34-flip').onclick=()=>{
    const before=cur(), en=S.exit, ex=S.entry;                          // количество монет сохраняем → движение зеркально
    S.entry=en; S.exit=ex; S.posUsd=S.qty*S.entry; sl.en.value=S.entry; sl.ex.value=S.exit; sl.pos.value=clamp(Math.round(S.posUsd/100)*100,100,5000);
    resetRealized(); S.hist=[S.exit]; const after=cur(); S.mirror={before,after}; update();
    const m=$('.w34-mirror'), d=Math.abs(after.net+before.net);
    m.style.display='block';
    m.innerHTML='<b>Зеркало.</b> Рынок прошёл тот же путь, только в обратную сторону:'
      +'<table><tr><td></td><td>до</td><td>после</td></tr>'
      +'<tr><td>движение цены</td><td>'+fmtS(before.gross)+'</td><td>'+fmtS(after.gross)+'</td></tr>'
      +'<tr><td>издержки</td><td>−$'+(before.slip+before.fees).toFixed(2)+'</td><td>−$'+(after.slip+after.fees).toFixed(2)+'</td></tr>'
      +'<tr><td><b>чистыми</b></td><td><b>'+fmtS(before.net)+'</b></td><td><b>'+fmtS(after.net)+'</b></td></tr></table>'
      +'Разница между зеркалами — <b>$'+d.toFixed(2)+'</b>: это издержки, взятые дважды. Движение цены симметрично, комиссия и проскальзывание — нет: они вычитаются в обе стороны.';
  };
  $('.w34-check').onclick=()=>{
    S.tries++; $('.w34-tries').textContent='попыток: '+S.tries;
    const r=cur(), tol=Math.max(75,S.entry*0.0008);
    if(Math.abs(S.exit-r.be)<=tol){
      S.revealBE=true; verdictEl.className='w34-verdict ok';
      verdictEl.innerHTML='<b>Точно.</b> Безубыток ≈ '+fmtP(r.be)+': цене нужно вырасти на <b>+'+r.bePct.toFixed(2)+' %</b>, просто чтобы вернуть комиссии и проскальзывание. Это и есть «трение» из урока 0.18 — ноль на экране уже минус в кармане.';
    } else if(Math.abs(S.exit-S.entry)<1){
      verdictEl.className='w34-verdict bad';
      verdictEl.textContent='Выход равен входу, а результат '+fmtS(r.net)+': две комиссии и два проскальзывания. Вот почему «продал по той же цене» — не ноль. Безубыток выше входа.';
    } else if(r.net<0){
      verdictEl.className='w34-verdict warn';
      verdictEl.textContent='Пока '+fmtS(r.net)+': издержки съели больше, чем дало движение. Выход должен быть выше.';
    } else {
      verdictEl.className='w34-verdict warn';
      verdictEl.textContent='Уже '+fmtS(r.net)+' — можно ниже: безубыток ближе к входу.';
    }
    update();
  };
  $('.w34-reset').onclick=()=>{ stopLive(); resetRealized(); S.hist=[S.exit]; S.mirror=null; $('.w34-mirror').style.display='none'; verdictEl.className='w34-verdict'; verdictEl.textContent=''; update(); };
  $('.w34-save').onclick=()=>{
    const r=cur();
    let txt='Урок 0.11 · позиция $'+Math.round(S.posUsd)+' по '+fmtP(S.entry)+' ('+S.qty.toFixed(5)+' BTC), комиссия '+S.feeBps+' bps, проскальзывание '+S.slipBps+' bps: безубыток '+fmtP(r.be)+' (+'+r.bePct.toFixed(2)+' %); при '+fmtP(S.exit)+' результат '+fmtS(r.net)+' (движение '+fmtS(r.gross)+', издержки −$'+(r.slip+r.fees).toFixed(2)+')';
    if(S.mirror) txt+='; зеркало: '+fmtS(S.mirror.before.net)+' против '+fmtS(S.mirror.after.net)+' — разница $'+Math.abs(S.mirror.before.net+S.mirror.after.net).toFixed(2)+' = двойные издержки';
    if(S.realized) txt+='; зафиксировано '+fmtS(S.realized.res.net)+' при '+fmtP(S.realized.res.ex);
    try{ localStorage.setItem('kn_artifact_p0_l11',txt); }catch(e){}
    box.dispatchEvent(new CustomEvent('widget:artifact',{bubbles:true,detail:{id:'widget_p0_l11',text:txt,data:{entry:S.entry,exit:S.exit,posUsd:S.posUsd,feeBps:S.feeBps,slipBps:S.slipBps,breakeven:r.be,net:r.net,tries:S.tries}}}));
    $('.w34-art').textContent='✓ Записано в профиль: '+txt;
  };

  /* ───── 6. адаптив и старт ───── */
  const onResize=()=>{ size(); draw(); };
  if(typeof ResizeObserver!=='undefined'){ box._expRO=new ResizeObserver(onResize); box._expRO.observe(root); }
  else { box._expResize=onResize; window.addEventListener('resize',onResize); }
  size(); update();
};
