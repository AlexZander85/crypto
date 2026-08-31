// ===== Этап 5, проба №5: блоки уроков + входы/перерисовки для value/innerText null =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const LESSONS = ['p0_l6', 'p1_l1', 'p1_l2', 'p3_l5', 'p3_l6', 'p6_l2', 'm_cpt_centralnaya_predelnaya_teorema', 'm_regressiya_k_srednemu'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  let log = [];
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const loc = m.location();
    log.push((m.type() === 'pageerror' ? '[pageerror]' : '[error]') + (loc ? '@' + loc.lineNumber : '') + ' ' + (m.text() || '').slice(0, 160));
  });
  page.on('pageerror', e => log.push('[pageerror] ' + (String(e && e.message || e)).slice(0, 160) + ' @' + (String(e && e.stack || '').match(/index_v12[^)]*:(\d+:\d+)\)?/) || ['', '?'])[1]));

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  const blocks = await page.evaluate(ids => {
    const out = {};
    ids.forEach(id => {
      const l = LESSONS.find(x => x.id === id);
      out[id] = l && l.blocks ? l.blocks.map(b => (b.type || '?') + ':' + (b.id || '')) : null;
    });
    return out;
  }, LESSONS);
  console.log('=== блоки уроков ===');
  Object.keys(blocks).forEach(k => console.log(k + ': ' + JSON.stringify(blocks[k])));

  console.log('=== пробы перерисовок ===');
  for (const id of LESSONS) {
    log = [];
    await page.evaluate(lid => { try { window.openFullscreenLesson(lid); } catch (e) {} }, id);
    await page.waitForTimeout(450);
    const acts = await page.evaluate(async (lid) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const modal = document.getElementById('lessonFullscreenReaderModal');
      if (!modal) return ['no-modal'];
      const done = [];
      // 1) все level-табы (перерисовка)
      const tabs = Array.from(modal.querySelectorAll('[onclick*="setLessonLevelTab"]'));
      for (const t of tabs) { t.click(); await sleep(60); }
      if (tabs.length) done.push('tabs:' + tabs.length);
      // 2) перерисовка через skipPretest (если претест есть)
      try { if (document.getElementById('pretest_box_' + lid)) { skipPretest(lid); await sleep(120); done.push('skipPretest'); } } catch (e) { done.push('sp-ERR'); }
      // 3) range-инпуты: fire input (перерисовки виджетов)
      const ranges = Array.from(modal.querySelectorAll('input[type="range"]'));
      ranges.forEach(r => { try { r.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {} });
      if (ranges.length) done.push('ranges:' + ranges.length);
      await sleep(150);
      // 4) все кнопки виджетов ещё раз (после перерисовок)
      const btns = Array.from(modal.querySelectorAll('button')).filter(b => !/navLesson|skipPretest|closeFullscreen|setLessonLevelTab/.test(b.getAttribute('onclick') || ''));
      btns.forEach(b => { try { b.click(); } catch (e) {} });
      done.push('btns:' + btns.length);
      await sleep(200);
      // 5) navLesson туда-обратно (перерисовка другим уроком)
      try { navLesson(1); await sleep(160); openFullscreenLesson(lid); await sleep(160); done.push('nav'); } catch (e) { done.push('nav-ERR'); }
      return done;
    }, id);
    const errs = log.filter(x => /pageerror|\[error\]/.test(x) && !/ERR_FILE_NOT_FOUND/.test(x));
    console.log('--- ' + id + ' [' + acts.join(',') + '] ошибок: ' + errs.length);
    [...new Set(errs)].slice(0, 6).forEach(e => console.log('    ' + e));
    await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
    await page.waitForTimeout(250);
  }
  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
