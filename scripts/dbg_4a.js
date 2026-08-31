// Отладка шага 6 acceptance_4a: почему карточка не появляется
const { chromium } = require('playwright');
const path = require('path');
const HTML = '/home/z/my-project/download/index_v12.6.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  const goQuiz = async () => {
    await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) {
        const st = document.querySelector('.learn-step');
        if (st && st.querySelector('[id^="lquiz_opts_"]')) return 'quiz';
        const nb = document.querySelector('[data-lp-nav="next"]');
        if (!nb) return 'nonext'; nb.click(); await new Promise(r => setTimeout(r, 60));
      }
      return 'loop';
    });
    await page.waitForTimeout(150);
  };
  const wrongClicks = async (n) => page.evaluate(async (n) => {
    const lid = 'p0_l1';
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const idxs = btns.map(b => { const m = b.getAttribute('onclick').match(/,\s*(\d+)\)\s*$/); return m ? +m[1] : -1; });
    const wrong = btns.filter((b, i) => i !== idxs[0]);
    for (let k = 0; k < n; k++) { wrong[k % wrong.length].click(); await new Promise(r => setTimeout(r, 90)); }
    return { nBtns: btns.length, nWrong: wrong.length };
  }, n);

  // Сессия 1: полный цикл до «Не напоминать» (как в acceptance)
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  console.log('goQuiz1:', await goQuiz());
  console.log('wrong1:', await wrongClicks(3), await page.evaluate(() => LearnPlayer._mistInfo('p0_l1')));
  await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_p0_l1 button'));
    const m = btns[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
    btns[+m[1]].click(); await new Promise(r => setTimeout(r, 120));
    LearnPlayer.completeLessonOnce(); await new Promise(r => setTimeout(r, 350));
  });
  console.log('finale1 card:', await page.evaluate(() => !!document.getElementById('lp4_rec_card')));
  const reset = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#lp4_rec_card button')).find(b => /Не напоминать/.test(b.textContent));
    btn.click(); await new Promise(r => setTimeout(r, 300));
    return { info: LearnPlayer._mistInfo('p0_l1'), gone: !document.getElementById('lp4_rec_card') };
  });
  console.log('reset:', JSON.stringify(reset));

  // Сессия 3 (шаг 6 acceptance): close → remove pos → open → wrong×3
  await page.evaluate(() => { try { LearnPlayer.close(); } catch (e) {} });
  await page.waitForTimeout(250);
  await page.evaluate(() => { localStorage.removeItem('cn_learn_pos'); LearnPlayer.open('p0_l1'); });
  await page.waitForTimeout(400);
  console.log('after reopen: resumeDialog=', await page.evaluate(() => !!document.querySelector('.learn-overlay[data-ov="resume"], #lp_resume_dialog')), 'step=', await page.evaluate(() => document.querySelector('.learn-progress-label') ? document.querySelector('.learn-progress-label').textContent : 'none'));
  console.log('goQuiz3:', await goQuiz());
  console.log('wrong3:', JSON.stringify(await wrongClicks(3)), await page.evaluate(() => LearnPlayer._mistInfo('p0_l1')));
  console.log('counter label:', await page.evaluate(() => { const r = document.getElementById('lp_retry_p0_l1'); return r ? r.innerText : null; }));
  await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_p0_l1 button'));
    const m = btns[0].getAttribute('onclick').match(/,\s*(\d+)\)\s*$/);
    btns[+m[1]].click(); await new Promise(r => setTimeout(r, 120));
  });
  console.log('quizPassed now:', await page.evaluate(() => !!document.getElementById('lesson_complete_btn_p0_l1') && !document.getElementById('lesson_complete_btn_p0_l1').disabled));
  await page.evaluate(async () => { LearnPlayer.completeLessonOnce(); await new Promise(r => setTimeout(r, 350)); });
  console.log('finale3:', await page.evaluate(() => {
    const c = document.getElementById('lp4_rec_card');
    const step = document.querySelector('.learn-step');
    return { card: !!c, txt: c ? c.innerText.slice(0, 100) : null, stepHead: step ? step.innerText.slice(0, 80).replace(/\n/g, ' | ') : null };
  }));
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(2); });
