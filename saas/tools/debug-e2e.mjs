// Отладка модалки входа в SaaS-приложении
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const child = spawn('npx', ['wrangler', 'dev', '--port', '8789'], { cwd: process.cwd(), shell: true, detached: true, windowsHide: true, stdio: 'ignore' });
try {
  for (let i = 0; i < 90; i++) {
    try { const h = await fetch('http://localhost:8789/api/health'); if (h.ok) break; } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  const b = await (await chromium.launch()).newContext();
  const p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 150)); });
  p.on('pageerror', e => console.log('PAGE EXCEPTION:', String(e).slice(0, 150)));
  p.on('response', async res => {
    if (res.url().includes('magic-request') || res.url().includes('magic-confirm')) {
      let txt = '';
      try { txt = (await res.text()).slice(0, 200); } catch {}
      console.log('NET', res.status(), res.request().method(), res.url().slice(0, 80), txt);
    }
  });
  await p.goto('http://localhost:8789/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('#cn-cloud-panel', { timeout: 20000 });
  await p.evaluate(() => localStorage.setItem('cn_learned', JSON.stringify({ p0_l1: 1 })));
  await p.click('#cn-cloud-panel button');
  const modalVisible = await p.waitForSelector('input[type=email]', { timeout: 5000 }).then(() => true).catch(() => false);
  console.log('modal input visible:', modalVisible);
  if (!modalVisible) {
    console.log('panel html:', await p.evaluate(() => document.getElementById('cn-cloud-panel').outerHTML));
  } else {
    const email = 'dbg-' + Date.now() + '@example.com';
    // изолированный вызов из контекста страницы
    const probe = await p.evaluate(async () => {
      const r = await fetch('/api/auth/magic-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'probe-page-' + Date.now() + '@example.com' }) });
      return { status: r.status, body: await r.json() };
    });
    console.log('PAGE-CONTEXT probe:', JSON.stringify(probe).slice(0, 250));
    await p.fill('input[type=email]', email);
    await p.getByText('Получить ссылку').click();
    for (let i = 0; i < 10; i++) {
      await p.waitForTimeout(1000);
      const st = await p.evaluate(() => ({
        jwt: !!localStorage.getItem('cn_jwt'),
        msg: [...document.querySelectorAll('div')].map(d => d.textContent).find(t => t && (t.includes('Отправляем') || t.includes('Ссылка') || t.includes('истекла') || t.includes('опечатка') || t.includes('недоступна'))) || ''
      }));
      console.log(i, st.jwt ? 'JWT OK' : 'no jwt', '| msg:', String(st.msg).slice(0, 70));
      if (st.jwt) break;
    }
  }
} finally {
  try { child.kill(); } catch {}
  try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', shell: true }); } catch {}
}
