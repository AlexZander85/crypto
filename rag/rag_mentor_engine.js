/* =========================================================================
   rag_mentor_engine.js v2.2 — Доказательный RAG-движок AI-Ментора (v10.8: Д-1 порог релевантности, Д-4 честные подписи цитат)
   =========================================================================
   Локальный поиск по атомам знаний 15 книг (настоящий BM25 + фильтры
   по уроку/авторам + бонусы слабых зон ученика), Сократовские подсказки,
   офлайн-сборка ответа с цитатами-якорями и защитой от галлюцинаций
   (Strict Zero-Hallucination: «в книгах этого нет»), память ученика.

   Автозагрузка: window.PSY_RAG_DATABASE (массив атомов knowledge_base_psy).
   API:
     CryptoMentorRAG.search({query, lessonId, authors, limit, weakLessons})
     CryptoMentorRAG.buildMentorContext({userMessage, currentLessonId, studentProfile})
     CryptoMentorRAG.composeLocalAnswer(query, currentLessonId)   // офлайн-ответ
     CryptoMentorRAG.getSocraticHint({lessonId, question, step})  // без спойлеров
     CryptoMentorRAG.memory.recordError(lessonId, kind) / recordHint(lessonId)
     CryptoMentorRAG.buildStudentProfile()  // прогресс + слабые уроки + ошибки
   ========================================================================= */
(function(global) {
  'use strict';

  /* ---------- нормализация текста (рус/англ, лёгкий стемминг) ---------- */
  var STOPWORDS = {};
  ['и','или','но','а','что','как','это','эта','этот','того','тоже','весь','для','под','при','про','уже','еще','только','даже','быть','было','был','она','они','мне','меня','тебе','тебя','себя','свой','свою','который','которая','когда','если','чтобы','есть','будет','мой','моя','не','ни','да','же','ли','бы','вот','от','по','за','на','из','до','со','об','во','вы','мы','вы','ты','я','он','оно','их','его','ее','ей','им','них','так','такой','такая','какой','какая','все','всё','чем','том','тем','там','где','куда','почему','зачем','как-то','об','бы'].forEach(function(w){ STOPWORDS[w] = 1; });

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е');
  }
  function tokenize(s) {
    return normalize(s)
      .replace(/[^a-z0-9а-я\s-]/gi, ' ')
      .split(/\s+/)
      .filter(function(t){ return t.length >= 3 && !STOPWORDS[t]; })
      .map(stem);
  }
  /* Лёгкий русский стемминг: срезаем частые окончания, чтобы «стопами»=~«стопам»=~«стопов» */
  function stem(t) {
    if (!/[а-я]/.test(t)) return t;
    return t
      .replace(/(иями|ями|ами|иях|ях|ах|ов|ев|ей|ой|ый|ий|ая|яя|ое|ее|ые|ие|ем|ом|ам|ум|ых|их|ую|юю|ью|ия|ие|ья|ье|ьи|у|ю|а|я|о|е|ы|и|й)$/, '');
  }

  /* ---------- справочники соответствия ---------- */
  var AUTHOR_ALIASES = {
    'тендлер':'Jared Tendler','jared tendler':'Jared Tendler','tendler':'Jared Tendler',
    'хоугаард':'Tom Hougaard','tom hougaard':'Tom Hougaard','hougaard':'Tom Hougaard','хаугаард':'Tom Hougaard',
    'дуглас':'Mark Douglas','mark douglas':'Mark Douglas','douglas':'Mark Douglas',
    'доннелли':'Brent Donnelly','brent donnelly':'Brent Donnelly','donnelly':'Brent Donnelly',
    'талеб':'Nassim Nicholas Taleb','nassim taleb':'Nassim Nicholas Taleb','nassim nicholas taleb':'Nassim Nicholas Taleb','taleb':'Nassim Nicholas Taleb',
    'стинбарджер':'Brett Steenbarger','brett steenbarger':'Brett Steenbarger','steenbarger':'Brett Steenbarger',
    'минервини':'Mark Minervini','mark minervini':'Mark Minervini','minervini':'Mark Minervini',
    'цвейг':'Jason Zweig','jason zweig':'Jason Zweig','zweig':'Jason Zweig',
    'шпигельхалтер':'David Spiegelhalter','дэвид шпигельхалтер':'David Spiegelhalter','david spiegelhalter':'David Spiegelhalter','spiegelhalter':'David Spiegelhalter',
    'могилат':'Roman Mogilat','roman mogilat':'Roman Mogilat','mogilat':'Roman Mogilat',
    'швагер':'Jack Schwager','jack schwager':'Jack Schwager','schwager':'Jack Schwager',
    'эдвард':'Alan Edward','алан эдвард':'Alan Edward','alan edward':'Alan Edward','edward':'Alan Edward','эдвардс':'Alan Edward',
    'голдштейн':'Steven Goldstein','стивен голдштейн':'Steven Goldstein','steven goldstein':'Steven Goldstein','goldstein':'Steven Goldstein',
    'кросби':'Dr. Daniel Crosby','дэниел кросби':'Dr. Daniel Crosby','daniel crosby':'Dr. Daniel Crosby','crosby':'Dr. Daniel Crosby',
    'хаузел':'Morgan Housel','морган хаузел':'Morgan Housel','morgan housel':'Morgan Housel','housel':'Morgan Housel','хаузл':'Morgan Housel'
  };

  /* «П20» / «психология 20» / «p8_l20» / 20 → «ps_l20» */
  function resolveLessonId(id) {
    if (id === null || id === undefined) return null;
    var s = String(id).trim().toLowerCase();
    var m;
    if ((m = s.match(/^ps_l(\d+)$/))) return 'ps_l' + m[1];
    if ((m = s.match(/^(?:p8_l|п|psy_l)(\d+)$/))) return 'ps_l' + m[1];
    if ((m = s.match(/^(\d+)$/))) return 'ps_l' + m[1];
    if (/^ps_l/.test(s)) return s;
    return null;
  }

  /* =========================================================================
     CryptoMentorRAG
     ========================================================================= */
  function CryptoMentorRAG() {
    this.atoms = [];
    this.isLoaded = false;
    this._idx = null;          // поисковый индекс BM25
    this.k1 = 1.2;
    this.b = 0.75;
  }

  CryptoMentorRAG.prototype.load = function(atomsArray) {
    if (!Array.isArray(atomsArray) || !atomsArray.length) return false;
    var resolve = resolveLessonId;
    this.atoms = atomsArray.filter(function(a){
      return a && a.id && a.core_idea && a.provenance;
    }).map(function(a){
      /* защита от обеих схем уроков (p8_lN → ps_lN) */
      if (Array.isArray(a.linked_lessons)) a.linked_lessons = a.linked_lessons.map(function(L){ return resolve(L) || L; });
      return a;
    });
    this._buildIndex();
    this.isLoaded = this.atoms.length > 0;
    try { console.log('[CryptoMentorRAG] Загружено ' + this.atoms.length + ' атомов знаний.'); } catch(e){}
    return this.isLoaded;
  };

  /* ---------- индекс BM25 ---------- */
  CryptoMentorRAG.prototype._fieldText = function(atom) {
    var p = atom.provenance || {};
    return [
      atom.topic || '', atom.subtopic || '', atom.core_idea || '',
      atom.author_case || '', atom.step_by_step_protocol || '',
      atom.author || '', atom.author_ru || '', atom.book || '',
      p.chapter_title || '', p.section || '',
      (atom.keywords || []).join(' '),
      (atom.linked_terms || []).join(' ')
    ].join(' ');
  };
  CryptoMentorRAG.prototype._buildIndex = function() {
    var self = this;
    var docs = this.atoms.map(function(a){ return tokenize(self._fieldText(a)); });
    var df = {};
    var docLen = [];
    docs.forEach(function(toks){
      var seen = {};
      toks.forEach(function(t){ if(!seen[t]){ seen[t] = 1; df[t] = (df[t]||0) + 1; } });
      docLen.push(toks.length);
    });
    var N = docs.length;
    var avgLen = docLen.reduce(function(s, l){ return s + l; }, 0) / (N || 1);
    /* Взвешивание полей реализовано через дублирование ключевых токенов темы/ключевых слов */
    this._idx = { df: df, docLen: docLen, avgLen: avgLen, N: N, docs: docs };
  };
  CryptoMentorRAG.prototype._bm25 = function(queryTokens, i) {
    var idx = this._idx;
    if (!idx) return 0;
    var toks = idx.docs[i];
    if (!toks || !toks.length) return 0;
    var tf = {};
    toks.forEach(function(t){ tf[t] = (tf[t]||0) + 1; });
    var dl = idx.docLen[i];
    var score = 0;
    for (var q = 0; q < queryTokens.length; q++) {
      var t = queryTokens[q];
      var f = tf[t];
      if (!f) continue;
      var df = idx.df[t] || 0;
      var idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));
      var tfNorm = (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / idx.avgLen));
      score += idf * tfNorm;
    }
    return score;
  };

  /* ---------- поиск ---------- */
  CryptoMentorRAG.prototype.search = function(options) {
    options = options || {};
    var query = options.query || '';
    var lessonId = resolveLessonId(options.lessonId);
    var authors = options.authors || (options.author ? [options.author] : null);
    var limit = options.limit || 5;
    var weakLessons = options.weakLessons || null;
    if (!this.atoms.length) return [];

    var qTokens = tokenize(query);
    var authorsNorm = null;
    if (authors && authors.length) {
      authorsNorm = authors.map(function(a){ return AUTHOR_ALIASES[normalize(a)] || a; });
    }

    var scored = [];
    for (var i = 0; i < this.atoms.length; i++) {
      var atom = this.atoms[i];
      var score = this._bm25(qTokens, i);

      /* бонус за связь с текущим уроком */
      var linked = atom.linked_lessons || [];
      if (lessonId && linked.indexOf(lessonId) !== -1) score += 6;
      /* бонус за слабую зону ученика */
      if (weakLessons && weakLessons.length) {
        for (var w = 0; w < weakLessons.length; w++) {
          if (linked.indexOf(weakLessons[w]) !== -1) { score += 2.5; break; }
        }
      }
      /* бонус за автора */
      if (authorsNorm) {
        for (var au = 0; au < authorsNorm.length; au++) {
          if (atom.author === authorsNorm[au]) { score += 4; break; }
        }
      }
      /* фильтр по автору (жёсткий), если явно запрошен */
      if (authorsNorm && authorsNorm.indexOf(atom.author) === -1) continue;
      /* без запроса — показываем только атомы урока */
      if (!qTokens.length && lessonId && linked.indexOf(lessonId) === -1) continue;

      if (score > 0) {
        /* Д-1 v10.8: порог релевантности — слабое совпадение одного токена не считается находкой.
           Без порога любой запрос («борщ», «погода», «фильм») получал found:true — ветка
           Zero-Hallucination «в базе конкретных указаний нет» была недостижима. */
        if (!qTokens.length) {
          scored.push({ atom: atom, score: score });   /* пустой запрос: список атомов урока */
        } else {
          var docToks = (this._idx && this._idx.docs) ? this._idx.docs[i] : null;
          var seenTok = {};
          if (docToks) for (var dt = 0; dt < docToks.length; dt++) seenTok[docToks[dt]] = 1;
          var uniqTok = {}, matched = 0;
          for (var qt = 0; qt < qTokens.length; qt++) {
            var qtok = qTokens[qt];
            if (uniqTok[qtok]) continue;
            uniqTok[qtok] = 1;
            if (seenTok[qtok]) matched++;
          }
          var minTokens = qTokens.length >= 3 ? 2 : 1;   /* в длинном запросе нужно ≥2 совпадений */
          var isLessonAtom = !!(lessonId && linked.indexOf(lessonId) !== -1);
          /* совсем слабый скор без связи с уроком — мимо */
          if (score < 1.5 && !linked.length && !isLessonAtom) matched = 0;
          var pass = isLessonAtom ? (matched >= 1) : (matched >= minTokens);
          if (pass) scored.push({ atom: atom, score: score });
        }
      }
    }

    scored.sort(function(a, b){ return b.score - a.score; });
    return scored.slice(0, limit).map(function(x){ return x.atom; });
  };

  /* ---------- контекст урока (авторы/темы) для маршрутизации ---------- */
  CryptoMentorRAG.prototype.buildLessonContext = function(lessonId, lessonTitle, lessonAuthors) {
    var lid = resolveLessonId(lessonId);
    var authors = (lessonAuthors || []).map(function(a){ return AUTHOR_ALIASES[normalize(a)] || a; });
    var topics = {};
    this.atoms.forEach(function(a){
      if (lid && (a.linked_lessons || []).indexOf(lid) !== -1) {
        topics[a.provenance.chapter_title] = 1;
      }
    });
    return {
      lesson: lid,
      title: lessonTitle || null,
      authors: authors,
      topics: Object.keys(topics).slice(0, 8)
    };
  };

  /* =========================================================================
     Контекст для LLM (Proof-of-Source + Zero-Hallucination)
     ========================================================================= */
  CryptoMentorRAG.prototype.buildMentorContext = function(options) {
    options = options || {};
    var userMessage = options.userMessage || '';
    var lessonId = resolveLessonId(options.currentLessonId);
    var profile = options.studentProfile;
    var limit = options.limit || 4;

    var weak = (profile && profile.weakLessons) || [];
    var atoms = this.search({
      query: userMessage, lessonId: lessonId, limit: limit, weakLessons: weak
    });

    var ctx = '### ДОКАЗАТЕЛЬНАЯ БАЗА ЗНАНИЙ (15 книг по психологии трейдинга, 302 атома)\n';
    ctx += 'ПРАВИЛА (строго):\n';
    ctx += '1. Отвечай ТОЛЬКО на основе приведённых ниже источников и материала курса. Не приписывай авторам того, чего в источниках нет.\n';
    ctx += '2. Цитируя источник, указывай: автор, книга, глава. Цитаты-якоря — пересказ идей по конспектам (quote_verified=false), а не дословные цитаты — не выдавай их за оригинал.\n';
    ctx += '3. Если конкретного ответа в источниках нет — честно скажи: «В базе знаний по этому вопросу конкретных указаний нет», и объясни с позиции математики вероятностей или протоколов курса.\n';
    ctx += '4. Различай позицию автора и учебный протокол курса (помечено case_source: COURSE_EXAMPLE).\n';
    ctx += '5. Давай не лекцию, а адресную подсказку с учётом профиля ученика ниже.\n';

    if (!atoms.length) {
      ctx += '\nПрямых совпадений в базе не найдено. Отвечай аккуратно: общими принципами вероятностей и правилами курса, без ссылок на авторов.\n';
    } else {
      atoms.forEach(function(a, i) {
        var p = a.provenance || {};
        ctx += '\n[Источник #' + (i + 1) + '] id:' + a.id + '\n';
        ctx += '• Автор: ' + (a.author_ru || a.author) + ', «' + a.book + '», глава ' + p.chapter_num + ' «' + p.chapter_title + '»\n';
        /* Д-4 v10.8: честная подпись — пока quote_verified=false, это пересказ, а не дословная цитата */
        ctx += (p.quote_verified === false ? '• Пересказ идеи (не дословная цитата): ' : '• Цитата-якорь: ') + (p.verbatim_anchor_quote || '—') + '\n';
        ctx += '• Суть: ' + a.core_idea + '\n';
        ctx += '• Кейс (' + (a.case_source === 'COURSE_EXAMPLE' ? 'учебный пример курса' : 'из первоисточника') + '): ' + a.author_case + '\n';
        ctx += '• Протокол: ' + a.step_by_step_protocol + '\n';
        if (a.content_note) ctx += '• ⚠ Верификация: ' + a.content_note + '\n';
        if ((a.linked_lessons || []).length) ctx += '• Связанные уроки: ' + a.linked_lessons.join(', ') + '\n';
      });
    }

    if (profile) {
      ctx += '\n### ПРОФИЛЬ УЧЕНИКА:\n';
      ctx += '• Пройдено уроков: ' + (profile.completedLessons != null ? profile.completedLessons : '—') + '\n';
      ctx += '• Слабые уроки (точность ниже 70%): ' + ((profile.weakLessons || []).join(', ') || 'нет данных') + '\n';
      ctx += '• Последние ошибки: ' + ((profile.recentErrors || []).join(' | ') || 'не зафиксированы') + '\n';
      if (profile.currentLessonTitle) ctx += '• Текущий урок: ' + profile.currentLessonTitle + '\n';
    }

    return { promptContext: ctx, atoms: atoms };
  };

  /* =========================================================================
     Офлайн-ответ Ментора (без сети): цитата + суть + протокол
     ========================================================================= */
  CryptoMentorRAG.prototype.composeLocalAnswer = function(query, currentLessonId) {
    var atoms = this.search({ query: query, lessonId: currentLessonId, limit: 3 });
    var q = String(query || '').trim();

    if (!atoms.length) {
      var text = 'Честный ответ: в загруженных конспектах 15 книг по этому вопросу конкретных указаний я не нашёл. ' +
        'Попробуй переформулировать через тему (например: «тильт», «сайзинг после убытков», «серия стопов», «принятие риска»), ' +
        'либо спроси на вкладке другого действия Ментора. По математической стороне — правило курса: оценивай решения по серию (20+ сделок), а не по отдельному исходу.';
      return { text: text, atoms: [], found: false };
    }

    var parts = [];
    parts.push('📚 Отвечаю по доказательной базе (15 книг). ' + (this.atoms.length ? 'Найдено источников: ' + atoms.length + '.' : ''));
    atoms.forEach(function(a, i) {
      var p = a.provenance || {};
      parts.push('\n— Источник ' + (i + 1) + ': ' + (a.author_ru || a.author) + ', «' + a.book + '», глава ' + p.chapter_num + ' «' + p.chapter_title + '»');
      /* Д-4 v10.8: честная подпись источника */
      parts.push((p.quote_verified === false ? 'Пересказ идеи (не дословная цитата): ' : 'Цитата-якорь: ') + (p.verbatim_anchor_quote || '—'));
      parts.push('Суть: ' + a.core_idea);
      if (a.author_case) parts.push((a.case_source === 'COURSE_EXAMPLE' ? 'Учебный пример курса: ' : 'Кейс из первоисточника: ') + a.author_case);
      if (a.step_by_step_protocol) parts.push('Протокол: ' + a.step_by_step_protocol);
      if (a.content_note) parts.push('⚠ Верификация: ' + a.content_note);
      if ((a.linked_lessons || []).length) {
        parts.push('Связанные уроки: ' + a.linked_lessons.map(function(l){ return 'П' + l.replace('ps_l', ''); }).join(', '));
      }
    });
    return { text: parts.join('\n'), atoms: atoms, found: true };
  };

  /* =========================================================================
     Сократовская подсказка (без спойлера ответа)
     ========================================================================= */
  var GENERIC_HINTS = [
    'Посмотри сначала не на отдельный исход, а на всю серию: что именно изменилось в системе между первым и последним решением серии?',
    'Какие данные у тебя есть прямо сейчас, и какие из них — факт, а какие — чувство? Решение стоит принимать только на фактах.',
    'Какой пункт твоего плана выполняется прямо сейчас? Если ответа нет — это само по себе ответ.'
  ];
  CryptoMentorRAG.prototype.getSocraticHint = function(options) {
    options = options || {};
    var lessonId = resolveLessonId(options.lessonId);
    var question = options.question || '';
    var step = options.step || 1;

    var profile = this.buildStudentProfile();
    var atoms = this.search({
      query: question, lessonId: lessonId, limit: 1, weakLessons: profile.weakLessons
    });

    try { this.memory.recordHint(lessonId); } catch(e){}

    if (!atoms.length) {
      return { text: '💡 ' + GENERIC_HINTS[(step - 1) % GENERIC_HINTS.length], atom: null, found: false };
    }
    var a = atoms[0];
    var p = a.provenance || {};
    var authorRu = a.author_ru || a.author;
    if (step <= 1) {
      /* Первый уровень: наводящий вопрос от сути атома, без готового ответа */
      var core = a.core_idea.split('.').slice(0, 2).join('. ');
      return {
        text: '💡 Наводящий вопрос по методу ' + authorRu + ' («' + a.book + '»):\n' +
              'Прежде чем выбрать ответ — ' + core.charAt(0).toLowerCase() + core.slice(1) + '\n' +
              'Как это соотносится с ситуацией в сценарии? Что именно в твоём выборе противоречит этому принципу?',
        atom: a, found: true
      };
    }
    /* Второй уровень: принцип автора + цитата-якорь */
    return {
      text: '💡 Принцип ' + authorRu + ' («' + a.book + '», глава ' + p.chapter_num + ' «' + p.chapter_title + '»):\n' +
            (p.quote_verified === false
              ? 'Пересказ принципа (не дословная цитата): ' + (p.verbatim_anchor_quote || a.core_idea) + '\n'
              : '«' + (p.verbatim_anchor_quote || a.core_idea) + '»\n') +
            'Проверь свой выбор этим принципом и выбери ещё раз.',
      atom: a, found: true
    };
  };

  /* =========================================================================
     Память ученика (localStorage cn_mentor_memory + cn_ps_progress)
     ========================================================================= */
  var MEM_KEY = 'cn_mentor_memory';
  function memLoad() {
    try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}') || {}; } catch(e){ return {}; }
  }
  function memSave(m) {
    try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch(e){}
  }

  CryptoMentorRAG.prototype.memory = {
    recordError: function(lessonId, kind) {
      var m = memLoad();
      m.errors = m.errors || [];
      m.errors.push({ lesson: resolveLessonId(lessonId) || String(lessonId || ''), kind: kind || 'drill', ts: Date.now() });
      if (m.errors.length > 100) m.errors = m.errors.slice(-100);
      memSave(m);
    },
    recordHint: function(lessonId) {
      var m = memLoad();
      m.hints = m.hints || [];
      m.hints.push({ lesson: resolveLessonId(lessonId) || '', ts: Date.now() });
      if (m.hints.length > 100) m.hints = m.hints.slice(-100);
      memSave(m);
    },
    recentErrors: function(n) {
      var m = memLoad();
      var arr = (m.errors || []).slice(-(n || 5)).reverse();
      return arr.map(function(e){
        var d = new Date(e.ts);
        return 'П' + String(e.lesson || '').replace('ps_l', '') + ' (' + d.toLocaleDateString() + ')';
      });
    }
  };

  /* Профиль ученика: прогресс уроков + слабые зоны + последние ошибки */
  CryptoMentorRAG.prototype.buildStudentProfile = function() {
    var completed = 0, weak = [], weakDetails = [];
    try {
      var done = (typeof window !== 'undefined' && window.lessonsDone) || {};
      Object.keys(done).forEach(function(k){ if (done[k] === 1 && /^ps_l/.test(k)) completed++; });
    } catch(e){}
    try {
      var prog = JSON.parse(localStorage.getItem('cn_ps_progress') || '{}') || {};
      /* cn_ps_progress: widget_ps_lN_* → {best,total,passed}; точность лучшей попытки */
      var per = {};
      Object.keys(prog).forEach(function(wid){
        var m = wid.match(/ps_l(\d+)/);
        if (!m) return;
        var lid = 'ps_l' + m[1];
        var rec = prog[wid];
        if (rec && rec.total) {
          var acc = (rec.best || 0) / rec.total;
          if (!per[lid] || acc < per[lid]) per[lid] = acc;
        }
      });
      Object.keys(per).forEach(function(lid){
        if (per[lid] < 0.7) { weak.push(lid); weakDetails.push('П' + lid.replace('ps_l','') + ' (' + Math.round(per[lid]*100) + '%)'); }
      });
    } catch(e){}
    var mem = memLoad();
    var recent = (mem.errors || []).slice(-5).reverse().map(function(e){
      return 'П' + String(e.lesson || '').replace('ps_l', '') + (e.kind === 'hint' ? ' (подсказка)' : ' (ошибка в тренажёре)');
    });
    return {
      completedLessons: completed,
      weakLessons: weak,
      weakDetails: weakDetails,
      recentErrors: recent,
      currentLessonTitle: null
    };
  };

  /* Экспорт */
  var inst = new CryptoMentorRAG();
  inst.resolveLessonId = resolveLessonId;
  inst.AUTHOR_ALIASES = AUTHOR_ALIASES;
  global.CryptoMentorRAG = inst;

  /* Автозагрузка базы, если она уже объявлена */
  if (typeof window !== 'undefined' && window.PSY_RAG_DATABASE) {
    inst.load(window.PSY_RAG_DATABASE);
  }
})(typeof window !== 'undefined' ? window : globalThis);
