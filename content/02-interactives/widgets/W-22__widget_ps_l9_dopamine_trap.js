/*
 * W-22 · widget_ps_l9_dopamine_trap · П9 «Дофаминовый капкан»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     Увидеть, что пик удовольствия приходится на МОМЕНТ ДО входа; после входа то же движение цены не даёт ничего — мозг платит за ожидание.
 *   Задание:  4 «ракеты» за месяц. На каждой: «Купить на всё» или «Холодный таймер 15 минут» → устав. Посчитать месяц в рублях на депозит 100 000 ₽.
 *   Ага:      На графике: звезда пика удовольствия стоит слева от линии входа; после входа кривая падает при той же зелёной цене. Итог месяца при 4 импульсах = −35 000 ₽ (числа урока).
 *   Дефолты:  Депозит 100 000 ₽; исходы месяца [−15%, −15%, −15%, +10%] в seeded-порядке; таймер 15 «минут» = 12 секунд; seed 42.
 *   Артефакт: Правило «Холодный таймер» (4 шага) + твой личный итог месяца против «−35 000 ₽ без правила».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l9_dopamine_trap'] = function(box){
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const shuffle = (a, r)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const k=a[i]; a[i]=a[j]; a[j]=k; } return a; };
  const rub = v => (v>0?'+':v<0?'−':'') + Math.abs(Math.round(v)).toLocaleString('ru-RU') + ' ₽';

  if(!document.getElementById('exp-css-w22')){
    const s=document.createElement('style'); s.id='exp-css-w22';
    s.textContent = `
.w22{color:var(--txt,#eef1ff);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.w22 *{box-sizing:border-box}
.w22 h4{margin:0;font-size:17px}
.w22 .hd{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px}
.w22 .mut{color:var(--mut,#9aa3c7);font-size:13px}
.w22 .mono{font-family:var(--mono,ui-monospace,monospace)}
.w22 .strip{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(255,255,255,.1))}
.w22 .news{font-weight:700;font-size:15px}
.w22 .heart{display:inline-block;font-size:22px;animation:w22beat 1s infinite;transform-origin:center}
@keyframes w22beat{0%,100%{transform:scale(1)}30%{transform:scale(1.3)}}
.w22 .gauge{margin-left:auto;font:13px var(--mono,ui-monospace,monospace)}
.w22 .gauge b{color:var(--warn,#eab308);font-size:16px}
.w22 canvas{width:100%;height:270px;display:block;border-radius:10px;background:#070a19}
.w22 .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.w22 .btn{border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);border-radius:8px;padding:10px 14px;font-size:14px;cursor:pointer}
.w22 .btn.buy{background:var(--bad,#ef4444);border-color:var(--bad,#ef4444);color:#fff;font-weight:700;animation:w22glow 1.2s infinite alternate}
@keyframes w22glow{from{box-shadow:0 0 0 rgba(239,68,68,0)}to{box-shadow:0 0 18px rgba(239,68,68,.6)}}
.w22 .btn.cool{background:rgba(6,182,212,.15);border-color:var(--acc2,#06b6d4)}
.w22 .btn.pri{background:var(--acc2,#06b6d4);border-color:var(--acc2,#06b6d4);color:#03111a;font-weight:600}
.w22 .btn:disabled{opacity:.35;cursor:not-allowed;animation:none;box-shadow:none}
.w22 .timer{font:34px var(--mono,ui-monospace,monospace);text-align:center;padding:10px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid var(--acc2,#06b6d4);margin-top:10px}
.w22 .timer small{display:block;font-size:13px;color:var(--mut,#9aa3c7)}
.w22 .charter{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.12));background:#070a19;font:13px/1.5 var(--mono,ui-monospace,monospace)}
.w22 .note{margin-top:10px;padding:10px 12px;border-radius:10px;font-size:14px;border:1px solid var(--warn,#eab308);background:rgba(234,179,8,.08)}
.w22 .note.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.08)} .w22 .note.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.08)}
.w22 .ledger{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.w22 .ledger span{flex:1 1 120px;padding:6px 8px;border-radius:8px;font:12px var(--mono,ui-monospace,monospace);border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.04)}
.w22 .aha{margin-top:12px;padding:12px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid var(--acc2,#06b6d4);font-size:14px}
.w22 .total{font-size:26px;font-weight:800;font-family:var(--mono,ui-monospace,monospace);margin-top:8px}
.w22 textarea{width:100%;min-height:130px;margin-top:8px;background:#070a19;color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:8px;font:12px/1.4 var(--mono,ui-monospace,monospace);resize:vertical}
`;
    document.head.appendChild(s);
  }

  const DEPOT = 100000, ROUNDS = 4, WAIT_MAX = 18, TIMER_MS = 12000;
  let seed = 42, rnd, outcomes, round, ledger, S, tick = null, tmr = null;
  const q = sel => box.querySelector(sel);

  function startMonth(){
    rnd = mulberry32(seed); outcomes = shuffle([-15,-15,-15,10], rnd); round = 0; ledger = [];
    box.innerHTML = `
<div class="w22">
  <div class="hd"><h4>Дофаминовый капкан</h4><span class="mut" data-round></span></div>
  <div class="mut">Монета летит. Следи за нижней шкалой — это твоё удовольствие. Где будет пик: до кнопки или после? Депозит 100 000 ₽, «на всё».</div>
  <div class="strip"><span class="heart" data-heart>❤</span><span class="news" data-news>Готовимся…</span><span class="gauge">удовольствие <b data-g>0</b>/100</span></div>
  <canvas></canvas>
  <div data-under></div>
  <div class="actions" data-actions></div>
  <div class="ledger" data-ledger></div>
</div>`;
    box._expResize = ()=>draw(); window.addEventListener('resize', box._expResize);
    startRound();
  }

  function startRound(){
    round++;
    S = { phase:'wait', price:[100], dopa:[8], entry:null, peak:null, out: outcomes[round-1], playStep:0, waited:false, tag:null };
    q('[data-round]').textContent = `импульс ${round} из ${ROUNDS} · месяц`;
    q('[data-under]').innerHTML = '';
    setActions();
    if(tick) clearInterval(tick);
    tick = later(step, 380, true);
    step();
  }

  function setActions(){
    const a = q('[data-actions]');
    if(S.phase==='wait') a.innerHTML = `<button class="btn buy" data-buy>Купить на всё</button><button class="btn cool" data-cool>Холодный таймер · 15 минут</button>`;
    else if(S.phase==='charter') a.innerHTML = `<button class="btn pri" data-close>Сигнала нет — закрыть вкладку</button><button class="btn buy" data-buy>Всё равно купить</button>`;
    else a.innerHTML = '';
    const b=q('[data-buy]'), c=q('[data-cool]'), x=q('[data-close]');
    if(b) b.onclick = buy; if(c) c.onclick = cool; if(x) x.onclick = closeTab;
  }

  function step(){
    const P=S.price, D=S.dopa, i=P.length-1;
    if(S.phase==='wait'){
      const g = 0.012 + 0.004*i + (rnd()-0.5)*0.02;
      P.push(P[i]*(1+g));
      const target = Math.min(96, 15 + (P[i+1]/100-1)*140);
      D.push(Math.max(0, D[i] + (target-D[i])*0.5 + (rnd()-0.5)*4));
      q('[data-news]').textContent = `🚀 +${Math.round(P[i+1]-100)}% за ${(i+1)*5} минут — «поезд уходит»?`;
      if(i+1 >= WAIT_MAX){ S.tag='missed'; S.phase='play'; setActions(); }
    } else if(S.phase==='timer'){
      P.push(P[i]*(1+(rnd()-0.5)*0.01)); D.push(D[i]*0.82 + 2);
    } else if(S.phase==='charter'){
      P.push(P[i]*(1+(rnd()-0.5)*0.008)); D.push(Math.max(10, D[i]*0.95));
    } else if(S.phase==='play'){
      S.playStep++;
      if(S.entry!==null && S.playStep<=2){                     // то же движение — кайфа нет
        P.push(P[i]*(1.015+rnd()*0.01)); D.push(Math.max(30, D[i]*0.55));
        if(S.playStep===2) q('[data-under]').innerHTML = `<div class="note">Цена идёт туда же, куда и до входа. А шкала удовольствия <b>рухнула</b>. Пик был в момент нажатия — мозг платил за ожидание.</div>`;
      } else {
        const k = S.entry!==null ? S.playStep-2 : S.playStep, N = 6;
        P.push(P[i]*Math.pow(1+S.out/100, 1/N));
        D.push(S.entry!==null ? (S.out<0 ? Math.max(3, D[i]*0.8) : Math.min(45, D[i]+3)) : Math.max(8, D[i]*0.9));
        if(k>=N){ clearInterval(tick); tick=null; finishRound(); }
      }
    }
    q('[data-g]').textContent = Math.round(D[D.length-1]);
    q('[data-heart]').style.animationDuration = (1.25 - D[D.length-1]/100*0.95).toFixed(2)+'s';
    draw();
  }

  function buy(){
    if(S.phase!=='wait' && S.phase!=='charter') return;
    S.entry = S.price.length-1; S.peak = S.dopa.indexOf(Math.max.apply(null,S.dopa));
    S.tag = S.phase==='charter' ? 'impulse_after_timer' : 'impulse'; S.phase='play'; S.playStep=0;
    if(tmr){ clearInterval(tmr); tmr=null; }
    setActions(); q('[data-news]').textContent = 'Куплено на всё. Смотри на шкалу удовольствия.';
    if(!tick) tick = later(step, 380, true);
  }

  function cool(){
    if(S.phase!=='wait') return;
    S.phase='timer'; S.waited=true; setActions();
    const t0 = performance.now();
    q('[data-under]').innerHTML = `<div class="timer"><span data-tt>15:00</span><small>Встал из-за стола. Руки от мыши. Стакан воды, 10 выдохов. Волна спадает физиологически.</small></div>`;
    q('[data-news]').textContent = 'Таймер идёт. Цена никуда не делась.';
    tmr = later(()=>{
      const p = Math.min(1,(performance.now()-t0)/TIMER_MS), left = Math.round((1-p)*900);
      const tt=q('[data-tt]'); if(tt) tt.textContent = String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
      if(p>=1){ clearInterval(tmr); tmr=null; S.phase='charter'; setActions();
        q('[data-under]').innerHTML = `<div class="charter"><div>ТВОЙ УСТАВ: вход при RSI &lt; 35 и EMA16 &gt; EMA200</div><div>СЕЙЧАС: RSI <b style="color:var(--bad,#ef4444)">87</b>, цена +${Math.round(S.price[S.price.length-1]-100)}% за час</div><div>Сигнал по системе: <b style="color:var(--bad,#ef4444)">НЕТ</b></div></div>`; }
    }, 100, true);
  }

  function closeTab(){
    if(S.phase!=='charter') return;
    S.tag='closed'; S.phase='play'; S.playStep=0; setActions();
    q('[data-news]').textContent = 'Вкладка закрыта. Смотрим, что было дальше.';
  }

  function finishRound(){
    let pnl = 0, cls, txt;
    if(S.entry!==null){
      pnl = DEPOT*S.out/100; cls = pnl<0?'bad':'ok';
      txt = `<b>Импульс: ${rub(pnl)}.</b> Вход был на пике — ${S.out<0?'3 из 4 таких сделок заканчиваются −15%':'редкая удача: 1 из 4 даёт +10%'} (урок П9). ${S.peak!==null && S.peak<=S.entry?'Звезда пика удовольствия — слева от линии входа.':''}`;
    } else if(S.tag==='closed'){
      cls = S.out<0?'ok':''; txt = S.out<0 ? `<b>Холодный таймер спас ${rub(-DEPOT*S.out/100)}.</b> Цена сделала ровно то, что делает после «ракеты».` : `<b>Пропустил +10 000 ₽ — и это нормальное решение.</b> Поезда ходят каждые 5 минут; на дистанции выигрывает тот, кто не покупает пики.`;
    } else { cls=''; txt = `<b>Не нажал — и ничего не потерял.</b> Цена откатила на ${S.out}%. Заметь: желание уже прошло само, вместе с волной.`; }
    ledger.push({round, tag:S.tag, pnl, out:S.out});
    q('[data-under]').insertAdjacentHTML('beforeend', `<div class="note ${cls}">${txt}</div>`);
    q('[data-ledger]').innerHTML = ledger.map(l=>`<span>#${l.round} ${l.tag==='closed'?'таймер → закрыл':l.tag==='missed'?'не нажал':'импульс'}: ${l.pnl? rub(l.pnl) : (l.out<0?'спас '+rub(-DEPOT*l.out/100):'пропустил '+rub(DEPOT*l.out/100))}</span>`).join('');
    q('[data-actions]').innerHTML = `<button class="btn pri" data-next>${round<ROUNDS?'Следующий импульс →':'Итог месяца →'}</button>`;
    q('[data-next]').onclick = ()=>{ round<ROUNDS ? startRound() : summary(); };
  }

  function summary(){
    const total = ledger.reduce((s,l)=>s+l.pnl,0), imp = ledger.filter(l=>l.pnl!==0).length;
    const saved = ledger.filter(l=>l.tag==='closed' && l.out<0).reduce((s,l)=>s-DEPOT*l.out/100,0);
    q('[data-round]').textContent = 'месяц закрыт';
    const art = `Правило «Холодный таймер» (П9)\n1. Встать из-за стола, руки от клавиатуры и мыши.\n2. Засечь 15 минут — время, за которое спадает пик дофаминовой волны.\n3. Стакан воды, 10 глубоких выдохов.\n4. Открыть устав: сигнала нет — закрыть вкладку.\n\nТренажёр, месяц на 100 000 ₽: импульсных покупок ${imp}/4, итог ${rub(total)}. Без правила (4 импульса): −35 000 ₽. Спасено таймером: ${rub(saved)}.`;
    q('[data-under]').innerHTML = `
<div class="aha"><b>Твой месяц: ${rub(total)}</b> при ${imp} импульсных покупках из 4. Урок: если поддаться всем четырём — 3 × (−15 000) + 10 000 = <b>−35 000 ₽</b> только за «дофаминовый кайф». Пик удовольствия каждый раз стоял <b>до</b> кнопки; после неё та же зелёная цена не давала ничего.<div class="total" style="color:${total<0?'var(--bad,#ef4444)':'var(--ok,#22c55e)'}">${rub(total)} <span class="mut" style="font-size:13px">против −35 000 ₽ без правила</span></div></div>
<div class="mut" style="margin-top:12px">Артефакт: правило холодного таймера — наклей на рамку монитора</div>
<textarea readonly data-art>${art}</textarea>`;
    q('[data-actions]').innerHTML = `<button class="btn" data-copy>Скопировать</button><button class="btn pri" data-new>Новый месяц (другой порядок исходов)</button>`;
    const ta=q('[data-art]'), cp=q('[data-copy]');
    cp.onclick=()=>{ ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} if(navigator.clipboard){navigator.clipboard.writeText(ta.value).catch(()=>{});} cp.textContent='Скопировано ✓'; };
    q('[data-new]').onclick=()=>{ seed=Date.now()%2147483647; window.removeEventListener('resize', box._expResize); box._expResize=null; startMonth(); };
  }

  function draw(){
    const canvas = q('canvas'); if(!canvas) return;
    const dpr=window.devicePixelRatio||1, W=canvas.clientWidth||320, H=canvas.clientHeight||270;
    if(canvas.width!==Math.round(W*dpr)){ canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); }
    const g=canvas.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    const P=S.price, D=S.dopa, n=P.length, NMAX=Math.max(30,n+1), L=44, R=14;
    const X=i=>L+(W-L-R)*i/(NMAX-1);
    // --- цена ---
    const T1=16, H1=140, lo=Math.min.apply(null,P)*0.97, hi=Math.max.apply(null,P)*1.04;
    const Y1=v=>T1+H1*(1-(v-lo)/(hi-lo));
    g.fillStyle='#9aa3c7'; g.font='11px system-ui'; g.textAlign='left'; g.fillText('цена, % от старта', L, T1-4);
    g.textAlign='right'; g.fillText(Math.round(hi)+'', L-4, T1+10); g.fillText(Math.round(lo)+'', L-4, T1+H1);
    g.beginPath(); P.forEach((v,i)=> i? g.lineTo(X(i),Y1(v)) : g.moveTo(X(i),Y1(v)));
    g.strokeStyle='#22c55e'; g.lineWidth=2; g.stroke();
    g.lineTo(X(n-1),T1+H1); g.lineTo(L,T1+H1); g.closePath(); g.fillStyle='rgba(34,197,94,.1)'; g.fill();
    // --- удовольствие ---
    const T2=T1+H1+26, H2=H-T2-14; const Y2=v=>T2+H2*(1-v/100);
    g.fillStyle='#9aa3c7'; g.textAlign='left'; g.fillText('удовольствие (дофамин), 0–100', L, T2-6);
    g.textAlign='right'; g.fillText('100', L-4, T2+10); g.fillText('0', L-4, T2+H2);
    g.beginPath(); D.forEach((v,i)=> i? g.lineTo(X(i),Y2(v)) : g.moveTo(X(i),Y2(v)));
    g.strokeStyle='#eab308'; g.lineWidth=2; g.stroke();
    g.lineTo(X(n-1),T2+H2); g.lineTo(L,T2+H2); g.closePath(); g.fillStyle='rgba(234,179,8,.14)'; g.fill();
    // --- маркеры ---
    if(S.entry!==null){
      const x=X(S.entry); g.setLineDash([4,4]); g.strokeStyle='#06b6d4'; g.beginPath(); g.moveTo(x,T1); g.lineTo(x,T2+H2); g.stroke(); g.setLineDash([]);
      g.fillStyle='#06b6d4'; g.font='bold 11px system-ui'; g.textAlign='center'; g.fillText('ВХОД', x, T2-16);
      if(S.peak!==null){ const px=X(S.peak), py=Y2(D[S.peak]); g.fillStyle='#eab308'; g.font='16px system-ui'; g.fillText('★', px, py-6); g.font='bold 11px system-ui'; g.textAlign='right'; g.fillText('пик — до кнопки', px-8, py-8); }
    }
    if(S.phase==='timer' || S.phase==='charter'){ g.fillStyle='rgba(6,182,212,.8)'; g.font='bold 12px system-ui'; g.textAlign='right'; g.fillText(S.phase==='timer'?'волна спадает…':'волна спала: смотри в устав', W-R, T2+14); }
    // текущее значение
    g.beginPath(); g.arc(X(n-1),Y1(P[n-1]),4,0,Math.PI*2); g.fillStyle='#eef1ff'; g.fill();
    g.beginPath(); g.arc(X(n-1),Y2(D[n-1]),4,0,Math.PI*2); g.fill();
  }

  startMonth();
};
