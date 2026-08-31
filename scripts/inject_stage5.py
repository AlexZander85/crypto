#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инъектор Этапа 5 (v12.6 → v12.7). Идемпотентный.
Дифф-контракт: 1 вставка JS + 12 хирургических правок ридера (бэклог Э4 §7.4):
  Вставка:  JS блока learn_player_stage5 перед маркером конца Этапа 3 в IIFE
            learn_player_js (после блока Этапа 4).
  Правки (каждая — ровно одно вхождение, см. EDITS):
    E1  №1  A4: interactive_risk_dash исключён из общего рендера interactive-блоков
    E2  №2  A9: curTab читает activeLessonLevelTab (тот же стейт, что пишет сеттер)
    E3  №6  numericQuiz: капитал один раз на профиль (nqDone в cn_lesson_checks)
    E4  №7  updateP0Candle: guard осиротевшего таймера (innerText у null)
    E5  №7  g05Draw: guard
    E6  №7  g12Draw: guard
    E7  №7  g19Draw: guard
    E8  №7  g20Draw: guard (тот же класс, профилактика)
    E9  №7  М46 slopeChart: undefined в all → cy/y NaN
    E10 №7  М46 draw(): «Сброс» → null.reduce
    E11 №13 renderPhaseTestView: старт спидрана персистится (cn_pt_start)
    E12 №13 calcPhaseTestResult: после финиша сохранённый старт сбрасывается
"""
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v12.6.html'
DST = sys.argv[2] if len(sys.argv) > 2 else '/home/z/my-project/download/index_v12.7.html'
JS = [sys.argv[3]] if len(sys.argv) > 3 else [
    '/home/z/my-project/scripts/stage5_js_part1.js',
    '/home/z/my-project/scripts/stage5_js_part2.js',
    '/home/z/my-project/scripts/stage5_js_part3.js',
]

MARK = 'learn_player_stage5'
JS_ANCHOR = '/* ===== learn_player_stage3: Этап 3 (конец) ===== */'

EDITS = [
    ('E1', "      else if(typeof b.type === 'string' && b.type.startsWith('interactive')){",
           "      else if(typeof b.type === 'string' && b.type !== 'interactive_risk_dash' && b.type.startsWith('interactive')){ /* №1/A4: dash уже отрисован своей веткой выше — общий рендер его пропускал, оставляя пустой дубль-контейнер */"),
    ('E2', "        const curTab = (typeof lessonLevelTabs !== 'undefined' && lessonLevelTabs[l.id]) ? lessonLevelTabs[l.id] : 'l1';",
           "        const curTab = activeLessonLevelTab[l.id] || 'l1'; /* №2/A9: читаем тот же стейт, куда пишет setLessonLevelTab — переменная lessonLevelTabs никогда не существовала, селект уровней не переживал перерисовку */"),
    ('E3', "    fb.innerHTML = '<b>✅ Верно (' + val + (nq.unit ? ' ' + nq.unit : '') + ').</b><br>📐 Эталонное решение: ' + nq.solution;\n    addFundCapital(8000, 30, 'Решена числовая задача без вариантов');",
           "    fb.innerHTML = '<b>✅ Верно (' + val + (nq.unit ? ' ' + nq.unit : '') + ').</b><br>📐 Эталонное решение: ' + nq.solution;\n    if(!(lessonCheckState[lessonId] && lessonCheckState[lessonId].nqDone)){\n      addFundCapital(8000, 30, 'Решена числовая задача без вариантов');\n      lessonCheckState[lessonId] = Object.assign({}, lessonCheckState[lessonId], { nqDone: true });\n      if(typeof save === 'function') save();\n    } else {\n      fb.innerHTML += '<div style=\"margin-top:6px;font-size:12.5px;color:var(--mut)\">💰 Капитал за эту задачу уже начислен ранее — повторно не начисляем.</div>';\n    } /* №6: nqDone в существующем cn_lesson_checks — капитал за numericQuiz начисляется один раз на профиль */"),
    ('E4', "  document.getElementById('p0_c_open_val').innerText = '$' + op;",
           "  if(!document.getElementById('p0_c_open_val')) return; /* №7: разметка урока перерисована — осиротевший таймер молча выходит */\n  document.getElementById('p0_c_open_val').innerText = '$' + op;"),
    ('E5', "function g05Draw(){\n  const nu = +document.getElementById('g05_nu').value;",
           "function g05Draw(){\n  const __nuEl = document.getElementById('g05_nu');\n  if(!__nuEl) return; /* №7: осиротевший таймер после перерисовки урока */\n  const nu = +__nuEl.value;"),
    ('E6', "function g12Draw(){\n  const s = +document.getElementById('g12_s').value / 100;",
           "function g12Draw(){\n  const __sEl = document.getElementById('g12_s');\n  if(!__sEl) return; /* №7: осиротевший таймер после перерисовки урока */\n  const s = +__sEl.value / 100;"),
    ('E7', "function g19Draw(){\n  const x = +document.getElementById('g19_x').value;\n  const fees = +document.getElementById('g19_f').value;",
           "function g19Draw(){\n  const __xEl = document.getElementById('g19_x'), __fEl = document.getElementById('g19_f');\n  if(!__xEl || !__fEl) return; /* №7: осиротевший таймер после перерисовки урока */\n  const x = +__xEl.value;\n  const fees = +__fEl.value;"),
    ('E8', "function g20Draw(){\n  ['long','short','call','put'].forEach(k => {",
           "function g20Draw(){\n  if(!document.getElementById('g20_k')) return; /* №7 (тот же класс, профилактика): осиротевший таймер */\n  ['long','short','call','put'].forEach(k => {"),
    ('E9', "    const all = rows.concat(st.q1.map(v=>({q1:v}))).map(r=>[r.q1, r.q2]).flat(2).filter(v=>v!==null);",
           "    const all = rows.concat(st.q1.map(v=>({q1:v}))).map(r=>[r.q1, r.q2]).flat(2).filter(v=>v!==null && v!==undefined); /* №7: undefined из {q1:v} проходил фильтр, Math.max давал NaN — все cy/y точек и линий были NaN */"),
    ('E10', "    const z1 = st.q1, mx = z1.reduce((a,b)=>a+b,0)/N, sd = Math.sqrt(z1.reduce((a,b)=>a+(b-mx)*(b-mx),0)/N)||1;",
            "    if(!st.q1){ box.querySelector('#m46out').innerHTML = '<div style=\"font-size:12px;color:var(--mut);margin:6px 0\">Данные сброшены — снова нажми «🏆 Отобрать лучших по кварталу».</div>'; return; } /* №7: кнопка «Сброс» обнуляла q1, draw() падал на null.reduce */\n    const z1 = st.q1, mx = z1.reduce((a,b)=>a+b,0)/N, sd = Math.sqrt(z1.reduce((a,b)=>a+(b-mx)*(b-mx),0)/N)||1;"),
    ('E11', "  window._ptStart = window._ptStart || {};\n  if(!window._ptStart[phaseNum]) window._ptStart[phaseNum] = Date.now();",
            "  window._ptStart = window._ptStart || {};\n  if(!window._ptStart[phaseNum]){\n    let __savedPt = null;\n    try{ __savedPt = JSON.parse(localStorage.getItem('cn_pt_start') || 'null'); }catch(__e){ __savedPt = null; }\n    window._ptStart[phaseNum] = (__savedPt && typeof __savedPt[phaseNum] === 'number' && __savedPt[phaseNum] > 0) ? __savedPt[phaseNum] : Date.now(); /* №13: спидран продолжается после перезагрузки (cn_pt_start) */\n  }\n  try{ const __ptsAll = JSON.parse(localStorage.getItem('cn_pt_start') || '{}'); __ptsAll[phaseNum] = window._ptStart[phaseNum]; localStorage.setItem('cn_pt_start', JSON.stringify(__ptsAll)); }catch(__e2){}"),
    ('E12', "      window._ptStart[phaseNum] = 0;",
            "      window._ptStart[phaseNum] = 0;\n      try{ const __ptf = JSON.parse(localStorage.getItem('cn_pt_start') || '{}'); __ptf[phaseNum] = 0; localStorage.setItem('cn_pt_start', JSON.stringify(__ptf)); }catch(__e3){} /* №13: попытка завершена — сохранённый старт сброшен, следующая попытка стартует с нуля */"),
]

def main():
    src = open(SRC, encoding='utf-8').read()
    if MARK in src:
        print(f'ALREADY_PATCHED: маркер «{MARK}» найден в {SRC}; выход идемпотентен без изменений.')
        return 0
    js = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'

    out = src

    # --- 12 правок ридера (каждая ровно одно вхождение) ---
    for tag, old, new in EDITS:
        n = out.count(old)
        assert n == 1, f'{tag}: ожидалось ровно 1 вхождение якоря, найдено {n}'
        out = out.replace(old, new, 1)

    # --- Вставка JS перед маркером конца Этапа 3 (после блока Этапа 4) ---
    anchor = out.find(JS_ANCHOR)
    assert anchor >= 0, 'якорь конца Этапа 3 не найден'
    out = out[:anchor] + js + '\n' + out[anchor:]

    # Проверки контракта
    assert out.count(MARK) >= 1
    assert out != src
    src_lines, out_lines = src.split('\n'), out.split('\n')
    assert all(l in out_lines for l in src_lines[:50]), 'начало файла повреждено'
    with open(DST, 'w', encoding='utf-8') as f:
        f.write(out)
    ins_js = js.count('\n') + 1
    print(f'OK: {DST}')
    print(f'  правок ридера: {len(EDITS)} (E1..E{len(EDITS)})')
    print(f'  JS вставка : {ins_js} строк перед маркером конца Этапа 3 (после блока Этапа 4)')
    print(f'  строк: {len(src_lines)} → {len(out_lines)} (+{len(out_lines)-len(src_lines)})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
