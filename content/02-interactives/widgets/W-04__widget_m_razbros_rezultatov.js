/*
 * W-04 · widget_m_razbros_rezultatov · М8 «Разброс результатов»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что одинаковое среднее — это разная жизнь: две стратегии с одним и тем же средним результатом дня, одни и те же случайные числа, разный масштаб разброса.
 *   Задание: не трогая среднее, подобрать разброс стратегии Б так, чтобы её худшая просадка превысила 20 % — порог, на котором операторы выключают исправного бота (урок 5.5).
 *   Ага: две ленты «дней в минусе» под графиком — Б краснеет чаще при том же среднем; в момент, когда просадка Б пробивает 20 %, «яма» на графике заливается красным; итог года у Б ниже — разброс штрафует сложный процент.
 *   Дефолты: 250 торговых дней, старт 100 000 ₽, среднее +0,10 %/день у обеих, σ_А = 0,3 %, σ_Б = 3,0 %, seed 42; «новый год» → новый seed.
 *   Артефакт: строка «Среднее +0,10 %/день · А σ=0,3 %: в минусе N дн, просадка −a % · Б σ=3,0 %: в минусе M дн, просадка −b %» — в журнал.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_razbros_rezultatov'] = function(box){
  /* ---------- 0. чистим прошлый запуск ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };

  /* ---------- мини-хелперы (дублируются в каждом виджете) ---------- */
  const mulberry32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const css = (n,f)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: css('--txt','#eef1ff'), mut: css('--mut','#9aa3c7'), line: css('--line','rgba(154,163,199,.3)'), acc: css('--acc2','#06b6d4'), ok: css('--ok','#22c55e'), bad: css('--bad','#ef4444'), warn: css('--warn','#eab308') };
  const fmt = (x,d=1)=> (x<0?'−':'') + Math.abs(x).toFixed(d).replace('.',',');
  const fmtRub = x => Math.round(x).toLocaleString('ru-RU') + ' ₽';

  /* ---------- параметры сцены ---------- */
  const DAYS = 250, START = 100000, TARGET_DD = 20;
  const st = { seed: 42, mu: 0.10, sA: 0.3, sB: 3.0, day: DAYS, playing: false, timer: null };

  /* ---------- разметка ---------- */
  box.innerHTML = `
  <style>
    .xw4{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
    .xw4 *{box-sizing:border-box}
    .xw4 h4{margin:0 0 4px;font-size:16px}
    .xw4 .sub{color:var(--mut,#9aa3c7);margin:0 0 10px;font-size:13px}
    .xw4 .task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:0 0 10px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .xw4 canvas{display:block;width:100%;border-radius:8px;background:#070a18}
    .xw4 .ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px;margin:10px 0 4px}
    .xw4 label{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
    .xw4 label b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-weight:600}
    .xw4 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:4px 0 0}
    .xw4 .btns{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 10px}
    .xw4 button{border:1px solid var(--line,rgba(154,163,199,.35));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}
    .xw4 button.pri{background:var(--acc2,#06b6d4);color:#04101a;border-color:transparent;font-weight:600}
    .xw4 .cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .xw4 .card{border:1px solid var(--line,rgba(154,163,199,.25));border-radius:10px;padding:8px 10px;font-size:13px}
    .xw4 .card h5{margin:0 0 6px;font-size:13px}
    .xw4 .card div{display:flex;justify-content:space-between;gap:6px}
    .xw4 .card span:last-child{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace)}
    .xw4 .aha{margin-top:10px;border-radius:10px;padding:10px 12px;border:1px dashed var(--line,rgba(154,163,199,.35));font-size:13px;transition:border-color .4s,box-shadow .4s}
    .xw4 .aha.hit{border:1px solid var(--ok,#22c55e);box-shadow:0 0 0 3px rgba(34,197,94,.15)}
    .xw4 .art{margin-top:10px;display:flex;gap:8px}
    .xw4 textarea{flex:1;min-width:0;background:#070a18;color:var(--mut,#9aa3c7);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 8px;font:12px/1.4 var(--mono,ui-monospace,Menlo,Consolas,monospace);resize:none;height:46px}
    @media (max-width:420px){.xw4 .cards{grid-template-columns:1fr}}
  </style>
  <div class="xw4">
    <h4>Среднее против разброса</h4>
    <p class="sub">Две стратегии получают <b>одни и те же</b> случайные числа и <b>одно и то же среднее</b>. Отличается только масштаб разброса.</p>
    <div class="task">🎯 <b>Задание:</b> не трогая среднее, подбери разброс стратегии Б так, чтобы её худшая просадка превысила <b>${TARGET_DD} %</b> — порог, на котором операторы выключают исправного бота (урок 5.5).</div>
    <canvas class="main"></canvas>
    <div class="ctl">
      <label>Средний результат дня (обе): <b data-v="mu"></b><input type="range" data-s="mu" min="0" max="0.30" step="0.01"></label>
      <label>Разброс А, σ: <b data-v="sA"></b><input type="range" data-s="sA" min="0.1" max="1.0" step="0.1"></label>
      <label>Разброс Б, σ: <b data-v="sB"></b><input type="range" data-s="sB" min="0.5" max="6.0" step="0.1"></label>
    </div>
    <div class="btns">
      <button class="pri" data-b="play">▶ Прожить год</button>
      <button data-b="new">⟳ Новый год (другие числа)</button>
    </div>
    <div class="cards">
      <div class="card" data-c="A"><h5 style="color:${C.acc}">Стратегия А — спокойная</h5></div>
      <div class="card" data-c="B"><h5 style="color:${C.warn}">Стратегия Б — нервная</h5></div>
    </div>
    <div class="aha" data-aha></div>
    <div class="art"><textarea readonly data-art></textarea><button data-b="copy">Скопировать</button></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('canvas.main');

  /* ---------- данные ---------- */
  let z = [], A = null, B = null;
  function genZ(seed){
    const r = mulberry32(seed), a = [];
    for(let i=0;i<DAYS;i++){ let u=0,v=0; while(u===0) u=r(); v=r(); a.push(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)); }
    // нормируем: точное среднее 0 и σ 1 — тогда средний результат дня у А и Б РОВНО одинаков
    const m = a.reduce((s,x)=>s+x,0)/DAYS, sd = Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/DAYS);
    return a.map(x=>(x-m)/sd);
  }
  function run(sig){
    const eq=[START], r=[];
    for(let d=0;d<DAYS;d++){ const ret=(st.mu+sig*z[d])/100; r.push(ret); eq.push(eq[d]*(1+ret)); }
    return {eq, r};
  }
  function stats(s, day){
    let peak=s.eq[0], peakI=0, maxDD=0, ddI=0, ddPeakI=0, loss=0, dd=0;
    for(let d=1; d<=day; d++){
      const v=s.eq[d];
      if(v>peak){ peak=v; peakI=d; } else { dd++; }
      const cur=(peak-v)/peak*100;
      if(cur>maxDD){ maxDD=cur; ddI=d; ddPeakI=peakI; }
      if(s.r[d-1]<0) loss++;
    }
    return { loss, dd, maxDD, ddI, ddPeakI, final:(s.eq[day]/START-1)*100 };
  }
  function recompute(){ A = run(st.sA); B = run(st.sB); }

  /* ---------- холст ---------- */
  function fit(){
    const w = Math.max(300, cv.clientWidth || (box.clientWidth-28));
    const h = Math.min(340, Math.max(230, Math.round(w*0.6)));
    const dpr = window.devicePixelRatio || 1;
    if(cv.width!==Math.round(w*dpr) || cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
    cv.style.height = h+'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w,h};
  }
  function draw(){
    const {ctx,w,h} = fit();
    ctx.clearRect(0,0,w,h);
    const padL=48, padR=10, padT=14, ribH=30, padB=ribH+24;
    const cw=w-padL-padR, ch=h-padT-padB, D=st.day;
    let mn=Infinity, mx=-Infinity;
    for(let d=0; d<=DAYS; d++){ mn=Math.min(mn,A.eq[d],B.eq[d]); mx=Math.max(mx,A.eq[d],B.eq[d]); }
    const span=(mx-mn)||1; mn-=span*0.05; mx+=span*0.05;
    const x=d=>padL+cw*d/DAYS, y=v=>padT+ch*(1-(v-mn)/(mx-mn));
    ctx.font='11px system-ui,sans-serif'; ctx.textBaseline='middle';

    // сетка
    ctx.strokeStyle=C.line; ctx.fillStyle=C.mut; ctx.lineWidth=1;
    for(let i=0;i<=4;i++){ const v=mn+(mx-mn)*i/4, yy=y(v); ctx.beginPath(); ctx.moveTo(padL,yy); ctx.lineTo(w-padR,yy); ctx.stroke(); ctx.textAlign='right'; ctx.fillText(Math.round(v/1000)+'k', padL-4, yy); }
    // линия старта
    ctx.setLineDash([4,4]); ctx.strokeStyle=C.mut; ctx.beginPath(); ctx.moveTo(padL,y(START)); ctx.lineTo(w-padR,y(START)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign='left'; ctx.fillText('старт '+fmtRub(START), padL+4, y(START)-9);

    // «яма» Б (макс. просадка) — подсветка, если задание выполнено или год прожит
    const sB = stats(B, D), sA = stats(A, D);
    if(sB.maxDD>=TARGET_DD){
      ctx.fillStyle='rgba(239,68,68,.16)';
      const x1=x(sB.ddPeakI), x2=x(sB.ddI), y1=y(B.eq[sB.ddPeakI]), y2=y(B.eq[sB.ddI]);
      ctx.fillRect(Math.min(x1,x2), Math.min(y1,y2), Math.max(6,Math.abs(x2-x1)), Math.abs(y2-y1));
      ctx.fillStyle=C.bad; ctx.textAlign=x2>w*0.7?'right':'left';
      ctx.fillText('здесь выключают ботов: −'+fmt(sB.maxDD)+' %', x2+(x2>w*0.7?-4:4), (y1+y2)/2);
    }

    // кривые
    const curve=(s,col,lw)=>{ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); for(let d=0; d<=D; d++){ const px=x(d), py=y(s.eq[d]); d?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.stroke(); };
    curve(B, C.warn, 1.6); curve(A, C.acc, 2);

    // маркеры просадок
    const ddMark=(s,stt,col)=>{ if(stt.maxDD<1) return; const px=x(stt.ddI), y1=y(s.eq[stt.ddPeakI]), y2=y(s.eq[stt.ddI]); ctx.strokeStyle=col; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.moveTo(px,y1); ctx.lineTo(px,y2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=col; ctx.textAlign=px>w*0.75?'right':'left'; ctx.fillText('−'+fmt(stt.maxDD)+' %', px+(px>w*0.75?-4:4), y2+10); };
    ddMark(A, sA, C.acc); if(sB.maxDD<TARGET_DD) ddMark(B, sB, C.warn);

    // текущая точка
    if(D<DAYS){ [[A,C.acc],[B,C.warn]].forEach(([s,col])=>{ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x(D),y(s.eq[D]),3.5,0,Math.PI*2); ctx.fill(); }); }

    // ленты дней в минусе
    const ry=h-padB+8, cellW=cw/DAYS;
    ctx.textAlign='right'; ctx.fillStyle=C.mut; ctx.fillText('А', padL-6, ry+5); ctx.fillText('Б', padL-6, ry+19);
    for(let d=0; d<D; d++){
      ctx.fillStyle = A.r[d]<0 ? C.bad : 'rgba(34,197,94,.45)'; ctx.fillRect(x(d), ry, Math.max(1,cellW-0.3), 10);
      ctx.fillStyle = B.r[d]<0 ? C.bad : 'rgba(34,197,94,.45)'; ctx.fillRect(x(d), ry+14, Math.max(1,cellW-0.3), 10);
    }
    ctx.textAlign='left'; ctx.fillStyle=C.mut;
    ctx.fillText('лента дней: красный = день в минусе', padL, h-6);
    ctx.textAlign='right'; ctx.fillText(D+' / '+DAYS+' дн.', w-padR, h-6);
  }

  /* ---------- панели ---------- */
  function fillCard(el, s, stt){
    const rows = [['Среднее за день', '+'+fmt(st.mu,2)+' %'], ['Дней в минусе', stt.loss+' из '+st.day], ['Дней ниже пика', stt.dd], ['Худшая просадка', '−'+fmt(stt.maxDD)+' %'], ['Капитал сейчас', fmtRub(s.eq[st.day])], ['Итог', fmt(stt.final)+' %']];
    el.querySelectorAll('div').forEach(d=>d.remove());
    rows.forEach(([k,v])=>{ const d=document.createElement('div'); d.innerHTML='<span>'+k+'</span><span>'+v+'</span>'; el.appendChild(d); });
  }
  function update(){
    const sA=stats(A, st.day), sB=stats(B, st.day);
    fillCard($('[data-c="A"]'), A, sA); fillCard($('[data-c="B"]'), B, sB);
    $('[data-v="mu"]').textContent='+'+fmt(st.mu,2)+' %'; $('[data-v="sA"]').textContent=fmt(st.sA)+' %'; $('[data-v="sB"]').textContent=fmt(st.sB)+' %';
    const aha=$('[data-aha]'); const hit=sB.maxDD>=TARGET_DD;
    aha.classList.toggle('hit', hit);
    let txt='';
    if(st.day<DAYS && st.playing){
      txt = '⏳ Год идёт… Следи за лентами под графиком: у кого краснее — при <b>том же среднем</b>?';
    } else {
      txt = `Средний результат дня <b>одинаковый</b>: +${fmt(st.mu,2)} % у обеих (одни и те же случайные числа, разный масштаб).<br>`
          + `А: в минусе <b>${sA.loss}</b> дн., худшая просадка <b>−${fmt(sA.maxDD)} %</b>, итог <b>${fmt(sA.final)} %</b>. `
          + `Б: в минусе <b>${sB.loss}</b> дн., просадка <b>−${fmt(sB.maxDD)} %</b>, итог <b>${fmt(sB.final)} %</b>.<br>`;
      txt += hit
        ? `✅ <b>Задание выполнено:</b> при σ<sub>Б</sub> = ${fmt(st.sB)} % просадка −${fmt(sB.maxDD)} %. Стратегия исправна, среднее то же — а рука уже тянется к выключателю. Разброс — это цена нервов.`
        : `Просадка Б пока −${fmt(sB.maxDD)} % (нужно ≥ ${TARGET_DD} %). Двигай ползунок σ<sub>Б</sub> вправо — среднее при этом не меняется.`;
      if(sB.final < sA.final - 0.5) txt += `<br>🔍 Заметь: итог Б <b>ниже</b> при одинаковом среднем — разброс штрафует сложный процент (−50 % и +50 % не возвращают в ноль, урок 0.12).`;
    }
    aha.innerHTML = txt;
    $('[data-art]').value = `Среднее +${fmt(st.mu,2)} %/день · А σ=${fmt(st.sA)} %: в минусе ${sA.loss} дн, просадка −${fmt(sA.maxDD)} %, итог ${fmt(sA.final)} % · Б σ=${fmt(st.sB)} %: в минусе ${sB.loss} дн, просадка −${fmt(sB.maxDD)} %, итог ${fmt(sB.final)} % (seed ${st.seed})`;
  }
  function render(){ draw(); update(); }

  /* ---------- управление ---------- */
  function stop(){ st.playing=false; if(st.timer){ clearInterval(st.timer); st.timer=null; } $('[data-b="play"]').textContent='▶ Прожить год'; }
  function play(){
    if(st.playing){ stop(); render(); return; }
    if(st.day>=DAYS) st.day=0;
    st.playing=true; $('[data-b="play"]').textContent='⏸ Пауза';
    st.timer = later(()=>{ st.day=Math.min(DAYS, st.day+2); render(); if(st.day>=DAYS) stop(); }, 24, true);
  }
  box.querySelectorAll('input[type=range]').forEach(inp=>{
    inp.value = st[inp.dataset.s];
    inp.addEventListener('input', ()=>{ st[inp.dataset.s]=parseFloat(inp.value); recompute(); render(); });
  });
  $('[data-b="play"]').addEventListener('click', play);
  $('[data-b="new"]').addEventListener('click', ()=>{ stop(); st.seed=(Date.now()%2147483647)|0; z=genZ(st.seed); recompute(); st.day=DAYS; render(); });
  $('[data-b="copy"]').addEventListener('click', e=>{ const ta=$('[data-art]'); ta.select(); try{ if(navigator.clipboard) navigator.clipboard.writeText(ta.value); else document.execCommand('copy'); }catch(err){} e.target.textContent='Скопировано ✓'; later(()=>{ e.target.textContent='Скопировать'; },1500); });
  box._expResize = ()=>draw(); window.addEventListener('resize', box._expResize);

  /* ---------- старт ---------- */
  z = genZ(st.seed); recompute(); render();
};
