/* ============================================================
   learn_player_stage5: ЭТАП 5 (БЭКЛОГ) — Часть 1.
   «Недавние» для тестов (хаб) + экспорт конспекта в файл.
   ------------------------------------------------------------
   Было (Этапы 3–4): хаб показывает «Недавние» только по урокам
   (cn_learn_recent LRU ≤5); конспект имеет кнопку «Скопировать
   (markdown)» (lp3-notes-copy), но файлом не скачивается.
   Стало:
   1) cn_learn_recent_tests = [{testId, ts}] ≤5, LRU — пишется на
      каждое открытие теста (обе точки входа: window-экспорт
      LearnPlayer.openTest и внутренний openTest из пикера 🏁);
   2) в хабе перед «🏁 Тесты и экзамены» — секция «🕘 Недавние
      тесты» (состояния через существующий bankMeta Этапа 2);
   3) в панели конспекта рядом с «Скопировать» — «⬇ Скачать
      файлом (.md)»: Blob + a.download, имя с датой;
      API: LearnPlayer.exportNotesFile().
   §0.1/§7.2: только новые LS-ключи cn_*, существующие функции
   не редактируются — обёртки над lp3HomeHtml / lp3NotesPanelHtml /
   lp3NoteActionClick (переприсвоение связки внутри IIFE).
   ============================================================ */

var LP5_RT_KEY = 'cn_learn_recent_tests';
var LP5_PT_KEY = 'cn_pt_start';

/* ---------- Недавние тесты: LRU ≤5 ---------- */
function lp5RecentTestsAll(){
  var a = lpLS_get(LP5_RT_KEY, []);
  return Array.isArray(a) ? a : [];
}
function lp5PushRecentTest(testId){
  try{
    if(!testId || typeof testId !== 'string') return;
    var r = null;
    try{ r = resolveBank(testId); }catch(e){}
    if(!r) return; /* неизвестный банк не пишем */
    var a = lp5RecentTestsAll().filter(function(x){ return x && x.testId !== testId; });
    a.unshift({ testId: testId, ts: Date.now() });
    lpLS_set(LP5_RT_KEY, a.slice(0, 5));
  }catch(e){}
}

/* Секция хаба: карточки по образцу lp3TestsHtml, клик — существующий
   обработчик data-lp3-test → lp3OpenTestFromHome (Этап 3). */
function lp5RecentTestsHtml(){
  var rec = lp5RecentTestsAll();
  var h = '<section class="lp3-sec" id="lp5_recent_tests"><div class="lp3-sec-h">🕘 Недавние тесты</div>';
  if(!rec.length){
    h += '<div class="lp3-empty">Пока пусто — открой любой тест из раздела «Тесты и экзамены» ниже или через пикер 🏁.</div>';
  } else {
    rec.forEach(function(x){
      var m = null;
      try{ m = bankMeta(x.testId); }catch(e){}
      if(!m) return; /* банк исчез из рантайма — строку не рисуем */
      h += '<button type="button" class="lp3-card" data-lp3-test="' + attr(x.testId) + '">' +
        '<span class="t">🏁 ' + esc(m.r.title) + '</span>' +
        '<span class="m">' + m.draftInfo + m.total + ' вопр.' + (m.req ? ' · порог ' + m.req : '') + '<br>' + m.state + '</span></button>';
    });
  }
  return h + '</section>';
}

/* Вставка секции в хаб БЕЗ правки lp3HomeHtml: детерминированный якорь —
   заголовок «🏁 Тесты и экзамены» (генерируется lp3TestsHtml Этапа 3). */
var _lp5HomeHtml = lp3HomeHtml;
lp3HomeHtml = function(){
  var h = _lp5HomeHtml.apply(this, arguments);
  try{
    var sec = lp5RecentTestsHtml();
    var anchor = '<section class="lp3-sec"><div class="lp3-sec-h">🏁 Тесты и экзамены</div>';
    if(h.indexOf(anchor) >= 0) h = h.replace(anchor, sec + anchor);
    else h += sec; /* якорь не найден — секция всё равно доступна (не теряем функцию) */
  }catch(e){}
  return h;
};

/* ---------- Экспорт конспекта в файл (БЭКЛОГ Э3) ---------- */
function lp5DownloadNotes(){
  try{
    var arr = lp3NotesGet();
    if(!arr.length){ toast('Конспект пуст — скачивать нечего', '📝'); return; }
    var md = lp3NotesMarkdown();
    var d = new Date();
    var stamp = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    /* BOM — чтобы UTF-8 корректно открывался в Блокноте Windows */
    var blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kriptonavigator-konspekt-' + stamp + '.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e2){} }, 4000);
    toast('Конспект скачан файлом (.md) — ' + arr.length + ' заметок', '⬇️');
  }catch(e){
    try{ toast('Не удалось скачать файл — используй «Скопировать всё»', '⚠️'); }catch(e1){}
  }
}
window.LearnPlayer.exportNotesFile = lp5DownloadNotes;

/* Кнопка в панели конспекта: обёртка lp3NotesPanelHtml добавляет кнопку
   в существующую панель инструментов рядом с «Скопировать всё». */
var _lp5NotesPanelHtml = lp3NotesPanelHtml;
lp3NotesPanelHtml = function(){
  var h = _lp5NotesPanelHtml.apply(this, arguments);
  try{
    var old = '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">' +
      '<button type="button" class="lp-btn sm" data-lp3-notes-copy>📋 Скопировать всё (markdown)</button></div>';
    var neu = '<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px">' +
      '<button type="button" class="lp-btn sm" data-lp3-notes-copy>📋 Скопировать всё (markdown)</button>' +
      '<button type="button" class="lp-btn sm" data-lp3-notes-dl>⬇ Скачать файлом (.md)</button></div>';
    if(h.indexOf(old) >= 0) h = h.replace(old, neu);
  }catch(e){}
  return h;
};

/* Обработчик: обёртка lp3NoteActionClick (общие обработчики панели и хаба).
   Наше действие проверяется ПЕРВЫМ, остальное — существующий контур Этапа 3. */
var _lp5NoteAction = lp3NoteActionClick;
lp3NoteActionClick = function(e){
  try{
    var nd = e.target.closest('[data-lp3-notes-dl]');
    if(nd){ lp5DownloadNotes(); return true; }
  }catch(e0){}
  return _lp5NoteAction.apply(this, arguments);
};
