// Загрузка паков из content/ru/ в R2 + манифеста в KV.
// Локально:  npm run packs:upload
// На проде:  npm run packs:upload -- --remote
// Манифест в KV позволяет обновлять контент БЕЗ передеплоя воркера (§3):
// воркер читает KV manifest:<locale> в первую очередь, статический импорт — фолбэк.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SAAS = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIR = path.join(SAAS, 'content', 'ru');
const remote = process.argv.includes('--remote') ? ['--remote'] : ['--local'];
const manifest = JSON.parse(fs.readFileSync(path.join(SAAS, 'content', 'manifest.json'), 'utf8'));
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

// 1. паки → R2 (только те, чей hash есть в манифесте и изменился относительно R2 —
//    для простоты грузим все: R2 put идемпотентен, 13 объектов — секунды)
for (const f of files) {
  const key = `cn-packs/packs/ru/${f}`;
  execSync(`npx wrangler r2 object put "${key}" --file "${path.join(DIR, f)}" --content-type application/json ${remote.join(' ')}`, { stdio: 'inherit', shell: true });
}

// 2. манифест → KV для каждой локали (пока контент один — ru; переводы добавятся позже)
const locales = ['ru'];
const manifestStr = JSON.stringify(manifest);
for (const locale of locales) {
  const tmp = path.join(SAAS, '.wrangler', `manifest-${locale}.json`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify({ ...manifest, locale }));
  execSync(`npx wrangler kv key put "manifest:${locale}" --path "${tmp}" --binding KV ${remote.join(' ')}`, { stdio: 'inherit', shell: true });
  fs.rmSync(tmp);
}

console.log(`Uploaded ${files.length} packs + manifest ${manifest.version} → KV (manifest:ru).`);
