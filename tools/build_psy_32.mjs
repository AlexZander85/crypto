// tools/build_psy_32.mjs — Генерация и встраивание 32 уроков психологии и 32 интерактивных тренажеров
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const INDEX_V9 = path.join(ROOT, 'index_v9.html');
const SAAS_INDEX = path.join(ROOT, 'saas', 'public', 'index.html');
const EXTRACT_SCRIPT = path.join(ROOT, 'saas', 'tools', 'extract-content.mjs');

console.log('--- Сборщик Академии психологии (32 урока) ---');

// Загружаем готовые модули
const mod1 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_1_NEUROBIOLOGY.md'), 'utf8');
const mod2 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_2_TILT_FEAR_GREED.md'), 'utf8');
const mod3 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_3_PROBABILISTIC_THINKING.md'), 'utf8');
const mod4 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_4_CHAMPION_MINDSET.md'), 'utf8');
const mod5 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_5_HABITS_AND_METRICS.md'), 'utf8');
const mod6 = fs.readFileSync(path.join(ROOT, 'docs', 'psy_curriculum', 'MODULE_6_WEALTH_PHILOSOPHY.md'), 'utf8');

console.log('Модули документации успешно загружены.');
