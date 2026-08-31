// ===== Этап 5, приёмка A: недавние тесты, накопитель на банки, экспорт конспекта, _ptStart =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.7.html';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 400) : ''));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errs.push('[c] ' + (m.text() || '').slice(0, 160)); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // ==== 1) «Недавние тесты»: пустое состояние ====
  let hub = await page.evaluate(() => {
    LearnPlayer.openHome();
    const s = document.getElementById('lp5_recent_tests');
    return { has: !!s, empty: s ? /Пока пусто/.test(s.innerText) : false, beforeTests: s ? !!s.previousElementSibling : false };
  });
  ok('1. Хаб: секция «🕘 Недавние тесты» с пустым состоянием', hub.has && hub.empty, JSON.stringify(hub));

  // ==== 2) Открытие теста → карточка в секции; порядок LRU ====
  await page.evaluate(() => { LearnPlayer.closeHome(); LearnPlayer.openTest('p1'); });
  await page.waitForTimeout(450);
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);
  await page.evaluate(() => { LearnPlayer.openTest('math_core'); });
  await page.waitForTimeout(450);
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);
  hub = await page.evaluate(() => {
    LearnPlayer.openHome();
    const s = document.getElementById('lp5_recent_tests');
    const cards = s ? Array.from(s.querySelectorAll('[data-lp3-test]')).map(b => b.getAttribute('data-lp3-test')) : [];
    const firstTxt = s && s.querySelector('.lp3-card .t') ? s.querySelector('.lp3-card .t').textContent : null;
    return { cards, firstTxt };
  });
  ok('2. Недавние тесты: [math_core, p1] — свежий первым, карточки с состоянием bankMeta',
    JSON.stringify(hub.cards) === JSON.stringify(['math_core', 'p1']) && !!hub.firstTxt, JSON.stringify(hub));

  // ==== 3) Перезагрузка: недавние персистентны ====
  await page.reload(); await page.waitForTimeout(3200);
  hub = await page.evaluate(() => {
    LearnPlayer.openHome();
    const s = document.getElementById('lp5_recent_tests');
    return { cards: s ? Array.from(s.querySelectorAll('[data-lp3-test]')).map(b => b.getAttribute('data-lp3-test')) : [] };
  });
  ok('3. После reload порядок [math_core, p1] сохранился', JSON.stringify(hub.cards) === JSON.stringify(['math_core', 'p1']), JSON.stringify(hub));
  await page.evaluate(() => LearnPlayer.closeHome());

  // ==== Помощники ответов в тестовом режиме (переопределяются после каждого reload) ====
  const defineHelpers = () => page.evaluate(() => {
    window.__gotoPortion = async (target) => {
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec((document.querySelector('.learn-progress-label') || {}).textContent || '');
        const cur = m ? parseInt(m[1], 10) : 1;
        if (cur === target + 1) return true;
        const nb = document.querySelector('[data-lp2-nav="next"]');
        if (!nb || nb.disabled) return false;
        nb.click(); await new Promise(r => setTimeout(r, 45));
      }
      return false;
    };
    window.__answerOne = async (ph, qi, wrong) => {
      const view = (window._ptView || {})[ph];
      const q = view ? view[qi] : null;
      const cont = document.querySelector('[data-lp2-q="' + qi + '"]') || document.getElementById('ptest_' + ph + '_' + qi);
      if (!cont) return 'no-cont:' + qi;
      const inp = cont.querySelector('input[id^="pnum_in_"], input[type="text"]');
      if (inp) {
        inp.value = wrong ? String(((Number(q && q.answer) || 1) * 97 + 1.37)) : String(q && q.answer);
        const btn = cont.querySelector('button.btn');
        if (btn) btn.click();
        await new Promise(r => setTimeout(r, 30));
        return 'num';
      }
      const btns = Array.from(cont.querySelectorAll('button.ans'));
      if (!btns.length) return 'no-btns:' + qi;
      const idx = wrong ? (q.a + 1) % btns.length : q.a;
      btns[idx].click();
      await new Promise(r => setTimeout(r, 30));
      return 'opt';
    };
    window.__runAttempt = async (ph, wrongList) => {
      const view = (window._ptView || {})[ph];
      const n = view ? view.length : 0;
      if (!n) return 'no-view:' + ph;
      for (let qi = 0; qi < n; qi++) {
        await window.__gotoPortion(Math.floor(qi / 5));
        await window.__answerOne(ph, qi, wrongList.indexOf(qi) >= 0);
      }
      // к гейту
      for (let k = 0; k < 15; k++) {
        const nb = document.querySelector('[data-lp2-nav="next"]');
        if (!nb || nb.disabled) break;
        nb.click(); await new Promise(r => setTimeout(r, 45));
      }
      const sb = document.querySelector('[data-lp2-submit]');
      if (sb) { sb.click(); await new Promise(r => setTimeout(r, 300)); }
      return true;
    };
  });
  await defineHelpers();

  // ==== 4) Попытка 1 по p1: 2 неверных → total=2, карточки НЕТ (<3) ====
  await page.evaluate(() => { localStorage.removeItem('cn_learn_test'); LearnPlayer.openTest('p1'); });
  await page.waitForTimeout(450);
  await page.evaluate(async () => { await window.__runAttempt(1, [1, 7]); });
  let t1 = await page.evaluate(() => {
    const sc = (document.querySelector('.lp2-result-score') || {}).textContent || '';
    const m = /(\d+)\s*\/\s*(\d+)/.exec(sc) || [];
    return { info: LearnPlayer._mistInfo('p1'), card: !!document.getElementById('lp5_test_rec'), res: { c: +m[1] || 0, t: +m[2] || 0 } };
  });
  ok('4. p1 попытка 1 (2 неверных): накопитель=2, карточки ещё нет', t1.info.total === 2 && !t1.card && t1.res && t1.res.t === 12, JSON.stringify(t1));

  // ==== 5) Пересдача: +4 неверных → total=6, карточка «всего 6» ====
  await page.evaluate(async () => {
    const rt = document.querySelector('[data-lp2-retake]');
    if (rt) { rt.click(); await new Promise(r => setTimeout(r, 300)); }
    await window.__runAttempt(1, [0, 2, 4, 6]);
  });
  let t2 = await page.evaluate(() => ({
    info: LearnPlayer._mistInfo('p1'),
    card: (document.getElementById('lp5_test_rec') || {}).innerText || null
  }));
  ok('5. p1 попытка 2 (+4): total=6, карточка «4 неверных ответа … всего 6 с учётом прошлых попыток»',
    t2.info.total === 6 && !!t2.card && /4 неверных ответа/.test(t2.card || '') && /всего 6/.test(t2.card || ''), (t2.card || '').replace(/\s+/g, ' ').slice(0, 160));

  // ==== 6) «Не напоминать» в тестовом режиме: карточка исчезает, total=0 ====
  await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#lp5_test_rec button')).find(b => /Не напоминать/.test(b.textContent));
    if (btn) { btn.click(); await new Promise(r => setTimeout(r, 300)); }
  });
  let t3 = await page.evaluate(() => ({ info: LearnPlayer._mistInfo('p1'), gone: !document.getElementById('lp5_test_rec') }));
  ok('6. «Не напоминать»: total=0, карточка исчезла сразу', t3.info.total === 0 && t3.gone, JSON.stringify(t3));

  // ==== 7) Ещё 3 неверных → карточка → CTA с testId → адаптивный контур → сброс ====
  await page.evaluate(async () => {
    const rt = document.querySelector('[data-lp2-retake]');
    if (rt) { rt.click(); await new Promise(r => setTimeout(r, 300)); }
    await window.__runAttempt(1, [3, 5, 9]);
  });
  let t4 = await page.evaluate(() => ({ info: LearnPlayer._mistInfo('p1'), card: !!document.getElementById('lp5_test_rec') }));
  ok('7a. p1 попытка 3 (+3): total=3, карточка показана', t4.info.total === 3 && t4.card, JSON.stringify(t4));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#lp5_test_rec button')).find(b => /адаптивную тренировку/i.test(b.textContent));
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  const adv = await page.evaluate(async () => {
    const pre = document.getElementById('prepost_modal');
    if (pre) {
      for (let qi = 0; qi < 3; qi++) {
        const opts = Array.from(pre.querySelectorAll('#prepost_opts_' + qi + ' button'));
        if (!opts.length) continue;
        const m = opts[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
        if (m) { opts[+m[1]].click(); await new Promise(r => setTimeout(r, 80)); }
      }
      const next = pre.querySelector('#prepost_next');
      if (next && next.style.display !== 'none') { next.click(); await new Promise(r => setTimeout(r, 400)); }
    }
    return {
      playerGone: !document.querySelector('.learn-root'),
      quizVisible: typeof quiz !== 'undefined' && document.getElementById('quiz') && getComputedStyle(document.getElementById('quiz')).display !== 'none',
      isAdaptive: typeof quiz !== 'undefined' && quiz.isAdaptive === true,
      mistAfter: LearnPlayer._mistInfo('p1').total
    };
  });
  ok('7b. CTA → существующий адаптивный контур (quiz.isAdaptive), счётчик p1 сброшен',
    adv.playerGone && adv.quizVisible && adv.isAdaptive && adv.mistAfter === 0, JSON.stringify(adv));

  // ==== 8) Мат-банк: 4 неверных → карточка; «Не напоминать» ====
  await page.evaluate(async () => { try { go('home'); } catch (e) {} });
  await page.evaluate(() => { localStorage.removeItem('cn_learn_test'); LearnPlayer.openTest('math_core'); });
  await page.waitForTimeout(450);
  await page.evaluate(async () => {
    const ti = MATH_TESTS.findIndex(x => x.id === 'math_core');
    const t = MATH_TESTS[ti];
    const n = t.questions.length;
    for (let qi = 0; qi < n; qi++) {
      await window.__gotoPortion(Math.floor(qi / 5));
      const sh = shuffledOptions(t.questions[qi], qi * 17 + 3 + ti * 9);
      const mq = document.querySelector('[data-lp2-mq="' + qi + '"]');
      const btns = mq.querySelectorAll('button.ans');
      const idx = (qi < 4) ? (sh.a + 1) % btns.length : sh.a; // первые 4 неверно
      btns[idx].click();
      await new Promise(r => setTimeout(r, 35));
    }
    for (let k = 0; k < 15; k++) {
      const nb = document.querySelector('[data-lp2-nav="next"]');
      if (!nb || nb.disabled) break;
      nb.click(); await new Promise(r => setTimeout(r, 45));
    }
    const sb = document.querySelector('[data-lp2-submit]');
    if (sb) { sb.click(); await new Promise(r => setTimeout(r, 300)); }
  });
  let m1 = await page.evaluate(() => ({ info: LearnPlayer._mistInfo('math_core'), card: !!document.getElementById('lp5_test_rec') }));
  ok('8. math_core: 4 неверных → total=4, карточка на результате мат-теста', m1.info.total === 4 && m1.card, JSON.stringify(m1));
  await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#lp5_test_rec button')).find(b => /Не напоминать/.test(b.textContent));
    if (btn) { btn.click(); await new Promise(r => setTimeout(r, 250)); }
  });
  const m2 = await page.evaluate(() => LearnPlayer._mistInfo('math_core').total);
  ok('8b. math_core: «Не напоминать» → total=0', m2 === 0, 'total=' + m2);
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });

  // ==== 9) Экспорт конспекта: кнопка в панели + скачивание .md ====
  await page.evaluate(() => {
    localStorage.setItem('cn_learn_notes', JSON.stringify([
      { id: 'n1', lessonId: 'p0_l1', stepIdx: 0, quote: 'Криптовалюта — цифровые деньги на блокчейне', note: 'базовое определение', ts: Date.now() },
      { id: 'n2', lessonId: 'p1_l1', stepIdx: 1, quote: 'Маркетмейкер зарабатывает на спреде', note: '', ts: Date.now() - 1000 }
    ]));
  });
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(450);
  const dlPanel = await page.evaluate(() => {
    const tab = document.querySelector('[data-lp3-tab="notes"]');
    if (tab) tab.click();
    return new Promise(r => setTimeout(() => {
      const btn = document.querySelector('.learn-map [data-lp3-notes-dl]');
      r({ has: !!btn, txt: btn ? btn.textContent : null });
    }, 250));
  });
  ok('9a. Панель конспекта: кнопка «⬇ Скачать файлом (.md)» рядом с «Скопировать»', dlPanel.has && /Скачать/.test(dlPanel.txt || ''), JSON.stringify(dlPanel));
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.evaluate(() => { const b = document.querySelector('.learn-map [data-lp3-notes-dl]'); if (b) b.click(); })
  ]).catch(() => [null]);
  let dlOk = false, dlName = null, dlHead = null;
  if (download) {
    dlName = download.suggestedFilename();
    const p = await download.path();
    dlHead = fs.readFileSync(p, 'utf8');
    dlOk = /^kriptonavigator-konspekt-\d{4}-\d{2}-\d{2}\.md$/.test(dlName) &&
      /# Конспект — КриптоНавигатор/.test(dlHead) &&
      /Криптовалюта — цифровые деньги/.test(dlHead) &&
      /Маркетмейкер зарабатывает на спреде/.test(dlHead);
  }
  ok('9b. Скачивание: имя с датой, markdown содержит заголовок и обе заметки', dlOk,
    JSON.stringify({ name: dlName, head: (dlHead || '').slice(0, 120) }));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 10) _ptStart: resume после reload продолжает таймер; после сдачи — 0 ====
  await page.evaluate(() => { localStorage.removeItem('cn_learn_test'); LearnPlayer.openTest('p2'); });
  await page.waitForTimeout(450);
  const st0 = await page.evaluate(async () => {
    await window.__gotoPortion(0);
    await window.__answerOne(2, 0, false);
    await new Promise(r => setTimeout(r, 200));
    return { mem: window._ptStart[2], ls: JSON.parse(localStorage.getItem('cn_pt_start') || '{}')[2] };
  });
  ok('10a. Открытие p2 + 1 ответ: cn_pt_start[2] зафиксирован, совпадает с памятью',
    typeof st0.mem === 'number' && typeof st0.ls === 'number' && Math.abs(st0.mem - st0.ls) < 50, JSON.stringify(st0));
  await page.reload(); await page.waitForTimeout(3200);
  await defineHelpers();
  await page.evaluate(() => { LearnPlayer.openTest('p2'); });
  await page.waitForTimeout(500);
  const st1 = await page.evaluate(async () => {
    const dlg = document.querySelector('[data-lp2-resume="1"]');
    if (!dlg) return { noResume: true };
    dlg.click(); await new Promise(r => setTimeout(r, 350));
    return { resumed: window._ptStart[2], ls: JSON.parse(localStorage.getItem('cn_pt_start') || '{}')[2], now: Date.now() };
  });
  ok('10b. После reload: resume → таймер продолжается со сохранённого старта (не Date.now())',
    !!st1.resumed && st1.resumed === st0.ls && st1.resumed < st1.now - 5000, JSON.stringify(st1));
  await page.evaluate(async () => {
    // додать попытку p2 и сдать: cn_pt_start[2] должен обнулиться
    const view = window._ptView[2];
    for (let qi = 0; qi < view.length; qi++) {
      await window.__gotoPortion(Math.floor(qi / 5));
      await window.__answerOne(2, qi, false);
    }
    for (let k = 0; k < 15; k++) {
      const nb = document.querySelector('[data-lp2-nav="next"]');
      if (!nb || nb.disabled) break;
      nb.click(); await new Promise(r => setTimeout(r, 45));
    }
    const sb = document.querySelector('[data-lp2-submit]');
    if (sb) { sb.click(); await new Promise(r => setTimeout(r, 400)); }
  });
  const st2 = await page.evaluate(() => ({ ls2: JSON.parse(localStorage.getItem('cn_pt_start') || '{}')[2], info: LearnPlayer._mistInfo('p2').total }));
  ok('10c. Сдача p2: cn_pt_start[2]=0 (следующая попытка — с чистого старта)', st2.ls2 === 0, JSON.stringify(st2));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });

  // ==== 11) §7.2 + selfTest ====
  const ls = await page.evaluate(() => {
    const foreign = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/^(cn_| darken fantasies)/.test(k) && !/^(cn_)/.test(k) && k !== 'darken') foreign.push(k);
    }
    const cn = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^cn_/.test(k)) cn.push(k); }
    return { foreign, cn };
  });
  const selft = await page.evaluate(() => window.LearnPlayer.selfTest());
  ok('11. §7.2: только cn_* ключи; selfTest ok (lp3/lp4/lp5 зелёные)',
    ls.foreign.length === 0 && selft.ok && selft.lp3.ok && selft.lp4.ok && selft.lp5.ok,
    JSON.stringify({ foreign: ls.foreign, errs: selft.errors || [], lp5: selft.lp5 }));

  ok('12. Консоль: 0 pageerror / 0 console.error (кроме ERR_FILE_NOT_FOUND)',
    errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e)).length === 0, JSON.stringify(errs.slice(0, 4)));

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'ACCEPTANCE_5A: PASS (' + R.length + ' OK)' : 'ACCEPTANCE_5A: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
