/* ============================================================
   learn_player_stage5: ЭТАП 5 (БЭКЛОГ) — Часть 2.
   Накопитель ошибок на тестовые банки + персистентность _ptStart.
   ------------------------------------------------------------
   Было (Этап 4): накопитель cn_learn_mist вёл только аттестационные
   квизы уроков; спидран-таймер _ptStart жил в памяти страницы —
   после перезагрузки стартовал заново (ghost, находка №13).
   Стало:
   1) неверные ответы фазовых тестов, мат-тестов и капстоуна при
      СДАЧЕ попытки попадают в тот же накопитель: ключ — testId
      банка ('p0'…'exam_capstone'…); диагностики не считаются
      (паритет с lp3FirstUnpassedBank: диагностика — не «несдано»);
      подсчёт — по факту сдачи (total − correct), правки ответов
      в черновике не раздувают счётчик;
   2) на экране результата теста — карточка рекомендации по образцу
      Этапа 4 (≥3 неверных всего, честная пометка «с учётом прошлых
      попыток»), CTA на существующий адаптивный контур + «Не
      напоминать»; ADAPTIVE_QUESTION_BANK не тронут (§11.9);
   3) cn_pt_start = { phaseNum: startTs } — читается при новой
      попытке (ридер-фикс №13a/13b) и при resume плеера: таймер
      продолжается, а не стартует заново; после сдачи — 0.
   Новые LS-ключи: cn_pt_start. Существующие функции не редактируются
   (обёртки newAttempt / startTestSession / submitTest / testResultHtml /
   openTest ×2 / LearnPlayer._goAdaptive / LearnPlayer._mistReset).
   ============================================================ */

/* ---------- cn_pt_start: чтение/запись ---------- */
function lp5PtStartLoad(){
  var s = null;
  try{ s = JSON.parse(localStorage.getItem(LP5_PT_KEY) || 'null'); }catch(e){ s = null; }
  return (s && typeof s === 'object' && !Array.isArray(s)) ? s : {};
}
function lp5PtStartPersist(ph){
  try{
    if(typeof ph !== 'number' || !isFinite(ph)) return;
    window._ptStart = window._ptStart || {};
    var s = lp5PtStartLoad();
    s[ph] = window._ptStart[ph] || 0;
    localStorage.setItem(LP5_PT_KEY, JSON.stringify(s));
  }catch(e){}
}

/* Новая попытка (в т.ч. «Начать заново»/пересдача → restartAttempt):
   после родной установки _ptStart[ph] = Date.now() — фиксируем старт. */
var _lp5NewAttempt = newAttempt;
newAttempt = function(r){
  _lp5NewAttempt.apply(this, arguments);
  try{ if(r && r.kind === 'phase') lp5PtStartPersist(r.ph); }catch(e){}
};

/* Resume (startTestSession): родной код ставит свежий Date.now(), если
   в памяти пусто (после перезагрузки — всегда). Поверх — возвращаем
   сохранённый старт из cn_pt_start (таймер продолжается, №13). */
var _lp5StartTestSession = startTestSession;
startTestSession = function(r){
  var resumePh = null;
  try{
    if(r && r.kind === 'phase'){
      var d0 = testDraftGet();
      if(d0 && d0.testId === r.testId) resumePh = r.ph;
    }
  }catch(e0){}
  _lp5StartTestSession.apply(this, arguments);
  try{
    if(resumePh !== null){
      var saved = lp5PtStartLoad()[resumePh];
      if(typeof saved === 'number' && saved > 0){
        window._ptStart = window._ptStart || {};
        window._ptStart[resumePh] = saved;
      } else {
        lp5PtStartPersist(resumePh);
      }
    }
  }catch(e){}
};

/* ---------- Накопитель на тестовые банки ---------- */
var _lp5SubmitTest = submitTest;
submitTest = function(){
  _lp5SubmitTest.apply(this, arguments);
  var rerender = false;
  try{
    if(TS && TS.active && TS.submitted && TS.result && !TS.result.diag &&
       (TS.kind === 'phase' || TS.kind === 'math') && TS.testId){
      var wrongs = (TS.result.total || 0) - (TS.result.correct || 0);
      if(wrongs > 0){
        lp4MistSet(TS.testId, lp4MistTotal(TS.testId) + wrongs);
        rerender = true; /* родной submit уже отрисовал результат ДО нашего инкремента */
      }
    }
  }catch(e){}
  try{
    /* перерисовываем экран результата, чтобы карточка рекомендации
       появилась сразу (сейчас total уже включает эту попытку) */
    if(rerender && typeof renderTestStep === 'function') renderTestStep(TS.idx);
  }catch(e2){}
};

/* Склонение «ответ»: 1 ответ · 2–4 ответа · 5+ ответов */
function lp5AnsPlural(n){
  var d = n % 10, h = n % 100;
  if(d === 1 && h !== 11) return 'ответ';
  if(d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'ответа';
  return 'ответов';
}

/* Карточка рекомендации на экране результата (образец — lp4RecommendCard).
   Показ по НАКОПЛЕННОМУ итогу ≥3 (как на финале урока); диагностики без
   карточки. CTA несёт testId — сброс именно тестового счётчика. */
var _lp5TestResultHtml = testResultHtml;
testResultHtml = function(){
  var h = _lp5TestResultHtml.apply(this, arguments);
  try{
    if(TS && TS.active && TS.testId && (TS.kind === 'phase' || TS.kind === 'math')){
      var total = lp4MistTotal(TS.testId);
      if(total >= LP4_THRESHOLD){
        var wrongs = TS.result ? ((TS.result.total || 0) - (TS.result.correct || 0)) : 0;
        var hist = total > wrongs ? ' (всего ' + total + ' с учётом прошлых попыток)' : '';
        h += '<div class="learn-card warn" id="lp5_test_rec" style="max-width:560px;margin:16px auto 0;padding:14px 18px;text-align:left">' +
          '<div style="font-weight:800;margin-bottom:6px">🔄 Тест дался непрочно (' + wrongs + ' неверн' + (wrongs === 1 ? 'ый' : 'ых') + ' ' + lp5AnsPlural(wrongs) + ' за попытку)' + hist + '</div>' +
          '<div style="font-size:calc(var(--lp-fs) - 5px);color:var(--mut);line-height:1.55;margin-bottom:10px">Счётчик сохраняется между сессиями. Запусти адаптивную тренировку — она подберёт вопросы по слабым темам из существующего банка и закрепит материал.</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
            '<button type="button" class="lp-btn primary" onclick="LearnPlayer._goAdaptive(\'' + attr(TS.testId) + '\')">🔄 Пройти адаптивную тренировку по этой теме</button>' +
            '<button type="button" class="lp-btn ghost" onclick="LearnPlayer._mistReset(\'' + attr(TS.testId) + '\')">Не напоминать</button>' +
          '</div></div>';
      }
    }
  }catch(e){}
  return h;
};

/* CTA с testId: сброс ТЕСТОВОГО счётчика (путь урока — в обёртке Этапа 4
   без изменений; в тестовом режиме S.lessonId = null, там сброса нет). */
var _lp5GoAdaptive = window.LearnPlayer._goAdaptive;
window.LearnPlayer._goAdaptive = function(testId){
  var r = _lp5GoAdaptive.apply(this, arguments);
  try{ if(typeof testId === 'string' && testId && lp4MistTotal(testId) > 0) lp4MistSet(testId, 0); }catch(e){}
  return r;
};

/* «Не напоминать» в тестовом режиме: сброс + перерисовка экрана результата
   (карточка исчезает сразу). Путь урока — существующая обёртка Этапа 4. */
var _lp5MistReset = window.LearnPlayer._mistReset;
window.LearnPlayer._mistReset = function(lid){
  try{
    if(typeof TS !== 'undefined' && TS && TS.active && TS.testId === lid){
      lp4MistSet(lid, 0);
      if(typeof renderTestStep === 'function') renderTestStep(TS.idx);
      toast('Счётчик ошибок теста сброшен', '🔄');
      return;
    }
  }catch(e0){}
  return _lp5MistReset.apply(this, arguments);
};

/* ---------- Недавние тесты: обе точки входа ----------
   1) внутренняя связка openTest — её вызывают пикер 🏁 и код плеера;
   2) window-экспорт LearnPlayer.openTest — его вызывают хаб, финалы
      уроков и onclick-кнопки. Пуш ровно один: window-цепочка Этапа 3
      держит ссылку на исходную функцию, внутренней обёртки не дублируя. */
var _lp5OpenTestInner = openTest;
openTest = function(testId, from){
  try{ lp5PushRecentTest(testId); }catch(e){}
  return _lp5OpenTestInner.apply(this, arguments);
};
var _lp5OpenTestExport = window.LearnPlayer.openTest;
window.LearnPlayer.openTest = function(testId, from){
  try{ lp5PushRecentTest(testId); }catch(e){}
  return _lp5OpenTestExport.apply(this, arguments);
};

/* Публичный API Этапа 5 (приёмка/диагностика) */
window.LearnPlayer._recentTests = lp5RecentTestsAll;
window.LearnPlayer._ptStartStore = lp5PtStartLoad;
