# tools/generate_all_52_widgets.py
import os

ROOT = r'D:\crypto'
OUT_JS = os.path.join(ROOT, 'tools', 'psy_widgets_ext.js')

widget_js = """
/* =========================================================================
   V5-PSY-EXT: ИНТЕРАКТИВНЫЕ ТРЕНАЖЁРЫ П9–П52 (44 НОВЫХ ВИДЖЕТА)
   ========================================================================= */

// П9. Дофаминовый капкан (Холодный таймер)
window.PSY_render_widget_ps_l9_dopamine_trap = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l9_dopamine_trap';
  const stage = psyShell(box, wid, '🎰', '«Дофаминовый капкан: Холодный таймер 15 минут»', 'Монета летит вверх (+75%), чаты кричат «Ракета!». Прилежащее ядро мозга требует нажать Buy.');
  if(!stage) return;
  stage.innerHTML = 
    '<div id="dop_box_' + wid + '" style="padding:14px;background:rgba(239,68,68,.08);border:1px solid var(--warn);border-radius:8px;text-align:center">' +
      '<div style="font-size:18px;font-weight:800;color:var(--warn);margin-bottom:6px">🔥 Уровень дофаминового угара: 98%</div>' +
      '<div style="font-size:12.5px;color:var(--mut);margin-bottom:12px">Префронтальная кора заблокирована. Шанс покупки на хаях: 92%.</div>' +
      '<button class="btn primary" id="btn_timer_' + wid + '">⏱️ Включить 15-минутный карантин</button>' +
    '</div>';
  const btn = stage.querySelector('#btn_timer_' + wid);
  btn.onclick = () => {
    btn.disabled = true;
    let sec = 4;
    btn.innerText = '⏳ Остывание... осталось ' + sec + ' сек';
    const iv = setInterval(() => {
      sec--;
      if(sec > 0){
        btn.innerText = '⏳ Остывание... осталось ' + sec + ' сек';
      } else {
        clearInterval(iv);
        psyMarkPassed(wid);
        stage.querySelector('#dop_box_' + wid).innerHTML =
          '<div style="margin-top:4px;font-size:14px;font-weight:700;color:var(--ok)">🧊 Дофаминовый пик спал до 18%!</div>' +
          '<div style="font-size:12.5px;color:var(--txt);margin-top:6px;line-height:1.5">График развернулся вниз на −12%. Префронтальная кора вернула контроль. Ты сохранил депозит от импульсивной покупки на хаях.</div>' + psyAgain(wid);
      }
    }, 600);
  };
};

// П10. Детектор боли фиксации убытка
window.PSY_render_widget_ps_l10_loss_pain = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l10_loss_pain';
  const stage = psyShell(box, wid, '🩹', '«Детектор боли островковой доли»', 'Сделка ушла в плановый стоп −2 000 ₽. Островковая доля мозга кричит от физической боли.');
  if(!stage) return;
  stage.innerHTML = 
    '<div style="display:flex;gap:8px;flex-direction:column">' +
      '<button class="ans" id="btn1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🙈 Убрать стоп и терпеть («вдруг отрастет»)</button>' +
      '<button class="ans" id="btn2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">✂️ Нажать стоп и применить «Ментальное списание»</button>' +
    '</div>' +
    '<div id="res_' + wid + '" style="margin-top:10px"></div>';
  stage.querySelector('#btn1_' + wid).onclick = () => {
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px"><b>Ловушка боли:</b> Цена пошла дальше вниз, убыток вырос до −25 000 ₽. Попытка избежать мелкой боли привела к катастрофе.</div>' + psyAgain(wid);
  };
  stage.querySelector('#btn2_' + wid).onclick = () => {
    psyMarkPassed(wid);
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>Идеально!</b> Ты ментально списал 2 000 ₽ до входа. Островковая доля спокойна. Ты защищен от ликвидации.</div>' + psyAgain(wid);
  };
};

// П11. Гормональный шторм
window.PSY_render_widget_ps_l11_hormone_storm = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l11_hormone_storm';
  const stage = psyShell(box, wid, '⚡', '«Антипанический протокол 4-4-6»', 'Резкий пролив рынка на −15%. Миндалина включила сирену «Бей или беги», пульс 130 уд/мин.');
  if(!stage) return;
  stage.innerHTML = 
    '<div id="breath_box_' + wid + '" style="padding:14px;background:rgba(59,130,246,.08);border:1px solid var(--acc2);border-radius:8px;text-align:center">' +
      '<div id="breath_text_' + wid + '" style="font-size:16px;font-weight:700;color:var(--txt);margin-bottom:10px">Готов начать дыхание</div>' +
      '<button class="btn primary" id="btn_breath_' + wid + '">🫁 Начать цикл 4-4-6</button>' +
    '</div>';
  const btn = stage.querySelector('#btn_breath_' + wid);
  btn.onclick = () => {
    btn.disabled = true;
    const txt = stage.querySelector('#breath_text_' + wid);
    txt.innerText = 'Вдох носом (4 сек)... 🫁';
    setTimeout(() => {
      txt.innerText = 'Задержка дыхания (4 сек)... ⏱️';
      setTimeout(() => {
        txt.innerText = 'Плавный выдох ртом (6 сек)... 💨';
        setTimeout(() => {
          psyMarkPassed(wid);
          stage.querySelector('#breath_box_' + wid).innerHTML =
            '<div style="margin-top:4px;font-weight:700;color:var(--ok);font-size:14px">✅ Пульс снизился до 72 уд/мин!</div>' +
            '<div style="font-size:12.5px;color:var(--txt);margin-top:4px">Блуждающий нерв передал сигнал спокойствия в мозг. Префронтальная кора вернула способность к логическому анализу.</div>' + psyAgain(wid);
        }, 1500);
      }, 1000);
    }, 1000);
  };
};

// П12. Батарейка решений
window.PSY_render_widget_ps_l12_mental_battery = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l12_mental_battery';
  const stage = psyShell(box, wid, '🔋', '«Батарея ментального капитала»', 'Время 16:45. За день проанализировано 25 графиков. Заряд префронтальной коры: 12%.');
  if(!stage) return;
  stage.innerHTML = 
    '<div style="display:flex;gap:8px;flex-direction:column">' +
      '<button class="ans" id="b1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🛠️ Поменять настройки сетки и плечо сейчас</button>' +
      '<button class="ans" id="b2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">📝 Записать идею в журнал и принять решение завтра в 09:00</button>' +
    '</div>' +
    '<div id="res_' + wid + '" style="margin-top:10px"></div>';
  stage.querySelector('#b1_' + wid).onclick = () => {
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px"><b>Ошибка:</b> Из-за усталости вы перепутали шаг сетки и получили просадку −18%.</div>' + psyAgain(wid);
  };
  stage.querySelector('#b2_' + wid).onclick = () => {
    psyMarkPassed(wid);
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>Блестяще!</b> Правило устава: любые инженерные правки вносятся строго утром на полную батарею.</div>' + psyAgain(wid);
  };
};

// П13. Физиология спокойствия
window.PSY_render_widget_ps_l13_body_calm = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l13_body_calm';
  const stage = psyShell(box, wid, '🫀', '«Сброс телесных зажимов стресса»', '80% волокон блуждающего нерва идут от тела к мозгу. Выбери протокол декомпрессии:');
  if(!stage) return;
  stage.innerHTML = 
    '<div style="display:flex;gap:8px;flex-direction:column">' +
      '<button class="ans" id="b1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🍺 Выпить алкоголь и листать чаты</button>' +
      '<button class="ans" id="b2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🏃 30 минут быстрой прогулки / тренировки + расслабление плеч</button>' +
    '</div>' +
    '<div id="res_' + wid + '" style="margin-top:10px"></div>';
  stage.querySelector('#b1_' + wid).onclick = () => {
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px">Ошибка: алкоголь разрушает фазы глубокого сна и усиливает тильт на следующий день.</div>' + psyAgain(wid);
  };
  stage.querySelector('#b2_' + wid).onclick = () => {
    psyMarkPassed(wid);
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>Абсолютно верно!</b> Физическая активность расщепляет кортизол и восстанавливает мозг.</div>' + psyAgain(wid);
  };
};

// П14. Паутина тильта
window.PSY_render_widget_ps_l14_tilt_web = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l14_tilt_web';
  const stage = psyShell(box, wid, '🕸️', '«Аварийный протокол Стоп-Тильт»', 'Два стопа подряд. Внутри поднимается ярость: «Я обязан вернуть эти деньги прямо сейчас!».');
  if(!stage) return;
  stage.innerHTML = 
    '<div style="display:flex;gap:8px;flex-direction:column">' +
      '<button class="ans" id="b1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🚀 Открыть сделку 3x объемом в противоположную сторону</button>' +
      '<button class="ans" id="b2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">🛑 Закрыть терминал на 4 часа (протокол Стоп-Тильт)</button>' +
    '</div>' +
    '<div id="res_' + wid + '" style="margin-top:10px"></div>';
  stage.querySelector('#b1_' + wid).onclick = () => {
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px">Классический тильт: попытка мести рынку слила 70% баланса за 20 минут.</div>' + psyAgain(wid);
  };
  stage.querySelector('#b2_' + wid).onclick = () => {
    psyMarkPassed(wid);
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>Победа дисциплины!</b> 85% сливов происходят именно в первые 2 часа после срыва. Физический уход от экрана спас депозит.</div>' + psyAgain(wid);
  };
};

// П15. Маски тильта
window.PSY_render_widget_ps_l15_tilt_masks = function(box){
  if(typeof box === 'string') box = document.getElementById(box);
  if(!box) return;
  const wid = 'widget_ps_l15_tilt_masks';
  const stage = psyShell(box, wid, '🎭', '«Опознай маску тильта Тендлера»', '«Биржа специально выбила именно мой стоп на 1 пункт! Это заговор!» Какой это тип тильта?');
  if(!stage) return;
  stage.innerHTML = 
    '<div style="display:flex;gap:8px;flex-direction:column">' +
      '<button class="ans" id="b1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">Тильт усталости</button>' +
      '<button class="ans" id="b2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">Тильт несправедливости (Injustice Tilt)</button>' +
    '</div>' +
    '<div id="res_' + wid + '" style="margin-top:10px"></div>';
  stage.querySelector('#b1_' + wid).onclick = () => {
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px">Неверно. Это тильт несправедливости.</div>' + psyAgain(wid);
  };
  stage.querySelector('#b2_' + wid).onclick = () => {
    psyMarkPassed(wid);
    stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>Точно в цель!</b> Это Тильт Несправедливости. Инъекция: «Рынок нейтрален и не знает обо мне».</div>' + psyAgain(wid);
  };
};

// Helper for standard case widgets
function makeStandardCaseWidget(num, wid, icon, title, desc, qText, opt1, opt2, opt1Ok, okMsg, failMsg){
  window['PSY_render_' + wid] = function(box){
    if(typeof box === 'string') box = document.getElementById(box);
    if(!box) return;
    const stage = psyShell(box, wid, icon, title, desc);
    if(!stage) return;
    stage.innerHTML = 
      '<div style="font-size:13px;color:var(--txt);margin-bottom:10px">' + qText + '</div>' +
      '<div style="display:flex;gap:8px;flex-direction:column">' +
        '<button class="ans" id="b1_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">' + opt1 + '</button>' +
        '<button class="ans" id="b2_' + wid + '" style="text-align:left;padding:10px 12px;font-size:13px;border-radius:8px;border:1px solid var(--line);background:#040714;color:var(--txt);cursor:pointer">' + opt2 + '</button>' +
      '</div>' +
      '<div id="res_' + wid + '" style="margin-top:10px"></div>';
    stage.querySelector('#b1_' + wid).onclick = () => {
      if(opt1Ok){
        psyMarkPassed(wid);
        stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>' + okMsg + '</b></div>' + psyAgain(wid);
      } else {
        stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px"><b>' + failMsg + '</b></div>' + psyAgain(wid);
      }
    };
    stage.querySelector('#b2_' + wid).onclick = () => {
      if(!opt1Ok){
        psyMarkPassed(wid);
        stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--txt);font-size:12.5px"><b>' + okMsg + '</b></div>' + psyAgain(wid);
      } else {
        stage.querySelector('#res_' + wid).innerHTML = '<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid var(--warn);color:var(--txt);font-size:12.5px"><b>' + failMsg + '</b></div>' + psyAgain(wid);
      }
    };
  };
}

makeStandardCaseWidget(16, 'widget_ps_l16_fear_paralysis', '🥶', '«Преодоление паралича кнопки»', 'Сигнал появился, но страх блокирует пальцы.', 'Как вернуть хладнокровие?', 'Пропустить сигнал и уйти', 'Снизить объем в 2 раза и нажать кнопку строго по чек-листу', false, 'Верная тактика! Снижение объема снимает страх.', 'Пропуск сделки закрепляет синдром битой собаки.');
makeStandardCaseWidget(17, 'widget_ps_l17_sniper_gunner', '🎣', '«Снайпер против пулеметчика»', '40 сделок в день против 2 сделок по уставу.', 'Какова судьба депозита пулеметчика?', 'Комиссионная эрозия биржи уничтожит счет', 'Он гарантированно удвоит депозит', true, 'Именно так! Комиссии биржи съедают частые сделки.', 'Частые сделки обогащают только биржу.');
makeStandardCaseWidget(18, 'widget_ps_l18_mhh_builder', '📝', '«Конструктор MHH»', '5-шаговый ремонт мышления Джареда Тендлера.', 'Что является инъекцией логики против обиды на стоп?', '«Рынок — это вероятности. Стоп — себестоимость бизнеса»', '«В следующий раз возьму плечо 50x»', true, 'MHH завершен успешно! Логика нейтрализовала эмоцию.', 'Это путь к ликвидации, а не логика.');
makeStandardCaseWidget(19, 'widget_ps_l19_stress_gauge', '🌡️', '«Градусник стресса и дебрифинг»', 'Разгрузка подсознания перед сном.', 'Зачем нужен 3-строчный вечерний дебрифинг?', 'Чтобы сбросить накопленную эмоцию и спать спокойно', 'Чтобы похвастаться в чате', true, 'Дебрифинг сохранен! Голова чиста.', 'Дебрифинг пишется для своей дисциплины.');
makeStandardCaseWidget(20, 'widget_ps_l20_casino_wheel', '🎰', '«Колесо Казино Марка Дугласа»', 'Мышление сериями сделок.', 'Почему казино всегда в плюсе на дистанции 10 000 ставок?', 'Потому что математический перевес неизбежно проявляется на выборке', 'Потому что игрокам не везет', true, 'Истина Дугласа! Матожидание побеждает на дистанции.', 'В казино правит закон больших чисел.');
makeStandardCaseWidget(21, 'widget_ps_l21_risk_acceptance', '🧘', '«Шкала принятия риска»', 'Истинное принятие риска по Дугласу.', 'Что делает трейдер, принявший риск?', 'Выставил стоп, закрыл терминал и спокоен', 'Обновляет график каждые 10 секунд', true, 'Истинное принятие! Психика свободна от сомнений.', 'Это не принятие, а мучение.');
makeStandardCaseWidget(22, 'widget_ps_l22_taleb_worlds', '🎲', '«Веер миров Нассима Талеба»', 'Оценка альтернативных историй.', 'Случайный выигрыш на 50x плече — это мастерство?', 'Нет, в 98 из 100 миров Талеба это решение ведет к ликвидации', 'Да, победителей не судят', true, 'Талебовский взгляд! Решение было самоубийственным.', 'Случайная удача не равна мастерству.');
makeStandardCaseWidget(23, 'widget_ps_l23_survivor_monkeys', '🐬', '«Эксперимент с 10 000 обезьян»', 'Ошибка выжившего в соцсетях.', 'Что стоит за одним скриншотом +500% в соцсетях?', 'Кладбище из 9 990 слитых депозитов', 'Гениальная интуиция автора', true, 'Ошибка выжившего раскрыта! Не верь показухе.', 'За успехом одного стоят тысячи банкротств.');
makeStandardCaseWidget(24, 'widget_ps_l24_turkey_trap', '🦃', '«Ловушка индейки и мартингейл»', 'Хвостовой риск систем со 100% винрейтом.', 'Что происходит с мартингейлом без стопа на 1001-й день?', 'Катастрофическая ликвидация 100% счета', 'Он продолжит зарабатывать вечно', true, 'Черный лебедь! 100% винрейт сгорает в один миг.', 'Без стопа счет обречен.');
makeStandardCaseWidget(25, 'widget_ps_l25_brier_score', '🎯', '«Калибратор Brier Score»', 'Правило Кромвеля Дэвида Шпигельхалтера.', 'Почему 100% уверенность запрещена математикой?', 'Она блокирует восприятие новых опровергающих фактов', 'Потому что так требует биржа', true, 'Эталон калибровки! Всегда оставляй зазор на сомнение.', '100% уверенность ведет к отказу от стопа.');
makeStandardCaseWidget(26, 'widget_ps_l26_mental_thermostat', '🌡️', '«Ментальный термостат Минервини»', 'Защита выросшего счета от самосаботажа.', 'Как безопасно закрепить удвоенный депозит?', 'Вывести 20% прибыли в реал и дать 4 недели на адаптацию', 'Утроить риски немедленно', true, 'Планка термостата закреплена в реальном мире!', 'Самосаботаж быстро сольет непривычную сумму.');
makeStandardCaseWidget(27, 'widget_ps_l27_best_loser', '🛡️', '«Парадокс Best Loser Wins»', 'Инверсия чувств Тома Хоугаарда.', 'Как зарабатывать миллионы при винрейте всего 40%?', 'Быстро резать убытки (-1R) и давать прибыли расти (+3R)', 'Никогда не закрывать минус', true, 'Асимметрия выплат 3:1 дает колоссальный плюс!', 'Отказ резать минус гарантирует слив.');
makeStandardCaseWidget(28, 'widget_ps_l28_clarity_detector', '🔍', '«Детектор Ясности»', 'План важнее прогнозов.', 'Что дает Чек-лист Ясности перед сделкой?', 'Четкое понимание точки отмены и размера допустимого риска', '100% гарантию роста цены', true, 'Полная Ясность! Сделка безопасна для ума.', 'Рынок никому не дает гарантий.');
makeStandardCaseWidget(29, 'widget_ps_l29_premortem_sim', '✉️', '«Репетиция катастроф Pre-Mortem»', 'Разбор провала до старта реальных денег.', 'Каков главный предохранитель от ручного вмешательства?', 'Аппаратный Kill-Switch и удаление ключей с телефона', 'Надежда на силу воли', true, 'Предохранитель активирован! Система защищена.', 'Сила воли отказывает в стрессе.');
makeStandardCaseWidget(30, 'widget_ps_l30_inchworm', '🐛', '«Дюймовый червь Тендлера»', 'Рост мастерства через подтягивание худшего дня.', 'Как стабильно поднять кривую капитала?', 'Ликвидировать ошибки C-game (тильт в худшие дни)', 'Пытаться совершать чудеса в A-game', true, 'Хвост подтянут! Общий уровень мастерства вырос.', 'Чудеса не спасают при дырявой дисциплине.');
makeStandardCaseWidget(31, 'widget_ps_l31_currency_toggle', '🔲', '«Тумблер R-множителей»', 'Отключение эмоционального денежного гипноза.', 'Зачем оценивать сделки в R, а не в рублях?', 'Чтобы исключить страх и жадность бытовых цифр', 'Чтобы скрыть баланс от друзей', true, 'Денежный гипноз снят! Решения объективны.', 'R-мышление переводит ум на язык матожидания.');
makeStandardCaseWidget(32, 'widget_ps_l32_habit_breaker', '🎙️', '«Взломщик петли привычки»', 'Метод перепрошивки реакций Гари Эдварда.', 'Что дает проговаривание мыслей на диктофон перед входом?', 'Активирует логическую кору и гасит импульсивный азарт', 'Улучшает тембр голоса', true, 'Петля перепрошита! Импульс утилизирован.', 'Речь принудительно включает префронтальную кору.');
makeStandardCaseWidget(33, 'widget_ps_l33_sabermetrics_dash', '📊', '«Саберметрический дашборд Moneyball»', 'Оцифровка дисциплины Бретта Стинбарджера.', 'Что такое Process Score?', 'Процент решений, принятых строго по регламенту устава', 'Сумма заработанных рублей за день', true, 'Process Score > 95% гарантирует долгосрочный успех!', 'PnL одного дня случаен, процесс под контролем.');
makeStandardCaseWidget(34, 'widget_ps_l34_regimes_classifier', '🔄', '«Классификатор режимов рынка»', 'Адаптация к смене волатильности.', 'Рынок ушел в узкий флэт. Что делать с трендовой системой?', 'Признать смену режима и снизить торговую активность', 'Злиться на себя и удваивать сделки', true, 'Грамотная квант-адаптация к режиму рынка!', 'Навязывание тренда флэту сожжет депозит.');
makeStandardCaseWidget(35, 'widget_ps_l35_capital_fortress', '🏰', '«Крепость капитала 40/40/20»', 'Архитектура независимости счета.', 'Зачем нужна подушка безопасности 40% вне рынка?', 'Чтобы торговый депозит не нес бремя бытового выживания', 'Чтобы платить больше налогов', true, 'Крепость неприступна! Торговля без страха голода.', 'Торговля на последние деньги обречена на страх.');
makeStandardCaseWidget(36, 'widget_ps_l36_munger_tennis', '🎾', '«Любительский теннис Чарли Мангера»', 'Стратегия инверсии и избегания глупостей.', 'Как победить в инвестиционной игре Мангера?', 'Избегать глупых невынужденных ошибок и соблюдать устав', 'Пытаться угадывать каждый разворот цены', true, 'Мангеровская мудрость: будь стабильно не-глупым!', 'Попытка быть гением ведет к катастрофам.');
makeStandardCaseWidget(37, 'widget_ps_l37_rich_vs_wealthy', '🏎️', '«Богатый против Состоятельного»', 'Философия Моргана Хаузела.', 'В чем суть Состоятельности (Wealth)?', 'В непотраченных деньгах, дающих автономию времени', 'В покупке предметов роскоши напоказ', true, 'Истина Хаузела! Состоятельность — это свобода.', 'Показуха разрушает финансовую защиту.');
makeStandardCaseWidget(38, 'widget_ps_l38_dentist_taleb', '📱', '«Проблема стоматолога Талеба»', 'Фильтрация эмоционального шума котировок.', 'Почему вредно смотреть график каждую минуту?', '90% минутных движений — шум, причиняющий ложную боль потерь', 'Потому что садится батарея телефона', true, 'Шум отфильтрован! Редкий осмотр бережет ум.', 'Частый просмотр ведет к микро-тильту.');
makeStandardCaseWidget(39, 'widget_ps_l39_enough_sequoia', '🌲', '«Секвойя Сложного Процента»', 'Планка «Достаточно» и сложный процент.', 'Каково главное условие роста дерева капитала?', 'Никогда не прерывать сложный процент из-за риска разорения', 'Забирать 100% прибыли каждый день', true, 'Секвойя капитала выросла в миллионы!', 'Разорение обнуляет сложный процент навсегда.');
makeStandardCaseWidget(40, 'widget_ps_l40_freedom_calc', '⏳', '«Калькулятор покупки свободы»', 'Время важнее графиков.', 'Какова цель алго-автоматизации?', 'Освобождение 2000+ часов времени в год для жизни', 'Круглосуточное рабство перед монитором', true, 'Свобода времени куплена! ⏳', 'Система создается для жизни.');

// П41–П48 (Продвинутые мастер-классы)
makeStandardCaseWidget(41, 'widget_ps_l41_stress_lab', '🧪', '«Лаборатория стресс-тестирования»', 'Торговля под нарастающим давлением и шумом.', 'Зачем проходить симулятор стресса?', 'Чтобы выработать автоматическое выполнение чек-листа в кризисе', 'Чтобы пощекотать нервы', true, 'Стресс-тест пройден! Паника переведена в автоматизм.', 'Симулятор спасает депозит от ступора в шторме.');
makeStandardCaseWidget(42, 'widget_ps_l42_capital_scale', '👑', '«Шкала веса капитала»', 'Управление крупными суммами и синдром самозванца.', 'Как не сломаться при росте счета в 10 раз?', 'Скрывать баланс в рублях и масштабироваться ступенями по +20%', 'Немедленно купить дорогую машину', true, 'Масштаб взят! Психика адаптирована к весу нулей.', 'Резкий скачок размера позиции вызывает ступор и слив.');
makeStandardCaseWidget(43, 'widget_ps_l43_social_shield', '🛡️', '«Социальный щит трейдера»', 'Защита от советов друзей и тревоги семьи.', 'Как реагировать на вопросы некомпетентных знакомых?', 'Отвечать спокойным нейтральным скриптом об алгоритмическом регламенте', 'Хвастаться скриншотами и брать деньги в долг', true, 'Броня выдержала! Эмоциональный нейтралитет сохранен.', 'Хвастовство включает тяжелейшее социальное эго.');
makeStandardCaseWidget(44, 'widget_ps_l44_bias_journal', '📓', '«Дневник когнитивных искажений»', 'Автоматическая классификация персональных ошибок.', 'Что делать при повторении одной и той же ошибки 3 раза?', 'Внедрить жесткий аппаратный запрет в код торгового бота', 'Пообещать себе быть внимательнее', true, 'Ловушка обезврежена электронным капканом!', 'Обещания себе не работают во время адреналина.');
makeStandardCaseWidget(45, 'widget_ps_l45_liquidity_trap', '🚪', '«Психология ликвидности»', 'Паника запертого объема в пустом стакане.', 'Что делать, если в неликвидной монете исчезли покупатели?', 'Выходить частями лимитными ордерами по регламенту', 'Нажать Market Sell на всю котлету', true, 'Хладнокровный выход спас от катастрофического слиппеджа!', 'Рыночный ордер в пустом стакане сжигает десятки процентов.');
makeStandardCaseWidget(46, 'widget_ps_l46_risk_officer', '👮', '«Симулятор Риск-Офицера»', 'Внешний надзор и разделение полномочий проп-фонда.', 'Зачем нужен независимый риск-офицер?', 'Принудительно отстранить трейдера от торгов при лимите дня', 'Подсказывать точки входа', true, 'Риск-офицер спас компанию от ликвидации!', 'Трейдер в тильте не способен остановить себя сам.');
makeStandardCaseWidget(47, 'widget_ps_l47_burnout_shield', '🔋', '«Протокол перезагрузки 24/7»', 'Защита нервной системы от выгорания.', 'Что является главным спасением от крипто-выгорания?', 'Обязательный 48-часовой цифровой блэкаут раз в неделю', 'Энергетические напитки и ночные графики', true, 'Батарея восстановлена! Дофаминовые рецепторы спасены.', 'Торговля без отдыха ведет к фатальному сливу.');
makeStandardCaseWidget(48, 'widget_ps_l48_final_manifesto', '📜', '«Манифест и Клятва Оператора»', 'Торжественное посвящение в мастера квант-трейдинга.', 'Каков высший закон Оператора Системы?', 'Безупречность исполнения процесса выше сиюминутного PnL', 'Стремление угадать каждую свечу', true, 'Клятва Оператора принята! Выпущен мастер дисциплины 🏛️🎓', 'Мастерство — в безупречности исполнения правил.');

// П49–П52 (Школа Уолл-стрит Брента Доннелли)
makeStandardCaseWidget(49, 'widget_ps_l49_alpha_paradox', '⚖️', '«Балансир Альфа-Трейдера Доннелли»', 'Великий парадокс риска и дисциплины.', 'Каково главное сочетание качеств Альфа-Трейдера?', 'Терпеливое снайперское ожидание и смелая решительная атака при сигнале', 'Страх любых сделок и отказ от риска', true, 'Баланс Альфа-Трейдера найден! ⚖️', 'Любовь к риску без дисциплины ведет к казино.');
makeStandardCaseWidget(50, 'widget_ps_l50_conviction_tiers', '🎯', '«Калькулятор убежденности Доннелли»', 'Трехуровневая модель сайзинга (0.5R — 3.0R).', 'Какой сайз ставить на сделку Типа III (макро + сентимент + стакан)?', 'Максимальный агрессивный размер 2.5R–3.0R', 'Всегда фиксированный 1.0R', true, 'Сайзинг Доннелли рассчитан! Доходность максимизирована 🎯', 'Фиксированный сайз на идеальные идеи снижает матожидание.');
makeStandardCaseWidget(51, 'widget_ps_l51_narrative_cycle', '🗞️', '«Детектор перегретого нарратива»', 'Индикатор обложки Time Magazine.', 'О монете написали в глянцевом журнале и говорят в метро. Что делать?', 'Фиксировать прибыль или искать разворот: нарратив перегрет толпой', 'Срочно покупать на всю котлету', true, 'Ловушка обложки раскрыта! Защита от перегруженной толпы 🗞️', 'Покупка на хайпе СМИ гарантирует покупку на хаях.');
makeStandardCaseWidget(52, 'widget_ps_l52_trade_lifecycle', '🧭', '«Жизненный цикл сделки Доннелли»', '4 шага институционального ведения позиции.', 'Что делать, если новостной драйвер входа отменен, но стоп не задет?', 'Немедленно закрыть сделку по триггеру переоценки', 'Надеяться и ждать стоп-лосса', true, 'Жизненный цикл сделки завершен по уставу Уолл-стрит! 🧭', 'Держать сделку при отмене драйвера — ошибка любителя.');
"""

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write(widget_js)

print("Generated all 44 widget functions in tools/psy_widgets_ext.js")
