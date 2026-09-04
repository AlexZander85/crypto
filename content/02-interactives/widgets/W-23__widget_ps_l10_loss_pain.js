/*
 * W-23 · widget_ps_l10_loss_pain · П10 «Боль фиксации убытка»
 *
 * Спека эксперта (5 строк, fable_viget.md):
 *   Цель:      увидеть, что после стопа реальный счёт не меняется ни на копейку — тянется только онемение.
 *   Задание:   выбрать, сколько из 1R списываешь в голове ДО входа; открыть позицию; после стопа наклеить пластырь как можно раньше, не сняв стоп.
 *   Ага:       две шкалы расходятся на глазах — «Реальный счёт» стоит на −1R, «Ощущаемый убыток» ползёт к нулю, а «Ментальный капитал» тает; снятый стоп ведёт к −3R и ликвидации.
 *   Дефолты:   1R = 2 000 ₽ на депозите 100 000 ₽ (числа протокола П10), стоп −1R, seed 42; «новый раунд» — новый рынок.
 *   Артефакт:  правило одним предложением + числа раунда (минут до пластыря, пик онемения, сожжённый ментальный капитал).
 *
 * Источник: fable_viget.md (поставка ТЗ-2, 2026-09-05).
 * Контракт: window.EXPERT_WIDGETS[id] = function(box){…}; vanilla JS ES2017,
 * Canvas 2D/SVG, CSS-переменные темы с фолбэками, mulberry32(seed), чистка таймеров/rAF,
 * адаптив от 360px, без внешних зависимостей. Валидация: node --check (ок).
 */

window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
window.EXPERT_WIDGETS['widget_ps_l10_loss_pain'] = function(box){
  /* 0. чистим прошлый запуск */
  if(box._expTimers){ box._expTimers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); }
  if(box._expRaf){ cancelAnimationFrame(box._expRaf); }
  box._expTimers = []; box._expRaf = null;
  const later = (fn, ms, rep)=>{ const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
  const mulberry32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const seed = box._expSeedNext || 42; box._expSeedNext = null;
  const rnd = mulberry32(seed);

  const cs = getComputedStyle(box), cv = (n,d)=>((cs.getPropertyValue(n)||'').trim()||d);
  const C = { txt:cv('--txt','#eef1ff'), mut:cv('--mut','#9aa3c7'), acc:cv('--acc2','#06b6d4'), ok:cv('--ok','#22c55e'), bad:cv('--bad','#ef4444'), warn:cv('--warn','#eab308'), mono:cv('--mono','ui-monospace, Menlo, monospace') };
  const R_RUB = 2000, DEP = 100000;                       // канон П10: стоп 2 000 ₽ при депозите 100 000 ₽
  const fmtR = r => (r>0?'+':'')+r.toFixed(2)+'R';
  const rub  = r => Math.round(Math.abs(r)*R_RUB).toLocaleString('ru-RU')+' ₽';
  const $ = k => box.querySelector(`[data-k="${k}"]`);

  const S = { phase:'intro', writeoff:0, t:0, numb:0, mental:100, pnl:0, path:[0], stopOn:true,
              peakNumb:0, worst:0, log:[], step:0, kind:null, runIv:null, tickIv:null };

  const meter = (l,k)=>`<div class="lp-m"><div class="lp-ml"><span>${l}</span><b data-k="${k}V">—</b></div><div class="lp-bar"><i data-k="${k}B"></i></div></div>`;

  box.innerHTML = `<style>
    .lp{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${C.txt};border:1px solid var(--line,rgba(255,255,255,.14));border-radius:12px;padding:14px;background:linear-gradient(180deg,#0d1022,#040714);max-width:100%;box-sizing:border-box}
    .lp *{box-sizing:border-box}
    .lp h4{margin:0 0 4px;font-size:16px}
    .lp-goal,.lp-task{color:${C.mut};font-size:13px;margin:0 0 10px}
    .lp-scene{border:1px solid var(--line,rgba(255,255,255,.14));border-radius:10px;overflow:hidden;background:#070a18;margin-bottom:12px}
    .lp-scene canvas{display:block;width:100%;height:210px}
    .lp-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 14px;margin-bottom:12px}
    .lp-ml{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:${C.mut}}
    .lp-ml b{font-family:${C.mono};color:${C.txt};white-space:nowrap}
    .lp-bar{height:8px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;margin-top:4px}
    .lp-bar i{display:block;height:100%;width:0;background:${C.acc};transition:width .4s,background .4s}
    .lp-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;min-height:38px}
    .lp button{cursor:pointer;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(255,255,255,.05);color:${C.txt};border-radius:9px;padding:9px 12px;font:600 13px system-ui,sans-serif;text-align:left}
    .lp button.p{background:${C.acc};color:#04101a;border-color:transparent}
    .lp button.d{border-color:${C.bad};color:${C.bad}}
    .lp input[type=range]{width:100%;accent-color:${C.acc}}
    .lp-sl{flex:1 1 220px}
    .lp-note{color:${C.mut};font-size:13px}
    .lp-log{font-size:12px;color:${C.mut};max-height:120px;overflow:auto;border-top:1px dashed var(--line,rgba(255,255,255,.14));padding-top:8px}
    .lp-log div{margin:2px 0}
    .lp-log b{color:${C.txt}}
    .lp-sum{margin-top:10px;border:1px solid var(--line,rgba(255,255,255,.14));border-radius:10px;padding:12px;display:none}
    .lp-sum p{margin:4px 0}
    .lp-aha{border-left:3px solid ${C.acc};padding:6px 10px;margin:8px 0}
    .lp-verdict{font-weight:600;margin-top:8px}
    .lp-art{font-family:${C.mono};font-size:12px;background:rgba(6,182,212,.08);border-radius:8px;padding:8px 10px;margin-top:8px;white-space:pre-wrap}
  </style>
  <div class="lp">
    <h4>«Пластырь»: убыток фиксирует рынок, а не кнопка</h4>
    <div class="lp-goal">Цель: увидеть, что после стопа реальный счёт не меняется ни на копейку — тянется только онемение.</div>
    <div class="lp-task">Задание: реши, сколько из 1R списываешь в голове ДО входа, открой позицию и наклей пластырь как можно раньше после стопа — не снимая стоп.</div>
    <div class="lp-scene"><canvas data-k="c"></canvas></div>
    <div class="lp-meters">${meter('Реальный счёт','real')}${meter('Ощущаемый убыток','felt')}${meter('Онемение','numb')}${meter('Ментальный капитал','ment')}</div>
    <div class="lp-ctl" data-k="ctl"></div>
    <div class="lp-log" data-k="log"></div>
    <div class="lp-sum" data-k="sum"></div>
  </div>`;

  /* ---------- вспомогательные ---------- */
  const log = msg => { S.log.unshift(`<div><b>t+${S.t} мин</b> · ${msg}</div>`); if(S.log.length>14) S.log.pop(); $('log').innerHTML = S.log.join(''); };
  const felt = () => Math.max(0,-S.pnl)*(1-S.writeoff)*(1-S.numb/100);
  const setBar = (k,w,color,txt)=>{ const b=$(k+'B'); b.style.width=Math.max(0,Math.min(100,w))+'%'; b.style.background=color; $(k+'V').textContent=txt; };
  const updateMeters = ()=>{
    const real=Math.max(0,-S.pnl), f=felt();
    setBar('real', real/3*100, C.bad, S.phase==='intro' ? '0.00R' : fmtR(S.pnl)+' · '+(S.pnl<0?'−':'')+rub(S.pnl));
    setBar('felt', f/3*100, C.warn, (f>0?'−':'')+f.toFixed(2)+'R');
    setBar('numb', S.numb, C.acc, Math.round(S.numb)+'%');
    setBar('ment', S.mental, S.mental>60?C.ok:S.mental>30?C.warn:C.bad, Math.round(S.mental)+'%');
  };

  /* ---------- управление ---------- */
  const renderCtl = ()=>{
    const c=$('ctl');
    if(S.phase==='intro'){
      c.innerHTML = `<div class="lp-sl"><div class="lp-ml"><span>Сколько из 1R (${R_RUB.toLocaleString('ru-RU')} ₽) ты списал в голове ДО входа</span><b data-k="woV">${Math.round(S.writeoff*100)}%</b></div><input type="range" min="0" max="100" step="10" value="${S.writeoff*100}" data-k="wo"></div><button class="p" data-k="start">Открыть позицию</button>`;
      $('wo').oninput = e=>{ S.writeoff=+e.target.value/100; $('woV').textContent=e.target.value+'%'; };
      $('start').onclick = startRun;
    } else if(S.phase==='running'){
      c.innerHTML = `<span class="lp-note">Позиция открыта. Стоп бота стоит на −1R. Руки — на коленях.</span>` +
        (S.step>=18 ? `<button class="d" data-k="nostop">Отменить стоп бота: «сейчас отскочит»</button>` : '');
      if($('nostop')) $('nostop').onclick = removeStop;
    } else if(S.phase==='stopped'){
      c.innerHTML = `<button class="p" data-k="accept">Наклеить пластырь: принять −1R и записать в журнал</button><button data-k="wait">Не смотреть ещё 10 минут</button>`;
      $('accept').onclick = ()=>finish('accept');
      $('wait').onclick = ()=>{ for(let i=0;i<10;i++) tick(); };
    } else if(S.phase==='nostop'){
      c.innerHTML = `<button class="p" data-k="close">Закрыть руками сейчас</button><button data-k="wait">Ещё 10 минут «пересижу»</button>`;
      $('close').onclick = ()=>finish('manual');
      $('wait').onclick = ()=>{ for(let i=0;i<10;i++) tick(); };
    } else if(S.phase==='done'){
      c.innerHTML = `<button class="p" data-k="again">Новый раунд (другой рынок)</button>`;
      $('again').onclick = ()=>{ box._expSeedNext=(Date.now()&0x7fffffff)||1; window.EXPERT_WIDGETS['widget_ps_l10_loss_pain'](box); };
    }
  };

  const startRun = ()=>{
    S.phase='running'; S.step=0;
    log(`Позиция открыта. Стоп бота: −1R = −${rub(-1)}. Списано заранее: ${Math.round(S.writeoff*100)}%.`);
    renderCtl();
    S.runIv = later(()=>{
      if(S.phase!=='running') return;
      S.step++;
      const noise=(rnd()*2-1)*0.06;
      S.pnl = +(-(S.step/40)+(S.step<40?noise:0)).toFixed(3);
      S.path.push(S.pnl);
      if(S.step===18) renderCtl();                         // появляется искушение снять стоп
      if(S.step>=40){
        clearInterval(S.runIv); S.pnl=-1; S.path[S.path.length-1]=-1; S.phase='stopped';
        log(`<span style="color:${C.bad}">Стоп сработал.</span> Бот закрыл позицию: −1R = −${rub(-1)}. Это факт рынка, а не мнение.`);
        renderCtl(); startTicks();
      }
      updateMeters();
    }, 110);
  };

  const removeStop = ()=>{
    if(S.phase!=='running') return;
    clearInterval(S.runIv); S.stopOn=false; S.phase='nostop';
    log(`<span style="color:${C.warn}">Стоп отменён руками.</span> Теперь убыток ограничивает только маржа.`);
    renderCtl(); startTicks();
  };

  const startTicks = ()=>{ S.tickIv = later(tick, 1000, true); };

  const tick = ()=>{
    if(S.phase!=='stopped' && S.phase!=='nostop') return;
    S.t++;
    const grow=(1-S.writeoff)*(S.numb<40?7:S.numb<80?4:1.5);
    S.numb=Math.min(100,S.numb+grow); S.peakNumb=Math.max(S.peakNumb,S.numb);
    S.mental=Math.max(0,S.mental-1.2-(S.phase==='nostop'?0.8:0));
    if(S.phase==='nostop'){
      S.pnl=+(S.pnl+(-0.045+(rnd()*2-1)*0.14)).toFixed(3);
      S.worst=Math.min(S.worst,S.pnl);
      if(S.pnl<=-3){ S.pnl=-3; S.path.push(S.pnl); log(`<span style="color:${C.bad}">Ликвидация.</span> Маржи не хватило — позицию закрыла биржа.`); updateMeters(); finish('liq'); return; }
    }
    S.path.push(S.pnl);
    if(S.phase==='stopped' && (S.t===10||S.t===30)) log(`Реальный счёт всё ещё −1R. Изменилось только онемение: ${Math.round(S.numb)}%.`);
    updateMeters();
  };

  const finish = kind =>{
    S.kind=kind; S.phase='done'; if(S.tickIv) clearInterval(S.tickIv);
    renderCtl(); updateMeters();
    const wo=Math.round(S.writeoff*100), burn=100-Math.round(S.mental), f=felt();
    const lines=[`<p>Списано до входа: <b>${wo}%</b> от 1R.</p>`];
    let aha='', verdict='';
    if(kind==='accept'){
      lines.push(`<p>Пластырь наклеен через <b>${S.t} мин</b> после стопа. Пик онемения: <b>${Math.round(S.peakNumb)}%</b>. Сожжено ментального капитала: <b>${burn}%</b>.</p>`);
      aha = `Реальный счёт: −1R в первую секунду стопа и −1R через ${S.t} мин. Разница между «−1R» и «ощущается как −${f.toFixed(2)}R» — не прибыль. Это онемение, и заплачено за него ${burn}% ментального капитала, который нужен на следующий сигнал.`;
      verdict = (S.t<=1 && wo>=50) ? '✅ Протокол «ментального списания» выполнен: деньги были потрачены до входа, пластырь — сразу.'
              : S.t<=3 ? '👍 Пластырь в первые минуты. Следующий раунд попробуй со списанием 100% — боль исчезнет ещё до стопа.'
              : `⚠ Пластырь наклеен, но поздно: ${S.t} минут страуса стоили ментального капитала, который был нужен на работу.`;
    } else {
      const dd=Math.abs(S.pnl)*R_RUB/DEP, rec=dd/(1-dd)*100, recStop=(R_RUB/DEP)/(1-R_RUB/DEP)*100;
      lines.push(`<p>Стоп снят руками. Худшая точка: <b>${fmtR(S.worst)}</b>. Итог: <b>${fmtR(S.pnl)} = −${rub(S.pnl)}</b>. Чтобы вернуться в ноль, нужно <b>+${rec.toFixed(1)}%</b> (при стопе было бы +${recStop.toFixed(1)}%).</p>`);
      if(kind==='liq') lines.push(`<p>«Пока не продал — убытка нет» закончилось ликвидацией.</p>`);
      aha = `Онемение росло — а убыток рос быстрее. Островковая доля предлагала отсрочить боль на ${rub(-1)}; цена отсрочки — −${rub(S.pnl)}.`;
      verdict = '❌ Это и есть капкан: попытка избежать маленькой гарантированной боли открыла дорогу большой.';
    }
    const sum=$('sum'); sum.style.display='block';
    sum.innerHTML = lines.join('') + `<div class="lp-aha">${aha}</div><div class="lp-verdict">${verdict}</div>` +
      `<div class="lp-art">Правило: убыток фиксирует рынок, а не кнопка. Списываю 1R (${R_RUB.toLocaleString('ru-RU')} ₽) в голове до входа; после стопа — пластырь в первую минуту: строка в журнал, стоп не трогаю.
Раунд: списано ${wo}% · пластырь через ${S.t} мин · пик онемения ${Math.round(S.peakNumb)}% · итог ${fmtR(S.pnl)}</div>`;
  };

  /* ---------- сцена ---------- */
  const cvs=$('c'), ctx=cvs.getContext('2d'); let W=0; const H=210;
  const size=()=>{ const w=cvs.clientWidth||320, dpr=window.devicePixelRatio||1; if(w!==W){ W=w; cvs.width=W*dpr; cvs.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); } };
  const rrect=(x,y,w,h,r)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };

  const draw = now =>{
    if(!box.isConnected) return;
    size(); ctx.clearRect(0,0,W,H);
    const f=felt(), pain=Math.min(1.6,f), pulse=(Math.sin(now/180)+1)/2;
    const lw=Math.min(150,W*0.4), cx=lw/2, cy=H/2-8;
    ctx.fillStyle='#141a2e'; rrect(12,14,lw-24,H-28,14); ctx.fill();
    if(S.phase!=='intro'){
      const r=18+pain*16+pulse*pain*8;
      const g=ctx.createRadialGradient(cx,cy,2,cx,cy,r+18);
      g.addColorStop(0,`rgba(239,68,68,${0.85*Math.min(1,pain+0.1)})`); g.addColorStop(1,'rgba(239,68,68,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r+18,0,7); ctx.fill();
      ctx.globalAlpha=0.35+0.5*Math.min(1,pain); ctx.fillStyle=C.bad; ctx.beginPath(); ctx.ellipse(cx,cy,r,r*0.7,0,0,7); ctx.fill(); ctx.globalAlpha=1;
    }
    if(S.kind==='accept'){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(-0.5);
      ctx.fillStyle=C.acc; rrect(-46,-13,92,26,8); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.35)'; rrect(-18,-9,36,18,4); ctx.fill(); ctx.restore();
    }
    ctx.textAlign='center'; ctx.fillStyle=C.txt; ctx.font=`bold 18px ${C.mono}`;
    ctx.fillText(S.phase==='intro'?'0.00R':fmtR(S.pnl), cx, H-30);
    ctx.font='11px system-ui'; ctx.fillStyle=C.mut;
    ctx.fillText(S.phase==='intro'?'позиция не открыта':S.stopOn?'стоп бота −1R':'стоп снят', cx, H-14);

    /* график PnL в R */
    const x0=lw+8, x1=W-10, y0=14, y1=H-24, top=0.5, bot=-3.2;
    const yOf=r=>y0+(top-r)/(top-bot)*(y1-y0);
    ctx.font='10px system-ui'; ctx.textAlign='left';
    [0,-1,-2,-3].forEach(r=>{ ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x0,yOf(r)); ctx.lineTo(x1,yOf(r)); ctx.stroke(); ctx.fillStyle=C.mut; ctx.fillText((r>0?'+':'')+r+'R', x0+2, yOf(r)-3); });
    ctx.setLineDash([4,4]); ctx.strokeStyle=S.stopOn?C.bad:C.warn; ctx.beginPath(); ctx.moveTo(x0,yOf(-1)); ctx.lineTo(x1,yOf(-1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=S.stopOn?C.bad:C.warn; ctx.textAlign='right'; ctx.fillText(S.stopOn?'стоп бота':'стоп снят', x1-2, yOf(-1)-3);
    const n=S.path.length;
    if(n>1){
      const start=Math.max(0,n-240), span=Math.max(60,n-start);
      ctx.beginPath();
      for(let i=start;i<n;i++){ const x=x0+(i-start)/(span-1)*(x1-x0), y=yOf(S.path[i]); i===start?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.strokeStyle=S.pnl<0?C.bad:C.ok; ctx.lineWidth=2; ctx.stroke(); ctx.lineWidth=1;
      const ex=x0+(n-1-start)/(span-1)*(x1-x0); ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.arc(ex,yOf(S.pnl),3.5,0,7); ctx.fill();
    }
    if(S.phase!=='intro'){ ctx.fillStyle=C.mut; ctx.textAlign='right'; ctx.font='11px system-ui'; ctx.fillText('t+'+S.t+' мин', x1, y0+10); }
    box._expRaf=requestAnimationFrame(draw);
  };

  renderCtl(); updateMeters(); box._expRaf=requestAnimationFrame(draw);
};
