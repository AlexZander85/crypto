
/* ---------- 8.2 СОСТОЯНИЕ ТРЕКА (только чтение существующего LS) ---------- */
var TRK = {
  profileKey:  'cn_track_profile',   /* 'sprint' | 'architect' */
  viewKey:     'cn_track_view',      /* вид программы хаба: 'track' | 'phases' */
  offersKey:   'cn_track_offers',    /* { blockId: 'shown'|'accepted'|'dismissed' } */
  eventsKey:   'cn_track_events',    /* кольцевой буфер событий (<=200) */
  migratedKey: 'cn_track_migrated',  /* однократная миграция профиля */
  abKey:       'cn_track_ab',        /* A/B-каркас (SaaS, §14.5) */
  gatePolicy:  'soft'                /* 'soft' — гейт-CTA без блокировки навигации */
};

function trkProfile(){ return lpLS_get(TRK.profileKey, 'sprint') === 'architect' ? 'architect' : 'sprint'; }
function trkSprint(){ return trkProfile() === 'sprint'; }

function trkSetProfile(p){
  lpLS_set(TRK.profileKey, p === 'architect' ? 'architect' : 'sprint');
  trkTrack('profile_set', { profile: trkProfile() });
  if(H.active){ try{ lp3RerenderHome(); }catch(e){} }   /* хаб перерисуется через обёрнутый lp3HomeHtml */
  if(S.active){ try{ trkChrome(); }catch(e){} }
}

/* Однократная миграция: старым ученикам с >=50% ядра фаз 0-5 (30 из 60 уроков
   coreLessonList) — 'architect', чтобы не ломать привычную картину (§10.2) */
(function trkMigrate(){
  if(lpLS_get(TRK.migratedKey, null)) return;
  var done60 = 0;
  try{ coreLessonList().forEach(function(l){ if(lessonsDone[l.id] === 1) done60++; }); }catch(e){}
  lpLS_set(TRK.profileKey, done60 >= 30 ? 'architect' : 'sprint');
  lpLS_set(TRK.migratedKey, 1);
  trkTrack('migrate', { done60: done60, profile: trkProfile() });
})();

function trkIsCore(id){ return !!CN_TRACKS.coreSet[id]; }
function trkPsyStage(){ for(var i = 0; i < CN_TRACKS.coreStages.length; i++){ if(CN_TRACKS.coreStages[i].id === 'PSY') return CN_TRACKS.coreStages[i]; } return null; }
function trkStages(){ return CN_TRACKS.coreStages.filter(function(s){ return s.id !== 'PSY'; }); }
function trkStageOf(id){
  var st = trkStages();
  for(var i = 0; i < st.length; i++){
    var idx = (st[i].lessons || []).indexOf(id);
    if(idx >= 0) return { stage: st[i], i: i, idx: idx };
  }
  return null;
}
/* вплетённые П-уроки с якорем = anchorId, ещё не пройденные */
function trkPsyAnchors(anchorId){
  var psy = trkPsyStage(); if(!psy || !psy.anchors) return [];
  return Object.keys(psy.anchors).filter(function(pid){ return psy.anchors[pid] === anchorId && !isDone(pid); });
}
/* полная программа стадии: уроки стадии + вплетённые П-уроки её якорей */
function trkStageIds(s){
  var ids = (s.lessons || []).slice(), psy = trkPsyStage();
  if(psy && psy.anchors){
    ids.forEach(function(coreId){
      Object.keys(psy.anchors).forEach(function(pid){
        if(psy.anchors[pid] === coreId && ids.indexOf(pid) < 0) ids.push(pid);
      });
    });
  }
  return ids;
}
function trkStageProgress(s){
  var ids = trkStageIds(s), done = 0;
  ids.forEach(function(id){ if(isDone(id)) done++; });
  return { done: done, total: ids.length };
}
function trkGatePassed(s){
  if(s.gate === 'ft_project') return isDone('ft20');
  if(!s.gate) return true;
  return (phaseTestsDone[s.gate] || 0) >= 80;
}
function trkStageDone(s){ var p = trkStageProgress(s); return p.done >= p.total && trkGatePassed(s); }
function trkSprintDone(){ return trkStages().every(trkStageDone); }

/* Следующий элемент трека: по стадиям; вплетённые П-уроки «встают в очередь»
   сразу после пройденного якоря (интерливинг-принцип §3). */
function trkNext(){
  var st = trkStages();
  for(var i = 0; i < st.length; i++){
    var ids = st[i].lessons || [];
    for(var j = 0; j < ids.length; j++){
      var id = ids[j];
      if(isDone(id)){
        var w = trkPsyAnchors(id);
        if(w.length) return { lesson: lessonById(w[0]), woven: true, stage: st[i] };
      } else {
        return { lesson: lessonById(id), stage: st[i] };
      }
    }
  }
  return null; /* спринт завершён */
}

/* % трека — ТОЛЬКО в поверхностях трека (§8.3): 60% уроки (вкл. FT-20) +
   15% термины + 25% пять гейтов. Существующие формулы приложения не трогаем. */
function trkPct(){
  if(!trkSprint()) return null;
  var coreDone = 0, k;
  for(k in CN_TRACKS.coreSet){ if(Object.prototype.hasOwnProperty.call(CN_TRACKS.coreSet, k) && isDone(k)) coreDone++; }
  var terms = 0, termsTotal = 0;
  try{ terms = Object.values(learned).filter(function(x){ return x === 1; }).length; termsTotal = TERMS.length; }catch(e){}
  var tests = CN_TRACKS.coreTests.filter(function(g){ return (phaseTestsDone[g] || 0) >= 80; }).length;
  /* доли дают 0..1 → процент (П2-литерал терял ×100: round(0.85)=1) */
  return Math.round(((coreDone / 79) * 0.60 + (termsTotal ? (terms / termsTotal) : 0) * 0.15 + (tests / 5) * 0.25) * 100);
}

/* ---------- 8.2б Предложения факультатива ---------- */
function trkOfferState(bid){ return lpLS_get(TRK.offersKey, {})[bid] || null; }
function trkOfferSet(bid, st){
  var o = lpLS_get(TRK.offersKey, {}); o[bid] = st; lpLS_set(TRK.offersKey, o);
}
function trkBlockDone(b){ return b.lessons.every(function(id){ return isDone(id); }); }
/* Порядок предложений: приоритет 🔥 → ⭐ → 💤 (§9.2 п.4, чек-лист №12);
   cap — из A/B-каркаса (по умолчанию 3, §14.5). */
function trkPrRank(pr){ return pr === '🔥' ? 0 : (pr === '⭐' ? 1 : 2); }
function trkOffersFor(lessonId){
  var cap = 3;
  try{ cap = trkAB().offerCap || 3; }catch(e){}
  var arr = (CN_TRACKS.electivesByAnchor[lessonId] || []).slice();
  arr.sort(function(a, b){ return trkPrRank(a.priority) - trkPrRank(b.priority); });
  return arr.slice(0, cap).filter(function(b){
    return trkOfferState(b.id) !== 'dismissed' && !trkBlockDone(b);
  });
}
function trkBlockMins(b){
  var m = 0;
  b.lessons.forEach(function(id){ var L = lessonById(id); m += L ? (parseTimeEst(L) || 7) : 7; });
  return m;
}

/* ---------- 8.2в События (аналитика, §14.4) ---------- */
function trkTrack(ev, data){
  var log = lpLS_get(TRK.eventsKey, []);
  log.push({ ev: ev, d: data || {}, ts: Date.now() });
  while(log.length > 200) log.shift();
  lpLS_set(TRK.eventsKey, log);
  if(typeof window.cnTrackSink === 'function'){ try{ window.cnTrackSink(ev, data || {}); }catch(e){} } /* SaaS-хук */
}
function trkAB(){ /* каркас A/B: cn_track_ab = {cohort, gatePolicy, offerCap} */
  return lpLS_get(TRK.abKey, { cohort: 'A', gatePolicy: 'soft', offerCap: 3 });
}
