# tools/extract_donnelly_sections.py
import pypdf
import os

PDF_PATH = r"D:\b4x\психология\Donnelli_Alfa-treyder.837358.pdf"
reader = pypdf.PdfReader(PDF_PATH)

def get_text_range(start_page, end_page):
    res = ""
    for p in range(start_page - 1, min(end_page, len(reader.pages))):
        res += f"\n--- Page {p+1} ---\n" + (reader.pages[p].extract_text() or "")
    return res

# Extract key chapters:
# 1. Kryptonite (167-190)
kryptonite = get_text_range(167, 185)
with open(r"d:\crypto\tools\donnelly_kryptonite.txt", "w", encoding="utf-8") as f:
    f.write(kryptonite)

# 2. Heuristics & Biases (191-225)
biases = get_text_range(191, 215)
with open(r"d:\crypto\tools\donnelly_biases.txt", "w", encoding="utf-8") as f:
    f.write(biases)

# 3. Microstructure & Narrative (289-335)
micro = get_text_range(289, 310)
with open(r"d:\crypto\tools\donnelly_micro.txt", "w", encoding="utf-8") as f:
    f.write(micro)

# 4. Lifecycle of a Trade (419-450)
lifecycle = get_text_range(419, 445)
with open(r"d:\crypto\tools\donnelly_lifecycle.txt", "w", encoding="utf-8") as f:
    f.write(lifecycle)

# 5. Appendix B: 21 ways to succeed & 13 ways to fail (523-528)
appendix = get_text_range(523, 528)
with open(r"d:\crypto\tools\donnelly_appendix.txt", "w", encoding="utf-8") as f:
    f.write(appendix)

print("Extracted all key sections of Brent Donnelly!")
