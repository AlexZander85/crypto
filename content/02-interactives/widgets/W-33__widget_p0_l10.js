/*
 * W-33 · widget_p0_l10 · 0.10 «Стакан вживую: цена мгновения»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что рыночный ордер исполняется не по «цене на экране», а по средней цене
 *   Задание:  найти максимальный объём, при котором проскальзывание ≤ комиссии тейкера (10 bps),
 *   Ага:      средняя цена отрывается от лучшей ступеньками по мере поедания уровней; в тонком
 *   Дефолты:  ордер 10 BTC; уровни $100.00×2 / 100.20×3 / 100.50×5 / 101.00×8 / 102.00×12;
 *   Артефакт: строка «ордер X → средняя $Y, проскальзывание Z bps, переплата $O, порог ликвидного / тонкого»
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p0_l10'] = function(box){
  /* ───── 0. чистим прошлый запуск ───── */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers=[]; box._expRaf=null; box._expRO=null; box._expResize=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); box._expTimers.push(t); return t; };
  const raf=fn=>{ if(box._expRaf) cancelAnimationFrame(box._expRaf); box._expRaf=requestAnimationFrame(fn); };
  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const MONO='ui-monospace,Menlo,Consolas,monospace';

  /* ───── 1. канон урока 0.10 ───── */
  const FEE_BPS=10;                                   // комиссия тейкера 0.10 %
  const BOOKS={
    liquid:{label:'Ликвидный',unit:'BTC',  prices:[100.00,100.20,100.50,101.00,102.00],vols:[2,3,5,8,12],            min:0.5, step:0.5, max:30,def:10,bid:99.90},
    thin:  {label:'Тонкий',   unit:'монет',prices:[100.00,100.80,102.00,104.00,107.00],vols:[0.10,0.15,0.25,0.40,0.60],min:0.05,step:0.05,max:3, def:1, bid:99.20}
  };
  const S={mode:'liquid',levels:[],qty:10,shown:0,target:0,tries:0,done:{liquid:null,thin:null},note:'',wasEmpty:false};
  const fmtQ=q=>String(+q.toFixed(2));
  const fmtP=p=>'$'+p.toFixed(2);

  function buildLevels(seed){
    const b=BOOKS[S.mode], rnd=(seed==null)?null:mulberry32(seed);
    S.levels=b.prices.map((p,i)=>{
      let v=b.vols[i];
      if(rnd){ v=v*(0.6+0.8*rnd()); v=Math.max(b.step,Math.round(v/b.step)*b.step); }
      return {price:p,vol:v};
    });
    S.note=(seed==null)?'числа урока':'случайный стакан №'+(seed%1000);
  }
  function fill(q){                                   // сколько съест ордер объёмом q
    const best=S.levels[0].price; let rest=q,cost=0,filled=0;
    const takes=S.levels.map(l=>{ const t=Math.min(rest,l.vol); rest-=t; cost+=t*l.price; filled+=t; return t; });
    const avg=filled>0?cost/filled:best;
    const slipBps=(avg-best)/best*1e4, slipUsd=(avg-best)*filled, feeUsd=cost*FEE_BPS/1e4;
    return {best,avg,filled,rest,cost,takes,slipBps,slipUsd,feeUsd,overpay:slipUsd+feeUsd,total:S.levels.reduce((a,l)=>a+l.vol,0)};
  }
  function threshold(){                               // макс. объём с проскальзыванием ≤ 10 bps
    const b=BOOKS[S.mode]; let thr=0;
    for(let q=b.min;q<=b.max+1e-9;q=+(q+b.step).toFixed(4)){
      const f=fill(q); if(f.rest>1e-9) break;
      if(f.slipBps<=FEE_BPS+1e-6) thr=q; else break;
    }
    return +thr.toFixed(2);
  }

  /* ───── 2. разметка ───── */
  box.innerHTML=`<style>
    .w33{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:#0d1022;border:1px solid var(--line,#232846);border-radius:12px;padding:14px;max-width:100%}
    .w33,.w33 *{box-sizing:border-box}
    .w33-head b{display:block;font-size:16px}
    .w33-mut{color:var(--mut,#9aa3c7);font-size:13px}
    .w33-task{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;font-size:13px}
    .w33-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
    .w33-tab,.w33-btn{cursor:pointer;border:1px solid var(--line,#232846);background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;font:inherit;font-size:13px}
    .w33-tab.on{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4);background:rgba(6,182,212,.12)}
    .w33-btn.pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:600}
    .w33-cv{width:100%;display:block;border-radius:8px;background:#080b18}
    .w33-lab{display:block;margin:10px 0 4px;font-size:13px;color:var(--mut,#9aa3c7)}
    .w33-lab b{color:var(--txt,#eef1ff);font-family:${MONO}}
    .w33-rng{width:100%;accent-color:var(--acc2,#06b6d4)}
    .w33-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
    .w33-grid>div{background:rgba(255,255,255,.03);border:1px solid var(--line,#232846);border-radius:8px;padding:8px 10px}
    .w33-grid span{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
    .w33-grid b{font-family:${MONO};font-size:15px}
    .w33-total{grid-column:1/-1;border-color:var(--acc2,#06b6d4)!important}
    .w33-verdict{margin-top:8px;padding:8px 10px;border-radius:8px;font-size:13px;min-height:20px}
    .w33-verdict.ok{background:rgba(34,197,94,.12);color:var(--ok,#22c55e)}
    .w33-verdict.warn{background:rgba(234,179,8,.12);color:var(--warn,#eab308)}
    .w33-verdict.bad{background:rgba(239,68,68,.12);color:var(--bad,#ef4444)}
    .w33-art{margin-top:8px;font-size:12px;color:var(--mut,#9aa3c7);font-family:${MONO};white-space:pre-wrap}
    .w33-flash{animation:w33f .7s}
    @keyframes w33f{0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}100%{box-shadow:0 0 0 14px rgba(239,68,68,0)}}
    @media (max-width:420px){.w33-grid{grid-template-columns:1fr}}
  </style>
  <div class="w33">
    <div class="w33-head"><b>Стакан вживую: цена мгновения</b>
      <span class="w33-mut">Цель: увидеть, что рыночный ордер исполняется не по «цене на экране», а по средней цене съеденных уровней</span></div>
    <div class="w33-task"><b>Задание.</b> Найди <u>максимальный</u> объём, при котором проскальзывание не превышает комиссию тейкера (10 bps = 0,10 %). Нажми «Это порог». Затем повтори в тонком стакане.</div>
    <div class="w33-row">
      <button class="w33-tab on" data-m="liquid">Ликвидный · BTC/USDT</button>
      <button class="w33-tab" data-m="thin">Тонкий · мемкоин</button>
      <button class="w33-btn w33-new">Новый стакан</button>
      <span class="w33-mut w33-note"></span>
    </div>
    <canvas class="w33-cv"></canvas>
    <label class="w33-lab">Рыночный ордер «купить сейчас»: <b class="w33-q"></b></label>
    <input type="range" class="w33-rng">
    <div class="w33-grid">
      <div><span>Лучшая цена продавца (Ask)</span><b class="w33-best"></b></div>
      <div><span>Твоя средняя цена</span><b class="w33-avg"></b></div>
      <div><span>Проскальзывание</span><b class="w33-slip"></b></div>
      <div><span>Комиссия тейкера 0,10 %</span><b class="w33-fee"></b></div>
      <div class="w33-total"><span>Переплата за мгновение = проскальзывание + комиссия (против покупки всего объёма по лучшей цене)</span><b class="w33-over"></b></div>
    </div>
    <div class="w33-verdict"></div>
    <div class="w33-row">
      <button class="w33-btn pri w33-check">Это порог</button>
      <button class="w33-btn w33-save">Записать вывод</button>
      <span class="w33-mut w33-tries"></span>
    </div>
    <div class="w33-art"></div>
  </div>`;

  const $=s=>box.querySelector(s);
  const root=$('.w33'), cv=$('.w33-cv'), ctx=cv.getContext('2d'), rng=$('.w33-rng'), verdictEl=$('.w33-verdict');
  let W=320,H=300;

  /* ───── 3. канвас ───── */
  function size(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    W=Math.max(300,root.clientWidth-30); H=300;
    cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(){
    const b=BOOKS[S.mode], f=fill(S.shown), n=S.levels.length;
    ctx.clearRect(0,0,W,H);
    const top=10,rowH=30,barX=78,rightW=104,barW=Math.max(60,W-barX-rightW);
    const maxVol=Math.max.apply(null,S.levels.map(l=>l.vol));
    ctx.textBaseline='middle';

    /* уровни: лучший ask внизу, как в реальной книге */
    S.levels.forEach((l,i)=>{
      const y=top+(n-1-i)*rowH, h=rowH-8, w=Math.max(4,l.vol/maxVol*barW), eaten=f.takes[i], ew=eaten/l.vol*w;
      ctx.fillStyle='rgba(239,68,68,.18)'; ctx.fillRect(barX,y,w,h);
      ctx.strokeStyle='rgba(239,68,68,.55)'; ctx.lineWidth=1; ctx.strokeRect(barX+.5,y+.5,w-1,h-1);
      if(ew>0){ ctx.fillStyle='rgba(6,182,212,.8)'; ctx.fillRect(barX,y,ew,h); }
      ctx.font='12px '+MONO; ctx.textAlign='left';
      ctx.fillStyle=eaten>0?'#eef1ff':'#9aa3c7'; ctx.fillText(fmtP(l.price),8,y+h/2);
      ctx.font='11px '+MONO; ctx.fillStyle=eaten>0?'#06b6d4':'#9aa3c7';
      ctx.fillText((eaten>0?'съел '+fmtQ(eaten)+' из ':'')+fmtQ(l.vol),barX+barW+8,y+h/2);
    });
    /* спред */
    const ySp=top+n*rowH+2;
    ctx.setLineDash([3,4]); ctx.strokeStyle='rgba(154,163,199,.5)'; ctx.beginPath(); ctx.moveTo(8,ySp); ctx.lineTo(W-8,ySp); ctx.stroke(); ctx.setLineDash([]);
    ctx.font='11px system-ui,sans-serif'; ctx.fillStyle='#9aa3c7'; ctx.textAlign='left';
    ctx.fillText('спред · лучший Bid '+fmtP(b.bid)+' — там стоят покупатели, но тебе они не продадут',8,ySp+11);

    /* линейка цен: лучшая → твоя средняя */
    const y0=ySp+52, worst=S.levels[n-1].price, best=f.best, span=Math.max(worst-best,0.01);
    const xOf=p=>barX+(p-best)/span*barW;
    ctx.strokeStyle='rgba(154,163,199,.6)'; ctx.beginPath(); ctx.moveTo(barX,y0); ctx.lineTo(barX+barW,y0); ctx.stroke();
    S.levels.forEach(l=>{ const x=xOf(l.price); ctx.beginPath(); ctx.moveTo(x,y0-4); ctx.lineTo(x,y0+4); ctx.stroke(); });
    const xa=xOf(f.avg);
    ctx.fillStyle='rgba(6,182,212,.22)'; ctx.fillRect(barX,y0-9,Math.max(0,xa-barX),18);
    ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(barX,y0,5,0,Math.PI*2); ctx.fill();
    ctx.font='11px '+MONO; ctx.textAlign='left'; ctx.fillStyle='#22c55e';
    ctx.fillText('лучшая '+fmtP(best),barX-2,y0-17);
    ctx.fillStyle='#06b6d4'; ctx.beginPath(); ctx.moveTo(xa,y0-9); ctx.lineTo(xa-6,y0+2); ctx.lineTo(xa+6,y0+2); ctx.closePath(); ctx.fill();
    ctx.textAlign=xa>barX+barW*0.6?'right':'left';
    ctx.fillText('твоя средняя '+fmtP(f.avg)+'  (+'+f.slipBps.toFixed(1)+' bps)',xa+(ctx.textAlign==='left'?8:-8),y0+18);
    ctx.textAlign='right'; ctx.fillStyle='#9aa3c7'; ctx.fillText(fmtP(worst),barX+barW,y0-17);
    if(f.rest>1e-9){
      ctx.textAlign='left'; ctx.fillStyle='#ef4444'; ctx.font='bold 12px system-ui,sans-serif';
      ctx.fillText('стакан кончился: не исполнено '+fmtQ(f.rest)+' '+b.unit,8,y0+38);
    }
  }
  function animate(){
    S.target=fill(S.qty).filled;
    const step=()=>{ const d=S.target-S.shown; if(Math.abs(d)<0.003){ S.shown=S.target; draw(); return; } S.shown+=d*0.22; draw(); raf(step); };
    raf(step);
  }

  /* ───── 4. числа и вердикт ───── */
  function verdict(fx){
    const u=BOOKS[S.mode].unit, bps=fx.slipBps.toFixed(1);
    if(fx.rest>1e-9){
      verdictEl.className='w33-verdict bad';
      verdictEl.textContent='Стакана не хватило: '+fmtQ(fx.rest)+' '+u+' не исполнено. В жизни это либо отказ биржи, либо цена ещё хуже — ты сам стал рынком.';
      if(!S.wasEmpty){ root.classList.remove('w33-flash'); void root.offsetWidth; root.classList.add('w33-flash'); later(()=>root.classList.remove('w33-flash'),750); }
    } else if(fx.slipBps<=FEE_BPS+1e-6){
      verdictEl.className='w33-verdict ok';
      verdictEl.textContent='Проскальзывание '+bps+' bps ≤ комиссии 10 bps: стакан «переваривает» ордер — переплата почти целиком комиссия.';
    } else if(fx.slipBps<=50){
      verdictEl.className='w33-verdict warn';
      verdictEl.textContent='Проскальзывание '+bps+' bps уже больше комиссии: за скорость ты платишь рынку больше, чем бирже.';
    } else {
      verdictEl.className='w33-verdict bad';
      verdictEl.textContent='Проскальзывание '+bps+' bps — в '+(fx.slipBps/FEE_BPS).toFixed(0)+' раз больше комиссии. Такой ордер дробят (TWAP) или ставят лимитным.';
    }
    S.wasEmpty=fx.rest>1e-9;
  }
  function update(){
    const b=BOOKS[S.mode], fx=fill(S.qty);
    $('.w33-q').textContent=fmtQ(S.qty)+' '+b.unit;
    $('.w33-best').textContent=fmtP(fx.best);
    $('.w33-avg').textContent=fmtP(fx.avg);
    $('.w33-slip').textContent=fx.slipBps.toFixed(1)+' bps · $'+fx.slipUsd.toFixed(2);
    $('.w33-fee').textContent='$'+fx.feeUsd.toFixed(2);
    $('.w33-over').textContent='$'+fx.overpay.toFixed(2)+'  ('+((fx.filled>0?fx.overpay/(fx.best*fx.filled):0)*1e4).toFixed(1)+' bps от объёма)';
    $('.w33-note').textContent=S.note;
    verdict(fx); animate();
  }
  function applyMode(m){
    S.mode=m; const b=BOOKS[m];
    box.querySelectorAll('.w33-tab').forEach(t=>t.classList.toggle('on',t.dataset.m===m));
    rng.min=b.min; rng.max=b.max; rng.step=b.step; rng.value=b.def; S.qty=b.def; S.shown=0; S.wasEmpty=false;
    buildLevels(null); update();
  }

  /* ───── 5. события ───── */
  box.querySelectorAll('.w33-tab').forEach(t=>t.onclick=()=>applyMode(t.dataset.m));
  $('.w33-new').onclick=()=>{ buildLevels(Date.now()); S.shown=0; update(); };
  rng.oninput=()=>{ S.qty=+rng.value; update(); };
  $('.w33-check').onclick=()=>{
    S.tries++; const b=BOOKS[S.mode], u=b.unit, thr=threshold(), fx=fill(S.qty);
    $('.w33-tries').textContent='попыток: '+S.tries;
    if(Math.abs(S.qty-thr)<b.step/2){
      S.done[S.mode]=thr; const nx=fill(thr+b.step);
      let msg='<b>Верно.</b> '+fmtQ(thr)+' '+u+' — граница: следующий шаг ('+fmtQ(thr+b.step)+') даёт уже '+nx.slipBps.toFixed(1)+' bps &gt; 10. Из '+fmtQ(fx.total)+' '+u+' в книге «бесплатно» проходит только '+fmtQ(thr)+'.';
      if(S.done.liquid!=null&&S.done.thin!=null) msg+='<br><b>Оба стакана пройдены:</b> ликвидный пропускает '+S.done.liquid+' BTC, тонкий — '+S.done.thin+' монет. Ликвидность — это не число на сайте, а то, что случится с ТВОИМ ордером.';
      verdictEl.className='w33-verdict ok'; verdictEl.innerHTML=msg;
    } else if(S.qty<thr){
      verdictEl.className='w33-verdict warn';
      verdictEl.textContent='Можно больше: при '+fmtQ(S.qty)+' '+u+' проскальзывание всего '+fx.slipBps.toFixed(1)+' bps. Порог выше — двигай ползунок и смотри, где средняя оторвётся от лучшей.';
    } else {
      verdictEl.className='w33-verdict warn';
      verdictEl.textContent='Перебор: '+fx.slipBps.toFixed(1)+' bps > 10. Уменьши объём — граница проходит на уровне, где следующий шаг уже съедает дорогую ступеньку.';
    }
  };
  $('.w33-save').onclick=()=>{
    const b=BOOKS[S.mode], fx=fill(S.qty);
    const txt='Урок 0.10 · '+b.label.toLowerCase()+' стакан ('+S.note+'): ордер '+fmtQ(S.qty)+' '+b.unit+' → лучшая '+fmtP(fx.best)+', средняя '+fmtP(fx.avg)+', проскальзывание '+fx.slipBps.toFixed(1)+' bps ($'+fx.slipUsd.toFixed(2)+'), комиссия $'+fx.feeUsd.toFixed(2)+', переплата за мгновение $'+fx.overpay.toFixed(2)
      +(fx.rest>1e-9?', не исполнено '+fmtQ(fx.rest):'')
      +(S.done.liquid!=null?' · порог ликвидного: '+S.done.liquid+' BTC':'')
      +(S.done.thin!=null?' · порог тонкого: '+S.done.thin+' монет':'');
    try{ localStorage.setItem('kn_artifact_p0_l10',txt); }catch(e){}
    box.dispatchEvent(new CustomEvent('widget:artifact',{bubbles:true,detail:{id:'widget_p0_l10',text:txt,data:{mode:S.mode,qty:S.qty,avg:fx.avg,slipBps:fx.slipBps,overpay:fx.overpay,thresholds:S.done}}}));
    $('.w33-art').textContent='✓ Записано в профиль: '+txt;
  };

  /* ───── 6. адаптив и старт ───── */
  const onResize=()=>{ size(); draw(); };
  if(typeof ResizeObserver!=='undefined'){ box._expRO=new ResizeObserver(onResize); box._expRO.observe(root); }
  else { box._expResize=onResize; window.addEventListener('resize',onResize); }
  size(); applyMode('liquid');
};
