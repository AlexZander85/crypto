# tools/inject_into_both.py
import os
import re
import json

ROOT = r'D:\crypto'
INDEX_V9 = os.path.join(ROOT, 'index_v9.html')
SAAS_INDEX = os.path.join(ROOT, 'saas', 'public', 'index.html')
EXTRACT_MJS = os.path.join(ROOT, 'saas', 'tools', 'extract-content.mjs')

# Read generated JSON arrays and widget JS
with open(os.path.join(ROOT, 'tools', 'psy_lessons_1.json'), 'r', encoding='utf-8') as f:
    psy1_json = f.read()

with open(os.path.join(ROOT, 'tools', 'psy_lessons_2.json'), 'r', encoding='utf-8') as f:
    psy2_json = f.read()

with open(os.path.join(ROOT, 'tools', 'psy_widgets_ext.js'), 'r', encoding='utf-8') as f:
    widgets_ext_js = f.read()

all_32_widget_ids = [
  'widget_ps_l1_night_alerts','widget_ps_l2_trust_scale','widget_ps_l3_green_streak','widget_ps_l4_anchor_trap',
  'widget_ps_l5_babymonitor','widget_ps_l6_dopamine_detector','widget_ps_l7_future_letter','widget_ps_l8_match_judge',
  'widget_ps_l9_dopamine_trap','widget_ps_l10_loss_pain','widget_ps_l11_hormone_storm','widget_ps_l12_mental_battery',
  'widget_ps_l13_body_calm','widget_ps_l14_tilt_web','widget_ps_l15_tilt_masks','widget_ps_l16_fear_paralysis',
  'widget_ps_l17_sniper_gunner','widget_ps_l18_mhh_builder','widget_ps_l19_stress_gauge','widget_ps_l20_casino_wheel',
  'widget_ps_l21_risk_acceptance','widget_ps_l22_taleb_worlds','widget_ps_l23_survivor_monkeys','widget_ps_l24_turkey_trap',
  'widget_ps_l25_brier_score','widget_ps_l26_mental_thermostat','widget_ps_l27_best_loser','widget_ps_l28_clarity_detector',
  'widget_ps_l29_inchworm','widget_ps_l30_currency_toggle','widget_ps_l31_habit_breaker','widget_ps_l32_freedom_calc'
]

def update_html_file(fpath):
    print(f"Updating {os.path.basename(fpath)}...")
    with open(fpath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Replace const PSY_LESSONS = [...]
    p1_start = html.find('const PSY_LESSONS = [')
    p2_start = html.find('const PSY_LESSONS_2 = [', p1_start)
    if p1_start == -1 or p2_start == -1:
        print(f"ERROR: could not find PSY_LESSONS in {fpath}")
        return False

    # Find end of PSY_LESSONS array before PSY_LESSONS_2
    p1_end = html.rfind('];', p1_start, p2_start) + 2
    html = html[:p1_start] + 'const PSY_LESSONS = ' + psy1_json + ';' + html[p1_end:]

    # 2. Replace const PSY_LESSONS_2 = [...]
    p2_start = html.find('const PSY_LESSONS_2 = [')
    p2_end_marker = 'PSY_LESSONS.push.apply(PSY_LESSONS, PSY_LESSONS_2);'
    p2_after = html.find(p2_end_marker, p2_start)
    p2_end = html.rfind('];', p2_start, p2_after) + 2
    html = html[:p2_start] + 'const PSY_LESSONS_2 = ' + psy2_json + ';' + html[p2_end:]

    # 3. Update title and count in phase test and passport
    html = html.replace('(8 ситуаций)', '(32 ситуации)')
    html = html.replace('8 уроков и 8 тренажёров о главном риске', '32 урока и 32 интерактивных тренажёра о главном риске')
    html = html.replace('Пройти 8 уроков П1–П8', 'Пройти 32 урока П1–П32')
    html = html.replace('Пройти все 8 психологических тренажёров', 'Пройти все 32 психологических тренажёра')
    html = html.replace('Сдать аттестацию по психологии (8 вопросов', 'Сдать аттестацию по психологии (32 вопроса')

    # 4. Insert new widgets before `/* ---------- Реестр и встраивание в диспетчер виджетов ---------- */`
    marker = '/* ---------- Реестр и встраивание в диспетчер виджетов ---------- */'
    if marker in html:
        # Check if already inserted
        if 'PSY_render_widget_ps_l9_dopamine_trap' not in html:
            html = html.replace(marker, widgets_ext_js + '\n\n' + marker)
    
    # 5. Update PSY_WIDGET_IDS
    ids_str = "const PSY_WIDGET_IDS = [\n  '" + "','".join(all_32_widget_ids[:16]) + "',\n  '" + "','".join(all_32_widget_ids[16:]) + "'\n];"
    old_ids_pattern = r'const PSY_WIDGET_IDS = \[[^\]]*\];'
    html = re.sub(old_ids_pattern, ids_str, html)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Successfully updated {os.path.basename(fpath)}")
    return True

# Update index_v9.html
update_html_file(INDEX_V9)

# Update saas/public/index.html
update_html_file(SAAS_INDEX)

# Update saas/tools/extract-content.mjs
print("Updating extract-content.mjs...")
with open(EXTRACT_MJS, 'r', encoding='utf-8') as f:
    ext_code = f.read()

# Update validation checks in extract-content.mjs:
ext_code = ext_code.replace(
    "expect(psy.length === 8, `PSY=${psy.length}, ожидалось 8 (П1–П8)`);",
    "expect(psy.length === 32, `PSY=${psy.length}, ожидалось 32 (П1–П32)`);"
)

all_nums_str = ",".join([f"П{i}" for i in range(1, 33)])
ext_code = re.sub(
    r"expect\(psyNums === 'П1,П2,П3,П4,П5,П6,П7,П8', [^)]+\);",
    f"expect(psyNums === '{all_nums_str}', 'нумерация психологии: ' + psyNums);",
    ext_code
)

with open(EXTRACT_MJS, 'w', encoding='utf-8') as f:
    f.write(ext_code)

print("Updated extract-content.mjs.")
