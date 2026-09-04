/*
 * W-20 · widget_ps_l7_future_letter · П7 «Письмо из будущего»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     Увидеть, что причина катастрофы — цепочка СВОИХ действий, и её можно назвать заранее (конкретное — планируемо).
 *   Задание:  Выбери 3 карточки «что сломается через 8 недель», отправь письмо, перемотай 8 недель, сравни с фактом.
 *   Ага:      «Угадано 2 из 3» — не везение: карточки-причины повторяются у всех операторов; «рынок упал» случается в КАЖДОМ раунде и причиной не является.
 *   Дефолты:  8 причин из урока П7 + 3 «погодных» дистрактора; seed 42; рынок −18% на 4-й неделе всегда; 3 события за раунд; 8 недель = 7 секунд.
 *   Артефакт: Список «причина → предохранитель» для устава (текст + копирование), счёт попытки.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l7_future_letter'] = function(box){
  // 0. чистим прошлый запуск
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const shuffle = (a, r)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const k=a[i]; a[i]=a[j]; a[j]=k; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  if(!document.getElementById('exp-css-w20')){
    const s = document.createElement('style'); s.id = 'exp-css-w20';
    s.textContent = `
.w20{color:var(--txt,#eef1ff);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.w20 *{box-sizing:border-box}
.w20 h4{margin:0;font-size:17px}
.w20 .hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.w20 .step{font:12px var(--mono,ui-monospace,monospace);color:var(--acc2,#06b6d4)}
.w20 .mut{color:var(--mut,#9aa3c7);font-size:13px}
.w20 .mono{font-family:var(--mono,ui-monospace,monospace)}
.w20 .letter{margin:12px 0;padding:12px 14px;border:1px dashed var(--acc2,#06b6d4);border-radius:10px;background:rgba(6,182,212,.06)}
.w20 .date{font:12px var(--mono,ui-monospace,monospace);color:var(--mut,#9aa3c7)}
.w20 .slots{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.w20 .slot{flex:1 1 100px;min-height:46px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:6px 8px;font-size:13px;display:flex;align-items:center;gap:6px;color:var(--mut,#9aa3c7);cursor:default}
.w20 .slot.filled{border-color:var(--acc2,#06b6d4);color:var(--txt,#eef1ff);background:rgba(6,182,212,.12);cursor:pointer}
.w20 .slot .x{margin-left:auto;opacity:.6}
.w20 .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.w20 .card{border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;padding:10px;font-size:13px;line-height:1.3;cursor:pointer;background:rgba(255,255,255,.03);color:var(--txt,#eef1ff);text-align:left;min-height:64px;transition:transform .15s,border-color .15s,background .15s}
.w20 .card:hover{transform:translateY(-2px);border-color:var(--acc2,#06b6d4)}
.w20 .card.sel{border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.16)}
.w20 .card.dis{opacity:.4;cursor:not-allowed;transform:none}
.w20 .card i{font-style:normal;margin-right:6px}
.w20 .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.w20 .btn{border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);border-radius:8px;padding:9px 14px;font-size:14px;cursor:pointer}
.w20 .btn.pri{background:var(--acc2,#06b6d4);border-color:var(--acc2,#06b6d4);color:#03111a;font-weight:600}
.w20 .btn:disabled{opacity:.4;cursor:not-allowed}
.w20 canvas{width:100%;height:220px;display:block;border-radius:10px;background:#070a19;margin-top:8px}
.w20 .tlhd{margin-top:12px;font-size:14px}
.w20 .feed{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.w20 .feed li{padding:8px 10px;border-radius:8px;font-size:13px;border-left:3px solid var(--bad,#ef4444);background:rgba(239,68,68,.08);animation:w20in .35s}
.w20 .feed li.wx{border-left-color:var(--mut,#9aa3c7);background:rgba(255,255,255,.04)}
@keyframes w20in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.w20 .score{font-size:22px;font-weight:700;margin:14px 0 4px}
.w20 .row{display:grid;grid-template-columns:28px 1fr;gap:8px;padding:8px 10px;border-radius:8px;margin-top:6px;font-size:13px;background:rgba(255,255,255,.04);border:1px solid var(--line,rgba(255,255,255,.1))}
.w20 .row.hit{border-color:var(--ok,#22c55e)} .w20 .row.miss{border-color:var(--warn,#eab308)} .w20 .row.wx{border-color:var(--mut,#9aa3c7)} .w20 .row.fact{border-color:var(--bad,#ef4444)}
.w20 .row b.tag{display:block;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:var(--mut,#9aa3c7)}
.w20 .ico{font-size:18px;text-align:center}
.w20 .aha{margin-top:12px;padding:12px;border-radius:10px;background:rgba(6,182,212,.08);border:1px solid var(--acc2,#06b6d4);font-size:14px}
.w20 textarea{width:100%;min-height:150px;margin-top:8px;background:#070a19;color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:8px;font:12px/1.4 var(--mono,ui-monospace,monospace);resize:vertical}
`;
    document.head.appendChild(s);
  }

  // ---- данные (8 причин из П7 + 3 «погоды») ----
  const CAUSES = [
    {id:'off_dd',  ic:'⏻', t:'Выключил бота на просадке и стал торговать руками', fuse:'Остановка стратегии — только по kill-критериям в цифрах, днём, после записи в журнал (П1, 5.5).'},
    {id:'size_up', ic:'⤒', t:'Поднял размер позиции после удачной серии',       fuse:'Шаг риска — не чаще раза в квартал и не больше 1/10; вдвое за ночь — никогда (П3).'},
    {id:'night',   ic:'☾', t:'Вмешался ночью без факта поломки',                 fuse:'Белый список ночных событий у кровати; после полуночи решений нет (П5).'},
    {id:'concentr',ic:'◔', t:'Дал одному инструменту слишком много места',        fuse:'Лимит на инструмент и на контрагента ≤ 20% капитала (3.4, 5.7).'},
    {id:'no_check',ic:'✓', t:'Не заметил поломку — не было еженедельного осмотра',fuse:'Воскресный осмотр по 5 пунктам, 15 минут, в календаре (П2).'},
    {id:'advice',  ic:'✉', t:'Взял чужой совет вместо своей системы',            fuse:'Чужой сигнал = идея в журнал; в систему — только через паспорт гипотезы и бэктест (П6, 1.5).'},
    {id:'withdraw',ic:'₽', t:'Снял «на радостях» половину и сломал структуру',   fuse:'Вывод прибыли — по правилу устава (напр. 25% прибыли за квартал), не по настроению (5.6).'},
    {id:'tax',     ic:'§', t:'Тянул с налогами и документами до штрафов',        fuse:'Книга сделок ведётся автоматически; напоминание за месяц до 30 апреля (4.6).'}
  ];
  const WEATHER = [
    {id:'w_mkt',  ic:'☁', t:'Рынок упал', weather:true},
    {id:'w_luck', ic:'☁', t:'Просто не повезло', weather:true},
    {id:'w_news', ic:'☁', t:'Плохая новость обрушила биткоин', weather:true}
  ];

  let seed = 42, attempt = 1, round = null, chosen = [];

  function buildRound(sd){
    const r = mulberry32(sd);
    const pool = shuffle(CAUSES.slice(), r);
    const weeks = shuffle([2,3,5,6,7,8], r);              // неделя 4 — рынок (фон)
    const facts = pool.slice(0,3).map((f,i)=>Object.assign({}, f, {week: weeks[i]})).sort((a,b)=>a.week-b.week);
    const eq = [100];
    for(let d=1; d<56; d++){
      let g = 0.0025 + (r()-0.5)*0.02;
      if(d>=21 && d<27) g -= 0.03;                        // рынок −18% за 6 дней
      facts.forEach(f=>{ const fd=(f.week-1)*7+3; if(d===fd) g -= 0.09; if(d>fd) g -= 0.002; });
      eq.push(eq[eq.length-1]*(1+g));
    }
    return { facts, eq, cards: shuffle(CAUSES.concat(WEATHER), r) };
  }

  const q = sel => box.querySelector(sel);

  function renderStep1(){
    round = buildRound(seed); chosen = [];
    box.innerHTML = `
<div class="w20">
  <div class="hd"><h4>Письмо из будущего</h4><span class="step">шаг 1/3 · пишем письмо · попытка ${attempt}</span></div>
  <div class="mut">Прошло 8 недель. Капитал, выделенный боту, потерян. <b style="color:var(--txt,#eef1ff)">Почему?</b> Пиши не «рынок упал» (это погода), а цепочку своих действий. Выбери <b style="color:var(--txt,#eef1ff)">3 карточки</b>.</div>
  <div class="letter">
    <div class="date">дата: сегодня + 56 дней · отправитель: ты будущий · капитал бота: 0</div>
    <div class="slots" data-slots></div>
  </div>
  <div class="cards" data-cards></div>
  <div class="actions"><button class="btn pri" data-send disabled>Отправить письмо и перемотать 8 недель →</button></div>
  <div data-stage></div>
</div>`;
    const cardsEl = q('[data-cards]');
    round.cards.forEach(c=>{
      const b = document.createElement('button'); b.className='card'; b.type='button';
      b.innerHTML = `<i>${c.ic}</i>${esc(c.t)}`;
      b.onclick = ()=>{
        const i = chosen.findIndex(x=>x.id===c.id);
        if(i>=0) chosen.splice(i,1); else if(chosen.length<3) chosen.push(c);
        sync();
      };
      b._card = c; cardsEl.appendChild(b);
    });
    q('[data-send]').onclick = runTimeline;
    sync();
  }

  function sync(){
    box.querySelectorAll('.card').forEach(b=>{
      const sel = chosen.some(x=>x.id===b._card.id);
      b.classList.toggle('sel', sel); b.classList.toggle('dis', !sel && chosen.length>=3);
    });
    const slots = q('[data-slots]'); slots.innerHTML='';
    for(let i=0;i<3;i++){
      const c = chosen[i]; const d = document.createElement('div');
      d.className = 'slot' + (c?' filled':'');
      d.innerHTML = c ? `<i>${c.ic}</i><span>${esc(c.t)}</span><span class="x">×</span>` : `<span>причина ${i+1}: пусто</span>`;
      if(c) d.onclick = ()=>{ chosen.splice(i,1); sync(); };
      slots.appendChild(d);
    }
    q('[data-send]').disabled = chosen.length<3;
  }

  // ---- перемотка 8 недель ----
  function draw(canvas, p){
    const dpr = window.devicePixelRatio||1, W = canvas.clientWidth||320, H = canvas.clientHeight||220;
    if(canvas.width !== Math.round(W*dpr)){ canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr); }
    const g = canvas.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    const eq = round.eq, n = eq.length, L=40, R=12, T=18, B=26, pw=W-L-R, ph=H-T-B;
    const lo = Math.min.apply(null,eq)*0.95, hi = Math.max.apply(null,eq)*1.04;
    const X = i => L + pw*i/(n-1), Y = v => T + ph*(1-(v-lo)/(hi-lo));
    const shown = Math.max(1, Math.round(p*(n-1)));
    g.fillStyle='rgba(239,68,68,.10)'; g.fillRect(X(21),T,X(27)-X(21),ph);
    g.fillStyle='rgba(239,68,68,.75)'; g.font='11px system-ui'; g.textAlign='center'; g.fillText('рынок −18% (фон)', (X(21)+X(27))/2, T+12);
    g.strokeStyle='rgba(255,255,255,.08)'; g.lineWidth=1; g.fillStyle='#9aa3c7';
    for(let w=0; w<=8; w++){ const x=X(Math.min(n-1,w*7)); g.beginPath(); g.moveTo(x,T); g.lineTo(x,T+ph); g.stroke(); g.fillText('н.'+w, x, H-8); }
    g.setLineDash([4,4]); g.strokeStyle='rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(L,Y(100)); g.lineTo(L+pw,Y(100)); g.stroke(); g.setLineDash([]);
    g.textAlign='right'; g.fillStyle='#9aa3c7'; g.fillText('100%', L-4, Y(100)+4); g.fillText(Math.round(lo)+'%', L-4, T+ph); g.fillText(Math.round(hi)+'%', L-4, T+10);
    g.beginPath(); for(let i=0;i<=shown;i++){ const x=X(i), y=Y(eq[i]); i===0 ? g.moveTo(x,y) : g.lineTo(x,y); }
    g.strokeStyle='#06b6d4'; g.lineWidth=2; g.stroke();
    g.lineTo(X(shown),T+ph); g.lineTo(L,T+ph); g.closePath(); g.fillStyle='rgba(6,182,212,.12)'; g.fill();
    round.facts.forEach((f,k)=>{ const fd=(f.week-1)*7+3; if(shown>=fd){ const x=X(fd), y=Y(eq[fd]);
      g.beginPath(); g.arc(x,y,10,0,Math.PI*2); g.fillStyle='#ef4444'; g.fill();
      g.fillStyle='#fff'; g.font='bold 12px system-ui'; g.textAlign='center'; g.fillText(String(k+1), x, y+4); } });
    g.beginPath(); g.arc(X(shown),Y(eq[shown]),4,0,Math.PI*2); g.fillStyle='#eef1ff'; g.fill();
  }

  function runTimeline(){
    q('.step').textContent = `шаг 2/3 · перемотка 8 недель · попытка ${attempt}`;
    q('[data-cards]').style.display='none'; q('[data-send]').style.display='none';
    const stage = q('[data-stage]');
    stage.innerHTML = `<div class="tlhd"><b data-week>Неделя 0</b> <span class="mut">· капитал бота: <span class="mono" data-eq>100%</span></span></div><canvas></canvas><ul class="feed" data-feed></ul>`;
    const canvas = stage.querySelector('canvas'), feed = stage.querySelector('[data-feed]');
    const wk = stage.querySelector('[data-week]'), eqL = stage.querySelector('[data-eq]');
    const add = (html, cls)=>{ const li=document.createElement('li'); if(cls) li.className=cls; li.innerHTML=html; feed.appendChild(li); };
    const announced = {}; let lastP = 0; const t0 = performance.now(), DUR = 7000;
    box._expResize = ()=>draw(canvas,lastP); window.addEventListener('resize', box._expResize);
    const frame = now=>{
      const p = Math.min(1,(now-t0)/DUR); lastP=p; draw(canvas,p);
      const shown = Math.round(p*55);
      wk.textContent = 'Неделя ' + Math.min(8, Math.floor(shown/7)+1);
      eqL.textContent = Math.round(round.eq[shown]) + '%';
      if(shown>=27 && !announced.mkt){ announced.mkt=true; add('<b>Неделя 4.</b> Рынок −18% за 6 дней. Это фон: так было бы в любом раунде.', 'wx'); }
      round.facts.forEach((f,k)=>{ const fd=(f.week-1)*7+3; if(shown>=fd && !announced[f.id]){ announced[f.id]=true; add(`<b>${k+1} · Неделя ${f.week}.</b> ${esc(f.t)}`); } });
      if(p<1) raf(frame); else later(renderResult, 600);
    };
    raf(frame);
  }

  // ---- разбор ----
  function renderResult(){
    q('.step').textContent = `шаг 3/3 · факт против письма · попытка ${attempt}`;
    const factIds = round.facts.map(f=>f.id);
    const hits = chosen.filter(c=>factIds.indexOf(c.id)>=0);
    const wx = chosen.filter(c=>c.weather);
    let rows = '';
    chosen.forEach(c=>{
      if(c.weather) rows += `<div class="row wx"><div class="ico">☁</div><div><b class="tag">погода, не причина</b>${esc(c.t)} — рынок падал и в этом раунде, и во всех остальных. Вопрос письма — что ты сделал <i>после</i>.</div></div>`;
      else if(factIds.indexOf(c.id)>=0) rows += `<div class="row hit"><div class="ico">✔</div><div><b class="tag">предсказал</b>${esc(c.t)}<br><span class="mut">Предохранитель: ${esc(c.fuse)}</span></div></div>`;
      else rows += `<div class="row miss"><div class="ico">~</div><div><b class="tag">в этом раунде не сработало</b>${esc(c.t)} — но это типовая цепочка: предохранитель всё равно ставим.<br><span class="mut">${esc(c.fuse)}</span></div></div>`;
    });
    round.facts.forEach((f,k)=>{ if(!chosen.some(c=>c.id===f.id))
      rows += `<div class="row fact"><div class="ico">${k+1}</div><div><b class="tag">произошло, а ты не назвал</b>${esc(f.t)} (неделя ${f.week})<br><span class="mut">Предохранитель: ${esc(f.fuse)}</span></div></div>`; });

    let aha;
    if(hits.length>=2) aha = `<b>Угадал — и это не везение.</b> Все 8 карточек-причин повторяются у большинства операторов: они типовые цепочки, поэтому их можно назвать заранее. Угаданное — <b>признак, а не удача</b>. Именно поэтому письмо работает: конкретное — планируемо, абстрактное — игнорируется.`;
    else if(wx.length) aha = `<b>Ты написал погоду.</b> «${esc(wx[0].t)}» есть в каждом раунде — и никогда не является причиной. Причина — цепочка твоих действий, которую можно перекусить правилом. Погоду перекусить нельзя, к ней можно только приготовить зонт.`;
    else aha = `<b>Не совпало — и это тоже результат.</b> Твои карточки — реальные риски, просто в этом раунде сработали другие. Письмо пишут не ради угадывания: ради того, чтобы на КАЖДУЮ названную цепочку стоял предохранитель до старта.`;

    const artifactList = round.facts.concat(chosen.filter(c=>!c.weather && factIds.indexOf(c.id)<0));
    const art = `Письмо из будущего — предохранители (попытка ${attempt}, дата: ${new Date().toISOString().slice(0,10)})\n` +
      artifactList.map((c,i)=>`${i+1}. Причина: ${c.t}\n   Предохранитель: ${c.fuse}`).join('\n') +
      `\n\nПравило: письмо пишется до старта живых денег, перечитывается в первый день квартала, дополняется после каждого сбоя.`;

    const stage = q('[data-stage]');
    stage.insertAdjacentHTML('beforeend', `
<div class="score">Угадано ${hits.length} из 3</div>
${rows}
<div class="aha">${aha}</div>
<div class="mut" style="margin-top:12px">Артефакт: твои предохранители (положи рядом с уставом)</div>
<textarea readonly data-art>${esc(art)}</textarea>
<div class="actions"><button class="btn" data-copy>Скопировать</button><button class="btn pri" data-new>Новый раунд (другие 3 события)</button></div>`);
    const ta = stage.querySelector('[data-art]'), cp = stage.querySelector('[data-copy]');
    cp.onclick = ()=>{ ta.focus(); ta.select(); try{ document.execCommand('copy'); }catch(e){} if(navigator.clipboard){ navigator.clipboard.writeText(ta.value).catch(()=>{}); } cp.textContent='Скопировано ✓'; };
    stage.querySelector('[data-new]').onclick = ()=>{ seed = Date.now() % 2147483647; attempt++; if(box._expResize){ window.removeEventListener('resize', box._expResize); box._expResize=null; } renderStep1(); };
    stage.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  renderStep1();
};
