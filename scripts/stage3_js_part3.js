/* ============================== КОНСПЕКТ (P6, ТЗ §12.5) ==============================
   LS cn_learn_notes = [{id, lessonId, stepIdx, quote≤500, note, ts}] ≤500;
   дубликаты «тот же lessonId+quote» не создаются (обновляется ts). */
function lp3NotesGet(){
  var a = lpLS_get('cn_learn_notes', []);
  return Array.isArray(a) ? a : [];
}
function lp3NotesSet(a){
  lpLS_set('cn_learn_notes', (Array.isArray(a) ? a : []).slice(0, LP3_NOTES_MAX));
}
function lp3AddNote(quote){
  var arr = lp3NotesGet();
  var ex = null;
  for(var i = 0; i < arr.length; i++){
    if(arr[i].lessonId === S.lessonId && arr[i].quote === quote){ ex = arr[i]; break; }
  }
  if(ex){ ex.ts = Date.now(); toast('Цитата уже в конспекте — обновлена', '📝'); }
  else {
    arr.unshift({ id: 'n' + Date.now() + Math.floor(Math.random() * 100), lessonId: S.lessonId,
      stepIdx: S.idx || 0, quote: quote, note: '', ts: Date.now() });
    if(arr.length > LP3_NOTES_MAX) arr = arr.slice(0, LP3_NOTES_MAX);
    toast('Добавлено в конспект 📝', '📝');
  }
  lp3NotesSet(arr);
  lp3RerenderNotesPanels();
}
function lp3NoteDelete(id){
  var arr = lp3NotesGet();
  var idx = -1;
  for(var i = 0; i < arr.length; i++){ if(arr[i].id === id){ idx = i; break; } }
  if(idx < 0) return;
  _lp3UndoNote = { note: arr[idx], at: Date.now() };
  arr.splice(idx, 1);
  lp3NotesSet(arr);
  lp3RerenderNotesPanels();
  setTimeout(function(){
    if(_lp3UndoNote && Date.now() - _lp3UndoNote.at >= 9000){ _lp3UndoNote = null; lp3RerenderNotesPanels(); }
  }, 9200);
}
function lp3NoteUndo(){
  if(!_lp3UndoNote) return;
  var arr = lp3NotesGet();
  arr.unshift(_lp3UndoNote.note);
  lp3NotesSet(arr);
  _lp3UndoNote = null;
  lp3RerenderNotesPanels();
  toast('Заметка восстановлена', '📝');
}

/* Плавающая кнопка «＋ В конспект» — только в .learn-content режима урока */
var _lp3Fab = null;
function lp3HideFab(){ if(_lp3Fab){ _lp3Fab.remove(); _lp3Fab = null; } }
function lp3SelectionUp(){
  lp3HideFab();
  try{
    if(!S.active || !S.lessonId || TS.active || FC.active || H.active) return;
    var sel = window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    var text = String(sel).replace(/\s+/g, ' ').trim();
    if(text.length < 3) return;
    var an = sel.anchorNode;
    if(!an) return;
    var el = an.nodeType === 1 ? an : an.parentNode;
    if(!el || !el.closest) return;
    var content = S.root ? S.root.querySelector('.learn-content') : null;
    if(!content || !content.contains(el)) return;
    if(el.closest('input, textarea, select, pre, code, .learn-top, .learn-bottom, .learn-map')) return;
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if(!rect || (!rect.width && !rect.height)) return;
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'lp3_note_fab';
    fab.textContent = '＋ В конспект';
    fab.setAttribute('aria-label', 'Добавить выделенное в конспект');
    fab.style.left = Math.max(8, Math.min(window.innerWidth - 160, rect.left + rect.width / 2 - 66)) + 'px';
    fab.style.top = Math.max(8, rect.top - 44) + 'px';
    fab.addEventListener('mousedown', function(ev){ ev.preventDefault(); ev.stopPropagation(); });
    fab.addEventListener('click', function(ev){
      ev.stopPropagation();
      var q = String(window.getSelection()).replace(/\s+/g, ' ').trim().slice(0, 500);
      if(q) lp3AddNote(q);
      try{ window.getSelection().removeAllRanges(); }catch(e2){}
      lp3HideFab();
    });
    document.body.appendChild(fab);
    _lp3Fab = fab;
  }catch(e){ /* выделение вне шага — игнор */ }
}
document.addEventListener('mouseup', lp3SelectionUp, true);
document.addEventListener('scroll', function(){ lp3HideFab(); }, true);
document.addEventListener('selectionchange', function(){
  var sel = window.getSelection();
  if(!sel || sel.isCollapsed) lp3HideFab();
});

/* Панель конспекта (вкладка левой панели + раздел Learn Home) */
function lp3NotesPanelHtml(){
  var arr = lp3NotesGet();
  var h = '';
  if(_lp3UndoNote){
    h += '<div class="lp3-undo"><span>Заметка удалена</span>' +
      '<button type="button" class="lp-btn sm" data-lp3-note-undo>↩ Вернуть</button></div>';
  }
  if(!arr.length){
    h += '<div class="lp3-empty">Заметок нет. Выдели текст в шаге урока — появится кнопка «＋ В конспект».</div>';
    return h;
  }
  h += '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">' +
    '<button type="button" class="lp-btn sm" data-lp3-notes-copy>📋 Скопировать всё (markdown)</button></div>';
  var order = [], groups = {};
  arr.forEach(function(n){
    if(!groups[n.lessonId]){ groups[n.lessonId] = []; order.push(n.lessonId); }
    groups[n.lessonId].push(n);
  });
  order.forEach(function(lid){
    var l = lessonById(lid);
    h += '<div class="lp3-ng"><div class="lp3-ng-h">' +
      (l ? ('Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + ' <span style="color:var(--mut)">· Фаза ' + esc(l.phase) + '</span>') : esc(lid)) +
      '</div>';
    groups[lid].forEach(function(n){
      h += '<div class="lp3-note" data-nid="' + attr(n.id) + '">' +
        '<button type="button" class="lp3-note-q" data-lp3-note-open="' + attr(n.id) + '" title="Перейти к шагу">«' + esc(n.quote.length > 150 ? n.quote.slice(0, 149) + '…' : n.quote) + '»</button>' +
        (n.note ? '<div class="lp3-note-c">' + esc(n.note) + '</div>' : '') +
        '<div class="lp3-note-meta"><span>' + lp3DateFmt(n.ts) + ' · шаг ' + ((n.stepIdx || 0) + 1) + '</span>' +
        '<span style="display:inline-flex;gap:4px">' +
        '<button type="button" class="lp-btn sm ghost" data-lp3-note-edit="' + attr(n.id) + '" aria-label="Комментарий" title="Комментарий ✎">✎</button>' +
        '<button type="button" class="lp-btn sm ghost" data-lp3-note-del="' + attr(n.id) + '" aria-label="Удалить заметку" title="Удалить 🗑">🗑</button>' +
        '</span></div></div>';
    });
    h += '</div>';
  });
  return h;
}
function lp3MapNotes(){
  if(!S.root) return;
  var map = S.root.querySelector('.learn-map');
  if(!map) return;
  map.innerHTML = '<div class="learn-map-h">📝 Конспект · ' + lp3NotesGet().length + '</div>' +
    '<div style="padding:0 8px 40px">' + lp3NotesPanelHtml() + '</div>';
}
function lp3NotesSectionHtml(){
  return '<section class="lp3-sec"><div class="lp3-sec-h">📝 Конспект (' + lp3NotesGet().length + ')</div>' + lp3NotesPanelHtml() + '</section>';
}
function lp3RerenderNotesPanels(){
  if(S.active && S.root && !FC.active){
    if(TS.active){ if(_lp3PanelTab === 'notes') renderTestMap(); else lp3EnsureTabs(); }
    else if(_lp3PanelTab === 'notes') renderMap();
    else lp3EnsureTabs();
  }
  if(H.active) lp3RerenderHome();
}
/* Общие обработчики карточек заметок (панель плеера + хаб) */
function lp3NoteActionClick(e){
  var no = e.target.closest('[data-lp3-note-open]');
  if(no){ lp3NoteJump(no.getAttribute('data-lp3-note-open')); return true; }
  var ne = e.target.closest('[data-lp3-note-edit]');
  if(ne){ lp3NoteEditInline(ne.getAttribute('data-lp3-note-edit')); return true; }
  var nd = e.target.closest('[data-lp3-note-del]');
  if(nd){ lp3NoteDelete(nd.getAttribute('data-lp3-note-del')); return true; }
  var nc = e.target.closest('[data-lp3-notes-copy]');
  if(nc){ copyText(lp3NotesMarkdown(), 'Конспект скопирован (markdown)'); return true; }
  var nu = e.target.closest('[data-lp3-note-undo]');
  if(nu){ lp3NoteUndo(); return true; }
  var ns = e.target.closest('[data-lp3-note-save]');
  if(ns){ lp3NoteSaveInline(ns.getAttribute('data-lp3-note-save')); return true; }
  var nx = e.target.closest('[data-lp3-note-cancel]');
  if(nx){ lp3RerenderNotesPanels(); return true; }
  return false;
}
function lp3NoteJump(id){
  var arr = lp3NotesGet(), n = null;
  for(var i = 0; i < arr.length; i++){ if(arr[i].id === id){ n = arr[i]; break; } }
  if(!n) return;
  if(S.active && S.lessonId === n.lessonId && S.root){
    lp3HideFab();
    renderStep(Math.min(n.stepIdx || 0, S.steps.length - 1));
    S.root.setAttribute('data-map-open', '0');
    return;
  }
  if(S.active){ LearnPlayer.open(n.lessonId, n.stepIdx || 0); return; }
  lp3OpenFromHome(n.lessonId, n.stepIdx || 0);
}
function lp3NoteHostEl(id){
  var host = null;
  if(S.root) host = S.root.querySelector('.lp3-note[data-nid="' + id + '"]');
  if(!host && H.root) host = H.root.querySelector('.lp3-note[data-nid="' + id + '"]');
  return host;
}
function lp3NoteEditInline(id){
  var host = lp3NoteHostEl(id);
  if(!host) return;
  var meta = host.querySelector('.lp3-note-meta');
  if(!meta || meta.querySelector('textarea')) return;
  var arr = lp3NotesGet(), n = null;
  for(var i = 0; i < arr.length; i++){ if(arr[i].id === id){ n = arr[i]; break; } }
  if(!n) return;
  var wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;margin-top:6px';
  wrap.innerHTML = '<textarea class="lp3-note-ta" placeholder="Свой комментарий к цитате…" aria-label="Комментарий к заметке">' + esc(n.note || '') + '</textarea>' +
    '<div style="display:flex;gap:8px;margin-top:6px">' +
    '<button type="button" class="lp-btn sm primary" data-lp3-note-save="' + attr(id) + '">Сохранить</button>' +
    '<button type="button" class="lp-btn sm ghost" data-lp3-note-cancel>Отмена</button></div>';
  meta.appendChild(wrap);
  var ta = wrap.querySelector('textarea');
  ta.focus();
  try{ ta.setSelectionRange(ta.value.length, ta.value.length); }catch(e){}
}
function lp3NoteSaveInline(id){
  var host = lp3NoteHostEl(id);
  var ta = host ? host.querySelector('textarea') : null;
  var val = ta ? ta.value.trim() : null;
  var arr = lp3NotesGet(), n = null;
  for(var i = 0; i < arr.length; i++){ if(arr[i].id === id){ n = arr[i]; break; } }
  if(n && val !== null){
    n.note = val.slice(0, 2000);
    n.ts = Date.now();
    lp3NotesSet(arr);
    toast('Комментарий сохранён', '📝');
  }
  lp3RerenderNotesPanels();
}
/* Markdown-экспорт (§P6.4): валидные заголовки/цитаты/пустые строки */
function lp3NotesMarkdown(){
  var arr = lp3NotesGet();
  var out = '# Конспект — КриптоНавигатор\n';
  var order = [], groups = {};
  arr.forEach(function(n){
    if(!groups[n.lessonId]){ groups[n.lessonId] = []; order.push(n.lessonId); }
    groups[n.lessonId].push(n);
  });
  order.forEach(function(lid){
    var l = lessonById(lid);
    out += '\n## ' + (l ? ((l.num ? l.num + ' ' : '') + l.title) : lid) + (l ? ' (Фаза ' + l.phase + ')' : '') + '\n';
    groups[lid].forEach(function(n){
      out += '\n> «' + String(n.quote || '').replace(/\s*\n+\s*/g, ' ') + '»\n';
      if(n.note) out += '\n— ' + String(n.note).replace(/\s*\n+\s*/g, ' ') + '\n';
    });
  });
  return out;
}

/* ============================== НЕДАВНИЕ (P7) ============================== */
function lp3PushRecent(lessonId){
  try{
    if(!lessonId || !lessonById(lessonId)) return;
    var a = lpLS_get('cn_learn_recent', []);
    if(!Array.isArray(a)) a = [];
    a = a.filter(function(x){ return x && x.lessonId !== lessonId; });
    a.unshift({ lessonId: lessonId, ts: Date.now() });
    lpLS_set('cn_learn_recent', a.slice(0, 5));
  }catch(e){}
}

/* ============================== ОБЁРТКИ КАРКАСА (продолжение цепочки Этапа 2) ============================== */
/* buildRoot: якорь фазы в шапке + делегат панели + Ctrl+K (capture) */
var _lp3BuildRoot = buildRoot;
buildRoot = function(l){
  var root = _lp3BuildRoot(l);
  try{
    var row = root.querySelector('.learn-progress-row');
    if(row){
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'lp3-anchor';
      a.setAttribute('data-lp3-act', 'lp3anchor');
      a.setAttribute('aria-label', 'Прогресс фазы — открыть программу курса');
      a.style.display = 'none';
      row.appendChild(a);
    }
    root.addEventListener('click', lp3PanelClick, false);
    root.addEventListener('keydown', function(e){
      if((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || String(e.key).toLowerCase() === 'k' || String(e.key).toLowerCase() === 'к')){
        e.preventDefault(); e.stopPropagation();
        lp3SearchOverlayToggle();
      }
    }, true);
  }catch(e){}
  return root;
};
/* Esc: сначала закрыть оверлей поиска, потом плеер */
var _lp3OnKeydown = onKeydown;
onKeydown = function(e){
  if(S.active && e.key === 'Escape' && S.root){
    var ov = S.root.querySelector('.learn-overlay[data-ov="lp3search"]');
    if(ov){ e.stopPropagation(); e.preventDefault(); ov.remove(); return; }
  }
  return _lp3OnKeydown.apply(this, arguments);
};
/* Карта шагов/порций: вкладка «Программа»/«Конспект» заменяет содержимое */
var _lp3RenderMap = renderMap;
renderMap = function(){
  if(!FC.active && _lp3PanelTab === 'program'){ lp3MapProgram(); lp3EnsureTabs(); return; }
  if(!FC.active && _lp3PanelTab === 'notes'){ lp3MapNotes(); lp3EnsureTabs(); return; }
  _lp3RenderMap();
  lp3EnsureTabs();
};
var _lp3RenderTestMap = renderTestMap;
renderTestMap = function(){
  if(!FC.active && _lp3PanelTab === 'program'){ lp3MapProgram(); lp3EnsureTabs(); return; }
  if(!FC.active && _lp3PanelTab === 'notes'){ lp3MapNotes(); lp3EnsureTabs(); return; }
  _lp3RenderTestMap();
  lp3EnsureTabs();
};
/* Хром: якорь фазы */
var _lp3UpdateChrome = updateChrome;
updateChrome = function(){
  _lp3UpdateChrome();
  try{ lp3UpdateAnchor(); }catch(e){}
};
/* Финал: «Фаза X%» + CTA курса + адаптивная рекомендация */
var _lp3FinaleExtras = finaleExtrasHtml;
finaleExtrasHtml = function(l){
  var base = _lp3FinaleExtras(l);
  try{ return base + lp3CourseFinaleHtml(l); }catch(e){ return base; }
};
/* Тема хаба синхронно с плеером */
var _lp3ApplyTheme = applyTheme;
applyTheme = function(){
  _lp3ApplyTheme();
  try{ lp3SyncThemeEl(H.root); }catch(e){}
};
/* Открытие урока: хаб закрывается; недавние; вкладка → «Шаги» (P3.3) */
var _lp3OpenPlayer = openPlayer;
openPlayer = function(lessonId, stepIdx, opts){
  if(H.active) Home.close(true);
  var r = _lp3OpenPlayer.apply(this, arguments);
  try{ lp3PushRecent(lessonId); }catch(e){}
  try{ lp3SetPanelTab('steps'); }catch(e){}
  return r;
};
/* Закрытие плеера: from:'home' → возврат в хаб (патч-план §3) */
var _lp3ClosePlayer = closePlayer;
closePlayer = function(){
  var ret = _lp3ReturnHome;
  _lp3ReturnHome = false;
  _lp3ClosePlayer();
  if(ret && !S.active && !H.active){ try{ Home.open(); }catch(e){} }
};
/* openTest: из хаба — закрыть хаб и пометить возврат */
var _lp3OpenTestExport = window.LearnPlayer.openTest;
window.LearnPlayer.openTest = function(testId, from){
  if(H.active){ Home.close(true); _lp3ReturnHome = true; }
  _lp3OpenTestExport(testId, from);
};

/* ============================== ТОЧКА ВХОДА В ШАПКЕ (P2) ==============================
   Кнопка «🎓» — наша (Этап 1 P8.4); правим поведение СВОЕЙ кнопки на уровне
   DOM (clone без слушателей), исходный код не меняется. */
function lp3HookHeader(){
  var b = document.getElementById('lp_header_btn');
  if(!b) return false;
  if(b.getAttribute('data-lp3') === '1') return true;
  var nb = b.cloneNode(false);
  nb.id = 'lp_header_btn';
  nb.setAttribute('data-lp3', '1');
  nb.title = 'Моё обучение 🎓 — хаб курса (Learn Home)';
  nb.setAttribute('aria-label', 'Моё обучение');
  nb.textContent = '🎓';
  if(b.parentNode) b.parentNode.replaceChild(nb, b);
  nb.addEventListener('click', function(){ if(H.active) return; Home.open(); }); // при открытом хабе — игнор (P2.3)
  return true;
}
(function lp3HeaderRetry(n){
  if(lp3HookHeader()) return;
  if(n > 0) setTimeout(function(){ lp3HeaderRetry(n - 1); }, 150);
})(20);

/* ============================== SMOKE / SELFTEST (P8) ============================== */
function smoke3(){
  if(!(window.V10 && window.V10.smoke)) return;
  try{
    V10.smoke.add('lp3:home-api', typeof window.LearnPlayer.openHome === 'function' &&
      typeof window.LearnPlayer.search === 'function' &&
      typeof window.LearnPlayer.openNote === 'function' &&
      typeof window.LearnPlayer.exportNotesMarkdown === 'function', window.LearnPlayer.version);
    var phs = lp3PhaseNums(), sum = 0, seen = {}, eachOne = true;
    phs.forEach(function(ph){
      LESSONS.forEach(function(l){
        if(l.phase !== ph) return;
        sum++;
        if(seen[l.id]) eachOne = false;
        seen[l.id] = 1;
      });
    });
    V10.smoke.add('lp3:program-213', eachOne && sum === LESSONS.length && LESSONS.length === 213,
      sum + ' уроков в ' + phs.length + ' фазах, каждый ровно в одной');
    var pct = learnCoursePct();
    V10.smoke.add('lp3:course-pct', typeof pct === 'number' && isFinite(pct) && pct >= 0 && pct <= 100,
      'Курс ' + pct + '% — реплика формулы вкладки «Прогресс»');
    var sr = lp3Search('ликвидация');
    var lessonsN = 0;
    sr.results.forEach(function(r){ if(r.it.type === 'lesson') lessonsN++; });
    V10.smoke.add('lp3:search-index', !!_lp3Idx && sr.results.length > 0 && lessonsN >= 2,
      '«ликвидация»: ' + sr.results.length + ' результатов (уроков ' + lessonsN + ')');
    var okN = true;
    try{
      var saveN = lpLS_get('cn_learn_notes', null);
      var big = [];
      for(var i = 0; i < 505; i++) big.push({ id: 'x' + i, lessonId: 'p0_l1', stepIdx: 0, quote: 'q' + i, note: '', ts: i });
      lp3NotesSet(big);
      okN = lp3NotesGet().length === LP3_NOTES_MAX;
      if(saveN === null) localStorage.removeItem('cn_learn_notes'); else lpLS_set('cn_learn_notes', saveN);
    }catch(e){ okN = false; }
    V10.smoke.add('lp3:notes-ls', okN, 'cn_learn_notes читается/пишется, лимит ' + LP3_NOTES_MAX);
    var okR = true;
    try{
      var saveR = lpLS_get('cn_learn_recent', null);
      ['p0_l1', 'p0_l2', 'p0_l3', 'p0_l1', 'p1_l1', 'p1_l2', 'p1_l3'].forEach(function(id){ lp3PushRecent(id); });
      var rr = lpLS_get('cn_learn_recent', []);
      var dups = rr.filter(function(x){ return x.lessonId === 'p0_l1'; }).length;
      okR = rr.length <= 5 && dups === 1 && rr[0].lessonId === 'p1_l3';
      if(saveR === null) localStorage.removeItem('cn_learn_recent'); else lpLS_set('cn_learn_recent', saveR);
    }catch(e){ okR = false; }
    V10.smoke.add('lp3:recent-ls', okR, 'cn_learn_recent ≤5, LRU-уникальные, свежий — первым');
  }catch(e){
    try{ V10.smoke.add('lp3:smoke-error', false, String(e && e.message || e)); }catch(e2){}
  }
}
function selfTest3(){
  var out = { ok: true, errors: [] };
  try{
    var phs = lp3PhaseNums(), sum = 0, seen = {}, eachOne = true;
    phs.forEach(function(ph){
      LESSONS.forEach(function(l){
        if(l.phase !== ph) return;
        sum++;
        if(seen[l.id]) eachOne = false;
        seen[l.id] = 1;
      });
    });
    out.program = { sum: sum, phases: phs.length };
    if(sum !== LESSONS.length || !eachOne) out.errors.push('программа: ' + sum + '/' + LESSONS.length);
    var pct = learnCoursePct();
    out.coursePct = pct;
    if(!(typeof pct === 'number' && isFinite(pct) && pct >= 0 && pct <= 100)) out.errors.push('курс % некорректен');
    var sr = lp3Search('ликвидация');
    var lessonsN = 0;
    sr.results.forEach(function(r){ if(r.it.type === 'lesson') lessonsN++; });
    out.search = { total: sr.results.length, lessons: lessonsN };
    if(sr.results.length < 2 || lessonsN < 2) out.errors.push('поиск «ликвидация» слабый');
    var md = lp3NotesMarkdown();
    out.markdownOk = lp3NotesGet().length === 0 ? true : md.length > 30;
    if(!out.markdownOk) out.errors.push('markdown-экспорт пуст при наличии заметок');
    out.ok = !out.errors.length;
  }catch(e){ out.errors.push(String(e && e.message || e)); out.ok = false; }
  return out;
}
/* ============================== РАСШИРЕНИЕ API (публичный §3) ============================== */
window.LearnPlayer.version = '3.0 (Этап 3, ТЗ v2)';
window.LearnPlayer.openHome = function(){ if(S.active) return; Home.open(); };
window.LearnPlayer.closeHome = function(){ Home.close(); };
window.LearnPlayer.search = function(q){ return lp3Search(q); };
window.LearnPlayer.openNote = function(noteId){
  var arr = lp3NotesGet(), n = null;
  for(var i = 0; i < arr.length; i++){ if(arr[i].id === noteId){ n = arr[i]; break; } }
  if(!n) return null;
  lp3NoteJump(noteId);
  return n;
};
window.LearnPlayer.exportNotesMarkdown = function(){ return lp3NotesMarkdown(); };
window.LearnPlayer._learnCoursePct = learnCoursePct;
window.LearnPlayer._goAdaptive = lp3GoAdaptive;
var _lp3SelfTest2 = window.LearnPlayer.selfTest;
window.LearnPlayer.selfTest = function(){
  var a = _lp3SelfTest2 ? _lp3SelfTest2() : { ok: true, errors: [] };
  var b = selfTest3();
  a.lp3 = b;
  if(b && b.errors && b.errors.length) a.ok = false;
  return a;
};
smoke3(); /* после расширения API — проверяет наличие открытых функций */
/* ===== learn_player_stage3: Этап 3 (конец) ===== */
