// ===== Этап 3, приёмка C: конспект (P6), адаптивная рекомендация, A11y, §7.2 стейт =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.5.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cn_tour_done', '1');
  });
  await page.reload();
  await page.waitForTimeout(3200);
  // Снимок LS до сценариев (§7.2)
  const lsBefore = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

  // ==== P6.1: выделение → плавающая кнопка → заметка ====
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(400);
  // перейти на шаг с текстом теории
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      const p = st && Array.from(st.querySelectorAll('p, li')).find(x => x.innerText.trim().length > 60);
      if (p) return;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) return; nb.click(); await new Promise(r => setTimeout(r, 70));
    }
  });
  await page.waitForTimeout(200);
  const selMade = await page.evaluate(() => {
    const step = document.querySelector('.learn-step');
    const p = Array.from(step.querySelectorAll('p, li')).find(x => x.innerText.trim().length > 60);
    if (!p) return { ok: false };
    const node = p.firstChild;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(50, String(node.textContent).length));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    return { ok: true, quote: String(sel).slice(0, 40) };
  });
  await page.waitForTimeout(200);
  const fab = await page.evaluate(() => {
    const f = document.getElementById('lp3_note_fab');
    if(!f) return null;
    const r = f.getBoundingClientRect();
    return { text: f.textContent, visible: r.width > 0 && r.height > 0, at: [Math.round(r.left), Math.round(r.top)] };
  });
  ok('P6.1 выделение в шаге → кнопка «＋ В конспект»', selMade.ok && !!fab && fab.visible, JSON.stringify({ sel: selMade.quote, fab }));

  await page.evaluate(() => document.getElementById('lp3_note_fab').click());
  await page.waitForTimeout(250);
  const noteSaved = await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('cn_learn_notes') || '[]');
    return { n: arr.length, first: arr[0] ? { lessonId: arr[0].lessonId, stepIdx: arr[0].stepIdx, quoteLen: arr[0].quote.length } : null,
      fabGone: !document.getElementById('lp3_note_fab'), selCleared: String(window.getSelection()).length === 0 };
  });
  ok('P6.1 клик → заметка {lessonId, stepIdx, quote≤500} в LS, кнопка исчезла',
    noteSaved.n === 1 && noteSaved.first && noteSaved.first.lessonId === 'p0_l1' && noteSaved.fabGone && noteSaved.selCleared,
    JSON.stringify(noteSaved));

  // Вкладка «Конспект» показывает заметку; клик → переход к шагу
  await page.click('[data-lp3-tab="notes"]');
  await page.waitForTimeout(250);
  const notesPanel = await page.evaluate(() => {
    const q = document.querySelector('.lp3-note-q');
    return { visible: !!q, head: (document.querySelector('.lp3-ng-h') || {}).textContent || null };
  });
  ok('P6.3 панель «Конспект»: группировка по уроку, цитата видна',
    notesPanel.visible && /0\.1|Что вообще/.test(notesPanel.head || ''), JSON.stringify(notesPanel));

  const noteJump = await page.evaluate(async () => {
    const before = +(document.querySelector('[data-lp-idx]') || document.querySelector('.learn-step')).getAttribute ? document.querySelector('[data-lp-idx]') : null;
    const prevIdx = before ? before.getAttribute('data-lp-idx') : null;
    document.querySelector('.lp3-note-q').click();
    await new Promise(r => setTimeout(r, 250));
    const cur = document.querySelector('[data-lp-idx]');
    const note = JSON.parse(localStorage.getItem('cn_learn_notes'))[0];
    return { prevIdx, curIdx: cur ? cur.getAttribute('data-lp-idx') : null, expect: String(note.stepIdx), mapClosed: document.querySelector('.learn-root').getAttribute('data-map-open') !== '1' };
  });
  ok('P6.3 клик по заметке → переход к шагу заметки',
    noteJump.curIdx === noteJump.expect, JSON.stringify(noteJump));

  // Комментарий: ✎ → textarea → Сохранить
  await page.evaluate(async () => {
    document.querySelector('[data-lp3-tab="notes"]').click();
    await new Promise(r => setTimeout(r, 150));
    document.querySelector('[data-lp3-note-edit]').click();
  });
  await page.waitForTimeout(150);
  await page.fill('.lp3-note-ta', 'Перечитать перед экзаменом фазы 0');
  await page.evaluate(() => document.querySelector('[data-lp3-note-save]').click());
  await page.waitForTimeout(200);
  const noteComment = await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('cn_learn_notes'));
    return { note: arr[0].note, shown: !!document.querySelector('.lp3-note-c') };
  });
  ok('P6.3 комментарий редактируется и сохраняется',
    noteComment.note === 'Перечитать перед экзаменом фазы 0' && noteComment.shown, JSON.stringify(noteComment));

  // Удаление с undo (без confirm)
  await page.evaluate(() => document.querySelector('[data-lp3-note-del]').click());
  await page.waitForTimeout(200);
  const delState = await page.evaluate(() => ({
    n: JSON.parse(localStorage.getItem('cn_learn_notes')).length,
    undoBar: !!document.querySelector('.lp3-undo')
  }));
  await page.evaluate(() => document.querySelector('[data-lp3-note-undo]').click());
  await page.waitForTimeout(200);
  const undoState = await page.evaluate(() => JSON.parse(localStorage.getItem('cn_learn_notes')).length);
  ok('P6.3 удаление + undo-тост (без confirm) возвращает заметку',
    delState.n === 0 && delState.undoBar && undoState === 1, JSON.stringify({ delState, undoState }));

  // Markdown-экспорт
  const md = await page.evaluate(() => LearnPlayer.exportNotesMarkdown());
  const mdOk = /^# Конспект — КриптоНавигатор\n/.test(md) && /## /.test(md) && /> «/.test(md) && /— Перечитать/.test(md) && /\n\n/.test(md);
  ok('P6.4 «Скопировать всё» — валидный markdown', mdOk, JSON.stringify(md.slice(0, 140)));

  // Исключения: выделение в pre/code не даёт кнопки (открываем шаг с level4 напрямую)
  const preCheck = await page.evaluate(async () => {
    const l = LESSONS.find(x => (x.blocks || []).some(b => b.level4));
    const steps = LearnPlayer._buildStepsFor(l.id);
    let idx = -1;
    steps.forEach((s, i) => { if(s.payload && s.payload.level4) idx = i; });
    if(idx < 0) return { fab: null, noLevel4: true, lesson: l.id };
    LearnPlayer.open(l.id, idx);
    await new Promise(r => setTimeout(r, 450));
    // level4 по умолчанию свёрнут в таб уровней — переключаем на l4 (кнопка плеера)
    if (!document.querySelector('.learn-step pre')) {
      const b4 = Array.from(document.querySelectorAll('.learn-step button')).find(b => /Уровень 4/.test(b.textContent));
      if (b4) { b4.click(); await new Promise(r => setTimeout(r, 250)); }
    }
    const pre = document.querySelector('.learn-step pre');
    if(!pre) return { fab: null, noPre: true, lesson: l.id };
    const node = pre.querySelector('code') || pre;
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    return { fab: !!document.getElementById('lp3_note_fab'), lesson: l.id, idx };
  });
  ok('P6 исключение: pre/code — кнопки нет', preCheck.fab === false, JSON.stringify(preCheck));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // ==== Адаптивная рекомендация: 3 неверных попытки → финал → CTA ====
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      if (st && st.querySelector('[id^="lquiz_opts_"]')) return;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) return; nb.click(); await new Promise(r => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(200);
  const wrong3 = await page.evaluate(async () => {
    const lid = 'p0_l1';
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const correct = btns.map(b => { const m = b.getAttribute('onclick').match(/,\s*(\d+)\)\s*$/); return m ? +m[1] : -1; });
    const correctIdx = correct[0]; // onclick[i] = (lid, i, correctIdx) → correct у всех одинаков
    const wrongBtns = btns.filter((b, i) => i !== correctIdx);
    let attempts = 0;
    for (let k = 0; k < 3; k++) { wrongBtns[k % wrongBtns.length].click(); attempts++; await new Promise(r => setTimeout(r, 80)); }
    const retry = document.getElementById('lp_retry_' + lid);
    return { attempts, counter: retry ? retry.innerText.match(/Попытка (\d+)/) : null, correctIdx };
  });
  ok('Рекомендация: 3 неверных попытки зарегистрированы', wrong3.attempts === 3 && wrong3.counter && +wrong3.counter[1] === 3,
    JSON.stringify(wrong3));
  // верный ответ → завершить → финал с рекомендацией
  await page.evaluate(async () => {
    const lid = 'p0_l1';
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const m = btns[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
    btns[+m[1]].click(); // index == correctIdx
  });
  await page.waitForTimeout(200);
  const advFinale = await page.evaluate(async () => {
    LearnPlayer.completeLessonOnce();
    await new Promise(r => setTimeout(r, 350));
    const t = document.querySelector('.learn-step').innerText;
    const btn = Array.from(document.querySelectorAll('.learn-step button')).find(b => /адаптивную тренировку/i.test(b.textContent));
    return { has: /адаптивную тренировку по этой теме/i.test(t), attempts3: /3 неверных попыток/.test(t), hasBtn: !!btn };
  });
  ok('Рекомендация: финал предлагает «🔄 Пройти адаптивную тренировку по этой теме»',
    advFinale.has && advFinale.attempts3 && advFinale.hasBtn, JSON.stringify(advFinale));

  // Клик CTA → плеер закрыт, вкладка quiz открыта, адаптивная сессия запущена
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.learn-step button')).find(b => /адаптивную тренировку/i.test(b.textContent));
    btn.click();
  });
  await page.waitForTimeout(600);
  // prepost-модалка (входной опрос): отвечаем на 3 вопроса и запускаем сессию
  // (существующая семантика «Пропустить» — отмена запуска, поэтому опрос проходим)
  const advRun = await page.evaluate(async () => {
    const pre = document.getElementById('prepost_modal');
    if (pre) {
      for (let qi = 0; qi < 3; qi++) {
        const opts = Array.from(pre.querySelectorAll('#prepost_opts_' + qi + ' button'));
        if (!opts.length) continue;
        const m = opts[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
        opts[m ? +m[1] : 0].click();
        await new Promise(r => setTimeout(r, 80));
      }
      const next = pre.querySelector('#prepost_next');
      if (next && next.style.display !== 'none') { next.click(); await new Promise(r => setTimeout(r, 400)); }
    }
    const quizTab = document.getElementById('quiz');
    return {
      playerGone: !document.querySelector('.learn-root'),
      homeGone: !document.querySelector('.learn-home-root'),
      quizVisible: quizTab && getComputedStyle(quizTab).display !== 'none',
      isAdaptive: typeof quiz !== 'undefined' && quiz.isAdaptive === true,
      qTotal: typeof quiz !== 'undefined' ? quiz.total : null
    };
  });
  ok('§11.9/рекомендация: CTA запускает СУЩЕСТВУЮЩИЙ адаптивный контур (банк не тронут)',
    advRun.playerGone && advRun.quizVisible && advRun.isAdaptive && advRun.qTotal > 0, JSON.stringify(advRun));
  await page.evaluate(() => { try { go('home'); } catch (e) { } });

  // ==== A11y: Tab-ловушка в хабе ====
  await page.evaluate(() => { const b = document.getElementById('lp_header_btn'); b.focus(); b.click(); });
  await page.waitForTimeout(300);
  const trap = await page.evaluate(async () => {
    const inside = () => !!document.activeElement.closest('.learn-home-root');
    // фокус уже внутри; Tab×15 — фокус не выходит
    for (let i = 0; i < 15; i++) {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      // реальный Tab:
    }
    return null;
  });
  // Tab-ловушка реальными нажатиями
  for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
  const trapRes = await page.evaluate(() => ({
    inside: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.learn-home-root')),
    tag: document.activeElement ? document.activeElement.tagName : null
  }));
  ok('§12.10.7 Tab зациклен в хабе', trapRes.inside, JSON.stringify(trapRes));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ==== §7.2: стейт-заморозка — изменились только cn_learn_* (+штатные записи сценария) ====
  const lsAfter = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const changed = Object.keys(lsAfter).filter(k => lsAfter[k] !== lsBefore[k]);
  const added = Object.keys(lsAfter).filter(k => !(k in lsBefore));
  const removed = Object.keys(lsBefore).filter(k => !(k in lsAfter));
  const allowed = (k) => /^cn_learn_(recent|notes|syllabus|pos|test|font|theme|bookmarks|pomo|level|practice_done|checks_done|widget_tried|fc)$/.test(k) ||
    // штатные записи приложения от завершения урока/адаптивной сессии (разрешены §7.2 плана)
    ['cn_lessons','cn_lesson_checks','cn_user_xp','cn_fund_aum','cn_daily_quests','cn_shuffle_salt','cn_quiz_mistakes','cn_beginner_cat_err','cn_math_tests','cn_consol_streak','cn_topic_stats','cn_srs_state','cn_phase_tests'].indexOf(k) >= 0;
  const bad = changed.concat(added, removed).filter(k => !allowed(k));
  ok('§7.2 изменились только cn_learn_* и штатные записи приложения (чужих записей нет)', bad.length === 0,
    'нестандарт. ключи: ' + changed.concat(added).filter(k => !/^cn_learn_/.test(k)).slice(0, 10).join(',') + (bad.length ? ' | ЧУЖИЕ: ' + bad.join(',') : ''));

  const inherited = (m) => /ERR_FILE_NOT_FOUND/i.test(m);
  ok('КОНСОЛЬ чистая (без унаследованных файловых ERR)',
    errors.length === 0 && cerr.filter(m => !inherited(m)).length === 0,
    (errors.length ? 'page: ' + errors[0] : '') + (cerr.filter(m => !inherited(m)).length ? ' console: ' + cerr.filter(m => !inherited(m))[0] : ' + ' + cerr.filter(inherited).length + ' унаслед. asset-ERR'));

  console.log(R.join('\n'));
  await browser.close();
  const fails = R.filter(x => x.startsWith('FAIL')).length;
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('C_FAIL', e); console.log(R.join('\n')); process.exit(1); });
