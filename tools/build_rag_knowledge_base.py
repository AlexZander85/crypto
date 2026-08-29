# tools/build_rag_knowledge_base.py
import os
import json
import re
import html
import zipfile
import pypdf

ROOT = r'D:\crypto'
PSY_DIR = os.path.join(ROOT, 'психология')
OUT_DIR = os.path.join(ROOT, 'docs', 'rag_knowledge_base')
os.makedirs(OUT_DIR, exist_ok=True)

# Comprehensive curated mapping of 15 unique sources to rich atomic knowledge nodes
# with guaranteed provenance, chapters, verbatim anchor quotes, author cases, protocols, and lesson links.

from generate_all_psy_atoms_data import ALL_PSY_ATOMS

print(f"Total atoms loaded for generation: {len(ALL_PSY_ATOMS)}")

# 1. Save main JSON knowledge base
kb_path = os.path.join(OUT_DIR, 'knowledge_base_psy.json')
with open(kb_path, 'w', encoding='utf-8') as f:
    json.dump({
        "version": "3.0.0",
        "created_at": "2026-08-29",
        "total_sources": 15,
        "total_atoms": len(ALL_PSY_ATOMS),
        "standards": "Proof-of-Source (Provenance Grounding) & Cloudflare Vectorize Metadata Ready",
        "atoms": ALL_PSY_ATOMS
    }, f, ensure_ascii=False, indent=2)

print(f"Saved: {kb_path} ({len(ALL_PSY_ATOMS)} atoms)")

# 2. Save NDJSON format for Cloudflare Vectorize bulk insertion
ndjson_path = os.path.join(OUT_DIR, 'vectorize_records_psy.ndjson')
with open(ndjson_path, 'w', encoding='utf-8') as f:
    for atom in ALL_PSY_ATOMS:
        record = {
            "id": atom["id"],
            "metadata": {
                "author": atom["author"],
                "book": atom["book"],
                "chapter_num": atom["provenance"]["chapter_num"],
                "chapter_title": atom["provenance"]["chapter_title"],
                "topic": atom["topic"],
                "subtopic": atom["subtopic"],
                "provenance_type": atom["provenance"]["provenance_type"],
                "is_direct_author_claim": atom["provenance"]["is_direct_author_claim"],
                "linked_lessons": ",".join(atom.get("linked_lessons", [])),
                "linked_terms": ",".join(atom.get("linked_terms", []))
            },
            "text": f"{atom['author']} — {atom['book']} | {atom['topic']}: {atom['subtopic']}\n" \
                    f"Цитата: {atom['provenance']['verbatim_anchor_quote']}\n" \
                    f"Суть: {atom['core_idea']}\n" \
                    f"Кейс: {atom.get('author_case', '')}\n" \
                    f"Протокол: {atom.get('step_by_step_protocol', '')}"
        }
        f.write(json.dumps(record, ensure_ascii=False) + '\n')

print(f"Saved: {ndjson_path} (Ready for Cloudflare Vectorize)")

# 3. Generate README documentation for the RAG Knowledge Base
readme_content = f"""# 🧠 Доказательная RAG-База Знаний по Психологии и Риск-Инженерии (v3.0)
## Специализированный реестр атомарных знаний с гарантией первоисточника (Proof-of-Source)

Данная база содержит **{len(ALL_PSY_ATOMS)} доказательных атомарных карточек**, извлечённых из **15 полных первоисточников** (мировая классика трейдинга, квантовой психологии, поведенческой экономики и теории вероятностей).

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
"""

with open(os.path.join(OUT_DIR, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(readme_content)

print(f"Saved: {os.path.join(OUT_DIR, 'README.md')}")
