#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка дифф-контракта Этапа 2: между v12.3 и v12.4 допустимы ТОЛЬКО
(а) вставки в блоки learn_player_css / learn_player_js, (б) 4 замены alert."""
import difflib, sys

a = open('work_index.html', encoding='utf-8').read().split('\n')
b = open('index_v12.4.html', encoding='utf-8').read().split('\n')
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
ops = sm.get_opcodes()
print('opcodes:', len(ops))
in_css = False
in_js = False
css_start = css_end = None
js_start = js_end = None
# границы блоков плеера
for i, l in enumerate(a):
    if '<style id="learn_player_css">' in l: css_start = i
    if css_start is not None and css_end is None and '</style>' in l and i > css_start: css_end = i
    if '<script id="learn_player_js">' in l: js_start = i
    if js_start is not None and '</script>' in l and i > js_start and js_end is None: js_end = i
print('css block:', css_start, css_end, '| js block:', js_start, js_end)

bad = []
for tag, i1, i2, j1, j2 in ops:
    if tag == 'equal': continue
    # где находятся изменённые строки ИСХОДНИКА
    inside_css = css_start is not None and i1 >= css_start and i2 <= css_end + 1
    inside_js = js_start is not None and i1 >= js_start and i2 <= js_end + 1
    kind = ''
    if inside_css and tag == 'insert':
        kind = 'CSS-вставка'
    elif inside_js and tag == 'insert':
        kind = 'JS-вставка'
    elif tag == 'replace' and (j2 - j1) == (i2 - i1):
        # замены — допустимы только 4 alert-строки
        kinds = set()
        for k in range(i1, i2):
            if 'LEARN_PLAYER_ACTIVE) { LearnPlayer.onTestResult(' in b[j1 + (k - i1)]:
                kinds.add('alert')
        if len(kinds) == 1 and (i2 - i1) <= 4:
            kind = 'alert-перехват x%d' % (i2 - i1)
    if not kind:
        bad.append((tag, i1, i2, j1, j2))
    else:
        print('%s: src[%d:%d] -> out[%d:%d] (%d строк)' % (kind, i1, i2, j1, j2, j2 - j1))

if bad:
    print('\nНЕДОПУСТИМЫЕ правки:')
    for tag, i1, i2, j1, j2 in bad:
        print(tag, 'src', i1, i2, 'out', j1, j2)
        for l in a[i1:i2][:4]: print('  -', l[:110])
        for l in b[j1:j2][:4]: print('  +', l[:110])
    sys.exit(1)
print('\nДифф-контракт соблюдён: только CSS/JS вставки в блоки плеера + alert-перехваты.')
