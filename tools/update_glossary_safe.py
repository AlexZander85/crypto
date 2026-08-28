# tools/update_glossary_safe.py
import json
import os
import re

ROOT = r'D:\crypto'

# Load psy terms
from build_all_psy_glossary_terms import PSY_GLOSSARY_TERMS

# 1. Update saas/content/ru/terms.json
terms_json_path = os.path.join(ROOT, 'saas', 'content', 'ru', 'terms.json')
with open(terms_json_path, 'r', encoding='utf-8') as f:
    t_data = json.load(f)

existing_terms = t_data.get('terms', [])
existing_names = set(t['t'].lower().strip() for t in existing_terms)

added = 0
for pt in PSY_GLOSSARY_TERMS:
    if pt['t'].lower().strip() not in existing_names:
        existing_terms.append(pt)
        existing_names.add(pt['t'].lower().strip())
        added += 1

t_data['terms'] = existing_terms
with open(terms_json_path, 'w', encoding='utf-8') as f:
    json.dump(t_data, f, ensure_ascii=False, indent=2)

print(f"Updated terms.json: {len(existing_terms)} terms total (+{added})")

# 2. Update HTML files
HTML_FILES = [
    os.path.join(ROOT, 'index_v9.html'),
    os.path.join(ROOT, 'index.html'),
    os.path.join(ROOT, 'saas', 'public', 'index.html')
]

for fpath in HTML_FILES:
    print(f"Processing {os.path.basename(fpath)}...")
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 2.1 Update CATS to include psy
    cats_old = "const CATS = { basics: ['Основы', '#22c55e'], trading: ['Торговля', '#38bdf8'], metrics: ['Метрики', '#a78bfa'], algo: ['Алго-модели', '#fb923c'], risk: ['Риск-менеджмент', '#f43f5e'], ru: ['Право РФ', '#f472b6'], infra: ['Инфраструктура', '#eab308'] };"
    cats_new = "const CATS = { basics: ['Основы', '#22c55e'], trading: ['Торговля', '#38bdf8'], metrics: ['Метрики', '#a78bfa'], algo: ['Алго-модели', '#fb923c'], risk: ['Риск-менеджмент', '#f43f5e'], ru: ['Право РФ', '#f472b6'], infra: ['Инфраструктура', '#eab308'], psy: ['Психология', '#ec4899'] };"
    content = content.replace(cats_old, cats_new)

    # 2.2 Replace TERMS_RAW
    start_tag = 'const TERMS_RAW = ['
    end_tag = 'const TERMS = TERMS_RAW.filter(Boolean);'
    s_idx = content.find(start_tag)
    e_idx = content.find(end_tag, s_idx)
    
    if s_idx == -1 or e_idx == -1:
        print(f"ERROR: could not find TERMS_RAW in {fpath}")
        continue

    json_str = json.dumps(existing_terms, ensure_ascii=False, indent=2)
    new_block = f"const TERMS_RAW = {json_str};\n"
    content = content[:s_idx] + new_block + content[e_idx:]

    # 2.3 Update findTermIndexByName
    old_find_fn = """function findTermIndexByName(name){
  const n = (name || '').toLowerCase();
  let idx = TERMS.findIndex(g => g.t === name || g.t.toLowerCase() === n);
  if(idx < 0){
    const nn = normTermName(name);
    idx = TERMS.findIndex(g => normTermName(g.t) === nn);
  }
  return idx;
}"""

    new_find_fn = """function findTermIndexByName(name){
  if(!name) return -1;
  const n = (name || '').toLowerCase().trim();
  let idx = TERMS.findIndex(g => g.t === name || g.t.toLowerCase() === n);
  if(idx < 0){
    const nn = normTermName(name);
    idx = TERMS.findIndex(g => normTermName(g.t) === nn);
  }
  if(idx < 0){
    idx = TERMS.findIndex(g => g.t.toLowerCase().includes(n) || n.includes(g.t.toLowerCase()));
  }
  if(idx < 0){
    const words = n.split(/[\\s\\(\\)\\[\\],:—\\-]+/).filter(w => w.length >= 4);
    for(let i = 0; i < words.length; i++){
      const w = words[i];
      idx = TERMS.findIndex(g => g.t.toLowerCase().includes(w));
      if(idx >= 0) break;
    }
  }
  return idx;
}"""
    content = content.replace(old_find_fn, new_find_fn)

    # 2.4 Update openTermByName
    old_open_fn = """function openTermByName(name){
  const idx = TERMS.findIndex(x=>x.t.toLowerCase().includes(name.toLowerCase()));
  if(idx!==-1) openTermModal(idx);
}"""
    new_open_fn = """function openTermByName(name){
  const idx = findTermIndexByName(name);
  if(idx!==-1) openTermModal(idx);
}"""
    content = content.replace(old_open_fn, new_open_fn)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {os.path.basename(fpath)}")

print("All done!")
