// ===== Этап 4, регрессия: старый ридер, Этапы 1–3 не сломаны, смоки lp4:*, скриншоты =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const SHOT_DIR = '/home/z/my-project/download/скриншоты_этап4';
const R = []; const ok = (n, c, note) => R.push((c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + note : ''));

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], cerr = [];
  page.on('pageerror', e => errors.push((e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' ~ ') : String(e && e.message || e))));
  page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // ==== 1) Старый режим: карточка → ридер, закрытие ====
  await page.evaluate(() => { try { window.openFullscreenLesson('p0_l1'); } catch (e) {} });
  await page.waitForTimeout(500);
  const reader1 = await page.evaluate(() => {
    const m = document.getElementById('lessonFullscreenReaderModal');
    return { open: !!m && getComputedStyle(m).display !== 'none', text: m ? m.innerText.slice(0, 60).replace(/\n/g, ' ') : null };
  });
  ok('1. Старый ридер открывается на карточке', reader1.open, JSON.stringify(reader1));
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

  // ==== 4) Этап 3: хаб, поиск, программа ====
  await page.evaluate(() => { LearnPlayer.openHome(); });
  await page.waitForTimeout(450);
  const e3 = await page.evaluate(() => {
    const hub = document.querySelector('.learn-home-root');
    const secs = hub ? hub.querySelectorAll('button, input').length : 0;
    return { hub: !!hub, controls: secs };
  });
  ok('4. Этап 3: хаб «Моё обучение» открывается', e3.hub && e3.controls > 5, JSON.stringify(e3));
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot4_home.png') });
  await page.evaluate(() => { try { window.LearnPlayer.closeHome(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== 5) Этап 4: финал с рекомендацией (скриншот) ====
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
  ok('5. Финал p0_l3 содержит карточку рекомендации', fin);
  await page.screenshot({ path: path.join(SHOT_DIR, 'shot4_finale_card.png') });
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });

  // ==== 6) Смоки lp4:* в V10.smoke ====
  const sm = await page.evaluate(() => {
    const all = (window.V10 && V10.smoke && V10.smoke.checks) || [];
    const lp4 = all.filter(c => /^lp4:/.test(c.name));
    return { total: all.length, lp4: lp4.map(c => c.name + '=' + (c.ok ? 'ok' : 'FAIL')), allOk: all.every(c => c.ok) };
  });
  ok('6. V10.smoke: lp4:* зелёные, весь смок без FAIL', sm.lp4.length >= 4 && sm.allOk, JSON.stringify(sm));

  // ==== 7) Прогон 20 уроков: открытие → 2 перехода → закрытие, консоль ====
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
  ok('7. Автопрогон 20 уроков (включая проблемные p0_l6/p1_l1/p3_l5/p6_l2, психологию ps_* и лабы ft*)',
    autorun.opened === 20 && autorun.failed.length === 0, JSON.stringify(autorun));
  /* Примечание: жёсткий open/close без пауз на НЕСУЩЕСТВУЮЩИХ id (p7_l1/p8_l1/p9_l1 —
     их нет в каталоге) даёт спорадическую pageerror «scrollHeight» — гонка rAF/close
     в коде Этапа 1. Воспроизводится тем же автопрогоном и на v12.5 (3/3 прогона) —
     унаследовано, к Этапу 4 отношения не имеет. */

  // Унаследованная гонка Этапа 1: rAF в renderStep (строка без guard if(!contentEl)) срабатывает
  // после closePlayer. Воспроизводится спорадически и на v12.5 тем же сценарием (см. отчёт) —
  // код Этапа 1 править запрещено (дифф-контракт), допускаем по образцу ERR_FILE_NOT_FOUND.
  const inheritedPage = t => /reading 'scrollHeight'/.test(t);
  const cerrReal = cerr.filter(t => !/ERR_FILE_NOT_FOUND/.test(t));
  const newPageErrors = errors.filter(t => !inheritedPage(t));
  ok('8. Консоль: 0 новых pageerror/console.error (унаследованные допущены: ERR_FILE_NOT_FOUND — отсутствующие assets; scrollHeight@renderStep — гонка rAF/close Этапа 1, воспроизводится и на v12.5)',
    newPageErrors.length === 0 && cerrReal.length === 0,
    'newPage=[' + newPageErrors.slice(0, 3).join(' | ') + '] console=[' + cerrReal.slice(0, 3).join(' | ') + ']');

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(fails === 0 ? 'REGRESSION_4: PASS (' + R.length + ' OK)' : 'REGRESSION_4: ' + fails + ' FAIL');
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e); console.log(R.join('\n')); process.exit(2); });
