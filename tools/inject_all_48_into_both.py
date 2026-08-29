# tools/inject_all_48_into_both.py
import os
import re
import json

ROOT = r'D:\crypto'
INDEX_V9 = os.path.join(ROOT, 'index_v9.html')
INDEX_HTML = os.path.join(ROOT, 'index.html')
SAAS_INDEX = os.path.join(ROOT, 'saas', 'public', 'index.html')
EXTRACT_MJS = os.path.join(ROOT, 'saas', 'tools', 'extract-content.mjs')
TEST_API_MJS = os.path.join(ROOT, 'saas', 'test', 'api.test.mjs')
TESTS_JSON = os.path.join(ROOT, 'saas', 'content', 'ru', 'tests.json')

with open(os.path.join(ROOT, 'tools', 'psy_lessons_1.json'), 'r', encoding='utf-8') as f:
    psy1_json = f.read()

with open(os.path.join(ROOT, 'tools', 'psy_lessons_2.json'), 'r', encoding='utf-8') as f:
    psy2_json = f.read()

with open(os.path.join(ROOT, 'tools', 'psy_widgets_ext.js'), 'r', encoding='utf-8') as f:
    widgets_ext_js = f.read()

with open(os.path.join(ROOT, 'tools', 'quiz_psy_144.json'), 'r', encoding='utf-8') as f:
    quiz_144_json = f.read()
    quiz_144_data = json.loads(quiz_144_json)

all_48_widget_ids = [
    'widget_ps_l1_night_alerts','widget_ps_l2_trust_scale','widget_ps_l3_green_streak','widget_ps_l4_anchor_trap',
    'widget_ps_l5_babymonitor','widget_ps_l6_dopamine_detector','widget_ps_l7_future_letter','widget_ps_l8_match_judge',
    'widget_ps_l9_dopamine_trap','widget_ps_l10_loss_pain','widget_ps_l11_hormone_storm','widget_ps_l12_mental_battery',
    'widget_ps_l13_body_calm','widget_ps_l14_tilt_web','widget_ps_l15_tilt_masks','widget_ps_l16_fear_paralysis',
    'widget_ps_l17_sniper_gunner','widget_ps_l18_mhh_builder','widget_ps_l19_stress_gauge','widget_ps_l20_casino_wheel',
    'widget_ps_l21_risk_acceptance','widget_ps_l22_taleb_worlds','widget_ps_l23_survivor_monkeys','widget_ps_l24_turkey_trap',
    'widget_ps_l25_brier_score','widget_ps_l26_mental_thermostat','widget_ps_l27_best_loser','widget_ps_l28_clarity_detector',
    'widget_ps_l29_premortem_sim','widget_ps_l30_inchworm','widget_ps_l31_currency_toggle','widget_ps_l32_habit_breaker',
    'widget_ps_l33_sabermetrics_dash','widget_ps_l34_regimes_classifier','widget_ps_l35_capital_fortress','widget_ps_l36_munger_tennis',
    'widget_ps_l37_rich_vs_wealthy','widget_ps_l38_dentist_taleb','widget_ps_l39_enough_sequoia','widget_ps_l40_freedom_calc',
    'widget_ps_l41_stress_lab','widget_ps_l42_capital_scale','widget_ps_l43_social_shield','widget_ps_l44_bias_journal',
    'widget_ps_l45_liquidity_trap','widget_ps_l46_risk_officer','widget_ps_l47_burnout_shield','widget_ps_l48_final_manifesto'
]

def update_file(fpath):
    print(f"Updating 48 lessons in {os.path.basename(fpath)}...")
    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Replace const PSY_LESSONS = [...]
    p1_start = html.find('const PSY_LESSONS = [')
    p2_start = html.find('const PSY_LESSONS_2 = [', p1_start)
    if p1_start == -1 or p2_start == -1:
        print(f"ERROR: could not find PSY_LESSONS in {fpath}")
        return False

    p1_end = html.rfind('];', p1_start, p2_start) + 2
    html = html[:p1_start] + 'const PSY_LESSONS = ' + psy1_json + ';' + html[p1_end:]

    # 2. Replace const PSY_LESSONS_2 = [...]
    p2_start = html.find('const PSY_LESSONS_2 = [')
    p2_end_marker = 'PSY_LESSONS.push.apply(PSY_LESSONS, PSY_LESSONS_2);'
    p2_after = html.find(p2_end_marker, p2_start)
    p2_end = html.rfind('];', p2_start, p2_after) + 2
    html = html[:p2_start] + 'const PSY_LESSONS_2 = ' + psy2_json + ';' + html[p2_end:]

    # 3. Update const QUIZ_PSY = [...]
    if 'const QUIZ_PSY = [' in html:
        q_start = html.find('const QUIZ_PSY = [')
        q_end = html.find('function setQuizMode(mode, btn){', q_start)
        q_arr_end = html.rfind('];', q_start, q_end) + 2
        html = html[:q_start] + 'const QUIZ_PSY = ' + quiz_144_json + ';' + html[q_arr_end:]
    else:
        marker = 'function setQuizMode(mode, btn){'
        html = html.replace(marker, 'const QUIZ_PSY = ' + quiz_144_json + ';\n\n' + marker)

    # 4. Update QUIZ button
    if 'id="quiz_mode_psy"' in html:
        html = re.sub(r'<button class="chip" id="quiz_mode_psy"[^>]*>[^<]*</button>',
                      '<button class="chip" id="quiz_mode_psy" onclick="setQuizMode(\'psy\', this)">🧘 Психология и риск-контроль (144 кейса)</button>',
                      html)

    # 5. Update Phase test and Phase passport
    html = re.sub(r'🧠 Аттестация: [^"\']+', '🧠 Аттестация: Академия психологии и риск-инженерии (144 ситуации)', html)
    html = re.sub(r'\d+ уроков и \d+ интерактивных тренажёров о главном риске', '48 уроков и 48 интерактивных тренажёров о главном риске', html)
    html = re.sub(r'Пройти \d+ уроков П1–П\d+', 'Пройти 48 уроков П1–П48', html)
    html = re.sub(r'Пройти все \d+ психологических тренажёров', 'Пройти все 48 психологических тренажёров', html)
    html = re.sub(r'Сдать аттестацию по психологии \(\d+ вопрос[^)]*\)', 'Сдать аттестацию по психологии (144 вопроса, порог 80%)', html)

    # 6. Replace widgets ext JS
    marker = '/* ---------- Реестр и встраивание в диспетчер виджетов ---------- */'
    ext_start = html.find('/* =========================================================================\n   V5-PSY-EXT:')
    if ext_start != -1:
        ext_end = html.find(marker, ext_start)
        html = html[:ext_start] + widgets_ext_js + '\n\n' + html[ext_end:]
    else:
        html = html.replace(marker, widgets_ext_js + '\n\n' + marker)

    # 7. Update PSY_WIDGET_IDS
    ids_lines = []
    for i in range(0, len(all_48_widget_ids), 4):
        chunk = all_48_widget_ids[i:i+4]
        ids_lines.append("  '" + "','".join(chunk) + "'")
    ids_str = "const PSY_WIDGET_IDS = [\n" + ",\n".join(ids_lines) + "\n];"
    old_ids_pattern = r'const PSY_WIDGET_IDS = \[[^\]]*\];'
    html = re.sub(old_ids_pattern, ids_str, html)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Successfully updated {os.path.basename(fpath)}")

# Update all 3 HTML files
update_file(INDEX_V9)
update_file(INDEX_HTML)
update_file(SAAS_INDEX)

# Update tests.json
with open(TESTS_JSON, 'r', encoding='utf-8') as f:
    tests_data = json.load(f)

phase_8_test = {
    "phase": 8,
    "title": "🧠 Аттестация: Академия психологии и риск-инженерии (144 ситуации)",
    "threshold": 80,
    "questions": quiz_144_data
}

p8_found = False
for idx, pt in enumerate(tests_data.get('phaseTests', [])):
    if pt.get('phase') == 8:
        tests_data['phaseTests'][idx] = phase_8_test
        p8_found = True
        break
if not p8_found:
    tests_data['phaseTests'].append(phase_8_test)

with open(TESTS_JSON, 'w', encoding='utf-8') as f:
    json.dump(tests_data, f, ensure_ascii=False, indent=2)

print("Updated tests.json with 144-question Phase 8 test.")

# Update saas/tools/extract-content.mjs
print("Updating extract-content.mjs...")
with open(EXTRACT_MJS, 'r', encoding='utf-8') as f:
    ext_code = f.read()

ext_code = re.sub(
    r"expect\(psy\.length === \d+, `PSY=\${psy\.length}, ожидалось \d+ \(П1–П\d+\)`\);",
    "expect(psy.length === 48, `PSY=${psy.length}, ожидалось 48 (П1–П48)`);",
    ext_code
)

all_nums_str = ",".join([f"П{i}" for i in range(1, 49)])
ext_code = re.sub(
    r"expect\(psyNums === 'П1,П2[^']+', [^)]+\);",
    f"expect(psyNums === '{all_nums_str}', 'нумерация психологии: ' + psyNums);",
    ext_code
)

with open(EXTRACT_MJS, 'w', encoding='utf-8') as f:
    f.write(ext_code)

print("Updated extract-content.mjs.")

# Update saas/test/api.test.mjs (demo pack = 20 phase0 + 48 psy = 68 lessons)
print("Updating api.test.mjs...")
with open(TEST_API_MJS, 'r', encoding='utf-8') as f:
    api_test_code = f.read()

api_test_code = re.sub(
    r"demoPack\.body\?\.lessons\?\.length === \d+",
    "demoPack.body?.lessons?.length === 68",
    api_test_code
)

with open(TEST_API_MJS, 'w', encoding='utf-8') as f:
    f.write(api_test_code)

print("Updated api.test.mjs.")
