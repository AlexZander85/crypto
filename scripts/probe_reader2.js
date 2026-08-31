// ===== Этап 5, проба №2: родители дублей dash, интерактив старого ридера, NaN-круги =====
const { chromium } = require('playwright');
const path = require('path');
const HTML = process.argv[2] || '/home/z/my-project/download/index_v12.6.html';
const ERR_LESSONS = ['p0_l6', 'p1_l1', 'p1_l2', 'p3_l5', 'p3_l6', 'p6_l2'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
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

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3000);

  // ==== A) Где живут дубли rd_p1_l10 ====
  console.log('=== A) дубли risk_dash: родители ===');
  await page.evaluate(() => { try { window.openFullscreenLesson('p1_l10'); } catch (e) {} });
  await page.waitForTimeout(600);
  const chains = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#rd_p1_l10').forEach(el => {
      const seq = [];
      let n = el;
      for (let i = 0; i < 7 && n && n !== document.body; i++) {
        seq.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').slice(0, 2).join('.') : ''));
        n = n.parentElement;
      }
      out.push(seq.join(' < '));
    });
    return out;
  });
  chains.forEach((c, i) => console.log('  экземпляр ' + (i + 1) + ': ' + c));
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== C) NaN-круги: какой виджет ====
  console.log('=== C) SVG cy=NaN: контейнер ===');
  log = [];
  await page.evaluate(() => { try { window.openFullscreenLesson('m_regressiya_k_srednemu'); } catch (e) {} });
  await page.waitForTimeout(800);
  const nanInfo = await page.evaluate(() => {
    const bad = Array.from(document.querySelectorAll('circle')).filter(c => /NaN/.test(c.getAttribute('cy') || ''));
    const hosts = bad.map(c => { let n = c; for (let i = 0; i < 8 && n; i++) { if (n.id) return n.id; n = n.parentElement; } return '(no-id)'; });
    return { count: bad.length, hosts: [...new Set(hosts)] };
  });
  console.log('  NaN-circles:', JSON.stringify(nanInfo));
  log.filter(x => /NaN/.test(x.txt)).slice(0, 3).forEach(e => console.log('  [' + e.t + ']@' + e.line + ' ' + e.txt));
  await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
  await page.waitForTimeout(250);

  // ==== B) Полный интерактив старого ридера на проблемных уроках ====
  console.log('=== B) интерактив старого ридера ===');
  for (const id of ERR_LESSONS) {
    log = [];
    await page.evaluate(lid => { try { window.openFullscreenLesson(lid); } catch (e) {} }, id);
    await page.waitForTimeout(500);
    const step1 = await page.evaluate(async (lid) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const steps = [];
      // претест: все кнопки
      try {
        const pt = document.querySelectorAll('[id^="pretest_box_' + lid + '"] .ans');
        if (pt.length) { pt.forEach(b => b.click()); steps.push('pretest:' + pt.length); await sleep(120); }
      } catch (e) { steps.push('pretest-ERR:' + e.message); }
      // квиз урока: сначала неверная, затем верная
      try {
        const opts = document.querySelectorAll('#lquiz_opts_' + lid + ' .ans');
        if (opts.length) {
          const oncs = Array.from(opts).map(b => b.getAttribute('onclick') || '');
          const m = oncs[0].match(/,(\d+)\)\s*$/);
          const corr = m ? parseInt(m[1], 10) : -1;
          opts[(corr + 1) % opts.length].click(); await sleep(100);
          if (corr >= 0) opts[corr].click();
          steps.push('quiz:corr=' + corr); await sleep(120);
        }
      } catch (e) { steps.push('quiz-ERR:' + e.message); }
      // числовая: неверно, потом верно (если есть)
      try {
        const l = LESSONS.find(x => x.id === lid);
        const inp = document.getElementById('lnum_in_' + lid);
        if (inp && l && l.numericQuiz) {
          inp.value = '999999'; handleLessonNumeric(lid); await sleep(80);
          inp.disabled = false; inp.value = String(l.numericQuiz.answer); handleLessonNumeric(lid);
          steps.push('numeric'); await sleep(100);
        }
      } catch (e) { steps.push('numeric-ERR:' + e.message); }
      // завершение урока
      try {
        const btn = document.getElementById('lesson_bottom_complete_btn_' + lid) || document.getElementById('lesson_complete_btn_' + lid);
        if (btn && !btn.disabled) { btn.click(); steps.push('complete'); await sleep(150); }
      } catch (e) { steps.push('complete-ERR:' + e.message); }
      return steps;
    }, id);
    const errs = log.filter(x => x.t === 'error' || x.t === 'pageerror');
    console.log('--- ' + id + ' [' + step1.join(',') + '] ошибок: ' + errs.length);
    errs.slice(0, 5).forEach(e => console.log('   [' + e.t + ']' + (e.line ? '@' + e.line : '') + ' ' + e.txt + (e.stack ? ' || ' + e.stack : '')));
    await page.evaluate(() => { try { closeFullscreenLessonReader(); } catch (e) {} });
    await page.waitForTimeout(250);
  }

  await browser.close();
})().catch(e => { console.error('PROBE ERROR:', e); process.exit(2); });
