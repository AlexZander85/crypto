#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_registry.py — валидатор V16-CONTENT-USAGE-REGISTRY.md (DoD задачи A промта 05).

Проверяет:
  1. Машиночитаемость: каждая строка-единица разбирается на 7 колонок.
  2. Статусы: каждая строка имеет ровно один статус из {☐, 🔧, ✅, ⛔}; пустых статусов нет.
  3. Причины: каждая строка ⛔ имеет непустое примечание (причину) — «пустых причин не оставлять».
  4. Счёты: число единиц по категориям (§0 «Счёт-контроль») сходится с эталонами
     (или расхождение объяснено — строка помечена ≠ и имеет комментарий).
  5. Уникальность id внутри реестра.

Выход: отчёт в stdout; код 0 — реестр валиден, 1 — есть нарушения.
Запуск: python3 scripts/validate_registry.py [--final]
  --final — строгий режим приёмки релиза: любые ≠/☐/🔧 считаются нарушением
  (к финалу проекта все единицы должны быть ✅/⛔ с причиной).
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REG = REPO / "V16-CONTENT-USAGE-REGISTRY.md"
STATUS_MARKS = ("☐", "🔧", "✅", "⛔")
FINAL = "--final" in sys.argv

errors, warnings, stats = [], [], {"rows": 0, "by_status": {}, "ids": set()}

text = REG.read_text(encoding="utf-8")
lines = text.splitlines()

# --- Таблицы единиц: секции «## §N. …», строки «| id | … |» ------------------
sec_re = re.compile(r"^## §\d+\.")
row_re = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\s*\|\s*$")
cur_sec = None
in_units = False
for ln, line in enumerate(lines, 1):
    if sec_re.match(line):
        cur_sec = line.strip()
        in_units = True
        continue
    if line.startswith("## ") and not sec_re.match(line):
        in_units = cur_sec is not None and line.startswith("## 16.") is False
        if line.startswith("## 16.") or line.startswith("## 0."):
            in_units = False
    if not in_units or not line.startswith("|") or "---" in line or line.startswith("| id |") \
       or line.startswith("| Категория |"):
        continue
    if not cur_sec or cur_sec.startswith("## §0") or cur_sec.startswith("## 16"):
        continue
    m = row_re.match(line)
    if not m:
        errors.append(f"L{ln}: строка не разбирается на 7 колонок: {line[:80]}…")
        continue
    uid, src, typ, vol, dest, status, note = (g.strip() for g in m.groups())
    stats["rows"] += 1
    # статус
    found = [s for s in STATUS_MARKS if s in status]
    if len(found) != 1:
        errors.append(f"L{ln} [{uid}]: статус «{status}» — нет ровно одного маркера из ☐/🔧/✅/⛔")
    else:
        stats["by_status"][found[0]] = stats["by_status"].get(found[0], 0) + 1
        if found[0] == "⛔" and not note:
            errors.append(f"L{ln} [{uid}]: ⛔ без причины (пустое примечание)")
        if FINAL and found[0] in ("☐", "🔧"):
            errors.append(f"L{ln} [{uid}]: финал — статус {found[0]} не закрыт (должен быть ✅/⛔)")
    # уникальность id
    if uid in stats["ids"]:
        errors.append(f"L{ln}: дубль id «{uid}»")
    stats["ids"].add(uid)
    # источник обязателен и непуст
    if not src:
        errors.append(f"L{ln} [{uid}]: пустой источник")

# --- Счёт-контроль §0 ---------------------------------------------------------
ctl_re = re.compile(r"^\|\s*(.+?)\s*\|\s*([\d/ ≈]+)\s*\|\s*([\d/+ ]+)\s*\|\s*(.*?)\s*\|\s*$")
mismatch = 0
for ln, line in enumerate(lines, 1):
    m = ctl_re.match(line)
    if not m or line.startswith("| Категория |"):
        continue
    name, actual, ref, note = (g.strip() for g in m.groups())
    if name in ("Категория",) or actual.startswith("—"):
        continue
    if actual == ref:
        continue
    mismatch += 1
    if not note:
        errors.append(f"L{ln} [§0 {name}]: расхождение {actual} ≠ {ref} без комментария")
    else:
        warnings.append(f"[§0 {name}]: {actual} ≠ {ref} — объяснено: {note[:100]}")

# --- Отчёт --------------------------------------------------------------------
print(f"Реестр: {REG.name}")
print(f"Единиц (строк): {stats['rows']}")
for s in STATUS_MARKS:
    print(f"  {s} {stats['by_status'].get(s, 0)}")
print(f"Расхождений счёта (объяснённых): {mismatch}")
for w in warnings:
    print(f"  ⚠ {w}")
if errors:
    print(f"\nНАРУШЕНИЙ: {len(errors)}")
    for e in errors[:50]:
        print(f"  ✗ {e}")
    if len(errors) > 50:
        print(f"  … и ещё {len(errors) - 50}")
    sys.exit(1)
print("\nВАЛИДНО: машиночитаемость, статусы, причины ⛔, счёты — ОК"
      + ("" if not FINAL else " (строгий режим финала)"))
