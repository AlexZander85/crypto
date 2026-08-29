# tools/test_epub_extractor.py
import zipfile
import re
import html
import os

PSY_DIR = r'D:\crypto\психология'
epub_files = [f for f in os.listdir(PSY_DIR) if f.endswith('.epub')]

def clean_html(raw_html):
    # Remove script and style elements
    text = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', raw_html, flags=re.DOTALL|re.IGNORECASE)
    # Replace block tags with newlines
    text = re.sub(r'<(p|h1|h2|h3|h4|h5|h6|div|li|tr|blockquote)[^>]*>', '\n', text, flags=re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Normalize whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()

for fname in epub_files[:3]:
    fpath = os.path.join(PSY_DIR, fname)
    with zipfile.ZipFile(fpath, 'r') as z:
        html_files = [n for n in z.namelist() if n.endswith(('.html', '.xhtml', '.htm', '.xml')) and not n.endswith('toc.ncx')]
        total_len = 0
        sample = ""
        for hf in html_files:
            raw = z.read(hf).decode('utf-8', errors='ignore')
            cleaned = clean_html(raw)
            total_len += len(cleaned)
            if len(sample) < 500 and len(cleaned) > 100:
                sample = cleaned[:300]
        print(f"File: {fname[:40]}... -> {len(html_files)} chapters, {total_len} chars text.")
        print(f"   Sample: {repr(sample[:100])}...\n")
