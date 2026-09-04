/*
 * W-39 · widget_p0_l19 · 0.19 «Детектив: проект CoinX» (IIFE, 3 legacy id) — СПЕЦИАЛЬНЫЙ
 * ПРИМЕЧАНИЕ: одна функция под тремя legacy-id (widget_p0_l19, _dd, _steps) — см. конец файла
 * (спека — в комментарии внутри кода)
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

(function () {
  'use strict';
  window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

  function coinXDetective(box) {
    /* 0. чистим прошлый запуск */
    if (box._expTimers) { box._expTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); }
    if (box._expRaf) { cancelAnimationFrame(box._expRaf); }
    box._expTimers = []; box._expRaf = null;
    const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
    const raf = fn => { if (box._expRaf) cancelAnimationFrame(box._expRaf); box._expRaf = requestAnimationFrame(fn); return box._expRaf; };
    const mulberry32 = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtUSD = v => '$' + Math.round(v).toLocaleString('ru-RU');

    /* ---------- канон урока ---------- */
    const CATS = {
      1: 'Ликвидность и объём',
      2: 'Команда и репутация',
      3: 'Реальная полезность',
      4: 'Токеномика',
      5: 'Аудит и код'
    };
    const DEPOSIT = 1000, ENTRY_COST = 0.12; // 12 % — комиссия DEX + проскальзывание (урок 0.17)
    const NAMES = [['CoinX', 'CX'], ['NovaChain', 'NOVA'], ['Meshpay', 'MSH'], ['ZkRocket', 'ZKR'],
      ['OrbitLend', 'ORB'], ['QuantumYield', 'QYLD'], ['Ledgerly', 'LDG'], ['PepeAI', 'PAI']];
    const AUDITORS = ['CertiK', 'OpenZeppelin', 'Trail of Bits'];
    const TABS = [['overview', 'Обзор'], ['contract', 'Контракт'], ['holders', 'Держатели'], ['liq', 'Ликвидность'], ['team', 'Команда и аудит']];

    /* ---------- генератор дела ---------- */
    function gbm(r, n, drift, vol) {
      const s = [1];
      for (let i = 1; i < n; i++) { const z = (r() + r() + r() + r() - 2) * 1.7; s.push(s[i - 1] * Math.exp(drift + vol * z)); }
      return s;
    }
    function rescale(s, target) { const n = s.length, k = target / s[n - 1]; return s.map((v, i) => v * Math.pow(k, i / (n - 1))); }

    function genCase(seed, forceScam) {
      const r = mulberry32(seed);
      const pick = a => a[Math.floor(r() * a.length)];
      const scam = forceScam === true ? true : (forceScam === false ? false : r() < 0.62);
      const nm = pick(NAMES);
      const c = { seed: seed, scam: scam, name: nm[0], ticker: nm[1], claims: [], ev: [], rugDay: -1 };
      const add = o => { o.id = 'e' + c.ev.length; c.ev.push(o); return o.id; };
      c.auditor = pick(AUDITORS);

      if (scam) {
        c.age = 1 + Math.floor(r() * 6);
        c.teamShare = 35 + Math.floor(r() * 21);
        c.verified = r() < 0.55;
        c.auditKind = r() < 0.6 ? 'fake' : 'none';
        c.lpLockDays = r() < 0.5 ? 0 : 7;
        c.volRep = 20 + Math.floor(r() * 60);
        c.pump = 600 + Math.floor(r() * 1400);
        c.rugDay = 2 + Math.floor(r() * 9);
        c.tagline = 'Первый AI-metaverse DeFi 3.0 с квантовой защитой. Успей до листинга.';
        c.tweet = { who: '@CryptoWhale_777 · 1,2 млн', text: 'Только что зашёл на $' + c.ticker + '. Это следующий ×100. Не благодарите 🚀🚀🚀', meta: '4 812 репостов · #реклама (мелко, внизу)' };
        c.claims = [
          { t: '🔒 Ликвидность заблокирована' },
          { t: '✅ Аудит ' + c.auditor + ' пройден' },
          { t: '👨‍💻 Команда ex-Google / ex-Binance' },
          { t: '📈 Объём $' + c.volRep + ' млн за 24 часа' },
          { t: '🚀 Гарантированно ×10 к листингу' }
        ];
        add({ tab: 'overview', cat: 2, flag: 'red', title: 'Контракт создан ' + c.age + ' дн. назад',
          detail: 'Токен с «командой ex-Google» и «$' + c.volRep + ' млн объёма» существует меньше недели. Истории нет — репутацию проверять не по чему.' });
        add({ tab: 'overview', cat: 2, flag: 'red', title: 'Кошелёк создателя пополнен через миксер за 2 ч до деплоя',
          detail: 'Источник денег скрыт намеренно. Честные команды платят за деплой с биржевого или давно живущего кошелька.' });
        if (c.verified) {
          add({ tab: 'contract', cat: 5, flag: 'green', title: 'Исходный код опубликован и совпадает с байткодом',
            detail: 'Это плюс — но открытый код ещё надо прочитать: что именно разрешено владельцу?' });
          c.evMint = add({ tab: 'contract', cat: 5, flag: 'red', title: 'mint() с модификатором onlyOwner',
            detail: 'Владелец может напечатать любое число токенов и продать их в пул. Это «тайная доэмиссия» из пункта 5 чек-листа.' });
          c.evHoney = add({ tab: 'contract', cat: 5, flag: 'red', title: 'setMaxSellPct(0): продажу можно отключить одной транзакцией',
            detail: 'Классический honeypot: купить могут все, продать — только те, кому разрешит владелец.' });
        } else {
          c.evNoSrc = add({ tab: 'contract', cat: 5, flag: 'red', title: 'Исходный код НЕ опубликован (только байткод)', claim: 1,
            detail: 'Ты не можешь узнать, что разрешено владельцу: доэмиссия, чёрный список, запрет продаж. «Аудит» закрытого кода — противоречие само по себе.' });
        }
        add({ tab: 'holders', cat: 4, flag: 'red', title: 'Создатель держит ' + c.teamShare + '% эмиссии без блокировки',
          detail: 'Порог урока: больше 20–30% у команды без лока — красный флаг. Здесь ' + c.teamShare + '% и лока нет: сброс возможен в любую секунду.' });
        add({ tab: 'holders', cat: 4, flag: 'red', title: '3 кошелька по ~11% созданы в день запуска и пополнены с одного адреса',
          detail: 'Скорее всего это тоже команда. Реальная доля инсайдеров ≈ ' + (c.teamShare + 33) + '%.' });
        add({ tab: 'liq', cat: 1, flag: 'red', claim: 0,
          title: c.lpLockDays ? 'LP-токены «заблокированы» на 7 дней' : 'LP-токены лежат на кошельке создателя — не заблокированы',
          detail: c.lpLockDays ? 'Лок на неделю — не лок, а витрина: через 7 дней ликвидность можно вынуть целиком.' : 'Сайт обещает «ликвидность заблокирована». Обозреватель показывает: LP у создателя, снять можно одной транзакцией.' });
        add({ tab: 'liq', cat: 1, flag: 'red', claim: 3, title: '81% «объёма» за сутки — 3 адреса торгуют друг с другом',
          detail: 'Накрутка объёма (wash trading). Реальных покупателей почти нет — продать крупно будет некому.' });
        add({ tab: 'team', cat: 2, flag: 'red', claim: 2, title: 'Команда анонимна: аватары-иллюстрации, LinkedIn созданы 2 недели назад',
          detail: '«Ex-Google» проверить невозможно. GitHub проекта: 2 коммита (README и логотип).' });
        add({ tab: 'team', cat: 5, flag: 'red', claim: 1,
          title: c.auditKind === 'fake' ? 'PDF «аудит ' + c.auditor + '» лежит на сайте проекта; в реестре ' + c.auditor + ' записи нет' : 'Аудита нет вообще',
          detail: c.auditKind === 'fake' ? 'Аудит проверяют на сайте аудитора, а не проекта. Поддельный PDF рисуется за час.' : 'Никто независимый код не смотрел.' });
        add({ tab: 'team', cat: 3, flag: 'red', title: 'Whitepaper: 4 страницы про «AI-metaverse DeFi 3.0»',
          detail: 'Ни одной формулы, ни описания механики, ни ответа «кто и за что платит». Слово blockchain — ради хайпа (пункт 3).' });
        c.holders = [
          ['Создатель 0x8f3…c21', c.teamShare, 'bad'],
          ['Пул ликвидности', 100 - c.teamShare - 41, 'mut'],
          ['0x1a4…e90 (создан в день запуска)', 11, 'bad'],
          ['0x2b7…f13 (создан в день запуска)', 11, 'bad'],
          ['0x3c0…a55 (создан в день запуска)', 11, 'bad'],
          ['Остальные 412 адресов', 8, 'mut']
        ];
        c.front = []; for (let i = 0; i <= 72; i++) { c.front.push((1 + (c.pump / 100) * Math.pow(i / 72, 2.2)) * (1 + (r() - 0.5) * 0.06)); }
        c.frontLabel = ['запуск', 'сейчас (день 3)'];
        c.truth = []; for (let d = 0; d <= 30; d++) {
          if (d <= c.rugDay) c.truth.push(1 + 0.06 * d * (1 + (r() - 0.5) * 0.4));
          else c.truth.push(d === c.rugDay + 1 ? 0.012 : Math.max(0.004, c.truth[d - 1] * 0.9));
        }
      } else {
        c.age = 200 + Math.floor(r() * 700);
        c.teamShare = 10 + Math.floor(r() * 11);
        c.lockMonths = 12 + Math.floor(r() * 25);
        c.lpLockMonths = 12 + Math.floor(r() * 13);
        c.revenue = 150 + Math.floor(r() * 500);
        c.pump = 15 + Math.floor(r() * 40);
        c.verified = true;
        c.tagline = 'Кредитование под залог BTC без посредников. Код открыт.';
        c.tweet = { who: '@' + c.name.toLowerCase() + '_dev · 18 тыс.', text: 'Вышла v2.3: комиссии снижены на 15%. Отчёт аудита — в репозитории, ссылка в шапке.', meta: '210 репостов' };
        c.claims = [
          { t: '🔒 Ликвидность в локе ' + c.lpLockMonths + ' мес (Unicrypt)' },
          { t: '✅ Аудит ' + c.auditor + ' — отчёт у аудитора' },
          { t: '👨‍💻 Команда публична, 23 контрибьютора' },
          { t: '📊 Выручка $' + c.revenue + ' тыс. за 30 дней (Dune)' },
          { t: '⚠ Риск: смарт-контракт может содержать ошибки' }
        ];
        add({ tab: 'overview', cat: 2, flag: 'green', title: 'Контракту ' + c.age + ' дн. — ' + Math.floor(c.age / 30) + ' мес истории торгов',
          detail: 'История есть: пережил хотя бы одну коррекцию рынка. Это не гарантия, но материал для проверки.' });
        add({ tab: 'overview', cat: 2, flag: 'green', title: 'Кошелёк создателя — с биржи, активен 3 года',
          detail: 'Источник средств прозрачен, кошелёк не одноразовый.' });
        add({ tab: 'contract', cat: 5, flag: 'green', title: 'Код открыт, mint() отсутствует, владение отозвано (renounceOwnership)',
          detail: 'Никто не может напечатать токены или включить чёрный список: функций просто нет.' });
        add({ tab: 'contract', cat: 5, flag: 'warn', title: 'Прокси-контракт: логику можно обновить голосованием DAO (таймлок 48 ч)',
          detail: 'Не красный флаг, но точка доверия: обновления видны заранее — следи за предложениями (урок Б13).' });
        add({ tab: 'holders', cat: 4, flag: 'green', title: 'Команда ' + c.teamShare + '% в вестинге на ' + c.lockMonths + ' мес; крупнейший частный кошелёк 2,8%',
          detail: 'Ниже порога 20% и с блокировкой: сбросить нечего и нельзя.' });
        add({ tab: 'holders', cat: 4, flag: 'warn', title: 'Фонд-инвестор 9% — разлок через 3 мес',
          detail: 'Возможное давление продаж. Это не скам, а календарь: запиши дату разлока.' });
        add({ tab: 'liq', cat: 1, flag: 'green', title: 'LP-токены в локе на ' + c.lpLockMonths + ' мес, контракт лока публичный',
          detail: 'Обещание сайта совпадает с блокчейном — ликвидность нельзя вынуть.' });
        add({ tab: 'liq', cat: 1, flag: 'green', title: 'Объём: 4 100 уникальных кошельков за сутки, топ-адрес — 4% объёма',
          detail: 'Объём распределён — это живые покупатели, а не три бота.' });
        add({ tab: 'team', cat: 2, flag: 'green', title: 'Основатели публичны: выступления, интервью, GitHub 1 840 коммитов',
          detail: 'Репутацию есть чем потерять — это главный залог честности.' });
        add({ tab: 'team', cat: 5, flag: 'green', title: 'Отчёт ' + c.auditor + ' найден на сайте аудитора; 2 средних замечания исправлены',
          detail: 'Проверено у источника, а не по PDF на сайте проекта.' });
        add({ tab: 'team', cat: 3, flag: 'green', title: 'Продукт: кредитование под залог BTC; выручка из комиссий видна ончейн',
          detail: 'Есть ответ на вопрос «кто и за что платит» — заёмщики платят проценты.' });
        c.holders = [
          ['Пул ликвидности (в локе)', 42, 'ok'],
          ['Вестинг команды (' + c.lockMonths + ' мес)', c.teamShare, 'ok'],
          ['Фонд-инвестор (разлок через 3 мес)', 9, 'warn'],
          ['Крупнейший частный кошелёк', 2.8, 'mut'],
          ['Остальные 18 340 адресов', 46.2 - c.teamShare, 'mut']
        ];
        c.front = rescale(gbm(r, 31, 0.004, 0.05), 1 + c.pump / 100);
        c.frontLabel = ['30 дней назад', 'сейчас'];
        c.truth = gbm(r, 31, 0.003, 0.05);
      }
      return c;
    }

    /* ---------- рисование графика (Canvas 2D) ---------- */
    function drawSeries(cv, s, upto, o) {
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 300, H = cv.clientHeight || 120;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const n = s.length, m = Math.min(n, Math.max(2, Math.ceil(upto)));
      const mx = Math.max.apply(null, s), mn = Math.min(0, Math.min.apply(null, s));
      const L = 44, R = 8, T = 10, B = 18;
      const X = i => L + (W - L - R) * i / (n - 1), Y = v => T + (H - T - B) * (1 - (v - mn) / ((mx - mn) || 1));
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      [0, .5, 1].forEach(f => { const y = T + (H - T - B) * f; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); });
      ctx.fillStyle = '#9aa3c7'; ctx.font = '10px ui-monospace,Menlo,monospace'; ctx.textAlign = 'right';
      ctx.fillText(o.fmt(mx), L - 4, T + 4); ctx.fillText(o.fmt((mx + mn) / 2), L - 4, T + (H - T - B) / 2 + 4); ctx.fillText(o.fmt(mn), L - 4, H - B + 3);
      ctx.textAlign = 'left'; ctx.fillText(o.x0 || '', L, H - 4); ctx.textAlign = 'right'; ctx.fillText(o.x1 || '', W - R, H - 4);
      if (o.rug >= 0 && m > o.rug + 1) {
        ctx.fillStyle = 'rgba(239,68,68,.14)'; ctx.fillRect(X(o.rug + 1) - 2, T, W - R - X(o.rug + 1) + 2, H - T - B);
        ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left'; ctx.fillText('ликвидность выведена', Math.min(X(o.rug + 1) + 4, W - 130), T + 12);
      }
      ctx.beginPath(); for (let i = 0; i < m; i++) { i ? ctx.lineTo(X(i), Y(s[i])) : ctx.moveTo(X(i), Y(s[i])); }
      ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineTo(X(m - 1), Y(mn)); ctx.lineTo(X(0), Y(mn)); ctx.closePath();
      const g = ctx.createLinearGradient(0, T, 0, H); g.addColorStop(0, o.color + '55'); g.addColorStop(1, o.color + '00');
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(X(m - 1), Y(s[m - 1]), 3.5, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.fill();
    }
    function animateSeries(cv, s, o, ms, onFrame, onDone) {
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / ms);
        const upto = 2 + (s.length - 2) * p;
        drawSeries(cv, s, upto, o);
        if (onFrame) onFrame(Math.floor(upto) - 1, p);
        if (p < 1) raf(step); else { box._expRaf = null; if (onDone) onDone(); }
      };
      raf(step);
    }

    /* ---------- состояние ---------- */
    const st = {
      round: 1, seed: 42, kase: null, stage: 'front', tab: 'overview', pinned: {},
      score: { cases: 0, saved: 0, caught: 0, rushed: 0, legitOk: 0 }
    };
    st.kase = genCase(st.seed, true);

    box.innerHTML = '<style>' +
      '.cx{font-family:inherit;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#1f2742);border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}' +
      '.cx *{box-sizing:border-box;min-width:0}' +
      '.cx-h{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between}' +
      '.cx-t{font-weight:700;font-size:17px}.cx-s{color:var(--mut,#9aa3c7);font-size:13px;line-height:1.4}' +
      '.cx-goal{margin:8px 0 12px;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.08);border-radius:6px;font-size:13px;line-height:1.45}' +
      '.cx-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}' +
      '.cx-card{border:1px solid var(--line,#1f2742);border-radius:10px;padding:10px;background:rgba(255,255,255,.02)}' +
      '.cx-card h4{margin:0 0 6px;font-size:12px;color:var(--mut,#9aa3c7);text-transform:uppercase;letter-spacing:.04em}' +
      '.cx-claim{font-size:13px;margin:4px 0;transition:color .5s,opacity .5s}.cx-claim.dead{color:var(--bad,#ef4444);text-decoration:line-through;opacity:.85}' +
      '.cx-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}.cx-chip{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid var(--line,#1f2742);color:var(--mut,#9aa3c7);transition:all .5s}.cx-chip.dead{border-color:var(--bad,#ef4444);color:var(--bad,#ef4444);text-decoration:line-through}' +
      '.cx-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
      '.cx-b{cursor:pointer;border:1px solid var(--line,#1f2742);background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);padding:8px 12px;border-radius:8px;font-size:13px;font-family:inherit;transition:border-color .2s}' +
      '.cx-b:hover{border-color:var(--acc2,#06b6d4)}.cx-b.pri{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:600}' +
      '.cx-b.bad{background:rgba(239,68,68,.15);border-color:var(--bad,#ef4444)}.cx-b.ok{background:rgba(34,197,94,.15);border-color:var(--ok,#22c55e)}' +
      '.cx-b.sm{padding:4px 8px;font-size:12px}' +
      'canvas.cx-cv{width:100%;height:130px;display:block;border-radius:6px;background:rgba(0,0,0,.25)}' +
      '.cx-tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;margin:10px 0 8px;-webkit-overflow-scrolling:touch}' +
      '.cx-tab{white-space:nowrap;cursor:pointer;padding:6px 10px;border-radius:6px;border:1px solid var(--line,#1f2742);font-size:12px;color:var(--mut,#9aa3c7);flex-shrink:0}' +
      '.cx-tab.on{color:var(--txt,#eef1ff);border-color:var(--acc2,#06b6d4);background:rgba(6,182,212,.12)}' +
      '.cx-ev{display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px dashed var(--line,#1f2742);border-radius:8px;margin:6px 0;font-size:13px;line-height:1.4}' +
      '.cx-ev.pin{border-style:solid}.cx-ev.pin.red{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.08)}.cx-ev.pin.green{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.08)}.cx-ev.pin.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.08)}' +
      '.cx-ev small{color:var(--mut,#9aa3c7);display:block;margin-top:3px}.cx-ev .cx-pin{margin-left:auto;flex-shrink:0}' +
      '.cx-mono{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-size:12px}' +
      'pre.cx-code{margin:6px 0;white-space:pre;overflow-x:auto;padding:8px;border-radius:6px;background:rgba(0,0,0,.35);line-height:1.55;font-size:11.5px;font-family:var(--mono,ui-monospace,Menlo,monospace)}' +
      '.cx-code .hl{background:rgba(239,68,68,.18);border-left:2px solid var(--bad,#ef4444);cursor:pointer;display:inline-block;width:100%}.cx-code .hl:hover{background:rgba(239,68,68,.3)}' +
      '.cx-code .ok{background:rgba(34,197,94,.14);border-left:2px solid var(--ok,#22c55e);display:inline-block;width:100%}' +
      '.cx-bar{height:10px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;margin:3px 0 8px}.cx-bar i{display:block;height:100%;width:0;transition:width .9s ease}' +
      '.cx-board{margin-top:10px;display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}' +
      '.cx-slot{border:1px solid var(--line,#1f2742);border-radius:8px;padding:6px 8px;font-size:12px;min-height:56px;line-height:1.35}.cx-slot.done{border-color:var(--acc2,#06b6d4)}' +
      '.cx-slot b{display:block;font-size:11px;color:var(--mut,#9aa3c7);margin-bottom:4px}' +
      '.cx-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle;flex-shrink:0}' +
      '.cx-res{margin-top:10px;padding:10px;border-radius:10px;border:1px solid var(--line,#1f2742)}.cx-res.win{border-color:var(--ok,#22c55e)}.cx-res.lose{border-color:var(--bad,#ef4444)}.cx-res.warn{border-color:var(--warn,#eab308)}' +
      '.cx-big{font-size:24px;font-weight:700;font-family:var(--mono,ui-monospace,monospace)}' +
      'table.cx-tb{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}.cx-tb td{padding:5px 6px;border-top:1px solid var(--line,#1f2742);vertical-align:top;line-height:1.35}' +
      '.cx-art{width:100%;min-height:120px;margin-top:8px;background:rgba(0,0,0,.3);color:var(--txt,#eef1ff);border:1px solid var(--line,#1f2742);border-radius:8px;padding:8px;font-family:var(--mono,ui-monospace,monospace);font-size:11px;resize:vertical}' +
      '.cx-score{font-size:12px;color:var(--mut,#9aa3c7)}' +
      '@keyframes cxflash{0%{background:rgba(239,68,68,.35)}100%{background:transparent}}.cx-flash{animation:cxflash 1.2s ease}' +
      '</style>' +
      '<div class="cx">' +
        '<div class="cx-h"><div class="cx-t">🕵️ Детектив: проект <span id="cx-name"></span></div><div class="cx-score" id="cx-score"></div></div>' +
        '<div class="cx-goal"><b>Цель:</b> витрина и блокчейн рассказывают две разные истории. Задание: не отдавай $1 000, пока не закрыл 5 вопросов чек-листа урока 0.19 — а потом посмотри, что случилось за 30 дней.</div>' +
        '<div id="cx-stage"></div>' +
      '</div>';

    const $ = sel => box.querySelector(sel);
    const stage = $('#cx-stage');

    function renderScore() {
      const s = st.score;
      $('#cx-name').textContent = st.kase.name + ' ($' + st.kase.ticker + ') · дело №' + st.round;
      $('#cx-score').textContent = 'Дел: ' + s.cases + ' · спасено от скама: ' + s.saved + ' · вложился в скам: ' + s.caught + ' · поспешных: ' + s.rushed;
    }

    /* ---------- этап 1: витрина ---------- */
    function renderFront() {
      const c = st.kase;
      stage.innerHTML =
        '<div class="cx-grid">' +
          '<div class="cx-card"><h4>🌐 Сайт проекта</h4><div class="cx-t">' + esc(c.name) + ' <span class="cx-s">$' + esc(c.ticker) + '</span></div>' +
            '<div class="cx-s" style="margin:4px 0 8px">«' + esc(c.tagline) + '»</div>' +
            c.claims.map((cl, i) => '<div class="cx-claim" data-claim="' + i + '">' + esc(cl.t) + '</div>').join('') + '</div>' +
          '<div class="cx-card"><h4>🐦 Лента</h4><div class="cx-s"><b style="color:var(--txt,#eef1ff)">' + esc(c.tweet.who) + '</b></div>' +
            '<div style="font-size:13px;margin:6px 0;line-height:1.45">' + esc(c.tweet.text) + '</div><div class="cx-s">' + esc(c.tweet.meta) + '</div></div>' +
          '<div class="cx-card"><h4>📈 График</h4><canvas class="cx-cv" id="cx-front"></canvas>' +
            '<div class="cx-s" style="margin-top:6px">' + (c.scam ? '+' + c.pump + '% за 3 дня' : '+' + c.pump + '% за 30 дней') + ' · цена ×<span id="cx-fx">1.00</span></div></div>' +
        '</div>' +
        '<div class="cx-btns">' +
          '<button class="cx-b bad" data-a="invest-now">💸 Инвестировать $1 000 сейчас</button>' +
          '<button class="cx-b pri" data-a="dig">🔍 Копать глубже: открыть обозреватель</button>' +
          '<button class="cx-b" data-a="pass-now">PASS — прохожу мимо</button>' +
        '</div>' +
        '<div class="cx-s" style="margin-top:8px">Витрина — это то, что проект хочет, чтобы ты увидел. Всё, что здесь написано, пока не проверено.</div>';

      const cv = $('#cx-front');
      const color = '#22c55e';
      later(() => animateSeries(cv, c.front, { color: color, fmt: v => '×' + v.toFixed(1), x0: c.frontLabel[0], x1: c.frontLabel[1], rug: -1 }, 1500,
        (i) => { const el = $('#cx-fx'); if (el) el.textContent = c.front[Math.max(0, Math.min(c.front.length - 1, i))].toFixed(2); }), 30);

      stage.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
        const a = b.getAttribute('data-a');
        if (a === 'dig') { st.stage = 'explorer'; st.tab = 'overview'; renderExplorer(); }
        else if (a === 'invest-now') renderResult('invest', 'front');
        else renderResult('pass', 'front');
      }));
    }

    /* ---------- этап 2: обозреватель ---------- */
    const closedCats = () => { const set = {}; Object.keys(st.pinned).forEach(id => { const e = st.kase.ev.find(x => x.id === id); if (e) set[e.cat] = 1; }); return Object.keys(set).length; };

    function evCard(e) {
      const pinned = !!st.pinned[e.id];
      return '<div class="cx-ev' + (pinned ? ' pin ' + e.flag : '') + '" data-ev="' + e.id + '">' +
        '<span>' + (pinned ? (e.flag === 'red' ? '🚩 ' : e.flag === 'warn' ? '⚠️ ' : '✅ ') : '') + '<b>' + esc(e.title) + '</b>' +
        (pinned ? '<small>' + esc(e.detail) + (e.claim != null ? ' <b style="color:var(--bad,#ef4444)">Противоречит сайту: «' + esc(st.kase.claims[e.claim].t) + '»</b>' : '') + '</small>' : '<small>Категория ' + e.cat + ': ' + CATS[e.cat] + '</small>') +
        '</span>' +
        '<button class="cx-b sm cx-pin" data-pin="' + e.id + '"' + (pinned ? ' disabled' : '') + '>' + (pinned ? 'в деле' : '📌 В дело') + '</button></div>';
    }

    function tabHTML() {
      const c = st.kase, t = st.tab;
      const list = c.ev.filter(e => e.tab === t).map(evCard).join('');
      let head = '';
      if (t === 'overview') {
        head = '<div class="cx-mono cx-s">Адрес: 0x' + (c.seed >>> 0).toString(16).padStart(8, '0') + 'a3f…91 · создан ' + c.age + ' дн. назад · держателей: ' + (c.scam ? 418 : 18345) + ' · транзакций: ' + (c.scam ? 8412 : 214800) + '</div>';
      } else if (t === 'contract') {
        head = c.scam
          ? (c.verified
            ? '<pre class="cx-code">' + esc('contract ' + c.name + ' is ERC20, Ownable {') + '\n' +
              esc('  mapping(address => bool) blacklist;') + '\n' + esc('  uint256 public maxSellPct = 100;') + '\n' +
              '<span class="hl" data-pin="' + c.evMint + '">' + esc('  function mint(address to, uint256 amt) external onlyOwner { _mint(to, amt); }   // ← нажми') + '</span>\n' +
              esc('  function setBlacklist(address a, bool v) external onlyOwner { blacklist[a] = v; }') + '\n' +
              '<span class="hl" data-pin="' + c.evHoney + '">' + esc('  function setMaxSellPct(uint256 p) external onlyOwner { maxSellPct = p; }   // 0 = продажа выключена') + '</span>\n' +
              esc('  function _transfer(...) internal override { require(!blacklist[from], "blocked"); ... }') + '\n}</pre>' +
              '<div class="cx-s">Подсвеченные строки — кликабельные улики. Спроси себя: что может сделать владелец одной транзакцией?</div>'
            : '<pre class="cx-code"><span class="hl" data-pin="' + c.evNoSrc + '">' + esc('Contract Source Code: NOT VERIFIED   // ← нажми') + '</span>\n' + esc('Bytecode: 0x608060405234801561001057600080fd5b50604051610c8f380380610c8f8339818101604052…') + '</pre>')
          : '<pre class="cx-code">' + esc('contract ' + c.name + ' is ERC20 {') + '\n' +
            esc('  constructor() ERC20("' + c.name + '", "' + c.ticker + '") { _mint(msg.sender, 100_000_000e18); }') + '\n' +
            '<span class="ok">' + esc('  // mint(): отсутствует   // setBlacklist(): отсутствует') + '</span>\n' +
            '<span class="ok">' + esc('  // OwnershipTransferred(owner → 0x000…000)  — владение отозвано 14 мес назад') + '</span>\n}</pre>';
      } else if (t === 'holders') {
        const col = k => k === 'bad' ? 'var(--bad,#ef4444)' : k === 'ok' ? 'var(--ok,#22c55e)' : k === 'warn' ? 'var(--warn,#eab308)' : 'var(--acc2,#06b6d4)';
        head = '<div id="cx-holders">' + c.holders.map(h =>
          '<div style="display:flex;justify-content:space-between;font-size:12px"><span>' + esc(h[0]) + '</span><span class="cx-mono">' + h[1].toFixed(1) + '%</span></div>' +
          '<div class="cx-bar"><i data-w="' + h[1] + '" style="background:' + col(h[2]) + '"></i></div>').join('') +
          '</div><div class="cx-s">Порог урока: команда &gt; 20–30% без лока — красный флаг.</div>';
      } else if (t === 'liq') {
        head = '<div class="cx-mono cx-s">Пул ' + esc(c.ticker) + '/USDT · LP-токены: ' + (c.scam ? (c.lpLockDays ? 'лок до +7 дн.' : 'у создателя 0x8f3…c21') : 'Unicrypt lock, до +' + c.lpLockMonths + ' мес') +
          ' · объём 24ч: заявлено $' + (c.scam ? c.volRep + ' млн' : '3,1 млн') + '</div>';
      } else {
        head = '<div class="cx-mono cx-s">Аудит: ' + (c.scam ? (c.auditKind === 'fake' ? 'PDF на сайте проекта' : 'не указан') : 'реестр ' + esc(c.auditor) + ' · запись найдена') + ' · GitHub: ' + (c.scam ? '2 коммита' : '1 840 коммитов, 23 контрибьютора') + '</div>';
      }
      return head + list;
    }

    function boardHTML() {
      const c = st.kase;
      return '<div class="cx-board">' + [1, 2, 3, 4, 5].map(cat => {
        const items = c.ev.filter(e => e.cat === cat && st.pinned[e.id]);
        return '<div class="cx-slot' + (items.length ? ' done' : '') + '"><b>' + cat + '. ' + CATS[cat] + '</b>' +
          (items.length ? items.map(e => '<div><span class="cx-dot" style="background:' + (e.flag === 'red' ? 'var(--bad,#ef4444)' : e.flag === 'warn' ? 'var(--warn,#eab308)' : 'var(--ok,#22c55e)') + '"></span>' + esc(e.title) + '</div>').join('') : '<span class="cx-s">нет улик</span>') +
          '</div>';
      }).join('') + '</div>';
    }

    function renderExplorer() {
      const c = st.kase;
      stage.innerHTML =
        '<div class="cx-card" style="margin-bottom:8px"><h4>Обещания сайта (проверяем каждое)</h4><div class="cx-chips">' +
          c.claims.map((cl, i) => '<span class="cx-chip" data-chip="' + i + '">' + esc(cl.t) + '</span>').join('') + '</div></div>' +
        '<div class="cx-card"><h4>🔎 Обозреватель блокчейна (упрощённый Etherscan)</h4>' +
          '<div class="cx-tabs">' + TABS.map(t => '<div class="cx-tab' + (t[0] === st.tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</div>').join('') + '</div>' +
          '<div id="cx-tab"></div></div>' +
        '<div class="cx-card" style="margin-top:8px"><h4>📋 Доска улик · закрыто <span id="cx-closed">0</span>/5 вопросов чек-листа</h4><div id="cx-board"></div></div>' +
        '<div class="cx-btns">' +
          '<button class="cx-b bad" data-a="invest">💸 Инвестировать $1 000</button>' +
          '<button class="cx-b ok" data-a="pass">🛑 PASS — не вкладываю</button>' +
          '<button class="cx-b" data-a="back">← К витрине</button>' +
        '</div>' +
        '<div class="cx-s" style="margin-top:8px">Правило урока: вердикт выносят, когда закрыты все 5 вопросов. Можно решить и раньше — но тогда это уже не проверка, а догадка.</div>';

      const paintChips = () => {
        Object.keys(st.pinned).forEach(id => { const e = c.ev.find(x => x.id === id); if (e && e.claim != null) { const ch = stage.querySelector('[data-chip="' + e.claim + '"]'); if (ch) ch.classList.add('dead'); } });
      };
      const paintTab = () => {
        $('#cx-tab').innerHTML = tabHTML();
        $('#cx-board').innerHTML = boardHTML();
        $('#cx-closed').textContent = closedCats();
        paintChips();
        stage.querySelectorAll('[data-pin]').forEach(el => el.addEventListener('click', () => pin(el.getAttribute('data-pin'))));
        later(() => stage.querySelectorAll('.cx-bar i').forEach(i => { i.style.width = i.getAttribute('data-w') + '%'; }), 40);
      };
      const pin = id => {
        if (st.pinned[id]) return;
        st.pinned[id] = 1;
        const e = c.ev.find(x => x.id === id);
        paintTab();
        const card = stage.querySelector('.cx-ev[data-ev="' + id + '"]'); if (card && e.flag === 'red') card.classList.add('cx-flash');
        if (e.claim != null) { const ch = stage.querySelector('[data-chip="' + e.claim + '"]'); if (ch) { ch.classList.add('cx-flash'); } }
      };
      stage.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
        st.tab = t.getAttribute('data-tab');
        stage.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === t));
        paintTab();
      }));
      stage.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
        const a = b.getAttribute('data-a');
        if (a === 'back') { st.stage = 'front'; renderFront(); }
        else renderResult(a, 'explorer');
      }));
      paintTab();
    }

    /* ---------- этап 3: развязка ---------- */
    function renderResult(decision, via) {
      const c = st.kase, s = st.score, closed = closedCats();
      const invested = decision === 'invest';
      const startCash = invested ? DEPOSIT * (1 - ENTRY_COST) : DEPOSIT;
      const finalVal = invested ? startCash * c.truth[30] : DEPOSIT;
      let cls, head, lesson;
      s.cases++;
      if (c.scam) {
        if (invested) {
          s.caught++; if (via === 'front') s.rushed++;
          cls = 'lose'; head = via === 'front' ? 'Ты отдал $1 000 витрине, не открыв обозреватель.' : 'Ты собрал улики — и всё равно вложился в скам.';
          lesson = 'Rug pull (вывод ликвидности) на день ' + (c.rugDay + 1) + ': продать стало некому и нечего. Все красные флаги были видны ДО входа: ' + c.ev.filter(e => e.flag === 'red').length + ' улик.';
        } else {
          s.saved++;
          if (via === 'front') { cls = 'warn'; head = 'PASS вслепую: депозит цел, но ты угадал, а не проверил.'; lesson = 'Правильный ответ по неправильной причине — в следующий раз витрина будет убедительнее. Метод — чек-лист, а не чутьё.'; }
          else { cls = 'win'; head = 'Ты распознал скам по уликам.'; lesson = 'Ровно так работает экспресс-проверка: 3 минуты в обозревателе против 30 дней сожалений.'; }
        }
      } else {
        if (invested) {
          if (via === 'front') { s.rushed++; cls = 'warn'; head = 'Повезло: проект честный. Но решение было лотереей.'; lesson = 'Урок П22: хороший исход плохого решения — самый опасный учитель. Ты не отличил бы этот проект от скама, если бы витрина была такой же.'; }
          else if (closed >= 4) { s.legitOk++; cls = 'win'; head = 'Проверил — и вложился в честный проект.'; lesson = 'Обрати внимание на жёлтые улики: разлок фонда и прокси-контракт — это календарь рисков, который ты теперь знаешь.'; }
          else { cls = 'warn'; head = 'Проект честный, но ты решил при ' + closed + '/5 закрытых вопросах.'; lesson = 'Итог хороший, процесс — нет. Не закрытый вопрос чек-листа — это дыра, в которую однажды провалятся деньги.'; }
        } else {
          cls = 'win'; head = 'PASS на честном проекте — цена осторожности, а не ошибка.';
          lesson = 'Пропустить хороший проект стоит упущенной прибыли. Вложиться в скам стоит всего депозита. Асимметрия на стороне «нет».';
        }
      }
      renderScore();

      const truthRows = [1, 2, 3, 4, 5].map(cat => {
        const items = c.ev.filter(e => e.cat === cat);
        const red = items.filter(e => e.flag === 'red'), warn = items.filter(e => e.flag === 'warn');
        const seen = items.some(e => st.pinned[e.id]);
        const what = red.length ? '🚩 ' + red.map(e => e.title).join('; ') : warn.length ? '⚠️ ' + warn.map(e => e.title).join('; ') : '✅ ' + (items[0] ? items[0].title : 'без замечаний');
        return '<tr><td><b>' + cat + '.</b> ' + CATS[cat] + '</td><td>' + esc(what) + '</td><td style="white-space:nowrap">' + (seen ? '✔ видел' : (via === 'front' ? '— не открывал' : '✖ не проверил')) + '</td></tr>';
      }).join('');

      const dossier =
        'ДОСЬЕ №' + st.round + ' · ' + c.name + ' ($' + c.ticker + ') · seed ' + c.seed + '\n' +
        'Витрина: ' + c.claims.map(x => x.t).join(' | ') + '\n' +
        'Улики (' + Object.keys(st.pinned).length + '): ' + (Object.keys(st.pinned).length ? '\n' + c.ev.filter(e => st.pinned[e.id]).map(e => '  ' + (e.flag === 'red' ? '[🚩]' : e.flag === 'warn' ? '[⚠]' : '[✅]') + ' ' + e.title).join('\n') : '— не собирал') + '\n' +
        'Закрыто вопросов чек-листа: ' + closed + '/5' + '\n' +
        'Решение: ' + (invested ? 'ИНВЕСТИРОВАТЬ' : 'PASS') + (via === 'front' ? ' (с витрины, без проверки)' : ' (после обозревателя)') + '\n' +
        'Истина: ' + (c.scam ? 'СКАМ — rug pull на день ' + (c.rugDay + 1) : 'честный проект, за 30 дней ×' + c.truth[30].toFixed(2)) + '\n' +
        'Итог: ' + fmtUSD(DEPOSIT) + ' → ' + fmtUSD(finalVal) + '\n' +
        'Урок: ' + lesson;

      stage.innerHTML =
        '<div class="cx-res ' + cls + '"><div class="cx-t">' + esc(head) + '</div>' +
          '<div class="cx-s" style="margin:4px 0 8px">Что было дальше: 30 дней после твоего решения' + (invested ? ' · вход с издержками ' + Math.round(ENTRY_COST * 100) + '% (' + fmtUSD(startCash) + ' в позиции)' : '') + '</div>' +
          '<canvas class="cx-cv" id="cx-truth" style="height:150px"></canvas>' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;flex-wrap:wrap;gap:6px"><span class="cx-s">День <span id="cx-day" class="cx-mono">0</span></span><span class="cx-big" id="cx-money">' + fmtUSD(invested ? startCash : DEPOSIT) + '</span></div>' +
          '<div style="font-size:13px;line-height:1.45;margin-top:6px">' + esc(lesson) + '</div>' +
        '</div>' +
        '<div class="cx-card" style="margin-top:8px"><h4>Что показывал блокчейн — и что из этого ты открыл</h4>' +
          '<table class="cx-tb"><tr><td class="cx-s">Вопрос чек-листа</td><td class="cx-s">Истина</td><td class="cx-s">Ты</td></tr>' + truthRows + '</table>' +
          (c.scam ? '<div class="cx-s" style="margin-top:8px">Обещание «гарантированно ×10» — само по себе маркер скама (урок 0.18): гарантий на рынке не существует.</div>' : '') +
        '</div>' +
        '<div class="cx-card" style="margin-top:8px"><h4>Артефакт: досье в журнал</h4><textarea class="cx-art" readonly>' + esc(dossier) + '</textarea></div>' +
        '<div class="cx-btns"><button class="cx-b pri" data-a="new">🎲 Новое дело</button><button class="cx-b" data-a="again">↺ Это же дело заново</button></div>';

      const cv = $('#cx-truth');
      const color = c.scam ? '#ef4444' : '#06b6d4';
      later(() => animateSeries(cv, c.truth, { color: color, fmt: v => '×' + v.toFixed(2), x0: 'день 0', x1: 'день 30', rug: c.rugDay }, 2600,
        (i) => {
          const d = Math.max(0, Math.min(30, i));
          const dEl = $('#cx-day'), mEl = $('#cx-money'); if (!dEl || !mEl) return;
          dEl.textContent = d;
          const v = invested ? startCash * c.truth[d] : DEPOSIT;
          mEl.textContent = fmtUSD(v);
          mEl.style.color = invested ? (v < DEPOSIT ? 'var(--bad,#ef4444)' : 'var(--ok,#22c55e)') : 'var(--txt,#eef1ff)';
          if (c.scam && invested && d === c.rugDay + 1) mEl.classList.add('cx-flash');
        }), 60);

      try { box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: { widget: 'widget_p0_l19', round: st.round, seed: c.seed, text: dossier, score: JSON.parse(JSON.stringify(s)) } })); } catch (e) { /* среда без CustomEvent — молча */ }

      stage.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
        if (b.getAttribute('data-a') === 'new') { st.round++; st.seed = (Date.now() ^ (st.round * 2654435761)) >>> 0; st.kase = genCase(st.seed); }
        else { st.kase = genCase(st.seed, c.scam); }
        st.pinned = {}; st.stage = 'front'; st.tab = 'overview';
        renderScore(); renderFront();
      }));
    }

    renderScore();
    renderFront();
  }

  ['widget_p0_l19', 'widget_p0_l19_dd', 'widget_p0_l19_steps'].forEach(function (k) { window.EXPERT_WIDGETS[k] = coinXDetective; });
})();
