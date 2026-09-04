/*
 * W-08 · widget_m_p_value_chto_eto · М11 «p-value»
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_p_value_chto_eto'] = function(box){
  /* Цель:     увидеть, откуда берутся «статистически значимые» результаты там, где эффекта нет вообще.
     Задание:  прогони 100 честных стратегий (все — монетки без эджа) при α=0.05, посчитай «открытия», потом нажми «Продать курс».
     Ага:      ≈5 из 100 пустышек получают p<0.05 — не из-за эджа, а по определению порога; лучшая из них неотличима от «грааля».
     Дефолты:  100 стратегий, n=100 сделок у каждой, p(выигрыш)=0.5, α=0.05, seed 42; «новый раунд» → seed из Date.now().
     Артефакт: «Открытий 6/100 при α=0.05, n=100 (ожидалось ≈5) · накоплено 47/1000 = 4.7%» — строка в журнал. */

  if(box._expClean) box._expClean();
  const timers=[]; let raf=null, ro=null;
  const later=(fn,ms,rep)=>{ const t=rep?setInterval(fn,ms):setTimeout(fn,ms); timers.push(t); return t; };
  const onResize=()=>drawAll();
  box._expClean=()=>{ timers.forEach(t=>{clearTimeout(t);clearInterval(t);}); if(raf)cancelAnimationFrame(raf); if(ro)ro.disconnect(); window.removeEventListener('resize',onResize); };
  box._expTimers=timers;

  const mulberry32=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  let rng=mulberry32(42);
  const css=(n,f)=>(getComputedStyle(box).getPropertyValue(n)||'').trim()||f;
  const C={txt:css('--txt','#eef1ff'),mut:css('--mut','#9aa3c7'),line:css('--line','rgba(154,163,199,.25)'),acc:css('--acc2','#06b6d4'),ok:css('--ok','#22c55e'),bad:css('--bad','#ef4444'),warn:css('--warn','#eab308')};
  const erf=x=>{ const s=x<0?-1:1; x=Math.abs(x); const t=1/(1+0.3275911*x); const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return s*y; };
  const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
  const fit=(cv,h)=>{ const w=Math.max(280,cv.parentNode.clientWidth||320); const d=window.devicePixelRatio||1; cv.width=w*d; cv.height=h*d; cv.style.width=w+'px'; cv.style.height=h+'px'; const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); return {c,W:w,H:h}; };

  const M=100, COLS=10;
  let n=100, alpha=0.05, S=[], shown=0, running=false, acc={f:0,t:0}, rounds=0, pulse=0, selected=-1;

  box.innerHTML=`
  <style>
    .pf-w{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}
    .pf-w *{box-sizing:border-box}
    .pf-h b{font-size:15px}.pf-sub{display:block;color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
    .pf-ctrl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:12px 0}
    .pf-ctrl label{display:flex;align-items:center;gap:6px;color:var(--mut,#9aa3c7);font-size:13px}
    .pf-ctrl input[type=range]{accent-color:var(--acc2,#06b6d4);width:130px}
    .pf-ctrl select{background:#0b0f22;color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:4px 6px}
    .pf-w button{border:1px solid var(--line,rgba(154,163,199,.25));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px}
    .pf-w button.pri{background:var(--acc2,#06b6d4);color:#041018;border-color:transparent;font-weight:600}
    .pf-w button.sell{border-color:var(--warn,#eab308);color:var(--warn,#eab308)}
    .pf-w button:disabled{opacity:.45;cursor:default}
    .pf-w canvas{display:block;width:100%;border-radius:8px;background:rgba(255,255,255,.02)}
    .pf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:start}
    .pf-cap{font-size:12px;color:var(--mut,#9aa3c7);margin:4px 0 6px}
    .pf-stat{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:10px;font-family:var(--mono,ui-monospace,monospace);font-size:13px}
    .pf-stat b{color:var(--bad,#ef4444)}
    .pf-card{margin-top:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--line,rgba(154,163,199,.25));font-size:13px;min-height:44px}
    .pf-card.ad{border-color:var(--warn,#eab308);background:rgba(234,179,8,.08)}
    .pf-card .truth{display:block;margin-top:6px;color:var(--ok,#22c55e)}
    .pf-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7);display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .pf-art code{font-family:var(--mono,ui-monospace,monospace);color:var(--txt,#eef1ff);background:rgba(255,255,255,.05);padding:3px 6px;border-radius:6px}
  </style>
  <div class="pf-w">
    <div class="pf-h"><b>Фабрика сигналов: 100 стратегий без эджа</b>
      <span class="pf-sub">У всех 100 стратегий вероятность прибыльной сделки ровно 50% — это честные монетки (нулевая гипотеза верна везде). Проверим каждую тестом «отличается ли доля побед от 50%».</span></div>
    <div class="pf-ctrl">
      <label>сделок у каждой: <b id="pf-nv">${n}</b><input type="range" id="pf-n" min="20" max="500" step="20" value="${n}"></label>
      <label>порог α <select id="pf-a"><option value="0.01">0.01</option><option value="0.05" selected>0.05</option><option value="0.10">0.10</option></select></label>
      <button class="pri" id="pf-run">▶ Прогнать всех</button>
      <button id="pf-new">⟲ Новый раунд</button>
      <button class="sell" id="pf-sell" disabled>💰 Продать курс</button>
    </div>
    <div class="pf-grid">
      <div><div class="pf-cap">Сетка стратегий: красные — p &lt; α («открытие»). Кликни по ячейке.</div><canvas id="pf-cv"></canvas></div>
      <div><div class="pf-cap">Распределение p-value по 100 стратегиям (при нулевой гипотезе — равномерное)</div><canvas id="pf-h"></canvas>
        <div class="pf-stat"><span id="pf-cnt">Открытий: —/100</span><span id="pf-exp">ожидалось ≈${Math.round(M*alpha)}</span><span id="pf-acc">накоплено: 0/0</span></div></div>
    </div>
    <div class="pf-card" id="pf-card">Все 100 стратегий одинаково пусты. После прогона выбери любую красную — и попробуй объяснить, чем она хуже «настоящего грааля».</div>
    <div class="pf-art">Артефакт: <code id="pf-art">—</code><button id="pf-copy">копировать</button></div>
  </div>`;

  const $=id=>box.querySelector('#'+id);
  const cv=$('pf-cv'), hv=$('pf-h');

  function make(){
    S=[]; for(let i=0;i<M;i++){ let k=0; for(let j=0;j<n;j++) if(rng()<0.5)k++;
      let z=(Math.abs(k-n/2)-0.5)/Math.sqrt(n/4); if(z<0)z=0; const pv=Math.min(1,2*(1-Phi(z)));
      S.push({id:i+1,k,pv,wr:k/n}); }
  }
  function drawGrid(){
    const {c,W}=fit(cv,cv.parentNode.clientWidth?Math.max(280,cv.parentNode.clientWidth):320);
    const pad=6, cw=(W-2*pad)/COLS; fit(cv,Math.round(cw*COLS+2*pad));
    const ctx=cv.getContext('2d'); ctx.clearRect(0,0,W,W);
    for(let i=0;i<M;i++){
      const x=pad+(i%COLS)*cw, y=pad+Math.floor(i/COLS)*cw, s=S[i], on=i<shown, disc=on&&s.pv<alpha;
      ctx.beginPath(); rr(ctx,x+2,y+2,cw-4,cw-4,6);
      if(!on){ ctx.fillStyle='rgba(255,255,255,.035)'; ctx.fill(); }
      else if(disc){ ctx.fillStyle='rgba(239,68,68,'+(0.25+0.15*Math.sin(pulse))+')'; ctx.fill(); ctx.strokeStyle=C.bad; ctx.lineWidth=i===selected?2.5:1.5; ctx.stroke(); }
      else { ctx.fillStyle='rgba(154,163,199,.08)'; ctx.fill(); if(i===selected){ ctx.strokeStyle=C.acc; ctx.lineWidth=2; ctx.stroke(); } }
      ctx.fillStyle=on?(disc?C.txt:C.mut):'rgba(154,163,199,.4)'; ctx.textAlign='center';
      ctx.font=(cw<40?'9px':'11px')+' system-ui,sans-serif'; ctx.fillText('№'+(i+1),x+cw/2,y+cw/2+(cw<44?3:-2));
      if(on&&cw>=44){ ctx.font='bold 11px var(--mono,monospace)'; ctx.fillStyle=disc?C.bad:C.mut; ctx.fillText(Math.round(s.wr*100)+'%',x+cw/2,y+cw/2+12); }
    }
  }
  function rr(c,x,y,w,h,r){ c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function drawHist(){
    const {c,W,H}=fit(hv,120); c.clearRect(0,0,W,H);
    const padL=8,padR=8,top=8,bottom=22, bins=new Array(10).fill(0);
    for(let i=0;i<shown;i++) bins[Math.min(9,Math.floor(S[i].pv*10))]++;
    const mx=Math.max(20,Math.max.apply(null,bins)), bw=(W-padL-padR)/10;
    c.fillStyle='rgba(239,68,68,.12)'; c.fillRect(padL,top,alpha*10*bw,H-top-bottom);
    for(let b=0;b<10;b++){ const h=bins[b]/mx*(H-top-bottom); c.fillStyle=b*0.1<alpha?C.bad:'rgba(154,163,199,.55)'; c.fillRect(padL+b*bw+2,H-bottom-h,bw-4,h); }
    c.strokeStyle=C.line; c.beginPath(); c.moveTo(padL,H-bottom); c.lineTo(W-padR,H-bottom); c.stroke();
    c.fillStyle=C.mut; c.font='11px system-ui'; c.textAlign='left'; c.fillText('0',padL,H-6); c.textAlign='right'; c.fillText('1.0',W-padR,H-6);
    c.textAlign='left'; c.fillStyle=C.bad; c.fillText('α='+alpha,padL+alpha*10*bw+4,top+11);
    c.fillStyle=C.mut; c.textAlign='center'; c.fillText('ожидание при H₀: по ~10 в каждом столбце',W/2,H-6);
  }
  function drawAll(){ drawGrid(); drawHist(); }

  function card(i,ad){
    const s=S[i], el=$('pf-card'); el.className='pf-card'+(ad?' ad':'');
    const sig=s.pv<alpha;
    if(ad) el.innerHTML='🔥 <b>Стратегия №'+s.id+'</b>: '+s.k+' из '+n+' сделок в плюс — <b>'+Math.round(s.wr*100)+'% winrate</b>, p = '+s.pv.toFixed(3)+' — «статистически доказано»! Всего 9 990 ₽/мес.<span class="truth">Правда: это честная монетка. Эдж = 0. Из 100 пустышек такая находится почти всегда — а выглядит ровно как настоящая. Отсюда правило курса: одна проверка ≠ доказательство; спроси, сколько всего было проверок (М36).</span>';
    else el.innerHTML='<b>Стратегия №'+s.id+'</b>: '+s.k+' из '+n+' в плюс ('+Math.round(s.wr*100)+'%), p = '+s.pv.toFixed(3)+' → '+(sig?'<span style="color:var(--bad,#ef4444)">«открытие» при α='+alpha+'</span>':'ничего особенного при α='+alpha)+'. Реальный эдж — 0, как и у остальных 99. p-value отвечает не «есть ли эффект», а «насколько такой результат необычен, если эффекта нет».';
  }
  function finish(){
    const f=S.filter(s=>s.pv<alpha).length; acc.f+=f; acc.t+=M; rounds++;
    $('pf-cnt').innerHTML='Открытий: <b>'+f+'/'+M+'</b>'; $('pf-exp').textContent='ожидалось ≈'+Math.round(M*alpha);
    $('pf-acc').textContent='накоплено за '+rounds+' р.: '+acc.f+'/'+acc.t+' = '+(acc.f/acc.t*100).toFixed(1)+'% → сходится к '+(alpha*100)+'%';
    $('pf-sell').disabled=f===0;
    $('pf-card').className='pf-card'; $('pf-card').innerHTML=f===0?'В этот раз — ноль «открытий». Так бывает (≈'+Math.round(Math.pow(1-alpha,M)*100)+'% раундов при α='+alpha+'). Нажми ещё раз.':'<b>'+f+' «значимых» стратегий из 100 пустых.</b> Ни у одной нет эджа — они получили p &lt; '+alpha+' просто потому, что порог '+alpha+' и означает «'+Math.round(alpha*100)+' ложных тревог из 100». Кликни по красной ячейке или нажми «Продать курс».';
    $('pf-art').textContent='Открытий '+f+'/'+M+' при α='+alpha+', n='+n+' (ожидалось ≈'+Math.round(M*alpha)+') · накоплено '+acc.f+'/'+acc.t+' = '+(acc.f/acc.t*100).toFixed(1)+'%';
    let k=0; const p=later(()=>{ pulse+=0.35; drawGrid(); if(++k>40){ clearInterval(p); pulse=0; drawGrid(); } },50,true);
  }
  function run(){
    if(running) return; running=true; selected=-1; $('pf-run').disabled=true; $('pf-new').disabled=true; $('pf-sell').disabled=true;
    make(); shown=0; drawAll(); $('pf-cnt').textContent='Открытий: …';
    const t=later(()=>{ shown=Math.min(M,shown+2); drawAll(); if(shown>=M){ clearInterval(t); running=false; $('pf-run').disabled=false; $('pf-new').disabled=false; finish(); } },18,true);
  }

  cv.addEventListener('click',e=>{ if(shown<M) return; const r=cv.getBoundingClientRect(), cw=(r.width-12)/COLS; const cx=Math.floor((e.clientX-r.left-6)/cw), cy=Math.floor((e.clientY-r.top-6)/cw); if(cx<0||cx>=COLS||cy<0||cy>=COLS) return; selected=cy*COLS+cx; drawGrid(); card(selected,false); });
  $('pf-n').addEventListener('input',e=>{ n=+e.target.value; $('pf-nv').textContent=n; shown=0; S=[]; drawAll(); $('pf-sell').disabled=true; });
  $('pf-a').addEventListener('change',e=>{ alpha=+e.target.value; $('pf-exp').textContent='ожидалось ≈'+Math.round(M*alpha); if(shown>=M){ finish(); } else drawAll(); });
  $('pf-run').addEventListener('click',run);
  $('pf-sell').addEventListener('click',()=>{ let b=0; S.forEach((s,i)=>{ if(s.pv<S[b].pv)b=i; }); selected=b; drawGrid(); card(b,true); });
  $('pf-new').addEventListener('click',()=>{ rng=mulberry32(Date.now()); acc={f:0,t:0}; rounds=0; shown=0; S=[]; selected=-1; drawAll(); $('pf-cnt').textContent='Открытий: —/100'; $('pf-acc').textContent='накоплено: 0/0'; $('pf-sell').disabled=true; $('pf-card').className='pf-card'; $('pf-card').textContent='Новый раунд (новый seed). Прогони ещё раз — «открытия» окажутся в других ячейках. Это и есть шум.'; $('pf-art').textContent='—'; });
  $('pf-copy').addEventListener('click',()=>{ const s=$('pf-art').textContent; try{ if(navigator.clipboard) navigator.clipboard.writeText(s); }catch(e){} $('pf-copy').textContent='✓ скопировано'; later(()=>{$('pf-copy').textContent='копировать';},1200); });

  make(); shown=0; // данные готовы, но скрыты до «Прогнать»
  if(window.ResizeObserver){ ro=new ResizeObserver(()=>drawAll()); ro.observe(box); } else window.addEventListener('resize',onResize);
  drawAll();
};
