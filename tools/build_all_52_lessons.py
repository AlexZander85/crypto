# tools/build_all_52_lessons.py
import os
import re
import json
import sys

ROOT = r'D:\crypto'
CURR_DIR = os.path.join(ROOT, 'docs', 'psy_curriculum')
CORE_P8_PATH = os.path.join(ROOT, 'saas', 'content', 'ru', 'core_p8.json')

sys.path.append(os.path.join(ROOT, 'tools'))
from generate_psy_full import parse_markdown_lesson

# 1. Load 8 base lessons
with open(CORE_P8_PATH, 'r', encoding='utf-8') as f:
    core_p8 = json.load(f)
    base_8 = core_p8['lessons'][:8]

print(f"Loaded {len(base_8)} base psychology lessons (П1–П8)")

# 2. Parse all 44 curriculum lessons from MODULE 1-8
module_files = [
    ('MODULE_1_NEUROBIOLOGY.md', [1, 2, 3, 4, 5]),
    ('MODULE_2_TILT_FEAR_GREED.md', [6, 7, 8, 9, 10, 11]),
    ('MODULE_3_PROBABILISTIC_THINKING.md', [12, 13, 14, 15, 16, 17]),
    ('MODULE_4_CHAMPION_MINDSET.md', [18, 19, 20, 21, 22]),
    ('MODULE_5_HABITS_AND_METRICS.md', [23, 24, 25, 26, 27]),
    ('MODULE_6_WEALTH_PHILOSOPHY.md', [28, 29, 30, 31, 32]),
    ('MODULE_7_ADVANCED_MASTERY.md', [41, 42, 43, 44, 45, 46, 47, 48]),
    ('MODULE_8_DONNELLY_ALPHA.md', [49, 50, 51, 52]),
]

parsed_lessons = {}
for fname, nums in module_files:
    fpath = os.path.join(CURR_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    sections = re.split(r'\n## Урок (\d+)\.\s*', text)
    for i in range(1, len(sections), 2):
        num = int(sections[i])
        sec_text = sections[i+1]
        parsed_lessons[num] = sec_text

print(f"Parsed {len(parsed_lessons)} curriculum lessons from Markdown (32 + 8 + 4 = 44)")

# Mapping all 44 curriculum lessons to П9–П52
widget_names = [
    (9, 1, "widget_ps_l9_dopamine_trap"),
    (10, 2, "widget_ps_l10_loss_pain"),
    (11, 3, "widget_ps_l11_hormone_storm"),
    (12, 4, "widget_ps_l12_mental_battery"),
    (13, 5, "widget_ps_l13_body_calm"),
    (14, 6, "widget_ps_l14_tilt_web"),
    (15, 7, "widget_ps_l15_tilt_masks"),
    (16, 8, "widget_ps_l16_fear_paralysis"),
    (17, 9, "widget_ps_l17_sniper_gunner"),
    (18, 10, "widget_ps_l18_mhh_builder"),
    (19, 11, "widget_ps_l19_stress_gauge"),
    (20, 12, "widget_ps_l20_casino_wheel"),
    (21, 13, "widget_ps_l21_risk_acceptance"),
    (22, 14, "widget_ps_l22_taleb_worlds"),
    (23, 15, "widget_ps_l23_survivor_monkeys"),
    (24, 16, "widget_ps_l24_turkey_trap"),
    (25, 17, "widget_ps_l25_brier_score"),
    (26, 18, "widget_ps_l26_mental_thermostat"),
    (27, 19, "widget_ps_l27_best_loser"),
    (28, 20, "widget_ps_l28_clarity_detector"),
    (29, 21, "widget_ps_l29_premortem_sim"),
    (30, 22, "widget_ps_l30_inchworm"),
    (31, 23, "widget_ps_l31_currency_toggle"),
    (32, 24, "widget_ps_l32_habit_breaker"),
    (33, 25, "widget_ps_l33_sabermetrics_dash"),
    (34, 26, "widget_ps_l34_regimes_classifier"),
    (35, 27, "widget_ps_l35_capital_fortress"),
    (36, 28, "widget_ps_l36_munger_tennis"),
    (37, 29, "widget_ps_l37_rich_vs_wealthy"),
    (38, 30, "widget_ps_l38_dentist_taleb"),
    (39, 31, "widget_ps_l39_enough_sequoia"),
    (40, 32, "widget_ps_l40_freedom_calc"),
    (41, 41, "widget_ps_l41_stress_lab"),
    (42, 42, "widget_ps_l42_capital_scale"),
    (43, 43, "widget_ps_l43_social_shield"),
    (44, 44, "widget_ps_l44_bias_journal"),
    (45, 45, "widget_ps_l45_liquidity_trap"),
    (46, 46, "widget_ps_l46_risk_officer"),
    (47, 47, "widget_ps_l47_burnout_shield"),
    (48, 48, "widget_ps_l48_final_manifesto"),
    # New 4 Brent Donnelly lessons
    (49, 49, "widget_ps_l49_alpha_paradox"),
    (50, 50, "widget_ps_l50_conviction_tiers"),
    (51, 51, "widget_ps_l51_narrative_cycle"),
    (52, 52, "widget_ps_l52_trade_lifecycle"),
]

new_44_lessons = []
for target_num, src_num, wid_id in widget_names:
    sec_text = parsed_lessons[src_num]
    l_obj = parse_markdown_lesson(sec_text, target_num, f"ps_l{target_num}")
    for blk in l_obj['blocks']:
        if blk.get('type') == 'interactive_psy':
            blk['id'] = wid_id
    new_44_lessons.append(l_obj)

all_52_lessons = base_8 + new_44_lessons
print(f"Total compiled lessons: {len(all_52_lessons)} (П1–П52)")

# Save core_p8.json with all 52 lessons
core_p8_data = {
    "meta": { "demo": False, "locale": "ru", "phase": 8, "generated": "2026-08-28" },
    "lessons": all_52_lessons
}
with open(CORE_P8_PATH, 'w', encoding='utf-8') as f:
    json.dump(core_p8_data, f, ensure_ascii=False, indent=2)

print("Saved core_p8.json with 52 lessons.")

# Split into 2 halves for HTML script loading: П1–П26 and П27–П52
psy1_lessons = all_52_lessons[:26]
psy2_lessons = all_52_lessons[26:]

with open(os.path.join(ROOT, 'tools', 'psy_lessons_1.json'), 'w', encoding='utf-8') as f:
    json.dump(psy1_lessons, f, ensure_ascii=False, indent=2)

with open(os.path.join(ROOT, 'tools', 'psy_lessons_2.json'), 'w', encoding='utf-8') as f:
    json.dump(psy2_lessons, f, ensure_ascii=False, indent=2)

print(f"Exported psy_lessons_1.json ({len(psy1_lessons)}) and psy_lessons_2.json ({len(psy2_lessons)}).")
