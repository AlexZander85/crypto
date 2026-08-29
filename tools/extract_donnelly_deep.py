# tools/extract_donnelly_deep.py
import pypdf
import os
import re

PDF_PATH = r"D:\b4x\психология\Donnelli_Alfa-treyder.837358.pdf"
reader = pypdf.PdfReader(PDF_PATH)

# Let's search for specific chapters and extract summaries
chapters_to_extract = [
    ("Глава 5. Повышение уровня", 85, 166),
    ("Глава 6. Криптонит", 167, 190),
    ("Глава 7. Как умные люди делают глупости", 191, 288),
    ("Глава 8. Понять микроструктуру", 289, 316),
    ("Глава 9. Понимайте повестку (Нарратив)", 317, 344),
    ("Глава 10. Позиционирование и сантимент", 345, 374),
    ("Глава 11. Управление рисками и дисперсия", 375, 418),
    ("Глава 12. Жизненный цикл сделки", 419, 468),
    ("Глава 14. Адаптируйся или умри", 469, 482),
    ("Приложение В. 21 способ успеха и 13 неудач", 520, 528)
]

summary_out = []

for title, start_p, end_p in chapters_to_extract:
    text_chunk = ""
    # Search for actual page index around given page numbers
    for p_idx in range(max(0, start_p - 10), min(len(reader.pages), end_p + 15)):
        txt = reader.pages[p_idx].extract_text() or ""
        if title.split('.')[0] in txt:
            # Found starting page, collect 3-5 key pages
            sample = ""
            for k in range(p_idx, min(len(reader.pages), p_idx + 8)):
                sample += f"\n[P.{k+1}] " + (reader.pages[k].extract_text() or "")[:600]
            text_chunk = sample
            break
    summary_out.append(f"\n==================== {title} ====================\n" + (text_chunk[:2000] if text_chunk else "Not found directly"))

with open(r"d:\crypto\tools\donnelly_deep_summary.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(summary_out))

print("Deep extraction complete -> tools/donnelly_deep_summary.txt")
