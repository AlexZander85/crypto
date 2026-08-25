// extract-content.mjs — §12.2/§3: вырезать LESSONS/TERMS/PHASE_TESTS/MATH/PSY/earning из index.html
// в контент-паки /content/ru/*.json + сгенерировать content/manifest.json (версия = хэш контента).
//
// Запуск из saas/:
//   node tools/extract-content.mjs                 # источник: ../index.html, иначе ../index_v9.html
//   node tools/extract-content.mjs --src ../index_v10.html
// После изменения контента: npm run content:update (extract + upload в R2/KV).
// Повторный запуск без изменений контента — «без изменений», загрузка пропускается.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SAAS = path.join(ROOT, 'saas');

// --src <path>: источник контента. По умолчанию index.html, если есть, иначе index_v9.html.
const srcArgIdx = process.argv.indexOf('--src');
const srcPath = srcArgIdx > -1 ? path.resolve(ROOT, process.argv[srcArgIdx + 1])
  : fs.existsSync(path.join(ROOT, 'index.html')) ? path.join(ROOT, 'index.html')
  : path.join(ROOT, 'index_v9.html');
console.log('Источник контента:', path.relative(ROOT, srcPath));
const html = fs.readFileSync(srcPath, 'utf8');
const OUT = path.join(SAAS, 'content', 'ru');
fs.mkdirSync(OUT, { recursive: true });

// Сканер сбалансированных скобок с учётом строк (", ', `) и экранирования
function grabArray(name) {
  const i = html.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error(name + ': объявление не найдено');
  const start = html.indexOf('[', i);
  let depth = 0, inStr = null, esc = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    if (ch === ']' || ch === '}' || ch === ')') { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  throw new Error(name + ': не найдена закрывающая скобка');
}

function evalArray(name) {
  const src = grabArray(name);
  try {
    return new Function('return ' + src)();
  } catch (e) {
    throw new Error(name + ': ошибка вычисления — ' + e.message);
  }
}

console.log('Извлечение структур из ' + path.basename(srcPath) + '…');
const lessons = evalArray('LESSONS');
const terms = evalArray('TERMS_RAW');
const phaseTests = evalArray('PHASE_TESTS');
const earning = evalArray('EARNING_METHODS');
const mathLessons = evalArray('MATH_LESSONS_SOURCE');
const mathTests = evalArray('MATH_TESTS');
const psy1 = evalArray('PSY_LESSONS');
const psy2 = evalArray('PSY_LESSONS_2');
const psy = [...psy1, ...psy2];
const vibe = evalArray('VIBECODING_LESSONS');
const v4 = evalArray('V4_CONTENT_LESSONS');

// --- проверки целостности источника ---
const expect = (cond, msg) => { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } };
expect(lessons.length >= 70, `LESSONS=${lessons.length}, ожидалось ≥70`);
expect(terms.length === 205, `TERMS_RAW=${terms.length}, ожидалось 205`);
expect(phaseTests.length === 6, `PHASE_TESTS=${phaseTests.length}, ожидалось 6`);
expect(psy.length === 8, `PSY=${psy.length}, ожидалось 8 (П1–П8)`);
const psyNums = psy.map(l => l.num).join(',');
expect(psyNums === 'П1,П2,П3,П4,П5,П6,П7,П8', 'нумерация психологии: ' + psyNums);

// квизы не пустые у уроков (выборочно)
const allSets = [...lessons, ...mathLessons, ...psy, ...vibe, ...v4];
const noQuiz = allSets.filter(l => !Array.isArray(l.quiz) || l.quiz.length === 0);
console.log(`Уроков без квиза: ${noQuiz.length} из ${allSets.length}`);

// --- сборка паков (§3, бюджет §21.1: один пакет = одна фаза, ≤150KB brotli) ---
// 134 урока: LESSONS(76) + MATH(44) + PSY(8) + Вайбкодинг(4) + БОН(2) — сходится с фактом продукта
const allLessons = allSets;

// Демо по §4.3: Фаза 0 целиком + Психология П1–П8
const demoLessons = allLessons.filter(l => l.phase === 0 || l.id.startsWith('ps_'));
const coreDemo = {
  meta: { demo: true, locale: 'ru', generated: new Date().toISOString().slice(0, 10), source: 'index_v9.html' },
  lessons: demoLessons
};

// Пер-фазовые паки (paid): p0…p8
const byPhase = {};
allLessons.forEach(l => { (byPhase[l.phase] ||= []).push(l); });
const phasePacks = {};
for (const ph of Object.keys(byPhase).sort((a, b) => a - b)) {
  phasePacks[`core_p${ph}.json`] = {
    meta: { demo: false, locale: 'ru', phase: Number(ph), generated: new Date().toISOString().slice(0, 10) },
    lessons: byPhase[ph]
  };
}

const termsPack = {
  meta: { demo: false, locale: 'ru', generated: new Date().toISOString().slice(0, 10) },
  terms
};
const testsPack = {
  meta: { demo: false, locale: 'ru', generated: new Date().toISOString().slice(0, 10) },
  phaseTests, mathTests
};
const earningPack = {
  meta: { demo: false, locale: 'ru', generated: new Date().toISOString().slice(0, 10) },
  earning
};

const packs = { 'core_demo.json': coreDemo, ...phasePacks, 'terms.json': termsPack, 'tests.json': testsPack, 'earning.json': earningPack };

// --- версия и дифф (§3: обновление контента = новый manifest.json) ---
const overBudgetPacks = [];
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const manifestPath = path.join(SAAS, 'content', 'manifest.json');
const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
const prevByName = new Map((prev?.packs || []).map(p => [p.name, p]));

const packEntries = Object.entries(packs).map(([name, data]) => {
  const raw = Buffer.from(JSON.stringify(data));
  const br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
  return { name, data, raw, br, hash: sha(raw).slice(0, 12) };
});

let changed = 0;
for (const p of packEntries) {
  const old = prevByName.get(p.name.replace(/\.json$/, '')); // в манифесте имена без расширения
  const status = !old ? 'новый' : old.version !== p.hash ? 'изменён' : 'без изменений';
  if (status !== 'без изменений') changed++;
  const ok = p.br.length <= 150 * 1024;
  if (!ok) overBudgetPacks.push(p.name);
  console.log(`  ${ok ? '✓' : '⚠'} ${p.name}: ${(p.raw.length / 1024).toFixed(0)}KB raw → ${(p.br.length / 1024).toFixed(1)}KB brotli · ${status}`);
}

// --- запись паков (только изменившиеся/новые — чтобы mtime был честным) ---
for (const p of packEntries) {
  const old = prevByName.get(p.name);
  if (old && old.hash === p.hash) continue;
  fs.writeFileSync(path.join(OUT, p.name), p.raw);
}

// --- манифест: версия = хэш всех паков ---
const packMeta = packEntries.map(p => ({
  name: p.name.replace(/\.json$/, ''),
  demo: p.data.meta?.demo === true,
  version: p.hash,
  bytes: p.raw.length,
  brotli_bytes: p.br.length
}));
const version = 'ru.' + sha(Buffer.from(packMeta.map(p => p.version).join('|'))).slice(0, 8);
const manifest = { version, locale: 'ru', generated: new Date().toISOString(), source: path.basename(srcPath), packs: packMeta };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

if (prev && prev.version === version) {
  console.log('\nКонтент не изменился (версия ' + version + '). Загрузка не требуется.');
} else {
  console.log(`\nМанифест: ${version}` + (prev ? ` (было ${prev.version}; изменённых паков: ${changed})` : ' (первая генерация)'));
  console.log('Далее: npm run content:update — загрузка паков и манифеста в R2/KV.');
}

// --- сводка ---
const phasesSummary = {};
allLessons.forEach(l => { phasesSummary[l.phase] = (phasesSummary[l.phase] || 0) + 1; });
console.log('\nУроков всего:', allLessons.length, '| по фазам:', JSON.stringify(phasesSummary));
console.log('Демо-уроков (Фаза 0 + Психология):', demoLessons.length, '| Терминов:', terms.length, '| Тестов:', phaseTests.length + mathTests.length, '| Заработок:', earning.length);

if (overBudgetPacks.length) {
  console.error('БЮДЖЕТ НАРУШЕН (§21.1, ≤150KB brotli): ' + overBudgetPacks.join(', '));
  process.exit(1);
}
