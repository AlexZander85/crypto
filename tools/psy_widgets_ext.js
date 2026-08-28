
/* =========================================================================
   V5-PSY-EXT: ИНТЕРАКТИВНЫЕ ТРЕНАЖЁРЫ П9–П32 (24 НОВЫХ ВИДЖЕТА)
   ========================================================================= */

// П9. Дофаминовый капкан
function PSY_render_widget_ps_l9_dopamine_trap(box){
  if(!box) return;
  const wid = 'widget_ps_l9_dopamine_trap';
  const stage = psyShell(box, wid, '🎰', 'Дофаминовый капкан',
    'Монета летит вверх (+65% за 10 минут). График мигает зеленым. Проверь свой дофаминовый самоконтроль: купишь на пике или включишь холодный таймер 15 минут?');
  let stepIdx = 0, score = 0;
  const rounds = [
    { coin:'🚀 MOON/USDT +84%', price:'1.84 $', risk:'Ложный пробой вершины', best:1 },
    { coin:'⚡ FLASH/USDT +112%', price:'0.92 $', risk:'Памп на тонком стакане', best:1 },
    { coin:'💎 ROCKET/USDT +45%', price:'14.2 $', risk:'Зона сильного сопротивления', best:1 }
  ];
  function render(){
    if(stepIdx >= rounds.length){
      const passed = score >= 2;
      psyMark(wid, score, rounds.length, passed);
      stage.innerHTML = psyFinal(wid,
        '<div style="font-size:15px;font-weight:800;color:var(--txt);margin-bottom:8px">' + (passed ? '🧠 Дофаминовый иммунитет!' : '⚠️ Дофаминовый захват') + '</div>' +
        '<div style="font-size:13px;line-height:1.6;color:var(--txt)">Успешно остановлено импульсов: <b>' + score + ' из ' + rounds.length + '</b>.<br>' +
        'Главный вывод: Пауза 15 минут физиологически снижает уровень дофамина и спасает от покупки на вершине.</div>') + psyAgain(wid);
      return;
    }
    const r = rounds[stepIdx];
    stage.innerHTML =
      '<div style="background:#040714;border-radius:10px;padding:14px;margin-bottom:12px;border:1px solid rgba(34,197,94,.3)">' +
        '<div style="font-size:16px;font-weight:800;color:var(--ok)">' + r.coin + '</div>' +
        '<div style="font-size:13px;color:var(--mut);margin-top:4px">Текущая цена: <b style="color:var(--txt)">' + r.price + '</b> | Сигнал: Дофаминовый импульс</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        psyBtn('⚡ Купить прямо сейчас по рынку!', false, ' data-opt="0"') +
        psyBtn('⏱️ Включить правило 15 минут: отойти от экрана и выпить воды', true, ' data-opt="1"') +
      '</div><div id="psy_l9_fb"></div>';
    stage.querySelectorAll('[data-psy-choice]').forEach(function(b){
      b.onclick = function(){
        stage.querySelectorAll('[data-psy-choice]').forEach(function(x){ x.disabled = true; x.style.opacity = .6; });
        b.style.opacity = 1;
        const opt = parseInt(b.getAttribute('data-opt'));
        if(opt === 1){ score++; b.classList.add('ok'); } else { b.classList.add('bad'); }
        document.getElementById('psy_l9_fb').innerHTML =
          '<div style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(56,189,248,.08);border:1px solid var(--acc2);font-size:13px;color:var(--txt)">' +
            (opt === 1 ? '✅ Отлично! Через 15 минут цена откатила на -25%. Вы сохранили деньги.' : '❌ Покупка на хаях: через 3 минуты рынок развернулся в минус. ' + r.risk) +
          '</div><button class="btn sm" style="margin-top:10px" id="psy_l9_next">Дальше ➔</button>';
        document.getElementById('psy_l9_next').onclick = function(){ stepIdx++; render(); };
      };
    });
  }
  render();
}

// П10. Боль фиксации убытка
function PSY_render_widget_ps_l10_loss_pain(box){
  if(!box) return;
  const wid = 'widget_ps_l10_loss_pain';
  const stage = psyShell(box, wid, '🩹', 'Детектор боли и пластырь',
    'Позиция ушла в минус -3%. Сравните стратегию «Мгновенный пластырь» со стратегией «Пересиживание в надежде на ноль».');
  stage.innerHTML =
    '<div style="background:#040714;border-radius:10px;padding:14px;margin-bottom:12px">' +
      '<div style="font-size:13.5px;color:var(--txt);line-height:1.6">Плавающий убыток: <b style="color:var(--bad)">-3 000 ₽ (-3%)</b>.<br>По уставу здесь стоит расчетный стоп-лосс. Что выберете?</div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn sm" id="psy_l10_cut" style="flex:1;background:var(--ok)">🛡️ Отрезать стоп (-3 000 ₽)</button>' +
      '<button class="btn sm ghost" id="psy_l10_wait" style="flex:1">🙈 Подождать отскока в ноль</button>' +
    '</div><div id="psy_l10_res" style="margin-top:12px"></div>';
  document.getElementById('psy_l10_cut').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l10_res').innerHTML = psyFinal(wid,
      '✅ <b>Убыток списан мгновенно!</b> Вы потеряли всего 3 000 ₽ (3% риска) и сохранили 97% капитала. Для восстановления нужен микро-рост всего на +3.1%.');
  };
  document.getElementById('psy_l10_wait').onclick = function(){
    psyMark(wid, 0, 1, false);
    document.getElementById('psy_l10_res').innerHTML = psyFinal(wid,
      '❌ <b>Ловушка островковой доли:</b> Рынок пошел в безоткатное падение. Минус вырос до -45 000 ₽ (-45%). Теперь для возврата в ноль нужен рост на +82%!');
  };
}

// П11. Гормональный шторм
function PSY_render_widget_ps_l11_hormone_storm(box){
  if(!box) return;
  const wid = 'widget_ps_l11_hormone_storm';
  const stage = psyShell(box, wid, '⚡', 'Гормональный шторм',
    'Внезапный обвал рынка на -15%. Пульс 130 уд/мин. Пройдите интерактивное дыхание 4-4-6 для восстановления префронтальной коры.');
  let phase = 0;
  stage.innerHTML =
    '<div style="text-align:center;padding:20px;background:#040714;border-radius:10px;margin-bottom:12px">' +
      '<div id="psy_breath_circle" style="width:70px;height:70px;border-radius:50%;background:var(--acc2);margin:0 auto;transition:all 1s"></div>' +
      '<div id="psy_breath_txt" style="margin-top:12px;font-size:15px;font-weight:800;color:var(--txt)">Нажмите старт для дыхания 4-4-6</div>' +
    '</div>' +
    '<button class="btn sm" id="psy_l11_start" style="width:100%">▶️ Начать дыхательный цикл</button><div id="psy_l11_fb"></div>';
  document.getElementById('psy_l11_start').onclick = function(){
    this.disabled = true;
    const c = document.getElementById('psy_breath_circle');
    const t = document.getElementById('psy_breath_txt');
    t.innerText = 'Вдох носом (4 сек)...'; c.style.transform = 'scale(1.6)';
    setTimeout(function(){
      t.innerText = 'Задержка дыхания (4 сек)...';
      setTimeout(function(){
        t.innerText = 'Плавный выдох ртом (6 сек)...'; c.style.transform = 'scale(1)';
        setTimeout(function(){
          psyMark(wid, 1, 1, true);
          document.getElementById('psy_l11_fb').innerHTML = psyFinal(wid,
            '✅ <b>Блуждающий нерв активирован!</b> Пульс снизился до 75 уд/мин. Логика восстановлена, ручные панические сделки заблокированы.');
        }, 3000);
      }, 2000);
    }, 2000);
  };
}

// П12. Ментальный капитал
function PSY_render_widget_ps_l12_mental_battery(box){
  if(!box) return;
  const wid = 'widget_ps_l12_mental_battery';
  const stage = psyShell(box, wid, '🔋', 'Батарейка решений',
    'Каждое действие за день тратит ментальную энергию. Проверьте заряд батареи к 21:00.');
  let energy = 100;
  const actions = [
    { txt:'Проверил минутный график 30 раз за день', cost:35 },
    { txt:'Поспорил в крипто-чате о будущем рынка', cost:30 },
    { txt:'Внес спонтанные правки в настройки бота', cost:25 }
  ];
  stage.innerHTML =
    '<div style="background:#040714;border-radius:10px;padding:14px;margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--txt)"><span>Заряд ментальной батареи:</span><b id="psy_batt_val" style="color:var(--ok)">100%</b></div>' +
      '<div style="height:8px;background:rgba(255,255,255,.1);border-radius:4px;margin-top:6px;overflow:hidden"><div id="psy_batt_bar" style="width:100%;height:100%;background:var(--ok);transition:all .3s"></div></div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      actions.map(function(a, idx){
        return '<button class="ans" data-act="' + idx + '" style="text-align:left;padding:10px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);font-size:13px;cursor:pointer">' + a.txt + ' (-' + a.cost + '%)</button>';
      }).join('') +
    '</div><div id="psy_l12_fb"></div>';
  stage.querySelectorAll('[data-act]').forEach(function(b){
    b.onclick = function(){
      const idx = parseInt(b.getAttribute('data-act'));
      energy = Math.max(0, energy - actions[idx].cost);
      b.disabled = true; b.style.opacity = .4;
      const bv = document.getElementById('psy_batt_val');
      const bb = document.getElementById('psy_batt_bar');
      bv.innerText = energy + '%';
      bb.style.width = energy + '%';
      if(energy < 40){ bv.style.color = 'var(--bad)'; bb.style.background = 'var(--bad)'; }
      if(energy <= 10){
        psyMark(wid, 1, 1, true);
        document.getElementById('psy_l12_fb').innerHTML = psyFinal(wid,
          '🪫 <b>Батарея разряжена!</b> В таком состоянии после 15:00 мозг делает критические ошибки. Главное правило: правки вносятся только утром!');
      }
    };
  });
}

// П13. Физиология спокойствия
function PSY_render_widget_ps_l13_body_calm(box){
  if(!box) return;
  const wid = 'widget_ps_l13_body_calm';
  const stage = psyShell(box, wid, '🫀', 'Биоритм и самоконтроль',
    'Выберите режим сна и оцените готовность нервной системы к торговле.');
  stage.innerHTML =
    '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      psyBtn('😴 Сон 4 часа + энергетик', false, ' data-sleep="4"') +
      psyBtn('🌟 Сон 8 часов + прогулка', true, ' data-sleep="8"') +
    '</div><div id="psy_l13_fb"></div>';
  stage.querySelectorAll('[data-sleep]').forEach(function(b){
    b.onclick = function(){
      const s = parseInt(b.getAttribute('data-sleep'));
      const pass = s === 8;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l13_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Отличная форма!</b> Префронтальная кора работает на 100%, вариабельность ритма высокая, риск тильта минимален.'
             : '❌ <b>Опасность!</b> Сон 4 часа приравнивается к 0.5 промилле алкоголя в крови. Склонность к неадекватному риску повышена на 38%.');
    };
  });
}

// П14. Паутина тильта
function PSY_render_widget_ps_l14_tilt_web(box){
  if(!box) return;
  const wid = 'widget_ps_l14_tilt_web';
  const stage = psyShell(box, wid, '🕸️', 'Паутина тильта',
    'Вы получили убыток -5 000 ₽. Что делаем дальше?');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('🔥 Удвоить объем сделки и немедленно отбить минус', false, ' data-t="0"') +
      psyBtn('🛑 Закрыть терминал, объявить стоп-день и уйти на 4 часа', true, ' data-t="1"') +
    '</div><div id="psy_l14_fb"></div>';
  stage.querySelectorAll('[data-t]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-t'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l14_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Паутина разорвана!</b> Вы защитили остаток депозита и спасли нервную систему.'
             : '❌ <b>Слив депозита!</b> Попытка отыграться привела к тильту и потере 45 000 ₽ за 2 часа.');
    };
  });
}

// П15. Опознай маску тильта
function PSY_render_widget_ps_l15_tilt_masks(box){
  if(!box) return;
  const wid = 'widget_ps_l15_tilt_masks';
  const stage = psyShell(box, wid, '🎭', 'Опознай маску тильта',
    'Определите тип тильта по реплике трейдера: «Я сидел за графиками 8 часов, рынок обязан дать мне прибыль!»');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('Тильт ненависти к проигрышу', false, ' data-m="0"') +
      psyBtn('Тильт избранности / нереалистичных ожиданий (Entitlement)', true, ' data-m="1"') +
      psyBtn('Тильт ошибки и перфекционизма', false, ' data-m="2"') +
    '</div><div id="psy_l15_fb"></div>';
  stage.querySelectorAll('[data-m]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-m'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l15_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Точно в цель!</b> Это Тильт избранности: рынок никому ничего не должен независимо от затраченных усилий.'
             : '❌ Неверно. Это Entitlement Tilt (иллюзия долга рынка перед трейдером).');
    };
  });
}

// П16. Преодолей ступор
function PSY_render_widget_ps_l16_fear_paralysis(box){
  if(!box) return;
  const wid = 'widget_ps_l16_fear_paralysis';
  const stage = psyShell(box, wid, '🥶', 'Преодолей ступор',
    'После двух стопов появился идеальный системный сигнал. Ваши действия:');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('🙈 Пропустить сделку: слишком страшно получить третий стоп', false, ' data-f="0"') +
      psyBtn('🛡️ Войти в сделку по правилам, при необходимости снизив объем вдвое', true, ' data-f="1"') +
    '</div><div id="psy_l16_fb"></div>';
  stage.querySelectorAll('[data-f]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-f'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l16_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Превосходно!</b> Снижение объема сняло страх, а системный вход принес +3.5R прибыли.'
             : '❌ Пропуск системного сигнала разрушает матожидание: именно пропущенная сделка закрылась в плюс.');
    };
  });
}

// П17. Снайпер против пулеметчика
function PSY_render_widget_ps_l17_sniper_gunner(box){
  if(!box) return;
  const wid = 'widget_ps_l17_sniper_gunner';
  const stage = psyShell(box, wid, '🎣', 'Снайпер против пулеметчика',
    'Сравните результат 50 сделок в день против 1 выверенной сделки.');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('🔫 Пулеметчик (50 сделок/день)', false, ' data-sg="0"') +
      psyBtn('🎯 Снайпер (1 сделка/день)', true, ' data-sg="1"') +
    '</div><div id="psy_l17_fb"></div>';
  stage.querySelectorAll('[data-sg]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-sg'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l17_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Итог Снайпера:</b> 4 сделки за месяц, чистый плюс +5.8R, биржевая комиссия 0.1%.'
             : '❌ <b>Итог Пулеметчика:</b> 120 сделок, слив -14R только на комиссиях биржи и проскальзывании.');
    };
  });
}

// П18. Конструктор MHH
function PSY_render_widget_ps_l18_mhh_builder(box){
  if(!box) return;
  const wid = 'widget_ps_l18_mhh_builder';
  const stage = psyShell(box, wid, '📝', 'Конструктор MHH',
    'Соберите 5 шагов протокола Ментальной истории рук по Тендлеру:');
  stage.innerHTML =
    '<div style="font-size:13px;line-height:1.6;color:var(--txt);margin-bottom:10px">' +
      '1. Описать проблему ➔ 2. Вскрыть логику ➔ 3. <b>Найти коренную ошибку</b> ➔ 4. Сформулировать реальность ➔ 5. Создать инъекцию логики.' +
    '</div>' +
    psyBtn('✅ Запомнить алгоритм MHH и сохранить в журнал', true, ' data-mhh="1"') +
    '<div id="psy_l18_fb"></div>';
  stage.querySelector('[data-mhh]').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l18_fb').innerHTML = psyFinal(wid, '✅ <b>Протокол MHH освоен!</b> Используйте его при каждом эмоциональном сбое.');
  };
}

// П19. Градусник накопленного стресса
function PSY_render_widget_ps_l19_stress_gauge(box){
  if(!box) return;
  const wid = 'widget_ps_l19_stress_gauge';
  const stage = psyShell(box, wid, '🌡️', 'Градусник накопленного стресса',
    'Завершите день 5-минутным дебрифингом для сброса эмоционального давления.');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('📓 Заполнить 3 строки дебрифинга и выключить терминал', true, ' data-deb="1"') +
      psyBtn('📱 Пойти спать с открытым графиком на телефоне', false, ' data-deb="0"') +
    '</div><div id="psy_l19_fb"></div>';
  stage.querySelectorAll('[data-deb]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-deb'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l19_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Стресс сброшен в 0/10!</b> Вы проснетесь со свежей головой и ясным вниманием.'
             : '❌ <b>Стресс вырос до 8/10!</b> Завтра вы начнете день на взводе и сорветесь в тильт.');
    };
  });
}

// П20. Колесо Казино Дугласа
function PSY_render_widget_ps_l20_casino_wheel(box){
  if(!box) return;
  const wid = 'widget_ps_l20_casino_wheel';
  const stage = psyShell(box, wid, '🎰', 'Колесо Казино Дугласа',
    'Смоделируйте серию из 20 сделок системы с матожиданием 55%.');
  stage.innerHTML =
    '<button class="btn sm" id="psy_l20_spin" style="width:100%">🎲 Запустить симуляцию 20 сделок</button>' +
    '<div id="psy_l20_fb" style="margin-top:10px"></div>';
  document.getElementById('psy_l20_spin').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l20_fb').innerHTML = psyFinal(wid,
      '✅ <b>Итог серии 20 сделок:</b> 11 прибылей (+22R), 9 убытков (-9R). Чистый результат: <b>+13R</b>. Локальные серии из 3 минусов подряд не помешали победе серии!');
  };
}

// П21. Шкала спокойствия
function PSY_render_widget_ps_l21_risk_acceptance(box){
  if(!box) return;
  const wid = 'widget_ps_l21_risk_acceptance';
  const stage = psyShell(box, wid, '🧘', 'Шкала спокойствия',
    'Выберите рабочий риск на сделку:');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('1% от капитала (спокойный сон)', true, ' data-r="1"') +
      psyBtn('20% от капитала (трясущиеся руки)', false, ' data-r="20"') +
    '</div><div id="psy_l21_fb"></div>';
  stage.querySelectorAll('[data-r]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-r'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l21_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Истинное принятие риска!</b> Пульс стабилен, решения хладнокровны.'
             : '❌ <b>Вынужденная мука!</b> При риске 20% каждая свеча вызывает микроинфаркт.');
    };
  });
}

// П22. Генератор альтернативных миров Талеба
function PSY_render_widget_ps_l22_taleb_worlds(box){
  if(!box) return;
  const wid = 'widget_ps_l22_taleb_worlds';
  const stage = psyShell(box, wid, '🎲', 'Генератор альтернативных миров',
    'Сравните единичный выигрыш в русскую рулетку со 100 параллельными мирами.');
  stage.innerHTML =
    '<button class="btn sm" id="psy_l22_gen" style="width:100%">🌌 Запустить 100 параллельных симуляций</button>' +
    '<div id="psy_l22_fb" style="margin-top:10px"></div>';
  document.getElementById('psy_l22_gen').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l22_fb').innerHTML = psyFinal(wid,
      '✅ <b>Анализ альтернативных историй:</b> В 1 мире сделка принесла +100%, но в 99 остальных мирах наступила 100% ликвидация. Решение признано самоубийственным браком.');
  };
}

// П23. Эксперимент с 10 000 обезьян
function PSY_render_widget_ps_l23_survivor_monkeys(box){
  if(!box) return;
  const wid = 'widget_ps_l23_survivor_monkeys';
  const stage = psyShell(box, wid, '🐬', 'Эксперимент с 10 000 обезьян',
    'Смоделируйте ошибку выжившего среди 10 000 случайных участников.');
  stage.innerHTML =
    '<button class="btn sm" id="psy_l23_sim" style="width:100%">🐒 Запустить симуляцию ошибки выжившего</button>' +
    '<div id="psy_l23_fb" style="margin-top:10px"></div>';
  document.getElementById('psy_l23_sim').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l23_fb').innerHTML = psyFinal(wid,
      '✅ <b>Результат:</b> 10 обезьян случайно выбросили 10 орлов подряд и названы «гуру». 9 990 обезьян разорились. Не верьте чужим скриншотам без аудита выборки!');
  };
}

// П24. 1000 дней индейки
function PSY_render_widget_ps_l24_turkey_trap(box){
  if(!box) return;
  const wid = 'widget_ps_l24_turkey_trap';
  const stage = psyShell(box, wid, '🦃', '1000 дней индейки',
    'Запустите симуляцию мартингейл-бота со 100% винрейтом без стоп-лосса.');
  stage.innerHTML =
    '<button class="btn sm" id="psy_l24_sim" style="width:100%">🦃 Прожить 365 дней с мартингейлом</button>' +
    '<div id="psy_l24_fb" style="margin-top:10px"></div>';
  document.getElementById('psy_l24_sim').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l24_fb').innerHTML = psyFinal(wid,
      '💥 <b>День благодарения наступил!</b> 364 дня бот приносил по +1%, а на 365-й день безоткатный тренд обнулил 100% депозита. Без жесткого стоп-лосса торговать запрещено!');
  };
}

// П25. Байесовский калибратор Brier Score
function PSY_render_widget_ps_l25_brier_score(box){
  if(!box) return;
  const wid = 'widget_ps_l25_brier_score';
  const stage = psyShell(box, wid, '🎯', 'Байесовский калибратор Brier Score',
    'Проверьте правило Кромвеля: допустимо ли присваивать рыночной гипотезе 100% вероятность?');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('Да, если сигнал очень надежный', false, ' data-br="0"') +
      psyBtn('Никогда: правило Кромвеля запрещает 100% уверенность', true, ' data-br="1"') +
    '</div><div id="psy_l25_fb"></div>';
  stage.querySelectorAll('[data-br]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-br'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l25_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Идеальная калибровка!</b> Всегда оставляйте зазор для непредвиденного форс-мажора.'
             : '❌ Ошибка сверхуверенности. 100% уверенность нарушает формулу Байеса.');
    };
  });
}

// П26. Ментальный термостат Минервини
function PSY_render_widget_ps_l26_mental_thermostat(box){
  if(!box) return;
  const wid = 'widget_ps_l26_mental_thermostat';
  const stage = psyShell(box, wid, '🌡️', 'Ментальный термостат Минервини',
    'Депозит вырос в 2 раза за месяц. Какое действие защитит от самосаботажа?');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('🚀 Удвоить рабочий объем сделок', false, ' data-mt="0"') +
      psyBtn('🛡️ Зафиксировать плато на 4 недели и вывести 20% прибыли в реальный мир', true, ' data-mt="1"') +
    '</div><div id="psy_l26_fb"></div>';
  stage.querySelectorAll('[data-mt]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-mt'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l26_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Термостат перенастроен!</b> Вы деактивировали самосаботаж и закрепили прибыль.'
             : '❌ Взрыв термостата! Подсознание сольет прибыль за 2 недели.');
    };
  });
}

// П27. Тренажер мгновенного стопа
function PSY_render_widget_ps_l27_best_loser(box){
  if(!box) return;
  const wid = 'widget_ps_l27_best_loser';
  const stage = psyShell(box, wid, '🛡️', 'Тренажер мгновенного стопа',
    'Парадокс лучшего неудачника Хоугаарда:');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('Бояться в минусе (резать сразу), терпеть в плюсе', true, ' data-bl="1"') +
      psyBtn('Терпеть в минусе (ждать отскока), бояться в плюсе', false, ' data-bl="0"') +
    '</div><div id="psy_l27_fb"></div>';
  stage.querySelectorAll('[data-bl]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-bl'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l27_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Инверсия успешна!</b> Вы побеждаете как Best Loser.'
             : '❌ Психология толпы: пересиживание убытков и срезание прибыли гарантирует слив.');
    };
  });
}

// П28. Детектор Ясности
function PSY_render_widget_ps_l28_clarity_detector(box){
  if(!box) return;
  const wid = 'widget_ps_l28_clarity_detector';
  const stage = psyShell(box, wid, '🔍', 'Детектор Ясности',
    'Что важнее перед открытием сделки по Джеку Швагеру?');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('Ясность плана (где я неправ и сколько потеряю)', true, ' data-cl="1"') +
      psyBtn('100% уверенность в росте', false, ' data-cl="0"') +
    '</div><div id="psy_l28_fb"></div>';
  stage.querySelectorAll('[data-cl]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-cl'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l28_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Ясность побеждает!</b> Четкий план снимает сомнения и страх.'
             : '❌ Уверенность — иллюзия. Профессионал опирается на ясность сценария.');
    };
  });
}

// П29. Дюймовый червь Тендлера
function PSY_render_widget_ps_l29_inchworm(box){
  if(!box) return;
  const wid = 'widget_ps_l29_inchworm';
  const stage = psyShell(box, wid, '🐛', 'Дюймовый червь Тендлера',
    'Как быстрее всего повысить стабильность эквити-кривой?');
  stage.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      psyBtn('Раздувать максимальную прибыль A-game', false, ' data-iw="0"') +
      psyBtn('Ликвидировать грубые ошибки худшей игры (подтянуть хвост C-game)', true, ' data-iw="1"') +
    '</div><div id="psy_l29_fb"></div>';
  stage.querySelectorAll('[data-iw]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-iw'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l29_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Хвост подтянут!</b> Когда худшие дни перестают сливать депозит, общий результат растет.'
             : '❌ Ошибка. Без устранения C-game любая пиковая прибыль будет возвращена рынку.');
    };
  });
}

// П30. Переключатель валюты
function PSY_render_widget_ps_l30_currency_toggle(box){
  if(!box) return;
  const wid = 'widget_ps_l30_currency_toggle';
  const stage = psyShell(box, wid, '🔲', 'Переключатель валюты',
    'Сравните торговлю в рублях против мышления в R-множителях:');
  stage.innerHTML =
    '<div style="display:flex;gap:8px">' +
      psyBtn('Скрыть валюту (мыслить в R и %)', true, ' data-cur="1"') +
      psyBtn('Постоянно смотреть на рубли/доллары', false, ' data-cur="0"') +
    '</div><div id="psy_l30_fb"></div>';
  stage.querySelectorAll('[data-cur]').forEach(function(b){
    b.onclick = function(){
      const opt = parseInt(b.getAttribute('data-cur'));
      const pass = opt === 1;
      psyMark(wid, pass ? 1 : 0, 1, pass);
      document.getElementById('psy_l30_fb').innerHTML = psyFinal(wid,
        pass ? '✅ <b>Денежный гипноз отключен!</b> Вы мыслите как профессиональный квант.'
             : '❌ Денежные знаки включают бытовой счетчик и разрушают дисциплину.');
    };
  });
}

// П31. Взломщик привычек Эдварда
function PSY_render_widget_ps_l31_habit_breaker(box){
  if(!box) return;
  const wid = 'widget_ps_l31_habit_breaker';
  const stage = psyShell(box, wid, '🎙️', 'Взломщик привычек Эдварда',
    'В момент импульсивного зуда откройте диктофон и проговорите чек-лист вслух.');
  stage.innerHTML =
    psyBtn('🎙️ Записать 30-секундный голосовой дебрифинг перед сделкой', true, ' data-hb="1"') +
    '<div id="psy_l31_fb"></div>';
  stage.querySelector('[data-hb]').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l31_fb').innerHTML = psyFinal(wid,
      '✅ <b>Нейронная петля разорвана!</b> Проговаривание вслух вернуло контроль префронтальной коры.');
  };
}

// П32. Калькулятор покупки свободы
function PSY_render_widget_ps_l32_freedom_calc(box){
  if(!box) return;
  const wid = 'widget_ps_l32_freedom_calc';
  const stage = psyShell(box, wid, '⏳', 'Калькулятор покупки свободы',
    'Финальный экран Академии психологии: подтвердите готовность торгового устава.');
  stage.innerHTML =
    '<div style="background:#040714;border-radius:10px;padding:16px;margin-bottom:12px;border:1.5px solid var(--ok)">' +
      '<div style="font-size:16px;font-weight:800;color:var(--ok)">🎓 Полный курс Психологии и Риск-инженерии пройден!</div>' +
      '<div style="font-size:13.5px;color:var(--txt);line-height:1.6;margin-top:6px">' +
        '32 урока изучены. Вы обладаете полным набором инструментов мировой элиты трейдинга: от нейробиологии до архитектуры автономии времени.' +
      '</div>' +
    '</div>' +
    psyBtn('📜 Получить Сертификат Квалифицированного Оператора', true, ' data-cert="1"') +
    '<div id="psy_l32_fb"></div>';
  stage.querySelector('[data-cert]').onclick = function(){
    psyMark(wid, 1, 1, true);
    document.getElementById('psy_l32_fb').innerHTML = psyFinal(wid,
      '🎉 <b>Поздравляем!</b> Выпускной норматив выполнен. Ваша финансовая система готова к спокойной, дисциплинированной и прибыльной работе на годы вперед.');
  };
}

// Регистрация всех 32 виджетов в глобальной области видимости
window.PSY_render_widget_ps_l9_dopamine_trap = PSY_render_widget_ps_l9_dopamine_trap;
window.PSY_render_widget_ps_l10_loss_pain = PSY_render_widget_ps_l10_loss_pain;
window.PSY_render_widget_ps_l11_hormone_storm = PSY_render_widget_ps_l11_hormone_storm;
window.PSY_render_widget_ps_l12_mental_battery = PSY_render_widget_ps_l12_mental_battery;
window.PSY_render_widget_ps_l13_body_calm = PSY_render_widget_ps_l13_body_calm;
window.PSY_render_widget_ps_l14_tilt_web = PSY_render_widget_ps_l14_tilt_web;
window.PSY_render_widget_ps_l15_tilt_masks = PSY_render_widget_ps_l15_tilt_masks;
window.PSY_render_widget_ps_l16_fear_paralysis = PSY_render_widget_ps_l16_fear_paralysis;
window.PSY_render_widget_ps_l17_sniper_gunner = PSY_render_widget_ps_l17_sniper_gunner;
window.PSY_render_widget_ps_l18_mhh_builder = PSY_render_widget_ps_l18_mhh_builder;
window.PSY_render_widget_ps_l19_stress_gauge = PSY_render_widget_ps_l19_stress_gauge;
window.PSY_render_widget_ps_l20_casino_wheel = PSY_render_widget_ps_l20_casino_wheel;
window.PSY_render_widget_ps_l21_risk_acceptance = PSY_render_widget_ps_l21_risk_acceptance;
window.PSY_render_widget_ps_l22_taleb_worlds = PSY_render_widget_ps_l22_taleb_worlds;
window.PSY_render_widget_ps_l23_survivor_monkeys = PSY_render_widget_ps_l23_survivor_monkeys;
window.PSY_render_widget_ps_l24_turkey_trap = PSY_render_widget_ps_l24_turkey_trap;
window.PSY_render_widget_ps_l25_brier_score = PSY_render_widget_ps_l25_brier_score;
window.PSY_render_widget_ps_l26_mental_thermostat = PSY_render_widget_ps_l26_mental_thermostat;
window.PSY_render_widget_ps_l27_best_loser = PSY_render_widget_ps_l27_best_loser;
window.PSY_render_widget_ps_l28_clarity_detector = PSY_render_widget_ps_l28_clarity_detector;
window.PSY_render_widget_ps_l29_inchworm = PSY_render_widget_ps_l29_inchworm;
window.PSY_render_widget_ps_l30_currency_toggle = PSY_render_widget_ps_l30_currency_toggle;
window.PSY_render_widget_ps_l31_habit_breaker = PSY_render_widget_ps_l31_habit_breaker;
window.PSY_render_widget_ps_l32_freedom_calc = PSY_render_widget_ps_l32_freedom_calc;
