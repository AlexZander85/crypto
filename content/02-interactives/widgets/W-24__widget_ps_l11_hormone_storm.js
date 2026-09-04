/*
 * W-24 · widget_ps_l11_hormone_storm · П11 «Гормональный шторм»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:      увидеть на своих цифрах, что одинаковые по сложности задачи решаются хуже, когда экран горит красным.
 *   Задание:   три раунда по три вопроса (10 с на каждый): Штиль → Шторм → Шторм по протоколу «Красный экран» (один цикл дыхания 4-4-6, «не беспокоить»). Кнопка «ПРОДАТЬ ВСЁ» ничего не продаёт — она считает импульсы.
 *   Ага:       таблица трёх раундов: точность и среднее время. «Тот же ты, те же задачи» — в шторм точность падает, время растёт; после одного цикла дыхания — частично возвращается.
 *   Дефолты:   пульс 64 → 124 уд/мин, кортизол 10% → 90% (иллюстративная модель), обвал «BTC −18,4% за 12 минут» от 95 000 $, seed 42 для вопросов, «новый раунд» = seed из Date.now().
 *   Артефакт:  правило «Красный экран» + личные цифры трёх раундов + число импульсов к кнопке «продать всё» (копируется в буфер).
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l11_hormone_storm'] = function(box){
  // ---------- 0. чистим прошлый запуск ----------
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const noiseRnd = mulberry32(7); // только для визуального шума ЭКГ

  // ---------- 1. стили ----------
  const CSS = `
  .hs-root{--hs-acc:var(--acc2,#06b6d4);--hs-ok:var(--ok,#22c55e);--hs-bad:var(--bad,var(--err,#ef4444));--hs-warn:var(--warn,#eab308);
    --hs-txt:var(--txt,#eef1ff);--hs-mut:var(--mut,#9aa3c7);--hs-line:var(--line,rgba(154,163,199,.25));--hs-mono:var(--mono,ui-monospace,Menlo,Consolas,monospace);
    background:linear-gradient(160deg,#0d1022,#040714);color:var(--hs-txt);border:1px solid var(--hs-line);border-radius:12px;padding:14px;
    font-size:15px;line-height:1.45;position:relative;overflow:hidden;transition:background .6s;max-width:100%;box-sizing:border-box}
  .hs-root *{box-sizing:border-box}
  .hs-root.hs-storm{animation:hsFlash 1.1s ease-in-out infinite}
  .hs-root.hs-storm.hs-protocol{animation:none;background:linear-gradient(160deg,#1a0f1c,#080512)}
  @keyframes hsFlash{0%,100%{background:linear-gradient(160deg,#2a0a12,#0a0410)}50%{background:linear-gradient(160deg,#4a0d17,#12050e)}}
  .hs-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
  .hs-tag{font-size:12px;color:var(--hs-mut);border:1px solid var(--hs-line);border-radius:999px;padding:2px 8px}
  .hs-vitals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
  @media(max-width:480px){.hs-vitals{grid-template-columns:1fr}}
  .hs-vital{background:rgba(255,255,255,.03);border:1px solid var(--hs-line);border-radius:10px;padding:8px}
  .hs-vlabel{font-size:12px;color:var(--hs-mut);margin-top:4px}
  .hs-vlabel b{font-family:var(--hs-mono);color:var(--hs-txt);font-size:15px}
  .hs-ecg,.hs-ticker{display:block;width:100%;height:56px}
  .hs-ticker{height:90px;border:1px solid var(--hs-line);border-radius:10px;margin-bottom:10px;background:rgba(0,0,0,.25)}
  .hs-cbar{height:14px;border-radius:7px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:22px}
  .hs-cbar i{display:block;height:100%;width:10%;background:linear-gradient(90deg,var(--hs-ok),var(--hs-warn),var(--hs-bad));transition:width .5s}
  .hs-stage{min-height:200px}
  .hs-btn{cursor:pointer;border:1px solid var(--hs-line);background:rgba(255,255,255,.05);color:var(--hs-txt);border-radius:10px;padding:10px 14px;font-size:15px;transition:.15s}
  .hs-btn:hover{border-color:var(--hs-acc)}
  .hs-btn.hs-primary{background:var(--hs-acc);color:#041017;border-color:transparent;font-weight:600}
  .hs-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
  @media(max-width:400px){.hs-opts{grid-template-columns:1fr}}
  .hs-opts .hs-btn{font-family:var(--hs-mono);text-align:center}
  .hs-q{background:rgba(255,255,255,.03);border:1px solid var(--hs-line);border-radius:10px;padding:12px}
  .hs-qtimer{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:10px}
  .hs-qtimer i{display:block;height:100%;width:100%;background:var(--hs-acc)}
  .hs-storm .hs-qtimer i{background:var(--hs-bad)}
  .hs-qtext{font-size:17px;margin-bottom:4px}
  .hs-qmeta{font-size:12px;color:var(--hs-mut)}
  .hs-sell{display:block;width:100%;margin-top:12px;padding:14px;border-radius:12px;border:2px solid var(--hs-bad);background:rgba(239,68,68,.15);color:#fff;font-weight:800;letter-spacing:.06em;font-size:16px;cursor:pointer}
  .hs-storm .hs-sell{animation:hsPulse .8s ease-in-out infinite;background:rgba(239,68,68,.35)}
  .hs-storm.hs-protocol .hs-sell{animation:none;background:rgba(239,68,68,.15)}
  @keyframes hsPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{transform:scale(1.02);box-shadow:0 0 0 12px rgba(239,68,68,0)}}
  .hs-sellnote{font-size:13px;color:var(--hs-warn);min-height:20px;margin-top:6px}
  .hs-toasts{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px;max-width:70%;pointer-events:none;z-index:3}
  .hs-toast{background:rgba(239,68,68,.92);color:#fff;border-radius:8px;padding:8px 10px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4);animation:hsIn .25s ease-out}
  @keyframes hsIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}
  .hs-foot{margin-top:10px;font-size:12px;color:var(--hs-mut);display:flex;gap:14px;flex-wrap:wrap}
  .hs-foot b{color:var(--hs-txt);font-family:var(--hs-mono)}
  .hs-breath{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px}
  .hs-circle{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(6,182,212,.7),rgba(6,182,212,.1));border:2px solid var(--hs-acc);transition:transform 1s linear;transform:scale(.6)}
  .hs-big{font-size:28px;font-family:var(--hs-mono)}
  .hs-table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0}
  .hs-table th,.hs-table td{border-bottom:1px solid var(--hs-line);padding:6px 4px;text-align:left}
  .hs-table td b{font-family:var(--hs-mono)}
  .hs-aga{border-left:3px solid var(--hs-acc);padding:8px 10px;background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;margin:10px 0}
  .hs-art{font-family:var(--hs-mono);font-size:12.5px;white-space:pre-wrap;background:rgba(0,0,0,.35);border:1px solid var(--hs-line);border-radius:8px;padding:10px;margin:8px 0}
  .hs-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .hs-badge{display:inline-block;font-size:12px;border:1px solid var(--hs-line);border-radius:999px;padding:2px 8px;color:var(--hs-mut)}
  .hs-shake{animation:hsShake .3s}
  @keyframes hsShake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  `;

  box.innerHTML = `<style>${CSS}</style>
  <div class="hs-root">
    <div class="hs-head"><b>Гормональный шторм — тренажёр</b><span class="hs-tag">пульс и кортизол — иллюстративная модель</span></div>
    <div class="hs-vitals">
      <div class="hs-vital"><canvas class="hs-ecg"></canvas><div class="hs-vlabel">Пульс <b data-role="bpm">64</b> уд/мин</div></div>
      <div class="hs-vital"><div class="hs-cbar"><i data-role="cort"></i></div><div class="hs-vlabel">Кортизол <b data-role="cortv">10</b> % <span class="hs-badge" data-role="mode">штиль</span></div></div>
    </div>
    <canvas class="hs-ticker"></canvas>
    <div class="hs-stage"></div>
    <div class="hs-toasts"></div>
    <div class="hs-foot"><span>Раунд: <b data-role="round">—</b></span><span>Импульсов «продать всё»: <b data-role="imp">0</b></span><span>Скрыто уведомлений: <b data-role="hidden">0</b></span></div>
  </div>`;

  const $ = s => box.querySelector(s);
  const root = $('.hs-root'), stage = $('.hs-stage'), toasts = $('.hs-toasts');
  const ecgC = $('.hs-ecg'), tickC = $('.hs-ticker');

  // ---------- 2. состояние ----------
  const ROUND_NAMES = ['Штиль', 'Шторм', 'Шторм + протокол «Красный экран»'];
  const S = {
    seed: 42, rnd: null, phase: 'intro', round: 0, qIdx: 0,
    questions: [], results: [[],[],[]], impulses: [0,0,0], hidden: 0,
    qStart: 0, limit: 10000, qTimer: null,
    storm: false, protocol: false, roundStart: performance.now(),
    bpm: 64, cort: 10, tBpm: 64, tCort: 10, beatPhase: 0, ecgBuf: [],
    calmSeries: [], stormSeries: [], breathTimers: []
  };

  // ---------- 3. генератор вопросов (одинаковые шаблоны в каждом раунде) ----------
  const pick = (r, arr) => arr[Math.floor(r()*arr.length)];
  const fmt = n => { const v = Math.round(n*10)/10; return String(v).replace('.', ','); };
  const T = [
    r => { const size = pick(r,[1500,2400,3600,4800,6000,8000]); const fee = pick(r,[0.1,0.2,0.5]);
           return {q:`Комиссия ${fmt(fee)} % от сделки на ${size} $. Сколько это в долларах?`, ans:size*fee/100, unit:'$'}; },
    r => { const p = pick(r,[80,120,160,200,240,300]); const d = pick(r,[10,20,25,40,50]);
           return {q:`Цена ${p} $ упала на ${d} %. Какая цена сейчас?`, ans:p*(1-d/100), unit:'$'}; },
    r => { const d = pick(r,[20,25,50,75]); const need = {20:25,25:33.3,50:100,75:300}[d];
           return {q:`Депозит просел на ${d} %. Сколько процентов нужно заработать, чтобы вернуться в ноль?`, ans:need, unit:'%'}; }
  ];
  function buildQuestions(r){
    const out = [];
    for(let round=0; round<3; round++){
      for(let k=0; k<3; k++){
        const q = T[k](r);
        const cands = [q.ans*2, q.ans/2, q.ans*1.25, q.ans*0.8, q.ans*1.1, q.ans*0.6].map(v=>Math.round(v*10)/10);
        const wrong = []; cands.forEach(v=>{ if(v!==Math.round(q.ans*10)/10 && !wrong.includes(v) && v>0) wrong.push(v); });
        const opts = [q.ans].concat(wrong.slice(0,3));
        for(let i=opts.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=opts[i]; opts[i]=opts[j]; opts[j]=t; }
        out.push({text:q.q, ans:q.ans, unit:q.unit, opts});
      }
    }
    return out;
  }
  // ---------- 4. ряды цен (детерминированные) ----------
  function makeSeries(r, storm){
    const n = 600, out = []; let v = 100;
    for(let i=0;i<n;i++){
      if(storm){
        const f = Math.min(1, (i/n)/0.55); const st = f*f*(3-2*f); // smoothstep
        const target = 100 - 18.4*st;
        v = v*0.8 + target*0.2 + (r()-0.5)*1.3;
      } else {
        v = 100 + (v-100)*0.98 + (r()-0.5)*0.5;
      }
      out.push(v);
    }
    return out;
  }
  function init(seed){
    S.seed = seed; S.rnd = mulberry32(seed);
    S.questions = buildQuestions(S.rnd);
    S.calmSeries = makeSeries(S.rnd, false);
    S.stormSeries = makeSeries(S.rnd, true);
    S.phase='intro'; S.round=0; S.qIdx=0; S.results=[[],[],[]]; S.impulses=[0,0,0]; S.hidden=0;
    S.storm=false; S.protocol=false; S.tBpm=64; S.tCort=10; S.roundStart=performance.now();
    root.classList.remove('hs-storm','hs-protocol'); toasts.innerHTML='';
    renderIntro(); updateFoot();
  }

  // ---------- 5. сцены ----------
  function updateFoot(){
    $('[data-role=round]').textContent = S.phase==='round' ? `${S.round+1}/3 · ${ROUND_NAMES[S.round]}` : (S.phase==='result' ? 'итоги' : '—');
    $('[data-role=imp]').textContent = S.impulses.reduce((a,b)=>a+b,0);
    $('[data-role=hidden]').textContent = S.hidden;
    $('[data-role=mode]').textContent = S.protocol ? '🔕 не беспокоить' : (S.storm ? '⚠ шторм' : 'штиль');
  }
  function renderIntro(){
    stage.innerHTML = `
      <p>Перед тобой три коротких раунда по три задачи — те же типы задач, что ты решаешь перед каждой сделкой: комиссия, цена после падения, процент восстановления. На каждую — <b>10 секунд</b>.</p>
      <p>Раунд 1 — спокойный рынок. Раунд 2 — начнётся обвал: BTC <b>−18,4 % за 12 минут</b>, биржа приостанавливает вывод. Раунд 3 — тот же обвал, но по протоколу «Красный экран». Красная кнопка ничего не продаёт — она считает, сколько раз рука к ней потянется.</p>
      <div class="hs-row"><button class="hs-btn hs-primary" data-act="start">Начать раунд 1: Штиль →</button></div>`;
    stage.querySelector('[data-act=start]').onclick = ()=>{ S.phase='round'; S.round=0; S.qIdx=0; S.roundStart=performance.now(); renderQuestion(); };
  }
  function renderQuestion(){
    updateFoot();
    const q = S.questions[S.round*3 + S.qIdx];
    stage.innerHTML = `
      <div class="hs-q">
        <div class="hs-qtimer"><i data-role="tbar"></i></div>
        <div class="hs-qmeta">${ROUND_NAMES[S.round]} · вопрос ${S.qIdx+1} из 3</div>
        <div class="hs-qtext">${q.text}</div>
        <div class="hs-opts">${q.opts.map((o,i)=>`<button class="hs-btn" data-opt="${i}">${fmt(o)} ${q.unit}</button>`).join('')}</div>
        <button class="hs-sell" data-act="sell">ПРОДАТЬ ВСЁ</button>
        <div class="hs-sellnote" data-role="note"></div>
      </div>`;
    S.qStart = performance.now();
    if(S.qTimer){ clearTimeout(S.qTimer); }
    S.qTimer = later(()=>answer(null), S.limit);
    stage.querySelectorAll('[data-opt]').forEach(b=> b.onclick = ()=> answer(q.opts[+b.dataset.opt]));
    stage.querySelector('[data-act=sell]').onclick = ()=>{
      S.impulses[S.round]++; updateFoot();
      const n = S.impulses[S.round];
      stage.querySelector('[data-role=note]').textContent = `Импульс №${n} зафиксирован. Ничего не продано — это тренажёр. Заметь: рука дотянулась быстрее, чем голова досчитала.`;
      root.classList.remove('hs-shake'); void root.offsetWidth; root.classList.add('hs-shake');
    };
  }
  function answer(val){
    if(S.phase!=='round') return;
    if(S.qTimer){ clearTimeout(S.qTimer); S.qTimer=null; }
    const q = S.questions[S.round*3 + S.qIdx];
    const ms = Math.min(S.limit, performance.now()-S.qStart);
    const ok = val!==null && Math.abs(val-q.ans)<1e-6;
    S.results[S.round].push({ok, ms});
    // мгновенная обратная связь
    const btns = stage.querySelectorAll('[data-opt]');
    btns.forEach(b=>{ const v=q.opts[+b.dataset.opt]; if(Math.abs(v-q.ans)<1e-6) b.style.borderColor='var(--hs-ok)'; else if(val!==null && Math.abs(v-val)<1e-6) b.style.borderColor='var(--hs-bad)'; b.disabled=true; });
    later(()=>{
      S.qIdx++;
      if(S.qIdx<3){ renderQuestion(); return; }
      endRound();
    }, 550);
  }
  function endRound(){
    S.round++;
    if(S.round===1){ renderCrashTransition(); return; }
    if(S.round===2){ renderBreath(); return; }
    S.phase='result'; stopStorm(); renderResult();
  }
  function renderCrashTransition(){
    stage.innerHTML = `<div class="hs-breath"><div class="hs-big" style="color:var(--hs-bad)">⚠ −18,4 %</div><p style="text-align:center">Внезапная новость: ведущая биржа блокирует вывод. Биткоин падает за минуты. Те же задачи — другой экран.</p><span class="hs-badge">раунд 2 начнётся через <b data-role="cd">3</b> с</span></div>`;
    let cd = 3; const iv = later(()=>{ cd--; const el=stage.querySelector('[data-role=cd]'); if(el) el.textContent=cd; if(cd<=0){ clearInterval(iv); startStorm(false); S.phase='round'; S.qIdx=0; renderQuestion(); } }, 1000, true);
  }
  function startStorm(protocol){
    S.storm=true; S.protocol=protocol; S.roundStart=performance.now();
    root.classList.add('hs-storm'); if(protocol) root.classList.add('hs-protocol'); else root.classList.remove('hs-protocol');
    S.tBpm = protocol ? 92 : 124; S.tCort = protocol ? 55 : 90;
    const msgs = [[900,'🔴 Ликвидации за час: 1,2 млрд $'],[3800,'⛔ Биржа X: вывод средств временно приостановлен'],[7500,'📉 BTC пробил 80 000 $'],[11500,'💬 Чат: «ВСЁ, ЭТО КОНЕЦ, ПРОДАВАЙТЕ»'],[16000,'🔴 Ещё −4 % за 40 секунд'],[21000,'📱 Знакомый: «ты видел?? продал всё»']];
    msgs.forEach(m=> later(()=>{
      if(!S.storm) return;
      if(S.protocol){ S.hidden++; updateFoot(); return; } // «не беспокоить»: уведомление скрыто
      const el=document.createElement('div'); el.className='hs-toast'; el.textContent=m[1]; toasts.appendChild(el);
      later(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 3600);
    }, m[0]));
    updateFoot();
  }
  function stopStorm(){ S.storm=false; S.protocol=false; root.classList.remove('hs-storm','hs-protocol'); toasts.innerHTML=''; S.tBpm=72; S.tCort=25; }
  function renderBreath(){
    root.classList.remove('hs-storm'); toasts.innerHTML='';
    stage.innerHTML = `<div class="hs-breath">
      <p style="text-align:center;margin:0">Протокол «Красный экран»: руки от мыши, один цикл дыхания <b>4-4-6</b>, телефон — в режим «не беспокоить».</p>
      <div class="hs-circle" data-role="circle"></div>
      <div class="hs-big" data-role="ph">Приготовься…</div>
      <div class="hs-badge">пульс снижается: <b data-role="bp">124</b> → 92 уд/мин</div>
    </div>`;
    const circle = stage.querySelector('[data-role=circle]'), ph = stage.querySelector('[data-role=ph]');
    const steps = [['Вдох носом', 4, 1.0], ['Задержка', 4, 1.0], ['Выдох ртом', 6, 0.6]];
    let si=0, left=steps[0][1];
    const startBpm = S.bpm;
    const run = ()=>{
      const st = steps[si]; circle.style.transitionDuration = st[1]+'s'; circle.style.transform = `scale(${st[2]})`;
      ph.textContent = `${st[0]} · ${left}`;
      const iv = later(()=>{
        left--; ph.textContent = `${st[0]} · ${left}`;
        const done = steps.slice(0,si).reduce((a,s)=>a+s[1],0) + (st[1]-left);
        S.tBpm = Math.round(startBpm - (startBpm-92)*done/14); stage.querySelector('[data-role=bp]').textContent = S.tBpm;
        if(left<=0){ clearInterval(iv); si++; if(si<steps.length){ left=steps[si][1]; run(); } else { finishBreath(); } }
      }, 1000, true);
    };
    const finishBreath = ()=>{
      ph.textContent = 'Цикл завершён';
      stage.querySelector('.hs-breath').insertAdjacentHTML('beforeend', `<button class="hs-btn hs-primary" data-act="go">К терминалу — раунд 3 →</button>`);
      stage.querySelector('[data-act=go]').onclick = ()=>{ startStorm(true); S.phase='round'; S.qIdx=0; renderQuestion(); };
    };
    run();
  }
  function summary(i){
    const r = S.results[i]; const acc = r.filter(x=>x.ok).length;
    const avg = r.length ? r.reduce((a,x)=>a+x.ms,0)/r.length/1000 : 0;
    return {acc, avg: Math.round(avg*10)/10, imp: S.impulses[i]};
  }
  function renderResult(){
    updateFoot();
    const c = summary(0), s = summary(1), p = summary(2);
    let aga = '';
    if(s.acc < c.acc || s.avg > c.avg + 0.5)
      aga = `<b>Тот же ты, те же задачи.</b> В шторм точность ${c.acc}/3 → ${s.acc}/3, среднее время ${fmt(c.avg)} с → ${fmt(s.avg)} с. Ничего в задачах не изменилось — изменилась кровь.`;
    else
      aga = `В этой модели шторм не сбил тебя с цифр (${s.acc}/3, ${fmt(s.avg)} с). Учебный обвал мягче настоящего: там на кону твои деньги, а не тренажёр. Правило всё равно пишется заранее — на холодную голову.`;
    if(p.acc > s.acc || p.avg < s.avg)
      aga += ` Один цикл дыхания 4-4-6 вернул часть: ${p.acc}/3 и ${fmt(p.avg)} с${S.hidden?`, а «не беспокоить» скрыло ${S.hidden} уведомлений`:''}.`;
    else
      aga += ` Одного цикла дыхания в модели не хватило (${p.acc}/3, ${fmt(p.avg)} с) — в жизни протокол требует 10 циклов и запрет на ручные сделки, пока кортизол не спадёт (2–4 часа).`;
    const impTotal = S.impulses.reduce((a,b)=>a+b,0);
    if(impTotal>0) aga += ` Рука тянулась к «продать всё» ${impTotal} раз, из них ${s.imp+p.imp} — в шторм. Ничего не продано: это и есть цена автоматики вместо руки.`;
    const artifact =
`Правило «Красный экран» — мои цифры (тренажёр П11, seed ${S.seed})
Штиль:            ${c.acc}/3 верно, ${fmt(c.avg)} с на задачу, импульсов «продать всё»: ${c.imp}
Шторм:            ${s.acc}/3 верно, ${fmt(s.avg)} с на задачу, импульсов «продать всё»: ${s.imp}
Шторм + протокол: ${p.acc}/3 верно, ${fmt(p.avg)} с на задачу, импульсов «продать всё»: ${p.imp}, скрыто уведомлений: ${S.hidden}
При обвале: 1) руки от мыши и телефона; 2) дыхание 4-4-6 × 10 циклов; 3) защиту исполняет автоматика (стопы, kill-switch), а не я;
4) к терминалу — не раньше чем через 2 часа и только по белому списку событий (П5).`;
    stage.innerHTML = `
      <table class="hs-table"><tr><th>Раунд</th><th>Точность</th><th>Ср. время</th><th>Импульсов</th></tr>
        ${[c,s,p].map((x,i)=>`<tr><td>${ROUND_NAMES[i]}</td><td><b>${x.acc}/3</b></td><td><b>${fmt(x.avg)} с</b></td><td><b>${x.imp}</b></td></tr>`).join('')}
      </table>
      <div class="hs-aga">${aga}</div>
      <div class="hs-art" data-role="art">${artifact}</div>
      <div class="hs-row">
        <button class="hs-btn hs-primary" data-act="copy">Скопировать правило</button>
        <button class="hs-btn" data-act="again">Новый раунд (другие числа)</button>
        <button class="hs-btn" data-act="same">Повторить с теми же задачами</button>
      </div>`;
    stage.querySelector('[data-act=copy]').onclick = e=>{
      const txt = stage.querySelector('[data-role=art]').textContent;
      const done = ()=>{ e.target.textContent='Скопировано ✓'; later(()=>{ e.target.textContent='Скопировать правило'; }, 1500); };
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, done); }
      else { const ta=document.createElement('textarea'); ta.value=txt; box.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(err){} box.removeChild(ta); done(); }
    };
    stage.querySelector('[data-act=again]').onclick = ()=> init(Date.now() & 0x7fffffff);
    stage.querySelector('[data-act=same]').onclick = ()=> init(S.seed);
  }

  // ---------- 6. канвасы: ЭКГ и лента цены ----------
  function fit(c, h){
    const dpr = Math.min(2, window.devicePixelRatio||1); const w = c.clientWidth||300;
    if(c.width!==Math.round(w*dpr) || c.height!==Math.round(h*dpr)){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); }
    const g=c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return [g,w,h];
  }
  let lastT = performance.now();
  function drawEcg(dt){
    const [g,w,h] = fit(ecgC, 56);
    const stress = (S.cort-10)/80;
    S.beatPhase += dt*S.bpm/60000;
    for(let k=0;k<3;k++){
      const p = (S.beatPhase + k*0.002) % 1;
      let y = 0;
      if(p<0.05) y = -Math.sin(p/0.05*Math.PI);
      else if(p<0.09) y = 0.28*Math.sin((p-0.05)/0.04*Math.PI);
      else if(p>0.22 && p<0.34) y = -0.18*Math.sin((p-0.22)/0.12*Math.PI);
      y += (noiseRnd()-0.5)*0.12*(0.3+stress);
      S.ecgBuf.push(y);
    }
    const maxLen = Math.max(60, Math.floor(w)); while(S.ecgBuf.length>maxLen) S.ecgBuf.shift();
    g.clearRect(0,0,w,h);
    g.strokeStyle = S.storm && !S.protocol ? '#ef4444' : (S.storm ? '#eab308' : '#22c55e'); g.lineWidth=1.6; g.beginPath();
    S.ecgBuf.forEach((y,i)=>{ const x=i, yy=h*0.6 - y*h*0.42; if(i===0) g.moveTo(x,yy); else g.lineTo(x,yy); });
    g.stroke();
  }
  function drawTicker(){
    const [g,w,h] = fit(tickC, 90);
    const series = S.storm ? S.stormSeries : S.calmSeries;
    const elapsed = performance.now() - S.roundStart;
    const idx = Math.min(series.length-1, Math.floor(elapsed/60));
    const win = 160; const from = Math.max(0, idx-win+1); const pts = series.slice(from, idx+1);
    g.clearRect(0,0,w,h);
    if(pts.length<2) return;
    let mn=Math.min.apply(null,pts), mx=Math.max.apply(null,pts); if(mx-mn<2){ mn-=1; mx+=1; }
    const X = i => 8 + i/(win-1)*(w-90), Y = v => 10 + (mx-v)/(mx-mn)*(h-22);
    g.strokeStyle='rgba(154,163,199,.25)'; g.lineWidth=1; g.beginPath(); g.moveTo(8,Y(100)); g.lineTo(w-82,Y(100)); g.stroke();
    const last = pts[pts.length-1]; const drop = last-100;
    g.strokeStyle = drop < -3 ? '#ef4444' : '#06b6d4'; g.lineWidth=2; g.beginPath();
    pts.forEach((v,i)=>{ if(i===0) g.moveTo(X(i),Y(v)); else g.lineTo(X(i),Y(v)); }); g.stroke();
    g.fillStyle='#eef1ff'; g.font='12px ui-monospace,Menlo,Consolas,monospace'; g.textAlign='right';
    const price = Math.round(95000*last/100/10)*10;
    g.fillText(`BTC ${String(price).replace(/\B(?=(\d{3})+(?!\d))/g,' ')} $`, w-6, 16);
    g.fillStyle = drop<-3 ? '#ef4444' : '#9aa3c7';
    g.fillText(`${drop>=0?'+':''}${fmt(drop)} %`, w-6, 32);
    g.fillStyle='#9aa3c7'; g.font='11px sans-serif'; g.textAlign='left';
    g.fillText(S.storm ? 'обвал: −18,4 % за 12 минут (сжато)' : 'спокойный рынок', 8, h-4);
  }
  function loop(now){
    const dt = Math.min(100, now-lastT); lastT=now;
    S.bpm += (S.tBpm-S.bpm)*Math.min(1, dt/900);
    S.cort += (S.tCort-S.cort)*Math.min(1, dt/1400);
    $('[data-role=bpm]').textContent = Math.round(S.bpm);
    $('[data-role=cortv]').textContent = Math.round(S.cort);
    $('[data-role=cort]').style.width = Math.round(S.cort)+'%';
    drawEcg(dt); drawTicker();
    const bar = stage.querySelector('[data-role=tbar]');
    if(bar && S.phase==='round'){ const f = Math.max(0, 1-(now-S.qStart)/S.limit); bar.style.width=(f*100)+'%'; }
    if(document.body.contains(box)) raf(loop);
  }

  init(42);
  raf(loop);
};
