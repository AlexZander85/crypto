> ТЗ-1 §4 (В): банк «В» тренажёра «Напиши строку сам» — 20 задач Python-аттестации
> (Py-01…Py-14 + Py-15, Py-16, Py-17, Py-17b, Py-18, Py-18b; контракт fable5 Б.1).
> Источник: fable7.md L1202–2147. Куда: движок тренажёра (E8), уровень «Аналитик».

# Банк «В» тренажёра «Напиши строку сам» — Python-аттестация (20 задач)

## 0. Рамка и допущения

Файла `fable5 Часть Б` у меня в этой сессии нет, поэтому банк «В» построен так, чтобы **гарантированно не пересекаться с любой разумной версией «Б»**: в «Б» почти наверняка использованы имена и числа из самих уроков Py-01–Py-14 (герой Алексей, депозит `1000$`, `BTCUSDT`, `65000`, `closes = [65100, 65050, 64980, ...]`, `average`, `calc_ma`, `greens`, `signal`, `deposit`, `btc`). Банк «В» ни одно из них не использует:

| Ось | «Б» (уроки) | «В» (аттестация) |
|---|---|---|
| Герой | Алексей, $1000 | Дарья, $2500 / 210 000 ₽ |
| Инструменты | BTC/USDT, 65 000 | ETH/USDT ≈ 3200, SOL/USDT ≈ 150 |
| Имена переменных | balance, ticker, closes, average, calc_ma, greens, signal, deposit, btc | ticker_sol, balance_rub, in_position, fee_usdt, candle_range, calc_sma, above_level, decision, cash_usdt, sol_amount, equity_end |
| Сложность Py-10+ | одна строка | две-три строки + один «предохранитель» |

**Единый контракт задачи** (совпадает с Б.1, поля названы явно, чтобы генератор мог склеить оба банка):

```yaml
id, slot, title, lessonRef, concepts[]      # метаданные и связь с карточками SRS
params                                       # числа/имена задачи (подставляются в seed и checks)
seedCode                                     # маркеры: # [ro] — read-only строка, # [rw] — сюда пишет ученик
task                                         # формулировка по-русски
runtime.checks[]                             # assert-выражения после exec (или scenarios[] с переопределением params)
sourceChecks.must[] / mustNot[] / maxLines   # регулярки по коду ученика (только rw-регион)
hints.L1/L2/L3                               # 1-я, 2-я, 3-я неудача
errorHints{ExceptionType: text}              # по типу исключения (+ общие из DEFAULT_ERROR_HINTS)
solution                                     # показывается после 4-й неудачи в режиме retype (вставка запрещена)
```

Общие подсказки по исключениям (наследуются всеми задачами, задача может переопределить):

```yaml
DEFAULT_ERROR_HINTS:
  SyntaxError: "Python не понял строку. Проверь: круглые скобки у print(), двоеточие после if/else/for/def, парные кавычки."
  IndentationError: "Отступ. Всё, что внутри if/for/def — ровно 4 пробела. Табуляция и пробелы — не смешивать."
  NameError: "Имя не найдено. Либо опечатка в имени переменной, либо текст без кавычек, либо переменную ещё не создали выше."
  TypeError: "Смешаны типы: число и текст, список и число. Посмотри, что именно стоит слева и справа от знака операции."
  IndexError: "Такого номера в списке нет. Нумерация с 0; последний элемент — [-1]."
  KeyError: "Такого ключа в словаре/таблице нет. Ключи — строчными буквами, ровно как в данных."
  ZeroDivisionError: "Деление на ноль: скорее всего, пустой список или срез."
  AttributeError: "У этого объекта нет такого метода/поля. Проверь тип объекта и написание метода."
  ModuleNotFoundError: "Библиотека не найдена: опечатка в import или лишние буквы в имени."
revealPolicy: { after: 4, mode: retype }     # решение показать, вставить нельзя — только перепечатать
```

---

## 1. Слоты Py-01 … Py-14

### PYA-V-01 · Py-01 · print

```yaml
id: PYA-V-01
slot: Py-01
title: Голос бота Дарьи
lessonRef: Py-01
concepts: [print, строка, консоль]
params: { hero: "Дарьи", deposit_usd: 2500 }
task: |
  Выведи в консоль ровно одну строку (буква в букву):
  Старт бота Дарьи. Депозит: 2500$
seedCode: |
  # [ro] Первая команда бота — сообщить оператору о запуске.
  # [ro] Ожидаемый вывод:  Старт бота Дарьи. Депозит: 2500$
  # [rw]
runtime:
  checks:
    - "stdout.strip() == 'Старт бота Дарьи. Депозит: 2500$'"
sourceChecks:
  must:    ['print\(']
  mustNot: ['print\s+["'']', 'Print\(', 'console\.log', 'echo\s']
  maxLines: 1
hints:
  L1: "Команда вывода в консоль — print. Она всегда с круглыми скобками."
  L2: "Текст внутри print — в кавычках: print(\"...\"). Скопируй строку из задания посимвольно, включая точку и знак $."
  L3: "print(\"Старт бота Дарьи. Депозит: ...$\") — вместо многоточия подставь число из задания."
errorHints:
  SyntaxError: "print без скобок или незакрытая кавычка. Форма всегда одна: print(\"текст\")."
  NameError: "Текст без кавычек Python принял за имя переменной. Оберни всё сообщение в кавычки."
solution: |
  print("Старт бота Дарьи. Депозит: 2500$")
```

### PYA-V-02 · Py-02 · переменные

```yaml
id: PYA-V-02
slot: Py-02
title: Три ячейки портфеля
lessonRef: Py-02
concepts: [переменная, присваивание, типы данных]
params: { ticker: "SOL/USDT", balance_rub: 210000, in_position: false }
task: |
  Создай три переменные: ticker_sol — текст "SOL/USDT", balance_rub — число 210000,
  in_position — логический флаг «позиции нет».
seedCode: |
  # [ro] Бот должен помнить: чем торгует, сколько денег, открыта ли позиция.
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "ticker_sol == 'SOL/USDT'"
    - "isinstance(balance_rub, int) and balance_rub == 210000"
    - "in_position is False"
sourceChecks:
  must:    ['ticker_sol\s*=', 'balance_rub\s*=', 'in_position\s*=']
  mustNot: ['balance_rub\s*=\s*["'']', 'in_position\s*=\s*["'']', 'ticker_sol\s*==', 'in_position\s*=\s*0\b']
  maxLines: 3
hints:
  L1: "Переменная — коробка с наклейкой: имя слева, знак =, значение справа."
  L2: "Текст — в кавычках, число — без кавычек, флаг — слово False с большой буквы."
  L3: "Три строки: ticker_sol = \"...\"   balance_rub = 210000   in_position = False"
errorHints:
  NameError: "false с маленькой буквы Python не знает. Логические значения: True и False."
  SyntaxError: "Если написал == — это сравнение, а не присваивание. Для записи значения нужен один знак =."
solution: |
  ticker_sol = "SOL/USDT"
  balance_rub = 210000
  in_position = False
```

### PYA-V-03 · Py-03 · числа, строки, комиссия

```yaml
id: PYA-V-03
slot: Py-03
title: Комиссия и отчёт о покупке
lessonRef: Py-03
concepts: [число vs строка, умножение, f-строка, round]
params: { entry_price: 3180.5, qty: 0.5, fee_rate: 0.0008 }
task: |
  1) Посчитай комиссию fee_usdt = цена × объём × ставка и округли до 2 знаков.
  2) Собери строку report через f-строку так, чтобы получилось:
     Покупка 0.5 ETH по 3180.5$, комиссия 1.27$
seedCode: |
  # [ro] entry_price = 3180.5
  # [ro] qty = 0.5
  # [ro] fee_rate = 0.0008
  entry_price = 3180.5
  qty = 0.5
  fee_rate = 0.0008
  # [rw]
  # [rw]
runtime:
  checks:
    - "round(fee_usdt, 2) == 1.27"
    - "report == 'Покупка 0.5 ETH по 3180.5$, комиссия 1.27$'"
sourceChecks:
  must:    ['fee_usdt\s*=', 'entry_price\s*\*|\*\s*entry_price', 'report\s*=\s*f["'']', '\{qty\}', '\{entry_price\}']
  mustNot: ['(?<![fF])["''][^"'']*\{qty\}', '\+\s*str\(', '"0\.5"', '1\.27']
  maxLines: 2
hints:
  L1: "Комиссия — три множителя через *. Округление — round(число, 2)."
  L2: "Строка-отчёт начинается с буквы f перед кавычкой; переменные — в {фигурных скобках}."
  L3: "fee_usdt = round(entry_price * qty * fee_rate, 2), затем report = f\"Покупка {qty} ETH по {entry_price}$, комиссия {fee_usdt}$\""
errorHints:
  TypeError: "«can only concatenate str» — ты склеиваешь текст с числом плюсом. Используй f-строку: f\"...{qty}...\"."
  NameError: "fee_usdt ещё не создана — сначала строка с расчётом, потом отчёт."
solution: |
  fee_usdt = round(entry_price * qty * fee_rate, 2)
  report = f"Покупка {qty} ETH по {entry_price}$, комиссия {fee_usdt}$"
```

> Ловушка: `1.27` в mustNot — нельзя вписать ответ руками, число должно родиться из расчёта.

### PYA-V-04 · Py-04 · if / else

```yaml
id: PYA-V-04
slot: Py-04
title: Лимитная покупка: касание считается
lessonRef: Py-04
concepts: [сравнение, if/else, отступ, граница <= vs <]
params: { price_now: 150.0, limit_buy: 150.0 }
task: |
  Правило Дарьи: если текущая цена НЕ ВЫШЕ лимита покупки — decision = "BUY", иначе "WAIT".
  Обрати внимание: касание лимита — уже покупка.
seedCode: |
  # [ro] price_now = 150.0
  # [ro] limit_buy = 150.0
  price_now = 150.0
  limit_buy = 150.0
  # [rw]
  # [rw]
  # [rw]
  # [rw]
runtime:
  scenarios:
    - { params: { price_now: 150.0, limit_buy: 150.0 }, checks: ["decision == 'BUY'"] }
    - { params: { price_now: 148.3, limit_buy: 150.0 }, checks: ["decision == 'BUY'"] }
    - { params: { price_now: 151.2, limit_buy: 150.0 }, checks: ["decision == 'WAIT'"] }
sourceChecks:
  must:    ['^if\s+', '^else\s*:', '<=', 'decision\s*=\s*["'']BUY["'']', 'decision\s*=\s*["'']WAIT["'']']
  mustNot: ['if\s+price_now\s*=\s*limit_buy', 'price_now\s*<\s*limit_buy', 'decision\s*==', 'limit_buy\s*>=\s*price_now\s*:.*\n.*WAIT']
  maxLines: 4
hints:
  L1: "Сравнение — вопрос «да/нет». После if и после else — двоеточие, тело — с отступом 4 пробела."
  L2: "«Не выше» = «меньше или равно» — знак из двух символов. Проверь: при равенстве цены и лимита должно выйти BUY."
  L3: "if price_now <= limit_buy:  / decision = \"BUY\"  / else:  / decision = \"WAIT\""
errorHints:
  IndentationError: "Строки под if и под else — с отступом ровно в 4 пробела."
  SyntaxError: "Одиночный = внутри if — это не сравнение. Сравнение «меньше или равно» пишется <=. И не забудь двоеточие."
solution: |
  if price_now <= limit_buy:
      decision = "BUY"
  else:
      decision = "WAIT"
```

### PYA-V-05 · Py-05 · списки и срезы

```yaml
id: PYA-V-05
slot: Py-05
title: Лента SOL: последняя свеча и хвост из четырёх
lessonRef: Py-05
concepts: [список, индекс -1, срез, len]
params: { closes_sol: [149.2, 150.8, 151.4, 150.1, 152.6, 153.0] }
task: |
  Из ленты closes_sol достань: last_close — последнее закрытие; recent_four — четыре последних
  закрытия одним срезом; n_candles — сколько всего свечей.
seedCode: |
  # [ro] closes_sol = [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  closes_sol = [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "last_close == 153.0"
    - "recent_four == [151.4, 150.1, 152.6, 153.0]"
    - "n_candles == 6"
sourceChecks:
  must:    ['closes_sol\[-1\]', 'closes_sol\[-4:\]', 'len\(closes_sol\)']
  mustNot: ['\[5\]', '\[6\]', '\[2:\]', '\[2:6\]', '\[-4:-1\]', '\[len\(closes_sol\)', 'n_candles\s*=\s*6']
  maxLines: 3
hints:
  L1: "Последний элемент — отрицательный индекс. Срез «последние N» — тоже через минус."
  L2: "Не пиши номера руками (5, 2): завтра лента станет длиннее, и код сломается. Индексы от конца: [-1], [-4:]."
  L3: "last_close = closes_sol[-1]; recent_four = closes_sol[-4:]; n_candles = len(closes_sol)"
errorHints:
  IndexError: "В списке 6 свечей — индексы 0…5. closes_sol[6] не существует; последний — closes_sol[-1]."
solution: |
  last_close = closes_sol[-1]
  recent_four = closes_sol[-4:]
  n_candles = len(closes_sol)
```

### PYA-V-06 · Py-06 · цикл for и счётчик

```yaml
id: PYA-V-06
slot: Py-06
title: Сколько свечей закрылись выше уровня
lessonRef: Py-06
concepts: [цикл for, счётчик, инициализация до цикла]
params: { level: 151.0 }
task: |
  Посчитай циклом for, сколько закрытий в closes_sol строго выше level. Результат — в above_level.
  Встроенные sum()/len() и генераторы списков не использовать — цель урока: сам конвейер.
seedCode: |
  # [ro] closes_sol = [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  # [ro] level = 151.0
  closes_sol = [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  level = 151.0
  # [rw]
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "above_level == 3"
sourceChecks:
  must:    ['^above_level\s*=\s*0', '^for\s+\w+\s+in\s+closes_sol\s*:', 'above_level\s*(\+=\s*1|=\s*above_level\s*\+\s*1)']
  mustNot: ['sum\(', 'len\(\[', '\[[^\]]*\bfor\b[^\]]*\]', 'above_level\s*=\s*3']
  maxLines: 4
hints:
  L1: "Счётчик обнуляют ДО цикла, а внутри цикла прибавляют единицу, когда условие выполнено."
  L2: "Структура: above_level = 0 → for close in closes_sol: → if close > level: → above_level += 1. Отступы: 4 и 8 пробелов."
  L3: "Если результат 1 вместо 3 — ты обнуляешь счётчик внутри цикла. Строка above_level = 0 должна стоять выше for без отступа."
errorHints:
  NameError: "above_level не определена до первого += — создай её со значением 0 перед циклом."
  IndentationError: "if — с отступом 4 (внутри for), above_level += 1 — с отступом 8 (внутри if)."
solution: |
  above_level = 0
  for close in closes_sol:
      if close > level:
          above_level += 1
```

### PYA-V-07 · Py-07 · функция и return

```yaml
id: PYA-V-07
slot: Py-07
title: Станок «размах свечи»
lessonRef: Py-07
concepts: [def, аргументы, return, None]
params: { high: 3210.0, low: 3175.5 }
task: |
  Напиши функцию candle_range(high, low), которая ВОЗВРАЩАЕТ размах свечи (максимум минус минимум).
  Печатать внутри функции нельзя — станок должен отдавать деталь наружу.
seedCode: |
  # [ro] Проверка ниже вызовет: candle_range(3210.0, 3175.5)  → ожидается 34.5
  # [rw]
  # [rw]
runtime:
  checks:
    - "candle_range(3210.0, 3175.5) is not None"
    - "abs(candle_range(3210.0, 3175.5) - 34.5) < 1e-9"
    - "candle_range(10, 4) == 6"
sourceChecks:
  must:    ['^def\s+candle_range\s*\(\s*high\s*,\s*low\s*\)\s*:', '^\s+return\s+high\s*-\s*low']
  mustNot: ['def\s+candle_range[\s\S]*?print\(', 'global\s', 'input\(', 'return\s+low\s*-\s*high']
  maxLines: 2
hints:
  L1: "Функция объявляется словом def, имя и входы в скобках, в конце строки двоеточие."
  L2: "Тело функции — с отступом. Результат отдаёт слово return, а не print."
  L3: "def candle_range(high, low):  и на следующей строке с отступом  return high - low"
errorHints:
  TypeError: "Проверка получила None: внутри функции нет return. print показывает число, но не отдаёт его наружу."
  SyntaxError: "После закрывающей скобки в строке def обязательно двоеточие."
solution: |
  def candle_range(high, low):
      return high - low
```

### PYA-V-08 · Py-08 · словарь-паспорт

```yaml
id: PYA-V-08
slot: Py-08
title: Тело свечи и верхняя тень по паспорту
lessonRef: Py-08
concepts: [словарь, ключ, abs, max]
params: { candle_eth: { open: 3190.0, high: 3210.0, low: 3175.5, close: 3204.2, volume: 880 } }
task: |
  Из словаря candle_eth посчитай body_size — размер тела (модуль разницы закрытия и открытия)
  и upper_wick — верхнюю тень (максимум минус большее из открытия и закрытия).
seedCode: |
  # [ro] candle_eth = {"open": 3190.0, "high": 3210.0, "low": 3175.5, "close": 3204.2, "volume": 880}
  candle_eth = {"open": 3190.0, "high": 3210.0, "low": 3175.5, "close": 3204.2, "volume": 880}
  # [rw]
  # [rw]
runtime:
  checks:
    - "abs(body_size - 14.2) < 1e-6"
    - "abs(upper_wick - 5.8) < 1e-6"
sourceChecks:
  must:    ['candle_eth\[["'']close["'']\]', 'candle_eth\[["'']open["'']\]', 'abs\(', 'max\(']
  mustNot: ['candle_eth\[\d\]', 'candle_eth\.(open|close|high)', '["'']Close["'']', '["'']Open["'']', 'body_size\s*=\s*14']
  maxLines: 2
hints:
  L1: "К полю словаря обращаются по имени ключа в кавычках: candle_eth[\"close\"]. Номера [0] у словаря нет."
  L2: "Тело: abs(close - open). Верхняя тень: high минус max(open, close) — тень начинается от верхней границы тела."
  L3: "body_size = abs(candle_eth[\"close\"] - candle_eth[\"open\"]); upper_wick = candle_eth[\"high\"] - max(candle_eth[\"open\"], candle_eth[\"close\"])"
errorHints:
  KeyError: "Ключа с таким написанием нет. Все ключи строчными: open, high, low, close, volume."
  TypeError: "Скорее всего, обратился к словарю по номеру [0] — словарь ищет по имени, а не по позиции."
solution: |
  body_size = abs(candle_eth["close"] - candle_eth["open"])
  upper_wick = candle_eth["high"] - max(candle_eth["open"], candle_eth["close"])
```

### PYA-V-09 · Py-09 · API и JSON

```yaml
id: PYA-V-09
slot: Py-09
title: Ответ биржи: из текста в число
lessonRef: Py-09
concepts: [JSON, json.loads, float, секреты вне кода]
params: { raw_response: '{"symbol": "ETHUSDT", "price": "3204.20", "time": 1719912000}' }
task: |
  Биржа прислала текст raw_response в формате JSON. Преврати его в словарь data и достань цену
  как ЧИСЛО price_eth (в JSON она пришла строкой).
seedCode: |
  # [ro] import json, os
  # [ro] API_SECRET = os.environ.get("BOT_API_SECRET")   # секрет — только из окружения, никогда в коде
  # [ro] raw_response = '{"symbol": "ETHUSDT", "price": "3204.20", "time": 1719912000}'
  import json, os
  API_SECRET = os.environ.get("BOT_API_SECRET")
  raw_response = '{"symbol": "ETHUSDT", "price": "3204.20", "time": 1719912000}'
  # [rw]
  # [rw]
runtime:
  checks:
    - "isinstance(data, dict) and data['symbol'] == 'ETHUSDT'"
    - "isinstance(price_eth, float) and price_eth == 3204.2"
sourceChecks:
  must:    ['data\s*=\s*json\.loads\(\s*raw_response\s*\)', 'price_eth\s*=\s*float\(\s*data\[["'']price["'']\]\s*\)']
  mustNot: ['json\.load\(', 'eval\(', 'API_SECRET\s*=\s*["'']', 'int\(\s*data', 'price_eth\s*=\s*3204']
  maxLines: 2
hints:
  L1: "JSON-текст превращает в словарь функция из библиотеки json. Имя функции заканчивается на s — потому что на входе строка (string)."
  L2: "Цена в ответе — текст \"3204.20\". Умножать текст нельзя: оберни в float(...)."
  L3: "data = json.loads(raw_response), затем price_eth = float(data[\"price\"])"
errorHints:
  AttributeError: "«'str' object has no attribute 'read'» — ты вызвал json.load (для файлов). Для строки нужен json.loads."
  TypeError: "«string indices must be integers» — data всё ещё текст: сначала json.loads, потом data[\"price\"]."
  ValueError: "float не смог прочитать значение — проверь, что берёшь ключ \"price\", а не \"symbol\"."
solution: |
  data = json.loads(raw_response)
  price_eth = float(data["price"])
```

### PYA-V-10 · Py-10 · библиотеки (сложность +1)

```yaml
id: PYA-V-10
slot: Py-10
title: Готовая деталь вместо самодельной формулы
lessonRef: Py-10
concepts: [import … as, модуль statistics, mean, median]
params: { closes_eth: [3190.0, 3204.2, 3198.7, 3211.5, 3220.9] }
task: |
  Подключи стандартную библиотеку statistics под коротким именем st и посчитай ею
  avg_close — среднее закрытие и median_close — медиану. Ручной sum()/len() не использовать.
seedCode: |
  # [ro] closes_eth = [3190.0, 3204.2, 3198.7, 3211.5, 3220.9]
  closes_eth = [3190.0, 3204.2, 3198.7, 3211.5, 3220.9]
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "abs(avg_close - 3205.06) < 1e-6"
    - "median_close == 3204.2"
sourceChecks:
  must:    ['^import\s+statistics\s+as\s+st\s*$', 'avg_close\s*=\s*st\.mean\(\s*closes_eth\s*\)', 'median_close\s*=\s*st\.median\(\s*closes_eth\s*\)']
  mustNot: ['sum\(\s*closes_eth', 'from\s+statistics\s+import', 'import\s+statistic\b', 'import\s+statistics\s*$', 'avg_close\s*=\s*3205']
  maxLines: 3
hints:
  L1: "Библиотека подключается командой import. Псевдоним задаётся словом as — чтобы не писать длинное имя каждый раз."
  L2: "После import statistics as st функции вызываются через точку: st.имя_функции(список)."
  L3: "import statistics as st → avg_close = st.mean(closes_eth) → median_close = st.median(closes_eth)"
errorHints:
  ModuleNotFoundError: "Имя модуля — statistics, с буквой s на конце, без лишних символов."
  NameError: "st не определён — псевдоним появляется только после import statistics as st."
  AttributeError: "У модуля нет такой функции. Среднее — mean, медиана — median."
solution: |
  import statistics as st
  avg_close = st.mean(closes_eth)
  median_close = st.median(closes_eth)
```

### PYA-V-11 · Py-11 · стакан в коде (сложность +1)

```yaml
id: PYA-V-11
slot: Py-11
title: Спред в базисных пунктах
lessonRef: Py-11
concepts: [стакан, bids/asks, лучшая цена, bps]
params:
  bids: [[3203.9, 1.2], [3203.5, 0.8], [3203.1, 2.5]]
  asks: [[3204.4, 0.6], [3204.9, 1.1], [3205.3, 3.0]]
task: |
  Каждая строка стакана — пара [цена, объём]. Достань best_bid и best_ask (лучшие ЦЕНЫ),
  затем посчитай spread_bps — спред в базисных пунктах относительно середины: (ask − bid) / mid × 10000.
seedCode: |
  # [ro] bids = [[3203.9, 1.2], [3203.5, 0.8], [3203.1, 2.5]]   # покупатели, цена по убыванию
  # [ro] asks = [[3204.4, 0.6], [3204.9, 1.1], [3205.3, 3.0]]   # продавцы, цена по возрастанию
  bids = [[3203.9, 1.2], [3203.5, 0.8], [3203.1, 2.5]]
  asks = [[3204.4, 0.6], [3204.9, 1.1], [3205.3, 3.0]]
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "best_bid == 3203.9 and best_ask == 3204.4"
    - "abs(spread_bps - 1.56048) < 1e-3"
sourceChecks:
  must:    ['best_bid\s*=\s*bids\[0\]\[0\]', 'best_ask\s*=\s*asks\[0\]\[0\]', '10000|1e4|10_000', 'best_ask\s*-\s*best_bid']
  mustNot: ['bids\[-1\]', 'asks\[-1\]', 'best_bid\s*-\s*best_ask', 'bids\[0\]\[1\]', 'asks\[0\]\[1\]', 'spread_bps\s*=\s*1\.5']
  maxLines: 3
hints:
  L1: "Лучший покупатель — первая строка bids, лучший продавец — первая строка asks. В строке два числа: [цена, объём]."
  L2: "bids[0] — это целая пара. Цена — первый элемент пары: bids[0][0]. Объём [1] тебе здесь не нужен."
  L3: "best_bid = bids[0][0]; best_ask = asks[0][0]; spread_bps = (best_ask - best_bid) / ((best_ask + best_bid) / 2) * 10000"
errorHints:
  TypeError: "«unsupported operand … list» — ты вычитаешь целые пары [цена, объём]. Возьми цену: bids[0][0]."
solution: |
  best_bid = bids[0][0]
  best_ask = asks[0][0]
  spread_bps = (best_ask - best_bid) / ((best_ask + best_bid) / 2) * 10000
```

### PYA-V-12 · Py-12 · скользящая средняя с предохранителем (сложность +1)

```yaml
id: PYA-V-12
slot: Py-12
title: calc_sma, которая не врёт на короткой истории
lessonRef: Py-12
concepts: [скользящая средняя, срез окна, предохранитель None]
params: { closes_eth: [3190.0, 3204.2, 3198.7, 3211.5, 3220.9] }
task: |
  Напиши функцию calc_sma(prices, window): если свечей меньше окна — верни None
  (среднее по неполному окну исказит бэктест); иначе верни среднее последних window закрытий.
seedCode: |
  # [ro] closes_eth = [3190.0, 3204.2, 3198.7, 3211.5, 3220.9]
  closes_eth = [3190.0, 3204.2, 3198.7, 3211.5, 3220.9]
  # [rw]
  # [rw]
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "abs(calc_sma(closes_eth, 3) - 3210.3666666667) < 1e-6"
    - "abs(calc_sma(closes_eth, 5) - 3205.06) < 1e-6"
    - "calc_sma(closes_eth, 10) is None"
    - "calc_sma([1, 2, 3, 4], 2) == 3.5"
sourceChecks:
  must:    ['^def\s+calc_sma\s*\(\s*prices\s*,\s*window\s*\)\s*:', 'if\s+len\(\s*prices\s*\)\s*<\s*window\s*:', 'return\s+None', 'prices\[-window:\]']
  mustNot: ['prices\[:window\]', 'prices\[window:\]', 'return\s+0\b', 'except', 'print\(']
  maxLines: 5
hints:
  L1: "Сначала предохранитель: если len(prices) меньше window — return None. Потом окно и среднее."
  L2: "Окно последних N свечей — срез с минусом: prices[-window:]. Первые N ([:window]) — это прошлое, а не последние свечи."
  L3: "def → if len(prices) < window: return None → recent = prices[-window:] → return sum(recent) / len(recent)"
errorHints:
  ZeroDivisionError: "Пустой срез — окно или список нулевой длины. Предохранитель должен сработать раньше деления."
  TypeError: "None не делится/не вычитается: значит, где-то вернул None не там (или забыл return в основной ветке)."
solution: |
  def calc_sma(prices, window):
      if len(prices) < window:
          return None
      recent = prices[-window:]
      return sum(recent) / len(recent)
```

> Ловушка `return 0`: ноль как «средняя» цена — тихий сигнал на покупку по нулю. Курс учит: неизвестно = None, а не 0.

### PYA-V-13 · Py-13 · пересечение, а не «выше» (сложность +1)

```yaml
id: PYA-V-13
slot: Py-13
title: Золотой крест: только момент пересечения
lessonRef: Py-13
concepts: [пересечение MA, предыдущая свеча, логическое и]
params: { fast_now: 3212.4, slow_now: 3209.8, fast_prev: 3208.1, slow_prev: 3209.5 }
task: |
  decision = "BUY" только если быстрая MA сейчас выше медленной И на предыдущей свече была НЕ выше
  (то есть пересечение произошло именно сейчас). Иначе — "WAIT".
seedCode: |
  # [ro] fast_now, slow_now = 3212.4, 3209.8      # быстрая и медленная MA на текущей свече
  # [ro] fast_prev, slow_prev = 3208.1, 3209.5    # они же на предыдущей свече
  fast_now, slow_now = 3212.4, 3209.8
  fast_prev, slow_prev = 3208.1, 3209.5
  # [rw]
  # [rw]
  # [rw]
  # [rw]
runtime:
  scenarios:
    - { params: {}, checks: ["decision == 'BUY'"] }                                        # пересечение сейчас
    - { params: { fast_prev: 3210.0 }, checks: ["decision == 'WAIT'"] }                     # уже была выше — крест раньше
    - { params: { fast_now: 3205.0 }, checks: ["decision == 'WAIT'"] }                      # сейчас ниже
    - { params: { fast_prev: 3209.5, slow_prev: 3209.5 }, checks: ["decision == 'BUY'"] }   # равенство на прошлой — не выше
sourceChecks:
  must:    ['^if\s+', '\band\b', 'fast_now\s*>\s*slow_now', 'fast_prev\s*<=\s*slow_prev|slow_prev\s*>=\s*fast_prev', 'decision\s*=\s*["'']BUY["'']', 'decision\s*=\s*["'']WAIT["'']']
  mustNot: ['\bor\b', 'fast_now\s*=\s*slow_now', 'fast_prev\s*>\s*slow_prev', 'fast_prev\s*<\s*slow_prev\s*:', 'decision\s*==']
  maxLines: 4
hints:
  L1: "«Выше сейчас» — одно условие, «не была выше раньше» — второе. Оба должны выполняться одновременно: слово and."
  L2: "«Не выше» на предыдущей свече — это fast_prev <= slow_prev (равенство считается «не выше»)."
  L3: "if fast_now > slow_now and fast_prev <= slow_prev:  → decision = \"BUY\"  → else:  → decision = \"WAIT\""
errorHints:
  SyntaxError: "Проверь: один знак = в условии недопустим; двоеточие в конце строки if и else."
  IndentationError: "Тела веток — с отступом 4 пробела."
solution: |
  if fast_now > slow_now and fast_prev <= slow_prev:
      decision = "BUY"
  else:
      decision = "WAIT"
```

### PYA-V-14 · Py-14 · мини-бэктест: проверка средств (сложность +1)

```yaml
id: PYA-V-14
slot: Py-14
title: Бот Дарьи: не покупай на деньги, которых нет
lessonRef: Py-14
concepts: [цикл по свечам, проверка средств, учёт комиссии, итоговый капитал]
params:
  closes: [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  signals: ["WAIT", "BUY", "WAIT", "BUY", "WAIT", "WAIT"]
  qty: 5
  cash_usdt: 1000.0
  fee_rate: 0.001
task: |
  Допиши тело цикла: стоимость покупки cost = цена × qty × (1 + fee_rate); покупаем, только если
  сигнал "BUY" И денег хватает на cost; при покупке уменьшаем cash_usdt на cost и увеличиваем sol_amount на qty.
  После цикла посчитай equity_end = деньги + монеты по последнему закрытию.
seedCode: |
  # [ro]
  closes = [149.2, 150.8, 151.4, 150.1, 152.6, 153.0]
  signals = ["WAIT", "BUY", "WAIT", "BUY", "WAIT", "WAIT"]
  qty = 5
  cash_usdt = 1000.0
  sol_amount = 0
  fee_rate = 0.001
  for i in range(len(closes)):
      price = closes[i]
      # [rw]
      # [rw]
      # [rw]
      # [rw]
  # [rw]
runtime:
  checks:
    - "sol_amount == 5"                         # второй BUY должен быть пропущен: денег не хватило
    - "abs(cash_usdt - 245.246) < 1e-6"
    - "abs(equity_end - 1010.246) < 1e-6"
sourceChecks:
  must:    ['cost\s*=\s*price\s*\*\s*qty\s*\*\s*\(\s*1\s*\+\s*fee_rate\s*\)', 'signals\[i\]\s*==\s*["'']BUY["'']', '\band\b', 'cash_usdt\s*>=\s*cost', 'cash_usdt\s*-=\s*cost', 'sol_amount\s*\+=\s*qty', 'equity_end\s*=\s*cash_usdt\s*\+\s*sol_amount\s*\*\s*closes\[-1\]']
  mustNot: ['cash_usdt\s*>\s*0\s*:', 'cash_usdt\s*-=\s*price\s*$', 'closes\[5\]', '\bbreak\b', 'equity_end\s*=\s*1010']
  maxLines: 5
hints:
  L1: "Сначала посчитай cost — полную цену покупки с комиссией. Условие покупки — два требования через and: сигнал и деньги."
  L2: "«Денег хватает» — cash_usdt >= cost. Проверка «cash_usdt > 0» пропустит покупку в долг: на 245$ нельзя купить на 750$."
  L3: "Внутри цикла: cost = …; if signals[i] == \"BUY\" and cash_usdt >= cost: cash_usdt -= cost; sol_amount += qty. После цикла: equity_end = cash_usdt + sol_amount * closes[-1]"
errorHints:
  IndentationError: "cost и if — с отступом 4 (внутри for); действия покупки — с отступом 8; equity_end — без отступа, после цикла."
  NameError: "cost используется до расчёта или equity_end считается внутри цикла до последней свечи."
solution: |
      cost = price * qty * (1 + fee_rate)
      if signals[i] == "BUY" and cash_usdt >= cost:
          cash_usdt -= cost
          sol_amount += qty
  equity_end = cash_usdt + sol_amount * closes[-1]
```

> Ключевой runtime-капкан: без проверки средств бот «купит» вторую партию в минус (sol_amount = 10, equity 1023.99) — чек упадёт с подсказкой «первое правило реального бота: сначала проверь, хватает ли денег».

---

## 2. Новые слоты Py-15 … Py-18b

### PYA-V-15 · Py-15 · терминал (компонент «Терминал-песочница»)

```yaml
id: PYA-V-15
slot: Py-15
title: Дойди до скрипта и попроси у него справку
lessonRef: Py-15 (новый урок: терминал)
concepts: [cd, путь к файлу, python3, флаг --help]
component: terminal-sandbox         # виртуальная ФС, не Python-runner
params:
  fs:
    ~/bot/report.py: "argparse-скрипт, --help печатает usage"
    ~/bot/config.json: "{}"
    ~/notes/todo.txt: ""
  cwd: "~"
task: |
  Ты в домашней папке. Перейди в папку bot и вызови встроенную справку скрипта report.py.
  Ожидаемый результат — строка, начинающаяся с «usage: report.py».
expectedTranscript:
  - "cd bot"
  - "python3 report.py --help"
sourceChecks:                         # применяются к введённым командам по порядку
  must:
    - '^cd\s+bot/?$'
    - '^python3?\s+report\.py\s+--help$'
  mustNot:
    - '^cd\s+bot/report\.py'          # cd в файл
    - '^python3?\s+report\.py\s+-help$'   # один дефис
    - '^report\.py'                   # запуск файла как команды
    - '^python3?\s+--help$'           # справка питона, а не скрипта
    - '^python3?\s+bot/report\.py'    # путь вместо перехода — задача про cd
  maxCommands: 3
terminalErrorHints:
  "No such file or directory": "Файл не там, где ты стоишь. Проверь папку командой pwd и перейди: cd bot."
  "command not found": "Терминал искал программу с именем файла. Файл .py запускает python3: python3 имя.py"
  "Not a directory": "cd принимает только папку, файл открывать не нужно."
  "SyntaxError: invalid syntax": "Ты внутри интерактивного Python (приглашение >>>). Выйди командой exit() и повтори в обычном терминале."
hints:
  L1: "Две команды: сначала сменить папку (cd), потом запустить скрипт через интерпретатор."
  L2: "Справку у скриптов просят флагом из двух дефисов: --help."
  L3: "cd bot  ↵  python3 report.py --help"
solution: |
  cd bot
  python3 report.py --help
```

### PYA-V-16 · Py-16 · чтение traceback (компонент «Traceback-детектив»)

```yaml
id: PYA-V-16
slot: Py-16
title: Красный текст: где, что и как починить
lessonRef: Py-16 (новый урок: ошибки)
concepts: [traceback, тип исключения, строка ошибки, KeyError]
component: traceback-quiz
params:
  traceback: |
    Traceback (most recent call last):
      File "report.py", line 12, in <module>
        total = summarize(candles)
      File "report.py", line 7, in summarize
        body = c["Close"] - c["open"]
    KeyError: 'Close'
  brokenLine: 'body = c["Close"] - c["open"]'
task: |
  Прочитай трейсбэк снизу вверх и заполни три поля:
  1) тип ошибки; 2) номер строки, которую надо править; 3) исправленная строка 7.
fields:
  error_type: { answer: '^KeyError$' }
  line_no:    { answer: '^7$' }
  fix:        { type: code, maxLines: 1 }
sourceChecks:                         # для поля fix
  must:    ['^body\s*=\s*c\[["'']close["'']\]\s*-\s*c\[["'']open["'']\]$']
  mustNot: ['["'']Close["'']', '\btry\b', '\bexcept\b', '\.get\(', 'body\s*=\s*0']
fieldErrorHints:
  line_no: "12 — это строка, ОТКУДА вызвали функцию. Реальное место ошибки — последняя строка трейсбэка перед типом ошибки."
  error_type: "Тип ошибки написан в самой нижней строке, до двоеточия. Пиши точно, с большой буквы."
hints:
  L1: "Трейсбэк читают снизу: нижняя строка — что случилось; строка над ней — где именно."
  L2: "KeyError: 'Close' означает, что ключа с большой буквы в словаре нет. Ключи свечи — строчными."
  L3: "Исправь регистр ключа: c[\"close\"]. Ловить ошибку через try/except не нужно — нужно устранить причину."
solution:
  error_type: KeyError
  line_no: 7
  fix: 'body = c["close"] - c["open"]'
```

### PYA-V-17 · Py-17 · pandas: выборка через .loc (сложность +1)

```yaml
id: PYA-V-17
slot: Py-17
title: Зелёные дни через .loc
lessonRef: Py-17 (новый урок: pandas)
concepts: [DataFrame, логическая маска, .loc[строки, столбцы], len]
params: { columns: [date, open, close, volume], rows: 5 }
task: |
  Одной командой .loc выбери из df строки, где close выше open, и только столбцы date и close —
  результат в green. Затем посчитай n_green — сколько таких дней.
seedCode: |
  # [ro]
  import pandas as pd
  df = pd.DataFrame({
      "date":   pd.to_datetime(["2025-03-01", "2025-03-02", "2025-03-03", "2025-03-04", "2025-03-05"]),
      "open":   [3190.0, 3204.2, 3198.7, 3211.5, 3220.9],
      "close":  [3204.2, 3198.7, 3211.5, 3220.9, 3215.0],
      "volume": [880, 910, 760, 1020, 990],
  })
  # [rw]
  # [rw]
runtime:
  checks:
    - "list(green.columns) == ['date', 'close']"
    - "green['close'].tolist() == [3204.2, 3211.5, 3220.9]"
    - "n_green == 3"
sourceChecks:
  must:    ['green\s*=\s*df\.loc\[', 'df\[["'']close["'']\]\s*>\s*df\[["'']open["'']\]', '\[\s*["'']date["'']\s*,\s*["'']close["'']\s*\]', 'n_green\s*=\s*len\(\s*green\s*\)']
  mustNot: ['\.iloc\[', '\]\s*\[\s*\[', '^for\s+', '\.apply\(', 'n_green\s*=\s*3']
  maxLines: 2
hints:
  L1: "У .loc два места через запятую: [какие строки, какие столбцы]. Строки задаёт условие по всей колонке, столбцы — список имён."
  L2: "Условие — сравнение колонок целиком: df[\"close\"] > df[\"open\"]. Оно даёт маску Да/Нет для каждой строки."
  L3: "green = df.loc[df[\"close\"] > df[\"open\"], [\"date\", \"close\"]]  и затем  n_green = len(green)"
errorHints:
  KeyError: "Имя колонки не совпало. Доступны: date, open, close, volume — строчными."
  TypeError: "«Cannot index with multidimensional key» — лишняя пара скобок вокруг условия или столбцов."
  ValueError: "Маска и таблица разной длины — условие построено не по колонкам df."
solution: |
  green = df.loc[df["close"] > df["open"], ["date", "close"]]
  n_green = len(green)
```

### PYA-V-17b · Py-17b · groupby + agg в одну строку

```yaml
id: PYA-V-17b
slot: Py-17b
title: Итог по каждой паре одной строкой
lessonRef: Py-17 (новый урок: pandas)
concepts: [groupby, agg, сумма и количество]
task: |
  Одной строкой посчитай по таблице trades для каждой пары сумму pnl и число сделок. Результат — в by_pair.
seedCode: |
  # [ro]
  import pandas as pd
  trades = pd.DataFrame({
      "pair": ["ETH/USDT", "SOL/USDT", "ETH/USDT", "SOL/USDT", "ETH/USDT"],
      "pnl":  [12.5, -4.0, -6.2, 9.1, 3.3],
  })
  # [rw]
runtime:
  checks:
    - "set(by_pair.index) == {'ETH/USDT', 'SOL/USDT'}"
    - "any(abs(by_pair[c].loc['ETH/USDT'] - 9.6) < 1e-9 and abs(by_pair[c].loc['SOL/USDT'] - 5.1) < 1e-9 for c in by_pair.columns)"
    - "any(by_pair[c].loc['ETH/USDT'] == 3 and by_pair[c].loc['SOL/USDT'] == 2 for c in by_pair.columns)"
sourceChecks:
  must:    ['by_pair\s*=\s*trades\.groupby\(\s*["'']pair["'']\s*\)', '\.agg\(']
  mustNot: ['^for\s+', '\.apply\(', 'pivot', '\.loc\[.*ETH', '\bdict\(']
  maxLines: 1
hints:
  L1: "groupby(\"pair\") делит таблицу на группы по значению колонки. agg(...) говорит, что посчитать в каждой группе."
  L2: "Можно в agg передать список имён функций: [\"sum\", \"count\"] — обе применятся к колонке pnl."
  L3: "by_pair = trades.groupby(\"pair\")[\"pnl\"].agg([\"sum\", \"count\"])"
errorHints:
  KeyError: "Колонка называется pair или pnl — проверь написание внутри groupby и в квадратных скобках."
  AttributeError: "«no attribute 'agg'» — проверь порядок: groupby(...)[\"pnl\"].agg(...)."
  TypeError: "agg принимает имена функций строками в списке: [\"sum\", \"count\"]."
solution: |
  by_pair = trades.groupby("pair")["pnl"].agg(["sum", "count"])
acceptedAlternatives:
  - 'by_pair = trades.groupby("pair").agg(total=("pnl", "sum"), trades_n=("pnl", "count"))'
```

### PYA-V-18 · Py-18 · функция и точка входа `if __name__`

```yaml
id: PYA-V-18
slot: Py-18
title: Скрипт, который можно и запустить, и подключить
lessonRef: Py-18 (новый урок: структура файла)
concepts: [def main, точка входа, __name__, импорт без побочных эффектов]
task: |
  Напиши функцию main(), которая печатает «Отчёт по паре ETH/USDT готов», и запусти её
  ТОЛЬКО когда файл выполняют напрямую (стандартная конструкция с __name__).
  При импорте файла как модуля печататься ничего не должно.
seedCode: |
  # [ro] Этот файл позже станет модулем report.py: его будут и запускать, и импортировать.
  # [rw]
  # [rw]
  # [rw]
  # [rw]
runtime:
  scenarios:
    - { execAs: "__main__", checks: ["stdout.strip() == 'Отчёт по паре ETH/USDT готов'"] }
    - { execAs: "report",   checks: ["stdout.strip() == ''", "callable(main)"] }
sourceChecks:
  must:    ['^def\s+main\s*\(\s*\)\s*:', '^\s+print\(["'']Отчёт по паре ETH/USDT готов["'']\)', '^if\s+__name__\s*==\s*["'']__main__["'']\s*:', '^\s+main\(\)']
  mustNot: ['^main\(\)', 'if\s+__name__\s*=\s*["'']', '__main__\(\)', 'if\s+name\s*==', 'print\(["'']Отчёт[^\n]*\n(?![\s\S]*def\s+main)']
  maxLines: 4
hints:
  L1: "Сначала def main(): с телом-печатью. Вызов main() без отступа в конце файла сработает и при импорте — этого нельзя."
  L2: "Служебная переменная __name__ равна \"__main__\" только при прямом запуске файла. Сравнение — двумя знаками =."
  L3: "def main():  / print(...)  / if __name__ == \"__main__\":  / main()  — последняя строка с отступом 4."
errorHints:
  NameError: "main вызван раньше, чем определён, либо опечатка в __name__ (два подчёркивания с каждой стороны)."
  SyntaxError: "Одинарное = в условии if недопустимо; после условия — двоеточие."
solution: |
  def main():
      print("Отчёт по паре ETH/USDT готов")

  if __name__ == "__main__":
      main()
```

### PYA-V-18b · Py-18b · мини-скрипт: CSV → describe()

```yaml
id: PYA-V-18b
slot: Py-18b
title: Первый взгляд на журнал сделок
lessonRef: Py-18 (новый урок), Py-17
concepts: [read_csv, describe, файл на диске, вывод через print]
component: python-runner-with-fs     # перед exec записать trades.csv в виртуальную ФС
params:
  files:
    trades.csv: |
      date,pair,pnl
      2025-03-01,ETH/USDT,12.5
      2025-03-01,SOL/USDT,-4.0
      2025-03-02,ETH/USDT,-6.2
      2025-03-02,SOL/USDT,9.1
      2025-03-03,ETH/USDT,3.3
      2025-03-03,SOL/USDT,-2.7
      2025-03-04,ETH/USDT,7.8
      2025-03-04,SOL/USDT,1.4
task: |
  Рядом лежит файл trades.csv (колонки date, pair, pnl). Напиши мини-скрипт: подключи pandas,
  прочитай файл в таблицу trades_df и выведи сводную статистику по колонке pnl (метод describe).
seedCode: |
  # [ro] Файл trades.csv уже лежит в рабочей папке.
  # [rw]
  # [rw]
  # [rw]
runtime:
  checks:
    - "len(trades_df) == 8 and list(trades_df.columns) == ['date', 'pair', 'pnl']"
    - "all(k in stdout for k in ('count', 'mean', 'std', 'min', 'max'))"
    - "'8.0' in stdout"                       # count = 8 действительно напечатан
    - "'<bound method' not in stdout"          # describe вызван со скобками
sourceChecks:
  must:    ['^import\s+pandas\s+as\s+pd\s*$', 'trades_df\s*=\s*pd\.read_csv\(\s*["'']trades\.csv["'']\s*\)', 'print\(\s*trades_df\[["'']pnl["'']\]\.describe\(\)\s*\)']
  mustNot: ['\bopen\(', 'csv\.reader', 'read_excel', 'read_json', '^for\s+', 'describe\b(?!\(\))', '^\s*trades_df\[["'']pnl["'']\]\.describe\(\)\s*$']
  maxLines: 3
hints:
  L1: "Три шага: подключить библиотеку → прочитать CSV функцией pandas → напечатать результат describe()."
  L2: "Чтение файла: pd.read_csv(\"trades.csv\"). В скрипте (не в тетрадке) сама по себе строка с describe() ничего не покажет — нужен print."
  L3: "import pandas as pd  /  trades_df = pd.read_csv(\"trades.csv\")  /  print(trades_df[\"pnl\"].describe())"
errorHints:
  FileNotFoundError: "Имя файла — trades.csv, ровно так, в кавычках, без пути."
  KeyError: "Колонка с результатом называется pnl."
  AttributeError: "«has no attribute 'describe'» — describe есть у таблицы/колонки pandas, а не у результата open()."
solution: |
  import pandas as pd
  trades_df = pd.read_csv("trades.csv")
  print(trades_df["pnl"].describe())
```

---

## 3. Сводная таблица банка «В»

| ID | Слот | Строк решения | Главная ловушка (mustNot / runtime) | Что нужно от раннера |
|---|---|---|---|---|
| V-01 | Py-01 | 1 | print без скобок | stdout |
| V-02 | Py-02 | 3 | число в кавычках, `==` вместо `=` | типы переменных |
| V-03 | Py-03 | 2 | забытая `f`, склейка `+ str()`, ответ руками | stdout не нужен |
| V-04 | Py-04 | 4 | `<` вместо `<=` на границе | **сценарии** (3 набора params) |
| V-05 | Py-05 | 3 | жёсткие индексы `[5]`, `[2:]`, срез `[-4:-1]` | — |
| V-06 | Py-06 | 4 | `sum()`, генератор, обнуление внутри цикла | — |
| V-07 | Py-07 | 2 | `print` вместо `return` → None | вызов функции |
| V-08 | Py-08 | 2 | `[0]` у словаря, регистр ключа | допуск 1e-6 |
| V-09 | Py-09 | 2 | `json.load`, `eval`, секрет в коде | — |
| V-10 | Py-10 | 3 | ручной `sum/len`, `import` без `as` | stdlib statistics |
| V-11 | Py-11 | 3 | `[0]` вместо `[0][0]`, `bid − ask` | — |
| V-12 | Py-12 | 5 | `[:window]`, `return 0` вместо `None` | несколько вызовов |
| V-13 | Py-13 | 4 | `or`, «выше» без проверки прошлой свечи | **сценарии** (4 набора) |
| V-14 | Py-14 | 5 | покупка без проверки средств, `-= price` без qty | — |
| V-15 | Py-15 | 2 команды | `-help`, `cd` в файл, путь вместо `cd` | **терминал-эмулятор** |
| V-16 | Py-16 | 3 поля | строка 12 вместо 7, `try/except` вместо починки | **traceback-квиз** |
| V-17 | Py-17 | 2 | `iloc`, цепные скобки, цикл | pandas |
| V-17b | Py-17b | 1 | `for`, `apply`, `pivot`; maxLines = 1 | pandas, гибкий чек колонок |
| V-18 | Py-18 | 4 | `main()` без `if`, одинарное `=` | **exec с двумя `__name__`** |
| V-18b | Py-18b | 3 | `open()`, `describe` без скобок и без `print` | pandas + виртуальный файл |

Минимальный пакет (10 задач для Py-01–Py-14, если ресурсов мало): V-01, V-03, V-04, V-05, V-07, V-09, V-11, V-12, V-13, V-14 — они покрывают все концепты без дублей (V-02/06/08/10 — резерв второй попытки).

## 4. Три требования к генератору/раннеру перед выпуском «В»

1. **Линтер уникальности Б↔В** (одноразово, автоматически): ни одна регулярка из `must` банка В не должна матчить решение одноимённого слота банка Б, и наоборот; числа из `params` В не должны встречаться в `params` Б того же слота. Если у Б в Py-13 переменная называется `signal` — в В она `decision` намеренно; линтер должен подтвердить, что это так для всех 14 слотов.
2. **sourceChecks применяются только к rw-региону**, а `maxLines` считается без пустых строк и комментариев ученика — иначе комментарий в коде провалит проверку.
3. **Сценарные проверки** (V-04, V-13, V-18) выполняются все, и в сообщении об ошибке ученик видит, какой именно сценарий упал, на русском: «При цене 150.0 и лимите 150.0 ожидалось BUY, получено WAIT — касание лимита считается покупкой». Именно так тренажёр превращается из проверки в обучение.

-------------------------------
