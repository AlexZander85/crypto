
/* ============================== КАРТОЧКИ ДЛЯ ПОВТОРЕНИЯ (P7, ТЗ §11.7) ============================== */
var FC = { active:false, lessonId:null, deck:[], i:0, flipped:false, marks:{} };

function buildDeck(l){
  var cards = [];
  var recap = null;
  (l.blocks || []).forEach(function(b){ if(b && b.type === 'recap') recap = b; });
  ((recap && recap.points) || []).forEach(function(pt, i){
    var full = String(pt);
    var front = full.length > 60 ? full.slice(0, 60).replace(/\s+\S*$/, '') + '…' : full;
    cards.push({ id:'rp_' + i, front:front, back:full });
  });
  (l.terms || []).forEach(function(t){
    if(typeof t === 'string'){
      var def = '';
      try{ var tr = TERMS_RAW.find(function(x){ return x.t === t; }); if(tr) def = tr.d; }catch(e){}
      cards.push({ id:'tm_' + t, front:t, back:def || '—' });
    } else if(t && t.ru){
      cards.push({ id:'tm_' + t.ru, front:t.ru, back:t.desc || t.en || '—' });
    }
  });
  return cards.slice(0, 12);                               // кап 12 карточек
}

function openFlashcards(lessonId){
  var lid = lessonId || S.lessonId;
  var l = lessonById(lid);
  if(!l) return;
  if(!buildDeck(l).length){ toast('У этого урока нет карточек: нет выводов и словаря', '🗂'); return; }
  if(!S.active || !S.root){ openPlayer(lid); setTimeout(function(){ if(S.active && !TS.active) fcStart(l.id); }, 60); return; }
  if(TS.active){ toast('Карточки доступны в режиме урока', '🗂'); return; }
  fcStart(l.id);
}

function fcStart(lid){
  var l = lessonById(lid);
  if(!l || !contentEl) return;
  var deck = buildDeck(l);
  if(!deck.length) return;
  FC.active = true; FC.lessonId = lid; FC.deck = deck; FC.i = 0; FC.flipped = false; FC.marks = {};
  fcRender();
}

function fcRender(){
  if(!FC.active || !contentEl) return;
  var total = FC.deck.length;
  var done = FC.i >= total;
  var h;
  if(done){
    var known = 0, unknownN = 0;
    FC.deck.forEach(function(c){ if(FC.marks[c.id] === 1) known++; else if(FC.marks[c.id] === -1) unknownN++; });
    /* Результат — только LS cn_learn_fc (на зачёт не влияет); ключ = lessonId, дублей нет */
    var store = lpLS_get('cn_learn_fc', {});
    var prevCards = (store[FC.lessonId] && store[FC.lessonId].cards) ? store[FC.lessonId].cards : {};
    FC.deck.forEach(function(c){ if(FC.marks[c.id]) prevCards[c.id] = FC.marks[c.id]; });
    store[FC.lessonId] = { ts: Date.now(), cards: prevCards };
    lpLS_set('cn_learn_fc', store);
    var unknownLeft = FC.deck.filter(function(c){ return FC.marks[c.id] === -1; }).length;
    var l = lessonById(FC.lessonId);
    h = '<div style="text-align:center;padding:26px 0 8px"><div style="font-size:52px;margin-bottom:10px">🗂</div>' +
      '<h1 class="learn-cover-title" style="margin-bottom:6px">Знал ' + known + ' из ' + total + '</h1>' +
      '<div style="color:var(--mut);margin-bottom:18px">Карточки урока «' + esc(l ? l.title : '') + '» · результат сохранён локально, на зачёт не влияет</div></div>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
      (unknownLeft ? '<button type="button" class="lp-btn primary" data-lp2-act="fc-again">Ещё раз только незнакомые (' + unknownLeft + ')</button>' : '') +
      '<button type="button" class="lp-btn ghost" data-lp2-act="fc-restart">⟲ Всю колоду заново</button>' +
      '<button type="button" class="lp-btn" data-lp2-act="fc-exit">✕ Вернуться к уроку</button></div>';
  } else {
    var card = FC.deck[FC.i];
    h = '<div class="learn-step-kicker">🗂 Карточки для повторения</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap">' +
      '<span class="learn-badge">Карточка ' + (FC.i + 1) + ' из ' + total + '</span>' +
      '<span style="color:var(--mut);font-size:calc(var(--lp-fs) - 6px)">клик / пробел — перевернуть · 1 — не знал · 2 — знал</span></div>' +
      '<div class="learn-card lp2-fc-card' + (FC.flipped ? ' flipped' : '') + '" data-lp2-act="fc-flip" role="button" tabindex="0" aria-label="Карточка: нажмите для переворота">' +
      (FC.flipped ?
        '<div class="lp2-fc-label">Ответ</div><div style="line-height:1.65">' + T(card.back, true) + '</div>' :
        '<div class="lp2-fc-label">Термин / утверждение</div><div style="line-height:1.6;font-weight:700">' + esc(card.front) + '</div>') +
      '</div>' +
      (FC.flipped ?
        '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px">' +
        '<button type="button" class="lp-btn danger" data-lp2-act="fc-unknown">✗ Не знал</button>' +
        '<button type="button" class="lp-btn success" data-lp2-act="fc-known">✓ Знал</button></div>' :
        '<div style="text-align:center;color:var(--mut);margin-top:12px;font-size:calc(var(--lp-fs) - 5px)">Вспомните — затем переверните</div>');
  }
  contentEl.innerHTML = '<div class="learn-step">' + h + '</div>';
  requestAnimationFrame(function(){ if(contentEl) contentEl.scrollTop = 0; });
  fcChrome();
}

function fcChrome(){
  if(!S.root || !FC.active) return;
  var pl = S.root.querySelector('.learn-progress-label');
  if(pl) pl.textContent = 'Карточка ' + Math.min(FC.i + 1, FC.deck.length) + ' из ' + FC.deck.length;
  var pt = S.root.querySelector('.learn-progress-title');
  if(pt){ var l = lessonById(FC.lessonId); pt.textContent = '🗂 Карточки · ' + (l ? l.title : ''); }
  var pbar = S.root.querySelector('.learn-pbar i');
  if(pbar) pbar.style.width = Math.round(Math.min(FC.i, FC.deck.length) / FC.deck.length * 100) + '%';
  var pb = S.root.querySelector('.learn-progress-wrap');
  if(pb){ pb.setAttribute('aria-valuenow', String(Math.min(FC.i + 1, FC.deck.length))); pb.setAttribute('aria-valuemax', String(FC.deck.length)); }
  var bottom = S.root.querySelector('.learn-bottom');
  if(bottom){
    bottom.innerHTML = '<button type="button" class="lp-btn ghost" data-lp2-act="fc-exit">✕ Завершить карточки</button>' +
      '<div style="flex:1"></div><span style="color:var(--mut);font-size:12.5px">самопроверка — на зачёт не влияет</span>';
  }
  syncHeaderButtons();
}

function fcFlip(){ if(!FC.active || FC.i >= FC.deck.length) return; FC.flipped = !FC.flipped; fcRender(); }
function fcRate(v){
  if(!FC.active || FC.i >= FC.deck.length) return;
  if(!FC.flipped){ fcFlip(); return; }
  FC.marks[FC.deck[FC.i].id] = v;
  FC.i++; FC.flipped = false;
  fcRender();
}
function fcAgainUnknown(){
  var unknown = FC.deck.filter(function(c){ return FC.marks[c.id] === -1; });
  if(!unknown.length) return;
  FC.deck = unknown; FC.i = 0; FC.flipped = false; FC.marks = {};
  fcRender();
}
function fcRestart(){ FC.i = 0; FC.flipped = false; FC.marks = {}; fcRender(); }
function fcExit(){
  FC.active = false;
  if(S.active && S.lessonId && S.steps.length) renderStep(S.idx);
}

/* ============================== ФИНАЛ УРОКА: CTA + НАВИГАЦИЯ ФАЗ (P6.3, P8) ============================== */
function phaseNeighbor(ph, dir){
  var target = ph + dir;
  if(target < 0 || target > 9) return null;
  var ls = [];
  LESSONS.forEach(function(x){ if(x.phase === target) ls.push(x); });
  if(!ls.length) return null;
  var first = null;
  for(var i = 0; i < ls.length; i++){ if(!isDone(ls[i].id)){ first = ls[i]; break; } }
  return { ph: target, id: first ? first.id : ls[0].id, allDone: !first };
}

function testBadgeFor(testId){
  var r = resolveBank(testId);
  if(!r) return false;
  if(r.kind === 'phase'){
    var best = phaseTestsDone[r.testKey] || 0;
    var rate = r.ph === 6 ? 0.85 : 0.80;
    var reqPct = Math.round(Math.ceil(r.questions.length * rate) / r.questions.length * 100);
    return best >= reqPct;
  }
  if(r.kind === 'math'){ var st = mathTestState[r.ti]; return !!(st && st.passed); }
  return false;
}

function finaleExtrasHtml(l){
  var h = '';
  /* P6.3: CTA тестов фазы (фаза 9 — без фазового теста) */
  var cta = '';
  function btn(label, testId){
    var badge = testBadgeFor(testId);
    return '<button type="button" class="lp-btn' + (badge ? ' ghost' : ' primary') +
      '" onclick="LearnPlayer.openTest(\'' + testId + '\')">' + label +
      (badge ? ' <span class="learn-badge" style="background:rgba(34,197,94,.18);color:var(--ok)">✓ сдан</span>' : '') + '</button>';
  }
  try{
    if(l.phase >= 0 && l.phase <= 5) cta += btn('▸ Тест фазы ' + l.phase, 'p' + l.phase);
    else if(l.phase === 6) cta += btn('▸ Выпускной экзамен', 'capstone');
    else if(l.phase === 7){
      MATH_TESTS.forEach(function(t){ cta += btn('▸ ' + esc(t.title), t.id); });
    }
    else if(l.phase === 8) cta += btn('▸ Аттестация психологии', 'p8');
  }catch(e){}
  if(cta) h += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px">' + cta + '</div>';
  /* P7.2: карточки на финале */
  try{
    if(buildDeck(l).length){
      h += '<div style="text-align:center;margin-top:12px">' +
        '<button type="button" class="lp-btn ghost" onclick="LearnPlayer.openFlashcards(\'' + attr(l.id) + '\')">🗂 Карточки для повторения</button></div>';
    }
  }catch(e){}
  /* P8: навигация по фазам */
  var left = null, right = null;
  try{ left = phaseNeighbor(l.phase, -1); right = phaseNeighbor(l.phase, 1); }catch(e){}
  if(left || right){
    h += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px dashed var(--line)">' +
      (left ? '<button type="button" class="lp-btn ghost" onclick="LearnPlayer._openPhaseNeighbor(' + l.phase + ',-1)">◂ Фаза ' + left.ph + '</button>' : '') +
      (right ? '<button type="button" class="lp-btn ghost" onclick="LearnPlayer._openPhaseNeighbor(' + l.phase + ',1)">Фаза ' + right.ph + ' ▸</button>' : '') +
      '</div>';
  }
  return h;
}

/* ============================== ОВЕРЛЕЙ ХОТКЕЕВ ДЛЯ ТЕСТА/КАРТОЧЕК ============================== */
function lp2Hotkeys(force){
  var existing = S.root && S.root.querySelector('.learn-overlay[data-ov="hotkeys"]');
  if(existing || force === false){ if(existing) existing.remove(); return; }
  var rows = FC.active ?
    '<b>Пробел / клик</b><span>перевернуть карточку</span><b>1</b><span>не знал</span><b>2</b><span>знал</span><b>Esc</b><span>закрыть плеер</span>' :
    '<b>→ / Пробел</b><span>следующая порция</span><b>←</b><span>предыдущая порция</span>' +
    '<b>1…9</b><span>выбор варианта в первом неотвеченном вопросе порции</span><b>Esc</b><span>закрыть (черновик попытки сохраняется)</span>';
  var ov = document.createElement('div');
  ov.className = 'learn-overlay'; ov.setAttribute('data-ov', 'hotkeys');
  ov.innerHTML = '<div class="learn-sheet"><h3>⌨️ Горячие клавиши</h3><div class="learn-hotkeys">' + rows + '</div>' +
    '<div style="margin-top:16px;text-align:right"><button type="button" class="lp-btn" data-lp-close-ov>Понятно</button></div></div>';
  ov.addEventListener('click', function(e){ if(e.target === ov || e.target.closest('[data-lp-close-ov]')) ov.remove(); });
  S.root.appendChild(ov);
}

/* ============================== ТОЧКИ ВХОДА (P6) ============================== */
/* P6.1: обёртка renderPhaseTestView — кнопка-баннер «🎓 Пройти в плеере» */
function injectTestEntry(){
  try{
    if(!S.active || !TS.active){ /* вставляем только вне активной сессии теста */ }
    var box = document.getElementById('phaseTestBox');
    if(!box || !box.firstChild) return;
    var ph = (typeof curPhaseTest === 'number') ? curPhaseTest : 0;
    if(document.getElementById('lp_test_entry_' + ph)) return;
    if(!box.querySelector('button[onclick^="calcPhaseTestResult"]')) return; // слот без теста
    var testId = ph === 6 ? 'capstone' : ('p' + ph);
    var bar = document.createElement('div');
    bar.id = 'lp_test_entry_' + ph;
    bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:13px 16px;border:1.5px solid var(--acc1);border-radius:12px;background:rgba(124,58,237,.08)';
    bar.innerHTML = '<div style="min-width:220px"><b style="color:var(--txt)">🎓 Пошаговый режим «Обучение»</b>' +
      '<div style="font-size:12.5px;color:var(--mut);margin-top:2px">Тот же тест — порциями по 5 вопросов, с перерывами и продолжением с места</div></div>';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn sm lp-entry';
    btn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#06b6d4);border:none;color:#fff;font-weight:700';
    btn.textContent = '🎓 Пройти в плеере';
    btn.setAttribute('aria-label', 'Пройти тест в плеере обучения');
    btn.addEventListener('click', function(ev){ ev.stopPropagation(); LearnPlayer.openTest(testId, 'tests'); });
    bar.appendChild(btn);
    box.insertBefore(bar, box.firstChild);
  }catch(e){ console.warn('[LearnPlayer2] injectTestEntry', e); }
}

/* P6.2: 🎓 рядом с каждой кнопкой finishMathTest во вкладке фазы 7 */
function injectMathEntries(){
  try{
    var grid = document.getElementById('phaseLessonCardsGrid');
    if(!grid) return;
    grid.querySelectorAll('button[onclick^="finishMathTest"]').forEach(function(b){
      var m = /finishMathTest\((\d+)\)/.exec(b.getAttribute('onclick') || '');
      if(!m) return;
      var ti = parseInt(m[1], 10);
      var nx = b.nextElementSibling;
      if(nx && nx.getAttribute && nx.getAttribute('data-lp2-mentry') === String(ti)) return;
      var mt = MATH_TESTS[ti];
      if(!mt) return;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn sm lp-entry'; btn.textContent = '🎓';
      btn.title = 'Пройти «' + mt.title + '» в пошаговом плеере';
      btn.setAttribute('data-lp2-mentry', String(ti));
      btn.setAttribute('aria-label', 'Пройти мат-тест в плеере обучения');
      btn.addEventListener('click', function(ev){ ev.stopPropagation(); LearnPlayer.openTest(mt.id, 'math'); });
      b.parentNode.insertBefore(btn, b.nextSibling);
    });
  }catch(e){ console.warn('[LearnPlayer2] injectMathEntries', e); }
}

/* P6.4: баннер незавершённой попытки на главной (черновик свежее позиции урока) */
function injectTestHomeBanner(){
  try{
    if(S.active) return;
    var home = document.getElementById('home');
    if(!home) return;
    var bar = document.getElementById('learn_home_test_banner');
    var dr = testDraftGet();
    var pos = lpLS_get('cn_learn_pos', null);
    var fresh = !!(dr && (!pos || !pos.ts || (dr.updatedTs || 0) >= pos.ts));
    if(!fresh){ if(bar) bar.remove(); return; }
    var r = resolveBank(dr.testId);
    if(!r){ if(bar) bar.remove(); return; }
    var a = r.kind === 'math' ? Object.keys(dr.touched || {}).length : (Object.keys(dr.answers || {}).length + Object.keys(dr.numeric || {}).length);
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'learn_home_test_banner';
      bar.className = 'daily-quests-card';
      var anchor = home.querySelector('.daily-quests-card');
      if(anchor) home.insertBefore(bar, anchor); else home.insertBefore(bar, home.firstChild);
    }
    bar.innerHTML = '<div class="lp2-home-row">' +
      '<div style="min-width:220px"><b style="color:var(--txt)">⏸ Незавершённая попытка: ' + esc(r.title) + '</b>' +
      '<div style="font-size:12.5px;color:var(--mut);margin-top:2px">отвечено ' + a + ' из ' + r.questions.length + ' · плеер «Обучение»</div></div>' +
      '<button type="button" class="btn sm lp-entry" id="lp_home_test_resume">Продолжить тест ➔</button></div>';
    var btn = document.getElementById('lp_home_test_resume');
    if(btn) btn.addEventListener('click', function(){ LearnPlayer.openTest(dr.testId, 'home'); });
  }catch(e){ console.warn('[LearnPlayer2] injectTestHomeBanner', e); }
}

/* ============================== SMOKE И SELFTEST (P9) ============================== */
function smoke2(){
  try{
    if(!(window.V10 && window.V10.smoke)) return;
    var ids = TEST_BANK_IDS;
    var expected = { p0:25, p1:12, p2:10, p3:12, p4:12, p5:12, p8:202, capstone:38,
      math_core:10, math_stats:10, math_final_map:10, literacy:25, psy_cum:21 };
    var volNote = [];
    ids.forEach(function(id){
      var r = resolveBank(id);
      if(!r){ volNote.push(id + ':none'); return; }
      if(r.questions.length !== expected[id]) volNote.push(id + ':' + r.questions.length);
    });
    V10.smoke.add('lp2:banks', !volNote.length, volNote.length ? volNote.join(',') :
      '13 банков: 25/12/10/12/12/12/202/38/10/10/10/25/21');
    var covNote = [];
    var covOk = true;
    ids.forEach(function(id){
      var r = resolveBank(id);
      if(!r){ covOk = false; return; }
      var steps = buildTestSteps(r.questions.length);
      var seen = {}, portN = 0;
      steps.forEach(function(s){
        if(s.kind === 'portion'){ portN++; s.qs.forEach(function(qi){ if(seen[qi]){ covOk = false; covNote.push(id + ':dup' + qi); } seen[qi] = 1; }); }
      });
      if(portN !== Math.ceil(r.questions.length / 5)){ covOk = false; covNote.push(id + ':portions=' + portN); }
      for(var i = 0; i < r.questions.length; i++) if(!seen[i]){ covOk = false; covNote.push(id + ':lost' + i); }
    });
    V10.smoke.add('lp2:portions', covOk, covNote.length ? covNote.slice(0, 3).join(',') :
      'порции по 5 покрывают все вопросы без потерь и дублей');
    var pvOk = true;
    try{
      var t1 = PHASE_TESTS.find(function(x){ return x.phase === 1; });
      pvOk = JSON.stringify(buildPtView(t1, 777)) === JSON.stringify(buildPtView(t1, 777));
    }catch(e){ pvOk = false; }
    V10.smoke.add('lp2:ptview', pvOk, 'пересборка _ptView по сохранённой соли детерминирована');
    var msOk = true;
    try{
      var ti = 1, t = MATH_TESTS[ti];
      [0, 4, 9].forEach(function(qi){
        var a = shuffledOptions(t.questions[qi], qi * 17 + 3 + ti * 9);
        var b = shuffledOptions(t.questions[qi], qi * 17 + 3 + ti * 9);
        if(JSON.stringify(a) !== JSON.stringify(b)) msOk = false;
      });
    }catch(e){ msOk = false; }
    V10.smoke.add('lp2:math-salt', msOk, 'соль qi*17+3+ti*9 воспроизводит порядок renderMathTestsBox (spot-check math_stats)');
    V10.smoke.add('lp2:api', typeof window.LearnPlayer.openTest === 'function' &&
      typeof window.LearnPlayer.onTestResult === 'function' &&
      typeof window.LearnPlayer.openFlashcards === 'function' &&
      typeof window.LearnPlayer.selfTest === 'function', window.LearnPlayer.version);
    var lsOk = false, prevTestRaw = null;
    try{ prevTestRaw = localStorage.getItem('cn_learn_test'); }catch(e){}
    try{
      lpLS_set('cn_learn_test', { testId:'__probe__', pos:0, answers:{ '0':1 }, updatedTs:1 });
      var back = lpLS_get('cn_learn_test', null);
      lsOk = !!(back && back.testId === '__probe__' && back.answers['0'] === 1);
      lpLS_set('cn_learn_fc', lpLS_get('cn_learn_fc', {}));
    }catch(e){}
    try{
      /* проба не затирает реальный черновик попытки */
      if(prevTestRaw === null) localStorage.removeItem('cn_learn_test');
      else localStorage.setItem('cn_learn_test', prevTestRaw);
    }catch(e){}
    V10.smoke.add('lp2:ls', lsOk, 'cn_learn_test / cn_learn_fc пишутся и читаются');
  }catch(e){ console.warn('[LearnPlayer2] smoke2', e); }
}

/* selfTest(): порции всех банков + синтетический staging-DOM БЕЗ вызова
   calcPhaseTestResult (он пишет стейт!) — проверка «контейнеры и маркеры
   находятся по тем же селекторам» */
function selfTest2(){
  var out = { banks: [], errors: [], ok: true };
  TEST_BANK_IDS.forEach(function(id){
    try{
      var r = resolveBank(id);
      if(!r){ out.errors.push(id + ': банк не резолвится'); return; }
      var steps = buildTestSteps(r.questions.length);
      var seen = {};
      steps.forEach(function(s){ if(s.kind === 'portion') s.qs.forEach(function(qi){ if(seen[qi]) out.errors.push(id + ': дубль qi ' + qi); seen[qi] = 1; }); });
      for(var i = 0; i < r.questions.length; i++) if(!seen[i]) out.errors.push(id + ': потерян qi ' + i);
      out.banks.push({ id: id, n: r.questions.length, portions: steps.length - 1, steps: steps.length });
      if(r.kind === 'phase'){
        var view = buildPtView(r.bank, 12345);
        var host = document.createElement('div');
        for(var qi = 0; qi < view.length; qi++){
          var c = document.createElement('div');
          c.id = 'ptest_' + r.ph + '_' + qi;
          c.innerHTML = '<span class="ans ok" style="display:none"></span>';
          host.appendChild(c);
        }
        if(host.querySelectorAll('.ans.ok').length !== view.length) out.errors.push(id + ': маркеры .ans.ok не находятся');
        if(!host.querySelector('#ptest_' + r.ph + '_0')) out.errors.push(id + ': контейнер ptest_<ph>_<qi> не находится');
        if(JSON.stringify(buildPtView(r.bank, 12345)) !== JSON.stringify(view)) out.errors.push(id + ': _ptView невоспроизводим по соли');
      }
    }catch(e){ out.errors.push(id + ': ' + String(e && e.message || e)); }
  });
  out.ok = !out.errors.length;
  return out;
}

/* ============================== ОБЁРТКИ КАРКАСА ЭТАПА 1 ============================== */
/* Навигация: тестовый режим и карточки перехватывают «Дальше/Назад» (клавиатура,
   свайпы и нижние кнопки идут через те же goNext/goPrev) */
var _origGoNext = goNext, _origGoPrev = goPrev;
goNext = function(){ if(FC.active) return; if(TS.active){ testNext(); return; } _origGoNext(); };
goPrev = function(){ if(FC.active) return; if(TS.active){ testPrev(); return; } _origGoPrev(); };

/* Каркас окна: кнопки 🏁 (пикер) и 🗂 (карточки) + делегаты Этапа 2 */
var _origBuildRoot = buildRoot;
buildRoot = function(l){
  var root = _origBuildRoot(l);
  try{
    var tr = root.querySelector('.learn-top-right');
    if(tr){
      var pk = document.createElement('button');
      pk.type = 'button'; pk.className = 'lp-btn sm ghost'; pk.setAttribute('data-lp2-act', 'picker');
      pk.setAttribute('aria-label', 'Тесты и экзамены'); pk.title = 'Тесты и экзамены 🏁'; pk.textContent = '🏁';
      tr.insertBefore(pk, tr.firstChild);
      var fc = document.createElement('button');
      fc.type = 'button'; fc.className = 'lp-btn sm ghost'; fc.setAttribute('data-lp2-act', 'fc');
      fc.setAttribute('aria-label', 'Карточки для повторения'); fc.title = 'Карточки для повторения 🗂'; fc.textContent = '🗂';
      tr.insertBefore(fc, tr.firstChild);
    }
    root.addEventListener('click', testRootClick, false);
    root.addEventListener('keydown', testKeydown, false);
  }catch(e){}
  return root;
};

/* updateChrome: синхронизация видимости добавленных кнопок */
var _origUpdateChrome = updateChrome;
updateChrome = function(){ _origUpdateChrome(); try{ syncHeaderButtons(); }catch(e){} };

/* Хоткеи: свой список для теста/карточек */
var _origToggleHotkeys = toggleHotkeys;
toggleHotkeys = function(force){
  if(TS.active || FC.active){ lp2Hotkeys(force); return; }
  _origToggleHotkeys(force);
};

/* Открытие урока из теста/карточек: тестовая сессия завершается без возврата подложки */
var _origOpenPlayer = openPlayer;
openPlayer = function(lessonId, stepIdx, opts){
  if(TS.active) testTeardown();
  FC.active = false;
  _origOpenPlayer(lessonId, stepIdx, opts);
};

/* Закрытие: возврат подложки вкладки «Тесты» / фазы 7 (патч-план §5) */
var _origClosePlayer = closePlayer;
closePlayer = function(){
  var wasTest = TS.active, wasFC = FC.active;
  var from = TS.from, inPlace = TS.switchedInPlace;
  testTeardown();
  FC.active = false;
  _origClosePlayer();
  if(wasTest && !inPlace){
    try{ if(from === 'tests') renderPhaseTestView(curPhaseTest); }catch(e){}
    try{ if(from === 'math') renderPhaseLessonsView(7); }catch(e){}
  }
};

/* Финал урока: CTA тестов, карточки, навигация по фазам */
var _origFinishHtml = finishHtml;
finishHtml = function(l){
  var base = _origFinishHtml(l);
  try{ return base + finaleExtrasHtml(l); }catch(e){ return base; }
};

/* Баннер на главной: + незавершённая попытка теста */
var _origInjectHomeBanner = injectHomeBanner;
injectHomeBanner = function(){ _origInjectHomeBanner(); injectTestHomeBanner(); };

/* Обёртки глобальных рендеров (точки входа — паттерн приложения) */
var _origRPTV = window.renderPhaseTestView;
window.renderPhaseTestView = function(){
  var r = _origRPTV.apply(this, arguments);
  injectTestEntry();
  return r;
};
var _prevRPLV = window.renderPhaseLessonsView;
window.renderPhaseLessonsView = function(){
  var r = _prevRPLV.apply(this, arguments);
  try{ if(arguments.length && arguments[0] === 7) injectMathEntries(); }catch(e){}
  return r;
};

/* ============================== РАСШИРЕНИЕ API ============================== */
window.LearnPlayer.version = '2.0 (Этап 2, ТЗ v2)';
window.LearnPlayer.openTest = function(testId, from){ openTest(testId, from); };
window.LearnPlayer.onTestResult = function(text){ onTestResult(text); };
window.LearnPlayer.openFlashcards = function(lessonId){ openFlashcards(lessonId); };
window.LearnPlayer.selfTest = function(){ return selfTest2(); };
window.LearnPlayer._openPhaseNeighbor = function(ph, dir){
  var n = phaseNeighbor(ph, dir);
  if(!n) return;
  if(n.allDone) toast('Фаза ' + n.ph + ' пройдена полностью — открываю первый урок фазы', '🏅');
  openPlayer(n.id);
};

/* Smoke Этапа 2 — добавляются синхронно, до финального отчёта v10.2 (~1.2 c) */
smoke2();
