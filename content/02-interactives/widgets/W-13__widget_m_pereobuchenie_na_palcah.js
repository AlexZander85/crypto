/*
 * W-13 · widget_m_pereobuchenie_na_palcah · М41 «Переобучение» (v2 — канон, v1 в fable_viget.md L5493 отменена)
 * ПРИМЕЧАНИЕ: канон — вторая версия (L6463); первая (L5493) отменена
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_pereobuchenie_na_palcah'] = function(box){

  /* ---------- 0. чистка ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expRO = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf   = fn => { box._expRaf = requestAnimationFrame(fn); };

  /* ---------- 1. ГПСЧ + гауссов шум ---------- */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ---------- 2. стили ---------- */
  if(!document.getElementById('exp-w13-css')){
    const st = document.createElement('style'); st.id = 'exp-w13-css';
    st.textContent = `
.exp-w13{background:linear-gradient(180deg,#0d1022,#070a17);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:100%;overflow:hidden}
.exp-w13 *{box-sizing:border-box}
.exp-w13 .exp-title{font-weight:700;font-size:15px}
.exp-w13 .exp-sub{color:var(--mut,#9aa3c7);font-size:12.5px;margin-top:2px}
.exp-w13 .exp-task{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
.exp-w13 .exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:640px){.exp-w13 .exp-grid{grid-template-columns:1fr}}
.exp-w13 canvas{display:block;width:100%;height:260px;border-radius:10px;background:#040714}
.exp-w13 .exp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 8px}
.exp-w13 .exp-lab{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mut,#9aa3c7)}
.exp-w13 .exp-lab b{color:var(--txt,#eef1ff);font:700 16px var(--mono,ui-monospace,Menlo,monospace);min-width:26px;text-align:center}
.exp-w13 input[type=range]{accent-color:var(--acc2,#06b6d4);width:170px}
.exp-w13 button{cursor:pointer;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);border-radius:8px;padding:7px 11px;font:600 13px system-ui,sans-serif;transition:background .15s,transform .05s}
.exp-w13 button:hover:not(:disabled){background:rgba(255,255,255,.09)}
.exp-w13 button:active:not(:disabled){transform:translateY(1px)}
.exp-w13 button.exp-pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent}
.exp-w13 button.exp-on{border-color:var(--ok,#22c55e);box-shadow:0 0 0 2px rgba(34,197,94,.25)}
.exp-w13 .exp-stats{display:flex;flex-wrap:wrap;gap:6px 16px;padding:8px 10px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.03);font:12.5px var(--mono,ui-monospace,Menlo,monospace);transition:border-color .25s,background .25s}
.exp-w13 .exp-stats.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.10)}
.exp-w13 .exp-stats .exp-rule{width:100%;font:600 12.5px system-ui,sans-serif;color:var(--bad,#ef4444)}
.exp-w13 .exp-stats b{color:var(--txt,#eef1ff)}
.exp-w13 .exp-msg{margin-top:8px;min-height:20px;font-size:13px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.1))}
.exp-w13 .exp-msg.ok{border-color:var(--ok,#22c55e)} .exp-w13 .exp-msg.warn{border-color:var(--warn,#eab308)} .exp-w13 .exp-msg.bad{border-color:var(--bad,#ef4444)}
.exp-w13 .exp-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
.exp-w13 .exp-art pre{white-space:pre-wrap;word-break:break-word;margin:4px 0;padding:8px;border-radius:8px;background:#05070f;color:var(--txt,#eef1ff);font:12px/1.4 var(--mono,ui-monospace,Menlo,monospace)}
`;
    document.head.appendChild(st);
  }

  /* ---------- 3. данные и математика ---------- */
  const NTR = 24, NTE = 24, SIGMA = 0.25, DMAX = 12, NS = 161;
  const truth = x => 0.8*Math.sin(3*x) + 0.3*x;
  const XS = Array.from({length:NS}, (_,i) => -1 + 2*i/(NS-1));

  function makeData(seed){
    const rnd = mulberry32(seed);
    const gauss = () => { let u = 0, v = 0; while(u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    const tr = [], te = [];
    for(let i=0;i<NTR;i++){ const x = -1 + 2*(i+0.5)/NTR + (rnd()-0.5)*0.06; tr.push([x, truth(x) + SIGMA*gauss()]); }
    for(let i=0;i<NTE;i++){ const x = -1 + 2*rnd(); te.push([x, truth(x) + SIGMA*gauss()]); }
    return { tr, te };
  }
  // МНК через QR (модифицированный Грам–Шмидт) — устойчивее нормальных уравнений
  function polyfit(pts, d){
    const n = pts.length, m = d + 1, cols = [], Q = [], R = Array.from({length:m}, () => new Float64Array(m));
    for(let j=0;j<m;j++){ const c = new Float64Array(n); for(let i=0;i<n;i++) c[i] = Math.pow(pts[i][0], j); cols.push(c); }
    for(let j=0;j<m;j++){
      const v = cols[j];
      for(let k=0;k<j;k++){ const q = Q[k]; let dot = 0; for(let i=0;i<n;i++) dot += q[i]*v[i]; R[k][j] = dot; for(let i=0;i<n;i++) v[i] -= dot*q[i]; }
      let nrm = 0; for(let i=0;i<n;i++) nrm += v[i]*v[i]; nrm = Math.sqrt(nrm) || 1e-12; R[j][j] = nrm;
      const q = new Float64Array(n); for(let i=0;i<n;i++) q[i] = v[i]/nrm; Q.push(q);
    }
    const b = new Float64Array(m); for(let j=0;j<m;j++){ let s = 0; for(let i=0;i<n;i++) s += Q[j][i]*pts[i][1]; b[j] = s; }
    const c = new Float64Array(m); for(let j=m-1;j>=0;j--){ let s = b[j]; for(let k=j+1;k<m;k++) s -= R[j][k]*c[k]; c[j] = s/R[j][j]; }
    return c;
  }
  const evalPoly = (c, x) => { let y = 0; for(let j=c.length-1;j>=0;j--) y = y*x + c[j]; return y; };
  const mae = (c, pts) => pts.reduce((s,p) => s + Math.abs(evalPoly(c, p[0]) - p[1]), 0)/pts.length;

  const S = { seed:11, data:null, fits:null, best:1, deg:1, truthOn:false, solved:false, attempts:0, twelveSeen:false,
              curve:new Float64Array(NS), target:new Float64Array(NS), from:new Float64Array(NS), animT:1, lastTs:0 };
  function build(seed){
    S.seed = seed; S.data = makeData(seed); S.fits = [];
    for(let d=1; d<=DMAX; d++){ const c = polyfit(S.data.tr, d); S.fits.push({ d, c, tr: mae(c, S.data.tr), te: mae(c, S.data.te) }); }
    S.best = S.fits.reduce((b, f) => f.te < b.te ? f : b, S.fits[0]).d;
    S.solved = false; S.attempts = 0; S.twelveSeen = false;
  }
  build(11);
  const cur = () => S.fits[S.deg - 1];
  const gap = f => f.te / Math.max(f.tr, 1e-9);

  /* ---------- 4. разметка ---------- */
  box.innerHTML = `
<div class="exp-w13">
  <div class="exp-title">Переобучение на пальцах: полином против шума</div>
  <div class="exp-sub">24 точки обучения (●) и 24 точки теста (○) сгенерированы одной и той же закономерностью + случайный шум σ = 0,25. Модель видит только ●.</div>
  <div class="exp-task"><b>Задание 1.</b> Двигай ползунок степени и найди ту, при которой ошибка на <i>тесте</i> минимальна. Нажми «Проверить». <b>Задание 2.</b> Выкрути на 12 и посмотри на кривую между точками.</div>
  <div class="exp-grid">
    <canvas class="exp-fit"></canvas>
    <canvas class="exp-err"></canvas>
  </div>
  <div class="exp-row">
    <label class="exp-lab">степень полинома <input type="range" min="1" max="12" step="1" value="1"><b>1</b></label>
    <button data-act="check" class="exp-pri">Проверить: это минимум?</button>
    <button data-act="truth">Показать истину</button>
    <button data-act="round">Новый раунд</button>
  </div>
  <div class="exp-stats"></div>
  <div class="exp-msg"></div>
  <div class="exp-art">Артефакт (уйдёт в профиль):<pre></pre><button data-act="copy">Скопировать</button></div>
</div>`;

  const root = box.querySelector('.exp-w13');
  const cvF = root.querySelector('.exp-fit'), cvE = root.querySelector('.exp-err');
  const range = root.querySelector('input[type=range]'), degB = root.querySelector('.exp-lab b');
  const statsEl = root.querySelector('.exp-stats'), msgEl = root.querySelector('.exp-msg'), preEl = root.querySelector('pre');
  const truthBtn = root.querySelector('[data-act=truth]');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace', SANS = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const colors = () => {
    const cs = getComputedStyle(box), g = (v,f) => (cs.getPropertyValue(v)||'').trim() || f;
    return { txt:g('--txt','#eef1ff'), mut:g('--mut','#9aa3c7'), line:g('--line','rgba(255,255,255,.12)'),
             acc:g('--acc2','#06b6d4'), ok:g('--ok','#22c55e'), bad:g('--bad','#ef4444'), warn:g('--warn','#eab308') };
  };
  const f3 = v => v.toFixed(3).replace('.', ',');
  const say = (html, cls) => { msgEl.innerHTML = html; msgEl.className = 'exp-msg' + (cls ? ' '+cls : ''); };

  /* ---------- 5. кривая с плавным переходом ---------- */
  function setTarget(animate){
    const c = cur().c;
    for(let i=0;i<NS;i++){ S.from[i] = S.curve[i]; S.target[i] = evalPoly(c, XS[i]); }
    if(!animate){ S.curve.set(S.target); S.animT = 1; drawAll(); return; }
    S.animT = 0; S.lastTs = 0; raf(loop);
  }
  function loop(ts){
    const dt = S.lastTs ? Math.min(50, ts - S.lastTs) : 16; S.lastTs = ts;
    S.animT = Math.min(1, S.animT + dt/260);
    const e = 1 - Math.pow(1 - S.animT, 3);
    for(let i=0;i<NS;i++) S.curve[i] = S.from[i] + (S.target[i] - S.from[i])*e;
    drawAll();
    if(S.animT < 1) raf(loop); else box._expRaf = null;
  }

  /* ---------- 6. рисование ---------- */
  function prep(cv){
    const w = cv.clientWidth, h = cv.clientHeight;
    if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){ cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h); return { ctx, w, h };
  }
  function drawFit(C){
    const { ctx, w, h } = prep(cvF); if(!w) return;
    const L = 30, R = w - 8, T = 12, B = h - 22;
    const X = x => L + (x+1)/2*(R-L), Y = y => T + (2-y)/4*(B-T);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.mut; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    for(let v=-2; v<=2; v++){ ctx.globalAlpha = v===0 ? 1 : .5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(String(v), L-4, Y(v)+3); }
    ctx.textAlign = 'center'; [-1,-0.5,0,0.5,1].forEach(v => { ctx.globalAlpha=.5; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), B); ctx.stroke(); ctx.globalAlpha=1; ctx.fillText(String(v).replace('.',','), X(v), B+12); });
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, R-L, B-T); ctx.clip();
    if(S.truthOn){
      ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle = C.ok; ctx.lineWidth = 2; ctx.beginPath();
      XS.forEach((x,i) => { const px = X(x), py = Y(truth(x)); if(i) ctx.lineTo(px,py); else ctx.moveTo(px,py); });
      ctx.stroke(); ctx.restore();
    }
    const g = gap(cur());
    ctx.strokeStyle = g > 2 ? C.bad : C.txt; ctx.lineWidth = 2.2; ctx.beginPath();
    XS.forEach((x,i) => { const px = X(x), py = Y(S.curve[i]); if(i) ctx.lineTo(px,py); else ctx.moveTo(px,py); });
    ctx.stroke();
    ctx.restore();
    // точки
    S.data.te.forEach(p => { ctx.strokeStyle = C.warn; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4, 0, Math.PI*2); ctx.stroke(); });
    S.data.tr.forEach(p => { ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4, 0, Math.PI*2); ctx.fill(); });
    // подписи
    ctx.textAlign = 'left'; ctx.font = `700 12px ${SANS}`; ctx.fillStyle = C.txt; ctx.fillText(`степень ${S.deg}`, L+6, T+14);
    ctx.font = `10px ${SANS}`; let lx = L+6, ly = B-8;
    ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(lx+4, ly-3, 4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = C.mut; ctx.fillText('обучение', lx+12, ly); lx += 70;
    ctx.strokeStyle = C.warn; ctx.beginPath(); ctx.arc(lx+4, ly-3, 4, 0, Math.PI*2); ctx.stroke(); ctx.fillText('тест', lx+12, ly); lx += 44;
    ctx.fillStyle = C.txt; ctx.fillRect(lx, ly-4, 12, 2.5); ctx.fillStyle = C.mut; ctx.fillText('модель', lx+16, ly); lx += 60;
    if(S.truthOn){ ctx.fillStyle = C.ok; ctx.fillRect(lx, ly-4, 5, 2.5); ctx.fillRect(lx+8, ly-4, 5, 2.5); ctx.fillStyle = C.mut; ctx.fillText('истина', lx+16, ly); }
  }
  function drawErr(C){
    const { ctx, w, h } = prep(cvE); if(!w) return;
    const L = 36, R = w - 8, T = 16, B = h - 22;
    const all = S.fits.map(f => f.te).concat(S.fits.map(f => f.tr));
    const ymax = Math.max(0.6, Math.min(2.5, Math.max.apply(null, all)*1.1));
    const X = d => L + (d-1)/(DMAX-1)*(R-L), Y = v => T + (1 - Math.min(v, ymax)/ymax)*(B-T);
    const colw = (R-L)/(DMAX-1);
    // красные колонки: разрыв > 2×
    S.fits.forEach(f => { if(gap(f) > 2){ ctx.fillStyle = 'rgba(239,68,68,.09)'; ctx.fillRect(X(f.d)-colw/2, T, colw, B-T); } });
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.mut; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    for(let i=0;i<=4;i++){ const v = ymax*i/4; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(v.toFixed(2).replace('.',','), L-4, Y(v)+3); }
    ctx.textAlign = 'center'; for(let d=1; d<=DMAX; d++) ctx.fillText(String(d), X(d), B+12);
    // маркер текущей степени
    ctx.strokeStyle = C.txt; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(X(S.deg), T); ctx.lineTo(X(S.deg), B); ctx.stroke(); ctx.globalAlpha = 1;
    // кривые
    const line = (key, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      S.fits.forEach((f,i) => { const px = X(f.d), py = Y(f[key]); if(i) ctx.lineTo(px,py); else ctx.moveTo(px,py); });
      ctx.stroke();
      S.fits.forEach(f => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(f.d), Y(f[key]), f.d===S.deg ? 5 : 2.6, 0, Math.PI*2); ctx.fill();
        if(key==='te' && f.te > ymax){ ctx.fillStyle = C.bad; ctx.font = `9px ${SANS}`; ctx.fillText('↑ выше шкалы', X(f.d), T+10); } });
    };
    line('tr', C.acc); line('te', C.warn);
    // лучший — только после решения задания 1
    if(S.solved){ ctx.fillStyle = C.ok; ctx.beginPath(); ctx.moveTo(X(S.best), B+2); ctx.lineTo(X(S.best)-5, B+9); ctx.lineTo(X(S.best)+5, B+9); ctx.closePath(); ctx.fill(); }
    // заголовок и легенда
    ctx.textAlign = 'left'; ctx.font = `700 11px ${SANS}`; ctx.fillStyle = C.txt; ctx.fillText('MAE по степени', L+6, T-4);
    ctx.font = `10px ${SANS}`;
    ctx.fillStyle = C.acc; ctx.fillRect(L+100, T-10, 12, 2.5); ctx.fillStyle = C.mut; ctx.fillText('обучение', L+116, T-4);
    ctx.fillStyle = C.warn; ctx.fillRect(L+172, T-10, 12, 2.5); ctx.fillStyle = C.mut; ctx.fillText('тест', L+188, T-4);
  }
  function drawAll(){ const C = colors(); drawFit(C); drawErr(C); }

  /* ---------- 7. панель цифр, сообщения, артефакт ---------- */
  function renderStats(){
    const f = cur(), g = gap(f), red = g > 2;
    statsEl.className = 'exp-stats' + (red ? ' bad' : '');
    statsEl.innerHTML = `<span>степень <b>${f.d}</b></span><span>MAE обучение <b>${f3(f.tr)}</b></span><span>MAE тест <b>${f3(f.te)}</b></span><span>разрыв тест/обучение <b>×${g.toFixed(2).replace('.',',')}</b></span>`
      + (red ? `<span class="exp-rule">правило М41: разрыв &gt; 2× — упрощай. Модель уже описывает шум, а не закономерность.</span>` : '');
  }
  function artifact(){
    const f = cur();
    const a = { degree:f.d, mae_train:+f.tr.toFixed(4), mae_test:+f.te.toFixed(4), gap:+gap(f).toFixed(2), best_degree:S.best, seed:S.seed, attempts:S.attempts, solved:S.solved };
    preEl.textContent = JSON.stringify(a);
    return a;
  }
  const emit = () => { try{ box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail: Object.assign({ widget:'widget_m_pereobuchenie_na_palcah' }, artifact()) })); }catch(e){} };
  function refresh(animate){ degB.textContent = S.deg; renderStats(); artifact(); setTarget(animate); }

  /* ---------- 8. события ---------- */
  range.addEventListener('input', () => {
    S.deg = parseInt(range.value, 10) || 1; refresh(true);
    const f = cur();
    if(S.solved && S.deg === DMAX && !S.twelveSeen){
      S.twelveSeen = true;
      say(`<b>Это и есть «идеальный бэктест».</b> На обучении ошибка упала до ${f3(f.tr)}, на тесте выросла до ${f3(f.te)} (разрыв ×${gap(f).toFixed(1).replace('.',',')}). Кривая проходит почти через каждую точку ● и дико извивается между ними — она выучила шум конкретной выборки. Нажми «Показать истину», чтобы увидеть, что было на самом деле.`, 'bad');
      emit();
    }
  });
  root.querySelector('[data-act=check]').addEventListener('click', () => {
    S.attempts += 1; const f = cur();
    if(S.deg === S.best){
      S.solved = true; drawAll(); artifact(); emit();
      say(`<b>✓ Верно.</b> Степень ${f.d} даёт минимальную ошибку на тесте (MAE ${f3(f.te)}) с ${S.attempts}-й попытки. Заметь: ошибка на обучении продолжает падать и дальше — она бесполезна для выбора модели. <b>Задание 2:</b> выкрути ползунок на 12.`, 'ok');
    } else {
      const better = S.fits.some(x => x.te < f.te);
      say(`<b>✗ Пока нет.</b> У степени ${f.d} MAE на тесте ${f3(f.te)}${better ? ' — есть степень, где оранжевая кривая ниже. Ищи её низшую точку на правом графике, а не самую гладкую линию слева.' : '.'}`, 'warn');
      artifact();
    }
  });
  truthBtn.addEventListener('click', () => {
    S.truthOn = !S.truthOn; truthBtn.classList.toggle('exp-on', S.truthOn);
    truthBtn.textContent = S.truthOn ? 'Скрыть истину' : 'Показать истину'; drawAll();
    if(S.truthOn) say(`Под «змейкой» — гладкая закономерность <b>y = 0,8·sin(3x) + 0,3x</b>. Всё, что модель нарисовала сверх неё, — след шума σ = 0,25. Ни одна степень не может угадать шум теста: поэтому MAE на тесте никогда не упадёт ниже ≈ ${f3(0.8*SIGMA)} — это цена случайности, а не ошибка модели.`, 'ok');
  });
  root.querySelector('[data-act=round]').addEventListener('click', () => {
    build((Date.now() & 0x7fffffff) || 1); S.deg = 1; range.value = 1; S.truthOn = false; truthBtn.classList.remove('exp-on'); truthBtn.textContent = 'Показать истину';
    say(`Новый раунд (seed ${S.seed}): другой шум, та же закономерность. Найди степень с минимальной ошибкой на тесте — она может отличаться от прошлого раунда.`);
    refresh(false);
  });
  root.querySelector('[data-act=copy]').addEventListener('click', ev_ => {
    const btn = ev_.currentTarget, t = preEl.textContent;
    const done = () => { btn.textContent = 'Скопировано ✓'; later(() => { btn.textContent = 'Скопировать'; }, 1500); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(preEl); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); try{ document.execCommand('copy'); done(); }catch(e){} };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done, fallback); } else fallback();
  });

  /* ---------- 9. адаптив ---------- */
  const relayout = () => { const w = root.clientWidth || 360; const h = Math.max(200, Math.min(300, Math.round((w > 640 ? w/2 : w)*0.72))); cvF.style.height = h+'px'; cvE.style.height = h+'px'; drawAll(); };
  if(window.ResizeObserver){ box._expRO = new ResizeObserver(relayout); box._expRO.observe(root); }
  else { box._expResize = relayout; window.addEventListener('resize', relayout); }

  say('Двигай ползунок. Слева — как модель ложится на точки, справа — цена этого на тесте. Найди минимум оранжевой кривой и нажми «Проверить».');
  relayout(); refresh(false);
};
