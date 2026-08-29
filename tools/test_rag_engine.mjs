// tools/test_rag_engine.mjs
import fs from 'node:fs';
import path from 'node:path';

// 1. Load database
const kbPath = path.resolve('docs/rag_knowledge_base/knowledge_base_psy.json');
const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

// 2. Load engine
import '../saas/public/js/rag_mentor_engine.js';

console.log('=== ТЕСТИРОВАНИЕ МАТЕМАТИЧЕСКИ СТРОГОГО OKAPI BM25 И СОКРАТОВСКИХ ПОДСКАЗОК ===');
globalThis.CryptoMentorRAG.load(kbData.atoms);

// Test 1: Полнотекстовый поиск по BM25 (проверка IDF и ранжирования)
console.log('\n[Тест 1] Запрос: "усреднение убыточной позиции DAX"');
const res1 = globalThis.CryptoMentorRAG.search({
  query: "усреднение убыточной позиции DAX",
  limit: 3
});

console.log(`Найдено результатов: ${res1.length}`);
res1.forEach((a, i) => {
  console.log(`  ${i+1}. [${a.author} / Гл. ${a.provenance.chapter_num}] ${a.topic} -> ${a.subtopic}`);
  console.log(`     Цитата: ${a.provenance.verbatim_anchor_quote.slice(0, 80)}...`);
});

const foundHougaard = res1.some(a => a.author.includes('Hougaard'));
if (!foundHougaard) {
  console.error('❌ ОШИБКА: Okapi BM25 не поднял Тома Хоугаарда в топ по запросу DAX/усреднение!');
  process.exit(1);
} else {
  console.log('✅ Тест 1 (Okapi BM25): УСПЕШНО!');
}

// Test 2: Сократовская подсказка с передачей контекста вопроса и ошибки ученика
console.log('\n[Тест 2] Сократовская подсказка с контекстом вопроса и ошибкой:');
const socraticContext = {
  lessonId: "p8_l15",
  questionContext: "Почему нельзя добавлять объем к позиции, когда она идет против нас в минус?",
  studentAnswer: "Чтобы усреднить цену входа и быстрее выйти в безубыток при отскоке"
};

const hint = globalThis.CryptoMentorRAG.getSocraticHint(socraticContext);
console.log('--- РЕЗУЛЬТАТ ПОДСКАЗКИ ---');
console.log(hint);
console.log('---------------------------');

if (!hint.includes('💡') || !hint.includes('Чтобы усреднить цену входа') || !hint.includes('Вопрос для размышления')) {
  console.error('❌ ОШИБКА: Сократовская подсказка не включила контекст вопроса или ошибку ученика!');
  process.exit(1);
} else {
  console.log('✅ Тест 2 (Socratic Hint с контекстом вопроса и ошибкой): УСПЕШНО!');
}

console.log('\n🎉 ВСЕ ТЕСТЫ СТРОГОГО OKAPI BM25 И СОКРАТОВСКОЙ ПЕДАГОГИКИ УСПЕШНО ПРОЙДЕНЫ!');
