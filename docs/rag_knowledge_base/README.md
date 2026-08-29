# 🧠 Доказательная RAG-База Знаний по Психологии и Риск-Инженерии (v3.0)
## Специализированный реестр атомарных знаний с гарантией первоисточника (Proof-of-Source)

Данная база содержит **302 доказательных атомарных карточек**, извлечённых из **15 полных первоисточников** (мировая классика трейдинга, квантовой психологии, поведенческой экономики и теории вероятностей).

---

### 🛡️ Стандарт Доказательности (Provenance Schema):
Каждая карточка содержит строгий блок `provenance`:
* `source_file`: Имя оригинального файла книги в `психология/`.
* `chapter_num` и `chapter_title`: Точный номер и название главы первоисточника.
* `section`: Подраздел книги.
* `verbatim_anchor_quote`: Дословная цитата-якорь для поиска через Ctrl+F в оригинале.
* `is_direct_author_claim`: Флаг прямого утверждения автора (`true` / `false`).
* `provenance_type`: `"AUTHOR_PRIMARY_TEXT"` (прямой текст автора), `"CASE_STUDY"` (реальный кейс), `"EXERCISE_PROTOCOL"` (авторский ранбук), `"COURSE_PEDAGOGICAL_ADAPTATION"` (учебная адаптация).

---

### 📚 15 Уникальных Первоисточников:
1. **Jared Tendler** — *The Mental Game of Trading* (2021)
2. **Tom Hougaard** — *Best Loser Wins* (2022)
3. **Mark Douglas** — *Trading in the Zone* (2000)
4. **Brent Donnelly** — *Alpha Trader* (2021)
5. **Mark Minervini** — *Mindset Secrets for Winning* (2019)
6. **Steven Goldstein** — *Mastering the Mental Game of Trading* (2022)
7. **Roman Mogilat** — *Добро пожаловать в тильт* (2023)
8. **Jason Zweig** — *Your Money and Your Brain* (2007)
9. **Brett Steenbarger** — *Trading Psychology 2.0* (2015)
10. **Jack Schwager** — *Unknown Market Wizards* (2020)
11. **Nassim Nicholas Taleb** — *Fooled by Randomness* (2001)
12. **David Spiegelhalter** — *The Art of Uncertainty* (2024)
13. **Alan Edward** — *The Blueprint to Trading Psychology* (2021)
14. **Dr. Daniel Crosby** — *The Soul of Wealth* (2024)
15. **Morgan Housel** — *The Art of Spending Money* (2024/2025)

---

### 📂 Файлы поставки:
* `knowledge_base_psy.json` — Полная JSON-база для локального браузерного движка (`local_rag_engine.js`) и десктопного EXE.
* `vectorize_records_psy.ndjson` — Пакет записей с метаданными для Cloudflare Vectorize (SaaS-версия).
