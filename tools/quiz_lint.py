#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""quiz_lint.py — линтер банков викторин «КриптоНавигатор».

Реализация спецификации «Линтер викторин» из ревью (fable.md): правила Q01–Q18
(уровень вопроса) и M01–M08 (уровень модуля/банка), пул «универсальных» фраз,
лексикон абсурдных дистракторов, отчёты lint_report.{json,md}.

Уровни: BLOCK (сборка останавливается) / WARN (отчёт обязателен) / REVIEW
(очередь редактора). Exit codes: 0 — чисто, 1 — есть WARN/REVIEW, 2 — есть BLOCK.

Банки (адаптеры экспорта из формата приложения — JS-литералы index_v15.1.html):
  microRecall, QUIZ_DATA, QUIZ_PSY, PSY_CUMULATIVE, PHASE_TESTS, CAPSTONE,
  ADAPTIVE, MATH_TESTS.

Неактивные правила (нет данных в текущей схеме — см. meta в отчёте):
  Q10 (нужен глоссарий с first_lesson), Q14/M07 (нет поля behavior),
  Q18 (в схеме только CHOICE), M08 (нет audit_key.json).

Примеры:
  python tools/quiz_lint.py --app index_v15.1.html --bank all
  python tools/quiz_lint.py --app index_v15.1.html --bank microRecall
  python tools/quiz_lint.py --self-test
"""
import argparse
import json
import math
import os
import re
import sys
from collections import Counter
from datetime import date

BUILD_YEAR = 2026
MAX_LEN_DEFAULT = 130

# ---------------- Справочники (из спецификации ревью) ----------------

PHRASE_POOL = [
    "Здесь важно отличать причину от следствия",
    "Устройство рынка в этом пункте жёстче, чем кажется",
    "Дисциплина процесса важнее разового исхода",
    "Данные стоит перепроверить в независимом источнике",
    "Скорость реакции без проверки данных обычно усиливает убыток",
    "Ключи и доступы проверяют до пополнения счёта",
    "Юрисдикция площадки определяет",
    "Исполнение по рынку в тонкой книге обходится дороже",
    "После серии выигрышей риск незаметно возрастает",
    "Страх пропустить вход искажает оценку",
    "Усталость трейдера видна в журнале сделок раньше",
    "В бычьей фазе такие решения прощаются",
    "Среднее без разброса — половина правды",
    "Корреляция сама по себе не доказывает направление влияния",
    "Резервную копию seed-фразы хранят так же серьёзно",
    "Похожие схемы уже повторялись в прошлых циклах",
    "второй взгляд дешевле одной ошибки",
    "Документируйте допущения",
    "Временные рамки решения стоит зафиксировать письменно",
    "Порядок действий в таком сценарии важнее скорости",
    "Детали исполнения обычно решают больше",
    "Малая выборка рисует яркие, но ненадёжные картины",
    "Один и тот же сигнал в разных рыночных режимах",
    "Проверяйте, за какой период посчитана статистика",
    "Аномалии в данных вычищают до того",
    "Спред и комиссия съедают заметную часть",
    "Решение принимается по плану, а эмоциональная реакция фиксируется",
    "Правило входа и правило выхода проверяют по отдельности",
    "Чек-лист перед сделкой экономит больше",
    "Выборка без учёта комиссий и проскальзывания всегда приукрашивает",
    "Бэктест без проверки на данных вне выборки",
    "Серию убытков закладывают в план заранее",
    "Такой порядок проверяется журналом, а не ощущением",
    "Этот подход согласуется с уставом и протоколом урока",
    "На дистанции это напрямую определяет кривую капитала",
    "Именно так дисциплина превращается в статистику",
    "Такое поведение защищает депозит в самый уязвимый момент",
    "На практике это отделяет систему от импульса",
    "Это снижает количество решений, принимаемых на эмоциях",
    "В долгую это определяет устойчивость всей системы",
    "Такой выбор согласуется с правилами управления капиталом",
    "Соблюдайте уставной протокол действий",
    "Не переносим правило автоматически",
]

ABSURD_LEXICON = re.compile(
    r"полици|правительств|регулятор[^\n]{0,30}запрещ|запрещ[^\n]{0,30}регулятор|"
    r"по праздникам|только ночью|только по выходным|отдыхают|пожарн|перегрева|"
    r"жар[аы]|зим[ойу]|Газпром|голосов[^\n]{0,20}сообщени|взлом[^\n]{0,20}чужих|"
    r"неправильный цвет|отключается ночью|блокируется на \d+ лет|"
    r"генерац\w* биткоин|принадлежит правительству|ускорить генерац",
    re.I,
)

# Утечки разметки (адаптация под приложение: $…$ — только LaTeX-подобное
# содержимое без цифр/пробелов, чтобы не ловить валюту «$50k … $1k»;
# тег — только за ним следует >, / или пробел, чтобы не ловить «a < b»)
LEAK = re.compile(
    r"(\*\*|(?<!\w)\*[^*\n]+\*(?!\w)|\\[a-zA-Z]+\{|"
    r"\$[^$\n]{1,60}\$|"
    r"<\s*/?[a-zA-Z][a-zA-Z0-9]*(?=[\s>/])|data-[\w-]+=|\{\{|\}\}|"
    r"G\d+/p\d+_l\d+|--acc\d)"
)

IMPERATIVES = [
    "выберите", "выбери", "рассчитайте", "рассчитай", "расставьте", "расставь",
    "соотнесите", "найдите", "найди", "укажите", "укажи", "допишите", "допиши",
    "определите", "определи", "почему", "зачем", "сколько", "что", "какой",
    "какая", "какое", "какие", "как", "кто", "где", "когда",
]

ALLOW_LATIN = {
    "BTC", "ETH", "USDT", "USDC", "API", "VPS", "JSON", "CSV", "IP", "PnL",
    "MA", "RSI", "EMA", "ATR", "OHLCV", "QQ", "APY", "KYC", "DCA", "ICO",
    "CFTC", "SEC", "VASP", "MiCA", "AMLP", "KYT", "TF", "h", "d", "w",
    "Metamask", "Ledger", "Polymarket", "Freqtrade", "CCXT", "pandas", "numpy",
    "QQ-plot", "Telegram", "heartbeat", "Rolling", "Hoarding", "MetaMask", "dry-run",
    "Kill-Switch", "DeFi", "AMM", "IL", "APR", "TVL", "NFT", "P2P", "Rug",
    "TA", "MACD", "Bollinger", "Maker", "Taker", "Pump", "Dump", "ETF",
}

# ---------------- Утилиты текста ----------------

def normalize(t):
    return re.sub(r"[^а-яa-z0-9 ]", " ", str(t).lower()).strip()

def sentences(t):
    return [s for s in re.split(r"(?<=[.!?])\s+", str(t).strip()) if s]

def ngrams(t, n=8):
    w = normalize(t).split()
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}

def char3(t):
    s = normalize(t).replace(" ", "")
    return Counter(s[i:i + 3] for i in range(len(s) - 2))

def cosine(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    num = sum(a[k] * b[k] for k in common)
    da = math.sqrt(sum(v * v for v in a.values()))
    db = math.sqrt(sum(v * v for v in b.values()))
    return num / (da * db) if da and db else 0.0

def sim(a, b):
    return cosine(char3(a), char3(b))

# ---------------- Парсер JS-литералов ----------------

def extract_balanced(src, start, open_ch="[", close_ch="]"):
    """Баланс скобок с учётом строк; start указывает на открывающую скобку."""
    depth, k, in_str, esc, dq = 0, start, False, False, None
    while k < len(src):
        c = src[k]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == dq:
                in_str = False
        else:
            if c in "\"'":
                in_str, dq = True, c
            elif c == open_ch:
                depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0:
                    return src[start:k + 1]
        k += 1
    return None

def extract_array(src, marker):
    i = src.find(marker)
    if i < 0:
        return None
    j = src.find("[", i)
    if j < 0:
        return None
    return extract_balanced(src, j, "[", "]")

def extract_object(src, marker):
    i = src.find(marker)
    if i < 0:
        return None
    j = src.find("{", i)
    if j < 0:
        return None
    return extract_balanced(src, j, "{", "}")

def read_str(raw, k, q):
    """Читает JS-строку (после открывающей кавычки q) с полной семантикой эскейпов.
    Возвращает (значение, индекс после закрывающей кавычки)."""
    buf = []
    n = len(raw)
    while k < n:
        c = raw[k]
        if c == "\\":
            k += 1
            if k >= n:
                break
            e = raw[k]
            if e == "n":
                buf.append("\n")
            elif e == "t":
                buf.append("\t")
            elif e == "r":
                buf.append("\r")
            elif e == "b":
                buf.append("\b")
            elif e == "f":
                buf.append("\f")
            elif e == "u":
                hexs = raw[k + 1:k + 5]
                try:
                    buf.append(chr(int(hexs, 16)))
                    k += 4
                except ValueError:
                    buf.append(e)
            elif e == "\n":
                pass  # продолжение строки
            else:
                buf.append(e)  # \' \" \\ \/ и неизвестные → сам символ
        elif c == q:
            return "".join(buf), k + 1
        else:
            buf.append(c)
        k += 1
    return "".join(buf), k

def js_to_json(raw):
    """JS-литерал → JSON-текст: комментарии, строки обоих типов кавычек,
    ключи без кавычек, висячие запятые."""
    out, i, n = [], 0, len(raw)

    while i < n:
        c = raw[i]
        if c == "/" and i + 1 < n and raw[i + 1] == "/":
            while i < n and raw[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and raw[i + 1] == "*":
            i += 2
            while i + 1 < n and not (raw[i] == "*" and raw[i + 1] == "/"):
                i += 1
            i += 2
            continue
        if c in "\"'":
            s, i = read_str(raw, i + 1, c)
            out.append(json.dumps(s))
            continue
        if c in "{,":
            out.append(c)
            i += 1
            j = i
            while j < n and raw[j] in " \t\r\n":
                j += 1
            if j < n and (raw[j].isalpha() or raw[j] in "_$"):
                m = re.match(r"[A-Za-z_$][\w$]*", raw[j:])
                if m:
                    key = m.group(0)
                    k2 = j + len(key)
                    while k2 < n and raw[k2] in " \t\r\n":
                        k2 += 1
                    if k2 < n and raw[k2] == ":":
                        out.append(f'"{key}"')
                        i = j + len(key)
                        continue
            continue
        if c == ",":
            j = i + 1
            while j < n and raw[j] in " \t\r\n":
                j += 1
            if j < n and raw[j] in "]}":
                i += 1
                continue
        out.append(c)
        i += 1
    return "".join(out)

def loads_js(raw):
    return json.loads(js_to_json(raw), strict=False)

# ---------------- Адаптеры банков ----------------

def find_lesson_id(src, pos, window=60000):
    chunk = src[max(0, pos - window):pos]
    ids = re.findall(r'"id"\s*:\s*"([a-z0-9_]+)"', chunk)
    if not ids:
        ids = re.findall(r"id\s*:\s*'([a-z0-9_]+)'", chunk)
    return ids[-1] if ids else "?"

def mk(bank, module, qid, stem, opts, a, explain=None, lesson=None, scope="LESSON", **extra):
    rec = {
        "id": qid, "bank": bank, "module": module, "lesson_id": lesson,
        "stem": str(stem or ""), "options": [str(o) for o in (opts or [])],
        "a": a, "explain": explain, "scope": scope,
        "format": extra.pop("format", "CHOICE"),
    }
    rec.update(extra)
    return rec

def fmt_of(q):
    """CHOICE | NUMERIC (по спецификации §1.1)."""
    if q.get("type") == "numeric" or (not q.get("opts") and "answer" in q):
        return "NUMERIC"
    return "CHOICE"

def load_microrecall(src):
    out, seq = [], 0
    pat = re.compile(r'\{\s*"type"\s*:\s*"microRecall"\s*,')
    for m in pat.finditer(src):
        frag = extract_balanced(src, m.start(), "{", "}")
        if not frag:
            continue
        try:
            obj = json.loads(frag)
        except ValueError:
            try:
                obj = loads_js(frag)
            except Exception:
                continue
        seq += 1
        out.append(mk("microRecall", "CORE", f"MR-{seq:03d}", obj.get("q"),
                      obj.get("opts"), obj.get("a"),
                      lesson=find_lesson_id(src, m.start())))
    return out

def load_bank(src, marker, bank, module, qprefix):
    raw = extract_array(src, marker)
    if not raw:
        return []
    try:
        arr = loads_js(raw)
    except Exception as e:
        print(f"!! {bank}: не спарсился ({str(e)[:80]})", file=sys.stderr)
        return []
    out = []
    for i, q in enumerate(arr, 1):
        out.append(mk(bank, module, f"{qprefix}-{i:04d}", q.get("q"),
                      q.get("opts"), q.get("a") if fmt_of(q) == "CHOICE" else None,
                      q.get("explain"),
                      lesson=q.get("lessonId"), scope=q.get("scope", "LESSON"),
                      format=fmt_of(q), answer=q.get("answer"), absTol=q.get("absTol"),
                      unit=q.get("unit")))
    return out

def load_nested(src, marker, bank, qprefix, module_of=None):
    raw = extract_array(src, marker)
    if not raw:
        return []
    try:
        arr = loads_js(raw)
    except Exception as e:
        print(f"!! {bank}: не спарсился ({str(e)[:80]})", file=sys.stderr)
        return []
    out = []
    for t in arr:
        mod = module_of(t) if module_of else bank
        scope = "ATTESTATION" if marker == "const PHASE_TESTS" else "EXAM"
        for i, q in enumerate(t.get("questions", []), 1):
            out.append(mk(bank, mod, f"{qprefix}-{t.get('id', t.get('phase', '?'))}-{i:03d}",
                          q.get("q"), q.get("opts"),
                          q.get("a") if fmt_of(q) == "CHOICE" else None, q.get("explain"),
                          scope=scope, format=fmt_of(q), answer=q.get("answer"),
                          absTol=q.get("absTol"), unit=q.get("unit")))
    return out

def load_capstone(src):
    raw = extract_object(src, "const CAPSTONE_EXAM")
    if not raw:
        return []
    try:
        obj = loads_js(raw)
    except Exception as e:
        print(f"!! CAPSTONE: не спарсился ({str(e)[:80]})", file=sys.stderr)
        return []
    return [mk("CAPSTONE", "EXAM", f"CAP-{i:03d}", q.get("q"), q.get("opts"),
               q.get("a"), q.get("explain"), scope="EXAM")
            for i, q in enumerate(obj.get("questions", []), 1)]

TEXT_KEY_RE = re.compile(
    r'["\']?(level1|level2|level3|level4|text|simpleAnalogy|analogy|scenario|lead|recap|concept)["\']?\s*:\s*'
    r'(["\'])((?:[^\\]|\\.)*?)\2',
    re.S,
)

def unescape_js(s):
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == "\\" and i + 1 < n:
            e = s[i + 1]
            if e == "n":
                out.append("\n"); i += 2; continue
            if e == "t":
                out.append("\t"); i += 2; continue
            if e == "r":
                out.append("\r"); i += 2; continue
            if e == "u" and i + 5 < n:
                try:
                    out.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
                except ValueError:
                    pass
            out.append(e); i += 2; continue
        out.append(c)
        i += 1
    return "".join(out)

def load_lesson_ngrams(src):
    """Корпус текстов уроков — регэксп-скан (уроки содержат JS-функции/шаблоны
    и не обязаны быть валидным JSON). Ключи только текстоносные: квизы в корпус
    не входят, чтобы Q05 не дублировал Q08."""
    texts = []
    for m in TEXT_KEY_RE.finditer(src):
        val = unescape_js(m.group(3))
        if len(val) >= 40:
            texts.append(val)
    grams = set()
    for t in texts:
        grams |= ngrams(t)
    return grams, len(texts)

# ---------------- Правила уровня вопроса ----------------

class Ctx:
    def __init__(self, lesson_grams, max_len):
        self.lesson_grams = lesson_grams
        self.max_len = max_len

def check_question(q, ctx):
    """Возвращает список (rule, level, option, msg)."""
    items = []
    stem, opts, a = q["stem"], q["options"], q["a"]
    oids = ["A", "B", "C", "D", "E", "F"][:max(4, len(opts))] if opts else []

    def add(rule, level, opt, msg):
        items.append({"rule": rule, "level": level, "option": opt, "msg": msg})

    # Q01 · BLOCK · структура (CHOICE: 4 варианта + валидный индекс; NUMERIC: answer/absTol/unit)
    if q.get("format") == "NUMERIC":
        if not isinstance(q.get("answer"), (int, float)) or isinstance(q.get("answer"), bool):
            add("Q01", "BLOCK", None, "NUMERIC: answer не число")
        if not (isinstance(q.get("absTol"), (int, float)) and q.get("absTol") >= 0):
            add("Q01", "BLOCK", None, "NUMERIC: absTol отсутствует или < 0")
        if not q.get("unit"):
            add("Q01", "BLOCK", None, "NUMERIC: unit не указан")
    else:
        if len(opts) != 4:
            add("Q01", "BLOCK", None, f"вариантов {len(opts)}, должно быть 4")
        if opts and (not isinstance(a, int) or isinstance(a, bool) or not (0 <= a < len(opts))):
            add("Q01", "BLOCK", None, f"a={a!r}: индекс верного ответа вне диапазона или не число")
    texts_norm = [normalize(o) for o in opts]
    if len(set(texts_norm)) != len(texts_norm):
        add("Q01", "BLOCK", None, "два нормализованно-одинаковых варианта")
    if not stem.strip():
        add("Q01", "BLOCK", None, "пустой стем")

    # Q02 · BLOCK · в стеме есть вопрос или задание
    s = stem.strip().lower()
    if not ("?" in s or any(w in s for w in IMPERATIVES)):
        add("Q02", "BLOCK", None, "стем — утверждение без вопроса")

    # Q03 · BLOCK · длина и целостность варианта
    for i, o in enumerate(opts):
        t = o.strip()
        oi = oids[i] if i < len(oids) else str(i)
        if len(t) > ctx.max_len:
            add("Q03", "BLOCK", oi, f"{len(t)} символов > {ctx.max_len}")
        if len(sentences(t)) > 2:
            add("Q03", "BLOCK", oi, f"предложений {len(sentences(t))} > 2")
        if re.search(r"(…|\.\.\.)\s*$", t):
            add("Q03", "BLOCK", oi, "усечён многоточием")
        if re.search(r"\w{2,}…", t):
            add("Q03", "BLOCK", oi, "усечён посреди слова")

    # Q04 · BLOCK · фраза из пула «универсальных» хвостов
    pool = [normalize(p) for p in PHRASE_POOL]
    for i, o in enumerate(opts):
        oi = oids[i] if i < len(oids) else str(i)
        nt = normalize(o)
        for p in pool:
            if p and p in nt:
                add("Q04", "BLOCK", oi, f"фраза из пула: «{p[:40]}…»")
                break

    # Q05 · BLOCK · копипаст из тела урока (8-граммы) + маркеры списка
    for i, o in enumerate(opts):
        oi = oids[i] if i < len(oids) else str(i)
        hit = ngrams(o) & ctx.lesson_grams
        if hit:
            add("Q05", "BLOCK", oi, f"дословный фрагмент урока: «{sorted(hit)[0][:50]}…»")
        if re.search(r"(•|\n\s*\d+\.\s|\s\d+\.\s[а-я])", o):
            add("Q05", "BLOCK", oi, "буллит/нумерация внутри варианта")

    # Q06 · WARN · отношение длин вариантов
    if len(opts) >= 2:
        L = [len(o.strip()) for o in opts]
        ratio = max(L) / max(1, min(L))
        if ratio > 1.6:
            add("Q06", "WARN", None, f"отношение длин {ratio:.2f} > 1.6")

    # Q07 · BLOCK · объяснение и согласованность с ключом
    # (для всех банков со схемой explain; microRecall — без explain в схеме данных)
    exp = q["explain"]
    if q["bank"] != "microRecall":
        if isinstance(exp, str):
            if len(exp.strip()) < 20:
                add("Q07", "BLOCK", None, "нет объяснения (<20 символов)")
            else:
                first = sentences(exp)[0].lower() if sentences(exp) else exp.lower()
                if isinstance(a, int) and 0 <= a < len(opts):
                    if first.startswith(("нет", "неверно", "это не так")):
                        add("Q07", "BLOCK", oids[a], "отмечен верным, но объяснение начинается с отрицания — сдвиг ключа?")
        elif isinstance(exp, list):
            if not any(isinstance(x, str) and len(x.strip()) >= 20 for x in exp):
                add("Q07", "BLOCK", None, "список explain пуст/короткий")
        else:
            add("Q07", "BLOCK", None, "нет поля explain")

    # Q08 · BLOCK · дубли вариантов
    for i in range(len(texts_norm)):
        for j in range(i + 1, len(texts_norm)):
            if texts_norm[i] == texts_norm[j]:
                add("Q08", "BLOCK", f"{oids[i]},{oids[j]}", "два одинаковых варианта")
            elif sim(opts[i], opts[j]) >= 0.85:
                add("Q08", "BLOCK", f"{oids[i]},{oids[j]}", "варианты почти совпадают")

    # Q09 · BLOCK · утечки разметки
    for field, fname in [(stem, "стем")] + [(o, oids[i] if i < len(oids) else str(i)) for i, o in enumerate(opts)]:
        m = LEAK.search(field)
        if m:
            # фильтр валюты: $…$ без цифр/пробелов — LaTeX; иначе пропускаем
            frag = m.group(0)
            if "$" in frag:
                span = m.start()
                rest = re.search(r"\$[^$\n]{1,60}\$", field[span:])
                if rest and re.search(r"[\d\s]", rest.group(0)):
                    continue
            add("Q09", "BLOCK", fname, f"утечка разметки: «{frag[:30]}»")

    # Q11 · REVIEW · английский термин без русской пары (глоссария нет — на ревью)
    latin = set(re.findall(r"\b[A-Za-z][A-Za-z\-]{2,}\b", stem))
    for tok in latin:
        if tok in ALLOW_LATIN or tok.lower() in {a.lower() for a in ALLOW_LATIN}:
            continue
        if "_" in tok or "." in tok or "(" in tok:
            continue
        add("Q11", "REVIEW", None, f"английский термин «{tok}» — проверить пару русский (english) по глоссарию")

    # Q13 · REVIEW · эвристика абсурдного дистрактора
    if isinstance(a, int) and 0 <= a < len(opts):
        correct_words = len(opts[a].split())
        for i, o in enumerate(opts):
            if i == a:
                continue
            oi = oids[i] if i < len(oids) else str(i)
            if ABSURD_LEXICON.search(o.lower()):
                add("Q13", "REVIEW", oi, f"похож на абсурдный дистрактор: «{o[:60]}»")
            if len(o.split()) <= 6 and correct_words >= 15:
                add("Q13", "REVIEW", oi, "слишком короткий на фоне правильного — вероятно, «пустышка»")

    # Q15 · BLOCK · прогноз будущего как факт
    for y in re.findall(r"\b(20\d\d)\b", stem):
        if int(y) > BUILD_YEAR:
            add("Q15", "BLOCK", None, f"стем ссылается на {y} как на факт")

    # Q16 · WARN · один вопрос — одна идея
    if stem.count("?") >= 2:
        add("Q16", "WARN", None, "в стеме два вопроса")
    if re.search(r"\bи (как|почему|зачем|что)\b", stem.lower()):
        add("Q16", "WARN", None, "составной вопрос («что такое X и как…»)")

    # Q17 · BLOCK · нормативы курса: 40/40/20 без имени
    if isinstance(a, int) and 0 <= a < len(opts):
        blob = normalize(stem + " " + opts[a])
        if re.search(r"40\s*/\s*40\s*/\s*20", blob):
            if "пирамида благосостояния" not in blob and "портфель бота" not in blob:
                add("Q17", "BLOCK", None, "40/40/20 без уточнения («пирамида благосостояния» / «портфель бота»)")

    return items

# ---------------- Правила уровня модуля/банка ----------------

def chisquare_uniform(counts, n):
    exp = n / 4
    chi2 = sum((c - exp) ** 2 / exp for c in counts)
    # df=3: p по хи-квадрат (приближение Уилсона–Хилферти достаточно)
    k = 3
    z = (chi2 / k) ** (1 / 3) - (1 - 2 / (9 * k))
    z /= math.sqrt(2 / (9 * k))
    p = 0.5 * (1 - math.erf(z / math.sqrt(2)))
    return p

def longest_run(seq):
    """Серия одинаковых подряд идущих значений (для ключа позиций)."""
    best = cur = 0
    last = object()
    for x in seq:
        cur = cur + 1 if x == last else 1
        best = max(best, cur)
        last = x
    return best

def longest_run_true(seq):
    """Серия подряд идущих истинных флагов (для циклов/дифов)."""
    best = cur = 0
    for x in seq:
        cur = cur + 1 if x else 0
        best = max(best, cur)
    return best

def check_bank(bank, questions):
    items = []
    key = [q["a"] for q in questions if isinstance(q["a"], int) and q["options"]]
    n = len(key)

    # M01 · BLOCK · распределение позиций верного ответа (хранимый порядок)
    if n >= 8:
        counts = [key.count(i) for i in range(4)]
        p = chisquare_uniform(counts, n)
        if p <= 0.05:
            items.append({"rule": "M01", "level": "BLOCK", "option": None,
                          "msg": f"распределение позиций неравномерно: {counts}, p={p:.3f}"})

    # M02 · BLOCK · серии и арифметические циклы
    if n >= 8:
        run = longest_run(key)
        if run > 3:
            items.append({"rule": "M02", "level": "BLOCK", "option": None,
                          "msg": f"серия из {run} одинаковых позиций"})
        for step in (1, 3):
            diffs = [1 if (key[i + 1] - key[i]) % 4 == step else 0 for i in range(n - 1)]
            cyc = longest_run_true(diffs) + 1 if diffs else 0
            if cyc >= 6:
                items.append({"rule": "M02", "level": "BLOCK", "option": None,
                              "msg": f"арифметический цикл с шагом {step if step == 1 else -1} длиной {cyc}"})
        blocks = [len(list(g)) for _, g in __import__("itertools").groupby(key)]
        if len(blocks) <= 4 and min(blocks) >= 5:
            items.append({"rule": "M02", "level": "BLOCK", "option": None,
                          "msg": f"ключ разбит на блоки {blocks}"})

    # M03 · BLOCK/WARN · дубли стемов
    stems = [(q["id"], q["stem"]) for q in questions]
    for i in range(len(stems)):
        for j in range(i + 1, len(stems)):
            s = sim(stems[i][1], stems[j][1])
            if s >= 0.95:
                items.append({"rule": "M03", "level": "BLOCK", "option": None,
                              "msg": f"стемы идентичны: {stems[i][0]} и {stems[j][0]}"})
            elif s >= 0.85:
                items.append({"rule": "M03", "level": "WARN", "option": None,
                              "msg": f"стемы почти совпадают ({s:.2f}): {stems[i][0]} и {stems[j][0]}"})

    # Q08-межвопросный · BLOCK · чужие дистракторы (внутри банка)
    opts_all = [(q["id"], o) for q in questions for o in q["options"]]
    seen = {}
    for qid, o in opts_all:
        k = normalize(o)
        if len(k) < 25:
            continue
        if k in seen and seen[k][0] != qid:
            items.append({"rule": "Q08", "level": "BLOCK", "option": None,
                          "msg": f"дистрактор «{o[:40]}…» повторяется в {seen[k][0]} и {qid}"})
        else:
            seen[k] = (qid, o)

    # M04 · BLOCK · «правильный = самый длинный»
    qs = [q for q in questions if q["options"] and isinstance(q["a"], int) and 0 <= q["a"] < len(q["options"])]
    if qs:
        longest_is_correct = sum(
            1 for q in qs
            if len(q["options"][q["a"]]) == max(len(o) for o in q["options"]))
        share = longest_is_correct / len(qs)
        if share > 0.35:
            items.append({"rule": "M04", "level": "BLOCK", "option": None,
                          "msg": f"в {share:.0%} вопросов правильный — самый длинный (допустимо ≤ 35%)"})

    # M05 · WARN · пропорции форматов
    if len(questions) > 20:
        n_num = sum(1 for q in questions if q.get("format") == "NUMERIC")
        if n_num / len(questions) < 0.15:
            items.append({"rule": "M05", "level": "WARN", "option": None,
                          "msg": f"формат NUMERIC: {n_num}/{len(questions)} при цели ≥ 20%; CHOICE — остальное (цель 50%)"})

    # M06 · BLOCK · размеры аттестаций/экзамена
    if bank == "PHASE_TESTS":
        by_phase = Counter(q["module"] for q in questions)
        for ph, cnt in sorted(by_phase.items()):
            if cnt > 30:
                items.append({"rule": "M06", "level": "BLOCK", "option": None,
                              "msg": f"аттестация фазы {ph}: {cnt} вопросов > 30"})
    if bank == "CAPSTONE" and len(questions) > 40:
        items.append({"rule": "M06", "level": "BLOCK", "option": None,
                      "msg": f"экзамен: {len(questions)} вопросов > 40"})
    return [x for x in items if x.get("level")]

# ---------------- Само-тест (фикстуры из спецификации §6) ----------------

FIXTURES = [
    {
        "name": "f_016_truncated",
        "q": mk("FIX", "FIX", "F1", "Что произойдёт при ликвидации?",
                ["Цена достигает уровня −5%", "…ликвидация наступит чуть РАНЬШЕ −5%: биржа держит буфер подд…",
                 "Маржа останется неизменной", "Биржа закроет позицию по рынку"], 1, "Объяснение достаточной длины."),
        "expect": {"Q03"},
    },
    {
        "name": "f_012_latex",
        "q": mk("FIX", "FIX", "F2", "Что происходит с доходностью?",
                ["Растёт линейно", "Преобразуется $\\rightarrow$ в лог-шкалу",
                 "Не меняется", "Удваивается"], 1, "Объяснение достаточной длины."),
        "expect": {"Q09"},
    },
    {
        "name": "f_034_telegram_absurd",
        "q": mk("FIX", "FIX", "F3", "Каково преимущество новости из Telegram?",
                ["В Telegram по выходным запрещено писать на русском языке.",
                 "Почти нулевое, потому что быстрое движение уже произошло, его забрали те, кто быстрее — сигнал доходит через каскад репостов с задержкой в минуты",
                 "Среднее", "Высокое"],
                1, "Почти нулевое: новость уже отработана рынком."),
        "expect": {"Q13", "Q06", "Q03"},
    },
    {
        "name": "f_057_two_ideas",
        "q": mk("FIX", "FIX", "F4", "Что такое Alpha Decay и как её замечают?",
                ["Это рост доходности", "Это постепенное угасание edge стратегии",
                 "Это обвал за день", "Это не про торговлю"], 1, "Это постепенное угасание edge."),
        "expect": {"Q16", "Q11"},
    },
    {
        "name": "f_092_no_question",
        "q": mk("FIX", "FIX", "F5", "Стратегия выигрывает в 55% случаев.",
                ["Это значит, что половина сделок в плюс", "Это гарантия прибыли",
                 "Это свойство распределения", "Это признак скама"], 2, "Вероятность — свойство распределения на серии."),
        "expect": {"Q02"},
    },
    {
        "name": "f_030_leverage_keyshift",
        "q": mk("FIX", "FIX", "F6", "Почему высокий Sharpe привлекает заёмный капитал?",
                ["Потому что масштабирование безопасно", "Потому что это заблуждение",
                 "Потому что банк обязан", "Потому что комиссии"], 0,
                "Нет: высокий Шарп не освобождает от риска."),
        "expect": {"Q07"},
    },
    {
        "name": "f_013_same_tail",
        "q": mk("FIX", "FIX", "F7", "Что говорит серия из 5 убытков?",
                ["5–10 успешных сделок подряд могут быть чистой случайностью, как монетка",
                 "Система сломана навсегда", "Нужно удвоить ставку",
                 "5–10 успешных сделок подряд могут быть чистой случайностью, как кубик"],
                0, "Серия может быть случайностью."),
        "expect": {"Q08"},
    },
    {
        "name": "f_146_pool_phrase",
        "q": mk("FIX", "FIX", "F8", "Как поступить с автоматизацией?",
                ["Машина принимает все решения без исключений, человек появляется раз в месяц. Этот подход согласуется с уставом и протоколом урока. Дисциплина превыше всего.",
                 "Ручной контроль по чек-листу", "Полный ручной режим", "Гибридный режим с журналом"],
                1, "Ручной контроль нужен по чек-листу."),
        "expect": {"Q03", "Q04"},
    },
    {
        "name": "f_15_future_year",
        "q": mk("FIX", "FIX", "F9", "Что произойдёт в 2027 году с комиссиями?",
                ["Вырастут", "Не изменятся", "Упадут", "Отменятся"], 0, "Будущее курса не предсказуемо из прошлых данных."),
        "expect": {"Q15"},
    },
    {
        "name": "f_clean_etalon",
        "q": mk("FIX", "FIX", "F10", "Что такое аддитивность лог-доходностей?",
                ["Сумма лог-доходностей равна доходности периода",
                 "Лог-доходности перемножаются", "Они всегда положительны",
                 "Аддитивность здесь ни при чём"], 0, "Сумма логарифмов равна логарифму произведения."),
        "expect": set(),
    },
]

def self_test():
    ctx = Ctx(set(), MAX_LEN_DEFAULT)
    fails = 0
    for f in FIXTURES:
        got = {i["rule"] for i in check_question(f["q"], ctx)}
        missing = f["expect"] - got
        extra_block = {i["rule"] for i in check_question(f["q"], ctx)
                       if i["rule"] not in f["expect"] and i["level"] == "BLOCK"}
        status = "PASS"
        if missing:
            status = "FAIL (не сработали: %s)" % ",".join(sorted(missing)); fails += 1
        elif extra_block:
            status = "FAIL (лишние BLOCK: %s)" % ",".join(sorted(extra_block)); fails += 1
        print(f"  {f['name']:<28} {status}")
    # модульные фикстуры
    seq = [((i % 4) + 0) for i in range(24)]  # арифм. цикл 0,1,2,3 × 6
    qs = [mk("FIXB", "FIXB", f"X{i}", f"Вопрос номер {i}?",
             ["Первый вариант ответа", "Второй вариант ответа", "Третий вариант ответа",
              "Четвёртый вариант ответа"], seq[i], "Объяснение достаточной длины здесь.")
          for i in range(24)]
    items = check_bank("FIXB", qs)
    rules = {i["rule"] for i in items}
    ok = "M02" in rules and "M01" not in rules
    print(f"  {'m02_cycle':<28} {'PASS' if ok else 'FAIL'} ({sorted(rules)})")
    fails += 0 if ok else 1
    qs2 = [mk("FIXC", "FIXC", f"Y{i}", f"Вопрос контрольный {i}?",
              ["Короткий", "Средней длины вариант", "Правильный ответ — самый длинный из всех",
               "Ещё вариант"], 2, "Объяснение достаточной длины здесь.")
           for i in range(20)]
    rules2 = {i["rule"] for i in check_bank("FIXC", qs2)}
    ok2 = "M04" in rules2
    print(f"  {'m04_longest':<28} {'PASS' if ok2 else 'FAIL'} ({sorted(rules2)})")
    fails += 0 if ok2 else 1
    print(f"SELF-TEST: {'OK' if fails == 0 else f'{fails} провалов'}")
    return 0 if fails == 0 else 2

# ---------------- Отчёт ----------------

def write_reports(results, meta, report_dir):
    total = sum(len(v["questions"]) for v in results.values())
    all_items = [(bank, qid, it) for bank, v in results.items()
                 for qid, its in v["per_q"].items() for it in its] + \
                [(bank, "-", it) for bank, v in results.items() for it in v["bank_items"]]
    blocked = [x for x in all_items if x[2]["level"] == "BLOCK"]
    warns = [x for x in all_items if x[2]["level"] == "WARN"]
    reviews = [x for x in all_items if x[2]["level"] == "REVIEW"]
    by_rule = Counter(x[2]["rule"] for x in all_items)

    js = {
        "build": date.today().isoformat(), "total": total,
        "blocked": len(blocked), "warnings": len(warns), "review": len(reviews),
        "by_rule": dict(sorted(by_rule.items())), "meta": meta,
        "items": [{"bank": b, "id": qid, **it} for b, qid, it in all_items],
    }
    os.makedirs(report_dir, exist_ok=True)
    with open(os.path.join(report_dir, "lint_report.json"), "w", encoding="utf-8") as f:
        json.dump(js, f, ensure_ascii=False, indent=1)

    md = ["# lint_report.md — прогон quiz_lint.py", "",
          f"Дата: {js['build']} · вопросов: {total} · BLOCK: {len(blocked)} · "
          f"WARN: {len(warns)} · REVIEW: {len(reviews)}", "",
          "Неактивные правила: " + "; ".join(meta.get("not_active", [])), ""]
    for bank, v in results.items():
        md.append(f"## Банк: {bank} ({len(v['questions'])} вопросов)")
        rows = [(qid, it) for qid, its in v["per_q"].items() for it in its] + \
               [("-", it) for it in v["bank_items"]]
        if not rows:
            md.append("_чисто_")
            md.append("")
            continue
        md.append("| Вопрос | Правило | Уровень | Вариант | Сообщение |")
        md.append("|---|---|---|---|---|")
        for qid, it in rows:
            md.append(f"| {qid} | {it['rule']} | {it['level']} | {it.get('option') or '—'} | {it['msg'][:140]} |")
        md.append("")
    with open(os.path.join(report_dir, "lint_report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    return len(blocked), len(warns) + len(reviews)

# ---------------- CLI ----------------

BANKS = ["microRecall", "QUIZ_DATA", "QUIZ_PSY", "PSY_CUMULATIVE",
         "PHASE_TESTS", "CAPSTONE", "ADAPTIVE", "MATH_TESTS"]

def main():
    ap = argparse.ArgumentParser(description="Линтер банков викторин «КриптоНавигатор»")
    ap.add_argument("--app", default="index_v15.1.html", help="путь к index_v15.1.html")
    ap.add_argument("--bank", default="all", help="банк или all")
    ap.add_argument("--max-len", type=int, default=MAX_LEN_DEFAULT)
    ap.add_argument("--report-dir", default=".")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        sys.exit(self_test())

    src = open(args.app, encoding="utf-8").read()
    print(f"Парсинг {args.app} ({len(src) // 1024} КБ)…")
    grams, ntexts = load_lesson_ngrams(src)
    print(f"Корпус уроков: {ntexts} текстов, {len(grams)} 8-грамм")
    ctx = Ctx(grams, args.max_len)

    banks = {}
    banks["microRecall"] = load_microrecall(src)
    banks["QUIZ_DATA"] = load_bank(src, "const QUIZ_DATA", "QUIZ_DATA", "CORE", "QD")
    banks["QUIZ_PSY"] = load_bank(src, "const QUIZ_PSY", "QUIZ_PSY", "PSY", "PSY")
    banks["PSY_CUMULATIVE"] = load_bank(src, "const PSY_CUMULATIVE_QUESTIONS", "PSY_CUMULATIVE", "PSY", "PSYC")
    banks["PHASE_TESTS"] = load_nested(src, "const PHASE_TESTS", "PHASE_TESTS", "PH",
                                        module_of=lambda t: f"PHASE{t.get('phase')}")
    banks["CAPSTONE"] = load_capstone(src)
    banks["ADAPTIVE"] = load_bank(src, "const ADAPTIVE_QUESTION_BANK", "ADAPTIVE", "CORE", "ADP")
    banks["MATH_TESTS"] = load_nested(src, "const MATH_TESTS", "MATH_TESTS", "MATH")

    selected = BANKS if args.bank == "all" else [args.bank]
    results = {}
    for b in selected:
        qs = banks.get(b, [])
        if not qs:
            print(f"!! банк {b}: пуст или не найден")
            continue
        per_q = {}
        for q in qs:
            items = check_question(q, ctx)
            if items:
                per_q[q["id"]] = items
        bank_items = check_bank(b, qs)
        # M06 спец-кейс: аттестация психологии = QUIZ_PSY + PSY_CUMULATIVE одним экзаменом
        if b == "PSY_CUMULATIVE":
            psy_total = len(banks.get("QUIZ_PSY", [])) + len(qs)
            if psy_total > 30:
                bank_items.append({"rule": "M06", "level": "BLOCK", "option": None,
                                   "msg": f"аттестация психологии: {len(banks.get('QUIZ_PSY', []))}+{len(qs)}={psy_total} вопросов > 30 (лимит аттестации)"})
        results[b] = {"questions": qs, "per_q": per_q, "bank_items": bank_items}
        nb = sum(1 for its in per_q.values() for it in its if it["level"] == "BLOCK") + \
             sum(1 for it in bank_items if it["level"] == "BLOCK")
        nw = sum(1 for its in per_q.values() for it in its if it["level"] != "BLOCK") + \
             sum(1 for it in bank_items if it["level"] != "BLOCK")
        print(f"  {b:<14} {len(qs):>4} вопросов | BLOCK: {nb:>3} | WARN/REVIEW: {nw:>4}")

    meta = {"not_active": [
        "Q10: нужен глоссарий с first_lesson (термин раньше введения)",
        "Q14/M07: нет поля behavior в схеме данных",
        "Q18: в схеме только формат CHOICE",
        "M08: нет audit_key.json (одноразовая сверка)",
        "Q12: числа-источники — активировать после привязки lesson_id",
    ]}
    blocked, soft = write_reports(results, meta, args.report_dir)
    print(f"\nОтчёты: {os.path.join(args.report_dir, 'lint_report.md')}, lint_report.json")
    print(f"Итог: BLOCK={blocked}, WARN/REVIEW={soft}")
    sys.exit(2 if blocked else (1 if soft else 0))

if __name__ == "__main__":
    main()
