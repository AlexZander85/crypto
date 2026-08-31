#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дифф-контракт Этапа 5: v12.6 → v12.7 — СТРОГАЯ проверка.
1) Каждый из 12 якорей E1..E12 встречается в v12.6 ровно 1 раз, в v12.7 — 0 раз.
2) Каждый новый фрагмент встречается в v12.7 ровно 1 раз.
3) Обратная реконструкция: v12.7 − (12 новых фрагментов → 12 старых) − (вставка JS)
   == v12.6 БАЙТ-В-БАЙТ. Это и есть контракт: ничего, кроме списка правок и
   одной вставки, в файле не изменилось."""
import sys

A = '/home/z/my-project/download/index_v12.6.html'
B = '/home/z/my-project/download/index_v12.7.html'
INJ = '/home/z/my-project/scripts/inject_stage5.py'
JS = ['/home/z/my-project/scripts/stage5_js_part1.js',
      '/home/z/my-project/scripts/stage5_js_part2.js',
      '/home/z/my-project/scripts/stage5_js_part3.js']

src_inject = open(INJ, encoding='utf-8').read()
ns = {'__name__': 'not_main'}
exec(compile(src_inject.split('def main()')[0], INJ, 'exec'), ns)
EDITS = ns['EDITS']
JS_ANCHOR = ns['JS_ANCHOR']

a = open(A, encoding='utf-8').read()
b = open(B, encoding='utf-8').read()
ok = True

# 1) якоря старых фрагментов (старый может входить в новый — guard + исходная строка)
for tag, old, new in EDITS:
    ca, cb = a.count(old), b.count(old)
    allowed_in_new = new.count(old)
    if ca != 1 or cb != allowed_in_new:
        print(f'FAIL {tag}: старый фрагмент: v12.6={ca} (ожид. 1), v12.7={cb} (ожид. {allowed_in_new} — вхождения внутри нового фрагмента)')
        ok = False

# 2) новые фрагменты
for tag, old, new in EDITS:
    cn = b.count(new)
    if cn != 1:
        print(f'FAIL {tag}: новый фрагмент в v12.7={cn} (ожид. 1)')
        ok = False

# 3) обратная реконструкция
rec = b
for tag, old, new in EDITS:
    rec = rec.replace(new, old, 1)
js = '\n'.join(open(p, encoding='utf-8').read().rstrip() for p in JS) + '\n'
inserted = js + '\n'
if rec.count(inserted) != 1:
    print(f'FAIL: вставка JS найдена в реконструкции {rec.count(inserted)} раз (ожид. 1)')
    ok = False
else:
    rec = rec.replace(inserted, '', 1)
if rec != a:
    print('FAIL: реконструкция не совпала с v12.6 байт-в-байт')
    # первая позиция расхождения — для диагностики
    for i, (x, y) in enumerate(zip(rec, a)):
        if x != y:
            print(f'  первая разница на байте {i}: {rec[i-40:i+40]!r} vs {a[i-40:i+40]!r}')
            break
    ok = False

# сводка
changed = sum(1 for tag, old, new in EDITS)
print(f'правок: {changed}, вставок: 1 (модуль Этапа 5, {len(js.splitlines())} строк перед «{JS_ANCHOR.strip()}»)')
print('DIFF_CONTRACT_5:', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
