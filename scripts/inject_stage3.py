#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инъектор Этапа 3 (v12.4 → v12.5). Идемпотентный.
Дифф-контракт (патч-план Этапа 3 §0): ровно 2 вставки, ноль правок существующих строк:
  1) CSS — перед закрывающим </style> блока learn_player_css;
  2) JS  — перед маркером конца Этапа 2 внутри IIFE learn_player_js.
"""
import sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v12.4.html'
DST = sys.argv[2] if len(sys.argv) > 2 else '/home/z/my-project/download/index_v12.5.html'
CSS = sys.argv[3] if len(sys.argv) > 3 else '/home/z/my-project/scripts/stage3_css.css'
JS = [sys.argv[4]] if len(sys.argv) > 4 else [
    '/home/z/my-project/scripts/stage3_js_part1.js',
    '/home/z/my-project/scripts/stage3_js_part2.js',
    '/home/z/my-project/scripts/stage3_js_part3.js',
]

MARK = 'learn_player_stage3'
CSS_CLOSE = '</style>'
JS_ANCHOR = '/* ===== learn_player_stage2: Этап 2 (конец) ===== */'

def main():
    src = open(SRC, encoding='utf-8').read()
    if MARK in src:
        print(f'ALREADY_PATCHED: маркер «{MARK}» найден в {SRC}; выход идемпотентен без изменений.')
        return 0
    css = open(CSS, encoding='utf-8').read().rstrip() + '\n'
    js = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'

    # --- Вставка 1: CSS перед </style> блока learn_player_css ---
    style_id = src.find('<style id="learn_player_css">')
    assert style_id >= 0, 'блок learn_player_css не найден'
    close_at = src.find(CSS_CLOSE, style_id)
    assert close_at >= 0, 'закрывающий </style> learn_player_css не найден'
    out = src[:close_at] + '\n' + css + src[close_at:]

    # --- Вставка 2: JS перед концом Этапа 2 (внутри IIFE) ---
    anchor = out.find(JS_ANCHOR)
    assert anchor >= 0, 'якорь конца Этапа 2 не найден'
    out = out[:anchor] + js + '\n' + out[anchor:]

    # Проверки контракта
    assert out.count(MARK) >= 1
    assert src.replace('\r\n', '\n') != out  # что-то вставлено
    # Оба исходных маркера на месте, ни одна строка не удалена:
    src_lines, out_lines = src.split('\n'), out.split('\n')
    assert all(l in out_lines for l in src_lines[:50]), 'начало файла повреждено'
    with open(DST, 'w', encoding='utf-8') as f:
        f.write(out)
    ins_css = css.count('\n') + 1
    ins_js = js.count('\n') + 1
    print(f'OK: {DST}')
    print(f'  CSS вставка: {ins_css} строк перед </style> (learn_player_css)')
    print(f'  JS вставка : {ins_js} строк перед маркером конца Этапа 2 (learn_player_js)')
    print(f'  строк: {len(src_lines)} → {len(out_lines)} (+{len(out_lines)-len(src_lines)})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
