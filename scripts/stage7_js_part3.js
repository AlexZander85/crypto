/* ============================================================
   learn_player_stage7: ЭТАП 7 — Часть 3.
   P2-3: сертификат капстоуна в контексте плеера.
   P2-4: гейт «Завершить урок» на mobile — тост вместо молчания.

   P2-3 (проба на v12.8): сам сертификат на экране результата
   плеера ЕСТЬ ещё с Этапа 2 (P5.2: testResultHtml вставляет
   renderCapstoneCertificate при TS.ph===6 && passed; проба:
   38/38 → «СЕРТИФИКАТ КВАНТ-АРХИТЕКТОРА» на .learn-step). Пробел
   в другом: внутренняя кнопка сертификата «Перейти к достижениям»
   зовёт go('progress') — навигация происходит ПОД открытым
   плеером, ученик её не видит. Обёртка renderCapstoneCertificate:
   в контексте активной тест-сессии плеера onclick заменяется на
   «LearnPlayer.close();go('progress')» — плеер закрывается,
   подложка восстанавливается, вкладка «Прогресс» открывается
   на виду. Читательский путь (плеер закрыт) не меняется.

   P2-4: на мобильных title-подсказка заблокированной кнопки
   недоступна (нет hover), тап на <button disabled> молчит —
   непонятно, почему «Завершить урок» не работает. Решение без
   правок шаблонов (§0.1 — только обёртки):
     1) lp7UnlockGates() после каждого рендера снимает атрибут
        disabled с кнопок-гейтов (id lesson_complete_btn_* /
        lesson_bottom_complete_btn_*) и выставляет
        aria-disabled="true" (кликабельность + семантика SR);
     2) гейт переносится в обёртки completeLessonWithMastery
        (ридер) и LearnPlayer.completeLessonOnce (плеер): пока
        квиз не сдан — тост «🔒 Сначала сдайте квиз», урок НЕ
        завершается; существующие alert-гейты остаются фолбэком.
   Точки нормализации: renderStep/renderBottom (плеер),
   updateLessonCompleteBtn (шов ридера и плеера),
   openFullscreenLesson (модал ридера).
   ============================================================ */

/* ---------- P2-3: сертификат — CTA «К достижениям» закрывает плеер ---------- */
var _lp7Cert = window.renderCapstoneCertificate;
window.renderCapstoneCertificate = function(score, total){
  var h = _lp7Cert.apply(this, arguments);
  try{
    var inPlayerTest = false;
    try{
      inPlayerTest = !!(typeof S !== 'undefined' && S && S.active &&
        typeof TS !== 'undefined' && TS && TS.active);
    }catch(eP){}
    if(inPlayerTest){
      h = String(h).replace(/onclick="go\('progress'\)"/g,
        'onclick="LearnPlayer.close();go(\'progress\')"');
    }
  }catch(e){}
  return h;
};
window.renderCapstoneCertificate.__lp7 = true;

/* ---------- P2-4: нормализация кнопок-гейтов ----------
   Заблокированность определяется СОСТОЯНИЕМ урока (гейт квиза), а не
   атрибутом — иначе повторный проход нормализатора срывал aria-disabled
   с кнопки, разблокированной им же самим (клик работает, семантика теряется). */
function lp7GateLocked(lid){
  try{
    if(!lid || lessonsDone[lid]) return false;
    var l = null;
    try{ l = LESSONS.find(function(x){ return x.id === lid; }); }catch(eL){}
    var hasMastery = !!(l && l.blocks && l.blocks.some(function(b){ return b.type === 'mastery_check'; }));
    var st = (typeof lessonCheckState !== 'undefined' && lessonCheckState[lid]) || {};
    if(hasMastery) return !(st.quizDone && st.promptConfirmed);
    return !(lessonQuizPassed[lid] === true || st.quizDone === true);
  }catch(e){ return false; }
}

function lp7UnlockGates(){
  try{
    var btns = document.querySelectorAll('button[id^="lesson_complete_btn_"], button[id^="lesson_bottom_complete_btn_"]');
    for(var i = 0; i < btns.length; i++){
      var b = btns[i];
      var m = /^lesson_(?:bottom_)?complete_btn_(.+)$/.exec(b.id);
      var locked = lp7GateLocked(m ? m[1] : null);
      if(b.disabled){
        b.disabled = false;
        if(locked) b.setAttribute('aria-disabled', 'true');
      } else if(b.getAttribute('aria-disabled') === 'true' && !locked){
        b.removeAttribute('aria-disabled');
      }
    }
  }catch(e){}
}

var _lp7RenderStep = renderStep;
renderStep = function(){
  var r = _lp7RenderStep.apply(this, arguments);
  try{ lp7UnlockGates(); }catch(e0){}
  return r;
};
var _lp7RenderBottom = renderBottom;
renderBottom = function(){
  var r = _lp7RenderBottom.apply(this, arguments);
  try{ lp7UnlockGates(); }catch(e1){}
  return r;
};

var _lp7UpdateLCB = window.updateLessonCompleteBtn;
if(typeof _lp7UpdateLCB === 'function'){
  window.updateLessonCompleteBtn = function(){
    var r = _lp7UpdateLCB.apply(this, arguments);
    try{ lp7UnlockGates(); }catch(e2){}
    return r;
  };
  window.updateLessonCompleteBtn.__lp7 = true;
}

var _lp7OFSL = window.openFullscreenLesson;
if(typeof _lp7OFSL === 'function'){
  window.openFullscreenLesson = function(){
    var r = _lp7OFSL.apply(this, arguments);
    try{ lp7UnlockGates(); setTimeout(lp7UnlockGates, 60); }catch(e3){}
    return r;
  };
  window.openFullscreenLesson.__lp7 = true;
}

/* квиз отвечен верно → ридер/плеер включают кнопки напрямую, минуя
   updateLessonCompleteBtn — снимаем устаревший aria-disabled сразу */
var _lp7HQA = window.handleLessonQuizAnswer;
if(typeof _lp7HQA === 'function'){
  window.handleLessonQuizAnswer = function(){
    var r = _lp7HQA.apply(this, arguments);
    try{ lp7UnlockGates(); }catch(e4){}
    return r;
  };
  window.handleLessonQuizAnswer.__lp7 = true;
}

/* ---------- P2-4: тост на заблокированном гейте (ридер) ---------- */
var _lp7CLM = window.completeLessonWithMastery;
if(typeof _lp7CLM === 'function'){
  window.completeLessonWithMastery = function(id){
    try{
      if(id && !lessonsDone[id]){
        var state = (typeof lessonCheckState !== 'undefined' && lessonCheckState[id]) || {};
        var lesson = null;
        try{ lesson = LESSONS.find(function(x){ return x.id === id; }); }catch(eL){}
        var hasMastery = !!(lesson && lesson.blocks &&
          lesson.blocks.some(function(b){ return b.type === 'mastery_check'; }));
        if(hasMastery){
          if(!state.quizDone){ toast('Сначала сдайте квиз', '🔒'); return; }
          if(!state.promptConfirmed){ toast('Сначала подтвердите критерий приёмки урока', '🔒'); return; }
        } else {
          var quizOk = lessonQuizPassed[id] === true || state.quizDone === true;
          if(!quizOk){ toast('Сначала сдайте квиз', '🔒'); return; }
        }
      }
    }catch(e0){ /* гейт не реплицирован — работает существующий alert-путь */ }
    return _lp7CLM.apply(this, arguments);
  };
  window.completeLessonWithMastery.__lp7 = true;
}

/* ---------- P2-4: тост на заблокированном гейте (плеер) ---------- */
var _lp7Clo = window.LearnPlayer.completeLessonOnce;
window.LearnPlayer.completeLessonOnce = function(){
  try{
    var lid = S.lessonId;
    var l = lid ? lessonById(lid) : null;
    if(l && !S.completedCalled && !isDone(lid)){
      var quizOk = false;
      try{
        quizOk = lessonQuizPassed[lid] === true ||
          (lessonCheckState[lid] && lessonCheckState[lid].quizDone === true);
      }catch(eQ){}
      if(!quizOk){ toast('Сначала сдайте квиз', '🔒'); return; }
    }
  }catch(e0){}
  return _lp7Clo.apply(this, arguments);
};
window.LearnPlayer.completeLessonOnce.__lp7 = true;
