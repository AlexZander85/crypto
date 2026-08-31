#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инжектор Этапа 2 (тесты/экзамены/карточки в плеере «🎓 Обучение»).
Дифф-контракт (патч-план §0):
  1) продолжения блоков learn_player_css и learn_player_js (новые блоки не заводятся);
  2) 4 перехвата alert() в calcPhaseTestResult (успех/провал) и finishMathTest (нет ответов/итог).
Больше в диффе ничего нет. Идемпотентность: повторный запуск запрещён (метка в файле).
"""
import sys, os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'work_index.html')      # v12.3 (v12.2 + Этап 1) — нетронутый исходник
OUT = os.path.join(BASE, 'index_v12.4.html')

src = open(SRC, encoding='utf-8').read()

if 'learn_player_stage2' in src:
    print('FAIL: уже пропатчен'); sys.exit(1)

css = open(os.path.join(BASE, 'stage2_css.css'), encoding='utf-8').read()
js = ''
for p in ('stage2_js_part1.js', 'stage2_js_part2.js', 'stage2_js_part3.js', 'stage2_js_part4.js'):
    js += open(os.path.join(BASE, p), encoding='utf-8').read()

orig_len = len(src)

# ---------- 1. CSS: перед </style> блока learn_player_css ----------
css_marker = '<style id="learn_player_css">'
i0 = src.index(css_marker)
i1 = src.index('</style>', i0)
src = src[:i1] + css.rstrip() + '\n' + src[i1:]

# ---------- 2. JS: внутрь IIFE, после bootstrap initPlayer, перед })(); ----------
boot = """if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initPlayer);
} else {
  initPlayer();
}
})();"""
assert boot in src, 'bootstrap IIFE не найден'
js_block = ("/* ===== learn_player_stage2: Этап 2 — тесты, экзамены и карточки (начало) ===== */\n"
            + js.rstrip() + "\n"
            + "/* ===== learn_player_stage2: Этап 2 (конец) ===== */\n")
repl = """if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initPlayer);
} else {
  initPlayer();
}
""" + js_block + "})();"
src = src.replace(boot, repl, 1)

# ---------- 3. Перехваты alert (§11.4 / A18): 4 точки, текст не меняется ----------
def wrap_alert(old):
    global src
    assert src.count(old) == 1, 'alert-якорь не уникален/не найден: ' + old[:70]
    assert old.rstrip().endswith(';')
    p = old.index('alert(')
    expr = old[p + len('alert('):-2]  # между 'alert(' и ');'
    new = 'if (window.LEARN_PLAYER_ACTIVE) { LearnPlayer.onTestResult(' + expr + '); } else { alert(' + expr + '); }'
    src = src.replace(old, new, 1)

# 3a. calcPhaseTestResult — успех (18367)
wrap_alert("""    alert(`Поздравляем! Тест Фазы ${phaseNum} успешно сдан на ${pct}%.${cumulativeQs.length ? ` Накопительный контроль: ${cumulativeCorrect}/${cumulativeQs.length}.` : ''}${capPsychQs.length ? ` Психологический блок: ${capPsychCorrect}/${capPsychQs.length}.` : ''}`);""")
# 3b. calcPhaseTestResult — провал (18372)
wrap_alert("""    alert(`Результат: ${pct}%. Основной порог: ${requiredCorrect} из ${test.questions.length} (${passThreshold}%).${!cumulativePass ? ` Накопительный контроль: ${cumulativeCorrect}/${cumulativeQs.length}, нужно ≥ ${cumulativeRequired}.` : ''}${!capPsychPass ? ` Психологический блок: ${capPsychCorrect}/${capPsychQs.length}, нужно ≥ ${capPsychRequired}.` : ''} Повторите материал и попробуйте снова.`);""")
# 3c. finishMathTest — нет ответов (27726): alert внутри if-блока
old3c = """  if(!t||!st){ alert('Сначала ответь на вопросы.'); return; }"""
new3c = """  if(!t||!st){ if (window.LEARN_PLAYER_ACTIVE) { LearnPlayer.onTestResult('Сначала ответь на вопросы.'); } else { alert('Сначала ответь на вопросы.'); } return; }"""
assert src.count(old3c) == 1, 'alert-якорь 3c не уникален'
src = src.replace(old3c, new3c, 1)
# 3d. finishMathTest — итог (27732)
wrap_alert("""  alert(st.passed?('🎉 Тест сдан: '+c+' из '+t.questions.length):'❌ Не сдано: '+c+' из '+t.questions.length+' (нужно ≥ '+Math.ceil(t.questions.length*0.8)+')');""")

open(OUT, 'w', encoding='utf-8').write(src)
print('OK: %s -> %s (+%d символов)' % (os.path.basename(SRC), os.path.basename(OUT), len(src) - orig_len))
