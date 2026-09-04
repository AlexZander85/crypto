/*
 * W-36 · widget_p0_l14 · 0.14 «EV-станок»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l14'] = function(box){
  const C = window.EXPERT_COMMON;
  if (!C) { box.innerHTML = '<div style="color:#ef4444">Не загружен exp_common.js</div>'; return; }
  C.ensureStyle();
  const { raf, onResize } = C.lifecycle(box);
  const P = C.palette();
  const N = 100;

  // ---- состояние ----
  let wr = 40, win = 300, loss = 100, cost = 0;
  let run = null, idx = 0, animT0 = 0, animating = false, firstSpin = true, size = null;
  const tasks = { t1: false, t2: false, t3: false };
  const PRESETS = [
    { name: 'Урок: 40% · +300 · −100', wr: 40, win: 300, loss: 100 },
    { name: 'Монетка: 50% · +10 · −10', wr: 50, win: 10, loss: 10 },
    { name: 'Лотерея: 1% · +3000 · −100', wr: 1, win: 3000, loss: 100 },
    { name: 'Ловушка: 99% · +5 · −1000', wr: 99, win: 5, loss: 1000 }
  ];
  const EV = () => wr / 100 * win - (1 - wr / 100) * loss - cost;
  const breakeven = () => (loss + cost) / (win + loss);          // p*, при котором EV = 0

  // ---- разметка ----
  box.innerHTML = `
  <div class="exp-card">
    <div class="exp-title">EV-станок: сколько в среднем приносит одна сделка</div>
    <div class="exp-goal">Цель: увидеть, что прибыль делает не частота побед, а «частота × размер». 99% побед может быть убытком, 35% — доходом.</div>
    <div class="exp-task">Задание:
      <div><span class="exp-check js-t1">сделай прибыльной стратегию с винрейтом 35%</span></div>
      <div><span class="exp-check js-t2">на пресете «Ловушка» найди винрейт, при котором она хотя бы выходит в ноль</span></div>
      <div><span class="exp-check js-t3">нажми «Крутить 100 сделок» на ловушке и досмотри до конца</span></div>
    </div>
    <div class="exp-formula js-formula"></div>
    <canvas class="exp-canvas js-cv"></canvas>
    <div class="exp-row">
      <label class="exp-slider">частота побед (винрейт): <b class="js-wrv"></b><input type="range" class="js-wr" min="1" max="99.5" step="0.5"></label>
      <label class="exp-slider">средний плюс: <b class="js-winv"></b><input type="range" class="js-win" min="1" max="1000" step="1"></label>
      <label class="exp-slider">средний минус: <b class="js-lossv"></b><input type="range" class="js-loss" min="1" max="1000" step="1"></label>
      <label class="exp-slider">издержки на сделку: <b class="js-costv"></b><input type="range" class="js-cost" min="0" max="20" step="0.5"></label>
    </div>
    <div class="exp-row js-presets"></div>
    <div class="exp-row"><button class="exp-btn primary js-spin">Крутить 100 сделок</button><span class="exp-goal js-hint">Торговый автомат играет 100 сделок с этими параметрами и рисует кривую капитала.</span></div>
    <div class="exp-stats js-stats"></div>
    <div class="exp-aha js-aha" hidden></div>
    <div class="exp-artifact js-art"></div>
  </div>`;
  const $ = s => box.querySelector(s);
  const cv = $('.js-cv'), ahaEl = $('.js-aha'), statsEl = $('.js-stats'), artEl = $('.js-art');
  const sl = { wr: $('.js-wr'), win: $('.js-win'), loss: $('.js-loss'), cost: $('.js-cost') };

  PRESETS.forEach((p, i) => {
    const b = document.createElement('button'); b.className = 'exp-btn'; b.textContent = p.name; b.dataset.i = i;
    b.addEventListener('click', () => { wr = p.wr; win = p.win; loss = p.loss; syncSliders(); onParams(); });
    $('.js-presets').appendChild(b);
  });
  Object.keys(sl).forEach(k => sl[k].addEventListener('input', e => {
    const v = +e.target.value; if (k === 'wr') wr = v; else if (k === 'win') win = v; else if (k === 'loss') loss = v; else cost = v; onParams();
  }));
  $('.js-spin').addEventListener('click', spin);

  function syncSliders(){ sl.wr.value = wr; sl.win.value = win; sl.loss.value = loss; sl.cost.value = cost; }
  function onParams(){
    // сдвинули параметры — старый прогон уже про другую стратегию
    if (!animating) run = null;
    tasks.t1 = tasks.t1 || (wr === 35 && EV() > 0);
    tasks.t2 = tasks.t2 || (win === 5 && loss === 1000 && Math.abs(EV()) < 1);
    updateUI(); draw();
  }

  // ---- автомат ----
  function spin(){
    if (animating) return;
    const seed = firstSpin ? 42 : (Date.now() % 2147483647) | 0; firstSpin = false;
    const rnd = C.mulberry32(seed), p = wr / 100;
    const out = new Float64Array(N), eq = new Float64Array(N + 1);
    let cur = 0, best = 0, crashIdx = -1, losses = 0;
    for (let k = 0; k < N; k++){
      const w = rnd() < p; out[k] = (w ? win : -loss) - cost; eq[k + 1] = eq[k] + out[k];
      if (w) { cur++; if (cur > best) { best = cur; crashIdx = -1; } } else { losses++; if (crashIdx === -1 && cur === best && best > 0) crashIdx = k; cur = 0; }
    }
    run = { out, eq, best, crashIdx, losses, final: eq[N], ev: EV(), wr, win, loss, cost, seed, done: false, crossedAt: 0 };
    idx = 0; ahaEl.hidden = true; animT0 = performance.now(); animating = true; $('.js-spin').disabled = true; raf(step);
  }
  function step(ts){
    const D = 4200, t = Math.min(1, (ts - animT0) / D);
    const target = Math.floor(t * N);
    if (run.crashIdx >= 0 && idx <= run.crashIdx && target > run.crashIdx) run.crossedAt = ts;   // момент обвала — для вспышки
    idx = target; draw();
    if (t < 1) raf(step); else { idx = N; animating = false; run.done = true; $('.js-spin').disabled = false; evaluate(); draw(); }
  }

  function evaluate(){
    const r = run, ratio = (loss / win);
    let cls = '', text = '';
    if (r.wr >= 90 && r.ev < 0){
      tasks.t3 = true;
      cls = 'bad';
      text = `<b>Ага.</b> Автомат выдал <b>${r.best}</b> побед подряд — и итог <b>${C.fmtSigned(r.final)} $</b>. Винрейт ${r.wr}% ничего не значит без размера убытка: одна сделка −${C.fmtNum(r.loss)} съедает <b>${Math.round(ratio)}</b> выигрышей по +${C.fmtNum(r.win)}. Стратегии «почти всегда в плюс» так и устроены — это мартингейлы и продажа хвостов (урок П24).`;
    } else if (r.wr <= 40 && r.ev > 0 && r.final > 0){
      text = `<b>Ага.</b> Побед всего ${r.wr}%, а итог <b>${C.fmtSigned(r.final)} $</b>: средний плюс в ${(r.win / r.loss).toFixed(1).replace('.', ',')} раза больше минуса. Прибыль делает асимметрия, а не частота — это и есть «стратегия с 35% побед может быть сверхприбыльной» из итога урока.`;
    } else if (r.ev > 0 && r.final < 0){
      cls = 'warn';
      text = `Матожидание положительное (${C.fmtSigned(r.ev, 1)} $/сделка), а 100 сделок закрылись в минус. На короткой дистанции такое бывает — вспомни коридор удачи из 0.13. Крути ещё: серия из нескольких прогонов покажет знак EV.`;
    } else if (r.ev < 0 && r.final > 0){
      cls = 'warn';
      text = `<b>Осторожно: повезло.</b> EV отрицательное (${C.fmtSigned(r.ev, 1)} $/сделка), а прогон в плюсе. Это самый опасный исход в трейдинге — он учит не тому. Крути ещё несколько раз и смотри, куда стремится итог.`;
    }
    if (text){ ahaEl.hidden = false; ahaEl.className = 'exp-aha js-aha ' + cls; ahaEl.innerHTML = text; }
    updateUI();
  }

  // ---- статистика, чек-лист, артефакт ----
  function updateUI(){
    const ev = EV(), be = breakeven();
    $('.js-wrv').textContent = wr.toString().replace('.', ',') + '%'; $('.js-winv').textContent = '+' + C.fmtNum(win) + ' $';
    $('.js-lossv').textContent = '−' + C.fmtNum(loss) + ' $'; $('.js-costv').textContent = cost.toString().replace('.', ',') + ' $';
    const pw = (wr / 100).toFixed(3).replace('.', ','), pl = (1 - wr / 100).toFixed(3).replace('.', ',');
    $('.js-formula').innerHTML = `EV = ${pw} × ${C.fmtNum(win)} − ${pl} × ${C.fmtNum(loss)}${cost ? ' − ' + cost.toString().replace('.', ',') : ''} = <b style="color:${ev >= 0 ? P.ok : P.bad}">${C.fmtSigned(ev, 2)} $ за сделку</b>`;
    ['t1', 't2', 't3'].forEach(k => $('.js-' + k).classList.toggle('done', tasks[k]));
    box.querySelectorAll('.js-presets .exp-btn').forEach(b => { const p = PRESETS[+b.dataset.i]; b.classList.toggle('active', p.wr === wr && p.win === win && p.loss === loss); });
    const card = (t, v, c) => `<div class="exp-stat">${t}<b style="color:${c || 'inherit'}">${v}</b></div>`;
    let html = card('матожидание сделки', C.fmtSigned(ev, 2) + ' $', ev >= 0 ? P.ok : P.bad) +
      card('безубыточный винрейт', C.fmtPct(be, 1) + ' <small>у тебя ' + wr.toString().replace('.', ',') + '%</small>', wr / 100 >= be ? P.ok : P.bad) +
      card('плюс / минус (R)', (win / loss).toFixed(2).replace('.', ','));
    if (run && run.done){
      html += card('100 сделок: факт', C.fmtSigned(run.final) + ' $ <small>ожидание ' + C.fmtSigned(run.ev * N) + '</small>', run.final >= 0 ? P.ok : P.bad) +
        card('макс. серия побед / убытков', run.best + ' / ' + run.losses);
    }
    statsEl.innerHTML = html;
    const done = ['t1', 't2', 't3'].filter(k => tasks[k]).length;
    C.artifact(box, artEl,
      `0.14 · EV = ${C.fmtSigned(ev, 2)} $/сделка при ${wr}% · +${C.fmtNum(win)} · −${C.fmtNum(loss)}${cost ? ' · издержки ' + cost : ''} · безубыточный WR ${C.fmtPct(be, 1)}` +
      (run && run.done ? ` · 100 сделок: ожидание ${C.fmtSigned(run.ev * N)}, факт ${C.fmtSigned(run.final)} (серия побед ${run.best})` : '') + ` · задания ${done}/3`,
      { widget: 'widget_p0_l14', wr, win, loss, cost, ev, breakeven: be, run: run && run.done ? { final: run.final, best: run.best, seed: run.seed } : null, tasks: done });
  }

  // ---- сцена: шкала EV + кривая капитала автомата ----
  function draw(){
    if (!size) return;
    const { ctx, w, h } = size, ev = EV(), be = breakeven();
    ctx.clearRect(0, 0, w, h);

    // шкала матожидания
    const gx0 = 16, gx1 = w - 16, gy = 30, gh = 14, R = C.niceCeil(Math.max(Math.abs(ev) * 1.35, 10));
    const gx = v => gx0 + (Math.max(-R, Math.min(R, v)) + R) / (2 * R) * (gx1 - gx0);
    ctx.font = '11px system-ui,sans-serif'; ctx.fillStyle = P.mut; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('матожидание одной сделки, $', gx0, gy - 6);
    let g = ctx.createLinearGradient(gx0, 0, gx(0), 0); g.addColorStop(0, 'rgba(239,68,68,.55)'); g.addColorStop(1, 'rgba(239,68,68,.12)');
    ctx.fillStyle = g; ctx.fillRect(gx0, gy, gx(0) - gx0, gh);
    g = ctx.createLinearGradient(gx(0), 0, gx1, 0); g.addColorStop(0, 'rgba(34,197,94,.12)'); g.addColorStop(1, 'rgba(34,197,94,.55)');
    ctx.fillStyle = g; ctx.fillRect(gx(0), gy, gx1 - gx(0), gh);
    ctx.fillStyle = P.txt; ctx.fillRect(gx(0) - 1, gy - 3, 2, gh + 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = P.mut;
    ctx.fillText('−' + C.fmtNum(R), gx0 + 12, gy + gh + 3); ctx.fillText('0', gx(0), gy + gh + 3); ctx.fillText('+' + C.fmtNum(R), gx1 - 12, gy + gh + 3);
    const nx = gx(ev), ncol = ev >= 0 ? P.ok : P.bad;
    ctx.fillStyle = ncol; ctx.beginPath(); ctx.moveTo(nx, gy - 2); ctx.lineTo(nx - 7, gy - 12); ctx.lineTo(nx + 7, gy - 12); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 12px ui-monospace,monospace'; ctx.textBaseline = 'bottom'; ctx.textAlign = nx > w * 0.8 ? 'right' : nx < w * 0.2 ? 'left' : 'center';
    ctx.fillText(C.fmtSigned(ev, 1) + ' $', nx, gy - 13);
    ctx.font = '11px system-ui,sans-serif'; ctx.fillStyle = wr / 100 >= be ? P.ok : P.bad; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`безубыточный винрейт при +${C.fmtNum(win)} / −${C.fmtNum(loss)}: ${C.fmtPct(be, 1)} — у тебя ${wr.toString().replace('.', ',')}%`, gx0, gy + gh + 16);

    // кривая капитала
    const padL = 48, padR = 14, padT = 84, padB = 30, pw = w - padL - padR, ph = h - padT - padB;
    ctx.strokeStyle = P.line; ctx.strokeRect(padL, padT, pw, ph);
    if (!run){
      ctx.fillStyle = P.mut; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '13px system-ui,sans-serif';
      ctx.fillText('Нажми «Крутить 100 сделок» — автомат сыграет эту стратегию', w / 2, padT + ph / 2);
      return;
    }
    const expEnd = run.ev * N;
    let lo = Math.min(0, expEnd), hi = Math.max(0, expEnd);
    for (let k = 0; k <= N; k++){ if (run.eq[k] < lo) lo = run.eq[k]; if (run.eq[k] > hi) hi = run.eq[k]; }
    const m = Math.max(1, (hi - lo) * 0.08); lo -= m; hi += m;
    const xOf = k => padL + k / N * pw, yOf = v => padT + (hi - v) / (hi - lo) * ph;
    ctx.fillStyle = P.mut; ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [lo + m, 0, hi - m].forEach(v => { if (Math.abs(v) < 1e-9 || v === lo + m || v === hi - m) ctx.fillText(C.fmtSigned(v), padL - 5, yOf(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 25, 50, 75, 100].forEach(k => ctx.fillText(k, xOf(k), padT + ph + 5));
    ctx.fillText('сделки', xOf(50), padT + ph + 17);
    ctx.strokeStyle = P.mut; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(padL, yOf(0)); ctx.lineTo(padL + pw, yOf(0)); ctx.stroke();
    // ожидание EV × k
    ctx.setLineDash([6, 5]); ctx.strokeStyle = P.mut; ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0)); ctx.lineTo(xOf(N), yOf(expEnd)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = P.mut; ctx.textAlign = 'right'; ctx.textBaseline = expEnd >= 0 ? 'bottom' : 'top';
    ctx.fillText('ожидание EV×100 = ' + C.fmtSigned(expEnd), xOf(N) - 4, yOf(expEnd) + (expEnd >= 0 ? -3 : 3));
    // факт
    const lineCol = run.done ? (run.final >= 0 ? P.ok : P.bad) : P.acc;
    ctx.strokeStyle = lineCol; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0));
    for (let k = 1; k <= idx; k++) ctx.lineTo(xOf(k), yOf(run.eq[k]));
    ctx.stroke(); ctx.lineWidth = 1;
    // тикер сделок
    for (let k = 0; k < idx; k++){ ctx.fillStyle = run.out[k] >= 0 ? P.ok : P.bad; ctx.fillRect(xOf(k), padT + ph - 5, Math.max(1.5, pw / N - 1), 5); }
    // голова кривой
    if (idx > 0){
      const x = xOf(idx), y = yOf(run.eq[idx]);
      ctx.fillStyle = run.out[idx - 1] >= 0 ? P.ok : P.bad; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px ui-monospace,monospace'; ctx.textAlign = x > w - 70 ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(C.fmtSigned(run.out[idx - 1]), x + (x > w - 70 ? -7 : 7), y);
    }
    // обвал: N побед стёрты одной сделкой
    if (run.crashIdx >= 0 && idx > run.crashIdx && run.best >= 10 && run.out[run.crashIdx] <= -run.win * 5){
      const x = xOf(run.crashIdx + 1), y = yOf(run.eq[run.crashIdx + 1]);
      const age = performance.now() - run.crossedAt, a = 0.6 + 0.4 * Math.max(0, Math.cos(age / 120));
      ctx.strokeStyle = P.bad; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9 + (age < 900 ? age / 60 : 0), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      ctx.fillStyle = P.bad; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textAlign = x > w / 2 ? 'right' : 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(`−${C.fmtNum(run.loss)}: ${run.best} побед стёрты одной сделкой`, x + (x > w / 2 ? -12 : 12), y - 10);
      if (!animating && age < 1200) raf(draw);
    }
  }

  function fit(){ size = C.fitCanvas(cv, 0.6, 260, 360); draw(); }
  onResize(fit);
  syncSliders(); fit(); updateUI();
};
