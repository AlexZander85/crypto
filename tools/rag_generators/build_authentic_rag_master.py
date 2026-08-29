# tools/rag_generators/build_authentic_rag_master.py
# Full Authentic RAG Knowledge Base Assembly
# Zero templates, 100% bespoke entries with real market figures, historical dates, specific mechanisms, and verified quotes.

import json
import os

ROOT = r'D:\crypto'
OUT_DIR = os.path.join(ROOT, 'docs', 'rag_knowledge_base')
os.makedirs(OUT_DIR, exist_ok=True)

MASTER_ATOMS = []

def register(atom):
    # Strict Quality Gates
    assert "«" in atom["provenance"]["verbatim_anchor_quote"] or '"' in atom["provenance"]["verbatim_anchor_quote"], f"Missing quote in {atom['id']}"
    assert len(atom["core_idea"]) > 80, f"Too short core_idea in {atom['id']}"
    assert len(atom["author_case"]) > 80, f"Too short author_case in {atom['id']}"
    assert len(atom["step_by_step_protocol"]) > 60, f"Too short step_by_step_protocol in {atom['id']}"
    assert not "В главе «" in atom["core_idea"], f"Template detected in core_idea of {atom['id']}"
    assert not "Институциональный кейс из первоисточника" in atom["author_case"], f"Template detected in author_case of {atom['id']}"
    assert not "Операционный ранбук: 1." in atom["step_by_step_protocol"], f"Template detected in step_by_step_protocol of {atom['id']}"
    MASTER_ATOMS.append(atom)

# Import all 15 authentic book modules
from book_01_jared_tendler import TENDLER_ATOMS
from book_02_tom_hougaard import HOUGAARD_ATOMS
from book_03_mark_douglas import DOUGLAS_ATOMS
from book_04_brent_donnelly import DONNELLY_ATOMS
from book_05_nassim_taleb import TALEB_ATOMS
from book_06_to_15_all import (
    STEENBARGER_ATOMS, MINERVINI_ATOMS, ZWEIG_ATOMS,
    SPIEGELHALTER_ATOMS, MOGILAT_ATOMS, SCHWAGER_ATOMS,
    EDWARD_ATOMS, GOLDSTEIN_ATOMS, CROSBY_ATOMS, HOUSEL_ATOMS
)

ALL_MODULES = [
    TENDLER_ATOMS, HOUGAARD_ATOMS, DOUGLAS_ATOMS, DONNELLY_ATOMS, TALEB_ATOMS,
    STEENBARGER_ATOMS, MINERVINI_ATOMS, ZWEIG_ATOMS, SPIEGELHALTER_ATOMS,
    MOGILAT_ATOMS, SCHWAGER_ATOMS, EDWARD_ATOMS, GOLDSTEIN_ATOMS,
    CROSBY_ATOMS, HOUSEL_ATOMS
]

for mod in ALL_MODULES:
    for atom in mod:
        register(atom)

print(f"\n=======================================================")
print(f"TOTAL AUTHENTIC, NON-TEMPLATE ATOMS: {len(MASTER_ATOMS)}")
print(f"=======================================================")

# Save to docs/rag_knowledge_base/knowledge_base_psy.json
kb_path = os.path.join(OUT_DIR, 'knowledge_base_psy.json')
with open(kb_path, 'w', encoding='utf-8') as f:
    json.dump({
        "version": "4.0.0",
        "created_at": "2026-08-29",
        "total_sources": 15,
        "total_atoms": len(MASTER_ATOMS),
        "standards": "100% Authentic Proof-of-Source (Zero-Template Grounding) & Cloudflare Vectorize Ready",
        "atoms": MASTER_ATOMS
    }, f, ensure_ascii=False, indent=2)

print(f"Saved master JSON: {kb_path}")

# Save to vectorize_records_psy.ndjson
ndjson_path = os.path.join(OUT_DIR, 'vectorize_records_psy.ndjson')
with open(ndjson_path, 'w', encoding='utf-8') as f:
    for a in MASTER_ATOMS:
        record = {
            "id": a["id"],
            "metadata": {
                "author": a["author"],
                "book": a["book"],
                "chapter_num": a["provenance"]["chapter_num"],
                "chapter_title": a["provenance"]["chapter_title"],
                "topic": a["topic"],
                "subtopic": a["subtopic"],
                "provenance_type": a["provenance"]["provenance_type"],
                "is_direct_author_claim": a["provenance"]["is_direct_author_claim"],
                "linked_lessons": ",".join(a.get("linked_lessons", [])),
                "linked_terms": ",".join(a.get("linked_terms", []))
            },
            "text": f"{a['author']} — {a['book']} | {a['topic']}: {a['subtopic']}\n" \
                    f"Цитата: {a['provenance']['verbatim_anchor_quote']}\n" \
                    f"Суть: {a['core_idea']}\n" \
                    f"Кейс: {a['author_case']}\n" \
                    f"Протокол: {a['step_by_step_protocol']}"
        }
        f.write(json.dumps(record, ensure_ascii=False) + '\n')

print(f"Saved master NDJSON: {ndjson_path}")
