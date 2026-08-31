/* ============================================================
   learn_player_stage4: ЭТАП 4 — Пункт 1: персистентный счётчик ошибок.
   ------------------------------------------------------------
   Было (Этапы 1–3): S.quizAttempts — сессионный (сброс при каждом
   открытии урока), рекомендация адаптива на финале жила только в той
   сессии, где были ≥3 неверных попыток квиза.
   Стало: накопитель cn_learn_mist = { lid: { n: totalWrong, ts } } —
   растёт между сессиями, читается на финале, сбрасывается по CTA
   «🔄 Пройти адаптивную тренировку» и по ссылке «Не напоминать».

   Паритет с Этапом 1 (§12.6): инкремент — тем же событием (неверная
   попытка квиза: тот же селектор #lquiz_opts_<lid> .ans, тот же
   защитный предикат quizPassed(), тот же тайминг setTimeout —
   слушатель добавлен ПОСЛЕ родного, поэтому срабатывает строго после
   него). Счётчик «Попытка N» внутри квиза остаётся сессионным —
   персистентным live только накопитель для рекомендации.

   §11.9/§0.1: ADAPTIVE_QUESTION_BANK, банки, существующие функции —
   не тронуты; только обёртки и новые LS-ключи (cn_learn_*).
   ============================================================ */

var LP4_KEY = 'cn_learn_mist';
var LP4_THRESHOLD = 3;      // ≥3 неверных попыток — показать рекомендацию
var LP4_EXCERPT = 420;      // обрезка текста шага для контекста наставника

function lp4MistAll(){
  var st = lpLS_get(LP4_KEY, {});
  if(!st || typeof st !== 'object' || Array.isArray(st)) return {};
  return st;
}
function lp4MistTotal(lid){
  var rec = lp4MistAll()[lid];
  return (rec && typeof rec.n === 'number' && isFinite(rec.n) && rec.n > 0) ? rec.n : 0;
}
function lp4MistSet(lid, n){
  if(!lid || typeof lid !== 'string') return;
  var st = lp4MistAll();
  if(typeof n !== 'number' || !isFinite(n) || n <= 0) delete st[lid];
  else st[lid] = { n: Math.floor(n), ts: Date.now() };
  lpLS_set(LP4_KEY, st);
}

/* --- Хук инкремента: обёртка attachStepDelegates (Этап 1) ---
   Родной делегат уже висит на stepEl; наш слушатель добавляется после
   него и потому выполняется позже (same phase, порядок регистрации),
   а его setTimeout встаёт в очередь позже родного setTimeout(0). */
var _lp4AttachDelegates = attachStepDelegates;
attachStepDelegates = function(stepEl, st, l){
  _lp4AttachDelegates.apply(this, arguments);
  try{
    if(!stepEl || stepEl.__lp4mist) return;
    if(!st || st.kind !== 'quiz' || !l || !l.id) return;
    stepEl.__lp4mist = true;
    stepEl.addEventListener('click', function(ev){
      var opt = ev.target.closest('#lquiz_opts_' + l.id + ' .ans');
      if(!opt) return;
      setTimeout(function(){
        try{
          if(quizPassed()) return; /* верная попытка — счётчик не растёт (паритет с Этапом 1) */
          lp4MistSet(l.id, lp4MistTotal(l.id) + 1);
        }catch(e){}
      }, 0);
    });
  }catch(e){}
};

/* --- Финал: карточка рекомендации по ПЕРСИСТЕНТНОМУ итогу ---
   Обёртка lp3CourseFinaleHtml (Этап 3): на время её вызова глушим
   сессионное значение S.quizAttempts[lid] (иначе Этап 3 отрисует свою
   карточку по сессии), затем рисуем свою карточку по накопителю.
   S.quizAttempts восстанавливается синхронно — другой код не работает
   между этими строками. */
var _lp4CourseFinale = lp3CourseFinaleHtml;
lp3CourseFinaleHtml = function(l){
  var saved, h;
  try{ saved = S.quizAttempts[l.id]; }catch(e){}
  var total = lp4MistTotal(l.id);
  try{
    try{ S.quizAttempts[l.id] = 0; }catch(e1){}
    h = _lp4CourseFinale(l);
  } finally {
    try{
      if(saved === undefined) delete S.quizAttempts[l.id];
      else S.quizAttempts[l.id] = saved;
    }catch(e2){}
  }
  try{
    if(total >= LP4_THRESHOLD){
      var sess = 0;
      try{ sess = S.quizAttempts[l.id] || 0; }catch(e3){}
      h += lp4RecommendCard(l, total, sess);
    }
  }catch(e4){}
  return h;
};

function lp4RecommendCard(l, total, sess){
  var hist = total > sess ? ' (всего, с учётом прошлых сессий)' : '';
  return '<div class="learn-card warn" id="lp4_rec_card" style="max-width:560px;margin:16px auto 0;padding:14px 18px;text-align:left">' +
    '<div style="font-weight:800;margin-bottom:6px">🔄 Квиз дался непросто (' + total + ' неверн' + lp4Plural(total) + ' попытк' + lp4Plural2(total) + ')' + hist + '</div>' +
    '<div style="font-size:calc(var(--lp-fs) - 5px);color:var(--mut);line-height:1.55;margin-bottom:10px">Счётчик сохраняется между сессиями. Запусти адаптивную тренировку — она подберёт вопросы по слабым темам из существующего банка и закрепит материал.</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<button type="button" class="lp-btn primary" onclick="LearnPlayer._goAdaptive()">🔄 Пройти адаптивную тренировку по этой теме</button>' +
      '<button type="button" class="lp-btn ghost" onclick="LearnPlayer._mistReset(\'' + attr(l.id) + '\')">Не напоминать</button>' +
    '</div></div>';
}
function lp4Plural(n){ /* прилагательное: неверн[ая/ые/ых] */
  var d = n % 10, h = n % 100;
  if(d === 1 && h !== 11) return 'ая';
  if(d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'ые';
  return 'ых';
}
function lp4Plural2(n){ /* существительное: попытк[а/и/ок] */
  var d = n % 10, h = n % 100;
  if(d === 1 && h !== 11) return 'а';
  if(d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'и';
  return 'ок';
}

/* --- Сброс по CTA: считаем, что рекомендация отработала, когда ученик
   нажал «🔄 Пройти адаптивную тренировку» (намерение зафиксировано) --- */
var _lp4GoAdaptive = window.LearnPlayer._goAdaptive;
window.LearnPlayer._goAdaptive = function(){
  var lid = null;
  try{ lid = S.lessonId; }catch(e){}
  var r = _lp4GoAdaptive.apply(this, arguments);
  try{ if(lid && lp4MistTotal(lid) > 0) lp4MistSet(lid, 0); }catch(e){}
  return r;
};

/* --- Публичный API Этапа 4 (приёмка/диагностика) --- */
window.LearnPlayer._mistInfo = function(lid){
  var sess = 0;
  try{ sess = S.quizAttempts[lid] || 0; }catch(e){}
  return { total: lp4MistTotal(lid), sess: sess, threshold: LP4_THRESHOLD };
};
window.LearnPlayer._mistReset = function(lid){
  lp4MistSet(lid, 0);
  try{ if(S.active && S.lessonId === lid && typeof renderStep === 'function') renderStep(S.idx); }catch(e){}
  try{ toast('Счётчик ошибок урока сброшен', '🔄'); }catch(e1){}
};
