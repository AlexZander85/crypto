# tools/analyze_donnelly.py
import pypdf
import os
import re

PDF_PATH = r"D:\b4x\психология\Donnelli_Alfa-treyder.837358.pdf"

reader = pypdf.PdfReader(PDF_PATH)
num_pages = len(reader.pages)
print(f"Total pages: {num_pages}")

# Extract text from first 25 pages to get Table of Contents
toc_text = ""
for i in range(min(25, num_pages)):
    t = reader.pages[i].extract_text()
    if t:
        toc_text += f"\n--- PAGE {i+1} ---\n" + t

with open(r"d:\crypto\tools\donnelly_toc.txt", "w", encoding="utf-8") as f:
    f.write(toc_text)

print("Saved Table of Contents sample to tools/donnelly_toc.txt")

# Search for key sections and extract summaries across the book
full_outline = []
for i in range(num_pages):
    t = reader.pages[i].extract_text() or ""
    # Look for chapter headers
    for line in t.split("\n"):
        line_clean = line.strip()
        if re.match(r'^(Глава|Часть|Раздел|Введение|Заключение|\d+\.)', line_clean, re.IGNORECASE) and len(line_clean) < 100:
            full_outline.append(f"Page {i+1}: {line_clean}")

with open(r"d:\crypto\tools\donnelly_outline.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(full_outline[:300]))

print(f"Extracted {len(full_outline)} outline items.")
