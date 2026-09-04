/*
 * W-26 · widget_ps_l13_body_calm · П13 «Физиология спокойствия»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l13_body_calm'] = function(box){
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
  const fmt = n => (n>0?'+':'') + Math.round(n).toLocaleString('ru-RU') + ' ₽';

  // ── 1. канон: сценарии (числа из уроков П1, П3, П5, П12, П13) ────────────
  const THRESH = 40;                    // ниже — рука не тянется
  const PHASES = [{n:'Вдох', s:4, c:'var(--acc2,#06b6d4)'},
                  {n:'Задержка', s:7, c:'var(--warn,#eab308)'},
                  {n:'Выдох', s:8, c:'var(--ok,#22c55e)'}];
  const CYCLE = 19, CYCLES = 3, TOTAL = CYCLE*CYCLES;
  const SCEN = [
    { id:'night', time:'03:14', sound:'…дзынь. Экран загорелся в тёмной спальне.',
      text:'Позиция бота: −2,8%. План стратегии допускает дневную просадку до −4%. Лог ошибок пуст, связь с биржей есть.',
      num:'−2,8% (норма до −4%)', pulse:96, impulse:82,
      truth:'Мир не изменился: связь есть, лог пуст, просадка внутри плана. Изменилась только голова — будильник звенел в ней. Это «голова», не «мир» (П1).',
      options:[
        {t:'Закрыть позицию руками — «пока не стало хуже»', kind:'head', calm:-35, money:-1800,
         why:'Ручное закрытие внутри плана — отмена решения системы по ощущению. Утром позиция вышла бы по своим правилам; ожидаемая цена вмешательства — минус одна средняя прибыльная сделка.'},
        {t:'Открыть терминал «просто одним глазком»', kind:'head', calm:-25, money:-400,
         why:'«Одним глазком» в три ночи не бывает (П5): −1,5 часа сна и открытая дверь для следующего импульса. Прямых денег почти не стоит — но именно так начинаются ручные закрытия.'},
        {t:'Проверить факт мира по белому списку (связь, лог — 30 сек) → факта нет → спать', kind:'rule', calm:+5, money:0,
         why:'Единственное действие по протоколу П1: назвать факт. Факта нет — значит будильник звенит только в голове. Сон сохранён, система работает.'},
        {t:'Отключить бота до утра — «на всякий случай»', kind:'head', calm:-20, money:-2200,
         why:'Пауза «пережду и включу» забирает убытки распределения и отказывается от его прибылей (5.5). Отключение без факта поломки — самое дорогое из четырёх.'}
      ]},
    { id:'evening', time:'22:40', sound:'Тишина. На экране третья зелёная неделя подряд.',
      text:'Счёт +11% за месяц. Мысль: «Система доказала себя — удвою размер, пока идёт». Устав разрешает менять размер раз в квартал и не больше чем на 10%.',
      num:'+11% за месяц', pulse:88, impulse:74,
      truth:'Лучший месяц статистически неотличим от везения (П3). Факта о рынке нет — есть сирена «теперь можно». Это «голова».',
      options:[
        {t:'Удвоить размер сегодня же — отобьём треть года за месяц', kind:'head', calm:-30, money:-4000,
         why:'Те же движения рынка, что дали +11%, при удвоении дадут −22% в первом неудачном периоде; на восстановление нужно +28% (0.12). Ты продал спокойствие за шёпот.'},
        {t:'Поднять размер на 10% сейчас — квартал же почти прошёл', kind:'head', calm:-10, money:-800,
         why:'«Почти прошёл» — это нарушение расписания устава на несколько дней. Мелкое, но именно так трещина превращается в прорыв забора (П8).'},
        {t:'Записать идею в журнал; вернуться к ней в плановую дату пересмотра', kind:'rule', calm:+5, money:0,
         why:'Риск растёт только по расписанию (П3). Идея не потеряна — она в журнале, а система не тронута в момент, когда критика отключена.'},
        {t:'Снять половину прибыли «на радостях»', kind:'head', calm:-5, money:-1000,
         why:'Прибыль — те же деньги, что и депозит («одна сумма», П3). Снятие вне правила устава ломает структуру капитала и учит мозг, что удача — повод для действий.'}
      ]},
    { id:'morning', time:'06:50', sound:'Будильник после четырёх часов сна.',
      text:'В голове «гениальная идея»: поменять шаг сетки у работающего бота. Никаких фактов изменения рынка нет.',
      num:'сон 4 ч (норма 7,5–8)', pulse:84, impulse:70,
      truth:'Недосып снижает активность префронтальной коры как 0,5 промилле (П13). «Гениальность» идеи — иллюзия гипер-уверенности усталого мозга (П12). Мир не менялся.',
      options:[
        {t:'Поменять шаг сетки сейчас, пока идея свежая', kind:'head', calm:-30, money:-2500,
         why:'Правка работающей системы невыспавшейся головой без бэктеста — та самая «хирургия вечером» из П12, только утром. Цена — сломанная система и потерянный опорный результат.'},
        {t:'Проверить идею сразу на половине депозита', kind:'head', calm:-20, money:-1500,
         why:'«Тест на реале» — это не тест, это ставка. Идею проверяет бэктест, а не половина депозита в 6:50 после четырёх часов сна.'},
        {t:'Записать идею; правки — только на свежую голову и только после бэктеста', kind:'rule', calm:+5, money:0,
         why:'Идея сохранена, система защищена. Утро «на свежую голову» — это утро после 8 часов сна, а не любое время до полудня.'},
        {t:'Досидеть до открытия активности рынка и решить «по первым свечам»', kind:'head', calm:-15, money:-600,
         why:'Решение по первым свечам — решение по шуму (П38). Плюс ещё час без сна: батарейка решений сядет к обеду.'}
      ]}
  ];

  // ── 2. состояние ─────────────────────────────────────────────────────────
  let seed = 42, rnd = mulberry32(seed);
  let sIdx = 0, sc = SCEN[0];
  let phase = 'before';          // before | breath | after | result
  let before = -1, after = -1;
  let speed = 1;                 // 1 — реальный темп, 4 — тренировочный
  let impulseNow = sc.impulse, pulseNow = sc.pulse, cyclesDone = 0, brokeAt = null;
  const history = [];

  // ── 3. разметка ──────────────────────────────────────────────────────────
  box.innerHTML = `
  <div class="bc">
    <style>
      .bc{font-family:inherit;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;max-width:100%;box-sizing:border-box}
      .bc *{box-sizing:border-box}
      .bc-title{font-weight:700;font-size:16px;margin:0 0 4px}
      .bc-goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
      .bc-steps{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
      .bc-steps span{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.1));color:var(--mut,#9aa3c7)}
      .bc-steps span.on{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:700}
      .bc-card{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:10px;padding:12px;background:rgba(255,255,255,.03);margin-bottom:10px}
      .bc-meta{display:flex;flex-wrap:wrap;gap:8px 14px;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px;color:var(--mut,#9aa3c7);margin-bottom:6px}
      .bc-meta b{color:var(--txt,#eef1ff)}
      .bc-sound{font-style:italic;color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:6px}
      .bc-text{font-size:14px;line-height:1.4}
      .bc-gauge{display:flex;align-items:center;gap:10px;margin-top:10px}
      .bc-bar{flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,.08);position:relative;overflow:hidden}
      .bc-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:var(--bad,#ef4444);transition:width .5s}
      .bc-bar u{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ok,#22c55e);left:${THRESH}%}
      .bc-opts{display:grid;gap:8px}
      .bc-opt{text-align:left;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);font:inherit;font-size:14px;cursor:pointer;transition:transform .1s,border-color .2s;line-height:1.35}
      .bc-opt:hover{border-color:var(--acc2,#06b6d4);transform:translateY(-1px)}
      .bc-opt.pick{border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.12)}
      .bc-opt.ok{border-color:var(--ok,#22c55e)} .bc-opt.bad{border-color:var(--bad,#ef4444)}
      .bc-btn{padding:9px 14px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(255,255,255,.05);color:var(--txt,#eef1ff);font:inherit;font-size:13px;cursor:pointer}
      .bc-btn.acc{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:700}
      .bc-btn.danger{border-color:var(--bad,#ef4444);color:var(--bad,#ef4444)}
      .bc-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
      .bc-canvas{width:100%;display:block;border-radius:10px;background:rgba(0,0,0,.25)}
      .bc-phase{font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px;color:var(--mut,#9aa3c7);margin-top:6px;text-align:center}
      .bc-aha{margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--ok,#22c55e);color:var(--ok,#22c55e);font-size:13px;display:none}
      .bc-aha.show{display:block;animation:bcPulse 1.2s ease-out}
      @keyframes bcPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}100%{box-shadow:0 0 0 16px rgba(34,197,94,0)}}
      .bc-cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
      @media(max-width:520px){.bc-cmp{grid-template-columns:1fr}}
      .bc-col{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:10px;padding:10px;font-size:13px}
      .bc-col h4{margin:0 0 6px;font-size:13px;color:var(--mut,#9aa3c7);font-weight:600}
      .bc-m{display:flex;justify-content:space-between;gap:8px;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:12px;margin-top:4px}
      .bc-mbar{height:6px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:3px;overflow:hidden}
      .bc-mbar i{display:block;height:100%;border-radius:4px}
      .bc-truth{border-left:3px solid var(--warn,#eab308);padding:6px 10px;margin:8px 0;font-size:13px;color:var(--txt,#eef1ff)}
      .bc-verdict{font-size:14px;line-height:1.45;margin:8px 0}
      .bc-art{margin-top:10px}
      .bc-art input{width:100%;padding:8px 10px;border-radius:8px;border:1px dashed var(--acc2,#06b6d4);background:rgba(6,182,212,.08);color:var(--txt,#eef1ff);font:inherit;font-size:13px}
      .bc-tally{font-size:12px;color:var(--mut,#9aa3c7);margin-top:8px}
      .bc-small{font-size:12px;color:var(--mut,#9aa3c7)}
    </style>
    <div class="bc-title">Физиология спокойствия: дыхание 4-7-8 против импульса</div>
    <div class="bc-goal">Цель: увидеть, что три цикла дыхания меняют решение — при том же событии и тех же цифрах. Мир не изменится. Изменится тело.</div>
    <div class="bc-steps"><span data-s="before">1 · Решение сейчас</span><span data-s="breath">2 · Дыхание</span><span data-s="after">3 · Решение снова</span><span data-s="result">4 · Разбор</span></div>
    <div class="bc-body"></div>
  </div>`;
  const body = box.querySelector('.bc-body');
  const setStep = ()=> box.querySelectorAll('.bc-steps span').forEach(s=>s.classList.toggle('on', s.dataset.s===phase));

  // ── 4. карточка события ──────────────────────────────────────────────────
  const eventCard = (imp, pulse, note)=>`
    <div class="bc-card">
      <div class="bc-meta"><span>⏰ <b>${sc.time}</b></span><span>♥ пульс <b>${Math.round(pulse)}</b></span><span>📊 <b>${esc(sc.num)}</b></span></div>
      <div class="bc-sound">${esc(sc.sound)}</div>
      <div class="bc-text">${esc(sc.text)}</div>
      <div class="bc-gauge"><span class="bc-small">импульс вмешаться</span><div class="bc-bar"><i style="width:${imp}%"></i><u></u></div><b style="font-family:var(--mono,monospace)">${Math.round(imp)}</b></div>
      <div class="bc-small" style="margin-top:4px">зелёная риска — порог ${THRESH}: ниже рука не тянется к кнопке${note?` · ${esc(note)}`:''}</div>
    </div>`;

  const optionsHtml = ()=> `<div class="bc-opts">${sc.options.map((o,i)=>`<button class="bc-opt" data-i="${i}">${esc(o.t)}</button>`).join('')}</div>`;

  // ── 5. фаза 1: решение ДО ────────────────────────────────────────────────
  function renderBefore(){
    phase='before'; setStep();
    impulseNow = sc.impulse; pulseNow = sc.pulse; cyclesDone = 0; brokeAt = null; before = after = -1;
    body.innerHTML = eventCard(impulseNow, pulseNow) +
      `<div class="bc-small" style="margin-bottom:6px">Задание: ответь честно — что ты сделаешь <b>прямо сейчас</b>, с этим пульсом. Разбор будет после.</div>` + optionsHtml();
    body.querySelectorAll('.bc-opt').forEach(b=>b.onclick=()=>{ before=+b.dataset.i; b.classList.add('pick'); later(renderBreath, 350); });
  }

  // ── 6. фаза 2: дыхание (canvas) ──────────────────────────────────────────
  function renderBreath(){
    phase='breath'; setStep();
    body.innerHTML = `
      <div class="bc-card">
        <div class="bc-small" style="margin-bottom:6px">Дыши вместе с кругом: <b>вдох 4 · задержка 7 · выдох 8</b>. Три цикла — 57 секунд. Ничего не решай, только дыши.</div>
        <canvas class="bc-canvas"></canvas>
        <div class="bc-phase"></div>
        <div class="bc-aha">Тело сообщило мозгу: опасности нет. 80% волокон блуждающего нерва идут снизу вверх — медленный выдох выключил сирену раньше любой логики.</div>
        <div class="bc-row">
          <button class="bc-btn danger bc-break">Сорваться сейчас</button>
          <button class="bc-btn bc-speed">${speed===1?'Ускорить ×4 (для просмотра)':'Вернуть реальный темп'}</button>
          <span class="bc-small bc-lbl"></span>
        </div>
      </div>`;
    const cv = body.querySelector('.bc-canvas'), ctx = cv.getContext('2d');
    const phaseEl = body.querySelector('.bc-phase'), aha = body.querySelector('.bc-aha'), lbl = body.querySelector('.bc-lbl');
    let W=0,H=0, dpr = Math.max(1, window.devicePixelRatio||1);
    const size = ()=>{ W = Math.max(300, cv.clientWidth||box.clientWidth-30); H = Math.min(300, Math.round(W*0.62)); cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); };
    size();
    const onRs = ()=>size(); window.addEventListener('resize', onRs); box._expOff = ()=>window.removeEventListener('resize', onRs);

    let start = null, running = true, ahaShown = false;
    const ease = x => 1 - Math.pow(1-x, 2);
    const I0 = sc.impulse, IMIN = 22, P0 = sc.pulse, PMIN = 64;

    function frame(now){
      if(!running) return;
      if(start===null) start = now;
      const el = Math.min(TOTAL, ((now-start)/1000)*speed);
      const cyc = Math.min(CYCLES-1, Math.floor(el/CYCLE)), within = el - cyc*CYCLE;
      let acc=0, pi=0; for(;pi<PHASES.length;pi++){ if(within < acc+PHASES[pi].s) break; acc+=PHASES[pi].s; }
      if(pi>=PHASES.length) pi=PHASES.length-1;
      const ph = PHASES[pi], pp = Math.min(1,(within-acc)/ph.s);
      const breath = pi===0 ? pp : pi===1 ? 1 : 1-pp;
      const prog = el/TOTAL;
      impulseNow = I0 - (I0-IMIN)*ease(prog);
      pulseNow = P0 - (P0-PMIN)*ease(prog);
      cyclesDone = Math.floor(el/CYCLE);

      ctx.clearRect(0,0,W,H);
      // ── круг дыхания
      const cx = W*0.34, cy = H*0.5, rmin = H*0.13, rmax = H*0.36, r = rmin+(rmax-rmin)*breath;
      const g = ctx.createRadialGradient(cx,cy,r*0.2,cx,cy,r*1.4);
      g.addColorStop(0, pi===0?'rgba(6,182,212,.35)':pi===1?'rgba(234,179,8,.30)':'rgba(34,197,94,.32)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*1.4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.lineWidth=3;
      ctx.strokeStyle = pi===0?'#06b6d4':pi===1?'#eab308':'#22c55e'; ctx.stroke();
      // кольцо прогресса фазы
      ctx.beginPath(); ctx.arc(cx,cy,rmax+10,-Math.PI/2,-Math.PI/2+Math.PI*2*pp); ctx.lineWidth=4; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.stroke();
      ctx.fillStyle='#eef1ff'; ctx.textAlign='center'; ctx.font='700 18px system-ui,sans-serif';
      ctx.fillText(ph.n, cx, cy-4);
      ctx.font='13px ui-monospace,Menlo,monospace'; ctx.fillStyle='#9aa3c7';
      ctx.fillText(Math.ceil(ph.s - pp*ph.s)+' с', cx, cy+16);
      // маркеры циклов
      for(let k=0;k<CYCLES;k++){ ctx.beginPath(); ctx.arc(cx-16+k*16, H-14, 5, 0, Math.PI*2); ctx.fillStyle = k<cyclesDone?'#22c55e':(k===cyc?'#eef1ff':'rgba(255,255,255,.2)'); ctx.fill(); }
      // ── шкала импульса
      const gx = W*0.76, gy0 = H*0.12, gy1 = H*0.86, gw = 26, gh = gy1-gy0;
      ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(gx-gw/2, gy0, gw, gh);
      const fh = gh*impulseNow/100;
      const fg = ctx.createLinearGradient(0,gy1-fh,0,gy1); fg.addColorStop(0, impulseNow>THRESH?'#ef4444':'#22c55e'); fg.addColorStop(1, impulseNow>THRESH?'#7f1d1d':'#14532d');
      ctx.fillStyle=fg; ctx.fillRect(gx-gw/2, gy1-fh, gw, fh);
      const ty = gy1 - gh*THRESH/100;
      ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(gx-gw/2-14,ty); ctx.lineTo(gx+gw/2+14,ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#9aa3c7'; ctx.font='11px ui-monospace,Menlo,monospace'; ctx.textAlign='left';
      ctx.fillText('порог '+THRESH, gx+gw/2+16, ty+4);
      ctx.textAlign='center'; ctx.fillStyle='#eef1ff'; ctx.font='700 20px ui-monospace,Menlo,monospace';
      ctx.fillText(Math.round(impulseNow), gx, gy0-6);
      ctx.font='11px system-ui,sans-serif'; ctx.fillStyle='#9aa3c7'; ctx.fillText('импульс вмешаться', gx, H-8);
      ctx.font='12px ui-monospace,Menlo,monospace'; ctx.fillStyle='#eef1ff'; ctx.textAlign='left';
      ctx.fillText('♥ '+Math.round(pulseNow), 10, 18);

      phaseEl.textContent = `Цикл ${Math.min(CYCLES,cyclesDone+1)}/${CYCLES} · ${ph.n} · импульс ${Math.round(impulseNow)} · пульс ${Math.round(pulseNow)}`;
      lbl.textContent = speed===1 ? 'реальный темп' : 'темп ×4 — дыхание не тренируется, только картинка';
      if(!ahaShown && impulseNow<=THRESH){ ahaShown=true; aha.classList.add('show'); }

      if(el>=TOTAL){ running=false; cyclesDone=CYCLES; later(renderAfter, 700); return; }
      raf(frame);
    }
    raf(frame);
    body.querySelector('.bc-break').onclick = ()=>{ running=false; if(box._expRaf) cancelAnimationFrame(box._expRaf); brokeAt = {cycle:cyclesDone+1, impulse:Math.round(impulseNow)}; renderAfter(); };
    body.querySelector('.bc-speed').onclick = (e)=>{ speed = speed===1?4:1; start=null; e.target.textContent = speed===1?'Ускорить ×4 (для просмотра)':'Вернуть реальный темп';
      // сохраняем текущий прогресс: пересчитываем старт от достигнутого elapsed
      const doneSec = cyclesDone*CYCLE; start = performance.now() - (doneSec/speed)*1000; };
  }

  // ── 7. фаза 3: то же событие, решение ПОСЛЕ ──────────────────────────────
  function renderAfter(){
    phase='after'; setStep();
    const note = brokeAt ? `ты сорвался на цикле ${brokeAt.cycle}` : `3 цикла пройдены`;
    body.innerHTML = eventCard(impulseNow, pulseNow, note) +
      `<div class="bc-small" style="margin-bottom:6px">То же событие. Те же цифры. Что ты делаешь <b>теперь</b>?</div>` + optionsHtml();
    body.querySelectorAll('.bc-opt').forEach(b=>b.onclick=()=>{ after=+b.dataset.i; b.classList.add('pick'); later(renderResult, 300); });
  }

  // ── 8. фаза 4: разбор, метрики, артефакт ─────────────────────────────────
  function renderResult(){
    phase='result'; setStep();
    const ob = sc.options[before], oa = sc.options[after];
    history.push({sc:sc.id, before:ob.kind, after:oa.kind, broke:!!brokeAt});
    const col = (h, o, imp)=>`
      <div class="bc-col"><h4>${h} · импульс ${Math.round(imp)}</h4>
        <div style="margin-bottom:6px">${esc(o.t)}</div>
        <div class="bc-small">${o.kind==='rule'?'✅ по правилу («мир» не менялся — действие по белому списку)':'⚠ «голова»: факта изменения мира нет'}</div>
        <div class="bc-m"><span>спокойствие / сон</span><span>${o.calm>0?'+':''}${o.calm}</span></div>
        <div class="bc-mbar"><i style="width:${Math.min(100,Math.abs(o.calm)*2.5)}%;background:${o.calm>=0?'var(--ok,#22c55e)':'var(--bad,#ef4444)'}"></i></div>
        <div class="bc-m"><span>ожидаемая цена решения</span><span>${fmt(o.money)}</span></div>
        <div class="bc-mbar"><i style="width:${Math.min(100,Math.abs(o.money)/45)}%;background:${o.money>=0?'var(--ok,#22c55e)':'var(--bad,#ef4444)'}"></i></div>
        <div class="bc-small" style="margin-top:6px">${esc(o.why)}</div>
      </div>`;
    let verdict;
    if(ob.kind!=='rule' && oa.kind==='rule') verdict = `Три цикла дыхания сменили решение. В мире ничего не изменилось — изменилось тело: импульс упал с ${sc.impulse} до ${Math.round(impulseNow)}. Разница между двумя колонками — ${fmt(oa.money-ob.money)} и ${oa.calm-ob.calm} пунктов сна. Это цена одной минуты дыхания.`;
    else if(ob.kind==='rule' && oa.kind==='rule') verdict = `Ты держался и до дыхания. Заметь: импульс всё равно был ${sc.impulse} — тело врало, голова выиграла. Дыхание — страховка на тот день, когда голова проиграет: у каждого он случается.`;
    else if(ob.kind!=='rule' && oa.kind!=='rule') verdict = `Дыхание снизило импульс до ${Math.round(impulseNow)}, но решение осталось «головой». Вывод: правило не записано заранее. Дыхание гасит тело, но за голову решает белый список (П5) — запиши его и повтори раунд.`;
    else verdict = `Редкий случай: ты сорвался после паузы. Проверь — ты дышал по кругу или смотрел на счётчик? Если пауза превращается в ожидание, она кормит тревогу, а не гасит её.`;
    if(brokeAt) verdict += ` Ты сорвался на цикле ${brokeAt.cycle} при импульсе ${brokeAt.impulse}: волна ещё не спала (пик кортизола держится, П11).`;
    const rule = `Если импульс вмешаться выше ${THRESH} (пульс ${sc.pulse}, ${sc.time}) — сначала 3 цикла 4-7-8, потом факт по белому списку, потом действие, потом строка в журнал.`;
    const t = history.reduce((a,h)=>{ a.b += h.before==='rule'?1:0; a.a += h.after==='rule'?1:0; return a; },{b:0,a:0});
    body.innerHTML = `
      <div class="bc-truth"><b>Правда о событии.</b> ${esc(sc.truth)}</div>
      <div class="bc-cmp">${col('ДО дыхания', ob, sc.impulse)}${col('ПОСЛЕ дыхания', oa, impulseNow)}</div>
      <div class="bc-verdict">${esc(verdict)}</div>
      <div class="bc-art"><div class="bc-small" style="margin-bottom:4px">Артефакт — правило одним предложением (скопируй в устав):</div><input readonly value="${esc(rule)}"></div>
      <div class="bc-tally">Раундов: ${history.length} · решений по правилу ДО дыхания: ${t.b}/${history.length} · ПОСЛЕ: ${t.a}/${history.length}</div>
      <div class="bc-row"><button class="bc-btn acc bc-next">Новый раунд (другое событие)</button><button class="bc-btn bc-same">Повторить это событие</button></div>`;
    body.querySelector('.bc-art input').onclick = e=>e.target.select();
    body.querySelector('.bc-same').onclick = renderBefore;
    body.querySelector('.bc-next').onclick = ()=>{ rnd = mulberry32(Date.now()); let n; do{ n = Math.floor(rnd()*SCEN.length); }while(n===sIdx && SCEN.length>1); sIdx=n; sc=SCEN[n]; renderBefore(); };
    try{ box.dispatchEvent(new CustomEvent('expert-artifact',{bubbles:true,detail:{widget:'widget_ps_l13_body_calm',rule,history:history.slice()}})); }catch(e){}
  }

  renderBefore();
};
