// ===== Этап 8, регрессия: критерий архитектуры (удаление stage8 → Этап 7) + автопрогон 213 уроков =====
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const HTML = '/home/z/my-project/download/index_v13.0.html';
const R = []; const ok = (c, n, note) => { const line = (c ? 'OK ' : 'FAIL') + ' | ' + n + (note ? ' | ' + String(note).slice(0, 240) : ''); R.push(line); console.log(line); };

(async () => {
  // ---------- Часть 1: критерий архитектуры — файл без Этапа 8 ----------
  const src = fs.readFileSync(HTML, 'utf8');
  const a = src.indexOf('/* ===== learn_player_stage8: ЭТАП 8 — Трек «основа + факультатив» (начало) ===== */');
  const b = src.indexOf('/* ===== learn_player_stage8: ЭТАП 8 (конец) ===== */');
  const cssA = src.indexOf('<style id="learn_player_stage8_css">');
  const cssB = src.indexOf('</style>', cssA);
  ok(a > 0 && b > a && cssA > 0 && cssB > cssA, 'секция Этапа 8 локализуется (JS + CSS)');
  const stripped = src.slice(0, a) + src.slice(b + '/* ===== learn_player_stage8: ЭТАП 8 (конец) ===== */'.length)
    .replace(src.slice(cssA, cssB + '</style>\n').length ? src.slice(cssA, cssB + 8) : '', '');
  // проще: удалить точно те же фрагменты, что вставлял инжектор
  const stripped2 = (function () {
    // точное обращение инжектора: JS был вставлен как '\n\n' + js + '\n' после якоря;
    // CSS-блок — непосредственно перед «LEARN PLAYER — конец»
    const anchor7 = '/* ===== learn_player_stage7: Этап 7 (конец) ===== */';
    const anchor7End = src.indexOf(anchor7) + anchor7.length;
    const stage6 = '/* ===== learn_player_stage6: Этап 6 (конец) ===== */';
    let s = src.slice(0, anchor7End) + '\n\n' + src.slice(src.indexOf(stage6));
    const c1 = s.indexOf('<style id="learn_player_stage8_css">');
    const c2 = s.indexOf('</style>', c1) + '</style>'.length + 1; // + \n
    s = s.slice(0, c1) + s.slice(c2);
    return s;
  })();
  const v129 = fs.readFileSync('/home/z/my-project/download/index_v12.9.html', 'utf8');
  ok(stripped2 === v129, 'после вырезания Этапа 8 файл байт-в-байт = v12.9');

  // ---------- Часть 2: автопрогон всех 213 уроков на v13.0 ----------
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errors.push('console: ' + (m.text() || '').slice(0, 160)); });
  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cn_tour_done', '1'); });
  await page.reload();
  await page.waitForTimeout(3200);

  const sweep = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const ids = LESSONS.map(l => l.id);
    let opened = 0, chipCore = 0, chipElec = 0, noChip = 0;
    for (const id of ids) {
      try {
        const n = window.LearnPlayer._buildStepsFor(id).length;
        LearnPlayer.open(id, Math.max(0, n - 1)); // финальный шаг: максимальное покрытие рендера трека
        await sleep(35);
        opened++;
        const chip = document.getElementById('trk_chip');
        if (chip) { if (chip.textContent.includes('🟠')) chipElec++; else chipCore++; } else noChip++;
        LearnPlayer.close();
        await sleep(18);
      } catch (e) { /* продолжаем */ }
    }
    return { total: ids.length, opened, chipCore, chipElec, noChip };
  });
  ok(sweep.total === 213 && sweep.opened === 213, 'автопрогон: открыты все 213 уроков (на финальных шагах)', JSON.stringify(sweep));
  ok(errors.length === 0, 'автопрогон: 0 ошибок страницы/консоли', JSON.stringify(errors.slice(0, 4)));

  const smoke = await page.evaluate(() => ({
    total: V10.smoke.checks.length,
    fails: V10.smoke.checks.filter(c => !c.ok).map(c => c.name)
  }));
  ok(smoke.fails.length === 0, 'V10.smoke после автопрогона: все ' + smoke.total + ' зелёные', JSON.stringify(smoke.fails));

  // ---------- Часть 3: автопрогон на stripped-файле = Этап 7 ----------
  fs.writeFileSync('/home/z/my-project/scripts/_v13_without_stage8.html', stripped2, 'utf8');
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors2 = [];
  page2.on('pageerror', e => errors2.push(String(e && e.message || e).slice(0, 160)));
  page2.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text() || '')) errors2.push((m.text() || '').slice(0, 160)); });
  await page2.goto('file://' + path.resolve('/home/z/my-project/scripts/_v13_without_stage8.html'));
  await page2.waitForTimeout(3200);
  const s2 = await page2.evaluate(() => ({
    version: window.LearnPlayer.version,
    trk: typeof window.CNTracks,
    chip: !!document.getElementById('trk_chip'),
    smokeFails: V10.smoke.checks.filter(c => !c.ok).map(c => c.name),
    trkSmoke: V10.smoke.checks.filter(c => /^trk:/.test(c.name)).length
  }));
  ok(/Этап 7/.test(s2.version || ''), 'без Этапа 8 версия плеера = Этап 7', s2.version);
  ok(s2.trk === 'undefined', 'без Этапа 8 window.CNTracks отсутствует');
  ok(!s2.chip && s2.trkSmoke === 0, 'без Этапа 8 нет чипа и trk:* smoke');
  ok(s2.smokeFails.length === 0, 'без Этапа 8 все штатные smoke зелёные', JSON.stringify(s2.smokeFails));
  // быстрый прогон хаба и финала на stripped
  const s3 = await page2.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    LearnPlayer.openHome(); await sleep(350);
    const hubOk = !!document.querySelector('.learn-home-root') && !document.querySelector('.trk-route');
    LearnPlayer.closeHome(); await sleep(150);
    LearnPlayer.open('p0_l1'); await sleep(400);
    LearnPlayer.close(); await sleep(150);
    LearnPlayer.openTest('p1'); await sleep(400);
    const testOk = document.querySelectorAll('[data-lp2-q]').length > 0;
    LearnPlayer.close(); await sleep(150);
    return { hubOk, testOk };
  });
  ok(s3.hubOk && s3.testOk, 'без Этапа 8: хаб Этапа 3 и тест Этапа 2 работают, следа трека нет', JSON.stringify(s3));
  ok(errors2.length === 0, 'без Этапа 8: консоль чистая', JSON.stringify(errors2.slice(0, 4)));
  fs.unlinkSync('/home/z/my-project/scripts/_v13_without_stage8.html');

  await browser.close();
  console.log('\nИТОГО регрессия-8: OK=' + R.filter(x => x.startsWith('OK')).length + ' FAIL=' + R.filter(x => x.startsWith('FAIL')).length);
  process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
})();
