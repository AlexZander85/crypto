/* ===== learn_player_stage3: Этап 3 — платформенный слой (начало) ===== */
/* =========================================================================
   КРИПТОНАВИГАТОР v12.5 · ЭТАП 3 · Learn Home, программа курса, якоря,
   поиск, конспект, недавние. Продолжение того же IIFE (learn_player_js).
   ПАТЧ-ПЛАН ЭТАПА 3 §0: НОЛЬ правок существующих функций — только чтение
   глобалов и новые LS-ключи cn_learn_recent / cn_learn_notes /
   cn_learn_syllabus. Красные линии ТЗ §0.1 соблюдены.
   ========================================================================= */

/* ============================== УТИЛИТЫ ЭТАПА 3 ============================== */
var LP3_TEST_IDS = (typeof TEST_BANK_IDS !== 'undefined' && TEST_BANK_IDS && TEST_BANK_IDS.length) ?
  TEST_BANK_IDS.slice() :
  ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p8', 'capstone', 'math_core', 'math_stats', 'math_final_map', 'literacy', 'psy_cum'];
var LP3_NOTES_MAX = 500;
var _lp3UndoNote = null; // заметка для «Вернуть» после удаления (undo-тост без confirm())

function lp3SyllabusState(){
  var s = lpLS_get('cn_learn_syllabus', {});
  return (s && typeof s === 'object') ? s : {};
}
function lp3SyllabusSet(patch){
  var s = lp3SyllabusState();
  Object.keys(patch || {}).forEach(function(k){ s[k] = patch[k]; });
  lpLS_set('cn_learn_syllabus', s);
}
function lp3DateFmt(ts){
  try{
    var d = new Date(ts || Date.now());
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' +
      ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }catch(e){ return ''; }
}

/* ---------- Формула «Курс %» — дословная реплика renderProgressStats
   (v12.4, строки 22121–22136). Расхождение с вкладкой «Прогресс» = баг
   приёмки №1 (патч-план §1.1). totalTests=6 — константа приложения,
   реплицируется как есть (§9 риски: не «чинить»). ---------- */
function learnCoursePct(){
  var totalLessons = coreLessonList().length;
  var doneLessons = coreLessonsDoneCount();
  var totalTerms = TERMS.length;
  var doneTerms = Object.values(learned).filter(function(x){ return x === 1; }).length;
  var totalTests = 6; /* константа приложения (22022-контур) — так считает вкладка «Прогресс» */
  var passedTests = 0, _k;
  for(_k in phaseTestsDone){
    if(Object.prototype.hasOwnProperty.call(phaseTestsDone, _k) && _k !== 'exam_capstone' && phaseTestsDone[_k] >= 80) passedTests++;
  }
  var capstoneScore = phaseTestsDone['exam_capstone'] || 0;
  var capstonePassed = capstoneScore >= 85;
  return Math.round(
    ((doneLessons / totalLessons) * 0.40 +
     (doneTerms / totalTerms) * 0.20 +
     (passedTests / totalTests) * 0.25 +
     (capstonePassed ? 0.15 : (capstoneScore / 100) * 0.15)) * 100
  );
}

/* ---------- Фазы (числовой порядок 0–9, §1.2–§1.3) ----------
   ⚠️ PHASES содержит фазу 8 после фазы 4 (сплайс 42760) — программа
   строится в ЧИСЛОВОМ порядке, заголовки — из PHASES по .p. */
function lp3PhaseNums(){
  var set = {};
  LESSONS.forEach(function(l){ if(typeof l.phase === 'number') set[l.phase] = true; });
  return Object.keys(set).map(function(x){ return parseInt(x, 10); }).sort(function(a, b){ return a - b; });
}
function lp3PhaseTitle(ph){
  try{
    var p = PHASES.find(function(x){ return x.p === ph; });
    if(p && p.title) return String(p.title);
  }catch(e){}
  var n = LESSONS.filter(function(l){ return l.phase === ph; }).length;
  return 'Фаза ' + ph + (n ? ' · ' + n + ' уроков' : ''); /* фолбэк §1.3 */
}
function lp3PhaseShort(ph){
  var t = lp3PhaseTitle(ph);
  return t.length > 34 ? t.slice(0, 33) + '…' : t;
}
function lp3PhaseCounts(ph){
  var ls = LESSONS.filter(function(l){ return l.phase === ph; });
  var done = 0;
  ls.forEach(function(l){ if(isDone(l.id)) done++; });
  return { done: done, total: ls.length };
}
function lp3PhasePct(ph){
  var c = lp3PhaseCounts(ph);
  return c.total ? Math.round(c.done / c.total * 100) : 0;
}
function lp3NextUnpassed(){
  for(var i = 0; i < LESSONS.length; i++){ if(!isDone(LESSONS[i].id)) return LESSONS[i]; }
  return null;
}
function lp3FirstUnpassedBank(){
  for(var i = 0; i < LP3_TEST_IDS.length; i++){
    var id = LP3_TEST_IDS[i];
    var r = null;
    try{ r = resolveBank(id); }catch(e){}
    if(!r || r.kind === 'diag') continue; // диагностики не считаются «несданными»
    if(!testBadgeFor(id)) return id;
  }
  return null;
}

/* ============================== ТЕМА ДЛЯ КОРНЕЙ ЭТАПА 3 ============================== */
function lp3SyncThemeEl(el){
  if(!el) return;
  el.setAttribute('data-lp-theme', lpLS_get('cn_learn_theme', 'app'));
  el.setAttribute('data-font', String(lpLS_get('cn_learn_font', 19)));
}

/* ============================== СОСТОЯНИЕ ХАБА ============================== */
var H = { active: false, root: null, entryEl: null, savedOverflow: '' };
var _lp3ReturnHome = false; // закрытие плеера → возврат в хаб (from:'home', §3 инвариант)

/* ============================== LEARN HOME (P1) ============================== */
var Home = {
  open: function(){
    if(H.active) return;
    if(S.active) return; /* взаимоисключаемость с окном урока (патч-план §3) */
    /* точка входа для возврата фокуса; body/пустота → фолбэк на «🎓» при закрытии */
    H.entryEl = (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) ?
      document.activeElement : null;
    H.savedOverflow = document.body.style.overflow || '';
    var root = document.createElement('div');
    root.className = 'learn-home-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Моё обучение');
    lp3SyncThemeEl(root);
    root.innerHTML = lp3HomeHtml();
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    H.root = root; H.active = true;
    root.addEventListener('keydown', lp3HomeKeydown, true);
    root.addEventListener('click', lp3HomeClick);
    root.addEventListener('input', lp3HomeInput, false);
    var si = root.querySelector('.lp3-search-in');
    if(si) si.focus();
  },
  close: function(silent){
    if(!H.active) return;
    if(H.root){ H.root.remove(); H.root = null; }
    H.active = false;
    document.body.style.overflow = H.savedOverflow || '';
    if(!silent){
      /* фокус на точку входа; если она устарела (контент перерисован) — на кнопку «🎓» шапки */
      var tgt = (H.entryEl && document.body.contains(H.entryEl)) ? H.entryEl : document.getElementById('lp_header_btn');
      if(tgt){ try{ tgt.focus(); }catch(e){} }
    }
    H.entryEl = null;
  }
};

function lp3HomeHtml(){
  var h = '<div class="lp3-top">' +
    '<div class="lp3-brand">🎓 Моё обучение</div>' +
    '<div class="lp3-top-right" style="display:flex;gap:6px;align-items:center">' +
    '<button type="button" class="lp-btn sm ghost" data-lp3-act="fsdown" aria-label="Уменьшить шрифт" title="A−">A−</button>' +
    '<button type="button" class="lp-btn sm ghost" data-lp3-act="fsup" aria-label="Увеличить шрифт" title="A+">A+</button>' +
    '<button type="button" class="lp-btn icon ghost" data-lp3-act="close" aria-label="Закрыть Моё обучение" title="Закрыть (Esc)">✕</button>' +
    '</div></div>';
  h += '<div class="lp3-body"><div class="lp3-col">';
  h += '<div class="lp3-search"><span aria-hidden="true">🔍</span>' +
    '<input type="search" class="lp3-search-in" value="" placeholder="Поиск по курсу: уроки, термины, аббревиатуры… (Ctrl+K)" aria-label="Поиск по курсу"></div>';
  h += '<div class="lp3-search-out" style="display:none" aria-live="polite"></div>';
  h += lp3ContinueHtml();
  h += '<div class="lp3-grid2">' + lp3BookmarksHtml() + lp3RecentHtml() + '</div>';
  h += lp3ProgramHtml();
  h += lp3ProgressHtml();
  h += lp3TestsHtml();
  h += lp3CardsHtml();
  h += lp3NotesSectionHtml();
  h += '</div></div>';
  return h;
}

/* ---------- «▶ Продолжить» — свежее из cn_learn_pos / cn_learn_test ---------- */
function lp3ContinueData(){
  var pos = lpLS_get('cn_learn_pos', null);
  var dr = testDraftGet();
  var posD = (pos && pos.lessonId && lessonById(pos.lessonId)) ? { kind: 'lesson', ts: pos.ts || 0, pos: pos } : null;
  var drD = (dr && dr.testId && resolveBank(dr.testId)) ? { kind: 'test', ts: dr.updatedTs || 0, draft: dr } : null;
  if(posD && drD) return drD.ts > posD.ts ? { main: drD, alt: posD } : { main: posD, alt: drD };
  if(posD) return { main: posD, alt: null };
  if(drD) return { main: drD, alt: null };
  return null;
}
function lp3ContinueHtml(){
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">▶ Продолжить</div>';
  var d = lp3ContinueData();
  if(!d){
    var l0 = lp3NextUnpassed();
    if(!l0){
      h += '<div class="lp3-card lp3-big main" style="cursor:default"><span class="t">🏅 Курс пройден полностью — все ' + LESSONS.length + ' уроков отмечены!</span>' +
        '<span class="m">Повторяй материал через тесты и карточки.</span></div>';
    } else {
      h += '<button type="button" class="lp3-card lp3-big main" data-lp3-open="' + attr(l0.id) + '">' +
        '<span class="k">▶ Начать первый непройденный урок</span>' +
        '<span class="t">Урок ' + esc(l0.num || '') + ' · ' + esc(l0.title) + '</span>' +
        '<span class="m">Фаза ' + esc(l0.phase) + ' · ≈' + parseTimeEst(l0) + ' мин</span></button>';
    }
    return h + '</section>';
  }
  var m = d.main, html = '';
  if(m.kind === 'lesson'){
    var l = lessonById(m.pos.lessonId);
    var stepsN = buildLessonSteps(l).length;
    var si = Math.min(m.pos.stepIdx || 0, stepsN - 1);
    html += '<button type="button" class="lp3-card lp3-big main" data-lp3-open="' + attr(l.id) + '" data-lp3-open-step="' + si + '">' +
      '<span class="k">▶ Продолжить урок</span>' +
      '<span class="t">Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + '</span>' +
      '<span class="m">шаг ' + (si + 1) + ' из ' + stepsN + ' · Фаза ' + esc(l.phase) + '</span></button>';
  } else {
    var rb = resolveBank(m.draft.testId);
    var a = (m.draft && rb.kind === 'math') ? Object.keys(m.draft.touched || {}).length :
      (Object.keys((m.draft && m.draft.answers) || {}).length + Object.keys((m.draft && m.draft.numeric) || {}).length);
    html += '<button type="button" class="lp3-card lp3-big main" data-lp3-test="' + attr(m.draft.testId) + '">' +
      '<span class="k">▶ Продолжить попытку</span>' +
      '<span class="t">' + esc(rb.title) + '</span>' +
      '<span class="m">отвечено ' + a + ' из ' + rb.questions.length + '</span></button>';
  }
  if(d.alt){
    if(d.alt.kind === 'lesson'){
      var l2 = lessonById(d.alt.pos.lessonId);
      html += '<div class="lp3-alt-row"><button type="button" class="lp3-card" data-lp3-open="' + attr(l2.id) + '" data-lp3-open-step="' + Math.min(d.alt.pos.stepIdx || 0, buildLessonSteps(l2).length - 1) + '">' +
        '<span class="t">✎ Черновик урока: ' + esc(l2.num || '') + ' · ' + esc(l2.title) + '</span>' +
        '<span class="m">шаг ' + ((d.alt.pos.stepIdx || 0) + 1) + '</span></button></div>';
    } else {
      var rb2 = resolveBank(d.alt.draft.testId);
      var a2 = (rb2.kind === 'math') ? Object.keys(d.alt.draft.touched || {}).length :
        (Object.keys(d.alt.draft.answers || {}).length + Object.keys(d.alt.draft.numeric || {}).length);
      html += '<div class="lp3-alt-row"><button type="button" class="lp3-card" data-lp3-test="' + attr(d.alt.draft.testId) + '">' +
        '<span class="t">🏁 Незавершённая попытка: ' + esc(rb2.title) + '</span>' +
        '<span class="m">отвечено ' + a2 + ' из ' + rb2.questions.length + '</span></button></div>';
    }
  }
  return h + html + '</section>';
}

/* ---------- Закладки + Недавние ---------- */
function lp3BookmarksHtml(){
  var bms = lpLS_get('cn_learn_bookmarks', []);
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">🔖 Закладки (' + bms.length + ')</div>';
  if(!bms.length){ h += '<div class="lp3-empty">Закладок пока нет — поставь 🔖 в шапке плеера на нужном шаге.</div>'; }
  else {
    bms.forEach(function(b, i){
      h += '<button type="button" class="lp3-card" data-lp3-bm="' + i + '">' +
        '<span class="t">' + esc(b.lessonTitle || b.lessonId) + '</span>' +
        '<span class="m">шаг ' + ((b.stepIdx || 0) + 1) + ' · ' + esc(b.stepTitle || '') + '</span></button>';
    });
  }
  return h + '</section>';
}
function lp3RecentHtml(){
  var rec = lpLS_get('cn_learn_recent', []);
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">🕘 Недавние</div>';
  var rows = [];
  (rec || []).forEach(function(r){
    var l = lessonById(r.lessonId);
    if(l) rows.push(l);
  });
  if(!rows.length){ h += '<div class="lp3-empty">История пуста — открой любой урок через программу ниже.</div>'; }
  else {
    rows.forEach(function(l){
      h += '<button type="button" class="lp3-card" data-lp3-open="' + attr(l.id) + '">' +
        '<span class="t">Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + '</span>' +
        '<span class="m">Фаза ' + esc(l.phase) + (isDone(l.id) ? ' · ✓ пройден' : '') + '</span></button>';
    });
  }
  return h + '</section>';
}

/* ---------- Программа курса (аккордеон, LS-раскрытие) ---------- */
function lp3ProgramHtml(){
  var syll = lp3SyllabusState();
  var openPh = (typeof syll.phase === 'number') ? syll.phase : 0;
  var curId = S.active ? S.lessonId : null;
  var h = '<section class="lp3-sec" id="lp3_program_sec"><div class="lp3-sec-h">📚 Программа курса</div>';
  lp3PhaseNums().forEach(function(ph){
    var c = lp3PhaseCounts(ph);
    var isOpen = ph === openPh;
    h += '<div class="lp3-ph' + (isOpen ? ' open' : '') + '">';
    h += '<button type="button" class="lp3-ph-h" data-lp3-ph="' + ph + '" aria-expanded="' + isOpen + '">' +
      '<span class="t">' + esc(lp3PhaseTitle(ph)) + '</span>' +
      '<span class="m">' + c.done + ' / ' + c.total + '</span></button>';
    h += '<div class="lp3-ph-bar" aria-hidden="true"><i style="width:' + lp3PhasePct(ph) + '%"></i></div>';
    if(isOpen){
      h += '<div class="lp3-ph-list">';
      LESSONS.forEach(function(l){
        if(l.phase !== ph) return;
        var done = isDone(l.id);
        h += '<button type="button" class="lp3-les' + (done ? ' done' : '') + (l.id === curId ? ' current' : '') + '" data-lp3-open="' + attr(l.id) + '"' + (l.id === curId ? ' aria-current="true"' : '') + '>' +
          '<span class="ck">' + (done ? '✓' : '') + '</span>' +
          '<span class="t">Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + '</span>' +
          '<span class="m">≈' + parseTimeEst(l) + ' мин</span></button>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  return h + '</section>';
}

/* ---------- Прогресс: две разные метрики с явными подписями (§1.2) ---------- */
function lp3ProgressHtml(){
  var allDone = 0;
  LESSONS.forEach(function(l){ if(isDone(l.id)) allDone++; });
  var pct = learnCoursePct();
  var doneTerms = 0;
  try{ doneTerms = Object.values(learned).filter(function(x){ return x === 1; }).length; }catch(e){}
  var passedTests = 0, _k;
  try{
    for(_k in phaseTestsDone){
      if(Object.prototype.hasOwnProperty.call(phaseTestsDone, _k) && _k !== 'exam_capstone' && phaseTestsDone[_k] >= 80) passedTests++;
    }
  }catch(e){}
  var cap = 0;
  try{ cap = phaseTestsDone['exam_capstone'] || 0; }catch(e){}
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">📈 Прогресс</div>' +
    '<div class="lp3-pct"><b>' + pct + '%</b><span>курс пройден — та же формула, что на вкладке «Прогресс»: уроки фаз 0–5 · 40%, термины · 20%, тесты · 25%, капстоун · 15%</span></div>' +
    '<div class="lp3-total"><b>' + allDone + ' из ' + LESSONS.length + '</b> уроков курса <span>(все фазы 0–9, включая матфакультатив и Академию — другая метрика, не «Курс %»)</span></div>';
  lp3PhaseNums().forEach(function(ph){
    var c = lp3PhaseCounts(ph);
    h += '<div class="lp3-prow"><span class="t">' + esc(lp3PhaseShort(ph)) + '</span>' +
      '<span class="bar"><i style="width:' + lp3PhasePct(ph) + '%"></i></span>' +
      '<span class="m">' + c.done + '/' + c.total + '</span></div>';
  });
  h += '<div class="lp3-pmini">термины: <b>' + doneTerms + ' из ' + TERMS.length + '</b> · тесты сдано (порог 80%): <b>' + passedTests + ' из 6</b> · капстоун: <b>' + cap + '%</b> (порог 85%)</div>';
  return h + '</section>';
}

/* ---------- Тесты и экзамены (обрамление bankMeta Этапа 2) ---------- */
function lp3TestsHtml(){
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">🏁 Тесты и экзамены</div><div class="lp3-tests">';
  LP3_TEST_IDS.forEach(function(id){
    var m = null;
    try{ m = bankMeta(id); }catch(e){}
    if(!m) return;
    h += '<button type="button" class="lp3-test" data-lp3-test="' + attr(id) + '">' +
      '<span class="t">' + esc(m.r.title) + (m.r.diag ? ' <span class="learn-badge">🔬 диагностика</span>' : '') + '</span>' +
      '<span class="m">' + m.draftInfo + m.total + ' вопр.' + (m.req ? ' · порог ' + m.req : '') + '<br>' + m.state + '</span></button>';
  });
  return h + '</div></section>';
}

/* ---------- Карточки (сводка cn_learn_fc + вход в последнюю колоду) ---------- */
function lp3CardsHtml(){
  var store = lpLS_get('cn_learn_fc', {});
  var decks = 0, known = 0, totalC = 0, lastId = null, lastTs = 0;
  Object.keys(store).forEach(function(lid){
    var e = store[lid];
    if(!e || !e.cards) return;
    decks++;
    Object.keys(e.cards).forEach(function(k){
      totalC++;
      if(e.cards[k] === 1) known++;
    });
    if((e.ts || 0) >= lastTs){ lastTs = e.ts || 0; lastId = lid; }
  });
  var h = '<section class="lp3-sec"><div class="lp3-sec-h">🗂 Карточки для повторения</div>';
  if(!decks){
    h += '<div class="lp3-empty">Колод ещё нет — пройди урок и нажми «🗂 Карточки» на финале или в шапке плеера.</div>';
  } else {
    h += '<div class="lp3-fc-sum">колод: <b>' + decks + '</b> · карточек: <b>' + totalC + '</b> · доля «знал»: <b>' + (totalC ? Math.round(known / totalC * 100) : 0) + '%</b></div>';
    var ll = lastId ? lessonById(lastId) : null;
    if(ll){
      h += '<button type="button" class="lp3-card" data-lp3-fc="' + attr(ll.id) + '">' +
        '<span class="t">🗂 Открыть последнюю колоду</span>' +
        '<span class="m">Урок ' + esc(ll.num || '') + ' · ' + esc(ll.title) + '</span></button>';
    }
  }
  return h + '</section>';
}

/* ============================== ХАБ: СОБЫТИЯ ============================== */
function lp3HomeClick(e){
  var b = e.target.closest('[data-lp3-act]');
  if(b){
    var act = b.getAttribute('data-lp3-act');
    if(act === 'close'){ Home.close(); return; }
    if(act === 'fsdown'){ adjustFont(-1); return; }
    if(act === 'fsup'){ adjustFont(1); return; }
  }
  if(lp3NoteActionClick(e)) return; /* конспект: переход/комментарий/удаление/undo/копирование */
  var ph = e.target.closest('[data-lp3-ph]');
  if(ph){
    var v = parseInt(ph.getAttribute('data-lp3-ph'), 10);
    var cur = lp3SyllabusState().phase;
    lp3SyllabusSet({ phase: (cur === v ? -1 : v) }); // -1 = все свернуты
    lp3RerenderHome();
    return;
  }
  var bm = e.target.closest('[data-lp3-bm]');
  if(bm){
    var b2 = lpLS_get('cn_learn_bookmarks', [])[parseInt(bm.getAttribute('data-lp3-bm'), 10)];
    if(b2){ lp3OpenFromHome(b2.lessonId, b2.stepIdx); }
    return;
  }
  var o = e.target.closest('[data-lp3-open]');
  if(o){
    var stepRaw = o.getAttribute('data-lp3-open-step');
    var stepIdx = stepRaw === null || stepRaw === '' ? undefined : parseInt(stepRaw, 10);
    lp3OpenFromHome(o.getAttribute('data-lp3-open'), isNaN(stepIdx) ? undefined : stepIdx);
    return;
  }
  var t = e.target.closest('[data-lp3-test]');
  if(t){ lp3OpenTestFromHome(t.getAttribute('data-lp3-test')); return; }
  var fc = e.target.closest('[data-lp3-fc]');
  if(fc){ lp3OpenFcFromHome(fc.getAttribute('data-lp3-fc')); return; }
  var sr = e.target.closest('[data-lp3-sr]');
  if(sr){ lp3SearchJump(sr.getAttribute('data-lp3-sr'), sr.getAttribute('data-lp3-sr-bi')); return; }
}
function lp3HomeInput(e){
  if(!e.target.classList || !e.target.classList.contains('lp3-search-in')) return;
  lp3HomeSearchRender(e.target.value);
}
function lp3HomeKeydown(e){
  if(e.key === 'Escape'){
    e.stopPropagation(); e.preventDefault();
    Home.close();
    return;
  }
  if((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || String(e.key).toLowerCase() === 'k' || String(e.key).toLowerCase() === 'к')){
    e.preventDefault(); e.stopPropagation();
    var si = H.root && H.root.querySelector('.lp3-search-in');
    if(si){ si.focus(); si.select(); }
    return;
  }
  if(e.key === 'Tab'){
    /* фокус-трап хаба (§12.8) */
    var list = H.root ? H.root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') : [];
    var f = Array.prototype.filter.call(list, function(el){ return el.offsetParent !== null || el === document.activeElement; });
    if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
}
function lp3RerenderHome(){
  if(!H.root) return;
  var body = H.root.querySelector('.lp3-body');
  if(!body) return;
  var st = body.scrollTop;
  var q = H.root.querySelector('.lp3-search-in');
  var qv = q ? q.value : '';
  var tmp = document.createElement('div');
  tmp.innerHTML = lp3HomeHtml();
  var nb = tmp.querySelector('.lp3-body');
  body.innerHTML = nb ? nb.innerHTML : '';
  body.scrollTop = st;
  var q2 = H.root.querySelector('.lp3-search-in');
  if(q2){
    q2.value = qv;
    if(qv) lp3HomeSearchRender(qv);
  }
}
function lp3OpenFromHome(lessonId, stepIdx){
  Home.close(true);
  _lp3ReturnHome = true;
  LearnPlayer.open(lessonId, typeof stepIdx === 'number' ? stepIdx : undefined);
}
function lp3OpenTestFromHome(testId){
  Home.close(true);
  _lp3ReturnHome = true;
  LearnPlayer.openTest(testId, 'home');
}
function lp3OpenFcFromHome(lessonId){
  Home.close(true);
  _lp3ReturnHome = true;
  LearnPlayer.openFlashcards(lessonId);
}
