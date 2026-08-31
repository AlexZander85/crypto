// ===== Этап 5, проба №4: брут-форс по всем кнопкам модала + m_cpt виджет =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const LESSONS = ['p0_l6', 'p1_l1', 'p1_l2', 'p3_l5', 'p3_l6', 'p6_l2', 'm_cpt_centralnaya_predelnaya_teorema'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  let log = [];
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const loc = m.location();
    log.push({ t: m.type(), txt: (m.text() || '').slice(0, 220), line: loc ? loc.lineNumber : null });
  });
  page.on('pageerror', e => {
    const st = e && e.stack ? String(e.stack).split('\n').filter(l => /index_v12|<anonymous>/.test(l)).slice(0, 2).join(' ~ ') : '';
    log.push({ t: 'pageerror', txt: (String(e && e.message || e)).slice(0, 220), stack: st.slice(0, 300) });
  });
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 60)); await d.dismiss(); });
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  for (const id of LESSONS) {
    console.log('--- ' + id);
    await page.evaluate(lid => { try { window.openFullscreenLesson(lid); } catch (e) {} }, id);
    await page.waitForTimeout(600);
    const clicked = await page.evaluate(async (lid) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const modal = document.getElementById('lessonFullscreenReaderModal');
      if (!modal) return ['no-modal'];
      const els = Array.from(modal.querySelectorAll('button, [onclick], input[type="range"]'));
      const done = [];
      let n = 0;
      for (const el of els) {
        if (n > 60) break;
        const oc = (el.getAttribute('onclick') || '') + ' ' + (el.id || '') + ' ' + (el.className || '');
        if (/navLesson|skipPretest|closeFullscreen/.test(oc)) continue; // навигация — отдельно
        try {
          el.click();
        } catch (e) { done.push('CLICK-ERR:' + e.message); }
        n++;
        await sleep(25);
      }
      // числовые инпуты: мусор + верный ответ
      try {
        const l = LESSONS.find(x => x.id === lid);
        const inp = document.getElementById('lnum_in_' + lid);
        if (inp && l && l.numericQuiz) {
          inp.value = '0'; handleLessonNumeric(lid); await sleep(40);
          inp.disabled = false; inp.value = String(l.numericQuiz.answer); handleLessonNumeric(lid); await sleep(40);
          done.push('numeric-ok');
        }
      } catch (e) { done.push('numeric-ERR:' + e.message); }
      // навигация туда-обратно
      try { navLesson(1); await sleep(120); window.openFullscreenLesson(lid); await sleep(120); done.push('nav'); } catch (e) { done.push('nav-ERR:' + e.message); }
      return done;
    }, id);
    const errs = log.filter(x => x.t === 'error' || x.t === 'pageerror');
    console.log('   кликов: ' + clicked.length + ' | ошибок: ' + errs.length + (errs.length ? ' | ' + JSON.stringify(errs.slice(0, 6)) : ''));
    log = [];
    await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
    await page.waitForTimeout(300);
  }
  console.log('диалоги: ' + JSON.stringify(dialogs.slice(0, 5)));
  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
