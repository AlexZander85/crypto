# tools/test_direct_search.py
import zipfile
import re
import os

PSY_DIR = r'D:\crypto\психология'

# 1. Test Jared Tendler
f_tnd = [f for f in os.listdir(PSY_DIR) if 'Tendler' in f][0]
with zipfile.ZipFile(os.path.join(PSY_DIR, f_tnd), 'r') as z:
    text = ""
    for n in z.namelist():
        if n.endswith(('.html', '.xhtml')):
            text += " " + re.sub(r'<[^>]+>', ' ', z.read(n).decode('utf-8', errors='ignore'))
    
    print("Tendler total text chars:", len(text))
    # Search for "inchworm"
    pos = text.lower().find("inchworm")
    print("Tendler 'inchworm' position:", pos, "Snippet:", repr(text[pos:pos+150]))
    # Search for "yerkes"
    pos_y = text.lower().find("yerkes")
    print("Tendler 'yerkes' position:", pos_y, "Snippet:", repr(text[pos_y:pos_y+150]))

# 2. Test Tom Hougaard
f_hou = [f for f in os.listdir(PSY_DIR) if 'Hougaard' in f][0]
with zipfile.ZipFile(os.path.join(PSY_DIR, f_hou), 'r') as z:
    text_h = ""
    for n in z.namelist():
        if n.endswith(('.html', '.xhtml')):
            text_h += " " + re.sub(r'<[^>]+>', ' ', z.read(n).decode('utf-8', errors='ignore'))
    
    print("\nHougaard total text chars:", len(text_h))
    pos_dax = text_h.lower().find("78,000")
    if pos_dax == -1: pos_dax = text_h.lower().find("78000")
    if pos_dax == -1: pos_dax = text_h.lower().find("dax")
    print("Hougaard 'dax' position:", pos_dax, "Snippet:", repr(text_h[pos_dax:pos_dax+200]))
