# tools/verify_exact_source_passages.py
# Программа доказывает, что каждый автор и его концепция реально присутствуют в исходных файлах

import os
import zipfile
import re
import pypdf
import html
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

PSY_DIR = r'D:\crypto\психология'

BOOKS_MAP = [
    {"author": "Tom Hougaard", "file": "Best Loser Wins_ Why Normal Thinking Never Wins the Trading -- Tom  Hougaard -- Petersfield, Hampshire, 2022 -- Harriman House Ltd -- isbn13 9780857198228 -- 0eb9d5bbbfcfed2a9896b5b241f88b25 -- Anna’s Archive.epub", "queries": ["78,000", "adding to losing", "FTSE"]},
    {"author": "Jared Tendler", "file": "The Mental Game of Trading_ A System for Solving Problems -- Jared Tendler -- New York, NY, 2021 -- JT Press -- isbn13 9781734030914 -- faa716bacdde7ac8799a68a5f2384bff -- Anna’s Archive.epub", "queries": ["Inchworm", "Yerkes", "Mental Hand History"]},
    {"author": "Mark Douglas", "file": "Duglas_Zonalnyy-Treyding-Pobeda-nad-rynkom-blagodarya-uverennosti-discipline-i-nastroyu-na-uspeh.307447.fb2.epub", "queries": ["соевых бобов", "фундаментальные истины", "20 сделок"]},
    {"author": "Brent Donnelly", "file": "Donnelli_Alfa-treyder.837358.pdf", "queries": ["Citibank", "обложк", "15 января 2015"]},
    {"author": "Nassim Taleb", "file": "Taleb_Odurachennye-sluchaynostyu-Skrytaya-rol-shansa-v-biznese-i-zhizni.246383.fb2.epub", "queries": ["Нерон", "рулетка", "LTCM", "ГКО"]},
    {"author": "Brett Steenbarger", "file": "Stinbardzher_Psihologiya-treydinga-Metod-holodnogo-myshleniya-dlya-prinyatiya-resheniy.857680.fb2.epub", "queries": ["SMB Capital", "саберметрик", "резильентност"]},
    {"author": "Mark Minervini", "file": "Mindset Secrets for Winning_ How to Bring Personal Power to -- Mark Minervini -- 1, 2019 -- Access Publishing Group, LLC -- isbn13 9780099630791 -- be73f7b2d4709d8a6e8991ff29dd7766 -- Anna’s Archive.pdf", "queries": ["334%", "fire in the trash", "Investing Championship"]},
    {"author": "Jason Zweig", "file": "Cveyg_Mozg-i-Dengi.712056.epub", "queries": ["дофамин", "прилежащ", "Кнутсон"]},
    {"author": "David Spiegelhalter", "file": "The Art of Uncertainty_ How to Navigate Chance, Ignorance, -- David Spiegelhalter -- PS, 2024 -- Random House -- isbn13 9780241658642 -- e38207079ddaf24ba8687ca80a24b706 -- Anna’s Archive.epub", "queries": ["Brier Score", "Cromwell", "Cambridge"]},
    {"author": "Roman Mogilat", "file": "Mogilat_Dobro-pozhalovat-v-tilt-Psihologiya-ruchnogo-treydinga.881958.epub", "queries": ["тильт", "ноутбук", "ночн"]},
    {"author": "Jack Schwager", "file": "Shvager_Tainstvennye-magi-rynka-Luchshie-treydery-o-kotoryh-vy-nikogda-ne-slyshali.678086.fb2.epub", "queries": ["Шапиро", "COT", "контртренд"]},
    {"author": "Alan Edward", "file": "The Blueprint To Trading Psychology -- Alan Edward , The divergent trader -- 2021 -- f9f2469fbf6b96e462beaa762c64261b -- Anna’s Archive.pdf", "queries": ["habit", "routine", "reward"]},
    {"author": "Steven Goldstein", "file": "Mastering the Mental Game of Trading _ Harnessing the Power -- Steven  Goldstein -- Lightning Source Inc_ (Tier 2), Hampshire, Great Britain, -- isbn13 9781804090077 -- ebd90c863d6121df496bd6a2fa72e3ac -- Anna’s Archive.epub", "queries": ["Credit Suisse", "ego", "Bank of England"]},
    {"author": "Dr. Daniel Crosby", "file": "The Soul of Wealth_ 50 Reflections on Money and Meaning -- Doctor Daniel Crosby -- FR, 2024 -- Harriman House Publishing -- isbn13 9781761566905 -- c3281f2b1dee055f363aba9a561b7dc1 -- Anna’s Archive.epub", "queries": ["willpower", "behavioral", "March 2020"]},
    {"author": "Morgan Housel", "file": "Hauzel_Iskusstvo-tratit-dengi-Prostye-resheniya-dlya-zhizni-polnoy-smysla.847753.fb2.epub", "queries": ["Рональд Рид", "Фускон", "достаточно"]}
]

def load_text(fname):
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

print("=== ВЕРИФИКАЦИЯ 15 ПЕРВОИСТОЧНИКОВ: ПОИСК ДОКАЗАТЕЛЬНЫХ ФАКТОВ В СЫРЫХ ФАЙЛАХ ===\n")

for b in BOOKS_MAP:
    text = load_text(b['file'])
    print(f"Книга: {b['author']} (Файл: {b['file'][:40]}...)")
    for q in b['queries']:
        pos = text.lower().find(q.lower())
        if pos != -1:
            snippet = text[max(0, pos-20):min(len(text), pos+len(q)+60)].replace('\n', ' ').strip()
            print(f"   [OK] '{q}': НАЙДЕНО на {pos/len(text)*100:4.1f}% объема -> \"...{snippet}...\"")
        else:
            print(f"   [ERR] '{q}': НЕ НАЙДЕНО")
    print()
