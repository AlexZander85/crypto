import zipfile
import re

epub_path = r"D:\b4x\психология\Mogilat_Dobro-pozhalovat-v-tilt-Psihologiya-ruchnogo-treydinga.881958.epub"

with zipfile.ZipFile(epub_path, 'r') as z:
    for i in range(14):
        name = f"content{i}.html"
        raw = z.read(name).decode("utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", raw)
        text = re.sub(r"\s+", " ", text).strip()
        lines = [line.strip() for line in raw.split("\n") if line.strip()]
        title_candidates = []
        for l in lines[:30]:
            clean = re.sub(r"<[^>]+>", "", l).strip()
            if clean and len(clean) < 100:
                title_candidates.append(clean)
        print(f"\n==================== {name} ({len(text)} chars) ====================")
        for t in title_candidates[:5]:
            print("  •", t)
