// ===== Этап 7, приёмка: контекст Ментора в тест-режиме, Фейнман из панели, сертификат капстоуна, тост-гейт «Завершить урок» =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.9.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 380) : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 180)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errs.push('[c] ' + (m.text() || '').slice(0, 180)); });
  page.on('dialog', async d => { errs.push('[dialog] ' + d.message().slice(0, 60)); await d.dismiss(); });

  await page.goto('file://' + path.resolve(HTML) + '?mockai=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    localStorage.setItem('cn_tier_override', 'max');
    sessionStorage.removeItem('mentor_upsell_closed');
  });

  // ==== 1) P1-1: в тестовом режиме панель наставника получает testId + карточку порции ====
  const s1 = await page.evaluate(async () => {
    LearnPlayer.openTest('p1', 'tests');
    await new Promise(r => setTimeout(r, 250));
    const mb = document.querySelector('.learn-root [data-lp-act="mentor"]');
    mb.click(); await new Promise(r => setTimeout(r, 200));
    const body = document.getElementById('mentor_panel_body');
    const card = document.getElementById('lp7_mentor_test');
    const res = {
      header: body ? body.firstElementChild.textContent.trim().slice(0, 30) : null,
      card: !!card,
      cardText: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 240) : null,
      lp4card: !!document.getElementById('lp4_mentor_step'),
      mentorLessonId: window._mentorLessonId
    };
    mentorClosePanel();
    return res;
  });
  ok('1. Тест-режим (p1): панель «Урок: p1» + карточка «Наставник видит тест» (фаза, порция 1, вопросы 1–5)',
    s1.header === 'Урок: p1' && s1.card && /Аттестация фазы 1/.test(s1.cardText) && /Порция 1 из 3/.test(s1.cardText) && /вопросы 1–5/.test(s1.cardText) && !s1.lp4card,
    JSON.stringify(s1));

  // ==== 2) P1-1: шаг сдачи — карточка показывает «отвечено X из Y» ====
  const s2 = await page.evaluate(async () => {
    for (let k = 0; k < 15; k++) {
      const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
      const total = document.querySelectorAll('.learn-map .learn-map-item').length;
      if (m && parseInt(m[1], 10) === total) break;
      document.querySelector('[data-lp2-nav="next"]').click();
      await new Promise(r => setTimeout(r, 45));
    }
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 200));
    const card = document.getElementById('lp7_mentor_test');
    const res = { cardText: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 240) : null };
    mentorClosePanel();
    return res;
  });
  ok('2. Тест-режим (p1): шаг сдачи — «Шаг сдачи · отвечено 0 из 12»', /Шаг сдачи/.test(s2.cardText) && /отвечено 0 из 12/.test(s2.cardText), JSON.stringify(s2));
  await page.evaluate(() => { LearnPlayer.close(); });

  // ==== 3) P1-1: мат-тест — 'generic' + карточка мат-теста ====
  const s3 = await page.evaluate(async () => {
    LearnPlayer.openTest('math_stats', 'math');
    await new Promise(r => setTimeout(r, 250));
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 200));
    const body = document.getElementById('mentor_panel_body');
    const card = document.getElementById('lp7_mentor_test');
    const res = {
      header: body ? body.firstElementChild.textContent.trim().slice(0, 30) : null,
      cardText: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 240) : null
    };
    mentorClosePanel();
    LearnPlayer.close();
    return res;
  });
  ok('3. Мат-тест: панель «Урок: generic» + карточка «🧮 Мат-тест факультатива»',
    s3.header === 'Урок: generic' && /Мат-тест/.test(s3.cardText), JSON.stringify(s3));

  // ==== 4) P1-2a: «Проверка Фейнмана» из панели — плеер сам переходит на шаг Фейнмана, поле в панели ====
  const s4 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 200));
    const act = Array.from(document.querySelectorAll('#mentor_actions button')).find(b => /Проверка Фейнмана/.test(b.textContent));
    act.click(); await new Promise(r => setTimeout(r, 350));
    const box = document.getElementById('lp7_mentor_feynman');
    const stepTitle = (document.querySelector('.learn-step-title') || {}).textContent || '';
    const ta = document.getElementById('feynman_input_p0_l1');
    return {
      box: !!box,
      linked: !!document.getElementById('lp7_feynman_in'),
      note: box ? box.innerText.replace(/\s+/g, ' ').slice(0, 90) : null,
      feynmanStep: /Метод Фейнмана/i.test(stepTitle),
      stepTaInPlayer: !!ta && !!document.querySelector('.learn-root').contains(ta),
      noVerdict: (document.getElementById('mentor_result') || {}).innerText === ''
    };
  });
  ok('4. Фейнман из панели (плеер на обложке): плеер перешёл на шаг Фейнмана, в панели связанное поле, ИИ не вызван',
    s4.box && s4.linked && s4.feynmanStep && s4.stepTaInPlayer && s4.noVerdict && /открыт в плеере/.test(s4.note), JSON.stringify(s4));

  // ==== 5) P1-2b: «Проверить» — текст уходит в шаг (input-dispatch), вердикт в панели ====
  const s5 = await page.evaluate(async () => {
    const val = 'Криптовалюта — это цифровые деньги в общей тетради (блокчейне), где переводы проверяет сеть, а не банк.';
    document.getElementById('lp7_feynman_in').value = val;
    Array.from(document.querySelectorAll('#lp7_mentor_feynman button')).find(b => /Проверить/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 650));
    const ta = document.getElementById('feynman_input_p0_l1');
    const out = (document.getElementById('mentor_result') || {}).innerText || '';
    return {
      synced: ta && ta.value === val,
      verdict: /ПОНЯЛ|ЧАСТИЧНО|ПРОПУЩЕНО/.test(out),
      demo: /ДЕМО/.test(out),
      head: out.replace(/\s+/g, ' ').slice(0, 90)
    };
  });
  ok('5. Проверка из панели: значение скопировано в шаг Фейнмана, вердикт наставника (mock, ДЕМО) в панели',
    s5.synced && s5.verdict && s5.demo, JSON.stringify(s5));
  await page.evaluate(() => { mentorClosePanel(); LearnPlayer.close(); });

  // ==== 6) P1-2c: Branch A — панель без открытого шага (плеер закрыт): поле с штатным id в панели ====
  const s6 = await page.evaluate(async () => {
    mentorOpenPanel('p0_l5');
    await new Promise(r => setTimeout(r, 200));
    const act = Array.from(document.querySelectorAll('#mentor_actions button')).find(b => /Проверка Фейнмана/.test(b.textContent));
    act.click(); await new Promise(r => setTimeout(r, 300));
    const ta = document.getElementById('feynman_input_p0_l5');
    const box = document.getElementById('lp7_mentor_feynman');
    return {
      taInPanel: !!ta && !!box && box.contains(ta),
      taUnique: document.querySelectorAll('#feynman_input_p0_l5').length,
      note: box ? box.innerText.replace(/\s+/g, ' ').slice(0, 90) : null
    };
  });
  ok('6. Фейнман из панели без шага (Branch A): textarea с id feynman_input_p0_l5 прямо в панели, единственная',
    s6.taInPanel && s6.taUnique === 1 && /не виден/.test(s6.note), JSON.stringify(s6));

  // ==== 7) P1-2d: короткий ввод не расходует лимит; текст сохраняется; затем вердикт ====
  const s7 = await page.evaluate(async () => {
    const ta = document.getElementById('feynman_input_p0_l5');
    ta.value = 'абв';
    Array.from(document.querySelectorAll('#lp7_mentor_feynman button')).find(b => /Проверить/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 250));
    const box = document.getElementById('lp7_mentor_feynman');
    const noVerdict = (document.getElementById('mentor_result') || {}).innerText === '';
    const kept = (document.getElementById('feynman_input_p0_l5') || {}).value;
    const hint = (document.getElementById('lp7_feynman_hint') || {}).textContent || '';
    document.getElementById('feynman_input_p0_l5').value = 'Дисциплина важнее прогноза: фиксируй правила до сделки и следуй им.';
    Array.from(document.querySelectorAll('#lp7_mentor_feynman button')).find(b => /Проверить/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 650));
    const out = (document.getElementById('mentor_result') || {}).innerText || '';
    return { kept, noVerdict, hint: hint.slice(0, 60), verdict: /ПОНЯЛ|ЧАСТИЧНО|ПРОПУЩЕНО/.test(out), head: out.replace(/\s+/g, ' ').slice(0, 60) };
  });
  ok('7. Короткий ввод (<10): без вердикта и без расхода лимита, текст не теряется; полный ввод даёт вердикт',
    s7.kept === 'абв' && s7.noVerdict && /10 символов/.test(s7.hint) && s7.verdict, JSON.stringify(s7));
  await page.evaluate(() => { mentorClosePanel(); });

  // ==== 8) P2-3: сертификат капстоуна — CTA «К достижениям» закрывает плеер ====
  const s8 = await page.evaluate(async () => {
    LearnPlayer.openTest('capstone', 'tests');
    await new Promise(r => setTimeout(r, 250));
    async function gotoPortion(qi) {
      const port = Math.floor(qi / 5);
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
        if (m && parseInt(m[1], 10) - 1 === port) return true;
        if (!document.querySelector('[data-lp2-nav="next"]')) return false;
        document.querySelector('[data-lp2-nav="next"]').click();
        await new Promise(r => setTimeout(r, 40));
      }
      return false;
    }
    const view = window._ptView[6];
    for (let qi = 0; qi < view.length; qi++) {
      await gotoPortion(qi);
      const q = view[qi];
      if (q.type === 'numeric') {
        const inp = document.getElementById('pnum_in_6_' + qi);
        inp.value = String(q.answer);
        document.querySelector('#ptest_6_' + qi + ' button.btn').click();
      } else {
        document.getElementById('ptest_6_' + qi).querySelectorAll('button.ans')[q.a].click();
      }
      await new Promise(r => setTimeout(r, 18));
    }
    for (let k = 0; k < 15; k++) {
      const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
      const total = document.querySelectorAll('.learn-map .learn-map-item').length;
      if (m && parseInt(m[1], 10) === total) break;
      document.querySelector('[data-lp2-nav="next"]').click();
      await new Promise(r => setTimeout(r, 40));
    }
    document.querySelector('[data-lp2-submit]').click();
    await new Promise(r => setTimeout(r, 400));
    const stepEl = document.querySelector('.learn-root .learn-step');
    const btn = Array.from(document.querySelectorAll('.learn-root .learn-step button')).find(b => /Перейти к достижениям/.test(b.textContent));
    const res = {
      cert: stepEl.textContent.indexOf('СЕРТИФИКАТ') >= 0,
      onclick: btn ? btn.getAttribute('onclick') : null
    };
    // карточка результата в панели наставника (P1-1, состояние «submitted»)
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 200));
    const card = document.getElementById('lp7_mentor_test');
    res.mentorResultCard = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : null;
    mentorClosePanel();
    btn.click();
    await new Promise(r => setTimeout(r, 350));
    res.playerClosed = !document.querySelector('.learn-root');
    res.readerCertUnchanged = String(renderCapstoneCertificate(33, 38)).indexOf('onclick="go(\'progress\')"') >= 0;
    return res;
  });
  ok('8. Сертификат в плеере: на экране; «К достижениям» = close+go; после клика плеер закрыт; читательский путь не изменён; карточка результата в панели',
    s8.cert && s8.onclick === "LearnPlayer.close();go('progress')" && s8.playerClosed && s8.readerCertUnchanged && /Результат попытки: 38 из 38/.test(s8.mentorResultCard),
    JSON.stringify(s8));

  // ==== 9) P2-4a: заблокированная кнопка в плеере — тост вместо молчания ====
  const s9 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l2');
    await new Promise(r => setTimeout(r, 400));
    // дойти до шага-врат (квиз) — там рендерится нижний гейт
    let hit = false;
    for (let i = 0; i < 45; i++) {
      if (document.querySelector('.learn-content [id^="lquiz_opts_"] .ans')) { hit = true; break; }
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    const b = document.getElementById('lesson_bottom_complete_btn_p0_l2');
    if (!b) return { noBtn: true, hit };
    b.click();
    await new Promise(r => setTimeout(r, 250));
    const toasts = Array.from(document.querySelectorAll('.app-toast')).map(t => t.innerText);
    return {
      hit,
      clickable: !b.disabled && b.getAttribute('aria-disabled') === 'true',
      toast: toasts.some(t => /Сначала сдайте квиз/.test(t)),
      done: !!lessonsDone['p0_l2']
    };
  });
  ok('9. Плеер: заблокированный гейт на шаге квиза кликабелен (aria-disabled), тап → тост «Сначала сдайте квиз», урок НЕ завершён',
    s9.hit && s9.clickable && s9.toast && !s9.done, JSON.stringify(s9));

  // ==== 10) P2-4b: после сданного квиза кнопка разблокируется и завершает урок ====
  const s10 = await page.evaluate(async () => {
    // мы уже на шаге квиза (тест 9) — ответить верно
    const opts = Array.from(document.querySelectorAll('.learn-content [id^="lquiz_opts_"] button.ans'));
    const m = /handleLessonQuizAnswer\('([^']+)',\s*(\d+),\s*(\d+)\)/.exec(opts[0].getAttribute('onclick'));
    const correct = parseInt(m[2 + 1], 10);
    const right = opts.find(b => {
      const mm = /handleLessonQuizAnswer\('([^']+)',\s*(\d+),\s*(\d+)\)/.exec(b.getAttribute('onclick'));
      return mm && parseInt(mm[2], 10) === correct;
    });
    right.click();
    await new Promise(r => setTimeout(r, 350));
    const b = document.getElementById('lesson_bottom_complete_btn_p0_l2');
    const unlocked = b && !b.disabled && b.getAttribute('aria-disabled') === null;
    if (b) { b.click(); await new Promise(r => setTimeout(r, 350)); }
    const stepTitle = (document.querySelector('.learn-step-title') || {}).textContent || '';
    return { unlocked, done: !!lessonsDone['p0_l2'], atFinish: /финал|Урок пройден|Курс/i.test(stepTitle) || !document.getElementById('lesson_bottom_complete_btn_p0_l2') };
  });
  ok('10. Плеер: квиз сдан → гейт снят (aria-disabled удалён) → клик завершает урок', s10.unlocked && s10.done, JSON.stringify(s10));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });

  // ==== 11) P2-4c: ридер — заблокированная кнопка (урок с квизом): тост, без alert, урок не завершён ====
  const s11 = await page.evaluate(async () => {
    const target = LESSONS.find(l => l.quiz && l.phase === 0 && !lessonsDone[l.id]);
    if (!target) return { noTarget: true };
    openFullscreenLesson(target.id);
    await new Promise(r => setTimeout(r, 400));
    const b = document.getElementById('lesson_complete_btn_' + target.id);
    if (!b) return { noBtn: true, id: target.id };
    b.click();
    await new Promise(r => setTimeout(r, 250));
    const toasts = Array.from(document.querySelectorAll('.app-toast')).map(t => t.innerText);
    return {
      id: target.id,
      clickable: !b.disabled && b.getAttribute('aria-disabled') === 'true',
      toast: toasts.some(t => /Сначала сдайте квиз/.test(t)),
      done: !!lessonsDone[target.id]
    };
  });
  ok('11. Ридер: тап по заблокированной кнопке (урок с квизом) → тост (без alert), урок не завершён',
    s11.clickable && s11.toast && !s11.done, JSON.stringify(s11));

  // ==== 12) P2-4d: ридер — гейт снимается после квиза; урок завершается ====
  const s12 = await page.evaluate(async (sid) => {
    const id = sid;
    const l = LESSONS.find(x => x.id === id);
    const qbtns = Array.from(document.querySelectorAll('#lessonContentBox [id^="lquiz_opts_"].ans, #lessonContentBox [id^="lquiz_opts_"] button.ans'));
    let answered = false;
    const m = qbtns.length ? /handleLessonQuizAnswer\('([^']+)',\s*(\d+),\s*(\d+)\)/.exec(qbtns[0].getAttribute('onclick')) : null;
    if (m) {
      const correct = parseInt(m[3], 10);
      const right = qbtns.find(b => {
        const mm = /handleLessonQuizAnswer\('([^']+)',\s*(\d+),\s*(\d+)\)/.exec(b.getAttribute('onclick'));
        return mm && parseInt(mm[2], 10) === correct;
      });
      if (right) { right.click(); answered = true; }
    }
    await new Promise(r => setTimeout(r, 300));
    const b = document.getElementById('lesson_complete_btn_' + id);
    const unlocked = b && !b.disabled && b.getAttribute('aria-disabled') === null;
    if (b && unlocked) { b.click(); await new Promise(r => setTimeout(r, 300)); }
    const doneAfter = !!lessonsDone[id];
    return { id, answered, unlocked, doneAfter };
  }, s11.id);
  ok('12. Ридер: квиз сдан → кнопка разблокирована → урок завершён (гейт перенесён в обёртку без потери семантики)',
    s12.answered && s12.unlocked && s12.doneAfter, JSON.stringify(s12));
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });

  // ==== 13) §7.2 + smoke + selfTest + консоль ====
  const fin = await page.evaluate(() => {
    const foreign = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/^cn_/.test(k) && !/^mentor_cache_/.test(k)) foreign.push(k); }
    const all = (window.V10 && V10.smoke && V10.smoke.checks) || [];
    return {
      foreign, smokeFails: all.filter(c => !c.ok).map(c => c.name), smokeTotal: all.length,
      self: window.LearnPlayer.selfTest(), ver: window.LearnPlayer.version
    };
  });
  ok('13. §7.2 (только cn_*), V10.smoke ' + fin.smokeTotal + ' без FAIL, selfTest ok (lp3–lp7), версия ' + fin.ver,
    fin.foreign.length === 0 && fin.smokeFails.length === 0 && fin.self.ok && fin.self.lp3.ok && fin.self.lp4.ok && fin.self.lp5.ok && fin.self.lp6.ok && fin.self.lp7.ok,
    JSON.stringify({ foreign: fin.foreign, fails: fin.smokeFails, okAll: fin.self.ok, sec: Object.fromEntries(Object.keys(fin.self).filter(k => fin.self[k] && typeof fin.self[k] === 'object' && 'ok' in fin.self[k]).map(k => [k, { ok: fin.self[k].ok, errs: fin.self[k].errors || [] }])) }));

  ok('14. Консоль: 0 pageerror / 0 console.error / 0 диалогов',
    errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e)).length === 0, JSON.stringify(errs.slice(0, 4)));

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_7: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_7: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
