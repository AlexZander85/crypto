// ===== Этап 7, регрессия: старый ридер, Этапы 1–6 не сломаны, споты Э7, скриншоты =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.9.html';
const SHOT_DIR = '/home/z/my-project/download/скриншоты_этап7';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push((e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' ~ ') : String(e && e.message || e))));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });

  await page.goto('file://' + path.resolve(HTML) + '?mockai=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => { localStorage.setItem('cn_tier_override', 'max'); sessionStorage.removeItem('mentor_upsell_closed'); });

  // ==== 1) Старый режим: карточка → ридер, закрытие (+ dash один раз) ====
  await page.evaluate(() => { try { window.openFullscreenLesson('p3_l6'); } catch (e) {} });
  await page.waitForTimeout(500);
  const reader1 = await page.evaluate(() => {
    const m = document.getElementById('lessonFullscreenReaderModal');
    const dash = document.querySelectorAll('#rd_p3_l6').length;
    return { open: !!m && getComputedStyle(m).display !== 'none', dash };
  });
  ok('1. Старый ридер открывается; dash в контенте ровно один (№1)', reader1.open && reader1.dash === 1, JSON.stringify(reader1));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_reader_dash.png') });
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 2) Этап 1: плеер, шаги, гейт ====
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p1_l1'); });
  await page.waitForTimeout(400);
  const e1 = await page.evaluate(() => {
    const lbl = document.querySelector('.learn-progress-label');
    const nb = document.querySelector('[data-lp-nav="next"]');
    if (nb) nb.click();
    return { steps: lbl ? lbl.textContent : null, root: !!document.querySelector('.learn-root') };
  });
  ok('2. Этап 1: плеер открывается, навигация работает', e1.root && /Шаг \d+ из/.test(e1.steps || ''), JSON.stringify(e1));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 3) Этап 2: тест фазы в плеере ====
  await page.evaluate(() => { LearnPlayer.openTest('p1'); });
  await page.waitForTimeout(450);
  const e2 = await page.evaluate(() => {
    const st = document.querySelector('.learn-step');
    const opts = document.querySelectorAll('[data-lp-q] .ans, .learn-step button').length;
    return { header: (document.querySelector('.learn-progress-label') || {}).textContent || '', opts: opts > 0, has: !!st };
  });
  ok('3. Этап 2: тестовый режим (порции) жив', e2.has && e2.opts, JSON.stringify(e2));
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 4) Этап 3: хаб (+ «Недавние тесты» Э5) ====
  await page.evaluate(() => { LearnPlayer.openHome(); });
  await page.waitForTimeout(450);
  const e3 = await page.evaluate(() => {
    const hub = document.querySelector('.learn-home-root');
    const secs = hub ? hub.querySelectorAll('button, input').length : 0;
    const rt = document.getElementById('lp5_recent_tests');
    return { hub: !!hub, controls: secs, recentTests: !!rt };
  });
  ok('4. Этап 3: хаб открывается; секции Этапов 5–6 в хабе', e3.hub && e3.controls > 5 && e3.recentTests && true, JSON.stringify(e3));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_home.png') });
  await page.evaluate(() => { try { window.LearnPlayer.closeHome(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 5) Этап 4: финал с рекомендацией (паритет Этапа 4) ====
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l3');
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      if (st && st.querySelector('[id^="lquiz_opts_"]')) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break; nb.click(); await new Promise(r => setTimeout(r, 60));
    }
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_p0_l3 button'));
    const idxs = btns.map(b => { const m = b.getAttribute('onclick').match(/,\s*(\d+)\)\s*$/); return m ? +m[1] : -1; });
    const wrong = btns.filter((b, i) => i !== idxs[0]);
    for (let k = 0; k < 3; k++) { wrong[k % wrong.length].click(); await new Promise(r => setTimeout(r, 90)); }
    btns[+idxs[0]].click(); await new Promise(r => setTimeout(r, 120));
    LearnPlayer.completeLessonOnce(); await new Promise(r => setTimeout(r, 400));
  });
  const fin = await page.evaluate(() => !!document.getElementById('lp4_rec_card'));
  ok('5. Этап 4: финал p0_l3 содержит карточку рекомендации урока', fin);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_finale_card.png') });
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 6) Этап 5: карточка рекомендации на результате теста ====
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_test');
    LearnPlayer.openTest('p3');
    await new Promise(r => setTimeout(r, 400));
    const view = window._ptView[3];
    for (let qi = 0; qi < view.length; qi++) {
      const port = Math.floor(qi / 5);
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec((document.querySelector('.learn-progress-label') || {}).textContent || '');
        if (m && parseInt(m[1], 10) === port + 1) break;
        const nb = document.querySelector('[data-lp2-nav="next"]');
        if (!nb || nb.disabled) break;
        nb.click(); await new Promise(r => setTimeout(r, 45));
      }
      const cont = document.querySelector('[data-lp2-q="' + qi + '"]');
      const inp = cont && cont.querySelector('input[id^="pnum_in_"], input[type="text"]');
      const btns = cont ? Array.from(cont.querySelectorAll('button.ans')) : [];
      if (inp) {
        inp.value = qi < 4 ? '999999' : String(view[qi].answer);
        const bb = cont.querySelector('button.btn'); if (bb) bb.click();
      } else if (btns.length) {
        btns[qi < 4 ? (view[qi].a + 1) % btns.length : view[qi].a].click();
      }
      await new Promise(r => setTimeout(r, 30));
    }
    for (let k = 0; k < 15; k++) {
      const nb = document.querySelector('[data-lp2-nav="next"]');
      if (!nb || nb.disabled) break;
      nb.click(); await new Promise(r => setTimeout(r, 45));
    }
    const sb = document.querySelector('[data-lp2-submit]');
    if (sb) { sb.click(); await new Promise(r => setTimeout(r, 400)); }
  });
  const t5 = await page.evaluate(() => ({
    card: !!document.getElementById('lp5_test_rec'),
    txt: ((document.getElementById('lp5_test_rec') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 90)
  }));
  ok('6. Этап 5: p3 (4 неверных) → карточка «Тест дался непрочно» на результате', t5.card, t5.txt);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_test_rec.png') });
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 7) Этап 6: практикум оверлеем внутри плеера ====
  const e6 = await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l3');
    await new Promise(r => setTimeout(r, 400));
    let cta = null;
    for (let i = 0; i < 30 && !cta; i++) {
      cta = Array.from(document.querySelectorAll('.learn-content button')).find(b => /_goSim/.test(b.getAttribute('onclick') || ''));
      if (cta) break;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb) break;
      nb.click(); await new Promise(r => setTimeout(r, 55));
    }
    if (!cta) return { noCta: true };
    cta.click();
    await new Promise(r => setTimeout(r, 400));
    const root = document.querySelector('.learn-root');
    const ov = root.querySelector('.learn-overlay[data-ov="lp6sim"]');
    const box = document.getElementById('sim_firsttrade');
    const res = { overlay: !!ov, boxInsideRoot: !!box && !!root.contains(box), boxUnique: document.querySelectorAll('#sim_firsttrade').length };
    const cb = document.querySelector('[data-lp6-sim-close]');
    if (cb) cb.click();
    await new Promise(r => setTimeout(r, 250));
    res.restored = !!document.getElementById('sim_firsttrade') && !document.querySelector('.learn-root').contains(document.getElementById('sim_firsttrade'));
    LearnPlayer.close();
    return res;
  });
  ok('7. Этап 6: практикум — оверлей внутри плеера, узел возвращён после закрытия',
    e6.overlay && e6.boxInsideRoot && e6.boxUnique === 1 && e6.restored, JSON.stringify(e6));

  // ==== 8) Этап 7: карточка тест-контекста в панели наставника (скриншот) ====
  await page.evaluate(async () => {
    LearnPlayer.openTest('p2');
    await new Promise(r => setTimeout(r, 350));
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 250));
  });
  const e7a = await page.evaluate(() => {
    const body = document.getElementById('mentor_panel_body');
    const card = document.getElementById('lp7_mentor_test');
    return {
      header: body ? body.firstElementChild.textContent.trim().slice(0, 24) : null,
      cardText: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 140) : null
    };
  });
  ok('8. Этап 7: тест-режим → панель «Урок: p2» + карточка «Наставник видит тест»',
    e7a.header === 'Урок: p2' && /Аттестация фазы 2/.test(e7a.cardText) && /Порция/.test(e7a.cardText), JSON.stringify(e7a));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_mentor_test_ctx.png') });
  await page.evaluate(() => { try { mentorClosePanel(); } catch (e) {} try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 9) Этап 7: Фейнман из панели — связанное поле + вердикт (скриншот) ====
  await page.evaluate(async () => {
    localStorage.removeItem('cn_learn_pos');
    LearnPlayer.open('p0_l1');
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('.learn-root [data-lp-act="mentor"]').click();
    await new Promise(r => setTimeout(r, 250));
    const act = Array.from(document.querySelectorAll('#mentor_actions button')).find(b => /Проверка Фейнмана/.test(b.textContent));
    act.click(); await new Promise(r => setTimeout(r, 350));
    document.getElementById('lp7_feynman_in').value = 'Криптовалюта — это цифровые деньги в общей тетради (блокчейне), где переводы проверяет сеть, а не банк.';
    Array.from(document.querySelectorAll('#lp7_mentor_feynman button')).find(b => /Проверить/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 650));
  });
  const e7b = await page.evaluate(() => ({
    feynmanStep: /Метод Фейнмана/i.test((document.querySelector('.learn-step-title') || {}).textContent || ''),
    verdict: /ПОНЯЛ|ЧАСТИЧНО|ПРОПУЩЕНО/.test((document.getElementById('mentor_result') || {}).innerText || '')
  }));
  ok('9. Этап 7: «Проверка Фейнмана» из панели — переход на шаг, вердикт в панели', e7b.feynmanStep && e7b.verdict, JSON.stringify(e7b));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_feynman_panel.png') });
  await page.evaluate(() => { try { mentorClosePanel(); } catch (e) {} try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 10) Этап 7: тост на заблокированном гейте (ридер, скриншот) ====
  await page.evaluate(async () => {
    const target = ['p0_l1', 'p0_l2', 'p0_l4', 'p0_l6', 'p0_l7'].find(id => LESSONS.find(l => l.id === id) && LESSONS.find(l => l.id === id).quiz && !lessonsDone[id]);
    if (target) { openFullscreenLesson(target); await new Promise(r => setTimeout(r, 350)); }
    const b = document.getElementById('lesson_complete_btn_' + target);
    if (b) { b.click(); await new Promise(r => setTimeout(r, 300)); }
  });
  const e7c = await page.evaluate(() => ({
    toast: Array.from(document.querySelectorAll('.app-toast')).some(t => /Сначала сдайте квиз/.test(t.innerText))
  }));
  ok('10. Этап 7: тап по заблокированной кнопке завершения → тост «Сначала сдайте квиз»', e7c.toast, JSON.stringify(e7c));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot7_gate_toast.png') });
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 11) Смоки V10.smoke (lp1..lp7) ====
  const sm = await page.evaluate(() => {
    const all = (window.V10 && V10.smoke && V10.smoke.checks) || [];
    return { total: all.length, fails: all.filter(c => !c.ok).map(c => c.name), allOk: all.every(c => c.ok) };
  });
  ok('11. V10.smoke ' + sm.total + ' проверок без FAIL (включая lp7:*)', sm.allOk, JSON.stringify({ fails: sm.fails }));

  // ==== 12) Прогон 20 уроков плеером + консоль ====
  const autorun = await page.evaluate(async () => {
    const ids = ['p0_l1','p0_l2','p0_l4','p0_l6','p1_l1','p1_l2','p1_l10','p2_l1','p3_l5','p3_l6','p4_l1','p4_l8','p5_l1','p6_l1','p6_l2','ps_l1','ps_l2','ps_l20','ft01','ft07'];
    let opened = 0, failed = [];
    for (const id of ids) {
      try {
        localStorage.removeItem('cn_learn_pos');
        LearnPlayer.open(id);
        await new Promise(r => setTimeout(r, 160));
        const nb = document.querySelector('[data-lp-nav="next"]');
        if (nb) { nb.click(); await new Promise(r => setTimeout(r, 90)); }
        if (!document.querySelector('.learn-root')) failed.push(id + ':noroot');
        else { opened++; await new Promise(r => setTimeout(r, 130)); try { LearnPlayer.close(); } catch (e) {} await new Promise(r => setTimeout(r, 60)); }
      } catch (e) { failed.push(id + ':' + e.message); }
    }
    return { opened, failed };
  });
  ok('12. Автопрогон 20 уроков плеером (включая проблемные p0_l6/p1_l1/p3_l5/p6_l2, ps_*, ft*)',
    autorun.opened === 20 && autorun.failed.length === 0, JSON.stringify(autorun));

  const inheritedPage = t => /reading 'scrollHeight'/.test(t);
  const cerrReal = cerr.filter(t => !/ERR_FILE_NOT_FOUND/.test(t));
  const newPageErrors = errors.filter(t => !inheritedPage(t));
  ok('13. Консоль: 0 новых pageerror/console.error (унаследованные допущены: ERR_FILE_NOT_FOUND; scrollHeight@renderStep — гонка rAF/close Этапа 1)',
    newPageErrors.length === 0 && cerrReal.length === 0,
    'newPage=[' + newPageErrors.slice(0, 3).join(' | ') + '] console=[' + cerrReal.slice(0, 3).join(' | ') + ']');

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'REGRESSION_7: PASS (' + R.length + ' OK)' : 'REGRESSION_7: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
