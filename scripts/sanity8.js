// Санити v13.0: загрузка, консоль, self-test, smoke trk:*, CNTracks.stats()
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const html = '/home/z/my-project/download/index_v13.0.html';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(html));
  await page.waitForTimeout(3500);

  const res = await page.evaluate(() => {
    const out = {};
    out.version = window.LearnPlayer && window.LearnPlayer.version;
    out.stats = window.CNTracks ? window.CNTracks.stats() : null;
    out.smoke = (window.V10 && V10.smoke.checks || []).filter(c => /^trk:/.test(c.name));
    out.smokeAll = (window.V10 && V10.smoke.checks || []).length;
    out.smokeFail = (window.V10 && V10.smoke.checks || []).filter(c => !c.ok).map(c => c.name);
    out.selftest = (window.CNTracks && CNTracks.data.coreCount) + '/' + Object.keys(CNTracks.data.blockOf).length;
    out.profile = localStorage.getItem('cn_track_profile');
    out.migrated = localStorage.getItem('cn_track_migrated');
    out.events = JSON.parse(localStorage.getItem('cn_track_events') || '[]').map(e => e.ev);
    out.lessonsTotal = typeof LESSONS !== 'undefined' ? LESSONS.length : -1;
    out.coreCount = window.CNTracks ? CNTracks.data.coreCount : -1;
    out.blocks = window.CNTracks ? CNTracks.data.electives.length : -1;
    out.anchors = Object.keys(CNTracks.data.electivesByAnchor).length;
    return out;
  });

  console.log(JSON.stringify(res, null, 2));
  console.log('Ошибки страницы/консоли:', errors.length ? errors : 'нет');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
