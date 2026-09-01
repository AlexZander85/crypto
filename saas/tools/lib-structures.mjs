// lib-structures.mjs — общий сканер структур v12.9 (§4.1/§5.2 промта v2.0).
// Используется extract-content.mjs (паки) и build-app.mjs (вырезание контента из движка).
// Техника: сканер сбалансированных скобок с учётом строк (", ', `) и экранирования.
// Ничего не регексим по строкам контента — только честный скан.

export function findDecl(html, name) {
  const i = html.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error(`${name}: объявление 'const ${name} =' не найдено`);
  for (let j = i + (`const ${name} =`).length; j < html.length; j++) {
    const ch = html[j];
    if (ch === '[' || ch === '{') return { declStart: i, litStart: j, open: ch };
    if (ch === ';') throw new Error(`${name}: после 'const ${name} =' нет литерала`);
  }
  throw new Error(`${name}: не найдено начало литерала`);
}

// Возвращает span объявления от 'const NAME' до конца литерала (включая закрывающую скобку).
export function grabLiteralSpan(html, name) {
  const { declStart, litStart, open } = findDecl(html, name);
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
    if (ch === ']' || ch === '}' || ch === ')') {
      depth--;
      if (depth === 0) return { name, declStart, litStart, litEnd: j + 1, src: html.slice(litStart, j + 1) };
    }
  }
  throw new Error(`${name}: не найдена закрывающая скобка ${close}`);
}

export function evalLiteral(name, src) {
  try {
    return new Function('return ' + src)();
  } catch (e) {
    throw new Error(`${name}: ошибка вычисления — ${e.message}`);
  }
}

// FT-блок (§4.1): const FT=[]; + function ft(...) + 27 вызовов ft().
// ВАЖНО: после ft-вызовов в исходнике идут патчи (лаборатории V11_FT_LABS → FT,
// виджеты attachOrder → LESSONS) — они остаются в движке. Span покрывает ТОЛЬКО ft-часть.
export function ftPartSpan(html) {
  const start = html.indexOf('const FT=[];');
  if (start < 0) throw new Error('FT: маркер \'const FT=[];\' не найден');
  const end = html.indexOf('const ACADEMY_UPGRADE', start);
  if (end < 0) throw new Error('FT: маркер \'const ACADEMY_UPGRADE\' не найден');
  let last = -1; // абсолютный индекс '(' последнего вызова
  for (const m of html.slice(start, end).matchAll(/^\s*ft\(/gm)) last = start + m.index + m[0].length - 1;
  if (last < 0) throw new Error('FT: вызовы ft() не найдены');
  let depth = 0, inStr = null, esc = false, i = last; // скан ровно на '('
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
  return { name: 'FT', start, end: semi + 1, src: html.slice(start, semi + 1) };
}

// Полный набор контентных структур + их span'ы в исходнике (§4.1).
// ORDER — в порядке появления в файле не обязательно; span'ы сортируются при вырезании.
export const STRUCTURE_NAMES = [
  'LESSONS', 'MATH_LESSONS_SOURCE', 'PSY_LESSONS', 'PSY_LESSONS_2',
  'VIBECODING_LESSONS', 'V4_CONTENT_LESSONS', 'V11_FT_LABS',
  'TERMS_RAW', 'PHASE_TESTS', 'MATH_TESTS', 'QUIZ_PSY',
  'PSY_CUMULATIVE_QUESTIONS', 'PSY_SITUATIONAL_DRILL',
  'CAPSTONE_EXAM', 'CRYPTO_LITERACY_EXAM', 'EARNING_METHODS', 'BOOKS',
  'QUIZ_DATA', 'QUIZ_LEGAL', 'QUIZ_CALC', 'QUIZ_CASES'
];

// → { values: {NAME: value}, spans: [{name, start, end}] } — span [start,end) вырезается
//   и заменяется на `const NAME = CN_CONTENT.ensure('NAME');`
export function scanStructures(html) {
  const values = {};
  const spans = [];
  for (const name of STRUCTURE_NAMES) {
    const s = grabLiteralSpan(html, name);
    values[name] = evalLiteral(name, s.src);
    spans.push({ name, start: s.declStart, end: s.litEnd });
  }
  const ft = ftPartSpan(html);
  values.FT = new Function(ft.src + '\n;return FT;')();
  spans.push({ name: 'FT', start: ft.start, end: ft.end });
  spans.sort((a, b) => a.start - b.start);
  // пересечения span'ов — ошибка конфигурации
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) throw new Error(`Пересечение span'ов: ${spans[i - 1].name} и ${spans[i].name}`);
  }
  return { values, spans };
}
