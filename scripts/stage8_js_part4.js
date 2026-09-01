
/* ---------- 8.4 ОКНО ПЛЕЕРА: чип стадии, финал по треку, бейджи программы ---------- */
/* Чип стадии в шапке (lazy-inject в .learn-top-right, id trk_chip) */
var _trkUpdateChrome = updateChrome;
updateChrome = function(){
  _trkUpdateChrome.apply(this, arguments);
  try{ trkChrome(); }catch(e){}
};
try{
  Object.keys(_trkUpdateChrome).forEach(function(k){ if(!(k in updateChrome)) updateChrome[k] = _trkUpdateChrome[k]; });
}catch(e){}

function trkChrome(){
  if(!S.active || !S.root) return;
  var bar = S.root.querySelector('.learn-top-right');
  if(!bar) return;
  var chip = document.getElementById('trk_chip');
  var txt = '';
  /* в тестовом режиме урока нет — чип не показываем (S.lessonId null / TS.active) */
  if(typeof TS === 'undefined' || !TS || !TS.active){
    if(trkSprint()){
      if(S.lessonId && trkStageOf(S.lessonId)){
        var so = trkStageOf(S.lessonId);
        var p = trkStageProgress(so.stage);
        txt = '🚀 ' + so.stage.id + ' · ' + p.done + '/' + p.total;
      } else if(S.lessonId && trkIsCore(S.lessonId)){
        txt = '🚀 трек';
      } else if(S.lessonId){
        txt = '🟠 факультатив';
      }
    }
  }
  if(!txt){ if(chip) chip.remove(); return; }
  if(!chip){
    chip = document.createElement('span');
    chip.id = 'trk_chip'; chip.className = 'trk-chip';
    chip.setAttribute('aria-label', 'Позиция в маршруте');
    bar.insertBefore(chip, bar.firstChild);
  }
  chip.textContent = txt;
}

/* Финальный шаг: CTA по треку + вплетённый псих-минимум + предложения + гейт.
   Обёртка renderStep — единая точка рендера шага (встаёт последней в цепочке
   Этапов 3–5, §12-Р2). */
var _trkRenderStep = renderStep;
renderStep = function(idx){
  _trkRenderStep.apply(this, arguments);
  try{
    var st = S.steps[idx];
    if(st && st.kind === 'finish' && S.active) trkFinishAugment();
  }catch(e){ /* финал без трека хуже, чем сломанный финал */ }
};
try{
  Object.keys(_trkRenderStep).forEach(function(k){ if(!(k in renderStep)) renderStep[k] = _trkRenderStep[k]; });
}catch(e){}

function trkFinishAugment(){
  var l = lessonById(S.lessonId);
  if(!l || !S.root) return;
  if(typeof TS !== 'undefined' && TS && TS.active) return; /* тестовый режим без трека */
  var old = document.getElementById('trk_finish');
  if(old) old.remove();
  /* строка кнопок финала: CTA «▸ Следующий урок: …» (уникальный префикс finishHtml) */
  var nextBtn = null, btns = S.root.querySelectorAll('button.lp-btn');
  for(var i = 0; i < btns.length; i++){
    if(btns[i].textContent.indexOf('▸ Следующий урок:') === 0){ nextBtn = btns[i]; break; }
  }
  var html = '';
  if(trkSprint()){
    if(nextBtn) nextBtn.style.display = 'none';           /* глобальный порядок скрыт ТОЛЬКО в спринте, DOM-уровень (§12-Р3) */
    html += trkFinishNextHtml(l);
    html += trkGateHtml(l);
    html += trkSprintFinishHtml();
  }
  html += trkWovenHtml(l);
  html += trkOffersHtml(l);
  if(!html) return;
  var host = nextBtn ? nextBtn.parentNode : null;
  if(host) host.insertAdjacentHTML('beforebegin', '<div id="trk_finish" class="trk-finish">' + html + '</div>');
  else{
    var stepEl = S.root.querySelector('.learn-step');
    if(stepEl) stepEl.insertAdjacentHTML('beforeend', '<div id="trk_finish" class="trk-finish">' + html + '</div>');
  }
}
function trkFinishNextHtml(l){
  var n = trkNext();
  if(!n || !n.lesson || n.lesson.id === l.id) return '';
  return '<button type="button" class="lp-btn primary trk-next" onclick="CNTracks.open(\'' + attr(n.lesson.id) + '\')">' +
         (n.woven ? '🛡️ Обязательный псих-урок: ' : '▸ Следующий по треку: ') + esc(n.lesson.title) + '</button>';
}
/* Гейт-карточка: последний УРОК стадии и все уроки стадии пройдены.
   Условие по core-урокам стадии (s.lessons) — чек-лист №13 «финал последнего
   урока стадии (уроки пройдены)»; вплетённые П-уроки не блокируют гейт
   (soft-политика §9.4), они возвращаются в очереди trkNext. */
function trkGateHtml(l){
  if(!trkIsCore(l.id)) return '';
  var so = trkStageOf(l.id); if(!so) return '';
  var s = so.stage;
  var isLastOfStage = so.idx === (s.lessons || []).length - 1;
  var allLessonsDone = (s.lessons || []).every(function(id){ return isDone(id); });
  if(!isLastOfStage || !allLessonsDone) return '';
  if(trkGatePassed(s)) return '<div class="trk-card ok">✅ Стадия ' + s.id + ' сдана' +
    (s.gate === 'ft_project' ? ' — проект FT-20 завершён' : '') + '</div>';
  if(s.gate === 'ft_project'){
    return '<div class="trk-card gate">🏅 Гейт стадии E — завершить итоговый проект FT-20. ' +
           '<button type="button" class="lp-btn primary" onclick="CNTracks.open(\'ft20\')">Открыть FT-20</button></div>';
  }
  if(!s.gate) return '';
  return '<div class="trk-card gate">🏅 Осталось сдать тест стадии: «' + esc(lp3GateTitle(s.gate)) + '» (порог 80%). ' +
         '<button type="button" class="lp-btn primary" onclick="CNTracks.gate(\'' + esc(s.gate) + '\')">Сдать тест</button></div>';
}
function lp3GateTitle(g){
  try{ var m = bankMeta(g); if(m && m.r && m.r.title) return m.r.title; }catch(e){}
  return 'Тест фазы ' + String(g).replace('p', '');
}
function trkSprintFinishHtml(){
  if(!trkSprintDone()) return '';
  return '<div class="trk-card finish">🏆 <b>Спринт завершён — бот в микро-лайве!</b><br>' +
         'Дальше — «Крипто-архитектор»: 134 урока глубины, аттестации и Capstone.<br>' +
         '<button type="button" class="lp-btn primary" onclick="CNTracks.upsell()">🏛️ Открыть полный маршрут</button></div>';
}
function trkWovenHtml(l){
  if(!trkSprint()) return '';
  var ids = trkPsyAnchors(l.id);
  if(!ids.length) return '';
  var h = '<div class="trk-card woven"><div class="trk-card-h">🛡️ Обязательно перед следующим этапом</div>';
  ids.forEach(function(id){
    var L = lessonById(id); if(!L) return;
    h += '<div class="trk-row"><span class="t">' + esc(L.num || '') + ' · ' + esc(L.title) + '</span>' +
         '<span class="m">' + esc(L.timeEst || '') + '</span>' +
         '<button type="button" class="lp-btn sm" onclick="CNTracks.open(\'' + attr(id) + '\')">Открыть</button></div>';
  });
  return h + '</div>';
}
function trkOffersHtml(l){
  var blocks = trkOffersFor(l.id);
  if(!blocks.length) return '';
  var h = '<div class="trk-card offers"><div class="trk-card-h">🎯 Рекомендуемый факультатив — необязательно, но усилит только что пройденное</div>';
  blocks.forEach(function(b){
    if(trkOfferState(b.id) === null) trkOfferSet(b.id, 'shown');
    trkTrack('offer_shown', { block: b.id, anchor: l.id });
    h += '<div class="trk-row" id="trk_offr_' + esc(b.id) + '"><span class="pr" aria-hidden="true">' + b.priority + '</span>' +
         '<span class="t">' + esc(b.name) + ' · ' + b.lessons.length + ' ' + trkPluralLessons(b.lessons.length) + ' · ≈' + trkBlockMins(b) + ' мин</span>' +
         '<span class="m">' + esc(b.why || '') + '</span>' +
         '<button type="button" class="lp-btn sm" onclick="CNTracks.accept(\'' + esc(b.id) + '\')">Открыть</button>' +
         '<button type="button" class="lp-btn sm ghost" onclick="CNTracks.dismiss(\'' + esc(b.id) + '\')">Позже</button></div>';
  });
  return h + '</div>';
}
function trkPluralLessons(n){
  var m10 = n % 10, m100 = n % 100;
  if(m10 === 1 && m100 !== 11) return 'урок';
  if(m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'урока';
  return 'уроков';
}

/* Бейджи трека в панели «Программа» плеера (DOM-доработка после рендера;
   §9.3: 🟢 основной / 🟠 факультатив / 🛡️ вплетённый псих-минимум) */
var _trkMapProgram = lp3MapProgram;
lp3MapProgram = function(){
  _trkMapProgram.apply(this, arguments);
  try{
    var map = S.root ? S.root.querySelector('.learn-map') : null;
    if(!map) return;
    var psy = trkPsyStage();
    var els = map.querySelectorAll('.lp3-les');
    for(var i = 0; i < els.length; i++){
      var b = els[i];
      var id = b.getAttribute('data-lp3-mopen') || b.getAttribute('data-lp3-open');
      if(!id || b.querySelector('.trk-badge')) continue;
      var isCore = trkIsCore(id);
      var inPsy = !!(isCore && psy && psy.lessons && psy.lessons.indexOf(id) >= 0);
      var sp = document.createElement('span');
      sp.className = 'trk-badge';
      sp.textContent = !isCore ? '🟠' : (inPsy ? '🛡️' : '🟢');
      sp.title = !isCore ? 'Факультатив' : (inPsy ? 'Вплетённый псих-минимум' : 'Основной трек');
      b.insertBefore(sp, b.firstChild);
    }
  }catch(e){}
};
try{
  Object.keys(_trkMapProgram).forEach(function(k){ if(!(k in lp3MapProgram)) lp3MapProgram[k] = _trkMapProgram[k]; });
}catch(e){}
