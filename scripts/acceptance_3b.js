// ===== Этап 3, приёмка B: Syllabus (P3), якоря (P4), поиск (P5), финал курса =====
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
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  // ==== P3: Syllabus-вкладки левой панели ====
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(400);
  const tabs = await page.evaluate(() => {
    const t = document.querySelectorAll('.lp3-tabs [data-lp3-tab]');
    return { n: t.length, names: Array.from(t).map(b => b.textContent.replace(/\d+/, '')) };
  });
  ok('P3.1 три вкладки панели (Шаги|Программа|Конспект)', tabs.n === 3, tabs.names.join('|'));

  // Активная вкладка «Шаги»: карта шагов на месте
  const stepsVisible = await page.evaluate(() => !!document.querySelector('.learn-map .learn-map-item'));
  ok('P3.1 вкладка «Шаги» = карта шагов', stepsVisible);

  // Переключение на «Программа» — дерево, текущий урок подсвечен
  await page.click('[data-lp3-tab="program"]');
  await page.waitForTimeout(250);
  const progState = await page.evaluate(() => {
    const cur = document.querySelector('.lp3-les.current');
    const phOpen = document.querySelectorAll('.lp3-ph.open');
    return {
      curText: cur ? cur.querySelector('.t').textContent.slice(0, 40) : null,
      openPh: phOpen.length ? phOpen[0].querySelector('.lp3-ph-h .t').textContent.slice(0, 24) : null,
      tabSaved: (JSON.parse(localStorage.getItem('cn_learn_syllabus') || '{}').tab)
    };
  });
  ok('P3.2 дерево: текущий урок p0_l1 подсвечен, фаза 0 раскрыта',
    /0\.1|p0_l1|Как|Урок/.test(progState.curText || '') && /фаза 0/i.test(progState.openPh || ''), JSON.stringify(progState));
  ok('P3.1 вкладка сохранена в LS', progState.tabSaved === 'program');

  // ≤2 кликов до любого урока: раскрыть фазу 9 и кликнуть урок (2 клика от «Программы»)
  await page.click('[data-lp3-mph="9"]');
  await page.waitForTimeout(200);
  await page.click('.lp3-ph.open [data-lp3-mopen]');
  await page.waitForTimeout(400);
  const jumped = await page.evaluate(() => ({
    title: (document.querySelector('.learn-progress-title') || {}).textContent || '',
    tabBack: (JSON.parse(localStorage.getItem('cn_learn_syllabus') || '{}').tab)
  }));
  ok('P3.4 ≤2 кликов до урока фазы 9; вкладка вернулась на «Шаги»',
    /FT-|Фаза 9/i.test(jumped.title) && jumped.tabBack === 'steps', JSON.stringify(jumped));

  // Подсветка переехала: открыть Программу — current = новый урок
  await page.click('[data-lp3-tab="program"]');
  await page.waitForTimeout(200);
  const curNow = await page.evaluate(() => {
    const cur = document.querySelector('.lp3-les.current');
    return cur ? cur.getAttribute('data-lp3-mopen') : null;
  });
  ok('P3.4 подсветка текущего переехала на новый урок', curNow && curNow.startsWith('ft'), 'current=' + curNow);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Раскрытая ветка переживает переоткрытие
  await page.evaluate(() => LearnPlayer.open('p0_l2'));
  await page.waitForTimeout(300);
  await page.click('[data-lp3-tab="program"]');
  await page.waitForTimeout(200);
  const branch = await page.evaluate(() => {
    const open = document.querySelectorAll('.lp3-ph.open');
    return { openPh: open.length ? open[0].querySelector('.lp3-ph-h .t').textContent.slice(0, 24) : null };
  });
  ok('P3.4 раскрытая ветка (фаза 9) переживает переоткрытие', /фаза 9/i.test(branch.openPh || ''), JSON.stringify(branch));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // ==== P4: якорь «Фаза N: X/Y» ====
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(350);
  const anchor = await page.evaluate(() => {
    const a = document.querySelector('.lp3-anchor');
    return { text: a && a.style.display !== 'none' ? a.textContent : null };
  });
  ok('P4.1 якорь «Фаза 0: 0/20» в шапке', anchor.text === 'Фаза 0: 0/20', 'text=' + JSON.stringify(anchor.text));

  // Паритет с бейджем вкладки уроков
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const parity = await page.evaluate(() => {
    try { renderPhaseLessonsView(0); } catch (e) { return { err: String(e) }; }
    const badge = document.getElementById('cur_phase_progress_badge');
    return { badge: badge ? badge.textContent.replace(/\s+/g, ' ').trim() : null };
  });
  ok('P4.3 якорь = бейджу «Пройдено уроков»', /0\s*из\s*20/.test(parity.badge || ''), JSON.stringify(parity));

  // Клик по якорю → программа на этой фазе (+drawer на мобильных)
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(300);
  await page.click('.lp3-anchor');
  await page.waitForTimeout(250);
  const anchorClick = await page.evaluate(() => ({
    drawer: document.querySelector('.learn-root').getAttribute('data-map-open'),
    tab: (JSON.parse(localStorage.getItem('cn_learn_syllabus') || '{}').tab),
    openPh: (JSON.parse(localStorage.getItem('cn_learn_syllabus') || '{}').phase)
  }));
  ok('P4.1 якорь открывает «Программу» на фазе (drawer на 360px)',
    anchorClick.drawer === '1' && anchorClick.tab === 'program' && anchorClick.openPh === 0, JSON.stringify(anchorClick));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // ==== P5: поиск из плеера (Ctrl+K) ====
  await page.evaluate(() => LearnPlayer.open('p0_l1'));
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(250);
  const ovOpen = await page.evaluate(() => !!document.querySelector('.learn-overlay[data-ov="lp3search"]'));
  ok('P5.2 Ctrl+K открывает оверлей поиска', ovOpen);
  await page.fill('.learn-overlay[data-ov="lp3search"] .lp3-search-in', 'ликвидация');
  await page.waitForTimeout(300);
  const sr = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.learn-overlay[data-ov="lp3search"] .lp3-sr'));
    const lessonRows = rows.filter(r => r.hasAttribute('data-lp3-sr'));
    return {
      n: rows.length,
      lessonN: lessonRows.length,
      first: rows[0] ? rows[0].innerText.split('\n')[0] : null,
      marked: lessonRows.filter(r => r.querySelector('mark')).length
    };
  });
  ok('P5.2 «ликвидация»: уроки + фрагменты с подсветкой', sr.n > 0 && sr.lessonN >= 2 && sr.marked > 0, JSON.stringify({ n: sr.n, lessonN: sr.lessonN, marked: sr.marked }));

  // Переход на шаг совпадения: клик по результату урока с blockIndex>0
  const clickRes = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.learn-overlay[data-ov="lp3search"] .lp3-sr[data-lp3-sr]'));
    const withBi = rows.find(r => +(r.getAttribute('data-lp3-sr-bi') || 0) > 0) || rows[0];
    const res = { id: withBi.getAttribute('data-lp3-sr'), bi: +withBi.getAttribute('data-lp3-sr-bi') };
    withBi.click();
    return res;
  });
  await page.waitForTimeout(400);
  const jump = await page.evaluate((res) => {
    const step = document.querySelector('.learn-step');
    const idx = +(step.getAttribute('data-lp-idx') || document.querySelector('[data-lp-idx]').getAttribute('data-lp-idx'));
    const steps = LearnPlayer._buildStepsFor(res.id);
    return { idx, blockIndex: steps[idx] ? steps[idx].blockIndex : null, expect: res.bi, overlayGone: !document.querySelector('.learn-overlay[data-ov="lp3search"]') };
  }, clickRes);
  ok('P5.3 переход на шаг совпадения (blockIndex)', jump.overlayGone && jump.blockIndex === jump.expect,
    JSON.stringify(jump));

  // Esc закрывает оверлей (не плеер), фокус возвращается
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(200);
  await page.fill('.learn-overlay[data-ov="lp3search"] .lp3-search-in', 'xxxxx');
  await page.waitForTimeout(200);
  const emptyMsg = await page.evaluate(() => {
    const o = document.querySelector('.learn-overlay[data-ov="lp3search"]');
    return o ? o.querySelector('.lp3-ov-results').innerText.slice(0, 80) : null;
  });
  ok('P5.4 пустой результат — аккуратное сообщение', /ничего не найдено/i.test(emptyMsg || ''), JSON.stringify(emptyMsg));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const escState = await page.evaluate(() => ({
    ovGone: !document.querySelector('.learn-overlay[data-ov="lp3search"]'),
    playerAlive: !!document.querySelector('.learn-root')
  }));
  ok('P5.6 Esc закрывает поиск, плеер жив', escState.ovGone && escState.playerAlive, JSON.stringify(escState));
  await page.keyboard.press('Escape'); // плеер закрыть
  await page.waitForTimeout(250);

  // Типы источников: OOS (аббревиатура), Келли (термин + уроки)
  const types = await page.evaluate(() => {
    const oos = LearnPlayer.search('OOS');
    const kel = LearnPlayer.search('Келли');
    return {
      oosAbbr: oos.results.filter(x => x.it.type === 'abbr').length,
      kelTerm: kel.results.filter(x => x.it.type === 'term').length,
      kelLesson: kel.results.filter(x => x.it.type === 'lesson').length
    };
  });
  ok('§7.4 «OOS» → аббревиатура; «Келли» → термин + уроки М47',
    types.oosAbbr >= 1 && types.kelTerm >= 1 && types.kelLesson >= 1, JSON.stringify(types));

  // ==== P4.2: финал — «Фаза X%» + CTA «в курсе» ====
  // Профиль: p0_l1…p0_l3 пройдены; открываем p0_l4, сдаём квиз корректно (0 неверных)
  await page.evaluate(() => {
    localStorage.setItem('cn_lessons', JSON.stringify({ p0_l1: 1, p0_l2: 1, p0_l3: 1 }));
    localStorage.removeItem('cn_learn_pos');
  });
  await page.reload();
  await page.waitForTimeout(3200);
  await page.evaluate(() => LearnPlayer.open('p0_l4'));
  await page.waitForTimeout(350);
  // дойти до шага квиза
  const quizReached = await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      const st = document.querySelector('.learn-step');
      if (st && st.querySelector('[id^="lquiz_opts_"]')) return true;
      const nb = document.querySelector('[data-lp-nav="next"]');
      if (!nb || nb.disabled) return false;
      nb.click();
      await new Promise(r => setTimeout(r, 60));
    }
    return false;
  });
  ok('B: дошли до шага квиза', quizReached);
  const quizDone = await page.evaluate(async () => {
    const lid = 'p0_l4';
    const btns = Array.from(document.querySelectorAll('#lquiz_opts_' + lid + ' button'));
    const correct = btns.map(b => { const m = b.getAttribute('onclick').match(/,\s*(\d+)\)\s*$/); return m ? +m[1] : -1; });
    for (let i = 0; i < btns.length; i++) {
      if (i === correct[i]) { btns[i].click(); return { wrong: 0, correctIdx: correct[i] }; }
    }
    return { wrong: 0, fail: true };
  });
  await page.waitForTimeout(200);
  // Завершить урок → финал
  const finale = await page.evaluate(async () => {
    LearnPlayer.completeLessonOnce();
    await new Promise(r => setTimeout(r, 300));
    const t = document.querySelector('.learn-step').innerText;
    return {
      isFinale: /Урок пройден|Урок уже был пройден|пройден/i.test(t),
      phasePct: /Фаза 0 пройдена на (\d+)%/.exec(t),
      ctaCourse: /Следующий непройденный урок курса/.test(t),
      badgeInCourse: /в курсе/.test(t),
      adaptive: /адаптивную тренировку/i.test(t)
    };
  });
  ok('P4.2 финал: «Фаза 0 пройдена на X%» + CTA «в курсе», без рекомендации (0 ошибок)',
    finale.isFinale && finale.phasePct && finale.ctaCourse && finale.badgeInCourse && !finale.adaptive,
    JSON.stringify({ pct: finale.phasePct && finale.phasePct[1], cta: finale.ctaCourse, adv: finale.adaptive }));

  // CTA «в курсе» ведёт на первый непройденный урок курса (p0_l5)
  const ctaTarget = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.learn-step button')).find(x => /непройденный урок курса/.test(x.textContent));
    const m = b ? /LearnPlayer\.open\('([^']+)'/.exec(b.getAttribute('onclick')) : null;
    return m ? m[1] : null;
  });
  ok('P4.3 CTA «в курсе» = первый непройденный (p0_l5)', ctaTarget === 'p0_l5', 'target=' + ctaTarget);

  // Фаза пройдена на X% сверить с расчётом
  const pctCheck = await page.evaluate(() => {
    const txt = document.querySelector('.learn-step').innerText;
    const shown = +(/Фаза 0 пройдена на (\d+)%/.exec(txt) || [0, -1])[1];
    const ls = LESSONS.filter(l => l.phase === 0);
    const done = ls.filter(l => lessonsDone[l.id] === 1).length;
    return { shown, calc: Math.round(done / ls.length * 100) };
  });
  ok('P4.2 «Фаза пройдена на X%» = done/total фазы', pctCheck.shown === pctCheck.calc, JSON.stringify(pctCheck));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  const inherited = (m) => /ERR_FILE_NOT_FOUND/i.test(m); // отсутствующие assets — унаследовано (отчёты Этапов 1–2)
  ok('КОНСОЛЬ чистая (без унаследованных файловых ERR)',
    errors.length === 0 && cerr.filter(m => !inherited(m)).length === 0,
    (errors.length ? 'page: ' + errors[0] : '') + (cerr.filter(m => !inherited(m)).length ? ' console: ' + cerr.filter(m => !inherited(m))[0] : ' + ' + cerr.filter(inherited).length + ' унаслед. asset-ERR'));
  console.log(R.join('\n'));
  await browser.close();
  const fails = R.filter(x => x.startsWith('FAIL')).length;
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('B_FAIL', e); console.log(R.join('\n')); process.exit(1); });
