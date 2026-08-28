# tools/find_missing_psy_terms.py
import json
import os
import re

ROOT = r'D:\crypto'

# 1. Load core_p8.json (all 52 psychology lessons)
with open(os.path.join(ROOT, 'saas', 'content', 'ru', 'core_p8.json'), 'r', encoding='utf-8') as f:
    p8 = json.load(f)
    psy_lessons = p8['lessons']

# 2. Load terms.json or parse TERMS_RAW from index.html
with open(os.path.join(ROOT, 'saas', 'content', 'ru', 'terms.json'), 'r', encoding='utf-8') as f:
    terms_data = json.load(f)
    existing_terms = terms_data.get('terms', [])

existing_t_set = set(t['t'].lower() for t in existing_terms)

print(f"Total existing terms: {len(existing_terms)}")

missing_terms = []
lesson_terms_map = {}

for l in psy_lessons:
    l_id = l['id']
    l_num = l['num']
    l_title = l['title']
    l_terms = l.get('terms', [])
    
    lesson_terms_map[l_num] = []
    
    for term_obj in l_terms:
        if isinstance(term_obj, dict):
            term_ru = term_obj.get('ru', '').strip()
            term_en = term_obj.get('en', '').strip()
        else:
            term_ru = str(term_obj).strip()
            term_en = ''
            
        if not term_ru:
            continue
            
        lesson_terms_map[l_num].append((term_ru, term_en))
        
        # Check if term_ru is in existing terms
        found = False
        for ex in existing_terms:
            if term_ru.lower() in ex['t'].lower() or ex['t'].lower() in term_ru.lower():
                found = True
                break
        if not found:
            missing_terms.append({
                'lesson': f"П{l_num}",
                'lesson_title': l_title,
                'ru': term_ru,
                'en': term_en
            })

print(f"Total terms extracted from 52 psy lessons: {sum(len(v) for v in lesson_terms_map.values())}")
print(f"Total missing terms to generate definitions for: {len(missing_terms)}")

with open(os.path.join(ROOT, 'tools', 'missing_psy_terms.json'), 'w', encoding='utf-8') as f:
    json.dump(missing_terms, f, ensure_ascii=False, indent=2)

for m in missing_terms[:20]:
    print(f"[{m['lesson']}] {m['ru']} ({m['en']}) -> {m['lesson_title']}")
