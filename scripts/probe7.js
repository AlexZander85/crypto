// Проба Этапа 7 на базовой сборке v12.8 — эмпирика до кодинга:
// 1) S.lessonId в тестовом режиме (что получает mentorOpenPanel из rootClick-ветки);
// 2) сертификат капстоуна на экране результата плеера (Э2 P5.2) + onclick «К достижениям»;
// 3) устойчивость v10-панели к testId в качестве lessonId.
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/index_v12.8.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 40)); await d.dismiss(); });
  await page.goto(FILE + '?mockai=1');
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    localStorage.setItem('cn_tier_override', 'max');
    sessionStorage.removeItem('mentor_upsell_closed');
  });

  const r = await page.evaluate(async () => {
    const out = {}, sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // === 1. тест-режим: контекст наставника из rootClick-ветки ===
    LearnPlayer.openTest('p1', 'tests');
    await sleep(150);
    const mb = document.querySelector('.learn-root [data-lp-act="mentor"]');
    out.mentorBtnInTest = !!mb;
    if (mb) {
      mb.click();
      await sleep(150);
      const upsell = document.getElementById('mentor_upsell_modal');
      out.upsell = !!upsell;
      if (upsell) upsell.remove();
      const body = document.getElementById('mentor_panel_body');
      out.panelHeaderTest = body ? body.firstElementChild.textContent.trim().slice(0, 40) : null;
      out._mentorLessonId = window._mentorLessonId;
      const stepCard = document.getElementById('lp4_mentor_step');
      out.lp4StepCardInTest = !!stepCard;
      if (typeof mentorClosePanel === 'function') mentorClosePanel();
    }
    LearnPlayer.close();
    await sleep(120);

    // === 2. capstone: сертификат на экране плеера ===
    LearnPlayer.openTest('capstone', 'tests');
    await sleep(150);
    async function gotoPortion(qi) {
      const port = Math.floor(qi / 5);
      for (let k = 0; k < 15; k++) {
        const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
        if (m && parseInt(m[1], 10) - 1 === port) return true;
        if (!document.querySelector('[data-lp2-nav="next"]')) return false;
        document.querySelector('[data-lp2-nav="next"]').click();
        await sleep(40);
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
        const cont = document.getElementById('ptest_6_' + qi);
        cont.querySelectorAll('button.ans')[q.a].click();
      }
      await sleep(20);
    }
    for (let k = 0; k < 15; k++) {
      const m = /Шаг (\d+) из/.exec(document.querySelector('.learn-progress-label').textContent);
      const total = document.querySelectorAll('.learn-map .learn-map-item').length;
      if (m && parseInt(m[1], 10) === total) break;
      document.querySelector('[data-lp2-nav="next"]').click();
      await sleep(40);
    }
    document.querySelector('[data-lp2-submit]').click();
    await sleep(400);
    const stepTxt = document.querySelector('.learn-root .learn-step').textContent;
    out.certOnPlayerScreen = stepTxt.indexOf('СЕРТИФИКАТ') >= 0;
    out.certGoProgress = stepTxt.indexOf('Перейти к достижениям') >= 0;
    const certBtn = Array.from(document.querySelectorAll('.learn-root .learn-step button'))
      .find(b => /Перейти к достижениям/.test(b.textContent));
    out.certBtnOnclick = certBtn ? certBtn.getAttribute('onclick') : null;
    out.resultText = stepTxt.replace(/\s+/g, ' ').slice(0, 130);
    LearnPlayer.close();
    await sleep(120);

    // === 3. панель с testId в качестве lessonId (безопасность v10) ===
    try {
      mentorOpenPanel('capstone');
      await sleep(100);
      const up = document.getElementById('mentor_upsell_modal');
      if (up) up.remove();
      const body = document.getElementById('mentor_panel_body');
      out.panelHeaderCapstone = body ? body.firstElementChild.textContent.trim().slice(0, 40) : null;
      out.actionsCount = document.querySelectorAll('#mentor_actions button').length;
      if (typeof mentorClosePanel === 'function') mentorClosePanel();
    } catch (e) { out.panelCapstoneError = String(e).slice(0, 100); }

    // === 4. чтение S.lessonId невозможного снаружи — через поведение rootClick в уроке ===
    LearnPlayer.open('p0_l1');
    await sleep(150);
    const mb2 = document.querySelector('.learn-root [data-lp-act="mentor"]');
    if (mb2) {
      mb2.click();
      await sleep(150);
      const up2 = document.getElementById('mentor_upsell_modal');
      if (up2) up2.remove();
      const body2 = document.getElementById('mentor_panel_body');
      out.panelHeaderLesson = body2 ? body2.firstElementChild.textContent.trim().slice(0, 40) : null;
      out._mentorLessonIdLesson = window._mentorLessonId;
      out.lp4CardLesson = !!document.getElementById('lp4_mentor_step');
      if (typeof mentorClosePanel === 'function') mentorClosePanel();
    }
    LearnPlayer.close();
    return out;
  });

  console.log(JSON.stringify(r, null, 2));
  console.log('pageerror:', errors.length ? errors : 'none');
  console.log('dialogs:', dialogs.length ? dialogs : 'none');
  await browser.close();
})();
