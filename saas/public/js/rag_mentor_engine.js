/**
 * rag_mentor_engine.js — Доказательный движок поиска и маршрутизации RAG для AI-Ментора
 * Обеспечивает локальный поиск по атомам знаний (BM25 + фильтрация по уроку/авторам)
 * и форматирование доказательных контекстов с защитой от галлюцинаций.
 */

(function(global) {
  class CryptoMentorRAG {
    constructor() {
      this.atoms = [];
      this.isLoaded = false;
    }

    load(atomsArray) {
      if (Array.isArray(atomsArray)) {
        this.atoms = atomsArray;
        this.isLoaded = true;
        console.log(`[CryptoMentorRAG] Успешно загружено ${this.atoms.length} атомов знаний.`);
      }
    }

    /**
     * Поиск релевантных атомов знаний с учетом контекста урока
     */
    search(options = {}) {
      const {
        query = '',
        lessonId = null,
        author = null,
        limit = 3
      } = options;

      if (!this.atoms.length) return [];

      const queryTokens = (query || '').toLowerCase()
        .replace(/[^\w\sа-яё]/gi, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3);

      const scored = this.atoms.map(atom => {
        let score = 0;

        // 1. Бонус за совпадение текущего урока
        if (lessonId && atom.linked_lessons && atom.linked_lessons.includes(lessonId)) {
          score += 25;
        }

        // 2. Бонус за совпадение автора
        if (author && atom.author.toLowerCase().includes(author.toLowerCase())) {
          score += 30;
        }

        // 3. Текстовый скоринг по токенам запроса
        const searchableText = [
          atom.topic,
          atom.subtopic,
          atom.core_idea,
          atom.author_case || '',
          atom.provenance.chapter_title,
          (atom.keywords || []).join(' ')
        ].join(' ').toLowerCase();

        for (const token of queryTokens) {
          if (atom.topic.toLowerCase().includes(token)) score += 15;
          if (atom.subtopic.toLowerCase().includes(token)) score += 10;
          if ((atom.keywords || []).some(k => k.includes(token))) score += 8;
          if (searchableText.includes(token)) score += 4;
        }

        return { atom, score };
      });

      return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.atom);
    }

    /**
     * Формирование строгого системного контекста для LLM (Zero-Hallucination Grounding)
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
            `• Дословная цитата: ${a.provenance.verbatim_anchor_quote}\n` +
            `• Суть: ${a.core_idea}\n` +
            `• Кейс/Практика: ${a.author_case}\n` +
            `• Регламент: ${a.step_by_step_protocol}\n`;
        });
      }

      if (studentProgress) {
        contextStr += `\n### 👤 КОГНИТИВНЫЙ ПРОФИЛЬ УЧЕНИКА:\n` +
          `• Пройдено уроков: ${studentProgress.completedLessons || '—'}\n` +
          `• Слабые темы: ${studentProgress.weakTopics || 'нет данных'}\n` +
          `• Зафиксированные ошибки: ${studentProgress.recentErrors || 'нет'}\n`;
      }

      return {
        promptContext: contextStr,
        atoms: relevantAtoms
      };
    }

    /**
     * Генерация Сократовской подсказки (Socratic Hint)
     */
    getSocraticHint(lessonId, questionContext) {
      const atoms = this.search({ lessonId: lessonId, limit: 1 });
      if (!atoms.length) {
        return "Посмотри на всю серию сделок в целом: меняет ли один отдельный исход долгосрочное математическое ожидание?";
      }
      const atom = atoms[0];
      return `💡 Наводящий вопрос по методу ${atom.author} («${atom.book}»):\n` +
             `«${atom.provenance.verbatim_anchor_quote}»\n` +
             `Как эта мысль помогает оценить текущую ситуацию?`;
    }
  }

  global.CryptoMentorRAG = new CryptoMentorRAG();

  // Автозагрузка базы данных при наличии в DOM или файле
  if (typeof window !== 'undefined' && typeof window.PSY_RAG_DATABASE !== 'undefined') {
    global.CryptoMentorRAG.load(window.PSY_RAG_DATABASE);
  }
})(typeof window !== 'undefined' ? window : globalThis);
