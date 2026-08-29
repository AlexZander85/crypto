# tools/test_encoding.py
import zipfile
import re
import os

PSY_DIR = r'D:\crypto\психология'
fpath = os.path.join(PSY_DIR, 'Cveyg_Mozg-i-Dengi.712056.epub')

with zipfile.ZipFile(fpath, 'r') as z:
    for name in z.namelist():
        if name.endswith(('.html', '.xhtml', '.xml')):
            raw_bytes = z.read(name)
            # check xml header
            match = re.search(rb'encoding=["\']([^"\']+)["\']', raw_bytes[:200])
            enc = match.group(1).decode('ascii') if match else 'utf-8'
            try:
                decoded = raw_bytes.decode(enc)
                print(f"{name}: declared {enc}, decoded length {len(decoded)}, sample: {repr(decoded[200:300])}")
            except Exception as e:
                print(f"{name}: error with {enc}: {e}")
            break
