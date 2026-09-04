/*
 * W-27 · widget_ps_l14_tilt_web · П14 «Паутина тильта»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l14_tilt_web'] = function(box){
  // ── 0. чистим прошлый запуск ─────────────────────────────────────────────
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expOff){ box._expOff(); }
  box._expTimers = []; box._expRaf = null; box._expOff = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
  const k = n => (Math.round(n/1000)) + 'k';

  // ── 1. канон (П14): числа ────────────────────────────────────────────────
  const CAP0 = 100000, LOSS0 = 5000, PWIN = 0.45, TMAX = 8e9;
  const THOUGHTS = ['Да как так?! Рынок просто издевается.', 'Одна быстрая сделка — верну свои и сразу выйду.', 'Сейчас точно развернётся, стоп только мешает.', 'Я не могу лечь спать побеждённым.', 'Рынок должен мне эти деньги.', 'Ещё одна — и всё, честно.'];

  // ── 2. состояние ─────────────────────────────────────────────────────────
  let rnd = mulberry32(42);
  let D, S, t, pulse, calm, threads, over, exited, log, ruinMinute, classicRun;
  const reset = ()=>{ D=LOSS0; S=LOSS0; t=0; pulse=88; calm=70; threads=[]; over=false; exited=false; log=[]; ruinMinute=null; classicRun=false; anim.scale=1; anim.target=1; anim.snap=0; };

  // ── 3. разметка ──────────────────────────────────────────────────────────
  box.innerHTML = `
  <div class="tw">
    <style>
      .tw{font-family:inherit;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
      .tw *{box-sizing:border-box}
      .tw-title{font-weight:700;font-size:16px;margin:0 0 4px}
      .tw-goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
      .tw-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:12px}
      @media(max-width:600px){.tw-grid{grid-template-columns:1fr}}
      .tw-canvas{width:100%;display:block;border-radius:10px;background:radial-gradient(circle at 50% 50%,rgba(239,68,68,.06),rgba(0,0,0,.35))}
      .tw-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:12px;margin-top:8px}
      .tw-stats div{border:1px solid var(--line,rgba(255,255,255,.08));border-radius:8px;padding:6px 8px}
      .tw-stats b{display:block;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:15px;margin-top:2px}
      .tw-stats .warn b{color:var(--warn,#eab308)} .tw-stats .bad b{color:var(--bad,#ef4444)}
      .tw-bar{height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:4px}
      .tw-bar i{display:block;height:100%;border-radius:5px;background:var(--ok,#22c55e);transition:width .5s,background .5s}
      .tw-card{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:10px;padding:12px;background:rgba(255,255,255,.03)}
      .tw-meta{display:flex;flex-wrap:wrap;gap:8px 14px;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px;color:var(--mut,#9aa3c7);margin-bottom:6px}
      .tw-meta b{color:var(--txt,#eef1ff)}
      .tw-thought{font-style:italic;font-size:14px;margin-bottom:8px}
      .tw-opts{display:grid;gap:8px}
      .tw-opt{text-align:left;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);font:inherit;font-size:14px;cursor:pointer;line-height:1.35;transition:border-color .2s,transform .1s}
      .tw-opt:hover{border-color:var(--acc2,#06b6d4);transform:translateY(-1px)}
      .tw-opt.exit{border-color:var(--ok,#22c55e)}
      .tw-opt:disabled{opacity:.5;cursor:default;transform:none}
      .tw-truth{border-left:3px solid var(--warn,#eab308);padding:6px 10px;margin:10px 0 0;font-size:13px;min-height:20px}
      .tw-truth.win{border-color:var(--acc2,#06b6d4)} .tw-truth.loss{border-color:var(--bad,#ef4444)} .tw-truth.exit{border-color:var(--ok,#22c55e)}
      .tw-ladder{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px}
      .tw-ladder span{padding:3px 8px;border-radius:6px;border:1px solid var(--line,rgba(255,255,255,.1));color:var(--mut,#9aa3c7)}
      .tw-ladder span.on{border-color:var(--bad,#ef4444);color:var(--bad,#ef4444);font-weight:700}
      .tw-ladder em{font-style:normal;color:var(--mut,#9aa3c7)}
      .tw-btn{padding:9px 14px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);font:inherit;font-size:13px;cursor:pointer}
      .tw-btn.acc{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:700}
      .tw-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .tw-res h4{margin:10px 0 6px;font-size:14px}
      .tw-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
      @media(max-width:520px){.tw-cmp{grid-template-columns:1fr}}
      .tw-cmp div{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:8px}
      .tw-cmp b{font-family:var(--mono,ui-monospace,Menlo,monospace)}
      .tw-art input{width:100%;padding:8px 10px;border-radius:8px;border:1px dashed var(--acc2,#06b6d4);background:rgba(6,182,212,.08);color:var(--txt,#eef1ff);font:inherit;font-size:13px;margin-top:6px}
      .tw-small{font-size:12px;color:var(--mut,#9aa3c7)}
      .tw-log{font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:11px;color:var(--mut,#9aa3c7);margin-top:8px;max-height:96px;overflow:auto}
      @keyframes twShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
      .tw-shake{animation:twShake .3s}
    </style>
    <div class="tw-title">Паутина тильта: каждая попытка отыграться — новая нить</div>
    <div class="tw-goal">Цель: увидеть, что стягивает счёт не убыток, а <b>попытка вернуть его немедленно</b>. Задание: выйди из-за стола раньше паука.</div>
    <div class="tw-grid">
      <div>
        <canvas class="tw-canvas"></canvas>
        <div class="tw-stats">
          <div><span class="tw-small">минут за столом</span><b class="s-t">0</b></div>
          <div><span class="tw-small">пульс</span><b class="s-p">88</b></div>
          <div class="warn"><span class="tw-small">просадка</span><b class="s-d"></b></div>
          <div class="warn"><span class="tw-small">размер следующей ставки</span><b class="s-s"></b></div>
          <div class="bad" style="grid-column:1/-1"><span class="tw-small">натяжение = просадка × размер</span><b class="s-x"></b></div>
          <div style="grid-column:1/-1"><span class="tw-small">спокойствие</span><div class="tw-bar"><i class="s-c"></i></div></div>
        </div>
      </div>
      <div class="tw-right"></div>
    </div>
  </div>`;
  const cv = box.querySelector('.tw-canvas'), ctx = cv.getContext('2d'), right = box.querySelector('.tw-right');
  const $ = s => box.querySelector(s);

  // ── 4. canvas: паутина ───────────────────────────────────────────────────
  const anim = {scale:1, target:1, snap:0, snapping:false, grow:null, running:false};
  let W=0,H=0, dpr=Math.max(1,window.devicePixelRatio||1);
  const size = ()=>{ W = Math.max(280, cv.clientWidth || (box.clientWidth-30)); H = Math.min(340, Math.round(W*0.85)); cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); draw(); };
  const onRs = ()=>size(); window.addEventListener('resize', onRs); box._expOff = ()=>window.removeEventListener('resize', onRs);

  function draw(){
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2, R=Math.min(W,H)*0.44, sc=anim.scale, fade = 1-anim.snap*0.85;
    // спицы
    ctx.strokeStyle=`rgba(154,163,199,${0.35*fade})`; ctx.lineWidth=1;
    for(let i=0;i<12;i++){ const a=i*Math.PI/6; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R); ctx.stroke(); }
    // кольца (стягиваются к центру при росте просадки)
    for(let r=1;r<=5;r++){
      const rr = R*(0.18+0.82*(r/5))*sc*(1+anim.snap*0.15);
      ctx.beginPath(); for(let i=0;i<=12;i++){ const a=i*Math.PI/6, wob = 1+Math.sin(i*2.3+r)*0.02; const x=cx+Math.cos(a)*rr*wob, y=cy+Math.sin(a)*rr*wob; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.strokeStyle=`rgba(154,163,199,${(0.25+0.05*r)*fade})`; ctx.stroke();
    }
    // нити «отыграться»
    threads.forEach((th,i)=>{
      const a = th.angle, len = R*1.02, prog = th.prog;
      const x0=cx+Math.cos(a)*len, y0=cy+Math.sin(a)*len;
      const x1=cx+Math.cos(a)*len*(1-prog), y1=cy+Math.sin(a)*len*(1-prog);
      ctx.lineWidth = 1.5 + Math.min(6, th.size/10000);
      ctx.strokeStyle = th.win ? 'rgba(6,182,212,.85)' : 'rgba(239,68,68,.9)';
      if(anim.snap>0){ // разрыв нити
        const g=anim.snap; const mx=(x0+x1)/2, my=(y0+y1)/2;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(mx+(x0-mx)*g*0.6+ (th.jx*g*14), my+(y0-my)*g*0.6+(th.jy*g*14)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(mx+(x1-mx)*g*0.6, my+(y1-my)*g*0.6); ctx.stroke();
      } else { ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); }
      ctx.fillStyle = th.win?'#06b6d4':'#ef4444'; ctx.font='10px ui-monospace,Menlo,monospace'; ctx.textAlign='center';
      ctx.fillText((th.win?'+':'−')+k(th.amt), cx+Math.cos(a)*(len+12), cy+Math.sin(a)*(len+12)+3);
    });
    // центр — натяжение
    const T = D*S, nr = 10 + 44*Math.sqrt(Math.min(1, T/TMAX));
    const g = ctx.createRadialGradient(cx,cy,nr*0.2,cx,cy,nr*1.6);
    g.addColorStop(0, over&&!exited?'rgba(239,68,68,.9)':'rgba(239,68,68,.55)'); g.addColorStop(1,'rgba(239,68,68,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,nr*1.6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = exited ? 'rgba(34,197,94,.85)' : 'rgba(239,68,68,.85)'; ctx.beginPath(); ctx.arc(cx,cy,nr,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='700 12px ui-monospace,Menlo,monospace';
    ctx.fillText(exited?'вышел':(over?'паук':k(D)+'×'+k(S)), cx, cy+4);
    ctx.font='11px system-ui,sans-serif'; ctx.fillStyle='#9aa3c7'; ctx.textAlign='left';
    ctx.fillText('депозит 100 000 ₽ · монета тильта 45/55', 8, H-8);
  }
  function tick(now){
    let live=false;
    if(Math.abs(anim.scale-anim.target)>0.002){ anim.scale += (anim.target-anim.scale)*0.12; live=true; } else anim.scale=anim.target;
    threads.forEach(th=>{ if(th.prog<1){ th.prog=Math.min(1,th.prog+0.06); live=true; } });
    if(anim.snapping){ anim.snap=Math.min(1,anim.snap+0.04); if(anim.snap<1) live=true; else anim.snapping=false; }
    draw();
    if(live) raf(tick); else anim.running=false;
  }
  const kick = ()=>{ if(!anim.running){ anim.running=true; raf(tick); } };

  // ── 5. статы ─────────────────────────────────────────────────────────────
  function stats(){
    $('.s-t').textContent=t; $('.s-p').textContent=Math.round(pulse); $('.s-d').textContent=fmt(D); $('.s-s').textContent=fmt(S);
    $('.s-x').textContent=(D/1000).toFixed(0)+'k × '+(S/1000).toFixed(0)+'k = '+((D*S)/1e6).toFixed(0)+' млн';
    const c=$('.s-c'); c.style.width=Math.max(0,calm)+'%'; c.style.background = calm>50?'var(--ok,#22c55e)':calm>25?'var(--warn,#eab308)':'var(--bad,#ef4444)';
    anim.target = 1 - 0.72*Math.min(1, D/CAP0); kick();
  }

  // ── 6. раунд ─────────────────────────────────────────────────────────────
  const ladderHtml = ()=>{ const steps=[5,10,20,40,80]; let sum=0; return `<div class="tw-ladder"><em>лестница удвоения:</em>${steps.map((v,i)=>{ sum+=v; return `<span class="${S/1000>=v?'on':''}">${v}k</span>`; }).join('')}<em>= ${sum}k ₽ > депозита 100k → до нуля 5 шагов</em></div>`; };

  function renderRound(truthHtml, truthCls){
    const thought = THOUGHTS[Math.min(THOUGHTS.length-1, threads.length)];
    right.innerHTML = `
      <div class="tw-card">
        <div class="tw-meta"><span>⏱ минута <b>${t}</b></span><span>♥ <b>${Math.round(pulse)}</b></span><span>📉 просадка <b>${fmt(D)}</b></span></div>
        <div class="tw-small" style="margin-bottom:4px">Звук: ${threads.length? 'клик мыши, ещё одна вкладка терминала' : 'уведомление «стоп сработал». Внутри всё кипит.'}</div>
        <div class="tw-thought">«${esc(thought)}»</div>
        <div class="tw-opts">
          <button class="tw-opt" data-a="same">Отыграться тем же объёмом (${fmt(S)}) — «аккуратно верну своё»</button>
          <button class="tw-opt" data-a="double">Удвоить (${fmt(S*2)}) — «отбить всё одной сделкой»</button>
          <button class="tw-opt" data-a="nostop">Удвоить и убрать стоп (${fmt(S*2)}) — «чтобы точно не выбило»</button>
          <button class="tw-opt exit" data-a="exit">Выйти из-за стола: закрыть терминал, «не беспокоить», 4 часа вне экрана</button>
        </div>
        <div class="tw-truth ${truthCls||''}">${truthHtml||'Правда, которую покажет каждый выбор: был ли сигнал системы — или это монета с комиссией.'}</div>
        ${ladderHtml()}
        <div class="tw-log">${log.slice(-6).map(esc).join('<br>')}</div>
      </div>`;
    right.querySelectorAll('.tw-opt').forEach(b=>b.onclick=()=>act(b.dataset.a));
  }

  function act(a){
    if(over) return;
    if(a==='exit'){ exitTable(); return; }
    const noStop = a==='nostop'; if(a!=='same') S = S*2;
    const win = rnd() < PWIN;
    const amt = win ? S : (noStop ? S*2 : S);
    const dt = 6 + Math.floor(rnd()*6); t += dt;
    if(win){ D = Math.max(0, D-amt); calm -= 8; pulse += 4; }
    else { D = Math.min(CAP0, D+amt); calm -= 14; pulse += 7; }
    threads.push({angle: threads.length*2.399963 + 0.7, prog:0, win, amt, size:S, jx:rnd()-0.5, jy:rnd()-0.5});
    log.push(`мин ${t}: ${a==='same'?'тот же объём':a==='double'?'удвоил':'удвоил без стопа'} ${k(S)} → ${win?'+':'−'}${k(amt)} · просадка ${k(D)}`);
    cv.classList.remove('tw-shake'); void cv.offsetWidth; if(!win) cv.classList.add('tw-shake');
    stats();
    let truth;
    if(win) truth = `<b>Правда:</b> сигнала по системе не было — это монета 45/55 после комиссий, и она выпала в твою пользу. Но заметь: паутина не разжалась — <b>выигрыш держит за столом</b>. Нить №${threads.length} натянута, размер следующей ставки уже ${fmt(S)}.`;
    else truth = `<b>Правда:</b> сигнала не было, риск ${noStop?'без стопа удвоил убыток':'завышен'}. Монета 45/55 выпала против. Нить №${threads.length}: просадка ${fmt(D)}, натяжение выросло в ${((D*S)/(LOSS0*LOSS0)).toFixed(0)} раз от исходного — не линейно, а квадратично.`;
    if(D>=CAP0){ over=true; ruinMinute=t; later(()=>renderResult(true), 600); renderRound(truth+' <b>Депозит обнулён.</b>', 'loss'); right.querySelectorAll('.tw-opt').forEach(b=>b.disabled=true); return; }
    if(calm<=0){ calm=0; }
    renderRound(truth, win?'win':'loss');
  }

  function exitTable(){
    over=true; exited=true; anim.snapping=true; anim.snap=0.001; kick();
    log.push(`мин ${t}: вышел из-за стола с просадкой ${k(D)}`);
    later(()=>renderResult(false), 900);
  }

  // ── 7. разбор ────────────────────────────────────────────────────────────
  function renderResult(ruined){
    // классический финал от исходной точки: только удвоение, все убытки
    let dd=LOSS0, ss=LOSS0, steps=0, mins=0; while(dd<CAP0){ ss*=2; dd=Math.min(CAP0,dd+ss); steps++; mins+=8; }
    const pRuin = Math.pow(1-PWIN, steps); // вероятность проиграть все шаги подряд
    // если бы удваивал дальше из текущей точки
    let dd2=D, ss2=S, st2=0, m2=t; if(!ruined){ while(dd2<CAP0){ ss2*=2; dd2=Math.min(CAP0,dd2+ss2); st2++; m2+=8; } }
    const saved = ruined ? 0 : CAP0 - D;
    const attempts = threads.length;
    const rule = 'Два системных стопа подряд или один внесистемный срыв → стоп-день: закрыть терминал, режим «не беспокоить», минимум 4 часа вне экрана, сделки — не раньше следующего утра.';
    let verdict;
    if(ruined) verdict = `Паук выиграл на минуте ${t}. Не первый убыток тебя обнулил — его вернули бы обычные сделки за неделю. Обнулили ${attempts} попыток вернуть его немедленно. Полный слив редко складывается из плановых стопов за полгода — чаще это 2–3 часа тильта (П14).`;
    else if(attempts===0) verdict = `Ты вышел на минуте 0 с плановым убытком ${fmt(D)}. Это и есть работа системы: стоп — не поражение, а цена входного билета (П10). Паутина не успела натянуться ни одной нитью.`;
    else verdict = `Ты вышел сам на минуте ${t}, после ${attempts} нит${attempts===1?'и':'ей'}, с просадкой ${fmt(D)} — это ${(D/LOSS0).toFixed(1)}× от первого стопа. Каждая минута за столом стоила в среднем ${fmt((D-LOSS0)/Math.max(1,t))}. Если бы удваивал дальше — ноль через ${st2} шаг${st2===1?'':'а'} (около минуты ${m2}).`;
    right.innerHTML = `
      <div class="tw-card tw-res">
        <div class="tw-truth ${ruined?'loss':'exit'}"><b>${ruined?'Сдался пауку':'Вышел из-за стола'}</b> · минут за столом: <b>${t}</b> · нитей: <b>${attempts}</b></div>
        <div style="font-size:14px;line-height:1.45;margin:8px 0">${esc(verdict)}</div>
        <h4>Две метрики</h4>
        <div class="tw-cmp">
          <div>спокойствие / сон<br><b>${Math.max(0,calm)}/100</b> <span class="tw-small">(старт 70; каждая нить −14, даже выигрыш −8)</span></div>
          <div>сохранённый капитал<br><b>${fmt(saved)}</b> <span class="tw-small">из 100 000 ₽; против классического финала — +${fmt(saved)}</span></div>
        </div>
        <h4>Классический финал удвоения</h4>
        <div class="tw-small">5k → 10k → 20k → 40k → 80k: сумма 155 000 ₽ больше депозита — ноль за ${steps} шагов, около ${mins} минут. Чтобы «отыграться удвоением», нужно выиграть раньше, чем кончатся деньги. Вероятность проиграть ${steps} монет подряд при 45/55 — ${(pRuin*100).toFixed(1)}%: примерно одна сессия из ${Math.round(1/pRuin)}. И одной достаточно.</div>
        <div class="tw-row"><button class="tw-btn tw-classic">Показать классический финал на паутине</button></div>
        <h4>Что если</h4>
        <div class="tw-cmp">
          <div>вышел бы сразу после стопа<br><b>−${fmt(LOSS0)}</b> · минута 0</div>
          <div>твой путь<br><b>−${fmt(D)}</b> · минута ${t}</div>
        </div>
        <div class="tw-art"><div class="tw-small" style="margin-top:10px">Артефакт — протокол «Стоп-Тильт» одним предложением (в устав):</div><input readonly value="${esc(rule)}"></div>
        <div class="tw-row"><button class="tw-btn acc tw-new">Новый раунд (новая монета)</button><button class="tw-btn tw-same">Повторить с тем же сидом</button></div>
        <div class="tw-log">${log.map(esc).join('<br>')}</div>
      </div>`;
    right.querySelector('.tw-art input').onclick=e=>e.target.select();
    right.querySelector('.tw-new').onclick=()=>{ rnd=mulberry32(Date.now()); reset(); stats(); renderRound(); };
    right.querySelector('.tw-same').onclick=()=>{ rnd=mulberry32(42); reset(); stats(); renderRound(); };
    right.querySelector('.tw-classic').onclick=(e)=>{ e.target.disabled=true; runClassic(); };
    try{ box.dispatchEvent(new CustomEvent('expert-artifact',{bubbles:true,detail:{widget:'widget_ps_l14_tilt_web',rule,minutes:t,attempts,drawdown:D,ruined,calm}})); }catch(e){}
  }

  // ── 8. режим «что если»: автопроигрыш классического финала ───────────────
  function runClassic(){
    reset(); classicRun=true; stats();
    const step = ()=>{
      if(D>=CAP0){ over=true; ruinMinute=t; draw(); const tr=right.querySelector('.tw-truth'); if(tr){ tr.className='tw-truth loss'; tr.innerHTML=`<b>Классический финал:</b> ноль на минуте ${t} после ${threads.length} удвоений. Все ${threads.length} монеты легли против — при 45/55 это случается в ${(Math.pow(0.55,threads.length)*100).toFixed(1)}% сессий.`; } return; }
      S*=2; t+=8; D=Math.min(CAP0,D+S); calm=Math.max(0,calm-14); pulse+=7;
      threads.push({angle: threads.length*2.399963+0.7, prog:0, win:false, amt:S, size:S, jx:0, jy:0});
      log.push(`мин ${t}: удвоил ${k(S)} → −${k(S)} · просадка ${k(D)}`);
      stats(); const tr=right.querySelector('.tw-truth'); if(tr){ tr.className='tw-truth loss'; tr.innerHTML=`<b>Шаг ${threads.length}:</b> ставка ${fmt(S)}, просадка ${fmt(D)}, натяжение ${((D*S)/1e6).toFixed(0)} млн.`; }
      later(step, 750);
    };
    later(step, 400);
  }

  // ── старт ────────────────────────────────────────────────────────────────
  reset(); size(); stats(); renderRound();
};
