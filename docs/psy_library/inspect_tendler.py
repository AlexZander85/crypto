import zipfile
import re

epub_path = r"D:\b4x\психология\The Mental Game of Trading_ A System for Solving Problems -- Jared Tendler -- New York, NY, 2021 -- JT Press -- isbn13 9781734030914 -- faa716bacdde7ac8799a68a5f2384bff -- Anna’s Archive.epub"

with zipfile.ZipFile(epub_path, 'r') as z:
    for name in ['OEBPS/chap01.html', 'OEBPS/chap02.html', 'OEBPS/chap03.html', 'OEBPS/chap04.html', 'OEBPS/chap05.html', 'OEBPS/chap06.html', 'OEBPS/chap07.html', 'OEBPS/chap08.html', 'OEBPS/chap09.html', 'OEBPS/chap10.html']:
        raw = z.read(name).decode('utf-8', errors='ignore')
        # Find all tags like <p class="...">
        headers = re.findall(r'<p[^>]*class=["\']([^"\']+)["\'][^>]*>(.*?)</p>', raw)
        print(f"\n==================== {name} ====================")
        for cls, txt in headers:
            if any(k in cls.lower() for k in ['head', 'title', 'sub', 'chap']):
                clean_txt = re.sub(r'<[^>]+>', '', txt).strip()
                if clean_txt:
                    print(f"[{cls}] {clean_txt}")
