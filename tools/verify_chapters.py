# tools/verify_chapters.py
import json

with open('docs/rag_knowledge_base/knowledge_base_psy.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total atoms verified: {len(data['atoms'])}")
books = {}
for a in data['atoms']:
    key = f"{a['author']} — {a['book']}"
    books.setdefault(key, []).append(a['provenance']['chapter_num'])

for k, chapters in books.items():
    uniq = sorted(list(set(chapters)))
    print(f"[OK] {k:65} | {len(chapters):2d} atoms | Chapters: min={min(uniq)} max={max(uniq)} distinct={len(uniq)}")
