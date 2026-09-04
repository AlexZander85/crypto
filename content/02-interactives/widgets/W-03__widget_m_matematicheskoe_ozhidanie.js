/*
 * W-03 · widget_m_matematicheskoe_ozhidanie · М4/М6 «Матожидание» (v2 — канон, v1 в fable_viget.md L5019 отменена)
 * ПРИМЕЧАНИЕ: канон — вторая версия (L6072); первая (L5019) отменена
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_m_matematicheskoe_ozhidanie'] = function(box){

  /* ---------- 0. чистка прошлого запуска ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expRO = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf   = fn => { box._expRaf = requestAnimationFrame(fn); };

  /* ---------- 1. детерминированный ГПСЧ ---------- */
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ---------- 2. стили (один раз на страницу) ---------- */
  if(!document.getElementById('exp-w03-css')){
    const st = document.createElement('style'); st.id = 'exp-w03-css';
    st.textContent = `
.exp-w03{background:linear-gradient(180deg,#0d1022,#070a17);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:100%;overflow:hidden}
.exp-w03 *{box-sizing:border-box}
.exp-w03 .exp-title{font-weight:700;font-size:15px}
.exp-w03 .exp-sub{color:var(--mut,#9aa3c7);font-size:12.5px;margin-top:2px}
.exp-w03 .exp-task{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
.exp-w03 .exp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.exp-w03 .exp-row>span{color:var(--mut,#9aa3c7);font-size:13px}
.exp-w03 button{cursor:pointer;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);border-radius:8px;padding:7px 11px;font:600 13px system-ui,sans-serif;transition:background .15s,transform .05s}
.exp-w03 button:hover:not(:disabled){background:rgba(255,255,255,.09)}
.exp-w03 button:active:not(:disabled){transform:translateY(1px)}
.exp-w03 button:disabled{opacity:.4;cursor:not-allowed}
.exp-w03 button.exp-pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent}
.exp-w03 button.exp-on{border-color:var(--acc2,#06b6d4);box-shadow:0 0 0 2px rgba(6,182,212,.25)}
.exp-w03 canvas{display:block;width:100%;height:440px;border-radius:10px;background:#040714}
.exp-w03 .exp-lab{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut,#9aa3c7)}
.exp-w03 .exp-lab b{color:var(--txt,#eef1ff);font-family:var(--mono,ui-monospace,Menlo,monospace);min-width:44px}
.exp-w03 input[type=range]{accent-color:var(--acc2,#06b6d4);width:120px}
.exp-w03 .exp-msg{min-height:20px;font-size:13px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.1));transition:border-color .2s}
.exp-w03 .exp-msg.ok{border-color:var(--ok,#22c55e)}
.exp-w03 .exp-msg.warn{border-color:var(--warn,#eab308)}
.exp-w03 .exp-msg.bad{border-color:var(--bad,#ef4444)}
.exp-w03 .exp-art{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
.exp-w03 .exp-art pre{white-space:pre-wrap;word-break:break-word;margin:4px 0;padding:8px;border-radius:8px;background:#05070f;color:var(--txt,#eef1ff);font:12px/1.4 var(--mono,ui-monospace,Menlo,monospace)}
`;
    document.head.appendChild(st);
  }

  /* ---------- 3. канон и состояние ---------- */
  const CANON = { A:{ p:0.40, win:100, loss:50 }, B:{ p:0.55, win:100, loss:150 } };
  const S = { seed:42, rnd:null, out:{A:[],B:[]}, cost:0, bet:null, revealed:false,
              gotThousand:false, round:1, flash:{A:0,B:0}, last:{A:null,B:null},
              parts:[], anim:null, lastTs:0 };
  const resetRound = seed => {
    S.seed = seed; S.rnd = mulberry32(seed); S.out = {A:[],B:[]}; S.bet = null;
    S.revealed = false; S.gotThousand = false; S.flash = {A:0,B:0};
    S.last = {A:null,B:null}; S.parts = []; S.anim = null;
  };
  resetRound(42);

  const evBase = k => CANON[k].p*CANON[k].win - (1-CANON[k].p)*CANON[k].loss;
  const ev     = k => evBase(k) - S.cost;
  const stats  = k => {
    const o = S.out[k], c = CANON[k]; let w = 0;
    for(let i=0;i<o.length;i++) w += o[i];
    const n = o.length, total = w*c.win - (n-w)*c.loss - n*S.cost;
    return { n, w, total, avg: n ? total/n : 0, wr: n ? w/n : 0 };
  };
  const fmt = v => (v>0?'+':(v<0?'−':'')) + Math.abs(v).toFixed(1).replace('.',',') + ' ₽';
  const pct = v => (v*100).toFixed(1).replace('.',',') + '%';

  /* ---------- 4. разметка ---------- */
  box.innerHTML = `
<div class="exp-w03">
  <div class="exp-title">Матожидание: два игровых автомата</div>
  <div class="exp-sub">Автомат A: выигрыш в 40% случаев, +100 ₽ / −50 ₽. Автомат B: выигрыш в 55% случаев, +100 ₽ / −150 ₽.</div>
  <div class="exp-task"><b>Задание.</b> До первого спина поставь на автомат, который будет богаче через 100 спинов. Крути оба одновременно. После 100 спинов сравни копилки — и открой EV. Потом «+1000».</div>
  <div class="exp-row exp-bet">
    <span>Кто будет богаче через 100 спинов?</span>
    <button data-bet="A">Ставлю на A (40%)</button>
    <button data-bet="B">Ставлю на B (55%)</button>
  </div>
  <canvas></canvas>
  <div class="exp-row exp-ctrl">
    <button data-spin="1" disabled>×1</button>
    <button data-spin="10" disabled>×10</button>
    <button data-spin="to100" class="exp-pri" disabled>до 100</button>
    <button data-spin="1000" disabled>+1000</button>
    <label class="exp-lab">издержки за спин <input type="range" min="0" max="30" step="1" value="0"><b>0 ₽</b></label>
    <button data-act="round">Новый раунд</button>
    <button data-act="reset">Сброс (seed 42)</button>
  </div>
  <div class="exp-msg"></div>
  <div class="exp-art">Артефакт (уйдёт в профиль):<pre></pre><button data-act="copy">Скопировать</button></div>
</div>`;

  const root  = box.querySelector('.exp-w03');
  const cv    = root.querySelector('canvas');
  const msgEl = root.querySelector('.exp-msg');
  const preEl = root.querySelector('pre');
  const betBtns  = Array.from(root.querySelectorAll('[data-bet]'));
  const spinBtns = Array.from(root.querySelectorAll('[data-spin]'));
  const range = root.querySelector('input[type=range]');
  const costB = root.querySelector('.exp-lab b');
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const colors = () => {
    const cs = getComputedStyle(box);
    const g = (v,f) => (cs.getPropertyValue(v)||'').trim() || f;
    return { txt:g('--txt','#eef1ff'), mut:g('--mut','#9aa3c7'), line:g('--line','rgba(255,255,255,.12)'),
             acc:g('--acc2','#06b6d4'), ok:g('--ok','#22c55e'), bad:g('--bad','#ef4444'), warn:g('--warn','#eab308') };
  };
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  /* ---------- 5. сообщения / кнопки / артефакт ---------- */
  const say = (html, cls) => { msgEl.innerHTML = html; msgEl.className = 'exp-msg' + (cls?' '+cls:''); };
  function syncButtons(){
    const n = S.out.A.length;
    betBtns.forEach(b => { b.disabled = !!S.bet; b.classList.toggle('exp-on', S.bet === b.dataset.bet); });
    spinBtns.forEach(b => {
      const k = b.dataset.spin;
      if(k === 'to100'){ b.textContent = n < 100 ? `до 100 (ещё ${100-n})` : '+100'; }
      b.disabled = !S.bet || !!S.anim || (k === '1000' && !S.revealed);
    });
  }
  function artifact(){
    const a = stats('A'), b = stats('B');
    const rich = a.total === b.total ? 'поровну' : (a.total > b.total ? 'A' : 'B');
    const oft  = a.wr === b.wr ? 'поровну' : (a.wr > b.wr ? 'A' : 'B');
    const text = `A: p=40% +100/−50 → EV ${fmt(ev('A'))}; факт/спин после ${a.n}: ${fmt(a.avg)} (побед ${pct(a.wr)}) · `
               + `B: p=55% +100/−150 → EV ${fmt(ev('B'))}; факт/спин после ${b.n}: ${fmt(b.avg)} (побед ${pct(b.wr)}) · `
               + `чаще побеждал ${oft}, богаче ${rich} · ставка: ${S.bet ? S.bet + (S.bet===rich ? ' ✓' : ' ✗') : '—'} · `
               + `издержки ${S.cost} ₽/спин · seed ${S.seed} · раунд ${S.round}`;
    preEl.textContent = text;
    return { text, spins:a.n, evA:ev('A'), evB:ev('B'), avgA:a.avg, avgB:b.avg, wrA:a.wr, wrB:b.wr,
             richer:rich, moreOften:oft, bet:S.bet, cost:S.cost, seed:S.seed, round:S.round };
  }
  const emit = () => { try{ box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail: Object.assign({ widget:'widget_m_matematicheskoe_ozhidanie' }, artifact()) })); }catch(e){} };

  /* ---------- 6. спины и анимация ---------- */
  function spawn(k, win){
    const cnt = win ? 3 : 2;
    for(let i=0;i<cnt;i++) S.parts.push({ k, win, t: -i*0.12, dx:(i-1)*6 });
    if(S.parts.length > 80) S.parts.splice(0, S.parts.length - 80);
  }
  function spinOnce(k){
    const win = S.rnd() < CANON[k].p ? 1 : 0;
    S.out[k].push(win); S.last[k] = win; S.flash[k] = 1; spawn(k, win);
  }
  function spinBatch(count){
    if(!S.bet || S.anim) return;
    const from = S.out.A.length, target = from + count;
    S.anim = { start: performance.now(), from, target, dur: Math.min(1600, 140 + count*14) };
    syncButtons(); S.lastTs = 0; raf(loop);
  }
  function onBatchEnd(){
    const n = S.out.A.length;
    if(n >= 100 && !S.revealed){
      S.revealed = true;
      const a = stats('A'), b = stats('B');
      const rich = a.total > b.total ? 'A' : (b.total > a.total ? 'B' : null);
      const oft  = a.wr > b.wr ? 'A' : 'B';
      const betOk = rich && S.bet === rich;
      let html = `<b>100 спинов.</b> Копилка A: <b>${fmt(a.total)}</b>, копилка B: <b>${fmt(b.total)}</b>. `
               + `Чаще выигрывал <b>${oft}</b> (${pct(oft==='A'?a.wr:b.wr)} против ${pct(oft==='A'?b.wr:a.wr)}), `
               + (rich ? `богаче <b>${rich}</b>. ` : 'копилки равны. ')
               + `Твоя ставка ${S.bet}: <b>${betOk ? 'верно ✓' : 'мимо ✗'}</b>. `
               + `Открыты матожидания: A <b>${fmt(ev('A'))}</b>, B <b>${fmt(ev('B'))}</b> на спин. `;
      html += rich === 'B'
        ? `На этом раунде B даже богаче — на 100 спинах такое бывает (короткая серия!). Нажми <b>+1000</b> и посмотри, кто останется богаче.`
        : `Теперь нажми <b>+1000</b> — и смотри, как линии факта прилипают к пунктиру EV.`;
      say(html, betOk ? 'ok' : 'warn');
    } else if(S.revealed && n >= 1100 && !S.gotThousand){
      S.gotThousand = true;
      const a = stats('A'), b = stats('B');
      say(`<b>${n} спинов.</b> Факт/спин A = <b>${fmt(a.avg)}</b> при EV ${fmt(ev('A'))}; B = <b>${fmt(b.avg)}</b> при EV ${fmt(ev('B'))}. `
        + `Разница уже меньше ${Math.max(1, Math.ceil(Math.max(Math.abs(a.avg-ev('A')), Math.abs(b.avg-ev('B')))))} ₽. `
        + `Копилку наполняет матожидание, а не частота побед. Теперь подвинь ползунок издержек — и посмотри, при каком трении EV автомата A уходит под ноль.`, 'ok');
    }
    syncButtons(); emit();
  }
  function loop(ts){
    const dt = S.lastTs ? Math.min(50, ts - S.lastTs) : 16; S.lastTs = ts;
    if(S.anim){
      const a = S.anim, prog = Math.min(1, (ts - a.start)/a.dur);
      const should = Math.floor(a.from + (a.target - a.from)*prog);
      while(S.out.A.length < should){ spinOnce('A'); spinOnce('B'); }
      if(prog >= 1){ S.anim = null; onBatchEnd(); }
    }
    S.flash.A *= Math.pow(0.9, dt/16); S.flash.B *= Math.pow(0.9, dt/16);
    S.parts = S.parts.filter(p => (p.t += dt/650) < 1);
    draw();
    if(S.anim || S.parts.length || S.flash.A > 0.02 || S.flash.B > 0.02) raf(loop); else { box._expRaf = null; artifact(); }
  }

  /* ---------- 7. рисование ---------- */
  function geom(k){
    const w = cv.clientWidth, pad = 10, pw = (w - pad*3)/2, x = pad + (k==='A' ? 0 : pw + pad), y = pad;
    return { x, y, w: pw, h: 214,
             reel:{ x:x+10, y:y+44, w:pw-20, h:50 },
             bar: { x:x+10, y:y+124, w:pw-20, h:14 } };
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawMachine(ctx, k, C, maxAbs){
    const g = geom(k), st = stats(k), c = CANON[k];
    ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    rr(ctx, g.x, g.y, g.w, g.h, 10); ctx.fill(); ctx.stroke();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = C.txt; ctx.font = `700 13px ${SANS}`; ctx.fillText(`Автомат ${k}`, g.x+10, g.y+20);
    ctx.fillStyle = C.mut; ctx.font = `11px ${MONO}`;
    ctx.fillText(`${Math.round(c.p*100)}% побед · +${c.win} / −${c.loss}`, g.x+10, g.y+36);
    // барабан
    const r = g.reel;
    ctx.fillStyle = '#05070f'; rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    if(S.last[k] !== null){
      const col = S.last[k] ? C.ok : C.bad;
      ctx.save(); ctx.globalAlpha = 0.12 + 0.35*S.flash[k]; ctx.fillStyle = col; rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.restore();
      ctx.fillStyle = col; ctx.font = `800 22px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(S.last[k] ? `+${c.win}` : `−${c.loss}`, r.x + r.w/2, r.y + r.h/2 + 1);
      if(S.cost > 0){ ctx.fillStyle = C.mut; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(`−${S.cost} издержки`, r.x + r.w - 6, r.y + 12); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else {
      ctx.fillStyle = C.mut; ctx.font = `600 16px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('— — —', r.x + r.w/2, r.y + r.h/2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    // копилка
    const b = g.bar;
    ctx.fillStyle = C.mut; ctx.font = `11px ${SANS}`; ctx.fillText('копилка', b.x, b.y - 6);
    ctx.fillStyle = st.total > 0 ? C.ok : (st.total < 0 ? C.bad : C.txt); ctx.font = `700 13px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText(fmt(st.total), b.x + b.w, b.y - 6); ctx.textAlign = 'left';
    ctx.fillStyle = '#05070f'; rr(ctx, b.x, b.y, b.w, b.h, 4); ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    const zero = b.x + b.w/2, len = Math.min(b.w/2 - 2, Math.abs(st.total)/maxAbs*(b.w/2 - 2));
    ctx.fillStyle = st.total >= 0 ? C.ok : C.bad;
    if(len > 0){ ctx.fillRect(st.total >= 0 ? zero : zero - len, b.y+2, len, b.h-4); }
    ctx.fillStyle = C.mut; ctx.fillRect(zero - 0.5, b.y - 2, 1, b.h + 4);
    // цифры
    ctx.fillStyle = C.mut; ctx.font = `11px ${MONO}`;
    ctx.fillText(`n = ${st.n} · побед ${pct(st.wr)}`, g.x+10, g.y+160);
    ctx.fillStyle = C.txt; ctx.font = `600 12px ${MONO}`;
    ctx.fillText(`факт/спин: ${st.n ? fmt(st.avg) : '—'}`, g.x+10, g.y+178);
    if(S.revealed){
      const e = ev(k), flipped = (evBase(k) > 0) !== (e > 0);
      ctx.fillStyle = flipped ? C.warn : (e > 0 ? C.ok : C.bad); ctx.font = `700 12px ${MONO}`;
      ctx.fillText(`EV: ${fmt(e)}${flipped ? ' ← знак сменили издержки' : ''}`, g.x+10, g.y+196);
      ctx.fillStyle = C.mut; ctx.font = `10px ${MONO}`;
      ctx.fillText(`факт − EV = ${fmt(st.avg - e)}`, g.x+10, g.y+209);
    } else {
      ctx.fillStyle = C.mut; ctx.font = `12px ${MONO}`; ctx.fillText('EV: ?  (откроется после 100 спинов)', g.x+10, g.y+196);
    }
  }

  function series(k){
    const o = S.out[k], c = CANON[k], n = o.length; if(!n) return [];
    const step = Math.max(1, Math.floor(n/400)); let tot = 0; const pts = [];
    for(let i=0;i<n;i++){ tot += (o[i] ? c.win : -c.loss) - S.cost; if(i % step === 0 || i === n-1) pts.push([i+1, tot/(i+1)]); }
    return pts;
  }
  function drawChart(ctx, x, y, w, h, C){
    ctx.fillStyle = C.mut; ctx.font = `11px ${SANS}`; ctx.textAlign = 'left';
    ctx.fillText('факт на спин, ₽ · шкала −60…+60 (первые спины рвут шкалу — это нормально)', x, y + 10);
    const L = x + 34, R = x + w - 8, T = y + 18, B = y + h - 16, pw = R - L, ph = B - T;
    const n = S.out.A.length, N = Math.max(100, n);
    const Y = v => T + (60 - Math.max(-60, Math.min(60, v)))/120*ph;
    const X = i => L + (N > 1 ? (i-1)/(N-1) : 0)*pw;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.mut; ctx.textAlign = 'right';
    [-60,-30,0,30,60].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.globalAlpha = v===0 ? 1 : .5; ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText((v>0?'+':'')+v, L-4, Y(v)+3); });
    ctx.textAlign = 'center'; ctx.fillText('1', X(1), B + 12); if(N > 100) ctx.fillText(String(N), X(N), B + 12);
    // вертикаль на 100
    ctx.save(); ctx.setLineDash([2,3]); ctx.strokeStyle = C.mut; ctx.beginPath(); ctx.moveTo(X(100), T); ctx.lineTo(X(100), B); ctx.stroke(); ctx.restore();
    ctx.fillText('100 спинов', X(100), B + 12);
    // EV-пунктир
    if(S.revealed){
      ['A','B'].forEach(k => {
        const e = ev(k), col = k==='A' ? C.acc : C.warn;
        ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(L, Y(e)); ctx.lineTo(R, Y(e)); ctx.stroke(); ctx.restore();
        ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.font = `600 10px ${MONO}`;
        ctx.fillText(`EV ${k} ${fmt(e)}`, R - 2, Y(e) + (e >= 0 ? -3 : 11));
      });
    }
    // кривые факта
    ['A','B'].forEach(k => {
      const pts = series(k); if(pts.length < 2) return;
      ctx.strokeStyle = k==='A' ? C.acc : C.warn; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((p,i) => { const px = X(p[0]), py = Y(p[1]); if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.stroke();
      const last = pts[pts.length-1]; ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 3.5, 0, Math.PI*2); ctx.fill();
    });
    // легенда
    ctx.font = `10px ${SANS}`; ctx.textAlign = 'left';
    ctx.fillStyle = C.acc; ctx.fillRect(L+4, T+4, 12, 3); ctx.fillStyle = C.mut; ctx.fillText('A факт', L+20, T+9);
    ctx.fillStyle = C.warn; ctx.fillRect(L+64, T+4, 12, 3); ctx.fillStyle = C.mut; ctx.fillText('B факт', L+80, T+9);
  }
  function drawParts(ctx, C){
    S.parts.forEach(p => {
      if(p.t < 0) return;
      const g = geom(p.k), r = g.reel, b = g.bar, e = 1 - Math.pow(1 - p.t, 3);
      const sx = r.x + r.w/2 + p.dx, sy = r.y + r.h/2;
      if(p.win){
        const tx = b.x + b.w/2 + (stats(p.k).total >= 0 ? 20 : -20), ty = b.y + b.h/2;
        ctx.globalAlpha = 1 - p.t*0.6; ctx.fillStyle = C.warn;
        ctx.beginPath(); ctx.arc(sx + (tx - sx)*e, sy + (ty - sy)*e - Math.sin(p.t*Math.PI)*14, 4, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.globalAlpha = 1 - p.t; ctx.fillStyle = C.bad;
        ctx.fillRect(sx - 3, sy + e*70, 6, 6);
      }
      ctx.globalAlpha = 1;
    });
  }
  function draw(){
    const w = cv.clientWidth, h = cv.clientHeight; if(!w) return;
    if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){ cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const C = colors();
    const maxAbs = Math.max(500, Math.abs(stats('A').total), Math.abs(stats('B').total)) * 1.1;
    drawMachine(ctx, 'A', C, maxAbs); drawMachine(ctx, 'B', C, maxAbs);
    drawChart(ctx, 10, 214 + 20, w - 20, h - 214 - 30, C);
    drawParts(ctx, C);
  }

  /* ---------- 8. события ---------- */
  betBtns.forEach(b => b.addEventListener('click', () => {
    if(S.bet) return; S.bet = b.dataset.bet;
    say(`Ставка принята: <b>${S.bet}</b>. Крути оба автомата — сначала до 100 спинов. Смотри на копилки, а не на цвет барабана.`);
    syncButtons(); draw(); artifact();
  }));
  spinBtns.forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.spin, n = S.out.A.length;
    if(k === 'to100') spinBatch(n < 100 ? 100 - n : 100); else spinBatch(parseInt(k, 10));
  }));
  range.addEventListener('input', () => {
    const prevSign = ev('A') > 0;
    S.cost = parseInt(range.value, 10) || 0; costB.textContent = S.cost + ' ₽';
    if(S.revealed && prevSign !== (ev('A') > 0)){
      say(ev('A') > 0
        ? `Издержки ${S.cost} ₽ — EV автомата A снова положительное (${fmt(ev('A'))}).`
        : `<b>Ага:</b> издержки ${S.cost} ₽ за спин перевели EV автомата A через ноль: было +10 ₽, стало <b>${fmt(ev('A'))}</b>. Тот же автомат, тот же 40% винрейт — а копилка теперь пустеет. Это трение из урока 0.18.`, 'warn');
    }
    draw(); artifact();
  });
  root.querySelector('[data-act=round]').addEventListener('click', () => {
    resetRound((Date.now() & 0x7fffffff) || 1); S.round += 1;
    say(`Новый раунд (seed ${S.seed}). Сделай ставку заново — и проверь, изменится ли вывод при другой случайности.`);
    syncButtons(); draw(); artifact();
  });
  root.querySelector('[data-act=reset]').addEventListener('click', () => {
    resetRound(42); S.round = 1; S.cost = 0; range.value = 0; costB.textContent = '0 ₽';
    say('Сброс к канону урока: seed 42, издержки 0. Сделай ставку.');
    syncButtons(); draw(); artifact();
  });
  root.querySelector('[data-act=copy]').addEventListener('click', ev_ => {
    const btn = ev_.currentTarget, t = preEl.textContent;
    const done = () => { btn.textContent = 'Скопировано ✓'; later(() => { btn.textContent = 'Скопировать'; }, 1500); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(preEl); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); try{ document.execCommand('copy'); done(); }catch(e){} };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done, fallback); } else fallback();
  });

  /* ---------- 9. адаптив ---------- */
  const relayout = () => { draw(); };
  if(window.ResizeObserver){ box._expRO = new ResizeObserver(relayout); box._expRO.observe(root); }
  else { box._expResize = relayout; window.addEventListener('resize', relayout); }

  say('Сделай ставку — автоматы не крутятся без прогноза. Подсказка: подумай не «кто чаще выигрывает», а «кто сколько уносит за спин».');
  syncButtons(); draw(); artifact();
};
