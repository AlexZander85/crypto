/*
 * W-29 · widget_p0_l2 · 0.2 «Кошелёк, адрес и перевод»
 *
 * Спека эксперта (таблица, fable_viget.md):
 *   ---: ---
 *   **Цель**: Прожить перевод 0.02 BTC по шагам и увидеть: (1) подпись делается приватным ключом **локально**, а сеть проверяет её открытым ключом — ключ никуда не уходит; (2) монета не «летит», меняются записи у всех узлов; (3) секретность адреса ≠ секретность баланса.
 *   **Задание**: Вкладка 1: проверить адрес, выбрать комиссию, подписать, дождаться 2 подтверждений. Одна ловушка — кнопка «отправить ключ на сайт быстрой подписи». Вкладка 2: разложить 8 карточек в две колонки «видно всему миру / видишь только ты».
 *   **Ага**: При проверке адреса всплывает чужой баланс и история — «ты дал адрес, значит дал и баланс». При подписи узлы ставят ✓, а ключ остаётся у тебя. Блок закрылся — файла не было, изменились три строки в книге: −0.02 у тебя, +0.02 у получателя, +комиссия у майнера.
 *   **Дефолты**: Баланс 0.1 BTC, сумма 0.02, три уровня комиссии (1 / 8 / 25 сат/vB × 140 vB → включение в 3-й / 2-й / 1-й блок), блок раз в 1.8 с, порог 2 подтверждения, seed 42 (адреса, TXID, хеши).
 *   **Артефакт**: `{txid, fee, blockHeight, confirmations, leaked, sortScore}` → `dataset.artifact` + событие.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l2'] = function (box) {
  const L = window.EXPERT_LIB, { later, raf } = L.setup(box);
  let rnd = L.mulberry32(42); const tk = L.tokens(box);
  const HEX = '0123456789abcdef', B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const gen = (al, n) => { let s = ''; for (let i = 0; i < n; i++) s += al[Math.floor(rnd() * al.length)]; return s; };
  const FEES = [{ name: 'Низкая', sat: 1, wait: 3 }, { name: 'Средняя', sat: 8, wait: 2 }, { name: 'Высокая', sat: 25, wait: 1 }];
  const feeBTC = i => FEES[i].sat * 140 / 1e8;
  const fb = n => (Math.round(n * 1e8) / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + ' BTC';
  const H0 = 880000, BLOCK_MS = 1800;
  const st = {};

  function reset() {
    rnd = L.mulberry32(42);
    st.me = 'bc1q' + gen(B32, 38); st.to = 'bc1q' + gen(B32, 38);
    Object.assign(st, { tab: 'tx', step: 1, addr: st.to, addrOk: false, addrNote: '', amount: 0.02, amountNote: '', fee: 1,
      signed: false, signAt: 0, leaked: false, sent: false, sentAt: 0, blocksSinceSend: 0, includedAt: null, includeAnim: 0, confs: 0, done: false,
      bal: { me: 0.1, to: 0.35, miner: 0 }, txid: null, sig: null, envAt: 0,
      blocks: [0, 1, 2].map(i => ({ h: H0 + i, hash: gen(HEX, 6), born: 0, tx: false })) });
    st.sort = { active: null, cards: shuffle([
      { id: 'addr', name: 'Публичный адрес', pub: true, why: 'Его дают, чтобы получить деньги — как номер карты. Публичен по назначению.' },
      { id: 'bal', name: 'Баланс адреса', pub: true, why: 'Любой вставит адрес в обозреватель блокчейна и увидит остаток. Секретность адреса ≠ секретность баланса.' },
      { id: 'hist', name: 'История переводов по адресу', pub: true, why: 'Все входящие и исходящие — навсегда в открытой книге у тысяч узлов.' },
      { id: 'txid', name: 'TXID перевода', pub: true, why: 'Номер записи в книге. По нему получатель и ты проверяете статус — показывать можно.' },
      { id: 'qr', name: 'QR-код адреса', pub: true, why: 'Тот же публичный адрес, только картинкой.' },
      { id: 'priv', name: 'Приватный ключ', pub: false, why: 'Право подписи = право распоряжаться монетами адреса. Ушёл ключ — ушли деньги.' },
      { id: 'seed', name: 'Seed-фраза (12 слов)', pub: false, why: 'Из неё восстанавливаются ВСЕ ключи кошелька. Это весь кошелёк целиком.' },
      { id: 'pass', name: 'Пароль от приложения-кошелька', pub: false, why: 'Открывает доступ к ключам на устройстве — тоже дверь к деньгам.' }
    ]) };
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- логика перевода ----------
  function checkAddr(v) {
    st.addr = v.trim();
    if (st.addr === st.to) {
      st.addrOk = true;
      st.addrNote = `<span style="color:${tk.ok}">✓ Адрес корректен.</span> И обрати внимание: любой, кто знает этот адрес, уже видит по нему <b>баланс 0.35 BTC и 17 переводов</b>. Адрес публичен — значит, публичен и баланс. Это первое «ага» урока.`;
    } else {
      st.addrOk = false;
      st.addrNote = `<span style="color:${tk.bad}">✗ Контрольная сумма не сошлась</span> — сеть отвергнет такой перевод (в этот раз повезло). Совпади опечатка с чужим реальным адресом — монеты ушли бы навсегда: службы «отменить перевод» в блокчейне нет.`;
    }
  }
  function sign(leak) {
    if (leak) { st.leaked = true; return; }
    st.signed = true; st.signAt = performance.now(); st.sig = gen(HEX, 8) + '…' + gen(HEX, 4);
    st.txid = gen(HEX, 64);
    later(render, 2100); // кнопка «Отправить» появится после проверки узлами
  }
  function send() {
    st.sent = true; st.sentAt = performance.now(); st.envAt = st.sentAt; st.step = 4; st.blocksSinceSend = 0;
    later(mine, BLOCK_MS, true);
  }
  function mine() {
    if (!box.isConnected || st.done) return;
    st.blocksSinceSend++;
    const last = st.blocks[st.blocks.length - 1];
    const b = { h: last.h + 1, hash: gen(HEX, 6), born: performance.now(), tx: false };
    if (st.includedAt === null && st.blocksSinceSend >= FEES[st.fee].wait) {
      b.tx = true; st.includedAt = b.h; st.includeAnim = performance.now();
      const f = feeBTC(st.fee);
      st.bal.me = st.bal.me - st.amount - f; st.bal.to += st.amount; st.bal.miner += f;
    }
    st.blocks.push(b); if (st.blocks.length > 6) st.blocks.shift();
    if (st.includedAt !== null) st.confs = b.h - st.includedAt + 1;
    if (st.confs >= 2) {
      st.done = true; st.step = 5;
      L.artifact(box, 'widget_p0_l2', { txid: st.txid, fee: feeBTC(st.fee), blockHeight: st.includedAt, confirmations: st.confs, leaked: st.leaked, sortScore: sortScore() });
    }
    render();
  }
  const sortScore = () => st.sort.cards.filter(c => c.placed && (c.placed === 'pub') === c.pub).length;

  // ---------- разметка ----------
  box.innerHTML = `<style>${L.baseCSS('xw29')}
.xw29 .tabs{display:flex;gap:6px}.xw29 .tabs button{border-radius:8px 8px 0 0;border-bottom:none;padding:6px 12px}
.xw29 .tabs button.on{background:var(--acc2,#06b6d4);color:#04121a;font-weight:600}
.xw29 .panel{display:flex;flex-direction:column;gap:8px;font-size:13px}
.xw29 .step{border:1px solid var(--line,rgba(154,163,199,.28));border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.xw29 .step h4{margin:0;font-size:13px;color:var(--acc2,#06b6d4)}
.xw29 .fee{display:flex;flex-wrap:wrap;gap:6px}.xw29 .fee button{flex:1 1 130px;font-size:12px}.xw29 .fee button.on{background:rgba(6,182,212,.35)}
.xw29 .bal{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;font-size:12px}
.xw29 .bal div{background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px}.xw29 .bal b{display:block;font-size:13px;color:var(--txt,#eef1ff)}
.xw29 .cards{display:flex;flex-wrap:wrap;gap:6px}
.xw29 .card{padding:6px 10px;border-radius:8px;border:1px solid var(--line,rgba(154,163,199,.35));background:rgba(255,255,255,.04);cursor:pointer;font-size:12px}
.xw29 .card.on{border-color:var(--acc2,#06b6d4);box-shadow:0 0 0 2px rgba(6,182,212,.25)}
.xw29 .card.good{border-color:var(--ok,#22c55e)}.xw29 .card.badc{border-color:var(--bad,#ef4444);animation:xw29shake .3s}
@keyframes xw29shake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.xw29 .zones{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.xw29 .zone{min-height:96px;border:1px dashed var(--line,rgba(154,163,199,.4));border-radius:10px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px}
.xw29 .zone.pub{border-color:rgba(6,182,212,.5)}.xw29 .zone.sec{border-color:rgba(234,179,8,.5)}
.xw29 .zone h5{margin:0;font-size:12px}.xw29 .why{font-size:11px;color:var(--mut,#9aa3c7)}
@media (max-width:420px){.xw29 .zones{grid-template-columns:1fr}.xw29 .bal{grid-template-columns:1fr}}
</style>
<div class="xw29">
  <div class="goal"><b>Цель:</b> увидеть, что подпись делается ключом <b>у тебя</b>, а перевод — это новая запись в общей книге, а не полёт файла. И что адрес публичен вместе с балансом.</div>
  <div class="tabs"><button data-t="tx" class="on">Перевод 0.02 BTC</button><button data-t="sort">Что видно миру / что видишь только ты</button></div>
  <canvas></canvas>
  <div class="panel"></div>
</div>`;
  const cv = box.querySelector('canvas'), panel = box.querySelector('.panel'), root = box.querySelector('.xw29');

  function render() {
    root.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === st.tab));
    cv.style.display = st.tab === 'tx' ? 'block' : 'none';
    panel.innerHTML = st.tab === 'tx' ? renderTx() : renderSort();
  }
  function renderTx() {
    const bal = `<div class="bal"><div>Ты <span class="mono">${st.me.slice(0, 10)}…</span><b>${fb(st.bal.me)}</b></div><div>Получатель <span class="mono">${st.to.slice(0, 10)}…</span><b>${fb(st.bal.to)}</b></div><div>Майнер (комиссия)<b>${fb(st.bal.miner)}</b></div></div>`;
    if (st.step === 1) return `<div class="step"><h4>Шаг 1 · Куда: адрес получателя</h4>
      <label>Адрес получателя<input type="text" class="mono" data-f="addr" value="${st.addr}" spellcheck="false"></label>
      <div class="btns"><button data-a="check" class="pri">Проверить адрес</button><button data-a="typo" class="ghost">Подставить адрес с опечаткой</button></div>
      <div class="msg ${st.addrOk ? 'ok' : st.addrNote ? 'bad' : ''}">${st.addrNote || 'Адрес — как номер карты: его можно дать кому угодно. Но сверяй посимвольно: отмены переводов не существует.'}</div>
      ${st.addrOk ? '<div><button data-a="next2" class="pri">Дальше →</button></div>' : ''}</div>` + bal;
    if (st.step === 2) return `<div class="step"><h4>Шаг 2 · Сколько и с какой комиссией</h4>
      <label>Сумма, BTC<input type="number" step="0.001" min="0.0001" max="0.09" data-f="amount" value="${st.amount}"></label>
      <div class="mut">Комиссия — плата майнеру за место в блоке. Больше платишь — раньше попадёшь в блок.</div>
      <div class="fee">${FEES.map((f, i) => `<button data-a="fee" data-i="${i}" class="${i === st.fee ? 'on' : ''}">${f.name}: ${f.sat} сат/vB<br><span class="mut">≈ ${fb(feeBTC(i))} · ждать ~${f.wait} блок${f.wait > 1 ? 'а' : ''}</span></button>`).join('')}</div>
      <div class="msg ${st.amountNote ? 'bad' : ''}">${st.amountNote || `Уйдёт: ${fb(st.amount)} получателю + ${fb(feeBTC(st.fee))} майнеру. Останется ${fb(st.bal.me - st.amount - feeBTC(st.fee))}.`}</div>
      <div class="btns"><button data-a="back1" class="ghost">← Назад</button><button data-a="next3" class="pri">Дальше →</button></div></div>` + bal;
    if (st.step === 3) {
      if (st.leaked) return `<div class="step"><h4>Шаг 3 · Подпись</h4>
        <div class="msg bad"><b>Ключ покинул устройство.</b> Теперь любой, у кого он есть, распоряжается всеми ${fb(0.1)} на адресе — не только этими 0.02. «Сайт быстрой подписи», «менеджер поддержки», «проверка кошелька» — одна и та же ловушка (урок 0.20). Подпись <b>всегда</b> делается внутри кошелька: наружу выходит только подпись, ключ — никогда.</div>
        <div class="btns"><button data-a="reset" class="pri">Начать заново</button></div></div>`;
      const ready = st.signed && performance.now() - st.signAt > 2000;
      return `<div class="step"><h4>Шаг 3 · Подпись приватным ключом</h4>
        <div class="mut">Чтобы сеть приняла перевод, его нужно подписать. Ключ лежит только у тебя. Два пути:</div>
        <div class="btns"><button data-a="sign" class="pri" ${st.signed ? 'disabled' : ''}>🔑 Подписать ключом внутри кошелька</button><button data-a="leak" class="bad" ${st.signed ? 'disabled' : ''}>Отправить ключ на сайт «быстрой подписи»</button></div>
        <div class="msg ${st.signed ? 'ok' : ''}">${st.signed
          ? `Подпись создана: <span class="mono">${st.sig}</span>. Смотри на сцену: узлы проверяют её <b>открытым</b> ключом и ставят ✓. Приватный ключ никуда не передавался — так работает «замок и ключ».`
          : 'Замок на почтовом ящике открывается только твоим ключом. Проверить, что открыл именно ты, могут все — по подписи.'}</div>
        ${ready ? '<div><button data-a="send" class="pri">Отправить в сеть →</button></div>' : ''}</div>` + bal;
    }
    if (st.step === 4) return `<div class="step"><h4>Шаг 4 · В сети</h4>
      <div class="msg">${st.includedAt === null
        ? `Перевод в <b>мемпуле</b> — общей очереди. Майнер соберёт следующий блок; с комиссией «${FEES[st.fee].name}» ждём ~${FEES[st.fee].wait} блок(а). Заметь: пока он в очереди, балансы не изменились.`
        : `Включён в блок <b>#${st.includedAt}</b>. Подтверждений: <b>${st.confs}/2</b>. Получатель уже видит перевод, но принимает после второго блока: чем глубже запись, тем дороже её переписать.`}</div></div>` + bal;
    return `<div class="step"><h4>Шаг 5 · Готово: 2 подтверждения</h4>
      <div class="msg aha"><b>Что произошло физически?</b> Ни один файл никуда не летел. У тысяч узлов одновременно изменились три строки в книге: твой адрес −${fb(st.amount + feeBTC(st.fee)).replace(' BTC', '')}, адрес получателя +${st.amount}, майнер +${fb(feeBTC(st.fee)).replace(' BTC', '')} BTC. Монеты «живут» в этой книге, а не в телефоне.</div>
      <div class="mut">TXID (публичен, можно показывать):</div><div class="mono">${st.txid}</div>
      <div class="btns"><button data-a="reset" class="ghost">Ещё раз</button><button data-a="gosort" class="pri">Дальше: что видно миру →</button></div></div>` + bal;
  }
  function renderSort() {
    const s = st.sort, free = s.cards.filter(c => !c.placed), placed = z => s.cards.filter(c => c.placed === z);
    const card = c => `<span class="card ${s.active === c.id ? 'on' : ''} ${c.placed ? ((c.placed === 'pub') === c.pub ? 'good' : 'badc') : ''}" data-c="${c.id}">${c.name}${c.placed ? ((c.placed === 'pub') === c.pub ? ' ✓' : ' ✗') : ''}</span>${c.placed ? `<div class="why">${c.why}</div>` : ''}`;
    const all = free.length === 0, score = sortScore();
    return `<div class="step"><h4>Разложи 8 карточек: нажми карточку, потом колонку</h4>
      <div class="cards">${free.map(card).join('') || '<span class="mut">все разложены</span>'}</div>
      <div class="zones">
        <div class="zone pub" data-z="pub"><h5>🌍 Видно всему миру</h5>${placed('pub').map(card).join('')}</div>
        <div class="zone sec" data-z="sec"><h5>🔒 Видишь только ты</h5>${placed('sec').map(card).join('')}</div>
      </div>
      <div class="msg ${all ? (score === 8 ? 'aha' : 'ok') : ''}">${all
        ? `<b>Итог: ${score}/8.</b> Пять вещей из восьми публичны — включая <b>баланс и всю историю</b>. Секретность адреса ≠ секретность баланса: дал адрес — дал и баланс. А три секретных — это и есть деньги: их не показывают никому, никогда, ни при какой «проверке поддержки».`
        : s.active ? 'Теперь нажми колонку, куда это положить.' : 'Подсказка: спроси себя — это даёт доступ к деньгам или только показывает, что с ними происходило?'}</div>
      <div class="btns">${all ? '<button data-a="resort" class="ghost">Перемешать заново</button>' : ''}<button data-a="gotx" class="ghost">← К переводу</button></div></div>`;
  }

  root.addEventListener('click', e => {
    const t = e.target;
    const tab = t.closest('[data-t]'); if (tab) { st.tab = tab.dataset.t; render(); return; }
    const c = t.closest('.card'); if (c && st.tab === 'sort') { const card = st.sort.cards.find(x => x.id === c.dataset.c); if (!card.placed) { st.sort.active = st.sort.active === card.id ? null : card.id; render(); } return; }
    const z = t.closest('.zone'); if (z && st.sort.active) { const card = st.sort.cards.find(x => x.id === st.sort.active); card.placed = z.dataset.z; st.sort.active = null; if (st.sort.cards.every(x => x.placed) && st.done) L.artifact(box, 'widget_p0_l2', { txid: st.txid, fee: feeBTC(st.fee), blockHeight: st.includedAt, confirmations: st.confs, leaked: st.leaked, sortScore: sortScore() }); render(); return; }
    const b = t.closest('button[data-a]'); if (!b) return;
    const a = b.dataset.a, inp = f => panel.querySelector(`[data-f=${f}]`);
    if (a === 'check') { checkAddr(inp('addr').value); render(); }
    else if (a === 'typo') { const v = st.to.split(''); v[20] = v[20] === 'q' ? 'p' : 'q'; inp('addr').value = v.join(''); }
    else if (a === 'next2') { st.step = 2; render(); }
    else if (a === 'back1') { st.step = 1; render(); }
    else if (a === 'fee') { st.amount = parseFloat(inp('amount').value) || st.amount; st.fee = +b.dataset.i; st.amountNote = ''; render(); }
    else if (a === 'next3') {
      st.amount = parseFloat(inp('amount').value) || 0;
      if (st.amount <= 0 || st.amount + feeBTC(st.fee) > st.bal.me) { st.amountNote = `Нельзя: сумма + комиссия (${fb(st.amount + feeBTC(st.fee))}) больше баланса ${fb(st.bal.me)}. Комиссия платится сверх суммы.`; render(); return; }
      st.amountNote = ''; st.step = 3; render();
    }
    else if (a === 'sign') { sign(false); render(); }
    else if (a === 'leak') { sign(true); render(); }
    else if (a === 'send') { send(); render(); }
    else if (a === 'reset') { const keepTab = st.tab; L.setup(box); reset(); st.tab = keepTab; render(); raf(draw); later(() => {}, 0); }
    else if (a === 'gosort') { st.tab = 'sort'; render(); }
    else if (a === 'gotx') { st.tab = 'tx'; render(); }
    else if (a === 'resort') { st.sort.cards.forEach(c => c.placed = null); shuffle(st.sort.cards); render(); }
  });

  // ---------- сцена ----------
  const now = () => performance.now();
  function drawCard(ctx, r, title, addr, bal, mine) {
    L.roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill(); ctx.strokeStyle = tk.line; ctx.stroke();
    ctx.fillStyle = tk.txt; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(title, r.x + 8, r.y + 6);
    ctx.fillStyle = tk.mut; ctx.font = '10px ui-monospace,Menlo,monospace'; ctx.fillText(addr.slice(0, 12) + '…', r.x + 8, r.y + 22);
    ctx.fillStyle = tk.acc; ctx.font = 'bold 13px ui-monospace,Menlo,monospace'; ctx.fillText(fb(bal), r.x + 8, r.y + r.h - 20);
    if (mine) drawLock(ctx, r.x + r.w - 18, r.y + 12, st.signed && !st.leaked ? Math.min(1, (now() - st.signAt) / 900) : 0);
  }
  function drawLock(ctx, x, y, open) { // дужка поднимается при open→1
    ctx.strokeStyle = st.leaked ? tk.bad : (open >= 1 ? tk.ok : tk.warn); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 2 - 4 * open, 5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; L.roundRect(ctx, x - 7, y, 14, 11, 2); ctx.fill();
  }
  function drawKey(ctx, x, y) {
    ctx.strokeStyle = tk.warn; ctx.fillStyle = tk.warn; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x - 6, y, 4, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 9, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y + 4); ctx.moveTo(x + 9, y); ctx.lineTo(x + 9, y + 3); ctx.stroke();
  }
  function drawEnvelope(ctx, x, y, glow) {
    if (glow) { ctx.shadowColor = tk.acc; ctx.shadowBlur = 10; }
    ctx.fillStyle = tk.acc; L.roundRect(ctx, x - 9, y - 6, 18, 12, 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#04121a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 8, y - 5); ctx.lineTo(x, y + 1); ctx.lineTo(x + 8, y - 5); ctx.stroke();
  }
  function draw() {
    if (!box.isConnected) return;
    if (st.tab !== 'tx') { raf(draw); return; }
    const wide = cv.getBoundingClientRect().width >= 520, H = wide ? 270 : 350;
    const { ctx, W } = L.fitCanvas(cv, H), t = now();
    // раскладка
    const cw = wide ? 120 : Math.floor((W - 30) / 2), ch = wide ? 92 : 68;
    const me = wide ? { x: 10, y: 12, w: cw, h: ch } : { x: 10, y: 10, w: cw, h: ch };
    const to = wide ? { x: W - cw - 10, y: 12, w: cw, h: ch } : { x: W - cw - 10, y: 10, w: cw, h: ch };
    const mp = wide ? { x: W / 2 - 72, y: 14, w: 144, h: 54 } : { x: W / 2 - 72, y: 92, w: 144, h: 50 };
    const nodesY = wide ? 100 : 172, chainY = wide ? 160 : 222, bw = 58, bg = 8, chainX0 = W / 2 - (4 * bw + 3 * bg) / 2;
    drawCard(ctx, me, 'Твой кошелёк', st.me, st.bal.me, true); drawCard(ctx, to, 'Получатель', st.to, st.bal.to, false);
    // мемпул
    ctx.setLineDash([4, 4]); ctx.strokeStyle = tk.line; L.roundRect(ctx, mp.x, mp.y, mp.w, mp.h, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = tk.mut; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('мемпул · очередь переводов', mp.x + mp.w / 2, mp.y + 5);
    // узлы-проверяющие
    for (let i = 0; i < 6; i++) {
      const nx = W / 2 - 75 + i * 30, checkAt = st.signAt + 1000 + i * 160, ok = st.signed && !st.leaked && t > checkAt;
      ctx.beginPath(); ctx.arc(nx, nodesY, 9, 0, 7); ctx.fillStyle = ok ? 'rgba(34,197,94,.25)' : 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = ok ? tk.ok : tk.line; ctx.stroke();
      if (ok) { ctx.fillStyle = tk.ok; ctx.font = 'bold 11px system-ui'; ctx.textBaseline = 'middle'; ctx.fillText('✓', nx, nodesY + 1); }
    }
    ctx.fillStyle = tk.mut; ctx.font = '10px system-ui'; ctx.textBaseline = 'top';
    ctx.fillText(st.signed && !st.leaked ? 'узлы проверяют подпись открытым ключом — приватный не покидал кошелёк' : 'узлы сети: проверят подпись, а не поверят на слово', W / 2, nodesY + 14);
    // ключ едет к замку мемпула (подпись)
    if (st.signed && !st.leaked) {
      const k = L.ease((t - st.signAt) / 900), sx = me.x + me.w - 18, sy = me.y + 12, ex = mp.x + 10, ey = mp.y + mp.h / 2;
      if (k < 1) drawKey(ctx, sx + (ex - sx) * k, sy + (ey - sy) * k);
      else { ctx.fillStyle = tk.ok; ctx.font = '11px ui-monospace,Menlo,monospace'; ctx.textAlign = 'left'; ctx.fillText('подпись ' + st.sig + ' ✓', mp.x + 8, mp.y + mp.h - 16); }
    }
    if (st.leaked) { ctx.fillStyle = tk.bad; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚠ ключ ушёл наружу — адрес больше не твой', W / 2, mp.y + mp.h + 4); }
    // цепочка блоков
    const vis = st.blocks.slice(-4);
    vis.forEach((b, i) => {
      const s = b.born ? L.ease((t - b.born) / 450) : 1, x = chainX0 + i * (bw + bg), cx = x + bw / 2, cy = chainY + 23;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      L.roundRect(ctx, x, chainY, bw, 46, 6); ctx.fillStyle = b.tx ? 'rgba(6,182,212,.18)' : 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = b.tx ? tk.acc : tk.line; ctx.stroke();
      ctx.fillStyle = tk.txt; ctx.font = 'bold 11px ui-monospace,Menlo,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('#' + b.h, cx, chainY + 5);
      ctx.fillStyle = tk.mut; ctx.font = '9px ui-monospace,Menlo,monospace'; ctx.fillText(b.hash, cx, chainY + 33);
      if (b.tx && t - st.includeAnim > 600) drawEnvelope(ctx, cx, chainY + 23, true);
      ctx.restore();
      if (i < vis.length - 1) { ctx.strokeStyle = tk.line; ctx.beginPath(); ctx.moveTo(x + bw, cy); ctx.lineTo(x + bw + bg, cy); ctx.stroke(); }
    });
    ctx.fillStyle = tk.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('блокчейн — общая книга; каждый блок ссылается на хеш предыдущего', W / 2, chainY + 52);
    // конверт: кошелёк → мемпул → блок
    if (st.sent) {
      const k1 = L.ease((t - st.envAt) / 700), sx = me.x + me.w / 2, sy = me.y + me.h, mx = mp.x + mp.w / 2, my = mp.y + mp.h / 2 + 4;
      if (st.includedAt === null) { drawEnvelope(ctx, sx + (mx - sx) * k1, sy + (my - sy) * k1, k1 >= 1); }
      else {
        const k2 = L.ease((t - st.includeAnim) / 600), bi = vis.findIndex(b => b.h === st.includedAt);
        if (k2 < 1 && bi >= 0) { const bx = chainX0 + bi * (bw + bg) + bw / 2, by = chainY + 23; drawEnvelope(ctx, mx + (bx - mx) * k2, my + (by - my) * k2, true); }
        ctx.fillStyle = st.confs >= 2 ? tk.ok : tk.warn; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`подтверждений: ${st.confs}/2`, W / 2, H - 16);
      }
    } else if (st.step < 4) { ctx.fillStyle = tk.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(st.step <= 2 ? 'монеты — записи в книге, а не файл на телефоне' : 'наружу выйдет только подпись; ключ остаётся на устройстве', W / 2, H - 16); }
    raf(draw);
  }

  reset(); render(); raf(draw);
};
