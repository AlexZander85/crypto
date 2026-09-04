/*
 * W-06 · widget_m_cpt_centralnaya_predelnaya_teorema · М45 «ЦПТ»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть ЦПТ глазами: какой бы уродливой ни была исходная форма (даже монетка 0/1), средние по выборкам складываются в колокол; его ширина сжимается как σ/√n.
 *   Задание: (1) для каждой из четырёх форм собрать ≥30 средних при n = 25; (2) поставить n = 2 — колокол ломается? (3) n = 100 — σ средних вдвое меньше, чем при n = 25 (√4).
 *   Ага: шарики выборки «стягиваются» в одну точку-среднее и падают в нижнюю гистограмму; поверх растущего холмика появляется теоретическая кривая σ/√n; при монетке и n = 2 — три столбика вместо колокола.
 *   Дефолты: форма «скошенное» (x = u³), n = 25, 40 бинов исходного распределения, 60 бинов средних, теоретические σ считаются по 20 000 точкам с фиксированным seed, поток выборок — seed 42.
 *   Артефакт: строка «ЦПТ · монетка 0/1 · n=25 · 120 выборок · σ_x=0,50 → σ_средних=0,10 (теория 0,10)» + чек-лист выполненных пунктов задания.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_cpt_centralnaya_predelnaya_teorema'] = function(box){
  /* ---------- 0. чистим прошлый запуск ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };

  /* ---------- мини-хелперы ---------- */
  const mulberry32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const nrm = r => { let u=0,v=0; while(u===0) u=r(); v=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const css = (n,f)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: css('--txt','#eef1ff'), mut: css('--mut','#9aa3c7'), line: css('--line','rgba(154,163,199,.3)'), acc: css('--acc2','#06b6d4'), ok: css('--ok','#22c55e'), bad: css('--bad','#ef4444'), warn: css('--warn','#eab308') };
  const fmt = (x,d=2)=> (x<0?'−':'') + Math.abs(x).toFixed(d).replace('.',',');
  const ease = t => t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

  /* ---------- формы исходного распределения ---------- */
  const SHAPES = {
    uniform: { label:'Равномерное',  draw: r => r() },
    skew:    { label:'Скошенное',    draw: r => Math.pow(r(),3) },
    bimodal: { label:'Двугорбое',    draw: r => { const c = r()<0.5 ? 0.2 : 0.8; return Math.min(1, Math.max(0, c + 0.06*nrm(r))); } },
    coin:    { label:'Монетка 0/1',  draw: r => r()<0.5 ? 0 : 1 }
  };
  const BINS_S=40, BINS_M=60;
  const st = { shape:'skew', n:25, seed:42, r:null, means:[], binsM:new Array(BINS_M).fill(0), anim:null, pulse:0, done:{bell:{}, small:false, big:false} };
  let src = null;

  function makeSource(){
    const r = mulberry32(7), sh = SHAPES[st.shape], bins = new Array(BINS_S).fill(0), M = 20000;
    let s=0, s2=0;
    for(let i=0;i<M;i++){ const x=sh.draw(r); s+=x; s2+=x*x; bins[Math.min(BINS_S-1, Math.floor(x*BINS_S))]++; }
    const mu=s/M; src = { bins, mu, sd: Math.sqrt(Math.max(0, s2/M-mu*mu)), max: Math.max(...bins) };
  }
  function resetMeans(){ st.means=[]; st.binsM.fill(0); st.anim=null; st.r=mulberry32(st.seed); }
  function takeSample(){ const pts=[]; let s=0; for(let i=0;i<st.n;i++){ const x=SHAPES[st.shape].draw(st.r); pts.push({x, yo:st.r()}); s+=x; } return { pts, mean:s/st.n }; }
  function commit(mean){
    st.means.push(mean); st.binsM[Math.min(BINS_M-1, Math.floor(mean*BINS_M))]++;
    if(st.means.length>=30){ if(st.n>=10) st.done.bell[st.shape]=true; if(st.n<=2) st.done.small=true; if(st.n>=100) st.done.big=true; }
  }
  const sdMeans = ()=>{ const a=st.means, n=a.length; if(n<2) return 0; const m=a.reduce((s,v)=>s+v,0)/n; return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(n-1)); };

  /* ---------- разметка ---------- */
  box.innerHTML = `
  <style>
    .xw6{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
    .xw6 *{box-sizing:border-box}
    .xw6 h4{margin:0 0 4px;font-size:16px}
    .xw6 .sub{color:var(--mut,#9aa3c7);margin:0 0 10px;font-size:13px}
    .xw6 .task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:0 0 10px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .xw6 .task ul{margin:4px 0 0;padding-left:18px}
    .xw6 .task li.ok{color:var(--ok,#22c55e)}
    .xw6 .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
    .xw6 .chip{border:1px solid var(--line,rgba(154,163,199,.35));background:transparent;color:var(--txt,#eef1ff);border-radius:999px;padding:4px 12px;font:13px inherit;cursor:pointer}
    .xw6 .chip.on{background:var(--acc2,#06b6d4);color:#04101a;border-color:transparent;font-weight:600}
    .xw6 canvas{display:block;width:100%;border-radius:8px;background:#070a18}
    .xw6 .ctl{display:grid;grid-template-columns:1fr auto;gap:10px 14px;align-items:end;margin:10px 0 8px}
    .xw6 label{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
    .xw6 label b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-weight:600}
    .xw6 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:4px 0 0}
    .xw6 .btns{display:flex;flex-wrap:wrap;gap:8px}
    .xw6 button{border:1px solid var(--line,rgba(154,163,199,.35));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}
    .xw6 button.pri{background:var(--acc2,#06b6d4);color:#04101a;border-color:transparent;font-weight:600}
    .xw6 .aha{margin-top:8px;border-radius:10px;padding:10px 12px;border:1px dashed var(--line,rgba(154,163,199,.35));font-size:13px;transition:border-color .4s,box-shadow .4s}
    .xw6 .aha.hit{border:1px solid var(--ok,#22c55e);box-shadow:0 0 0 3px rgba(34,197,94,.15)}
    .xw6 .art{margin-top:10px;display:flex;gap:8px}
    .xw6 textarea{flex:1;min-width:0;background:#070a18;color:var(--mut,#9aa3c7);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 8px;font:12px/1.4 var(--mono,ui-monospace,Menlo,Consolas,monospace);resize:none;height:46px}
    @media (max-width:420px){.xw6 .ctl{grid-template-columns:1fr}}
  </style>
  <div class="xw6">
    <h4>Центральная предельная теорема: любой исход — колокол средних</h4>
    <p class="sub">Сверху — исходное распределение (какое угодно уродливое). Кнопка берёт выборку из n точек, считает среднее и бросает его в нижнюю гистограмму. Смотри, какая форма вырастает внизу.</p>
    <div class="task">🎯 <b>Задание:</b><ul>
      <li data-t="bell">Собрать ≥ 30 средних при n = 25 для <b>каждой</b> из четырёх форм (сделано: <span data-tb>0</span> / 4)</li>
      <li data-t="small">Поставить n = 2 и собрать ≥ 30 средних — колокол ломается?</li>
      <li data-t="big">Поставить n = 100: σ средних вдвое меньше, чем при n = 25 (√4)</li></ul></div>
    <div class="chips">${Object.keys(SHAPES).map(k=>`<button class="chip" data-sh="${k}">${SHAPES[k].label}</button>`).join('')}</div>
    <canvas class="main"></canvas>
    <div class="ctl">
      <label>Размер выборки n: <b data-v="n"></b><input type="range" data-s="n" min="1" max="100" step="1"></label>
      <div class="btns">
        <button class="pri" data-b="one">Взять выборку</button>
        <button data-b="many">×50 быстро</button>
        <button data-b="reset">Сбросить</button>
      </div>
    </div>
    <div class="aha" data-aha></div>
    <div class="art"><textarea readonly data-art></textarea><button data-b="copy">Скопировать</button></div>
  </div>`;
  const $ = s => box.querySelector(s);
  const cv = $('canvas.main');

  /* ---------- холст ---------- */
  function fit(){
    const w = Math.max(300, cv.clientWidth || (box.clientWidth-28));
    const h = Math.min(380, Math.max(280, Math.round(w*0.8)));
    const dpr = window.devicePixelRatio || 1;
    if(cv.width!==Math.round(w*dpr) || cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
    cv.style.height = h+'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w,h};
  }
  function layout(w,h){
    const padL=16, padR=16;
    return { padL, padR, cw:w-padL-padR, srcTop:26, srcBot:Math.round(h*0.36), midY:Math.round(h*0.45), botTop:Math.round(h*0.55), botBot:h-24, xs: x=>padL+x*(w-padL-padR) };
  }
  function draw(now){
    const {ctx,w,h} = fit(), L = layout(w,h);
    ctx.clearRect(0,0,w,h);
    ctx.font='11px system-ui,sans-serif'; ctx.textBaseline='middle'; ctx.textAlign='left';

    /* --- исходное распределение --- */
    const bwS = L.cw/BINS_S, hS = L.srcBot-L.srcTop;
    ctx.fillStyle='rgba(154,163,199,.55)';
    src.bins.forEach((c,i)=>{ const hh=hS*0.92*c/src.max; ctx.fillRect(L.padL+i*bwS+0.5, L.srcBot-hh, Math.max(1,bwS-1), hh); });
    ctx.strokeStyle=C.line; ctx.beginPath(); ctx.moveTo(L.padL,L.srcBot); ctx.lineTo(w-L.padR,L.srcBot); ctx.stroke();
    ctx.fillStyle=C.mut; ctx.fillText(`Исходное: ${SHAPES[st.shape].label} · среднее ${fmt(src.mu)} · σ = ${fmt(src.sd)}`, L.padL, L.srcTop-12);
    ctx.fillStyle=C.mut; ctx.beginPath(); ctx.moveTo(L.xs(src.mu),L.srcBot+2); ctx.lineTo(L.xs(src.mu)-4,L.srcBot+9); ctx.lineTo(L.xs(src.mu)+4,L.srcBot+9); ctx.closePath(); ctx.fill();

    /* --- средняя линия --- */
    ctx.setLineDash([3,4]); ctx.strokeStyle=C.line; ctx.beginPath(); ctx.moveTo(L.padL,L.midY); ctx.lineTo(w-L.padR,L.midY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=C.mut; ctx.fillText('среднее выборки ↓', L.padL, L.midY-10);

    /* --- гистограмма средних --- */
    const bwM = L.cw/BINS_M, hM = L.botBot-L.botTop, total = st.means.length, maxM = Math.max(1, ...st.binsM);
    ctx.fillStyle = st.pulse>0 ? `rgba(6,182,212,${0.05+0.03*st.pulse})` : 'rgba(6,182,212,0)';
    if(st.pulse>0) ctx.fillRect(L.padL, L.botTop-4, L.cw, hM+4);
    ctx.fillStyle=C.acc;
    st.binsM.forEach((c,i)=>{ if(!c) return; const hh=hM*0.92*c/maxM; ctx.fillRect(L.padL+i*bwM+0.5, L.botBot-hh, Math.max(1,bwM-1), hh); });
    ctx.strokeStyle=C.line; ctx.beginPath(); ctx.moveTo(L.padL,L.botBot); ctx.lineTo(w-L.padR,L.botBot); ctx.stroke();
    // теоретический колокол σ/√n
    const sdT = src.sd/Math.sqrt(st.n);
    if(total>=10 && sdT>0){
      ctx.strokeStyle=C.warn; ctx.lineWidth=1.6; ctx.beginPath(); let first=true;
      for(let px=0; px<=L.cw; px+=2){ const x=px/L.cw; const pdf=Math.exp(-(x-src.mu)*(x-src.mu)/(2*sdT*sdT))/(sdT*Math.sqrt(2*Math.PI)); const cnt=total*pdf/BINS_M; const yy=Math.max(L.botTop, L.botBot-hM*0.92*cnt/maxM); first?ctx.moveTo(L.padL+px,yy):ctx.lineTo(L.padL+px,yy); first=false; }
      ctx.stroke(); ctx.lineWidth=1;
    }
    const sdm = sdMeans();
    ctx.fillStyle=C.mut;
    ctx.fillText(`Средние по n = ${st.n}: ${total} выборок · σ средних = ${total>1?fmt(sdm):'—'} · теория σ/√n = ${fmt(sdT)}`, L.padL, L.botTop-10);
    ctx.textAlign='left'; ctx.fillText('0', L.padL, h-8); ctx.textAlign='center'; ctx.fillText('0,5', L.xs(0.5), h-8); ctx.textAlign='right'; ctx.fillText('1', w-L.padR, h-8);
    // подпись «ага» на сцене
    if(total>=30){
      let lbl='', col=C.ok;
      if(st.n===1) { lbl='n = 1: копия исходного — колокола нет'; col=C.warn; }
      else if(st.shape==='coin' && st.n<=3) { lbl=`монетка при n = ${st.n}: всего ${st.n+1} возможных средних — колокол не собирается`; col=C.warn; }
      else lbl='Колокол — при любой форме сверху';
      ctx.fillStyle=col; ctx.font='bold 12px system-ui,sans-serif'; ctx.textAlign='right'; ctx.fillText(lbl, w-L.padR, L.botTop+12); ctx.font='11px system-ui,sans-serif';
    }

    /* --- анимация выборки --- */
    if(st.anim){
      const a=st.anim, t=now-a.t0, A=250, B=450, Cd=250;
      const xm=L.xs(a.mean);
      if(t<A+B){
        const k = t<A ? 0 : ease(Math.min(1,(t-A)/B));
        const alpha = t<A ? t/A : 1;
        ctx.fillStyle = `rgba(234,179,8,${0.9*alpha})`;
        a.pts.forEach(p=>{
          const bi=Math.min(BINS_S-1,Math.floor(p.x*BINS_S)), bh=hS*0.92*src.bins[bi]/src.max;
          const x0=L.xs(p.x), y0=L.srcBot-3-p.yo*Math.max(bh-6,4);
          const x1=x0+(xm-x0)*k, y1=y0+(L.midY-y0)*k;
          ctx.beginPath(); ctx.arc(x1,y1,3,0,Math.PI*2); ctx.fill();
        });
        if(t>=A){ ctx.fillStyle=C.warn; ctx.textAlign='center'; ctx.fillText('x̄ = '+fmt(a.mean), xm, L.midY-22); }
      } else {
        const k = ease(Math.min(1,(t-A-B)/Cd));
        const bi=Math.min(BINS_M-1,Math.floor(a.mean*BINS_M)); const cnt=st.binsM[bi]+1; const maxN=Math.max(maxM,cnt);
        const yT=L.botBot-hM*0.92*cnt/maxN-4;
        ctx.fillStyle=C.warn; ctx.beginPath(); ctx.arc(xm, L.midY+(yT-L.midY)*k, 5, 0, Math.PI*2); ctx.fill();
      }
    }
  }
  function step(now){
    if(st.anim && now-st.anim.t0 >= 950){ commit(st.anim.mean); st.anim=null; draw(now); updatePanels(); return; }
    if(st.pulse>0) st.pulse--;
    draw(now);
    if(st.anim || st.pulse>0) raf(step);
  }

  /* ---------- панели ---------- */
  function updatePanels(){
    const total=st.means.length, sdm=sdMeans(), sdT=src.sd/Math.sqrt(st.n);
    const aha=$('[data-aha]'); const ratio = sdT>0 && total>1 ? sdm/sdT : 0;
    let t;
    if(total<10) t = `Возьми несколько выборок. Пока средних мало, форма внизу не видна — это то же правило, что и для сделок: выводы делают по десяткам, а не по трём (урок М30).`;
    else if(st.n===1) t = `При n = 1 «среднее» — это одна точка, поэтому внизу растёт копия исходного. Колокол появляется только когда усредняют <b>много</b> независимых значений.`;
    else t = `Собрано ${total} средних по n = ${st.n}. σ средних = <b>${fmt(sdm)}</b>, теория σ/√n = <b>${fmt(sdT)}</b> (отношение ${fmt(ratio)}). `
           + (st.shape==='coin' && st.n<=3 ? `Монетка при таком n даёт всего ${st.n+1} возможных значений среднего — колокол ещё не собрался; подними n.` : `Форма сверху ${SHAPES[st.shape].label.toLowerCase()} — а внизу колокол. Именно поэтому средняя сделка по большой выборке ведёт себя прилично, даже если каждая отдельная сделка — дикая. И поэтому доверительный интервал среднего сужается как 1/√n (урок М31).`);
    aha.innerHTML=t; aha.classList.toggle('hit', total>=30 && st.n>1 && !(st.shape==='coin' && st.n<=3));
    const nb = Object.keys(st.done.bell).length; $('[data-tb]').textContent=nb;
    $('[data-t="bell"]').classList.toggle('ok', nb>=4); $('[data-t="small"]').classList.toggle('ok', st.done.small); $('[data-t="big"]').classList.toggle('ok', st.done.big);
    $('[data-v="n"]').textContent=st.n;
    $('[data-art]').value = `ЦПТ · ${SHAPES[st.shape].label} · n=${st.n} · ${total} выборок · σ_x=${fmt(src.sd)} → σ_средних=${total>1?fmt(sdm):'—'} (теория ${fmt(sdT)}) · задание: формы ${nb}/4${st.done.small?', n=2 ✓':''}${st.done.big?', n=100 ✓':''}`;
    box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on', c.dataset.sh===st.shape));
  }
  function render(){ draw(performance.now()); updatePanels(); }

  /* ---------- управление ---------- */
  box.querySelectorAll('.chip').forEach(c=>c.addEventListener('click', ()=>{ st.shape=c.dataset.sh; makeSource(); resetMeans(); render(); }));
  const nInp=$('input[data-s="n"]'); nInp.value=st.n;
  nInp.addEventListener('input', ()=>{ st.n=parseInt(nInp.value,10); resetMeans(); render(); });
  $('[data-b="one"]').addEventListener('click', ()=>{ if(st.anim){ commit(st.anim.mean); } const s=takeSample(); st.anim={...s, t0:performance.now()}; raf(step); });
  $('[data-b="many"]').addEventListener('click', ()=>{ if(st.anim){ commit(st.anim.mean); st.anim=null; } for(let i=0;i<50;i++) commit(takeSample().mean); st.pulse=8; render(); raf(step); });
  $('[data-b="reset"]').addEventListener('click', ()=>{ resetMeans(); render(); });
  $('[data-b="copy"]').addEventListener('click', e=>{ const ta=$('[data-art]'); ta.select(); try{ if(navigator.clipboard) navigator.clipboard.writeText(ta.value); else document.execCommand('copy'); }catch(err){} e.target.textContent='Скопировано ✓'; later(()=>{ e.target.textContent='Скопировать'; },1500); });
  box._expResize = ()=>draw(performance.now()); window.addEventListener('resize', box._expResize);

  /* ---------- старт ---------- */
  makeSource(); resetMeans(); render();
};
