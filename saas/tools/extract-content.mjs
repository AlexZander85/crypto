// extract-content.mjs v2 — §4 промта PROMPT_SAAS_CLOUDFLARE_V2.md
// Вырезает контентные структуры из index_v12.9.html в паки content/ru/*.json
// + генерирует content/manifest.json (версия = хэш всех паков, регистры и порядок сборки).
//
// Запуск из saas/:
//   node tools/extract-content.mjs                      # источник: ../index_v12.9.html
//   node tools/extract-content.mjs --src index_v13.html # будущие версии
// После изменения контента: npm run content:update (extract + upload в R2/KV).
// Передеплой воркера не нужен: клиенты видят новую версию манифеста и докачивают паки (§4.4).
//
// Инвариант сумм (§4.1): 76 + 48 + 56 + 4 + 2 + 27 = 213 уроков. Любое расхождение —
// сборка ПАДАЕТ с внятной ошибкой (имя структуры, факт, ожидание), данные не «чинятся» (§22).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SAAS = path.join(ROOT, 'saas');
const OUT = path.join(SAAS, 'content', 'ru');
fs.mkdirSync(OUT, { recursive: true });

// --src <path>: относительный путь от корня репо или абсолютный
const srcArgIdx = process.argv.indexOf('--src');
const srcPath = srcArgIdx > -1
  ? (path.isAbsolute(process.argv[srcArgIdx + 1]) ? process.argv[srcArgIdx + 1] : path.join(ROOT, process.argv[srcArgIdx + 1]))
  : fs.existsSync(path.join(ROOT, 'index_v13.0.html')) ? path.join(ROOT, 'index_v13.0.html')
  : fs.existsSync(path.join(ROOT, 'index_v12.9.html')) ? path.join(ROOT, 'index_v12.9.html')
  : path.join(ROOT, 'index.html');
console.log('Источник контента:', path.relative(ROOT, srcPath));
const SRC_BASENAME = path.basename(srcPath);
const html = fs.readFileSync(srcPath, 'utf8');

// ============================================================
// §4.2 — Демо-состав: конфигурируемая таблица (владелец может
// расширить витрину без правок кода — только эта таблица).
// ============================================================
const DEMO_RULES = {
  phases: [0],                    // фазы целиком (LESSONS)
  psyFrom: 'П1', psyTo: 'П8',     // психология (по num, сквозная нумерация П1–П56)
  extra: ['CRYPTO_LITERACY_EXAM'] // дополнительные структуры в витрине
};

// ============================================================
// Сканер сбалансированных скобок (строки ", ', ` + экранирование).
// Ничего не регексим по строкам — только честный скан (§5.2).
// ============================================================
function findDecl(name) {
  const i = html.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error(`${name}: объявление 'const ${name} =' не найдено`);
  for (let j = i + (`const ${name} =`).length; j < html.length; j++) {
    const ch = html[j];
    if (ch === '[' || ch === '{') return { declStart: i, litStart: j, open: ch };
    if (ch === ';') throw new Error(`${name}: после 'const ${name} =' нет литерала`);
  }
  throw new Error(`${name}: не найдено начало литерала`);
}

function grabLiteral(name) {
  const { declStart, litStart, open } = findDecl(name);
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = null, esc = false;
  for (let j = litStart; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[' || ch === '{' || ch === '(') depth++;
    if (ch === ']' || ch === '}' || ch === ')') { depth--; if (depth === 0) return { declStart, src: html.slice(litStart, j + 1) }; }
  }
  throw new Error(`${name}: не найдена закрывающая скобка ${close}`);
}

function evalStructure(name) {
  const { declStart, src } = grabLiteral(name);
  try {
    return { declStart, value: new Function('return ' + src)() };
  } catch (e) {
    throw new Error(`${name}: ошибка вычисления — ${e.message}`);
  }
}

// FT-блок (§4.1): const FT=[]; + function ft(...) + 27 вызовов — НЕ плоский массив.
// Вырезаем ТОЛЬКО ft-часть (объявление + 27 вызовов): после них в исходнике идут патчи
// (лаборатории V11_FT_LABS → FT, виджеты attachOrder → LESSONS) — они остаются в движке
// и в рантайме применяются к регистрам ровно как в v12.9. Пак хранит «сырые» уроки FT.
function ftPartSpan() {
  const start = html.indexOf('const FT=[];');
  if (start < 0) throw new Error('FT: маркер \'const FT=[];\' не найден');
  const end = html.indexOf('const ACADEMY_UPGRADE', start);
  if (end < 0) throw new Error('FT: маркер \'const ACADEMY_UPGRADE\' не найден');
  // конец ft-части = конец последнего вызова ft(...) с балансировкой скобок
  let last = -1; // абсолютный индекс '(' последнего вызова
  for (const m of html.slice(start, end).matchAll(/^\s*ft\(/gm)) last = start + m.index + m[0].length - 1;
  if (last < 0) throw new Error('FT: вызовы ft() не найдены');
  let depth = 0, inStr = null, esc = false, i = last; // скан начинается ровно на '('
  for (; i < end; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth === 0) break; }
  }
  const semi = html.indexOf(';', i);
  if (semi < 0 || semi > end) throw new Error('FT: не найден терминатор последнего вызова ft()');
  return { start, end: semi + 1, block: html.slice(start, semi + 1) };
}

function evalFTBlock() {
  const { block } = ftPartSpan();
  const calls = (block.match(/^\s*ft\(/gm) || []).length;
  if (calls !== 27) throw new Error(`FT: вызовов ft() = ${calls}, ожидалось 27`);
  try {
    return new Function(block + '\n;return FT;')();
  } catch (e) {
    throw new Error(`FT: ошибка исполнения блока — ${e.message}`);
  }
}

const fail = (name, fact, expect) => {
  console.error(`\n✗ ЦЕЛОСТНОСТЬ НАРУШЕНА: ${name}`);
  console.error(`  факт: ${fact}`);
  console.error(`  ожидалось: ${expect}`);
  console.error('  Сборка остановлена (§22: данные не «чинятся» — чинится источник).');
  process.exit(1);
};
const expectEq = (name, fact, expect) => { if (fact !== expect) fail(name, fact, expect); };

// ============================================================
// Извлечение (§4.1)
// ============================================================
console.log('Извлечение структур из ' + SRC_BASENAME + '…');
const warnings = [];

const lessons = evalStructure('LESSONS').value;
const mathLessons = evalStructure('MATH_LESSONS_SOURCE').value;
const psy1 = evalStructure('PSY_LESSONS').value;
const psy2 = evalStructure('PSY_LESSONS_2').value;
const vibe = evalStructure('VIBECODING_LESSONS').value;
const v4 = evalStructure('V4_CONTENT_LESSONS').value;
const terms = evalStructure('TERMS_RAW').value;
const phaseTests = evalStructure('PHASE_TESTS').value;
const mathTests = evalStructure('MATH_TESTS').value;
const quizPsy = evalStructure('QUIZ_PSY').value;
const psyCum = evalStructure('PSY_CUMULATIVE_QUESTIONS').value;
const drill = evalStructure('PSY_SITUATIONAL_DRILL').value;
const capstone = evalStructure('CAPSTONE_EXAM').value;
const literacy = evalStructure('CRYPTO_LITERACY_EXAM').value;
const earning = evalStructure('EARNING_METHODS').value;
const books = evalStructure('BOOKS').value;
const quizData = evalStructure('QUIZ_DATA').value;
const quizLegal = evalStructure('QUIZ_LEGAL').value;
const quizCalc = evalStructure('QUIZ_CALC').value;
const quizCases = evalStructure('QUIZ_CASES').value;
const labs = evalStructure('V11_FT_LABS').value;
const ft = evalFTBlock();

// --- проверки целостности (§4.1 / §21) ---
const byPhase = {};
lessons.forEach(l => { byPhase[l.phase] = (byPhase[l.phase] || 0) + 1; });
const phaseSeq = lessons.map(l => l.phase).join(',');
expectEq('LESSONS.length', lessons.length, 76);
expectEq('LESSONS по фазам', JSON.stringify(byPhase), JSON.stringify({ 0: 20, 1: 12, 2: 6, 3: 6, 4: 9, 5: 7, 6: 16 }));
if (lessons.map(l => l.phase).some((p, i, a) => i && p < a[i - 1])) {
  fail('LESSONS: фазы не в неубывающем порядке', 'порядок нарушен', '0,0,…,6 — concat паков демо+p1..p6 восстановит исходный порядок');
}
expectEq('MATH_LESSONS_SOURCE.length', mathLessons.length, 48);

const psy = [...psy1, ...psy2];
expectEq('PSY (PSY_LESSONS+PSY_LESSONS_2).length', psy.length, 56);
const psyNums = psy.map(l => l.num);
for (let i = 0; i < 56; i++) {
  if (psyNums[i] !== `П${i + 1}`) fail('Психология: нумерация', `позиция ${i} = ${psyNums[i]}`, `П${i + 1} (сплошная П1–П56)`);
}
expectEq('PSY_LESSONS.length (до П26)', psy1.length, 26);
expectEq('PSY_LESSONS_2.length (П27–П56)', psy2.length, 30);

expectEq('VIBECODING_LESSONS.length', vibe.length, 4);
expectEq('V4_CONTENT_LESSONS.length', v4.length, 2);
expectEq('Академия Freqtrade (FT).length', ft.length, 27);
expectEq('FT: phase у всех = 9', ft.filter(l => l.phase === 9).length, 27);
const ftNums = ft.map(l => l.num);
const ftExpect = [...Array.from({ length: 20 }, (_, i) => `FT-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `FAI-${String(i + 1).padStart(2, '0')}`)];
if (JSON.stringify(ftNums) !== JSON.stringify(ftExpect)) {
  fail('FT: порядок/состав num (id внутри — ft01/FAI-07)', ftNums.join(','), ftExpect.join(','));
}
expectEq('V11_FT_LABS (лаборатории)', Object.keys(labs).length, 27);

// Инвариант сумм — ГЛАВНАЯ проверка (§4.1)
const totalLessons = lessons.length + mathLessons.length + psy.length + vibe.length + v4.length + ft.length;
expectEq('ИТОГО уроков (76+48+56+4+2+27)', totalLessons, 213);

expectEq('TERMS_RAW.length', terms.length, 301);
expectEq('PHASE_TESTS.length', phaseTests.length, 6);
const phaseQ = phaseTests.map(t => t.questions?.length).join(',');
expectEq('PHASE_TESTS вопросы (ф0–5)', phaseQ, '25,12,10,12,12,12');
expectEq('MATH_TESTS.length', mathTests.length, 3);
expectEq('QUIZ_PSY.length', quizPsy.length, 160);
expectEq('PSY_CUMULATIVE_QUESTIONS.length', psyCum.length, 21);
expectEq('CAPSTONE_EXAM.questions', capstone.questions?.length, 30);
expectEq('CRYPTO_LITERACY_EXAM.questions', literacy.questions?.length, 25);
expectEq('EARNING_METHODS.length', earning.length, 20);

// BOOKS: спека §4.1 говорила «15 книг», факт источника — 10 (сверено сканером 01.09.2026).
// Источник истины — файл v12.9 (§0). Инвариант прибит к ФАКТУ; при изменении — падение.
if (books.length !== 10) {
  warnings.push(`BOOKS: книг = ${books.length} (было 10 в v12.9; спека §4.1 упоминала 15 — расхождение зафиксировано в Стадии 1)`);
}
expectEq('BOOKS.length (факт v12.9)', books.length, 10);

// у всех уроков квиз непустой (§4.1: «v12.9: квиз есть у всех»)
const allLessons = [...lessons, ...mathLessons, ...psy, ...vibe, ...v4, ...ft];
const noQuiz = allLessons.filter(l => !l.quiz || (Array.isArray(l.quiz) ? l.quiz.length === 0 : Object.keys(l.quiz).length === 0));
if (noQuiz.length) warnings.push(`Уроков без квиза: ${noQuiz.length} (${noQuiz.slice(0, 5).map(l => l.id).join(', ')}…) — по §4.1 ожидалось 0`);

// id уникальны
const idSet = new Set(allLessons.map(l => l.id));
if (idSet.size !== allLessons.length) fail('id уроков', `неуникальных: ${allLessons.length - idSet.size}`, 'все id уникальны');

// ============================================================
// Сборка паков (§4.2). Формат: { meta, registers: { ИМЯ_РЕГИСТРА: значение } }
// Клиент собирает регистры из паков по манифесту (порядок concat — в manifest.registers).
// ============================================================
const pack = (name, demo, registers) => ({
  meta: { name, demo, locale: 'ru', generated: new Date().toISOString().slice(0, 10), source: SRC_BASENAME },
  registers
});

const psyFromIdx = psyNums.indexOf(DEMO_RULES.psyFrom);
const psyToIdx = psyNums.indexOf(DEMO_RULES.psyTo);
if (psyFromIdx < 0 || psyToIdx < 0 || psyToIdx < psyFromIdx) fail('DEMO_RULES.psy', `${DEMO_RULES.psyFrom}–${DEMO_RULES.psyTo}`, 'существующие номера П1–П56');
const psyDemo = psy.slice(psyFromIdx, psyToIdx + 1);          // П1–П8
const psyPaidTail = psy.slice(psyToIdx + 1);                   // П9–П56 (платный хвост)
const psyNum = l => parseInt(String(l.num).replace(/\D/g, ''), 10); // П9 → 9 (НЕ строковое сравнение)

const packs = [];
packs.push(pack('core_demo', true, {
  LESSONS: lessons.filter(l => DEMO_RULES.phases.includes(l.phase)),
  PSY_LESSONS: psyDemo,
  CRYPTO_LITERACY_EXAM: literacy
}));
for (let ph = 1; ph <= 6; ph++) {
  const reg = { LESSONS: lessons.filter(l => l.phase === ph) };
  if (ph === 6) { reg.VIBECODING_LESSONS = vibe; reg.V4_CONTENT_LESSONS = v4; }
  packs.push(pack(`core_p${ph}`, false, reg));
}
packs.push(pack('core_p7', false, { MATH_LESSONS_SOURCE: mathLessons }));
packs.push(pack('core_p8', false, { PSY_LESSONS: psyPaidTail.filter(l => psyNum(l) <= 26), PSY_LESSONS_2: psyPaidTail.filter(l => psyNum(l) > 26) }));
packs.push(pack('core_p9', false, { FT: ft, V11_FT_LABS: labs }));
packs.push(pack('terms', false, { TERMS_RAW: terms }));
packs.push(pack('tests', false, { PHASE_TESTS: phaseTests, MATH_TESTS: mathTests, CAPSTONE_EXAM: capstone, PSY_CUMULATIVE_QUESTIONS: psyCum }));
packs.push(pack('quizbanks', false, { QUIZ_PSY: quizPsy, QUIZ_DATA: quizData, QUIZ_LEGAL: quizLegal, QUIZ_CALC: quizCalc, QUIZ_CASES: quizCases, PSY_SITUATIONAL_DRILL: drill }));
packs.push(pack('earning', true, { EARNING_METHODS: earning }));
packs.push(pack('books', true, { BOOKS: books }));

// целостность раскладки: сумма регистров = суммам источников
expectEq('Раскладка LESSONS (демо p0 + p1..p6)',
  packs[0].registers.LESSONS.length + packs.slice(1, 7).reduce((s, p) => s + p.registers.LESSONS.length, 0), 76);
expectEq('Раскладка PSY (демо П1–П8 + p8 хвост)', packs[0].registers.PSY_LESSONS.length + packs[8].registers.PSY_LESSONS.length + packs[8].registers.PSY_LESSONS_2.length, 56);

// Регистры → манифест: какие паки и в каком порядке собирают каждый регистр (§5.2)
const REGISTERS = {
  LESSONS:                  { packs: ['core_demo', 'core_p1', 'core_p2', 'core_p3', 'core_p4', 'core_p5', 'core_p6'], kind: 'array' },
  PSY_LESSONS:              { packs: ['core_demo', 'core_p8'], kind: 'array' },
  PSY_LESSONS_2:            { packs: ['core_p8'], kind: 'array' },
  MATH_LESSONS_SOURCE:      { packs: ['core_p7'], kind: 'array' },
  VIBECODING_LESSONS:       { packs: ['core_p6'], kind: 'array' },
  V4_CONTENT_LESSONS:       { packs: ['core_p6'], kind: 'array' },
  FT:                       { packs: ['core_p9'], kind: 'array' },
  V11_FT_LABS:              { packs: ['core_p9'], kind: 'object' },
  TERMS_RAW:                { packs: ['terms'], kind: 'array' },
  PHASE_TESTS:              { packs: ['tests'], kind: 'array' },
  MATH_TESTS:               { packs: ['tests'], kind: 'array' },
  CAPSTONE_EXAM:            { packs: ['tests'], kind: 'object' },
  PSY_CUMULATIVE_QUESTIONS: { packs: ['tests'], kind: 'array' },
  QUIZ_PSY:                 { packs: ['quizbanks'], kind: 'array' },
  QUIZ_DATA:                { packs: ['quizbanks'], kind: 'array' },
  QUIZ_LEGAL:               { packs: ['quizbanks'], kind: 'array' },
  QUIZ_CALC:                { packs: ['quizbanks'], kind: 'array' },
  QUIZ_CASES:               { packs: ['quizbanks'], kind: 'array' },
  PSY_SITUATIONAL_DRILL:    { packs: ['quizbanks'], kind: 'array' },
  EARNING_METHODS:          { packs: ['earning'], kind: 'array' },
  CRYPTO_LITERACY_EXAM:     { packs: ['core_demo'], kind: 'object' },
  BOOKS:                    { packs: ['books'], kind: 'array' }
};

// ============================================================
// Версии, brotli-бюджет, дифф (§4.3)
// ============================================================
const overBudget = [];
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const manifestPath = path.join(SAAS, 'content', 'manifest.json');
const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
const prevByName = new Map((prev?.packs || []).map(p => [p.name, p]));

const entries = packs.map(p => {
  const raw = Buffer.from(JSON.stringify(p));
  const br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
  if (br.length > 150 * 1024) overBudget.push(p.meta.name);
  return { name: p.meta.name, data: p, raw, br, hash: sha(raw).slice(0, 12) };
});

let changed = 0;
console.log('\nПаки (бюджет ≤150 КБ brotli, §4.2):');
for (const e of entries) {
  const old = prevByName.get(e.name);
  const status = !old ? 'новый' : old.version !== e.hash ? 'изменён' : 'без изменений';
  if (status !== 'без изменений') changed++;
  const ok = e.br.length <= 150 * 1024;
  console.log(`  ${ok ? '✓' : '⚠'} ${e.name}: ${(e.raw.length / 1024).toFixed(0)} КБ raw → ${(e.br.length / 1024).toFixed(1)} КБ brotli · ${status}`);
}

// запись паков (только изменившиеся/новые — честные mtime)
for (const e of entries) {
  if (prevByName.get(e.name)?.version === e.hash) continue;
  fs.writeFileSync(path.join(OUT, `${e.name}.json`), e.raw);
}

// манифест: версия = хэш всех хэшей паков
const packMeta = entries.map(e => ({
  name: e.name, demo: e.data.meta.demo === true,
  version: e.hash, bytes: e.raw.length, brotli_bytes: e.br.length
}));
const version = 'ru.' + sha(Buffer.from(packMeta.map(p => p.version).join('|'))).slice(0, 8);
const manifest = {
  version, locale: 'ru', generated: new Date().toISOString(),
  source: SRC_BASENAME, registers: REGISTERS, packs: packMeta
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

if (prev && prev.version === version) {
  console.log('\nКонтент не изменился (версия ' + version + ').');
} else {
  console.log(`\nМанифест: ${version}` + (prev ? ` (было ${prev.version}; изменённых паков: ${changed})` : ' (первая генерация)'));
  console.log('Далее: npm run content:update — паки и манифест в R2/KV (без передеплоя воркера, §4.4).');
}

// ============================================================
// Отчёт (§4.4): числа по фазам, термины, банки, предупреждения
// ============================================================
const phaseSummary = {};
allLessons.forEach(l => { phaseSummary[l.phase] = (phaseSummary[l.phase] || 0) + 1; });
console.log('\nОТЧЁТ:');
console.log('  Уроков всего:', allLessons.length, '| по фазам:', JSON.stringify(phaseSummary));
console.log('  Демо-уроков (Ф0 + ' + DEMO_RULES.psyFrom + '–' + DEMO_RULES.psyTo + '):', packs[0].registers.LESSONS.length + psyDemo.length);
console.log('  Терминов:', terms.length, '| Банков тестов:', phaseTests.length + mathTests.length, '| QUIZ_PSY:', quizPsy.length);
console.log('  CAPSTONE:', capstone.questions.length, 'вопросов | literacy:', literacy.questions.length, '| EARNING:', earning.length, '| BOOKS:', books.length);
if (warnings.length) {
  console.log('\nПРЕДУПРЕЖДЕНИЯ:');
  warnings.forEach(w => console.log('  ⚠ ' + w));
}

if (overBudget.length) {
  console.error('\nБЮДЖЕТ НАРУШЕН (≤150 КБ brotli): ' + overBudget.join(', '));
  process.exit(1);
}
