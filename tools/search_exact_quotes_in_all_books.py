# tools/search_exact_quotes_in_all_books.py
import zipfile
import re
import os
import pypdf
import html

PSY_DIR = r'D:\crypto\психология'

def get_text(fname):
    fpath = os.path.join(PSY_DIR, fname)
    if fname.endswith('.epub'):
        with zipfile.ZipFile(fpath, 'r') as z:
            t = ""
            for n in z.namelist():
                if n.endswith(('.html', '.xhtml', '.xml')) and not n.endswith(('toc.ncx', 'container.xml')):
                    raw = z.read(n).decode('utf-8', errors='ignore')
                    raw = re.sub(r'<[^>]+>', ' ', raw)
                    t += " " + html.unescape(raw)
            return re.sub(r'\s+', ' ', t)
    elif fname.endswith('.pdf'):
        reader = pypdf.PdfReader(fpath)
        t = ""
        for page in reader.pages:
            t += " " + (page.extract_text() or "")
        return re.sub(r'\s+', ' ', t)
    return ""

print("--- ИЗВЛЕЧЕНИЕ РЕАЛЬНЫХ СТРОК ИЗ КНИГ В ПАПКЕ D:\\crypto\\психология ---")
for f in os.listdir(PSY_DIR):
    t = get_text(f)
    print(f"Файл: {f[:45]:45s} | Длина текста: {len(t):7d} символов")
