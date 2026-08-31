
/* ============================== НАВИГАЦИЯ ТЕСТА (P3.6) ============================== */
function testNext(){ if(TS.active && TS.idx < TS.steps.length - 1) renderTestStep(TS.idx + 1); }
function testPrev(){ if(TS.active && TS.idx > 0) renderTestStep(TS.idx - 1); }
function testGoTo(i){
  if(!TS.active || i === TS.idx || !TS.visited[i]) return;
  renderTestStep(i);
}

/* ============================== СДАЧА (P5) ============================== */
/* Staging-DOM со ВСЕМИ вопросами: отвеченные — лок-разметка с маркерами
   .ans.ok/.bad (как их ждёт calcPhaseTestResult), пропущенные — пустые
   контейнеры (не засчитаны — паритет со старым UI) */
function buildStaging(ph){
  var host = document.createElement('div');
  host.id = 'lp_test_staging';
  host.style.cssText = 'display:none';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<div id="ptest_final_score_' + ph + '"></div>';
  var total = TS.bank.questions.length;
  for(var qi = 0; qi < total; qi++){
    var cont = document.createElement('div');
    cont.id = 'ptest_' + ph + '_' + qi;
    var q = TS.view[qi];
    var chosen = TS.draft.answers ? TS.draft.answers[qi] : undefined;
    if(q.type === 'numeric'){
      var val = TS.draft.numeric ? TS.draft.numeric[qi] : undefined;
      if(val !== undefined){
        var ok = Math.abs(val - q.answer) <= (q.absTol !== undefined ? q.absTol : Math.abs(q.answer) * (q.tolPct || 2) / 100);
        cont.innerHTML = '<span class="ans ' + (ok ? 'ok' : 'bad') + '" style="display:none"></span>';
      }
    } else if(chosen !== undefined){
      var bs = '';
      (q.opts || []).forEach(function(o, oi){
        var cls = 'ans';
        if(oi === q.a) cls += ' ok';
        else if(oi === chosen) cls += ' bad';
        bs += '<button type="button" class="' + cls + '" disabled></button>';
      });
      cont.innerHTML = bs;
    }
    host.appendChild(cont);
  }
  S.root.appendChild(host);
  return host;
}

/* display-подсчёт маркеров staging-DOM — ТОЛЬКО для показа; истина — calcPhaseTestResult */
function countStagingCorrect(host, ph){
  var total = TS.bank.questions.length;
  var correct = 0, cumN = 0, cumOk = 0, psychN = 0, psychOk = 0;
  for(var qi = 0; qi < total; qi++){
    var cont = host.querySelector('#ptest_' + ph + '_' + qi);
    var ok = !!(cont && cont.querySelector('.ans.ok') && !cont.querySelector('.ans.bad'));
    if(ok) correct++;
    var q = TS.bank.questions[qi];
    if(q && q._cumulative){ cumN++; if(ok) cumOk++; }
    if(q && q._psychology_capstone){ psychN++; if(ok) psychOk++; }
  }
  var rate = ph === 6 ? 0.85 : 0.80;                       // та же формула порога
  var required = Math.ceil(total * rate);
  var cumReq = cumN ? Math.ceil(cumN * 0.70) : 0;
  var psychReq = psychN ? Math.ceil(psychN * 0.75) : 0;
  var subPassed = (!cumN || cumOk >= cumReq) && (!psychN || psychOk >= psychReq);
  return { correct: correct, total: total, required: required,
    cumOk: cumOk, cumN: cumN, cumReq: cumReq,
    psychOk: psychOk, psychN: psychN, psychReq: psychReq,
    subPassed: subPassed, passed: correct >= required && subPassed };
}

function submitTest(){
  if(!TS.active || TS.submitted) return;
  if(TS.kind === 'math' && !Object.keys(TS.draft.touched || {}).length){
    toast('Сначала ответь на вопросы.', '🏁'); return;
  }
  if(TS.kind === 'phase') submitPhase();
  else if(TS.kind === 'math') submitMath();
  else submitDiag();
}

function submitPhase(){
  var ph = TS.ph;
  window._ptView = window._ptView || {};
  window._ptView[ph] = TS.view;                            // _ptView актуален соли попытки
  window._ptStart = window._ptStart || {};
  if(!window._ptStart[ph]) window._ptStart[ph] = Date.now();
  var host = buildStaging(ph);
  var disp = countStagingCorrect(host, ph);
  try{ calcPhaseTestResult(ph); }                          // сам считает, пишет лучшее, save()/updateHeader()/renderProgressStats()
  catch(e){ console.warn('[LearnPlayer2] phase submit', e); }
  host.remove();
  TS.submitted = true; TS.mode = 'review';
  TS.result = disp;
  testDraftClear();                                        // черновик из LS удалён; в памяти — до конца разбора
  renderTestStep(TS.idx);
}

function submitMath(){
  var ti = TS.ti;
  try{ finishMathTest(ti); }                               // перехват alert вернёт текст в onTestResult
  catch(e){ console.warn('[LearnPlayer2] math submit', e); }
  /* display-подсчёт ТЕКУЩЕЙ попытки (mathTestState.correct — лучшая, Math.max) */
  var t = MATH_TESTS[ti];
  var st = mathTestState[ti];
  var c = 0;
  t.questions.forEach(function(q, qi){
    var sh = shuffledOptions(q, qi * 17 + 3 + ti * 9);
    if(st && st.answers && st.answers[qi] === sh.a) c++;
  });
  var req = Math.ceil(t.questions.length * 0.8);
  TS.submitted = true; TS.mode = 'review';
  TS.result = { correct: c, total: t.questions.length, required: req, passed: c >= req };
  testDraftClear();
  renderTestStep(TS.idx);
}

function submitDiag(){
  var total = TS.bank.questions.length;
  var correct = 0;
  for(var qi = 0; qi < total; qi++){
    var chosen = TS.draft.answers ? TS.draft.answers[qi] : undefined;
    if(chosen !== undefined && TS.view[qi].a === chosen) correct++;
  }
  TS.submitted = true; TS.mode = 'review';
  TS.result = { correct: correct, total: total, required: null, passed: null, diag: true };
  testDraftClear();
  renderTestStep(TS.idx);
}

function retakeTest(){
  if(!TS.active || !TS.submitted) return;
  removeStaging();
  TS.submitted = false; TS.mode = 'pass'; TS.result = null; TS._lastText = null;
  _lastTestResultText = null;
  restartAttempt();
  toast(TS.kind === 'diag' ? 'Новый прогон диагностики' :
    (TS.kind === 'math' ? 'Новая попытка: ответы перезаписываются, лучшее сохраняется' :
    'Новая попытка: новая соль — новая раскладка вариантов'), '⟲');
}

function enterReview(){
  if(!TS.active || !TS.submitted) return;
  TS.mode = 'review';
  renderTestStep(0);
}

/* ============================== ДЕЛЕГАТЫ КЛИКА ============================== */
function diagAnswer(qi, oi){
  if(!TS.active || TS.kind !== 'diag' || !TS.draft) return;
  if(TS.draft.answers[qi] !== undefined) return;           // ответ окончателен (паритет фазовых)
  TS.draft.answers[qi] = oi;
  testDraftSet(TS.draft);
  var q = TS.view[qi];
  var cont = contentEl.querySelector('[data-lp2-q="' + qi + '"]');
  if(cont){
    var box = cont.querySelector('.lp2-opts');
    if(box){
      box.querySelectorAll('button.ans').forEach(function(b, i){
        b.disabled = true;
        if(i === q.a) b.classList.add('ok');
        else if(i === oi && i !== q.a) b.classList.add('bad');
      });
    }
    var exp = cont.querySelector('.lp2-exp');
    if(exp && q.explain && q.explain[oi] !== undefined){
      exp.style.display = 'block';
      exp.innerHTML = '<b>Разбор варианта:</b> ' + q.explain[oi];
    }
  }
  updateTestChrome();
}

function testRootClick(e){
  if(!S.root) return;
  if(FC.active){
    /* карточки управляются своими data-lp2-act — см. ниже (общая ветка) */
  }
  var act = e.target.closest ? e.target.closest('[data-lp2-act]') : null;
  if(act){
    var a = act.getAttribute('data-lp2-act');
    if(a === 'picker'){ toggleBankPicker(); return; }
    if(a === 'fc'){ if(S.active && S.lessonId && !TS.active) fcStart(S.lessonId); return; }
    if(a === 'fc-exit'){ fcExit(); return; }
    if(a === 'fc-flip'){ fcFlip(); return; }
    if(a === 'fc-known'){ fcRate(1); return; }
    if(a === 'fc-unknown'){ fcRate(-1); return; }
    if(a === 'fc-again'){ fcAgainUnknown(); return; }
    if(a === 'fc-restart'){ fcRestart(); return; }
  }
  if(!TS.active) return;
  var nav = e.target.closest('[data-lp2-nav]');
  if(nav){ if(nav.getAttribute('data-lp2-nav') === 'next') testNext(); else testPrev(); return; }
  var mi = e.target.closest('[data-lp2-map]');
  if(mi){ testGoTo(parseInt(mi.getAttribute('data-lp2-map'), 10)); return; }
  var bank = e.target.closest('[data-lp2-bank]');
  if(bank){ closeBankPicker(); openTest(bank.getAttribute('data-lp2-bank'), 'inplayer'); return; }
  if(e.target.closest('[data-lp2-resume]')) return;        // у оверлея свой слушатель
  if(e.target.closest('[data-lp2-submit]')){ submitTest(); return; }
  if(e.target.closest('[data-lp2-retake]')){ retakeTest(); return; }
  if(e.target.closest('[data-lp2-review]')){ enterReview(); return; }
  if(e.target.closest('[data-lp2-close]')){ closePlayer(); return; }
  var dop = e.target.closest('[data-lp2-dopt]');
  if(dop){
    var qc = dop.closest('[data-lp2-q]');
    if(qc) diagAnswer(parseInt(qc.getAttribute('data-lp2-q'), 10), parseInt(dop.getAttribute('data-lp2-dopt'), 10));
    return;
  }
  /* Живые ответы фиксируются в черновик ПОСЛЕ существующих обработчиков */
  if(TS.kind === 'phase'){
    var cont2 = e.target.closest ? e.target.closest('div[id^="ptest_"]') : null;
    if(cont2){
      var m3 = /^ptest_(\d+)_(\d+)$/.exec(cont2.id);
      if(m3 && parseInt(m3[1], 10) === TS.ph){
        var qi3 = parseInt(m3[2], 10);
        if(cont2.querySelector('input')){
          var mk = cont2.querySelector('.ans.ok, .ans.bad');
          var inp2 = cont2.querySelector('input');
          if(mk && inp2){
            var pv = parseFloat(String(inp2.value).replace(/\s/g, '').replace(',', '.'));
            if(!isNaN(pv)){ TS.draft.numeric[qi3] = pv; testDraftSet(TS.draft); updateTestChrome(); }
          }
        } else {
          var b3 = e.target.closest('button.ans');
          if(b3){
            /* кнопка уже disabled (checkPhaseTestAnswer сработал раньше делегата),
               но клик по disabled-кнопке не диспетчеризуется — значит ответ свежий */
            var bs3 = Array.prototype.slice.call(cont2.querySelectorAll('button.ans'));
            var oi3 = bs3.indexOf(b3);
            if(oi3 >= 0){ TS.draft.answers[qi3] = oi3; testDraftSet(TS.draft); updateTestChrome(); }
          }
        }
      }
    }
    return;
  }
  if(TS.kind === 'math'){
    var mb = e.target.closest('button.ans');
    if(mb){
      var mq = mb.closest('[data-lp2-mq]');
      if(mq && !mb.disabled){
        var qi4 = parseInt(mq.getAttribute('data-lp2-mq'), 10);
        TS.draft.touched[qi4] = 1;
        testDraftSet(TS.draft);
        /* A19: подложку фазы 7 перерисует сам answerMathTest (скрыто и безвредно);
           свой шаг перерисовываем с сохранением прокрутки */
        setTimeout(function(){
          if(!TS.active || !contentEl) return;
          var sc = contentEl.scrollTop;
          renderTestStep(TS.idx, { skipDraftPos: true });
          if(contentEl) contentEl.scrollTop = sc;
        }, 0);
      }
    }
  }
}

/* ============================== КЛАВИАТУРА (1..9) ============================== */
function testKeydown(e){
  if(!S.root) return;
  if(FC.active){
    if(e.key === ' '){ e.preventDefault(); fcFlip(); return; }
    if(e.key === '1' && FC.flipped){ fcRate(-1); return; }
    if(e.key === '2' && FC.flipped){ fcRate(1); return; }
    return;
  }
  if(!TS.active) return;
  var t = e.target;
  var inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if(inField) return;
  if(/^[1-9]$/.test(e.key)) tsKeyboardPick(parseInt(e.key, 10));
}

function tsKeyboardPick(digit){
  var st = TS.steps[TS.idx];
  if(!st || st.kind !== 'portion') return;
  var target = -1;
  for(var i = 0; i < st.qs.length; i++){ if(!tsIsAnswered(st.qs[i])){ target = st.qs[i]; break; } }
  if(target < 0 && TS.kind === 'math') target = st.qs[0];  // мат: смена разрешена
  if(target < 0) return;
  var box = contentEl.querySelector(TS.kind === 'math' ? '[data-lp2-mq="' + target + '"]' : '[data-lp2-q="' + target + '"]');
  if(!box) return;
  if(TS.kind === 'phase'){
    var q = TS.view[target];
    if(q.type === 'numeric') return;                       // числовой — только ввод с клавиатуры
    var cont = document.getElementById('ptest_' + TS.ph + '_' + target);
    if(cont){ var bs = cont.querySelectorAll('button.ans'); if(bs[digit - 1]) bs[digit - 1].click(); }
    return;
  }
  var bs2 = box.querySelectorAll('button.ans');
  if(bs2[digit - 1] && !bs2[digit - 1].disabled) bs2[digit - 1].click();
}

/* ============================== ПИКЕР БАНКОВ 🏁 (P6.5) ============================== */
var TEST_BANK_IDS = ['p0','p1','p2','p3','p4','p5','p8','capstone','math_core','math_stats','math_final_map','literacy','psy_cum'];

function bankMeta(id){
  var r = resolveBank(id);
  if(!r) return null;
  var total = r.questions.length;
  var rate = (r.kind === 'phase' && r.ph === 6) ? 0.85 : (r.kind === 'math' || r.kind === 'phase') ? 0.80 : null;
  var req = rate === null ? null : Math.ceil(total * rate);
  var state, dr = testDraftGet();
  var draftInfo = '';
  if(dr && dr.testId === id){
    var a = r.kind === 'math' ? Object.keys(dr.touched || {}).length : (Object.keys(dr.answers || {}).length + Object.keys(dr.numeric || {}).length);
    draftInfo = 'черновик ' + a + '/' + total + '<br>';
  }
  if(r.kind === 'phase'){
    var best = phaseTestsDone[r.testKey] || 0;
    var reqPct = Math.round(req / total * 100);
    state = best >= reqPct ?
      '<span style="color:var(--ok);font-weight:800">✓ Сдан (лучший ' + best + '%)</span>' :
      '<span style="color:var(--warn)">Лучший: ' + best + '% · порог ' + reqPct + '%</span>';
  } else if(r.kind === 'math'){
    var st = mathTestState[r.ti];
    state = st ?
      (st.passed ? '<span style="color:var(--ok);font-weight:800">✓ Сдан (' + st.correct + ' из ' + total + ')</span>' :
        '<span style="color:var(--warn)">Лучший: ' + st.correct + ' из ' + total + '</span>') :
      '<span style="color:var(--mut)">Не сдан</span>';
  } else {
    state = '<span style="color:var(--acc2)">🔬 диагностика · на прогресс не влияет</span>';
  }
  return { r: r, total: total, req: req, state: state, draftInfo: draftInfo };
}

function toggleBankPicker(){
  var existing = S.root && S.root.querySelector('.learn-overlay[data-ov="picker"]');
  if(existing){ existing.remove(); return; }
  var ov = document.createElement('div');
  ov.className = 'learn-overlay'; ov.setAttribute('data-ov', 'picker');
  var rows = TEST_BANK_IDS.map(function(id){
    var m = bankMeta(id);
    if(!m) return '';
    return '<button type="button" class="lp-btn lp2-bank-btn" data-lp2-bank="' + id + '">' +
      '<span class="t">' + esc(m.r.title) + '</span>' +
      '<span class="m">' + m.draftInfo + m.total + ' вопр.' + (m.req ? ' · порог ' + m.req : '') + '<br>' + m.state + '</span></button>';
  }).join('');
  ov.innerHTML = '<div class="learn-sheet"><h3>🏁 Тесты, экзамены и диагностика</h3>' +
    '<div style="color:var(--mut);font-size:13px">13 банков: фазовые аттестации, мат-тесты, выпускной экзамен и две диагностики. Проходите порциями по 5 вопросов с продолжением с места.</div>' +
    '<div class="lp2-picker-list">' + rows + '</div>' +
    '<div style="margin-top:14px;text-align:right"><button type="button" class="lp-btn" data-lp2-close-picker>Закрыть</button></div></div>';
  ov.addEventListener('click', function(e){
    if(e.target === ov || e.target.closest('[data-lp2-close-picker]')){ ov.remove(); return; }
    var b = e.target.closest('[data-lp2-bank]');
    if(b){ ov.remove(); openTest(b.getAttribute('data-lp2-bank'), 'inplayer'); }
  });
  S.root.appendChild(ov);
}
function closeBankPicker(){
  var ov = S.root && S.root.querySelector('.learn-overlay[data-ov="picker"]');
  if(ov) ov.remove();
}
