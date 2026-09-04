/*
 * W-02 · widget_m_zakon_bolshih_chisel · М9/М10 «Закон больших чисел»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     почувствовать, как разброс среднего сжимается с ростом n — одна монета, три «линейки».
 *   Задание:  запусти поток бросков; каждые 10 / 100 / 1000 бросков закрывается блок, и его доля орлов
 *   Ага:      три дорожки одной и той же монеты: облако ±30% → полоса ±10% → нитка ±3%. Каждый шаг ×10
 *   Дефолты:  честная монета p = 50%; переключатель «стратегия 55%» — числа из урока М10
 *   Артефакт: «ЗБЧ: p=50%, N=30 000; коридор 95% блоков: n=10 → 20–80%; n=100 → 40–60%; n=1000 → 47–53%».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_zakon_bolshih_chisel'] = function(box){
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

  const SIZES = [10, 100, 1000];
  const SPEEDS = [10, 100, 1000, 10000];   // бросков в секунду
  const MAX_FLIPS = 200000;

  box.innerHTML = `
  <div class="w2">
    <style>
      .w2{--num:var(--mono,#dfe6ff);background:linear-gradient(160deg,#040714,#0d1022);border:1px solid var(--line,#1f2545);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:100%;box-sizing:border-box}
      .w2 *{box-sizing:border-box}
      .w2-title{font-weight:700;font-size:16px}
      .w2-goal{color:var(--mut,#9aa3c7);font-size:13px;margin-top:2px}
      .w2-task{margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.25);font-size:13px}
      .w2-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
      .w2 button{padding:7px 10px;border-radius:8px;border:1px solid var(--line,#2a3160);background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);cursor:pointer;font-size:13px}
      .w2 button.pri{background:var(--acc2,#06b6d4);border-color:var(--acc2,#06b6d4);color:#02121a;font-weight:600}
      .w2 button.on{border-color:var(--acc2,#06b6d4);color:var(--acc2,#06b6d4)}
      .w2 button:disabled{opacity:.45;cursor:default}
      .w2-lbl{font-size:12px;color:var(--mut,#9aa3c7);margin-right:2px}
      .w2-cv{width:100%}
      .w2 canvas{display:block;width:100%;border-radius:10px;background:rgba(255,255,255,.02)}
      .w2-tbl{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
      .w2-tbl th{color:var(--mut,#9aa3c7);font-weight:500;text-align:left;padding:4px 6px;border-bottom:1px solid var(--line,#2a3160)}
      .w2-tbl td{padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--num);font-variant-numeric:tabular-nums}
      .w2-tbl td:first-child{color:var(--txt,#eef1ff);font-weight:600}
      .w2-quiz{display:none;margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--warn,#eab308);background:rgba(234,179,8,.07);font-size:13px}
      .w2-quiz.show{display:block}
      .w2-quiz .w2-opts{display:grid;gap:6px;margin-top:8px}
      .w2-quiz .w2-opts button{text-align:left;white-space:normal;line-height:1.35}
      .w2-quiz .w2-opts button.good{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.12)}
      .w2-quiz .w2-opts button.badc{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.12)}
      .w2-aha{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#2a3160);font-size:13px;color:var(--mut,#9aa3c7)}
      .w2-aha.hot{border-color:var(--ok,#22c55e);color:var(--txt,#eef1ff);background:rgba(34,197,94,.08)}
      .w2-art{margin-top:10px}
      .w2-art label{font-size:11px;color:var(--mut,#9aa3c7);text-transform:uppercase;letter-spacing:.04em}
      .w2-art textarea{width:100%;height:60px;margin-top:4px;resize:vertical;border-radius:8px;border:1px solid var(--line,#2a3160);background:rgba(0,0,0,.25);color:var(--num);font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:8px}
    </style>
    <div class="w2-title">Одна монета — три линейки: как сжимается разброс</div>
    <div class="w2-goal">Цель: увидеть, что среднее по 1000 бросков стоит как вкопанное там, где среднее по 10 прыгает на ±30%.</div>
    <div class="w2-task">Задание. Запусти поток. Каждые 10 / 100 / 1000 бросков закрывается блок, и его доля орлов ложится точкой в свою дорожку. Дождись хотя бы 5 блоков по 1000 и запиши коридор, в который попадают 95% блоков, для каждого n.</div>
    <div class="w2-row">
      <span class="w2-lbl">Монета:</span>
      <button data-p="0.5" class="on">честная 50%</button>
      <button data-p="0.55">стратегия 55%</button>
      <span class="w2-lbl" style="margin-left:8px">Скорость:</span>
      <button data-sp="0" class="on">×1</button><button data-sp="1">×10</button><button data-sp="2">×100</button><button data-sp="3">×1000</button>
    </div>
    <div class="w2-row">
      <button class="pri" data-act="play">▶ Пуск</button>
      <button data-act="step">Шаг (1 бросок)</button>
      <button data-act="bulk">+30 000 сразу</button>
      <button data-act="new">Новый раунд</button>
      <button data-act="reset">Сброс</button>
    </div>
    <div class="w2-cv"><canvas></canvas></div>
    <table class="w2-tbl"><thead><tr><th>блок n</th><th>блоков</th><th>факт: 95% блоков</th><th>теория ±2σ</th><th>ширина</th></tr></thead><tbody></tbody></table>
    <div class="w2-quiz">
      <div>Задание 2. Твой бот показал <b>70% побед на первых 10 сделках</b> при заявленных 55%. Что это значит?</div>
      <div class="w2-opts">
        <button data-q="0">Стратегия сильнее, чем заявлено, — можно увеличить размер</button>
        <button data-q="1">Ничего не доказано: для n=10 это внутри обычного разброса (посмотри на верхнюю дорожку)</button>
        <button data-q="2">Бот сломался и завышает результат</button>
      </div>
      <div class="w2-qx" style="margin-top:8px;color:var(--mut,#9aa3c7)"></div>
    </div>
    <div class="w2-aha">Пока нет ни одного закрытого блока. Нажми «Пуск» и смотри на верхнюю дорожку: там точки появятся первыми.</div>
    <div class="w2-art"><label>Артефакт для журнала</label><textarea readonly></textarea></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const css = getComputedStyle(box);
  const col = (v, d) => (css.getPropertyValue(v).trim() || d);
  const C = { acc: col('--acc2','#06b6d4'), ok: col('--ok','#22c55e'), bad: col('--bad','#ef4444'),
              warn: col('--warn','#eab308'), mut: col('--mut','#9aa3c7'), txt: col('--txt','#eef1ff'), line: col('--line','#2a3160') };
  const cv = $('canvas'), ctx = cv.getContext('2d'), wrap = $('.w2-cv');
  const tbody = $('tbody'), aha = $('.w2-aha'), art = $('textarea'), quiz = $('.w2-quiz'), qx = $('.w2-qx');
  const playBtn = $('[data-act=play]');

  /* ---- состояние ---- */
  let rnd, p = 0.5, seed = 42, speedIdx = 0, playing = false, total = 0, last = 1, coinAngle = 0;
  let tracks, carry = 0, dirty = true, ahaShown = false, quizDone = false;
  function reset(newSeed){
    if(newSeed !== undefined) seed = newSeed;
    rnd = mulberry32(seed); total = 0; carry = 0; playing = false; ahaShown = false; quizDone = false;
    tracks = SIZES.map(n=>({ n: n, cur: 0, curHeads: 0, blocks: [], all: 0 }));
    playBtn.textContent = '▶ Пуск';
    quiz.classList.remove('show'); qx.textContent = '';
    quiz.querySelectorAll('button').forEach(b=>{ b.disabled = false; b.classList.remove('good','badc'); });
    dirty = true; updateStats();
  }
  function flip(){
    const r = rnd() < p ? 1 : 0; last = r; total++;
    for(const t of tracks){
      t.cur++; t.curHeads += r;
      if(t.cur === t.n){
        t.blocks.push(t.curHeads / t.n * 100); t.all++;
        if(t.blocks.length > 500) t.blocks.shift();
        t.cur = 0; t.curHeads = 0;
      }
    }
  }
  const sigma = n => Math.sqrt(p*(1-p)/n)*100;
  function pct(arr, q){ const a = arr.slice().sort((x,y)=>x-y); if(!a.length) return NaN; const i = Math.min(a.length-1, Math.max(0, Math.round((a.length-1)*q))); return a[i]; }

  /* ---- статистика / тексты ---- */
  function updateStats(){
    let rows = '', artLines = [];
    tracks.forEach(t=>{
      const s2 = 2*sigma(t.n), enough = t.blocks.length >= 20;
      const lo = enough ? pct(t.blocks, .025) : NaN, hi = enough ? pct(t.blocks, .975) : NaN;
      rows += `<tr><td>${t.n}</td><td>${t.all}</td><td>${enough ? lo.toFixed(t.n>=1000?1:0)+' – '+hi.toFixed(t.n>=1000?1:0)+'%' : (t.all? 'мало блоков (нужно 20+)' : '—')}</td>` +
              `<td>${(p*100).toFixed(0)}% ± ${s2.toFixed(1)}</td><td>${enough ? '±'+((hi-lo)/2).toFixed(1) : '—'}</td></tr>`;
      artLines.push(`n=${t.n} → ${enough ? lo.toFixed(t.n>=1000?1:0)+'–'+hi.toFixed(t.n>=1000?1:0)+'%' : 'мало данных'} (теория ±${s2.toFixed(1)})`);
    });
    tbody.innerHTML = rows;
    const t3 = tracks[2];
    let text, hot = false;
    if(t3.all === 0){
      text = total === 0 ? 'Пока нет ни одного закрытого блока. Нажми «Пуск» и смотри на верхнюю дорожку: там точки появятся первыми.'
           : `Бросков: ${total}. Верхняя дорожка (n=10) уже выглядит как облако, средняя (n=100) — как полоса. Дождись первого блока по 1000: до него ${1000 - t3.cur} бросков.`;
    } else if(t3.all < 5){
      text = `Первые блоки по 1000: ${t3.blocks.map(v=>v.toFixed(1)+'%').join(', ')}. Сравни с верхней дорожкой, где та же монета выдаёт и 20%, и 80%.`;
    } else {
      hot = true; ahaShown = true;
      text = `Ага-момент: та же самая монета, тот же поток бросков — а коридор сжимается ±${(2*sigma(10)).toFixed(0)}% → ±${(2*sigma(100)).toFixed(0)}% → ±${(2*sigma(1000)).toFixed(1)}%. Каждый шаг ×10 по n сжимает разброс в √10 ≈ 3,2 раза. Поэтому «70% на 10 сделках» и «55% на 1000» — числа разного веса.`;
      if(!quizDone) quiz.classList.add('show');
    }
    aha.textContent = text; aha.classList.toggle('hot', hot);
    art.value = `ЗБЧ (М10) · монета p=${(p*100).toFixed(0)}% · N=${total} бросков\nкоридор 95% блоков: ${artLines.join(' · ')}`;
  }

  /* ---- размеры ---- */
  let W = 320, CH = 340, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function fit(){
    W = Math.max(280, wrap.clientWidth || 320);
    cv.width = Math.round(W*dpr); cv.height = Math.round(CH*dpr); cv.style.height = CH+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0); dirty = true;
  }
  window.addEventListener('resize', fit);
  box._expCleanup.push(()=>window.removeEventListener('resize', fit));
  if(window.ResizeObserver){ const ro = new ResizeObserver(fit); ro.observe(wrap); box._expCleanup.push(()=>ro.disconnect()); }

  /* ---- рисование ---- */
  function draw(){
    ctx.clearRect(0,0,W,CH);
    /* монета сверху */
    const cy = 22;
    ctx.save(); ctx.translate(46, cy); ctx.scale(Math.max(0.08, Math.abs(Math.cos(coinAngle))), 1);
    ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fillStyle = last ? C.acc : C.warn; ctx.fill(); ctx.restore();
    ctx.fillStyle = C.txt; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(last ? 'О' : 'Р', 46, cy+4);
    ctx.textAlign = 'left'; ctx.fillStyle = C.mut; ctx.font = '12px system-ui';
    ctx.fillText(`бросков: ${total} · последний: ${last ? 'орёл' : 'решка'} · p = ${(p*100).toFixed(0)}%`, 70, cy+4);
    /* три дорожки */
    const laneTop = 48, laneGap = 8, laneH = (CH - laneTop - 8 - laneGap*2) / 3;
    const xL = 58, xR = W - 40, stripW = xR - xL;
    tracks.forEach((t, i)=>{
      const y0 = laneTop + i*(laneH+laneGap), py = f => y0 + (1 - f/100)*laneH;
      ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fillRect(xL, y0, stripW, laneH);
      /* теоретический коридор ±2σ */
      const s2 = 2*sigma(t.n);
      ctx.fillStyle = 'rgba(34,197,94,.13)'; ctx.fillRect(xL, py(p*100+s2), stripW, py(p*100-s2)-py(p*100+s2));
      ctx.setLineDash([5,4]); ctx.strokeStyle = C.ok; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xL, py(p*100)); ctx.lineTo(xR, py(p*100)); ctx.stroke(); ctx.setLineDash([]);
      /* подписи */
      ctx.fillStyle = C.txt; ctx.font = '700 13px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('n = ' + t.n, 6, y0 + 16);
      ctx.fillStyle = C.mut; ctx.font = '10px system-ui';
      ctx.fillText('100%', 6, y0 + 32); ctx.fillText('0%', 6, y0 + laneH - 2);
      ctx.fillText(`±${s2.toFixed(t.n>=1000?1:0)}`, xL + 4, py(p*100+s2) - 3);
      /* точки блоков: последние, влезающие в ширину */
      const step = 7, K = Math.floor(stripW/step), start = Math.max(0, t.blocks.length - K);
      for(let j=start;j<t.blocks.length;j++){
        const v = t.blocks[j], x = xL + (j-start)*step + 3, inside = Math.abs(v - p*100) <= s2;
        ctx.beginPath(); ctx.arc(x, py(v), 2.6, 0, Math.PI*2);
        ctx.fillStyle = inside ? C.acc : C.warn; ctx.fill();
      }
      /* прогресс текущего блока */
      const barX = xR + 10, frac = t.cur / t.n;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(barX, y0, 16, laneH);
      ctx.fillStyle = C.acc; ctx.fillRect(barX, y0 + laneH*(1-frac), 16, laneH*frac);
      ctx.fillStyle = C.mut; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(t.cur, barX+8, y0 - 3);
      if(t.all === 0){
        ctx.fillStyle = C.mut; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`первый блок закроется через ${t.n - t.cur} бросков`, xL + stripW/2, y0 + laneH/2 + 4);
      }
    });
  }

  /* ---- цикл ---- */
  let lastT = 0, lastStat = 0;
  function frame(ts){
    if(!alive) return;
    const dt = Math.min(0.05, (ts - lastT)/1000 || 0.016); lastT = ts;
    if(playing && total < MAX_FLIPS){
      carry += dt*SPEEDS[speedIdx];
      let k = Math.floor(carry); carry -= k;
      for(let j=0;j<k && total<MAX_FLIPS;j++) flip();
      if(k){ coinAngle += dt*Math.min(30, 4*Math.sqrt(k)); dirty = true; }
      if(ts - lastStat > 250){ updateStats(); lastStat = ts; }
      if(total >= MAX_FLIPS){ playing = false; playBtn.textContent = '▶ Пуск'; updateStats(); }
    }
    if(dirty){ draw(); dirty = false; }
    raf(frame);
  }

  /* ---- управление ---- */
  box.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click', ()=>{
    p = +b.dataset.p; box.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('on', x===b));
    reset();
  }));
  box.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click', ()=>{
    speedIdx = +b.dataset.sp; box.querySelectorAll('[data-sp]').forEach(x=>x.classList.toggle('on', x===b));
  }));
  playBtn.addEventListener('click', ()=>{ playing = !playing; playBtn.textContent = playing ? '❚❚ Пауза' : '▶ Пуск'; });
  $('[data-act=step]').addEventListener('click', ()=>{ flip(); coinAngle += 0.6; dirty = true; updateStats(); });
  $('[data-act=bulk]').addEventListener('click', ()=>{ for(let j=0;j<30000 && total<MAX_FLIPS;j++) flip(); dirty = true; updateStats(); });
  $('[data-act=new]').addEventListener('click', ()=>reset(Date.now()));
  $('[data-act=reset]').addEventListener('click', ()=>reset(42));
  quiz.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click', ()=>{
    quizDone = true;
    const ok = b.dataset.q === '1';
    quiz.querySelectorAll('[data-q]').forEach(x=>{ x.disabled = true; if(x.dataset.q==='1') x.classList.add('good'); });
    if(!ok) b.classList.add('badc');
    const s10 = 2*Math.sqrt(0.55*0.45/10)*100;
    qx.textContent = (ok ? 'Верно. ' : 'Нет. ') +
      `При p=55% и n=10 коридор ±2σ — это ±${s10.toFixed(0)}%, то есть 24–86%. «70%» лежит внутри: вывод «стратегия лучше» так же необоснован, как и «бот сломался». Судить можно по дорожке n=1000 — там коридор ±${(2*Math.sqrt(0.55*0.45/1000)*100).toFixed(1)}%.`;
  }));

  reset(42); fit(); raf(frame);
};
