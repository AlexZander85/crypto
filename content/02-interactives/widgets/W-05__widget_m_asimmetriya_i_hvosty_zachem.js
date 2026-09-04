/*
 * W-05 · widget_m_asimmetriya_i_hvosty_zachem · М29 «Асимметрия и хвосты»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: увидеть, что среднее и винрейт молчат о хвосте: два профиля с одинаковой средней сделкой (+0,05 %) — «продавец страховки» (95 % побед, редкий −18 %) и «покупатель хвоста» (5 % побед, редкий +20 %); они — две стороны одной сделки, хвост приходит к обоим в один день.
 *   Задание: (1) прожить год и посмотреть на «скриншот» перед первым хвостом — кого бы ты выбрал; (2) найти размер позиции, при котором продавец не переживает год.
 *   Ага: продавец месяцами рисует ровную линию вверх, потом один удар хвоста (красная вспышка) съедает ~18 обычных сделок; при ×5–×6 хвост становится ликвидацией, а покупатель в худший день теряет −5 %. Гистограммы: у одного длинный хвост слева, у другого — справа.
 *   Дефолты: 250 сделок, p(хвост) = 5 %, обычная сделка ±1 % (σ 0,35 %), хвост ∓18/±20 % (σ 3 %), размер ×1, seed 42.
 *   Артефакт: строка «Год: продавец 95 % побед, худшая −18,4 %, капитал 101 %; покупатель 5 % побед, худшая −1,7 %, капитал 99 %; средняя сделка одинаковая» — в журнал.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_asimmetriya_i_hvosty_zachem'] = function(box){
  /* ---------- 0. чистим прошлый запуск ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };

  /* ---------- мини-хелперы ---------- */
  const mulberry32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const css = (n,f)=>{ const v = getComputedStyle(box).getPropertyValue(n).trim(); return v || f; };
  const C = { txt: css('--txt','#eef1ff'), mut: css('--mut','#9aa3c7'), line: css('--line','rgba(154,163,199,.3)'), acc: css('--acc2','#06b6d4'), ok: css('--ok','#22c55e'), bad: css('--bad','#ef4444'), warn: css('--warn','#eab308') };
  const fmt = (x,d=1)=> (x<0?'−':'') + Math.abs(x).toFixed(d).replace('.',',');

  /* ---------- сцена ---------- */
  const N = 250, P_TAIL = 0.05;
  const PROF = {
    s: { name:'Продавец страховки', short:'часто +1 %, редко −18 %', col: C.warn },
    b: { name:'Покупатель хвоста',  short:'часто −1 %, редко +20 %', col: C.acc }
  };
  const st = { seed: 42, k: 1, i: 0, playing: false, timer: null, flash: {s:0,b:0}, shot: null };
  let T = [], ser = {};

  function gen(seed){
    const r = mulberry32(seed);
    const nrm = ()=>{ let u=0,v=0; while(u===0) u=r(); v=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    const a = []; let tails = 0;
    for(let i=0;i<N;i++){
      const tail = r() < P_TAIL; if(tail) tails++;
      // один и тот же день-хвост бьёт обоих: они контрагенты
      a.push({ tail, s: tail ? -(18+3*nrm()) : (1+0.35*nrm()), b: tail ? (20+3*nrm()) : -(1+0.35*nrm()) });
    }
    if(!tails){ const j = 40+Math.floor(r()*180); a[j] = { tail:true, s:-(18+3*nrm()), b:(20+3*nrm()) }; }
    return a;
  }
  function series(key, upto){
    const eq=[100], rets=[], tailsHit=[]; let liq=-1;
    for(let t=0;t<upto;t++){
      if(liq>=0){ eq.push(0); continue; }
      let x = T[t][key]*st.k; if(x < -100) x = -100;
      rets.push(x); if(T[t].tail) tailsHit.push(t);
      eq.push(eq[t]*(1+x/100));
      if(x <= -100) liq = t;
    }
    const n=rets.length; const sorted=rets.slice().sort((p,q)=>p-q);
    const mean = n ? rets.reduce((s,v)=>s+v,0)/n : 0;
    const median = n ? sorted[Math.floor(n/2)] : 0;
    const wins = rets.filter(v=>v>0).length;
    const tailVals = rets.filter((v,i)=>T[i].tail), commonVals = rets.filter((v,i)=>!T[i].tail);
    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0;
    return { eq, rets, n, mean, median, wins, worst: n?sorted[0]:0, best: n?sorted[n-1]:0, liq, tails: tailsHit.length, avgTail: avg(tailVals), avgCommon: avg(commonVals) };
  }
  function recompute(){ ser.s = series('s', st.i); ser.b = series('b', st.i); }
  const firstTail = ()=> T.findIndex(t=>t.tail);

  /* ---------- разметка ---------- */
  box.innerHTML = `
  <style>
    .xw5{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
    .xw5 *{box-sizing:border-box}
    .xw5 h4{margin:0 0 4px;font-size:16px}
    .xw5 .sub{color:var(--mut,#9aa3c7);margin:0 0 10px;font-size:13px}
    .xw5 .task{border-left:3px solid var(--acc2,#06b6d4);padding:6px 10px;margin:0 0 10px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .xw5 .panes{display:grid;grid-template-columns:1fr;gap:10px}
    @media (min-width:640px){.xw5 .panes{grid-template-columns:1fr 1fr}}
    .xw5 .pane{border:1px solid var(--line,rgba(154,163,199,.25));border-radius:10px;padding:8px;min-width:0}
    .xw5 .pane h5{margin:0 0 6px;font-size:13px}
    .xw5 .pane h5 small{color:var(--mut,#9aa3c7);font-weight:400;margin-left:6px}
    .xw5 canvas{display:block;width:100%;border-radius:8px;background:#070a18}
    .xw5 .stt{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;font-size:12px;margin-top:6px}
    .xw5 .stt div{display:flex;justify-content:space-between;gap:6px}
    .xw5 .stt span:last-child{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace)}
    .xw5 .ctl{display:grid;grid-template-columns:1fr auto;gap:10px 14px;align-items:end;margin:12px 0 8px}
    .xw5 label{display:block;font-size:12px;color:var(--mut,#9aa3c7)}
    .xw5 label b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-weight:600}
    .xw5 input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4);margin:4px 0 0}
    .xw5 .btns{display:flex;flex-wrap:wrap;gap:8px}
    .xw5 button{border:1px solid var(--line,rgba(154,163,199,.35));background:transparent;color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}
    .xw5 button.pri{background:var(--acc2,#06b6d4);color:#04101a;border-color:transparent;font-weight:600}
    .xw5 .aha{margin-top:8px;border-radius:10px;padding:10px 12px;border:1px dashed var(--line,rgba(154,163,199,.35));font-size:13px;transition:border-color .4s,box-shadow .4s}
    .xw5 .aha.hit{border:1px solid var(--ok,#22c55e);box-shadow:0 0 0 3px rgba(34,197,94,.15)}
    .xw5 .aha.dead{border:1px solid var(--bad,#ef4444);box-shadow:0 0 0 3px rgba(239,68,68,.15)}
    .xw5 .shot{margin-top:8px;font-size:13px;padding:8px 10px;border-radius:8px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.35)}
    .xw5 .art{margin-top:10px;display:flex;gap:8px}
    .xw5 textarea{flex:1;min-width:0;background:#070a18;color:var(--mut,#9aa3c7);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 8px;font:12px/1.4 var(--mono,ui-monospace,Menlo,Consolas,monospace);resize:none;height:46px}
    @media (max-width:420px){.xw5 .ctl{grid-template-columns:1fr}}
  </style>
  <div class="xw5">
    <h4>Асимметрия и хвосты: два профиля с одинаковым средним</h4>
    <p class="sub">Одна и та же сделка с двух сторон: продавец страховки собирает по +1 %, покупатель платит по −1 %. Раз в ~20 сделок приходит хвост — к обоим в один день. Средняя сделка у обоих ≈ <b>+0,05 %</b>.</p>
    <div class="task">🎯 <b>Задание:</b> 1) прожить год и посмотреть на «скриншот» перед первым хвостом — кого бы ты выбрал по картинке? 2) найти размер позиции, при котором продавец <b>не переживает год</b>.</div>
    <div class="panes">
      ${['s','b'].map(k=>`<div class="pane"><h5 style="color:${PROF[k].col}">${PROF[k].name}<small>${PROF[k].short}</small></h5><canvas data-cv="${k}"></canvas><div class="stt" data-st="${k}"></div></div>`).join('')}
    </div>
    <div class="ctl">
      <label>Размер позиции (умножает каждую сделку): <b data-v="k"></b><input type="range" data-s="k" min="1" max="6" step="0.5"></label>
      <div class="btns">
        <button class="pri" data-b="play">▶ Прожить год</button>
        <button data-b="step">+1 сделка</button>
        <button data-b="end">⏩ до конца</button>
        <button data-b="new">⟳ Новый год</button>
      </div>
    </div>
    <div class="shot" data-shot hidden></div>
    <div class="aha" data-aha></div>
    <div class="art"><textarea readonly data-art></textarea><button data-b="copy">Скопировать</button></div>
  </div>`;
  const $ = s => box.querySelector(s);

  /* ---------- холст ---------- */
  function fit(cv, hCss){
    const w = Math.max(280, cv.clientWidth || 300);
    const dpr = window.devicePixelRatio || 1;
    if(cv.width!==Math.round(w*dpr) || cv.height!==Math.round(hCss*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(hCss*dpr); }
    cv.style.height = hCss+'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w,h:hCss};
  }
  function drawPane(key){
    const cv = $(`canvas[data-cv="${key}"]`), S = ser[key], col = PROF[key].col;
    const {ctx,w,h} = fit(cv, 236);
    ctx.clearRect(0,0,w,h);
    ctx.font='11px system-ui,sans-serif'; ctx.textBaseline='middle';
    const padL=40, padR=8, eqTop=16, eqBot=Math.round(h*0.44), hTop=eqBot+30, hBot=h-16;
    const cw=w-padL-padR;

    /* --- капитал (100 = старт) --- */
    let maxE=110; S.eq.forEach(v=>{ if(v>maxE) maxE=v; }); maxE*=1.05;
    const x=t=>padL+cw*t/N, y=v=>eqTop+(eqBot-eqTop)*(1-v/maxE);
    ctx.strokeStyle=C.line; ctx.fillStyle=C.mut; ctx.textAlign='right';
    [0,100].forEach(v=>{ ctx.setLineDash(v===100?[4,4]:[]); ctx.beginPath(); ctx.moveTo(padL,y(v)); ctx.lineTo(w-padR,y(v)); ctx.stroke(); ctx.fillText(v+' %', padL-4, y(v)); });
    ctx.setLineDash([]);
    if(S.eq.length>1){ ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.beginPath(); S.eq.forEach((v,t)=>{ t?ctx.lineTo(x(t),y(v)):ctx.moveTo(x(t),y(v)); }); ctx.stroke(); ctx.lineWidth=1; }
    // маркеры хвостов
    for(let t=0;t<Math.min(st.i,S.liq>=0?S.liq+1:N);t++){ if(!T[t].tail) continue; const px=x(t+1), py=y(S.eq[t+1]); ctx.fillStyle = key==='s'?C.bad:C.ok; ctx.beginPath(); ctx.moveTo(px,py-(key==='s'?-9:9)); ctx.lineTo(px-4,py-(key==='s'?-3:3)); ctx.lineTo(px+4,py-(key==='s'?-3:3)); ctx.closePath(); ctx.fill(); }
    ctx.textAlign='left'; ctx.fillStyle=C.txt;
    const cur = S.eq[S.eq.length-1];
    ctx.fillText('капитал: '+fmt(cur,1)+' % от старта · сделка '+st.i+' / '+N, padL+4, eqTop-6);
    if(S.liq>=0){ ctx.fillStyle=C.bad; ctx.font='bold 13px system-ui,sans-serif'; ctx.fillText('ЛИКВИДАЦИЯ на сделке №'+(S.liq+1), padL+4, (eqTop+eqBot)/2); ctx.font='11px system-ui,sans-serif'; }
    if(st.flash[key]>0){ ctx.fillStyle = key==='s' ? `rgba(239,68,68,${0.05*st.flash[key]})` : `rgba(34,197,94,${0.05*st.flash[key]})`; ctx.fillRect(padL,eqTop,cw,eqBot-eqTop); }

    /* --- гистограмма сделок --- */
    const R = 25*st.k, B = 40, bins = new Array(B).fill(0);
    S.rets.forEach(v=>{ const b=Math.min(B-1, Math.max(0, Math.floor((v+R)/(2*R)*B))); bins[b]++; });
    const maxB = Math.max(1, ...bins), xv = v=>padL+cw*(v+R)/(2*R), bw = cw/B;
    ctx.strokeStyle=C.line; ctx.beginPath(); ctx.moveTo(padL,hBot); ctx.lineTo(w-padR,hBot); ctx.stroke();
    ctx.setLineDash([2,3]); ctx.beginPath(); ctx.moveTo(xv(0),hTop-4); ctx.lineTo(xv(0),hBot); ctx.stroke(); ctx.setLineDash([]);
    bins.forEach((c,i)=>{ if(!c) return; const center=-R+(i+0.5)*(2*R/B); const hh=(hBot-hTop)*0.92*c/maxB; ctx.fillStyle = center<0 ? 'rgba(239,68,68,.85)' : 'rgba(34,197,94,.85)'; ctx.fillRect(padL+i*bw+0.5, hBot-hh, Math.max(1,bw-1), hh); });
    if(S.n){ // среднее и медиана
      ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(xv(S.mean),hTop-2); ctx.lineTo(xv(S.mean)-4,hTop-9); ctx.lineTo(xv(S.mean)+4,hTop-9); ctx.closePath(); ctx.fill();
      ctx.fillStyle=C.mut; ctx.fillRect(xv(S.median)-1, hTop-8, 2, 6);
    }
    ctx.fillStyle=C.mut; ctx.textAlign='left'; ctx.fillText('распределение сделок · ▲ среднее · ▮ медиана', padL, hTop-16);
    ctx.fillText('−'+fmt(R,0)+' %', padL, hBot+9); ctx.textAlign='center'; ctx.fillText('0', xv(0), hBot+9); ctx.textAlign='right'; ctx.fillText('+'+fmt(R,0)+' %', w-padR, hBot+9);
  }
  function fillStats(key){
    const S=ser[key], el=$(`[data-st="${key}"]`);
    const rows=[['Сделок', S.n], ['Побед', S.n?fmt(S.wins/S.n*100,0)+' %':'—'], ['Средняя сделка', S.n?fmt(S.mean,2)+' %':'—'], ['Медиана', S.n?fmt(S.median,2)+' %':'—'], ['Худшая', S.n?fmt(S.worst)+' %':'—'], ['Лучшая', S.n?fmt(S.best)+' %':'—'], ['Хвостов', S.tails], ['Капитал', fmt(S.eq[S.eq.length-1])+' %']];
    el.innerHTML = rows.map(([k,v])=>`<div><span>${k}</span><span>${v}</span></div>`).join('');
  }

  /* ---------- панели: скриншот и ага ---------- */
  function updateShot(){
    const ft=firstTail(); const el=$('[data-shot]');
    if(ft>=5 && st.i>=ft && !st.shot){ const a=series('s',ft), b=series('b',ft); st.shot={ft, s:a.eq[a.eq.length-1], b:b.eq[b.eq.length-1], ws:a.wins, wb:b.wins}; }
    if(st.shot){ el.hidden=false; el.innerHTML=`📸 <b>Скриншот перед первым хвостом (сделка №${st.shot.ft}):</b> продавец ${fmt(st.shot.s-100)} % при ${st.shot.ws} победах из ${st.shot.ft}; покупатель ${fmt(st.shot.b-100)} % при ${st.shot.wb} победах. Кого бы ты выбрал по этой картинке? Именно такой скриншот и постят в ленту (урок П23).`; }
    else el.hidden=true;
  }
  function updateAha(){
    const a=ser.s, b=ser.b, aha=$('[data-aha]'), done=st.i>=N;
    aha.classList.remove('hit','dead');
    let t='';
    if(!done){ t=`Сделка ${st.i} из ${N}. Пока хвост не пришёл, продавец выглядит гением, а покупатель — неудачником. Смотри на гистограммы: у кого хвост растёт слева?`; }
    else {
      const ratioS = a.avgCommon ? Math.abs(a.avgTail)/Math.abs(a.avgCommon) : 0;
      t = `Год прожит. Средняя сделка: продавец <b>${fmt(a.mean,2)} %</b>, покупатель <b>${fmt(b.mean,2)} %</b> — почти одно и то же. Винрейт: <b>${fmt(a.wins/a.n*100,0)} %</b> против <b>${fmt(b.wins/b.n*100,0)} %</b>. `
        + `Худшая сделка: продавец <b>${fmt(a.worst)} %</b>, покупатель <b>${fmt(b.worst)} %</b>.<br>`
        + `Один хвост продавца = <b>${fmt(ratioS,0)}</b> обычных сделок (≈ ${fmt(ratioS/5,1)} недель ровной линии). Среднее и винрейт молчат о хвосте; о нём говорят <b>худшая сделка</b> и <b>форма гистограммы</b> (урок 1.2, П24).`;
      if(a.liq>=0){ aha.classList.add('dead'); t += `<br>💀 <b>Задание 2 выполнено:</b> при размере ×${fmt(st.k)} хвост продавца стал ликвидацией на сделке №${a.liq+1}. Покупатель при том же размере в худший день потерял ${fmt(b.worst)} %. Хвост × размер позиции = обнуление — поэтому сайзинг считают от худшего дня, а не от среднего (урок 3.3).`; }
      else if(st.k>=3){ t += `<br>При ×${fmt(st.k)} худший день продавца −${fmt(Math.abs(a.worst))} %: ещё не ноль, но одна такая сделка стирает месяцы. Двигай размер дальше.`; aha.classList.add('hit'); }
      else { aha.classList.add('hit'); t += `<br>Теперь задание 2: увеличивай размер позиции, пока продавец не перестанет переживать год.`; }
    }
    aha.innerHTML=t;
    $('[data-art]').value = done
      ? `Хвосты (×${fmt(st.k)}, seed ${st.seed}): продавец ${fmt(a.wins/a.n*100,0)} % побед, средняя ${fmt(a.mean,2)} %, худшая ${fmt(a.worst)} %, капитал ${fmt(a.eq[N])} %${a.liq>=0?' (ЛИКВИДАЦИЯ)':''} · покупатель ${fmt(b.wins/b.n*100,0)} % побед, средняя ${fmt(b.mean,2)} %, худшая ${fmt(b.worst)} %, капитал ${fmt(b.eq[N])} %`
      : `Год ещё не прожит: сделка ${st.i} / ${N}`;
    $('[data-v="k"]').textContent='×'+fmt(st.k);
  }
  function render(){ recompute(); drawPane('s'); drawPane('b'); fillStats('s'); fillStats('b'); updateShot(); updateAha(); }

  /* ---------- управление ---------- */
  function advance(n){
    for(let j=0;j<n && st.i<N;j++){ if(T[st.i].tail){ st.flash.s=10; st.flash.b=10; } st.i++; }
    render();
  }
  function stop(){ st.playing=false; $('[data-b="play"]').textContent='▶ Прожить год'; }
  $('[data-b="play"]').addEventListener('click', ()=>{ if(st.playing){ stop(); return; } if(st.i>=N){ st.i=0; st.shot=null; } st.playing=true; $('[data-b="play"]').textContent='⏸ Пауза'; });
  $('[data-b="step"]').addEventListener('click', ()=>{ stop(); advance(1); });
  $('[data-b="end"]').addEventListener('click', ()=>{ stop(); advance(N-st.i); });
  $('[data-b="new"]').addEventListener('click', ()=>{ stop(); st.seed=(Date.now()%2147483647)|0; T=gen(st.seed); st.i=0; st.shot=null; render(); });
  $('input[data-s="k"]').value=st.k;
  $('input[data-s="k"]').addEventListener('input', e=>{ st.k=parseFloat(e.target.value); render(); });
  $('[data-b="copy"]').addEventListener('click', e=>{ const ta=$('[data-art]'); ta.select(); try{ if(navigator.clipboard) navigator.clipboard.writeText(ta.value); else document.execCommand('copy'); }catch(err){} e.target.textContent='Скопировано ✓'; later(()=>{ e.target.textContent='Скопировать'; },1500); });
  box._expResize = ()=>{ drawPane('s'); drawPane('b'); }; window.addEventListener('resize', box._expResize);

  // единый тик: анимация года и затухание вспышек
  later(()=>{
    let dirty=false;
    if(st.playing){ if(st.i<N){ if(T[st.i].tail){ st.flash.s=10; st.flash.b=10; } st.i++; dirty=true; } if(st.i>=N) stop(); }
    if(st.flash.s>0||st.flash.b>0){ st.flash.s=Math.max(0,st.flash.s-1); st.flash.b=Math.max(0,st.flash.b-1); dirty=true; }
    if(dirty) render();
  }, 32, true);

  /* ---------- старт ---------- */
  T = gen(st.seed); render();
};
