/* ============================================================
   learn_player_stage4: ЭТАП 4 — Пункт 2: наставник в потоке шагов (§5.5).
   ------------------------------------------------------------
   Было: наставник вызывался по кнопке «💬» шапки плеера как
   mentorOpenPanel(l.id) и не знал, на каком шаге ученик (контекст
   урока наставник строит сам — MENTOR.buildLessonText, весь урок).
   Стало:
   1) window.mentorOpenPanel обёрнут (поверх v10-обёртки «моста чисел»):
      если плеер открыт в режиме урока — наставник автоматически получает
      контекст ТЕКУЩЕГО шага (idx/total/title/kind + фрагмент материала);
   2) в панели появляется карточка шага с кнопкой «💬 Подсказка по этому
      шагу» → MENTOR.ask('socratic', lessonId, { step, stepTitle,
      stepText }) — payload существующего контура; код наставника,
      лимиты (30/день), фильтр запрещённых фраз и тарифный гейт не тронуты;
   3) в футере КАЖДОГО шага урока — кнопка «💬 Наставник» (data-lp-act);
   4) в demo-тире апселл поднят над плеером CSS-фиксом (stage4_css).
   В тестовом режиме (Этап 2) шаговый контекст не передаётся: порции —
   вопросы, а не материал; панель доступна с контекстом урока как раньше.
   ============================================================ */

var lp4LastCtx = null; /* контекст шага, с которого панель открыта */

function lp4EscPanel(s){
  return (window.V10 && typeof V10.escHtml === 'function')
    ? V10.escHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
      });
}

/* Текущий шаг плеера → контекст наставника. null вне плеера/в тестовом режиме. */
function lp4StepCtx(){
  try{
    if(!S || !S.active) return null;
    try{ if(typeof TS !== 'undefined' && TS && TS.active) return null; }catch(eT){}
    if(!S.steps || !S.steps.length) return null;
    var st = S.steps[S.idx];
    if(!st) return null;
    var l = lessonById(S.lessonId);
    if(!l) return null;
    var el = S.root ? S.root.querySelector('.learn-step') : null;
    var text = el ? String(el.innerText || '') : '';
    text = text.replace(/\s+/g, ' ').trim();
    if(text.length > LP4_EXCERPT) text = text.slice(0, LP4_EXCERPT) + '…';
    return {
      lessonId: l.id,
      lessonTitle: l.title || '',
      idx: S.idx,
      total: S.steps.length,
      title: st.title || '',
      kind: st.kind || '',
      text: text
    };
  }catch(e){ return null; }
}

/* Обёртка window.mentorOpenPanel(lessonId[, stepCtx]).
   Вызов с одним аргументом из открытого плеера (шапка/футер) → авто-контекст
   текущего шага. Вызовы приложения (ридер и пр.) при закрытом плеере дают
   ctx = null — панель работает как раньше, без шаговой карточки. */
var _lp4MentorOpen = window.mentorOpenPanel;
window.mentorOpenPanel = function(lessonId, stepCtx){
  var ctx = (arguments.length >= 2) ? stepCtx : lp4StepCtx();
  var r = _lp4MentorOpen.apply(this, [lessonId]);
  try{
    var panel = document.getElementById('mentor_panel');
    if(!panel){ lp4LastCtx = null; return r; } /* demo-тире: открыт апселл (поднят CSS-фиксом) */
    if(ctx){
      lp4LastCtx = ctx;
      lp4InjectStepCtx(ctx);
    } else {
      lp4LastCtx = null;
      var stale = document.getElementById('lp4_mentor_step');
      if(stale) stale.remove();
    }
  }catch(e){}
  return r;
};
window.mentorOpenPanel.__lp4wrapped = true;

/* Карточка шага в панели: строка контекста + фрагмент материала + CTA */
function lp4InjectStepCtx(ctx){
  var body = document.getElementById('mentor_panel_body');
  if(!body) return;
  var head = body.firstElementChild;
  if(head && head.tagName === 'DIV'){
    head.innerHTML = 'Урок: ' + lp4EscPanel(ctx.lessonId) +
      ' · Шаг ' + (ctx.idx + 1) + ' из ' + ctx.total + ': ' + lp4EscPanel(ctx.title);
  }
  var old = document.getElementById('lp4_mentor_step');
  if(old) old.remove();
  var ex = ctx.text ? (ctx.text.length > 140 ? ctx.text.slice(0, 140) + '…' : ctx.text) : '';
  var card = document.createElement('div');
  card.id = 'lp4_mentor_step';
  card.style.cssText = 'margin:0 0 10px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(127,127,127,.07)';
  card.innerHTML =
    '<div style="font-size:11px;color:var(--mut);line-height:1.55;margin-bottom:7px">Наставник видит текущий шаг: ' +
      '<b style="color:var(--txt)">' + lp4EscPanel(ctx.title) + '</b>' +
      (ex ? '<br><span style="font-style:italic">«' + lp4EscPanel(ex) + '»</span>' : '') +
    '</div>' +
    '<button type="button" class="btn sm" style="font-size:12px" onclick="LearnPlayer._mentorStepAsk()">💬 Подсказка по этому шагу</button>';
  var actions = document.getElementById('mentor_actions');
  if(actions && actions.parentNode) actions.parentNode.insertBefore(card, actions);
  else body.insertBefore(card, body.firstChild ? body.firstChild.nextSibling : null);
}

/* Подсказка по шагу — через существующий контур MENTOR.ask (лимит/фильтр/мок
   работают как у всех действий; payload несёт шаговый контекст) */
window.LearnPlayer._mentorStepAsk = function(){
  var ctx = lp4LastCtx || lp4StepCtx();
  var out = document.getElementById('mentor_result');
  if(!ctx || !out) return;
  if(typeof MENTOR === 'undefined' || !MENTOR || typeof MENTOR.ask !== 'function'){
    out.innerHTML = '<div style="font-size:12.5px;color:var(--warn)">Наставник недоступен в этой сборке.</div>';
    return;
  }
  out.innerHTML = '<div style="font-size:12px;color:var(--mut)">🤖 Разбираю материал шага «' + lp4EscPanel(ctx.title) + '»…</div>';
  MENTOR.ask('socratic', ctx.lessonId, { step: ctx.idx + 1, stepTitle: ctx.title, stepText: ctx.text, source: 'learn_player_step' })
    .then(function(r){
      var demo = r && r.json && r.json.demo;
      out.innerHTML = '<div style="font-size:12.5px;line-height:1.6;color:var(--txt);white-space:pre-wrap">' +
        lp4EscPanel(r && r.text ? r.text : '(наставник не вернул текст — попробуй ещё раз)') +
        (demo ? '<div style="margin-top:8px;font-size:11px;color:var(--mut)">🎭 ДЕМО-режим наставника (без ИИ): правило-заглушка вместо модели.</div>' : '') +
        '</div>';
    })
    .catch(function(e){
      var m = (e && e.message) || '';
      out.innerHTML = '<div style="font-size:12.5px;color:var(--warn)">' +
        (m === 'limit' ? 'Дневной лимит наставника исчерпан (' + (window.MENTOR_LIMIT || 30) + ' действий).' :
         m === 'offline' ? 'Нет соединения — наставнику нужна сеть.' :
         'Наставник задумался слишком надолго — попробуй ещё раз.') + '</div>';
    });
};
