/* ============================================================
   learn_player_stage6: ЭТАП 6 — Часть 3.
   Смоук lp6:*, секция selfTest.lp6, версия.
   ============================================================ */

/* ---------- Смоук lp6:* (в V10.smoke) ---------- */
function smoke6(){
  if(!(window.V10 && window.V10.smoke)) return;
  try{
    V10.smoke.add('lp6:api', typeof window.LearnPlayer._feynmanAsk === 'function' &&
      typeof window.LearnPlayer._goSim === 'function' &&
      window.LearnPlayer._goSim.__lp6 === true, window.LearnPlayer.version);
    /* aria-modal на каркасе плеера (buildRoot) */
    var ariaOk = false;
    try{
      var savedSteps = S.steps;
      S.steps = [1, 2];
      var probeRoot = buildRoot({ title: 'lp6-probe' });
      ariaOk = probeRoot.getAttribute('aria-modal') === 'true' && probeRoot.getAttribute('role') === 'dialog';
      S.steps = savedSteps;
    }catch(e){ ariaOk = false; }
    V10.smoke.add('lp6:aria-modal', ariaOk, 'aria-modal="true" + role="dialog" на корне плеера (урок и тест)');
    /* кнопка наставника присутствует в боксе Фейнмана (V2, общий для ридера и плеера) */
    var fmOk = false;
    try{
      var l = lessonById('p0_l1');
      fmOk = typeof renderFeynmanBox === 'function' && !!l &&
        renderFeynmanBox(l).indexOf('data-lp6-feynman="p0_l1"') >= 0 &&
        renderFeynmanBox(l).indexOf('feynman_ai_p0_l1') >= 0;
    }catch(e2){ fmOk = false; }
    V10.smoke.add('lp6:feynman-mentor', fmOk, 'кнопка «🤖 Спросить Наставника» на шаге Фейнмана + контейнер вердикта');
    /* все сим-ссылки уроков имеют боксы — встраивание технически возможно (принцип Э6) */
    var simOk = true, simN = 0;
    try{
      Object.keys(LESSON_SIM_MAP).forEach(function(lid){
        var m = LESSON_SIM_MAP[lid];
        if(!m) return;
        simN++;
        if(!document.getElementById('sim_' + m.simId)) simOk = false;
      });
    }catch(e3){ simOk = false; }
    V10.smoke.add('lp6:sim-boxes', simOk && simN > 0, simN + ' сим-ссылок — у всех есть #sim_* боксы для встраивания');
  }catch(e){
    try{ V10.smoke.add('lp6:smoke-error', false, String(e && e.message || e)); }catch(e2){}
  }
}
smoke6();

/* ---------- Секция selfTest.lp6 ---------- */
var _lp6SelfTest = window.LearnPlayer.selfTest;
window.LearnPlayer.selfTest = function(){
  var a = _lp6SelfTest ? _lp6SelfTest() : { ok: true, errors: [] };
  var errs = [];
  try{
    if(typeof window.LearnPlayer._feynmanAsk !== 'function') errs.push('lp6:api _feynmanAsk');
    if(!window.LearnPlayer._goSim || window.LearnPlayer._goSim.__lp6 !== true) errs.push('lp6:goSim-обёртка');
    if(typeof window.mentorF1 !== 'function') errs.push('lp6:mentorF1 отсутствует');
    var probe = null;
    try{
      var savedSteps2 = S.steps; S.steps = [1];
      probe = buildRoot({ title: 'probe' });
      S.steps = savedSteps2;
      if(!probe || probe.getAttribute('aria-modal') !== 'true') errs.push('lp6:aria-modal');
      probe = null;
    }catch(e4){ S.steps = (typeof savedSteps2 !== 'undefined') ? savedSteps2 : S.steps; errs.push('lp6:buildRoot-исключение'); }
    var l = lessonById('p0_l1');
    if(!l || renderFeynmanBox(l).indexOf('feynman_ai_p0_l1') < 0) errs.push('lp6:фейнман-кнопка');
  }catch(e){ errs.push('lp6:exception'); }
  a.lp6 = { ok: errs.length === 0, errors: errs };
  if(errs.length) a.ok = false;
  return a;
};

window.LearnPlayer.version = '6.0 (Этап 6, ТЗ v2)';
/* ===== learn_player_stage6: Этап 6 (конец) ===== */
