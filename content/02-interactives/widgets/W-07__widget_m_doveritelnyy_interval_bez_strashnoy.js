/*
 * W-07 · widget_m_doveritelnyy_interval_bez_strashnoy · М17 «Доверительный интервал»
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_doveritelnyy_interval_bez_strashnoy'] = function(box){
  /* Цель:     увидеть, что «95%» — доля интервалов, накрывающих истину на длинной серии, а не вероятность для одного интервала.
     Задание:  прогони 30 выборок при n=30 и доверии 95%; найди красные полоски; включи «спрятать μ» и попробуй угадать, какие промахнулись.
     Ага:      красная полоска ничем не отличается от зелёных — промах виден только тому, кто знает μ; больше n → уже интервалы, но доля промахов та же.
     Дефолты:  μ=+0.40% на сделку, σ=3.0%, n=30, доверие 95%, 30 выборок за раунд, seed 42; «новый раунд» → seed из Date.now().
     Артефакт: «Накрыли 28/30 (93%) при n=30, доверие 95% · накоплено 284/300 = 94.7%» — строка в журнал. */

  // 0. чистим прошлый запуск
  if(box._expClean) box._expClean();
  const timers=[]; let raf=null, ro=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); timers.push(t); return t; };
  const onResize=()=>draw();
  box._expClean=()=>{ timers.forEach(t=>{clearTimeout(t);clearInterval(t);}); if(raf)cancelAnimationFrame(raf); if(ro)ro.disconnect(); window.removeEventListener('resize',onResize); };
  box._expTimers=timers;

  // 1. утилиты
  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  let rng=mulberry32(42);
  const gauss=()=>{ let u=0; while(u===0)u=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rng()); };
  const css=(n,f)=>(getComputedStyle(box).getPropertyValue(n)||'').trim()||f;
  const C={txt:css('--txt','#eef1ff'),mut:css('--mut','#9aa3c7'),line:css('--line','rgba(154,163,199,.25)'),acc:css('--acc2','#06b6d4'),ok:css('--ok','#22c55e'),bad:css('--bad','#ef4444'),warn:css('--warn','#eab308')};
  const Z={80:1.2816,90:1.6449,95:1.96,99:2.5758};
  const tq=(z,nu)=>z+(z*z*z+z)/(4*nu)+(5*Math.pow(z,5)+16*z*z*z+3*z)/(96*nu*nu); // квантиль Стьюдента (аппроксимация)
  const niceStep=x=>{ const p=Math.pow(10,Math.floor(Math.log10(x))); const f=x/p; return (f<1.5?1:f<3.5?2:f<7.5?5:10)*p; };
  const fit=(cv,h)=>{ const w=Math.max(280,cv.parentNode.clientWidth||320); const d=window.devicePixelRatio||1; cv.width=w*d; cv.height=h*d; cv.style.width=w+'px'; cv.style.height=h+'px'; const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); return {c,W:w,H:h}; };

  // 2. канон
  const MU=0.40, SIG=3.0, K=30, ROWH=12;
  let n=30, conf=95, bars=[], shown=0, hideMu=false, running=false, acc={hit:0,tot:0}, rounds=0, lastHit=null;

  // 3. разметка
  box.innerHTML=`
  <style>
    .ci-w{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:100%;box-sizing:border-box}
    .ci-w *{box-sizing:border-box}
    .ci-h b{font-size:15px}.ci-sub{display:block;color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
    .ci-ctrl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:12px 0}
    .ci-ctrl label{display:flex;align-items:center;gap:6px;color:var(--mut,#9aa3c7);font-size:13px}
    .ci-ctrl input[type=range]{accent-color:var(--acc2,#06b6d4);width:130px}
    .ci-ctrl select{background:#0b0f22;color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:4px 6px}
    .ci-w button{border:1px solid var(--line,rgba(154,163,199,.25));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px;transition:background .15s}
    .ci-w button.pri{background:var(--acc2,#06b6d4);color:#041018;border-color:transparent;font-weight:600}
    .ci-w button:disabled{opacity:.45;cursor:default}
    .ci-w canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02)}
    .ci-stat{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:10px;font-family:var(--mono,ui-monospace,monospace);font-size:13px}
    .ci-stat b{color:var(--acc2,#06b6d4)}
    .ci-aha{margin-top:10px;padding:10px 12px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px;min-height:20px;transition:opacity .3s}
    .ci-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7);display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .ci-art code{font-family:var(--mono,ui-monospace,monospace);color:var(--txt,#eef1ff);background:rgba(255,255,255,.05);padding:3px 6px;border-radius:6px}
  </style>
  <div class="ci-w">
    <div class="ci-h"><b>30 выборок из одной генеральной: кто накрыл истину?</b>
      <span class="ci-sub">Генеральная совокупность — сделки стратегии со средней μ = +${MU.toFixed(2)}% и разбросом σ = ${SIG.toFixed(1)}%. Каждая полоска — доверительный интервал одной выборки.</span></div>
    <div class="ci-ctrl">
      <label>n сделок в выборке: <b id="ci-nv">${n}</b><input type="range" id="ci-n" min="5" max="200" step="5" value="${n}"></label>
      <label>доверие <select id="ci-c"><option>80</option><option>90</option><option selected>95</option><option>99</option></select> %</label>
      <button class="pri" id="ci-run">▶ Прогнать 30 выборок</button>
      <button id="ci-new">⟲ Новый раунд</button>
      <label><input type="checkbox" id="ci-hide"> спрятать μ</label>
    </div>
    <canvas id="ci-cv"></canvas>
    <div class="ci-stat"><span id="ci-cnt">Накрыли: —/${K}</span><span id="ci-exp"></span><span id="ci-acc">накоплено за раунды: 0/0</span></div>
    <div class="ci-aha" id="ci-aha">Нажми «Прогнать» — увидишь, сколько из 30 интервалов накроют μ при доверии ${conf}%.</div>
    <div class="ci-art">Артефакт: <code id="ci-art">—</code><button id="ci-copy">копировать</button></div>
  </div>`;

  const $=id=>box.querySelector('#'+id);
  const cv=$('ci-cv');

  // 4. данные
  function makeBars(){
    bars=[]; const zc=tq(Z[conf],n-1);
    for(let i=0;i<K;i++){
      let s=0,s2=0; for(let j=0;j<n;j++){ const x=MU+SIG*gauss(); s+=x; s2+=x*x; }
      const m=s/n, sd=Math.sqrt(Math.max(0,(s2-n*m*m)/(n-1))), half=zc*sd/Math.sqrt(n);
      bars.push({m,lo:m-half,hi:m+half,hit:(m-half<=MU&&MU<=m+half)});
    }
  }

  // 5. сцена
  function draw(){
    const {c,W,H}=fit(cv,ROWH*K+58);
    c.clearRect(0,0,W,H);
    const padL=14,padR=52,top=36,bottom=26;
    const se=SIG/Math.sqrt(n), half=tq(Z[conf],n-1)*se, R=(half+2.8*se)*1.05;
    const x0=MU-R,x1=MU+R, sx=v=>padL+(v-x0)/(x1-x0)*(W-padL-padR);
    const yAx=H-bottom+6;
    c.font='11px system-ui,sans-serif'; c.fillStyle=C.mut; c.textAlign='left';
    c.fillText('средняя доходность на сделку по выборке из '+n+' сделок, доверие '+conf+'%',padL,12);
    c.strokeStyle=C.line; c.lineWidth=1; c.beginPath(); c.moveTo(padL,yAx-6); c.lineTo(W-padR,yAx-6); c.stroke();
    const step=niceStep(2*R/5); c.textAlign='center';
    for(let v=Math.ceil(x0/step)*step; v<=x1+1e-9; v+=step){ const X=sx(v); c.fillText((v>0?'+':'')+v.toFixed(step<1?1:0)+'%',X,yAx+8); c.beginPath(); c.moveTo(X,yAx-9); c.lineTo(X,yAx-3); c.stroke(); }
    if(!hideMu){ const X=sx(MU); c.save(); c.strokeStyle=C.acc; c.shadowColor=C.acc; c.shadowBlur=10; c.lineWidth=2; c.beginPath(); c.moveTo(X,top-8); c.lineTo(X,yAx-6); c.stroke(); c.restore(); c.fillStyle=C.acc; c.textAlign='center'; c.fillText('μ = +'+MU.toFixed(2)+'% (истина)',X,top-12); }
    for(let i=0;i<shown;i++){
      const b=bars[i], y=top+i*ROWH+ROWH/2, col=hideMu?C.acc:(b.hit?C.ok:C.bad);
      c.globalAlpha=hideMu?0.75:1; c.strokeStyle=col; c.lineWidth=2;
      c.beginPath(); c.moveTo(sx(b.lo),y); c.lineTo(sx(b.hi),y); c.moveTo(sx(b.lo),y-3); c.lineTo(sx(b.lo),y+3); c.moveTo(sx(b.hi),y-3); c.lineTo(sx(b.hi),y+3); c.stroke();
      c.fillStyle=col; c.beginPath(); c.arc(sx(b.m),y,2.6,0,6.283); c.fill(); c.globalAlpha=1;
      if(!hideMu&&!b.hit){ c.fillStyle=C.bad; c.textAlign='left'; c.font='bold 11px system-ui'; c.fillText('✗ мимо',W-padR+6,y+4); c.font='11px system-ui'; }
    }
  }

  // 6. статистика и «ага»
  function expectText(){ const e=K*conf/100; $('ci-exp').textContent='ожидание при '+conf+'%: ≈'+Math.floor(e)+'–'+Math.ceil(e)+' из '+K; }
  function finish(){
    const hit=bars.filter(b=>b.hit).length; lastHit=hit; acc.hit+=hit; acc.tot+=K; rounds++;
    const pct=Math.round(hit/K*100), apct=(acc.hit/acc.tot*100).toFixed(1);
    $('ci-cnt').innerHTML='Накрыли: <b>'+hit+'/'+K+'</b> ('+pct+'%)';
    $('ci-acc').innerHTML='накоплено за '+rounds+' р.: <b>'+acc.hit+'/'+acc.tot+' = '+apct+'%</b> → сходится к '+conf+'%';
    const miss=bars.map((b,i)=>b.hit?-1:i+1).filter(i=>i>0);
    let aha;
    if(hideMu) aha='μ спрятана. Какие полоски промахнулись? Попробуй угадать — а потом сними галочку. Спойлер: по виду интервала промах не определить, поэтому «95%» относится к методу, а не к твоему конкретному интервалу.';
    else if(miss.length===0) aha='В этот раз все '+K+' накрыли. При доверии '+conf+'% так бывает примерно в '+Math.round(Math.pow(conf/100,K)*100)+'% раундов — это не значит, что метод стал точнее. Нажми ещё раз.';
    else aha='Промахнулись полоски №'+miss.join(', ')+'. Посмотри на них: ширина и форма — как у соседних зелёных. Единственное, что делает их красными, — знание μ, которого в реальной торговле у тебя нет. Поэтому «'+conf+'%» — доля удач метода на длинной серии, а не гарантия для одного интервала.'+(n>=100?' Заметь: при n='+n+' интервалы стали узкими, но доля промахов не изменилась.':'');
    $('ci-aha').textContent=aha;
    $('ci-art').textContent='Накрыли '+hit+'/'+K+' ('+pct+'%) при n='+n+', доверие '+conf+'% · накоплено '+acc.hit+'/'+acc.tot+' = '+apct+'%';
  }
  function run(){
    if(running) return; running=true; $('ci-run').disabled=true; $('ci-new').disabled=true;
    makeBars(); shown=0; draw(); $('ci-cnt').textContent='Накрыли: …';
    const t=later(()=>{ shown++; draw(); if(shown>=K){ clearInterval(t); running=false; $('ci-run').disabled=false; $('ci-new').disabled=false; finish(); } },45,true);
  }

  // 7. события
  $('ci-n').addEventListener('input',e=>{ n=+e.target.value; $('ci-nv').textContent=n; shown=0; bars=[]; draw(); expectText(); });
  $('ci-c').addEventListener('change',e=>{ conf=+e.target.value; shown=0; bars=[]; draw(); expectText(); $('ci-aha').textContent='Доверие '+conf+'%: интервалы станут '+(conf>95?'шире':'уже')+', а доля промахов — ≈'+(100-conf)+'%. Проверь.'; });
  $('ci-hide').addEventListener('change',e=>{ hideMu=e.target.checked; draw(); if(!hideMu&&lastHit!==null) finish(); });
  $('ci-run').addEventListener('click',run);
  $('ci-new').addEventListener('click',()=>{ rng=mulberry32(Date.now()); acc={hit:0,tot:0}; rounds=0; lastHit=null; shown=0; bars=[]; draw(); $('ci-cnt').textContent='Накрыли: —/'+K; $('ci-acc').textContent='накоплено за раунды: 0/0'; $('ci-aha').textContent='Новый раунд (новый seed). Прогони и сравни с прошлым.'; $('ci-art').textContent='—'; });
  $('ci-copy').addEventListener('click',()=>{ const s=$('ci-art').textContent; try{ if(navigator.clipboard) navigator.clipboard.writeText(s); }catch(e){} $('ci-copy').textContent='✓ скопировано'; later(()=>{$('ci-copy').textContent='копировать';},1200); });

  if(window.ResizeObserver){ ro=new ResizeObserver(()=>draw()); ro.observe(box); } else window.addEventListener('resize',onResize);
  expectText(); draw();
};
