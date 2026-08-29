// tools/test_rag_engine.mjs
import fs from 'node:fs';
import path from 'node:path';

// 1. Load database
const kbPath = path.resolve('docs/rag_knowledge_base/knowledge_base_psy.json');
const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

// 2. Load engine
import '../saas/public/js/rag_mentor_engine.js';

console.log('--- ТЕСТИРОВАНИЕ ДВИЖКА RAG AI-МЕНТОРА ---');
globalThis.CryptoMentorRAG.load(kbData.atoms);

// Test Query 1: Усреднение убытка
console.log('\n[Тест 1] Запрос ученика: "Хочу усреднить убыточную сделку, чтобы быстрее выйти в ноль"');
const res1 = globalThis.CryptoMentorRAG.buildMentorContext({
  userMessage: "усреднение убытка",
  currentLessonId: "p8_l15"
});

console.log(`Найдено атомов: ${res1.atoms.length}`);
res1.atoms.forEach((a, i) => {
  console.log(`  ${i+1}. [${a.author} / Гл. ${a.provenance.chapter_num}] ${a.topic}: ${a.subtopic}`);
  console.log(`     Цитата: ${a.provenance.verbatim_anchor_quote.slice(0, 70)}...`);
});

if (res1.atoms.length === 0 || !res1.atoms.some(a => a.author.includes('Hougaard') || a.author.includes('Tendler'))) {
  console.error('❌ ОШИБКА: Не найден автор Tom Hougaard для запроса об усреднении!');
  process.exit(1);
} else {
  console.log('✅ Тест 1 пройден успешно!');
}

// Test Query 2: Сократовская подсказка
console.log('\n[Тест 2] Генерация Сократовской подсказки для урока p8_l1');
const hint = globalThis.CryptoMentorRAG.getSocraticHint('p8_l1');
console.log('Подсказка:', hint);

if (!hint.includes('💡')) {
  console.error('❌ ОШИБКА генерации подсказки!');
  process.exit(1);
} else {
  console.log('✅ Тест 2 пройден успешно!');
}

console.log('\n🎉 ВСЕ ТЕСТЫ ДОКАЗАТЕЛЬНОГО RAG ДВИЖКА УСПЕШНО ПРОЙДЕНЫ!');
