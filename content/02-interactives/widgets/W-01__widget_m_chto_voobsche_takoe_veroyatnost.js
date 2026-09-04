/*
 * W-01 · widget_m_chto_voobsche_takoe_veroyatnost · М1 «Что вообще такое вероятность?»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что «50%» — это доля на длинной серии, а не исход ближайших бросков.
 *   Задание:  до старта угадай, сколько орлов будет в первых 10 бросках; затем доведи серию до 10 000
 *   Ага:      первые 10–20 бросков кривая скачет на ±20% (в дефолте — ровно «7 орлов из 10» из урока),
 *   Дефолты:  seed 42; первые 10 бросков = О О Р О О О Р Р О О (7 орлов, 70%) — числа урока М1; коридор ±5%.
 *   Артефакт: строка «первые 10 — N орлов (X%); после 10 000 — Y%; последний выход из коридора ±5% — бросок №K».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_chto_voobsche_takoe_veroyatnost'] = function(box){
  /* 0. чистим прошлый запуск */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expCleanup){ box._expCleanup.forEach(f=>{ try{ f(); }catch(e){} }); }
  box._expTimers = []; box._expRaf = null; box._expCleanup = [];
  let alive = true; box._expCleanup.push(()=>{ alive = false; });
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* канон урока: первые 10 бросков «О О Р О О О Р Р О О» = 7 орлов */
  const CANON = [1,1,0,1,1,1,0,0,1,1];
  const MAXN = 10000;
  const vrnd = mulberry32(777); // только для визуального шума (падение монет)

  box.innerHTML = `
  <div class="w1">
    <style>
      .w1{--num:var(--mono,#dfe6ff);background:linear-gradient(160deg,#040714,#0d1022);border:1px solid var(--line,#1f2545);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:100%;box-sizing:border-box}
      .w1 *{box-sizing:border-box}
      .w1-title{font-weight:700;font-size:16px}
      .w1-goal{color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
      .w1-task{margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.25);font-size:13px}
      .w1-pred{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
      .w1-pred button{min-width:30px;padding:4px 0;border-radius:6px;border:1px solid var(--line,#2a3160);background:transparent;color:var(--txt,#eef1ff);cursor:pointer;font-size:13px}
      .w1-pred button.on{background:var(--acc2,#06b6d4);color:#02121a;border-color:var(--acc2,#06b6d4);font-weight:700}
      .w1-pred button:disabled{opacity:.45;cursor:default}
      .w1-cv{width:100%}
      .w1 canvas{display:block;width:100%;border-radius:10px;background:rgba(255,255,255,.02)}
      .w1-hud{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}
      .w1-hud div{background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px;text-align:center}
      .w1-hud b{display:block;font-size:17px;color:var(--num);font-variant-numeric:tabular-nums}
      .w1-hud span{font-size:11px;color:var(--mut,#9aa3c7)}
      .w1-ctrls{display:flex;flex-wrap:wrap;gap:6px}
      .w1-ctrls button{padding:7px 10px;border-radius:8px;border:1px solid var(--line,#2a3160);background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);cursor:pointer;font-size:13px}
      .w1-ctrls button.pri{background:var(--acc2,#06b6d4);border-color:var(--acc2,#06b6d4);color:#02121a;font-weight:600}
      .w1-ctrls button:disabled{opacity:.4;cursor:default}
      .w1-aha{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#2a3160);font-size:13px;color:var(--mut,#9aa3c7)}
      .w1-aha.hot{border-color:var(--ok,#22c55e);color:var(--txt,#eef1ff);background:rgba(34,197,94,.08)}
      .w1-art{margin-top:10px}
      .w1-art label{font-size:11px;color:var(--mut,#9aa3c7);text-transform:uppercase;letter-spacing:.04em}
      .w1-art textarea{width:100%;height:66px;margin-top:4px;resize:vertical;border-radius:8px;border:1px solid var(--line,#2a3160);background:rgba(0,0,0,.25);color:var(--num);font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:8px}
      @media (max-width:420px){.w1-hud{grid-template-columns:repeat(2,1fr)}}
    </style>
    <div class="w1-title">Монетный двор: что на самом деле значит «50%»</div>
    <div class="w1-goal">Цель: увидеть, что вероятность — это доля на длинной серии, а не предсказание ближайшего броска.</div>
    <div class="w1-task">
      <div class="w1-tt">Задание 1. Сколько орлов выпадет в первых 10 бросках? Выбери число и жми «×1».</div>
      <div class="w1-pred"></div>
    </div>
    <div class="w1-cv"><canvas></canvas></div>
    <div class="w1-hud">
      <div><b data-h="n">0</b><span>бросков</span></div>
      <div><b data-h="h">0</b><span>орлов</span></div>
      <div><b data-h="f">—</b><span>доля орлов</span></div>
      <div><b data-h="e">—</b><span>последний выход из 45–55%</span></div>
    </div>
    <div class="w1-ctrls">
      <button class="pri" data-add="1">×1 бросок</button>
      <button data-add="10">×10</button>
      <button data-add="100">×100</button>
      <button data-add="1000">×1000</button>
      <button data-add="all">до 10 000</button>
      <button data-act="new">Новый раунд</button>
      <button data-act="reset">Сброс (сценарий урока)</button>
    </div>
    <div class="w1-aha">Серия ещё не началась. Монета честная: 50 на 50 — но это ничего не говорит о следующем броске.</div>
    <div class="w1-art"><label>Артефакт для журнала</label><textarea readonly></textarea></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const css = getComputedStyle(box);
  const col = (v, d) => (css.getPropertyValue(v).trim() || d);
  const C = { acc: col('--acc2','#06b6d4'), ok: col('--ok','#22c55e'), bad: col('--bad','#ef4444'),
              warn: col('--warn','#eab308'), mut: col('--mut','#9aa3c7'), txt: col('--txt','#eef1ff'),
              line: col('--line','#2a3160') };

  const cv = $('canvas'), ctx = cv.getContext('2d'), wrap = $('.w1-cv');
  const hud = { n: $('[data-h=n]'), h: $('[data-h=h]'), f: $('[data-h=f]'), e: $('[data-h=e]') };
  const aha = $('.w1-aha'), art = $('textarea'), predBox = $('.w1-pred'), taskText = $('.w1-tt');

  /* ---- состояние сценария ---- */
  let rnd, useCanon, flips, heads, freq, lastExit, prediction, pending, carry, particles, dirty;
  function reset(seed, canon){
    rnd = mulberry32(seed); useCanon = canon;
    flips = []; heads = 0; freq = []; lastExit = 0; prediction = null;
    pending = 0; carry = 0; particles = []; dirty = true;
    predBox.querySelectorAll('button').forEach(b=>{ b.disabled = false; b.classList.remove('on'); });
    taskText.textContent = canon
      ? 'Задание 1. Сколько орлов выпадет в первых 10 бросках? Выбери число и жми «×1».'
      : 'Новый раунд, честная монета с другим seed. Твой прогноз на первые 10 бросков?';
    updateHud();
  }
  function nextFlip(){
    const i = flips.length;
    const r = (useCanon && i < 10) ? CANON[i] : (rnd() < 0.5 ? 1 : 0);
    flips.push(r); if(r) heads++;
    const f = heads / flips.length * 100;
    freq.push(f);
    if(Math.abs(f - 50) > 5) lastExit = flips.length;
    return r;
  }

  /* ---- прогноз ---- */
  for(let k=0;k<=10;k++){
    const b = document.createElement('button'); b.textContent = k;
    b.addEventListener('click', ()=>{
      if(flips.length) return;
      prediction = k;
      predBox.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
    });
    predBox.appendChild(b);
  }

  /* ---- размеры ---- */
  let W = 320, CH = 360, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function fit(){
    W = Math.max(280, wrap.clientWidth || 320); CH = W < 420 ? 340 : 380;
    cv.width = Math.round(W*dpr); cv.height = Math.round(CH*dpr); cv.style.height = CH+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0); dirty = true;
  }
  window.addEventListener('resize', fit);
  box._expCleanup.push(()=>window.removeEventListener('resize', fit));
  if(window.ResizeObserver){ const ro = new ResizeObserver(fit); ro.observe(wrap); box._expCleanup.push(()=>ro.disconnect()); }

  /* ---- HUD, «ага», артефакт ---- */
  function updateHud(){
    const N = flips.length;
    hud.n.textContent = N; hud.h.textContent = heads;
    hud.f.textContent = N ? (heads/N*100).toFixed(N >= 1000 ? 2 : 1) + '%' : '—';
    hud.e.textContent = N < 30 ? '—' : (lastExit < N ? '№' + lastExit : 'ещё гуляет');
    let text, hot = false;
    if(N === 0){ text = 'Серия ещё не началась. Монета честная: 50 на 50 — но это ничего не говорит о следующем броске.'; }
    else if(N < 10){ text = `Бросок ${N}: доля ${(heads/N*100).toFixed(0)}%. На таком отрезке она может быть где угодно — это ещё не «вероятность», это погода.`; }
    else if(N < 1000){
      const h10 = flips.slice(0,10).reduce((a,b)=>a+b,0);
      const pr = prediction === null ? 'Прогноз ты не сделал — в следующий раз попробуй. ' :
        (prediction === h10 ? `Ты угадал (${prediction}) — но это удача, а не знание. ` : `Ты ставил на ${prediction}, выпало ${h10}. `);
      text = `Первые 10 бросков: ${h10} орлов (${h10*10}%). ${pr}Отклонение на ±20% от 50% при 10 бросках — норма, а не поломка монеты. Доводи до 10 000.`;
    } else {
      const f = heads/N*100;
      const settled = lastExit <= N*0.7;
      hot = settled;
      text = settled
        ? `Ага-момент: после броска №${lastExit} доля больше ни разу не выходила из коридора 45–55%. Сейчас ${f.toFixed(2)}%. Вот что означает «50%»: не исход, а доля, к которой липнет длинная серия. Короткие качели в начале никуда не делись — они просто утонули в N.`
        : `Уже ${N} бросков, доля ${f.toFixed(2)}%. Кривая ещё касалась границы коридора недавно (№${lastExit}) — дай ей ещё несколько тысяч.`;
    }
    aha.textContent = text; aha.classList.toggle('hot', hot);
    const h10 = flips.slice(0,10).reduce((a,b)=>a+b,0);
    art.value = N === 0 ? 'Монетный двор · запись появится после первых бросков.' :
      `Монетный двор (М1) · ${useCanon ? 'сценарий урока' : 'новый раунд'}\n` +
      `первые 10 бросков: ${Math.min(N,10)>=10 ? h10 + ' орлов (' + h10*10 + '%)' : 'не завершены'}${prediction!==null ? ' · мой прогноз: ' + prediction : ''}\n` +
      `после ${N} бросков: ${(heads/N*100).toFixed(2)}% · последний выход из коридора ±5%: ${N<30 ? '—' : (lastExit<N ? 'бросок №'+lastExit : 'ещё гуляет')}`;
  }

  /* ---- рисование ---- */
  function spawn(side){
    const x = W * (side ? 0.3 : 0.7) + (vrnd()-0.5)*40;
    particles.push({ x: x, y: -10, vy: 2 + vrnd()*2, side: side });
  }
  function drawCoins(topH){
    const groundY = topH - 16, maxBar = topH - 70;
    const tails = flips.length - heads, maxC = Math.max(1, heads, tails);
    const bw = Math.min(72, W*0.18);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, groundY+.5); ctx.lineTo(W-12, groundY+.5); ctx.stroke();
    const sides = [{x:W*0.3, c:heads, color:C.acc, name:'Орёл'}, {x:W*0.7, c:tails, color:C.warn, name:'Решка'}];
    const barH = [heads, tails].map(c=>c/maxC*maxBar);
    sides.forEach((s,i)=>{
      const h = barH[i];
      ctx.fillStyle = s.color; ctx.globalAlpha = .85;
      ctx.fillRect(s.x-bw/2, groundY-h, bw, h);
      ctx.globalAlpha = .35; ctx.fillStyle = '#000';
      for(let y=groundY-4; y>groundY-h; y-=5) ctx.fillRect(s.x-bw/2, y, bw, 1.5); // рёбра монет в стопке
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.txt; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`${s.name} ${s.c}`, s.x, groundY - h - 20);
      ctx.fillStyle = C.mut; ctx.font = '11px system-ui';
      ctx.fillText(flips.length ? (s.c/flips.length*100).toFixed(0)+'%' : '', s.x, groundY - h - 7);
    });
    ctx.fillStyle = C.mut; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('честная монета · 50 / 50', 12, 14);
    /* падающие монеты */
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i]; p.vy += 0.9; p.y += p.vy;
      const target = groundY - barH[p.side ? 0 : 1] - 8;
      if(p.y >= target){ particles.splice(i,1); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI*2);
      ctx.fillStyle = p.side ? C.acc : C.warn; ctx.fill();
      ctx.fillStyle = '#02121a'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(p.side ? 'О' : 'Р', p.x, p.y+4);
    }
  }
  function drawChart(x0, y0, cw, ch){
    const px = n => x0 + Math.log10(n)/4*cw;
    const py = f => y0 + (1 - f/100)*ch;
    const N = flips.length, settled = N >= 1000 && lastExit <= N*0.7;
    /* коридор ±5% */
    ctx.fillStyle = 'rgba(34,197,94,.10)'; ctx.fillRect(x0, py(55), cw, py(45)-py(55));
    /* сетка */
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.mut; ctx.font = '11px system-ui';
    [0,25,50,75,100].forEach(v=>{
      if(v===50) return;
      ctx.beginPath(); ctx.moveTo(x0, py(v)+.5); ctx.lineTo(x0+cw, py(v)+.5); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(v+'%', x0-6, py(v)+4);
    });
    ctx.textAlign = 'right'; ctx.fillText('50%', x0-6, py(50)+4);
    [[1,'1'],[10,'10'],[100,'100'],[1000,'1 000'],[10000,'10 000']].forEach(t=>{
      ctx.beginPath(); ctx.moveTo(px(t[0])+.5, y0); ctx.lineTo(px(t[0])+.5, y0+ch); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(t[1], px(t[0]), y0+ch+14);
    });
    ctx.fillStyle = C.mut; ctx.textAlign = 'left'; ctx.fillText('бросков (лог. шкала)', x0, y0-6);
    /* линия 50% — светится, когда серия «прилипла» */
    ctx.save();
    ctx.setLineDash([6,4]); ctx.strokeStyle = C.ok; ctx.lineWidth = settled ? 2.2 : 1.2;
    if(settled){ ctx.shadowColor = C.ok; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.moveTo(x0, py(50)); ctx.lineTo(x0+cw, py(50)); ctx.stroke();
    ctx.restore();
    if(N === 0){
      ctx.fillStyle = C.mut; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Нажми «×1», чтобы бросить первую монету', x0+cw/2, y0+ch/2);
      return;
    }
    /* кривая доли */
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    let lastX = -9;
    for(let n=1;n<=N;n++){
      const x = px(n);
      if(n < N && x - lastX < 0.6) continue;
      lastX = x;
      if(n===1) ctx.moveTo(x, py(freq[0])); else ctx.lineTo(x, py(freq[n-1]));
    }
    ctx.stroke();
    const cx = px(N), cy = py(freq[N-1]);
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI*2); ctx.fillStyle = C.acc; ctx.fill();
    ctx.fillStyle = C.txt; ctx.font = '700 12px system-ui';
    ctx.textAlign = cx > x0+cw-60 ? 'right' : 'left';
    ctx.fillText(freq[N-1].toFixed(N>=1000?2:1)+'%', cx + (ctx.textAlign==='left'?8:-8), cy - 8);
    if(N >= 30 && lastExit < N){ // маркер последнего выхода из коридора
      ctx.strokeStyle = C.warn; ctx.setLineDash([3,3]); ctx.beginPath();
      ctx.moveTo(px(lastExit), y0); ctx.lineTo(px(lastExit), y0+ch); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.warn; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('№'+lastExit, px(lastExit)+4, y0+12);
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,CH);
    const topH = Math.round(CH*0.42);
    drawCoins(topH);
    drawChart(44, topH+18, W-56, CH-topH-42);
  }

  /* ---- главный цикл ---- */
  let lastT = 0;
  function frame(ts){
    if(!alive) return;
    const dt = Math.min(0.05, (ts - lastT)/1000 || 0.016); lastT = ts;
    if(pending > 0){
      const rate = pending <= 10 ? 3 : pending <= 100 ? 45 : pending <= 1000 ? 700 : 5000;
      carry += dt*rate;
      let k = Math.min(pending, Math.floor(carry)); carry -= k; pending -= k;
      const step = Math.max(1, Math.ceil(k/12));
      for(let j=0;j<k;j++){ const r = nextFlip(); if(particles.length < 60 && j % step === 0) spawn(r); }
      if(k > 0){ updateHud(); dirty = true; }
    }
    if(dirty || particles.length){ draw(); dirty = false; }
    raf(frame);
  }

  /* ---- управление ---- */
  box.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click', ()=>{
    const room = MAXN - flips.length - pending;
    const n = b.dataset.add === 'all' ? room : Math.min(room, +b.dataset.add);
    if(n <= 0) return;
    pending += n;
    predBox.querySelectorAll('button').forEach(x=>x.disabled = true);
  }));
  $('[data-act=new]').addEventListener('click', ()=>reset(Date.now(), false));
  $('[data-act=reset]').addEventListener('click', ()=>reset(42, true));

  reset(42, true); fit(); raf(frame);
};
