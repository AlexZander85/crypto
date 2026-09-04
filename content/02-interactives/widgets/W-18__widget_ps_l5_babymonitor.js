/*
 * W-18 · widget_ps_l5_babymonitor · П5 «Ночная смена»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     показать, что ночные взгляды в счёт покупают не информацию, а недосып: инф. ценность насыщается на 1–2 взгляде, качество сна падает с каждым.
 *   Задание:  ползунком найти число взглядов, после которого линия «новой информации» перестаёт расти; затем собрать белый список из 3 событий, которые вправе разбудить.
 *   Ага:      подпись «последние 10 взглядов добавили 0,00»; на таймлайне сна каждый взгляд рвёт глубокую фазу; реальный сбой (если случился) «радионяня» ловит при 0 взглядов, а взгляды — только если повезёт.
 *   Дефолты:  ночь 23:00–07:00, 34 уведомления за ночь (канон П5), требуют действий 0 (в 30% раундов — 1 реальный сбой связи), взглядов 0–40, стартовое значение 4, seed 42.
 *   Артефакт: белый список ночных событий (3 пункта) + правило «уведомление — не приказ; всё вне списка — утренняя сводка».
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l5_babymonitor'] = function(box){
  /* ---------- 0. очистка ---------- */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null; box._expResize = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  if(!document.getElementById('exp-css-epb')){
    const st = document.createElement('style'); st.id = 'exp-css-epb';
    st.textContent = `
.epb{background:linear-gradient(160deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;max-width:100%}
.epb *{box-sizing:border-box}
.epb h3{margin:0 0 4px;font-size:16px}
.epb .goal{color:var(--mut,#9aa3c7);font-size:13px;margin-bottom:10px}
.epb .grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:720px){.epb .grid{grid-template-columns:3fr 2fr}}
.epb .panel{background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:10px;padding:10px;min-width:0}
.epb canvas{width:100%;display:block;border-radius:8px}
.epb .cap{font-size:12px;color:var(--mut,#9aa3c7);margin:6px 0 2px}
.epb input[type=range]{width:100%;accent-color:var(--acc2,#06b6d4)}
.epb .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.epb .m{background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px}
.epb .m b{display:block;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:16px}
.epb .m span{color:var(--mut,#9aa3c7);font-size:11px}
.epb .feed{max-height:150px;overflow:auto;font-size:12px;display:flex;flex-direction:column;gap:4px}
.epb .n{display:flex;gap:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.04);opacity:0;transform:translateX(8px);transition:opacity .3s,transform .3s}
.epb .n.show{opacity:1;transform:none}
.epb .n .t{font-family:var(--mono,monospace);color:var(--mut,#9aa3c7);flex:0 0 42px}
.epb .n.real{border:1px solid rgba(239,68,68,.5);background:rgba(239,68,68,.1)}
.epb .n .tag{margin-left:auto;font-size:10px;color:var(--mut,#9aa3c7)}
.epb .n.real .tag{color:var(--bad,#ef4444)}
.epb .aha{margin-top:8px;padding:8px;border-radius:8px;border:1px solid rgba(6,182,212,.45);background:rgba(6,182,212,.1);font-size:13px;opacity:0;transition:opacity .5s}
.epb .aha.show{opacity:1}
.epb .wl label{display:flex;gap:8px;align-items:flex-start;padding:5px 6px;border-radius:8px;font-size:13px;cursor:pointer}
.epb .wl label:hover{background:rgba(255,255,255,.04)}
.epb .wl input{accent-color:var(--acc2,#06b6d4);margin-top:3px}
.epb .wl label.good{background:rgba(34,197,94,.12)}.epb .wl label.badp{background:rgba(239,68,68,.12)}
.epb .btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.epb button{background:rgba(255,255,255,.06);color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.14));border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer;transition:.2s}
.epb button:hover:not(:disabled){border-color:var(--acc2,#06b6d4)}
.epb button:disabled{opacity:.4;cursor:default}
.epb .art{font-family:var(--mono,monospace);font-size:12px;background:rgba(0,0,0,.35);padding:8px;border-radius:8px;margin-top:6px;white-space:pre-wrap}
.epb .ok{color:var(--ok,#22c55e)}.epb .bad{color:var(--bad,#ef4444)}.epb .warn{color:var(--warn,#eab308)}
`;
    document.head.appendChild(st);
  }

  box.classList.add('epb');
  box.innerHTML = `
    <h3>Радионяня трейдера: сколько раз за ночь ты смотришь в счёт</h3>
    <div class="goal">Цель: увидеть, что ночной взгляд покупает недосып, а не информацию. Задание: найди число взглядов, после которого линия «новой информации» перестаёт расти, — и собери белый список из событий, которые вправе тебя разбудить.</div>
    <div class="grid">
      <div class="panel">
        <div class="cap">Ночь 23:00 → 07:00 · глубина сна · взглядов в счёт: <b data-r="nv">4</b></div>
        <input type="range" min="0" max="40" value="4" data-r="rng">
        <canvas data-r="tl" style="height:120px"></canvas>
        <div class="cap">Как меняются сон и информация с каждым взглядом</div>
        <canvas data-r="ch" style="height:150px"></canvas>
        <div class="metrics">
          <div class="m"><span>Качество сна</span><b data-r="mS">—</b></div>
          <div class="m"><span>Новая информация (усл. ед.)</span><b data-r="mI">—</b></div>
          <div class="m"><span>Риск импульсного вмешательства</span><b data-r="mR">—</b></div>
          <div class="m"><span>Уведомлений / требовали действий</span><b data-r="mE">34 / 0</b></div>
        </div>
        <div class="aha" data-r="aha"></div>
      </div>
      <div class="panel">
        <div class="cap">📱 Что ты увидел, проснувшись</div>
        <div class="feed" data-r="feed"></div>
        <div class="cap" style="margin-top:10px">Собери белый список: что вправе тебя разбудить?</div>
        <div class="wl" data-r="wl"></div>
        <div class="btns"><button data-r="chk">Проверить список</button><button data-r="again">Новая ночь</button></div>
        <div data-r="res"></div>
      </div>
    </div>`;
  const $ = s => box.querySelector(`[data-r="${s}"]`);

  /* ---------- данные ночи ---------- */
  const NOISE = [
    ['позиция −2,5% — в пределах плана стратегии', 0], ['странный сигнал на ETH', 0], ['новость: «регулятор запретит всё»', 0],
    ['чужой скрин: +300% за день', 0], ['бот: сделка открыта', 0], ['бот: сделка закрыта по ROI +1,8%', 0],
    ['BTC −1,4% за час', 0], ['чат: «сейчас будет разворот»', 0], ['бот: сделка закрыта по стопу (в плане)', 0]
  ];
  const WL = [
    { t: 'Нет связи с биржей больше 15 минут', real: true },
    { t: 'Позиция в минусе 3%', real: false },
    { t: 'Сработала аварийная кнопка (kill-switch)', real: true },
    { t: '«Странный сигнал» на паре', real: false },
    { t: 'Бот отправил приказ, которого не мог отправить', real: true },
    { t: 'Новость про запрет крипты', real: false }
  ];
  let seed = 42, rnd, notes, realEvt, looks, n = 4, whitelisted = false;

  function init(s){
    seed = s; rnd = mulberry32(seed);
    notes = [];
    for(let i = 0; i < 34; i++){ const k = Math.floor(rnd() * NOISE.length); notes.push({ t: 23*60 + 30 + Math.floor(rnd() * 420), txt: NOISE[k][0], real: false }); }
    realEvt = rnd() < 0.3 ? { t: 23*60 + 60 + Math.floor(rnd() * 360), txt: 'нет связи с биржей 17 минут', real: true } : null;
    if(realEvt) notes.push(realEvt);
    notes.sort((a, b) => a.t - b.t);
    looks = []; for(let i = 0; i < 40; i++) looks.push(23*60 + 20 + Math.floor(rnd() * 440)); looks.sort((a, b) => a - b);
    whitelisted = false; $('res').innerHTML = ''; $('aha').classList.remove('show');
    $('mE').textContent = notes.length + ' / ' + (realEvt ? 1 : 0);
    buildWL(); update();
  }
  const hhmm = m => { m = m % 1440; return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); };

  /* ---------- формулы ---------- */
  const sleepQ = k => Math.max(10, Math.round(100 - 35 * (1 - Math.exp(-k/3)) - 1.2 * k));
  const infoMarg = k => k === 1 ? 1 : 0.12 * Math.pow(0.5, k - 2);      // 1-й взгляд: «в плане» — дальше почти ноль
  const infoCum = k => { let s = 0; for(let i = 1; i <= k; i++) s += infoMarg(i); return s; };
  const risk = k => 1 - Math.pow(0.96, k);

  /* ---------- вывод ---------- */
  function update(){
    n = +$('rng').value; $('nv').textContent = n;
    const sq = sleepQ(n), ic = infoCum(n), last10 = infoCum(n) - infoCum(Math.max(0, n - 10));
    $('mS').textContent = sq; $('mS').className = sq < 50 ? 'bad' : sq < 75 ? 'warn' : 'ok';
    $('mI').textContent = ic.toFixed(2);
    $('mR').textContent = Math.round(risk(n) * 100) + '%'; $('mR').className = risk(n) > 0.3 ? 'bad' : risk(n) > 0.12 ? 'warn' : 'ok';
    const a = $('aha');
    if(n >= 12){ a.innerHTML = `Последние 10 взглядов добавили <b>${last10.toFixed(2)}</b> информации и отняли <b>${sleepQ(n-10) - sq}</b> пунктов сна. Ты платил сном за нули.`; a.classList.add('show'); }
    else if(n === 0){ a.innerHTML = 'Ноль взглядов — и ноль информации? Нет: реальный сбой обязан прийти сам, по белому списку. Смотри правую панель.'; a.classList.add('show'); }
    else if(n <= 2){ a.innerHTML = `${n === 1 ? 'Один взгляд' : 'Два взгляда'} дали ${ic.toFixed(2)} — почти всё, что ночь вообще может сообщить: «система в плане». Всё дальше — повторение.`; a.classList.add('show'); }
    else a.classList.remove('show');
    drawTL(); drawCH(); feed();
  }

  function feed(){
    const f = $('feed'); f.innerHTML = '';
    const seen = looks.slice(0, n).map(L => { const prev = notes.filter(x => x.t <= L); return { L, note: prev.length ? prev[prev.length-1] : null }; }).filter(x => x.note);
    const uniq = []; seen.forEach(x => { if(!uniq.length || uniq[uniq.length-1].note !== x.note) uniq.push(x); });
    uniq.slice(0, 8).forEach((x, i) => {
      const d = document.createElement('div'); d.className = 'n' + (x.note.real ? ' real' : '');
      d.innerHTML = `<span class="t">${hhmm(x.L)}</span><span>${x.note.txt}</span><span class="tag">${x.note.real ? 'требует действий' : 'шум → утро'}</span>`;
      f.appendChild(d); later(() => d.classList.add('show'), 40 * i);
    });
    if(uniq.length > 8){ const d = document.createElement('div'); d.className = 'n show'; d.innerHTML = `<span class="t">…</span><span>ещё ${uniq.length - 8} взглядов — те же строки другими словами</span>`; f.appendChild(d); }
    if(!uniq.length){ const d = document.createElement('div'); d.className = 'n show'; d.innerHTML = '<span class="t">—</span><span>ты спал; телефон заряжался в другой комнате</span>'; f.appendChild(d); }
  }

  function fit(c){ const dpr = window.devicePixelRatio || 1, w = c.clientWidth || 320, h = c.clientHeight || 120; if(c.width !== Math.round(w*dpr)){ c.width = Math.round(w*dpr); c.height = Math.round(h*dpr); } const g = c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return g; }

  function drawTL(){
    const c = $('tl'), g = fit(c), W = c.clientWidth, H = c.clientHeight; g.clearRect(0,0,W,H);
    const T0 = 23*60, T1 = 31*60, pad = { l: 8, r: 8, t: 8, b: 16 };
    const x = t => pad.l + (W - pad.l - pad.r) * (t - T0) / (T1 - T0);
    const cur = looks.slice(0, n);
    const depth = t => {
      let d = 0.55 + 0.45 * Math.sin(2*Math.PI*(t - T0)/90 - Math.PI/2);          // 90-мин циклы
      cur.forEach(L => { if(t >= L && t < L + 25) d *= (t - L) / 25; if(t >= L - 2 && t < L) d = 0; });
      return d;
    };
    g.beginPath(); g.moveTo(x(T0), H - pad.b);
    for(let t = T0; t <= T1; t += 2) g.lineTo(x(t), H - pad.b - depth(t) * (H - pad.t - pad.b));
    g.lineTo(x(T1), H - pad.b); g.closePath();
    const gr = g.createLinearGradient(0, pad.t, 0, H); gr.addColorStop(0, 'rgba(6,182,212,.55)'); gr.addColorStop(1, 'rgba(6,182,212,.05)');
    g.fillStyle = gr; g.fill();
    g.font = '10px system-ui'; g.fillStyle = 'rgba(154,163,199,.85)';
    [23, 1, 3, 5, 7].forEach(h => { const t = h < 23 ? (24 + h) * 60 : h * 60; g.fillText(String(h).padStart(2,'0') + ':00', x(t) - 12, H - 3); });
    cur.forEach(L => { g.fillStyle = 'rgba(234,179,8,.95)'; g.fillText('👁', x(L) - 6, pad.t + 10); });
    if(realEvt){
      g.strokeStyle = whitelisted ? 'rgba(239,68,68,.9)' : 'rgba(239,68,68,.35)'; g.setLineDash(whitelisted ? [] : [3,3]); g.lineWidth = 2;
      g.beginPath(); g.moveTo(x(realEvt.t), pad.t); g.lineTo(x(realEvt.t), H - pad.b); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(239,68,68,.95)'; g.fillText(whitelisted ? 'радионяня: связь!' : 'сбой связи', Math.min(W - 90, x(realEvt.t) + 4), pad.t + 22);
    }
  }

  function drawCH(){
    const c = $('ch'), g = fit(c), W = c.clientWidth, H = c.clientHeight; g.clearRect(0,0,W,H);
    const pad = { l: 34, r: 34, t: 10, b: 18 };
    const x = k => pad.l + (W - pad.l - pad.r) * k / 40, yS = v => pad.t + (H - pad.t - pad.b) * (1 - v/100), yI = v => pad.t + (H - pad.t - pad.b) * (1 - v/1.3);
    g.strokeStyle = 'rgba(255,255,255,.06)'; for(let k = 0; k <= 40; k += 10){ g.beginPath(); g.moveTo(x(k), pad.t); g.lineTo(x(k), H - pad.b); g.stroke(); }
    g.font = '10px system-ui'; g.fillStyle = 'rgba(154,163,199,.85)'; for(let k = 0; k <= 40; k += 10) g.fillText(k, x(k) - 4, H - 5);
    g.fillStyle = 'rgba(34,197,94,.9)'; g.fillText('сон', 4, yS(100) + 4); g.fillText('%', 4, yS(100) + 14);
    g.fillStyle = 'rgba(6,182,212,.9)'; g.fillText('инфо', W - 30, yI(1.3) + 4);
    // сон
    g.strokeStyle = 'rgba(34,197,94,.9)'; g.lineWidth = 2; g.beginPath(); for(let k = 0; k <= 40; k++){ k ? g.lineTo(x(k), yS(sleepQ(k))) : g.moveTo(x(k), yS(sleepQ(k))); } g.stroke();
    // информация (накопленная)
    g.strokeStyle = 'rgba(6,182,212,.95)'; g.beginPath(); for(let k = 0; k <= 40; k++){ k ? g.lineTo(x(k), yI(infoCum(k))) : g.moveTo(x(k), yI(0)); } g.stroke();
    // зона «нули»
    g.fillStyle = 'rgba(6,182,212,.08)'; g.fillRect(x(2), pad.t, x(40) - x(2), yI(infoCum(2)) - pad.t);
    g.fillStyle = 'rgba(6,182,212,.7)'; g.fillText('линия урока: здесь информации уже нет', x(3), yI(infoCum(2)) - 4);
    // текущий n
    g.strokeStyle = 'rgba(234,179,8,.9)'; g.setLineDash([4,3]); g.beginPath(); g.moveTo(x(n), pad.t); g.lineTo(x(n), H - pad.b); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#eef1ff'; g.beginPath(); g.arc(x(n), yS(sleepQ(n)), 4, 0, 7); g.fill(); g.beginPath(); g.arc(x(n), yI(infoCum(n)), 4, 0, 7); g.fill();
  }

  /* ---------- белый список ---------- */
  function buildWL(){
    const w = $('wl'); w.innerHTML = '';
    WL.forEach((it, i) => { const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" data-i="${i}"><span>${it.t}</span>`; w.appendChild(l); });
  }
  $('chk').onclick = () => {
    const labels = $('wl').querySelectorAll('label'); let good = 0, badp = 0, miss = 0;
    labels.forEach((l, i) => { const on = l.querySelector('input').checked; l.classList.remove('good', 'badp');
      if(on && WL[i].real){ good++; l.classList.add('good'); } if(on && !WL[i].real){ badp++; l.classList.add('badp'); } if(!on && WL[i].real) miss++; });
    const pass = good === 3 && badp === 0;
    whitelisted = pass; drawTL();
    const rule = 'Ночью меня будят только три события: 1) нет связи с биржей >15 минут; 2) сработала аварийная кнопка; 3) бот отправил приказ, которого не мог. Всё остальное — утренняя сводка в фиксированное время. Уведомление — не приказ.';
    let verdict;
    if(pass) verdict = `<span class="ok">Список верный.</span> ${realEvt ? `Реальный сбой в ${hhmm(realEvt.t)} радионяня поймала бы при <b>0</b> взглядов. Взглядами ты его ${looks.slice(0, n).some(L => L >= realEvt.t && L <= realEvt.t + 40) ? 'тоже поймал — повезло' : 'не поймал бы вовсе'}.` : 'Этой ночью реальных сбоев не было: список бы промолчал, и ты бы спал все 8 часов.'}`;
    else verdict = `<span class="bad">Не совсем:</span> ${badp ? `${badp} пункт(а) — это шум в пределах плана: минус, «странный сигнал» и новости смотрят утром. ` : ''}${miss ? `${miss} реальных событий мира пропущено — их нужно ловить сразу.` : ''} Проверь по протоколу «мир или голова» (П1).`;
    $('res').innerHTML = `<div style="margin-top:8px;font-size:13px">${verdict}</div>
      ${pass ? `<div class="cap">Артефакт:</div><div class="art">${rule}</div><div class="btns"><button data-r="save">Записать белый список в профиль</button></div>` : ''}`;
    if(pass){ $('save').onclick = () => { box.dispatchEvent(new CustomEvent('exp:artifact', { bubbles: true, detail: { widget: 'widget_ps_l5_babymonitor', rule, metrics: { looksChosen: n, sleepQ: sleepQ(n), info: infoCum(n), seed } } })); $('save').textContent = 'Записано ✓'; $('save').disabled = true; }; }
  };

  $('rng').oninput = update;
  $('again').onclick = () => { $('rng').value = 4; init(Date.now()); };
  box._expResize = () => { drawTL(); drawCH(); }; window.addEventListener('resize', box._expResize);
  init(seed);
};
