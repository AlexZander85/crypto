/* =========================================================================
   КРИПТОНАВИГАТОР v12.4 · ЭТАП 2 · Тесты, экзамены и карточки в плеере «🎓 Обучение»
   Продолжение того же IIFE (learn_player_js): переиспользует каркас Этапа 1
   (окно, шапка, фокус-трап, Esc, темы/шрифт, помодоро, шов нейтрализации).
   Инварианты (ТЗ §11, патч-план §0):
   • контент заморожен — плеер только читает банки;
   • запись результата — ТОЛЬКО существующие функции (calcPhaseTestResult,
     finishMathTest); прямых записей в phaseTestsDone/mathTestState нет;
   • ответы на живые вопросы — только onclick существующих функций;
   • вывод результата — через перехват alert (§11.4, 4 точки, см. правки);
   • пороги для отображения — той же формулой ceil(n*rate), источник истины —
     существующие функции.
   ========================================================================= */

/* ============================== СОСТОЯНИЕ ТЕСТА ============================== */
var TS = {
  active: false,
  testId: null,
  bank: null,            // резолв {testId,kind,ph?,ti?,bank,title,questions,testKey,diag}
  kind: 'phase',         // 'phase' | 'math' | 'diag'
  ph: null, ti: null,
  steps: [],             // порции + шаг-врата
  idx: 0,
  visited: {},
  mode: 'pass',          // 'pass' | 'review'
  draft: null,           // A17: {testId, ph?, ti?, salt?, pos, answers?, numeric?, touched?, updatedTs}
  view: null,            // перемешанный вид фазовых/диагностики (контракт window._ptView[ph])
  from: 'tests',         // 'tests' | 'math' | 'home' | 'inplayer'
  switchedInPlace: false,// открыто при живой сессии урока — возврат подложки каркаса Этапа 1
  submitted: false,
  result: null,          // display-подсчёт попытки {correct,total,required,passed,cum…}
  _cumShown: false
};
var _lastTestResultText = null; // приёмник перехваченных alert (§11.4)

/* ============================== РЕЗОЛВ БАНКОВ ============================== */
function resolveBank(testId){
  try{
    if(testId === 'capstone'){
      return { testId:'capstone', kind:'phase', ph:6, bank:CAPSTONE_EXAM, title:CAPSTONE_EXAM.title,
        questions:CAPSTONE_EXAM.questions, testKey:'exam_capstone', diag:false };
    }
    if(String(testId).indexOf('math_') === 0){
      var ti = -1;
      for(var i = 0; i < MATH_TESTS.length; i++){ if(MATH_TESTS[i].id === testId){ ti = i; break; } }
      if(ti < 0) return null;
      return { testId:testId, kind:'math', ti:ti, bank:MATH_TESTS[ti], title:MATH_TESTS[ti].title,
        questions:MATH_TESTS[ti].questions, testKey:null, diag:false };
    }
    if(testId === 'literacy'){ /* A16: поверхности нет — диагностический режим */
      return { testId:'literacy', kind:'diag', bank:CRYPTO_LITERACY_EXAM, title:'Диагностика: грамотность Фазы 0',
        questions:CRYPTO_LITERACY_EXAM.questions, testKey:null, diag:true };
    }
    if(testId === 'psy_cum'){ /* A16: банка-объекта нет, только массив вопросов */
      return { testId:'psy_cum', kind:'diag', bank:{ title:'Накопительная психология' }, title:'Диагностика: накопительная психология',
        questions:PSY_CUMULATIVE_QUESTIONS, testKey:null, diag:true };
    }
    var m = /^p(\d+)$/.exec(String(testId));
    if(m){
      var ph = parseInt(m[1], 10);
      var t = PHASE_TESTS.find(function(x){ return x.phase === ph; });
      if(!t) return null;
      return { testId:testId, kind:'phase', ph:ph, bank:t, title:t.title,
        questions:t.questions, testKey:'p' + ph, diag:false };
    }
  }catch(e){ console.warn('[LearnPlayer2] resolveBank', e); }
  return null;
}

/* Дословный контракт window._ptView (18171–18174) */
function buildPtView(test, salt){
  return test.questions.map(function(q, qi){
    var sv = shuffledOptions(q, salt * 1000 + qi);
    return Object.assign({}, q, { opts: sv.opts, a: sv.a, explain: sv.explain });
  });
}

/* ============================== ПОРЦИИ (P2) ============================== */
function buildTestSteps(n){
  var steps = [], per = 5;
  for(var qi = 0; qi < n; qi += per){
    var qs = [];
    for(var j = qi; j < Math.min(qi + per, n); j++) qs.push(j);
    steps.push({ kind:'portion', qs:qs, title:'Вопросы ' + (qs[0] + 1) + '–' + (qs[qs.length - 1] + 1), icon:'❓' });
  }
  steps.push({ kind:'gate', title:'Сдать тест', icon:'🏁' });
  return steps;
}

/* ============================== ЧЕРНОВИК (A17, LS cn_learn_test) ============================== */
function testDraftGet(){ return lpLS_get('cn_learn_test', null); }
function testDraftSet(d){ d.updatedTs = Date.now(); lpLS_set('cn_learn_test', d); }
function testDraftClear(){ try{ localStorage.removeItem('cn_learn_test'); }catch(e){} }

function tsIsAnswered(qi){
  if(TS.kind === 'math') return !!(TS.draft.touched && TS.draft.touched[qi]);
  return !!(TS.draft.answers && TS.draft.answers[qi] !== undefined) ||
         !!(TS.draft.numeric && TS.draft.numeric[qi] !== undefined);
}
function tsAnsweredCount(){
  if(!TS.draft) return 0;
  if(TS.kind === 'math') return Object.keys(TS.draft.touched || {}).length;
  return Object.keys(TS.draft.answers || {}).length + Object.keys(TS.draft.numeric || {}).length;
}
function portionAnswered(st){
  var a = 0;
  st.qs.forEach(function(qi){ if(tsIsAnswered(qi)) a++; });
  return a;
}
/* display-корректность отдельного вопроса (только для карты/разбора; истина — существующие функции) */
function tsIsCorrect(qi){
  try{
    if(TS.kind === 'math'){
      var st = mathTestState[TS.ti];
      if(!st || !st.answers || st.answers[qi] === undefined) return false;
      var q = MATH_TESTS[TS.ti].questions[qi];
      var sh = shuffledOptions(q, qi * 17 + 3 + TS.ti * 9);
      return st.answers[qi] === sh.a;
    }
    var q = TS.view[qi];
    if(q.type === 'numeric'){
      var v = TS.draft.numeric ? TS.draft.numeric[qi] : undefined;
      if(v === undefined) return false;
      var tol = q.absTol !== undefined ? q.absTol : Math.abs(q.answer) * (q.tolPct || 2) / 100;
      return Math.abs(v - q.answer) <= tol;
    }
    var c = TS.draft.answers ? TS.draft.answers[qi] : undefined;
    return c !== undefined && c === q.a;
  }catch(e){ return false; }
}
function portionAllCorrect(st){
  var ok = true;
  st.qs.forEach(function(qi){ if(!tsIsCorrect(qi)) ok = false; });
  return ok;
}

/* ============================== НОВАЯ ПОПЫТКА ============================== */
function newAttempt(r){
  var d = { testId: r.testId, pos: 0 };
  TS._cumShown = false;
  if(r.kind === 'phase'){
    var salt = nextShuffleSalt();
    d.ph = r.ph; d.salt = salt; d.answers = {}; d.numeric = {};
    window._ptView = window._ptView || {};
    window._ptView[r.ph] = buildPtView(r.bank, salt);   // дословный контракт 18171–18174
    TS.salt = salt; TS.view = window._ptView[r.ph];
    window._ptStart = window._ptStart || {};
    window._ptStart[r.ph] = Date.now();                  // спидран-паритет (E8)
  } else if(r.kind === 'math'){
    d.ti = r.ti; d.touched = {};
    TS.salt = null; TS.view = null;
  } else {
    var salt2 = nextShuffleSalt();
    d.salt = salt2; d.answers = {};
    TS.salt = salt2;
    TS.view = buildPtView({ questions: r.questions }, salt2);
  }
  TS.draft = d;
  testDraftSet(d);
}

function restartAttempt(){
  var r = TS.bank;
  if(TS.kind === 'math'){
    /* mathTestState НЕ сбрасываем (запись чужого стейта запрещена): возврат к
       порции 1, ответы перезаписываются заново; Math.max-семантика сохранена */
    TS.draft = { testId: TS.testId, ti: TS.ti, pos: 0, touched: {} };
    testDraftSet(TS.draft);
  } else {
    newAttempt(r);
  }
  TS.visited = {};
  renderTestStep(0);
}

/* ============================== ОТКРЫТИЕ (P1) ============================== */
function openTest(testId, from){
  var r = resolveBank(testId);
  if(!r){ toast('Тест не найден: ' + testId, '🏁'); return; }
  if(FC.active) fcExit();
  if(S.active && S.root){
    /* плеер уже открыт — переключение режима на месте (позиция урока уже в cn_learn_pos) */
    if(TS.active && TS.testId === testId && TS.mode === 'pass') return;
    if(!TS.active) TS.switchedInPlace = true; // исходный контекст входа (ридер/каталог) сохраняется
    TS.from = 'inplayer';
    startTestSession(r);
    return;
  }
  TS.from = from || 'tests';
  TS.switchedInPlace = false;
  openTestWindow(r);
}

function openTestWindow(r){
  S.entryEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  S.savedOverflow = document.body.style.overflow || '';
  S.active = true;
  window.LEARN_PLAYER_ACTIVE = true;
  S.lessonId = null;
  S.steps = []; S.idx = 0; S.visited = {};
  S.wasDone = false; S.completedCalled = false;
  S.startTs = Date.now();
  S.root = buildRoot({ title: r.title });
  applyTheme();
  document.body.appendChild(S.root);
  document.body.style.overflow = 'hidden';
  contentEl = S.root.querySelector('.learn-content');
  /* Шов: нейтрализация подложки (#lessonContentBox и #phaseTestBox) + страж */
  neutralizeBoxes();
  startBoxGuard();
  S.root.addEventListener('keydown', onKeydown, true); // capture: Esc не проходит под плеер
  S.root.addEventListener('keydown', onKeydownTab, false);
  S.root.addEventListener('click', rootClick);
  attachSwipe();
  watchAppTheme();
  startPomoTimer();
  startTestSession(r);
  try{ var cb = S.root.querySelector('[data-lp-act="close"]'); if(cb) cb.focus(); }catch(e){}
}

function startTestSession(r){
  TS.active = true;
  TS.testId = r.testId; TS.kind = r.kind;
  TS.ph = (r.kind === 'phase') ? r.ph : null;   // ph=0 валиден (фаза 0) — без «|| null»
  TS.ti = (r.kind === 'math') ? r.ti : null;
  TS.bank = r; TS.mode = 'pass'; TS.result = null; TS.submitted = false;
  TS._lastText = null;
  _lastTestResultText = null;
  TS.steps = buildTestSteps(r.questions.length);
  TS.visited = {};
  var d = testDraftGet();
  var valid = !!(d && d.testId === r.testId);
  if(valid && TS.kind === 'phase'){
    /* resume: _ptView пересобирается из СОХРАНЁННОЙ соли (A17) — раскладка та же */
    TS.draft = d; TS.salt = d.salt;
    window._ptView = window._ptView || {};
    window._ptView[r.ph] = buildPtView(r.bank, d.salt);
    TS.view = window._ptView[r.ph];
    window._ptStart = window._ptStart || {};
    if(!window._ptStart[r.ph]) window._ptStart[r.ph] = Date.now(); // ghost от resume — известная грань (в отчёт)
    TS._cumShown = false;
  } else if(valid && TS.kind === 'math'){
    TS.draft = d; TS.salt = null; TS.view = null; TS._cumShown = false;
  } else if(valid && TS.kind === 'diag'){
    TS.draft = d; TS.salt = d.salt;
    TS.view = buildPtView({ questions: r.questions }, d.salt);
    TS._cumShown = false;
  } else {
    /* новая попытка; черновик другого теста заменяется (паритет: смена чипа
       вкладки «Тесты» делает то же сегодня) — зафиксировано в отчёте */
    TS.resuming = false;
    newAttempt(r);
    renderTestStep(0);
    return;
  }
  TS.resuming = (d.pos || 0) > 0 ||
    (TS.kind === 'math' ? Object.keys(d.touched || {}).length > 0 : tsDraftAnswered(d) > 0);
  var startPos = Math.min(d.pos || 0, TS.steps.length - 1);
  /* пройденные порции (0..pos) доступны в карте после resume */
  for(var vi = 0; vi <= startPos; vi++) TS.visited[vi] = true;
  renderTestStep(startPos, { skipDraftPos: true });
  if(TS.resuming) showTestResumeDialog();
}
function tsDraftAnswered(d){
  return Object.keys(d.answers || {}).length + Object.keys(d.numeric || {}).length;
}

function showTestResumeDialog(){
  var answered = tsAnsweredCount();
  var ov = document.createElement('div');
  ov.className = 'learn-overlay'; ov.setAttribute('data-ov', 'test-resume');
  ov.innerHTML = '<div class="learn-sheet"><h3>Продолжить попытку?</h3>' +
    '<div style="color:var(--mut);margin-bottom:16px">«' + esc(TS.bank.title) + '» — в черновике отвечено ' +
    answered + ' из ' + TS.bank.questions.length + '.</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button type="button" class="lp-btn primary" data-lp2-resume="1">▶ Продолжить (' + answered + '/' + TS.bank.questions.length + ')</button>' +
    '<button type="button" class="lp-btn ghost" data-lp2-resume="0">⟲ Начать заново</button></div></div>';
  ov.addEventListener('click', function(e){
    var b = e.target.closest('[data-lp2-resume]');
    if(!b) return;
    ov.remove();
    if(b.getAttribute('data-lp2-resume') !== '1'){ TS.resuming = false; restartAttempt(); }
  });
  S.root.appendChild(ov);
}

/* ============================== ЗАКРЫТИЕ / ПЕРЕКЛЮЧЕНИЕ ============================== */
function testTeardown(){
  removeStaging();
  TS.active = false; TS.bank = null; TS.steps = []; TS.idx = 0; TS.visited = {};
  TS.draft = null; TS.view = null; TS.mode = 'pass'; TS.submitted = false; TS.result = null;
  TS.resuming = false;
  _lastTestResultText = null;
}
function removeStaging(){
  var s = document.getElementById('lp_test_staging');
  if(s) s.remove();
}

/* Приёмник перехваченных alert (§11.4). Текст не меняется; при активной
   сессии теста он попадёт на экран результата, иначе — тост (не потеряется). */
function onTestResult(text){
  _lastTestResultText = String(text === undefined ? '' : text);
  TS._lastText = _lastTestResultText;
  if(!TS.active) toast(_lastTestResultText, '🏁');
}
