/* ============================================================
   learn_player_stage5: ЭТАП 5 (БЭКЛОГ) — Часть 3.
   Смоук lp5:* и секция selfTest.lp5.
   ============================================================ */

/* ---------- Смоук lp5:* (в V10.smoke, как lp:/lp2:/lp3:/lp4:) ---------- */
function smoke5(){
  if(!(window.V10 && window.V10.smoke)) return;
  try{
    V10.smoke.add('lp5:api', typeof window.LearnPlayer.exportNotesFile === 'function' &&
      typeof window.LearnPlayer._recentTests === 'function' &&
      typeof window.LearnPlayer._ptStartStore === 'function', window.LearnPlayer.version);
    /* cn_learn_recent_tests: LRU ≤5, уникальные, свежий первым */
    var okR = true;
    try{
      var saveR = lpLS_get(LP5_RT_KEY, null);
      ['p1', 'p0', 'p1', 'math_core', 'capstone', 'p2'].forEach(function(id){ lp5PushRecentTest(id); });
      var rr = lp5RecentTestsAll();
      okR = rr.length <= 5 && rr[0] && rr[0].testId === 'p2' &&
        rr.filter(function(x){ return x && x.testId === 'p1'; }).length === 1;
      if(saveR === null) localStorage.removeItem(LP5_RT_KEY); else lpLS_set(LP5_RT_KEY, saveR);
    }catch(e){ okR = false; }
    V10.smoke.add('lp5:recent-tests-ls', okR, 'cn_learn_recent_tests ≤5, LRU-уникальные, свежий — первым');
    /* cn_pt_start: старт спидрана переживает перезагрузку (№13) */
    var okP = true;
    try{
      var saveP = lpLS_get(LP5_PT_KEY, null);
      window._ptStart = window._ptStart || {};
      window._ptStart[42] = 1234567890;
      lp5PtStartPersist(42);
      var back = lp5PtStartLoad();
      okP = back[42] === 1234567890;
      delete window._ptStart[42];
      if(saveP === null) localStorage.removeItem(LP5_PT_KEY); else lpLS_set(LP5_PT_KEY, saveP);
    }catch(e){ okP = false; }
    V10.smoke.add('lp5:ptstart-ls', okP, 'cn_pt_start: запись/чтение старта спидрана по фазам');
    /* кнопка «⬇ Скачать файлом» присутствует в панели конспекта (тулбар — при наличии заметок) */
    var dl = false;
    try{
      var saveN5 = lpLS_get('cn_learn_notes', null);
      if(!lp3NotesGet().length){
        lp3NotesSet([{ id: 'lp5probe', lessonId: 'p0_l1', stepIdx: 0, quote: 'smoke-probe', note: '', ts: Date.now() }]);
      }
      dl = lp3NotesPanelHtml().indexOf('data-lp3-notes-dl') >= 0;
      if(saveN5 === null) localStorage.removeItem('cn_learn_notes'); else lpLS_set('cn_learn_notes', saveN5);
    }catch(e){ dl = false; }
    V10.smoke.add('lp5:notes-dl-btn', dl, 'кнопка «⬇ Скачать файлом (.md)» в панели конспекта');
    /* накопитель принимает ключи тестовых банков (тот же cn_learn_mist) */
    var okM = true;
    try{
      var saveM = lpLS_get(LP4_KEY, null);
      lp4MistSet('p1', 2);
      okM = lp4MistTotal('p1') === 2;
      lp4MistSet('p1', 0);
      if(saveM === null) localStorage.removeItem(LP4_KEY); else lpLS_set(LP4_KEY, saveM);
    }catch(e){ okM = false; }
    V10.smoke.add('lp5:mist-banks', okM, 'накопитель cn_learn_mist ведёт и тестовые банки (ключи testId)');
    /* секция «Недавние тесты» вставляется в HTML хаба */
    var secOk = false;
    try{ secOk = lp3HomeHtml().indexOf('lp5_recent_tests') >= 0; }catch(e2){ secOk = false; }
    V10.smoke.add('lp5:home-section', secOk, 'секция «🕘 Недавние тесты» в разметке хаба перед «Тесты и экзамены»');
  }catch(e){
    try{ V10.smoke.add('lp5:smoke-error', false, String(e && e.message || e)); }catch(e2){}
  }
}
smoke5();

/* ---------- Секция selfTest.lp5 ---------- */
var _lp5SelfTest = window.LearnPlayer.selfTest;
window.LearnPlayer.selfTest = function(){
  var a = _lp5SelfTest ? _lp5SelfTest() : { ok: true, errors: [] };
  var errs = [];
  try{
    if(typeof window.LearnPlayer.exportNotesFile !== 'function') errs.push('lp5:api exportNotesFile');
    if(typeof window.LearnPlayer._recentTests !== 'function') errs.push('lp5:api _recentTests');
    if(typeof window.LearnPlayer._ptStartStore !== 'function') errs.push('lp5:api _ptStartStore');
    var rt = lp5RecentTestsAll();
    if(!Array.isArray(rt)) errs.push('lp5:recent-tests формат');
    rt.forEach(function(x){ if(!x || typeof x.testId !== 'string' || typeof x.ts !== 'number') errs.push('lp5:recent-tests элемент'); });
    var pt = lp5PtStartLoad();
    if(!pt || typeof pt !== 'object' || Array.isArray(pt)) errs.push('lp5:ptstart формат');
    Object.keys(pt).forEach(function(k){ if(typeof pt[k] !== 'number') errs.push('lp5:ptstart ' + k); });
    var mst = lp4MistAll();
    Object.keys(mst).forEach(function(k){
      var v = mst[k];
      if(!v || typeof v.n !== 'number' || !(v.n >= 0) || typeof v.ts !== 'number') errs.push('lp5:mist ' + k);
    });
  }catch(e){ errs.push('lp5:exception'); }
  a.lp5 = { ok: errs.length === 0, errors: errs };
  if(errs.length) a.ok = false;
  return a;
};

window.LearnPlayer.version = '5.0 (Этап 5, ТЗ v2)';
/* ===== learn_player_stage5: Этап 5 (конец) ===== */
