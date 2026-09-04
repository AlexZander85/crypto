/*
 * W-10 · widget_m_regressiya_k_srednemu · М18/М46 «Регрессия к среднему»
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_regressiya_k_srednemu'] = function(box){
  /* Цель:     увидеть, почему топ прошлого года в следующем почти никогда не повторяется — без мистики, из-за доли удачи в результате.
     Задание:  найди золотые точки (топ-10 по году 1) и посмотри, куда они упали в году 2; наведи на точку; двигай ползунок «доля навыка» от 0 до 100%.
     Ага:      результат = навык + удача; отбор экстремумов набирает удачу, которая не повторяется; при навыке 100% диагональ и регрессия совпадают — лидеры повторяются, а в рынке так не бывает.
     Дефолты:  100 фондов, результат = 10% + 25%·z, доля навыка 30%, seed 42; «новый раунд» → seed из Date.now().
     Артефакт: «Навык 30%: топ-10 года 1 в среднем +52% → год 2 +22%; в топ-10 удержались 2 из 10». */

  if(box._expClean) box._expClean();
  const timers=[]; let raf=null, ro=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); timers.push(t); return t; };
  const onResize=()=>draw();
  box._expClean=()=>{ timers.forEach(t=>{clearTimeout(t);clearInterval(t);}); if(raf)cancelAnimationFrame(raf); if(ro)ro.disconnect(); window.removeEventListener('resize',onResize); };
  box._expTimers=timers;

  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  let rng=mulberry32(42);
  const gauss=()=>{ let u=0; while(u===0)u=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rng()); };
  const css=(n,f)=>(getComputedStyle(box).getPropertyValue(n)||'').trim()||f;
  const C={txt:css('--txt','#eef1ff'),mut:css('--mut','#9aa3c7'),line:css('--line','rgba(154,163,199,.25)'),acc:css('--acc2','#06b6d4'),ok:css('--ok','#22c55e'),bad:css('--bad','#ef4444'),warn:css('--warn','#eab308')};
  const fit=(cv,h)=>{ const w=Math.max(260,cv.parentNode.clientWidth||300); const d=window.devicePixelRatio||1; cv.width=w*d; cv.height=h*d; cv.style.width=w+'px'; cv.style.height=h+'px'; const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); return {c,W:w,H:h}; };
  const pct=z=>10+25*z, fp=v=>(v>0?'+':'')+Math.round(v)+'%';
  const pearson=(a,b)=>{ const n=a.length; let ma=0,mb=0; for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];} ma/=n; mb/=n; let sab=0,sa=0,sb=0; for(let i=0;i<n;i++){ const da=a[i]-ma,db=b[i]-mb; sab+=da*db; sa+=da*da; sb+=db*db; } return sab/Math.sqrt(sa*sb||1); };

  const M=100; let w=0.30, F=[], hover=-1, skill=[], luck1=[], luck2=[];

  box.innerHTML=`
  <style>
    .rm-w{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}
    .rm-w *{box-sizing:border-box}
    .rm-h b{font-size:15px}.rm-sub{display:block;color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
    .rm-ctrl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:12px 0}
    .rm-ctrl label{display:flex;align-items:center;gap:6px;color:var(--mut,#9aa3c7);font-size:13px}
    .rm-ctrl input[type=range]{accent-color:var(--acc2,#06b6d4);width:170px}
    .rm-w button{border:1px solid var(--line,rgba(154,163,199,.25));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px}
    .rm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:start}
    .rm-cvw{position:relative}
    .rm-w canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02);cursor:crosshair;touch-action:none}
    .rm-tip{position:absolute;pointer-events:none;background:#0b0f22;border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 8px;font-size:12px;font-family:var(--mono,ui-monospace,monospace);display:none;white-space:nowrap;z-index:2}
    .rm-stat{font-size:13px;display:grid;gap:6px}
    .rm-stat .k{color:var(--mut,#9aa3c7)}.rm-stat b{font-family:var(--mono,ui-monospace,monospace)}
    .rm-tbl{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:2px 8px;font-family:var(--mono,ui-monospace,monospace);font-size:12px;margin-top:8px}
    .rm-tbl span.h{color:var(--mut,#9aa3c7);font-family:inherit}
    .rm-tbl .g{color:var(--warn,#eab308)}.rm-tbl .dn{color:var(--bad,#ef4444)}.rm-tbl .up{color:var(--ok,#22c55e)}
    .rm-aha{margin-top:10px;padding:10px 12px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .rm-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
    .rm-art code{font-family:var(--mono,ui-monospace,monospace);color:var(--txt,#eef1ff);background:rgba(255,255,255,.05);padding:3px 6px;border-radius:6px}
  </style>
  <div class="rm-w">
    <div class="rm-h"><b>Регрессия к среднему: два сезона ста фондов</b>
      <span class="rm-sub">100 управляющих, у каждого свой постоянный навык и своя удача в каждом году. Результат года = навык + удача. По горизонтали — год 1, по вертикали — год 2.</span></div>
    <div class="rm-ctrl">
      <label>доля навыка в результате: <b id="rm-wv">${Math.round(w*100)}%</b><input type="range" id="rm-w" min="0" max="100" step="5" value="${Math.round(w*100)}"></label>
      <button id="rm-new">⟲ Новый раунд</button>
    </div>
    <div class="rm-grid">
      <div class="rm-cvw"><canvas id="rm-cv"></canvas><div class="rm-tip" id="rm-tip"></div></div>
      <div>
        <div class="rm-stat" id="rm-stat"></div>
        <div class="rm-tbl" id="rm-tbl"></div>
      </div>
    </div>
    <div class="rm-aha" id="rm-aha"></div>
    <div class="rm-art">Артефакт: <code id="rm-art">—</code></div>
  </div>`;
  const $=id=>box.querySelector('#'+id);
  const cv=$('rm-cv'), tip=$('rm-tip');

  function seedFunds(){ skill=[]; luck1=[]; luck2=[]; for(let i=0;i<M;i++){ skill.push(gauss()); luck1.push(gauss()); luck2.push(gauss()); } }
  function build(){
    const a=Math.sqrt(w), b=Math.sqrt(1-w); F=[];
    for(let i=0;i<M;i++) F.push({i,y1:pct(a*skill[i]+b*luck1[i]),y2:pct(a*skill[i]+b*luck2[i])});
    const o1=F.slice().sort((p,q)=>q.y1-p.y1), o2=F.slice().sort((p,q)=>q.y2-p.y2);
    o1.forEach((f,k)=>{f.r1=k+1;}); o2.forEach((f,k)=>{f.r2=k+1;});
  }
  const LO=-70,HI=90;
  function draw(){
    const wd=Math.max(260,cv.parentNode.clientWidth||300); const {c,W,H}=fit(cv,Math.min(wd,420)); c.clearRect(0,0,W,H);
    const pad=30, sx=v=>pad+(v-LO)/(HI-LO)*(W-pad-10), sy=v=>H-pad-(v-LO)/(HI-LO)*(H-pad-10);
    c.strokeStyle=C.line; c.lineWidth=1; c.font='11px system-ui'; c.fillStyle=C.mut;
    for(let v=-50;v<=HI;v+=50){ c.beginPath(); c.moveTo(sx(v),sy(LO)); c.lineTo(sx(v),sy(HI)); c.stroke(); c.beginPath(); c.moveTo(sx(LO),sy(v)); c.lineTo(sx(HI),sy(v)); c.stroke(); c.textAlign='center'; c.fillText(fp(v),sx(v),H-pad+14); c.textAlign='right'; c.fillText(fp(v),pad-4,sy(v)+4); }
    c.textAlign='left'; c.fillText('год 1 →',sx(LO)+4,H-6); c.save(); c.translate(10,sy(HI)+40); c.rotate(-Math.PI/2); c.fillText('год 2 →',0,0); c.restore();
    // диагональ «если бы всё повторялось»
    c.save(); c.setLineDash([5,5]); c.strokeStyle=C.mut; c.beginPath(); c.moveTo(sx(LO),sy(LO)); c.lineTo(sx(HI),sy(HI)); c.stroke(); c.restore();
    c.fillStyle=C.mut; c.textAlign='right'; c.fillText('«повтор прошлого года»',sx(HI)-4,sy(HI)+12);
    // регрессия: y2 = 10 + w·(y1−10)
    c.strokeStyle=C.acc; c.lineWidth=2; c.beginPath(); c.moveTo(sx(LO),sy(10+w*(LO-10))); c.lineTo(sx(HI),sy(10+w*(HI-10))); c.stroke();
    c.fillStyle=C.acc; c.textAlign='right'; c.fillText('что происходит на деле (наклон = '+w.toFixed(2)+')',sx(HI)-4,sy(10+w*(HI-10))-6);
    // точки
    F.forEach(f=>{ const top=f.r1<=10, hv=f.i===hover; c.beginPath(); c.arc(sx(f.y1),sy(f.y2),hv?6:top?4.5:2.8,0,6.283); c.fillStyle=top?C.warn:'rgba(154,163,199,.55)'; if(hv){ c.fillStyle=C.txt; } c.fill(); if(top){ c.strokeStyle=C.warn; c.lineWidth=1; c.stroke(); } });
    // траектория наведённой точки: ожидание (диагональ) → факт
    if(hover>=0){ const f=F[hover]; const x=sx(f.y1), ya=sy(f.y1), yb=sy(f.y2); c.strokeStyle=f.y2<f.y1?C.bad:C.ok; c.lineWidth=2; c.beginPath(); c.moveTo(x,ya); c.lineTo(x,yb); c.stroke(); c.beginPath(); c.arc(x,ya,3,0,6.283); c.fillStyle=C.mut; c.fill(); const d=yb>ya?1:-1; c.beginPath(); c.moveTo(x,yb); c.lineTo(x-5,yb-6*d); c.lineTo(x+5,yb-6*d); c.closePath(); c.fillStyle=c.strokeStyle; c.fill(); }
  }
  function stats(){
    const top=F.filter(f=>f.r1<=10), bot=F.filter(f=>f.r1>M-10), avg=(a,k)=>a.reduce((s,f)=>s+f[k],0)/a.length;
    const t1=avg(top,'y1'), t2=avg(top,'y2'), b1=avg(bot,'y1'), b2=avg(bot,'y2'), stay=top.filter(f=>f.r2<=10).length, below=top.filter(f=>f.r2>50).length, corr=pearson(F.map(f=>f.y1),F.map(f=>f.y2));
    $('rm-stat').innerHTML=
      '<div><span class="k">Топ-10 по году 1:</span> год 1 <b>'+fp(t1)+'</b> → год 2 <b>'+fp(t2)+'</b></div>'+
      '<div><span class="k">Из них удержались в топ-10:</span> <b>'+stay+' из 10</b> · оказались ниже медианы: <b>'+below+'</b></div>'+
      '<div><span class="k">Худшие 10 по году 1:</span> год 1 <b>'+fp(b1)+'</b> → год 2 <b>'+fp(b2)+'</b> (подтянулись к среднему с другой стороны)</div>'+
      '<div><span class="k">Корреляция год 1 ↔ год 2:</span> <b>'+corr.toFixed(2)+'</b> ≈ доля навыка '+w.toFixed(2)+'</div>';
    const tb=$('rm-tbl'); tb.innerHTML='<span class="h">место</span><span class="h">год 1</span><span class="h">год 2</span><span class="h">место г.2</span>'+
      top.sort((p,q)=>p.r1-q.r1).map(f=>'<span class="g">#'+f.r1+'</span><span>'+fp(f.y1)+'</span><span class="'+(f.y2<f.y1?'dn':'up')+'">'+fp(f.y2)+'</span><span class="'+(f.r2<=10?'up':'dn')+'">#'+f.r2+'</span>').join('');
    let aha;
    if(w>=0.999) aha='Навык 100%: удачи нет, диагональ и регрессия совпали — лидеры повторяются год за годом. В реальном рынке так не бывает: часть любого результата — погода, которая не повторяется по заказу.';
    else if(w<=0.001) aha='Навыка нет вовсе: год 2 не зависит от года 1, регрессия горизонтальна. Весь «топ» года 1 был лотереей, и в году 2 он раскидан по всей шкале — как и любые другие 10 фондов.';
    else aha='Топ-10 потерял в среднем '+Math.round((1-(t2-10)/(t1-10||1))*100)+'% своего отрыва от среднего — не потому что «расслабились», а потому что при отборе экстремумов ты набираешь фонды, которым в году 1 повезло; удача в году 2 не переносится. То же в другую сторону: худшие подтянулись. Вывод для оператора: не увольняй систему за худший квартал и не удваивай риск за лучший (П3, П34).';
    $('rm-aha').textContent=aha;
    $('rm-art').textContent='Навык '+Math.round(w*100)+'%: топ-10 года 1 в среднем '+fp(t1)+' → год 2 '+fp(t2)+'; в топ-10 удержались '+stay+' из 10; корреляция лет '+corr.toFixed(2);
  }
  function refresh(){ build(); draw(); stats(); }

  function locate(ev){ const r=cv.getBoundingClientRect(), W=r.width, H=r.height, pad=30; const px=(ev.clientX-r.left), py=(ev.clientY-r.top); const sx=v=>pad+(v-LO)/(HI-LO)*(W-pad-10), sy=v=>H-pad-(v-LO)/(HI-LO)*(H-pad-10); let best=-1,bd=14*14; F.forEach(f=>{ const dx=sx(f.y1)-px, dy=sy(f.y2)-py, d=dx*dx+dy*dy; if(d<bd){bd=d;best=f.i;} }); return {best,px,py}; }
  function onMove(ev){ const p=ev.touches?ev.touches[0]:ev; const {best,px,py}=locate(p); if(best!==hover){ hover=best; draw(); }
    if(best>=0){ const f=F[best]; tip.style.display='block'; tip.innerHTML='фонд #'+(f.i+1)+'<br>год 1: '+fp(f.y1)+' (место '+f.r1+')<br>год 2: '+fp(f.y2)+' (место '+f.r2+')'; const r=cv.getBoundingClientRect(); tip.style.left=Math.min(px+12,r.width-150)+'px'; tip.style.top=Math.max(0,py-52)+'px'; } else tip.style.display='none'; }
  cv.addEventListener('mousemove',onMove); cv.addEventListener('touchstart',e=>{onMove(e);},{passive:true}); cv.addEventListener('touchmove',e=>{onMove(e);},{passive:true});
  cv.addEventListener('mouseleave',()=>{ hover=-1; tip.style.display='none'; draw(); });

  $('rm-w').addEventListener('input',e=>{ w=+e.target.value/100; $('rm-wv').textContent=Math.round(w*100)+'%'; hover=-1; tip.style.display='none'; refresh(); });
  $('rm-new').addEventListener('click',()=>{ rng=mulberry32(Date.now()); seedFunds(); hover=-1; refresh(); });

  seedFunds();
  if(window.ResizeObserver){ ro=new ResizeObserver(()=>draw()); ro.observe(box); } else window.addEventListener('resize',onResize);
  refresh();
};
