/* ============================================================
   learn_player_stage6: ЭТАП 6 — Часть 1.
   P1: встроенные практикумы — контент урока не покидает плеер.

   ПРИНЦИП (утверждён владельцем продукта, Э6):
   «Внутренний контент урока не должен покидать Learn Player,
    если интеграция технически возможна.»
   Особо значимо для трека Академии Freqtrade: лабы ft* уже
   внутренние (копирование команд/спек без переходов), все будущие
   практикумы Академии обязаны встраиваться в плеер.

   Было: CTA «🚀 Перейти: <симулятор>» на обложке урока вызывал
   LearnPlayer._goSim → closePlayer() → вкладка «Тренажёры»
   (go('sims')) — ученик покидал плеер, контекст урока терялся из виду.
   Стало: симулятор открывается ОВЕРЛЕЕМ ВНУТРИ плеера: узел
   #sim_<id> переносится из подложки приложения в оверлей (DOM-move,
   без клонов и дублей id), при закрытии возвращается на место.
   Интеграция технически возможна для всех 42 сим-ссылок (probe:
   каждый simId имеет свой #sim_* бокс) — фолбэк на прежнее
   поведение остаётся только для отсутствующих боксов.

   Техника: DOM-перенос узла (appendChild сохраняет слушатели и
   состояние), showSim(id) запускает штатные инициализаторы
   (renderCandleConstructor2 и др.) до переноса; closeOverlays()
   (Э1) обёрнута — узел возвращается ЛЮБЫМ путём закрытия
   (Esc, крестик плеера, переключение режима). §0.1: правок
   существующих функций нет — только обёртки.
   ============================================================ */

var lp6Sim = { ov: null, box: null, ret: null, trigger: null };

function lp6SimTitle(simId){
  try{
    var l = (S.active && S.lessonId) ? lessonById(S.lessonId) : null;
    var m = l && (typeof LESSON_SIM_MAP !== 'undefined') ? LESSON_SIM_MAP[l.id] : null;
    if(m && m.simId === simId && m.title) return String(m.title);
  }catch(e){}
  return 'Практикум';
}

/* Возврат бокса в подложку приложения (любой путь закрытия) */
function lp6RestoreSim(){
  try{
    if(lp6Sim.box && lp6Sim.ret && lp6Sim.ret.parent){
      if(lp6Sim.ret.next && lp6Sim.ret.next.parentNode === lp6Sim.ret.parent){
        lp6Sim.ret.parent.insertBefore(lp6Sim.box, lp6Sim.ret.next);
      } else {
        lp6Sim.ret.parent.appendChild(lp6Sim.box);
      }
    }
    if(lp6Sim.ov && lp6Sim.ov.parentNode) lp6Sim.ov.remove();
  }catch(e){}
  lp6Sim = { ov: null, box: null, ret: null, trigger: null };
}

function lp6CloseSim(){
  var trigger = lp6Sim.trigger;
  lp6RestoreSim();
  try{
    var tgt = (trigger && document.body.contains(trigger)) ? trigger :
      (S.root ? S.root.querySelector('[data-lp-act="close"]') : null);
    if(tgt){ try{ tgt.focus(); }catch(e1){} } /* фокус возвращается в шаг урока */
  }catch(e2){}
}

function lp6OpenSim(simId){
  if(lp6Sim.ov){ lp6CloseSim(); } /* переключение практикума */
  var box = document.getElementById('sim_' + simId);
  if(!box || !S.root){ return false; } /* нет бокса — фолбэк на прежнее поведение */
  try{ if(typeof showSim === 'function') showSim(simId); }catch(e0){} /* штатные инициализаторы */
  var ov = document.createElement('div');
  ov.className = 'learn-overlay';
  ov.setAttribute('data-ov', 'lp6sim');
  var title = lp6SimTitle(simId);
  ov.innerHTML = '<div class="lp6-sim-sheet" role="dialog" aria-modal="true" aria-label="Практикум: ' + attr(title) + '">' +
    '<div class="lp6-sim-head"><div><div class="lp6-sim-title">🕹️ ' + esc(title) + '</div>' +
    '<div class="lp6-sim-note">Практикум открыт внутри урока — плеер не закрывается. Esc или ✕ — вернуться к материалу.</div></div>' +
    '<button type="button" class="lp-btn icon ghost" data-lp6-sim-close aria-label="Закрыть практикум и вернуться к уроку">✕</button></div>' +
    '<div class="lp6-sim-body"></div></div>';
  lp6Sim = { ov: ov, box: box, ret: { parent: box.parentNode, next: box.nextSibling }, trigger: null };
  ov.querySelector('.lp6-sim-body').appendChild(box); /* DOM-move: слушатели и состояние сохраняются */
  ov.addEventListener('click', function(e){
    if(e.target === ov || e.target.closest('[data-lp6-sim-close]')){ lp6CloseSim(); }
  });
  S.root.appendChild(ov);
  var cb = ov.querySelector('[data-lp6-sim-close]');
  if(cb){ try{ cb.focus(); }catch(e2){} } /* фокус внутрь оверлея при открытии */
  return true;
}

/* _goSim: Э1 закрывал плеер и уходил на вкладку «Тренажёры» — теперь
   практикум открывается внутри; фолбэк (нет бокса/нет плеера) — прежний контур */
var _lp6GoSim = window.LearnPlayer._goSim;
window.LearnPlayer._goSim = function(simId){
  try{
    if(S.active && S.root && typeof simId === 'string' && lp6OpenSim(simId)) return;
  }catch(e){}
  return _lp6GoSim.apply(this, arguments);
};
window.LearnPlayer._goSim.__lp6 = true;

/* closeOverlays (Э1) вызывается при открытии плеера/теста и переключениях —
   возвращаем узел практикума ДО удаления оверлеев (иначе бокс теряется) */
var _lp6CloseOverlays = closeOverlays;
closeOverlays = function(){
  try{ if(lp6Sim.ov) lp6RestoreSim(); }catch(e){}
  return _lp6CloseOverlays.apply(this, arguments);
};

/* Переключение режима на тест — практикум закрывается до пересборки шагов */
var _lp6StartTestSession = startTestSession;
startTestSession = function(r){
  try{ if(lp6Sim.ov) lp6RestoreSim(); }catch(e0){}
  return _lp6StartTestSession.apply(this, arguments);
};

/* Esc: сначала закрыть практикум, затем оверлей поиска (Э3), затем плеер (Э1) */
var _lp6OnKeydown = onKeydown;
onKeydown = function(e){
  if(S.active && e.key === 'Escape' && S.root){
    var ov = S.root.querySelector('.learn-overlay[data-ov="lp6sim"]');
    if(ov){ e.stopPropagation(); e.preventDefault(); lp6CloseSim(); return; }
  }
  return _lp6OnKeydown.apply(this, arguments);
};
