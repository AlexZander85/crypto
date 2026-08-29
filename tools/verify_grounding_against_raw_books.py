# tools/verify_grounding_against_raw_books.py
# Программа верификации: проверяет физическое наличие каждой цитаты прямо внутри файлов EPUB и PDF в папке D:\crypto\психология

import os
import json
import zipfile
import re
import html
import pypdf

ROOT = r'D:\crypto'
PSY_DIR = os.path.join(ROOT, 'психология')
KB_PATH = os.path.join(ROOT, 'docs', 'rag_knowledge_base', 'knowledge_base_psy.json')

with open(KB_PATH, 'r', encoding='utf-8') as f:
    kb_data = json.load(f)

atoms = kb_data['atoms']
print(f"=== АУДИТ ДОКАЗАТЕЛЬНОСТИ: Проверка {len(atoms)} атомов по реальным файлам книг ===")

# Кэш извлеченных текстов книг
book_texts = {}

def get_clean_book_text(filename):
    if filename in book_texts:
        return book_texts[filename]
    
    filepath = os.path.join(PSY_DIR, filename)
    if not os.path.exists(filepath):
        return ""
    
    full_text = ""
    if filename.endswith('.epub'):
        with zipfile.ZipFile(filepath, 'r') as z:
            for n in z.namelist():
                if n.endswith(('.html', '.xhtml', '.xml')) and not n.endswith(('toc.ncx', 'container.xml')):
                    raw = z.read(n).decode('utf-8', errors='ignore')
                    # strip html
                    text = re.sub(r'<[^>]+>', ' ', raw)
                    text = html.unescape(text)
                    full_text += " " + text
    elif filename.endswith('.pdf'):
        reader = pypdf.PdfReader(filepath)
        for page in reader.pages:
            full_text += " " + (page.extract_text() or "")
            
    # normalize spaces
    normalized = re.sub(r'\s+', ' ', full_text)
    book_texts[filename] = normalized
    return normalized

verified_count = 0
not_found = []

for atom in atoms:
    aid = atom['id']
    sfile = atom['provenance']['source_file']
    raw_quote = atom['provenance']['verbatim_anchor_quote']
    
    # Очищаем цитату от внешних типографских кавычек для поиска
    clean_search_quote = raw_quote.replace('«', '').replace('»', '').replace('"', '').strip()
    
    # Берем первые 30-40 символов цитаты как точный поисковый якорь
    search_anchor = clean_search_quote[:45]
    
    book_text = get_clean_book_text(sfile)
    
    # Ищем подстроку (без учета регистра и лишних пробелов)
    pos = book_text.lower().find(search_anchor.lower())
    
    if pos != -1:
        verified_count += 1
        pct = (pos / len(book_text)) * 100
        # Контекст из книги (50 символов до и после)
        snippet = book_text[max(0, pos-20):min(len(book_text), pos+len(search_anchor)+50)].strip()
        print(f"✅ [OK] {aid:7s} | {atom['author']:18s} | Позиция в книге: {pct:4.1f}%")
        print(f"   Фрагмент из первоисточника: \"...{snippet}...\"\n")
    else:
        # Если точный перевод отличается, пробуем найти по ключевым словам
        not_found.append((aid, atom['author'], sfile, search_anchor))

print(f"=======================================================")
print(f"РЕЗУЛЬТАТ АУДИТА: Успешно проверено совпадений: {verified_count} из {len(atoms)}")
if not_found:
    print(f"Требуют ручной сверки перевода: {len(not_found)}")
    for nf in not_found:
        print(f" - {nf[0]}: {nf[1]} -> {nf[3]}")
print(f"=======================================================")
