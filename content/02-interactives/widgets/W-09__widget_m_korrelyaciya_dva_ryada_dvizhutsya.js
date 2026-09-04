/*
 * W-09 · widget_m_korrelyaciya_dva_ryada_dvizhutsya · М16/М37 «Корреляция»
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_korrelyaciya_dva_ryada_dvizhutsya'] = function(box){
  /* Цель:     почувствовать r телом: как выглядит облако и как «идут в ногу» два ряда при r от −1 до 1; и где Пирсон слепнет.
     Задание:  (1) двигай r и смотри, как облако схлопывается в линию; (2) в режиме «Угадай r» оцени 5 облаков на глаз; (3) нажми «Ловушка».
     Ага:      при |r|→1 облако = линия и ряды сливаются; при N=20 выборочный r прыгает на ±0.2; при y=x² связь идеальна, а r≈0.
     Дефолты:  r=0.70, N=150 точек, seed 42; ряды показаны как две «цены» (накопленные доходности); «новое облако» → seed из Date.now().
     Артефакт: «Угадай r: 5 раундов, средняя ошибка 0.12» либо «r задано 0.70 / в выборке 0.66 при N=150». */

  if(box._expClean) box._expClean();
  const timers=[]; let raf=null, ro=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); timers.push(t); return t; };
  const onResize=()=>drawAll();
  box._expClean=()=>{ timers.forEach(t=>{clearTimeout(t);clearInterval(t);}); if(raf)cancelAnimationFrame(raf); if(ro)ro.disconnect(); window.removeEventListener('resize',onResize); };
  box._expTimers=timers;

  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  let rng=mulberry32(42);
  const gauss=()=>{ let u=0; while(u===0)u=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rng()); };
  const css=(n,f)=>(getComputedStyle(box).getPropertyValue(n)||'').trim()||f;
  const C={txt:css('--txt','#eef1ff'),mut:css('--mut','#9aa3c7'),line:css('--line','rgba(154,163,199,.25)'),acc:css('--acc2','#06b6d4'),ok:css('--ok','#22c55e'),bad:css('--bad','#ef4444'),warn:css('--warn','#eab308')};
  const fit=(cv,h)=>{ const w=Math.max(260,cv.parentNode.clientWidth||300); const d=window.devicePixelRatio||1; cv.width=w*d; cv.height=h*d; cv.style.width=w+'px'; cv.style.height=h+'px'; const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); return {c,W:w,H:h}; };
  const pearson=(a,b)=>{ const n=a.length; let ma=0,mb=0; for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];} ma/=n; mb/=n; let sab=0,sa=0,sb=0; for(let i=0;i<n;i++){ const da=a[i]-ma,db=b[i]-mb; sab+=da*db; sa+=da*da; sb+=db*db; } return sab/Math.sqrt(sa*sb||1); };

  let r=0.70, N=150, X=[], Y=[], trap=false, mode='slider', hidden=0, revealed=false, g={rounds:0,err:0};

  box.innerHTML=`
  <style>
    .cr-w{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}
    .cr-w *{box-sizing:border-box}
    .cr-h b{font-size:15px}.cr-sub{display:block;color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
    .cr-tabs{display:flex;gap:6px;margin:12px 0 8px}
    .cr-tabs button{border:1px solid var(--line,rgba(154,163,199,.25));background:transparent;color:var(--mut,#9aa3c7);border-radius:8px;padding:5px 12px;cursor:pointer;font:inherit;font-size:13px}
    .cr-tabs button.on{color:var(--txt,#eef1ff);border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.1)}
    .cr-ctrl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-bottom:10px}
    .cr-ctrl label{display:flex;align-items:center;gap:6px;color:var(--mut,#9aa3c7);font-size:13px}
    .cr-ctrl input[type=range]{accent-color:var(--acc2,#06b6d4);width:150px}
    .cr-w button.b{border:1px solid var(--line,rgba(154,163,199,.25));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px}
    .cr-w button.pri{background:var(--acc2,#06b6d4);color:#041018;border-color:transparent;font-weight:600}
    .cr-w button.trap{border-color:var(--warn,#eab308);color:var(--warn,#eab308)}
    .cr-w button:disabled{opacity:.45;cursor:default}
    .cr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
    .cr-w canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02)}
    .cr-cap{font-size:12px;color:var(--mut,#9aa3c7);margin:0 0 6px}
    .cr-info{margin-top:10px;font-family:var(--mono,ui-monospace,monospace);font-size:13px}
    .cr-info b{color:var(--acc2,#06b6d4)}
    .cr-aha{margin-top:8px;padding:10px 12px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .cr-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
    .cr-art code{font-family:var(--mono,ui-monospace,monospace);color:var(--txt,#eef1ff);background:rgba(255,255,255,.05);padding:3px 6px;border-radius:6px}
  </style>
  <div class="cr-w">
    <div class="cr-h"><b>Корреляция: два ряда движутся вместе</b>
      <span class="cr-sub">Слева — облако точек (доходность актива A за день × доходность актива B за тот же день). Справа — те же данные как две «цены». Один и тот же r — две картинки.</span></div>
    <div class="cr-tabs"><button id="cr-t1" class="on">Слайдер r</button><button id="cr-t2">Угадай r</button></div>
    <div class="cr-ctrl">
      <label id="cr-rl">r = <b id="cr-rv">${r.toFixed(2)}</b><input type="range" id="cr-r" min="-1" max="1" step="0.05" value="${r}"></label>
      <label>точек N: <b id="cr-nv">${N}</b><input type="range" id="cr-n" min="20" max="500" step="10" value="${N}"></label>
      <button class="b" id="cr-new">⟲ Новое облако</button>
      <button class="b pri" id="cr-chk" style="display:none">Проверить</button>
      <button class="b trap" id="cr-trap">Ловушка: r≈0, а связь есть</button>
    </div>
    <div class="cr-grid">
      <div><div class="cr-cap">Облако: x = A, y = B (в единицах разброса)</div><canvas id="cr-sc"></canvas></div>
      <div><div class="cr-cap">Два ряда: накопленный результат A и B</div><canvas id="cr-ts"></canvas></div>
    </div>
    <div class="cr-info" id="cr-info"></div>
    <div class="cr-aha" id="cr-aha"></div>
    <div class="cr-art">Артефакт: <code id="cr-art">—</code></div>
  </div>`;
  const $=id=>box.querySelector('#'+id);
  const sc=$('cr-sc'), ts=$('cr-ts');

  function gen(){
    const rr=mode==='guess'?hidden:r; X=[]; Y=[];
    for(let i=0;i<N;i++){ const x=gauss(), e=gauss(); X.push(x); Y.push(trap?(x*x-1)/Math.SQRT2+0.25*e:rr*x+Math.sqrt(1-rr*rr)*e); }
  }
  function drawScatter(){
    const w=Math.max(260,sc.parentNode.clientWidth||300); const {c,W,H}=fit(sc,Math.min(w,360));
    c.clearRect(0,0,W,H); const L=3.2, pad=14; const sx=v=>pad+(v+L)/(2*L)*(W-2*pad), sy=v=>H-pad-(v+L)/(2*L)*(H-2*pad);
    c.strokeStyle=C.line; c.lineWidth=1; c.beginPath(); c.moveTo(sx(-L),sy(0)); c.lineTo(sx(L),sy(0)); c.moveTo(sx(0),sy(-L)); c.lineTo(sx(0),sy(L)); c.stroke();
    const show=(mode==='slider'||revealed)&&!trap, rr=mode==='guess'?hidden:r;
    if(show&&Math.abs(rr)>0.01){ c.save(); c.setLineDash([4,4]); c.strokeStyle=C.mut; c.beginPath(); c.moveTo(sx(-L),sy(-L*rr)); c.lineTo(sx(L),sy(L*rr)); c.stroke(); c.restore(); }
    c.fillStyle=C.acc; c.globalAlpha=0.7;
    for(let i=0;i<X.length;i++){ c.beginPath(); c.arc(sx(X[i]),sy(Y[i]),N>300?2:3,0,6.283); c.fill(); }
    c.globalAlpha=1; c.fillStyle=C.mut; c.font='11px system-ui'; c.textAlign='right'; c.fillText('A →',W-pad,sy(0)-4); c.textAlign='left'; c.fillText('B ↑',sx(0)+4,pad+10);
  }
  function drawSeries(){
    const {c,W,H}=fit(ts,Math.min(Math.max(260,ts.parentNode.clientWidth||300),360)); c.clearRect(0,0,W,H);
    const pad=14, a=[0], b=[0]; for(let i=0;i<X.length;i++){ a.push(a[i]+X[i]); b.push(b[i]+Y[i]); }
    const mn=Math.min(Math.min.apply(null,a),Math.min.apply(null,b)), mx=Math.max(Math.max.apply(null,a),Math.max.apply(null,b)), sp=(mx-mn)||1;
    const px=i=>pad+i/(a.length-1)*(W-2*pad), py=v=>H-pad-(v-mn)/sp*(H-2*pad);
    const line=(arr,col)=>{ c.strokeStyle=col; c.lineWidth=1.8; c.beginPath(); arr.forEach((v,i)=>{ i?c.lineTo(px(i),py(v)):c.moveTo(px(i),py(v)); }); c.stroke(); };
    c.strokeStyle=C.line; c.beginPath(); c.moveTo(pad,py(0)); c.lineTo(W-pad,py(0)); c.stroke();
    line(a,C.acc); line(b,C.warn);
    c.font='11px system-ui'; c.textAlign='left'; c.fillStyle=C.acc; c.fillText('— A',pad,pad+10); c.fillStyle=C.warn; c.fillText('— B',pad+34,pad+10);
    c.fillStyle=C.mut; c.textAlign='right'; c.fillText('день 1 … '+N,W-pad,H-3);
  }
  function info(){
    const smp=pearson(X,Y), rr=mode==='guess'?hidden:r; let t='', aha='', art='';
    if(trap){ t='в выборке r = <b>'+smp.toFixed(2)+'</b> при N='+N+' · связь: B = A² (идеальная!)'; aha='Ловушка: y полностью определяется x (парабола), а Пирсон показывает r≈0 — он измеряет только ЛИНЕЙНУЮ связь. «r≈0» не значит «связи нет»; смотри облако глазами, а не одну цифру. Нажми «Ловушка» ещё раз, чтобы вернуться.'; art='ловушка: связь B=A², r='+smp.toFixed(2); }
    else if(mode==='slider'){ t='задано r = <b>'+r.toFixed(2)+'</b> · в выборке r = <b>'+smp.toFixed(2)+'</b> при N='+N; art='r задано '+r.toFixed(2)+' / в выборке '+smp.toFixed(2)+' при N='+N;
      if(Math.abs(r)>=0.9) aha='|r| близко к 1: облако схлопнулось в линию, ряды идут в ногу — знаешь A, почти знаешь B. Но это всё ещё не причина и следствие (М38): оба могут тянуться за третьим фактором.';
      else if(Math.abs(r)<=0.15) aha='r около нуля: облако круглое, знать A для предсказания B бесполезно. Ряды справа расходятся кто куда.';
      else aha='Средняя корреляция: наклон виден, но разброс вокруг него большой — по A предсказать B можно лишь «примерно».'+(N<=50?' При N='+N+' выборочный r сильно гуляет: нажми «Новое облако» несколько раз и посмотри, как пляшет цифра при том же заданном r. Корреляция «на 20 точках» — почти всегда шум.':''); }
    else { if(!revealed){ t='скрытое r = ? · твоя оценка: <b>'+r.toFixed(2)+'</b> · N='+N; aha='Посмотри на облако и ряды, поставь оценку ползунком, нажми «Проверить».'; art=g.rounds?'Угадай r: '+g.rounds+' р., средняя ошибка '+(g.err/g.rounds).toFixed(2):'—'; }
      else { const e=Math.abs(r-hidden); t='истинное r = <b>'+hidden.toFixed(2)+'</b> · в выборке '+smp.toFixed(2)+' · твоя оценка '+r.toFixed(2)+' · ошибка <b>'+e.toFixed(2)+'</b>'; aha=(e<0.1?'Точно. ':e<0.25?'Близко. ':'Промах. ')+'Средняя ошибка за '+g.rounds+' р.: '+(g.err/g.rounds).toFixed(2)+'. Глаз хорошо отличает 0 от 0.9 и плохо — 0.3 от 0.6: именно в этой зоне люди «видят связь» там, где её мало. Нажми «Новое облако» для следующего.'; art='Угадай r: '+g.rounds+' р., средняя ошибка '+(g.err/g.rounds).toFixed(2); } }
    $('cr-info').innerHTML=t; $('cr-aha').textContent=aha; $('cr-art').textContent=art;
  }
  function drawAll(){ drawScatter(); drawSeries(); info(); }
  function setMode(m){ mode=m; $('cr-t1').className=m==='slider'?'on':''; $('cr-t2').className=m==='guess'?'on':''; trap=false; $('cr-chk').style.display=m==='guess'?'':'none'; $('cr-trap').style.display=m==='guess'?'none':''; $('cr-rl').firstChild.textContent=m==='guess'?'твоя оценка r = ':'r = '; if(m==='guess'){ newHidden(); } else { gen(); drawAll(); } }
  function newHidden(){ hidden=Math.round((rng()*2-1)*20)/20; if(Math.abs(hidden)>0.95)hidden=0.95*Math.sign(hidden); revealed=false; $('cr-chk').disabled=false; gen(); drawAll(); }

  $('cr-r').addEventListener('input',e=>{ r=+e.target.value; $('cr-rv').textContent=r.toFixed(2); if(mode==='slider'){ trap=false; gen(); } drawAll(); });
  $('cr-n').addEventListener('input',e=>{ N=+e.target.value; $('cr-nv').textContent=N; gen(); drawAll(); });
  $('cr-new').addEventListener('click',()=>{ rng=mulberry32(Date.now()); if(mode==='guess') newHidden(); else { gen(); drawAll(); } });
  $('cr-chk').addEventListener('click',()=>{ if(revealed) return; revealed=true; g.rounds++; g.err+=Math.abs(r-hidden); $('cr-chk').disabled=true; drawAll(); });
  $('cr-trap').addEventListener('click',()=>{ trap=!trap; gen(); drawAll(); });
  $('cr-t1').addEventListener('click',()=>setMode('slider')); $('cr-t2').addEventListener('click',()=>setMode('guess'));

  gen();
  if(window.ResizeObserver){ ro=new ResizeObserver(()=>drawAll()); ro.observe(box); } else window.addEventListener('resize',onResize);
  drawAll();
};
