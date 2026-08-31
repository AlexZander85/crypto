#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дифф-контракт Этапа 3: v12.4 → v12.5 — ровно 2 вставки, ноль правок/удалений."""
import difflib, sys

v124 = open('/home/z/my-project/download/index_v12.4.html', encoding='utf-8').read().split('\n')
v125 = open('/home/z/my-project/download/index_v12.5.html', encoding='utf-8').read().split('\n')

sm = difflib.SequenceMatcher(None, v124, v125, autojunk=False)
ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
inserts, other = [], []
for tag, i1, i2, j1, j2 in ops:
    if tag == 'insert':
        inserts.append((i1, i2, j1, j2, j2 - j1))
    else:
        other.append((tag, i1, i2, j1, j2))

print(f'op-кодов не-equal: {len(ops)}')
for ins in inserts:
    print(f'  INSERT: v124[{ins[0]}:{ins[1]}] → v125[{ins[2]}:{ins[3]}]  (+{ins[4]} строк)')
for o in other:
    print(f'  ⚠️ {o[0].upper()}: {o[1]}:{o[2]} → {o[3]}:{o[4]}')

# Проверка содержимого вставок
ok1 = ok2 = False
for ins in inserts:
    frag = '\n'.join(v125[ins[2]:ins[3]])
    if 'learn_player_stage3' in frag and '--lp-fs' in frag and '</style>' not in frag.replace('</style>', '</style>'):
        pass
    if 'КРИПТОНАВИГАТОР v12.5 · ЭТАП 3 · Платформенный слой' in frag and 'lp3-tabs' in frag:
        ok1 = True
        print('  вставка 1 = CSS Этапа 3 ✓')
    if 'learn_player_stage3: Этап 3 (конец)' in frag and 'learnCoursePct' in frag:
        ok2 = True
        print('  вставка 2 = JS Этапа 3 ✓')

passed = len(ops) == 2 and all(t == 'insert' for t, *_ in ops) and ok1 and ok2
print('DIFF_CONTRACT:', 'PASS — ровно 2 аддитивные вставки, правок существующих функций: 0' if passed else 'FAIL')
sys.exit(0 if passed else 1)
