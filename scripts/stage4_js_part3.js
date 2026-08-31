/* ============================================================
   learn_player_stage4: ЭТАП 4 — футер шага: кнопка «💬 Наставник» +
   смоук lp4:* и секция selfTest.lp4.
   ============================================================ */

/* Кнопка в футере КАЖДОГО шага урока (renderBottom вызывается только в
   режиме урока — updateChrome → renderBottom; тестовый режим Этапа 2
   имеет собственную нижнюю панель и не затрагивается). Клик — тот же
   существующий контур mentorOpenPanel: авто-контекст шага подставит
   обёртка из части 2. */
var _lp4RenderBottom = renderBottom;
renderBottom = function(st, l){
  _lp4RenderBottom.apply(this, arguments);
  try{
    if(!S.root) return;
    var bottom = S.root.querySelector('.learn-bottom');
    if(!bottom || bottom.querySelector('[data-lp-act="lp4-mentor"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lp-btn ghost lp4-mentor-btn';
    btn.setAttribute('data-lp-act', 'lp4-mentor');
    btn.setAttribute('aria-label', 'Спросить наставника о текущем шаге');
    btn.title = 'Наставник увидит материал текущего шага';
    btn.textContent = '💬 Наставник';
    btn.onclick = function(){
      try{ window.mentorOpenPanel(S.lessonId); }catch(e){}
    };
    /* родной футер: [«← Назад», spacer flex:1, right] — ставим после «Назад» */
    bottom.insertBefore(btn, bottom.children[1] || null);
  }catch(e){}
};

/* ---------- Секция selfTest.lp4 ---------- */
var _lp4SelfTest = window.LearnPlayer.selfTest;
window.LearnPlayer.selfTest = function(){
  var a = _lp4SelfTest ? _lp4SelfTest() : { ok: true, errors: [] };
  var errs = [];
  try{
    ['_mistInfo', '_mistReset', '_mentorStepAsk', '_goAdaptive'].forEach(function(k){
      if(typeof window.LearnPlayer[k] !== 'function') errs.push('lp4:api ' + k);
    });
    if(!window.mentorOpenPanel || !window.mentorOpenPanel.__lp4wrapped) errs.push('lp4:mentor-wrapper');
    var st = lp4MistAll();
    Object.keys(st).forEach(function(k){
      var v = st[k];
      if(!v || typeof v.n !== 'number' || !(v.n >= 0) || typeof v.ts !== 'number') errs.push('lp4:ls ' + k);
    });
  }catch(e){ errs.push('lp4:exception'); }
  a.lp4 = { ok: errs.length === 0, errors: errs };
  if(errs.length) a.ok = false;
  return a;
};

/* ---------- Смоук lp4:* (в V10.smoke, как lp:/lp2:/lp3:) ---------- */
function smoke4(){
  if(!(window.V10 && window.V10.smoke)) return;
  try{
    V10.smoke.add('lp4:api', typeof window.LearnPlayer._mistInfo === 'function' &&
      typeof window.LearnPlayer._mistReset === 'function' &&
      typeof window.LearnPlayer._mentorStepAsk === 'function' &&
      typeof window.LearnPlayer._goAdaptive === 'function', 'Этап 4: API счётчика и наставника');
    V10.smoke.add('lp4:mentor-wrapper', !!(window.mentorOpenPanel && window.mentorOpenPanel.__lp4wrapped),
      'mentorOpenPanel обёрнут: авто-контекст шага + карточка в панели');
    var okLS = true;
    try{
      var save = lpLS_get(LP4_KEY, null);
      lp4MistSet('p0_l1', 3);
      var t = lp4MistTotal('p0_l1');
      lp4MistSet('p0_l1', 0);
      var z = lp4MistTotal('p0_l1');
      okLS = (t === 3 && z === 0);
      if(save === null) localStorage.removeItem(LP4_KEY); else lpLS_set(LP4_KEY, save);
    }catch(e){ okLS = false; }
    V10.smoke.add('lp4:mist-ls', okLS, 'cn_learn_mist: запись/чтение/сброс персистентного счётчика');
    var zOk = false;
    try{
      var stl = document.getElementById('learn_player_css');
      zOk = !!(stl && /#mentor_upsell_modal\{[^}]*z-index:\s*1000500/.test(stl.textContent));
    }catch(e2){}
    V10.smoke.add('lp4:upsell-z', zOk, 'апселл наставника поднят над плеером (CSS-фикс §6)');
    var pl = lp4Plural(1) === 'ая' && lp4Plural(3) === 'ые' && lp4Plural(5) === 'ых' &&
             lp4Plural2(1) === 'а' && lp4Plural2(3) === 'и' && lp4Plural2(5) === 'ок';
    V10.smoke.add('lp4:plural', pl, 'склонение «неверная попытка/неверные попытки/неверных попыток»');
  }catch(e){}
}
smoke4();
