# tools/search_donnelly_topics.py
import pypdf
import os
import re

PDF_PATH = r"D:\b4x\психология\Donnelli_Alfa-treyder.837358.pdf"
reader = pypdf.PdfReader(PDF_PATH)

search_terms = [
    "Криптонит",
    "Эвристики",
    "Склонность к подтверждению",
    "Неприятие потерь",
    "Микроструктура",
    "Повестка",
    "Нарратив",
    "Позиционирование",
    "Жизненный цикл сделки",
    "21 способ",
    "13 способов",
    "Правило светофора",
    "Управление рисками",
    "Калиброванная уверенность",
    "Самоконтроль",
    "План на день",
    "Пятничная рутина",
    "Шаблоны поведения",
    "Фиксинг",
    "Ордер-флоу"
]

results = {}
for idx, page in enumerate(reader.pages):
    txt = page.extract_text() or ""
    for term in search_terms:
        if term.lower() in txt.lower():
            if term not in results:
                results[term] = []
            results[term].append(idx + 1)

for term, pages in results.items():
    print(f"Term '{term}': found on {len(pages)} pages. First 5 pages: {pages[:5]}")

# Let's extract key text around "Криптонит", "Жизненный цикл сделки", "21 способ"
extract_data = {}
for term in ["Криптонит", "Жизненный цикл сделки", "21 способ", "13 способов"]:
    if term in results and results[term]:
        p = results[term][0]
        extract_data[term] = f"--- Page {p} ---\n" + reader.pages[p-1].extract_text() + "\n" + (reader.pages[p].extract_text() if p < len(reader.pages) else "")

with open(r"d:\crypto\tools\donnelly_extracted_key_pages.txt", "w", encoding="utf-8") as f:
    for k, v in extract_data.items():
        f.write(f"\n==================== {k} ====================\n{v}\n")

print("Saved key extracts to tools/donnelly_extracted_key_pages.txt")
