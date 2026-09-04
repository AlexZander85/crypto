/*
 * W-43 · widget_v4_seed · 0.2 «Защити seed-фразу»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель: понять, что seed = весь кошелёк: показывается один раз, порядок слов критичен, а любая «удобная» цифровая копия — это раздача ключей всем, кто дотянется до устройства/облака.
 *   Задание: за 45 секунд сохранить 12 слов; подтвердить фразу кошельку в правильном порядке; выбрать способ хранения и увидеть, кто ещё увидел фразу; через «2 года» восстановить кошелёк.
 *   Ага: сцена «Кто видел твой экран»: после скриншота или заметок загораются глаза облака, синхронизированных устройств и стилера; при бумаге — только твои. Финал: фраза подошла, а баланс 0 — «кто-то восстановил кошелёк раньше из твоей же копии».
 *   Дефолты: 12 слов из упрощённого BIP39-списка (английские, с переводом), 45 с на экране, 4 способа сохранения (бумага / скриншот / заметки / буфер), одна попытка исправить бумагу (кошелёк ещё открыт, 20 с); сид 7.
 *   Артефакт: «Seed-тренажёр #N: способ …, ошибок порядка …, фразу видели: … сторон, восстановление: …».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_v4_seed'] = function(box){
  // ── 0. чистка ──────────────────────────────────────────────────────────
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const WORDS = [['apple','яблоко'],['river','река'],['tiger','тигр'],['garden','сад'],['silver','серебро'],['mountain','гора'],['coffee','кофе'],['planet','планета'],['window','окно'],['bridge','мост'],['candle','свеча'],['forest','лес'],['market','рынок'],['orange','апельсин'],['pencil','карандаш'],['rocket','ракета'],['summer','лето'],['ticket','билет'],['violin','скрипка'],['yellow','жёлтый'],['anchor','якорь'],['basket','корзина'],['castle','замок'],['dragon','дракон'],['eagle','орёл'],['guitar','гитара'],['hammer','молоток'],['island','остров'],['jacket','куртка'],['kitten','котёнок'],['lemon','лимон'],['mirror','зеркало'],['ocean','океан'],['piano','пианино'],['rabbit','кролик'],['tomato','помидор']];
  const SHOW_SEC = 45, FIX_SEC = 20;
  let seed = box._seedSeed || 7, attempts = box._seedAttempts || 0, rnd, st;

  box.innerHTML = `
  <style>
    .sd{color:var(--txt,#eef1ff);font:14px/1.45 system-ui,sans-serif;background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:12px;padding:14px;box-sizing:border-box}
    .sd *{box-sizing:border-box}
    .sd-title{font-weight:700;font-size:16px} .sd-goal{color:var(--mut,#9aa3c7);font-size:13px;margin:2px 0 10px}
    .sd-steps{display:flex;gap:4px;margin-bottom:12px} .sd-steps span{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08)} .sd-steps span.on{background:var(--acc2,#06b6d4)}
    .sd button{background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.4);color:var(--txt,#eef1ff);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;transition:background .15s,transform .1s}
    .sd button:hover{background:rgba(6,182,212,.25)} .sd button:active{transform:scale(.97)} .sd button:disabled{opacity:.4;cursor:default}
    .sd button.pri{background:var(--acc2,#06b6d4);color:#04121a;font-weight:700} .sd button.tempt{border-color:rgba(234,179,8,.5);background:rgba(234,179,8,.08)}
    .sd-wallet{position:relative;border:1px solid var(--line,rgba(154,163,199,.25));border-radius:10px;padding:10px;background:rgba(255,255,255,.03)}
    .sd-wtop{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:13px;color:var(--mut,#9aa3c7)} .sd-wtop b{color:var(--warn,#eab308);font-family:var(--mono,ui-monospace,monospace)}
    .sd-bar{height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin:6px 0 10px;overflow:hidden} .sd-bar i{display:block;height:100%;background:var(--warn,#eab308);transition:width 1s linear}
    .sd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .sd-card{background:rgba(255,255,255,.06);border:1px solid var(--line,rgba(154,163,199,.25));border-radius:8px;padding:6px 8px;cursor:grab;user-select:none;animation:sdFlip .45s ease both;animation-delay:calc(var(--i)*40ms);transition:opacity .2s,transform .15s}
    .sd-card:hover{transform:translateY(-2px);border-color:var(--acc2,#06b6d4)} .sd-card.used{opacity:.3;cursor:default;transform:none}
    .sd-card small{display:block;color:var(--mut,#9aa3c7);font-size:11px} .sd-card i{color:var(--acc2,#06b6d4);font-style:normal;font-size:11px;margin-right:4px} .sd-card b{font-family:var(--mono,ui-monospace,monospace)}
    @keyframes sdFlip{from{transform:rotateY(90deg);opacity:0}to{transform:none;opacity:1}}
    .sd-blackout{position:absolute;inset:0;background:rgba(4,7,20,.96);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;color:var(--mut,#9aa3c7);font-size:14px}
    .sd-methods{margin:12px 0 8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center} .sd-methods span{width:100%;font-size:13px;color:var(--mut,#9aa3c7)}
    .sd-paper{background:#f4f0e2;color:#2b2416;border-radius:6px;padding:10px 12px;margin-top:8px;box-shadow:0 4px 12px rgba(0,0,0,.4);font-family:'Comic Sans MS',cursive,sans-serif}
    .sd-paper h5{margin:0 0 6px;font:600 12px system-ui;color:#6b5f45}
    .sd-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
    .sd-slot{border-bottom:1px dashed #9c8f6f;padding:3px 4px;min-height:24px;font-size:13px;display:flex;gap:4px;align-items:baseline} .sd-slot i{font-style:normal;color:#9c8f6f;font-size:11px;min-width:16px}
    .sd-slot.bad{background:rgba(239,68,68,.25)} .sd-slot.drop{background:rgba(6,182,212,.25)}
    .sd-pool{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0} .sd-pool button{font-family:var(--mono,ui-monospace,monospace)}
    .sd-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
    .sd-msg{margin-top:10px;padding:10px 12px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px}
    .sd-msg.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.1)} .sd-msg.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.1)} .sd-msg.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.1)}
    .sd-scene{width:100%;height:auto;display:block;margin-top:8px} .sd-scene .eye{transition:fill .4s,filter .4s} .sd-scene .seen .eye{fill:#ef4444;filter:drop-shadow(0 0 6px #ef4444)} .sd-scene .maybe .eye{fill:#eab308} .sd-scene text{font:11px system-ui,sans-serif;fill:#9aa3c7} .sd-scene .seen text{fill:#eef1ff}
    .sd-list{list-style:none;padding:0;margin:8px 0 0;font-size:13px} .sd-list li{padding:6px 0;border-top:1px solid var(--line,rgba(154,163,199,.25))} .sd-list li b{margin-right:6px}
    .sd-big{font-size:18px;font-family:var(--mono,ui-monospace,monospace);margin:6px 0}
    .sd-copy{margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)} .sd-shot{display:inline-block;padding:6px;border:2px solid #fff;border-radius:4px;background:#1b1f38;font:11px var(--mono,ui-monospace,monospace);color:#eef1ff;line-height:1.5}
    @media (max-width:480px){.sd-grid{grid-template-columns:repeat(3,1fr)}.sd-slots{grid-template-columns:repeat(2,1fr)}}
  </style>
  <div class="sd">
    <div class="sd-title">Защити seed-фразу</div>
    <div class="sd-goal">Цель: понять, что 12 слов — это и есть кошелёк. Задание: сохранить фразу так, чтобы через два года ты один смог восстановить доступ.</div>
    <div class="sd-steps"><span></span><span></span><span></span><span></span></div>
    <div class="sd-body"></div>
  </div>`;
  const root = box.querySelector('.sd'), body = root.querySelector('.sd-body'), steps = root.querySelectorAll('.sd-steps span');
  const W = i => WORDS[i][0], T = i => WORDS[i][1];

  function reset(newSeed){
    if(newSeed) seed = (Date.now() % 1e9) | 0;
    box._seedSeed = seed; rnd = mulberry32(seed);
    const pool = WORDS.map((_, i) => i); const words = [];
    while(words.length < 12){ const k = Math.floor(rnd() * pool.length); words.push(pool.splice(k, 1)[0]); }
    const shuffled = words.slice(); for(let i = shuffled.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t; }
    st = { stage:'intro', words, shuffled, paper:new Array(12).fill(null), flags:{ paper:false, shot:false, notes:false, clip:false },
           timeLeft:SHOW_SEC, hidden:false, timer:null, confirm:[], confirmOk:null, wrongPos:[], fixed:false, onScreen:0, leakRoll:rnd(), msg:null };
    render();
  }
  const setStep = n => steps.forEach((s, i) => s.classList.toggle('on', i <= n));
  const paperCorrect = ()=> st.paper.every((w, i) => w === st.words[i]);
  const hasDigital = ()=> st.flags.shot || st.flags.notes;

  // ── таймер экрана кошелька ─────────────────────────────────────────────
  function startTimer(secs){
    if(st.timer) clearInterval(st.timer);
    st.timeLeft = secs; st.hidden = false;
    st.timer = later(()=>{ st.timeLeft--; st.onScreen++;
      const b = body.querySelector('[data-t]'), bar = body.querySelector('.sd-bar i');
      if(b) b.textContent = st.timeLeft; if(bar) bar.style.width = (st.timeLeft / secs * 100) + '%';
      if(st.timeLeft <= 0){ clearInterval(st.timer); st.timer = null; st.hidden = true; render(); }
    }, 1000, true);
  }

  // ── рендер этапов ──────────────────────────────────────────────────────
  function render(){
    const s = st.stage;
    if(s === 'intro'){ setStep(-1); body.innerHTML = `
      <div class="sd-msg">Ты создаёшь новый кошелёк. Сейчас он покажет 12 слов — <b>один раз</b>, на 45 секунд. Всё, что ты сделаешь с ними за это время, определит судьбу монет на годы вперёд. Никакой «службы поддержки», которая восстановит пароль, не существует.</div>
      <div class="sd-row"><button class="pri" data-go="write">Показать seed-фразу</button></div>`; return; }

    if(s === 'write'){ setStep(0);
      const cards = st.words.map((w, i) => `<div class="sd-card ${st.paper.indexOf(w) >= 0 ? 'used' : ''}" draggable="${st.hidden ? 'false' : 'true'}" data-w="${w}" style="--i:${i}"><i>${i + 1}</i><b>${W(w)}</b><small>${T(w)}</small></div>`).join('');
      const paperHtml = st.flags.paper ? `<div class="sd-paper"><h5>📝 Твой листок бумаги — нажимай или перетаскивай слова по порядку</h5><div class="sd-slots">${st.paper.map((w, i) => `<div class="sd-slot" data-slot="${i}"><i>${i + 1}.</i>${w === null ? '' : W(w)}</div>`).join('')}</div></div>
        <div class="sd-row"><button data-undo>⌫ стереть последнее</button><span style="font-size:12px;color:var(--mut)">на бумаге: ${st.paper.filter(x => x !== null).length}/12</span></div>` : '';
      const digital = [st.flags.shot ? '📸 скриншот сохранён в галерею' : '', st.flags.notes ? '☁ заметка «seed» синхронизирована' : '', st.flags.clip ? '📋 12 слов лежат в буфере обмена' : ''].filter(Boolean).join(' · ');
      body.innerHTML = `
      <div class="sd-wallet">
        <div class="sd-wtop"><span>🔐 Кошелёк: запиши эти 12 слов в этом порядке</span><span>экран погаснет через <b data-t>${st.timeLeft}</b> с</span></div>
        <div class="sd-bar"><i style="width:${st.timeLeft / (st.fixed ? FIX_SEC : SHOW_SEC) * 100}%"></i></div>
        <div class="sd-grid">${cards}</div>
        ${st.hidden ? '<div class="sd-blackout">Экран погас. Кошелёк больше никогда не покажет эту фразу. У тебя осталось ровно то, что ты успел сохранить.</div>' : ''}
      </div>
      <div class="sd-methods"><span>Как сохранишь? (можно выбрать несколько — как в жизни)</span>
        <button data-m="paper" class="${st.flags.paper ? 'pri' : ''}">✍ Переписать на бумагу</button>
        <button data-m="shot" class="tempt">📸 Скриншот — 2 секунды</button>
        <button data-m="notes" class="tempt">☁ В заметки телефона</button>
        <button data-m="clip" class="tempt">📋 Скопировать в буфер</button></div>
      ${paperHtml}
      ${digital ? `<div class="sd-copy">${digital}</div>` : ''}
      ${st.msg ? `<div class="sd-msg ${st.msg.cls || ''}">${st.msg.t}</div>` : ''}
      <div class="sd-row"><button class="pri" data-go="confirm">Закрыть кошелёк и подтвердить фразу →</button></div>`;
      if(!st.timer && !st.hidden) startTimer(st.fixed ? FIX_SEC : SHOW_SEC);
      return; }

    if(s === 'confirm'){ setStep(1);
      const slots = Array.from({ length:12 }, (_, i) => { const w = st.confirm[i]; return `<div class="sd-slot ${st.wrongPos.indexOf(i) >= 0 ? 'bad' : ''}"><i>${i + 1}.</i>${w === undefined ? '' : W(w)}</div>`; }).join('');
      const pool = st.shuffled.map(w => `<button data-c="${w}" ${st.confirm.indexOf(w) >= 0 || st.confirmOk !== null ? 'disabled' : ''}>${W(w)}</button>`).join('');
      let copy = '';
      if(st.flags.paper) copy = `<div class="sd-paper"><h5>📝 Твоя бумага</h5><div class="sd-slots">${st.paper.map((w, i) => `<div class="sd-slot"><i>${i + 1}.</i>${w === null ? '—' : W(w)}</div>`).join('')}</div></div>`;
      else if(hasDigital()) copy = `<div class="sd-copy">Твоя ${st.flags.shot ? 'фото-копия' : 'заметка'}:<br><span class="sd-shot">${st.words.map((w, i) => (i + 1) + '. ' + W(w)).join('<br>')}</span></div>`;
      else if(st.flags.clip) copy = `<div class="sd-copy">Буфер обмена: <span class="sd-shot">${st.words.map(W).join(' ')}</span></div>`;
      else copy = `<div class="sd-copy">Копии нет. Вспоминай.</div>`;
      let result = '';
      if(st.confirmOk === true) result = `<div class="sd-msg ok">✓ Кошелёк создан. Порядок верный.</div><div class="sd-row"><button class="pri" data-go="spy">Дальше: кто видел твой экран →</button></div>`;
      else if(st.confirmOk === false) result = `<div class="sd-msg bad">✗ Фраза не совпадает: ошибка в позициях ${st.wrongPos.map(i => i + 1).join(', ')}. ${st.flags.paper && !paperCorrect() ? 'Твоя бумага записана с ошибкой — и ты честно по ней шёл.' : 'Ты ошибся при вводе.'} Математике всё равно, что ты «почти помнишь»: без точного порядка кошелька нет.</div>
        <div class="sd-row">${!st.fixed ? '<button data-fix>Исправить копию — кошелёк ещё открыт (20 с)</button>' : ''}<button data-go="spy">Продолжить с тем, что есть →</button></div>`;
      body.innerHTML = `
      <div class="sd-msg">Кошелёк просит подтвердить: нажимай слова в правильном порядке, №1 → №12. Подглядывать можно только в свою копию — экран кошелька погас.</div>
      <div class="sd-slots" style="margin-top:8px">${slots}</div>
      <div class="sd-pool">${pool}</div>
      <div class="sd-row"><button data-cundo ${st.confirmOk !== null ? 'disabled' : ''}>⌫ убрать последнее</button><span style="font-size:12px;color:var(--mut)">${st.confirm.length}/12</span></div>
      ${copy}${result}`; return; }

    if(s === 'spy'){ setStep(2);
      const F = st.flags, dig = hasDigital();
      const watchers = [
        { id:'you',     name:'Ты',                              seen:true,  why:'Единственный, кто должен знать фразу.' },
        { id:'shoulder',name:'Человек за плечом',                seen:st.onScreen >= 30 ? 'maybe' : false, why:st.onScreen >= 30 ? 'Экран горел ' + st.onScreen + ' с. В кафе или в офисе этого хватает, чтобы сфотографировать 12 слов.' : 'Экран горел недолго — но правило то же: seed не показывают там, где есть чужие глаза.' },
        { id:'cloud',   name:'Облако фото / заметок',            seen:dig,   why:dig ? 'Автозагрузка: снимок или заметка ушли на сервер через минуту. Аккаунт облака = доступ к монетам.' : 'Не видело — ты ничего туда не отправлял.' },
        { id:'devices', name:'Все твои синхронизированные устройства', seen:dig, why:dig ? 'Старый планшет, ноутбук, который ты продашь через год, — копия уже везде.' : 'Бумага не синхронизируется. В этом её суперсила.' },
        { id:'malware', name:'Стилер / вредонос',                seen:dig || F.clip, why:dig || F.clip ? 'Стилеры ищут в галерее картинки с 12 словами столбиком и читают буфер обмена. Твоя копия — идеальная цель.' : 'Искать нечего: на устройстве фразы нет.' },
        { id:'apps',    name:'Приложения с доступом к буферу',   seen:F.clip, why:F.clip ? 'Буфер читают клавиатуры, мессенджеры, «переводчики». Любое из них могло сохранить 12 слов.' : 'Буфер пуст.' },
        { id:'support', name:'«Поддержка» из Telegram',          seen:false, why:'Не видела — потому что ты никому не отправлял. Так и держи: настоящая поддержка seed не просит никогда.' }
      ];
      const n = watchers.filter(w => w.seen === true).length, maybe = watchers.filter(w => w.seen === 'maybe').length;
      const pos = [[180, 118], [50, 40], [310, 40], [50, 178], [310, 178], [180, 30], [180, 200]];
      const fig = (w, i) => { const [x, y] = pos[i], cls = w.seen === true ? 'seen' : (w.seen === 'maybe' ? 'maybe' : '');
        return `<g class="${cls}" transform="translate(${x},${y})"><circle r="13" fill="rgba(255,255,255,.06)" stroke="rgba(154,163,199,.4)"/><ellipse class="eye" cx="0" cy="-1" rx="7" ry="3.5" fill="rgba(154,163,199,.35)"/><circle cx="0" cy="-1" r="1.6" fill="#04121a"/><text text-anchor="middle" y="26">${w.name}</text></g>`; };
      body.innerHTML = `
      <div class="sd-msg ${n > 1 ? 'bad' : 'ok'}">Фразу видели: <b>${n}</b> ${n === 1 ? 'сторона' : (n < 5 ? 'стороны' : 'сторон')}${maybe ? ' + ' + maybe + ' под вопросом' : ''}. Кошелёк принадлежит каждому, кто её видел, — не только тебе.</div>
      <svg class="sd-scene" viewBox="0 0 360 230" role="img" aria-label="Кто видел экран">
        <rect x="150" y="100" width="60" height="38" rx="4" fill="#1b1f38" stroke="rgba(154,163,199,.5)"/><rect x="156" y="106" width="48" height="24" fill="#0b2a33"/>
        <text x="180" y="122" text-anchor="middle" style="fill:#06b6d4;font-size:8px">12 слов</text>
        ${watchers.map(fig).join('')}
      </svg>
      <ul class="sd-list">${watchers.map(w => `<li><b style="color:${w.seen === true ? '#ef4444' : (w.seen === 'maybe' ? '#eab308' : '#22c55e')}">${w.seen === true ? '👁 видел' : (w.seen === 'maybe' ? '? мог' : '— не видел')}</b> <b>${w.name}.</b> ${w.why}</li>`).join('')}</ul>
      <div class="sd-row"><button class="pri" data-go="future">Промотать два года вперёд →</button></div>`;
      st.seenCount = n; return; }

    if(s === 'future'){ setStep(3); attempts++; box._seedAttempts = attempts;
      const F = st.flags, dig = hasDigital(), pc = F.paper && paperCorrect();
      let verdict, cls, code;
      if(dig && st.leakRoll < 0.6){ verdict = 'Фраза подошла — кошелёк открылся. Баланс: <b>0 BTC</b>. Последняя транзакция: вывод всего 14 месяцев назад, в 03:12. Кто-то восстановил кошелёк раньше тебя — из твоей же копии в облаке. Ты этого даже не заметил.'; cls = 'bad'; code = 'украдено'; }
      else if(pc){ verdict = 'Фраза подошла. <b>0,5 BTC</b> на месте. Бумага не синхронизируется с облаком, не читается стилером и не устаревает — вот вся её магия.' + (dig ? ' Тебе повезло: цифровая копия тоже была, и на неё просто не наткнулись. Второй раз может не повезти.' : ''); cls = 'ok'; code = 'восстановлено'; }
      else if(dig){ verdict = 'Фраза подошла, монеты на месте. Но посмотри на сцену выше ещё раз: ты играл в русскую рулетку с облаком — и в этот раз патрон не выстрелил.'; cls = 'warn'; code = 'восстановлено (повезло)'; }
      else if(F.paper){ const bad = st.paper.map((w, i) => w === st.words[i] ? -1 : i + 1).filter(x => x > 0); verdict = `Фраза не подходит. На бумаге ошибка в позици${bad.length === 1 ? 'и' : 'ях'} ${bad.length ? bad.join(', ') : '—'}. Кошелёк не «почти открывается» — он либо открывается, либо нет. Доступ потерян навсегда.`; cls = 'bad'; code = 'потеряно (ошибка порядка)'; }
      else if(F.clip){ verdict = 'Буфер обмена за два года перезаписан десятки тысяч раз. Фразы нет нигде. Джеймс Хауэллс до сих пор ищет свой диск на свалке в Ньюпорте: там 7 500 BTC.'; cls = 'bad'; code = 'потеряно (буфер)'; }
      else { verdict = 'Копии не было. 12 слов, которые ты видел 45 секунд два года назад, вспомнить невозможно. Монеты навсегда останутся в блокчейне — просто больше ничьи.'; cls = 'bad'; code = 'потеряно (без копии)'; }
      const method = ['paper', 'shot', 'notes', 'clip'].filter(k => F[k]).map(k => ({ paper:'бумага', shot:'скриншот', notes:'заметки', clip:'буфер' })[k]).join('+') || 'ничего';
      const errs = F.paper ? st.paper.filter((w, i) => w !== st.words[i]).length : 0;
      const art = `Seed-тренажёр #${attempts}: способ ${method}, ошибок порядка ${errs}, фразу видели: ${st.seenCount} сторон, восстановление: ${code}`;
      box.dataset.artifact = art;
      box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles:true, detail:{ id:'widget_v4_seed', text:art, data:{ attempt:attempts, flags:F, orderErrors:errs, seenCount:st.seenCount, outcome:code, seed } } }));
      body.innerHTML = `
      <div class="sd-msg">Прошло два года. Телефон утонул, ноутбук сгорел. На кошельке 0,5 BTC. Восстанавливаем по тому, что осталось.</div>
      <div class="sd-row"><button class="pri" data-restore>Восстановить кошелёк</button></div>
      <div data-out hidden>
        <div class="sd-msg ${cls}">${verdict}</div>
        <div class="sd-copy">Три правила урока 0.2, которые ты сейчас прожил: (1) seed — только офлайн, на бумаге или металле; (2) две копии в двух разных местах; (3) никогда и никому — ни в чат, ни на сайт, ни «поддержке». Артефакт записан: <i>${art}</i>.</div>
        <div class="sd-row"><button data-new>Новый раунд (другая фраза)</button></div>
      </div>`; return; }
  }

  // ── действия ───────────────────────────────────────────────────────────
  function placeOnPaper(w, slot){
    if(st.hidden || !st.flags.paper) return;
    if(st.paper.indexOf(w) >= 0) return;
    let i = slot; if(i === undefined || st.paper[i] !== null){ i = st.paper.indexOf(null); if(i < 0) return; }
    st.paper[i] = w; st.msg = null;
    if(st.paper.every(x => x !== null)) st.msg = { t:'12 слов на бумаге. Проверь порядок глазами: кошелёк не простит перестановку.', cls:'ok' };
    render();
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-go],[data-m],[data-w],[data-undo],[data-c],[data-cundo],[data-fix],[data-restore],[data-new]'); if(!b) return;
    if(b.dataset.go){
      const to = b.dataset.go;
      if(to === 'confirm'){ if(st.timer){ clearInterval(st.timer); st.timer = null; } st.hidden = true; st.confirm = []; st.confirmOk = null; st.wrongPos = [];
        if(!st.flags.paper && !hasDigital() && !st.flags.clip){ st.msg = { t:'Ты ничего не сохранил. Закрыть кошелёк — значит потерять фразу навсегда. Уверен?', cls:'warn' }; if(!st.warned){ st.warned = true; render(); return; } } }
      if(to === 'write' && !st.timer) st.timeLeft = SHOW_SEC;
      st.stage = to; render(); return; }
    if(b.dataset.m){
      const m = b.dataset.m; if(st.hidden){ st.msg = { t:'Поздно: экран погас, сохранять уже нечего.', cls:'bad' }; render(); return; }
      st.flags[m] = true;
      if(m === 'paper') st.msg = { t:'Листок перед тобой. Переноси слова по порядку — кликом или перетаскиванием.', cls:'' };
      if(m === 'shot') st.msg = { t:'Щёлк. Быстро и удобно. Скриншот уже в галерее и через минуту будет в облаке.', cls:'warn' };
      if(m === 'notes') st.msg = { t:'Заметка сохранена и синхронизирована на все твои устройства.', cls:'warn' };
      if(m === 'clip') st.msg = { t:'12 слов скопированы. Буфер обмена читают все приложения, у которых есть такое право.', cls:'warn' };
      render(); return; }
    if(b.dataset.w !== undefined){ if(!st.flags.paper){ st.msg = { t:'Сначала выбери способ сохранения — куда переписывать?', cls:'' }; render(); return; } placeOnPaper(+b.dataset.w); return; }
    if(b.hasAttribute('data-undo')){ for(let i = 11; i >= 0; i--) if(st.paper[i] !== null){ st.paper[i] = null; break; } st.msg = null; render(); return; }
    if(b.dataset.c !== undefined){ if(st.confirmOk !== null) return; st.confirm.push(+b.dataset.c);
      if(st.confirm.length === 12){ st.wrongPos = st.confirm.map((w, i) => w === st.words[i] ? -1 : i).filter(i => i >= 0); st.confirmOk = st.wrongPos.length === 0; }
      render(); return; }
    if(b.hasAttribute('data-cundo')){ st.confirm.pop(); render(); return; }
    if(b.hasAttribute('data-fix')){ st.fixed = true; st.hidden = false; st.stage = 'write'; st.msg = { t:'Кошелёк ещё открыт — у тебя 20 секунд сверить бумагу с экраном.', cls:'warn' }; st.confirm = []; st.confirmOk = null; st.wrongPos = []; startTimer(FIX_SEC); render(); return; }
    if(b.hasAttribute('data-restore')){ const out = body.querySelector('[data-out]'); b.disabled = true; b.textContent = 'Проверяем фразу…'; later(()=>{ if(out){ out.hidden = false; } b.hidden = true; }, 1100); return; }
    if(b.hasAttribute('data-new')){ reset(true); return; }
  });
  // drag & drop на бумагу
  root.addEventListener('dragstart', e => { const c = e.target.closest('.sd-card'); if(!c || c.classList.contains('used')) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', c.dataset.w); e.dataTransfer.effectAllowed = 'move'; });
  root.addEventListener('dragover', e => { const s = e.target.closest('.sd-slot[data-slot]'); if(s){ e.preventDefault(); s.classList.add('drop'); } });
  root.addEventListener('dragleave', e => { const s = e.target.closest('.sd-slot[data-slot]'); if(s) s.classList.remove('drop'); });
  root.addEventListener('drop', e => { const s = e.target.closest('.sd-slot[data-slot]'); if(!s) return; e.preventDefault(); const w = parseInt(e.dataTransfer.getData('text/plain'), 10); if(!isNaN(w)) placeOnPaper(w, +s.dataset.slot); });

  reset(false);
};
