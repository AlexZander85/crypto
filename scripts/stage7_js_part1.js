/* ============================================================
   learn_player_stage7: ЭТАП 7 — Часть 1.
   P1-1: контекст Ментора в тестовом режиме (закрывает §5.4.1).

   Было: в тестовом режиме (Этап 2) ветка mentor в rootClick
   передавала S.lessonId — он пуст, панель открывалась «в вакууме»:
   заголовок «Урок: общий», _mentorLessonId = null, шаговой
   карточки Этапа 4 нет (lp4StepCtx честно возвращает null —
   порции теста не материал урока). Наставник не знал, что
   ученик сдает «Тест Фазы 1, вопросы 6–10».
   Стало: обёртка window.mentorOpenPanel (поверх обёртки Этапа 4,
   rootClick не тронут) подставляет
     lessonId || (TS.active && TS.kind !== 'math' ? TS.testId : 'generic')
   и вставляет в панель карточку «Наставник видит тест»: тип банка,
   название, текущая порция (номер + диапазон вопросов) или шаг
   сдачи (отвечено X из Y) или результат попытки. Код наставника,
   лимиты и фильтры не тронуты (§5.5/§11.9) — v10-панель толерантна
   к произвольным id (проба: «Урок: capstone», 13 действий, 0 крахов).
   ============================================================ */

function lp7Esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

var _lp7MentorOpen = window.mentorOpenPanel;
window.mentorOpenPanel = function(lessonId, stepCtx){
  try{
    if(lessonId == null || lessonId === ''){
      var inTest = false;
      try{ inTest = !!(typeof TS !== 'undefined' && TS && TS.active); }catch(eT){}
      lessonId = (inTest && TS.kind !== 'math' && TS.testId) ? TS.testId : 'generic';
    }
  }catch(e0){}
  var r = (arguments.length >= 2)
    ? _lp7MentorOpen.call(this, lessonId, stepCtx)
    : _lp7MentorOpen.call(this, lessonId);
  try{ lp7InjectTestCtx(); }catch(e1){}
  return r;
};
window.mentorOpenPanel.__lp7 = true;
/* переносим флаги предыдущего звена цепочки (напр. __lp4wrapped — selfTest Э4) */
try{
  Object.keys(_lp7MentorOpen).forEach(function(k){
    try{ if(!(k in window.mentorOpenPanel)) window.mentorOpenPanel[k] = _lp7MentorOpen[k]; }catch(e2){}
  });
}catch(e3){}

/* Описание текущего состояния теста для карточки в панели */
function lp7TestKicker(){
  try{
    if(typeof TS === 'undefined' || !TS || !TS.active) return null;
    var k = TS.kind === 'math' ? '🧮 Мат-тест факультатива'
      : (TS.kind === 'diag' ? '🔬 Диагностика' : '📝 Аттестация фазы ' + TS.ph);
    var t = (TS.bank && TS.bank.title) ? String(TS.bank.title) : '';
    return t ? (k + ' · ' + t) : k;
  }catch(e){ return null; }
}

function lp7TestDetail(){
  try{
    if(TS.submitted && TS.result){
      return 'Результат попытки: ' + TS.result.correct + ' из ' + TS.result.total +
        (TS.result.required !== undefined ? ' (порог ' + TS.result.required + ')' : '');
    }
    var st = (TS.steps && TS.steps.length) ? TS.steps[TS.idx] : null;
    if(st && st.qs){
      return 'Порция ' + (TS.idx + 1) + ' из ' + (TS.steps.length - 1) +
        ' · вопросы ' + (st.qs[0] + 1) + '–' + (st.qs[st.qs.length - 1] + 1);
    }
    if(st && st.kind === 'gate'){
      var ans = -1;
      try{ ans = tsAnsweredCount(); }catch(eA){}
      var total = (TS.bank && TS.bank.questions) ? TS.bank.questions.length : -1;
      return 'Шаг сдачи' + (ans >= 0 && total > 0 ? ' · отвечено ' + ans + ' из ' + total : '');
    }
    return '';
  }catch(e){ return ''; }
}

function lp7InjectTestCtx(){
  try{
    if(typeof TS === 'undefined' || !TS || !TS.active) return;
    if(!document.getElementById('mentor_panel')) return;
    var old = document.getElementById('lp7_mentor_test');
    if(old) old.remove();
    var actions = document.getElementById('mentor_actions');
    if(!actions) return;
    var kick = lp7TestKicker() || 'Тест';
    var detail = lp7TestDetail();
    var card = document.createElement('div');
    card.id = 'lp7_mentor_test';
    card.style.cssText = 'margin:0 0 10px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(127,127,127,.07)';
    card.innerHTML = '<div style="font-size:11px;color:var(--mut);line-height:1.55">Наставник видит тест: ' +
      '<b style="color:var(--txt)">' + lp7Esc(kick) + '</b>' +
      (detail ? '<br>' + lp7Esc(detail) : '') + '</div>';
    actions.parentNode.insertBefore(card, actions);
  }catch(e){}
}
