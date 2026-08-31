/* ============================================================
   learn_player_stage6: ЭТАП 6 — Часть 2.
   P2: accessibility фокуса плеера (aria-modal, фокус при открытии/
   закрытии) и P3: ИИ-верификация метода Фейнмана.

   P2 — что уже было (Э1/Э3, проверено пробой на v12.7) и что добавлено:
   • initial focus — ЕСТЬ: openPlayer/openTestWindow фокусируют кнопку
     «✕» (комментарий «Фокус внутрь (a11y)»); хаб — поле поиска (Э3);
   • return focus — ЕСТЬ: closePlayer возвращает фокус на S.entryEl;
   • НОВОЕ 1: aria-modal="true" на корне плеера (buildRoot — общий
     для урока и теста) и на корне хаба (Home);
   • НОВОЕ 2: краевой случай возврата фокуса после входа «из ридера»:
     closePlayer переоткрывает ридер (readerWasOpen) — узел S.entryEl
     к этому моменту перерисован, фокус падал на body; теперь если
     точка входа устарела — фокус получает модал ридера (первая кнопка),
     «логический фокус» не остаётся под окном.

   P3 — контур наставника УЖЕ содержит экшен 'feynman' (v10/ДЕФ-22:
   MENTOR.ask('feynman', lessonId, {explanation}) → вердикт
   understood/partial/missed + advice + gaps; мок честно помечен) и
   готовый рендер window.mentorF1 (лимиты 30/день, фильтр, сохранение
   cn_feynman_ai). Кнопка «🤖 Спросить Наставника: понятно ли я
   объяснил?» ставится на шаг Фейнмана (renderFeynmanBox — общий для
   ридера и плеера) и вызывает СУЩЕСТВУЮЩИЙ контур — код наставника
   не тронут (§5.5/§11.9).
   ============================================================ */

/* ---------- P2: aria-modal на диалогах ---------- */
var _lp6BuildRoot = buildRoot;
buildRoot = function(l){
  var root = _lp6BuildRoot.apply(this, arguments);
  try{ if(root) root.setAttribute('aria-modal', 'true'); }catch(e){}
  return root;
};
var _lp6HomeOpen = Home.open;
Home.open = function(){
  var r = _lp6HomeOpen.apply(this, arguments);
  try{ if(H.root) H.root.setAttribute('aria-modal', 'true'); }catch(e){}
  return r;
};

/* ---------- P2: возврат фокуса при входе «из ридера» ---------- */
var _lp6ClosePlayer = closePlayer;
closePlayer = function(){
  var wasReader = false, entry = null;
  try{ wasReader = !!S.readerWasOpen; entry = S.entryEl; }catch(e0){}
  try{ if(lp6Sim.ov) lp6RestoreSim(); }catch(eR){} /* практикум не должен уйти вместе с корнем плеера */
  _lp6ClosePlayer.apply(this, arguments);
  try{
    if(wasReader && !S.active){
      /* ридер переоткрыт (readerWasOpen): точка входа могла остаться валидной,
         но семантически устареть (например, кнопка «🎓» шапки под модалом) —
         фокус получает модал ридера, а не элемент под ним */
      var m = document.getElementById('lessonFullscreenReaderModal');
      if(m && getComputedStyle(m).display !== 'none'){
        var tgt = m.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if(tgt){ try{ tgt.focus(); }catch(e1){} }
      }
    }
  }catch(e2){}
};

/* ---------- P3: кнопка наставника на шаге Фейнмана ---------- */
var _lp6FeynmanBox = renderFeynmanBox;
renderFeynmanBox = function(lesson){
  var h = _lp6FeynmanBox.apply(this, arguments);
  try{
    var id = lesson && lesson.id;
    if(!id) return h;
    h += '<div style="margin:-6px 0 20px;padding:0 2px">' +
      '<button type="button" class="lp-btn sm ghost" data-lp6-feynman="' + attr(id) + '" ' +
      'onclick="LearnPlayer._feynmanAsk(\'' + attr(id) + '\')" ' +
      'title="Наставник сверит твоё объяснение с эталоном урока (существующий контур MENTOR, лимит 30/день)">🤖 Спросить Наставника: понятно ли я объяснил?</button>' +
      '<div id="feynman_ai_' + attr(id) + '" style="margin-top:10px" aria-live="polite"></div></div>';
  }catch(e){}
  return h;
};

window.LearnPlayer._feynmanAsk = function(lessonId){
  var ta = document.getElementById('feynman_input_' + lessonId);
  var out = document.getElementById('feynman_ai_' + lessonId);
  if(!ta || !out) return;
  var text = String(ta.value || '').trim();
  if(text.length < 10){
    out.innerHTML = '<div style="font-size:12px;color:var(--warn)">Сначала напиши объяснение своими словами — хотя бы пару предложений, и наставник его оценит.</div>';
    try{ ta.focus(); }catch(e0){}
    return;
  }
  if(typeof window.mentorF1 !== 'function'){
    out.innerHTML = '<div style="font-size:12px;color:var(--warn)">Наставник недоступен в этой сборке.</div>';
    return;
  }
  window.mentorF1(lessonId, out); /* существующий контур: MENTOR.ask('feynman'), лимиты, фильтр, cn_feynman_ai */
};
