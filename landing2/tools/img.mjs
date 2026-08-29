// Конвертация PNG → WebP через Playwright Chromium (canvas.toBlob).
// Запуск из корня D:\crypto:  node landing2/tools/img.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..', '..'); // D:\crypto
const SRC = path.join(ROOT, 'docs', 'screenshots');
const OUT = path.join(ROOT, 'landing2', 'assets');

fs.mkdirSync(OUT, { recursive: true });

const FILES = ['01-home', '02-roadmap', '03-lesson', '04-simulator', '05-psychology', '06-quiz', '07-glossary', '08-mobile'];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

for (const name of FILES) {
  const png = fs.readFileSync(path.join(SRC, `${name}.png`));
  const b64 = `data:image/png;base64,${png.toString('base64')}`;
  const webpB64 = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return new Promise((res) => c.toBlob(async (blob) => {
      const buf = await blob.arrayBuffer();
      let s = ''; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      res(btoa(s));
    }, 'image/webp', 0.82));
  }, b64);
  fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(webpB64, 'base64'));
  // PNG fallback копируем как есть
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  console.log(`${name}: webp ${(webpB64.length * 3 / 4 / 1024).toFixed(1)}KB, png ${(png.length / 1024).toFixed(1)}KB`);
}

// GIF демо — как есть
fs.copyFileSync(path.join(SRC, '09-trainer-demo.gif'), path.join(OUT, '09-trainer-demo.gif'));
console.log('09-trainer-demo.gif copied');
await browser.close();
