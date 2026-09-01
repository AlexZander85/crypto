#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инъектор Этапа 8 (v12.9 → v13.0). Идемпотентный.
Дифф-контракт (ТЗ §10, красные линии): ровно 2 аддитивные вставки,
ноль правок существующих строк:
  1) JS  — сразу после маркера «learn_player_stage7: Этап 7 (конец)»
     (внутри IIFE плеера, до маркера конца Этапа 6 и финального })();
  2) CSS — новым <style id="learn_player_stage8_css"> сразу после </script>
     плеера, до комментария «LEARN PLAYER — конец».
"""
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v12.9.html'
DST = sys.argv[2] if len(sys.argv) > 2 else '/home/z/my-project/download/index_v13.0.html'
CSS = sys.argv[3] if len(sys.argv) > 3 else '/home/z/my-project/scripts/stage8_css.css'
JS = [sys.argv[4]] if len(sys.argv) > 4 else [
    '/home/z/my-project/scripts/stage8_js_part1.js',
    '/home/z/my-project/scripts/stage8_js_part2.js',
    '/home/z/my-project/scripts/stage8_js_part3.js',
    '/home/z/my-project/scripts/stage8_js_part4.js',
    '/home/z/my-project/scripts/stage8_js_part5.js',
]

MARK = 'learn_player_stage8'
JS_ANCHOR = '/* ===== learn_player_stage7: Этап 7 (конец) ===== */'
PLAYER_SCRIPT_END = '<!-- ================= LEARN PLAYER — конец ================= -->'
CSS_BLOCK = '<style id="learn_player_stage8_css">'

def main():
    src = open(SRC, encoding='utf-8').read()
    if MARK in src:
        print(f'ALREADY_PATCHED: маркер «{MARK}» найден в {SRC}; выход идемпотентен без изменений.')
        return 0
    css = open(CSS, encoding='utf-8').read().rstrip() + '\n'
    js = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'

    # --- Вставка 1: JS после маркера конца Этапа 7 (внутри IIFE) ---
    a = src.find(JS_ANCHOR)
    assert a >= 0, 'якорь конца Этапа 7 не найден'
    a_end = a + len(JS_ANCHOR)
    out = src[:a_end] + '\n\n' + js + '\n' + src[a_end:]

    # --- Вставка 2: CSS новым <style> после </script> плеера, до «LEARN PLAYER — конец» ---
    b = out.find(PLAYER_SCRIPT_END)
    assert b >= 0, 'маркер конца блока плеера не найден'
    css_block = CSS_BLOCK + '\n' + css + '</style>\n'
    out = out[:b] + css_block + out[b:]

    assert out.count(MARK) >= 2
    assert out != src
    src_lines, out_lines = src.split('\n'), out.split('\n')
    assert all(l in out_lines for l in src_lines[:50]), 'начало файла повреждено'
    # проверка: исходные строки все присутствуют (аддитивность без правок)
    src_set = set(src_lines)
    extra = [l for l in out_lines if l not in src_set]
    removed_extra = None
    with open(DST, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'OK: {DST}')
    print(f'  JS  вставка: {js.count(chr(10)) + 1} строк после маркера конца Этапа 7')
    print(f'  CSS вставка: {css.count(chr(10)) + 1} строк новым <style> перед «LEARN PLAYER — конец»')
    print(f'  строк: {len(src_lines)} → {len(out_lines)} (+{len(out_lines)-len(src_lines)})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
