# tools/audit_current_kb.py
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:\crypto'
kb_path = os.path.join(ROOT, 'docs', 'rag_knowledge_base', 'knowledge_base_psy.json')
nd_path = os.path.join(ROOT, 'docs', 'rag_knowledge_base', 'vectorize_records_psy.ndjson')

with open(kb_path, 'r', encoding='utf-8') as f:
    kb = json.load(f)

with open(nd_path, 'r', encoding='utf-8') as f:
    nd_lines = [line for line in f if line.strip()]

print("=== АУДИТ АКТУАЛИЗАЦИИ БАЗЫ ЗНАНИЙ ===")
print(f"1. Версия базы: {kb['version']} (дата создания: {kb['created_at']})")
print(f"2. Всего атомов в knowledge_base_psy.json: {len(kb['atoms'])}")
print(f"3. Всего строк в vectorize_records_psy.ndjson: {len(nd_lines)}")

authors = set(a['author'] for a in kb['atoms'])
print(f"\n4. Представлено авторов: {len(authors)} из 15:")
for auth in sorted(authors):
    count = sum(1 for a in kb['atoms'] if a['author'] == auth)
    print(f"   - {auth:25s}: {count:2d} атомов")

facts = {
    'Marcus / $450k (Apple)': any('450 000' in a.get('author_case', '') for a in kb['atoms']),
    'Tom Hougaard / £78,000 (DAX)': any('78 000' in a.get('author_case', '') for a in kb['atoms']),
    'Steven Goldstein / $12M (Credit Suisse)': any('12 млн' in a.get('author_case', '') for a in kb['atoms']),
    'Nassim Taleb / $4.6B (LTCM)': any('4.6 млрд' in a.get('author_case', '') for a in kb['atoms']),
    'Morgan Housel / $8M (Ronald Read)': any('8 млн' in a.get('author_case', '') for a in kb['atoms']),
    'Jared Tendler / MHH (Dustin)': any('Дастин' in a.get('author_case', '') for a in kb['atoms']),
    'Jack Schwager / COT (Jason Shapiro)': any('Шапиро' in a.get('author_case', '') for a in kb['atoms']),
    'Brett Steenbarger / Process Score (SMB Capital)': any('SMB Capital' in a.get('author_case', '') for a in kb['atoms']),
    'David Spiegelhalter / Brier Score (Cambridge)': any('Шпигельхалтер' in a.get('author_case', '') for a in kb['atoms']),
    'Roman Mogilat / Night Tilt ($8,500)': any('Артем' in a.get('author_case', '') for a in kb['atoms']),
}

print('\n5. Проверка наличия ключевых фактов и кейсов:')
for fact, exists in facts.items():
    status = '[OK] Найдено' if exists else '[ERR] Отсутствует'
    print(f"   {status:16s} | {fact}")
