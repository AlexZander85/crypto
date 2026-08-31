#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Дифф-контракт Этапа 7: обратная реконструкция v12.9 → v12.8 байт-в-байт.
Из v12.9 удаляются РОВНО те строки, которые вставил inject_stage7.py
(CSS-файл и JS-файлы Этапа 7, с точными разделителями инжектора),
результат сравнивается с v12.8. PASS = байт-в-байт (Этап 7 — только вставки).
"""
import sys

V_OLD = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v12.8.html'
V_NEW = sys.argv[2] if len(sys.argv) > 2 else '/home/z/my-project/download/index_v12.9.html'
BASE = '/home/z/my-project/scripts/'
CSS = BASE + 'stage7_css.css'
JS = [BASE + 'stage7_js_part1.js', BASE + 'stage7_js_part2.js',
      BASE + 'stage7_js_part3.js', BASE + 'stage7_js_part4.js']

def main():
    old = open(V_OLD, encoding='utf-8').read()
    new = open(V_NEW, encoding='utf-8').read()

    css_ins = open(CSS, encoding='utf-8').read().rstrip() + '\n'
    js_ins = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'

    # Вставка 1 (CSS): '\n' + css_ins перед '</style>'
    marker1 = '\n' + css_ins
    p1 = new.find(marker1)
    assert p1 >= 0, 'CSS вставка Э7 не найдена'
    assert new[p1 + len(marker1):p1 + len(marker1) + len('</style>')] == '</style>', \
        'CSS вставка Э7 не перед </style> learn_player_css'
    rec = new[:p1] + new[p1 + len(marker1):]

    # Вставка 2 (JS): js_ins + '\n' перед якорем конца Этапа 6
    marker2 = js_ins + '\n'
    p2 = rec.find(js_ins)
    assert p2 >= 0, 'JS вставка Э7 не найдена'
    assert rec[p2 + len(marker2):p2 + len(marker2) + len('/* ===== learn_player_stage6')] \
        == '/* ===== learn_player_stage6', 'JS вставка Э7 не перед якорем Э6'
    rec = rec[:p2] + rec[p2 + len(marker2):]

    ok = rec == old
    print('diff7:', 'PASS' if ok else 'FAIL')
    print('  байт: {} (v12.8) / {} (v12.9) / {} (реконструкция)'.format(len(old), len(new), len(rec)))
    if not ok:
        n = min(len(old), len(rec))
        for i in range(n):
            if old[i] != rec[i]:
                print('  первое расхождение на байте {}:'.format(i))
                print('   old: {!r}'.format(old[max(0, i-60):i+60]))
                print('   rec: {!r}'.format(rec[max(0, i-60):i+60]))
                break
        else:
            print('  хвост old={!r}'.format(old[n:n+120]))
            print('  хвост rec={!r}'.format(rec[n:n+120]))
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
