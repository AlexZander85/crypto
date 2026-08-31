/* ============================================================
   learn_player_stage7: ЭТАП 7 — Часть 2.
   P1-2: «🧑‍🏫 Проверка Фейнмана» из панели, когда поля
   #feynman_input_<lid> нет в DOM.

   Было: действие панели вызывало mentorF1, который читает
   #feynman_input_<lid>; если шаг Фейнмана не отрисован (панель
   открыта с другого шага, из хаба или после смены урока) —
   объяснение пустое и уходило в ИИ вслепую (расход лимита без
   пользы). Стало: обёртка window.mentorRun (поверх v10-цепочки):
     1) поля нет → плеер сам переходит на шаг Фейнмана
        (goTo(findStepIdx('feynman')) — вариант из рекомендации);
     2) после перехода текст всё ещё пуст (<10 симв.) → ввод
        показывается прямо в панели: для живого шага — связанное
        поле lp7_feynman_in c копированием в шаг и dispatch input
        (черновик/запрет-слова работают), для урока без видимого
        шага — поле с штатным id feynman_input_<lid> (mentorF1
        прочитает его сам);
     3) короткий ввод (<10 симв.) не отправляется в ИИ — подсказка
        без расхода лимита (паритет с кнопкой Этапа 6 на шаге).
   Контур проверки — СУЩЕСТВУЮЩИЙ mentorF1/MENTOR.ask('feynman'),
   вердикт, cn_feynman_ai, лимиты и фильтры не тронуты.
   ============================================================ */

var _lp7MentorRun = window.mentorRun;
window.mentorRun = function(action){
  if(action === 'feynman'){
    try{
      var lid0 = window._mentorLessonId;
      if(lid0){
        var ta0 = document.getElementById('feynman_input_' + lid0);
        if(!ta0){ lp7GoToFeynmanStep(lid0); ta0 = document.getElementById('feynman_input_' + lid0); }
        if(ta0 && !document.body.contains(ta0)) ta0 = null;
        var val0 = ta0 ? String(ta0.value || '').trim() : '';
        if(val0.length < 10){ lp7FeynmanPanelInput(lid0, ta0, val0); return; }
      }
    }catch(e0){}
  }
  return _lp7MentorRun.apply(this, arguments);
};
window.mentorRun.__lp7 = true;
/* переносим флаги предыдущего звена цепочки mentorRun (v10-патчи) */
try{
  Object.keys(_lp7MentorRun).forEach(function(k){
    try{ if(!(k in window.mentorRun)) window.mentorRun[k] = _lp7MentorRun[k]; }catch(e2){}
  });
}catch(e3){}

/* Плеер открыт на этом уроке (не тест) → перейти на шаг Фейнмана.
   Контур из рекомендации заказчика: LearnPlayer.open(lid, idx) —
   «точно на шаг» (goTo блокировал бы прыжок вперёд: S.visited). */
function lp7GoToFeynmanStep(lid){
  try{
    if(typeof S === 'undefined' || !S || !S.root) return;
    if(typeof TS !== 'undefined' && TS && TS.active) return;
    if(S.active && S.lessonId === lid){
      var fi = findStepIdx('feynman');
      if(S.steps[fi] && S.steps[fi].kind === 'feynman' && fi !== S.idx){
        window.LearnPlayer.open(lid, fi);
      }
    }
  }catch(e){}
}

/* Поле ввода прямо в панели (между действиями и результатом).
   Если поле уже показано в панели (штатный id) — бокс не пересобирается:
   растёт подсказка, фокус возвращается в поле, набранный текст сохранён. */
function lp7FeynmanPanelInput(lid, ta, val){
  try{
    var existing = document.getElementById('lp7_mentor_feynman');
    var own = existing ? existing.querySelector('textarea[id="feynman_input_' + lid + '"]') : null;
    if(own){
      var hint0 = document.getElementById('lp7_feynman_hint');
      if(hint0) hint0.textContent = 'Добавь ещё пару предложений — нужно хотя бы 10 символов, чтобы наставник оценил объяснение.';
      try{ own.focus(); }catch(eF){}
      return;
    }
    var prevVal = '';
    if(existing){
      var pt = existing.querySelector('textarea');
      if(pt && !val) prevVal = String(pt.value || '');
      existing.remove();
    }
    if(prevVal && !val) val = prevVal; /* набранный текст не теряется при перерисовке */
    var actions = document.getElementById('mentor_actions');
    var result = document.getElementById('mentor_result');
    if(!actions || !result) return;
    var box = document.createElement('div');
    box.id = 'lp7_mentor_feynman';
    box.style.cssText = 'margin:10px 0 4px;padding:10px 11px;border:1px dashed var(--line);border-radius:9px;background:rgba(127,127,127,.05)';
    var note = ta
      ? 'Шаг Фейнмана открыт в плеере — заполни поле там или здесь:'
      : 'Шаг Фейнмана сейчас не виден — введи объяснение прямо здесь:';
    box.innerHTML = '<div style="font-size:11px;color:var(--mut);margin-bottom:7px">🧑‍🏫 ' + lp7Esc(note) + '</div>' +
      (ta
        ? '<textarea id="lp7_feynman_in" rows="4" style="width:100%;background:#040714;border:1px solid var(--line);border-radius:8px;padding:9px;color:var(--txt);font-size:12.5px;font-family:var(--font);box-sizing:border-box"></textarea>' +
          '<button type="button" class="btn sm" style="margin-top:7px" onclick="LearnPlayer._feynmanPanelCheck(\'' + attr(lid) + '\')">🔍 Проверить</button>'
        : '<textarea id="feynman_input_' + attr(lid) + '" rows="4" style="width:100%;background:#040714;border:1px solid var(--line);border-radius:8px;padding:9px;color:var(--txt);font-size:12.5px;font-family:var(--font);box-sizing:border-box"></textarea>' +
          '<button type="button" class="btn sm" style="margin-top:7px" onclick="mentorRun(\'feynman\')">🔍 Проверить</button>') +
      '<div id="lp7_feynman_hint" style="font-size:11px;color:var(--warn);margin-top:6px" aria-live="polite"></div>';
    actions.parentNode.insertBefore(box, result);
    var field = box.querySelector('textarea');
    if(field){ field.value = val || ''; try{ field.focus(); }catch(e2){} }
  }catch(e){}
}

/* Проверка из связанного поля панели: копия → живой шаг (черновик и
   фильтры слов работают через штатный input) → существующий mentorRun */
window.LearnPlayer._feynmanPanelCheck = function(lid){
  try{
    var pv = document.getElementById('lp7_feynman_in');
    var ta = document.getElementById('feynman_input_' + lid);
    if(pv && ta && document.body.contains(ta)){
      ta.value = pv.value;
      try{ ta.dispatchEvent(new Event('input', { bubbles: true })); }catch(e0){}
    }
  }catch(e1){}
  mentorRun('feynman');
};
