/* ============================== ПОИСК (P5, ТЗ §12.4) ==============================
   Ленивый индекс из живых массивов (LESSONS/TERMS/ABBREVIATION_GLOSSARY);
   контент заморожен — инвалидация не нужна. blockIndex — для перехода на шаг. */
var _lp3Idx = null;

function lp3Strip(s){
  return String(s === undefined || s === null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function lp3SearchIndex(){
  if(_lp3Idx) return _lp3Idx;
  var idx = [];
  LESSONS.forEach(function(l){
    var push = function(text, weight, blockIndex){
      var s = lp3Strip(text);
      if(!s) return;
      idx.push({ type: 'lesson', id: l.id, phase: l.phase, num: String(l.num || ''), title: String(l.title || ''),
        blockIndex: (blockIndex === undefined ? 0 : blockIndex), text: s, w: weight });
    };
    push(l.num, 100, 0);
    push(l.title, 100, 0);
    push(l.lead, 80, 0);
    (l.terms || []).forEach(function(t){
      if(typeof t === 'string'){
        push(t, 90, 0);
        var def = '';
        try{ var tr = TERMS_RAW.find(function(x){ return x.t === t; }); def = tr ? (tr.d || '') : ''; }catch(e){}
        push(def, 70, 0);
      } else if(t && t.ru){ push(t.ru, 90, 0); push(t.desc || '', 70, 0); }
    });
    (l.blocks || []).forEach(function(b, bi){
      if(!b) return;
      if(typeof b.level1 === 'string') push(b.level1, 60, bi);
      if(typeof b.level2 === 'string') push(b.level2, 60, bi);
      if(b.type === 'recap' && b.points) b.points.forEach(function(p){ push(p, 50, bi); });
    });
  });
  (typeof TERMS !== 'undefined' ? TERMS : []).forEach(function(t){
    if(!t || !t.t) return;
    idx.push({ type: 'term', term: t, w: 95,
      text: [t.t, t.d, t.a, t.w].map(function(x){ return lp3Strip(x); }).filter(Boolean).join(' · ') });
  });
  try{
    var AG = ABBREVIATION_GLOSSARY;
    Object.keys(AG).forEach(function(k){
      var e = AG[k] || {};
      idx.push({ type: 'abbr', key: k, title: lp3Strip(e.title || k), w: 95, text: lp3Strip(e.text || '') });
    });
  }catch(e){}
  _lp3Idx = idx;
  return idx;
}
function lp3Hay(it){
  if(it._low !== undefined) return it._low;
  var s;
  if(it.type === 'term'){ s = [it.term.t, it.term.d, it.term.a, it.term.w].map(function(x){ return String(x || ''); }).join(' '); }
  else if(it.type === 'abbr'){ s = it.key + ' ' + it.title + ' ' + it.text; }
  else { s = it.text; /* каждая запись урока — отдельное поле: pos обязан быть позицией в text (иначе фрагмент нарезается мимо) */ }
  it._low = s.toLowerCase();
  return it._low;
}
function lp3Search(q){
  q = String(q || '').toLowerCase().trim();
  if(q.length < 2) return { query: q, results: [] };
  var idx = lp3SearchIndex();
  var res = [];
  for(var i = 0; i < idx.length; i++){
    var it = idx[i];
    var p = lp3Hay(it).indexOf(q);
    if(p < 0) continue;
    res.push({ it: it, pos: p, score: it.w - Math.min(p, 60) * 0.15 });
  }
  res.sort(function(a, b){ return b.score - a.score; });
  /* дедупликация: у уроков — лучшее вхождение на (урок, blockIndex); всего ≤30 */
  var seen = {}, out = [];
  for(var j = 0; j < res.length && out.length < 30; j++){
    var r = res[j], key;
    if(r.it.type === 'lesson') key = 'L' + r.it.id + '#' + r.it.blockIndex;
    else if(r.it.type === 'term') key = 'T' + r.it.term.t;
    else key = 'A' + r.it.key;
    if(seen[key]) continue;
    seen[key] = 1;
    out.push(r);
  }
  return { query: q, results: out };
}
function lp3Frag(text, pos, q){
  var from = Math.max(0, pos - 42), to = Math.min(text.length, pos + q.length + 84);
  var frag = (from > 0 ? '…' : '') + text.slice(from, to) + (to < text.length ? '…' : '');
  var escd = esc(frag);
  var idx = escd.toLowerCase().indexOf(q);
  if(idx >= 0){
    escd = escd.slice(0, idx) + '<mark>' + escd.slice(idx, idx + q.length) + '</mark>' + escd.slice(idx + q.length);
  }
  return escd;
}
function lp3SearchResultsHtml(q){
  var r = lp3Search(q);
  if(!r.results.length){
    return '<div class="lp3-sr-none">' + (q.trim().length < 2 ?
      'Введите минимум 2 символа — ищу по урокам, терминам и аббревиатурам.' :
      'Ничего не найдено; попробуй другое слово. Индекс: уроки (название/lead/теория/выводы), глоссарий, аббревиатуры.') + '</div>';
  }
  var h = '';
  r.results.forEach(function(x, i){
    var it = x.it;
    if(it.type === 'lesson'){
      h += '<button type="button" class="lp3-sr" data-lp3-sr="' + attr(it.id) + '" data-lp3-sr-bi="' + it.blockIndex + '">' +
        '<span class="h">Урок ' + esc(it.num) + ' · ' + esc(it.title) + ' — Фаза ' + esc(it.phase) + '</span>' +
        '<span class="f">' + lp3Frag(it.text, x.pos, r.query) + '</span></button>';
    } else if(it.type === 'term'){
      var t = it.term;
      h += '<div class="lp3-sr" style="cursor:default">' +
        '<span class="h">📖 Термин: ' + esc(t.t) + '</span>' +
        '<span class="f">' + esc(t.d || '') + '</span>' +
        (t.a ? '<span class="lp3-sub">💡 Аналогия: ' + esc(t.a) + '</span>' : '') +
        (t.w ? '<span class="lp3-sub">⚠ Почему важно: ' + esc(t.w) + '</span>' : '') + '</div>';
    } else {
      h += '<div class="lp3-sr" style="cursor:default">' +
        '<span class="h">🔤 ' + esc(it.key) + ' — ' + esc(it.title) + '</span>' +
        '<span class="f">' + esc(it.text) + '</span></div>';
    }
  });
  return h;
}
/* переиспользуемый рендер результатов в хабе */
function lp3HomeSearchRender(q){
  if(!H.root) return;
  var out = H.root.querySelector('.lp3-search-out');
  if(!out) return;
  if(String(q || '').trim().length < 2){ out.style.display = 'none'; out.innerHTML = ''; return; }
  out.style.display = '';
  out.innerHTML = '<div class="lp3-sec"><div class="lp3-sec-h">🔎 Результаты поиска</div>' + lp3SearchResultsHtml(q) + '</div>';
}
/* переход из поиска: хаб закрывается → плеер на шаге совпадения (blockIndex → stepIdx) */
function lp3StepForBlock(l, blockIndex){
  try{
    var steps = buildLessonSteps(l);
    for(var i = 0; i < steps.length; i++){
      if(steps[i].blockIndex === blockIndex) return i;
    }
  }catch(e){}
  return undefined;
}
function lp3SearchJump(lessonId, blockIndexRaw){
  var l = lessonById(lessonId);
  if(!l) return;
  var bi = parseInt(blockIndexRaw, 10);
  var stepIdx = isNaN(bi) ? undefined : lp3StepForBlock(l, bi);
  lp3OpenFromHome(lessonId, stepIdx);
}

/* Поиск из открытого плеера: Ctrl+K → оверлей внутри корня плеера */
function lp3SearchOverlayToggle(){
  if(!S.root) return;
  var ex = S.root.querySelector('.learn-overlay[data-ov="lp3search"]');
  if(ex){ ex.remove(); return; }
  var ov = document.createElement('div');
  ov.className = 'learn-overlay'; ov.setAttribute('data-ov', 'lp3search');
  ov.innerHTML = '<div class="learn-sheet">' +
    '<h3>🔎 Поиск по курсу</h3>' +
    '<div class="lp3-search" style="margin-bottom:12px"><span aria-hidden="true">🔍</span>' +
    '<input type="search" class="lp3-search-in" placeholder="Уроки, термины, аббревиатуры…" aria-label="Поиск по курсу"></div>' +
    '<div class="lp3-ov-results" style="max-height:46vh;overflow-y:auto"></div>' +
    '<div style="margin-top:12px;text-align:right"><button type="button" class="lp-btn" data-lp3-close-search>Закрыть (Esc)</button></div></div>';
  ov.addEventListener('click', function(e){
    if(e.target === ov || e.target.closest('[data-lp3-close-search]')){ ov.remove(); return; }
    var sr = e.target.closest('[data-lp3-sr]');
    if(sr){
      ov.remove();
      var l = lessonById(sr.getAttribute('data-lp3-sr'));
      if(!l) return;
      var bi = parseInt(sr.getAttribute('data-lp3-sr-bi'), 10);
      var stepIdx = isNaN(bi) ? undefined : lp3StepForBlock(l, bi);
      if(S.active && S.lessonId === l.id && typeof stepIdx === 'number'){ renderStep(stepIdx); return; }
      LearnPlayer.open(l.id, stepIdx);
    }
  });
  var inp = ov.querySelector('.lp3-search-in');
  var out = ov.querySelector('.lp3-ov-results');
  inp.addEventListener('input', function(){
    var q = inp.value;
    out.innerHTML = String(q || '').trim().length < 2 ? '' : lp3SearchResultsHtml(q);
  });
  S.root.appendChild(ov);
  inp.focus();
}

/* ============================== SYLLABUS (P3, ТЗ §12.2) ==============================
   Вкладки левой панели: «Шаги | Программа | Конспект»; активная вкладка и
   раскрытая фаза — LS cn_learn_syllabus. */
var _lp3PanelTab = (function(){ var t = lp3SyllabusState().tab; return (t === 'program' || t === 'notes') ? t : 'steps'; })();

function lp3SetPanelTab(tab, opts){
  _lp3PanelTab = (tab === 'program' || tab === 'notes') ? tab : 'steps';
  lp3SyllabusSet({ tab: _lp3PanelTab });
  if(!S.root) return;
  var map = S.root.querySelector('.learn-map');
  if(!map) return;
  if(TS.active){ if(!(opts && opts.keepTest)) renderTestMap(); else lp3EnsureTabs(); }
  else if(!FC.active){ renderMap(); }
  else lp3EnsureTabs();
}
function lp3EnsureTabs(){
  if(!S.root) return;
  var map = S.root.querySelector('.learn-map');
  if(!map) return;
  var old = map.querySelector('.lp3-tabs');
  if(old) old.remove();
  if(FC.active) return; // в режиме карточек панель не отвлекаем
  var el = document.createElement('div');
  el.className = 'lp3-tabs';
  var def = [['steps', 'Шаги'], ['program', 'Программа'], ['notes', 'Конспект']];
  el.innerHTML = def.map(function(d){
    return '<button type="button" class="lp-btn' + (_lp3PanelTab === d[0] ? ' on' : ' ghost') + '" data-lp3-tab="' + d[0] + '"' +
      (_lp3PanelTab === d[0] ? ' aria-current="true"' : '') + '>' + d[1] +
      (d[0] === 'notes' && lp3NotesGet().length ? '<span class="lp3-note-count">' + lp3NotesGet().length + '</span>' : '') +
      '</button>';
  }).join('');
  map.insertBefore(el, map.firstChild);
}
/* Программа внутри плеера: дерево Фаза → уроки, текущий урок подсвечен */
function lp3MapProgram(){
  if(!S.root) return;
  var map = S.root.querySelector('.learn-map');
  if(!map) return;
  var syll = lp3SyllabusState();
  var openPh = (typeof syll.phase === 'number') ? syll.phase : (lessonById(S.lessonId) || {}).phase;
  if(typeof openPh !== 'number') openPh = 0;
  var curId = S.lessonId;
  var h = '';
  lp3PhaseNums().forEach(function(ph){
    var c = lp3PhaseCounts(ph);
    var isOpen = ph === openPh;
    h += '<div class="lp3-ph' + (isOpen ? ' open' : '') + '">';
    h += '<button type="button" class="lp3-ph-h" data-lp3-mph="' + ph + '" aria-expanded="' + isOpen + '">' +
      '<span class="t" style="font-size:12.5px">' + esc(lp3PhaseShort(ph)) + '</span>' +
      '<span class="m">' + c.done + '/' + c.total + '</span></button>';
    if(isOpen){
      h += '<div class="lp3-ph-list" style="padding:0 4px 8px">';
      LESSONS.forEach(function(l){
        if(l.phase !== ph) return;
        var done = isDone(l.id);
        h += '<button type="button" class="lp3-les' + (done ? ' done' : '') + (l.id === curId ? ' current' : '') + '" data-lp3-mopen="' + attr(l.id) + '"' + (l.id === curId ? ' aria-current="true"' : '') + '>' +
          '<span class="ck" style="flex-basis:18px;height:18px">' + (done ? '✓' : '') + '</span>' +
          '<span class="t" style="font-size:11.5px">Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + '</span></button>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  map.innerHTML = '<div class="learn-map-h">Программа курса</div>' + h;
}
function lp3PanelClick(e){
  var an = e.target.closest('[data-lp3-act="lp3anchor"]');
  if(an){
    var al = lessonById(S.lessonId);
    if(al) lp3OpenProgramAt(al.phase);
    return;
  }
  var tab = e.target.closest('[data-lp3-tab]');
  if(tab){ lp3SetPanelTab(tab.getAttribute('data-lp3-tab')); return; }
  var mph = e.target.closest('[data-lp3-mph]');
  if(mph){
    var v = parseInt(mph.getAttribute('data-lp3-mph'), 10);
    var cur = lp3SyllabusState().phase;
    lp3SyllabusSet({ phase: (cur === v ? -1 : v) });
    lp3SetPanelTab(_lp3PanelTab, { keepTest: true });
    return;
  }
  var mo = e.target.closest('[data-lp3-mopen]');
  if(mo){
    var id = mo.getAttribute('data-lp3-mopen');
    if(id === S.lessonId){ return; } // уже открыт
    LearnPlayer.open(id); // обёртка вернёт вкладку на «Шаги» (P3.3)
    return;
  }
  if(lp3NoteActionClick(e)) return;
}

/* ============================== ЯКОРЯ (P4, ТЗ §12.3) ============================== */
function lp3UpdateAnchor(){
  if(!S.root) return;
  var a = S.root.querySelector('.lp3-anchor');
  if(!a) return;
  var l = S.active ? lessonById(S.lessonId) : null;
  if(!l || TS.active || FC.active){ a.style.display = 'none'; return; }
  var c = lp3PhaseCounts(l.phase);
  a.style.display = '';
  a.innerHTML = 'Фаза ' + l.phase + ': ' + c.done + '/' + c.total;
  a.title = 'Прогресс фазы по lessonsDone — открыть программу курса';
}
function lp3OpenProgramAt(ph){
  lp3SyllabusSet({ phase: ph });
  lp3SetPanelTab('program');
  if(S.root) S.root.setAttribute('data-map-open', '1'); // на мобильных выдвижная панель откроется
}

/* ---------- Финал урока: «Фаза пройдена на X%» + CTA «в курсе» +
   рекомендация адаптивной тренировки (≥3 ошибок в квизе урока) ---------- */
function lp3CourseFinaleHtml(l){
  var h = '';
  var c = lp3PhaseCounts(l.phase);
  h += '<div style="text-align:center;margin-top:14px;color:var(--mut);font-size:calc(var(--lp-fs) - 4px);line-height:1.5">' +
    'Фаза ' + esc(l.phase) + ' пройдена на <b style="color:var(--txt)">' + lp3PhasePct(l.phase) + '%</b> (' + c.done + ' из ' + c.total + ' уроков · по lessonsDone)</div>';
  var nxt = lp3NextUnpassed();
  h += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px">';
  if(nxt){
    h += '<button type="button" class="lp-btn primary" onclick="LearnPlayer.open(\'' + attr(nxt.id) + '\')">▸ Следующий непройденный урок курса: ' + esc(nxt.title) + ' <span class="learn-badge">в курсе</span></button>';
  } else {
    var bank = lp3FirstUnpassedBank();
    h += '<span class="learn-badge" style="background:rgba(34,197,94,.18);color:var(--ok)">🏅 Курс пройден полностью</span>';
    h += bank ?
      '<button type="button" class="lp-btn primary" onclick="LearnPlayer.openTest(\'' + bank + '\')">▸ К тестам</button>' :
      '<button type="button" class="lp-btn primary" onclick="LearnPlayer.openHome()">🎓 Моё обучение</button>';
  }
  h += '</div>';
  /* Рекомендация (ТЗ §11.9 соблюдено: ADAPTIVE_QUESTION_BANK не трогаем —
     только ссылка на существующий запуск): ≥3 неверных попыток в квизе урока */
  var att = 0;
  try{ att = S.quizAttempts[l.id] || 0; }catch(e){}
  if(att >= 3){
    h += '<div class="learn-card warn" style="max-width:560px;margin:16px auto 0;padding:14px 18px;text-align:left">' +
      '<div style="font-weight:800;margin-bottom:6px">🔄 Квиз дался непросто (' + att + ' неверных попыток)</div>' +
      '<div style="font-size:calc(var(--lp-fs) - 5px);color:var(--mut);line-height:1.55;margin-bottom:10px">Запусти адаптивную тренировку — она подберёт вопросы по слабым темам из существующего банка и закрепит материал.</div>' +
      '<button type="button" class="lp-btn primary" onclick="LearnPlayer._goAdaptive()">🔄 Пройти адаптивную тренировку по этой теме</button></div>';
  }
  return h;
}
/* Переход к адаптивной тренировке: плеер закрывается (prepost-модалка z 120000
   остаётся под плеером — закрываем ДО запуска), затем существующий контур:
   window.startAdaptiveWorkout() сам делает go('quiz') и подбор тем. */
function lp3GoAdaptive(){
  try{ closePlayer(); }catch(e){}
  try{
    if(typeof window.startAdaptiveWorkout === 'function'){ window.startAdaptiveWorkout(); return; }
  }catch(e){ console.warn('[LearnPlayer3] adaptive fail', e); }
  try{ if(typeof go === 'function') go('quiz'); }catch(e2){}
}
