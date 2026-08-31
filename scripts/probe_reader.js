// ===== Этап 5, проба: репродукция ридер-находок №1 (dash ×2), №6/№7 (консоль), SVG cy:NaN =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';

const DASH_LESSONS = ['p1_l10', 'p3_l1', 'p3_l4', 'p3_l6'];
const ERR_LESSONS = ['p0_l6', 'p1_l1', 'p1_l2', 'p3_l5', 'p3_l6', 'p6_l2',
  'm_cpt_centralnaya_predelnaya_teorema', 'm_regressiya_k_srednemu', 'm_regressiya_na_palcah'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  let log = [];
  page.on('console', m => {
    const loc = m.location();
    log.push({ t: m.type(), txt: (m.text() || '').slice(0, 300), line: loc ? loc.lineNumber : null });
  });
  page.on('pageerror', e => {
    const st = e && e.stack ? String(e.stack).split('\n').filter(l => /index_v12|<anonymous>/.test(l)).slice(0, 3).join(' ~ ') : '';
    log.push({ t: 'pageerror', txt: (String(e && e.message || e)).slice(0, 300), stack: st.slice(0, 400) });
  });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  // ==== №1: контейнеры risk_dash в старом ридере ====
  console.log('=== №1 interactive_risk_dash в ридере ===');
  for (const id of DASH_LESSONS) {
    log = [];
    await page.evaluate(lid => { try { window.openFullscreenLesson(lid); } catch (e) {} }, id);
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[id^="rd_"]'));
      const byId = {};
      all.forEach(el => { byId[el.id] = (byId[el.id] || 0) + 1; });
      const filled = all.map(el => ({ id: el.id, children: el.children.length }));
      const modal = document.getElementById('lessonFullscreenReaderModal');
      return { containers: all.length, byId, filled, modalOpen: !!modal && getComputedStyle(modal).display !== 'none' };
    });
    console.log(id, JSON.stringify(info));
    await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
    await page.waitForTimeout(250);
  }

  // ==== №6/№7: консоль-ошибки по урокам ====
  console.log('=== №7 консоль старого режима (по урокам) ===');
  for (const id of ERR_LESSONS) {
    log = [];
    const inCatalog = await page.evaluate(lid => !!(window.LESSONS || []).find(x => x.id === lid), id);
    await page.evaluate(lid => { try { window.openFullscreenLesson(lid); } catch (e) {} }, id);
    await page.waitForTimeout(700);
    const errs = log.filter(x => x.t === 'error' || x.t === 'warning' || x.t === 'pageerror');
    console.log('--- ' + id + ' (в каталоге: ' + inCatalog + ') — событий: ' + errs.length);
    errs.slice(0, 6).forEach(e => console.log('   [' + e.t + ']' + (e.line ? '@' + e.line : '') + ' ' + e.txt + (e.stack ? ' || ' + e.stack : '')));
    await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
    await page.waitForTimeout(250);
  }

  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
