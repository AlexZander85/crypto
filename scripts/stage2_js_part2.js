
/* ============================== РЕНДЕР ВОПРОСОВ (P3) ============================== */
function phaseQState(qi){
  var chosen = TS.draft.answers ? TS.draft.answers[qi] : undefined;
  var val = TS.draft.numeric ? TS.draft.numeric[qi] : undefined;
  var answered = chosen !== undefined || val !== undefined;
  return { chosen: chosen, val: val, answered: answered,
    locked: answered || TS.mode === 'review',
    reveal: TS.mode === 'review' && !answered };
}

/* Фазовый вопрос: DOM-id — те же, что ждут checkPhaseTestAnswer/checkPhaseTestNumeric/
   calcPhaseTestResult (шов §5 патч-плана). Разметка — по образцу renderPhaseTestView,
   кегли плеера. Resume рендерит лок-состояние разметкой, БЕЗ повторных вызовов проверки. */
function phaseQHtml(qi){
  var ph = TS.ph;
  var q = TS.view[qi];
  var s = phaseQState(qi);
  var head = '<div class="lp2-qn">Вопрос ' + (qi + 1) + ' из ' + TS.bank.questions.length +
    (q.category ? ' · ' + esc(q.category) : '') + '</div>';
  var numTol = function(v){
    return Math.abs(v - q.answer) <= (q.absTol !== undefined ? q.absTol : Math.abs(q.answer) * (q.tolPct || 2) / 100);
  };
  if(q.type === 'numeric'){
    var tol = q.absTol !== undefined ? '±' + q.absTol + ' ' + (q.unit || '') : '±' + (q.tolPct || 2) + '%';
    var marker = s.val !== undefined ? '<span class="ans ' + (numTol(s.val) ? 'ok' : 'bad') + '" style="display:none"></span>' : '';
    var expInner = '';
    if(s.val !== undefined){
      expInner = (numTol(s.val) ? '✅ <b>Верно!</b> ' : '❌ <b>Неверно (' + esc(String(s.val)) + ').</b> ') +
        '📐 <b>Эталон:</b> ' + esc(q.solution || '') +
        (q.explain ? '<br><span style="color:var(--mut)">💡 ' + esc(q.explain) + '</span>' : '');
    } else if(s.reveal){
      expInner = '📐 <b>Эталон:</b> ' + esc(q.solution || '') +
        (q.explain ? '<br><span style="color:var(--mut)">💡 ' + esc(q.explain) + '</span>' : '');
    }
    return '<div class="learn-card" data-lp2-q="' + qi + '">' + head +
      '<div class="lp2-qt">' + q.q + '</div>' +
      '<div class="lp2-tol">🧮 Открытый ввод — вариантов нет, посчитай сам (допуск ' + esc(tol) + ')</div>' +
      '<div id="ptest_' + ph + '_' + qi + '" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<input id="pnum_in_' + ph + '_' + qi + '" type="text" inputmode="decimal" placeholder="число" class="lp2-num-in"' +
      (s.val !== undefined ? ' value="' + attr(String(s.val)) + '" disabled' : '') + '>' +
      '<span style="color:var(--mut)">' + esc(q.unit || '') + '</span>' +
      '<button type="button" class="btn sm"' + (s.val !== undefined ? ' disabled' : '') +
      ' onclick="window.checkPhaseTestNumeric(' + ph + ', ' + qi + ')">Проверить</button>' +
      marker + '</div>' +
      '<div id="ptest_exp_' + ph + '_' + qi + '" class="lp2-exp" style="' + (expInner ? 'display:block;' : 'display:none;') + '">' + expInner + '</div>' +
      '</div>';
  }
  var buttons = (q.opts || []).map(function(o, oi){
    var cls = 'ans', dis = '';
    if(s.locked && s.chosen !== undefined){
      dis = ' disabled';
      if(oi === q.a) cls += ' ok';
      else if(oi === s.chosen && oi !== q.a) cls += ' bad';
    } else if(s.reveal){
      dis = ' disabled';
      if(oi === q.a) cls += ' ok';
    }
    return '<button type="button" class="' + cls + '"' + dis + ' data-lp2-opt="' + oi + '"' +
      ' onclick="checkPhaseTestAnswer(' + ph + ', ' + qi + ', ' + oi + ')" style="text-align:left">' + o + '</button>';
  }).join('');
  var expInner2 = '';
  if(s.chosen !== undefined && q.explain && q.explain[s.chosen] !== undefined){
    expInner2 = '<b>Разбор варианта:</b> ' + q.explain[s.chosen];
  } else if(s.reveal && q.explain && q.explain[q.a] !== undefined){
    expInner2 = '<b>Правильный ответ — разбор:</b> ' + q.explain[q.a];
  }
  return '<div class="learn-card" data-lp2-q="' + qi + '">' + head +
    '<div class="lp2-qt">' + q.q + '</div>' +
    '<div id="ptest_' + ph + '_' + qi + '" class="lp2-opts">' + buttons + '</div>' +
    '<div id="ptest_exp_' + ph + '_' + qi + '" class="lp2-exp" style="' + (expInner2 ? 'display:block;' : 'display:none;') + '">' + expInner2 + '</div>' +
    '</div>';
}

/* Мат-вопрос: вид строится как в renderMathTestsBox (27695–27711) —
   соль qi*17+3+ti*9, ok на верном, bad на выбранном неверном, explain при ответе,
   кнопки живы (смена ответа разрешена) */
function mathQHtml(qi){
  var ti = TS.ti;
  var t = MATH_TESTS[ti];
  var q = t.questions[qi];
  var sh = shuffledOptions(q, qi * 17 + 3 + ti * 9);
  var st = mathTestState[ti];
  var picked = (st && st.answers && st.answers[qi] !== undefined) ? st.answers[qi] : undefined;
  var live = TS.mode === 'pass';
  var buttons = sh.opts.map(function(o, oi){
    var cls = 'ans';
    var dis = live ? '' : ' disabled';
    if(picked !== undefined){
      if(oi === sh.a) cls += ' ok';
      else if(oi === picked) cls += ' bad';
    } else if(!live){
      dis = ' disabled';
      if(oi === sh.a) cls += ' ok'; // разбор: пропущенный — показать правильный
    }
    return '<button type="button" class="' + cls + '"' + dis +
      ' onclick="answerMathTest(' + ti + ',' + qi + ',' + oi + ')" style="text-align:left;display:block;width:auto">' + o + '</button>';
  }).join('');
  var showExp = (picked !== undefined || !live) && sh.explain;
  var exp = showExp ? '<div class="lp2-exp" style="display:block;color:var(--mut);background:rgba(6,182,212,.05);border-left:3px solid var(--acc2);padding:8px 10px;border-radius:0 8px 8px 0">' + sh.explain + '</div>' : '';
  return '<div class="learn-card" data-lp2-mq="' + qi + '">' +
    '<div class="lp2-qn">Вопрос ' + (qi + 1) + ' из ' + t.questions.length + '</div>' +
    '<div class="lp2-qt">' + q.q + '</div>' +
    '<div class="lp2-opts">' + buttons + '</div>' + exp + '</div>';
}

/* Диагностический вопрос (A16): собственной интерактивной поверхности в v12.1 нет,
   обработка — делегат плеера; в стейт приложения ничего не пишется */
function diagQHtml(qi){
  var q = TS.view[qi];
  var chosen = TS.draft.answers ? TS.draft.answers[qi] : undefined;
  var locked = chosen !== undefined || TS.mode === 'review';
  var reveal = TS.mode === 'review' && chosen === undefined;
  var buttons = (q.opts || []).map(function(o, oi){
    var cls = 'ans', dis = '';
    if(locked && chosen !== undefined){
      dis = ' disabled';
      if(oi === q.a) cls += ' ok';
      else if(oi === chosen && oi !== q.a) cls += ' bad';
    } else if(reveal){
      dis = ' disabled';
      if(oi === q.a) cls += ' ok';
    }
    return '<button type="button" class="' + cls + '"' + dis + ' data-lp2-dopt="' + oi + '" style="text-align:left">' + o + '</button>';
  }).join('');
  var expInner = '';
  if(chosen !== undefined && q.explain && q.explain[chosen] !== undefined){
    expInner = '<b>Разбор варианта:</b> ' + q.explain[chosen];
  } else if(reveal && q.explain && q.explain[q.a] !== undefined){
    expInner = '<b>Правильный ответ — разбор:</b> ' + q.explain[q.a];
  }
  return '<div class="learn-card" data-lp2-q="' + qi + '">' +
    '<div class="lp2-qn">Вопрос ' + (qi + 1) + ' из ' + TS.bank.questions.length + '</div>' +
    '<div class="lp2-qt">' + q.q + '</div>' +
    '<div class="lp2-opts">' + buttons + '</div>' +
    '<div class="lp2-exp" style="' + (expInner ? 'display:block;' : 'display:none;') + '">' + expInner + '</div></div>';
}

/* Разделитель накопительного блока — дословный текст 18204; один раз за попытку
   (паритет со старым UI, где он рисуется перед первым _cumulative-вопросом) */
function cumDividerHtml(){
  return '<div style="margin:0 0 16px;padding:14px 16px;border:1.5px solid var(--acc1);border-radius:12px;background:rgba(124,58,237,.08)">' +
    '<b style="color:var(--acc1)">🧠 Накопительный контроль переноса</b>' +
    '<div style="font-size:13px;color:var(--mut);margin-top:5px">Здесь проверяется соединение нескольких пройденных навыков. Для сдачи нужен отдельный результат этой части.</div></div>';
}

function testPortionHtml(st){
  var parts = [];
  if(!TS._cumShown && TS.view){
    var hasCum = st.qs.some(function(qi){ return TS.view[qi] && TS.view[qi]._cumulative; });
    if(hasCum){ TS._cumShown = true; parts.push(cumDividerHtml()); }
  }
  var cards = st.qs.map(function(qi){
    if(TS.kind === 'math') return mathQHtml(qi);
    if(TS.kind === 'diag') return diagQHtml(qi);
    return phaseQHtml(qi);
  });
  var kicker = TS.kind === 'math' ? '🧮 Мат-тест факультатива' : (TS.kind === 'diag' ? '🔬 Диагностика' : '📝 Аттестация фазы');
  return '<div class="learn-step-kicker">' + kicker + '</div>' +
    '<h2 class="learn-step-title">' + esc(TS.bank.title) + '</h2>' +
    '<div style="color:var(--mut);margin-bottom:14px;font-size:calc(var(--lp-fs) - 5px)">Порция ' + (TS.idx + 1) +
    ' из ' + (TS.steps.length - 1) + ' · вопросы ' + (st.qs[0] + 1) + '–' + (st.qs[st.qs.length - 1] + 1) +
    (TS.kind === 'math' ? ' · ответ можно менять до проверки' : (TS.kind === 'phase' ? ' · ответ окончателен, разбор сразу' : '')) + '</div>' +
    parts.join('') + cards.join('');
}

/* ============================== ШАГ-ВРАТА И РЕЗУЛЬТАТ (P5) ============================== */
function testGateHtml(){
  if(TS.submitted) return testResultHtml();
  var total = TS.bank.questions.length;
  var ans = tsAnsweredCount();
  var missed = [];
  for(var qi = 0; qi < total; qi++){ if(!tsIsAnswered(qi)) missed.push(qi + 1); }
  var missHtml = missed.length ?
    '<div class="lp2-miss-list">Пропущены вопросы: ' + missed.slice(0, 30).join(', ') +
    (missed.length > 30 ? ' … и ещё ' + (missed.length - 30) : '') + '</div>' : '';
  var warn = missed.length ?
    '<div class="learn-card warn" style="margin-top:14px"><b>⚠️ Не все вопросы отвечены</b> (' + missed.length +
    ' пропущено из ' + total + '). Сдать можно и с пропусками — как в обычном режиме: пропущенное не засчитывается.</div>' : '';
  var diag = TS.kind === 'diag' ?
    '<div class="learn-card acc1" style="margin-top:14px"><b>🔬 Диагностический режим.</b> Результат покажет уровень, но ничего не пишет в прогресс и гейты (в v12.1 у этого банка нет своей поверхности результата).</div>' : '';
  return '<div class="learn-step-kicker">🏁 Финальный шаг</div>' +
    '<h2 class="learn-step-title">' + esc(TS.bank.title) + '</h2>' +
    '<div class="learn-card">' +
    '<div style="font-size:calc(var(--lp-fs) + 2px);font-weight:800;margin-bottom:8px">Отвечено: ' + ans + ' из ' + total + '</div>' +
    missHtml + '</div>' + warn + diag +
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
    '<button type="button" class="lp-btn primary" data-lp2-submit>🏁 ' +
    (TS.kind === 'math' ? 'Проверить тест' : (TS.kind === 'diag' ? 'Завершить диагностику' : 'Сдать тест и проверить результат')) +
    '</button>' +
    '<button type="button" class="lp-btn ghost" data-lp2-nav="prev">← К вопросам</button>' +
    '</div>';
}

function testResultHtml(){
  var d = TS.result || {};
  var passed = !!d.passed;
  var h = '<div style="text-align:center;padding:14px 0 4px">' +
    '<div style="font-size:52px;line-height:1;margin-bottom:8px">' +
    (TS.kind === 'diag' ? '🔬' : (passed ? '🎉' : '📉')) + '</div>' +
    '<h1 class="learn-cover-title" style="margin-bottom:4px">' +
    (TS.kind === 'diag' ? 'Диагностика завершена' : (passed ? 'Тест сдан!' : 'Тест не сдан')) + '</h1>';
  if(TS.kind === 'diag'){
    h += '<div class="learn-badge" style="background:rgba(6,182,212,.15);color:var(--acc2)">Правильных: ' + d.correct + ' из ' + d.total + '</div>';
  } else {
    h += '<div class="lp2-result-score" style="color:' + (passed ? 'var(--ok)' : 'var(--bad)') + '">' +
      d.correct + ' / ' + d.total + ' <span style="font-size:calc(var(--lp-fs) - 4px);color:var(--mut);font-weight:700">(порог ' + d.required + ')</span></div>';
  }
  h += '</div>';
  if(TS.kind === 'diag'){
    h += '<div class="learn-card acc1"><b>🔬 Диагностика</b> — на прогресс и гейты не влияет, результат никуда не записывается.</div>';
  }
  if(TS._lastText){
    h += '<div class="learn-card" style="border-left:4px solid ' + (passed ? 'var(--ok)' : 'var(--bad)') + ';font-size:calc(var(--lp-fs) - 4px);line-height:1.55">' +
      esc(TS._lastText) + '</div>';
  }
  /* Сертификат фазы 6: calcPhaseTestResult рисует его в скрытый #phaseTestBox —
     плеер строит свой экран и вставляет ту же строку (P5.2) */
  if(TS.ph === 6 && passed && typeof renderCapstoneCertificate === 'function'){
    h += '<div style="margin-top:14px">' + renderCapstoneCertificate(d.correct, d.total) + '</div>';
  }
  if(TS.ph === 6 && d.cumN){
    h += '<div class="learn-card" style="margin-top:14px;font-size:calc(var(--lp-fs) - 4px);line-height:1.6">' +
      '<b>Подблоки экзамена:</b><br>' +
      'Накопительный контроль: ' + d.cumOk + '/' + d.cumN + ' (нужно ≥ ' + d.cumReq + ') — ' + (d.cumOk >= d.cumReq ? '✓' : '✗') +
      (d.psychN ? '<br>Психологический блок: ' + d.psychOk + '/' + d.psychN + ' (нужно ≥ ' + d.psychReq + ') — ' + (d.psychOk >= d.psychReq ? '✓' : '✗') : '') +
      '</div>';
  }
  /* CTA «Следующий урок фазы» после сданного фазового (ТЗ §11.5) */
  if(TS.kind === 'phase' && passed && TS.ph !== 6){
    var nl = firstUnpassedOfPhase(TS.ph);
    if(nl){
      h += '<div style="text-align:center;margin-top:12px">' +
        '<button type="button" class="lp-btn primary" onclick="LearnPlayer.open(\'' + attr(nl.id) + '\')">▸ Следующий урок фазы: ' + esc(nl.title) + '</button></div>';
    }
  }
  var best = '';
  if(TS.kind === 'phase' && phaseTestsDone[TS.bank.testKey] !== undefined){
    best = 'Лучший результат: ' + phaseTestsDone[TS.bank.testKey] + '%';
  } else if(TS.kind === 'math' && mathTestState[TS.ti]){
    best = 'Лучший результат: ' + mathTestState[TS.ti].correct + ' из ' + TS.bank.questions.length +
      (mathTestState[TS.ti].passed ? ' · сдан' : '');
  }
  h += '<div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">' +
    '<button type="button" class="lp-btn" data-lp2-review>🔍 Разбор</button>' +
    '<button type="button" class="lp-btn ghost" data-lp2-retake>⟲ ' + (TS.kind === 'math' ? 'Пройти заново' : 'Пересдать') + '</button>' +
    '<button type="button" class="lp-btn ghost" data-lp2-close>✕ Закрыть</button></div>' +
    (best ? '<div class="lp2-result-note">' + esc(best) + '</div>' : '');
  return h;
}

function firstUnpassedOfPhase(ph){
  var res = null;
  try{
    for(var i = 0; i < LESSONS.length; i++){
      if(LESSONS[i].phase === ph && !isDone(LESSONS[i].id)) return LESSONS[i];
    }
  }catch(e){}
  return res;
}

/* ============================== ГЛАВНЫЙ РЕНДЕР ШАГА ТЕСТА ============================== */
function renderTestStep(idx, opts){
  if(!TS.active || !contentEl) return;
  opts = opts || {};
  idx = Math.max(0, Math.min(TS.steps.length - 1, idx));
  TS.idx = idx;
  TS.visited[idx] = true;
  if(!opts.skipDraftPos && TS.draft && !TS.submitted){
    /* после сдачи черновик удалён из LS и держится только в памяти (сессия разбора) */
    TS.draft.pos = idx; testDraftSet(TS.draft);
  }
  var st = TS.steps[idx];
  var html = st.kind === 'gate' ? testGateHtml() : testPortionHtml(st);
  contentEl.innerHTML = '<div class="learn-step" data-lp2-idx="' + idx + '">' + html + '</div>';
  requestAnimationFrame(function(){
    if(!contentEl) return;
    var stepEl = contentEl.firstElementChild;
    if(contentEl.scrollHeight <= contentEl.clientHeight + 40 && stepEl) stepEl.classList.add('short');
    contentEl.scrollTop = opts.keepScroll ? (opts.keepScroll || 0) : 0;
  });
  updateTestChrome();
}

/* ============================== ХРОМ ТЕСТОВОГО РЕЖИМА ============================== */
function updateTestChrome(){
  if(!S.root || !TS.active) return;
  var total = TS.bank.questions.length;
  var ans = tsAnsweredCount();
  var pct = total ? Math.round(ans / total * 100) : 0;
  var pbar = S.root.querySelector('.learn-pbar i');
  if(pbar) pbar.style.width = pct + '%';
  var pl = S.root.querySelector('.learn-progress-label');
  if(pl) pl.textContent = 'Шаг ' + (TS.idx + 1) + ' из ' + TS.steps.length + ' · отвечено ' + ans + ' из ' + total;
  var pt = S.root.querySelector('.learn-progress-title');
  if(pt) pt.textContent = TS.bank.title;
  var pb = S.root.querySelector('.learn-progress-wrap');
  if(pb){ pb.setAttribute('aria-valuenow', String(ans)); pb.setAttribute('aria-valuemax', String(total)); }
  renderTestMap();
  renderTestBottom();
  syncHeaderButtons();
  updatePomoChip();
}

/* Карта шагов: порции с индикаторами «отвечена / частично / не отвечена» (ТЗ §11.5) */
function renderTestMap(){
  var map = S.root.querySelector('.learn-map');
  if(!map) return;
  var items = TS.steps.map(function(st, i){
    var cur = i === TS.idx;
    var clickable = !!TS.visited[i] && !cur;
    var icon = st.icon, sub = st.title;
    if(st.kind === 'portion'){
      var a = portionAnswered(st), n = st.qs.length;
      if(TS.mode === 'review' && TS.submitted){
        icon = portionAllCorrect(st) ? '✅' : '❌';
      } else {
        icon = a >= n ? '✓' : (a > 0 ? '◐' : '○');
      }
      sub = esc(st.title) + ' · ' + a + '/' + n;
    } else if(TS.submitted && TS.result){
      sub = 'Итог: ' + TS.result.correct + '/' + TS.result.total;
    }
    return '<button type="button" class="learn-map-item ' + (cur ? 'current' : '') + '" data-lp2-map="' + i + '"' +
      (clickable ? '' : ' disabled') + '><span class="ms">' + icon + '</span><span class="mt">' + sub + '</span></button>';
  }).join('');
  map.innerHTML = '<div class="learn-map-h">Порции · ' + TS.steps.length + '</div>' + items;
}

function renderTestBottom(){
  var bottom = S.root.querySelector('.learn-bottom');
  if(!bottom) return;
  var st = TS.steps[TS.idx];
  var prevBtn = '<button type="button" class="lp-btn ghost" data-lp2-nav="prev"' + (TS.idx === 0 ? ' disabled' : '') +
    ' aria-label="Назад">← Назад</button>';
  var nextSt = TS.steps[TS.idx + 1];
  var right;
  if(st.kind === 'gate'){
    right = TS.submitted ?
      '<span style="color:var(--mut);font-size:12.5px">Попытка завершена — разбор доступен по карте</span>' :
      '<button type="button" class="lp-btn primary" data-lp2-submit>🏁 ' +
      (TS.kind === 'diag' ? 'Завершить диагностику' : 'Сдать тест') + '</button>';
  } else if(nextSt){
    var isGate = nextSt.kind === 'gate';
    right = '<div class="learn-next-preview"><span class="np">' +
      (isGate ? 'Финальный шаг: сдача теста' : 'Дальше: ' + nextSt.icon + ' ' + esc(nextSt.title)) + '</span>' +
      '<button type="button" class="lp-btn primary" data-lp2-nav="next" aria-label="Дальше">' +
      (isGate ? 'К сдаче →' : 'Дальше →') + '</button></div>';
  } else {
    right = '<span style="color:var(--mut);font-size:12.5px">Конец</span>';
  }
  bottom.innerHTML = prevBtn + '<div style="flex:1"></div>' + right;
}

/* Видимость кнопок шапки: в тестовом режиме 🔖 и 💬 скрываются (неактуальны) */
function syncHeaderButtons(){
  if(!S.root) return;
  var fcBtn = S.root.querySelector('[data-lp2-act="fc"]');
  var pk = S.root.querySelector('[data-lp2-act="picker"]');
  var bm = S.root.querySelector('[data-lp-act="bm"]');
  var men = S.root.querySelector('[data-lp-act="mentor"]');
  if(fcBtn){
    var l = (!TS.active && !FC.active && S.lessonId) ? lessonById(S.lessonId) : null;
    var has = false;
    if(l){ try{ has = buildDeck(l).length > 0; }catch(e){} }
    fcBtn.style.display = (has && !FC.active) ? '' : 'none';
  }
  if(pk) pk.style.display = '';
  if(bm) bm.style.display = TS.active ? 'none' : '';
  if(men) men.style.display = TS.active ? 'none' : '';
}
