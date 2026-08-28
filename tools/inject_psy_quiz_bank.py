# tools/inject_psy_quiz_bank.py
import re
import json
import os

ROOT = r'D:\crypto'
BANK_PATH = os.path.join(ROOT, 'docs', 'psy_curriculum', 'SELF_CHECK_TESTS_BANK.md')
INDEX_V9 = os.path.join(ROOT, 'index_v9.html')
SAAS_INDEX = os.path.join(ROOT, 'saas', 'public', 'index.html')

with open(BANK_PATH, 'r', encoding='utf-8') as f:
    text = f.read()

# Parse the 96 questions
questions = []
# Split by numbers like "1. **Ситуация 1.1:**", "2. **Ситуация 1.2:**", etc.
q_blocks = re.split(r'\n\d+\.\s+\*\*Ситуация\s+[\d\.]+:\*\*\s*', text)

for block in q_blocks[1:]:
    lines = block.strip().split('\n')
    q_title = lines[0].strip()
    
    opts = []
    correct_idx = 0
    explain = ""
    
    opt_idx = 0
    for line in lines[1:]:
        line = line.strip()
        if line.startswith(('- A)', '- B)', '- C)', '- D)')):
            is_correct = '✅' in line
            clean_opt = re.sub(r'^-\s*[A-D]\)\s*', '', line)
            clean_opt = clean_opt.replace('✅', '').strip()
            if is_correct:
                correct_idx = opt_idx
            opts.append(clean_opt)
            opt_idx += 1
        elif line.startswith('*Разбор:*'):
            explain = re.sub(r'^\*Разбор:\*\s*', '', line).strip()
            explain = explain.replace('*', '').strip()

    if len(opts) == 4:
        questions.append({
            "category": "psychology",
            "q": q_title,
            "opts": opts,
            "a": correct_idx,
            "explain": explain or "Решение соответствует строгому риск-менеджменту и торговому уставу."
        })

print(f"Successfully parsed {len(questions)} self-check questions from bank!")

quiz_psy_json = json.dumps(questions, ensure_ascii=False, indent=2)

def update_html(fpath):
    print(f"Injecting QUIZ_PSY into {os.path.basename(fpath)}...")
    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add quiz chip button if not present
    if 'id="quiz_mode_psy"' not in html:
        old_chip = '<button class="chip" id="quiz_mode_data" onclick="setQuizMode(\'data\', this)">📊 Гипотезы из данных</button>'
        new_chip = old_chip + '\n    <button class="chip" id="quiz_mode_psy" onclick="setQuizMode(\'psy\', this)">🧘 Психология и риск-контроль (96 кейсов)</button>'
        html = html.replace(old_chip, new_chip)

    # 2. Add quizMode === 'psy' to startQuiz()
    if "quizMode === 'psy'" not in html:
        old_mode_branch = "if(quizMode === 'data'){\n    quiz.qs = [...QUIZ_DATA];\n  }"
        new_mode_branch = old_mode_branch + " else if(quizMode === 'psy'){\n    quiz.qs = [...QUIZ_PSY];\n  }"
        html = html.replace(old_mode_branch, new_mode_branch)

    # 3. Add const QUIZ_PSY = [...] before startQuiz
    if 'const QUIZ_PSY =' not in html:
        marker = 'function setQuizMode(mode, btn){'
        html = html.replace(marker, 'const QUIZ_PSY = ' + quiz_psy_json + ';\n\n' + marker)

    # 4. Update PHASE_TESTS for Phase 8 to use the comprehensive 96 questions
    # Find phase 8 in PHASE_TESTS
    p8_search = r'("phase":\s*8,\s*"title":\s*"[^"]*",\s*"threshold":\s*80,\s*"questions":\s*)PSY_LESSONS\.map\([^)]+\)'
    if re.search(p8_search, html):
        html = re.sub(p8_search, r'\1QUIZ_PSY', html)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Updated {os.path.basename(fpath)} successfully.")

update_html(INDEX_V9)
update_html(SAAS_INDEX)

# Also update saas/content/ru/tests.json with Phase 8 containing all 96 questions
TESTS_JSON = os.path.join(ROOT, 'saas', 'content', 'ru', 'tests.json')
with open(TESTS_JSON, 'r', encoding='utf-8') as f:
    tests_data = json.load(f)

# Update or append phase 8
phase_8_test = {
    "phase": 8,
    "title": "🧠 Аттестация: Академия психологии и риск-инженерии (96 ситуаций)",
    "threshold": 80,
    "questions": questions
}

existing_p8_idx = -1
for idx, pt in enumerate(tests_data.get('phaseTests', [])):
    if pt.get('phase') == 8:
        existing_p8_idx = idx
        break

if existing_p8_idx >= 0:
    tests_data['phaseTests'][existing_p8_idx] = phase_8_test
else:
    tests_data['phaseTests'].append(phase_8_test)

with open(TESTS_JSON, 'w', encoding='utf-8') as f:
    json.dump(tests_data, f, ensure_ascii=False, indent=2)

print("Updated saas/content/ru/tests.json with 96-question Phase 8 test.")
