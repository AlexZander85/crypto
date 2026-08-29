/**
 * rag_mentor_engine.js — Доказательный движок поиска и маршрутизации RAG для AI-Ментора
 * Реализует:
 * 1. Математически строгий алгоритм Okapi BM25 с расчетом IDF и нормализацией длины документов.
 * 2. Инвертированный индекс по корпусу атомов знаний.
 * 3. Сократовский генератор подсказок (Socratic Hint), глубоко анализирующий контекст вопроса и ошибку ученика.
 */

(function(global) {
  'use strict';

  // Вспомогательная функция нормализации и токенизации (RU / EN)
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2)
      .map(t => {
        // Базовый стемминг окончаний для русского языка
        if (t.length > 5 && /[а-яё]/.test(t)) {
          return t.replace(/(ому|ему|ыми|ыми|ого|его|ых|их|ую|юю|ая|яя|ое|ее|ов|ев|ей|ам|ям|ах|ях|ом|ем|ть|ти|ся|сь)$/, '');
        }
        return t;
      });
  }

  class OkapiBM25Index {
    constructor(k1 = 1.2, b = 0.75) {
      this.k1 = k1;
      this.b = b;
      this.documents = [];
      this.docLengths = [];
      this.avgdl = 0;
      this.invertedIndex = new Map(); // term -> Map(docIndex -> termFrequency)
      this.idf = new Map(); // term -> IDF value
      this.N = 0;
    }

    build(documents) {
      this.documents = documents;
      this.N = documents.length;
      this.docLengths = new Array(this.N).fill(0);
      this.invertedIndex.clear();
      this.idf.clear();

      let totalLength = 0;

      // 1. Построение инвертированного индекса и расчет длин документов
      for (let i = 0; i < this.N; i++) {
        const doc = documents[i];
        // Формируем взвешенный текст документа для индексации
        const weightedText = [
          doc.topic || '',
          doc.topic || '', // double weight for topic
          doc.subtopic || '',
          doc.provenance ? doc.provenance.chapter_title : '',
          doc.provenance ? doc.provenance.verbatim_anchor_quote : '',
          doc.core_idea || '',
          doc.author_case || '',
          (doc.keywords || []).join(' ')
        ].join(' ');

        const tokens = tokenize(weightedText);
        this.docLengths[i] = tokens.length;
        totalLength += tokens.length;

        const termFreqs = new Map();
        for (const token of tokens) {
          termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
        }

        for (const [term, freq] of termFreqs.entries()) {
          if (!this.invertedIndex.has(term)) {
            this.invertedIndex.set(term, new Map());
          }
          this.invertedIndex.get(term).set(i, freq);
        }
      }

      this.avgdl = this.N > 0 ? totalLength / this.N : 0;

      // 2. Расчет истинного Inverse Document Frequency (IDF) по формуле Робертсона-Спарка Джонса
      for (const [term, postingList] of this.invertedIndex.entries()) {
        const df = postingList.size;
        // Стандартный сглаженный IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
        const idfVal = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
        this.idf.set(term, Math.max(idfVal, 0.05)); // нижний порог неотрицательности
      }
    }

    score(queryTokens, options = {}) {
      const { lessonId = null, author = null } = options;
      const scores = new Array(this.N).fill(0);

      for (const token of queryTokens) {
        if (!this.invertedIndex.has(token)) continue;

        const idfVal = this.idf.get(token);
        const postingList = this.invertedIndex.get(token);

        for (const [docIdx, tf] of postingList.entries()) {
          const docLen = this.docLengths[docIdx];
          // Каноническая формула Okapi BM25
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgdl));
          scores[docIdx] += idfVal * (numerator / denominator);
        }
      }

      // Дополнительные метаданные-бусты
      for (let i = 0; i < this.N; i++) {
        if (scores[i] === 0 && !lessonId && !author) continue;

        const doc = this.documents[i];

        // Буст за точное совпадение текущего урока (если есть хоть какое-то релевантное пересечение)
        if (lessonId && doc.linked_lessons && doc.linked_lessons.includes(lessonId)) {
          scores[i] = (scores[i] + 1.5) * 1.4;
        }

        // Буст за автора
        if (author && doc.author.toLowerCase().includes(author.toLowerCase())) {
          scores[i] = (scores[i] + 1.0) * 1.3;
        }
      }

      return scores;
    }
  }

  class CryptoMentorRAG {
    constructor() {
      this.atoms = [];
      this.index = new OkapiBM25Index(1.2, 0.75);
      this.isLoaded = false;
    }

    load(atomsArray) {
      if (Array.isArray(atomsArray)) {
        this.atoms = atomsArray;
        this.index.build(this.atoms);
        this.isLoaded = true;
        console.log(`[CryptoMentorRAG] Успешно проиндексировано ${this.atoms.length} атомов по стандарту Okapi BM25.`);
      }
    }

    /**
     * Полнотекстовый поиск по Okapi BM25 с фильтрацией по метаданным
     */
    search(options = {}) {
      const {
        query = '',
        lessonId = null,
        author = null,
        limit = 3
      } = options;

      if (!this.isLoaded || this.atoms.length === 0) return [];

      const queryTokens = tokenize(query);
      const scores = this.index.score(queryTokens, { lessonId, author });

      const ranked = [];
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > 0) {
          ranked.push({ atom: this.atoms[i], score: scores[i] });
        }
      }

      ranked.sort((a, b) => b.score - a.score);
      return ranked.slice(0, limit).map(r => r.atom);
    }

    /**
     * Формирование строгого системного контекста для LLM (Proof-of-Source Grounding)
     */
    buildMentorContext(options = {}) {
      const {
        userMessage = '',
        currentLessonId = null,
        studentProgress = null
      } = options;

      const relevantAtoms = this.search({
        query: userMessage,
        lessonId: currentLessonId,
        limit: 3
      });

      let contextStr = '### 📚 ПРОВЕРЕННЫЕ ПЕРВОИСТОЧНИКИ (PROOF-OF-SOURCE):\n';

      if (relevantAtoms.length === 0) {
        contextStr += 'Прямых цитат в базе не найдено. Отвечай строго на основе фундаментальной теории вероятностей и правил курса.\n';
      } else {
        relevantAtoms.forEach((a, idx) => {
          contextStr += `\n[Источник #${idx + 1}]\n` +
            `• Автор: ${a.author}\n` +
            `• Книга: «${a.book}», Глава ${a.provenance.chapter_num} («${a.provenance.chapter_title}»)\n` +
            `• Раздел: ${a.provenance.section}\n` +
            `• Дословная цитата: ${a.provenance.verbatim_anchor_quote}\n` +
            `• Суть: ${a.core_idea}\n` +
            `• Разбор кейса: ${a.author_case}\n` +
            `• Операционный протокол: ${a.step_by_step_protocol}\n`;
        });
      }

      if (studentProgress) {
        contextStr += `\n### 👤 КОГНИТИВНЫЙ ПРОФИЛЬ УЧЕНИКА:\n` +
          `• Пройдено уроков: ${studentProgress.completedLessons || '—'}\n` +
          `• Слабые темы: ${studentProgress.weakTopics || 'нет данных'}\n` +
          `• Частые ошибки: ${studentProgress.recentErrors || 'нет'}\n`;
      }

      return {
        promptContext: contextStr,
        atoms: relevantAtoms
      };
    }

    /**
     * Генерация Сократовской подсказки с ПОЛНЫМ анализом вопроса и ошибки ученика
     * @param {Object} context Объект с контекстом: { lessonId, questionContext, studentAnswer, targetConcept }
     */
    getSocraticHint(context) {
      // Поддержка как объекта аргументов, так и строковых параметров
      let lessonId = null;
      let questionContext = '';
      let studentAnswer = '';

      if (typeof context === 'object' && context !== null) {
        lessonId = context.lessonId || null;
        questionContext = context.questionContext || context.question || '';
        studentAnswer = context.studentAnswer || context.userAnswer || '';
      } else if (typeof context === 'string') {
        lessonId = context;
        questionContext = arguments[1] || '';
      }

      // Составляем поисковый запрос, объединяя вопрос задачи и ошибочный ответ ученика
      const queryForHint = [questionContext, studentAnswer].filter(Boolean).join(' ');

      const relevantAtoms = this.search({
        query: queryForHint || 'психология дисциплина риск',
        lessonId: lessonId,
        limit: 2
      });

      if (!relevantAtoms.length) {
        return "💡 Посмотри на всю серию сделок в целом: меняет ли один отдельный исход долгосрочное математическое ожидание?";
      }

      const atom = relevantAtoms[0];
      
      // Формируем многоуровневую Сократовскую подсказку на базе контекста вопроса
      let hintText = `💡 **Наводящий вопрос ментора** (по первоисточнику: *${atom.author} — «${atom.book}»*):\n\n`;

      if (questionContext) {
        hintText += `В вопросе: *«${questionContext.slice(0, 100)}${questionContext.length > 100 ? '...' : ''}»*\n`;
      }

      if (studentAnswer) {
        hintText += `Обрати внимание на свой ответ *«${studentAnswer}»*. В Главе ${atom.provenance.chapter_num} («${atom.provenance.chapter_title}») ${atom.author} указывает:\n`;
      } else {
        hintText += `В Главе ${atom.provenance.chapter_num} («${atom.provenance.chapter_title}») ${atom.author} формулирует ключевой принцип:\n`;
      }

      hintText += `> ${atom.provenance.verbatim_anchor_quote}\n\n`;
      hintText += `❓ **Вопрос для размышления:** Как этот закон помогает переоценить текущий выбор без эмоций?`;

      return hintText;
    }
  }

  global.CryptoMentorRAG = new CryptoMentorRAG();

  // Автозагрузка базы данных при наличии в DOM или глобальной переменной
  if (typeof window !== 'undefined' && typeof window.PSY_RAG_DATABASE !== 'undefined') {
    global.CryptoMentorRAG.load(window.PSY_RAG_DATABASE);
  }
})(typeof window !== 'undefined' ? window : globalThis);
