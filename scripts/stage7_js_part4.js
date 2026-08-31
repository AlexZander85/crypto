/* ============================================================
   learn_player_stage7: ЭТАП 7 — Часть 4.
   Смоук lp7:*, секция selfTest.lp7, версия.
   ============================================================ */

/* ---------- Смоук lp7:* (в V10.smoke) ---------- */
function smoke7(){
  if(!(window.V10 && window.V10.smoke)) return;
  try{
    V10.smoke.add('lp7:api', typeof window.LearnPlayer._feynmanPanelCheck === 'function' &&
      window.mentorOpenPanel.__lp7 === true && window.mentorRun.__lp7 === true,
      window.LearnPlayer.version);
    V10.smoke.add('lp7:cert-wrap', window.renderCapstoneCertificate.__lp7 === true,
      'сертификат капстоуна в плеере: «К достижениям» закрывает плеер');
    V10.smoke.add('lp7:gate-toast', window.completeLessonWithMastery.__lp7 === true &&
      window.LearnPlayer.completeLessonOnce.__lp7 === true,
      'гейт «Завершить урок»: тост «🔒 Сначала сдайте квиз» на заблокированной кнопке');
    var gOK = false;
    try{
      var probe = document.createElement('button');
      probe.id = 'lesson_complete_btn_lp7probe';
      probe.disabled = true;
      document.body.appendChild(probe);
      lp7UnlockGates();
      gOK = !probe.disabled && probe.getAttribute('aria-disabled') === 'true';
      probe.remove();
    }catch(e1){ gOK = false; }
    V10.smoke.add('lp7:gate-unlock', gOK,
      'гейты кликабельны (aria-disabled вместо disabled) — тап даёт подсказку');
  }catch(e){
    try{ V10.smoke.add('lp7:smoke-error', false, String(e && e.message || e)); }catch(e2){}
  }
}
smoke7();

/* ---------- Секция selfTest.lp7 ---------- */
var _lp7SelfTest = window.LearnPlayer.selfTest;
window.LearnPlayer.selfTest = function(){
  var a = _lp7SelfTest ? _lp7SelfTest() : { ok: true, errors: [] };
  var errs = [];
  try{
    if(typeof window.LearnPlayer._feynmanPanelCheck !== 'function') errs.push('lp7:_feynmanPanelCheck');
    if(!window.mentorOpenPanel || window.mentorOpenPanel.__lp7 !== true) errs.push('lp7:mentorOpenPanel-обёртка');
    if(!window.mentorRun || window.mentorRun.__lp7 !== true) errs.push('lp7:mentorRun-обёртка');
    if(!window.renderCapstoneCertificate || window.renderCapstoneCertificate.__lp7 !== true) errs.push('lp7:cert-обёртка');
    if(typeof lp7UnlockGates !== 'function') errs.push('lp7:lp7UnlockGates');
    if(!window.LearnPlayer.completeLessonOnce || window.LearnPlayer.completeLessonOnce.__lp7 !== true) errs.push('lp7:completeLessonOnce-обёртка');
  }catch(e){ errs.push('lp7:exception'); }
  a.lp7 = { ok: errs.length === 0, errors: errs };
  if(errs.length) a.ok = false;
  return a;
};

window.LearnPlayer.version = '7.0 (Этап 7, ТЗ v2)';
/* ===== learn_player_stage7: Этап 7 (конец) ===== */
