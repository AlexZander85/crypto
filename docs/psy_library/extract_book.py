import os
import zipfile
import re
import fitz # PyMuPDF

def extract_epub(epub_path):
    chapters = []
    with zipfile.ZipFile(epub_path, 'r') as z:
        html_files = [n for n in z.namelist() if n.endswith(('.html', '.xhtml', '.htm'))]
        for name in sorted(html_files):
            raw = z.read(name).decode('utf-8', errors='ignore')
            text = re.sub(r'<[^>]+>', ' ', raw)
            text = re.sub(r'&nbsp;', ' ', text)
            text = re.sub(r'&amp;', '&', text)
            text = re.sub(r'&lt;', '<', text)
            text = re.sub(r'&gt;', '>', text)
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) > 100:
                chapters.append({'file': name, 'text': text, 'len': len(text)})
    return chapters

def extract_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append({'page': i + 1, 'text': text})
    doc.close()
    return pages
