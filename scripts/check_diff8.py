#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_diff8: строгий дифф-контракт Этапа 8.
Обратная реконструкция: из index_v13.0.html удаляются ровно 2 вставки
(JS stage8 после маркера конца Этапа 7; CSS-блок learn_player_stage8_css
перед «LEARN PLAYER — конец») — результат обязан совпасть с index_v12.9.html
байт-в-байт. Дополнительно: убеждаемся, что вне вставок совпадает ВСЁ.
"""
import sys, hashlib

V129 = '/home/z/my-project/download/index_v12.9.html'
V130 = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/download/index_v13.0.html'

JS_ANCHOR = '/* ===== learn_player_stage7: Этап 7 (конец) ===== */'
END_COMMENT = '<!-- ================= LEARN PLAYER — конец ================= -->'
CSS_OPEN = '<style id="learn_player_stage8_css">'

def sha(b): return hashlib.sha256(b).hexdigest()[:16]

def main():
    a = open(V129, 'rb').read().decode('utf-8')
    b = open(V130, 'rb').read().decode('utf-8')

    # 1) вырезать CSS-вставку
    i = b.find(CSS_OPEN)
    assert i >= 0, 'CSS-вставка не найдена'
    j = b.find('</style>', i)
    assert j >= 0, 'закрывающий </style> вставки не найден'
    # после вставки должен идти перевод строки и маркер конца
    tail = b[j + len('</style>'):]
    assert tail.startswith('\n' + END_COMMENT), 'CSS-вставка стоит не перед «LEARN PLAYER — конец»'
    b1 = b[:i] + tail[1:]

    # 2) вырезать JS-вставку: между якорем конца Этапа 7 и маркером конца Этапа 6
    k = b1.find(JS_ANCHOR)
    assert k >= 0, 'якорь конца Этапа 7 не найден'
    k_end = k + len(JS_ANCHOR)
    m = b1.find('/* ===== learn_player_stage6: Этап 6 (конец) ===== */', k_end)
    assert m >= 0, 'маркер конца Этапа 6 не найден'
    mid = b1[k_end:m]
    assert 'learn_player_stage8' in mid and 'CN_TRACKS' in mid, 'в вставке нет кода Этапа 8'
    # нормализуем ровно так, как вставлял инжектор: '\n\n' + js + '\n';
    # в оригинале между якорем и маркером Этапа 6 стоит '\n\n'
    assert mid.startswith('\n\n') and mid.endswith('\n'), 'обрамление JS-вставки не соответствует инжектору'
    b2 = b1[:k_end] + '\n\n' + b1[m:]

    ok = (a == b2)
    print('Обратная реконструкция v13.0 → v12.9:', 'IDENTICAL' if ok else 'MISMATCH')
    print('  v12.9 sha:', sha(a.encode('utf-8')), f'({len(a)} симв.)')
    print('  recon  sha:', sha(b2.encode('utf-8')), f'({len(b2)} симв.)')
    if not ok:
        # первый несовпавший участок
        n = min(len(a), len(b2))
        for p in range(n):
            if a[p] != b2[p]:
                print('  первое расхождение на позиции', p)
                print('   v12.9:', repr(a[max(0,p-60):p+60]))
                print('   recon:', repr(b2[max(0,p-60):p+60]))
                break
        else:
            print('  расхождение длины: остаток', repr(a[n:n+120]) if len(a) > n else repr(b2[n:n+120]))
        return 1
    # 3) число вхождений маркеров
    print('  маркер stage8 в v13.0:', b.count('learn_player_stage8'), '(ожидается ≥3: CSS id, JS начало, JS конец)')
    print('PASS')
    return 0

if __name__ == '__main__':
    sys.exit(main())
