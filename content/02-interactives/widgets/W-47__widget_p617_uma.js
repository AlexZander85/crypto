/*
 * W-47 · widget_p617_uma · СНЯТ правкой 1 ТЗ-2, но доставлен; соответствует спеке fable5 «Цена против опросов» → судьба решится при сборке Б10
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:     почувствовать, что резолюция идёт по букве правил, а толпа торгует «по духу» — и платит за разницу.
 *   Задание:  пройти таймлайн спора: купить (или нет) YES по $0.90 после анонса в 23:50, затем как пропозер
 *   Ага:      цена $0.90 обрывается в $0.00 (или взлетает в $1.00) при ИДЕНТИЧНЫХ событиях — исход решила одна фраза правил.
 *   Дефолты:  формулировка A («выпущен и доступен»); 100 шт.; бонд пропозера $750; окно спора 2 ч; голосование 48 ч.
 *   Артефакт: box.dataset.artifact = {variant, letter, buy, propose, proposeCorrect, pnl, crowdPnl}; событие 'expert:artifact'.
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};

window.EXPERT_WIDGETS['widget_p617_uma'] = function(box){
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  if(box._expRO){ box._expRO.disconnect(); }
  box._expTimers = []; box._expRaf = null; box._expRO = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const raf = fn => { box._expRaf = requestAnimationFrame(fn); };
  const cs = getComputedStyle(box), tok = (n,d)=>(cs.getPropertyValue(n)||'').trim()||d;
  const COL = { txt:tok('--txt','#eef1ff'), mut:tok('--mut','#9aa3c7'), line:tok('--line','#232a4a'),
                acc:tok('--acc2','#06b6d4'), ok:tok('--ok','#22c55e'), bad:tok('--bad','#ef4444'), warn:tok('--warn','#eab308') };
  const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

  const V = {
    A:{ name:'Формулировка A — «выпущен и доступен»', letter:'NO',
        text:'Рынок разрешается «Да», если продукт публично выпущен и доступен пользователям до 1 февраля 2026, 00:00 UTC. <mark>Анонсы, пресс-релизы и предзаказы сами по себе выпуском не считаются.</mark> Источник резолюции: официальная страница загрузки.',
        key:'«анонсы сами по себе выпуском не считаются»' },
    B:{ name:'Формулировка B — «официально объявит»', letter:'YES',
        text:'Рынок разрешается «Да», если компания <mark>официально объявит</mark> о выпуске продукта до 1 февраля 2026, 00:00 UTC. Источник резолюции: официальные каналы компании.',
        key:'«официально объявит»' }
  };
  const N = 9;
  const S = { v:'A', i:0, anim:1, buy:null, prop:null, done:{} };

  box.innerHTML = `
<style>
.cw47{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--txt,#eef1ff);background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#232a4a);border-radius:12px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden}
.cw47 h3{margin:0 0 4px;font-size:16px}
.cw47 .goal{color:var(--mut,#9aa3c7);font-size:13px;margin:0 0 10px}
.cw47 .goal b{color:var(--txt,#eef1ff)}
.cw47 .rules{border:1px solid var(--line,#232a4a);border-left:3px solid var(--warn,#eab308);border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}
.cw47 .rules p{margin:4px 0 0;color:var(--mut,#9aa3c7)}
.cw47 mark{background:rgba(234,179,8,.22);color:inherit;padding:0 3px;border-radius:3px}
.cw47 canvas{width:100%;display:block;border-radius:8px;background:#070a18;border:1px solid var(--line,#232a4a)}
.cw47 .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.cw47 button{background:transparent;border:1px solid var(--acc2,#06b6d4);color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px}
.cw47 button.pri{background:var(--acc2,#06b6d4);color:#031018;font-weight:600}
.cw47 button:disabled{opacity:.4;cursor:default}
.cw47 .mono{font-family:${MONO};font-size:12px;color:var(--mut,#9aa3c7)}
.cw47 .stp{padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.03);font-size:13px;min-height:58px}
.cw47 .stp .date{display:block;font-family:${MONO};font-size:11px;color:var(--acc2,#06b6d4)}
.cw47 .tally{display:grid;grid-template-columns:44px 1fr 44px;gap:4px 8px;align-items:center;margin-top:8px;font-family:${MONO};font-size:12px}
.cw47 .tally .tr{height:12px;background:rgba(255,255,255,.05);border-radius:4px}
.cw47 .tally .bar{height:12px;border-radius:4px;width:0;transition:width .9s ease}
.cw47 table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.cw47 td,.cw47 th{padding:5px 6px;border-bottom:1px solid var(--line,#232a4a);text-align:left;vertical-align:top}
.cw47 th{color:var(--mut,#9aa3c7);font-weight:500;font-size:12px}
.cw47 .aha{margin-top:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--warn,#eab308);font-size:13px}
.cw47 .pick{color:var(--mut,#9aa3c7);font-size:12px}
</style>
<div class="cw47">
  <h3>UMA-резолюция: буква правил против духа толпы</h3>
  <p class="goal"><b>Цель:</b> увидеть, что резолюция идёт по тексту рынка, а толпа торгует ожиданием — и платит за разницу.<br>
  <b>Задание:</b> пройди спор шаг за шагом: реши, покупать ли YES по $0.90 в 23:50, затем как пропозер резолвь по букве. Потом прогони те же события с другой формулировкой.</p>
  <div class="rules" id="rules"></div>
  <canvas id="cv"></canvas>
  <div class="stp" id="stp"></div>
  <div class="row" id="q"></div>
  <div class="row"><button id="next" class="pri">Далее →</button><button id="restart">Сначала</button><span id="prog" class="mono"></span></div>
  <div id="fin"></div>
</div>`;

  const $ = s => box.querySelector(s);
  const cv = $('#cv'); const H = 250; let W = 320, g = null;
  function fit(){ W = Math.max(300, ($('.cw47').clientWidth||330)-30); const dpr = window.devicePixelRatio||1;
    cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); draw(); }
  if(window.ResizeObserver){ box._expRO = new ResizeObserver(()=>fit()); box._expRO.observe(box); }

  /* события таймлайна — одни и те же для обеих формулировок */
  function steps(){
    const letter = V[S.v].letter, prop = S.prop;
    const dispute = prop===null ? null : (prop==='NO' || prop!==letter);
    return [
      { date:'1 декабря', title:'Рынок открыт', text:'Правила опубликованы — они в жёлтой карточке. Толпа читает заголовок рынка, а не текст.', price:0.35 },
      { date:'20 января', title:'Утечка: «запуск на днях»', text:'Блогеры и инсайдеры. Цена «Да» ползёт вверх на слухах.', price:0.55 },
      { date:'31 января, 23:50 UTC', title:'Анонс за 10 минут до дедлайна', text:'Твит компании: «Продукт запущен! 🚀». Страница загрузки при этом показывает «Скоро».', price:0.90, ask:'buy' },
      { date:'1 февраля, 00:00 UTC', title:'Дедлайн рынка', text:'Скачать нельзя, купить нельзя. Есть только твит. Толпа держит «Да» около $0.90.', price:0.88 },
      { date:'3 февраля', title:'Реальный релиз', text:'Продукт доступен. Толпа: «Ну вот же, всё сбылось» — и докупает.', price:0.92 },
      { date:'3 февраля, вечер', title:'Предложение резолюции (UMA)', text:'Пропозер вносит бонд $750 и заявляет исход. Сегодня пропозер — ты. Резолвь строго по тексту правил, а не по ощущению.', price:0.92, ask:'propose' },
      { date:'+2 часа', title:'Окно оспаривания', price: dispute ? 0.55 : 0.97,
        text: dispute===null ? '' : dispute
          ? (prop==='NO' ? 'Держатели «Да» оспаривают: «Объявили же!» Диспутер вносит свой бонд — спор уходит на голосование DVM.'
                         : 'Участник, прочитавший правила, оспаривает: «Релиза до дедлайна не было». Спор уходит на голосование DVM.')
          : 'Никто не оспорил: предложение совпало и с буквой, и с ожиданием толпы. Через 2 часа резолюция принята.' },
      { date:'+48 часов', title:'Голосование держателей UMA', price: letter==='NO'?0.15:0.99, tally: !!dispute,
        text: dispute ? 'Голосуют по тексту правил, а не по «здравому смыслу». Проигравшая сторона теряет бонд.' : 'Голосование не потребовалось.' },
      { date:'Финал', title:'Расчёт: $1 или $0', text:'', price: letter==='NO'?0.00:1.00 }
    ];
  }
  const userPnl = letter => { const yp = letter==='YES'?100:0; if(S.buy==='yes') return yp-90; if(S.buy==='no') return (100-yp)-10; return 0; };

  function tallyHtml(){
    const l = V[S.v].letter, yes = l==='YES'?93:16, no = 100-yes;
    return `<div class="tally"><span>ДА</span><div class="tr"><div class="bar" data-w="${yes}" style="background:${COL.ok}"></div></div><span>${yes} %</span>
            <span>НЕТ</span><div class="tr"><div class="bar" data-w="${no}" style="background:${COL.bad}"></div></div><span>${no} %</span></div>`;
  }

  function render(){
    const st = steps(), s = st[S.i];
    $('#rules').innerHTML = `<b>${V[S.v].name}</b><p>${V[S.v].text}</p>`;
    $('#stp').innerHTML = `<span class="date">${s.date}</span><b>${s.title}</b><div>${s.text}</div>` + (s.tally ? tallyHtml() : '');
    if(s.tally) later(()=>box.querySelectorAll('.cw47 .tally .bar').forEach(b=>{ b.style.width=b.dataset.w+'%'; }), 40);
    const q = $('#q'); q.innerHTML = '';
    if(s.ask==='buy'){
      if(S.buy===null){ q.innerHTML = `<span class="pick">Твоя цена: YES торгуется по $0.90.</span>
        <button data-b="yes">Купить 100 YES по $0.90 ($90)</button><button data-b="none">Не покупать</button><button data-b="no">Купить 100 NO по $0.10 ($10)</button>`;
        q.querySelectorAll('[data-b]').forEach(b=>b.addEventListener('click', ()=>{ S.buy=b.dataset.b; render(); }));
      } else q.innerHTML = `<span class="pick">Твой выбор: ${S.buy==='yes'?'100 YES за $90':S.buy==='no'?'100 NO за $10':'остаться в стороне'}.</span>`;
    }
    if(s.ask==='propose'){
      if(S.prop===null){ q.innerHTML = `<span class="pick">Перечитай жёлтую карточку и предложи исход:</span>
        <button data-p="YES">Предложить «ДА»</button><button data-p="NO">Предложить «НЕТ»</button>`;
        q.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click', ()=>{ S.prop=b.dataset.p; render(); }));
      } else q.innerHTML = `<span class="pick">Ты предложил: «${S.prop==='YES'?'ДА':'НЕТ'}». Бонд $750 внесён.</span>`;
    }
    const waiting = (s.ask==='buy' && S.buy===null) || (s.ask==='propose' && S.prop===null);
    $('#next').disabled = waiting || S.i>=N-1;
    $('#prog').textContent = `шаг ${S.i+1} / ${N}`;
    $('#fin').innerHTML = S.i===N-1 ? finalHtml() : '';
    if(S.i===N-1){ const o = $('#other'); if(o) o.addEventListener('click', ()=>switchVariant(S.v==='A'?'B':'A')); }
    draw();
  }

  function finalHtml(){
    const letter = V[S.v].letter, yp = letter==='YES'?100:0;
    const pnl = userPnl(letter), crowd = yp-90, propOk = S.prop===letter;
    S.done[S.v] = { letter, pnl, crowd, propOk, buy:S.buy, prop:S.prop };
    const a = { widget:'widget_p617_uma', variant:S.v, letter, buy:S.buy, propose:S.prop, proposeCorrect:propOk, pnl, crowdPnl:crowd };
    box.dataset.artifact = JSON.stringify(a); box.dispatchEvent(new CustomEvent('expert:artifact',{bubbles:true,detail:a}));
    const money = v => `<span style="color:${v>0?COL.ok:v<0?COL.bad:COL.mut}">${v>=0?'+':'−'}$${Math.abs(v)}</span>`;
    let h = `<table><tr><th>Кто</th><th>Позиция</th><th>Итог</th></tr>
      <tr><td>Ты как трейдер</td><td>${S.buy==='yes'?'100 YES по $0.90':S.buy==='no'?'100 NO по $0.10':'вне рынка'}</td><td>${money(pnl)}</td></tr>
      <tr><td>Толпа «по духу»</td><td>100 YES по $0.90 после анонса</td><td>${money(crowd)}</td></tr>
      <tr><td>Ты как пропозер</td><td>предложил «${S.prop==='YES'?'ДА':'НЕТ'}», резолюция «${letter==='YES'?'ДА':'НЕТ'}»</td>
          <td style="color:${propOk?COL.ok:COL.bad}">${propOk?'бонд $750 возвращён + награда':'бонд $750 потерян'}</td></tr></table>
      <div class="aha">Одни и те же события: твит в 23:50, релиз 3 февраля. Исход решила фраза ${V[S.v].key}. Позиция, купленная по $0.90 «потому что очевидно», получила <b>$${yp}</b> за штуку.</div>
      <div class="row"><button id="other" class="pri">Тот же таймлайн, формулировка ${S.v==='A'?'B':'A'} →</button></div>`;
    if(S.done.A && S.done.B){
      h += `<table><tr><th></th><th>A: «выпущен и доступен»</th><th>B: «официально объявит»</th></tr>
        <tr><td>Резолюция</td><td>${S.done.A.letter}</td><td>${S.done.B.letter}</td></tr>
        <tr><td>YES по $0.90 «по духу»</td><td>${money(S.done.A.crowd)}</td><td>${money(S.done.B.crowd)}</td></tr>
        <tr><td>Ты как пропозер</td><td>${S.done.A.propOk?'✓ по букве':'✗ по духу'}</td><td>${S.done.B.propOk?'✓ по букве':'✗ по духу'}</td></tr></table>
        <div class="aha">Четыре проверки до любой ставки: (1) что именно считается наступлением исхода — глагол в правилах; (2) источник резолюции; (3) время дедлайна и часовой пояс UTC; (4) кто и как может оспорить. Цена на экране ничего из этого не знает.</div>`;
    }
    return h;
  }

  function switchVariant(v){ S.v=v; S.i=0; S.anim=1; S.buy=null; S.prop=null; render(); }

  /* анимация перехода к следующему шагу */
  function advance(){
    if(S.i>=N-1) return; S.i++; S.anim=0; const t0 = performance.now();
    const loop = now => { if(!box.isConnected) return; S.anim = Math.min(1,(now-t0)/550); draw(); if(S.anim<1) raf(loop); };
    raf(loop); render();
  }
  $('#next').addEventListener('click', advance);
  $('#restart').addEventListener('click', ()=>switchVariant(S.v));

  function draw(){
    if(!g) return; g.clearRect(0,0,W,H);
    const st = steps(); const x = i => 34 + i*(W-48)/(N-1); const y = p => 150 - p*134;
    /* сетка цены */
    g.font='10px '+MONO; g.textAlign='right';
    [0,0.5,1].forEach(v=>{ g.strokeStyle=COL.line; g.setLineDash([2,3]); g.beginPath(); g.moveTo(34,y(v)); g.lineTo(W-10,y(v)); g.stroke(); g.setLineDash([]);
      g.fillStyle=COL.mut; g.fillText(v===0?'$0':v===1?'$1':'$0.5', 30, y(v)+4); });
    /* дедлайн */
    g.strokeStyle=COL.warn; g.setLineDash([4,3]); g.beginPath(); g.moveTo(x(3),12); g.lineTo(x(3),162); g.stroke(); g.setLineDash([]);
    g.fillStyle=COL.warn; g.font='10px system-ui,sans-serif'; g.textAlign='center'; g.fillText('дедлайн 00:00 UTC', x(3), 10);
    /* линия цены YES */
    g.strokeStyle=COL.acc; g.lineWidth=2; g.beginPath();
    let lastX=x(0), lastY=y(st[0].price);
    for(let k=0;k<=S.i;k++){
      let px=x(k), py=y(st[k].price);
      if(k===S.i && S.anim<1 && k>0){ px = x(k-1)+(x(k)-x(k-1))*S.anim; py = y(st[k-1].price)+(y(st[k].price)-y(st[k-1].price))*S.anim; }
      if(k===0) g.moveTo(px,py); else g.lineTo(px,py); lastX=px; lastY=py;
    }
    g.stroke(); g.lineWidth=1;
    for(let k=0;k<S.i || (k===S.i && S.anim>=1);k++){ g.fillStyle = k===2?COL.warn:COL.acc; g.beginPath(); g.arc(x(k),y(st[k].price),k===2?5:3,0,Math.PI*2); g.fill(); }
    const cur = S.anim<1 && S.i>0 ? st[S.i-1].price+(st[S.i].price-st[S.i-1].price)*S.anim : st[S.i].price;
    g.fillStyle=COL.txt; g.font='600 12px '+MONO; g.textAlign = lastX > W-70 ? 'right' : 'left';
    g.fillText('YES $'+cur.toFixed(2), lastX+(lastX>W-70?-8:8), lastY-8);
    if(S.i>=2){ g.fillStyle=COL.warn; g.font='10px system-ui,sans-serif'; g.textAlign='center'; g.fillText('$0.90 — толпа купила', x(2), y(0.90)-12); }
    /* таймлайн */
    const ty = 200; g.strokeStyle=COL.line; g.beginPath(); g.moveTo(x(0),ty); g.lineTo(x(N-1),ty); g.stroke();
    const names = ['рынок','слухи','анонс 23:50','дедлайн','релиз','пропозер','спор 2ч','голос. 48ч','финал'];
    for(let k=0;k<N;k++){
      const done = k<S.i, curr = k===S.i;
      g.fillStyle = curr?COL.warn:done?COL.acc:'#070a18'; g.strokeStyle = curr?COL.warn:done?COL.acc:COL.line;
      g.beginPath(); g.arc(x(k),ty,curr?7:5,0,Math.PI*2); g.fill(); g.stroke();
      if(curr || W>560){ g.fillStyle = curr?COL.txt:COL.mut; g.font=(curr?'600 ':'')+'10px system-ui,sans-serif'; g.textAlign='center';
        g.fillText(names[k], Math.min(W-30, Math.max(30, x(k))), ty + (k%2?22:34)); }
    }
    g.fillStyle=COL.mut; g.font='10px system-ui,sans-serif'; g.textAlign='left'; g.fillText('цена «Да» по мнению толпы', 36, 175);
  }

  fit(); render();
};
