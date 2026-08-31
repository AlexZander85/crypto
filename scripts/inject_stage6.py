#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инъектор Этапа 6 (v12.7 → v12.8). Идемпотентный.
Дифф-контракт: ровно 2 аддитивные вставки, ноль правок существующих строк:
  1) CSS — перед закрывающим </style> блока learn_player_css;
  2) JS  — перед маркером конца Этапа 3 в IIFE learn_player_js
     (после блока Этапа 5; все новые механизмы — обёртки, §0.1 соблюдён).
"""
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v12.7.html'
DST = sys.argv[2] if len(sys.argv) > 2 else '/home/z/my-project/download/index_v12.8.html'
CSS = sys.argv[3] if len(sys.argv) > 3 else '/home/z/my-project/scripts/stage6_css.css'
JS = [sys.argv[4]] if len(sys.argv) > 4 else [
    '/home/z/my-project/scripts/stage6_js_part1.js',
    '/home/z/my-project/scripts/stage6_js_part2.js',
    '/home/z/my-project/scripts/stage6_js_part3.js',
]

MARK = 'learn_player_stage6'
CSS_CLOSE = '</style>'
JS_ANCHOR = '/* ===== learn_player_stage3: Этап 3 (конец) ===== */'

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

    # --- Вставка 2: JS перед концом Этапа 3 (после блоков Этапов 4 и 5) ---
    anchor = out.find(JS_ANCHOR)
    assert anchor >= 0, 'якорь конца Этапа 3 не найден'
    out = out[:anchor] + js + '\n' + out[anchor:]

    assert out.count(MARK) >= 1
    assert out != src
    src_lines, out_lines = src.split('\n'), out.split('\n')
    assert all(l in out_lines for l in src_lines[:50]), 'начало файла повреждено'
    with open(DST, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'OK: {DST}')
    print(f'  CSS вставка: {css.count(chr(10)) + 1} строк перед </style> (learn_player_css)')
    print(f'  JS вставка : {js.count(chr(10)) + 1} строк перед маркером конца Этапа 3 (после блока Этапа 5)')
    print(f'  строк: {len(src_lines)} → {len(out_lines)} (+{len(out_lines)-len(src_lines)})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
