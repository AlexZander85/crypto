
/* ---------- 8.3 ХАБ «Моё обучение»: маршрут, программа по треку, библиотека ---------- */
/* Обёртка lp3HomeHtml покрывает и Home.open, и lp3RerenderHome (обе вызывают
   эту функцию). Строковые якоря '<div class="lp3-col">' (единственное вхождение,
   проверено по v12.9) и хвост '</div></div>'; при хрупкости — запасной план §12-Р1. */
var _trkHomeHtml = lp3HomeHtml;
lp3HomeHtml = function(){
  var h = _trkHomeHtml.apply(this, arguments);
  try{
    var route = trkRouteHtml();
    if(route && h.indexOf('<div class="lp3-col">') >= 0){
      h = h.replace('<div class="lp3-col">', '<div class="lp3-col">' + route);
    }
    var lib = trkLibraryHtml();
    if(lib && /<\/div><\/div>$/.test(h)){
      h = h.replace(/<\/div><\/div>$/, lib + '</div></div>'); /* хвост body/col */
    }
  }catch(e){ /* не ломаем хаб */ }
  return h;
};
/* перенос собственных свойств предыдущего звена цепочки (правило Этапа 7) */
try{
  Object.keys(_trkHomeHtml).forEach(function(k){ if(!(k in lp3HomeHtml)) lp3HomeHtml[k] = _trkHomeHtml[k]; });
}catch(e){}

/* «Продолжить» без черновика — по треку (спринт); обёртка затрагивает и
   fallback «Начать первый непройденный урок», и баннер главной (§10.3) */
var _trkNextUnpassed = lp3NextUnpassed;
lp3NextUnpassed = function(){
  if(trkSprint()){ var n = trkNext(); if(n && n.lesson) return n.lesson; }
  return _trkNextUnpassed.apply(this, arguments);
};
try{
  Object.keys(_trkNextUnpassed).forEach(function(k){ if(!(k in lp3NextUnpassed)) lp3NextUnpassed[k] = _trkNextUnpassed[k]; });
}catch(e){}

/* Программа курса: в спринте по умолчанию — дерево стадий («По треку»),
   переключатель «По фазам» — исходный рендер + тумблер. Архитектор — всегда фазы. */
var _trkProgramHtml = lp3ProgramHtml;
lp3ProgramHtml = function(){
  if(trkSprint() && lpLS_get(TRK.viewKey, 'track') !== 'phases'){
    return trkProgramTrackHtml();
  }
  var h = _trkProgramHtml.apply(this, arguments);
  try{
    if(trkSprint()){
      /* тумблер доступен и в виде «По фазам» (иначе обратного пути нет) */
      var anchor = '<div class="lp3-sec-h">📚 Программа курса</div>';
      if(h.indexOf(anchor) >= 0){
        h = h.replace(anchor, anchor + trkViewToggleHtml());
      }
    }
  }catch(e){}
  return h;
};
try{
  Object.keys(_trkProgramHtml).forEach(function(k){ if(!(k in lp3ProgramHtml)) lp3ProgramHtml[k] = _trkProgramHtml[k]; });
}catch(e){}

function trkViewToggleHtml(){
  var cur = lpLS_get(TRK.viewKey, 'track');
  return '<div class="trk-view-toggle">' +
    '<button type="button" class="lp-btn sm' + (cur !== 'phases' ? ' primary' : ' ghost') + '" data-trk-act="view" data-trk-v="track"' + (cur !== 'phases' ? ' aria-pressed="true"' : '') + '>По треку</button>' +
    '<button type="button" class="lp-btn sm' + (cur === 'phases' ? ' primary' : ' ghost') + '" data-trk-act="view" data-trk-v="phases"' + (cur === 'phases' ? ' aria-pressed="true"' : '') + '>По фазам</button>' +
    '</div>';
}

/* Единый клик-обработчик действий трека в хабе (второй листенер на H.root,
   чтобы не конфликтовать с lp3HomeClick — §10.3) */
function trkHomeClick(e){
  var b = e.target.closest('[data-trk-act]');
  if(!b) return;
  var act = b.getAttribute('data-trk-act');
  if(act === 'profile'){
    trkSetProfile(b.getAttribute('data-trk-p') === 'architect' ? 'architect' : 'sprint');
  } else if(act === 'gate'){
    var g = b.getAttribute('data-trk-g');
    if(g){ try{ lp3OpenTestFromHome(g); }catch(e2){} }
  } else if(act === 'view'){
    lpLS_set(TRK.viewKey, b.getAttribute('data-trk-v') === 'phases' ? 'phases' : 'track');
    trkTrack('view_set', { view: lpLS_get(TRK.viewKey, 'track') });
    lp3RerenderHome();
  }
}

/* Обёртка Home.open: после оригинала добавляем свой click-листенер */
var _trkHomeOpen = Home.open;
Home.open = function(){
  var r = _trkHomeOpen.apply(this, arguments);
  try{ if(H.root) H.root.addEventListener('click', trkHomeClick); }catch(e){}
  return r;
};
try{
  Object.keys(_trkHomeOpen).forEach(function(k){ if(!(k in Home.open)) Home.open[k] = _trkHomeOpen[k]; });
}catch(e){}

function trkRouteHtml(){
  var pct = trkSprint() ? trkPct() : null;
  var h = '<section class="lp3-sec trk-route"><div class="lp3-sec-h">🧭 Маршрут</div>';
  h += '<div class="trk-profile-row">';
  h += '<button type="button" class="lp-btn' + (trkSprint() ? ' primary' : ' ghost') + '" data-trk-act="profile" data-trk-p="sprint"' + (trkSprint() ? ' aria-pressed="true"' : '') + '>🚀 Спринт до первого бота</button>';
  h += '<button type="button" class="lp-btn' + (!trkSprint() ? ' primary' : ' ghost') + '" data-trk-act="profile" data-trk-p="architect"' + (!trkSprint() ? ' aria-pressed="true"' : '') + '>🏛️ Крипто-архитектор</button>';
  h += '</div>';
  if(trkSprint()){
    h += '<div class="trk-pct">Пройдено <b>' + (pct || 0) + '%</b> · обязательных уроков <b>' + trkCoreDoneCount() + '/79</b> · гейтов <b>' + trkCoreTestsPassed() + '/5</b></div>';
    var st = trkStages();
    for(var i = 0; i < st.length; i++){
      var s = st[i], p = trkStageProgress(s), gate = trkGatePassed(s);
      h += '<div class="trk-stage' + (trkStageDone(s) ? ' done' : '') + '">';
      h += '<div class="trk-stage-t"><b>' + s.id + ' · ' + esc(s.title) + '</b>' +
           '<span class="m">' + p.done + '/' + p.total + '</span></div>';
      h += '<div class="trk-stage-bar" aria-hidden="true"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div>';
      h += '<div class="trk-stage-gate">' + (gate ? '✅ сдан' : (s.gate === 'ft_project' ? '🏅 проект FT-20' : '🏅 тест 80%')) +
           (s.gate && s.gate !== 'ft_project' && !gate
             ? ' <button type="button" class="lp-btn sm ghost" data-trk-act="gate" data-trk-g="' + esc(s.gate) + '">Сдать</button>'
             : '') + '</div>';
      h += '</div>';
    }
    h += '<div class="trk-note">Факультативы будут предлагаться по ходу — их можно пройти позже или никогда, бот от этого не пострадает.</div>';
  } else {
    h += '<div class="trk-note">Полный маршрут: 213 уроков + Capstone 85% + сертификат. ' +
         'Основной трек внутри него уже размечен — можно переключиться на Спринт в любой момент.</div>';
  }
  return h + '</section>';
}
function trkCoreDoneCount(){ var n = 0, k; for(k in CN_TRACKS.coreSet){ if(Object.prototype.hasOwnProperty.call(CN_TRACKS.coreSet, k) && isDone(k)) n++; } return n; }
function trkCoreTestsPassed(){ return CN_TRACKS.coreTests.filter(function(g){ return (phaseTestsDone[g] || 0) >= 80; }).length; }

/* Библиотека роста: все 41 блок факультатива (ничего не скрыто, §6/§12-Р6) */
function trkLibraryHtml(){
  var h = '<section class="lp3-sec trk-lib"><div class="lp3-sec-h">📚 Библиотека роста (факультатив)</div>';
  h += '<div class="trk-note">134 урока в 41 блоке. Приоритеты: 🔥 сильно усилит ближайшую стадию · ⭐ полезно · 💤 по желанию.</div>';
  CN_TRACKS.electives.forEach(function(b){
    var done = b.lessons.filter(function(id){ return isDone(id); }).length;
    var first = lessonById(b.lessons[0]);
    h += '<div class="trk-block' + (done >= b.lessons.length ? ' done' : '') + '">';
    h += '<button type="button" class="trk-block-h" data-lp3-open="' + attr(first ? first.id : b.lessons[0]) + '">' +
         '<span class="pr" aria-hidden="true">' + b.priority + '</span><span class="t">' + esc(b.name) + '</span>' +
         '<span class="m">' + done + '/' + b.lessons.length + ' · ≈' + trkBlockMins(b) + ' мин</span></button>';
    h += '<div class="trk-block-why">' + esc(b.why || '') + '</div>';
    h += '</div>';
  });
  return h + '</section>';
}

/* Программа «по треку»: стадии вместо фаз (классы lp3-ph/lp3-les — существующие,
   делегированный клик data-lp3-open уже работает в lp3HomeClick) */
function trkProgramTrackHtml(){
  var h = '<section class="lp3-sec" id="lp3_program_sec"><div class="lp3-sec-h">📚 Программа курса</div>';
  h += trkViewToggleHtml();
  var cur = S.active ? S.lessonId : null;
  var psy = trkPsyStage();
  trkStages().forEach(function(s){
    var p = trkStageProgress(s);
    h += '<div class="lp3-ph open">';
    h += '<button type="button" class="lp3-ph-h"><span class="t">' + esc(s.id + ' · ' + s.title) + '</span>' +
         '<span class="m">' + p.done + ' / ' + p.total + '</span></button>';
    h += '<div class="lp3-ph-bar" aria-hidden="true"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div>';
    h += '<div class="lp3-ph-list">';
    (s.lessons || []).forEach(function(id){
      var l = lessonById(id); if(!l) return;
      h += '<button type="button" class="lp3-les' + (isDone(id) ? ' done' : '') + (id === cur ? ' current' : '') +
           '" data-lp3-open="' + attr(id) + '">' +
           '<span class="ck">' + (isDone(id) ? '✓' : '') + '</span>' +
           '<span class="t">Урок ' + esc(l.num || '') + ' · ' + esc(l.title) + '</span>' +
           '<span class="m">≈' + parseTimeEst(l) + ' мин</span></button>';
      /* вплетённые П-уроки сразу после их якоря (§9.1) */
      if(psy && psy.anchors){
        Object.keys(psy.anchors).forEach(function(pid){
          if(psy.anchors[pid] === id){
            var pl = lessonById(pid); if(!pl) return;
            h += '<button type="button" class="lp3-les' + (isDone(pid) ? ' done' : '') + ' trk-woven' + (pid === cur ? ' current' : '') +
                 '" data-lp3-open="' + attr(pid) + '">' +
                 '<span class="ck">🛡️</span><span class="t">' + esc(pl.num || '') + ' · ' + esc(pl.title) + '</span>' +
                 '<span class="m">вплетён · ≈' + parseTimeEst(pl) + ' мин</span></button>';
          }
        });
      }
    });
    h += '</div></div>';
  });
  h += '<div class="trk-note">Факультатив — в «Библиотеке роста» ниже.</div>';
  return h + '</section>';
}
