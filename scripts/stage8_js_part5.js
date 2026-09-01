
/* ---------- 8.5 СОБЫТИЯ И ЭКСПОРТ ---------- */
/* stage_completed: детерминированная фиксация завершения стадии (уроки + гейт).
   Сканирование журнала исключает дубли (одно событие на стадию за lifetime). */
function trkStageEventsScan(){
  var log = lpLS_get(TRK.eventsKey, []), i, ev;
  var fired = {};
  for(i = 0; i < log.length; i++){ ev = log[i]; if(ev && ev.ev === 'stage_completed' && ev.d && ev.d.stage) fired[ev.d.stage] = 1; }
  var st = trkStages();
  for(i = 0; i < st.length; i++){
    if(fired[st[i].id]) continue;
    if(trkStageDone(st[i])) trkTrack('stage_completed', { stage: st[i].id });
  }
}
/* Сдача гейта идёт через существующую calcPhaseTestResult (пишет phaseTestsDone);
   обёртка только слушает факт сдачи — запись результата не изменяется. */
var _trkCalcPhase = calcPhaseTestResult;
calcPhaseTestResult = function(){
  var r = _trkCalcPhase.apply(this, arguments);
  try{ trkStageEventsScan(); }catch(e){}
  return r;
};

LearnPlayer.onLessonComplete(function(lid){
  trkTrack('lesson_complete', { id: lid, core: trkIsCore(lid) ? 1 : 0 });
  var bid = CN_TRACKS.blockOf[lid];
  if(bid){
    var b = null;
    CN_TRACKS.electives.forEach(function(x){ if(x.id === bid) b = x; });
    if(b && trkBlockDone(b)) trkTrack('block_done', { block: bid });
  }
  trkStageEventsScan();
  /* sprint_completed — одноразовая веха: не дублируем, если уже есть в журнале */
  if(trkSprintDone()){
    var log = lpLS_get(TRK.eventsKey, []), had = false;
    for(var i = 0; i < log.length; i++){ if(log[i] && log[i].ev === 'sprint_completed'){ had = true; break; } }
    if(!had) trkTrack('sprint_completed', { pct: trkPct() });
  }
});

window.CNTracks = {
  version: '8.0 (Этап 8: трек, ТЗ v2)',
  data: CN_TRACKS,
  open: function(id){ LearnPlayer.open(id); },
  gate: function(g){ LearnPlayer.openTest(g); },
  accept: function(bid){
    trkOfferSet(bid, 'accepted');
    trkTrack('offer_accepted', { block: bid });
    var b = null;
    CN_TRACKS.electives.forEach(function(x){ if(x.id === bid) b = x; });
    if(b && b.lessons.length) LearnPlayer.open(b.lessons[0]);
  },
  dismiss: function(bid){
    trkOfferSet(bid, 'dismissed');
    trkTrack('offer_dismissed', { block: bid });
    var el = document.getElementById('trk_offr_' + bid);
    if(el) el.remove();
  },
  upsell: function(){
    trkTrack('upsell_click', {});
    trkSetProfile('architect');
    /* из окна плеера: закрыть урок и открыть хаб (S.active блокирует openHome) */
    try{
      if(S.active){ _lp3ReturnHome = true; LearnPlayer.close(); }
      else if(!H.active){ LearnPlayer.openHome(); }
    }catch(e){ try{ LearnPlayer.openHome(); }catch(e2){} }
  },
  profile: function(p){ trkSetProfile(p); },
  view: function(v){ lpLS_set(TRK.viewKey, v === 'phases' ? 'phases' : 'track'); lp3RerenderHome(); },
  next: function(){ var n = trkNext(); if(n && n.lesson) LearnPlayer.open(n.lesson.id); },
  stage: function(id){ /* deep-view стадии: открыть первый непройденный урок стадии */
    var st = trkStages().filter(function(s){ return s.id === id; })[0];
    if(!st) return;
    var ids = (st.lessons || []).filter(function(x){ return !isDone(x); });
    LearnPlayer.open(ids.length ? ids[0] : st.lessons[0]);
  },
  stats: function(){
    return {
      profile: trkProfile(), core: trkCoreDoneCount(), of: 79,
      gates: trkCoreTestsPassed(), pct: trkPct(), sprintDone: trkSprintDone(),
      events: lpLS_get(TRK.eventsKey, []).slice(-20)
    };
  }
};

try{ V10.smoke.add('trk:api', typeof window.CNTracks === 'object' && CN_TRACKS.coreCount === 79 && typeof window.CNTracks.stats === 'function', 'Этап 8: трек «основа + факультатив»'); }catch(e){}

window.LearnPlayer.version = '8.0 (Этап 8: трек «основа + факультатив», ТЗ v2)';

/* ===== learn_player_stage8: ЭТАП 8 (конец) ===== */
