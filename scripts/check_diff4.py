#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дифф-контракт Этапа 4: v12.5 → v12.6 — ровно 2 вставки, ноль правок/удалений."""
import difflib, sys

v125 = open('/home/z/my-project/download/index_v12.5.html', encoding='utf-8').read().split('\n')
v126 = open('/home/z/my-project/download/index_v12.6.html', encoding='utf-8').read().split('\n')

sm = difflib.SequenceMatcher(None, v125, v126, autojunk=False)
ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
inserts, other = [], []
for tag, i1, i2, j1, j2 in ops:
    if tag == 'insert':
        inserts.append((i1, i2, j1, j2, j2 - j1))
    else:
        other.append((tag, i1, i2, j1, j2))

print(f'op-кодов не-equal: {len(ops)}')
for ins in inserts:
    print(f'  INSERT: v125[{ins[0]}:{ins[1]}] → v126[{ins[2]}:{ins[3]}]  (+{ins[4]} строк)')
for o in other:
    print(f'  ⚠️ {o[0].upper()}: {o[1]}:{o[2]} → {o[3]}:{o[4]}')

ok1 = ok2 = False
for ins in inserts:
    frag = '\n'.join(v126[ins[2]:ins[3]])
    if 'КРИПТОНАВИГАТОР v12.6 · ЭТАП 4' in frag and 'mentor_upsell_modal' in frag:
        ok1 = True
        print('  вставка 1 = CSS Этапа 4 ✓')
    if 'learn_player_stage4: ЭТАП 4 — Пункт 1' in frag and 'cn_learn_mist' in frag and 'smoke4()' in frag:
        ok2 = True
        print('  вставка 2 = JS Этапа 4 ✓')

passed = len(ops) == 2 and all(t == 'insert' for t, *_ in ops) and ok1 and ok2
print('DIFF_CONTRACT:', 'PASS — ровно 2 аддитивные вставки, правок существующих функций: 0' if passed else 'FAIL')
sys.exit(0 if passed else 1)
