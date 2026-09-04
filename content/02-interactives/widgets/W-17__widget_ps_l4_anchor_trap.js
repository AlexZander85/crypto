/*
 * W-17 · widget_ps_l4_anchor_trap · П4 «Ловушка „хоть бы вернуть своё“»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     увидеть, что цена входа — история, а не аргумент; −33% требует +50%, а не +33% (канон 0.12/П4).
 *   Задание:  провести позицию −33% через 10 недель, каждую неделю отвечая на один вопрос: «купил бы я это сегодня?» — и действуя согласованно с ответом.
 *   Ага:      бар «нужно до нуля» растёт быстрее бара «просадка» (нелинейно); счётчик «несогласованных решений» = число раз, когда решал якорь, а не ты; зелёная линия «продал и отдал системе» уходит вверх, пока ты ждёшь ноль.
 *   Дефолты:  вход 100 000 ₽, сейчас 67 000 ₽ (−33% → +50%), 10 недель, дрейф актива −2%/нед, σ 9%/нед, система +0.6%/нед (иллюстративно), seed 42.
 *   Артефакт: правило «Каждой позиции — один вопрос: „купил бы я это сегодня по текущей цене?“» + метрики раунда (недель в минусе, макс. «до нуля», якорных решений, спокойствие).
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l4_anchor_trap'] = function(box){
  /* ---------- 0. очистка прошлого запуска ---------- */
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
  const gauss = r => { let u = 0, v = 0; while(u === 0) u = r(); while(v === 0) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

  /* ---------- стили (один раз на страницу) ---------- */
  if(!document.getElementById('exp-css-epa')){
    const st = document.createElement('style'); st.id = 'exp-css-epa';
    st.textContent = `
.epa{background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;max-width:100%}
.epa *{box-sizing:border-box}
.epa h3{margin:0 0 4px;font-size:16px}
.epa .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
.epa .grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:720px){.epa .grid{grid-template-columns:3fr 2fr}}
.epa .panel{background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:10px;padding:10px;min-width:0}
.epa canvas{width:100%;height:180px;display:block;border-radius:8px}
.epa .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.epa .m{background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px}
.epa .m b{display:block;font-family:var(--mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:16px;transition:color .3s}
.epa .m span{color:var(--mut,#9aa3c7);font-size:11px}
.epa .phone{font-size:12px;color:var(--mut,#9aa3c7);display:flex;justify-content:space-between}
.epa .voice{max-height:170px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:6px 0}
.epa .bub{max-width:94%;padding:7px 10px;border-radius:12px;font-size:13px;line-height:1.35;opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s}
.epa .bub.show{opacity:1;transform:none}
.epa .bub.head{background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.35);align-self:flex-start}
.epa .bub.truth{background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.4);align-self:flex-end}
.epa .bub.world{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.45);align-self:flex-start}
.epa .q{margin-top:8px;padding:8px;border-radius:8px;border:1px dashed var(--acc2,#06b6d4);font-size:13px}
.epa .btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.epa button{background:rgba(255,255,255,.06);color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.14));border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer;transition:.2s}
.epa button:hover:not(:disabled){border-color:var(--acc2,#06b6d4)}
.epa button:disabled{opacity:.35;cursor:default}
.epa button.on{border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.15)}
.epa button.pulse{animation:epaPulse 1.2s ease-in-out infinite}
@keyframes epaPulse{0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,0)}50%{box-shadow:0 0 0 6px rgba(6,182,212,.25)}}
.epa .fin{margin-top:10px;padding:12px;border-radius:10px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.35);font-size:13px}
.epa .fin table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0}
.epa .fin td{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.06)}
.epa .fin td:last-child{text-align:right;font-family:var(--mono,monospace)}
.epa .art{font-family:var(--mono,monospace);font-size:12px;background:rgba(0,0,0,.35);padding:8px;border-radius:8px;margin-top:6px;white-space:pre-wrap}
.epa .warn{color:var(--warn,#eab308)}.epa .bad{color:var(--bad,#ef4444)}.epa .ok{color:var(--ok,#22c55e)}
`;
    document.head.appendChild(st);
  }

  /* ---------- разметка ---------- */
  box.classList.add('epa');
  box.innerHTML = `
    <h3>Ловушка «хоть бы вернуть своё»: якорь на нуле</h3>
    <div class="goal">Цель: увидеть, что цена входа — история, а не аргумент. Задание: проведи позицию −33% через 10 недель, каждую неделю отвечая на один вопрос: «купил бы я это сегодня?»</div>
    <div class="grid">
      <div class="panel">
        <canvas data-r="cv"></canvas>
        <div data-r="gauge" style="margin-top:8px"></div>
        <div class="metrics">
          <div class="m"><span>Недель в минусе</span><b data-r="mW">0</b></div>
          <div class="m"><span>Чтобы «в ноль», нужно</span><b data-r="mN">+50%</b></div>
          <div class="m"><span>Остаток капитала</span><b data-r="mV">67 000 ₽</b></div>
          <div class="m"><span>Спокойствие</span><b data-r="mC">100</b></div>
        </div>
      </div>
      <div class="panel">
        <div class="phone"><span>📱 Внутренний голос</span><span>неделя <b data-r="wk">1</b> из 10</span></div>
        <div class="voice" data-r="voice"></div>
        <div class="q" data-r="q"></div>
        <div class="btns" data-r="acts"></div>
      </div>
    </div>
    <div data-r="fin"></div>`;
  const $ = s => box.querySelector(`[data-r="${s}"]`);
  const cv = $('cv');
  const fmt = v => Math.round(v*1000).toLocaleString('ru-RU') + ' ₽'; // 67 → 67 000 ₽

  /* ---------- состояние ---------- */
  const WEEKS = 10, ENTRY = 100, SYS = 0.006;
  let seed = 42, rnd, prices, worldWeek, week, qty, invested, avg, closed, cash;
  let calm, inLoss, flags, answer, maxNeed, finished, busy;

  function init(s){
    seed = s; rnd = mulberry32(seed);
    prices = [67];
    for(let i = 1; i <= WEEKS; i++){
      prices.push(Math.max(8, prices[i-1] * Math.exp(-0.02 + 0.09 * gauss(rnd))));
    }
    worldWeek = 3 + Math.floor(rnd()*4);          // неделя «факта мира»
    week = 0; qty = 1; invested = ENTRY; avg = ENTRY; closed = false; cash = 0;
    calm = 100; inLoss = 0; flags = 0; answer = null; maxNeed = 0; finished = false; busy = false;
    $('voice').innerHTML = ''; $('fin').innerHTML = '';
    draw(); gauge(); metrics(); askRound();
  }

  /* ---------- пузыри ---------- */
  function bubble(type, text){
    const d = document.createElement('div'); d.className = 'bub ' + type; d.textContent = text;
    $('voice').appendChild(d); later(()=>{ d.classList.add('show'); $('voice').scrollTop = 1e6; }, 30);
  }
  const HEAD = [
    'Ну хоть бы в ноль вернуться — и сразу выйду.',
    'Продавать сейчас — фиксировать убыток. Пока не продал — это же не убыток.',
    'Докуплю здесь — средняя упадёт, быстрее выйду в ноль.',
    'Я же не дурак продавать на самом дне.',
    'Ещё недельку. Оно всегда отскакивает.',
    'На бумаге минус — не считается.'
  ];

  /* ---------- раунд ---------- */
  function need(){ return Math.max(0, avg / prices[week] - 1); }
  function askRound(){
    const p = prices[week];
    if(week === worldWeek){
      bubble('world', 'Факт мира: команда проекта продала 20% казначейства. Это меняет ответ на вопрос «купил бы сегодня?» — а цену входа не меняет.');
    }
    bubble('head', HEAD[(week * 2 + Math.floor(rnd()*3)) % HEAD.length]);
    answer = null;
    $('q').innerHTML = `Если бы у тебя сегодня были свободные <b>${fmt(p)}</b> — ты купил бы этот актив по ${fmt(p)}?
      <div class="btns"><button data-a="yes">Да, купил бы</button><button data-a="no">Нет, не купил бы</button></div>`;
    $('acts').innerHTML = `
      <button data-act="close" disabled>Закрыть позицию</button>
      <button data-act="wait" disabled>Ждать неделю</button>
      <button data-act="add" disabled>Докупить (усреднить)</button>`;
    $('q').querySelectorAll('button').forEach(b => b.onclick = () => {
      answer = b.dataset.a;
      $('q').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      $('acts').querySelectorAll('button').forEach(x => { x.disabled = false; });
      $('acts').querySelector(answer === 'no' ? '[data-act="close"]' : '[data-act="wait"]').classList.add('pulse');
    });
    $('acts').querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.act));
  }

  function act(a){
    if(busy || finished) return; busy = true;
    $('acts').querySelectorAll('button').forEach(x => { x.disabled = true; x.classList.remove('pulse'); });
    const p = prices[week], oldNeed = need();
    // согласованность ответа и действия
    if(answer === 'no' && a !== 'close'){ flags++; calm -= 5;
      bubble('truth', 'Ты сказал «не купил бы» — и оставил деньги в том, что не купил бы. Это решение принял якорь, а не ты.'); }
    if(answer === 'yes' && a === 'close'){ flags++; calm -= 5;
      bubble('truth', 'Ты сказал «купил бы» — и продал. Это не решение, это страх. Записываем как несогласованность.'); }

    if(a === 'close'){
      closed = true; cash = qty * p;
      bubble('truth', `Деньги освобождены: ${fmt(cash)}. Якорь «100 000» больше не участвует в решениях — остаток работает в системе.`);
      runClosed(); return;
    }
    if(a === 'add'){ invested += p; qty += 1; avg = invested / qty; calm -= 10; }
    if(a === 'wait'){ calm -= 7; }
    week++; inLoss++;
    const np = prices[week], n2 = need(); maxNeed = Math.max(maxNeed, n2);
    if(a === 'add'){
      bubble('truth', `Средняя стала ${fmt(avg)}: до нуля теперь +${(n2*100).toFixed(0)}% вместо +${(oldNeed*100).toFixed(0)}%. Но позиция ×${qty}: то же движение −10% теперь стоит ${fmt(qty*np*0.1)}, а не ${fmt(np*0.1)}.`);
    } else {
      const d = (np/p - 1) * 100;
      bubble('truth', `Неделя ожидания «нуля»: цена ${d >= 0 ? '+' : ''}${d.toFixed(1)}%, до нуля нужно +${(n2*100).toFixed(0)}%. Зарплата этих денег за неделю — ноль ₽; начальник — надежда.`);
    }
    animate(()=>{ busy = false; if(week >= WEEKS) finish(); else askRound(); });
  }

  function runClosed(){
    $('q').innerHTML = '<span style="color:var(--mut)">Позиция закрыта. Деньги в системе +0,6%/нед (иллюстративно). Досматриваем недели…</span>';
    later(function step(){
      if(week >= WEEKS){ finish(); return; }
      week++; cash *= 1 + SYS; draw(); metrics();
      later(step, 450);
    }, 450);
  }

  function animate(done){
    let k = 0; (function loop(){ k++; draw(); metrics(); gauge(); if(k < 8) raf(loop); else done(); })();
  }

  /* ---------- вывод ---------- */
  function metrics(){
    const p = prices[week];
    const val = closed ? cash : qty * p;
    $('mW').textContent = inLoss; $('wk').textContent = Math.min(WEEKS, week + 1);
    const n = closed ? 0 : need();
    $('mN').textContent = closed ? '—' : '+' + (n*100).toFixed(0) + '%';
    $('mN').className = n >= 0.5 ? 'warn' : '';
    $('mV').textContent = fmt(val);
    $('mC').textContent = Math.max(0, calm);
    $('mC').className = calm < 50 ? 'bad' : calm < 75 ? 'warn' : 'ok';
  }

  function gauge(){
    const p = prices[week]; const dd = closed ? 0 : Math.max(0, 1 - p / avg), nd = closed ? 0 : need();
    const sc = v => Math.min(190, v * 190 / 1.6); // шкала до 160%
    const tx = w => Math.min(282, 120 + w + 4);
    $('gauge').innerHTML = `<svg viewBox="0 0 320 56" width="100%" height="56" style="display:block">
      <text x="0" y="13" fill="var(--mut,#9aa3c7)" font-size="11">Просадка от средней</text>
      <rect x="120" y="4" width="190" height="10" rx="5" fill="rgba(255,255,255,.06)"/>
      <rect x="120" y="4" width="${sc(dd)}" height="10" rx="5" fill="var(--bad,#ef4444)" style="transition:width .5s"/>
      <text x="${tx(sc(dd))}" y="13" fill="var(--bad,#ef4444)" font-size="11" font-family="var(--mono,monospace)">−${(dd*100).toFixed(0)}%</text>
      <text x="0" y="43" fill="var(--mut,#9aa3c7)" font-size="11">Нужно, чтобы «в ноль»</text>
      <rect x="120" y="34" width="190" height="10" rx="5" fill="rgba(255,255,255,.06)"/>
      <rect x="120" y="34" width="${sc(nd)}" height="10" rx="5" fill="${nd >= 0.5 ? 'var(--warn,#eab308)' : 'var(--ok,#22c55e)'}" style="transition:width .5s"/>
      <text x="${tx(sc(nd))}" y="43" fill="${nd >= 0.5 ? 'var(--warn,#eab308)' : 'var(--ok,#22c55e)'}" font-size="11" font-family="var(--mono,monospace)">+${(nd*100).toFixed(0)}%</text>
    </svg>`;
  }

  function fit(c){
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth || 320, h = c.clientHeight || 180;
    if(c.width !== Math.round(w*dpr)){ c.width = Math.round(w*dpr); c.height = Math.round(h*dpr); }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
  }
  function draw(){
    const g = fit(cv), W = cv.clientWidth, H = cv.clientHeight; g.clearRect(0, 0, W, H);
    const pad = { l: 44, r: 10, t: 14, b: 20 };
    const lo = Math.min.apply(null, prices) * 0.85, hi = Math.max(100, Math.max.apply(null, prices)) * 1.06;
    const x = i => pad.l + (W - pad.l - pad.r) * i / WEEKS, y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
    g.font = '11px system-ui'; g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for(let i = 0; i <= WEEKS; i++){ g.beginPath(); g.moveTo(x(i), pad.t); g.lineTo(x(i), H - pad.b); g.stroke(); }
    g.fillStyle = 'rgba(154,163,199,.8)';
    for(let i = 0; i <= WEEKS; i += 2) g.fillText(i + 'н', x(i) - 6, H - 6);
    [lo * 1.1, 100, hi * 0.95].forEach(v => { g.fillText(Math.round(v*1000/1000) + 'к', 4, y(v) + 4); });
    // якорь
    g.setLineDash([5, 4]); g.strokeStyle = 'rgba(234,179,8,.75)'; g.beginPath(); g.moveTo(pad.l, y(100)); g.lineTo(W - pad.r, y(100)); g.stroke();
    g.fillStyle = 'rgba(234,179,8,.95)'; g.fillText('якорь: цена входа 100 000 ₽', pad.l + 4, y(100) - 4);
    if(qty > 1 && !closed){ g.strokeStyle = 'rgba(234,179,8,.4)'; g.beginPath(); g.moveTo(pad.l, y(avg)); g.lineTo(W - pad.r, y(avg)); g.stroke(); g.fillText('средняя ' + fmt(avg), pad.l + 4, y(avg) + 12); }
    g.setLineDash([]);
    // альтернатива: «продал на 1-й неделе и отдал системе»
    g.strokeStyle = 'rgba(34,197,94,.55)'; g.lineWidth = 2; g.beginPath();
    for(let i = 0; i <= week; i++){ const v = 67 * Math.pow(1 + SYS, i); i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); } g.stroke();
    g.fillStyle = 'rgba(34,197,94,.9)'; g.fillText('продал в 1-ю неделю → система', x(0) + 4, y(67) - 6);
    // твоя линия (актив) до закрытия, потом кэш в системе
    g.strokeStyle = closed ? 'rgba(6,182,212,.95)' : '#eef1ff'; g.lineWidth = 2; g.beginPath();
    const closeW = closed ? prices.length : 0;
    for(let i = 0; i <= week; i++){
      let v;
      if(closed && i >= (week - (cash > 0 ? 0 : 0)) && i > 0 && qty * prices[i] !== cash && i > lastOpenWeek()) v = (cash / qty) * Math.pow(1 + SYS, -(week - i)); else v = prices[i];
      i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v));
    } g.stroke();
    // текущая точка
    const cvw = closed ? cash / qty : prices[week];
    g.fillStyle = closed ? 'var(--acc2)' : '#eef1ff';
    g.fillStyle = closed ? '#06b6d4' : '#eef1ff';
    g.beginPath(); g.arc(x(week), y(cvw), 4, 0, 7); g.fill();
    g.strokeStyle = 'rgba(6,182,212,.4)'; g.beginPath(); g.arc(x(week), y(cvw), 8 + 3*Math.sin(Date.now()/250), 0, 7); g.stroke();
  }
  let _lastOpen = 0;
  function lastOpenWeek(){ return _lastOpen; }

  /* ---------- финал ---------- */
  function finish(){
    finished = true;
    const p = prices[WEEKS];
    const mine = closed ? cash : qty * p;
    const alt = 67 * Math.pow(1 + SYS, WEEKS);
    const pnlMine = mine - invested, pnlAlt = alt - ENTRY;
    const kept = !closed;
    const better = pnlMine > pnlAlt;
    const rule = 'Каждой позиции — один вопрос: «купил бы я это сегодня по текущей цене?». Нет — освобождаю деньги; да — держу и перестаю смотреть на цену входа. Цена входа в решении не участвует.';
    $('q').innerHTML = ''; $('acts').innerHTML = '';
    $('fin').innerHTML = `<div class="fin">
      <b>Разбор раунда</b>
      <table>
        <tr><td>Твой остаток (вложено ${fmt(invested)})</td><td>${fmt(mine)} <span class="${pnlMine<0?'bad':'ok'}">${pnlMine>=0?'+':''}${fmt(pnlMine)}</span></td></tr>
        <tr><td>«Продал в 1-ю неделю → система +0,6%/нед»</td><td>${fmt(alt)} <span class="${pnlAlt<0?'bad':'ok'}">${pnlAlt>=0?'+':''}${fmt(pnlAlt)}</span></td></tr>
        <tr><td>Недель в минусе</td><td>${inLoss}</td></tr>
        <tr><td>Максимальное «до нуля нужно»</td><td class="warn">+${(maxNeed*100).toFixed(0)}%</td></tr>
        <tr><td>Решений, принятых якорем (ответ ≠ действие)</td><td class="${flags?'bad':'ok'}">${flags}</td></tr>
        <tr><td>Спокойствие к концу</td><td>${Math.max(0,calm)}</td></tr>
      </table>
      <div style="margin-top:6px">${kept
        ? (better ? 'В этом раунде удержание окупилось лучше альтернативы — так бывает. Но урок П8: оценивай не исход, а процесс: ' : 'В этом раунде удержание проиграло альтернативе: ')
        : 'Ты освободил деньги — дальше их судьбу решала система, а не надежда. '}
        ${flags ? `<b>${flags}</b> раз(а) ты отвечал «не купил бы» и держал (или «купил бы» и продавал). Именно эти недели — якорь. Он не про цифру на экране, он про рассогласование ответа и действия.`
                : 'Ни одного рассогласования: ответ на вопрос и действие совпадали каждую неделю. Так выглядит решение без якоря.'}
      </div>
      <div style="margin-top:8px;color:var(--mut)">Артефакт (правило в устав):</div>
      <div class="art">${rule}</div>
      <div class="btns"><button data-r="save">Записать артефакт в профиль</button><button data-r="again">Новый раунд (другой рынок)</button></div>
    </div>`;
    $('save').onclick = () => {
      box.dispatchEvent(new CustomEvent('exp:artifact', { bubbles: true, detail: { widget: 'widget_ps_l4_anchor_trap', rule, metrics: { inLoss, maxNeed, flags, calm, pnlMine, pnlAlt, seed } } }));
      $('save').textContent = 'Записано ✓'; $('save').disabled = true;
    };
    $('again').onclick = () => init(Date.now());
    metrics(); draw(); gauge();
  }

  /* ---------- ресайз и живая точка ---------- */
  box._expResize = () => { draw(); }; window.addEventListener('resize', box._expResize);
  later(() => { if(!finished) draw(); }, 400, true);

  init(seed);
};
