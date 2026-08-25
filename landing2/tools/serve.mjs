// Мини-статический сервер для Lighthouse. Запуск: node landing2/tools/serve.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve(import.meta.dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIR, p);
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(4177, () => console.log('serving on :4177'));
