/*
 * W-16 · widget_ps_l3_green_streak · П3 «Головокружение от успехов» (ДОСЫЛКА 2026-09-05 — единственный пробел ТЗ-2 закрыт, 48/48)
 *
 * Спека эксперта (widget_ps_l3_green_streak.md):
   Цель: Увидеть, как серия зелёных дней *сама* поднимает размер ставки, а обычный красный день × раздутый размер даёт удар, «которого не ждали».
   Задание: Пройти серию. После каждого зелёного дня эго двигает ползунок «размер ставки». Встретить красный период с размером ×1. Со второго раунда доступен «устав‑блок» — правило, написанное заранее.
   Ага: В момент удара сцена вспыхивает красным; две кривые расходятся: устав −12 %, ты −24 % (при ×2). Внизу — цена возврата +32 % против +14 % и «цена сирены» в рублях.
   Дефолты: Счёт 1 000 000 ₽; серия 8–12 зелёных дней в сумме +12 %; красный период −5 / −4 / −3 % = −12 % при ×1; ползунок ×1…×3; seed 42, «новый раунд» → `Date.now()`.
   Артефакт: Строка в журнал: раунд, размер при ударе, просадка, требуемое восстановление, число возвратов на ×1, использован ли устав‑блок, правило урока.
 *
 * Источник: widget_ps_l3_green_streak.md (коммит e3ac6be, «Add files via upload»).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l3_green_streak'] = function (box) {
  /* ── 0. чистим прошлый запуск ───────────────────────────────────────── */
  if (box._expTimers) { box._expTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); }
  if (box._expRaf) { cancelAnimationFrame(box._expRaf); }
  if (box._expResize) { window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { const id = requestAnimationFrame(fn); box._expRaf = id; return id; };

  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* ── 1. канон урока П3 ──────────────────────────────────────────────── */
  const EQ0 = 1000000;              // счёт 1 000 000 ₽
  const STREAK_SUM = 12;            // две отличные недели: +12 % при ×1
  const RED = [5, 4, 3];            // обычный красный период: −12 % при ×1
  const SIZE_MAX = 3;
  const TICK = 850;                 // мс на один день
  const WHISPERS = [
    'ты гений', 'надо было ставить больше', 'теперь можно',
    'система же показывает, что можно поднять риск!',
    'отобьём треть года за месяц', 'а не снять ли на отпуск',
    'я стал лучше — это же видно', 'ставь вдвое, сейчас самое время'
  ];

  const OK = '#22c55e', BAD = '#ef4444', WARN = '#eab308', ACC2 = '#06b6d4', MUT = '#9aa3c7', TXT = '#eef1ff';
  const MONO = 'var(--mono, ui-monospace, "SF Mono", Menlo, monospace)';
  const MONO_C = 'ui-monospace, Menlo, Consolas, monospace';

  /* ── 2. состояние ───────────────────────────────────────────────────── */
  const S = {
    round: 0, history: [], days: [], cur: 0, streakLen: 0,
    running: false, done: false, timer: null, dirty: true,
    size: 1, sizeTarget: 1, eq: EQ0, eqC: EQ0, peak: EQ0, peakC: EQ0,
    pts: [EQ0], ptsC: [EQ0], locked: false,
    egoPushes: 0, returns: 0, selfUps: 0, sizeAtHit: null, maxSize: 1, streak: 0, flash: 0
  };

  /* ── 3. разметка ────────────────────────────────────────────────────── */
  box.innerHTML = `
  <style>
    .gs{color:var(--txt,${TXT});font-size:14px;line-height:1.45;max-width:100%;}
    .gs *{box-sizing:border-box;}
    .gs .card{background:linear-gradient(180deg,#0d1022 0%,#040714 100%);border:1px solid var(--line,rgba(154,163,199,.22));border-radius:12px;padding:14px;display:grid;gap:12px;overflow:hidden;}
    .gs h4{margin:0;font-size:16px;font-weight:700;}
    .gs .goal{color:var(--mut,${MUT});font-size:13px;}
    .gs .task{border-left:3px solid var(--acc2,${ACC2});padding:6px 10px;background:rgba(6,182,212,.07);border-radius:0 8px 8px 0;font-size:13px;}
    .gs canvas{display:block;width:100%;}
    .gs .cv{height:230px;border-radius:8px;background:rgba(0,0,0,.25);}
    .gs .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
    .gs .gauge{width:150px;height:84px;flex:0 0 150px;}
    .gs .slab{flex:1 1 180px;min-width:0;}
    .gs .slab label{display:flex;justify-content:space-between;font-size:12px;color:var(--mut,${MUT});margin-bottom:4px;}
    .gs .slab b{font-family:${MONO};color:var(--txt,${TXT});font-size:15px;}
    .gs input[type=range]{width:100%;accent-color:var(--acc2,${ACC2});margin:0;}
    .gs input[type=range]:disabled{opacity:.45;}
    .gs .ticks{display:flex;justify-content:space-between;font-size:11px;color:var(--mut,${MUT});font-family:${MONO};margin-top:2px;}
    .gs .whisper{min-height:38px;display:flex;align-items:center;gap:8px;font-style:italic;color:var(--warn,${WARN});opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s;font-size:13px;}
    .gs .whisper.show{opacity:1;transform:none;}
    .gs .whisper.bad{color:var(--bad,${BAD});font-style:normal;font-weight:700;}
    .gs .whisper.lock{text-decoration:line-through;color:var(--mut,${MUT});}
    .gs .whisper .tag{font-style:normal;font-size:11px;padding:2px 6px;border-radius:999px;background:rgba(234,179,8,.15);color:var(--warn,${WARN});text-decoration:none;}
    .gs .whisper.lock .tag{background:rgba(6,182,212,.15);color:var(--acc2,${ACC2});}
    .gs .btns{display:flex;flex-wrap:wrap;gap:8px;}
    .gs button{border:1px solid var(--line,rgba(154,163,199,.3));background:rgba(154,163,199,.08);color:var(--txt,${TXT});border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;font-family:inherit;}
    .gs button:hover:not(:disabled){background:rgba(154,163,199,.16);}
    .gs button:disabled{opacity:.4;cursor:default;}
    .gs button.pri{border-color:var(--acc2,${ACC2});background:rgba(6,182,212,.14);}
    .gs button.ok{border-color:var(--ok,${OK});background:rgba(34,197,94,.12);}
    .gs .hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;font-size:12px;}
    .gs .hud div{background:rgba(154,163,199,.06);border-radius:8px;padding:6px 8px;color:var(--mut,${MUT});}
    .gs .hud b{display:block;font-family:${MONO};font-size:14px;color:var(--txt,${TXT});font-weight:600;}
    .gs .lockrow{display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:8px 10px;border-radius:8px;border:1px dashed var(--line,rgba(154,163,199,.3));}
    .gs .lockrow input{margin-top:3px;accent-color:var(--acc2,${ACC2});}
    .gs .lockrow small{display:block;color:var(--mut,${MUT});font-size:12px;}
    .gs .debrief{display:none;border:1px solid var(--bad,${BAD});border-radius:10px;padding:12px;background:rgba(239,68,68,.06);gap:8px;}
    .gs .debrief.show{display:grid;}
    .gs .debrief h5{margin:0;font-size:14px;}
    .gs .vs{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .gs .vs div{border-radius:8px;padding:8px;font-size:12px;color:var(--mut,${MUT});}
    .gs .vs .c{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.35);}
    .gs .vs .u{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.4);}
    .gs .vs b{display:block;font-family:${MONO};font-size:18px;color:var(--txt,${TXT});}
    .gs .vs span{display:block;font-family:${MONO};color:var(--txt,${TXT});}
    .gs .verdict{font-size:13px;}
    .gs .rule{font-size:12px;color:var(--mut,${MUT});border-top:1px solid var(--line,rgba(154,163,199,.2));padding-top:8px;}
    .gs .whatif{display:none;gap:8px;}
    .gs .whatif.show{display:grid;}
    .gs .whatif .out{font-family:${MONO};font-size:13px;}
    .gs table{width:100%;border-collapse:collapse;font-size:12px;font-family:${MONO};}
    .gs th,.gs td{padding:4px 3px;text-align:right;border-bottom:1px solid var(--line,rgba(154,163,199,.15));white-space:nowrap;}
    .gs th{color:var(--mut,${MUT});font-weight:500;}
    .gs td:first-child,.gs th:first-child{text-align:left;}
    .gs .hist{display:none;}
    .gs .hist.show{display:block;}
    .gs .art{display:none;gap:6px;}
    .gs .art.show{display:grid;}
    .gs textarea{width:100%;min-height:74px;resize:vertical;background:rgba(0,0,0,.3);color:var(--txt,${TXT});border:1px solid var(--line,rgba(154,163,199,.3));border-radius:8px;padding:8px;font-family:${MONO};font-size:12px;}
    .gs .fine{font-size:11px;color:var(--mut,${MUT});}
  </style>
  <div class="gs"><div class="card">
    <h4>Зелёная полоса: удар, которого не ждёшь</h4>
    <div class="goal">Цель: увидеть, как серия зелёных дней сама поднимает размер ставки — и что делает обычный красный день с раздутым размером.</div>
    <div class="task">Задание: пройди серию. После каждого зелёного дня эго будет двигать ползунок. Встреть красный период с размером <b>×1</b>. Со второго раунда можно заранее включить устав‑блок.</div>

    <canvas class="cv" data-r="cv"></canvas>

    <div class="row">
      <canvas class="gauge" data-r="gv"></canvas>
      <div class="slab">
        <label><span>Размер ставки (× от уставного риска 1 % на сделку)</span><b data-r="sizeLbl">×1.00</b></label>
        <input type="range" min="1" max="${SIZE_MAX}" step="0.05" value="1" data-r="slider" aria-label="Размер ставки">
        <div class="ticks"><span>×1 устав</span><span>×2</span><span>×3</span></div>
      </div>
    </div>

    <div class="whisper" data-r="whisper" aria-live="polite"></div>

    <div class="btns">
      <button class="pri" data-r="btnStart">▶ Начать серию</button>
      <button class="ok" data-r="btnReturn" disabled>↺ Вернуть на ×1 (по уставу)</button>
      <button data-r="btnNew" disabled>Новый раунд</button>
    </div>

    <div class="lockrow">
      <input type="checkbox" data-r="lock" id="gs-lock-${Date.now()}" disabled>
      <div>
        <label for="gs-lock-${Date.now()}" data-r="lockLbl">Устав‑блок: размер меняется только по расписанию (раз в квартал, шаг ≤ 1/10)</label>
        <small data-r="lockHint">Откроется со второго раунда: сначала почувствуй тягу руками, потом получи инструмент.</small>
      </div>
    </div>

    <div class="hud">
      <div>День<b data-r="hDay">0 / 0</b></div>
      <div>Зелёных подряд<b data-r="hStreak">0</b></div>
      <div>Твой счёт<b data-r="hEq">1 000 000 ₽</b></div>
      <div>Счёт по уставу<b data-r="hEqC">1 000 000 ₽</b></div>
      <div>Разница<b data-r="hDiff">0 ₽</b></div>
    </div>

    <div class="debrief" data-r="debrief">
      <h5 data-r="dTitle"></h5>
      <div class="vs">
        <div class="c">Тот же красный период по уставу (×1)<b data-r="dC"></b><span data-r="dCr"></span></div>
        <div class="u">У тебя (размер при ударе <span data-r="dS" style="display:inline"></span>)<b data-r="dU"></b><span data-r="dUr"></span></div>
      </div>
      <div class="verdict" data-r="dBeh"></div>
      <div class="verdict" data-r="dVerdict"></div>
      <div class="rule">Правила против сирены (П3): риск растёт только по расписанию устава — не чаще раза в квартал и не больше десятой части сразу; никогда вдвое за ночь. Четыре недели моратория на новые идеи после лучшей серии. Прибыль — «одна сумма»: те же деньги, те же правила.</div>
    </div>

    <div class="whatif" data-r="whatif">
      <label style="font-size:12px;color:var(--mut)">А что если: размер в момент удара <b data-r="wLbl" style="font-family:${MONO};color:var(--txt)">×2.00</b></label>
      <input type="range" min="1" max="${SIZE_MAX}" step="0.05" value="2" data-r="wSlider" aria-label="Размер при ударе">
      <div class="out" data-r="wOut"></div>
      <div class="fine">Формула из урока 0.12: чтобы отыграть просадку DD, нужен рост DD / (1 − DD). При ×2: −24 % → +31.6 %.</div>
    </div>

    <div class="hist" data-r="hist">
      <table><thead><tr><th>Раунд</th><th>Устав</th><th>× при ударе</th><th>Просадка</th><th>Вернуть</th><th>Возвратов</th><th>Цена сирены</th></tr></thead><tbody data-r="histBody"></tbody></table>
    </div>

    <div class="art" data-r="art">
      <div class="fine">Артефакт для журнала (строка П3):</div>
      <textarea readonly data-r="artTa"></textarea>
      <div class="btns"><button data-r="btnSel">Выделить текст</button></div>
    </div>
  </div></div>`;

  const R = {};
  box.querySelectorAll('[data-r]').forEach(el => { R[el.getAttribute('data-r')] = el; });
  const cv = R.cv, ctx = cv.getContext('2d');
  const gv = R.gv, gtx = gv.getContext('2d');
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  /* ── 4. форматирование ──────────────────────────────────────────────── */
  const fmtRub = v => Math.round(v).toLocaleString('ru-RU') + ' ₽';
  const fmtSigned = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString('ru-RU') + ' ₽';
  const fmtPct = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 1 : d) + ' %';
  const fmtMln = v => (v / 1e6).toFixed(2) + ' млн';
  const fmtX = v => '×' + v.toFixed(2);

  /* ── 5. раунд ───────────────────────────────────────────────────────── */
  function newRound(seed) {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    S.round++;
    const rnd = mulberry32(seed);
    S.streakLen = 8 + Math.floor(rnd() * 5);              // 8–12 зелёных дней
    const raw = []; let sum = 0;
    for (let i = 0; i < S.streakLen; i++) { const m = 0.8 + rnd() * 0.8; raw.push(m); sum += m; }
    const k = STREAK_SUM / sum;                           // нормируем: сумма ровно +12 %
    S.days = raw.map(m => ({ kind: 'g', m: m * k })).concat(RED.map(m => ({ kind: 'r', m })));
    S.cur = 0; S.running = false; S.done = false;
    S.size = 1; S.sizeTarget = 1; S.eq = EQ0; S.eqC = EQ0; S.peak = EQ0; S.peakC = EQ0;
    S.pts = [EQ0]; S.ptsC = [EQ0];
    S.egoPushes = 0; S.returns = 0; S.selfUps = 0; S.sizeAtHit = null; S.maxSize = 1; S.streak = 0; S.flash = 0;

    // устав-блок доступен со 2-го раунда
    R.lock.disabled = S.round < 2;
    R.lockHint.textContent = S.round < 2
      ? 'Откроется со второго раунда: сначала почувствуй тягу руками, потом получи инструмент.'
      : 'Правило, написанное заранее: эго будет шептать, но ползунок не сдвинется.';
    S.locked = S.round >= 2 && R.lock.checked;

    R.slider.value = '1'; R.slider.disabled = S.locked;
    R.btnStart.textContent = '▶ Начать серию'; R.btnStart.disabled = false;
    R.btnReturn.disabled = true; R.btnNew.disabled = true;
    R.debrief.classList.remove('show'); R.whatif.classList.remove('show'); R.art.classList.remove('show');
    R.whisper.className = 'whisper'; R.whisper.textContent = '';
    updateHUD(); S.dirty = true;
  }

  function start() {
    if (S.done) return;
    S.running = true;
    S.locked = S.round >= 2 && R.lock.checked;
    R.lock.disabled = true; R.slider.disabled = S.locked;
    R.btnStart.textContent = '⏸ Пауза';
    R.btnReturn.disabled = S.locked;
    if (!S.timer) S.timer = later(tick, TICK, true);
  }
  function pause() {
    S.running = false;
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    R.btnStart.textContent = '▶ Продолжить';
  }

  function showWhisper(text, cls) {
    R.whisper.className = 'whisper';
    void R.whisper.offsetWidth;                            // перезапуск анимации
    R.whisper.innerHTML = '';
    const tag = document.createElement('span'); tag.className = 'tag';
    tag.textContent = cls === 'bad' ? 'рынок' : cls === 'lock' ? 'устав: нет' : 'эго';
    const t = document.createElement('span'); t.textContent = '«' + text + '»';
    R.whisper.appendChild(tag); R.whisper.appendChild(t);
    R.whisper.className = 'whisper show' + (cls ? ' ' + cls : '');
  }

  function tick() {
    if (!S.running || S.done) return;
    S.size = S.sizeTarget;                                 // применяем размер, к которому дополз ползунок
    const d = S.days[S.cur];
    if (d.kind === 'g') {
      S.streak++;
      S.eq *= 1 + d.m * S.size / 100;
      S.eqC *= 1 + d.m / 100;
      S.peak = Math.max(S.peak, S.eq); S.peakC = Math.max(S.peakC, S.eqC);
      if (S.streak >= 2) {
        const w = WHISPERS[(S.streak - 2) % WHISPERS.length];
        if (S.locked) { showWhisper(w, 'lock'); }
        else {
          showWhisper(w, '');
          S.sizeTarget = Math.min(SIZE_MAX, S.sizeTarget + 0.06 + 0.012 * S.streak); // шёпот усиливается с серией
          S.egoPushes++;
        }
      }
    } else {
      if (S.sizeAtHit === null) {
        S.sizeAtHit = S.size; S.flash = 1;
        showWhisper('Обычный красный день. Такие бывают каждую неделю.', 'bad');
      }
      // красный период измеряем от пика — как в уроке: −12 % при ×1, −24 % при ×2
      S.eq -= S.peak * d.m * S.size / 100;
      S.eqC -= S.peakC * d.m / 100;
    }
    S.maxSize = Math.max(S.maxSize, S.size);
    S.pts.push(S.eq); S.ptsC.push(S.eqC);
    S.cur++;
    updateHUD(); S.dirty = true;
    if (S.cur >= S.days.length) finish();
  }

  function finish() {
    S.running = false; S.done = true;
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    R.btnStart.disabled = true; R.btnStart.textContent = 'Серия завершена';
    R.btnReturn.disabled = true; R.btnNew.disabled = false; R.slider.disabled = true;

    const dd = (S.peak - S.eq) / S.peak, ddC = (S.peakC - S.eqC) / S.peakC;
    const rec = dd / (1 - dd), recC = ddC / (1 - ddC);
    const price = S.eqC - S.eq;
    const sHit = S.sizeAtHit || 1;

    R.dTitle.textContent = `Удар пришёл на день ${S.streakLen + 1} — после ${S.streakLen} зелёных подряд. Цена сирены: ${fmtSigned(-price)}`;
    R.dC.textContent = fmtPct(-ddC * 100); R.dCr.textContent = 'чтобы вернуться: ' + fmtPct(recC * 100);
    R.dS.textContent = fmtX(sHit);
    R.dU.textContent = fmtPct(-dd * 100); R.dUr.textContent = 'чтобы вернуться: ' + fmtPct(rec * 100);
    R.dBeh.innerHTML = `Эго толкало ползунок <b>${S.egoPushes}</b> раз · ты возвращал <b>${S.returns}</b> раз · сам поднимал <b>${S.selfUps}</b> раз · максимальный размер <b>${fmtX(S.maxSize)}</b> · устав‑блок: <b>${S.locked ? 'да' : 'нет'}</b>.`;

    let v;
    if (S.locked) v = 'Правило, написанное заранее, сработало: сирену ты слышал, но руль не отдавал. Обрати внимание: удар всё равно был — просто он остался обычным красным днём, а не катастрофой.';
    else if (sHit <= 1.1) v = 'Ты удержал ×1 силой воли — сегодня сработало. Но воля кончается на дистанции в сотни дней; со второго раунда включи устав‑блок и сравни, сколько нервов это стоит.';
    else if (sHit < 1.6) v = `Сирена подвинула тебя до ${fmtX(sHit)}: удар вышел в ${(dd / ddC).toFixed(1)} раза тяжелее уставного. Заметь: рынок был тот же, изменилась только уверенность.`;
    else v = `Сирена победила: ${fmtX(sHit)}. Именно так выглядит «удар, которого не ждал»: движения рынка те же, что давали +12 %, а просадка ${fmtPct(-dd * 100)} — и ${fmtPct(rec * 100)} до возврата. Это цена одной фразы «теперь можно».`;
    R.dVerdict.textContent = v;
    R.debrief.classList.add('show');

    // что если
    R.wSlider.value = String(Math.round(Math.max(1, sHit) * 20) / 20);
    updateWhatIf(); R.whatif.classList.add('show');

    // история раундов
    S.history.push({ round: S.round, lock: S.locked, sHit, dd, rec, returns: S.returns, price });
    R.histBody.innerHTML = S.history.map(h =>
      `<tr><td>${h.round}</td><td>${h.lock ? 'да' : 'нет'}</td><td>${fmtX(h.sHit)}</td><td style="color:${h.dd > 0.13 ? BAD : OK}">${fmtPct(-h.dd * 100)}</td><td>${fmtPct(h.rec * 100)}</td><td>${h.returns}</td><td>${fmtSigned(-h.price)}</td></tr>`
    ).join('');
    R.hist.classList.add('show');

    // артефакт
    R.artTa.value = `П3 «Зелёная полоса» · раунд ${S.round} · ${S.streakLen} зелёных подряд (+12 % при ×1)
Размер при ударе ${fmtX(sHit)} · просадка ${fmtPct(-dd * 100)} (устав: ${fmtPct(-ddC * 100)}) · для возврата ${fmtPct(rec * 100)} (устав: ${fmtPct(recC * 100)})
Эго толкало ${S.egoPushes} раз · возвратов на ×1: ${S.returns} · сам поднимал: ${S.selfUps} · устав‑блок: ${S.locked ? 'да' : 'нет'} · цена сирены: ${fmtSigned(-price)}
Правило: риск растёт только по расписанию устава (раз в квартал, шаг ≤ 1/10); 4 недели моратория на идеи после лучшей серии; прибыль — одна сумма.`;
    R.art.classList.add('show');
    S.dirty = true;
  }

  function updateHUD() {
    R.hDay.textContent = `${S.cur} / ${S.days.length}`;
    R.hStreak.textContent = String(S.streak);
    R.hEq.textContent = fmtRub(S.eq); R.hEqC.textContent = fmtRub(S.eqC);
    const diff = S.eq - S.eqC;
    R.hDiff.textContent = fmtSigned(diff);
    R.hDiff.style.color = diff < -1 ? BAD : diff > 1 ? OK : TXT;
    R.sizeLbl.textContent = fmtX(S.sizeTarget);
    R.sizeLbl.style.color = S.sizeTarget < 1.3 ? OK : S.sizeTarget < 1.8 ? WARN : BAD;
    R.btnReturn.disabled = !S.running || S.locked || S.sizeTarget <= 1.001;
  }

  function updateWhatIf() {
    const s = parseFloat(R.wSlider.value);
    const dd = STREAK_SUM * s / 100, rec = dd / (1 - dd);
    R.wLbl.textContent = fmtX(s);
    R.wOut.innerHTML = `Просадка <b style="color:${dd > 0.13 ? BAD : OK}">${fmtPct(-dd * 100)}</b> → чтобы вернуться к пику: <b>${fmtPct(rec * 100)}</b> · на счёте 1 000 000 ₽ это <b>${fmtSigned(-EQ0 * (1 + STREAK_SUM / 100) * dd)}</b> на экране.`;
  }

  /* ── 6. рисование ───────────────────────────────────────────────────── */
  function fit(c) {
    const w = Math.max(200, c.clientWidth), h = c.clientHeight || parseInt(getComputedStyle(c).height, 10) || 100;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    return [w, h];
  }

  function draw() {
    const [w, h] = fit(cv);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const padL = 58, padR = 12, padT = 18, padB = 42;
    const total = Math.max(1, S.days.length);
    let lo = EQ0 * 0.72, hi = EQ0 * 1.18;
    S.pts.concat(S.ptsC).forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; });
    const rng = hi - lo; lo -= rng * 0.06; hi += rng * 0.06;
    const X = i => padL + (i / total) * (w - padL - padR);
    const Y = v => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);

    // сетка
    ctx.font = '11px ' + MONO_C; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (let k = 0; k <= 4; k++) {
      const v = lo + (hi - lo) * k / 4, y = Y(v);
      ctx.strokeStyle = 'rgba(154,163,199,.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = MUT; ctx.fillText(fmtMln(v), 4, y);
    }
    // стартовая линия 1 000 000 ₽
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(238,241,255,.35)';
    ctx.beginPath(); ctx.moveTo(padL, Y(EQ0)); ctx.lineTo(w - padR, Y(EQ0)); ctx.stroke(); ctx.setLineDash([]);

    // граница «удар»
    if (S.days.length && S.cur > S.streakLen) {
      const x = X(S.streakLen);
      ctx.strokeStyle = 'rgba(239,68,68,.45)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = BAD; ctx.textAlign = 'right'; ctx.fillText('удар', x - 4, padT + 6); ctx.textAlign = 'left';
    }

    // кривая устава
    ctx.lineWidth = 2; ctx.strokeStyle = ACC2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); S.ptsC.forEach((v, i) => { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); }); ctx.stroke(); ctx.setLineDash([]);

    // твоя кривая: зелёная, пока не ниже устава; красная — когда ниже
    ctx.lineWidth = 2.5;
    for (let i = 1; i < S.pts.length; i++) {
      ctx.strokeStyle = S.pts[i] >= S.ptsC[i] - 1 ? OK : BAD;
      ctx.beginPath(); ctx.moveTo(X(i - 1), Y(S.pts[i - 1])); ctx.lineTo(X(i), Y(S.pts[i])); ctx.stroke();
    }
    // точки и подписи концов
    const li = S.pts.length - 1;
    if (li >= 0) {
      const yU = Y(S.pts[li]), yC = Y(S.ptsC[li]), x = X(li);
      ctx.fillStyle = ACC2; ctx.beginPath(); ctx.arc(x, yC, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = S.pts[li] >= S.ptsC[li] - 1 ? OK : BAD; ctx.beginPath(); ctx.arc(x, yU, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px ' + MONO_C;
      const sep = Math.abs(yU - yC) < 14;
      ctx.fillStyle = ACC2; ctx.textAlign = 'right';
      ctx.fillText('устав ×1', Math.min(x - 8, w - padR - 4), sep ? yC + 10 : yC - 9);
      ctx.fillStyle = S.pts[li] >= S.ptsC[li] - 1 ? OK : BAD;
      ctx.fillText('ты ' + fmtX(S.size), Math.min(x - 8, w - padR - 4), sep ? yU - 10 : yU - 9 + (yU > yC ? 18 : 0));
      ctx.textAlign = 'left';
    }

    // лента дней
    const sy = h - padB + 12, sq = Math.max(6, Math.min(14, (w - padL - padR) / total - 3));
    S.days.forEach((d, i) => {
      const x = X(i + 1) - sq / 2, done = i < S.cur;
      ctx.fillStyle = done ? (d.kind === 'g' ? OK : BAD) : 'rgba(154,163,199,.18)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, sy, sq, sq, 2); else ctx.rect(x, sy, sq, sq);
      ctx.fill();
    });
    ctx.fillStyle = MUT; ctx.font = '10px ' + MONO_C;
    ctx.fillText('дни →  зелёная серия ' + (S.streakLen || '—') + ' дн. = +12 % при ×1;  красный период −5/−4/−3 %', padL, h - 6);

    // вспышка удара
    if (S.flash > 0) { ctx.fillStyle = `rgba(239,68,68,${(S.flash * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
  }

  function drawGauge() {
    const [w, h] = fit(gv);
    gtx.setTransform(dpr, 0, 0, dpr, 0, 0); gtx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h - 12, r = Math.min(w / 2 - 8, h - 22);
    const seg = (a0, a1, col) => { gtx.strokeStyle = col; gtx.lineWidth = 10; gtx.beginPath(); gtx.arc(cx, cy, r, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); gtx.stroke(); };
    seg(0, 0.15, OK); seg(0.15, 0.4, WARN); seg(0.4, 1, BAD);       // ×1–1.3 / ×1.3–1.8 / ×1.8–3
    const f = Math.max(0, Math.min(1, (S.size - 1) / (SIZE_MAX - 1)));
    const a = Math.PI + f * Math.PI;
    gtx.strokeStyle = TXT; gtx.lineWidth = 2.5; gtx.beginPath(); gtx.moveTo(cx, cy); gtx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); gtx.stroke();
    gtx.fillStyle = TXT; gtx.beginPath(); gtx.arc(cx, cy, 3.5, 0, Math.PI * 2); gtx.fill();
    gtx.fillStyle = MUT; gtx.font = '10px ' + MONO_C; gtx.textAlign = 'center'; gtx.textBaseline = 'alphabetic';
    gtx.fillText('риск‑аппетит', cx, h - 1);
    gtx.textAlign = 'left'; gtx.fillText('×1', 2, cy - 2); gtx.textAlign = 'right'; gtx.fillText('×3', w - 2, cy - 2); gtx.textAlign = 'left';
  }

  /* ── 7. события ─────────────────────────────────────────────────────── */
  R.btnStart.addEventListener('click', () => { S.running ? pause() : start(); });
  R.btnReturn.addEventListener('click', () => {
    if (S.sizeTarget > 1.001) { S.returns++; }
    S.sizeTarget = 1; R.slider.value = '1'; updateHUD(); S.dirty = true;
  });
  R.btnNew.addEventListener('click', () => { newRound(Date.now()); });
  R.slider.addEventListener('input', () => {
    const v = parseFloat(R.slider.value);
    if (v > S.sizeTarget + 0.001) S.selfUps++; else if (v < S.sizeTarget - 0.001) S.returns++;
    S.sizeTarget = v; S.size = v; updateHUD(); S.dirty = true;
  });
  R.lock.addEventListener('change', () => { S.locked = S.round >= 2 && R.lock.checked; R.slider.disabled = S.locked; });
  R.wSlider.addEventListener('input', updateWhatIf);
  R.btnSel.addEventListener('click', () => { R.artTa.focus(); R.artTa.select(); });
  box._expResize = () => { S.dirty = true; };
  window.addEventListener('resize', box._expResize);

  /* ── 8. цикл анимации (только когда есть что менять) ────────────────── */
  function loop() {
    let anim = false;
    if (Math.abs(S.size - S.sizeTarget) > 0.003) {
      S.size += (S.sizeTarget - S.size) * 0.12; anim = true;
      if (!S.done) R.slider.value = S.size.toFixed(2);
    } else if (S.size !== S.sizeTarget) { S.size = S.sizeTarget; anim = true; }
    if (S.flash > 0) { S.flash = Math.max(0, S.flash - 0.02); anim = true; }
    if (anim || S.dirty) { draw(); drawGauge(); S.dirty = false; }
    raf(loop);
  }

  newRound(42);       // фиксированный seed первого раунда — воспроизводимо
  loop();
};
