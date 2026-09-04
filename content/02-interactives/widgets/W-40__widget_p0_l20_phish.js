/*
 * W-40 · widget_p0_l20_phish · 0.20 «Найди фишинг»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:      увидеть, что фишинг ловится не чутьём, а двумя вопросами: «какой домен на самом деле?» и «что у меня просят?».
 *   Задание:   разобрать 6 сообщений: перед решением можно навести «лупу» на ссылку/окно подписи; 4 из 6 — атаки, 2 — настоящие.
 *   Ага:       учебный кошелёк 1000 USDT тает после каждого доверия атаке; одна seed-фраза = минус всё сразу; ложная тревога на настоящее письмо стоит 0 — но лупа даёт точный ответ вместо паранойи.
 *   Дефолты:   счёт 1000 USDT; seed 42 (порядок писем); цена ошибок: домен-двойник 350, seed 1000, approve на USDT 640, SMS-ссылка 280.
 *   Артефакт:  «Мой чек-лист против фишинга» — 6 правил, слабые места отмечены ⚠; статистика: распознано атак / ложных тревог / использована лупа.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_p0_l20_phish'] = function(box){
  // 0. чистим прошлый запуск
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expResize){ window.removeEventListener('resize', box._expResize); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); return box._expRaf; };
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const START = 1000;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const CYR = {'\u0456':'кириллическая «і» вместо латинской «i»','\u0435':'кириллическая «е»','\u0433':'кириллическая «г»','\u043E':'кириллическая «о»','\u0430':'кириллическая «а»','\u0441':'кириллическая «с»','\u0440':'кириллическая «р»','\u0445':'кириллическая «х»'};

  // 6 ситуаций. Подозрительные символы заданы \u-кодами, чтобы не потерять их при копировании.
  const ITEMS = [
    { id:'mail_binance', kind:'link', icon:'✉️', chan:'Почта',
      from:'Binance Security <no-reply@binance-security.support>',
      title:'⚠ Подтвердите вывод 0,42 BTC',
      body:'Зафиксирован запрос на вывод с нового устройства (Windows, Варшава). Если это не вы — отмените в течение 30 минут, иначе средства уйдут:',
      linkText:'https://www.binance.com/ru/cancel-withdraw',
      href:'https://www.b\u0456nance.com.cancel-withdraw-verify.info/ru/login',
      official:'binance.com', asks:'логин, пароль и код 2FA — на чужой странице',
      scam:true, cost:350,
      costWhy:'Ты ввёл логин, пароль и код 2FA на поддельной странице. Через 4 минуты биржевой остаток был выведен.',
      why:'Текст ссылки и её адрес — разные вещи. В адресе кириллическая «і», а настоящий домен — cancel-withdraw-verify.info: слово binance.com стоит слева и ничего не значит. Плюс давление «30 минут».',
      rule:'Домен читаю справа налево и посимвольно; срочность — признак атаки.' },
    { id:'dm_support', kind:'link', icon:'💬', chan:'Telegram, личное сообщение',
      from:'Bybit Support Team ✔ (@bybit_help_desk)',
      title:'Ваш аккаунт заблокирован',
      body:'Система безопасности заморозила ваш аккаунт из-за подозрительной активности. Для восстановления доступа введите seed-фразу кошелька на официальном зеркале:',
      linkText:'https://www.bybit.com/support/unlock',
      href:'https://bybit-help.\u0433u/seed-restore',
      official:'bybit.com', asks:'seed-фразу — 12 слов',
      scam:true, cost:1000,
      costWhy:'Ты ввёл 12 слов. Через 90 секунд все монеты со всех адресов кошелька ушли на чужой адрес — seed открывает всё.',
      why:'Просьба ввести seed — атака со 100% вероятностью, кто бы ни просил и каким бы ни был домен. Поддержка пишет только внутри аккаунта и не просит доступы. В домене к тому же кириллическая «г».',
      rule:'Seed и приватный ключ не покидают бумагу ни при каких «проверках».' },
    { id:'mail_maint', kind:'link', icon:'✉️', chan:'Почта',
      from:'Bybit <announcements@bybit.com>',
      title:'Плановые технические работы 12 мая',
      body:'12 мая с 02:00 до 04:00 UTC торговля и выводы будут недоступны. Никаких действий с вашей стороны не требуется. Подробности:',
      linkText:'https://www.bybit.com/announcements',
      href:'https://www.bybit.com/announcements',
      official:'bybit.com', asks:'ничего',
      scam:false, cost:0, costWhy:'',
      why:'Настоящее письмо: домен совпадает посимвольно, ничего не просят ввести, нет срочности и угрозы. Пометив его как фишинг, ты не потерял денег — но пропустил бы, что бот 2 часа будет без биржи.',
      rule:'Не всё письмо — скам: проверка домена даёт точный ответ, паранойя — нет.' },
    { id:'sign_airdrop', kind:'sign', icon:'🪂', chan:'Сайт «аирдропа» → окно кошелька',
      from:'zk-airdrop-claim.xyz',
      title:'Вы получили 2 500 $ZK (≈ 640 USDT)',
      body:'Поздравляем! Ваш кошелёк в списке. Нажмите «Подписать», чтобы получить токены. Осталось 11 минут.',
      sig:{ func:'approve', spender:'0x7a3F…b21C (контракт без имени, не верифицирован)', token:'USDT', amount:'115792089237316195423570985008687907853269984665640564039457584007913129639935', note:'= без лимита (максимум uint256)' },
      scam:true, cost:640,
      costWhy:'Подпись approve разрешила чужому контракту тратить твой USDT без лимита. Через 20 секунд он его потратил — все 640 USDT с кошелька.',
      why:'Это не «получение» — это разрешение (approve) тратить твои токены. Настоящий дроп никогда не просит approve на USDT. Читай, ЧТО подписываешь, а не только где.',
      rule:'Перед подписью читаю функцию и сумму; approve на «unlimited» не подписываю.' },
    { id:'friend_addr', kind:'addr', icon:'👤', chan:'Telegram, друг',
      from:'Дима (в контактах 6 лет)',
      title:'Верну долг',
      body:'Привет! Скинь адрес USDT в сети TRC20, переведу 200 сегодня.',
      ask:{ wants:'адрес кошелька — он публичный', notWants:'seed, приватный ключ, подпись, код 2FA', network:'TRC20 — адрес начинается с «T…»; в другой сети USDT пропадёт' },
      scam:false, cost:0, costWhy:'',
      why:'Адрес — как номер карты: его можно давать. Здесь не просят ни seed, ни подпись. Единственное, что проверяется, — совпадение сети перевода.',
      rule:'Адрес и QR — публичны; сеть перевода сверяю до отправки.' },
    { id:'sms_okx', kind:'link', icon:'📱', chan:'SMS',
      from:'OKX',
      title:'Пароль устарел',
      body:'Ваш пароль истекает через 24 часа. Обновите его, чтобы не потерять доступ к средствам:',
      linkText:'https://okx.com/reset',
      href:'https://0kx.com/reset',
      official:'okx.com', asks:'старый и «новый» пароль',
      scam:true, cost:280,
      costWhy:'Ты ввёл старый и «новый» пароль на поддельной странице. Старый пароль ушёл атакующему — и вместе с ним доступ к биржевому остатку.',
      why:'В адресе ноль вместо буквы «o». Пароли «не истекают» — выдуманная срочность. На биржу заходи только из своей закладки, а не по ссылке из SMS.',
      rule:'На биржу — только из закладки; ссылки из SMS не открываю.' }
  ];

  const css = `
.ph{color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;font-family:inherit}
.ph *{box-sizing:border-box}
.ph-title{font-weight:700;font-size:16px}
.ph-sub{color:var(--mut,#9aa3c7);font-size:13px;margin-top:4px;line-height:1.4}
.ph-walletwrap{margin:12px 0 4px}
.ph-cv{display:block;max-width:100%}
.ph-wtext{font-family:var(--mono,ui-monospace,monospace);font-size:12px;color:var(--mut,#9aa3c7);margin-top:2px}
.ph-prog{display:flex;gap:4px;margin:8px 0 12px}
.ph-prog i{flex:1;height:4px;border-radius:2px;background:var(--line,rgba(255,255,255,.12))}
.ph-prog i.ok{background:var(--ok,#22c55e)}.ph-prog i.bad{background:var(--bad,#ef4444)}.ph-prog i.cur{background:var(--acc2,#06b6d4)}
.ph-card{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:10px;padding:12px;background:rgba(255,255,255,.02);animation:ph-in .3s ease}
@keyframes ph-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ph-meta{font-size:12px;color:var(--mut,#9aa3c7)}
.ph-from{font-size:13px;margin-top:6px;word-break:break-word}
.ph-subj{font-weight:700;margin-top:6px;font-size:15px}
.ph-body{margin-top:6px;font-size:14px;line-height:1.45}
.ph-mut{color:var(--mut,#9aa3c7)}
.ph-link{display:inline-block;margin-top:8px;color:var(--acc2,#06b6d4);text-decoration:underline;word-break:break-all;cursor:zoom-in;font-family:var(--mono,ui-monospace,monospace);font-size:13px}
.ph-sigbox,.ph-chat{margin-top:10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:10px;background:rgba(0,0,0,.25);font-size:13px;line-height:1.4}
.ph-sigbtn{display:inline-block;margin-top:8px;padding:6px 14px;border-radius:6px;background:#2563eb;color:#fff;font-weight:600;opacity:.85}
.ph-lupa{margin-top:10px;border:1px dashed var(--acc2,#06b6d4);border-radius:8px;padding:10px;font-size:13px;background:rgba(6,182,212,.06);line-height:1.4}
.ph-lupa[hidden]{display:none}
.ph-lh{font-weight:700;margin-bottom:6px}
.ph-lrow{display:grid;grid-template-columns:130px 1fr;gap:6px;margin-top:4px;word-break:break-word}
.ph-lrow>span:first-child{color:var(--mut,#9aa3c7)}
.ph-lrow code{font-family:var(--mono,ui-monospace,monospace);font-size:12px;background:rgba(0,0,0,.35);padding:1px 4px;border-radius:4px;word-break:break-all}
.ph-bad{color:var(--bad,#ef4444);background:rgba(239,68,68,.22);border-radius:3px;padding:0 2px;font-weight:700}
.ph-warn{color:var(--warn,#eab308);background:rgba(234,179,8,.2);border-radius:3px;padding:0 2px;font-weight:700}
.ph-okc{color:var(--ok,#22c55e);font-weight:700}.ph-badc{color:var(--bad,#ef4444);font-weight:700}
.ph-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ph button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.04);color:var(--txt,#eef1ff);padding:8px 12px;border-radius:8px}
.ph button:hover{border-color:var(--acc2,#06b6d4)}
.ph .ph-b-flag{border-color:rgba(239,68,68,.55)}.ph .ph-b-ok{border-color:rgba(34,197,94,.55)}
.ph-verdict{margin-top:12px;border-radius:8px;padding:10px 12px;font-size:14px;line-height:1.45;border-left:4px solid}
.ph-verdict.ok{border-color:var(--ok,#22c55e);background:rgba(34,197,94,.07)}.ph-verdict.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.08)}
.ph-vh{font-weight:700;margin-bottom:6px}
.ph-cost{color:var(--bad,#ef4444);font-weight:600;margin:6px 0}
.ph-fa{color:var(--warn,#eab308);margin:6px 0}
.ph-rule{margin-top:8px;color:var(--acc2,#06b6d4)}
.ph-verdict button{margin-top:10px}
.ph-sum h4{margin:0 0 8px;font-size:15px}
.ph-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.ph-kpi{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:8px}
.ph-kpi b{display:block;font-size:20px;font-family:var(--mono,ui-monospace,monospace)}
.ph-kpi span{font-size:12px;color:var(--mut,#9aa3c7)}
.ph-aha{margin-top:10px;padding:10px;border-radius:8px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.35);font-size:14px;line-height:1.45}
.ph-art textarea{width:100%;min-height:160px;margin-top:8px;background:rgba(0,0,0,.35);color:var(--txt,#eef1ff);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:8px;font:12px var(--mono,ui-monospace,monospace);resize:vertical}
.ph-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
@media(max-width:420px){.ph-lrow{grid-template-columns:1fr}}`;

  box.innerHTML = `<div class="ph"><style>${css}</style>
    <div class="ph-title">Почтовый ящик: 6 сообщений, 2 из них — настоящие</div>
    <div class="ph-sub">Цель: убедиться, что фишинг ловится не чутьём, а двумя вопросами — «какой домен на самом деле?» и «что у меня просят?». Наводи лупу на ссылку до решения.</div>
    <div class="ph-walletwrap"><canvas class="ph-cv"></canvas><div class="ph-wtext"></div></div>
    <div class="ph-prog"></div>
    <div class="ph-stage"></div>
  </div>`;
  const root  = box.querySelector('.ph');
  const cv    = box.querySelector('.ph-cv');
  const wtext = box.querySelector('.ph-wtext');
  const prog  = box.querySelector('.ph-prog');
  const stage = box.querySelector('.ph-stage');

  // --- состояние раунда
  let seed = 42, rnd, order, idx, damage, results, lupaOpened, sticky;
  let shownVal = START, animFrom = START, animTo = START, animT0 = 0, flash = null;

  const shuffle = a => { const r = a.slice(); for(let i=r.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [r[i],r[j]]=[r[j],r[i]]; } return r; };
  const hostOf = h => { const m = h.match(/^[a-z]+:\/\/([^\/?#]+)/i); return m ? m[1] : h; };
  const pathOf = h => { const m = h.match(/^[a-z]+:\/\/[^\/?#]+(.*)$/i); return m ? m[1] : ''; };
  const regDomain = host => { const p = host.split('.'); return p.length <= 2 ? host : p.slice(-2).join('.'); };
  function markHost(host){
    const issues = [];
    const html = Array.from(host).map(ch => {
      const code = ch.charCodeAt(0);
      if(code > 127){ issues.push(CYR[ch] || ('символ не из латиницы U+' + code.toString(16).toUpperCase())); return `<b class="ph-bad">${esc(ch)}</b>`; }
      if(/[0-9]/.test(ch)){ issues.push(`цифра «${ch}» внутри имени — «0» вместо «o»?`); return `<b class="ph-warn">${ch}</b>`; }
      return esc(ch);
    }).join('');
    return { html, issues };
  }

  // --- кошелёк на канвасе: 20 столбиков по 50 USDT
  function sizeCanvas(){
    const w = Math.max(280, Math.min(root.clientWidth - 28, 640));
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = 64 * dpr;
    cv.style.width = w + 'px'; cv.style.height = '64px';
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWallet(shownVal);
  }
  function drawWallet(val){
    const ctx = cv.getContext('2d');
    const w = parseFloat(cv.style.width) || 300, h = 64;
    ctx.clearRect(0, 0, w, h);
    const n = 20, per = START / n, gap = 3, cw = Math.min(24, (w - 16 - gap*(n-1)) / n), bh = 40, y0 = 8;
    for(let i=0;i<n;i++){
      const x = 8 + i*(cw+gap);
      const fill = Math.max(0, Math.min(1, (val - i*per) / per));
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, y0, cw, bh);
      if(fill > 0){
        const g = ctx.createLinearGradient(0, y0, 0, y0+bh); g.addColorStop(0, '#facc15'); g.addColorStop(1, '#ca8a04');
        ctx.fillStyle = g; ctx.fillRect(x, y0 + bh*(1-fill), cw, bh*fill);
      }
      if(fill < 1){ ctx.strokeStyle = 'rgba(239,68,68,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x+.5, y0+.5, cw-1, bh*(1-fill)-1 > 0 ? bh*(1-fill)-1 : 0); }
    }
    ctx.fillStyle = '#9aa3c7'; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText('1 столбик = 50 USDT', 8, h - 4);
    if(flash){
      const a = 1 - Math.min(1, (performance.now() - flash.t0) / 900);
      ctx.globalAlpha = a; ctx.fillStyle = '#ef4444'; ctx.font = '700 18px ui-monospace, monospace'; ctx.textAlign = 'right';
      ctx.fillText(flash.txt, w - 8, 26 - (1-a)*14); ctx.globalAlpha = 1;
    }
    wtext.textContent = `${Math.round(val)} / ${START} USDT учебного счёта · потеряно ${START - Math.round(val)}`;
  }
  function animateWallet(target, cost){
    animFrom = shownVal; animTo = target; animT0 = performance.now();
    flash = cost ? { txt: '−' + cost + ' USDT', t0: animT0 } : null;
    const step = () => {
      if(!box.isConnected) return;
      const t = Math.min(1, (performance.now() - animT0) / 700), e = 1 - Math.pow(1 - t, 3);
      shownVal = animFrom + (animTo - animFrom) * e; drawWallet(shownVal);
      if(t < 1 || (flash && performance.now() - flash.t0 < 900)) raf(step); else { flash = null; drawWallet(shownVal); }
    };
    raf(step);
  }

  // --- рендер
  function renderProg(){
    prog.innerHTML = order.map((it, i) => {
      const r = results[i]; const cls = r ? (r.correct ? 'ok' : 'bad') : (i === idx ? 'cur' : '');
      return `<i class="${cls}" title="${esc(it.chan)}"></i>`;
    }).join('');
  }
  function lupaHtml(it){
    if(it.kind === 'link'){
      const host = hostOf(it.href), path = pathOf(it.href), proto = it.href.split('://')[0];
      const m = markHost(host), rd = regDomain(host), match = rd === it.official;
      return `<div class="ph-lh">🔍 Куда ведёт ссылка на самом деле</div>
        <div class="ph-lrow"><span>Показано в тексте:</span><code>${esc(it.linkText)}</code></div>
        <div class="ph-lrow"><span>Настоящий адрес:</span><code>${esc(proto)}://${m.html}${esc(path)}</code></div>
        <div class="ph-lrow"><span>Главный домен:</span><span><code>${esc(rd)}</code> ${match ? `<span class="ph-okc">= ${esc(it.official)} ✓</span>` : `<span class="ph-badc">≠ ${esc(it.official)} ✗</span>`}</span></div>
        ${m.issues.length ? `<div class="ph-lrow"><span>Подозрительные символы:</span><span>${m.issues.map(esc).join('; ')}</span></div>` : ''}
        <div class="ph-lrow"><span>Что просят:</span><span>${esc(it.asks)}</span></div>`;
    }
    if(it.kind === 'sign'){
      return `<div class="ph-lh">🔍 Что именно ты подписываешь</div>
        <div class="ph-lrow"><span>Функция:</span><code>${esc(it.sig.func)}</code> — это <b>разрешение тратить</b>, а не получение</div>
        <div class="ph-lrow"><span>Кому разрешаешь:</span><span>${esc(it.sig.spender)}</span></div>
        <div class="ph-lrow"><span>Токен:</span><span>${esc(it.sig.token)} — твой, не их</span></div>
        <div class="ph-lrow"><span>Сумма:</span><code>${esc(it.sig.amount)}</code></div>
        <div class="ph-lrow"><span></span><span class="ph-badc">${esc(it.sig.note)}</span></div>`;
    }
    return `<div class="ph-lh">🔍 Что у тебя просят</div>
      <div class="ph-lrow"><span>Просят:</span><span class="ph-okc">${esc(it.ask.wants)}</span></div>
      <div class="ph-lrow"><span>Не просят:</span><span>${esc(it.ask.notWants)}</span></div>
      <div class="ph-lrow"><span>Проверить:</span><span>${esc(it.ask.network)}</span></div>`;
  }
  function renderItem(){
    const it = order[idx]; lupaOpened = false; sticky = false; renderProg();
    const media = it.kind === 'link'
      ? `<a class="ph-link" href="#" data-act="linkclick">${esc(it.linkText)}</a>`
      : it.kind === 'sign'
        ? `<div class="ph-sigbox">🔏 Запрос подписи · кошелёк<br><span class="ph-mut">Сайт ${esc(it.from)} просит подписать транзакцию</span><br><span class="ph-sigbtn">Подписать</span></div>`
        : `<div class="ph-chat">💬 ${esc(it.body)}</div>`;
    const flag  = it.kind === 'link' ? 'Фишинг — не открываю, сообщаю' : it.kind === 'sign' ? 'Отклонить подпись' : 'Не отвечаю — подозрительно';
    const trust = it.kind === 'link' ? 'Настоящее — перехожу по ссылке' : it.kind === 'sign' ? 'Подписать' : 'Отправляю адрес';
    stage.innerHTML = `<div class="ph-card">
      <div class="ph-meta">${it.icon} ${esc(it.chan)} · сообщение ${idx+1} из ${order.length}</div>
      <div class="ph-from"><span class="ph-mut">От:</span> ${esc(it.from)}</div>
      <div class="ph-subj">${esc(it.title)}</div>
      ${it.kind === 'addr' ? '' : `<div class="ph-body">${esc(it.body)}</div>`}
      ${media}
      <div class="ph-lupa" hidden>${lupaHtml(it)}</div>
      <div class="ph-actions">
        <button data-act="lupa">🔍 Лупа: что здесь на самом деле</button>
        <button data-act="scam" class="ph-b-flag">🚩 ${flag}</button>
        <button data-act="trust" class="ph-b-ok">✅ ${trust}</button>
      </div>
    </div>`;
    const link = stage.querySelector('.ph-link');
    if(link){
      link.addEventListener('mouseenter', () => showLupa(true));
      link.addEventListener('mouseleave', () => { if(!sticky) showLupa(false); });
    }
  }
  function showLupa(on){ const l = stage.querySelector('.ph-lupa'); if(!l) return; l.hidden = !on; if(on) lupaOpened = true; }
  function decide(choice){
    const it = order[idx];
    const correct = (choice === 'scam') === it.scam;
    let cost = 0;
    if(it.scam && choice === 'trust'){ cost = Math.min(it.cost, START - damage); damage += cost; }
    results.push({ it, correct, cost, falseAlarm: !it.scam && choice === 'scam', lupa: lupaOpened });
    animateWallet(START - damage, cost);
    renderProg();
    const acts = stage.querySelector('.ph-actions'); showLupa(true);
    acts.outerHTML = `<div class="ph-verdict ${correct ? 'ok' : 'bad'}">
      <div class="ph-vh">${correct ? '✓ Верно' : '✗ Ошибка'} — ${it.scam ? 'это атака' : 'это настоящее сообщение'}</div>
      ${cost ? `<div class="ph-cost">−${cost} USDT. ${esc(it.costWhy)}</div>` : ''}
      ${(!it.scam && choice === 'scam') ? `<div class="ph-fa">Ложная тревога: денег не потерял — но и точного ответа не было; лупа дала бы его за 5 секунд.</div>` : ''}
      <div>${esc(it.why)}</div>
      <div class="ph-rule">Правило: ${esc(it.rule)}</div>
      <button data-act="next">${idx < order.length - 1 ? 'Следующее сообщение →' : 'Итог раунда →'}</button>
    </div>`;
  }
  function renderSummary(){
    idx = order.length; renderProg();
    const scams = results.filter(r => r.it.scam), gen = results.filter(r => !r.it.scam);
    const recognized = scams.filter(r => r.correct).length, falseAlarms = gen.filter(r => r.falseAlarm).length;
    const lupaUsed = results.filter(r => r.lupa).length, lost = damage, kept = START - damage;
    const worst = results.filter(r => r.cost > 0).sort((a,b) => b.cost - a.cost)[0];
    let aha = '';
    if(lost === 0) aha = `Ты сохранил все ${START} USDT. Обрати внимание, чем: не «чутьём», а чтением домена и вопросом «что у меня просят». `;
    else aha = `Сохранено ${kept} из ${START} USDT. Самая дорогая ошибка — «${esc(worst.it.title)}»: −${worst.cost}. `;
    if(results.some(r => r.it.id === 'dm_support' && r.cost > 0)) aha += `Seed стоил всё сразу — после него остальные ошибки уже не имели значения. Именно поэтому в уроке сказано: это единственный урок, пропуск которого стоит ВСЁ. `;
    if(falseAlarms > 0) aha += `${falseAlarms === 1 ? 'Одно настоящее сообщение' : 'Оба настоящих сообщения'} ты принял за атаку: паранойя дешевле доверчивости, но лупа даёт точный ответ вместо угадывания. `;
    aha += `Лупа использована в ${lupaUsed} из ${results.length} случаев — в жизни она называется «навести курсор на ссылку и прочитать домен».`;
    const lines = ITEMS.map(it => { const r = results.find(x => x.it.id === it.id); return `${r && !r.correct ? '⚠' : '☐'} ${it.rule}`; });
    const art = `Мой чек-лист против фишинга (урок 0.20)\n${lines.join('\n')}\n\nРаунд (seed ${seed}): атак распознано ${recognized}/${scams.length}, ложных тревог ${falseAlarms}/${gen.length}, лупа ${lupaUsed}/${results.length}, потеряно ${lost} из ${START} USDT.\n⚠ — моя слабая точка: перечитать перед первой реальной операцией.`;
    stage.innerHTML = `<div class="ph-card ph-sum">
      <h4>Итог раунда</h4>
      <div class="ph-grid">
        <div class="ph-kpi"><b>${kept}</b><span>USDT сохранено из ${START}</span></div>
        <div class="ph-kpi"><b>${recognized}/${scams.length}</b><span>атак распознано</span></div>
        <div class="ph-kpi"><b>${falseAlarms}/${gen.length}</b><span>ложных тревог</span></div>
        <div class="ph-kpi"><b>${lupaUsed}/${results.length}</b><span>раз использована лупа</span></div>
      </div>
      <div class="ph-aha">${aha}</div>
      <div class="ph-art"><b>Артефакт:</b> чек-лист с отметками слабых мест<textarea readonly>${esc(art)}</textarea></div>
      <div class="ph-row"><button data-act="copy">Скопировать чек-лист</button><button data-act="again">Новый раунд (другой порядок)</button></div>
    </div>`;
  }

  stage.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if(!b) return;
    const act = b.dataset.act;
    if(act === 'linkclick'){ e.preventDefault(); sticky = !sticky; showLupa(sticky); return; }
    if(act === 'lupa'){ sticky = !sticky; showLupa(sticky); return; }
    if(act === 'scam' || act === 'trust'){ decide(act); return; }
    if(act === 'next'){ idx++; if(idx < order.length) renderItem(); else renderSummary(); return; }
    if(act === 'again'){ seed = (Date.now() % 1e9) | 0; reset(); return; }
    if(act === 'copy'){
      const ta = stage.querySelector('textarea'); const txt = ta.value;
      const done = () => { b.textContent = 'Скопировано ✓'; later(() => { b.textContent = 'Скопировать чек-лист'; }, 1500); };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { ta.select(); done(); });
      else { ta.select(); done(); }
    }
  });

  function reset(){
    rnd = mulberry32(seed); order = shuffle(ITEMS); idx = 0; damage = 0; results = [];
    shownVal = START; flash = null; drawWallet(START); renderItem();
  }
  box._expResize = () => { if(box.isConnected) sizeCanvas(); };
  window.addEventListener('resize', box._expResize);
  sizeCanvas(); reset();
};
