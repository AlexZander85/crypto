# tools/extract_all_real_tocs.py
import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader
import re

sys.stdout.reconfigure(encoding='utf-8')
PSY_DIR = r'D:\crypto\психология'

def inspect_file(fname):
    fpath = os.path.join(PSY_DIR, fname)
    print(f"\n=======================================================")
    print(f"BOOK: {fname}")
    print(f"=======================================================")
    
    if fname.endswith('.epub'):
        with zipfile.ZipFile(fpath, 'r') as z:
            # check ncx
            ncx_files = [n for n in z.namelist() if n.endswith('.ncx')]
            if ncx_files:
                data = z.read(ncx_files[0])
                root = ET.fromstring(data)
                nav_points = root.findall('.//{*}navPoint')
                print(f"NCX Navigation points ({len(nav_points)}):")
                for idx, np in enumerate(nav_points, 1):
                    lbl = np.find('.//{*}text')
                    if lbl is not None and lbl.text:
                        print(f"  {idx:2d}. {lbl.text.strip()}")
                return
            
            # check nav / toc xhtml
            nav_files = [n for n in z.namelist() if 'nav' in n.lower() or 'toc' in n.lower()]
            for nf in nav_files:
                content = z.read(nf).decode('utf-8', errors='ignore')
                headers = re.findall(r'<a[^>]*>([^<]+)</a>', content)
                if headers:
                    print(f"HTML Navigation items ({len(headers)}):")
                    for idx, h in enumerate(headers[:40], 1):
                        print(f"  {idx:2d}. {h.strip()}")
                    return

    elif fname.endswith('.pdf'):
        reader = PdfReader(fpath)
        print(f"PDF Pages: {len(reader.pages)}")
        # Look for Table of Contents in first 20 pages
        for pno in range(min(20, len(reader.pages))):
            text = reader.pages[pno].extract_text()
            if any(w in text.lower() for w in ['contents', 'содержание', 'table of contents']):
                print(f"--- Table of Contents found on Page {pno+1} ---")
                lines = text.split('\n')
                for l in lines:
                    if len(l.strip()) > 3:
                        print(f"  {l.strip()}")

for f in sorted(os.listdir(PSY_DIR)):
    if f.endswith(('.epub', '.pdf')):
        inspect_file(f)
