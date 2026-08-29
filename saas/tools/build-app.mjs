// build-app.mjs — сборка SaaS-версии приложения: index_v9.html + <script integration.js>.
// Продукт-файл не изменяется; SaaS-сборка регенерируется заново при каждом запуске.
// Запуск: node tools/build-app.mjs [--src ../index_v9.html]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PUBLIC = path.join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'public');

const srcArgIdx = process.argv.indexOf('--src');
const srcPath = srcArgIdx > -1 ? path.resolve(ROOT, process.argv[srcArgIdx + 1])
  : fs.existsSync(path.join(ROOT, 'index.html')) ? path.join(ROOT, 'index.html')
  : path.join(ROOT, 'index_v9.html');

let html = fs.readFileSync(srcPath, 'utf8');

// один тег перед </body> (идемпотентно: старый инжект удаляем)
html = html.replace(/<!--CN-SAAS-INTEGRATION-->[\s\S]*?<\/script>\s*/g, '');
const inject = `<!--CN-SAAS-INTEGRATION--><script src="/integration.js" defer></script>\n</body>`;
if (!html.includes('</body>')) { console.error('нет </body>'); process.exit(1); }
html = html.replace('</body>', inject);

fs.mkdirSync(PUBLIC, { recursive: true });
fs.writeFileSync(path.join(PUBLIC, 'index.html'), html);
console.log(`SaaS-сборка: ${path.basename(srcPath)} (${(html.length / 1024 / 1024).toFixed(2)}MB) → public/index.html`);
