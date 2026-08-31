#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дифф-контракт Этапа 6: v12.7 → v12.8 — СТРОГАЯ проверка.
Ровно 2 аддитивные вставки (CSS + JS), 0 правок: v12.8 − вставки == v12.7 байт-в-байт."""
import sys

A = '/home/z/my-project/download/index_v12.7.html'
B = '/home/z/my-project/download/index_v12.8.html'
INJ = '/home/z/my-project/scripts/inject_stage6.py'
JS = ['/home/z/my-project/scripts/stage6_js_part1.js',
      '/home/z/my-project/scripts/stage6_js_part2.js',
      '/home/z/my-project/scripts/stage6_js_part3.js']
CSS = '/home/z/my-project/scripts/stage6_css.css'

src_inject = open(INJ, encoding='utf-8').read()
ns = {'__name__': 'not_main'}
exec(compile(src_inject.split('def main()')[0], INJ, 'exec'), ns)
JS_ANCHOR = ns['JS_ANCHOR']

a = open(A, encoding='utf-8').read()
b = open(B, encoding='utf-8').read()
ok = True

css = open(CSS, encoding='utf-8').read().rstrip() + '\n'
css_ins = '\n' + css
js = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'
js_ins = js + '\n'

if b.count(css_ins) != 1:
    print(f'FAIL: CSS-вставка встречается в v12.8 {b.count(css_ins)} раз (ожид. 1)'); ok = False
if b.count(js_ins) != 1:
    print(f'FAIL: JS-вставка встречается в v12.8 {b.count(js_ins)} раз (ожид. 1)'); ok = False

rec = b.replace(css_ins, '', 1).replace(js_ins, '', 1)
if rec != a:
    for i, (x, y) in enumerate(zip(rec, a)):
        if x != y:
            print(f'FAIL: реконструкция не совпала с v12.7 (байт {i}: {rec[i-40:i+40]!r} vs {a[i-40:i+40]!r})')
            break
    else:
        print(f'FAIL: реконструкция длиннее/короче v12.7 ({len(rec)} vs {len(a)})')
    ok = False

print(f'вставок: 2 (CSS {len(css.splitlines())} строк; JS {len(js.splitlines())} строк перед «{JS_ANCHOR.strip()}»), правок: 0')
print('DIFF_CONTRACT_6:', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
