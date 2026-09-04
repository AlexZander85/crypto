# ТЗ на реализацию сквозных движков E1 «Терминал‑переводчик» и E2 «Живой конфиг»

Документ для агента‑разработчика. Оба движка — переиспользуемые компоненты, которые встраиваются в уроки через конфигурацию (JSON), без написания уникального кода под каждый урок. Всё, что видит ученик, — на русском; английские токены допустимы только как объекты изучения и всегда снабжены переводом по клику.

---

## 0. Общие положения для обоих движков

### 0.1. Целевая аудитория и методические ограничения

- Ученик — русскоязычный взрослый, не знающий английского и программирования. Он **никогда** не должен остаться один на один с непереведённой строкой.
- Правило «один интерактив = одно заблуждение»: у каждого инстанса движка в конфиге обязательно поле `misconception` (какую ошибку ломаем) и `takeaway` (одна фраза‑вывод, которая показывается в финале).
- Числа берутся из текста урока (см. §5 E1 и §4 E2), не выдумываются. Если агент генерирует «реалистичный» вывод, он обязан свериться с числами урока и не противоречить им.
- Идентификаторы, которые ученик потом будет **набирать руками** (`stake_amount`, `freqtrade backtesting`, `--timerange`), никогда не заменяются переводом в тексте — только снабжаются подписью. Переводом заменяются только *человекочитаемые* сообщения и заголовки таблиц.

### 0.2. Общие подсистемы (реализовать один раз, использовать в E1, E2 и далее в E3–E8)

| Подсистема | Назначение | Требования |
|---|---|---|
| **Glossary** (словарь) | Единый словарь англ. токен → русская карточка | Один JSON на приложение; каждый термин: `id`, `en`, `ru_short` (≤4 слова), `ru_card` (1–3 предложения), `example` (опц.), `lesson_ref` (id урока, где термин введён), `type` (`cmd`/`flag`/`config_key`/`py_error`/`metric`/`log_level`/`py_builtin`/`tg_cmd`/`other`). Пополняется из «Терминов урока». |
| **TouchToKnow** («Ткни в непонятное») | Универсальный режим: любой размеченный токен кликабелен → всплывающая карточка на русском | Открытие по клику/тапу, закрытие по Esc/клику вне; в карточке — `ru_short` крупно, `ru_card`, пример, кнопка «К уроку». Клик по термину записывается в телеметрию (`term_viewed`). |
| **LangSwitch** | Трёхпозиционный переключатель: **EN** / **EN + RU‑подписи** / **RU‑замена** | Состояние сохраняется в профиле ученика; по умолчанию для новичка — **EN + RU‑подписи**. |
| **Journal hook** | Единый API записи в журнал (будущий E5) | `journal.write({lesson, engine, kind, payload, ts})`. Пока E5 нет — писать в localStorage/профиль, но интерфейс зафиксировать сейчас. |
| **Telemetry** | Событийная аналитика | События перечислены в §8 (E1) и §9 (E2). |

### 0.3. Технические договорённости

- Компоненты изолированы, не делают сетевых вызовов; всё поведение детерминировано из JSON‑конфига инстанса. Никакого реального запуска freqtrade/Python — это эмуляция.
- Адаптив: минимальная ширина 360 px (мобильный — вертикальная раскладка: терминал сверху, панель перевода снизу шторкой).
- Доступность: полная клавиатурная навигация (Tab по токенам, Enter — карточка), `aria-live` для строк, появляющихся в режиме «пошагово»; контраст ≥ 4.5:1; моноширинный шрифт терминала ≥ 14 px.
- Содержимое (сценарии, карточки ошибок, профили конфига) — в отдельных JSON‑файлах контента, а не в коде компонентов. Это обязательное требование: методологи будут править контент без разработчика.
- Все тексты вывода freqtrade агент обязан сверить с актуальной документацией freqtrade (stable). Где точная формулировка сообщения неизвестна — пометить в контенте `"verified": false`, чтобы редактор проверил.

---

# E1. «Терминал‑переводчик»

## 1. Назначение

Эмулятор консоли, который показывает **реальный вид** вывода команд (`freqtrade …`, `python …`, `pip …`, Telegram‑бот), где каждая строка и каждый значимый токен кликабельны и переводятся на русский; типовые ошибки оформлены как «карточки диагноза».

**Заблуждения, которые ломает E1:**
1. «Английский текст в терминале — это непонятная стена, при ошибке надо всё переустановить» → *ошибка — это структурированное сообщение с известным первым действием.*
2. «Красный текст = катастрофа» → *WARNING ≠ ERROR; Traceback читается снизу вверх.*
3. «Отчёт бэктеста — это одна цифра Total profit» → *отчёт — таблица метрик с зонами (мост к E8).*
4. «Уведомление бота = приказ действовать» (FT‑19, П1) → *лог‑строка сначала классифицируется по уровню, потом решается, надо ли что‑то делать.*

## 2. Пользовательские сценарии

| # | Сценарий | Урок |
|---|---|---|
| S1 | Ученик нажимает кнопку команды (`freqtrade --version`), вывод «печатается» построчно; кликает по `freqtrade`, `--version`, номеру версии — читает русские карточки | FT‑02 |
| S2 | Появляется Traceback; над ним всплывает «карточка диагноза»: что это, почему, первое действие. Ученик нажимает «Показать команду лечения» → команда появляется в строке ввода | FT‑02, Py‑10 |
| S3 | Мини‑игра «Диагност»: 6 экранов ошибок, ученик выбирает причину и первую команду; счёт, разбор | FT‑02 |
| S4 | Отчёт бэктеста: ученик переключает «RU‑замена» — заголовки таблицы и метрики становятся русскими, числа и имена пар остаются; клик по метрике показывает формулу и зону | FT‑09, FT‑14 |
| S5 | Эмулятор Telegram: приходит сообщение бота, ученик выбирает команду; опасные команды требуют протокол (мост к E4/E5, FT‑19) | FT‑19 |
| S6 | «Пошаговый» режим: вывод появляется по одной строке с подписью «что сейчас делает бот» (для `download-data`, `trade` при старте) | FT‑08, FT‑19 |

## 3. Анатомия интерфейса

```
┌─────────────────────────────────────────────────────────────────┐
│ [Лента команд ▸] [EN | EN+RU | RU]  [Пошагово ⏵] [Сброс]        │  ← верхняя панель
├─────────────────────────────┬───────────────────────────────────┤
│  ТЕРМИНАЛ (моноширинный)    │  ПАНЕЛЬ ПЕРЕВОДА                  │
│  $ freqtrade backtesting …  │  Строка 12: «Total profit %»      │
│  INFO - Loading data…       │  По‑русски: Итоговая доходность   │
│  ┌ Traceback ─────────────┐ │  Формула: …                       │
│  │ … ModuleNotFoundError  │ │  Зона: рабочая (урок FT‑09)       │
│  └────────────────────────┘ │  [К уроку 1.10] [В журнал]        │
│  [Карточка диагноза ⚠]      │                                   │
├─────────────────────────────┴───────────────────────────────────┤
│ Строка ввода: $ ▮   (только из белого списка команд инстанса)   │
└─────────────────────────────────────────────────────────────────┘
```

**Элементы:**

- **Лента команд** — горизонтальный список кнопок‑команд, разрешённых инстансом (например, для FT‑08: `download-data`, `list-data`, `check_data.py`). Клик = «ввод команды». Каждая кнопка имеет русскую подпись под текстом команды.
- **Терминал** — область вывода. Строки типизированы (`cmd`, `stdout`, `stderr`, `table`, `progress`, `tg_in`, `tg_out`). Строки `stderr` — цвет «тревожный», но не красный сплошняком: **уровень лога** подсвечивается цветным бейджем (`INFO` серый, `WARNING` жёлтый, `ERROR` красный), а не вся строка.
- **Gutter (правое поле терминала)** в режиме EN+RU: короткая русская подпись к строке (≤ 6 слов), полупрозрачным.
- **Панель перевода** — открывается по клику на строку/токен: заголовок токена, `ru_short`, `ru_card`, при наличии — формула/пример/зона; кнопки «К уроку», «В журнал» (записать «непонятный термин»).
- **Карточка диагноза** — модальная плашка поверх терминала при обнаружении ошибки (см. §6).
- **Строка ввода** — принимает только команды из белого списка инстанса (`allowed_commands`); при вводе неразрешённой — мягкое сообщение: «В этом уроке эта команда не нужна. Доступно: …». Автодополнение по Tab. Обязательно: ученик может **набирать команду сам**, а не только кликать — это тренирует моторику.

## 4. Режимы

| Режим | Поведение |
|---|---|
| **Просмотр** (по умолчанию) | Вывод команды появляется целиком (анимация печати 0.3–0.8 с, отключаемая). |
| **Пошагово** | Каждая строка появляется по кнопке «Дальше»; в панели перевода — поле `step_note` («Что сейчас делает бот: проверяет, какие свечи уже лежат на диске»). Для `download-data` и старта `trade` — обязательно. |
| **EN / EN+RU / RU‑замена** | EN — чистый вывод; EN+RU — gutter‑подписи; RU‑замена — заменяются **только** токены с флагом `replaceable: true` (заголовки таблиц, текст сообщений INFO/ERROR, названия причин выхода). Идентификаторы, команды, флаги, имена пар, числа, пути — не заменяются никогда. Заменённый токен подчёркнут пунктиром, клик показывает оригинал. |
| **Диагност** (мини‑игра) | См. §7. |
| **Сравнение** | Два терминала рядом (для FT‑11: честная и утекающая стратегия; для FT‑13: бэктест с `fee` реальным и завышенным). Строки с расхождением подсвечены. |

## 5. Модель данных

### 5.1. Сценарий (`scenario.json`)

```json
{
  "id": "ft08_download_data",
  "lesson": "FT-08",
  "title": "Скачиваем историю свечей",
  "misconception": "Скачал — значит данные хорошие",
  "takeaway": "После скачивания всегда: list-data + проверка дыр и дублей.",
  "allowed_commands": ["freqtrade download-data", "freqtrade list-data", "python check_data.py"],
  "commands": [
    {
      "input": "freqtrade download-data -c user_data/config.json --timerange 20230101-20260801 --timeframe 1h",
      "label_ru": "Скачать часовые свечи за период",
      "step_mode_default": true,
      "lines": [
        {
          "kind": "stdout",
          "text": "2026-08-02 10:14:03,112 - freqtrade.configuration.load_config - INFO - Using config: user_data/config.json ...",
          "ru_gutter": "Прочитал конфиг",
          "step_note": "Бот открыл config.json и взял оттуда биржу и белый список пар.",
          "tokens": [
            {"start": 61, "end": 65, "term": "log_level_info"},
            {"start": 68, "end": 80, "term": "using_config"}
          ]
        },
        {
          "kind": "stdout",
          "text": "... - INFO - Downloading pair BTC/USDT, spot, interval 1h.",
          "ru_gutter": "Качает BTC/USDT, 1ч",
          "tokens": [{"start": 13, "end": 29, "term": "downloading_pair"}, {"start": 40, "end": 51, "term": "interval"}]
        }
      ]
    }
  ],
  "error_cards": ["no_data_found"],
  "verified": false
}
```

Правила:
- `tokens` можно не размечать вручную — работает **автотокенизатор** (§5.3); ручная разметка имеет приоритет.
- `kind: "table"` — строка таблицы; для таблиц дополнительно задаётся `columns: [{en, ru, term}]`, чтобы «RU‑замена» переводила заголовок, а клик по ячейке открывал карточку метрики.
- `kind: "progress"` — строка с прогресс‑баром/эпохами hyperopt; поддерживает анимацию `Epoch 37/200`.

### 5.2. Термин словаря

```json
{
  "id": "stake_amount",
  "en": "stake_amount",
  "type": "config_key",
  "ru_short": "размер ставки",
  "ru_card": "Сколько USDT бот кладёт в одну сделку. Значение unlimited делит доступный баланс на число слотов max_open_trades.",
  "example": "\"stake_amount\": 150  →  150 USDT на сделку",
  "lesson_ref": "FT-04",
  "replaceable": false,
  "related": ["max_open_trades", "dry_run_wallet"]
}
```

### 5.3. Автотокенизатор (правила разметки)

Последовательно применяются regex‑правила; первое совпадение выигрывает; результат сверяется со словарём — если `term` не найден, токен всё равно помечается как `unknown` и показывает карточку «Этот токен ещё не описан — нажми, чтобы отметить» (запись `unknown_term` в телеметрию; это источник пополнения словаря).

| Приоритет | Что ловим | Пример | type |
|---|---|---|---|
| 1 | Уровни логов `INFO|WARNING|ERROR|DEBUG` | `- WARNING -` | log_level |
| 2 | Python‑исключения `\b[A-Z][A-Za-z]+(Error|Exception|Warning)\b` | `KeyError`, `OperationalException` | py_error |
| 3 | Подкоманды freqtrade после слова `freqtrade` | `backtesting`, `download-data` | cmd |
| 4 | Флаги `--[a-z-]+` и короткие `-[a-zA-Z]` | `--timerange`, `-c` | flag |
| 5 | Ключи конфига (список из словаря) | `dry_run`, `max_open_trades` | config_key |
| 6 | Заголовки метрик (список из словаря) | `Profit factor`, `Max Drawdown` | metric |
| 7 | Причины выхода `roi|stop_loss|exit_signal|trailing_stop_loss|force_exit|emergency_exit` | | exit_reason |
| 8 | Telegram‑команды `/[a-z_]+` | `/forceexit` | tg_cmd |
| 9 | Пути и файлы `user_data/…`, `*.py`, `*.json`, `*.feather` | | path (карточка «это путь к файлу, не команда») |
| 10 | Пары `[A-Z]{2,6}/[A-Z]{3,5}` | `BTC/USDT` | pair |
| 11 | Числа с единицами `\d+(\.\d+)?\s?(USDT|%|h|m|d)` | `150 USDT`, `-10%` | number (карточка не нужна, но подсветка при связке с E2) |

Не токенизируются: даты‑штампы логов (сворачиваются в кликабельный `[время]` с подписью «дата и время записи в журнал — можно не читать»), хеши, PID.

### 5.4. Карточка ошибки (`error_card.json`)

```json
{
  "id": "modulenotfound_pandas",
  "match": {"regex": "ModuleNotFoundError: No module named '(\\w+)'"},
  "title_ru": "Не найден модуль (библиотека)",
  "what_it_means": "Python не нашёл библиотеку «{1}». Сама программа цела — просто в этом окружении её не установили или вы запустили не то окружение.",
  "why_top3": [
    "Виртуальное окружение (venv) не активировано — pip ставил в одно место, запускаешь из другого.",
    "Опечатка в import: написали panda вместо pandas.",
    "Библиотека действительно не установлена."
  ],
  "first_action": {"cmd": "source .venv/bin/activate && pip install {1}", "ru": "Активировать окружение и установить библиотеку"},
  "how_to_verify": {"cmd": "python -c \"import {1}; print('ok')\"", "ru": "Должно напечатать ok"},
  "not_a_disaster": true,
  "severity": "error",
  "lesson_ref": ["Py-10", "FT-02"],
  "read_direction_hint": "Traceback читается снизу вверх: последняя строка — суть ошибки."
}
```

Поля `{1}` — подстановки из regex‑групп.

## 6. Обязательный банк контента

### 6.1. Сценарии вывода (минимум для W‑A/W‑B)

Агент реализует каждый как отдельный `scenario.json`. Числа — из соответствующих уроков.

| ID | Урок | Команда(ы) | Ключевые строки, которые обязаны быть | Токены/карточки |
|---|---|---|---|---|
| `py01_print` | Py‑01 | `python bot.py` | `Привет, рынок! Мой депозит: 1000$`; вторая версия — `SyntaxError: Missing parentheses in call to 'print'` | карточка `syntaxerror_print` |
| `py10_import` | Py‑10 | `python bot.py` с `import panda` | `ModuleNotFoundError: No module named 'panda'`; исправленный запуск печатает `Колонки в таблице: ['close', 'volume']`, `Средняя цена свечей (mean): 65054.0$` | `modulenotfound_*` |
| `ft02_install` | FT‑02 | `python3 --version`, `python3 -m venv .venv`, `source .venv/bin/activate`, `pip install freqtrade`, `freqtrade --version`, `freqtrade create-userdir --userdir user_data`, `freqtrade new-config` | Вывод версии `freqtrade 2026.x`; визард new‑config как диалог вопрос/ответ с русскими подписями к каждому вопросу (имя бота, биржа, dry‑run, валюта, стейк, таймфрейм, Telegram) | 6 экранов ошибок установки (§6.2: `cmd_not_found`, `old_python`, `pip_not_in_venv`, `modulenotfound_talib`, `permission_denied`, `config_not_found`) |
| `ft04_show_config` | FT‑04 | `freqtrade show-config -c user_data/config.json` | Итоговый конфиг с дефолтами; ключи кликабельны; кнопка «Открыть в Живом конфиге» (мост к E2) | все `config_key` |
| `ft08_download_data` | FT‑08 | `download-data` (3 пары, 1h), `download-data --pairs BTC/USDT --timeframe 1d`, `list-data`, `python check_data.py` | Таблица `list-data` (пара / таймфрейм / from / to); вывод `check_data.py` `PASS/FAIL` по парам, строка `дыра 6 часов 2024-03-12 03:00 → 09:00` | `feather`, `list-data`, `timerange`; карточка `no_data_found` |
| `ft09_backtest_report` | FT‑09, FT‑14 | `freqtrade backtesting --strategy TutorialEmaRsi --timerange 20240101-20250601 --timeframe 1h --export trades` | Полный отчёт: таблица по парам; `EXIT REASON STATS` (roi / exit_signal / stop_loss / trailing_stop_loss); `LEFT OPEN TRADES`; `SUMMARY METRICS` (Backtesting from/to, Total/Daily Avg Trades, Starting balance 1000 USDT, Final balance, Absolute profit, Total profit %, CAGR %, Sortino, Sharpe, Calmar, Profit factor, Expectancy, Max Drawdown (Account), Drawdown Start/End, Best/Worst Pair, Trades per day, Market change). Числа — в «рабочей зоне новичка» из FT‑09: ~112 сделок, PF 1.42, DD 11–14 %, Total profit +38 % против Market change +21 %. **Каждая метрика** ссылается на термин с полями `formula_ru` и `zone` (тревожная/рабочая) из таблицы FT‑09 | все `metric`, `exit_reason` |
| `ft09_suspicious` | FT‑09 | тот же бэктест, но «слишком хороший» | 14 сделок, Total profit +120 %, PF 4.8, `Fee: 0.0000` — карточка‑предупреждение «Синдром +80 % за вечер» с указанием на строку Fee и число сделок | `fee_zero_warning` |
| `ft11_lookahead` | FT‑11 | `freqtrade lookahead-analysis --strategy X --timerange …` ×3 стратегии | Таблица `strategy | has_bias | total_signals | biased_entry_signals | biased_exit_signals | biased_indicators`; для А — `false`, для Б — `true, biased_indicators: close_shift_m1`, для В — `true, ... bfill_col`. Режим «Сравнение» | `has_bias`, `biased_indicators` |
| `ft12_recursive` | FT‑12 | `freqtrade recursive-analysis --startup-candle 200 400 600` | Таблица индикатор × кол‑во стартовых свечей с % расхождения; `ema200` расходится при 200, стабилен при 400+ | `startup_candle_count` |
| `ft13_fee_compare` | FT‑13 | бэктест с `--fee 0.001` и `--fee 0.0035` | Режим «Сравнение»: Total profit падает; подпись: «250 сделок × 0,2 % за круг = −50 % относительной доходности» (числа урока FT‑13) | `fee` |
| `ft16_hyperopt` | FT‑16 | `freqtrade hyperopt --hyperopt-loss SharpeHyperOptLoss --spaces buy --epochs 200 -j 4 --timerange 20230101-20240601`, `freqtrade hyperopt-show --best` | `progress`‑строки `Epoch 37/200 … Objective: -1.23`; итог `Best result: … rsi_buy = 34`; предупреждение‑карточка при попытке `--spaces roi stoploss` («три запрета первого года») | `epoch`, `Objective`, `--spaces`, `SharpeHyperOptLoss` |
| `ft19_dryrun_start` | FT‑19 | `freqtrade install-ui`, `freqtrade trade -c … --strategy DipBuyerBTCFilter` | Пошагово: `Dry run is enabled` (подсветка зелёным + подпись «Песочница включена»), `Using pairlist: StaticPairList`, `Wallets synced.`, `Bot heartbeat. … state='RUNNING'`, `Long signal found: about create a new trade for SOL/USDT with stake_amount: 150`, позже `Exit for BTC/USDT … exit_reason: stop_loss`. Если в конфиге инстанса `dry_run:false` — строка `Dry run is disabled` подсвечивается красным с блокирующей карточкой «СТОП: это реальные деньги» | `dry_run`, `heartbeat`, `Wallets synced` |
| `ft19_telegram` | FT‑19 | эмулятор чата: `/status`, `/profit`, `/daily`, `/stopentry`, `/forceexit all` | Ответы бота в реальном формате Freqtrade‑Telegram (сводка `/profit`: ROI closed trades, Total trade count, First/Latest trade, Avg. Duration, Best pair). Команды маркированы уровнем 0–3 (таблица FT‑19). `/stopentry` требует ввести причину → журнал; `/forceexit` открывает модалку «Мир или голова» (R1): поле «Назови факт» (пусто = кнопка неактивна), вопрос «Подождёт ли до утра?» → журнал | все `tg_cmd` |
| `vk3_hallucination` | ВК3 | «ответ агента» в виде кода/терминала | 5 подсвеченных мест‑галлюцинаций (несуществующий метод API, комиссия 0.01 %, статистика без источника, «топ‑10 сегодняшних монет», `center=True`); клик по каждому — карточка «ground truth: где проверить» | `hallucination_*` (5 карточек) |

### 6.2. Банк карточек диагноза (обязательные 20)

| id | Как выглядит (match) | Что значит по‑русски | Первое действие | Урок |
|---|---|---|---|---|
| `cmd_not_found` | `bash: freqtrade: command not found` / `'freqtrade' is not recognized…` (Windows) | Система не знает такой команды — почти всегда не активировано окружение | `source .venv/bin/activate` (Win: `.venv\Scripts\activate`) | FT‑02 |
| `old_python` | `ERROR: Package 'freqtrade' requires a different Python: 3.8.x not in '>=3.11'` | Системный Python старый | Установить поддерживаемую версию, пересоздать venv | FT‑02 |
| `pip_not_in_venv` | `Defaulting to user installation because normal site-packages is not writeable` + позже `ModuleNotFoundError` | pip поставил не туда: окружение не активно | Активировать venv, повторить `pip install` | FT‑02 |
| `modulenotfound_generic` | `ModuleNotFoundError: No module named '(\w+)'` | Библиотека не найдена | см. §5.4 | Py‑10, FT‑02 |
| `modulenotfound_typo` | то же, но имя в словаре опечаток (`panda`, `nunpy`, `freqtrad`) | Опечатка в import | Исправить написание | Py‑10 |
| `syntaxerror_print` | `SyntaxError: Missing parentheses in call to 'print'` | print без круглых скобок | Добавить скобки | Py‑01 |
| `keyerror` | `KeyError: '(\w+)'` | В словаре нет такого ключа — проверь точное написание | Напечатать `list(candle.keys())` | Py‑08 |
| `indexerror` | `IndexError: list index out of range` | Запросили элемент за концом списка (в списке из 5 свечей индексы 0–4) | `print(len(closes))` | Py‑05 |
| `nameerror` | `NameError: name '(\w+)' is not defined` | Переменную не объявили выше или опечатка | Найти строку присваивания | Py‑02 |
| `typeerror_str_mul` | `TypeError: can't multiply sequence by non-int of type 'float'` | Умножаете текст `"0.1"` на число — забыли кавычки убрать | `float(amount)` / убрать кавычки | Py‑03 |
| `strategy_not_found` | `OperationalException: Impossible to load Strategy '(\w+)'. This class does not exist or contains Python code errors.` | Имя класса ≠ имя файла, либо в файле ошибка Python | Сверить имя класса и файла; запустить `python -m py_compile user_data/strategies/{1}.py` | FT‑05 |
| `config_not_found` | `OperationalException: Config file "(.+)" not found!` | Не тот путь или не та папка запуска | `ls user_data/` | FT‑02, FT‑04 |
| `json_decode` | `json.decoder.JSONDecodeError: Expecting ',' delimiter: line (\d+) column (\d+)` | Сломан синтаксис JSON (лишняя/недостающая запятая или кавычка) в строке {1} | Открыть config.json, строка {1} | FT‑04 |
| `no_data_found` | `OperationalException: No data found. Terminating.` / `No history for BTC/USDT, spot, 1h found. Use freqtrade download-data…` | Свечей за этот период/таймфрейм на диске нет | `freqtrade download-data …` с тем же `--timeframe` | FT‑08 |
| `pair_not_available` | `OperationalException: Pair (\S+) is not available on (\w+)…` | Такой пары нет на бирже/в её списке | `freqtrade list-pairs --exchange {2}` | FT‑04 |
| `rate_limit` | `ccxt.base.errors.RateLimitExceeded` / `"code":-1003` / `HTTP 429` | Слишком много запросов; биржа временно отказывает. **Не ошибка вашего кода** | Подождать; проверить `rateLimit`; ничего не перезапускать судорожно | FT‑19 |
| `auth_error_ip` | `ccxt.base.errors.AuthenticationError: … "code":-2015,"msg":"Invalid API-key, IP, or permissions for action."` | Ключ не подходит: чаще всего IP сервера не в whitelist — так и должно быть по уроку 4.3 | Проверить IP whitelist на бирже | 4.3, FT‑19 |
| `insufficient_funds` | `ccxt.base.errors.InsufficientFunds` | Стейк больше доступного баланса | Пересчитать `stake_amount` (мост к E2) | FT‑04 |
| `order_timeout` | `… Cancelling open entry order due to timeout for Trade(…)` / `unfilledtimeout` | Лимитка не исполнилась за отведённое время — штатное поведение, не сбой | Ничего; сверить частоту отмен с ожиданием (FT‑06) | FT‑06 |
| `telegram_unauthorized` | `ERROR - … telegram … Unauthorized` | Неверный token или chat_id | Пересоздать токен у @BotFather | FT‑19 |
| `address_in_use` | `OSError: [Errno 98] Address already in use` | Порт 8080 уже занят (второй запуск бота или другая программа) | Найти процесс; **не** открывать другой порт наружу | FT‑19 |
| `warning_not_error` | любая строка `- WARNING -` без последующего `ERROR` | Предупреждение — бот продолжает работу. Записать и разобрать в плановый осмотр | Ничего немедленно | FT‑19, П2 |

Общие правила карточек:
- Заголовок карточки всегда начинается с русского названия, английское имя исключения — мелко под ним.
- Поле `not_a_disaster: true` показывает зелёный бейдж «Это лечится за минуту» — важно для снятия паники.
- В карточке кнопка «Читать Traceback правильно» — открывает подсветку: последняя строка обведена «суть», выше — «где именно (файл, строка)», ещё выше — «путь вызовов, можно не читать».

### 6.3. Стартовый словарь (агент заводит не менее этих терминов; `ru_card` — не короче одного предложения)

`freqtrade`, `backtesting`, `download-data`, `list-data`, `show-config`, `new-config`, `create-userdir`, `lookahead-analysis`, `recursive-analysis`, `hyperopt`, `hyperopt-show`, `trade`, `install-ui`, `plot-dataframe`, `--timerange`, `--timeframe`, `--strategy`, `-c/--config`, `--export`, `--spaces`, `--epochs`, `-j`, `--fee`, `--pairs`, `--startup-candle`, `dry_run`, `dry_run_wallet`, `stake_amount`, `stake_currency`, `max_open_trades`, `tradable_balance_ratio`, `pair_whitelist`, `pair_blacklist`, `pairlists`, `StaticPairList`, `VolumePairList`, `order_types`, `unfilledtimeout`, `entry_pricing`, `exit_pricing`, `fee`, `api_server`, `listen_ip_address`, `telegram`, `chat_id`, `stoploss`, `minimal_roi`, `trailing_stop`, `trailing_stop_positive`, `trailing_stop_positive_offset`, `startup_candle_count`, `protections`, `StoplossGuard`, `MaxDrawdown`, `CooldownPeriod`, `INTERFACE_VERSION`, `populate_indicators`, `populate_entry_trend`, `populate_exit_trend`, `enter_long`, `exit_long`, `IStrategy`, `DataFrame`, `INFO`, `WARNING`, `ERROR`, `Traceback`, `ModuleNotFoundError`, `KeyError`, `IndexError`, `SyntaxError`, `NameError`, `TypeError`, `OperationalException`, `RateLimitExceeded`, `AuthenticationError`, `InsufficientFunds`, `venv`, `pip`, `python`, `PID`, `heartbeat`, `Wallets synced`, `Dry run is enabled`, `Total profit %`, `Absolute profit`, `CAGR`, `Sharpe`, `Sortino`, `Calmar`, `Profit factor`, `Expectancy`, `Max Drawdown`, `Win/Draw/Loss`, `Win%`, `Avg Duration`, `Market change`, `Left open trades`, `Best pair`/`Worst pair`, `roi`, `stop_loss`, `exit_signal`, `trailing_stop_loss`, `force_exit`, `has_bias`, `biased_indicators`, `Epoch`, `Objective`, `SharpeHyperOptLoss`, `/status`, `/profit`, `/daily`, `/stopentry`, `/forceexit`, `/stop`, `/reload_config`, `feather`, `user_data`.

Для метрик (`type: metric`) обязательны дополнительные поля: `formula_ru` (словами: «сумма прибылей, делённая на сумму убытков») и `zones` (`{"alarm": "< 1.1", "ok": "1.3–1.8", "suspicious": "> 2.5 на in-sample"}` — из таблицы FT‑09).

## 7. Мини‑игра «Диагност» (тип ИГР)

- Конфиг инстанса: `mode: "diagnose"`, список `cases: [error_card_id…]` (для FT‑02 — 6 карточек установки).
- Ход одного кейса:
  1. В терминале появляется команда и её вывод с ошибкой (карточка диагноза **скрыта**).
  2. Шаг «Причина»: 4 варианта (1 верный + 3 дистрактора из других карточек того же типа). Ученик может кликать по токенам вывода — карточки терминов доступны, карточка диагноза нет.
  3. Шаг «Первое действие»: 4 команды (1 верная). Дистракторы обязательно включают «переустановить всё» и «удалить user_data» (ломаем заблуждение «паника → снос»).
  4. Разбор: показывается полная карточка диагноза; подсвечивается строка, по которой можно было понять.
- Скоринг: причина 1 балл, действие 1 балл; таймера нет (мы тренируем чтение, не скорость). Итог: «N из 12», список кейсов с ошибкой и кнопка «Пройти ещё раз только ошибочные».
- Телеметрия: `diag_case_answered {case, stage, correct, attempt_no}`; целевая метрика курса — на второй попытке ошибок на 50 % меньше.
- Критерий освоения инстанса: ≥ 10/12, иначе рекомендуется повтор (не блокирует урок).

## 8. Телеметрия E1

`term_viewed {term, lesson}`, `unknown_term {text, lesson}`, `lang_mode_changed {mode}`, `command_run {cmd, via: click|typed}`, `error_card_opened {card}`, `traceback_hint_opened`, `diag_case_answered {…}`, `tg_dangerous_cmd_attempt {cmd, fact_provided: bool}`, `journal_written {kind}`.

Отчёт для методолога: топ‑20 `unknown_term` за неделю (пополнение словаря); доля `tg_dangerous_cmd_attempt` с `fact_provided:false` — должна падать от FT‑19 к FT‑20.

## 9. Критерии приёмки E1

1. Все 14 сценариев §6.1 и 21 карточка §6.2 существуют как контент‑JSON и загружаются без ошибок валидации схемы.
2. В любом сценарии в режиме EN+RU **ни одна** строка вывода не остаётся без gutter‑подписи (автопроверка: линтер контента падает, если `ru_gutter` пуст и строка не помечена `skip_gutter: true` с причиной).
3. Клик по любому токену из словаря открывает карточку ≤ 200 мс; клик по неизвестному токену — карточку «не описан» и событие телеметрии.
4. В режиме «RU‑замена» команды, флаги, ключи конфига, пути, пары и числа не изменяются (автотест сравнивает эти классы токенов до/после).
5. Ошибка в выводе автоматически поднимает карточку диагноза, если совпал `match`; в режиме «Диагност» карточка скрыта до разбора.
6. `/forceexit` в эмуляторе Telegram невозможно отправить с пустым полем «факт»; факт и ответ на второй вопрос записываются через `journal.write`.
7. Сценарий `ft19_dryrun_start` с `dry_run:false` блокирует продолжение модалкой (сохраняется в телеметрии).
8. Работает с клавиатуры без мыши; на ширине 360 px терминал горизонтально прокручивается, панель перевода — нижняя шторка.
9. Печать длинного отчёта бэктеста (~120 строк) не тормозит интерфейс (виртуализация списка).

Тест‑кейсы (минимум): T1 — Py‑01: ввод `print "Привет"` → карточка `syntaxerror_print`, кнопка «Исправить» подставляет скобки; T2 — FT‑02 Диагност 6/6 с намеренно неверными ответами → все разборы показаны, счёт 0/12, повтор доступен; T3 — FT‑09: переключение EN → RU‑замена → EN сохраняет числа побайтно; T4 — FT‑19: ночной сценарий «ошибка API 429» → верное действие «ничего, записать» принимается, `/forceexit` без факта отклоняется; T5 — неизвестный токен в новом сценарии → карточка‑заглушка и событие `unknown_term`.

---

# E2. «Живой конфиг»

## 1. Назначение

Редактор конфигурации (JSON/атрибуты стратегии/YAML‑устав/права API‑ключа) с элементами управления (ползунки, тумблеры, чипы), где **любое изменение мгновенно пересчитывает правую панель последствий**: риск на сделку в %, суммарный одновременный риск, USDT на слот, ожидаемое число сделок и ширина доверительного интервала, потери при серии стопов, и — в специальных профилях — «что сделает вор с этим ключом», «что заблокирует устав».

**Заблуждения, которые ломает E2:**
1. «Настроил визардом — значит правильно» (FT‑04).
2. «`unlimited` = безопасно; лимит по числу сделок = лимит по риску» (FT‑04, FT‑17, FT‑18).
3. «Защиты (protections) улучшают прибыль» (FT‑17).
4. «Право вывода у ключа — мелочь, всё равно IP‑whitelist» (4.3).
5. «Устав живёт в голове» (5.6).

## 2. Анатомия интерфейса

```
┌────────────────────────────────────────────────────────────────────┐
│ Профиль: [Конфиг Freqtrade ▾]  Депозит: 1000 USDT  [Сценарии ▾]     │
├───────────────────────────────┬────────────────────────────────────┤
│ ЛЕВАЯ ПАНЕЛЬ — КОНФИГ         │ ПРАВАЯ ПАНЕЛЬ — ПОСЛЕДСТВИЯ         │
│ "dry_run": [● true ]          │ ▣ USDT на слот ............ 150   │
│ "dry_run_wallet": [1000 ]     │ ▣ Риск на сделку ....... 15 USDT  │
│ "max_open_trades": [——●— 3]   │                          = 1,5 %  │
│ "stake_amount": [150 | unlim] │ ▣ Суммарный риск (3 поз.) 4,5 %   │
│ "stoploss": [———●—— -0.10]    │ ▣ Ожидаемо сделок за 3 мес: 26–39 │
│ ...                           │   ДИ винрейта при n=30: ±18 п.п.  │
│ [Показать как JSON] [Diff]    │ ▣ Серия из 10 стопов: −150 (−15 %)│
│                               │ ▣ Восстановление после: +17,6 %   │
├───────────────────────────────┴────────────────────────────────────┤
│ СИГНАЛЫ ТРЕВОГИ: ⚠ dry_run=false — реальные деньги!  ⚠ blacklist пуст│
└────────────────────────────────────────────────────────────────────┘
```

- **Левая панель** — список полей профиля. Каждое поле: ключ (моноширинный, кликабелен → Glossary), контрол (по `type`), текущее значение, русская подпись под ключом. Кнопка **«Показать как JSON/YAML»** переключает левую панель в текстовый вид с подсветкой изменённых строк (**учебная связка**: ученик видит, что ползунок = строка в файле). Ручная правка текста допускается только в профиле 5.6 (там это часть смысла) — в остальных профилях текст read‑only.
- **Правая панель** — карточки производных метрик. Каждая карточка: значение крупно, формула словами (раскрывается), цветная зона (зелёная/жёлтая/красная) и ссылка на урок. Изменившаяся при последней правке карточка подсвечивается на 1 с («что именно ты поменял»).
- **Сигналы тревоги** — валидаторы (§5). Каждый сигнал: иконка уровня, текст, кнопка «Почему» → карточка, кнопка «Исправить» → подсказка (не автофикс! автофикс только в режиме «Разбор» игры).
- **Сценарии** — кнопки стресс‑событий (§6): «Серия из 10 стопов», «Обвал −20 % по всем позициям», «Сравнить с unlimited», «Три альта коррелированы 0,9».
- **Diff** — панель «было → стало» для всех изменённых ключей с пересчётом дельт метрик; используется в R12 «правило одного изменения».

## 3. Модель данных

### 3.1. Профиль (`profile.json`)

```json
{
  "id": "ft_config_basic",
  "title": "Конфиг Freqtrade: песочница",
  "format": "json",
  "context": {"deposit_usdt": 1000, "deposit_rub": 100000, "timeframe": "1h", "pairs": 3, "horizon_weeks": 13},
  "fields": [
    {
      "key": "dry_run", "path": "dry_run", "type": "toggle", "default": true,
      "label_ru": "Песочница", "term": "dry_run",
      "danger_value": false
    },
    {
      "key": "max_open_trades", "path": "max_open_trades", "type": "slider",
      "min": 1, "max": 10, "step": 1, "default": 3, "label_ru": "Одновременных сделок", "term": "max_open_trades",
      "alt_values": [{"value": "unlimited", "label_ru": "без лимита"}]
    },
    {
      "key": "stake_amount", "path": "stake_amount", "type": "number_or_enum",
      "min": 10, "max": 1000, "step": 10, "default": 150,
      "enum": [{"value": "unlimited", "label_ru": "unlimited — делить баланс на слоты"}],
      "label_ru": "Размер ставки", "term": "stake_amount"
    },
    {
      "key": "stoploss", "path": "strategy.stoploss", "type": "slider",
      "min": -0.30, "max": -0.01, "step": 0.01, "default": -0.10, "label_ru": "Стоп-лосс", "term": "stoploss",
      "display": "percent"
    }
  ],
  "derived": ["usdt_per_slot", "risk_per_trade", "total_risk", "expected_trades", "winrate_ci", "streak_loss", "recovery_needed"],
  "validators": ["dry_run_false", "stake_gt_wallet", "leveraged_in_whitelist", "blacklist_empty", "unfilledtimeout_long", "risk_above_2pct", "total_risk_above_6pct", "unlimited_risk_hint"],
  "scenarios": ["streak10", "crash20", "compare_unlimited"],
  "misconception": "Настроил визардом — значит правильно",
  "takeaway": "Сайзинг — главный предохранитель: stake × |stoploss| ≤ 1–2 % депозита."
}
```

Типы контролов: `toggle`, `slider`, `number`, `number_or_enum`, `select`, `chips` (для `pair_whitelist`/`pair_blacklist` — добавление/удаление пар из предложенного списка; в списке намеренно есть `BTCUP/USDT`, `ETHDOWN/USDT`, `USDC/USDT`), `roi_table` (редактор лестницы `minimal_roi`: строки «через N минут → цель %»), `protection_list` (карточки защит с параметрами), `yaml_text` (только 5.6).

### 3.2. Производная метрика (`derived.json`)

```json
{
  "id": "risk_per_trade",
  "label_ru": "Риск на сделку",
  "unit": ["USDT", "%"],
  "formula_ru": "размер ставки × |стоп-лосс| ; в процентах — делённое на депозит",
  "formula": "stake_eff * abs(stoploss)",
  "zones": {"ok": "<= 0.02", "warn": "0.02–0.03", "alarm": "> 0.03"},
  "lesson_ref": "FT-17",
  "depends_on": ["stake_amount", "stoploss", "dry_run_wallet", "max_open_trades", "tradable_balance_ratio"]
}
```

Все формулы вычисляются чистой функцией `derive(profileState) → metrics`; тестируются юнит‑тестами на числах уроков (§4).

### 3.3. Валидатор (`validators.json`)

```json
{
  "id": "leveraged_in_whitelist",
  "severity": "error",
  "check": "any(p matches /(UP|DOWN|BULL|BEAR)\\/USDT$/ for p in pair_whitelist)",
  "message_ru": "В белом списке leveraged-токен ({pair}). Это продукт с плечом и распадом — не для первой стратегии.",
  "why_card": "…(2–3 предложения)…",
  "fix_hint_ru": "Убери пару и добавь маску .*UP/USDT в pair_blacklist.",
  "lesson_ref": "FT-04",
  "hidden_in_game": true
}
```

`severity`: `error` (красный, блокирует «Допуск»), `warn` (жёлтый), `info` (серый).

## 4. Формулы и опорные числа (обязательно воспроизводятся тестами)

Обозначения: `W` — `dry_run_wallet`, `r` — `tradable_balance_ratio` (по умолчанию 0.99), `N` — `max_open_trades`, `S` — `stake_amount`, `L` — `|stoploss|`.

| Метрика | Формула | Контрольные числа из уроков |
|---|---|---|
| **USDT на слот** `stake_eff` | если `S == unlimited`: `W·r / N`; иначе `S` (а если `S > W·r` — валидатор `stake_gt_wallet`) | W=900, r=0.99, N=3 → **297** (FT‑04: «297–300»); W=1000, N=3 → ≈**330** |
| **Риск на сделку** | `stake_eff · L`; в % — `/W` | S=150, L=0.10, W=1000 → **15 USDT = 1,5 %** (FT‑17); unlimited → 33 USDT ≈ **3,3 %** («unlimited даст ~$330 и риск 3 %») |
| **Суммарный одновременный риск** | `N · риск_на_сделку` | N=3, 1,5 % → **4,5 %** (FT‑17); при unlimited → ≈10 % («минус 10 % депозита разом») |
| **Серия из k стопов** (сценарий) | фиксированный S: `k · stake_eff · L` (линейно — стейк не уменьшается); unlimited: пересчёт от остатка `W·(1−(r·L/N))^k`, рядом подпись «урок округляет линейно: ≈ −33 %» | k=10, S=150 → **−150 USDT (−15 %)**; unlimited → −33 % линейно / −29 % с пересчётом (FT‑17) |
| **Вероятность серии ≥ k при винрейте p и n сделках** | `≈ n·(1−p)^k` (не более 1); ожидаемая макс. серия `ln(n)/ln(1/(1−p))` | p=0.55, n=500 → ожид. **≈ 8**, P(≥10) ≈ **17 %** (5.5); p=0.5 и 0.4 при k=10 → 0,1 % и 0,6 % на сотню (FT‑17) |
| **Восстановление после просадки DD** | `1/(1−DD) − 1` | 15 % → **+17,6 %**; 24 % → **+32 %** (П3); 50 % → +100 % (0.12) |
| **Ожидаемое число сделок за горизонт** | `pairs · f(tf) · weeks · u(N)`; `f(tf)` — учебные ориентиры сигналов на пару в неделю: 5m 15, 15m 8, 1h 1, 4h 0.4, 1d 0.1 (редактируемые в контексте профиля через `signals_per_pair_week`); `u(N)` — коэффициент занятости слотов = `min(1, N / pairs)` | 3 пары, 1h, 13 недель → диапазон **26–39** (FT‑04: «~25–35 сделок за 3 месяца») — показывать диапазон ±20 % |
| **Ширина ДИ винрейта** | `±1.96·√(p(1−p)/n)` при p=0.5 | n=30 → **±17,9 п.п.**; n=100 → ±9,8; n=400 → ±4,9 (FT‑08 «Таймфрейм и статистика») |
| **Издержки за горизонт** (профиль FT‑13/FT‑04 расширенный) | `trades · (2·fee + slippage)` | 250 сделок, fee 0.1 % → **−50 %** относительной доходности при +100 % брутто (FT‑13) |
| **Обвал −20 % по всем позициям** (сценарий) | убыток = `N · stake_eff · max(L, 0.20 + gap)`, `gap` = 0.02 («стопы сработают хуже уровня») | подпись из FT‑17 п.4 |
| **Коррелированный обвал** (FT‑18) | эффективное число независимых позиций `N_eff = N / (1 + (N−1)·ρ)`; отображать «три лонга при ρ=0,9 ≈ 1,1 позиции размером в 3 стейка» | FT‑18: «три лонга = один риск» |

Все результаты округлять как в уроках (проценты — до 0,1; USDT — до целых).

## 5. Обязательные валидаторы (профиль FT‑04 и производные)

| id | Условие | Уровень | Сообщение (кратко) |
|---|---|---|---|
| `dry_run_false` | `dry_run == false` | error, **блокирующий** баннер поверх всей панели | «Это реальные деньги. В обучении должно быть true.» |
| `stake_gt_wallet` | `S > W·r` | error | «Стейк больше доступного баланса — первая же сделка упадёт с InsufficientFunds» (кнопка «Показать в терминале» → E1 карточка `insufficient_funds`) |
| `leveraged_in_whitelist` | маска UP/DOWN/BULL/BEAR | error | см. §3.3 |
| `stable_in_whitelist` | `*/USDC`, `USDT/DAI` и т.п. | warn | «Стейбл‑пара: ходить некуда, комиссии съедят всё» |
| `blacklist_empty` | `pair_blacklist == []` | warn | «Пустой чёрный список: при VolumePairList в оборот попадут стейблы и leveraged‑токены» |
| `unfilledtimeout_long` | `unfilledtimeout.entry > 60` мин | warn | «Лимитка живёт {v} минут — много отмен и разъезд с бэктестом» |
| `unfilledtimeout_short` | `< 3` мин при `limit` | info | |
| `risk_above_2pct` | риск на сделку > 2 % | warn; > 3 % — error | «Правило Фазы 3: 1–2 %» |
| `total_risk_above_6pct` | суммарный > 6 % | warn; > 10 % — error | |
| `unlimited_risk_hint` | `S == unlimited` и N ≤ 3 | info | «unlimited ≠ безопасно: при 3 слотах это ~33 % депозита в позиции, риск ≈3,3 % на сделку» |
| `max_open_trades_high` | N ≥ 8 | warn | «Капитал размазан; для старта 2–3» |
| `keys_in_config` | `exchange.key != ""` | error | «Ключи в конфиге — уже инцидент. Для dry‑run они не нужны; для прода — переменные окружения» |
| `startup_lt_indicator` | `startup_candle_count < max_indicator_period` | error | «EMA200 на {v} свечах — не EMA» (FT‑12) |
| `roi_ladder_unsorted` | лестница ROI не убывает по времени | error | |
| `stoploss_positive` | `stoploss ≥ 0` | error | «Стоп задаётся отрицательной долей: −0.10» |
| `market_orders_everywhere` | все `order_types == market` | info | «Везде market — переплата taker‑комиссии» |
| `api_open_world` | `listen_ip_address == "0.0.0.0"` | error | «Публичный пульт бота» (FT‑19) |
| `api_weak_password` | пароль в списке слабых/из документации | error | |
| `telegram_no_chat_id` | `telegram.enabled && chat_id == ""` | error | «Любой найдёт бота и пошлёт /forceexit» |

## 6. Сценарии (стресс‑кнопки правой панели)

| id | Что показывает | Визуализация |
|---|---|---|
| `streak10` | Серия из 5 и 10 стопов подряд при текущем сайзинге; вероятность серии при винрейте 40/50/55 % (ползунок p) | Ступенчатый график баланса; две линии при «Сравнить с unlimited» (заготовка веера для E8) |
| `crash20` | Обвал −20 % по всем открытым позициям с гэпом через стоп | Столбики: «стоп по уровню» vs «фактически» |
| `compare_unlimited` | Таблица: фиксированный S vs unlimited → слот, риск/сделку, суммарный риск, серия 10 | Две колонки, различия подсвечены |
| `correlated_crash` (FT‑18) | Ползунок корреляции ρ 0…1 для N альтов; при ρ→1 стопы срабатывают одновременно | Три свечных мини‑графика синхронно падают; счётчик «эффективных позиций» |
| `three_contours` (FT‑17) | Один трендовый ход цены; переключатели: только стоп / +трейлинг / +StoplossGuard; пересчёт «забрал/отдал», Calmar | Линия цены с уровнями стопа; таблица «контур → закрывает риск → цена» из FT‑17 |
| `friction` (FT‑13) | Ползунки сделок/год, комиссии, проскальзывания, среднего профита → брутто/нетто/«съедено» | Три столбика |

## 7. Профили (инстансы движка по урокам)

| Профиль | Урок | Поля | Правая панель | Особенности |
|---|---|---|---|---|
| `ft_config_basic` | FT‑04 | `dry_run`, `dry_run_wallet`, `max_open_trades`, `stake_amount`, `tradable_balance_ratio`, `pair_whitelist` (chips), `pair_blacklist` (chips), `pairlists.method`, `order_types.entry/exit`, `unfilledtimeout.entry/exit`, `exchange.key` (read‑only индикатор «пусто/заполнено») | слот, риск/сделку, суммарный риск, ожидаемо сделок + ДИ, серия 10 | Режим **ИГР «Конфиг с 5 минами»**: загружается «конфиг‑заглушка №2» из урока (`dry_run:false`, стейк > баланса, leveraged‑токен в whitelist, `unfilledtimeout: 600`, пустой blacklist); валидаторы скрыты (`hidden_in_game`); ученик отмечает поля кликом «это мина»; таймер 3 мин (мягкий, только счёт); проверка → показ всех валидаторов; счёт X/5; второй заход — новая расстановка мин из пула валидаторов (генерация: выбрать 5 из 12 с гарантией хотя бы одной «денежной» и одной «безопасности»). Режим **СИМ «Слоты и риск»**: ползунки N × S × W → живой расчёт + сценарий `compare_unlimited` |
| `ft_risk_contours` | FT‑17 | `stoploss`, `trailing_stop` (toggle), `trailing_stop_positive`, `trailing_stop_positive_offset`, `trailing_only_offset_is_reached`, `protections` (карточки StoplossGuard/MaxDrawdown/CooldownPeriod с параметрами), `stake_amount`, `max_open_trades` | риск/сделку, суммарный, серия 10, Calmar (учебная кривая), «забрал/отдал» | Сценарий `three_contours`; предупреждение «protection ≠ kill‑switch»; при включении защиты, которая улучшила **и** прибыль, **и** DD одновременно — подсказка «проверь, не подогнаны ли lookback/trade_limit» |
| `ft_correlation` | FT‑18 | `max_open_trades`, `stake_amount`, `stoploss`, ползунок ρ (не ключ конфига — маркируется как «свойство рынка») | `N_eff`, риск «как одна позиция», серия | Сценарий `correlated_crash` |
| `api_key_rights` | 4.3 | тумблеры `Read`, `Trade`, `Withdraw`, `IP whitelist` (поле IP), `Sub-account balance` (доля капитала на субаккаунте, %), `Key stored in`: `config.json` / `.env` / `env var` | Карточка «Если ключ утёк, злоумышленник сможет: …» (варианты: «вывести всё за минуты», «разрушить счёт мошенническими сделками, но не вывести», «ничего — IP не совпадает», «прочитать баланс»); «Худшая потеря» = баланс субаккаунта; «Найдут ли на GitHub» при `config.json` | Валидаторы: `withdraw_on` (error, «СТРОГО ВЫКЛЮЧЕНО»), `no_ip_whitelist` (error), `key_in_config` (error), `subaccount_over_20pct` (warn, 5.7). Финальный чек «конструктор прав» = все зелёные |
| `charter_yaml` | 5.6 (R7), FT‑20 | YAML‑редактор с полями `risk_per_trade_pct`, `daily_loss_limit_pct`, `max_gross_exposure_pct`, `max_leverage`, `kill_criteria.rolling_sharpe_60d_below`, `kill_criteria.drawdown_pct_above`, `kill_criteria.execution_deviation_pct_above`, `change_policy.effective_from`, `change_policy.max_changes_per_week`, `allowed_exchanges`, `allowed_instruments`, `profit_withdrawal.quarterly_pct` | В рублях/USDT для капитала ученика: «дневной лимит = N ₽», «максимальная серия до kill», «что заблокирует бот при ордере X» (тестовый ордер: размер, плечо → вердикт charter_guard: пропустить/отклонить с указанием пункта); проверка каждого правила на «число + способ автопроверки» — правило без числа помечается «лозунг, не правило» (П52) | **Ритуальные блокировки (R7/R12):** правка сохраняется как «вступит в силу завтра» (симулируемый календарь урока; в реальном профиле — фактическая дата); вторая правка за учебную «неделю» блокируется с подписью «эффект первой ещё не измерен»; история версий с датами и обязательным полем «причина + ожидаемый эффект»; кнопка «Экспорт charter.yaml» |

Для всех профилей с депозитом: контекстный переключатель валюты отображения `USDT / ₽` (курс — из контекста урока, по умолчанию 100 000 ₽ = 1000 $ как у Алексея).

## 8. Мост E2 ↔ E1

- Кнопка **«Показать, как бот это напечатает»** на правой панели: собирает из текущего состояния конфигурационные строки старта `freqtrade trade` (`Dry run is enabled/disabled`, `Using pairlist`, `Wallets synced`, `stake_amount: 150`) и открывает E1 с этим сгенерированным сценарием (шаблон `ft19_dryrun_start` с подстановками). Если валидаторы `error` активны — E1 показывает соответствующие карточки (`insufficient_funds`, `pair_not_available` и т.п.).
- Из E1 карточка `insufficient_funds` содержит кнопку «Открыть в Живом конфиге» — состояние передаётся через общий `state bus` (`{profile, values}`).

## 9. Телеметрия E2

`field_changed {profile, key, from, to}`, `metric_zone_crossed {metric, from_zone, to_zone}` (ключевое событие: ученик увидел, как метрика ушла в красное), `validator_fired {id, severity}`, `scenario_run {id}`, `game_mine_marked {key, correct}`, `game_finished {score, attempt_no, seconds}`, `charter_change_blocked {reason: next_day|one_per_week}`, `charter_rule_without_number {key}`, `export_config`, `bridge_to_terminal`.

Метрики методолога: доля учеников, у которых после FT‑04 риск/сделку ≤ 2 % при первом самостоятельном выборе стейка; средний счёт «5 мин» на 1‑й и 2‑й попытке; число `charter_change_blocked` на ученика (ожидаемо > 0 — значит блокировка встретилась и усвоена).

## 10. Критерии приёмки E2

1. Юнит‑тесты формул §4 проходят на всех контрольных числах уроков (297/330 USDT, 15 USDT = 1,5 %, 4,5 %, −150/−15 %, +17,6 %, ±17,9 п.п., 26–39 сделок, −50 % трения).
2. Изменение любого поля обновляет правую панель ≤ 50 мс; подсвечиваются только изменившиеся карточки.
3. Все 5 профилей §7 загружаются из JSON без правок кода; добавление нового поля с известным `type` не требует изменения компонента.
4. Режим игры FT‑04: валидаторы с `hidden_in_game` не видны до проверки; после проверки показываются все; повторная игра генерирует другой набор мин; счёт и попытка пишутся в телеметрию.
5. `dry_run:false` показывает блокирующий баннер во всех профилях, где поле присутствует; экспорт такого конфига невозможен без явного подтверждения «Я понимаю, что это реальные деньги» (текст подтверждения набирается вручную, не чекбокс).
6. Профиль `charter_yaml`: вторая правка в течение одной учебной недели отклоняется; первая помечается датой вступления «завтра»; правило без числа получает бейдж «лозунг».
7. Профиль `api_key_rights`: включение `Withdraw` немедленно окрашивает карточку «Худшая потеря» в красный и показывает сумму субаккаунта; при `Withdraw=off` и `IP whitelist=on` карточка — «ничего: IP не совпадает», но с оговоркой «с правом Trade счёт можно разрушить сделками → нужны лимиты бота» (текст урока 4.3).
8. Клик по любому ключу открывает карточку Glossary; ключи одинаково названы в E1, E2 и «Терминах урока».
9. Текстовый вид JSON/YAML подсвечивает строки, изменённые с момента открытия инстанса; Diff‑панель показывает дельты метрик.
10. Мобильная раскладка: панели вертикально, сигналы тревоги закреплены сверху.

Тест‑кейсы: T1 — FT‑04, ползунок N 3→10 при unlimited → слот 99, риск/сделку 1 %, суммарный 10 % (error) и `max_open_trades_high`; T2 — «5 мин»: отметить 4 верных + 1 ложную → счёт 4/5, ложная объяснена; T3 — FT‑17: включить трейлинг и StoplossGuard → сценарий `three_contours` показывает падение прибыли и падение DD, Calmar растёт; T4 — 4.3: включить Withdraw → «вывести всё за минуты», выключить IP → предупреждение усилено; T5 — 5.6: изменить `risk_per_trade_pct` 1.0→1.5 → «вступит завтра»; попытка изменить `max_leverage` в тот же день → блок; тестовый ордер с плечом 3 при `max_leverage: 2` → «отклонён: пункт max_leverage».

---

## Приложение А. Порядок работ и зависимости

1. **Glossary + TouchToKnow + LangSwitch + Journal hook** (общие) — первыми; без них E1/E2 не принимаются.
2. E1 ядро (терминал, токенизатор, панель перевода, карточки диагноза) → контент: `ft02_install` + Диагност + Py‑сценарии → остальные сценарии.
3. E2 ядро (профиль → поля → derive → валидаторы → сценарии) → `ft_config_basic` с игрой → `ft_risk_contours`, `api_key_rights`, `charter_yaml`, `ft_correlation`.
4. Мост E2↔E1.
5. Линтер контента (пустые gutter‑подписи, термины без `ru_card`, метрики без `formula_ru`/`zones`, валидаторы без `why_card`) — включить в CI: контент с ошибками не деплоится.

## Приложение Б. Что агенту запрещено

- Придумывать числа, противоречащие урокам; при необходимости «реалистичного» примера — брать диапазоны из таблиц FT‑09/FT‑17 и помечать `verified: false`.
- Переводить в режиме «RU‑замена» идентификаторы, команды, флаги, пути, пары.
- Реализовывать автофикс конфига по клику вне режима «Разбор» игры (ученик должен исправить сам).
- Делать `/forceexit` или экспорт `dry_run:false` доступными одним кликом.
- Хранить контент сценариев/профилей в коде компонентов.

-------------------

# Спецификации для реализации: E5 «Журнал внутри приложения» и E6 «Охотник за утечкой»

Документ адресован агенту-разработчику. Формат каждой спеки: цель → педагогический контракт → модель данных → UI/UX → логика → интеграция с уроками и другими движками → контент → метрики → критерии приёмки → план сборки. Все примеры чисел и формулировок взяты из текстов уроков (ссылки на уроки указаны), выдумывать новые не нужно.

Общие требования к обоим движкам (обязательны):

1. Язык интерфейса — только русский. Любой английский токен в коде/конфиге (`shift(-1)`, `bfill`, `fit_transform`, `/forceexit`, `dry_run`) обязан быть кликабельным → всплывающая русская карточка (термин + одна фраза «что это значит» + ссылка на урок, где введён). Словарь общий для приложения, файл `glossary.json`, ключ = токен.
2. Local-first: все данные ученика хранятся локально (IndexedDB), синхронизация с сервером — опционально и вне scope этого ТЗ. Экспорт/импорт в JSON и Markdown обязательны.
3. Персонаж-сквозняк — Алексей (депозит 1000 $ / 100 000 ₽) используется во всех сценарных примерах и демо-записях.
4. Никакого «просто показать механику»: у каждого экрана есть целевое заблуждение, которое он ломает (указано ниже).
5. Мобильный вид обязателен (журнал заполняется вечером с телефона).

---

## E5 — «Журнал внутри приложения»

### 1. Цель и педагогический контракт

Что ломаем: «журнал — это блокнот, который заведу потом». Во всех психологических уроках курса журнал назван «главным тренажёром, который всегда с собой» (П8), «зеркалом, в котором видно не цену, а тебя» (П8), а решения об отключении бота принимаются «по данным журнала, а не по ощущениям» (5.4, 5.5). При этом сейчас ученику предлагается вести его где-то вовне. E5 делает журнал частью приложения, а тренажёры курса — источниками записей.

Три педагогических эффекта, которые обязан обеспечить движок:

- **Приучение**: минимальная запись занимает ≤ 60 секунд (три строки П8), напоминание приходит в назначенное окно (связка с E4).
- **Перенос**: одни и те же формы встречаются в разных треках — «два вопроса перед касанием» (П1) = протокол `/forceexit` (FT-19) = журнал вмешательств; ученик видит, что это одна и та же запись.
- **Обратная связь через паттерны**: раз в неделю движок сам показывает повторяющиеся сбои («четверг вечером», «после чтения новостей», категория искажения ×2 — П8, П44).

Чего движок НЕ делает: не оценивает ученика баллами за содержание записей, не даёт «советы по торговле», не автоматически классифицирует искажения до того, как ученик записал факт и мысль (П44: «сначала факт и мысль, затем классификация»).

### 2. Типы записей (единая сущность Entry с полем `kind`)

| `kind` | Название в UI | Урок-источник | Обязательные поля | Время заполнения |
|---|---|---|---|---|
| `intervention` | Запись о вмешательстве | П1, П2, FT-19, FT-20, 5.5 | дата/время; тип касания (выключил / закрыл руками / изменил параметр / /stopentry / /forceexit / просто смотрел ночью); **факт мира** (свободный текст, ≥ 10 символов) или чекбокс «факта нет — это голова»; «подождёт ли до утра?» (да/нет); действие; итог через 7 дней (заполняется позже, движок напоминает) | 60–90 с |
| `evening3` | Три строки вечером | П8, П19 | главное решение дня; почему — переключатель «правило / эмоция» + текст; чувство одним словом (поле с автодополнением из фиксированного списка + свободный ввод) | 30–60 с |
| `week_mark` | Двойная отметка недели | П8, П33 | результат: знак (+/−) и число %; процесс: «устав соблюдён» да/нет; список нарушений (чипы: размер, ночное касание, вход без сигнала, снял стоп, правка параметров, чужой сигнал, другое); комментарий | 2 мин, воскресенье |
| `bias` | Дневник искажений | П44, П53–П56, П2, П34 | ситуация; решение; **мысль в моменте (дословно)**; действие; результат; → только после сохранения первых пяти полей открывается выбор категории-чипа (список ниже); стоимость эпизода (₽ или R, опционально) | 2–3 мин |
| `experiment` | Журнал экспериментов | 1.5, 1.9, 2.6, 5.4, FT-13, FT-15, FT-16, FAI-07, ВК2 | стратегия/гипотеза (ссылка на карточку гипотезы); тип (бэктест / lookahead-analysis / recursive-analysis / hyperopt-окно / walk-forward / форензика сделки / dry-run неделя); период (timerange); ключевые метрики (число сделок, PF, MaxDD, Sortino — свободная таблица ключ-значение); вердикт (чипы: «зелёный», «параметр под угрозой подгонки», «утечка найдена», «гипотеза отвергнута», «в архив»); **счётчик открытий holdout** (см. §5.4) | 2–5 мин |
| `idea_parking` | Парковка идей | П3, П12, 5.6 | идея одной фразой; когда пришла (время автоматически; движок помечает «после 21:00» и «в полосе удач» — см. §5.5); статус (припаркована / рассмотрена на плановом разборе / отклонена / принята в план) | 20 с |
| `charter_change` | Изменение устава | 5.6, 5.5 | какой пункт; было → стало; причина; ожидаемый эффект; **дата вступления = завтра** (проставляется автоматически, редактированию не подлежит); проверка эффекта через N дней | 2 мин |
| `premortem` | Письмо из будущего | П7, П29 | дата «через год»; список причин-цепочек (каждая ≥ 2 звеньев, валидация: запрещены одиночные «рынок упал», «не повезло» — см. §5.6); к каждой причине — предохранитель (правило + число + где зашито: устав / код / API-лимит) | 20–40 мин, один раз |
| `ops_check` | Учения по выводу / осмотр | 5.7, П2 | тип (тестовый вывод по маршруту / воскресный осмотр пяти пунктов); для осмотра — пять чекбоксов из П2 с полем значения (журнал ошибок пуст? сделки по плану? результат в пределах болтанки? издержки не выросли? правила биржи не менялись?); для вывода — маршрут, сумма, время прохождения | 2–15 мин |

Все записи имеют общие служебные поля: `id`, `created_at`, `edited_at`, `kind`, `lesson_ref` (откуда создана), `source` (`manual` / `interactive:<id>` / `ritual:<id>`), `tags[]`, `mood_1_10` (опционально, П19: шкала возбуждения 1–10), `capital_context` (сумма, которой ученик сейчас торгует: demo / dry-run / микро-лайв / целевой), `locked` (запись нельзя редактировать после 24 ч — только добавить комментарий; предотвращает hindsight-правку, 5.5).

Категории искажений (чипы для `bias`, каждая с русским названием, английским термином в скобках и ссылкой на урок):

- Ошибка игрока — gambler's fallacy (П53)
- Эвристика доступности — availability (П54)
- Невозвратные затраты — sunk cost (П55)
- Искажение статус-кво — status quo (П55)
- Пренебрежение базовой ставкой — base rate neglect (П56)
- Эффект ИКЕА — IKEA effect (П56)
- Эффект недавности — recency (П34)
- Автоматизационная самоуспокоенность — automation bias (П2)
- Неприятие алгоритмов — algorithm aversion (П2)
- Перенос ответственности на бота (П2, П44)
- Якорение на цене входа — anchoring (П4, П44)
- Неприятие потерь / страусиный эффект (П10)
- Тильт — с подтипом из П15 (ненависть к проигрышу / перфекционизм / несправедливость / месть / избранность)
- Головокружение от успехов / эффект чужих денег (П3)
- Тяга к движению / чужие голы (П6)
- Иллюзия уверенности вместо ясности (П28)
- Другое (свободный текст, попадает в список «предложить категорию»)

### 3. Модель данных (схема хранения)

```json
{
  "schema_version": 1,
  "profile": {
    "capital_stage": "dry_run",
    "timezone": "Europe/Moscow",
    "checkin_windows": {"morning": "09:00", "evening": "20:00"},
    "whitelist_night": ["нет связи с биржей >15 мин", "сработал kill-switch", "бот отправил приказ, которого не мог"],
    "enough_bar": null,
    "created_at": "..."
  },
  "entries": [
    {
      "id": "uuid",
      "kind": "intervention",
      "created_at": "2026-03-04T02:41:00+03:00",
      "lesson_ref": "П1",
      "source": "interactive:ft19_telegram_pult",
      "payload": {
        "touch_type": "forceexit",
        "world_fact": "",
        "no_fact_head": true,
        "can_wait_till_morning": true,
        "action": "нажал /forceexit по чутью",
        "outcome_7d": null,
        "outcome_due": "2026-03-11"
      },
      "mood_1_10": 8,
      "capital_context": "dry_run",
      "locked": false
    }
  ],
  "weekly_digests": [ { "week_iso": "2026-W10", "generated_at": "...", "patterns": [ ... ], "process_score": 0.8, "acknowledged": false } ],
  "streaks": { "evening3": {"current": 6, "best": 14, "last_date": "2026-03-04"} },
  "holdout_counters": { "strategy_id": {"opened": 1, "opened_at": ["..."], "sealed": true} }
}
```

Требования к хранению: IndexedDB через тонкую обёртку; запись атомарна; при `locked=true` payload неизменяем, разрешён только `comments[]`. Экспорт: `journal_YYYY-MM-DD.json` и Markdown-пакет в формате, совместимом со структурой из FT-20 (`journal/interventions.md`, `journal/weekly.md`, `journal/go_live_checklist.md`). Импорт: JSON той же схемы с валидацией.

### 4. UI/UX

**4.1. Точка входа.** Плавающая кнопка «Журнал» видна на всех экранах курса, начиная с урока П1 (до него — скрыта, чтобы не размывать внимание в Фазе 0). Бейдж на кнопке: количество незакрытых обязательств (итог через 7 дней не заполнен; воскресная отметка не сделана; сводка не прочитана).

**4.2. Панель журнала** (боковая на десктопе, полноэкранная на мобильном). Вкладки:
- «Сегодня» — быстрые формы: «Три строки» (одна кнопка), «Вмешательство», «Искажение», «Припарковать идею».
- «Лента» — все записи, фильтры по `kind`, стратегии, периоду; поиск по тексту.
- «Неделя» — двойная отметка, Process Score, сводка паттернов (§5.3).
- «Эксперименты» — таблица по стратегиям (walk-forward-таблица из FT-16: окно, P_rsi, P_ema, IS-PF, OOS-PF, OOS-trades, вердикт); счётчик holdout.
- «Документы» — устав (ссылка на конструктор 5.6 / R7), письмо из будущего, чек-лист допуска 20/20 (FT-20) с колонкой дат закрытия.

**4.3. Форма «Вмешательство»** — самая важная, проектируется первой.

Экран 1: «Что именно ты сейчас собираешься сделать / сделал?» — крупные кнопки: выключить бота / закрыть позицию руками / изменить параметр / `/stopentry` / `/forceexit` / «просто открыл терминал ночью».
Экран 2: «Назови факт: что изменилось в мире?» — поле текста. Под полем подсказка из П1: «Факты: нет связи с биржей 15 минут; цены в боте не совпадают с биржей; я сам менял код. Не факты: минус на экране, страшно, чужой скриншот». Кнопка «Факта нет — это голова» (крупная, не стыдная по тону).
Экран 3: «Если принять это решение завтра утром выспавшимся, оно будет тем же?» — да/нет.
Экран 4: итог. Если «факта нет» ИЛИ «подождёт до утра» — движок показывает: «По протоколу П1 действие откладывается до планового разбора. Запись сохранена». Кнопка «Всё равно сделаю» существует (мы не запрещаем реальную жизнь), но помечает запись флагом `against_protocol=true`, который идёт в недельную сводку.
Через 7 дней — напоминание: «Чем закончилось касание от 4 марта?» с полем и выбором: «сэкономило / стоило денег / нейтрально» + сумма.

**4.4. Форма «Три строки»** — одна карточка, три поля, автофокус на первом, Enter переводит дальше. После сохранения — короткий экран «День закрыт» с текущим стриком. На 7-й записи подряд появляется первая «карта паттернов» (§5.3).

**4.5. Форма «Искажение»** — пять полей факта в строгом порядке, чипы категорий появляются только после кнопки «Сохранить факт». Над чипами подпись из П44: «Искажение — категория эпизода, а не диагноз личности».

**4.6. Форма «Эксперимент»** — компактная таблица метрик (ключ-значение с автодополнением: trades, PF, MaxDD, Sortino, CAGR, ExecDev), поле timerange с валидацией формата `YYYYMMDD-YYYYMMDD`, вердикт чипами. Специальная кнопка «Открыть holdout» с подтверждением (§5.4).

**4.7. Тон интерфейса.** Никаких «ты нарушил», «плохо». Формулировки — из уроков: «серия в пределах нормы», «это погода в голове», «правило одного изменения». Пустое состояние ленты показывает демо-записи Алексея (помечены «пример»), которые можно удалить одной кнопкой.

### 5. Логика

**5.1. Напоминания (через E4).** Утреннее окно: «Есть припаркованные идеи со вчерашнего вечера: 2» + «Незакрытых итогов вмешательств: 1». Вечернее окно: «Три строки». Воскресенье: «Двойная отметка недели + осмотр пяти пунктов». Первое число квартала: «Перечитать письмо из будущего» (П7). Ученик настраивает время окон один раз; движок не шлёт ничего вне окон (П5, П38: «окно проверки вместо подглядывания»).

**5.2. Стрики.** Считаются только для `evening3` и `week_mark`. Пропуск не обнуляет стрик, если ученик отметил «выходной от журнала» заранее (до 2 в неделю). Стрик — счётчик, не соревнование: ни рейтингов, ни сравнения с другими (П6, П43 — чужие результаты не входят в статистику).

**5.3. Недельная сводка паттернов.** Генерируется автоматически в воскресенье после `week_mark` (или в понедельник утром, если отметка пропущена). Правила детекции (детерминированные, без ML):

| Правило | Условие | Формулировка в сводке | Ссылка |
|---|---|---|---|
| Категория ×2 | одна и та же категория `bias` ≥ 2 раза за неделю | «Категория "…" встретилась дважды — по П44 это уже протокол, а не случайность. Предложить предохранитель?» → ссылка на конструктор R10 | П44 |
| Вмешательство без факта | ≥ 1 `intervention` с `no_fact_head=true` | «Касаний без факта мира: N. По журналу П1 девять из десяти таких стоят денег» | П1 |
| Ночные записи | ≥ 2 записи любого вида в 00:00–06:00 | «Записей после полуночи: N. Правило полуночи (П5): решения не принимаются» | П5 |
| Триггер времени | ≥ 3 `bias`/`intervention` в один день недели или час ±1 | «Твой триггер: четверг 21:00–23:00» | П8 |
| Триггер причины | ≥ 2 записи с "почему = эмоция" и совпадающим словом-чувством | «Слово недели: "страшно" ×3» | П8, П19 |
| Прибыльная неделя с нарушением | `week_mark.result>0` и `process=false` | Карточка красного цвета: «Неделя прибыльная, но с нарушением — по П8 это плохая неделя: повторить её нельзя, а нарушение растёт как трещина» | П8, П33 |
| Полоса удач | 3 недели подряд `result>0` | «Три зелёные недели. Включён мораторий на новые идеи (П3): парковка идей открыта, запуск — через плановый разбор. Проверь: не было ли увеличения размера?» | П3 |
| Идеи после 21:00 | ≥ 2 `idea_parking` с временем > 21:00 | «Вечерних идей: N. По П12 они рассматриваются утром — вот они» (список) | П12 |
| Правка устава чаще 1/нед | ≥ 2 `charter_change` за 7 дней | «Правило одного изменения нарушено: эффект первого ещё не измерен» | 5.6 |

Process Score (П33): доля записей `week_mark`/`intervention` без нарушений и `against_protocol` за скользящие 4 недели; отображается как «Индекс качества процесса: 87 %», ориентир «профи > 95 %» подписан со ссылкой. Отдельно «Коэффициент вмешательств»: число касаний / число сделок за неделю.

Сводка требует подтверждения прочтения (`acknowledged=true`) — до этого бейдж висит.

**5.4. Счётчик holdout (М42, 1.9, FAI-07).** Для каждой стратегии в «Экспериментах» есть переключатель «Запечатать финальный тест» (ученик указывает timerange holdout). После запечатывания любая запись `experiment` с пересекающимся timerange требует нажатия «Открыть holdout». Первое открытие — подтверждение с текстом 1.9: «Она нужна ровно для одного взгляда». Второе открытие — модалка: «Повторный взгляд превращает финальный тест в очередной train (М42). Записать как train?» — и стратегия получает бейдж «holdout сожжён», который снимается только созданием нового запечатанного периода. Счётчик виден в карточке стратегии и в чек-листе допуска FT-20 (пункт «OOS-проверка пройдена» не закрывается при `opened > 1`).

**5.5. Контекстные флаги.** При создании любой записи движок автоматически проставляет: `late_evening` (>21:00), `night` (00–06), `hot_streak` (3+ зелёные недели), `drawdown` (последняя `week_mark` ≤ −5 % или ученик отметил «в просадке»). Флаги используются сводкой и, через API, тренажёрами: например, тренажёр FT-20 «Восемь недель dry-run» окрашивает операционный блок красным, если есть `intervention` с `against_protocol` за симулируемую неделю.

**5.6. Валидация письма из будущего (П7).** Каждая причина проверяется: ≥ 2 звена (наличие «→» или разделителя «потом/затем/и»), запрещённые одиночные формулировки из списка («рынок упал», «не повезло», «биржа обманула», «новость вышла») — при вводе показывается подсказка: «Это погода, а не причина. Какое ТВОЁ действие пошло за этим?». Предохранитель обязан содержать число (регэксп на цифру) и место (устав/код/API) — иначе сохранение заблокировано с текстом: «Правило без числа и способа проверки — лозунг (П52)».

**5.7. Блокировка редактирования.** Через 24 часа payload замораживается. Причина показывается один раз: «Память задним числом рисует ясный сигнал, которого не было (5.5). Можно добавить комментарий».

### 6. API для других интерактивов и ритуалов

```
journal.create(kind, payload, {lesson_ref, source, flags})  → entry_id
journal.prompt(kind, prefill)          // открывает форму с предзаполнением, возвращает Promise<entry|null>
journal.gate.twoQuestions(context)     // R1: модалка «два вопроса»; резолвится {allowed:boolean, entry_id}
journal.query({kind, since, until, strategy_id, flags})
journal.holdout.open(strategy_id, timerange) → {count, sealed}
journal.digest.current() → weekly_digest
journal.events.on('digest_ready' | 'streak_changed' | 'against_protocol', handler)
```

Обязательные подключения (в порядке приоритета):
1. **П1 «Тревога в 03:00», FT-19 «Пульт оператора», FT-20 «Восемь недель», 5.5** — любая кнопка «вмешаться» проходит через `journal.gate.twoQuestions`. Пустой факт → кнопка не срабатывает в тренажёре (в реальной жизни — см. §4.3 «Всё равно сделаю»).
2. **П8 «Судья недель», П33 «Дашборд качества»** — читают `week_mark` и Process Score.
3. **П44 «Дневник искажений», П53–П56 «Лента против базы»** — создают `bias` с предвыбранной ситуацией из мини-игры; категорию ученик выбирает сам после факта.
4. **FT-13 «Конвейер анти-лжец», FT-15 «Форензика одной сделки», FT-16 «4096 монеток» / walk-forward** — создают `experiment` с заполненными метриками.
5. **FAI-07 «Ворота Capstone», М42, 1.9 «Линейка времени» (E7)** — используют `holdout.open`.
6. **П7 / П29 конструкторы** — пишут `premortem`.
7. **5.7 «Строитель крепости хранения»** — пишет `ops_check` (учения по выводу).
8. **E6 «Охотник за утечкой»** — при повторной ошибке одного типа утечки создаёт `experiment` с вердиктом «повторная ошибка: <тип>» (см. E6 §7).

### 7. Метрики движка (аналитика, локальная, показывается ученику в разделе «Мой прогресс»)

- Доля дней с `evening3` за 30 дней.
- Доля касаний с названным фактом (цель: растёт от урока к уроку; показать линию).
- Process Score, 4-недельный.
- Число открытий holdout по стратегиям.
- Средняя «стоимость касания» по заполненным `outcome_7d` (ученик видит собственную цифру из П1: «сколько стоило твоё чутьё»).

### 8. Критерии приёмки

1. Запись «Три строки» создаётся за ≤ 60 с на мобильном без прокрутки.
2. Форма вмешательства невозможна без ответа на два вопроса; запись с пустым фактом получает `no_fact_head=true`.
3. Выбор категории искажения недоступен до сохранения пяти полей факта.
4. Сводка генерируется детерминированно на тестовом наборе из 30 записей и воспроизводит все 9 правил из §5.3 (юнит-тесты на каждое правило).
5. Второе открытие holdout меняет статус стратегии на «сожжён» и блокирует пункт чек-листа FT-20.
6. Письмо из будущего не сохраняет причину «рынок упал» и предохранитель без числа.
7. Экспорт в Markdown воспроизводит структуру `journal/` из FT-20.
8. Все английские токены в формах имеют русскую карточку из `glossary.json`.
9. Данные переживают перезагрузку и очистку кэша страницы (IndexedDB, не sessionStorage).

### 9. План сборки (внутри волны W-A)

1. Ядро: схема, хранилище, лента, `evening3`, `intervention`, гейт двух вопросов, экспорт. Подключить П1, FT-19.
2. `week_mark`, Process Score, сводка паттернов (правила 1–6), напоминания через E4. Подключить П8, П33.
3. `bias` с чипами, `idea_parking`, флаги контекста, правила 7–9. Подключить П44, П53–П56, П3, П12.
4. `experiment`, holdout-счётчик, walk-forward-таблица. Подключить FT-13, FT-15, FT-16, FAI-07, М42.
5. `charter_change`, `premortem`, `ops_check`, документы, чек-лист 20/20, импорт. Подключить 5.6, 5.7, П7/П29, FT-20.

---

## E6 — «Охотник за утечкой»

### 1. Цель и педагогический контракт

Что ломаем: «код работает и рисует прекрасную кривую — значит, утечки нет» (1.7: «Look-ahead bias не выдаёт себя ошибкой»). Второе заблуждение: «утечка — это только `shift(-1)`»; на деле 1.7 даёт шесть источников, FT-13 — четырёх лжецов, FAI-02/03 добавляют утечки через признаки и скейлер, ВК3 — галлюцинации агента с центрированным окном, FT-05 — merge информативных пар без лага.

E6 обобщает diff-игру 1.7 в движок с банком кейсов, который пополняется по трекам. Формат работы ученика — всегда действие руками: пометить место утечки, вынести вердикт «чисто/утечка», выбрать починку, назвать тип. Правильный ответ всегда сопровождается «ценой утечки»: как изменяется метрика после исправления (1.7: Sharpe 9.8 → −0.42; 1.8/FT-13: +100 % → +25 %).

Ключевой методический принцип: **в банке есть чистые кейсы**. Ученик, кликающий на всё подряд, штрафуется — иначе тренажёр учит паранойе, а не диагностике.

### 2. Таксономия утечек и «не-утечек»

Каждый кейс несёт `leak_type`. Типы (русское имя — код — урок-источник):

| Код | Тип | Что видит ученик | Урок |
|---|---|---|---|
| `L01` | Исполнение по цене того же бара | сигнал по `close[t]`, сделка по `close[t]` | 1.7, ВК2, FT-05 |
| `L02` | Отрицательный сдвиг | `shift(-1)`, `shift(-N)`, `iloc[i+1]` | 1.7, FT-07, FT-11 |
| `L03` | Заполнение из будущего | `bfill()`, `fillna(method='bfill')`, `interpolate` без `limit_direction='forward'` | 1.7, FT-11, FAI-02 |
| `L04` | Центрированное окно | `rolling(..., center=True)`, симметричные фильтры | 1.7, FT-11, ВК3 |
| `L05` | Нормализация по всей выборке | `(X - X.mean())/X.std()` до сплита, `scaler.fit(X_all)`, `fit_transform(all_data)` | 1.7, FAI-03, М42 |
| `L06` | Отбор по всей истории | выбор признаков / порогов / монет по результату на всём периоде | 1.7, FAI-04, М36 |
| `L07` | Ошибка выжившего в списке инструментов | whitelist «топ по объёму сегодня»; тест на монетах, доживших до сегодня | 2.6, FT-04, FT-13, ВК3 |
| `L08` | Метка времени в начале интервала | `resample('1D').mean()` с `label='left'`; дневные значения приписаны утренним барам | 1.7, ВК3 |
| `L09` | Merge информативных данных без лага | часовые свечи вторника получают дневную свечу вторника | FT-05 |
| `L10` | Целевая переменная в признаках | `&s-`-колонка использована как `%-`; признак = будущая доходность | FAI-02 |
| `L11` | Перемешанная валидация | `shuffle=True`, `KFold` без учёта времени, случайные фолды | FAI-03, М42 |
| `L12` | Многократное касание теста | подбор гиперпараметров по одному проверочному периоду; «посмотрю ещё разок» | 1.9, М42, FAI-04, FAI-07 |
| `L13` | Задержка получения данных не учтена | новость/ончейн по времени публикации в архиве, а не времени прихода | 1.7, 2.2, 2.3 |
| `L14` | Удаление кризисных наблюдений «для метрик» | выкинуты все бары > 3σ, включая реальные обвалы | FAI-06, М27 |
| `L15` | Цикл с доступом к соседней строке | `for i…: if df.close[i+1] > …` | FT-07 |
| `N01` | НЕ утечка: честный `shift(1)` | `pos = signal.shift(1)` | 1.6 |
| `N02` | НЕ утечка: rolling-окно только по прошлому | `rolling(200).mean()` без `center` | 1.7 |
| `N03` | НЕ утечка: скейлер на train | `scaler.fit(X_train)` | FAI-03 |
| `N04` | НЕ утечка, но артефакт прогрева | `startup_candle_count` меньше окна индикатора — «не будущее, а недогретый индикатор» | FT-12 |
| `N05` | НЕ утечка, но другой лжец | `fee=0`, нет проскальзывания — «ложь, но не про время» | FT-13, ВК2 |
| `N06` | НЕ утечка: цель законно смотрит в будущее | `&s-`-колонка с `shift(-1)` объявлена как target и не участвует в признаках | FAI-02 |

Типы `N04`, `N05` — критически важные дистракторы: ученик должен уметь сказать «это плохо, но это не look-ahead» (FT-12: «отличать ошибку будущего от недостатка истории»; FT-13: «четыре лжеца» — утечка лишь один из них).

### 3. Форматы кейсов

| `format` | Что предъявляется | Как отмечает ученик |
|---|---|---|
| `code` | фрагмент Python (5–25 строк), подсветка, нумерация | клик по строке (мультивыбор) |
| `diff` | две версии кода рядом (наследие игры 1.7), различие в 1–3 строках | клик по строке в правой версии + вердикт «какая честная» |
| `table` | таблица данных (свечи + признаки + сигнал) 8–15 строк | клик по ячейке/колонке |
| `pipeline` | схема конвейера из блоков (данные → признаки → сплит → скейлер → модель → тест) | клик по блоку / по стрелке |
| `config` | JSON/YAML фрагмент (whitelist, timerange, freqai-параметры) | клик по ключу |
| `timeline` | ось времени с окнами train/valid/test и событиями «открыл тест» | клик по событию (связка с E7 «Линейка времени») |
| `prose` | описание процедуры словами («мы отобрали 10 монет с лучшей доходностью за 2021–2024 и протестировали на них стратегию») | выбор фразы (подсвечиваемые фрагменты) |
| `agent` | ответ ИИ-агента (ВК3) с кодом и утверждениями | клик по строке/утверждению + привязка к ground truth |

### 4. Режимы прохождения (внутри одного кейса — последовательно)

1. **«Чисто или утечка?»** — вердикт за ≤ 30 с без подсказок. Фиксируется отдельно (метрика «ложные тревоги» и «пропуски»).
2. **«Где?»** — если ученик сказал «утечка», отметить место(а). Для чистых кейсов этот шаг пропускается, и ученик должен обосновать чистоту выбором утверждения («сдвиг положительный», «скейлер обучен на train»…).
3. **«Какого типа?»** — выбор `leak_type` из 4 предложенных (1 верный + 3 дистрактора того же трека).
4. **«Почини»** — выбор одного из 3 вариантов исправления (в `code`-кейсах вариант вставляется в код с подсветкой) ИЛИ сборка из чипов (для простых случаев: `shift(`, `1`, `-1`, `)`, `center=`, `True`, `False`). Обязательно один из дистракторов — «починка-ловушка» из 1.7: `pnl = signal * df['open'].pct_change().shift(-1)` (остаточная утечка на один бар).
5. **«Цена утечки»** — экран с двумя числами: метрика до/после починки (из данных кейса) и одной фразой из урока.

Лестница подсказок (по кнопке, снижает балл кейса на 1/3 за каждую):
- Подсказка 1: тип трека («утечка в препроцессинге» / «в исполнении» / «в валидации»).
- Подсказка 2: правило point-in-time для этого места («в момент t доступны только данные с меткой ≤ t»).
- Подсказка 3: подсветка области из 3 строк.

### 5. Модель кейса

```json
{
  "id": "L02-ft07-loop",
  "track": "FT",
  "lesson_ref": "FT-07",
  "difficulty": 2,
  "format": "code",
  "leak_types": ["L15"],
  "title": "Конвейер против рабочего",
  "misconception": "Цикл понятнее и честнее векторного расчёта",
  "content": {
    "lines": [
      "df['ema_fast'] = df['close'].ewm(span=12).mean()",
      "df['ema_slow'] = df['close'].ewm(span=26).mean()",
      "for i in range(len(df)-1):",
      "    if df.close[i+1] > df.close[i]:",
      "        df.enter_long[i] = 1"
    ],
    "tokens_glossary": ["ewm", "span", "enter_long", "range", "len"]
  },
  "answer": {
    "hotspots": [4],
    "verdict": "leak",
    "type_options": ["L15", "L01", "N02", "N04"],
    "fix_options": [
      {"text": "df['enter_long'] = ((df['ema_fast'] > df['ema_slow']) & (df['volume'] > 0)).astype(int)", "correct": true, "why": "Векторно, правая часть использует только прошлое"},
      {"text": "if df.close[i] > df.close[i-1]: df.enter_long[i] = 1", "correct": false, "why": "Утечка исчезла, но цикл остался: медленно и хрупко; кроме того условие сменило смысл"},
      {"text": "if df.close[i+1] > df.close[i]: df.enter_long[i+1] = 1", "correct": false, "why": "Сигнал на баре i+1 всё ещё вычислен из close[i+1], а исполнение — по тому же бару (L01)"}
    ]
  },
  "cost": {
    "metric": "Sharpe",
    "before": 9.8,
    "after": -0.42,
    "note": "Из урока 1.7: одна строка отделяет «грааль» от убыточной стратегии"
  },
  "hints": ["утечка в сигнале, не в данных", "бар i может знать только про бары ≤ i", "строки 4–5"],
  "explanation": "На баре i стратегия сравнивает close[i+1] — цену, которая в момент решения ещё не существует. В живой торговле этот код упадёт или даст NaN, в бэктесте — фантомную прибыль (FT-07, 1.7).",
  "related_cases": ["L02-1_7-shift", "L01-vk2-same-bar"],
  "unlock_after": ["1.7"]
}
```

### 6. Банк кейсов (стартовый минимум — 34 кейса; каждый с полями выше)

Числа «цена утечки» брать из уроков там, где они есть; где нет — генерировать симуляцией на синтетическом шуме (см. §8.2) и помечать «оценка на синтетических данных».

**Фаза 1 (урок 1.7, М42) — 8 кейсов**
1. `L01-1_7-np-where`: `pnl = np.where(df['close'] > df['sma'], df['close'].pct_change(), 0)` — сигнал и исполнение по одному бару. Fix: сигнал по close t, вход по open t+1, `exec_ret = df['open'].shift(-1).pct_change().shift(-1)`. Ловушка среди fix-вариантов — `df['open'].pct_change().shift(-1)` (остаточная утечка из урока).
2. `L02-1_7-high-shift`: `df["high"].shift(-1) > df["close"]` — Sharpe 9.8 → −0.42 (число из урока).
3. `L05-1_7-zscore`: `X = (X - X.mean()) / X.std()` до сплита. Fix: `mu, sd = X_train.mean(), X_train.std()`.
4. `L08-1_7-resample`: `df.resample("1D").mean()` c `label="left"`. Fix: `label="right", closed="right"` + shift.
5. `N01-1_6-honest`: минимальный честный векторный бэктест из 1.6 (`pos = signal.shift(1)`, `cost_bps = 7.5`) — чистый кейс. Вердикт «чисто», обоснование — «сдвиг на один бар, издержки учтены».
6. `diff-1_7-classic`: наследие diff-игры: две версии кода, различие — `shift(1)` vs `shift(-1)`; вторая пара — `center=True`.
7. `L06-1_7-feature-select`: prose: «выбрали 5 индикаторов с лучшей корреляцией с будущей доходностью на всём периоде 2020–2025, затем сплит».
8. `L12-M42-timeline`: timeline: три события «открыл final test» на одной стратегии; ученик кликает лишние касания. Связка с E7.

**Фаза 2 (2.2, 2.3, 2.6) — 4 кейса**
9. `L13-2_2-news-time`: table: новость с меткой `published_at`, парсер получил через 400 мс, а бэктест входит по свече, закрывшейся до `received_at`. Ученик отмечает колонку времени.
10. `L13-2_3-onchain-block`: prose: ончейн-сигнал используется по времени транзакции, а не подтверждения блока (10 мин BTC).
11. `L07-2_6-survivor-list`: config: `pair_whitelist` из топ-10 сегодняшних монет для теста 2021 года. Fix: список на историческую дату.
12. `L14-2_6-outlier-10sigma`: code: `df = df[abs(ret) < 10*sigma]` до бэктеста без проверки природы выброса. Дистрактор-ответ «это не утечка, это очистка» неверен по FAI-06/М27: удалён риск, а не ошибка данных. (Пометить как «пограничный», difficulty 3.)

**Вайбкодинг (ВК2, ВК3) — 5 кейсов**
13. `L01-vk2-same-bar`: сгенерированный агентом бэктест EMA9/21: сигнал на свече N по close[N], сделка по close[N]. Fix: вход на open[N+1].
14. `N05-vk2-zero-fee`: тот же бэктест, но без `fee` — верный ответ: «лжёт, но не про время: это издержки, не утечка» (тип N05).
15. `agent-vk3-five`: ответ агента с пятью галлюцинациями из ВК3 — из них к E6 относятся две: центрированное окно (L04) и «топ-10 сегодняшних монет» (L07); остальные три (выдуманный метод API, комиссия 0,01 %, статистика без источника) ученик должен пометить «не утечка, другой дефект». Проверяется умение разделять классы ошибок.
16. `L02-vk4-smoke`: просветный тест из ВК4: 30 искусственных свечей, известное число сделок = 2; код даёт 4 — таблица показывает лишние входы на барах, где сигнал использовал `shift(-1)`.
17. `L04-vk3-center`: `df['ma'] = df['close'].rolling(20, center=True).mean()` — агент «сгладил лаг». Fix: `center=False`.

**Freqtrade (FT-04, FT-05, FT-07, FT-11, FT-12, FT-13) — 9 кейсов**
18. `L15-ft07-loop` (описан в §5).
19. `L09-ft05-informative-merge`: table: часовые бары вторника с колонкой `btc_1d_close` = закрытие дневной свечи вторника (которая закроется в среду). Ученик отмечает колонку. Fix: `merge_informative_pair` с корректным сдвигом; после починки — «прогони lookahead-analysis (FT-11)».
20. `L02-ft11-three-strategies`: три карточки А/Б/В из FT-11: А честная, Б `close.shift(-1)`, В `bfill`. Режим: сначала результаты lookahead-analysis с окнами 1/2/3 (у А ряды совпадают, у Б и В расходятся) → вердикты → затем открыть код Б и В и кликнуть строку-виновника. Дополнительная подпись из урока: «lookahead-analysis ловит утечку сигнала, но не survivorship и не нормализацию».
21. `N04-ft12-warmup`: code: `startup_candle_count = 5` при EMA200. Верный ответ: «не утечка, недогретый индикатор — recursive-analysis, а не lookahead» (тип N04).
22. `L07-ft04-volume-pairlist`: config: `VolumePairList` с `number_assets: 30` для бэктеста 2023 года. Fix: `StaticPairList`, зафиксированный на дату (FT-04).
23. `L05-ft13-rolling-vs-global`: code: `df['z'] = (df['close'] - df['close'].mean()) / df['close'].std()` внутри `populate_indicators`. Fix: `rolling(100)`.
24. `L03-ft11-bfill`: `df['funding'] = df['funding'].bfill()` — пропуски фандинга заполнены следующим значением.
25. `L02-ft05-exit`: `df.loc[(df['close'].shift(-1) < df['ema_slow']), 'exit_long'] = 1` — выход «зная следующую свечу».
26. `pipeline-ft13-four-liars`: схема конвейера FT-13 с четырьмя «лжецами»: look-ahead в мерже, fee=0, неисполнимое исполнение (ордер 50k на тонкой паре), whitelist из выживших. Ученик размечает каждый блок одним из четырёх классов; только один класс — утечка времени. Проверка: не называть всё «утечкой».

**FreqAI (FAI-02, FAI-03, FAI-04, FAI-06, FAI-07) — 6 кейсов**
27. `L10-fai02-target-as-feature`: `df['%-next_ret'] = df['close'].shift(-1)/df['close'] - 1` — будущая доходность объявлена признаком (`%-`). Рядом `N06`: та же колонка с префиксом `&s-` — чисто.
28. `L03-fai02-feature-bfill`: `df['%-vol'] = df['%-vol'].bfill()`.
29. `L05-fai03-scaler-all`: две версии из урока: `StandardScaler().fit(X_all)` vs `.fit(X_train)` — diff-формат; после ответа кнопка «показать, какие статистики теста попали в скейлер» (среднее/дисперсия теста подсвечены).
30. `L11-fai03-shuffle`: pipeline/timeline: `KFold(shuffle=True)` раскрашивает будущее в обучение. Fix: walk-forward окна `train_period_days` / `backtest_period_days`.
31. `L12-fai04-model-select-by-test`: prose: «попробовали 12 моделей и оставили ту, что лучше на тестовом периоде 2025H1». Тип L12 + пояснение из FAI-03: «проверочная выборка перестаёт быть честной».
32. `L14-fai06-remove-crash`: config `outlier_policy: remove > 3σ` + таблица, где удалёнными оказались 12.03.2020 и 09.11.2022. Верный ответ: удалён рынок, а не ошибка данных.

**Матфак (М36, М42) — 2 кейса**
33. `L06-M36-1000-strategies`: prose + table: 1000 комбинаций на шуме, 50 «граалей» при α = 0,05; ученик должен отметить не «утечку в коде», а процедуру отбора (L06) и назвать защиту (Бонферрони / holdout).
34. `N02-M42-time-split`: код канонического временного деления `train = df[:0.7n]`, `valid`, `test`, скейлер на train — чистый кейс, обоснование чистоты.

Правило пополнения банка: каждый новый трек добавляет ≥ 3 кейса и ≥ 1 чистый; соотношение «утечка : чисто/не-утечка» в любой выдаче — не хуже 3:1.

### 7. Логика выдачи, оценивания и повторения

**7.1. Разблокировка.** Кейс доступен, когда пройден урок из `unlock_after`. Внутри урока интерактив открывает подборку кейсов этого урока (2–4) + один «эхо-кейс» из предыдущего трека того же типа (перенос).

**7.2. Оценка кейса.** Баллы 0–100: вердикт 20, место 30, тип 20, починка 30. Подсказки снижают соответствующий компонент на треть. Ложная тревога на чистом кейсе — 0 за вердикт и отдельная метка `false_alarm`.

**7.3. Адаптивность.** Движок ведёт матрицу «тип утечки × число ошибок». Если по типу ≥ 2 ошибки за 7 дней — тип помечается «слабое место», и в следующие подборки добавляется кейс этого типа из другого трека (например, ошибся на `L05` в 1.7 → получишь `L05-fai03-scaler-all`). Интервальное повторение: кейс с ошибкой возвращается через 3 дня, затем через 10 — до двух подряд правильных прохождений.

**7.4. Связь с E5.** При второй ошибке одного типа создаётся запись `experiment` с вердиктом «повторная ошибка: <тип> — добавить в чек-лист ревью». Ученик видит её в «Экспериментах» и может превратить в пункт личного чек-листа ревью (ВК2). При прохождении «Конвейера анти-лжец» FT-13 движок подставляет типы, где ученик ошибался, как «твои личные пункты проверки».

**7.5. Экран «Цена утечки».** Всегда два числа + одна строка. Для кейсов без чисел из урока — синтетическая оценка: движок генерирует 5000 баров случайного блуждания, применяет утечку и честную версию, считает Sharpe/PF; подпись: «на чистом шуме утечка даёт Sharpe X — это статистика, а не эдж» (мост к 1.10 и FT-16).

**7.6. Итоговый «Сертификат охотника» (по треку)** — не награда, а карта: таблица типов утечек с колонками «встретил / нашёл сам / нашёл с подсказкой / пропустил». Экспортируется в E5 «Документы» как приложение к чек-листу допуска FT-20 (пункт «lookahead-analysis зелёный» дополняется «личная карта утечек: пропусков 0»).

### 8. UI/UX

**8.1. Экран кейса.** Слева — фрагмент (код с нумерацией строк / таблица / схема), справа — панель шагов (вердикт → место → тип → починка → цена). Текущий шаг подсвечен. Таймер видим только на шаге вердикта (30 с, мягкий — по истечении не блокирует, а помечает «долго думал»). Кнопка «Ткни в непонятное» переключает режим: клики по токенам открывают карточки словаря вместо выбора строки; в этом режиме ответ не засчитывается (защита от случайных кликов).

**8.2. Подсветка ответа.** Верные строки — зелёная рамка + пояснение под строкой; ошибочный клик — оранжевая рамка + одна фраза, почему это не утечка (или почему это утечка другого класса). Для `N04/N05` показывается отдельный ярлык «Другой лжец: издержки / прогрев».

**8.3. Режим «Почини» в коде.** Выбранный вариант вставляется на место строки с анимацией; рядом мгновенно пересчитывается мини-график «фантомная кривая → честная кривая» (E3 «Плёнка бэктеста» может переиспользовать этот компонент).

**8.4. Двуязычие.** Код не переводится (идентификаторы остаются), но у каждой строки — русская подпись справа (режим «рус. подписи», по умолчанию включён до Фазы 4). Комментарии в коде кейсов — только на русском.

**8.5. Доступность.** Все клики дублируются клавиатурой (стрелки по строкам, Enter — выбрать). Цвет — не единственный носитель информации (иконки ✓ / ! / ≠).

### 9. Интеграция по урокам

| Урок | Что заменяется/дополняется | Кейсы |
|---|---|---|
| 1.7 | «Найди утечку: diff-игра» становится режимом `diff` внутри E6; добавляются кейсы 1–7 | 1–7 |
| М42 | timeline-кейс + чистый кейс временного сплита | 8, 34 |
| М36 | кейс отбора из 1000 | 33 |
| 2.2 / 2.3 / 2.6 | латентность новостей, ончейн, список выживших, выбросы | 9–12 |
| ВК2 | «3 дефекта» расширяется до 7-пунктного чек-листа: типы E6 маппятся на пункты 1 (look-ahead), 2 (издержки — N05), 5 (единицы) | 13–14 |
| ВК3 | «Мост, которого нет» — формат `agent` | 15, 17 |
| ВК4 | просветный тест как table-кейс | 16 |
| FT-05 | merge информативных пар | 19, 25 |
| FT-07 | цикл vs конвейер | 18 |
| FT-11 | три стратегии + lookahead-analysis | 20, 24 |
| FT-12 | N04 «не утечка — прогрев» | 21 |
| FT-04 / FT-13 | whitelist, четыре лжеца, глобальная нормализация | 22, 23, 26 |
| FAI-02 / 03 / 04 / 06 / 07 | признаки-цели, скейлер, shuffle, выбор модели по тесту, удаление кризиса | 27–32 |

Мини-спека для FT-11 (из предыдущей сессии) реализуется целиком внутри E6 как кейс 20 с двухэтапным режимом.

### 10. Метрики движка

- Доля правильных вердиктов на первом шаге, отдельно для чистых кейсов (ложные тревоги) и утечных (пропуски). Цель: обе ошибки падают от трека к треку.
- Повторные ошибки одного типа при возврате через 3 дня — целевой показатель из ТЗ-3: −50 % ко второй попытке.
- Число подсказок на кейс.
- «Карта утечек» ученика к FT-20: доля типов с пометкой «нашёл сам».

### 11. Критерии приёмки

1. Реализованы все 8 форматов; каждый формат покрыт минимум одним кейсом из банка.
2. Загружены 34 кейса банка с валидацией схемы (JSON Schema, все обязательные поля, `hotspots` внутри диапазона строк, у каждого кейса ≥ 1 чистый дистрактор в `type_options`).
3. На чистом кейсе клик «утечка» даёт 0 за вердикт и объяснение «почему чисто».
4. Кейс `L01-1_7-np-where` содержит fix-ловушку с остаточной утечкой, и её выбор объясняется текстом урока 1.7.
5. Кейс 26 не позволяет пройти, пометив все четыре блока как «утечка».
6. Экран «Цена утечки» показывает числа из урока там, где они заданы (1.7: 9.8 → −0.42), и подпись «синтетика» — где сгенерированы.
7. Адаптивная выдача: после двух ошибок типа `L05` в Фазе 1 следующая подборка содержит `L05`-кейс из FAI.
8. Запись в E5 создаётся при второй ошибке одного типа (интеграционный тест с E5).
9. Все токены в коде кейсов имеют карточки в `glossary.json`; отсутствие карточки — ошибка сборки.
10. Полное прохождение кейса с клавиатуры без мыши.

### 12. План сборки (E6 в волне W-D, но ядро — раньше, т.к. используется в 1.7 уже в W-E)

1. Ядро: схема кейса, форматы `code` и `diff`, пять шагов, лестница подсказок, оценка, словарь. Перенос diff-игры 1.7 (кейсы 1–7).
2. Форматы `table`, `config`, `prose`, синтетический расчёт «цены утечки». Кейсы 9–14, 22–25, 27–28.
3. Форматы `pipeline`, `timeline` (общий компонент с E7), `agent`. Кейсы 8, 15–17, 20–21, 26, 29–34.
4. Адаптивность, интервальное повторение, интеграция с E5, «Сертификат охотника» и его экспорт в чек-лист FT-20.

---

## Точки пересечения E5 и E6 (для согласованной сборки)

- Общий словарь `glossary.json` и общий компонент «карточка термина».
- Общий компонент «таблица экспериментов» (E5 «Эксперименты» ↔ E6 запись о повторной ошибке).
- Общий компонент «линейка времени» с E7: E5 использует его для визуализации запечатанного holdout, E6 — для формата `timeline`.
- Оба движка пишут события в единую локальную шину (`digest_ready`, `case_failed_twice`, `holdout_burned`), на которую подписываются E4 (напоминания) и тренажёры FT-13/FT-20.

---------------------

# Спецификации движков E7 «Линейка времени» и E8 «Двуязычный отчёт»

Документ для агента-реализатора. Оба движка — **сквозные**: строятся один раз как самостоятельные компоненты и встраиваются в уроки через пресеты. Всё, что специфично для урока, живёт в пресете (JSON), а не в коде компонента.

Общие требования к обоим движкам (обязательные):

1. **Язык.** Весь UI на русском. Любой английский токен (`train`, `Sharpe`, `unfilledtimeout`, `holdout`) отображается в режиме «Ткни в непонятное»: клик → карточка с русским именем, определением из «Терминов урока» и ссылкой на урок, где термин введён. Словарь общий для приложения (`glossary.json`), движок только ссылается на ключи.
2. **Детерминизм.** Все «симулированные» числа считаются из seed, который хранится в состоянии. Повторное открытие интерактива с тем же seed даёт те же числа. Кнопка «Другой пример» меняет seed.
3. **Числа из уроков.** Пресеты обязаны воспроизводить примеры из текстов (указаны ниже), а не выдумывать свои.
4. **Обратная связь = ошибка + объяснение + ссылка.** Каждая красная подсветка сопровождается текстом «что не так — почему — где прочитать».
5. **Персонаж.** Там, где есть деньги, депозит Алексея: 1000 $ / 100 000 ₽.
6. **События аналитики.** Каждый движок эмитит именованные события (перечислены в спеке) для метрик из раздела 7 ТЗ.
7. **Состояние.** Сохраняется в localStorage по ключу `engine:<id>:<lessonId>` и восстанавливается; счётчики «касаний теста» не сбрасываются кнопкой «Сброс» (сбрасываются только через «Начать заново» с подтверждением).

---

## E7 · «Линейка времени»

### 1. Назначение и заблуждения

Один интерактив — визуальная шкала времени, на которой ученик руками режет историю на обучение / проверку / финальный тест, строит скользящие окна walk-forward и окна переобучения FreqAI. Движок ломает пять заблуждений (по одному на режим):

| Код | Заблуждение | Урок-хозяин | Что показывает движок |
|---|---|---|---|
| Z1 | «Проверил на тех же данных — значит проверил» | 1.9, М42 | Пересечение сегментов и порядок «тест раньше обучения» подсвечиваются красным, метрики становятся недостоверными |
| Z2 | «Посмотрю финальный тест ещё разок» | 1.9, М42, FAI-07 | Счётчик касаний; после первого взгляда сегмент перекрашивается в цвет train с подписью «это уже train» |
| Z3 | «Кросс-валидация как в учебнике (shuffle) подходит» | М42, FAI-03 | Тумблер shuffle рассыпает окна в мозаику, будущее оказывается внутри обучения |
| Z4 | «Одна оптимизация на всём периоде — достаточно» | 1.9, FT-16 | Walk-forward даёт 3–10 независимых OOS-оценок; разброс параметров между окнами — диагноз |
| Z5 | «Переобучилась вчера — значит работает» | FAI-05 | Ползунок длины окна переобучения на ряду со сменой режима: «дорога исчезла — частота не спасает» |

### 2. Режимы

Компонент `<TimelineEngine mode=... preset=.../>`. Четыре режима, переключаются табами в шапке (в пресете можно скрыть лишние).

- **`split`** — простое трёхчастное разбиение Train / Validation / Final Test.
- **`walkforward`** — скользящие или расширяющиеся окна оптимизация→проверка.
- **`retrain`** — окна переобучения FreqAI (`train_period_days` / `backtest_period_days`) на ряду со сменой режима.
- **`traps`** — панель ловушек (shuffle, масштабирование по всей истории, отсутствие зазора), включаемая поверх `split` и `walkforward`.

### 3. Модель данных

```ts
type ISODate = string; // 'YYYY-MM-DD'

interface TimelineState {
  seed: number;
  range: { from: ISODate; to: ISODate };       // вся история
  timeframe: '1m'|'5m'|'15m'|'1h'|'4h'|'1d';    // для счётчиков свечей
  tradesPerYear: number;                        // из пресета, для счётчика сделок
  mode: 'split'|'walkforward'|'retrain';
  split: { trainEnd: ISODate; validEnd: ISODate };          // границы, drag
  wf: { trainMonths: number; testMonths: number; stepMonths: number;
        anchored: boolean; purgeDays: number };
  retrain: { trainPeriodDays: number; backtestPeriodDays: number };
  traps: { shuffle: boolean; scalerOnAll: boolean; featureSelectOnAll: boolean };
  finalTest: { opens: number; openedAt: string[]; paramEditsAfterOpen: number; locked: boolean };
  params: { rsiBuy: number; emaPeriod: number };            // «параметры стратегии», крутятся в split
}
```

Пресет:

```ts
interface TimelinePreset {
  lessonId: string;               // '1.9' | 'M42' | 'FT-16' | 'FAI-03' | 'FAI-05' | 'FAI-07'
  modes: TimelineState['mode'][];
  trapsEnabled: boolean;
  initial: Partial<TimelineState>;
  regimeShift?: { at: ISODate; label: string }; // для retrain (FAI-05)
  goals: Goal[];                  // критерии освоения (см. §9)
  glossaryKeys: string[];         // токены для «Ткни в непонятное»
}
```

### 4. Экран (layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Разбиение] [Walk-forward] [Переобучение]        Касаний теста: 0  🔒│
├─────────────────────────────────────────────────────────────────────┤
│  ШКАЛА ВРЕМЕНИ (drag-границы)                                        │
│  2021 ─────── 2022 ─────── 2023 ─────── 2024 ─────── 2025            │
│  [■■■ обучение ■■■|■ проверка ■|▒ финальный тест ▒]                  │
│  ↑ подписи под сегментами: доля %, свечей, ожидаемых сделок          │
├───────────────────────────┬─────────────────────────────────────────┤
│  ПАНЕЛЬ ЛОВУШЕК (traps)   │  ПРАВАЯ ПАНЕЛЬ: живой пересчёт           │
│  ☐ Перемешать (shuffle)   │  Доли: 50% / 25% / 25%                   │
│  ☐ Масштабировать по всей │  Сделок: 240 / 120 / 120                 │
│    истории                │  Ширина ДИ винрейта: ±5% / ±7% / ±7%     │
│  Зазор (purge): [0] дней  │  Статус: ✅ честно / ⛔ утечка (причина)  │
│                           │  Метрики: IS / Valid / Test (см. §6)     │
├───────────────────────────┴─────────────────────────────────────────┤
│  ЛЕНТА ОБРАТНОЙ СВЯЗИ: одна карточка на каждое нарушение             │
└─────────────────────────────────────────────────────────────────────┘
```

Требования к шкале:

- Минимальная ширина сегмента при drag — 1 месяц; границы привязаны к первому числу месяца (snap), в режиме `retrain` — к дням.
- Цвета фиксированы и одинаковы во всех уроках: обучение — синий, проверка — жёлтый, финальный тест — серый со штриховкой (пока не открыт), красный контур — нарушение. Никаких цветовых кодировок, требующих легенды сверх подписи на самом сегменте.
- Под сегментом всегда три числа: доля %, свечей (из `timeframe`), ожидаемых сделок = `tradesPerYear × длина в годах`. При сделках < 30 подпись сегмента красная с иконкой «мало данных» (порог из FT-09/1.10).
- Свечей в год по таймфрейму: 5m ≈ 105 000, 15m ≈ 35 000, 1h ≈ 8 760, 4h ≈ 2 190, 1d ≈ 365 (таблица FT-08).

### 5. Правила валидации (подсветка красным)

Проверяются на каждое изменение состояния. Каждое правило имеет код, условие, текст карточки, ссылку на урок.

| Код | Условие | Текст карточки (рус.) | Ссылка |
|---|---|---|---|
| V1 | Любые два сегмента пересекаются (в `walkforward` — окно оптимизации пересекается со своим OOS или OOS-окна пересекаются между собой) | «Сегменты пересекаются: модель увидит часть проверочных данных при подборе. Результат проверки завышен и ничего не доказывает» | 1.9, М42 |
| V2 | Проверка или финальный тест раньше обучения по времени | «Тест лежит в прошлом относительно обучения: в реальности у трейдера в момент обучения этих данных ещё не было. Тест всегда "в будущем"» | М42 |
| V3 | `traps.shuffle = true` | «Перемешивание ломает время: куски будущего попали в обучение. Для временных рядов случайные фолды запрещены» | М42, FAI-03 |
| V4 | `traps.scalerOnAll = true` или `featureSelectOnAll = true` | «Среднее и разброс для масштабирования (или отбор признаков) посчитаны по всей истории, включая тест. В скейлер попало будущее — это утечка данных, которую не ловит lookahead-analysis» | 1.7, FAI-03 |
| V5 | Доля финального теста > 25% или < 10% | Предупреждение (жёлтое, не красное): «Ориентир из урока 1.9: тест 15–20%. Слишком большой тест — мало данных на обучение, слишком маленький — тест ни о чём» | 1.9 |
| V6 | Ожидаемых сделок в любом проверочном сегменте < 30 | «Меньше 30 сделок: доверительный интервал огромен, выводы откладываются» (жёлтый), при < 10 — красный | FT-09, М30 |
| V7 | `finalTest.opens ≥ 1` и после этого изменён любой параметр | «Ты изменил параметры после взгляда на финальный тест. С этой секунды финальный тест — очередной train. Честной проверки больше нет» | 1.9 («смертный грех») |
| V8 | `finalTest.opens ≥ 2` | Блокирующая модалка (см. §7) | 1.9, М42, FAI-07 |
| V9 | В `walkforward` окно обучения < 6 месяцев | «Окно короче полугода не охватывает ни бычий, ни медвежий режим: параметры выучат погоду одного сезона» | FT-16 (12–18 мес.) |
| V10 | В `walkforward` `purgeDays = 0` при `timeframe ≤ 1h` и признаках с окном > 1 дня (флаг пресета `featuresOverlap: true`) | Жёлтое: «Между обучением и проверкой нет зазора: перекрывающиеся признаки переносят информацию через границу. Добавь purge/embargo» | 1.9 «Глубже» |
| V11 | В `retrain` `trainPeriodDays < 7` | «Окно обучения короче недели: модель учит шум текущей недели» | FAI-05 |

Статус в правой панели: **«✅ Честно»**, если нет красных правил; **«⛔ Утечка/нарушение»** с перечислением кодов иначе. Метрики при статусе ⛔ всё равно показываются, но с плашкой «недостоверно» и зачёркнутым значением OOS — ученик должен увидеть, что *число красивое, а доверять нельзя*.

### 6. Симуляционная модель метрик

Движок не гоняет бэктест — он воспроизводит закономерности из уроков детерминированно. Требования:

**6.1. Базовые величины (seed).**
- Скрытое «истинное» преимущество стратегии `edgeTrue` ∈ {0 (шум), 0.25, 0.5} задаётся пресетом (`strategyKind: 'noise' | 'weak' | 'real'`).
- In-sample Sharpe: `IS = base + fit(nParams, nTrades)`, где `fit` растёт с числом перебранных вариантов и падает с ростом сделок. Для `noise` использовать формулу из 1.10: ожидаемый максимум Шарпа на шуме `≈ sqrt(2·ln N)`, где N — число «попыток» (в `split` = число ручных правок параметров + 1; в `walkforward` — фиксированное 4096 комбинаций из FT-16 при включённом флаге «оптимизация»).
- Честный OOS (валидация и финальный тест): `OOS = IS × k`, где `k` ~ равномерно из [0.5, 0.7] для `real`/`weak` (норма из FT-16: «OOS 50–70% от IS»), и `k` ~ [-0.2, 0.3] для `noise` («победитель рассыпается»).
- Утечка (V3, V4 включены): `OOS = IS × [1.0, 1.3]` — OOS **лучше** IS. Правая панель обязана вывести подпись: **«OOS лучше in-sample — ищи утечку»** (правило FT-16).

**6.2. Разбиение из 1.9 (пресет по умолчанию).** История 2021–2024, Train 2021–2022 (50%), Holdout 2023 (25%), Final Test 2024 (25%). При seed по умолчанию выводить ровно Sharpe 2.4 / 1.9 / 1.7 с подписью «деградация умеренная (<30%) — допуск к paper trading». Деградация считается как `(IS − Test)/IS`, зона: <30% зелёная, 30–50% жёлтая, >50% красная.

**6.3. Walk-forward.** Для каждого окна i: параметр `rsiBuy_i` и `ema_i`.
- `real`: `rsiBuy_i ∈ [33, 36]` (узкий диапазон из FT-16 → «зелёная зона доверия»).
- `noise`: `rsiBuy_i ∈ [25, 40]` равномерно («сигнала нет — только подгонка под окна»).
- Выводится: таблица окон (timerange оптимизации, timerange OOS, P_rsi, P_ema, IS-PF, OOS-PF, сделок OOS, вердикт), точечная диаграмма параметров по окнам, склеенная OOS-кривая капитала (сумма кусков), **коэффициент эффективности** `efficiency = Sharpe(OOS-кривой) / mean(IS Sharpe)` с порогом `> 0.5 — приемлемо` (формула из 1.9).
- Пресет FT-16 воспроизводит окна из урока: (2023-01..2024-06 → 2024-07..2024-12), (2023-07..2024-12 → 2025-01..2025-06), (2024-01..2025-06 → 2025-07..2025-12). Пресет 1.9: 12/3/3 месяцев на 4 годах → 10–12 окон; тумблер `anchored` (расширяющееся обучение) / rolling.

**6.4. Retrain (FAI-05).** Синтетический ряд с точкой смены режима `regimeShift.at`. Метрика — доля верных направлений скользящим окном (0.5 = монетка). До сдвига: `0.5 + edgeTrue·0.1`; после сдвига — у признаков нет информации: `0.5 ± шум` при любой длине окна. Ползунок `trainPeriodDays` 7…180 меняет только *задержку*, с которой кривая проседает, и *шумность* кривой (короче окно — шумнее), но не итоговый уровень после сдвига. Подпись при любом положении ползунка после сдвига: **«Дорога исчезла — никакая частота обновления не спасёт. Нужен мониторинг качества предсказаний и критерий отключения»**. Значения по умолчанию из урока: `train_period_days: 30`, `backtest_period_days: 5`.

**6.5. Доверительный интервал винрейта.** Для каждого сегмента: `±1.96·sqrt(p(1−p)/n)`, p = 0.55, n = ожидаемых сделок. Показывать как «±X%» под сегментом (связка с М30/М31 и FT-08).

### 7. Счётчик «сколько раз открыл final test» (ядро Z2)

Поведение — строго по сценарию:

1. Финальный тест по умолчанию **закрыт**: сегмент заштрихован, метрики теста скрыты под кнопкой «Открыть финальный тест (1 раз)». Рядом — предупреждение: «Открывается один раз. После этого подкручивать параметры под него нельзя».
2. Клик → модалка подтверждения с чек-боксом «Я закончил подбор параметров; что бы ни показал тест, менять их под него я не буду». Без галочки кнопка неактивна.
3. Первое открытие: `opens = 1`, показываются метрики, сегмент теряет штриховку, в шапке «Касаний теста: 1». Эмитится `e7.finaltest.open`.
4. Любое изменение `params` после открытия → `paramEditsAfterOpen++`, срабатывает V7, сегмент перекрашивается **в синий цвет обучения** с ярлыком **«это уже train»**, метрики теста зачёркиваются, появляется подпись: «Ты подогнал параметры под финальный тест. Честной оценки у тебя больше нет — нужна новая, нетронутая история». Эмитится `e7.finaltest.contaminated`.
5. Повторное нажатие «Открыть» → `opens = 2`, блокирующая модалка (V8): «Второй взгляд на финальный тест превращает его в train. Именно так исследователь обманывает себя: "дайте пересдать, я подучу именно эти задачи"». Кнопки: «Понял, закрыть» и «Всё равно показать (в журнал уйдёт отметка)». Второй вариант доступен, но метрики теста при каждом последующем открытии **растут** (симуляция подгонки: `Test_k = Test_1 + 0.15·k`), а рядом отображается неизменная серая линия «честное ожидание = Test_1». Это визуально показывает, что «улучшение» — иллюзия.
6. Счётчик хранится per lesson и **не сбрасывается** кнопкой «Сброс». Сброс — только «Начать заново» с подтверждением; при этом в ленту обратной связи пишется «Новый эксперимент начат: история №N».
7. Пресет FAI-07 использует тот же механизм под именем «Ворота holdout»: шесть чек-боксов протокола (признаки без будущего; walk-forward без shuffle; база бьётся вне выборки; политика выбросов записана; мониторинг есть; план dry-run) — кнопка «Открыть holdout» активна только при 6/6.

### 8. Панель ловушек (`traps`)

- **Shuffle.** Тумблер. При включении шкала анимированно (≤600 мс) рассыпается на 20 равных блоков, которые перекрашиваются случайно в цвета train/valid/test (seed). Подпись: «Так выглядит "случайная кросс-валидация" на временном ряду: будущие блоки лежат внутри обучения». Метрики: OOS > IS. Правило V3.
- **Масштабирование по всей истории.** Тумблер «scaler.fit(X_all)» ↔ «scaler.fit(X_train)». При включении над каждым сегментом проверки появляется тонкая стрелка «→ в скейлер» от теста к обучению; в правой панели две метрики рядом: «fit на всём: 0.63» / «fit на train: 0.54» (порядок величин из FAI-03: «метрика на тесте стабильно завышена»). Правило V4.
- **Зазор (purge/embargo).** Ползунок 0–14 дней; визуально — белый промежуток между сегментами. При `featuresOverlap` и 0 дней — V10.
- **Отбор признаков по всей истории** — только в пресетах FAI (V4 с текстом про отбор).

Панель ловушек — единственное место в движке, где ученик *сознательно* включает ошибку, поэтому каждый тумблер подписан «(ошибка)».

### 9. Критерии освоения (`goals`) и чекпоинты

Пресет задаёт список целей; движок отмечает выполненные. Примеры (по умолчанию для 1.9):

1. Собрал честное разбиение: статус ✅, доли в коридоре (train 50–60, valid 20–25, test 15–20).
2. Открыл финальный тест ровно один раз и не менял параметры после.
3. В `walkforward` собрал ≥ 5 окон без пересечений и получил `efficiency`.
4. Включил и выключил shuffle, прочитал карточку V3 (клик по «Понятно»).
5. Ответил на встроенный вопрос (из урока): «Каждый повторный взгляд на финальный тест превращает его в…» → «очередной train».

Для FT-16 добавляются: «Сравнил разброс rsi_buy между окнами для `real` и `noise`» (нужно переключить `strategyKind` тумблером «Стратегия с настоящим краем / Чистый шум»). Для FAI-05: «Провёл ползунок окна от 7 до 180 после смены режима и отметил, что уровень качества не восстановился».

### 10. Пресеты по урокам

| Урок | Режимы | Ключевые параметры | Что должно совпасть с текстом |
|---|---|---|---|
| **1.9** | split, walkforward, traps | 2021-01-01…2024-12-31, 1h, `tradesPerYear: 240`, wf 12/3/3 | Sharpe 2.4/1.9/1.7; таблица «сколько раз можно тестировать»: Train — неограниченно, Holdout — 5–10 (счётчик валидации жёлтеет после 10 открытий), Final — 1 |
| **М42** | split, traps (shuffle, scaler) | Начальные доли 70/15/15 из кода урока | Подпись `train = df[:0.7]`, `valid = df[0.7:0.85]`, `test = df[0.85:]` над сегментами (режим «показать код» — оба языка) |
| **FT-16** | walkforward | Окна из урока; `strategyKind` переключаемый; счётчик комбинаций 3×16=4096 | Правило «OOS 50–70% от IS — норма; лучше IS — утечка»; узкий разброс rsi_buy 33–36 vs широкий 25–40 |
| **FAI-03** | split, traps | Акцент на scaler; кнопка «показать, какие статистики теста попали в скейлер» | Две метрики рядом; текст «самая частая утечка FreqAI» |
| **FAI-05** | retrain | `train_period_days 30`, `backtest_period_days 5`, `regimeShift` в середине | «Актуальность режиму — не защита от смены структуры» |
| **FAI-07** | split (ворота) | 6 чек-боксов протокола | Holdout открывается один раз |

### 11. Технические требования

- Компонент без внешних зависимостей от торговых библиотек; шкала — SVG/Canvas; drag работает мышью, тачем и клавиатурой (стрелки сдвигают границу на месяц, Shift+стрелка — на 6 месяцев). Все элементы с `aria-label` на русском.
- API: `props: { preset: TimelinePreset; onEvent?: (e: E7Event) => void; initialState?: TimelineState }`.
- События: `e7.split.change`, `e7.rule.violation {code}`, `e7.rule.resolved {code}`, `e7.finaltest.open {opens}`, `e7.finaltest.contaminated`, `e7.wf.run {windows, efficiency}`, `e7.trap.toggle {trap, on}`, `e7.goal.done {goalId}`.
- Производительность: пересчёт панели ≤ 16 мс при drag (все формулы аналитические, без циклов по свечам).
- Тексты карточек — в отдельном `i18n/e7.ru.json`, чтобы методолог правил их без кода.

### 12. Приёмочные тесты

1. Тащу границу train вправо поверх valid → valid схлопывается до 1 месяца, дальше не идёт; V1 не возникает (пересечение невозможно физически) — **но** в `walkforward` при `stepMonths < testMonths` окна OOS пересекаются → V1 появляется.
2. Включаю shuffle → V3, OOS ≥ IS, подпись про утечку. Выключаю → статус ✅, OOS ∈ [0.5, 0.7]·IS.
3. Открываю final test, меняю rsiBuy → V7, сегмент синий, метрики зачёркнуты, `e7.finaltest.contaminated`.
4. Открываю final test повторно → модалка; «Всё равно показать» → значение выше первого, серая линия «честное ожидание» на месте первого значения.
5. Пресет 1.9 с seed по умолчанию выводит 2.4/1.9/1.7 и «деградация <30%».
6. FT-16, `noise`: точки rsi_buy по окнам покрывают весь диапазон 25–40; `real`: лежат в 33–36. `efficiency` для `noise` < 0.5, для `real` > 0.5.
7. FAI-05: при любом `trainPeriodDays` доля верных направлений после сдвига в пределах 0.5 ± 0.03.
8. Перезагрузка страницы сохраняет `opens`; «Сброс» не обнуляет счётчик; «Начать заново» — обнуляет с подтверждением.
9. Клик по любому английскому токену на экране открывает карточку глоссария.

### 13. Чего не делать

- Не запускать реальный бэктест и не подключать данные бирж.
- Не добавлять оптимизатор с «кнопкой найти лучшие параметры»: движок про честность разбиения, а не про подбор.
- Не показывать доходность в рублях — только относительные метрики (Sharpe, PF, доля верных направлений), чтобы не смешивать с E8.

---

## E8 · «Двуязычный отчёт»

### 1. Назначение и заблуждения

Таблица результата бэктеста / paper / микро-лайва, в которой каждая метрика имеет английское имя (как в выводе Freqtrade), русское имя, формулу, зону и одну строку смысла. Движок принимает реальный вывод `freqtrade backtesting` (текст или JSON), а также пресетные отчёты из уроков.

| Код | Заблуждение | Урок | Что делает движок |
|---|---|---|---|
| R1 | «Первая строка Total profit решает всё» | FT-09, FT-14 | Режим «читать в порядке»: прибыль скрыта, пока не прочитаны сделки → просадка → риск |
| R2 | «Причины выхода — второстепенно» | FT-14 | Блок «Причины выхода как диагноз» с тремя профилями |
| R3 | «Шарп 5 — гениально» | 1.10 | Зоны Шарпа и подпись «на дневных данных >3 — почти всегда ошибка/утечка» |
| R4 | «Разница бэктест/бумага 15% — мелочь» | 4.5, 5.1 | Двухколоночный режим с Execution Deviation и зонами <10 / 10–25 / >25 |
| R5 | «+40% — успех» | FT-09, 1.11 | Строка «Market change» (buy&hold) рядом с Total profit и разница |
| R6 | «Комиссия учтена, наверное» | FT-09, FT-13 | Красный баннер при Fee = 0 или отсутствующей строке Fee |

### 2. Режимы

`<BilingualReport mode=... source=... preset=.../>`

- **`table`** — полная двуязычная таблица (FT-09, 1.10).
- **`guided`** — тренажёр «Прочитай в правильном порядке» (FT-09).
- **`exits`** — диагностика причин выхода (FT-14).
- **`compare`** — две колонки «ожидание / факт» с Execution Deviation (4.5, 5.1).
- **`theory`** — карточки формул с мини-калькулятором на числах урока (1.10).

### 3. Источники данных

```ts
type ReportSource =
  | { kind: 'text'; raw: string }                 // вставленный вывод freqtrade backtesting
  | { kind: 'json'; data: FreqtradeBacktestResult } // файл из user_data/backtest_results
  | { kind: 'preset'; id: string };              // пресетные отчёты из уроков
```

**3.1. Парсер текста.** Вывод Freqtrade — набор ASCII-таблиц. Парсер должен быть терпимым: искать строки по ключам (регистронезависимо, допуская пробелы и двоеточия), не падать при отсутствии строки (метрика получает статус «нет в отчёте»). Минимальный набор распознаваемых ключей (агент сверяет с актуальным выводом `stable`-версии):

`Backtesting from / to`, `Max open trades`, `Total/Daily Avg Trades`, `Starting balance`, `Final balance`, `Absolute profit`, `Total profit %`, `CAGR %`, `Sortino`, `Sharpe`, `Calmar`, `Profit factor`, `Expectancy (Ratio)`, `Trades per day`, `Avg. daily profit %`, `Avg. stake amount`, `Total trade volume`, `Best Pair`, `Worst Pair`, `Best trade`, `Worst trade`, `Best day`, `Worst day`, `Days win/draw/lose`, `Avg. Duration Winners`, `Avg. Duration Loser`, `Max Consecutive Wins / Loss`, `Rejected Entry signals`, `Entry/Exit Timeouts`, `Min balance`, `Max balance`, `Max % of account underwater`, `Absolute Drawdown (Account)`, `Absolute Drawdown`, `Drawdown high / low`, `Drawdown Start / End`, `Market change`, а также строки `Fee` в заголовке. Отдельно парсятся таблицы **EXIT REASON STATS** (`exit_signal`, `roi`, `stop_loss`, `trailing_stop_loss`, `force_exit`, `custom_exit`, …), **LEFT OPEN TRADES REPORT**, **BACKTESTING REPORT** (по парам).

**3.2. JSON.** Ключи результата стратегии (`profit_total`, `profit_total_abs`, `cagr`, `sortino`, `sharpe`, `calmar`, `profit_factor`, `expectancy`, `expectancy_ratio`, `max_drawdown_account`, `max_drawdown_abs`, `drawdown_start`, `drawdown_end`, `market_change`, `total_trades`, `winrate`, `wins/draws/losses`, `results_per_pair`, `exit_reason_summary`, `left_open_trades`, `trades[]` с `exit_reason`, `profit_ratio`, `open_date`, `close_date`, `fee_open/fee_close`). При наличии `trades[]` движок сам считает производные метрики §5.3.

**3.3. Валидация источника.** Если распознано < 5 метрик — экран «Не похоже на отчёт Freqtrade» с примером фрагмента и ссылкой на FT-09.

### 4. Словарь метрик (ядро движка)

Единый файл `metrics.ru.json`. Каждая запись:

```ts
interface MetricDef {
  key: string;                 // 'sharpe'
  en: string;                  // 'Sharpe'
  ru: string;                  // 'Коэффициент Шарпа'
  short: string;               // одна строка смысла
  formula: { text: string; vars: Record<string,string> }; // формула и расшифровка букв
  block: 1|2|3|4|5;            // порядок чтения (§6)
  zones: ZoneRule[];           // §5
  lesson: string;              // где введена
  glossaryKey: string;
}
```

Обязательные записи (русские имена и формулы — ровно как в уроках):

| key | en | ru | формула / определение | блок | урок |
|---|---|---|---|---|---|
| total_trades | Total/Daily Avg Trades | Сделок всего / в день | count(trades) | 1 | FT-09 |
| winrate | Win rate | Доля прибыльных | wins / total | 1 | FT-09 |
| max_consec_loss | Max Consecutive Loss | Максимальная серия убытков | max run of losses | 1 | 5.5 |
| left_open | Left open trades | Незакрытые на конец теста | count(open) | 1 | FT-09 |
| max_dd_account | Max % of account underwater / Absolute Drawdown (Account) | Максимальная просадка счёта, % | (peak − trough) / peak | 2 | 0.12, FT-09 |
| max_dd_abs | Absolute Drawdown | Максимальная просадка, в валюте | peak − trough | 2 | FT-09 |
| dd_dates | Drawdown Start / End | Даты просадки | — | 2 | FT-09 |
| recovery_needed | (вычисляется) | Нужно для восстановления | DD / (1 − DD) | 2 | 0.12 |
| sharpe | Sharpe | Коэффициент Шарпа | (μ − rf) / σ · √365 | 3 | 1.10 |
| sortino | Sortino | Коэффициент Сортино | (μ − MAR) / downside σ · √365, downside по всем наблюдениям min(r−MAR,0) | 3 | 1.10 |
| calmar | Calmar | Коэффициент Калмара | CAGR / |MaxDD| | 3 | 1.10 |
| profit_factor | Profit factor | Фактор прибыли | Σ прибылей / Σ убытков | 3 | FT-09, FT-14 |
| expectancy | Expectancy (Ratio) | Матожидание на сделку (в R) | p·W − (1−p)·L | 3 | 0.14, М6 |
| total_profit_pct | Total profit % | Итоговая доходность | (final − start) / start | 4 | FT-09 |
| abs_profit | Absolute profit | Итоговая прибыль в валюте | final − start | 4 | FT-09 |
| cagr | CAGR % | Годовая доходность | (final/start)^(365/days) − 1 | 4 | FT-09 |
| market_change | Market change | Изменение рынка (купил-и-держал) | Δ цены пары за период | 4 | 1.11, FT-09 |
| alpha_rough | (вычисляется) | Стратегия минус рынок | total_profit − market_change | 4 | 1.11 |
| best_month_share | (вычисляется) | Доля лучшего месяца в прибыли | best month / Σ positive | 5 | FT-09 |
| per_pair | BACKTESTING REPORT | Разбивка по парам | — | 5 | FT-09 |
| exit_reasons | EXIT REASON STATS | Причины выхода | — | 5 | FT-14 |
| fee | Fee | Комиссия, заложенная в тест | из заголовка отчёта | 0 (пре-проверка) | FT-13 |
| rejected | Rejected Entry signals | Отклонённые сигналы входа (нет слота) | — | 5 | FT-09 |
| timeouts | Entry/Exit Timeouts | Заявки, отменённые по таймауту | — | 5 | FT-06 |

Каждая формула отображается в поповере с расшифровкой букв по-русски и кнопкой «Показать на числах отчёта» (подстановка реальных значений).

### 5. Зоны

**5.1. Правила из FT-09 (таблица урока) — воспроизводятся дословно:**

| Метрика | Тревожная (красная) | Серая | Рабочая (зелёная) | Комментарий-подпись |
|---|---|---|---|---|
| Сделок за период (нормировать к 1.5 годам) | < 30 | 30–80 | 80–400 | «Меньше 30 — статистика ни о чём» |
| Win rate | любое при n < 30 | — | 45–60% при R > 1.2 | «Сам по себе ничего не значит» |
| Profit factor | < 1.1 | 1.1–1.3 | 1.3–1.8 | «> 2.5 на in-sample — подозрение на подгонку» (жёлтая с восклицанием) |
| Max DD (relative) | > 25% | 15–25% | 5–15% | «Свыше 25% — стопы/сайзинг не те» |
| Sortino | < 1 | 1–1.5 | 1.5–3 | «Проверь, как аннуализировано» |
| Лучший месяц даёт | > 50% всей прибыли | 25–50% | < 25% | «Иначе это одна удача» |

**5.2. Правила из 1.10:**
- Sharpe: < 1 — слабо (красная), 1–2 — рабочая (зелёная), 2–3 — «отлично, проверь» (жёлтая), **> 3 на дневных данных — красная с текстом «почти всегда признак ошибки или утечки»**. Для внутридневных таймфреймов порог сдвигается (флаг пресета), но подпись остаётся.
- Calmar: > 2 зелёная, 1–2 серая, < 1 красная.
- Max DD: < 15–20% — норма (согласовать с FT-09: зелёная ≤ 15, серая 15–25).

**5.3. Производные метрики, которые движок считает сам (если есть `trades[]`):**
- `best_month_share` — по месяцам закрытия сделок.
- `max_consec_loss` и ожидаемая серия по 5.5: `ln(N)/ln(1/q)`, q = 1 − winrate; подпись «серия из K подряд — норма для твоего винрейта».
- `recovery_needed` — по 0.12; строка «после −20% нужно +25%».
- `alpha_rough` — при наличии `market_change`.
- Доля сделок по причинам выхода.

**5.4. Пре-проверки (показываются баннером над таблицей до любых метрик):**
- Fee отсутствует или = 0 → красный баннер: «Комиссия в тесте не заложена или равна нулю. Все выводы аннулируются. Проверь строку Fee и параметр fee в config» (FT-09, FT-13).
- `left_open_trades > 0` → жёлтый: «На конец теста остались открытые сделки — проверь, включены ли они в итог».
- `total_trades < 30` → красный: «Выборка мала — таблицу можно смотреть, доверять нельзя» (все зоны ниже показываются полупрозрачными).

**5.5. Итоговый вердикт.** После таблицы — одна карточка «Вердикт по правилам урока» (не ИИ, а правила): если есть хоть одна красная зона в блоках 1–2 → «Стратегия не проходит первичный осмотр: <перечень>». Если всё зелёное → «Первичный осмотр пройден. Следующий шаг — lookahead-analysis (FT-11)». Никогда не писать «прибыльная стратегия».

### 6. Режим `guided` — «Прочитай в правильном порядке» (FT-09)

Порядок чтения из урока: **сделки → просадка → риск-метрики → прибыль → разбивки** (блоки 1→5).

Механика:
1. Таблица показывается с **перемешанными** строками; значения блоков 4–5 (прибыль, разбивки) **скрыты** (плашка «сначала блоки 1–3»).
2. Ученик кликает строки. Правильный клик — строка «встаёт на место» в упорядоченную колонку справа и показывает зону. Неправильный (например, первым — Total profit) → строка мигает красным, карточка: «Первая строка отчёта — самая обманчивая: мошеннический и честный бэктест могут иметь одинаковую первую строку (FT-14). Сначала — сколько сделок».
3. Внутри блока порядок свободный; между блоками — строгий.
4. После завершения блока 3 открываются 4–5.
5. Финал: счётчик ошибок, время, и вопрос из FT-09: «Total profit +120% при 14 сделках за полтора года — что говорит статистика?» с проверкой ответа.
6. Критерий освоения: ≤ 1 ошибка порядка при повторном прохождении на другом пресете.

### 7. Режим `exits` — «Причины выхода как диагноз» (FT-14)

- Вход: `exit_reason_summary` (или считается по `trades[]`).
- Визуализация: кольцевая диаграмма долей (по числу сделок) и вторая — по вкладу в прибыль; рядом таблица: причина (en) — русское имя — сделок — доля — суммарный PnL — средняя длительность.
- Русские имена причин: `roi` — «по таблице минимальной доходности», `stop_loss` — «по стоп-лоссу», `trailing_stop_loss` — «по трейлинг-стопу», `exit_signal` — «по сигналу стратегии», `force_exit` — «принудительно (ручной /forceexit или kill-switch)», `custom_exit` — «пользовательский выход», `emergency_exit` — «аварийный выход».
- **Три профиля** (классификация по правилам, показывается плашкой над диаграммой):
  - «Всё стопом»: доля stop_loss ≥ 60% по сделкам → «У стратегии нет работающего тейка: она умеет только терять по правилу. Проверь ROI/выход по сигналу»;
  - «Хвостовая»: ≥ 80% сделок закрыты стопом/ROI малыми, а ≥ 50% прибыли дали ≤ 10% сделок → «Результат держится на редких крупных сделках: риск-профиль особенный, просадки длинные, психологически тяжело (5.5)»;
  - «Сбалансированная»: ни одна причина > 50%, прибыль распределена → «Выходы работают по назначению».
- Ползунок-эксперимент «убрать лучшие 3 сделки» → пересчёт итога, чтобы показать зависимость от хвоста.
- Пресеты: три синтетических отчёта, по одному на профиль.

### 8. Режим `compare` — Execution Deviation (4.5, 5.1)

Две колонки: **«Ожидание (бэктест)»** и **«Факт (paper / микро-лайв)»**, третья — **«Отклонение»** и зона.

- Формула (ровно из 4.5): `ExecDev = (Fact − Backtest) / Backtest`, показывается со знаком.
- Зоны: |ExecDev| < 10% — норма (допуск к микро-лайву), 10–25% — серая («модель проскальзывания слишком оптимистична, уточнять»), > 25% — стоп («масштабировать нельзя»). Для 5.1 текст допускает 10–15% как норму — пресет переопределяет порог `normalMax: 15`.
- Строки сверки из таблицы 4.5 с их допусками:

| Показатель | Бэктест | Paper | Допуск |
|---|---|---|---|
| Количество сделок | 120 | 114 | < 5% |
| Средний слиппедж на вход | 0.02% | 0.024% | < 25% отклонения |
| Win rate | 54.5% | 52.8% | в пределах 1 стандартной ошибки (движок считает `sqrt(p(1−p)/n)`) |
| Net Sharpe | 2.20 | 1.92 | деградация не более 15–20% |

- Пресет 4.5: бэктест +12.0%, paper +10.2% → ExecDev −15.0% (серая зона). Пресет 5.1: paper +5.92%, микро-лайв +5.47% (150 000 ₽, 40 сделок, +8 200 ₽) → −7.6% (норма); плюс плашка «40 сделок — выводов об эдже делать нельзя» (5.1).
- Под таблицей — «Вероятные причины расхождения» (из 4.5): оптимистичный слиппедж, очередь в стакане, задержки, скрытый look-ahead — как чек-лист, который ученик отмечает после разбора.
- Источники «факта»: ручной ввод, JSON из dry-run (`freqtrade` экспорт сделок) или пресет.

### 9. Режим `theory` (1.10)

Четыре карточки: Sharpe, Sortino, Max DD, Calmar. На каждой — формула, «что означает на практике» (из таблицы 1.10) и мини-калькулятор на числах урока: Стратегия А (+60% / вол 40% → Sharpe 1.5, DD −35%) против Б (+35% / вол 10% → 3.5, DD −6%) с выводом «Б в 2.3 раза качественнее; с плечом ×2 даст +70% при DD −12%». Плюс карточка «Дефлированный Шарп»: ползунок N перебранных вариантов → `sqrt(2·ln N)` как планка, которую нужно превзойти (N=500 → ≈3.5). Это связывает E8 с E7 (кнопка «Открыть линейку времени»).

### 10. Языковой слой

- Переключатель в шапке: **англ / рус / оба** (по умолчанию «оба»: английское имя серым мелким над русским).
- В режиме «англ» каждая строка всё равно кликабельна → карточка глоссария.
- Режим «Ткни в непонятное» распространяется на исходный текст отчёта: во вкладке «Исходник» вставленный вывод Freqtrade показывается моноширинно, каждый распознанный токен подсвечен и кликабелен, нераспознанные строки — серые с подписью «движок не знает эту строку; сообщить».
- Озвучка формул (опция из ТЗ §6.4): текст TTS хранится в `MetricDef.formula.spoken`, например для Sharpe: «средняя доходность минус безрисковая ставка, делённая на разброс доходности, приведённая к году».

### 11. Пресеты по урокам

| Урок | Режим | Данные |
|---|---|---|
| **FT-09** | table + guided | Три синтетических отчёта DipBuyerBTCFilter: «бычий 2024», «коррекция 2025H1», «старый период» — 80–120 сделок, PF 1.3–1.8, DD 10–20%; плюс один «подозрительный» (+80%, 14 сделок, Sharpe 4.1, Fee 0) для тренировки пре-проверок |
| **FT-14** | exits | Три профиля из §7 |
| **1.10** | theory + table | Стратегии А/Б из урока |
| **4.5** | compare | Таблица сверки из урока, ExecDev −15% |
| **5.1** | compare | 150 000 ₽ / 40 сделок / −7.6% |
| **ВК2, ВК4** (опционально) | table | Отчёт с признаком «Sharpe > 5 на первом бэктесте — ошибка в данных или коде» из таблицы ВК2 |

### 12. Технические требования

- Компонент принимает `props: { mode; source; preset?; lang?: 'en'|'ru'|'both'; onEvent? }`.
- Парсер — отдельный чистый модуль `freqtradeReportParser.ts` с юнит-тестами на 3 реальных образцах вывода (агент берёт их из документации Freqtrade, раздел Backtesting output) и на JSON из `backtest_results`. Обязательна толерантность к версии: неизвестные строки не ломают разбор.
- Зоны — декларативные правила в `zones.ru.json` (метрика, условия, цвет, текст), чтобы методолог мог править пороги без кода.
- Таблица доступна с клавиатуры; цвет зоны дублируется иконкой и словом («тревожная / серая / рабочая») — не только цветом.
- События: `e8.parse.ok {metricsFound}`, `e8.parse.fail`, `e8.precheck.fail {code}`, `e8.zone.view {metric, zone}`, `e8.guided.click {metric, correct}`, `e8.guided.done {errors, seconds}`, `e8.exits.profile {profile}`, `e8.compare.execdev {value, zone}`, `e8.glossary.open {key}`.
- Экспорт: кнопка «Скопировать карточку стратегии» — Markdown из FT-14 (доходность, MaxDD, сделок, средняя сделка, доля прибыльных, причины выхода, результат по парам + два вывода, введённые учеником руками — поля обязательны, пустые = кнопка неактивна).

### 13. Приёмочные тесты

1. Вставка реального вывода `freqtrade backtesting` → распознано ≥ 15 метрик, каждая с русским именем и зоной; нераспознанные строки видны во вкладке «Исходник».
2. Отчёт с `Fee 0` → красный баннер до таблицы; зоны полупрозрачны.
3. Отчёт с 14 сделками и +120% → красный баннер «выборка мала», вердикт «не проходит первичный осмотр», Sharpe 4.1 на 1d — красная зона с текстом про утечку.
4. `guided`: клик по Total profit первым → красная карточка, ошибка +1; правильная последовательность → блоки 4–5 открываются только после блока 3.
5. `exits`: отчёт с 65% stop_loss → профиль «Всё стопом»; отчёт, где 3 сделки дают 60% прибыли → «Хвостовая»; ползунок «убрать лучшие 3» пересчитывает итог.
6. `compare` с пресетом 4.5 выводит −15.0% и серую зону; с пресетом 5.1 — −7.6% и норму плюс плашку про 40 сделок.
7. Переключатель языка меняет заголовки без перезагрузки; в режиме «англ» клик по `Sortino` открывает карточку «Коэффициент Сортино».
8. `best_month_share` считается из `trades[]` и попадает в зону по FT-09.
9. Формула в поповере подставляет реальные числа отчёта («Calmar = 38% / 12% = 3.2»).

### 14. Чего не делать

- Не давать ИИ-«оценку стратегии»: все вердикты — детерминированные правила из уроков с явной ссылкой.
- Не рисовать кривую капитала как главный элемент (это делает E3); в E8 допустим только спарклайн просадки в блоке 2.
- Не показывать Total profit крупнее других метрик — визуальная иерархия обратная: сделки и просадка сверху и крупнее.

---

## Связки E7 ↔ E8 (обязательные)

1. Из карточки Sharpe в E8 (зона «>3 подозрение») — кнопка «Проверить разбиение» → открывает E7 в режиме `split` с текущим уроком.
2. Из E7 после честного прогона walk-forward — кнопка «Прочитать OOS-отчёт» → открывает E8 `table` с синтетическим отчётом, собранным из OOS-кусков (число сделок, PF, DD берутся из симуляции E7).
3. Оба движка пишут в единый журнал экспериментов (E5): E7 — строки «касание финального теста», «нарушение V-код»; E8 — «вердикт первичного осмотра», «ExecDev = X%».

----------------------

claude-fable-5.1-high
ТЗ на движки E3 «Плёнка бэктеста» и E4 «Ритуал»
Документ для агента-разработчика. Оба движка — сквозные: строятся один раз, конфигурируются пресетами под конкретные уроки. Все числа, формулы и формулировки в пресетах берутся из текстов уроков (ссылки указаны), а не выдумываются.

0. Общие конвенции (обязательны для обоих движков)
Конвенция	Требование
Язык	Весь интерфейс на русском. Ни одной английской надписи без русской подписи.
«Ткни в непонятное»	Любой английский токен (open, EMA, enter_long, stoploss, /forceexit, dry_run…) рендерится компонентом <Term key="…">: подчёркивание точками, по клику/тапу — карточка: русское имя, одна фраза объяснения, пример, ссылка «где объясняется» (урок). Словарь — один JSON на приложение (glossary.ru.json), пополняется из «Терминов урока».
Режим «скрыть английский»	Глобальный переключатель: английские метки заменяются русскими эквивалентами из словаря (enter_long → вход_лонг, open → открытие). Значения/числа не меняются.
Персонаж	Сквозной герой — Алексей, депозит 1000 $ / 100 000 ₽ (Py-уроки, FT-17). Все сценарные тексты — от его лица или про него.
Один интерактив = одно заблуждение	У каждого пресета в конфиге обязательное поле misconception (строка) — оно показывается ученику в финальной карточке «что ты проверил».
Локальное хранение	Прогресс, ответы, журналы — local-first (IndexedDB), экспорт JSON/CSV. Синхронизация — опционально, через тот же интерфейс.
Детерминизм	Любой прогон при одинаковом пресете и seed даёт байт-в-байт одинаковый результат. Используется собственный PRNG с seed, не Math.random.
Доступность	Управление с клавиатуры (E3: → шаг, ← назад, Space пауза, B «что видел бот»), контраст ≥ 4.5:1, размер таргетов ≥ 44 px.
Телеметрия	Единая шина событий track(eventName, payload); события перечислены в разделах ниже.
ЧАСТЬ I. E3 «Плёнка бэктеста»
1. Назначение
Покадровое воспроизведение того, что на самом деле делает торговый движок с одной свечой и одной сделкой. Ученик видит семь отдельных событий, которые в его голове склеены в одно «бот купил»: свеча закрылась → индикаторы пересчитаны → сигнал → проверка слота/риска → заявка по open следующей свечи → исполнение (или таймаут) → сопровождение (стоп/ROI/трейлинг/выход по сигналу) → сделка закрыта, PnL с комиссиями.

Уроки-хозяева: 1.6, 1.7, FT-05, FT-06, FT-09, FT-10, ВК2.

Ломаемые заблуждения (по пресетам):

Урок	Заблуждение	Что показывает плёнка
1.6	«Сдвиг на бар — формальность»	Без shift(1) кривая капитала рисуется по цене, которой бот ещё не знал; фантомная прибыль подсвечена.
1.7	«Код работает — значит утечки нет»	Три плёнки на одних данных: честная и две утекающие; расхождение сделок и Шарпа.
FT-05	«Сигнал и исполнение — одна цена»; «вход пока в зоне»	Порядок событий свеча t → open t+1; зона RSI забивает слоты, пересечение — нет.
FT-06	«Сигнал был = сделка открылась»	Между сигналом и сделкой: заявка, таймаут, частичное исполнение.
FT-09	«Стоп в отчёте = мой худший убыток»; «причины выхода второстепенны»	Стоп по worst-case внутри свечи, гэп сквозь стоп (−10 % → −12 %), причины выхода, незакрытые сделки.
FT-10	«Бэктест — это обещание»	Идеальная модель против реалистичной: 8 расхождений, разрыв кривых.
ВК2	«Запустился — значит правильно считает»	Просветный тест: 30 свечей с известным числом сделок; лог решений; поиск дефекта.
2. Педагогическая модель кадров
Плёнка — конечный автомат. Один «тик» пользователя (кнопка «Шаг») переводит автомат в следующий кадр. Кадры внутри одной свечи:

text

K1 Свеча закрылась           (t становится видимой; всё правее t затемнено)
K2 Индикаторы пересчитаны    (значения строки t; при t < startup — бейдж «прогрев»)
K3 Проверка условий          (дерево условий входа/выхода, каждый лист true/false)
K4 Слот и деньги             (max_open_trades, свободный баланс, размер ставки)
K5 Заявка по open t+1        (свеча t+1 приоткрыта: виден ТОЛЬКО open)
K6 Исполнение                (fill / частичное / таймаут; цена с проскальзыванием; комиссия)
K7 Сопровождение             (для каждой открытой сделки на каждой следующей свече: стоп, ROI, трейлинг, выход по сигналу)
K8 Сделка закрыта            (карточка PnL: брутто → комиссии → проскальзывание → нетто; причина выхода; строка в журнал)
Кадры K3–K6 показываются только если есть повод (нет сигнала → K3 показывает «сигнала нет» и переходит к K7/K1). Кадры K7–K8 показываются только при открытых сделках. Пустые кадры можно «схлопнуть» настройкой skipEmptyFrames: true (по умолчанию для длинных прогонов) — тогда «Шаг» ведёт к следующему событию.

Ключевое правило визуализации: ученик никогда не видит свечу t+1 целиком до кадра K7 следующего цикла. В K5–K6 виден только её open (и — в реалистичном режиме — тонкая «внутрисвечная траектория» для лимитной заявки).

3. Архитектура
text

┌─────────────────────────────────────────────────────────────┐
│  UI (React)                                                  │
│  ┌──────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ График   │ │ Панель кадра│ │ Состояние    │ │ Журнал   │ │
│  │ (свечи + │ │ (объяснение │ │ (кошелёк,    │ │ решений  │ │
│  │ индикат.)│ │  + условия) │ │  слоты, сд.) │ │ (лог)    │ │
│  └──────────┘ └─────────────┘ └──────────────┘ └──────────┘ │
│  ┌──────────────── Лента событий (таймлайн) ──────────────┐ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌──── Пульт: ◀ Шаг ▶ | ▶ Играть | скорость | ⏭ к событию |│
│  │     👁 Что видел бот | ⇄ Сравнить | ⚙ Реализм          │ │
├─────────────────────────────────────────────────────────────┤
│  Симуляционное ядро (чистый TS, без DOM)                     │
│  • DataProvider  — свечи (синтетика/фикстуры)                │
│  • Indicators    — EMA/SMA/RSI/ATR, инкрементально по t      │
│  • RuleEngine    — декларативные условия (DSL), без eval     │
│  • Execution     — модель исполнения (идеал / реализм)       │
│  • Portfolio     — кошелёк, слоты, сделки, PnL, комиссии     │
│  • FrameProducer — генерирует последовательность кадров      │
│  • Recorder      — журнал решений + метрики (→ E8)           │
├─────────────────────────────────────────────────────────────┤
│  Пресеты (JSON) по урокам  •  Словарь (E1)  •  Банк кейсов (E6)│
└─────────────────────────────────────────────────────────────┘
Ядро должно работать без UI (для тестов и для E6/ВК4-просветного теста): runFilm(preset) → Frame[].

4. Входные данные
4.1 Свечи
JSON

{ "timeframe": "1h", "pair": "BTC/USDT",
  "candles": [ { "t": 1700000000, "o": 100, "h": 101, "l": 99.5, "c": 100.8, "v": 120 } ] }
Источники: (а) фикстуры в репозитории (реальные обезличенные отрезки 200–2000 свечей); (б) синтетические генераторы с seed: trend, flat, shock (обвал на N %), gap (открытие ниже стопа), zeroVolume (артефакт). Пресет указывает источник и seed.

4.2 Стратегия — декларативный DSL
Python в браузере не исполняется. Стратегия описывается JSON, который один в один отображается в псевдокод Freqtrade в панели «Код» (с «Ткни в непонятное»).

JSON

{
  "id": "tutorial_ema_rsi",
  "timeframe": "1h",
  "startup_candle_count": 200,
  "indicators": [
    { "name": "ema_fast", "type": "EMA", "period": 16 },
    { "name": "ema_slow", "type": "EMA", "period": 200 },
    { "name": "rsi",      "type": "RSI", "period": 14 }
  ],
  "entry": { "all": [
    { "op": "gt",  "a": "ema_fast", "b": "ema_slow",           "label": "тренд вверх" },
    { "op": "lt",  "a": "rsi",      "b": 35,                   "label": "откат, не вершина" },
    { "op": "gte", "a": { "ref": "rsi", "shift": 1 }, "b": 35, "label": "сигнал — ПЕРЕСЕЧЕНИЕ" },
    { "op": "gt",  "a": "volume",   "b": 0,                    "label": "фильтр артефактов" }
  ]},
  "exit":  { "all": [ { "op": "lt", "a": "ema_fast", "b": "ema_slow", "label": "тренд сломан" } ] },
  "stoploss": -0.10,
  "minimal_roi": { "0": 0.06, "240": 0.02 },
  "trailing": null,
  "max_open_trades": 3,
  "stake": { "mode": "fixed", "amount": 150 }
}
Правила DSL:

shift ≥ 0 — разрешён всегда. shift < 0 — разрешён только если пресет помечен "leakDemo": true; движок в этом случае помечает узел красным бейджем «ЗАГЛЯДЫВАНИЕ В БУДУЩЕЕ» и считает его честно (т.е. действительно берёт будущее), чтобы показать фантомную прибыль.
Поддерживаемые операторы: gt gte lt lte eq and(all) or(any) not cross_above cross_below.
stake.mode: fixed (сумма) | unlimited (свободный баланс / max_open_trades, как в FT-04).
Каждый лист условия обязан иметь label на русском — он показывается в K3.
4.3 Модель исполнения
JSON

{
  "mode": "ideal",                 // "ideal" | "realistic"
  "entry_price_rule": "open_next", // "open_next" (честно) | "close_same" (режим лжи, только leakDemo)
  "order_type": "limit",           // "limit" | "market"
  "fee_pct": 0.001,                // 0.1 % на сторону (FT-04); для ВК4 — 0.0005
  "slippage_bps": 0,               // на сторону; ВК4 — 2
  "unfilled_timeout_min": 10,      // FT-04/FT-06
  "latency_ms": 0,                 // реализм: 250–2000
  "fill_probability_limit": 1.0,   // реализм: <1 — лимитка может не исполниться при касании
  "partial_fill": false,           // реализм: исполнение 40–90 % объёма
  "impact_k": 0,                   // доп. проскальзывание = k·sqrt(order_usdt / bar_volume_usdt)
  "stop_model": "worst_case_low",  // стоп срабатывает, если low ≤ цена стопа; гэп → выход по open (хуже стопа)
  "roi_model": "high_touch",       // ROI считается достигнутым, если high ≥ цель (упрощение, помечается как допущение)
  "same_candle_priority": "stop_first" // если в одной свече и стоп, и ROI — считаем худшее (допущение FT-09)
}
Допущения показываются ученику явно: в панели «Реализм» есть кнопка «Какие упрощения сейчас включены» — список с пометкой «смещает результат ВВЕРХ» (FT-10).

5. Поведение ядра (строгие правила)
Индикаторы считаются только из свечей [0..t]. Проверка в тестах: пересчёт на усечённом ряде даёт идентичные значения на всех t.
Прогрев. Пока t < startup_candle_count, сигналы не оцениваются; на K2 бейдж «прогрев: индикаторы ещё врут» и полупрозрачные линии. Пресет FT-12-совместимый режим (опционально) показывает, как EMA200 «догоняет» истинное значение.
Сигнал → заявка. Сигнал строки t создаёт заявку по open(t+1) (лимит на уровне open или рынок). В режиме close_same — заявка исполняется по close(t) и подсвечивается призрачным маркером; счётчик «фантомная прибыль = Σ(open(t+1) − close(t))·qty» растёт.
Слоты. Если открытых сделок = max_open_trades — K4 «нет слота», сигнал помечается серым, попадает в счётчик «пропущено из-за слотов». Если свободный баланс < ставки — «нет денег».
Исполнение. ideal: лимитка исполняется по цене заявки, если low(t+1) ≤ price (для лонга); рынок — по open(t+1) + slippage. realistic: добавляются latency (заявка «доходит» после части свечи — моделируется дробью хода свечи), fill_probability_limit, partial_fill, impact. Неисполненная в течение unfilled_timeout_min — отменяется, событие «отменено по таймауту», сигнал считается пропущенным.
Сопровождение (K7) для каждой открытой сделки на каждой новой свече, порядок проверок:
Стоп: low ≤ entry·(1+stoploss). Если open ≤ стоп — гэп: выход по open (убыток больше стопа), событие «гэп сквозь стоп».
ROI: определить порог по времени в сделке из minimal_roi (ступень: 0→+6 %, 240 мин→+2 %); если high ≥ entry·(1+порог) — выход по цене цели.
Трейлинг (если включён): подтяжка стопа по параметрам FT-17 (positive, offset, only_offset_is_reached).
Выход по сигналу: сигнал exit на свече t → выход по open(t+1) (ещё один кадр K5/K6 для выхода).
Закрытие (K8). PnL: брутто = (exit − entry)·qty; комиссия = fee·(entry·qty + exit·qty); проскальзывание отдельной строкой; нетто. Причина выхода — чип: ROI / стоп / сигнал / трейлинг / таймаут / конец теста (не закрыта). Строка в журнал решений.
Конец данных. Незакрытые сделки помечаются «осталась открытой на конец теста» и показываются в отчёте отдельной строкой (FT-09 left open trades) с переключателем «включать в итог / не включать».
Журнал решений (формат «просветного теста» ВК2) — на каждый кадр с событием: время | цена | что проверял | результат | причина. Экспорт CSV.
6. Интерфейс
6.1 Основной экран (одна плёнка)
text

┌──────────────────────────────────────────────────────────────────────┐
│ FT-05 · Первая стратегия     [Пресет: TutorialEmaRsi ▾] [⚙ Реализм] │
├───────────────────────────────────────┬──────────────────────────────┤
│ ГРАФИК                                │ КАДР K3 · Проверка входа      │
│  свечи 0..t ярко, t+1.. затемнены     │  ✔ ema_fast > ema_slow  (тренд)│
│  линии EMA16/EMA200 обрываются на t   │  ✔ rsi < 35              34.1 │
│  ▲ сигнал  ○ заявка  ● исполнение     │  ✔ rsi[-1] ≥ 35          36.8 │
│  ─ ─ стоп (красн.)  ⋯ ROI (зел.)      │  ✔ volume > 0             120 │
│  ▼ выход                              │  ⇒ enter_long = 1            │
│  RSI под графиком, черта 35           │  «Сигнал есть. Что дальше?» │
├───────────────────────────────────────┼──────────────────────────────┤
│ ЛЕНТА СОБЫТИЙ (горизонтальная)        │ СОСТОЯНИЕ                     │
│ t=212 ● закрылась → индикаторы → ✔сиг.│ Кошелёк: 850 USDT (dry)       │
│ t=213 ○ заявка 100.8 → ● 100.8 (0.1%) │ Слоты: 1/3                    │
│ t=217 ▼ ROI +6.0% → нетто +5.8%       │ Открыто: SOL/USDT +2.1% 4ч    │
├───────────────────────────────────────┴──────────────────────────────┤
│ ЖУРНАЛ РЕШЕНИЙ                                          [Экспорт CSV]│
│ 213 · 100.80 · заявка лимит · исполнено · fee 0.15                    │
├──────────────────────────────────────────────────────────────────────┤
│ [◀ Назад] [Шаг ▶] [▶ Играть 1x ▾] [⏭ К следующему событию]           │
│ [👁 Что видел бот в этот момент]  [⇄ Сравнить]  [❓ Режим экзамена]   │
└──────────────────────────────────────────────────────────────────────┘
Элементы:

Затемнение будущего — постоянно (не только по кнопке): свечи > t с непрозрачностью 12 % и штриховкой, значения индикаторов не рисуются.
«Что видел бот в этот момент» — при удержании кнопки будущее скрывается полностью (не затемнено, а отсутствует), а на месте свечи t+1 — карточка «?» с подписью: «Бот знает только open этой свечи и то — когда она откроется». Отпустил — вернулось затемнение.
Панель кадра — заголовок кадра + одно-два предложения на русском + данные. Тексты кадров — из фраз уроков (см. §8).
Лента событий — кликабельна: клик по событию перематывает плёнку.
Панель состояния — кошелёк, слоты (кружки), список открытых сделок с текущим PnL и временем в сделке.
Мини-отчёт (сверху журнала, свёрнут): сделок / побед / PF / просадка / комиссии Σ / фантомная прибыль Σ. При завершении прогона разворачивается в компонент E8 «Двуязычный отчёт» (если E8 ещё нет — встроенная упрощённая таблица с зонами из FT-09).
6.2 Режим «Сравнить» (две плёнки)
Два графика друг под другом, синхронизированы по t. Общий пульт. Внизу — две кривые капитала на одной оси и таблица расхождений (сделок, PF, комиссии). Пары для сравнения задаются пресетом:

честная / close_same (1.6, 1.7);
честная / shift(-1) в условии (1.7);
зона RSI / пересечение RSI (FT-05);
идеал / реализм (FT-06, FT-10);
чистая / с одним внедрённым дефектом (ВК2).
При расхождении сделок между плёнками соответствующая свеча получает жёлтый флаг; клик по флагу — объяснение «здесь плёнка Б знала close, которого ещё не было».

6.3 Режим «Экзамен» (ИГР)
Перед показом кадров K3, K6, K7 плёнка останавливается и задаёт вопрос с 2–3 вариантами:

K3: «Будет ли сигнал на этой свече?» (да/нет) — по видимым индикаторам.
K6: «Исполнится ли лимитка по 100.8?» (да / нет, отмена по таймауту) — по видимому open t+1.
K7: «Что сработает первым: стоп, ROI или ничего?» — по времени в сделке и текущему ROI-порогу.
K8: «Причина выхода?» (ROI / стоп / сигнал).
Счёт: верных/всего; после 10 вопросов — «зачёт» при ≥ 80 %. Ошибочные ответы объясняются (не просто «неверно», а «ты забыл, что порог ROI после 240 минут — уже +2 %»).
6.4 Панель «Реализм» (FT-06, FT-10)
Ползунки: комиссия (0–0.2 %), проскальзывание (0–30 bps), задержка (0–5 с), вероятность исполнения лимитки (50–100 %), частичное исполнение (вкл/выкл), размер ордера / объём бара (0–50 % → влияние impact_k), таймаут (1–60 мин), «пауза торгов» (вставить N свечей без исполнения). Под ползунками — живые чипы «8 расхождений» (FT-10: комиссии, спред, проскальзывание, частичные исполнения, отказы, влияние объёма, паузы, задержки) — активные подсвечены. Кривая «идеал» фиксирована, кривая «реализм» пересчитывается.

6.5 Панель «Код»
Псевдокод стратегии (генерируется из DSL в стиле Freqtrade v3). Строка, соответствующая текущему кадру, подсвечена. Каждый английский токен — <Term>. Кнопка «скрыть английский» действует и здесь.

7. Пресеты по урокам
Формат пресета:

JSON

{ "id": "...", "lesson": "FT-05", "title": "...", "misconception": "...",
  "data": {...}, "strategy": {...}, "execution": {...},
  "compare": null | { "b": { "strategyPatch": {...}, "executionPatch": {...} } },
  "focusFrames": ["K3","K5"], "startAt": 210, "skipEmptyFrames": true,
  "exam": true|false, "finalCard": { "text": "...", "numbersFromLesson": [...] },
  "masteryCriterion": {...} }
Пресет	Урок	Данные	Стратегия	Сравнение	Фокус	Критерий освоения
p16_shift_matters	1.6	синтетика trend, 300 дневных свечей	SMA50-пересечение, cost 7.5 bps за оборот	честная / close_same	K5, кривые капитала	Ученик включает close_same, видит фантомную прибыль, отвечает на вопрос «какую цену бот знал в момент решения»
p17_three_films	1.7	фикстура 500 свечей 1h	SMA-фильтр close > sma	А честная (вход open t+1, выход open t+2) / Б close_same / В условие с high.shift(-1) > close	флаги расхождений	Найти в панели «Код» плёнки В строку с shift(-1) (клик)
ft05_lifecycle	FT-05	фикстура 400 свечей, startAt: 205	TutorialEmaRsi (§4.2)	нет	K1–K8 полный цикл, бейдж прогрева на 200	Пройти 2 полных сделки в режиме «Экзамен» ≥ 80 %
ft05_zone_vs_cross	FT-05	30 свечей с RSI, уходящим под 35 на 7 свечей	А: rsi<35; Б: rsi<35 & rsi[-1]≥35; max_open_trades 3	А / Б	K3, K4, счётчик слотов	Собрать условие Б из чипов (rsi < 35 .shift(1) >= &) — правильная сборка открывает финальную карточку
ft06_four_things	FT-06	синтетика с одной неисполненной лимиткой и одной частичной	TutorialEmaRsi, unfilled_timeout 10	идеал / реализм (latency 800 мс, fill_prob 0.7, partial)	K5, K6, лента событий	Расставить 4 карточки (сигнал / заявка / исполнение / сделка) на таймлайн одной сделки (drag&drop); затем нажать «А как в бэктесте» — карточки схлопываются в одну
ft09_exits	FT-09	синтетика gap (одно открытие ниже стопа) + flat	TutorialEmaRsi, ROI-лестница	нет	K7, K8, отчёт E8	Верно назвать причину выхода в 5 сделках подряд; увидеть «гэп сквозь стоп −10 % → −12 %»; переключить «включать незакрытую» и объяснить разницу итога
ft10_ideal_vs_real	FT-10	фикстура 600 свечей тонкой пары (низкий объём бара)	TutorialEmaRsi с order_type market	идеал / реализм (панель ползунков)	панель «Реализм», две кривые	Довести реалистичные ползунки до «разрыв ≥ 25 %» и отметить 3 расхождения, дающих наибольший вклад (движок считает вклад каждого фактора отдельно)
vk2_smoke_test	ВК2	синтетика 30 свечей, ожидаемо ровно 3 сделки	EMA9/EMA21-пересечение, вход open t+1, taker 0.05 %, slippage 2 bps (ВК4)	чистая / одна из 4 «испорченных»: fee=0, close_same, без volume>0, startup=5	журнал решений	По логу определить, какой дефект внедрён (выбор из 4); 2 из 2 верно
Каждый пресет заканчивается финальной карточкой: заблуждение → что ты увидел → число из урока (например, FT-09: «в отчёте стоп −10 %, факт −12 %»; 1.7: «Sharpe 9.8 с утечкой → −0.42 без неё») → ссылка «где прожить дальше» (E6 для утечек, E8 для отчёта).

8. Тексты кадров (единый банк, RU)
Хранятся в films.ru.json, ключ = frameId + presetId?. Базовые формулировки — из уроков:

K1: «Свеча {t} закрылась. Только сейчас бот узнал её close = {c}. Всё, что правее, — будущее: его ещё нет.»
K2 (прогрев): «Индикаторам нужно {startup} свечей на разогрев. Сейчас {t}: EMA200 ещё "догоняет" истинное значение — сигналы здесь ложные.» (FT-12)
K3 (сигнал есть): «Все четыре множителя истинны → enter_long = 1. Обрати внимание: третий множитель делает сигналом момент пересечения порога, а не всё время ниже порога.» (FT-05)
K4 (нет слота): «Слоты 3/3. Сигнал есть, сделки не будет. В отчёте это никак не отразится — но в живой торговле ты этот вход пропустишь.»
K5: «Заявка выставлена по open следующей свечи, {o}. Бот не знает, что будет дальше в этой свече.»
K6 (таймаут): «Цена не коснулась лимитки за {timeout} мин. Заявка отменена. Сигнал был — сделки нет.» (FT-06)
K7 (гэп): «Свеча открылась на {o}, ниже стопа {stop}. Стоп исполнен по open: убыток −{x} %, а не −10 %. В отчёте бэктеста такое встречается как "−10 %" — это оптимизм.» (FT-09)
K8: «Брутто +{g} → комиссия −{f} → проскальзывание −{s} → нетто +{n}. Причина выхода: {reason}.»
9. Критерии освоения и телеметрия
События: film_frame_viewed {preset, frame, t}, film_peek_used {preset, t}, film_toggle {preset, toggle, value}, film_compare_flag_clicked, film_exam_answer {frame, correct}, film_completed {preset, trades, phantomProfit, examScore}, film_mastery {preset, passed}.

Метрики эффективности (для проверки гипотезы «интерактив работает»):

доля учеников, дошедших до финальной карточки пресета;
доля верных ответов на вопрос K5 («какую цену знал бот») на первом и повторном прохождении (цель: +30 п.п.);
в vk2_smoke_test — доля верно определённых дефектов с первой попытки.
10. Приёмочные тесты ядра (обязательны)
#	Тест	Ожидание
T1	Детерминизм: один пресет, два прогона	идентичный Frame[] и журнал
T2	vk2_smoke_test чистый	ровно 3 сделки на известных свечах (список в фикстуре)
T3	Отсутствие доступа к будущему	для каждого t: индикаторы на candles[0..t] == индикаторам полного прогона на строке t
T4	Прогрев	ни одного сигнала при t < startup_candle_count
T5	Слоты	4-й сигнал при 3 открытых → событие «нет слота», сделка не создана
T6	Таймаут	лимитка без касания в течение таймаута → отмена, сделка не создана
T7	Гэп сквозь стоп	open ≤ стоп → выход по open, убыток по модулю >
T8	ROI-лестница	сделка старше 240 мин закрывается при +2 %, моложе — только при +6 %
T9	Комиссии	Σ комиссий == fee·Σ(entry·qty + exit·qty) с точностью 1e-9
T10	close_same	phantomProfit == Σ(open(t+1) − close(t))·qty по всем входам
T11	Незакрытая сделка	переключатель «включать» меняет итог ровно на её нереализованный PnL
T12	Производительность	2000 свечей, генерация всех кадров < 300 мс; отрисовка шага < 16 мс
T13	Реализм — монотонность	при прочих равных рост fee, slippage, impact_k, снижение fill_probability не увеличивают нетто (FT-10: «все упрощения смещают вверх»)
11. Интерфейс компонента
TypeScript

<BacktestFilm
  presetId="ft05_lifecycle"
  overrides?: DeepPartial<Preset>
  mode?: "film" | "compare" | "exam"
  onEvent?: (e: FilmEvent) => void
  onMastery?: (result: { passed: boolean; score: number }) => void
/>
// ядро отдельно:
runFilm(preset: Preset): { frames: Frame[]; trades: Trade[]; log: LogRow[]; metrics: Metrics }
Зависимости: glossary.ru.json (E1), опционально <ReportBilingual> (E8), банк кейсов E6 (для перехода из финальной карточки).

12. Вне области
Реальные данные с биржи; исполнение Python; шорты и плечо (первый год — нет, FT-17/0.16); DCA/adjust_trade_position; hyperopt (это E7/FT-16).

ЧАСТЬ II. E4 «Ритуал»
1. Назначение
Движок повторяемых действий с расписанием, напоминаниями, стриками и историей. Не объясняет — приучает. Ученик «прикручивает» ритуал к себе (время, часовой пояс, свои формулировки) и дальше выполняет его в приложении и — через перехват — во всех тренажёрах курса.

Уроки-хозяева: П1, П2, П5, П8, П12, П19, 5.4, 5.6, FT-19, FT-20. Дополнительно используют: П7, П9, П11, П14, П17, П33, П44, FAI-07.

Ломаемые заблуждения:

Заблуждение	Механика, которая его ломает
«Уведомление = приказ действовать» (П5)	Ночной фильтр: после полуночи проходит только белый список, остальное — в утреннюю сводку.
«Ну тут-то точно надо вмешаться» (П1)	Перехват любой кнопки вмешательства модалкой «два вопроса»; пустой факт = кнопка не срабатывает.
«Прибыльная неделя — хорошая неделя» (П8)	Двойная отметка: неделя с нарушением устава красная даже при плюсе.
«Гляну одним глазком» (П12, П38)	Не более двух окон проверки в день; счётчик подглядываний вне окон.
«Поменяю настройку сейчас, пока помню» (5.6)	Любое изменение ритуала/устава вступает в силу завтра; не более одного изменения в неделю.
«19/20 — почти готов» (FT-20)	Ворота: пункт закрывается только выполнением условия, а не кликом.
2. Понятия и модель данных
TypeScript

type RitualKind = "scheduled" | "event" | "gate" | "campaign";

interface RitualTemplate {
  id: string;                      // "r_p1_two_questions"
  title: string;                   // русское имя
  lessonRefs: string[];            // ["П1","FT-19","5.5"]
  kind: RitualKind;
  misconception: string;
  schedule?: Schedule;             // для scheduled/campaign
  trigger?: TriggerSpec;           // для event
  steps: Step[];
  personalization: PersonalField[];// что ученик задаёт при «прикручивании»
  streakPolicy: { countsToward: "daily"|"weekly"|"none"; graceSkipsPer14d: number };
  unlock: { lesson: string };      // появляется после открытия урока
  changePolicy: { effectiveFrom: "next_day"; maxChangesPerWeek: 1 };
}

interface Schedule { cadence: "daily"|"weekly"|"monthly"|"quarterly";
  at: { time?: "HH:mm"; weekday?: 0-6; dayOfMonth?: number; quarterDay?: 1 };
  windowMin: number;               // длительность окна (П12: 15)
  reminders: { before: number[]; after: number[] } }

type Step =
 | { id; type:"check";  label; required: true }
 | { id; type:"number"; label; unit?; validate?: {min?,max?,compareTo?: "baseline"|"band"} }
 | { id; type:"text";   label; minChars: number; forbiddenOnly?: string[] /* нельзя закрыть только эмоцией */ }
 | { id; type:"choice"; label; options: {value,label,category?: "world"|"head"}[]; multi?: boolean }
 | { id; type:"scale";  label; min:1; max:10 }
 | { id; type:"timer";  label; seconds: number; mustElapse: true }
 | { id; type:"breath"; label; pattern:[4,4,6]; cycles: 10 }
 | { id; type:"condition"; label; evidence: EvidenceSpec }   // для ворот
 | { id; type:"journal"; label; journalKind: "intervention"|"evening3"|"bias"|"experiment" }; // пишет в E5

interface EvidenceSpec {
  kind: "textContains" | "numberRule" | "appEntity" | "dateAttested";
  textMarker?: string;                        // напр. "PASS" для check_data
  numberRule?: { field: string; op: "<="|">="; value: number };
  appEntity?: { type: "e3_mastery"|"e5_count"|"e4_run_count"|"e7_holdout_opens"; id?: string; min?: number; max?: number };
}

interface RitualInstance { id; templateId; userId; settings: Record<string,unknown>;
  createdAt; effectiveFrom; pendingSettings?: {settings, effectiveFrom}; status:"active"|"paused"|"archived" }

interface Run { id; instanceId; scheduledFor?; startedAt; completedAt?;
  answers: Record<string,unknown>; outcome:"done"|"partial"|"skipped"|"blocked"|"deferred";
  durationSec; source: "app"|"trainer:<id>" }

interface Streak { instanceId; current; best; graceUsedSince: Date }
Инварианты:

Шаг condition нельзя закрыть без валидного evidence (UI не рисует чекбокс — только поле доказательства).
Шаг timer/breath завершается только по истечении времени; переключение вкладки паузит таймер.
Изменение settings активного экземпляра пишется в pendingSettings и применяется в 00:00 следующего дня; вторая попытка изменения на той же неделе блокируется с текстом из 5.6 («эффект первого ещё не измерен»).
3. Типы ритуалов и механика
3.1 По расписанию (scheduled)
Окна: утро / вечер / воскресенье / 1-е число / первый день квартала. Ритуал появляется в виджете «Сегодня» за 15 мин до окна; напоминание — в момент окна и один раз через 30 мин. Пропуск фиксируется в 23:59 (для дневных) / в понедельник 00:00 (для недельных).

Ограничение анти-невроза: суммарно не более двух дневных окон проверки (П12). Попытка добавить третье — предупреждение с расчётом из П38 («при проверке раз в день ты видишь минус в 46 % случаев, раз в минуту — почти в 50 %») и требование подтвердить письменно причину; событие пишется в E5 как потенциальное искажение.

3.2 Событийные (event)
Срабатывают на перехват. Все тренажёры курса помечают кнопки вмешательства атрибутом data-intervention="<kind>" (forceexit, stopentry, disable_bot, change_params, manual_trade, increase_size). Шина ritualBus.intercept(kind, ctx) → Promise<"allow"|"block"|"defer">. Пока ритуал не «прикручен», перехват показывает урезанную модалку с CTA «Прикрутить к себе (П1)».

3.3 Ворота (gate)
Чек-лист с доказательствами. Закрывается только при 100 % условий. Показывает «N/20», но не даёт кнопки «всё равно продолжить». При попытке — карточка «три способа обмануть чек-лист» (FT-20) с выбором, какой именно способ ты сейчас применяешь; выбор пишется в E5.

3.4 Кампания (campaign)
Последовательность недель (FT-20: 8 недель), каждая — набор дочерних scheduled-ритуалов и недельная карточка метрик с красными флагами. Завершается воротами.

4. Ночной режим и белый список (П5, FT-19)
Ученик один раз собирает белый список из 2–3 событий (чипы из урока: «нет связи с биржей > 15 мин», «сработал kill-switch», «бот отправил приказ, которого не мог отправить»; можно добавить своё, максимум 3). Пересмотр — по воскресеньям вопросом «пересмотреть?».
Правило полуночи: с 00:00 до времени утреннего окна все события тренажёров (night_alert), не входящие в белый список, не показываются, а копятся в утреннюю сводку: «за ночь: 5 уведомлений, действий требовали: 0».
Событие из белого списка ночью тоже проходит через «два вопроса», но с пометкой «белый список: действовать можно — после строки в журнал».
Недельная статистика в воскресном осмотре: «34 ночных уведомления → 0 требовали действий» (формат П5).
5. Стрики, Process Score, история
Стрик считает выполненные по правилу запуски (done), не partial. Щадящая политика: 1 пропуск без потери стрика за 14 дней (П47 — ритуал не должен стать источником тревоги). Стрик показывается, но не доминирует в UI (мелко, без «огоньков»).
Process Score (П33): доля шагов, выполненных по правилу, за неделю; отдельно — доля решений с классификацией «правило» против «эмоция» (из вечерних трёх строк).
История: календарная сетка по каждому ритуалу; клик по дню — ответы. Недельная сводка формируется E5 (если E5 нет — встроенный минимальный агрегатор: день недели × триггер × категория).
6. Каталог стандартных ритуалов (пресеты)
ID	Ритуал	Тип / расписание	Шаги (кратко)	Уроки
r_p1_two_questions	Два вопроса перед касанием	event (перехват)	1) Текст «назови факт: что изменилось в мире?» (≥ 15 символов) → 2) выбор чипа-категории: мир («нет связи > 15 мин», «цены в боте ≠ бирже», «я менял код», «биржа сообщила о техработах») / голова («минус на экране», «новость», «страшно», «скучно», «чужой скриншот») → если «голова» → block + карточка урока; 3) «Если приму это решение завтра утром выспавшимся — оно будет тем же?» да → defer в утреннее окно; нет → allow + 4) запись в журнал вмешательств (дата, мир/голова, действие) + автонапоминание «оценить итог» через 7 дней	П1, FT-19, 5.5
r_p2_sunday_5	Воскресный осмотр — пять галочек	weekly, вс, 15 мин	1) журнал ошибок пуст? (да/нет + число); 2) сделки совпадают с планом? (число отклонений); 3) результат недели, % (число; сравнивается с «привычной болтанкой» — полосой, заданной при настройке из бэктеста); 4) издержки не поползли? (средняя комиссия+проскальзывание bps vs базовая); 5) правила биржи/инструмента менялись? (да/нет). Итог: пять зелёных — «работаем дальше»; иначе — открыть журнал. Плюс блок «пересмотреть белый список?» и напоминание о дате планового пересмотра стратегии («правило замены масла»)	П2, 5.4, FT-19
r_p5_night_whitelist	Белый список ночи + утренняя сводка	настройка один раз + daily утро	Конструктор списка (2–3 чипа); утренняя сводка в утреннем окне: список ночных событий, «требовали действий: N», отметка «прочитано»	П5, FT-19
r_p8_evening_3	Три строки вечером	daily, вечернее окно, 5 мин	1) главное решение дня (текст); 2) почему — чип «правило» / «эмоция» + текст; 3) чувство одним словом до / после + шкала 1–10 (П19). Раз в неделю — «двойная отметка»: результат (±) и процесс (устав соблюдён да/нет + чипы нарушений). Через 7 записей — «карта паттернов»	П8, П19
r_p12_two_windows	Два окна проверки	daily: 09:00 и 20:00 (настраивается), 15 мин, таймер	Утро: /profit прочитан (ввести число), ошибки в логе (да/нет), открытых позиций (число), «есть ли изменение настроек к внесению?» — разрешено только здесь. Вечер: только чтение + запуск r_p8_evening_3. Вне окон приложение показывает баннер «правки настроек — утром» и считает подглядывания (П38)	П12, П38
r_p19_debrief	Вечерний дебрифинг после убытка	event: тренажёр сообщил «день закрыт минусом»	Шкала возбуждения 1–10; текст «что произошло / вывод / что делаю завтра»; таймер 5 мин; выход только после записи	П19
r_54_monthly	Ребалансировка 1-го числа	monthly, 1-е	Доли корзин 40/40/20 (три числа) → отклонение > ±5 % подсвечено → «ребалансирую: да/нет + причина»; rolling Sharpe 60 дней (число) → ниже 0.8 → флаг «деградация? см. 5.4»	5.4, 5.3
r_56_one_change	Правило одного изменения	политика движка + weekly-виджет	Любой тренажёр с параметрами (E2, FT-16, FT-20) регистрирует изменение через ritualBus.registerChange(); второе за неделю симуляции — блок «эффект первого ещё не измерен»; изменение вступает «завтра»; журнал изменений с причиной и ожидаемым эффектом; напоминание через неделю «сверь ожидание с фактом»	5.6, FT-20, ВК3
r_p7_letter_quarterly	Письмо из будущего	quarterly, 1-й день квартала, 15 мин	Показать письмо (текст из П7-тренажёра); таймер 15 мин; вопрос «добавить пункт после сбоя?» → конструктор «причина → предохранитель»	П7, П29
r_p9_cold_timer	Холодный таймер 15 минут	event: кнопка «хочу войти» / «зуд» в любом тренажёре	Чек «встал, руки убраны»; таймер 15:00 (не пропускается); «стакан воды» чек; дыхание 4-4-6 × 10 с метрономом (П11); финальный вопрос «есть ли сигнал по уставу?» да/нет → при «нет» — закрыть вкладку (тренажёр блокирует вход)	П9, П11, П14
r_p14_stop_tilt	Стоп-тильт	event: два системных стопа подряд в тренажёре ИЛИ ручная кнопка «злюсь»	Блокировка торговых действий тренажёра на 4 «часа» симуляции; чек «ушёл от экрана»; запись в журнал	П14
r_p17_daily_limit	Дневной лимит сделок	политика для ручных тренажёров	Максимум 1–2 ручные сделки/«день» симуляции; далее терминал блокируется; счётчик комиссионной эрозии	П17
r_ft19_operator	Регламент оператора	daily + weekly (комбинированный)	Утро: /profit раз в день в фиксированное время; воскресенье: 30 мин, /daily + FreqUI (поля); команды тренажёра FT-19 разбиты по уровням: 0 — свободно; 1 (/stopentry) — факт + причина + журнал; 2 (/forceexit, /stop) — полный r_p1_two_questions; 3 (правка config) — r_56_one_change	FT-19, П1, 5.6
r_ft20_dryrun_8w	Восемь недель dry-run	campaign	Недели 1–8 с целями из FT-20; недельная карточка: uptime %, число сигналов vs ожидание (флаг при расхождении > 30 %), Execution Deviation % (зоны 4.5: < 10 норма / 10–25 серая / > 25 стоп), эмоциональная шкала 1–10 (П41); финал — ворота g_ft20_golive_20	FT-20, 4.5, П41
g_ft20_golive_20	Чек-лист допуска 20/20	gate	20 пунктов FT-20 по блокам (бэктест / инфраструктура / риск / оператор / юридика / психология), у каждого — evidence: напр. «lookahead-analysis зелёный» → textContains "0 differences" или appEntity e3_mastery p17_three_films; «100+ сделок» → numberRule >= 100; «журнал вмешательств чист» → appEntity e5_count intervention_without_fact max 0; «готовность к −N % недели» → текст + подпись даты; итоговое решение — только в утреннем окне, письменно, три варианта: продолжить dry-run / доработка / микро-лайв	FT-20, 5.1, 5.6
g_fai07_capstone	Ворота Capstone FreqAI	gate	6 пунктов протокола; holdout — счётчик открытий из E7: max 1; при втором открытии ворота закрываются навсегда с подписью «это уже train»	FAI-07, М42
r_p44_bias_journal	Дневник искажений	event/daily (по желанию)	Ситуация → решение → мысль в моменте → действие → результат → только потом чип категории (ошибка игрока, доступность, невозвратные затраты, ИКЕА, недавность, automation bias, aversion, перенос на бота); недельная сводка «категория ×2 = нужен протокол»	П44, П53–П56, П34
Все тексты шагов и чипов — из формулировок уроков (см. таблицу), хранятся в rituals.ru.json.

7. Перехват в тренажёрах (интеграционный контракт)
TypeScript

// в тренажёре:
const verdict = await ritualBus.intercept("forceexit", {
  trainerId: "ft19_night_pult", scenarioId: "api_error_03",
  simTime: "03:12", isNight: true, context: { pnlPct: -2.5, botError: null }
});
if (verdict === "allow") doForceExit();
if (verdict === "defer") showToast("Отложено до утреннего окна");
// "block" — тренажёр ничего не делает, модалка уже объяснила почему

// ночной фильтр:
ritualBus.notify({ kind:"night_alert", trainerId, title:"позиция в минусе 2,5 %", simTime:"02:40" })
// → если не в белом списке и ночь — уходит в сводку, тренажёр показывает «уведомление доставлено в утреннюю сводку»

// изменения параметров:
ritualBus.registerChange({ trainerId, what:"rsi_buy 35→33", reason:"...", expected:"..." }) // → allow | block
Тренажёры, обязанные интегрироваться в первой волне: П1 «Тревога в 03:00», FT-19 «Пульт оператора», FT-20 «Восемь недель», П43 «Скриншот друга», E2 «Живой конфиг», FT-16/E7 (holdout-счётчик).

8. Интерфейс
8.1 Виджет «Сегодня» (в шапке/боковой панели)
Ближайшее окно: «Вечерние три строки — через 40 мин».
Статус ночного режима: «Ночной фильтр включён до 09:00 · в сводке 3 события».
Ожидающие: «Оценить итог вмешательства от 12.03 (прошло 7 дней)».
Отложенные из-за «вступает завтра».
8.2 «Мои ритуалы»
Список карточек: имя, тип (иконка), расписание, стрик (мелко), Process Score недели, кнопка «Выполнить сейчас» (если окно открыто) / «Откроется в 20:00». Раздел «Доступно к прикручиванию» — ритуалы уже открытых уроков, ещё не настроенные.

8.3 Карточка ритуала
Вкладки: Настройка (персонализация; при изменении — баннер «вступит в силу завтра, 00:00»; счётчик «изменений на этой неделе: 1/1»), История (календарь), Почему (заблуждение + абзац урока + ссылка).

8.4 Экран выполнения
Пошаговый мастер: один шаг на экран, прогресс «3/5», таймер сверху (если задан), кнопка «Дальше» активна только при валидном ответе. Для text с minChars — счётчик символов и подсказка «назови факт словами, а не ощущением». Для breath — визуальный метроном (круг расширяется 4 с, держится 4 с, сжимается 6 с) с счётчиком циклов. Завершение — карточка «Готово · сегодня по правилу» без фанфар; при partial — «Не закрыто: {шаг}».

8.5 Модалка перехвата (П1)
Затемняет тренажёр. Заголовок «Стоп. Мир или голова?». Тело — шаги r_p1_two_questions. Внизу мелко: «Самые дорогие слова владельца бота: "ну тут-то точно надо было вмешаться"». Кнопка действия называется именем действия из тренажёра («Закрыть все позиции (/forceexit)»), а не «ОК».

8.6 Воскресная карточка недели (результат r_p2_sunday_5 + двойная отметка)
Две большие плашки: Результат (+2.1 %) и Процесс (нарушен: «вмешательство без факта ×1»). Цвет карточки определяется процессом (П8): плюс с нарушением — красная, минус по уставу — зелёная. Под ними: ночная статистика, Process Score, подглядывания вне окон, паттерны недели (E5).

9. Напоминания
Каналы: in-app (всегда), браузерные push (по разрешению), опционально Telegram-webhook (URL и chat_id в настройках; текст на русском). Правила: не чаще 2 напоминаний на одно окно; тихие часы — правило полуночи распространяется и на напоминания (ночью — только белый список). Все напоминания — «мягкие» формулировки («Окно вечерних трёх строк открыто»), без «Ты пропустил!».

10. Языковой слой
Команды Telegram и термины в шагах отображаются как «/forceexit — закрыть всё руками», «Execution Deviation — отклонение исполнения (4.5)». Все чипы — русские. Поля с английскими метриками имеют русскую подпись и подсказку «где считается» (ссылка на урок/E8).

11. Хранение и приватность
Все ответы — локально. Экспорт: JSON (полный) и CSV по ритуалу. Импорт для переноса между устройствами. Удаление — полное, с подтверждением. Никакие тексты журнала не уходят в телеметрию — только агрегаты (счётчики, длительности, вердикты).

12. Телеметрия и метрики эффективности
События: ritual_attached {templateId}, ritual_run {templateId, outcome, durationSec, source}, ritual_intercept {kind, verdict, factCategory: world|head|empty, isNight}, ritual_deferred_to_morning, ritual_change_blocked {reason}, gate_progress {gateId, closed, total}, gate_cheat_attempt {gateId, way}, night_digest_shown {count, actionable}, week_card {resultSign, processOk}.

Метрики:

доля учеников с ≥ 1 активным scheduled-ритуалом через 7 / 30 дней;
доля перехватов с вердиктом block/defer по причине «голова» — должна падать от урока П1 к FT-19 и FT-20 (ученик перестаёт тянуться к кнопке);
доля перехватов с пустым фактом (кнопка не сработала) — падает;
Process Score недели у активных пользователей (медиана);
доля попыток «обмануть ворота» на g_ft20_golive_20.
13. Приёмочные тесты
#	Тест	Ожидание
A1	Перехват с пустым текстом факта	кнопка действия неактивна; verdict не возвращается
A2	Перехват, категория «голова»	block, запись в E5 с флагом head, тренажёр не выполнил действие
A3	Перехват, категория «мир», «подождёт до утра = да»	defer; элемент в утренней сводке; напоминание в утреннем окне
A4	Перехват «мир», «не подождёт»	allow; запись в журнал вмешательств; отложенное напоминание «оценить итог» через 7 дней
A5	Ночь, событие не в белом списке	не показано; попало в сводку; счётчик ночных +1
A6	Ночь, событие из белого списка	показано; проходит через A1–A4
A7	Изменение настроек активного ритуала	pendingSettings, применение в 00:00 следующего дня; второе изменение на неделе — block
A8	Ворота: клик по пункту без доказательства	состояние не меняется; UI не рисует чекбокс
A9	Ворота: holdout открыт дважды	g_fai07_capstone закрыт навсегда, подпись «это уже train»
A10	Третье дневное окно	предупреждение с текстом П38; требуется письменная причина; запись в E5
A11	Неделя: плюс по результату, нарушение процесса	карточка красная; Process Score учитывает нарушение
A12	Стрик: один пропуск за 14 дней	стрик сохранён; второй пропуск — сброс
A13	Таймер 15 мин: переключение вкладки	таймер на паузе; продолжение по возвращении; завершение раньше невозможно
A14	registerChange дважды за неделю симуляции	второй — block с текстом 5.6
A15	Экспорт/импорт	полное восстановление истории, стриков и pending-настроек
14. Зависимости и очерёдность
E5 «Журнал» — E4 пишет через интерфейс journal.write(kind, entry); если E5 ещё не собран, E4 поставляется со встроенным минимальным хранилищем, реализующим тот же интерфейс (без сводок паттернов).
E7 — счётчик открытий holdout (appEntity e7_holdout_opens).
E3 — appEntity e3_mastery для доказательств в воротах.
Порядок сборки внутри E4: (1) модель + scheduled + экран выполнения → (2) перехват + r_p1_two_questions + ночной фильтр → (3) ворота + кампания FT-20 → (4) сводки/Process Score → (5) каналы напоминаний.
15. Вне области
Реальная интеграция с ботом Freqtrade/Telegram (только webhook напоминаний); геймификация с наградами и рейтингами (противоречит П47/П38); автоматическая «диагностика личности» по журналу (П44: категория — про эпизод, не про человека).

----------------------------------------

# ТЗ-4. Языковой слой для новичка без английского

**Статус:** обязательный слой; без него FT/FAI/Py-треки для целевой аудитории не работают.
**Зависимости:** движки E1 («Терминал-переводчик»), E2 («Живой конфиг»), E8 («Двуязычный отчёт») строятся *поверх* этого слоя, а не наоборот. Сначала словарь — потом движки.

---

## 0. Контекст, цели, границы

### 0.1. Что имеем
В 227 уроках английский встречается в пяти видах, и у каждого своя «точка боли» новичка:

| Вид | Примеры из уроков | Где массово |
|---|---|---|
| Код Python | `df['close'].shift(1)`, `def average(prices):`, `return` | Py-01…14, 1.6–1.12, ВК, FT-05, FT-07 |
| Конфиг JSON / атрибуты стратегии | `dry_run`, `stake_amount`, `startup_candle_count`, `minimal_roi` | FT-04, FT-05, FT-17, FT-18, FAI-05 |
| Команды и флаги терминала | `freqtrade backtesting --timerange 20240101-`, `pip install -U freqtrade` | FT-02, FT-08, FT-09, FT-11, FT-13, FT-16 |
| Вывод отчётов и ошибок | `Total profit %`, `Max Drawdown`, `ModuleNotFoundError`, `KeyError: 'close'` | FT-09, FT-14, Py-08, Py-10, ВК3 |
| Английские термины в русском тексте | «look-ahead bias», «Execution Deviation», «Sharpe» | везде; в «Терминах урока» дан перевод в скобках |

Часть механизма уже есть: в исходниках встречаются `<span data-tooltip-term="stationary_series">`, `data-tooltip-term="MinHash"`, `"OU"`, `"Kalman"`, `"EDA"`, `"SIGINT"`, `"SIGTERM"`. Эти ID **обязаны быть влиты** в единый словарь (см. §1.4), а не жить отдельно.

### 0.2. Цели слоя (измеримые)
1. Любой английский токен в любом блоке кода/конфига/терминала/таблицы кликабелен и даёт русскую карточку — покрытие ≥ 95 % токенов в треках Py, FT, FAI, ВК; ≥ 85 % в Ф1–Ф5.
2. Любой блок кода в интерактивах имеет режим «русские подписи к строкам».
3. 20 типовых ошибок распознаются по тексту (regex) и дают карточку «что это — что сделать первым».
4. Из любого термина за один клик: где впервые объяснён, где «прожит» в интерактиве, с чем связан.
5. Короткие формулы можно услышать по-русски (опционально, последняя волна).

### 0.3. Принципы (обязательны для агента)
- **Код не переводим.** Имена переменных, ключи конфига, команды остаются английскими всегда. Русский — только *рядом* (подпись, карточка, каптион). Иначе новичок не узнает то, что видит в терминале.
- **Объяснение ≠ перевод.** Карточка отвечает «что это делает в этом месте», а не даёт словарный перевод. `shift(1)` — не «сдвиг», а «взять значение из предыдущей свечи, чтобы не подглядывать в будущее».
- **Один словарь на приложение.** Никаких локальных словариков внутри интерактивов. Источник истины — `content/lexicon/`.
- **Контекст важнее токена.** `key` в `exchange` — это API-ключ, а `key` в словаре Python — имя поля. Схема поддерживает переопределение по уроку/блоку.
- **Пример из урока, не выдуманный.** В карточке — тот фрагмент кода, который ученик только что видел.
- **Ноль зависимостей от сети** для карточек: словарь грузится с приложением; TTS — единственная опциональная сетевая часть.
- **Доступность:** всё работает с клавиатуры (Tab → Enter), карточки читаются скринридером, на мобильном — тап и нижняя шторка.

---

## 1. Единый словарь (Lexicon) — фундамент всех пяти компонентов

### 1.1. Расположение и формат
```
content/lexicon/
  tokens/            # токены кода/конфига/CLI/отчётов
    python_basics.yaml
    pandas_numpy.yaml
    freqtrade_config.yaml
    freqtrade_cli.yaml
    freqtrade_strategy.yaml
    freqtrade_report.yaml
    telegram_commands.yaml
    terminal_words.yaml
    units_metrics.yaml
  errors/
    error_cards.yaml   # компонент C
  terms/
    terms.generated.yaml   # из «Терминов урока», генерируется скриптом
    terms.overrides.yaml   # ручные правки поверх generated
  formulas/
    formulas.yaml      # компонент D
  captions/            # компонент B
    <lesson_id>/<block_id>.yaml
build/
  lexicon.json         # собранный индекс, грузится приложением
  lexicon.index.json   # обратный индекс token→id для аннотатора
```
Сборка: `npm run lexicon:build` (или python-скрипт) — валидирует схему, склеивает, строит индекс, падает при дублях ID и при отсутствии обязательных полей.

### 1.2. Схема записи токена
```yaml
- id: lex.pd.shift_pos            # уникален глобально; префиксы: lex.py / lex.pd / lex.np / lex.ft.cfg / lex.ft.cli / lex.ft.strat / lex.ft.report / lex.tg / lex.term / lex.unit / lex.err / term.<slug>
  token: ".shift(1)"              # каноническая форма для показа
  match:                          # как находить в тексте
    exact: [".shift(1)", "shift(1)"]
    regex: "\\.shift\\(\\s*[1-9]\\d*\\s*\\)"   # положительный сдвиг
  kind: pandas_method             # python_keyword | python_builtin | pandas_method | numpy_func | config_key | config_value | cli_command | cli_flag | strategy_attr | strategy_method | report_metric | telegram_cmd | terminal_word | unit | concept
  ru_name: "сдвиг на прошлую свечу"
  ru_short: "Берёт значение из предыдущей строки (свечи), чтобы решение принималось по уже закрытым данным."
  ru_long: |
    shift(1) двигает столбец вниз на одну строку: в строке t оказывается значение из t−1.
    В бэктесте это главная защита от подглядывания в будущее: сигнал считаем по закрытой свече,
    исполняем на следующей. Без shift(1) стратегия «знает» цену закрытия до того, как свеча закрылась.
  ru_simple: "Смотрим на прошлую свечу, а не на текущую."    # для кнопки «проще»
  example:
    code: "pos = signal.shift(1).fillna(0)  # решение на t исполняется на t+1"
    lesson: "1.6"
  contrast: lex.pd.shift_neg      # «не путать с»
  pronounce: "шифт один"          # транслитерация для озвучки/чтения
  related: [lex.term.look_ahead, lex.pd.rolling]
  term: term.look_ahead_bias      # связь с глоссарием
  first_lesson: "1.6"             # где впервые объяснён (можно авто, см. §6)
  lived_in: ["1.7:diff_game", "FT-07:conveyor_vs_worker"]   # интерактивы
  overrides:                      # контекстные переопределения
    - scope: "lesson:Py-05"
      ru_short: "Здесь просто сдвиг списка; про защиту от будущего — в уроке 1.6."
  severity: null                  # только для ошибок
  tags: [anti_lookahead, core]
```
Обязательные поля: `id, token, match, kind, ru_name, ru_short, example`. Остальные — рекомендуемые; линтер предупреждает, если у `kind ∈ {config_key, strategy_attr, cli_command}` нет `ru_long`.

### 1.3. Правила написания карточек (для контент-части)
- `ru_name` — 1–4 слова, существительное: «размер ставки», «список пар».
- `ru_short` — одно предложение ≤ 140 знаков, отвечает «что делает здесь».
- `ru_long` — 2–5 предложений: механика → зачем → типичная ошибка новичка.
- `ru_simple` — предложение для 12-летнего; обязателен для всех `core`-токенов (~120 штук).
- Запрещены необъяснённые английские слова внутри русского текста карточки, кроме самого токена. «Датафрейм» допустим, если `term.dataframe` существует и ссылка проставлена.
- Пример — из урока, с указанием `lesson`. Если токен есть только в документации Freqtrade, помечаем `example.source: docs`.

### 1.4. Миграция существующих `data-tooltip-term`
Скрипт `lexicon:migrate-tooltips`:
1. Находит все `data-tooltip-term="X"` в исходниках уроков.
2. Для каждого X создаёт запись `lex.legacy.X` (kind: concept), если такой нет в словаре, с `ru_short` = текущий текст тултипа.
3. Заменяет атрибут на `data-lex="<id>"`.
4. Отчёт: сколько мигрировано, какие без текста — в бэклог контенту.

### 1.5. Нормализация и поиск
- Индекс `lexicon.index.json`: `{ "shift(1)": "lex.pd.shift_pos", "--timerange": "lex.ft.cli.timerange", ... }` + массив regex-правил с приоритетом.
- Приоритет совпадения: `exact` (самое длинное) → `regex` (в порядке `priority`) → семейство (например, любой `--flag` без записи → `lex.ft.cli.unknown_flag` с общим объяснением «параметр команды; посмотри `freqtrade <команда> --help`»).
- Поиск в глоссарии — по `token`, `ru_name`, `match.exact`, транслитерации (`шифт` → `shift`), с опечатками (расстояние Левенштейна ≤ 2).

---

## 2. Компонент A — «Ткни в непонятное»

### 2.1. Область применения
Аннотируются **все** элементы:
- `<pre><code>` (блоки кода, конфиги, вывод терминала);
- инлайновый `<code>`;
- ячейки таблиц с классом `.tbl-code` или содержащие английские метрики (FT-09 «Метрика», FT-16 «Loss-функция», FT-19 «Команда»);
- вывод эмулятора терминала в интерактивах (E1) — аннотируется на лету при появлении строк;
- строки эмулятора Telegram (FT-19).

Не аннотируются: URL, хэши, числа, имена собственных (Binance, Bybit — они в глоссарии как термины, но не подчёркиваются в коде), содержимое строковых литералов на русском.

### 2.2. Токенизация
Аннотатор работает на **build-этапе** для статичных блоков (результат — `<span data-lex="id" class="lex">shift(1)</span>`) и **в рантайме** для динамических (терминал E1).

Правила разбора (по порядку):
1. Многословные метрики отчёта: `Total profit %`, `Max Drawdown`, `Profit factor`, `Left open trades` — matched целиком до разбора на слова.
2. Команды с подкомандой: `freqtrade backtesting`, `pip install`, `python -m venv`, `git status`.
3. Флаги: `--timerange`, `-c`, `--spaces buy` (флаг + значение — отдельные токены).
4. Цепочки pandas: `df['close'].rolling(50).mean()` → токены `df`, `['close']`, `.rolling(50)`, `.mean()`. Индексация `['x']` даёт токен `lex.pd.column_access` с подстановкой имени колонки в карточку («столбец close — цена закрытия»).
5. Ключи JSON: `"dry_run": true` → `dry_run` (ключ) и `true` (значение; для `dry_run` значение имеет собственную карточку через override).
6. Классы ошибок в трейсбеках: `ModuleNotFoundError`, `KeyError` → сначала ищем в `errors/`, потом в `tokens/`.
7. Ключевые слова Python: `def, return, if, else, for, in, import, as, class, None, True, False`.
8. Остальные идентификаторы: ищем exact; если нет — помечаем `data-lex="unknown"` (серое подчёркивание, см. 2.6).

Границы токена не должны разрывать HTML-подсветку синтаксиса: аннотатор запускается **после** подсветки и оборачивает текстовые узлы, не трогая существующие `<span class="hljs-*">`.

### 2.3. Включение режима и визуал
- Глобальный переключатель в шапке приложения: «Ткни в непонятное: вкл/выкл». Дефолт для нового пользователя — **вкл** (состояние в профиле).
- На каждом блоке — иконка `?` в углу; при наведении: «Нажми на любое слово, чтобы прочитать по-русски». Иконка мигает один раз при первом показе блока в уроке (только первые 3 блока в жизни пользователя).
- Аннотированные токены: пунктирное подчёркивание цветом `--acc2`, курсор `help`. Категория задаёт оттенок: команды/флаги — синий, ключи конфига — зелёный, ошибки — красный, метрики — жёлтый. Это помогает новичку «прочитать структуру» блока до клика.
- Режим выкл: подчёркивания и `?` скрыты, клик не работает.

### 2.4. Карточка (popover)
Появляется по клику/тапу/Enter, закрывается по Esc/клику снаружи/скроллу за пределы. На десктопе — поповер с привязкой к токену; на мобильном — нижняя шторка.

Макет сверху вниз:
```
┌──────────────────────────────────────────┐
│ shift(1)                     [чип: pandas]│  ← токен моноширинно + категория
│ сдвиг на прошлую свечу       [🔊]         │  ← ru_name + озвучка (комп. D)
├──────────────────────────────────────────┤
│ Берёт значение из предыдущей строки …     │  ← ru_short
│ [Подробнее ▾]                              │  ← раскрывает ru_long
├──────────────────────────────────────────┤
│ Пример из урока 1.6:                       │
│   pos = signal.shift(1).fillna(0)          │  ← example.code, сам тоже аннотирован
├──────────────────────────────────────────┤
│ Не путать с: shift(-1) →                   │  ← contrast
│ Термин: Заглядывание в будущее →          │  ← ссылка в глоссарий (комп. E)
│ Впервые: урок 1.6 → · Прожито: 1.7 diff-игра →│
├──────────────────────────────────────────┤
│ [Проще]  [Не понятно → сообщить]           │
└──────────────────────────────────────────┘
```
- **[Проще]** заменяет `ru_short` на `ru_simple`; если `ru_simple` нет — кнопка скрыта, а событие логируется как запрос контента.
- **[Не понятно]** отправляет `lex_feedback {id, lesson, mode}` без формы — одна кнопка, без текста.
- В карточке выполняется контекстный override: аннотатор кладёт в `data-lex-scope="lesson:FT-04;block:cfg_min"`, поповер выбирает первый подходящий override.
- Для `column_access` карточка подставляет имя столбца: «`['ema_fast']` — обращение к столбцу датафрейма; ema_fast — быстрая скользящая средняя, которую стратегия сама добавила в populate_indicators». Имена стандартных столбцов (`open/high/low/close/volume/date/enter_long/exit_long/rsi/ema_*`) — в словаре; нестандартные → «столбец, созданный в этом коде — найди строку `df['<имя>'] =`» с автоссылкой на эту строку в том же блоке, если она есть.

### 2.5. Блочный режим «Перевести весь блок»
В углу блока — вторая кнопка «Подписи строк» (это и есть компонент B, см. §3). Компоненты A и B работают одновременно: в режиме подписей токены остаются кликабельными.

### 2.6. Неизвестные токены
- Серое пунктирное подчёркивание; клик даёт карточку «Пока нет объяснения. Мы записали, что оно нужно» + кнопка «Спросить наставника/ИИ» (если в приложении есть чат) с автопромптом: «Объясни новичку по-русски, что делает `X` в этом фрагменте: <блок>».
- Событие `lex_unknown_clicked {token, lesson, block}` — еженедельный отчёт топ-50 в бэклог контента.

### 2.7. Покрытие и контроль
Скрипт `lexicon:coverage`:
- прогоняет аннотатор по всем блокам всех уроков;
- считает долю токенов с записью по трекам;
- выводит топ-100 непокрытых токенов с числом вхождений;
- CI падает, если покрытие FT/FAI/Py < 95 % или Ф0–Ф5 < 85 % (после первичного наполнения; на старте — только предупреждение).

### 2.8. Производительность
- `lexicon.json` ≈ 600–900 записей ≈ 400–600 КБ; грузится один раз, кэшируется; `ru_long` и `example` для не-core записей — ленивый чанк по префиксу (`lex.ft.*`, `lex.pd.*`).
- Статические блоки аннотируются при сборке — нулевая стоимость в рантайме.
- Динамический аннотатор (терминал E1): ≤ 2 мс на строку; работает по `requestIdleCallback`.

---

## 3. Компонент B — Двуязычный переключатель

### 3.1. Три режима
| Режим | Что видно | Когда по умолчанию |
|---|---|---|
| **EN** | код как есть | ученик прошёл ≥ 5 интерактивов с кодом в режиме RU/ОБА и сам переключил |
| **RU** | код как есть + справа/снизу русская подпись к **каждой** строке; английские метки в выводе заменяются русскими | Py-01…Py-14, ВК1–ВК4, FT-01…FT-09, FAI-01…FAI-03 |
| **ОБА** | две колонки: слева код, справа подпись; в узком экране — подпись под строкой мелким шрифтом | 1.6–1.12, FT-10…FT-20, FAI-04…FAI-07 |

Переключатель — сегментированная кнопка `EN | RU | ОБА` в шапке каждого блока кода и глобально в настройках. Выбор сохраняется на пользователя; блочный выбор — на сессию.

### 3.2. Что именно подписывается
- **Код Python/стратегии** — одна подпись на строку. Пустые строки и строки с одной скобкой — без подписи (тире). Комментарии `#` на русском в исходнике уже являются подписью — дублировать не нужно; линтер это проверяет.
- **Конфиг JSON** — подпись на строку с ключом: `"stake_amount": "unlimited",` → «размер ставки: делить баланс на число слотов». Скобки — без подписи.
- **Команды терминала** — подпись на команду и, при `ОБА`, разбор флагов по строкам под командой:
  ```
  freqtrade backtesting -c user_data/config.json --strategy TutorialEmaRsi --timerange 20240101-20250601
  └ запустить проверку на истории
    -c … — какой конфиг взять
    --strategy … — какую стратегию проверять
    --timerange … — за какой период (с 1 янв 2024 по 1 июня 2025)
  ```
- **Вывод отчёта/терминала** — метки заменяются русскими в режиме RU (`Total profit % → Итоговая прибыль, %`), числа не трогаются; в режиме ОБА — `Итоговая прибыль, % (Total profit %)`. Словарь замен — это `lex.ft.report.*` с полем `ru_label`.

### 3.3. Формат подписей (sidecar)
Подписи хранятся отдельно от кода, чтобы код можно было копировать чистым:
```yaml
# content/lexicon/captions/FT-05/strategy_skeleton.yaml
block_id: FT-05:strategy_skeleton
source_hash: "sha1 первых 200 символов блока"   # линтер ловит рассинхрон
lines:
  1: "подключаем базовый класс стратегии и тип настраиваемого параметра"
  2: "подключаем библиотеку индикаторов"
  3: "подключаем таблицу данных"
  4: "—"
  5: "объявляем стратегию — наследуем от IStrategy"
  6: "версия интерфейса: 3 (колонки enter_long/exit_long)"
  7: "таймфрейм свечей: 1 час"
  8: "сколько свечей нужно на «прогрев» индикаторов"
  9: "жёсткий стоп: −10 %"
  10: "лестница выхода по прибыли: +6 % сразу, +2 % после 4 часов"
  ...
labels:                      # замены меток вывода (для блоков-отчётов)
  "Total profit %": "Итоговая прибыль, %"
```
Правила:
- подпись ≤ 60 знаков, в изъявительном или деепричастном залоге («считаем…», «проверяем…»), без английских слов, кроме имён из кода;
- подпись объясняет *намерение* строки, не пересказывает синтаксис («фильтр от свечей с нулевым объёмом», а не «сравниваем volume с нулём»);
- линтер `captions:lint`: каждая непустая строка имеет подпись или «—»; `source_hash` совпадает; нет строк > 60 знаков.

Авторинг: агент генерирует черновики подписей для всех блоков FT/Py/ВК (промпт в §9), методолог правит. Генерация без ревью в прод не попадает.

### 3.4. Рендеринг
- Режим ОБА: CSS-грид `1fr 1fr`, строки выравниваются по высоте (подпись может переноситься — тогда строка кода получает такую же высоту). При ширине < 720px — подпись под строкой, шрифт 0.85em, цвет `--muted`.
- Режим RU: подпись справа в одну колонку `2fr 1fr`; при узком экране — так же под строкой.
- Кнопка «Копировать» копирует **только код**, без подписей и без метки режима.
- Подписи не индексируются как код (aria-описание: «пояснение к строке N»).

### 3.5. Взаимодействие с интерактивами
Для интерактивов, где код меняется (Py-02 «Параметры портфеля», Py-03 калькулятор комиссии, E2 «Живой конфиг»): подписи привязываются не к номеру строки, а к **шаблонной строке** (`template_key`). Генератор кода интерактива отдаёт массив `{line, template_key}` и слой подставляет подпись по ключу. Значения подписываются с подстановкой: «размер ставки: {stake_amount} USDT на сделку».

---

## 4. Компонент C — Карточки ошибок (E1)

### 4.1. Схема карточки
```yaml
- id: lex.err.module_not_found
  match:
    regex: "ModuleNotFoundError: No module named '([\\w\\.]+)'"
    captures: [module]
  severity: blocker          # blocker | error | warning | info
  title: "Не найдена библиотека {module}"
  what: "Python не может найти пакет {module}: он не установлен в ТОМ окружении, из которого запущена команда."
  why_top3:
    - "не активировано виртуальное окружение (.venv) — команда ушла в системный Python"
    - "опечатка в import (panda вместо pandas)"
    - "пакет не установлен: pip install не выполнялся или упал"
  first_action:
    text: "Активируй окружение и поставь пакет:"
    commands:
      - "source .venv/bin/activate   # Windows: .venv\\Scripts\\activate"
      - "pip install {module}"
  if_not_helped:
    - "проверь, какой Python запускается: `which python` / `where python` — путь должен вести в .venv"
    - "для talib нужен системный TA-Lib: смотри раздел установки в документации Freqtrade"
  dont: "Не ставь пакет через `sudo pip` в системный Python — сломаешь окружение и получишь externally-managed-environment."
  lessons: ["Py-10", "FT-02"]
  related: [lex.err.externally_managed, lex.term.venv]
  how_to_read:                 # подсветка трейсбека
    focus: last_line
```

### 4.2. Где показываются
1. **Терминал-переводчик (E1):** любая строка вывода, совпавшая с `match`, получает красную метку «Что это?» → карточка.
2. **Инлайн в уроках:** блоки, где ошибки упомянуты в тексте (Py-08 `KeyError`, Py-10 `ModuleNotFoundError`, FT-02, FT-05 «забыли return»), — карточка вставляется свёрнутой сразу под блоком.
3. **«Разбор ошибки»** — отдельная страница/модалка в разделе «Помощь»: ученик вставляет свой трейсбек → матчер → карточка + подсветка. Если совпадений нет → общая карточка «Как читать трейсбек» + кнопка отправки трейсбека в ИИ-ассистент с промптом «объясни новичку по-русски, что сломалось и одно первое действие».
4. **Тренажёр FT-02 «Диагност установки»** использует те же карточки как банк заданий.

### 4.3. Подсветка трейсбека (how_to_read)
При показе трейсбека в E1/«Разборе ошибки»:
- последняя строка (тип + сообщение) — красная рамка, метка «① Читай отсюда: что случилось»;
- ближайшая сверху строка `File "…/user_data/strategies/X.py", line N` — жёлтая рамка, «② Твой файл и строка»;
- остальное — свёрнуто с подписью «внутренности библиотек — обычно не твоя ошибка».
Общая карточка «Как читать трейсбек»: «Трейсбек читают снизу вверх: последняя строка — что случилось, выше — где. Не читай всё; ищи свой файл».

### 4.4. Банк карточек: 20 базовых (MVP) + 4 дополнительных

| # | id | match (суть) | Сев. | Что это значит (кратко) | Что сделать первым |
|---|---|---|---|---|---|
| 1 | `module_not_found` | `ModuleNotFoundError: No module named 'X'` | blocker | Пакет не установлен в этом окружении | активировать `.venv`, `pip install X` |
| 2 | `syntax_error` | `SyntaxError: expected ':'` / `invalid syntax` | blocker | Python не понял строку: чаще всего нет двоеточия после `if/def/for/else` или не закрыта скобка/кавычка | открыть указанную строку, проверить `:` и парность скобок; смотреть строку **выше** — ошибка часто там |
| 3 | `indentation_error` | `IndentationError: expected an indented block` / `unexpected indent` | blocker | Отступы не совпадают: после `:` нужен блок с отступом в 4 пробела, все строки блока — одинаково | заменить табы на 4 пробела; выровнять строки под `if/def` |
| 4 | `name_error` | `NameError: name 'X' is not defined` | blocker | Переменная X ещё не создана или опечатка в имени | найти строку, где X должна была создаться (`X = …`); проверить регистр букв |
| 5 | `key_error` | `KeyError: 'X'` | blocker | В словаре/датафрейме нет поля X: столбец не создан в `populate_indicators`, опечатка или другое имя | `print(df.columns)`; проверить, что `df['X'] = …` есть и стоит **раньше** места использования |
| 6 | `type_error` | `TypeError: can't multiply sequence by non-int` / `unsupported operand type(s) for … 'str' and 'float'` | blocker | Пытаемся считать текст как число: `"0.1"` — это текст, `0.1` — число | убрать кавычки у числа или обернуть `float(x)` |
| 7 | `zero_division` | `ZeroDivisionError: division by zero` | error | Делим на ноль: пустой список (`len == 0`), нулевой объём, нулевая просадка | проверить знаменатель `if len(x) == 0: …`; для метрик — `if dd == 0` |
| 8 | `index_error` | `IndexError: list index out of range` | error | Просим элемент, которого нет: в списке из 5 свечей индексы 0…4 | проверить `len()`; для последнего элемента использовать `[-1]` |
| 9 | `value_error` | `ValueError: could not convert string to float: 'X'` | error | Текст не превращается в число: запятая вместо точки, символ валюты, пробел | почистить строку: `x.replace(',', '.').strip()` |
| 10 | `attribute_error` | `AttributeError: 'X' object has no attribute 'Y'` | blocker | У объекта нет такого метода/поля: опечатка (`df.closes`) или объект не тот (список вместо датафрейма) | проверить написание; `print(type(obj))` |
| 11 | `file_not_found` | `FileNotFoundError: [Errno 2] No such file or directory: 'X'` | blocker | Файла нет по указанному пути: команду запустили не из той папки или файл не создан | `ls`/`dir`; запускать из корня проекта; для конфига — `freqtrade new-config` |
| 12 | `json_decode` | `json.decoder.JSONDecodeError: Expecting ',' delimiter: line N column M` | blocker | Сломан `config.json`: лишняя/пропущенная запятая, кавычки, комментарий `//` в JSON | открыть строку N; в JSON нет комментариев и висячих запятых; проверить онлайн-валидатором |
| 13 | `cmd_not_found` | `freqtrade: command not found` / `'freqtrade' не является внутренней или внешней командой` | blocker | Оболочка не знает команду: не активировано окружение, где стоит Freqtrade | активировать `.venv`; проверить `pip show freqtrade` |
| 14 | `pip_no_version` | `ERROR: Could not find a version that satisfies the requirement freqtrade` / `Requires-Python >=3.x` | blocker | Твой Python старее, чем требует пакет | `python --version`; поставить поддерживаемую версию (сверить с документацией); создать `.venv` от неё |
| 15 | `externally_managed` | `error: externally-managed-environment` | blocker | Система запрещает ставить пакеты в системный Python — и правильно делает | создать и активировать `.venv`, ставить туда |
| 16 | `strategy_load` | `Impossible to load Strategy 'X'. This class does not exist or contains Python code errors.` | blocker | Freqtrade не нашёл класс X или файл не компилируется | имя класса == имя файла без `.py`; файл лежит в `user_data/strategies/`; запустить `python -m py_compile user_data/strategies/X.py` — покажет настоящую ошибку |
| 17 | `no_data` | `No data found. Terminating.` / `No history for X, spot, 1h found. Use freqtrade download-data` | blocker | Нет скачанных свечей для пары/таймфрейма/периода | `freqtrade download-data -c … --pairs X --timeframe 1h --timerange …`; проверить `list-data` |
| 18 | `pair_not_available` | `Pair X is not available on <exchange>` / `not compatible with exchange` | error | Такой пары нет на бирже или неверный формат (`BTCUSDT` вместо `BTC/USDT`) | исправить формат `BASE/QUOTE`; `freqtrade list-pairs`; убрать из whitelist |
| 19 | `rate_limit` | `RateLimitExceeded` / `429 Too Many Requests` / `DDoSProtection` | warning | Биржа ограничила частоту запросов — временная блокировка, не поломка | ничего не делать 1–5 минут; не перезапускать в цикле; для download-data — уменьшить число пар за раз |
| 20 | `auth_error` | `AuthenticationError` / `Invalid API-key, IP, or permissions for action` | blocker | Биржа не приняла ключ: неверный ключ, не тот IP (whitelist), нет прав Trade — или ключ вообще не нужен (dry-run) | если dry-run — очистить `key/secret`; иначе проверить IP-whitelist и права (урок 4.3) |
| 21 | `telegram_unauthorized` | `telegram … Unauthorized` / `Chat not found` | error | Неверный токен бота или не тот `chat_id`; бот ещё не получал от тебя `/start` | написать боту `/start`; получить chat_id через `@userinfobot`; проверить токен от BotFather |
| 22 | `insufficient_stake` | `Insufficient funds` / `Stake amount … too small` / `Minimum stake` | error | Размер ставки меньше минимального лота биржи или больше баланса | посмотреть минимальную сумму пары (`list-markets`); поднять `stake_amount` или `dry_run_wallet` |
| 23 | `setting_with_copy` | `SettingWithCopyWarning` | warning | pandas предупреждает: ты меняешь копию среза, а думаешь, что оригинал — классика циклов по строкам | переписать векторно через `df.loc[условие, 'колонка'] = 1` |
| 24 | `connection_error` | `ConnectionError` / `Temporary failure in name resolution` / `Max retries exceeded` | warning | Нет сети или биржа недоступна; бот сам повторит | проверить интернет; посмотреть статус биржи; не трогать позиции руками (урок П1) |

Для каждой карточки контент-часть заполняет полную схему §4.1; таблица — контракт минимума.

### 4.5. Ложные срабатывания
- `KeyError` в контексте FreqAI (`'&s-…'`) → override: «в FreqAI имена целевых колонок начинаются с `&s-`, признаков — с `%-`».
- `AuthenticationError` при `dry_run: true` → первое действие «очисти key/secret», а не «проверь IP».
- Матчер отдаёт максимум **одну** карточку на строку (по приоритету `severity`), остальные — в «см. также».

---

## 5. Компонент D — Озвучка формул (опционально, последняя волна)

### 5.1. Цель
Новичок читает `stake × |stoploss| ≤ 1–2 %` как набор значков. Озвучка даёт вербальную форму, которую можно запомнить: «размер ставки, умноженный на модуль стопа, — не больше одного-двух процентов депозита».

### 5.2. Данные
```yaml
# content/lexicon/formulas/formulas.yaml
- id: formula.risk_per_trade
  display: "stake × |stoploss| ≤ 1–2 % депозита"
  speech: "Размер ставки, умноженный на модуль стопа, — не больше одного-двух процентов депозита."
  lessons: ["FT-17", "3.3"]
  audio: "audio/formulas/risk_per_trade.mp3"   # если предзаписано
```
Обязательный список (≥ 30):

| id | display | speech |
|---|---|---|
| spread_bps | `spread_bps = (ask − bid) / mid × 10000` | «Спред в базисных пунктах равен разнице аска и бида, делённой на среднюю цену и умноженной на десять тысяч» |
| pnl_spot | `pnl = (exit − entry) × qty − fees` | «Прибыль равна цене выхода минус цена входа, умножить на количество, минус комиссии» |
| recovery | `R = DD / (1 − DD)` | «Чтобы отыграть просадку, нужно заработать просадку, делённую на единицу минус просадка» |
| ev | `EV = p × W − (1 − p) × L` | «Матожидание равно вероятности выигрыша, умноженной на средний выигрыш, минус вероятность проигрыша, умноженная на средний убыток» |
| breakeven_p | `p* = L / (W + L)` | «Безубыточная вероятность равна убытку, делённому на сумму выигрыша и убытка» |
| kelly | `f* = (b·p − q) / b` | «Доля Келли равна выплате, умноженной на вероятность, минус вероятность проигрыша, всё делить на выплату» |
| sharpe | `Sharpe = mean / std × √365` | «Шарп равен средней доходности, делённой на её разброс, умножить на корень из трёхсот шестидесяти пяти» |
| calmar | `Calmar = CAGR / MaxDD` | «Калмар равен годовой доходности, делённой на максимальную просадку» |
| zscore | `z = (spread − mean) / std` | «Зет равен спреду минус среднее, делить на стандартное отклонение» |
| obi | `OBI = (V_bid − V_ask) / (V_bid + V_ask)` | «Дисбаланс стакана равен объёму покупателей минус объём продавцов, делить на их сумму» |
| log_return | `r = ln(P_t / P_{t−1})` | «Логарифмическая доходность равна натуральному логарифму отношения сегодняшней цены к вчерашней» |
| max_streak | `ln(N) / ln(1/q)` | «Ожидаемая серия убытков равна логарифму числа сделок, делённому на логарифм единицы, делённой на вероятность убытка» |
| exec_dev | `(Paper − Backtest) / Backtest` | «Отклонение исполнения равно результату на бумаге минус результат бэктеста, делить на результат бэктеста» |
| position_size | `size = capital × risk% / stop_distance` | «Размер позиции равен капиталу, умноженному на долю риска, делённому на расстояние до стопа» |
| net_bps | `net = gross − fee − spread − slip` | «Чистый результат равен сырому минус комиссия, минус спред, минус проскальзывание» |
| il | `IL = 2√x / (1 + x) − 1` | «Непостоянная потеря равна два корня из икс, делить на один плюс икс, минус один» |
| liq_price | `P_liq = P × (1 − 1/leverage + MMR)` | «Цена ликвидации равна цене входа, умноженной на один минус один делить на плечо плюс поддерживающая маржа» |
| staking_real | `r = (1 + apy) × (P_end / P_start) − 1` | «Реальная доходность равна один плюс ставка, умножить на отношение конечной цены к начальной, минус один» |
| ci_bound | `±1.96 / √N` | «Плюс-минус один и девяносто шесть сотых, делённые на корень из числа наблюдений» |
| se | `σ / √n` | «Стандартная ошибка равна сигме, делённой на корень из эн» |
| risk_parity | `w_i ∝ 1 / σ_i` | «Вес стратегии обратно пропорционален её волатильности» |
| vector_bt | `pos = signal.shift(1) × returns` | «Позиция равна сигналу с прошлой свечи, умноженному на доходность» |
| stationary | `adf_p < 0.05 and kpss_p > 0.05` | «Ряд стационарен, если пи-значение теста ЭйДиЭф меньше пяти сотых, а теста КаПиЭсЭс — больше пяти сотых» |
| friction_year | `N × (2·fee + slip)` | «Годовое трение равно числу сделок, умноженному на двойную комиссию плюс проскальзывание» |
| dd | `DD = (peak − current) / peak` | «Просадка равна пику минус текущее, делить на пик» |
| ohlc_body | `body = |close − open|` | «Тело свечи равно модулю разности закрытия и открытия» |
| slippage_bps | `(avg_fill − best_ask) / best_ask × 10000` | «Проскальзывание в бипсах равно средней цене исполнения минус лучший аск, делить на лучший аск, умножить на десять тысяч» |
| hedge_spread | `spread = A − β × B` | «Спред равен цене первого актива минус бета, умноженная на цену второго» |
| alpha_beta | `R = α + β × R_market` | «Доходность стратегии равна альфа плюс бета, умноженная на доходность рынка» |
| growth_kelly | `g(f) = p·ln(1+bf) + (1−p)·ln(1−f)` | «Рост капитала равен вероятности выигрыша на логарифм один плюс бэ эф, плюс вероятность проигрыша на логарифм один минус эф» |

### 5.3. Правила чтения символов (для TTS без предзаписи)
| Символ | Читать |
|---|---|
| `×`, `*` | «умножить на» |
| `/`, `÷` | «делить на» / «делённое на» |
| `≤`, `>=` | «не больше», «не меньше» |
| `√` | «корень из» |
| `ln` | «натуральный логарифм» |
| `|x|` | «модуль икс» |
| `%` | «процентов» |
| `bps` | «базисных пунктов» |
| `σ` | «сигма» |
| `shift(1)` | «со сдвигом на одну свечу назад» |
| `P_t` | «цена в момент тэ» |
| `1e-4` | «одна десятитысячная» |

### 5.4. Реализация
- Приоритет: предзаписанные `mp3` (ru-RU, один диктор) для 30 обязательных формул → fallback `window.speechSynthesis` с голосом `ru-RU` и текстом `speech`.
- Кнопка 🔊 рядом с формулой в тексте урока и в карточке токена (если у токена есть `pronounce`). Второй клик — стоп.
- Настройка «Читать карточку при открытии» — выкл по умолчанию.
- Не блокировать UI, если TTS недоступен: кнопка скрывается, в лог `tts_unavailable`.
- Ограничение: озвучиваются только формулы из `formulas.yaml`; произвольный код не читается (получится каша).

---

## 6. Компонент E — Глоссарий-паутина

### 6.1. Источник данных
Блок «Термины урока» есть в каждом уроке в двух формах:
- полная: `Просадка депозита (drawdown / DD) — Снижение баланса…`;
- ссылочная (без определения): `Волатильность`, `Бэктест`, `Гипотеза` — означает «термин уже введён раньше».

Скрипт `terms:extract` проходит уроки **в порядке курса** (Ф0 → Ф5 → Бонусы → Py → М → ВК → П → FT → FAI, как в документе, номера 1–227) и строит `terms.generated.yaml`:
```yaml
- id: term.drawdown
  ru: "Просадка"
  ru_aliases: ["Просадка депозита", "Просадка (Drawdown)", "Max Drawdown", "Максимальная просадка"]
  en: ["drawdown", "DD", "max drawdown"]
  first_lesson: "0.12"              # первый урок с ПОЛНЫМ определением
  canonical_def: "Снижение баланса счета от максимальной исторической точки до локального минимума."
  definitions:                      # все варианты по урокам
    - lesson: "0.12"; text: "…"
    - lesson: "5.5";  text: "Падение капитала от предыдущего пика до текущей точки."
    - lesson: "FT-09"; text: "Максимальное падение кривой капитала от пика; absolute — в валюте, relative…"
  mentioned_in: ["0.12","1.10","3.3","3.6","5.5","FT-09","FT-14","FT-17"]   # уроки с термином в блоке
  lived_in:                          # интерактивы, где термин «прожит»
    - {lesson: "0.12", interactive: "Интерактивный калькулятор асимметрии потерь"}
    - {lesson: "5.5",  interactive: "Сколько убытков подряд тебя ждёт"}
    - {lesson: "FT-09", interactive: "Прочитай отчёт в правильном порядке"}   # из ТЗ-3
  phase: "Ф0"
  category: risk                     # market | data | stats | risk | code | infra | psychology | freqtrade | defi
  related: [term.recovery_asymmetry, term.kill_criteria, term.calmar]
  tokens: [lex.ft.report.max_drawdown, lex.ft.strat.max_allowed_drawdown]   # связанные токены кода
```
Правила дедупликации:
1. Нормализация: нижний регистр, убрать содержимое скобок, ё→е, убрать «(в коде)», «депозита», «капитала».
2. Слияние по совпадению нормализованного `ru` **или** любого `en`.
3. `canonical_def` = определение из `first_lesson`; ручные переопределения — в `terms.overrides.yaml` (там же `related`, `category`, `lived_in` для топ-150 терминов — курируется методологом, скрипт только предлагает).
4. Термины-ссылки без определения нигде (в текущих текстах их нет, но проверять) → отчёт «сирота».
5. Одинаковый `ru` с разным смыслом (напр. «Спред» — спред стакана в 0.4 и спред пары в 3.2) → скрипт помечает `ambiguous: true` при низком пересечении слов в определениях (Жаккар < 0.15); методолог решает: разделить на `term.spread_bid_ask` и `term.spread_pairs`.

`lived_in` авто-заполняется всеми `[Симулятор: …]` уроков из `mentioned_in`; далее ручная чистка (чтобы «Просадка» не вела на «Мини-игра Гонка блоков»).

### 6.2. Страницы
**Индекс глоссария** (`/glossary`):
- поиск (по ru, en, транслитерации, опечатки);
- фильтры: фаза, категория, «только прожитые», «только не прожитые»;
- список карточек: `ru — en`, одна строка `canonical_def`, чипы `Ф0 · риск`, бейдж «прожит» (см. 6.4).

**Страница термина** (`/glossary/term.drawdown`):
```
Просадка · drawdown / DD                              [🔊] [прожит ✓]
Категория: риск · Фаза 0 · Впервые: урок 0.12 →

Определение (0.12): Снижение баланса счёта от максимальной точки до локального минимума.
Как объясняется дальше ▾
   5.5 — Падение капитала от предыдущего пика…
   FT-09 — В отчёте бэктеста: absolute/relative…

Где прожить:
   ▶ 0.12 Калькулятор асимметрии потерь        [пройдено]
   ▶ 5.5  Сколько убытков подряд тебя ждёт     [не пройдено]
   ▶ FT-09 Прочитай отчёт в правильном порядке

В коде это:  Max Drawdown (отчёт) · max_allowed_drawdown (protections)

Связано: асимметрия восстановления → · Calmar → · kill-критерии →
Встречается в уроках: 0.12 · 1.10 · 3.3 · 3.6 · 5.5 · FT-09 · FT-14 · FT-17

Цепочка «что нужно знать до»: Пик капитала → Доходность → Просадка → Calmar
```
**Паутина** (`/glossary/map`, вторая очередь): граф терминов, узлы раскрашены по категории, размер — по числу `mentioned_in`, рёбра — `related`. Клик по узлу — карточка; «прожитые» узлы залиты, остальные контурные. Нужен как навигация «что я ещё не проходил», а не как украшение.

### 6.3. Ссылки из уроков
- В тексте урока **первое** упоминание термина (по `ru_aliases`) в каждом уроке становится ссылкой на страницу термина с тултипом = `canonical_def` (а в уроке `first_lesson` — не ссылкой, а якорем «здесь объясняется впервые»). Разметка — на build.
- Из карточки токена (§2.4) — поле `term`.
- Из блока «Термины урока» — каждый термин → страница термина; рядом «↩ впервые в …», если урок не `first_lesson`.
- В конце урока — блок «Термины этого урока, которые ты уже прожил / ещё нет».

### 6.4. Статус «прожит»
Термин считается прожитым, если пользователь **завершил** хотя бы один интерактив из `lived_in` (событие завершения интерактива уже есть в приложении — использовать его). Статусы: `не встречал` / `читал` (открывал урок из `mentioned_in`) / `прожил`. Хранится в прогрессе пользователя: `glossary_progress: {term_id: {status, at}}`.

### 6.5. Ручная курация (объём для контента)
- Топ-150 терминов (по числу `mentioned_in` + весь FT/FAI/Py): проверить `canonical_def`, `related` (3–6 связей), `lived_in` (1–3 интерактива), `category`, для 60 самых частых — `prerequisites` (цепочка).
- Остальные — авто, с пометкой «определение из урока X» без правок.

---

## 7. Первичный словарь токенов (seed)

Минимальный контракт по объёму: ~450 записей до Wave A завершения. Ниже — обязательный костяк с `ru_name`; `ru_short/ru_long/example` дописывает контент по правилам §1.3. Пометка ★ — `core` (обязателен `ru_simple`).

### 7.1. Python (Py-01…Py-14) — 40 записей
★`print` вывести на экран · ★`=` положить значение в ячейку · ★`==` проверить равенство · `!=` не равно · `<` `>` `<=` `>=` сравнения · ★`if` если · ★`else` иначе · `elif` иначе если · ★`:` начало блока · ★отступ 4 пробела · ★`for … in` перебрать по очереди · ★`def` объявить функцию · ★`return` вернуть результат · `None` пусто/ничего · `True`/`False` да/нет · ★`[ ]` список · ★`[0]` первый элемент · ★`[-1]` последний · ★`[-3:]` последние три · ★`len()` длина · `sum()` сумма · `range()` ряд чисел · ★`{ "k": v }` словарь · ★`["close"]` доступ по ключу · ★`f"…{x}…"` строка с подстановкой · ★`import` подключить библиотеку · `as` под коротким именем · `str` текст · `int` целое · `float` дробное · `class` объявить тип/стратегию · `self` «этот объект» · `assert` проверка-утверждение · `try/except` перехват ошибки · `while` пока · `and/or/not` и/или/не · `&` `|` и/или для столбцов · `lambda` короткая функция · `#` комментарий

### 7.2. pandas / numpy — 45 записей
★`pd` pandas · ★`np` numpy · ★`DataFrame`/`df` таблица свечей · ★`df['close']` столбец цены закрытия · ★`.shift(1)` сдвиг на прошлую свечу · ★`.shift(-1)` подглядывание в будущее (утечка) · ★`.rolling(N)` скользящее окно · `.mean()` среднее · `.std()` разброс · `.ewm(span=)` экспоненциальное сглаживание · ★`.pct_change()` изменение в долях · `.diff()` разность с прошлой строкой · `.cumsum()` накопленная сумма · `.fillna(0)` заполнить пропуски нулём · `.dropna()` убрать пропуски · ★`.loc[условие, 'кол'] = 1` записать сигнал туда, где условие истинно · `.iloc[i]` элемент по номеру · `.astype(int)` привести к целому · `.apply()` применить функцию · ★`bfill`/`ffill` заполнение назад/вперёд (bfill — утечка) · ★`center=True` окно с центром (утечка) · `.resample('1D')` пересобрать в другой таймфрейм · `label='right'`/`closed='right'` метка в конце интервала · `.isin()` входит ли в список · `.duplicated()` дубли · `.is_monotonic_increasing` строго возрастает · `.index` метки строк · `.columns` имена столбцов · `pd.to_datetime` в дату · `pd.date_range` ряд дат · `pd.read_feather` прочитать файл свечей · `np.log` логарифм · `np.exp` экспонента · `np.sqrt` корень · `np.percentile` квантиль · `np.where` если-иначе по столбцу · `np.corrcoef` корреляция · `np.random.choice` случайный выбор · `np.isclose` примерно равно · `ddof=1` поправка Бесселя · `scipy.stats` статистика · `kurtosis`/`skew` эксцесс/асимметрия · `adfuller`/`kpss` тесты стационарности · `ta.EMA`/`ta.RSI` индикаторы TA-Lib · `timeperiod` длина окна индикатора

### 7.3. Freqtrade — конфиг — 45 записей
★`dry_run` песочница (true) / реальные деньги (false) · ★`dry_run_wallet` виртуальный баланс · ★`max_open_trades` сколько сделок одновременно · ★`stake_currency` валюта ставки · ★`stake_amount` размер ставки · ★`"unlimited"` делить баланс на слоты · `tradable_balance_ratio` доля баланса в работе · `fiat_display_currency` валюта отображения · `bot_name` имя бота · `exchange` биржа · `name` название биржи · ★`key`/`secret` API-ключи (пусто для dry-run) · ★`pair_whitelist` белый список пар · ★`pair_blacklist` чёрный список · `pairlists` конвейер отбора пар · `StaticPairList` фиксированный список · `VolumePairList` топ по объёму · `PriceFilter`/`SpreadFilter`/`AgeFilter` фильтры цены/спреда/возраста · `max_spread_ratio` максимальный спред · `entry_pricing`/`exit_pricing` откуда брать цену заявки · `use_order_book` смотреть в стакан · `order_book_top` уровень стакана · `order_types` тип заявок · `limit`/`market` лимитная/рыночная · ★`unfilledtimeout` срок жизни неисполненной заявки · `fee` комиссия · `api_server` веб-панель/API · `enabled` включено · ★`listen_ip_address` где слушать (127.0.0.1 = только этот компьютер) · `listen_port` порт · `username`/`password` логин/пароль панели · `ws_token`/`jwt_secret_key` секреты доступа · `telegram` уведомления · `token` токен бота · ★`chat_id` твой ID в Telegram · `freqai` настройки ML · `train_period_days` длина окна обучения · `backtest_period_days` шаг переобучения · `identifier` имя модели · `feature_parameters` параметры признаков · `include_timeframes` таймфреймы признаков · `logging`/ротация логов

### 7.4. Freqtrade — CLI и терминал — 45 записей
★`freqtrade` сама программа · `--version`/`-V` показать версию · ★`create-userdir` создать рабочую папку · `--userdir` где папка · ★`new-config` визард конфига · ★`-c`/`--config` какой конфиг · `show-config` итоговый конфиг · ★`download-data` скачать свечи · ★`--timerange` период (формат `ГГГГММДД-ГГГГММДД`) · ★`--timeframe` таймфрейм · `--pairs` какие пары · `--erase` стереть и скачать заново · `list-data` что уже скачано · ★`backtesting` проверка на истории · ★`--strategy`/`-s` какая стратегия · `--export trades` сохранить сделки · `plot-dataframe` нарисовать сигналы · `-p` пара для графика · `--indicators1/2` какие индикаторы рисовать · `plot-profit` кривая капитала · ★`lookahead-analysis` детектор подглядывания · ★`recursive-analysis` детектор недогретых индикаторов · `--startup-candle` сколько свечей на прогрев · ★`hyperopt` подбор параметров · `--hyperopt-loss` критерий качества · `--spaces` какие параметры перебирать · `--epochs` число попыток · `-j` число потоков · `hyperopt-show --best` лучшие результаты · ★`trade` запустить бота · `install-ui` поставить панель · `test-pairlist` что отберёт список пар · `list-pairs`/`list-markets` доступные пары · `webserver` режим панели без торговли · `python -m venv .venv` создать окружение · ★`source .venv/bin/activate` включить окружение · ★`pip install` поставить пакет · `pip install -U` обновить · `pip show` информация о пакете · `ls`/`dir` показать файлы · `head -40` первые 40 строк · `ssh -L` туннель к серверу · `docker pull/compose` образ/сборка · `git status/diff/commit` версии кода · `--help` справка

### 7.5. Freqtrade — стратегия — 40 записей
★`IStrategy` базовый класс стратегии · `INTERFACE_VERSION = 3` версия интерфейса · ★`timeframe` таймфрейм стратегии · ★`startup_candle_count` свечи на прогрев · ★`stoploss` стоп-лосс в долях · ★`minimal_roi` лестница выхода по прибыли · `trailing_stop` трейлинг-стоп · `trailing_stop_positive` шаг подтяжки · `trailing_stop_positive_offset` с какой прибыли включать · `trailing_only_offset_is_reached` только после offset · ★`populate_indicators` посчитать индикаторы · ★`populate_entry_trend` условия входа · ★`populate_exit_trend` условия выхода · `metadata` информация о паре · ★`enter_long`/`exit_long` сигнальные колонки · `enter_short`/`exit_short` для шортов · `can_short` разрешить шорты · ★`volume > 0` фильтр пустых свечей · `IntParameter`/`DecimalParameter` настраиваемый параметр · `space='buy'` пространство оптимизации · `.value` текущее значение параметра · `protections` защиты · `StoplossGuard` пауза после серии стопов · `MaxDrawdown` стоп при просадке · `CooldownPeriod` пауза после сделки · `lookback_period_candles` окно наблюдения · `trade_limit` число сделок-триггер · `stop_duration_candles` длительность паузы · `max_allowed_drawdown` допустимая просадка · `only_per_pair` по паре или по всем · `informative_pairs` дополнительные пары/ТФ · `merge_informative_pair` слить с учётом лага · `custom_stoploss` программный стоп · `confirm_trade_entry` подтверждение входа · `adjust_trade_position` докупка (DCA) · `populate_any_indicators` признаки FreqAI · `%-` признак модели · `&s-` целевая переменная · `do_predict` модель уверена в данных · `@property` вычисляемое свойство

### 7.6. Отчёт бэктеста и метрики — 30 записей (все с `ru_label` для режима RU)
★`Total profit %` итоговая прибыль, % · `Absolute profit` прибыль в валюте · `CAGR` годовая доходность · `Sharpe` доходность на единицу риска · `Sortino` то же, но только по убыточной волатильности · `Calmar` доходность к максимальной просадке · ★`Max Drawdown` максимальная просадка · `Drawdown (absolute/relative)` в валюте / в долях · `Win / Draw / Loss` прибыльные / нулевые / убыточные · ★`Win rate` доля прибыльных · ★`Profit factor` сумма прибылей / сумма убытков · `Expectancy` средний результат сделки в R · `Avg duration` средняя длительность · `Trades` число сделок · `Left open trades` открытые на конец теста · `Fee` комиссия в расчёте · `Best/Worst pair` лучшая/худшая пара · `Exit reason` причина выхода · `roi` выход по прибыли · `stop_loss` выход по стопу · `exit_signal` выход по сигналу · `trailing_stop_loss` по трейлингу · `force_exit` закрыто вручную · `Buy&Hold` купил и держал (бенчмарк) · `In-sample`/`Out-of-sample` на данных подбора / на невиданных · `Execution Deviation` отклонение исполнения · `bps` базисный пункт = 0,01 % · `R` единица риска · `PnL` прибыль и убыток · `OHLCV` открытие/макс/мин/закрытие/объём

### 7.7. Telegram-команды — 10 записей (с уровнем опасности из FT-19)
`/status` открытые позиции (0) · `/profit` сводка (0) · `/daily` по дням (0) · `/balance` баланс (0) · `/stopentry` прекратить новые входы (1) · `/forceexit` закрыть позиции руками (2) · `/stop` остановить бота (2) · `/restart` перезапустить (2) · `/reload_config` перечитать конфиг (3) · `/start` запустить/разбудить бота

### 7.8. Слова терминала/логов — 15 записей
`Traceback (most recent call last)` трейсбек, читать снизу · `File "…", line N` файл и строка · `INFO`/`WARNING`/`ERROR` уровни логов · `DEPRECATED` устарело, скоро уберут · `PASS`/`FAIL` прошёл / не прошёл · `exit code 1` завершилось с ошибкой · `$`/`>` приглашение ввода · `…` продолжение · `usage:` как пользоваться · `Successfully installed` установлено · `Requirement already satisfied` уже стоит · `Killed`/`OOM` не хватило памяти · `Permission denied` нет прав · `Connection refused` соединение отклонено

---

## 8. Интеграция по урокам (где что включается)

| Трек / уроки | A «Ткни» | B подписи (дефолт) | C ошибки | D формулы | E глоссарий |
|---|---|---|---|---|---|
| Ф0 (0.1–0.20) | все `code`-строки (короткие однострочники «Глубже») | нет (однострочники получают подпись через A) | — | 0.4, 0.10, 0.11, 0.12, 0.14, 0.16, 0.18 | ссылки на первые упоминания |
| Ф1 (1.1–1.12) | все блоки | ОБА | 1.6, 1.7 (`shift(-1)` как «ошибка без сообщения») | 1.1, 1.4, 1.6, 1.8, 1.10, 1.11 | + `prerequisites` |
| Ф2–Ф5 | все блоки | ОБА | 4.1, 4.4 (логи), 4.5 | 2.5, 3.2, 3.3, 3.4, 4.5, 5.2, 5.5, 5.7 | да |
| Бонусы | все `code` | — | — | Б2, Б3, Б5, Б11 | да |
| Py-01…Py-14 | все блоки + вывод консоли интерактивов | **RU** | Py-03 (TypeError), Py-05 (IndexError), Py-08 (KeyError), Py-10 (ModuleNotFound), Py-14 | — | да |
| Матфак М1–М48 | все `python`-вставки | ОБА | — | М6, М9, М11, М12, М30, М31, М44, М47 | да |
| ВК1–ВК4 | все блоки | RU | ВК3 (протокол traceback), ВК4 | — | да |
| П1–П56 | таблицы протоколов не трогаем | — | — | П20, П22, П38 | все термины психологии |
| FT-01…FT-09 | все блоки, конфиги, таблицы | **RU** | FT-02 (банк 13–15), FT-05 (16), FT-08 (17), FT-09 | FT-05 | + `tokens` |
| FT-10…FT-20 | все + эмулятор Telegram | ОБА | FT-19 (19–21), FT-20 | FT-13, FT-17 | да |
| FAI-01…FAI-07 | все | RU для FAI-01…03, ОБА далее | FAI-02 (KeyError с `&s-`) | — | да |

---

## 9. Волны, задачи агенту, промпты для генерации черновиков

### Wave L-0 (фундамент, 1 неделя)
1. Схемы `tokens/errors/terms/formulas/captions`, валидатор, `lexicon:build`, `lexicon:index`.
2. Скрипт `terms:extract` + отчёт дублей/сирот/ambiguous.
3. Скрипт `lexicon:migrate-tooltips`.
4. Аннотатор (build) для `<pre><code>`/`<code>`/таблиц; рантайм-аннотатор для строк.
5. Заглушка поповера с `ru_name/ru_short`.
6. `lexicon:coverage` с отчётом (без порога).
**DoD:** отчёт покрытия по всем 227 урокам; топ-300 непокрытых токенов в файле.

### Wave L-1 (компонент A + seed, 2 недели)
1. Наполнение §7.1–7.8 (≈ 450 записей), `ru_simple` для ★.
2. Полный поповер §2.4 (пример, contrast, ссылки, «Проще», фидбек), мобильная шторка, клавиатура.
3. Контекстные overrides для FT-04, FAI-02, Py-05.
4. Порог CI: Py/FT/FAI ≥ 95 %.

### Wave L-2 (компонент C, 1 неделя)
1. 20 карточек MVP (§4.4 №1–20) полной схемы; матчер; подсветка трейсбека; страница «Разбор ошибки».
2. Подключение к E1 и инлайн в Py-08/10, FT-02/05/08.
3. +4 карточки (21–24).

### Wave L-3 (компонент B, 2 недели)
1. Рендер трёх режимов, sidecar-формат, линтер, «копировать только код».
2. Черновики подписей для всех блоков Py, ВК, FT, FAI (≈ 110 блоков) — генерирует агент, правит методолог.
3. `template_key` для динамических интерактивов (Py-02, Py-03, E2).
4. Дефолты режимов по §3.1.

### Wave L-4 (компонент E, 2 недели)
1. Страницы индекса и термина; ссылки первого упоминания; блок в конце урока.
2. Статус «прожит» через события интерактивов.
3. Ручная курация топ-150; `prerequisites` для топ-60.
4. Паутина (граф) — после всего остального.

### Wave L-5 (компонент D, 1 неделя, опционально)
1. `formulas.yaml` (30 записей), кнопка 🔊, SpeechSynthesis-fallback, правила чтения.
2. Предзапись 30 mp3 одним диктором.

### Промпты для генерации черновиков (агент → контент на ревью)
**Карточки токенов:**
> Ты объясняешь программирование торгового бота человеку, который не знает ни английского, ни программирования. Для токена `{token}` из фрагмента:
> ```
> {block}
> ```
> (урок {lesson}) заполни поля YAML по схеме: ru_name (1–4 слова), ru_short (≤140 знаков, что делает ИМЕННО ЗДЕСЬ), ru_long (2–5 предложений: механика → зачем → типичная ошибка новичка), ru_simple (одно предложение для 12-летнего), pronounce (как произнести по-русски). Не используй английских слов, кроме самого токена и имён из кода. Не переводи, а объясняй.

**Подписи строк:**
> Для каждой непустой строки кода ниже напиши подпись ≤ 60 знаков, объясняющую намерение строки (не синтаксис), по-русски, без английских слов кроме имён из кода. Для строк, где уже есть русский комментарий, ставь «—». Верни YAML `lines: {номер: подпись}`.

**Карточки ошибок:**
> Заполни схему карточки ошибки для `{сообщение}`: title, what (что это значит, без жаргона), why_top3, first_action (одна команда или одно действие), if_not_helped (2 пункта), dont (одна запрещённая реакция). Аудитория — новичок без английского, контекст — Freqtrade/Python/pip. Не выдумывай флаги и команды, которых нет в документации; если не уверен — напиши «сверь с документацией».

Все черновики попадают в `*.draft.yaml` и в прод не собираются, пока не переименованы ревьюером.

---

## 10. Приёмочные критерии и тесты

### 10.1. Функциональные
- [ ] В уроке FT-05 в блоке стратегии каждый из токенов `IStrategy, INTERFACE_VERSION, timeframe, startup_candle_count, stoploss, minimal_roi, populate_indicators, ta.EMA, timeperiod, df.loc, shift(1), enter_long, volume, return` даёт карточку с примером из этого же урока.
- [ ] В FT-04 клик по `"key": ""` показывает override «для песочницы должно быть пусто», а в Py-08 клик по `candle["close"]` — карточку про ключ словаря.
- [ ] В FT-09 таблица метрик в режиме RU показывает русские метки, в ОБА — обе; числа не меняются.
- [ ] Вставка в «Разбор ошибки» текста `ModuleNotFoundError: No module named 'panda'` даёт карточку №1 с подстановкой `panda` и подсказкой «опечатка: pandas».
- [ ] Вставка `KeyError: '&s-close_price'` даёт карточку №5 с FreqAI-override.
- [ ] Страница `term.look_ahead_bias`: first_lesson = 1.7, lived_in содержит «Найди утечку: diff-игра» и FT-11, tokens содержит `lex.pd.shift_neg`, `lex.ft.cli.lookahead_analysis`.
- [ ] После завершения интерактива «Найди утечку: diff-игра» термин получает статус «прожит» в индексе и в конце урока 1.7.
- [ ] Кнопка «Копировать» в режиме ОБА копирует только код; вставка в редактор компилируется (проверить на FT-05).
- [ ] Всё доступно с клавиатуры; поповер имеет `role="dialog"`, закрывается Esc.

### 10.2. Автотесты
- Юнит: токенизатор (100 фикстур строк → ожидаемые ID), матчер ошибок (по 2 позитивных + 1 негативный пример на карточку), дедупликатор терминов (10 кейсов слияния/разделения).
- Снапшот: аннотированный HTML пяти эталонных блоков (Py-14, FT-04 конфиг, FT-05 стратегия, FT-09 отчёт, трейсбек Py-10).
- Линтеры в CI: схема, покрытие (пороги), sidecar-подписи (длина, hash), «нет английских слов в русских полях» (белый список: имена из `match`).
- Производительность: аннотация страницы FT-20 (самый большой урок) ≤ 50 мс в рантайме (статика — 0).

### 10.3. Метрики после запуска
- доля кликов по токенам, приходящаяся на `unknown` (цель < 5 % через месяц);
- доля «Проще» / «Не понятно» на карточку — топ-20 карточек на переписывание;
- доля учеников FT-трека, у которых режим B включён на ≥ 3 уроках (ожидание > 70 %);
- время от вставки трейсбека до ухода со страницы «Разбор ошибки» (если < 10 с — карточка не читается, проверить);
- доля терминов со статусом «прожит» у учеников, дошедших до FT-09 (цель ≥ 40 % терминов Ф0–Ф1).

---

## 11. Открытые решения (нужен ответ владельца до старта)
1. Порядок «впервые объяснён»: строго по номерам 1–227 или по рекомендованной траектории новичка (Ф0 → Py → Ф1 → …)? Предложение: по номерам + ручной override для ~20 терминов (например, `DataFrame` впервые в Py-10, а не в 1.1).
2. Транслитерация в карточках (`шифт один`) показывать всегда или только по клику 🔊? Предложение: всегда мелким серым — это единственный способ новичку *произнести* слово при вопросе наставнику.
3. Куда идёт кнопка «Спросить» для неизвестных токенов — во внутренний ИИ-ассистент или просто копирует промпт в буфер? Зависит от наличия ассистента в приложении.
4. Озвучка: предзапись (стоимость диктора) или только браузерный TTS на старте?

-------------------------------------------

# Спецификации для реализации: FAI-01 «Стажёр рядом с опытным» и FAI-02 «Прошлое / будущее: разложи карточки»

Документ для агента-разработчика. Обе спеки следуют методпринципам ТЗ-3: один интерактив = одно заблуждение; числа и код — из текста урока; русскоязычный новичок без английского; сквозной персонаж Алексей (депозит 1000 USDT в dry-run).

---

## 0. Общее для обоих интерактивов

### 0.1. Место в курсе
- **FAI-01** → урок 221 (FreqAI: зачем он нужен после базовой стратегии). Опирается на FT-16 (OOS = 50–70% от IS — норма; лучше — ищи утечку), 1.10 (лучший Шарп на шуме), 1.9 (IS/OOS).
- **FAI-02** → урок 222 (Признаки и целевые значения). Опирается на 1.7 (шесть источников утечки), FT-05 (merge informative без лага), FT-11 (lookahead-analysis), FAI-03 (скейлер по всей истории).

### 0.2. Технические рамки
- Реализация — самодостаточный модуль (React/Vue/vanilla — по стеку приложения), без внешних сетевых запросов, все данные генерируются локально.
- Детерминированный ГПСЧ с сидом (например, mulberry32). Сид хранится в состоянии интерактива и попадает в URL/локальное хранилище — чтобы ученик мог показать «свой» прогон куратору.
- Вся логика симуляции/проверки — **чистые функции** без DOM, покрыты юнит-тестами (см. п. 3.3).
- Адаптив: ≥ 360 px ширины. На мобильном — вертикальная раскладка (график/карточки сверху, панель снизу).

### 0.3. Языковой слой (обязателен, раздел 6 ТЗ-3)
- Любой английский токен в коде/подписях (`%-rsi`, `&s-up`, `bfill`, `shift(-1)`, `center=True`, `rolling`, `merge_informative_pair`, `IS`, `OOS`, `do_predict`) — кликабельный чип. Клик → всплывающая карточка: русское название, одно предложение «что это делает», пример, ссылка на урок, где термин введён. Словарь — общий для приложения (`glossary.json`), ключи перечислены в спеках ниже.
- Переключатель отображения: «англ. / рус. подписи / оба». В режиме «рус.» имена колонок остаются как есть (их нельзя переводить — это код), но справа появляется русская подпись.
- Английские аббревиатуры в интерфейсе заменяются: IS → «обучающий отрезок (IS)», OOS → «проверочный отрезок (OOS)», ML → «ML-слой (машинное обучение)». Первое упоминание — с расшифровкой, далее допустимо кратко.

### 0.4. Доступность
- Все элементы управления доступны с клавиатуры (ползунок — стрелки; drag&drop имеет альтернативу «выбрать карточку → выбрать корзину» кнопками).
- Цвета не единственный носитель смысла: у кривых разная толщина/штрих + подпись на графике; у корзин — иконки и текст.
- Палитра дружественная к дальтонизму: база — серый `#6B7280` сплошная; ML-слой — оранжевый `#F59E0B` сплошная; зона OOS — светло-синяя заливка `#DBEAFE` 40%; ошибка — красный с иконкой ✗, успех — зелёный с ✓.

### 0.5. Аналитика (единый формат событий приложения)
`{interactive_id, lesson_id, user_id, session_seed, event, payload, ts}`. Список событий — в каждой спеке.

---

## 1. FAI-01 «Стажёр рядом с опытным» (СИМ + мини-ИГР)

### 1.1. Цель и заблуждение
**Ломаемое заблуждение:** «Если базовая стратегия убыточна или никакая, добавлю FreqAI — машинное обучение найдёт закономерность и исправит её».

**Что должен вынести ученик (3 факта, проверяемых в интерактиве):**
1. На обучающем отрезке (IS) кривая с ML-слоем выглядит блестяще **всегда**, независимо от качества базы — потому что модель запоминает ответы. Красота IS ничего не доказывает.
2. На проверочном отрезке (OOS) ML-слой **усиливает то, что уже есть в базе**: у информативной базы — прибавка в пределах 20–30%; у шумовой — минус (больше сделок → больше комиссий); у систематически ошибочной — ускоренный слив.
3. Отношение результата OOS/IS для ML-слоя — диагностика подгонки (норма 50–70%, из FT-16); у базы без параметров это отношение ≈ 100%.

**Метафора урока (использовать в текстах):** база — «опытный сотрудник», ML-слой — «стажёр». Стажёр учится у сотрудника: если сотрудник систематически ошибается, стажёр научится ошибаться быстрее и увереннее.

### 1.2. Пользовательский сценарий (обязательный поток)
Интерактив — не «покрутил ползунок — посмотрел», а пятишаговый цикл с предсказанием до раскрытия (иначе не будет отработки действия).

**Шаг 1. Настройка базы.** Ползунок «Качество базовой стратегии» (0–100). Под ползунком — четыре зоны с подписями: «Систематически ошибается» (0–35), «Шум — не хуже и не лучше монетки» (36–55), «Слабый край» (56–75), «Уверенный край» (76–100). Отметка безубыточности ≈ 51 (вычисляется, см. 1.4). Кнопки-пресеты: **«База убыточна» (Q=20)**, **«База — шум» (Q=48)**, **«База в плюсе» (Q=80)**.

**Шаг 2. Показ IS (обучающего отрезка).** На графике видны только первые 480 свечей: серая кривая «База» и оранжевая «База + ML-слой». Правая часть графика (OOS) затемнена шторкой с надписью «Проверочный отрезок скрыт. Так видит мир hyperopt» (движок E7-подобная граница). Панель метрик показывает только колонку IS.

**Шаг 3. Предсказание.** Модалка-вопрос: «Что стажёр (ML-слой) сделает с результатом на проверочном отрезке?» Три кнопки: «Улучшит», «Почти не изменит», «Ухудшит». Без ответа шторку открыть нельзя. Ответ фиксируется в событиях.

**Шаг 4. Раскрытие OOS.** Шторка уезжает анимацией (600 мс), рисуются кривые на свечах 481–720, панель заполняется колонкой OOS и строкой «OOS/IS». Появляется вердикт (п. 1.6) и оценка предсказания («Ты ждал улучшения — стажёр ускорил слив на −X%»).

**Шаг 5. Повтор.** Кнопки: «Новый прогон (другой шум)» (новый сид при том же Q), «Медиана 100 прогонов» (переключатель режима отображения), «Другое качество базы» (возврат к шагу 1). 

**Критерий освоения (разблокирует «Итог»):** ученик прошёл цикл для всех трёх пресетов и в **последних двух** предсказаниях угадал направление. Если не угадал — предлагается пройти пресет ещё раз с «Медианой 100 прогонов» (чтобы отделить закон от шума одного прогона — связка с М23/М30).

### 1.3. Экран (раскладка)
```
┌─────────────────────────────────────────────────────────────────┐
│ Заголовок: Стажёр рядом с опытным: что ML-слой делает с базой   │
│ Подзаголовок: депозит Алексея 1000 USDT, песочница (dry-run)     │
├───────────────────────────────┬─────────────────────────────────┤
│ ГРАФИК кривых капитала        │ ПАНЕЛЬ МЕТРИК                    │
│  ось Y: USDT (лог? нет, лин.)  │  Метрика | База | База+ML       │
│  ось X: свечи 1..720 (дни)     │  Сделок IS / OOS                 │
│  вертикаль: граница IS|OOS     │  Итог IS, %                      │
│  заливка OOS                   │  Итог OOS, %                     │
│  шторка «скрыто» до шага 4     │  Profit factor OOS               │
│  легенда: — База  — База+ML    │  Макс. просадка OOS              │
│                                │  OOS/IS (на свечу)  [зона]       │
├───────────────────────────────┴─────────────────────────────────┤
│ Ползунок «Качество базовой стратегии» + зоны + отметка «0»      │
│ [База убыточна] [База — шум] [База в плюсе]                     │
│ [Новый прогон] [Медиана 100 прогонов ▢] [Открыть проверочный ▶] │
├─────────────────────────────────────────────────────────────────┤
│ ВЕРДИКТ (карточка) + оценка твоего предсказания                 │
│ «Что видел бот»: код условия входа из урока (кликабельные чипы) │
└─────────────────────────────────────────────────────────────────┘
```
Блок «Что видел бот» показывает фрагмент из урока:
```python
df['%-rsi'] = ta.RSI(df['close'])
df['&s-close_price'] = df['close'].shift(-1) / df['close'] - 1   # цель
# вход: (df['do_predict'] == 1) & (df['&s-close_price'] > порог)
```
с подписью «Модель предсказывает `&s-close_price`; база входит по своему правилу без модели».

### 1.4. Модель симуляции (точные формулы)

**Рынок.** N = 720 свечей (условно дневные, ~2 года). IS = свечи 1–480, OOS = 481–720. Доходность свечи `r_t = σ · z_t`, где σ = 0.015, `z_t = T_t / √2`, `T_t ~ Student-t(ν=4)` (единичная дисперсия, тяжёлые хвосты — по уроку 1.2). Сид ГПСЧ фиксирует весь ряд.

**Издержки.** `c = 0.002` за круг (0.1% + 0.1%, как в FT-13). Проскальзывание отдельно не моделируется (в уроке оно закладывается в fee).

**Качество базы.** Ползунок Q ∈ [0,100] → информативность `ρ_base = −0.20 + 0.70·Q/100` (диапазон −0.20…+0.50). Отрицательная ρ = стратегия систематически входит перед падениями («покупает вершины»).

**Сигнал базы** на свече t (решение по close t, исполнение — доходность свечи t+1):
```
s_t = ρ_base · sign(r_{t+1}) + sqrt(1 − ρ_base²) · ε_t,   ε_t ~ N(0,1)
вход, если s_t > θ_base = 0.524   (≈30% свечей)
доход сделки = r_{t+1} − c
```
Это «зашумлённый взгляд на будущий знак»: чем выше ρ, тем чаще вход перед ростом. По построению s_t имеет единичную дисперсию, поэтому частота входов ≈ 30% при любой ρ.

**ML-слой.** Собственный скор `m_t` (используется вместо базового сигнала — в уроке вход идёт по предсказанию модели):
- **На IS (запоминание):** `ρ_ml_IS = 0.80` фиксировано, `θ_ml_IS = 0.385` (≈35% свечей). Комментарий в UI: «На обучающем отрезке модель видела ответы — её кривая не зависит от базы».
- **На OOS (обобщение):** `ρ_ml_OOS = clamp(1.25 · ρ_base, −0.6, +0.6)`, `θ_ml_OOS = 0.253` (≈40% свечей). Обоснование в подсказке: модель усиливает ту информацию, что есть в признаках базы (в обе стороны), а порог уверенности, откалиброванный на IS, в OOS пропускает больше сделок → больше комиссий.
- Доход сделки ML = `r_{t+1} − c`.

**Капитал.** `E_0 = 1000`; при сделке `E_{t+1} = E_t · (1 + доход)`, иначе `E_{t+1} = E_t`. Две кривые — база и ML. (Не «база + ML» как сумма: ML-слой заменяет правило входа, как в коде урока.)

**Ожидаемые значения для самопроверки агента** (приближённо, на свечу, до компаундинга; E|r| ≈ 0.0106):

| Q | ρ_base | База OOS, %/свечу | ML OOS, %/свечу | Знак разницы |
|---|---|---|---|---|
| 20 | −0.06 | ≈ −0.08 | ≈ −0.11 | ML хуже |
| 0 | −0.20 | ≈ −0.13 | ≈ −0.20 | ML хуже (ускоренный слив) |
| 48 | +0.14 | ≈ −0.01 | ≈ −0.005…−0.02 | около нуля / чуть хуже |
| 80 | +0.36 | ≈ +0.07 | ≈ +0.14 | ML лучше |
| 100 | +0.50 | ≈ +0.12 | ≈ +0.21 | ML лучше |
| любое | — | ML IS ≈ +0.27 %/свечу | — | IS всегда «блестящий» |

Точку безубыточности базы агент вычисляет численно (E[r | вход] − c = 0) и ставит отметку «0» на шкале; ожидается Q ≈ 50–52. Числа в таблице — ориентир для тестов с допуском, не для хардкода в UI.

**Режим «Медиана 100 прогонов».** Для текущего Q запускаются 100 сидов (seed_base + i), для каждой свечи берётся медиана капитала по прогонам; дополнительно рисуется веер 25–75-го перцентилей полупрозрачной заливкой. Метрики в панели — медианы. Вычисление ≤ 300 мс (720 × 100 × 2 — тривиально); при необходимости — Web Worker.

### 1.5. Метрики панели (определения)
- Сделок: количество входов на отрезке.
- Итог, %: `(E_конец_отрезка / E_начало_отрезка − 1) · 100`. Для OOS начало = капитал на свече 480 своей кривой.
- Profit factor: сумма положительных доходов сделок / |сумма отрицательных| на отрезке. При нуле убытков — «∞ (мало сделок)».
- Макс. просадка, %: по кривой капитала внутри отрезка.
- **OOS/IS (на свечу):** `(средний доход на свечу в OOS) / (средний доход на свечу в IS) · 100%`. Зоны (из FT-16, показываются цветной плашкой):
  - 50–70% — «норма: подгонка умеренная»;
  - 70–100% — «отлично, но проверь ещё раз»;
  - > 100% — «подозрительно: ищи утечку» (в этой симуляции недостижимо для ML, достижимо для базы ≈100% — подпись «у базы нет подобранных параметров, ей нечего терять в OOS»);
  - 0–50% — «слабо: большая часть IS — шум»;
  - ≤ 0% — «оптимизация выучила шум: в мусор».
  Если IS-доход ≤ 0 — показывать «н/п» (для базы при Q < безубыточности).

### 1.6. Вердикты (тексты, выбираются по OOS)
Обозначим `b = итог OOS базы`, `m = итог OOS ML`.

- **База убыточна и m < b:** «Стажёр ускорил слив. База систематически входила перед падениями; модель выучила именно этот признак и торгует его увереннее и чаще: сделок +X%, комиссий +Y USDT. На обучающем отрезке при этом всё выглядело как +Z% — это и есть подгонка».
- **База ≈ шум (|b| < 3% и |m − b| < 3%):** «База не несёт информации — модели нечего усиливать. На проверочном отрезке ML-слой — та же монетка, только с большим числом сделок и большими комиссиями. Обрати внимание: обучающий отрезок обещал +Z%».
- **База в плюсе и m > b:** «База несёт информацию — стажёр добавил к ней +X п.п. Но не создал её: без базы прибавлять было бы нечего. Сравни IS и OOS у ML-слоя: отношение W% — [зона]».
- **База в плюсе, но m ≤ b (шум одного прогона):** «В этом прогоне стажёр не помог. Так бывает: OOS-отрезок короткий (≈96 сделок). Нажми "Медиана 100 прогонов", чтобы увидеть закон, а не случай».
- **База убыточна, но m ≥ b (редко):** «В этом прогоне ML случайно оказался не хуже. Проверь медианой 100 прогонов — закон другой».

Всегда добавляется строка: «IS-результат ML-слоя (+Z%) одинаков при любом качестве базы. Красивый обучающий отрезок — не доказательство».

Оценка предсказания: «Ты ждал: [вариант]. Получилось: [Улучшил/Не изменил/Ухудшил] (разница m − b = ±X п.п.)». Классификация факта: улучшил, если m − b > +3 п.п.; ухудшил, если < −3; иначе «почти не изменил».

### 1.7. Тексты подсказок (кликабельные чипы, ключи глоссария)
`is`, `oos`, `ml_layer`, `freqai`, `do_predict`, `target_&s`, `feature_%`, `shift_-1`, `profit_factor`, `max_drawdown`, `hyperopt`, `overfitting`. Пример карточки `do_predict`: «Флаг FreqAI: 1 — модель уверена в данных этой свечи и её прогноз можно использовать; 0 — данные аномальны, сделок не открываем (см. FAI-06)».

### 1.8. События аналитики
`fai01_open`, `fai01_preset {q}`, `fai01_slider {q}`, `fai01_predict {q, choice}`, `fai01_reveal {q, seed, b, m, verdict, predict_correct}`, `fai01_new_seed`, `fai01_median_mode {on}`, `fai01_mastered {attempts}`.

### 1.9. Приёмка FAI-01
- [ ] Один и тот же сид + Q дают побитово одинаковые кривые (детерминизм).
- [ ] При Q=20 в ≥ 85% из 200 сидов `m < b` на OOS; при Q=80 в ≥ 80% сидов `m > b`; при Q=48 медиана `m − b` в диапазоне −4…+1 п.п.
- [ ] IS-итог ML при любом Q находится в диапазоне +80…+200% (медиана по сидам) и не коррелирует с Q (|r| < 0.15).
- [ ] Шторку OOS невозможно открыть без выбора предсказания.
- [ ] «Медиана 100 прогонов» считается ≤ 300 мс на средних мобильных.
- [ ] Отметка безубыточности стоит на Q ∈ [48, 54].
- [ ] Все английские токены в панели/коде — кликабельные чипы с русскими карточками.
- [ ] Клавиатурная навигация по ползунку, кнопкам и модалке предсказания.

---

## 2. FAI-02 «Прошлое / будущее: разложи карточки» (ИГР)

### 2.1. Цель и заблуждение
**Ломаемое заблуждение:** «Целевая переменная — просто ещё одна колонка датафрейма; а признак — любая колонка, которую я посчитал из цены».

**Что должен вынести ученик:**
1. Единственный вопрос к любой колонке: **в какой момент её значение можно было знать?** Если строго до закрытия свечи t включительно — это признак (`%-`). Если только после — на вход модели ей нельзя.
2. Будущее бывает двух видов: **честная цель** (`&s-`) — модель учится её предсказывать, и она живёт только в роли цели (не масштабируется вместе с признаками, не подаётся на вход); и **утечка** — будущее, переодетое в признак (`bfill`, `center=True`, статистика по всей истории, informative без сдвига).
3. Утечка не выдаёт себя: код работает, бэктест красивый (связка с 1.7 и FT-11).

**Рамка:** «Алексей собирает первый набор признаков для FreqAI. Помоги ему разложить 12 колонок».

### 2.2. Структура: три фазы

**Фаза 1 «Когда это известно?» (основная).** 12 карточек в стопке (перемешаны сидом). Две корзины:
- **Корзина А** — «Модель видит в момент t (не позже закрытия свечи t)»;
- **Корзина Б** — «Известно только после t».

**Фаза 2 «Какого вида это будущее?»** Открывается, когда все 12 разложены верно. Карточки корзины Б (7 штук) пересортировываются в две подкорзины:
- **Б1** — «Честная цель (`&s-`): её можно предсказывать»;
- **Б2** — «Утечка: будущее, переодетое в признак — нельзя ни в признак, ни в цель».

**Фаза 3 «Собери набор Алексея» (короткая, практика урока).** Из 12 карточек выбрать ровно 3 признака и 1 цель → кнопка «Проверить набор». Проверка: нет утечек, ровно одна цель, признаки различны. Дополнительный вопрос-чекбокс перед проверкой: «Где будет обучаться скейлер (нормализация) этих признаков?» — «на всей истории» / «только на обучающем окне». Правильно — второе (мостик в FAI-03).

### 2.3. Механика карточки
Каждая карточка:
- **Заголовок по-русски** (что это за величина).
- **Код** (одна–две строки; английские токены — чипы).
- Кнопка **«Показать, какие свечи входят в расчёт»** → раскрывается мини-лента из 9 свечей `t−4 … t … t+4` (свеча t выделена рамкой); свечи, попадающие в расчёт, подсвечены: зелёным — до t включительно, красным — после t. Если окно шире ±4, по краям рисуются стрелки-многоточия с подписью диапазона (например «t−13 … t» или «все свечи, включая будущие»). Это главный визуальный аргумент — он же используется в объяснениях ошибок.

**Drag&drop** карточки в корзину (альтернатива: клик по карточке → клик по корзине; для скринридера — кнопки «В корзину А / В корзину Б» на карточке).

**Обратная связь немедленная** (новичок, низкий порог фрустрации):
- Верно → карточка «защёлкивается» в корзине, короткое «почему» (одна строка), звук/анимация ✓.
- Неверно → карточка встряхивается и возвращается в стопку, открывается объяснение с автоматически развёрнутой мини-лентой свечей. Повторная попытка — сразу. Счётчик попыток по карточке.

**Счёт:** «верно с первой попытки: N из 12». Критерий освоения фазы 1 — ≥ 9 из 12 с первой попытки; фазы 2 — ≥ 6 из 7; фаза 3 — набор без утечек с первой попытки. При недоборе — «Пройти ещё раз»: порядок перемешивается и 3 карточки заменяются из резервного пула (п. 2.5), чтобы повторное прохождение не было заучиванием позиций.

### 2.4. Банк карточек (основные 12)

Поля: `id`, `title_ru`, `code`, `category` (feature | target | leak), `phase1` (A | B), `phase2` (B1 | B2 | —), `window` (смещения свечей относительно t, используемых в расчёте), `why_ru` (объяснение при ошибке/успехе), `tokens` (ключи глоссария), `pair_with` (id парной карточки для контраста, если есть).

| id | title_ru | code | category | phase1 | phase2 | window | why_ru (кратко; агент разворачивает в 2–3 предложения) | pair_with |
|---|---|---|---|---|---|---|---|---|
| f_rsi | RSI за 14 последних закрытых свечей | `df['%-rsi'] = ta.RSI(df['close'], 14)` | feature | A | — | t−13…t | RSI считается по закрытиям до текущей включительно. В момент закрытия свечи t всё уже известно. | — |
| f_roc1 | Доходность за последнюю закрытую свечу | `df['%-roc_1'] = df['close'].pct_change()` | feature | A | — | t−1, t | Сравнивает close t с close t−1 — обе цены уже в прошлом. | — |
| f_volmean20 | Средний объём за последние 20 свечей | `df['%-vol_mean20'] = df['volume'].rolling(20).mean()` | feature | A | — | t−19…t | Скользящее окно смотрит только назад. | l_volmean_all |
| f_sma20 | Скользящая средняя 20 (обычное окно) | `df['%-sma20'] = df['close'].rolling(20).mean()` | feature | A | — | t−19…t | Обычное окно rolling — только прошлые строки. | l_sma_center |
| f_btc_d1_shift | Дневная доходность BTC за **вчерашний** день, приклеенная к часовым свечам со сдвигом | `merge_informative_pair(df, btc_1d, '1h', '1d', ffill=True)` (со сдвигом на 1 день) | feature | A | — | t−47…t−24 (вчерашняя дневная свеча) | Вчерашняя дневная свеча закрылась до любой часовой свечи сегодня — это прошлое. | l_btc_d1_noshift |
| t_up | Направление **следующей** свечи | `df['&s-up'] = df['close'].shift(-1) > df['close']` | target | B | B1 | t, t+1 | Использует close t+1 — его узнаем только после закрытия следующей свечи. Это и должна предсказывать модель. | — |
| t_close_ret | Доходность следующей свечи (цель из урока FAI-01) | `df['&s-close_price'] = df['close'].shift(-1)/df['close'] - 1` | target | B | B1 | t, t+1 | То же будущее, но в виде числа. Честная цель: живёт только в роли `&s-`. | — |
| l_bfill | Цена закрытия с заполнением пропусков «назад» | `df['%-close_f'] = df['close'].bfill()` | leak | B | B2 | t…t+k (до ближайшего известного значения) | `bfill` берёт **следующее** известное значение и подставляет его в пропуск. В момент t следующего значения ещё нет. Честная замена — `ffill` (предыдущее). | — |
| l_volmean_all | Средний объём за **всю историю** | `df['%-vol_rel'] = df['volume'] / df['volume'].mean()` | leak | B | B2 | все свечи, включая будущие | `.mean()` по всему столбцу включает свечи, которых на момент t ещё не было. Даже деление на «среднее по истории» — утечка. | f_volmean20 |
| l_sma_center | Скользящая средняя с окном **по центру** | `df['%-sma_c'] = df['close'].rolling(20, center=True).mean()` | leak | B | B2 | t−10…t+9 | `center=True` ставит окно вокруг t: половина окна — впереди. Линия выглядит «умнее», потому что подглядывает. | f_sma20 |
| l_z_all | Z-оценка цены, где среднее и разброс посчитаны по **всему** датасету | `df['%-z'] = (df['close'] - df['close'].mean()) / df['close'].std()` | leak | B | B2 | все свечи | Среднее и σ «знают» весь период, включая проверочный. Та же ошибка, что скейлер по всей истории (FAI-03). Честно — rolling-окно или статистики только с обучающего окна. | — |
| l_btc_d1_noshift | Дневная свеча BTC **за сегодня**, приклеенная к часовым свечам сегодняшнего дня без сдвига | `merge_informative_pair(df, btc_1d, '1h', '1d')` без лага | leak | B | B2 | t…t+23 (дневная свеча закроется в конце дня) | Часовая свеча в 10:00 получает close дневной свечи, который сформируется в 23:59. Бэктест — телепат, live — слепой (предупреждение FT-05). | f_btc_d1_shift |

Итого: 5 признаков, 2 цели, 5 утечек. Три контрастные пары (rolling vs всё, обычное окно vs center, informative со сдвигом vs без) — при ошибке в одной карточке пары объяснение показывает обе рядом («сравни»).

### 2.5. Резервный пул (для повторного прохождения и банка E6)

| id | title_ru | code | category | phase1/phase2 | window | why_ru |
|---|---|---|---|---|---|---|
| r_hour | Час суток свечи | `df['%-hour'] = df['date'].dt.hour` | feature | A/— | t | Метка времени известна заранее. |
| r_ffill | Цена закрытия с заполнением пропусков «вперёд» | `df['close'].ffill()` | feature | A/— | t−k…t | Берёт предыдущее известное значение — прошлое. |
| r_maxhigh12 | Максимум high за **следующие** 12 свечей | `df['&s-max12'] = df['high'].shift(-12).rolling(12).max()` | target | B/B1 | t+1…t+12 | Честная цель: модель предсказывает, будет ли рост в ближайшие 12 свечей. |
| r_nextclose_feat | «Признак» с ценой следующей свечи | `df['%-next'] = df['close'].shift(-1)` | leak | B/B2 | t+1 | Откровенная утечка: будущее с меткой признака. Бэктест покажет ~100% точность. |
| r_resample_left | Дневная средняя, присвоенная всем часам дня с меткой начала дня | `df.resample('1D', label='left').mean()` | leak | B/B2 | t…t+23 | Метка стоит в начале дня, а среднее собрано за весь день (шестой источник утечки из 1.7). |
| r_top10_today | Флаг «монета сегодня в топ-10 по объёму», применённый ко всей истории | `df['%-top10'] = pair in TOP10_TODAY` | leak | B/B2 | все свечи | Отбор по сегодняшнему состоянию — survivorship-смещение (2.6, FT-04). |

Правило замены при повторе: 3 случайные основные карточки заменяются 3 резервными той же категории (сохраняем пропорцию 5/2/5).

### 2.6. Экран

```
┌──────────────────────────────────────────────────────────────┐
│ Фаза 1 из 3: Когда это известно?             Верно с 1-й: 4/12│
│ Прогресс ●●●●○○○○○○○○                                          │
├────────────────────┬───────────────────────┬─────────────────┤
│ КОРЗИНА А          │  СТОПКА (текущая      │ КОРЗИНА Б       │
│ Модель видит       │  карточка крупно +    │ Известно только │
│ в момент t         │  очередь мелко)       │ после t         │
│ [защёлкнутые]      │  ┌─────────────────┐  │ [защёлкнутые]   │
│                    │  │ Заголовок       │  │                 │
│                    │  │ код с чипами    │  │                 │
│                    │  │ ▸ показать свечи│  │                 │
│                    │  └─────────────────┘  │                 │
│                    │  [В корзину А] [В Б]  │                 │
├────────────────────┴───────────────────────┴─────────────────┤
│ ПАНЕЛЬ ОБЪЯСНЕНИЯ (после каждого броска):                    │
│ ✓/✗ текст + мини-лента свечей t−4…t+4 с подсветкой окна      │
│ (при ошибке в парной карточке — две ленты рядом «сравни»)    │
└──────────────────────────────────────────────────────────────┘
```
Мини-лента свечей: 9 столбиков-свечей, под ними подписи `t−4 … t … t+4`; используемые свечи — зелёная (≤ t) или красная (> t) подложка; для окон шире ±4 — стрелки с подписью диапазона. Свеча t обведена и подписана «сейчас: свеча t закрылась».

Фаза 2 — та же раскладка, но стопка = 7 карточек из корзины Б, корзины: Б1 «Честная цель `&s-`» / Б2 «Утечка». Вводный текст: «Всё это — будущее. Но целям можно смотреть в будущее — это их работа. А признакам нельзя. Разложи: что тут честная цель, а что — будущее, переодетое в признак».

Фаза 3 — сетка 12 карточек-чипов с чекбоксами; счётчики «Признаков: 0/3, Целей: 0/1»; радиокнопка про скейлер; кнопка «Проверить набор». После проверки — сгенерированный «паспорт набора Алексея» (список с временными окнами) и кнопка «Скопировать как комментарий к стратегии».

### 2.7. Тексты финального итога (после фазы 3)
«Правило одного вопроса: **в момент закрытия свечи t это значение уже известно?** Да → признак `%-`. Нет → либо цель `&s-` (её предсказываем), либо утечка (её удаляем). Цель никогда не подаётся на вход и не масштабируется вместе с признаками. Утечка не роняет код — она рисует красивый бэктест, который не повторится. Проверка руками не отменяет `freqtrade lookahead-analysis` (FT-11) — но и он не ловит всё: статистику по всей истории и отбор монет ловишь только ты».

### 2.8. Ключи глоссария (чипы)
`prefix_%`, `prefix_&s`, `shift_-1`, `bfill`, `ffill`, `rolling`, `center_true`, `pct_change`, `mean_whole`, `std`, `merge_informative_pair`, `resample_label_left`, `dt_hour`, `lookahead_analysis`, `scaler`, `survivorship_bias`.  
Пример карточки `bfill`: «Заполнить назад (backfill): пропуск получает **следующее** известное значение. В момент t следующее ещё не наступило — значит, в признаке появляется будущее. Безопасный аналог — `ffill` (заполнить вперёд предыдущим значением)».

### 2.9. События аналитики
`fai02_open`, `fai02_card_drop {card_id, phase, basket, correct, attempt_no}`, `fai02_window_open {card_id}`, `fai02_phase_done {phase, first_try_correct, total_attempts}`, `fai02_set_check {features[], target, scaler_choice, ok}`, `fai02_replay {replaced_ids[]}`, `fai02_mastered`.

### 2.10. Интеграция с движком E6 «Охотник за утечкой»
Карточки категории `leak` (основные + резервные) экспортируются в общий банк E6 в формате `{id, source_lesson: 'FAI-02', snippet, culprit_token, explanation_ru, window}`. В E6 ученик кликает по строке-виновнику (`bfill`, `center=True`, `.mean()`, отсутствие сдвига) — поле `culprit_token` задаёт правильный ответ.

### 2.11. Приёмка FAI-02
- [ ] 12 основных карточек соответствуют таблице 2.4; тексты кода воспроизводят фрагменты урока (`%-rsi`, `%-roc_1`, `&s-up`, `&s-close_price`).
- [ ] Мини-лента корректно подсвечивает окна: `f_rsi` — 14 зелёных (t−13…t), `l_sma_center` — 10 зелёных + 10 красных, `l_volmean_all` — все + стрелки в обе стороны, `t_up` — t зелёная + t+1 красная.
- [ ] Ошибка по карточке из пары показывает обе ленты рядом.
- [ ] Фаза 2 недоступна, пока фаза 1 не завершена без ошибок в текущем состоянии корзин.
- [ ] Фаза 3 отклоняет наборы: с утечкой; с двумя целями; с целью в роли признака (`&s-` среди признаков); при выборе «скейлер на всей истории» — отдельное объяснение и ссылка на FAI-03.
- [ ] Повторное прохождение перемешивает порядок и заменяет 3 карточки из резерва с сохранением пропорции 5/2/5.
- [ ] Drag&drop дублируется кнопками; полный проход возможен с клавиатуры.
- [ ] Все английские токены — чипы с русскими карточками; режим «рус. подписи» добавляет подпись справа от каждой строки кода.

---

## 3. Общие требования к сдаче

### 3.1. Структура модулей (рекомендация)
```
interactives/fai01_intern/
  sim.ts            # simulate(seed, q, mode) → {equityBase[], equityMl[], trades, metrics}
  verdict.ts        # verdict(metrics) → {code, text_ru}
  Fai01View.*       # UI, шаги 1–5, шторка, предсказание
  sim.test.ts
interactives/fai02_cards/
  cards.json        # основные 12 + резерв 6
  rules.ts          # checkDrop, checkSet, windowFor(card)
  Fai02View.*
  rules.test.ts
shared/
  glossary.json     # ключи из 1.7 и 2.8 (дополнить существующий словарь)
  CandleStrip.*     # мини-лента t−4…t+4 (переиспользуется в E6, FT-05, FT-11)
  RevealCurtain.*   # шторка IS|OOS (переиспользуется в E7, FT-16)
```

### 3.2. Состояние и сохранение
Сохранять в локальное хранилище: `seed`, `q`, текущий шаг/фазу, счёт первых попыток, флаг освоения. При возврате на урок — предложить «Продолжить» или «Начать заново».

### 3.3. Тесты (минимум)
- **FAI-01:** детерминизм по сиду; частоты входов (30/35/40% ± 3 п.п. на 720 свечах при усреднении по 50 сидам); статистические проверки из п. 1.9; `verdict()` покрыт всеми пятью ветками; зоны OOS/IS покрыты граничными значениями (49.9, 50, 70, 100.1, ≤ 0, «н/п»).
- **FAI-02:** каждая карточка имеет ровно один верный ответ в фазе 1 и (для B) в фазе 2; `windowFor()` для всех 18 карточек; `checkSet()` на 6 негативных и 2 позитивных наборах; замена при повторе сохраняет пропорцию категорий.

### 3.4. Метрики эффективности (для последующей проверки)
- FAI-01: доля верных предсказаний до раскрытия — растёт от первого пресета к третьему (цель: ≥ 75% на третьем).
- FAI-02: число ошибок при повторном прохождении — на 50% ниже первого (цель ТЗ-3); самые частые ошибочные карточки логируются для доработки объяснений (ожидаемые «трудные»: `l_volmean_all`, `l_z_all`, `l_btc_d1_noshift`).

-----------------------

# Детальные спеки для реализации: FAI-03a «Где утекает скейлер» и FAI-03b «Shuffle запрещён»

Урок-хозяин: **Урок 223 · FAI-03 «Разделение обучения и проверки модели»**. Оба интерактива встраиваются в этот урок: первый — после блока «Глубже» и кода `freqai_lab_scaling.py`, второй — после блока «Проверь себя» (вопрос про случайную кросс-валидацию). Ниже — общие требования, затем две полные спецификации, затем план приёмки.

---

## 0. Общие требования к обоим интерактивам

### 0.1. Место в методической системе
- **Один интерактив = одно заблуждение.** FAI-03a ломает «Нормализация — невинная операция». FAI-03b ломает «Кросс-валидация как в учебниках». Не смешивать: в первом нет фолдов, во втором нет скейлера.
- **Числа берутся из урока.** Используем: разделение train → test → сдвиг окна (код урока); `train_period_days: 30`, `backtest_period_days: 5` (код FAI-05); 70/15/15 (М42); walk-forward 12/3/3 месяцев (1.9). Ученик должен узнавать эти цифры.
- **Персонаж — Алексей** (депозит 1000 $ / 100 000 ₽). Он собирает первую FreqAI-модель после того, как базовая стратегия `DipBuyerBTCFilter` прошла FT-20.
- **Обратная связь через ошибку.** Каждый интерактив содержит шаг, где ученик сначала выбирает/предсказывает, потом видит результат симуляции.

### 0.2. Технические ограничения
- Чистый браузер (TypeScript/JS + Canvas/SVG), без вызова Python. Python-код показывается как текст с подсветкой и русскими подписями, а симуляция выполняется в JS. Об этом ученику сообщается явно: «Здесь работает учебная модель тех же правил; на твоём компьютере это делает `scikit-learn`».
- Детерминированный генератор случайных чисел с seed (mulberry32 или аналог). Одинаковый seed → одинаковая картинка. Кнопка «Другой пример» меняет seed.
- Один прогон симуляции ≤ 50 мс; серия из 20 прогонов ≤ 1 с (для режима «Прогнать 20 раз»).
- Адаптив: десктоп — две колонки (код | график), мобильный — вкладки «Код / График / Результат».
- Цвета: обучение — синий `#2F6FDB`, проверка — оранжевый `#E8912D`, «будущее в обучении»/утечка — красный `#D9363E`, нетронутое/holdout — серый `#9AA3AE`. Дублировать цвет штриховкой (доступность).

### 0.3. Языковой слой «Ткни в непонятное» (обязателен)
Каждый английский токен в коде, подписях и таблицах кликабелен: всплывает русская карточка (термин → одна фраза → пример → ссылка на урок, где введён). Переключатель «англ. / рус. подписи / оба». В режиме «рус.» имена переменных остаются, справа от строки — русская подпись.

Словарь для обоих интерактивов (агент добавляет в общий глоссарий приложения, не дублирует):

| Токен | Русская карточка (кратко) | Урок-источник |
|---|---|---|
| `train` / обучающая выборка | Данные, на которых модель подбирает параметры. Всегда раньше проверки по времени | 1.9, М42 |
| `test` / проверочная выборка | Данные, которых модель не видела при настройке. Открываются один раз | 1.9 |
| `X_all`, `X_train`, `X_test` | Таблица признаков: вся / только обучение / только проверка | FAI-02 |
| `StandardScaler` / скейлер | Приведение признака к единому масштабу: (значение − среднее) / разброс | 1.7 |
| `fit` | «Запомнить статистики» — среднее и разброс по данным | FAI-03 |
| `transform` | «Применить запомненные статистики» к данным | FAI-03 |
| `fit_transform` | fit и transform одной командой — опасно на всей истории | 1.7 |
| `mean` / `std` | Среднее и стандартное отклонение (разброс) | М5, М9 |
| accuracy / доля верных направлений | Доля предсказаний «вверх/вниз», совпавших с фактом | FAI-05 |
| `KFold`, `shuffle=True` | Разбиение на k частей со случайным перемешиванием — запрещено для рядов | FAI-03 |
| `TimeSeriesSplit` | Разбиение по времени: проверка всегда позже обучения | FAI-03 |
| fold / фолд | Одна из k частей, по очереди играющая роль проверки | FAI-03 |
| walk-forward | Скользящее окно: обучаемся на прошлом, проверяем на следующем куске, сдвигаемся | 1.9 |
| purge / embargo / зазор | Отступ между обучением и проверкой, чтобы соседние дни не переносили информацию | 1.9 (Глубже) |
| `train_period_days`, `backtest_period_days` | Глубина обучающего окна и шаг сдвига в FreqAI | FAI-05 |
| `do_predict` | Флаг FreqAI: модель считает, что данным можно доверять | FAI-01 |
| k-ближайших соседей (kNN) | Учебная модель: ищет похожие дни в обучении и копирует их ответ | FAI-03b |
| regime / режим рынка | Период, внутри которого статистики устойчивы; смена режима — их сдвиг | 1.3, П34 |

### 0.4. Интеграция
- **E5 «Журнал»**: в финале каждого интерактива — кнопка «Записать вывод в журнал экспериментов» с предзаполненной строкой (см. тексты ниже). Категория журнала: `FAI / утечки`.
- **E7 «Линейка времени»**: FAI-03b строится на движке E7 (drag-границы, подсветка запрещённых конфигураций). FAI-03a использует облегчённую версию оси времени (без drag фолдов, только маркер границы train/test).
- **Глоссарий-паутина**: термин «Временная валидация» урока получает ссылку «прожито в: FAI-03b».
- **Телеметрия** (общая схема): `interactive_open`, `step_reached {step}`, `prediction_made {answer, correct}`, `run {mode, params}`, `reveal_clicked`, `journal_saved`, `interactive_complete {time_sec, attempts}`.

---

## 1. FAI-03a «Где утекает скейлер» (СИМ)

### 1.1. Карточка
- **ID:** `FAI-03a_scaler_leak`
- **Тип:** СИМ с элементом ИГР (предсказание до запуска).
- **Заблуждение:** «Нормализация — невинная операция: какая разница, на чём считать среднее».
- **Что ученик должен унести:** статистики скейлера (среднее и разброс), посчитанные по всей истории, содержат информацию о проверочном периоде → метрика на тесте завышена; честный `fit` — только на обучающем окне; честный способ «догнать» сменившийся режим — переобучать скейлер на свежем **прошлом** (как FreqAI с `train_period_days`), а не подглядывать в будущее.
- **Критерий освоения (гейт на следующий блок урока):** ученик (1) кликом указал строку кода с утечкой, (2) правильно предсказал, какая из двух метрик ближе к результату dry-run, (3) в финальной мини-игре разложил 3 фрагмента кода на «чисто/утечка».
- **Длительность:** 6–8 минут.

### 1.2. Сценарий (текст вводной карточки)
> Алексей собрал первую FreqAI-модель. Признак — `%-rsi`, цель — `&s-up` («следующая свеча закроется выше»). Он написал два варианта файла `freqai_lab_scaling.py`, как в уроке. В первом скейлер обучен на всех данных, во втором — только на обучающей части. На проверке первый вариант показал точность выше. Алексей обрадовался: «первый лучше». Разберёмся, что на самом деле измерил каждый вариант.

### 1.3. Раскладка экрана (десктоп)
```
┌─────────────────────────────┬──────────────────────────────────────┐
│ ЛЕВАЯ КОЛОНКА: КОД          │ ПРАВАЯ КОЛОНКА: ЛЕНТА ПРИЗНАКА       │
│ вкладка А «НЕПРАВИЛЬНО»     │ ось времени 0…N, зоны train | test   │
│ вкладка Б «ПРАВИЛЬНО»       │ линия %-rsi, полоса μ ± σ            │
│ (каждая строка кликабельна) │ переключатель: показать статистики   │
│                             │ версии А / версии Б / обеих           │
├─────────────────────────────┴──────────────────────────────────────┤
│ КОНВЕЙЕР (7 шагов, подсветка активного):                           │
│ Данные → Разделение → fit скейлера → transform → обучение модели → │
│ предсказание на тесте → метрика                                    │
├────────────────────────────────────────────────────────────────────┤
│ РЕЗУЛЬТАТ: две карточки метрик [А: ▓▓▓▓ 61%] [Б: ▓▓▓ 50%]          │
│ кнопка «Показать, какие статистики теста попали в скейлер»         │
│ панель управления: ползунки, seed, «Прогнать 20 раз»               │
└────────────────────────────────────────────────────────────────────┘
```

### 1.4. Данные: синтетический генератор
Цель генератора — воспроизводимо и честно показать механизм: **метка определяется относительно нормы своего режима**, а режим в тесте сдвинут. Именно эту «норму будущего периода» и подсматривает скейлер.

Параметры (значения по умолчанию в скобках):
- `N` — число свечей (300, часовые).
- `test_share` — доля проверки (0.30; ползунок 0.20–0.50).
- `delta` — сдвиг режима в тесте, в пунктах RSI (10; ползунок 0–20, шаг 1).
- `phi` — автокорреляция признака (0.6, фиксировано).
- `sigma_eps` — шум признака (6, фиксировано).
- `p_flip` — шум меток (0.20, фиксировано; отсюда «потолок» точности 80%).
- `seed`.

Псевдокод:
```
n_train = round(N * (1 - test_share)); n_test = N - n_train
base(t) = 50                        для t < n_train
base(t) = 50 - delta                для t >= n_train
x[0] = base(0)
x[t] = base(t) + phi * (x[t-1] - base(t)) + Normal(0, sigma_eps)
x[t] = clip(x[t], 5, 95)                       # это признак %-rsi
y_true[t] = 1 если x[t] < base(t) иначе 0      # внутри режима: ниже нормы → откат вверх
y[t] = y_true[t] XOR Bernoulli(p_flip)          # метка &s-up с шумом
```
Пояснение для ученика (подпись под графиком, режим «Подробнее»): «В обучающем периоде норма RSI около 50, в проверочном рынок ушёл в нисходящий режим — норма около 40. Модель не знает будущей нормы. Знать её может только тот, кто подсмотрел».

### 1.5. Конвейеры (две версии)
Версия А (НЕПРАВИЛЬНО):
```
mu_A, sd_A = mean(x[0:N]), std(x[0:N])          # fit на ВСЕЙ истории
z = (x - mu_A) / sd_A
theta = argmax_acc_train( правило: predict 1 если z < theta )   # сетка theta от -2 до 2 шаг 0.05, по train
acc_test_A = accuracy(predict(z[test]), y[test])
```
Версия Б (ПРАВИЛЬНО):
```
mu_B, sd_B = mean(x[0:n_train]), std(x[0:n_train])   # fit только на train
z = (x - mu_B) / sd_B
theta = argmax_acc_train(...)
acc_test_B = accuracy(predict(z[test]), y[test])
```
Версия В (бонус, «честно догнать режим», включается тумблером после раскрытия результата):
```
каждые refit_step = 20 свечей внутри теста: mu, sd пересчитываются по последним window = 60 свечам,
доступным на этот момент (только прошлое); theta не переобучается (или переобучается на том же окне — оба варианта дать переключателем «переобучать и порог»)
acc_test_C
```
Модель одна и та же во всех версиях: «пороговое правило по масштабированному признаку» (по-русски объяснить: «если признак ниже порога — предсказать рост»). В карточке термина: «В настоящем FreqAI это была бы LightGBM/XGBoost; механизм утечки тот же».

### 1.6. Калибровка (агент обязан проверить на 200 seed’ах и приложить таблицу в PR)
Ожидания при `N=300, test_share=0.30, p_flip=0.20`:
- `delta = 10`: медиана `acc_test_A − acc_test_B` ≈ 8–12 п.п.; `acc_test_B` ≈ 48–53 %; `acc_test_A` ≈ 58–64 %.
- `delta = 0`: медиана разницы в пределах ±1 п.п. (это осмысленный результат, см. 1.9).
- `delta = 20`: разница ≥ 15 п.п.
- Версия В при `delta = 10` после 2-го переобучения даёт на оставшейся части теста точность 65–75 % (то есть выше А, но **честно**).
Если калибровка не сходится — менять `phi`/`sigma_eps`, не менять механизм.

### 1.7. Пошаговый ход (состояния)

**Шаг 0. Вводная карточка** (сценарий из 1.2). Кнопка «Разобраться».

**Шаг 1. Код и ставка.** Показаны две вкладки кода (текст ниже). Вопрос-предсказание до запуска:
> «Какая версия покажет точность выше на проверочном периоде?» — [А] [Б] [Одинаково]

Затем:
> «Какая версия покажет точность, ближайшую к той, что Алексей увидит в dry-run?» — [А] [Б]

Ответы фиксируются, симуляция ещё не запущена. Кнопка «Прогнать обе версии».

**Шаг 2. Прогон с анимацией конвейера** (2–3 секунды, можно пропустить). По очереди подсвечиваются 7 узлов. На узле «fit скейлера» в версии А анимируется поток: из зоны test на графике летят точки в блок `fit` — красная стрелка с подписью «данные из будущего попадают в статистики». В версии Б поток идёт только из зоны train.

**Шаг 3. Результат.** Две карточки:
- «А · fit на всём: доля верных направлений на проверке **61 %**»
- «Б · fit на обучении: **50 %**»
- Пунктирная линия «потолок при таком шуме меток: 80 %».
Разбор ставки: если ученик выбрал «А ближе к dry-run» — красная подсказка: «Dry-run — это будущее, которого в скейлере нет. В dry-run метрика будет как у Б или хуже. Версия А измерила не модель, а то, сколько информации о проверке просочилось в среднее». Если выбрал Б — зелёная: «Верно: А — цифра-самообман, Б — честная».

**Шаг 4. Кнопка «Показать, какие статистики теста попали в скейлер».** Открывается панель разложения:
```
μ по всем данным = (n_train · μ_train + n_test · μ_test) / (n_train + n_test)
               = (210 · 50.1 + 90 · 40.3) / 300 = 47.2
доля будущего в среднем: 30 %  (= n_test / N)
σ по всем данным = 9.4  против  σ_train = 7.6  ← разброс тоже «знает», что дальше режим сместится
```
Числа берутся из текущего seed. На графике одновременно рисуются две полосы: μ_B ± σ_B (синяя) и μ_A ± σ_A (красная штриховка); видно, как красная полоса «наклоняется» к тестовому периоду. Дополнительно подсвечиваются те свечи теста, которые оказались ниже μ_A, но выше μ_B — «именно здесь версия А угадала благодаря подглядыванию» (подсчёт: «таких свечей 29 из 90»).

**Шаг 5. Клик по строке-виновнику.** Инструкция: «В коде версии А кликни строку, где происходит утечка». Правильно — `scaler_bad = StandardScaler().fit(X_all)`. Неверный клик по `transform` → подсказка: «transform лишь применяет запомненное. Утечка там, где статистики запоминаются». Две попытки, затем подсветка ответа.

**Шаг 6. Эксперименты (свободный режим).**
- Ползунок «Сдвиг режима в тесте» 0–20. При 0 — обе метрики сходятся; появляется плашка (см. 1.9).
- Ползунок «Доля проверки» 20–50 %: доля будущего в μ_A растёт, разрыв растёт.
- Кнопка «Прогнать 20 раз»: 20 seed’ов, две мини-гистограммы разницы А−Б и точности Б; подпись «Разрыв не случайность одного примера: медиана +9.6 п.п. по 20 прогонам» (ссылка на М30, М36).
- Тумблер «Честно догнать режим» (версия В): появляется третья карточка; на графике — вертикальные метки переобучений скейлера; подпись «Так работает FreqAI: `train_period_days` задаёт глубину окна, `backtest_period_days` — шаг. Скейлер и модель учатся на свежем прошлом, будущего в них нет».

**Шаг 7. Мини-игра «Чисто или утечка?»** (3 карточки кода из практики FreqAI, перетаскивание в две корзины):
1. `df['%-x'] = (df['x'] - df['x'].mean()) / df['x'].std()` → **утечка** (среднее по всей истории внутри `populate_any_indicators`).
2. `df['%-x'] = (df['x'] - df['x'].rolling(200).mean()) / df['x'].rolling(200).std()` → **чисто** (скользящее окно, только прошлое).
3. `df['%-x'] = (df['x'] - df['x'].expanding().mean()) / df['x'].expanding().std()` → **чисто** (расширяющееся окно — тоже только прошлое; подсказка: «а вот `bfill` пропусков сделало бы это утечкой»).
Объяснение после проверки: «Внутри FreqAI масштабирование по окнам делается автоматически. Но всё, что ты сам посчитал по всей таблице до модели, движок не спасёт».

**Шаг 8. Итог + запись в журнал.** Предзаполненная строка E5:
> «FAI-03a: fit скейлера на всей истории завысил точность на проверке на +N п.п. (seed S, сдвиг режима Δ). Правило: статистики признаков считаю только по обучающему окну или скользящим окном».
Кнопка «Сохранить в журнал».

### 1.8. Тексты кода (двуязычный режим)
Вкладка А:
```python
from sklearn.preprocessing import StandardScaler     # ← инструмент масштабирования

# НЕПРАВИЛЬНО: статистики считаются по всему набору
scaler_bad = StandardScaler().fit(X_all)             # ← запомнить среднее и разброс ПО ВСЕЙ ИСТОРИИ  [утечка]
X_all_s   = scaler_bad.transform(X_all)              # ← применить к данным
X_train_s, X_test_s = X_all_s[:n_train], X_all_s[n_train:]
```
Вкладка Б:
```python
# ПРАВИЛЬНО: статистики только из обучения
scaler    = StandardScaler().fit(X_train)            # ← запомнить среднее и разброс ТОЛЬКО ПО ОБУЧЕНИЮ
X_train_s = scaler.transform(X_train)                # ← применить к обучению
X_test_s  = scaler.transform(X_test)                 # ← применить ТЕ ЖЕ статистики к проверке
```
Комментарии справа появляются в режиме «рус.»/«оба».

### 1.9. Пограничные случаи и честность демонстрации
- **Δ = 0:** разрыв ≈ 0. Обязательная плашка: «Когда режим не меняется, утечка через скейлер почти незаметна. Опасность именно в том, что она всплывает в момент смены режима — то есть когда честная оценка нужна больше всего (урок 1.3, П34)». Это не баг, это методический пункт — не «подкручивать» генератор, чтобы разрыв был всегда.
- **Малый тест (20 %):** доля будущего в μ падает, разрыв меньше — подпись «меньше будущего в среднем — меньше самообмана, но он не исчезает».
- **Seed, где Б случайно выше А:** возможен при Δ ≤ 3. Показывать честно; кнопка «20 раз» снимает вопрос.
- Не давать ученику менять `p_flip` и `phi` — лишние ручки размывают заблуждение.
- Мобильный: конвейер сворачивается в вертикальный список; график — над карточками метрик.

### 1.10. Критерии приёмки FAI-03a
1. При seed по умолчанию и параметрах по умолчанию: А ∈ [58, 64] %, Б ∈ [48, 53] %, разложение μ показывает долю будущего 30 %.
2. Клик по строке `fit(X_all)` засчитывается; клик по `transform` даёт целевую подсказку.
3. Гейт освоения открывает следующий блок урока только после шагов 1, 5, 7.
4. Все английские токены из 0.3 кликабельны и ведут на карточки; переключатель «рус.» показывает подписи у каждой строки кода.
5. Прогон 20 seed’ов ≤ 1 с; графики перерисовываются без мерцания при движении ползунков.
6. Запись в E5 создаётся с подстановкой фактических N, Δ, seed.
7. Таблица калибровки на 200 seed’ах приложена к PR.

---

## 2. FAI-03b «Shuffle запрещён» (СИМ на движке E7)

### 2.1. Карточка
- **ID:** `FAI-03b_shuffle_forbidden`
- **Тип:** СИМ + ТРН (drag-границы, воспроизведение walk-forward), с элементом ИГР.
- **Заблуждение:** «Кросс-валидация как в учебниках: перемешал, разбил на 5 частей, усреднил — надёжная оценка».
- **Что ученик должен унести:** случайные фолды ставят будущие дни в обучение → модель «списывает» у соседних дней → метрика на проверке фиктивна; для рядов допустимы только разбиения, где проверка позже обучения (простое разделение, walk-forward, блочное с зазором); в FreqAI это `train_period_days` / `backtest_period_days`.
- **Критерий освоения:** ученик (1) для каждого из 4 режимов правильно отметил «допустимо / запрещено» до показа счётчика, (2) собрал drag’ом корректную конфигурацию walk-forward с параметрами 30/5 и (3) объяснил (выбором) причину завышения точности.
- **Длительность:** 7–9 минут.

### 2.2. Сценарий
> Алексей прочитал учебник по машинному обучению: «делай 5-кратную кросс-валидацию с перемешиванием». Сделал. Точность модели на проверке — **84 %**. Запустил dry-run на 8 недель — **52 %**. Куда делись 32 пункта? Проследим, у кого модель списывала.

### 2.3. Раскладка
```
┌────────────────────────────────────────────────────────────────────┐
│ ЛИНЕЙКА ВРЕМЕНИ (E7): 120 дней, каждая ячейка = день               │
│ синий = обучение, оранжевый = проверка, красный контур = день из   │
│ будущего, попавший в обучение относительно выбранного дня проверки │
│ [◀ фолд 1/5 ▶]  [▶ проиграть]  [seed ↻]                            │
├──────────────────────────────┬─────────────────────────────────────┤
│ РЕЖИМЫ (переключатель):      │ СЧЁТЧИКИ ЧЕСТНОСТИ                  │
│ ① Случайные фолды k=5        │ дней проверки с будущим в обучении: │
│ ② Простое разделение по      │ доля __ %                           │
│    времени (граница drag)    │ медианная дистанция до ближайшего   │
│ ③ Walk-forward 30/5          │ обучающего дня: __ дн.              │
│ ④ Блочные фолды (без/с       │ точность на проверке: __ %          │
│    зазором)                  │ вердикт: ДОПУСТИМО / ЗАПРЕЩЕНО      │
├──────────────────────────────┴─────────────────────────────────────┤
│ ЛУПА: выбранный день проверки t → 3 ближайших «похожих» дня из     │
│ обучения, линии на линейке; подпись: «модель списала у t+1, t−1,   │
│ t+2 — два из трёх из будущего»                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 2.4. Данные: генератор с памятью
Механизм утечки при перемешивании: соседние дни похожи и по признакам, и по ответам, а модель-«сосед» копирует ответы похожих дней. Значит, ряды должны иметь **автокорреляцию признаков** и **перекрывающиеся метки**.

Параметры (по умолчанию): `N = 120` дней; скрытый режим `s_t ∈ {−1, +1}` — цепь Маркова с вероятностью остаться `p_stay = 0.92`; дневная доходность `r_t = 0.004·s_t + Normal(0, 0.02)`; метка `y_t = 1`, если суммарная доходность за следующие 5 дней > 0 (перекрывающиеся метки, как «горизонт 5 дней»); признаки: `f1_t` = среднее `r` за последние 5 дней, `f2_t` = стандартное отклонение `r` за последние 5 дней. Первые 5 дней без признаков и последние 5 без метки исключаются из выборки (показать серым: «нет данных для признака/метки»).

Модель: **k-ближайших соседей, k = 3**, по признакам (f1, f2), стандартизованным по обучающей части текущего сплита (внутри FAI-03b это делается правильно всегда — чтобы не смешивать два заблуждения; сноска: «масштабирование здесь честное, см. FAI-03a»). Предсказание — большинство меток трёх ближайших дней. Русское объяснение модели в карточке: «Модель ищет три самых похожих дня в обучении и копирует их ответ. Похожие дни в рядах почти всегда — соседние по календарю».

### 2.5. Режимы разбиения
| Режим | Как строится | Ожидаемый счётчик «будущее в обучении» | Ожидаемая точность | Вердикт |
|---|---|---|---|---|
| ① Случайные фолды k=5 (`KFold(shuffle=True)`) | 5 случайных подмножеств по 20 % дней; по очереди проверка | ≈ 100 % (почти у каждого дня проверки есть более поздние дни в обучении) | 78–88 % | ЗАПРЕЩЕНО |
| ② Простое разделение по времени | обучение `[0, t1)`, проверка `[t1, N)`; t1 drag от 30 до 100, по умолчанию 84 (70 %) | 0 % (если t1 не сломан) | 50–58 % | ДОПУСТИМО |
| ③ Walk-forward 30/5 | окно обучения 30 дней, проверка следующие 5, сдвиг 5; серия окон анимируется | 0 % | 50–60 % | ДОПУСТИМО |
| ④ Блочные фолды | 5 непрерывных блоков по 24 дня; по очереди проверка; тумблер «зазор 5 дней» | без зазора: 60–80 % дней проверки имеют будущее в обучении; утечка через соседей — только на краях блоков; с зазором: краевая утечка снята, но будущие блоки в обучении остаются | без зазора 62–72 %; с зазором 55–62 % | без зазора — ЗАПРЕЩЕНО; с зазором — «допустимо только для сравнения признаков, не для оценки доходности» (подпись со ссылкой на 1.9 «Глубже»: purge/embargo) |

Определение счётчика «день проверки с будущим в обучении»: для дня проверки t существует день обучения t' > t. Дополнительный счётчик «медианная дистанция до ближайшего обучающего дня» = медиана по дням проверки |t − t'_nearest| (в ① ≈ 1 день, в ② растёт от 1 до 36 — показывать честно, что в простом разделении первый день проверки тоже стоит вплотную к обучению; отсюда мостик к зазору).

Калибровка (200 seed’ов, приложить к PR): режим ① минус режим ③ — медиана разницы точности ≥ 20 п.п.

### 2.6. Пошаговый ход

**Шаг 0. Вводная** (2.2). Кнопка «Проследить».

**Шаг 1. Предсказание вердиктов.** Четыре карточки режимов с картинкой-миниатюрой линейки (без счётчиков). Ученик ставит каждой «допустимо / запрещено». Ответы запоминаются.

**Шаг 2. Режим ①, лупа.** Линейка показывает фолд 1: оранжевые дни разбросаны. Автовыбор дня проверки t = 57. Лупа рисует три линии к дням обучения 56, 58, 59 (реальные соседи из kNN текущего seed’а). Дни 58 и 59 обведены красным: «из будущего». Подпись: «Чтобы предсказать день 57, модель посмотрела ответы дней 58 и 59. В жизни 57-го числа этих ответов ещё не существует». Кнопка «другой день проверки» — 3 клика минимум, счётчик «из будущего: 2 из 3, 3 из 3, 1 из 3…». Затем раскрывается счётчик режима: «100 % дней проверки имеют будущее в обучении · точность 84 % · ЗАПРЕЩЕНО». Сравнение с ответом ученика на шаге 1.

**Шаг 3. Режим ②, drag.** Одна граница t1. Ученик тянет её; счётчики пересчитываются вживую. Задание: «Поставь границу так, чтобы обучение занимало ~70 %». Попытка перетащить обучение правее проверки (E7 запрещённая конфигурация) — линейка краснеет, подпись «обучение позже проверки: будущее в обучении 100 %». Раскрытие: точность 50–58 %. Плашка: «Это и есть цифра, которую увидит dry-run. Учебниковые 84 % были не про модель, а про соседей».

**Шаг 4. Режим ③, walk-forward.** Два ползунка: «глубина обучения» (10–60, дефолт 30) и «шаг проверки» (1–10, дефолт 5), подписанные `train_period_days` / `backtest_period_days`. Кнопка «проиграть»: окна ползут по линейке, точность каждого окна ложится точками на мини-график; итоговая точность — среднее по окнам. Задание-тренажёр: «Собери конфигурацию как в конфиге FreqAI из урока FAI-05: 30 и 5» — засчитывается при совпадении. Подпись: «Так модель никогда не видит завтра: каждое окно учится на прошлом и проверяется на следующем куске. FreqAI делает это автоматически — если ты не сломал порядок сам».

**Шаг 5. Режим ④, блоки и зазор (углублённый, можно пропустить).** Показать, что непрерывные блоки без перемешивания тоже не спасают, если проверочный блок стоит в середине: будущие блоки в обучении. Тумблер «зазор 5 дней» убирает краевую утечку соседей — точность падает; подпись про purge/embargo из 1.9. Вердикт со сноской из таблицы 2.5.

**Шаг 6. Причина одной фразой (выбор).**
> «Почему точность при случайных фолдах была 84 %?»
> a) модель действительно лучше на перемешанных данных
> b) соседние дни похожи и делят одну и ту же будущую доходность; в обучении оказались дни после проверочного — модель скопировала их ответ ✓
> c) при перемешивании больше данных для обучения
Неверный ответ → возврат к лупе с подсказкой.

**Шаг 7. Мост к «подбору по одному тесту» (мини-эпилог, 20 секунд).** Одна карточка без интерактива: «Есть и второй способ обмануть себя даже с честным разбиением: много раз подбирать модель по одному и тому же проверочному периоду. Тогда проверка тихо становится обучением. Это отдельный тренажёр — «Ворота Capstone» в FAI-07 (счётчик открытий holdout)». Ссылка. Не реализовывать здесь.

**Шаг 8. Итог + журнал.** Строка E5:
> «FAI-03b: случайные фолды дали N₁ % против N₂ % при walk-forward 30/5 (seed S). Причина — соседние дни из будущего в обучении. Правило: для рядов только разбиения по времени; в FreqAI — train_period_days / backtest_period_days, shuffle не использую».

### 2.7. Код для панели «Как это выглядит в Python» (двуязычный, свёрнуто по умолчанию)
```python
from sklearn.model_selection import KFold, TimeSeriesSplit

# ЗАПРЕЩЕНО для временных рядов: время перемешано
cv_bad = KFold(n_splits=5, shuffle=True, random_state=42)     # ← случайные фолды: будущее попадает в обучение

# ДОПУСТИМО: проверка всегда позже обучения
cv_ok  = TimeSeriesSplit(n_splits=5)                          # ← разбиение по времени

# FreqAI делает то же самое окнами:
# "train_period_days": 30,      ← глубина обучающего окна
# "backtest_period_days": 5     ← шаг проверки и сдвига
```
Клик по `shuffle=True` — карточка с прямой цитатой урока: «обычная кросс-валидация со случайными фолдами здесь запрещена — она перемешивает время и ставит будущее в обучение».

### 2.8. Требования к E7 в рамках этого интерактива
- Ячейки линейки: 120 штук, минимум 6 px на ячейку на десктопе; на мобильном — линейка скроллится горизонтально с фиксированной лупой.
- Раскраска обновляется ≤ 16 мс при drag.
- Запрещённые конфигурации: обучение правее проверки (режим ②), окно walk-forward с отрицательным шагом (заблокировать ползунком), пересечение окон обучения и проверки — красная подсветка + текст причины.
- Режим ① не имеет drag (случайность должна выглядеть случайностью); есть только переключение фолда и seed.
- Лупа: линии к соседям рисуются поверх линейки; красный контур для соседей с t' > t; подпись обновляется словами, а не только цветом.

### 2.9. Пограничные случаи
- Seed, где случайные фолды дают «всего» 70 %: показывать честно; кнопка «20 раз» даёт гистограмму разрывов ① − ③ (медиана ≥ 20 п.п.).
- Режим ② с t1 у правого края (проверка 10 дней): плашка «10 дней проверки — выводы делать нельзя (урок М30)», точность показывать с широким доверительным интервалом (полоса ±).
- Режим ③ с шагом 1 и глубиной 60: окон мало на 120 днях — предупредить «меньше 6 окон — оценка шумная».
- Не показывать доходность в деньгах — только «долю верных направлений»; деньги увеличили бы эмоциональный шум и не относятся к заблуждению.

### 2.10. Критерии приёмки FAI-03b
1. При seed и параметрах по умолчанию: ① ∈ [78, 88] %, ② ∈ [50, 58] %, ③ ∈ [50, 60] %; счётчик «будущее в обучении» — ① ≥ 95 %, ② и ③ = 0 %.
2. В лупе для режима ① минимум у 2 из 3 первых показанных дней проверки есть сосед из будущего (при дефолтном seed — проверить и зафиксировать seed).
3. Drag в режиме ② невозможно довести до конфигурации «обучение позже проверки» без красной подсветки и текстовой причины.
4. Тренажёр walk-forward засчитывает только пару 30/5; при 30/5 на линейке ровно 17 окон при N=120 без первых/последних 5 дней (агент — проверить арифметику и вывести число окон на экран).
5. Гейт освоения: шаги 1, 4, 6 выполнены.
6. Все токены из 0.3 кликабельны; цитата урока привязана к `shuffle=True`.
7. Таблица калибровки на 200 seed’ах приложена к PR.

---

## 3. Порядок сборки и тест-план

**Очерёдность:** сначала FAI-03b (он же — первое боевое применение движка E7, который дальше нужен для 1.9, М42, FT-16, FAI-05, FAI-07), затем FAI-03a (лёгкая ось времени — подмножество E7).

**Общие компоненты, которые надо вынести:** генератор с seed; kNN и пороговое правило как отдельные чистые функции; компонент «двуязычный код» с кликабельными токенами; компонент «карточка метрики с потолком/интервалом»; компонент «Прогнать 20 раз» с мини-гистограммой; хук записи в E5.

**Тест-план (автотесты):**
- Детерминизм: один seed → побайтно одинаковый результат симуляции.
- Калибровка: 200 seed’ов на каждый режим/дефолт, проверка диапазонов из 1.6 и 2.5; падение теста при выходе медианы за диапазон.
- Инварианты честности: в режимах ② и ③ FAI-03b счётчик «будущее в обучении» строго 0; в версии Б и В FAI-03a ни одна свеча из теста не участвует в вычислении μ/σ (юнит-тест на индексы).
- Гейты: следующий блок урока недоступен до выполнения критериев освоения.
- Языковой слой: снапшот-тест, что каждый токен из 0.3, встречающийся в разметке, имеет карточку.

**Метрики после внедрения (для методолога):** доля учеников, правильно предсказавших вердикт режима ① до показа (ожидаем < 40 % на входе — это и есть заблуждение); доля правильных кликов по строке `fit(X_all)` с первой попытки; доля учеников, включивших тумблер «Честно догнать режим»; средняя разница ответов на шаге 6 при первой и повторной попытке (цель −50 % ошибок).

-----------------

# ТЗ на реализацию двух симуляторов FreqAI-трека

**FAI-04 «10 против 50 признаков»** и **FAI-05 «Окно переобучения при смене режима»**

---

## 0. Общие положения для обоих интерактивов

### 0.1. Кто перед нами
Русскоязычный новичок, который к уроку FAI-04 уже прошёл: 1.9 (Train/Test/Walk-Forward), 1.10 (переобучение), FT-16 (hyperopt, правило «OOS 50–70% от IS»), FAI-02 (признаки `%-` и цели `&s-`), FAI-03 (скейлер только на train). Он **не** программирует ML руками и **не** читает по-английски. Все подписи — русские; английские токены только там, где они реально встретятся в конфиге FreqAI (`train_period_days`, `backtest_period_days`, `do_predict`), и только с всплывающей русской карточкой (режим «Ткни в непонятное»).

### 0.2. Методические инварианты (обязательны)
1. **Один интерактив — одно заблуждение.** FAI-04 ломает «больше признаков — лучше». FAI-05 ломает «переобучилась вчера = работает». Ничего сверх этого не добавлять.
2. **Числа из урока.** FAI-04: 10 и 50 признаков; IS + три OOS; правило «Б лучше А, только если в ≥2 из 3 OOS»; критерий «разрыв IS/OOS > 2× — упрощай». FAI-05: `train_period_days` 7…180 (дефолт 30), `backtest_period_days` дефолт 5; мониторинг = «доля верных направлений скользящим окном»; три периода из практики урока (спокойный / тренд / стресс).
3. **Предсказание до показа.** Перед первым прогоном ученик обязан выбрать ответ на контрольный вопрос (pre-commit). Ответ сохраняется и показывается рядом с фактом после прогона.
4. **Честная механика.** Внутри — настоящая (упрощённая) модель: гребневая регрессия на синтетических данных, скейлер только на обучающем окне, признаки только из прошлого. Никаких «нарисованных» кривых. Под графиком — постоянная плашка: *«Учебная симуляция: данные синтетические, модель — упрощённая версия того, что делает FreqAI. Механика настоящая, цифры — не про реальный рынок».*
5. **Сквозной персонаж.** Сценарные подписи — от лица Алексея (депозит 1000 $ / 100 000 ₽), как в Py-треке.
6. **Воспроизводимость.** Детерминированный ГПСЧ с фиксированным `DEFAULT_SEED`. Кнопка «Новая история» переключает seed (показывает вариативность), кнопка «Вернуть учебную историю» возвращает дефолт.

### 0.3. Общие технические блоки (реализовать один раз, переиспользовать)
- **ГПСЧ:** `mulberry32(seed)`; нормальные — Box–Muller; t-распределение с ν степенями свободы — через отношение нормали и χ² (сумма ν квадратов нормалей). Тот же алгоритм продублировать в эталонном Python-скрипте — результаты JS и Python должны совпадать с точностью 1e-6.
- **Стандартизация:** среднее и σ считаются **только** по обучающему окну и применяются к обучению и к проверке (ссылка на FAI-03 в тултипе).
- **Гребневая регрессия:** решение `(XᵀX + λI)β = Xᵀy` методом Холецкого или Гаусса; размерность до 101×101 (со свободным членом) — считать синхронно в браузере, время < 50 мс.
- **Метрики (единые формулы):**
  - *Доля верных направлений* `hit = mean( sign(pred_t) == sign(r_t) )` по всем барам окна (бары с `r_t = 0` не считаются).
  - *Позиция:* лонг (1), если `pred_t > 0`, иначе кэш (0). Решение по данным ≤ t−1, исполнение на баре t.
  - *Оборот (turnover):* `Σ|pos_t − pos_{t−1}| / N_bars` — доля баров со сменой позиции.
  - *Издержки:* 0,1 % за каждую смену позиции (тариф из FT-13).
  - *Кривая капитала:* `eq_t = eq_{t−1}·(1 + pos_{t−1}·r_t) − eq_{t−1}·0,001·|pos_t − pos_{t−1}|`, старт 1000 $.
  - *Максимальная просадка:* `max_t (peak_t − eq_t)/peak_t`.
- **Палитра:** модель/окно А — синий, модель/окно Б — оранжевый; режимы рынка — три бледных фона (серо-голубой, бледно-зелёный, бледно-красный). Дублировать цвет текстовой меткой всегда (дальтоники).
- **Хуки движков:** E7 «Линейка времени» — для отрисовки окон; E5 «Журнал» — кнопка «Записать эксперимент в журнал» формирует строку (дата, вердикт, ключевые числа); E1-словарь — тултипы токенов.
- **Аналитика (события):** `interactive_open`, `precommit_answer`, `run`, `slider_change {name,value}`, `trap_click`, `verdict_shown {predicted, actual}`, `mastery_passed`, `journal_saved`.

---

## 1. FAI-04 «10 против 50 признаков»

### 1.1. Цель
Ученик **видит своими руками**, что модель с 50 признаками выигрывает на обучении и проигрывает вне выборки, и **сам выносит вердикт по правилу «2 из 3 OOS»**, а не по итоговой цифре.

Заблуждение: «Чем больше признаков я насыплю в FreqAI, тем умнее модель».
Результат обучения: ученик формулирует правило принятия сложности: *«Сложнее — только если улучшение воспроизводится минимум в 2 из 3 OOS-окон, а разрыв обучение/проверка не вырос».*

### 1.2. Место и связи
Ставится после блока «Глубже» урока 224 (сразу за псевдокодом `freqai_lab_features.py`). Ссылки в тултипах: 1.10 (перебор и подгонка), 1.12 (плато vs пик), FT-16 (OOS = 50–70% от IS — здоровая норма), FAI-03 (скейлер на train), М41 (полином 15-й степени).

### 1.3. Сценарий пользователя
1. **Экспозиция (10 сек).** Карточка: *«Алексей собрал две модели для FreqAI. Модель А — 10 признаков, каждый он может объяснить словами. Модель Б — те же 10 плюс 40 признаков, которые сгенерировал автоматически: лаги, произведения, окна разной длины. Обучаем обе на одном периоде, проверяем на трёх следующих».*
2. **Pre-commit.** Вопрос: *«Какая модель покажет лучшую долю верных направлений на трёх проверочных окнах?»* Варианты: `А (10 признаков)` / `Б (50 признаков)` / `Одинаково` / `Не знаю`. Без ответа кнопка «Прогнать» неактивна.
3. **Прогон.** Кнопка «Обучить на IS и проверить на OOS-1…3». Анимация 1,5–2 с: линейка времени заполняется слева направо (обучение — штриховка окна IS, затем поочерёдно три OOS). Числа в таблице появляются по мере «прохода».
4. **Раскрытие.** Таблица результатов + вердикт по правилу «2 из 3» + сравнение с предсказанием ученика: *«Ты ставил на Б. Факт: Б лучше в 1 окне из 3 — правило не пройдено».*
5. **Рычаги (свободное исследование).**
   - Ползунок «Число признаков в модели Б»: 10…100, шаг 10 (дефолт 50). Пересчёт мгновенный; появляется мини-график «IS и OOS против числа признаков» (классическая расходящаяся вилка).
   - Кнопка «Убрать половину автопризнаков у Б» (из урока: *«убираешь половину признаков → метрики вне выборки выросли? был шум»*) — ставит ползунок в 30 и подсвечивает изменение OOS-строки.
   - Кнопка «Новая история» — другой seed; счётчик под таблицей: *«За N историй Б прошла правило «2 из 3» в k случаях»* (см. 1.8, ловушка удачи).
6. **Ловушка (кнопка-провокация).** «Выбрать для Б лучшее OOS-окно и показать его начальству». При нажатии — модальное окно: *«Стоп. Ты выбрал проверочное окно по результату — теперь оно часть обучения, а честного OOS у тебя больше нет (урок FAI-03, М42). Правило «2 из 3» существует именно против этого движения руки».* Кнопка «Понял, откатить».
7. **Критерий освоения (см. 1.9), запись в журнал E5.**

### 1.4. Экран (макет сверху вниз, ширина ≥ 360 px адаптивно)
**Блок 1 — Две карточки моделей (рядом, на мобильном — табы).**
- Заголовок: «Модель А · 10 признаков» / «Модель Б · 50 признаков».
- Список признаков. У А — 10 русских имён с тултипом «почему это может работать» (одна строка). У Б — те же 10 + свёрнутый список «40 автопризнаков ▸» (разворачивается; имена вида «авто-признак №11: лаг 7 дневной доходности», «№12: RSI-14 × объём/средний», «№13: окно 33 дня скользящего среднего квадрата доходности» …). Пометка серым: *«Сгенерированы перебором комбинаций без рыночного объяснения»*.
- Внизу карточки Б — ползунок числа признаков (10…100).

**Блок 2 — Линейка времени (E7).** Одна горизонтальная шкала 850 дневных баров: `IS` (0–399, штриховка синяя, подпись «Обучение · 400 дней ≈ 13 мес») и `OOS-1`, `OOS-2`, `OOS-3` (по 150 дней, подпись «Проверка · 5 мес каждое»). Границы **не** перетаскиваются (фиксированы по уроку). Тултип на IS: «In-sample — то, что модель видела». На OOS: «Out-of-sample — то, чего модель не видела ни разу».

**Блок 3 — Кнопка «Обучить и проверить» + pre-commit вопрос над ней.**

**Блок 4 — Таблица результатов.** Строки: `IS (обучение)`, `OOS-1`, `OOS-2`, `OOS-3`, `Итог по OOS`. Группы колонок:
- Доля верных направлений: А | Б | Δ (Б−А, п.п.)
- Макс. просадка: А | Б | Δ
- Оборот (доля дней со сменой позиции): А | Б | Δ
- Вердикт окна: «Б лучше» / «А лучше» / «≈ равны» (по доле верных направлений; «≈», если |Δ| < 1 п.п.)

Строка `Итог по OOS`: медиана по трём окнам + ячейка «Правило 2 из 3: ПРОЙДЕНО / НЕ ПРОЙДЕНО». Под таблицей две строки-диагноза:
- *«Разрыв обучение → проверка. А: 58 % → 55 % (−3 п.п.). Б: 66 % → 52 % (−14 п.п.). Разрыв у Б в 4,7 раза больше — по правилу урока (>2×) модель упрощаем».*
- *«Отношение OOS/IS у Б: 0,79 — но абсолютная точность ниже монетки в 2 окнах из 3»* (связь с FT-16: ratio сам по себе не спасает).

**Блок 5 — Две кривые капитала** (А и Б) на всём периоде с вертикальными разделителями окон; отдельно подписано «IS» тонкой пунктирной рамкой: *«внутри рамки — то, что модель уже видела; красивая кривая здесь ничего не стоит»*.

**Блок 6 — Мини-график «Число признаков → точность»** (появляется после первого движения ползунка): ось X 10…100, две линии: IS (растёт монотонно) и медиана OOS (плоская, затем падает). Точка текущего значения подсвечена.

**Блок 7 — Кнопки:** «Убрать половину автопризнаков у Б», «Новая история», «Вернуть учебную историю», «Выбрать лучшее OOS-окно для Б» (ловушка, стилизована как обычная кнопка — не предупреждать заранее), «Записать эксперимент в журнал».

### 1.5. Модель данных и симуляция
```
N_IS = 400; N_OOS = 150; N = 850 (дневные бары)
seed → rng = mulberry32(seed)

// 1. Скрытые факторы (AR(1) с φ = 0.3), три информативных:
for j in 1..3: g_j[t] = 0.3*g_j[t-1] + N(0,1)*sqrt(1-0.09)

// 2. Доходность (σ = 2 % в день):
signal[t] = 0.16*g_1[t-1] + 0.13*g_2[t-1] + 0.10*g_3[t-1]   // ρ ≈ 0.23 → потолок точности ≈ 57–58 %
r[t] = 0.02 * (signal[t] + N(0,1))

// 3. Признаки модели А (10 штук), все с меткой t-1 (только прошлое!):
fA_1..fA_3 = g_1..g_3 (переименованы: «отклонение RSI-14 от 50», «доходность за 5 дней», «объём / средний за 20»)
fA_4..fA_6 = 0.35*g_j + 0.94*AR(1)шум   // слабые тени: «доходность за 20 дней», «отклонение от EMA-20», «наклон EMA-50»
fA_7..fA_10 = чистый AR(1)-шум            // «волатильность 20», «доходность за 1 день», «ширина диапазона дня», «день недели (синус)»

// 4. Автопризнаки Б (до 90 штук, показываем первые K-10):
fB_k = AR(1)-шум φ=0.3, независимый; имена генерируются по шаблону

// 5. Обучение (для каждой модели, K признаков):
X_IS = стандартизовать(X[0:400]) — mu, sd только по IS
β = ridge(X_IS, r[0:400], λ = 1e-4 * N_IS)
pred[t] = X_std[t] · β  для всех t (X_std по mu, sd IS)

// 6. Метрики по каждому окну — формулы из 0.3
```
Объяснение для агента: при n = 400 и p = 50 «ложная» доля объяснённой дисперсии ≈ p/n = 12,5 %, что даёт заметный разрыв IS/OOS у Б без всяких трюков. Коэффициенты 0,16/0,13/0,10 и λ — **стартовые**, их надо подобрать по приёмочным критериям (1.10) эталонным Python-скриптом; менять допускается только их и `DEFAULT_SEED`.

Ползунок «число признаков Б» = K ∈ {10,20,…,100}: модель Б использует 10 признаков А + первые K−10 автопризнаков. При K = 10 Б ≡ А (таблица обязана показать нули в Δ — это тест корректности).

### 1.6. Формулы вердикта
- `verdict_window = 'Б' если hitB − hitA ≥ 1 п.п.; 'А' если ≤ −1 п.п.; иначе '≈'`
- `rule_2of3 = count(verdict_window == 'Б' по OOS-1..3) ≥ 2`
- `gap_A = hitA_IS − median(hitA_OOS)`, аналогично Б; `gap_ratio = gap_B / max(gap_A, 0.5 п.п.)`; диагноз «>2× — упрощай» выводится, если `gap_ratio > 2`.
- `ratio_B = median(hitB_OOS) / hitB_IS` (показывать как «OOS/IS», сравнивать с 0,5–0,7 из FT-16 — но текстом подчеркнуть, что отношение вторично относительно абсолютной точности выше 50 %).

### 1.7. Микротексты (точные строки)
- Заголовок: **«10 против 50 признаков: кто выучил рынок, а кто — прошлогодний экзамен?»**
- Подпись под таблицей после дефолтного прогона (значения подставляются): *«На обучении Б выглядит гением: {hitB_IS} % против {hitA_IS} %. На трёх проверках Б выиграла {k} из 3. Правило урока: сложность оправдана, только если выигрывает минимум в двух окнах. Вердикт: остаёмся с А».*
- При K ≥ 80: *«Модель Б теперь помнит обучающий период почти наизусть ({hitB_IS} %) — и ошибается вне его как монетка ({med_B} %). Это студент, выучивший лист с ответами».*
- При нажатии «Убрать половину…»: *«Убрали 20 автопризнаков. Точность вне выборки {выросла/не изменилась}: значит, эти признаки были шумом».*
- Ловушка (см. 1.3 п.6).
- Итоговая подпись (всегда внизу): *«Сложность растёт только за доказанную пользу вне выборки. Доказательство — не одно окно и не итоговая цифра, а воспроизводимость: 2 из 3».*

### 1.8. Ловушки
1. **Выбор лучшего окна** (описана выше) — главная.
2. **Ловушка удачи.** «Новая история» переключает seed; под таблицей копится счётчик: *«В {M} историях Б прошла правило «2 из 3» в {k}»*. Ожидаемо k/M ≈ 15–30 %. Когда k впервые > 0, показывается плашка: *«Даже правило «2 из 3» иногда обмануть можно — случайно. Поэтому оно идёт в связке: разрыв IS/OOS у Б всё равно больше, а базовая ставка класса (П56) против сложных моделей».* Это не отменяет правило — это показывает, почему оно не единственное.
3. **Смотреть только на кривую капитала внутри IS.** Пунктирная рамка IS с подписью появляется всегда; при наведении на IS-часть кривой Б — тултип: *«Здесь Б знала ответы»*.

### 1.9. Критерий освоения
Интерактив помечается пройденным, когда выполнены все три:
1. Дан ответ pre-commit (любой) и просмотрен вердикт.
2. Ползунок числа признаков двигался минимум до двух разных значений (мини-график построен).
3. Контрольный вопрос после исследования: *«Модель Б выиграла в OOS-2 на 3 п.п., проиграла в OOS-1 и OOS-3. Друг говорит: «Вот же, работает — смотри OOS-2». Что верно?»* — правильный ответ: «Одно окно из трёх — не доказательство; берём А; выбирать окно по результату запрещено». Два дистрактора: «Б лучше — OOS-2 самый свежий», «Нужно обучить Б ещё раз только на OOS-2».

### 1.10. Приёмочные критерии (проверять эталонным Python-скриптом, затем сверять с JS)
Для `DEFAULT_SEED` при K = 50:
- `hitA_IS ∈ [56, 60] %`, `median(hitA_OOS) ∈ [53, 57] %`
- `hitB_IS ∈ [63, 70] %`, `median(hitB_OOS) ∈ [49, 53] %`
- Б выигрывает по доле верных направлений **≤ 1** OOS-окна из 3
- `gap_B / gap_A ≥ 2,5`
- `turnover_B > turnover_A` на медиане OOS; `maxDD_B ≥ maxDD_A` на медиане OOS
- при K = 10: все Δ равны 0 (тест тождества)
- при K = 100: `hitB_IS ≥ 72 %`, `median(hitB_OOS) ≤ 52 %`
- монотонность: `hitB_IS(K)` не убывает по K на дефолтном seed
Процедура: перебрать seed 1…1000, выбрать первый, удовлетворяющий всем пунктам; зафиксировать как `DEFAULT_SEED`. Для 200 случайных seed доля «Б прошла 2 из 3» должна быть в [10 %, 35 %] (иначе подкрутить σ/λ). Время полного пересчёта в браузере при движении ползунка < 100 мс.

### 1.11. Языковой слой
Тултипы E1-словаря (клик по подчёркнутому): `IS / in-sample` → «данные, на которых модель обучалась»; `OOS / out-of-sample` → «данные, которых модель не видела»; `%-признак` → «то, что модель видит; префикс из FAI-02»; `&s-цель` → «то, что модель предсказывает»; `ridge / гребневая регрессия` → «простейшая модель: взвешенная сумма признаков со штрафом за большие веса»; `turnover` → «оборот: как часто модель меняет позицию — каждая смена стоит комиссию». Английские слова в интерфейсе не используются, кроме подписей `IS/OOS` рядом с русскими.

---

## 2. FAI-05 «Окно переобучения при смене режима»

### 2.1. Цель
Ученик двигает `train_period_days` и **видит три разных судьбы одной модели**: короткое окно учит шум, длинное окно опаздывает к смене режима, а при исчезновении структуры **не помогает никакое окно и никакая частота переобучения**. Затем ученик **сам настраивает критерий отключения** ML-слоя.

Заблуждение: «Модель переобучилась вчера — значит, она в курсе рынка и работает».
Результат: ученик различает три состояния (норма / адаптация после смены режима / деградация без восстановления) и знает, что автообновление — обслуживание, а не гарантия.

### 2.2. Место и связи
После блока «Глубже» урока 225 (перед «Проверь себя»). Связи в тултипах: П34 (смена режимов, когда чинить систему, а когда себя), 5.4 (просадка vs деградация альфы, CUSUM), FAI-07 (пункт 5 чек-листа: мониторинг и отключение при деградации), 3.6 (стресс-дни).

### 2.3. Сценарий пользователя
1. **Экспозиция.** *«У Алексея FreqAI переобучает модель каждые 5 дней. Он спокоен: «модель всегда свежая». Впереди два года рынка: сначала боковик, потом тренд, потом что-то, чего в истории не было».* Три режима на графике **подписаны с самого начала** — цель не угадать режим, а увидеть поведение модели.
2. **Pre-commit.** *«Какая глубина обучающего окна лучше всех переживёт третий период?»* Варианты: `7 дней` / `30 дней` / `180 дней` / `Никакая — третий период не переживёт ни одно окно`.
3. **Прогон.** Кнопка «Запустить два года с переобучением». Анимация 3–4 с: курсор идёт по времени; каждые `backtest_period_days` вспыхивает значок «⟳ переобучена»; рядом бежит кривая точности.
4. **Раскрытие.** Кривая точности для T = 30, таблица по пресетам T, бейдж «Последнее переобучение: 1 день назад ✓» рядом с красным индикатором «Точность за 60 дней: 49 %» в третьем периоде — визуальный удар ровно по заблуждению.
5. **Рычаги.** Ползунок `train_period_days` 7…180 (шаг 1, засечки 7/30/60/90/180); ползунок `backtest_period_days` {1, 2, 5, 10, 20, 30}; тумблеры «показать призраки T = 7 / 30 / 180».
6. **Тренажёр отключения (ТРН).** Ползунок «Отключить ML-слой, если доля верных направлений за 60 дней ниже … %» (40…55 %, шаг 0,5; дефолт 50 %). Задача: *«Настрой порог так, чтобы он не сработал ложно в первых двух периодах, но выключил модель в третьем».* Показываются две кривые капитала: «с отключением» и «без».
7. **Критерий освоения, запись в журнал.**

### 2.4. Экран (сверху вниз)
**Блок 1 — Панель конфигурации (стилизована под фрагмент `config.json`, но с русскими подписями справа):**
```
"train_period_days": [ползунок 7…180]   ← глубина обучающего окна, дней
"backtest_period_days": [ползунок]      ← шаг сдвига вперёд: как часто переобучаем
```
Оба ключа кликабельны (E1). Справа — счётчик: «Переобучений за 2 года: {720/S}».

**Блок 2 — График цены (720 дневных баров)** с тремя цветными фонами и подписями: «Период 1 · Боковик, дни 1–300», «Период 2 · Тренд, дни 301–540», «Период 3 · Сдвиг структуры, дни 541–720». Под графиком — бегунок текущего дня и бейдж «⟳ Последнее переобучение: N дн. назад» (обновляется в анимации; после прогона застывает на последнем значении — почти всегда «1–5 дней назад»).

**Блок 3 — Кривая качества.** Доля верных направлений в скользящем окне 30 дней для выбранного T (жирная линия), горизонтальная линия 50 % («монетка»), горизонтальная линия порога отключения (пунктир, цвет тревоги). «Призраки» T = 7 / 30 / 180 — тонкие полупрозрачные линии по тумблерам. Вертикальные пунктиры на границах режимов. В области, где точность держится ниже порога ≥ 60 дней, — заливка и метка **«Дорога исчезла»**. Рядом с кривой — два индикатора-«светофора»: «Свежесть модели» (зелёный, если переобучение было ≤ S дней назад — то есть всегда зелёный) и «Качество за 60 дней» (зелёный ≥ 54 %, жёлтый 50–54 %, красный < 50 %).

**Блок 4 — Таблица по пресетам T** (пересчитывается на загрузке для T ∈ {7, 30, 60, 90, 180} и подсвечивает столбец текущего T; если текущий T не совпадает с пресетом — добавляется шестой столбец «твой T»):
| | T = 7 | T = 30 | T = 60 | T = 90 | T = 180 |
|---|---|---|---|---|---|
| Точность в периоде 1 (боковик) | | | | | |
| Задержка адаптации после смены 1→2, дней | | | | | |
| Точность в периоде 2 (тренд) | | | | | |
| Точность в периоде 3 (сдвиг) | | | | | |
| Переобучений в периоде 3 | | | | | |
| Вердикт | учит шум | компромисс | компромисс | опаздывает | опаздывает |
Последняя строка периода 3 у всех столбцов — «≈ монетка».

**Блок 5 — Тренажёр отключения.** Ползунок порога + подпись состояния: «Ложных срабатываний в периодах 1–2: {n}. Отключение в периоде 3: день {d} (через {d−540} дней после сдвига) / не сработало». Две кривые капитала (1000 $): «с критерием отключения» (после отключения — кэш, горизонталь) и «без критерия» (продолжает торговать по модели). Итог в $ обеих.

**Блок 6 — Кнопки:** «Новая история», «Вернуть учебную историю», «Записать эксперимент в журнал».

### 2.5. Модель данных и симуляция
```
WARMUP = 60 (для признаков), N = 720 (показываем дни 1..720)
Режимы по индексу дня t (1..720):
  R1: 1..300     R2: 301..540     R3: 541..720

// Логарифм цены p[t], доходность r[t] = p[t]-p[t-1]
σ1 = 0.015

// R1 — процесс Орнштейна–Уленбека (возврат к среднему): признак z20 предсказывает знак «наоборот»
level = медленный дрейф: level[t] = level[t-1] + 0.0003
p[t] = level[t] + (p[t-1]-level[t-1])*0.90 + σ1*N(0,1)

// R2 — импульс: положительная автокорреляция доходностей
r[t] = 0.0008 + 0.30*r[t-1] + σ1*N(0,1)*sqrt(1-0.09)

// R3 — стресс: структуры нет, хвосты толстые, волатильность ×2
r[t] = 2*σ1 * t-dist(ν=3) / sqrt(3)      // масштаб к единичной σ
// опционально: день 545 — r = -0.20 (кейс FTX из 3.6), флаг ENABLE_CRASH=true

// Признаки (все по данным ≤ t-1; проверить отсутствием shift(-1) — тест):
z20  = (p[t-1] - SMA20[t-1]) / STD20[t-1]
r1   = r[t-1];  mom5 = Σ r[t-5..t-1];  mom20 = Σ r[t-20..t-1]
vol20 = STD(r[t-20..t-1]);  rsi14 = RSI по close до t-1, центрирован: (rsi-50)/50

// Walk-forward:
for t_start in range(T, N, S):
   train = дни [t_start-T, t_start)      // T = train_period_days
   test  = дни [t_start, min(t_start+S, N))
   mu, sd по train; β = ridge(X_train_std, r_train, λ = 1e-3*T)
   pred[test] = X_test_std·β ; last_retrain_day[test] = t_start
// первые T дней предсказаний нет → серым «нет модели»

// Качество: hit_roll30[t] = среднее верных направлений по [t-29, t]
// Критерий отключения: hit_roll60[t] < THR  → off с дня t до конца (и метка)
// Задержка адаптации после 1→2: первый день d ≥ 301, начиная с которого hit_roll30 ≥ 54 % десять дней подряд; d − 300.
```
Позиция — лонг/кэш по знаку прогноза (см. 0.3), издержки 0,1 % за смену. При «off» позиция 0.

Пояснение агенту: в R1 модель, обученная на достаточно длинном окне, выучивает отрицательный вес у `z20` (точность ~56–58 %); в R2 те же признаки требуют **другого знака** (`r1`, `mom5` положительные) — модель с длинным окном ещё помнит R1 и ошибается систематически ≈ T дней; в R3 признаки не связаны с будущим при любом T, а переобучение каждые S дней лишь перекладывает шум.

### 2.6. Микротексты
- Заголовок: **«Переобучилась вчера — значит работает?»**
- При T ≤ 10 в периоде 1: *«Окно 7 дней — модель каждую неделю выучивает новую случайность. Точность болтается вокруг 50 %: она не отстаёт от рынка, она отстаёт от здравого смысла».*
- При T ≥ 120 на границе 1→2: *«Окно 180 дней помнит боковик ещё {lag} дней после того, как начался тренд. Всё это время она ставит «наоборот»: точность {min_hit} %».*
- В периоде 3 при любом T (главная реплика, крупно): *«Переобучена {n} раз за 180 дней. Последний раз — {k} дн. назад. Точность за 60 дней — {hit} %. Навигатор пересчитывает маршрут каждые пять минут, а дороги больше нет».*
- При уменьшении S до 1: *«Переобучаем каждый день: {n} обучений в периоде 3. Точность {hit} %. Частота обновлений — обслуживание, а не работоспособность».*
- Тренажёр, ложное срабатывание: *«Порог {THR} % выключил модель в периоде {1|2} на день {d} — это была просадка внутри работающего режима, не деградация (урок 5.4). Опусти порог или удлини окно проверки».*
- Тренажёр, успех: *«Порог {THR} %: ложных срабатываний нет, отключение на день {d} — через {d−540} дней после сдвига. Модель без критерия к концу периода: {eq_off} $; с критерием: {eq_on} $».*
- Итоговая подпись: *«Автообновление держит модель свежей, а не работающей. Работоспособность видна только на живых предсказаниях: доля верных направлений скользящим окном + записанный заранее порог отключения».*

### 2.7. Ловушки
1. **Бейдж свежести.** «Свежесть модели» всегда зелёный — намеренно, чтобы ученик сам заметил противоречие с красным «Качеством». При первом входе в период 3 в анимации бейдж на секунду увеличивается.
2. **«Дожать частотой».** Если ученик в периоде 3 двигает `backtest_period_days` к 1 — счётчик переобучений растёт, точность нет; реплика выше. Событие `trap_click {type:'frequency'}`.
3. **Слишком чувствительный порог.** THR ≥ 53 % с окном 60 дней даёт ложное срабатывание в периоде 1 или на границе 1→2 — ученик видит цену «выключить при первой просадке» (П1, 5.5: рабочая система, выключенная руками на дне).

### 2.8. Критерий освоения
Все четыре:
1. Pre-commit дан, вердикт просмотрен (правильный ответ — «никакая»).
2. Испробованы минимум три значения T, включая ≤ 10 и ≥ 120.
3. Тренажёр: найден порог, при котором `false_triggers == 0` и `trigger_day ∈ [541, 720]` для T = 30, S = 5 на учебной истории.
4. Контрольный вопрос (из урока, переформулирован): *«Что даёт периодическое переобучение модели?»* — правильно: «Актуальность модели текущему режиму, но не защиту от смены структуры рынка».

### 2.9. Приёмочные критерии (эталонный Python-скрипт → сверка с JS)
Для `DEFAULT_SEED`, S = 5:
- T = 7: точность в периоде 1 ∈ [49, 53] %, размах hit_roll30 в периоде 1 ≥ 18 п.п.
- T = 30: период 1 ∈ [54, 58] %; задержка адаптации после 1→2 ∈ [25, 50] дней; период 2 ∈ [54, 59] %
- T = 90: период 1 ∈ [55, 59] %; задержка адаптации ≥ 70 дней; минимум hit_roll30 в первые 60 дней периода 2 ≤ 46 %
- T = 180: задержка адаптации ≥ 120 дней или «не восстановилась до конца периода 2»
- **Для всех T ∈ {7, 30, 60, 90, 180}: точность в периоде 3 ∈ [47, 52] %**; для S = 1 при T = 30 — тоже ∈ [47, 52] %
- Тренажёр (T = 30, S = 5, окно 60): существует непустой интервал THR ⊂ [47, 51] %, где ложных срабатываний в днях 1–540 нет и отключение происходит в дни 541–720; при THR = 54 % — есть ложное срабатывание
- Кривая капитала без критерия за период 3 должна проигрывать кэшу (издержки + шум) минимум на 3 %
- Пересчёт walk-forward при движении ползунка T: < 80 мс при S = 5; < 300 мс при S = 1 (720 обучений на 6 признаках — тривиально)
Процедура выбора seed — как в 1.10; если интервал порога пуст более чем у 40 % seed, уменьшить σ3 или усилить связь в R1 — но не выходить за пределы, при которых пункты для T = 7 и периода 3 ломаются.

### 2.10. Языковой слой
`train_period_days` → «глубина обучающего окна в днях: сколько прошлого видит модель при каждом переобучении»; `backtest_period_days` → «шаг сдвига вперёд: через сколько дней модель переобучается заново»; `walk-forward` → «скользящее окно: учимся на прошлом, предсказываем следующий отрезок, сдвигаемся, повторяем (урок 1.9)»; `regime change / смена режима` → «рынок сменил правила: связь признаков с будущим изменилась или исчезла (П34)»; `do_predict` (в подписи светофора качества) → «флаг FreqAI: модель уверена в данных — здесь мы дополняем его собственным критерием качества».

---

## 3. Общие требования к реализации и сдаче

### 3.1. Состояния и крайние случаи
- Состояние «до прогона»: таблицы пустые с плейсхолдером «—», графики с одной ценой без прогнозов. Ползунки активны, но пересчёт не запускается до первого прогона.
- Ползунки с клавиатуры (стрелки, Home/End), aria-подписи на русском.
- Сохранение состояния (seed, значения ползунков, pre-commit, флаг освоения) в localStorage по ключу урока; кнопка «Сбросить».
- Мобильная вёрстка: карточки/таблицы — горизонтальная прокрутка с закреплённым первым столбцом; графики не ниже 220 px.
- Деградация: если WebGL/Canvas недоступен — SVG-рендер; вычисления не зависят от рендера.

### 3.2. Структура кода (рекомендация)
```
/interactives/fai04_features/  index.ts  sim.ts (данные, ridge, метрики)  ui.tsx  copy.ru.ts  tests/
/interactives/fai05_retrain/   index.ts  sim.ts  ui.tsx  copy.ru.ts  tests/
/shared/  rng.ts (mulberry32, boxMuller, studentT)  ridge.ts  metrics.ts  timeline(E7)  journal(E5)  glossary(E1)
/reference/  fai04_reference.py  fai05_reference.py   // эталон: та же ГПСЧ, те же формулы, вывод JSON метрик
```
Все строки интерфейса — в `copy.ru.ts` (без английских литералов в компонентах).

### 3.3. Тесты (минимум)
- Юнит: ridge на известной матрице (сравнение с закрытой формулой 2×2), метрики на ручном ряде из 10 баров, ГПСЧ первые 5 значений совпадают с Python.
- Свойства: FAI-04 при K = 10 → Δ ≡ 0; FAI-05 при T = S = любое → нет обращений к `r[t]` при построении признаков дня t (тест «сдвинь будущее на константу — признаки не меняются», прямой аналог lookahead-analysis из FT-11).
- Снапшот: JSON метрик для `DEFAULT_SEED` совпадает с эталонным Python с точностью 1e-6.
- Приёмка: скрипт `check_acceptance.py`, печатающий PASS/FAIL по каждому пункту разделов 1.10 и 2.9.

### 3.4. Что НЕ делать
- Не добавлять выбор типа модели, гиперпараметров, реальных данных, других таймфреймов — это размывает единственное заблуждение каждого интерактива.
- Не «подрисовывать» кривые: все числа — из симуляции. Если приёмка не проходит — крутить только σ, коэффициенты связи, λ и seed.
- Не показывать английские названия метрик без русского эквивалента рядом.

### 3.5. Порядок сдачи
1. Эталонные Python-скрипты + выбранные `DEFAULT_SEED` + отчёт приёмки (PASS по всем пунктам).
2. JS-реализация симуляции с тестом совпадения с эталоном.
3. UI с полным набором микротекстов и ловушек.
4. Прогон методологом: 15 минут на каждый интерактив, проверка критериев освоения, запись в журнал E5, события аналитики в консоли.

---------------------

# Спецификации для реализации: FT-01 и FT-02

Формат: обе спеки самодостаточны — агент может реализовать их по отдельности. Все тексты интерфейса даны готовыми (русский, без английских терминов без перевода). Английское — только внутри кода/терминала, и там оно обязано быть кликабельным (см. языковой слой).

---

## Общие соглашения для обеих спек

| Пункт | Значение |
|---|---|
| Персонаж | Алексей, депозит 1000 $ (из Py-14 / ВК4) |
| Устройства | Десктоп — основной; мобильный — обязателен (tap-режим вместо drag) |
| Язык | Только русский. Английские токены допустимы внутри блоков кода/терминала и всегда сопровождаются кликом-переводом |
| Хранилище прогресса | `localStorage` + серверный прогресс, если есть аккаунт: `interactive_id`, `attempts`, `completed_at`, `result_payload` |
| Стиль обратной связи | Ошибка никогда не наказывается «красным крестом без объяснения». Каждый неверный ход = 1–2 предложения «почему нет» + подсказка направления |
| Критерий «пройдено» | Все элементы разложены/все экраны решены верно (с любым числом попыток); фиксируется число попыток и «чистое прохождение» (с первого раза) |
| Кнопка «Ткни в непонятное» | Глобальный переключатель в шапке интерактива: `англ. / рус. подписи / оба` (см. раздел 6 общего ТЗ) |

---

# СПЕКА 1. FT-01 · «Карта переноса: что выкидываем из ВК4»

## 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft01_transfer_map` |
| Урок | 201 · FT-01 «Что такое Freqtrade и где он находится в количественном стеке» |
| Тип | ИГР (мини-игра с обратной связью через ошибку) |
| Движок | без сквозных движков; использует глобальный словарь «Ткни в непонятное» |
| Целевое заблуждение | **«Фреймворк заменяет голову»**: раз есть Freqtrade, то ни гипотеза, ни kill-switch, ни проверка данных больше не мои — «всё внутри». Обратная сторона того же заблуждения: «надо перенести в Freqtrade всё, что я написал, включая загрузчик и учёт комиссий» |
| Что должен уметь после | Разложить любую функцию самописного бэктеста на три категории: заменяется каркасом / становится частью стратегии / остаётся личной зоной ответственности; назвать 4 вещи, которые Freqtrade **не** берёт на себя |
| Время прохождения | 6–9 минут |
| Опора на текст урока | Таблица «Самопис (ВК4) vs Freqtrade» и задание «Карта переноса» из урока 201; блок «Мост в Академию Freqtrade» из урока 142 (ВК4) |

## 2. Размещение в уроке

Вставить **после** таблицы «Самопис (ВК4) / Freqtrade / Комментарий» и **перед** блоком «⚠ Важно: Классическая ошибка новичка». Логика: ученик только что прочитал таблицу — интерактив заставляет применить её к коду Алексея, а следующий за интерактивом абзац «Инструмент не заменяет голову» звучит уже как вывод из собственного опыта.

## 3. UX-поток

### Экран 0 — Заставка (5 сек чтения)
> **Заголовок:** Карта переноса: что из бота Алексея едет в Freqtrade
> **Подзаголовок:** В уроке ВК4 Алексей написал бэктест руками — 8 функций, 120 строк. Теперь он переезжает на Freqtrade. Твоя задача — решить судьбу каждой функции.
> **Три корзины** (показать заранее, с пояснением):
> - 🗑 **ВЫКИНУТЬ** — это уже написано внутри Freqtrade, свой код не нужен
> - 📦 **ПЕРЕНЕСТИ В СТРАТЕГИЮ** — это твоя торговая логика, она едет в файл стратегии
> - 🔑 **ОСТАВИТЬ СВОИМ** — этого во Freqtrade нет и не будет, это остаётся твоей ответственностью
> **Кнопка:** «Начать разбор»

### Экран 1 — Основной раунд (8 карточек)

Раскладка (десктоп): слева колонка карточек-функций (стопка, видна верхняя + счётчик «3 из 8»), справа три корзины по вертикали. Под корзинами — прогресс-строка.

Раскладка (мобайл): карточка сверху на весь экран, три кнопки-корзины снизу (tap = положить). Никакого drag на мобильном.

**Карточка функции** содержит:
- имя функции моноширинным шрифтом (`load_candles()`),
- 1 строка «что делает» по-русски,
- сворачиваемый фрагмент кода Алексея (3–6 строк) с кликабельными английскими токенами,
- кнопка «Подсказка» (одна на карточку, раскрывает наводящий вопрос без ответа).

**Корзина** в свёрнутом виде — только название. При наведении/удержании (long-press) раскрывается описание, что именно в Freqtrade соответствует этой корзине (список механизмов: команды, файлы, ключи конфига).

**Механика броска:**
1. Верно → карточка «улетает» в корзину, переворачивается и показывает **куда именно** она попала (например: `→ freqtrade download-data`). Короткий тост-текст «Почему верно» (1–2 предложения). Счётчик +1.
2. Неверно → карточка возвращается с покачиванием; под ней появляется объяснение **именно для этой пары (карточка × ошибочная корзина)** и наводящий вопрос. Карточка остаётся активной. Счётчик попыток по карточке +1. После 2 неверных попыток открывается кнопка «Показать ответ» (ответ засчитывается как «с подсказкой»).

Порядок карточек фиксирован (педагогический): начинается с очевидных «выкинуть», затем «перенести», kill-switch — **последним** в основном раунде (кульминация).

### Экран 2 — Промежуточный итог
> «Из 8 функций Алексея: **4 выброшены** (их пишет за тебя каркас), **3 переехали в файл стратегии**, **1 осталась своей — kill-switch**.
> Он один? Нет. Есть ещё вещи, которых в бэктесте Алексея не было в виде функций, но которые тоже никуда не денутся.»
> Кнопка: «Раунд ловушек (5 карточек)»

### Экран 3 — Раунд ловушек (5 карточек)
Тот же интерфейс. Карточки специально бьют по остаточным заблуждениям: «комиссия встроена → и проскальзывание встроено», «стоп-лосс = kill-switch», «просветный тест больше не нужен», «гипотезу теперь придумает hyperopt».

### Экран 4 — Финальная карта
Таблица «Карта переноса Алексея» из всех 13 строк: `Функция | Вердикт | Механизм Freqtrade / где живёт теперь`. Три группы визуально разделены. Внизу:

> **Итог:** Каркас забрал у Алексея **6** функций и принял в стратегию **4**. **Своими** остались: гипотеза, kill-switch, оценка проскальзывания, просветный тест. Это и есть ответ на вопрос «что делает голова, когда есть фреймворк».
> Кнопки: «Сохранить карту в журнал» (создаёт запись в журнале ученика, если журнал уже реализован; иначе — «Скопировать таблицу») · «Пройти заново» · «Вернуться к уроку»

Статистика прохождения: «Разложено с первой попытки: N из 13». Если kill-switch или гипотеза были положены неверно хотя бы раз — отдельная строка: «Обрати внимание: ты пробовал отдать каркасу ___. Перечитай абзац "Чего Freqtrade НЕ делает"».

## 4. Контент — полные данные карточек

Формат данных: JSON. Поля: `id`, `round`, `order`, `name`, `what_ru`, `code` (массив строк), `tokens` (словарь англ. токен → русская подпись для «Ткни в непонятное»), `correct`, `destination_ru` (куда именно переезжает — показывается на обороте), `why_correct`, `wrong` (объяснения для двух неверных корзин), `hint`.

Значения `correct`: `"DROP"` (ВЫКИНУТЬ), `"STRATEGY"` (ПЕРЕНЕСТИ В СТРАТЕГИЮ), `"KEEP"` (ОСТАВИТЬ СВОИМ).

```json
[
  {
    "id": "load_candles",
    "round": 1, "order": 1,
    "name": "load_candles(pair, tf)",
    "what_ru": "Скачивает 500 часовых свечей с публичного API биржи и сохраняет в CSV",
    "code": [
      "def load_candles(pair='BTC/USDT', tf='1h', limit=500):",
      "    url = f'https://api.binance.com/api/v3/klines'",
      "    r = requests.get(url, params={'symbol': 'BTCUSDT', 'interval': tf, 'limit': limit})",
      "    df = pd.DataFrame(r.json(), columns=COLS)",
      "    df.to_csv('btc_1h.csv'); return df"
    ],
    "tokens": {"requests.get": "отправить запрос на сервер", "params": "параметры запроса", "limit": "сколько свечей запросить", "to_csv": "сохранить в файл-таблицу", "DataFrame": "таблица данных"},
    "correct": "DROP",
    "destination_ru": "Команда freqtrade download-data: качает свечи с биржи и кладёт в user_data/data/",
    "why_correct": "Загрузка данных — самая типовая рутина, и она уже написана: download-data умеет докачивать хвост, хранить по биржам и таймфреймам, работать с десятками пар. Свой загрузчик здесь только источник расхождений.",
    "wrong": {
      "STRATEGY": "Загрузчик — не торговая логика. В файле стратегии нет места для скачивания: стратегия получает уже готовую таблицу свечей от каркаса.",
      "KEEP": "Здесь нет ничего личного: свечи с биржи одинаковы для всех. Личным остаётся то, чего у каркаса нет, — а загрузчик у него есть."
    },
    "hint": "Спроси: делает ли Freqtrade это сам одной командой? Вспомни первую строку таблицы урока."
  },
  {
    "id": "next_open_execution",
    "round": 1, "order": 2,
    "name": "execute_on_next_open(df)",
    "what_ru": "Сдвигает исполнение сигнала на цену открытия следующей свечи (тот самый shift(1) из урока 1.7)",
    "code": [
      "df['position'] = df['signal'].shift(1).fillna(0)",
      "df['entry_price'] = df['open']          # вход по open следующей свечи",
      "df['ret'] = df['position'] * df['close'].pct_change()"
    ],
    "tokens": {"shift(1)": "сдвинуть на одну строку вниз — решение вчерашней свечи исполняется сегодня", "fillna(0)": "заполнить пустые значения нулём", "pct_change": "изменение в долях к предыдущему значению", "position": "позиция: 1 — в рынке, 0 — вне рынка"},
    "correct": "DROP",
    "destination_ru": "Встроенный движок бэктеста: сигнал свечи t исполняется по open свечи t+1 автоматически",
    "why_correct": "Это защита от заглядывания в будущее, и движок Freqtrade делает её сам. Но выбросить код — не значит забыть правило: в FT-11 ты будешь проверять движок командой lookahead-analysis.",
    "wrong": {
      "STRATEGY": "Соблазн понятен: «это же логика». Но это логика ИСПОЛНЕНИЯ, а не торговли. Если продублировать сдвиг в стратегии поверх сдвига движка — получишь запаздывание на две свечи.",
      "KEEP": "Правило «решение по закрытой свече, вход по следующей» остаётся твоим ЗНАНИЕМ, но не твоим КОДОМ. Код за это отвечает внутри каркаса."
    },
    "hint": "Что произойдёт, если и ты сдвинешь сигнал, и движок сдвинет его ещё раз?"
  },
  {
    "id": "calc_indicators",
    "round": 1, "order": 3,
    "name": "calc_indicators(df)",
    "what_ru": "Считает EMA(9) и EMA(21) по колонке close",
    "code": [
      "def calc_indicators(df):",
      "    df['ema_fast'] = df['close'].ewm(span=9).mean()",
      "    df['ema_slow'] = df['close'].ewm(span=21).mean()",
      "    return df"
    ],
    "tokens": {"ewm": "экспоненциальное скользящее среднее", "span": "период сглаживания", "mean": "среднее"},
    "correct": "STRATEGY",
    "destination_ru": "Метод populate_indicators() в файле user_data/strategies/MyStrategy.py",
    "why_correct": "Какие индикаторы считать — решаешь ты, это часть гипотезы. Каркас даёт таблицу свечей и место в файле стратегии, а что в неё добавить — твоя строка кода.",
    "wrong": {
      "DROP": "Каркас не знает, нужна ли тебе EMA(9) или RSI(14). Он даёт слот populate_indicators и ждёт, что ты его заполнишь. Выкинешь — стратегии не на чем принимать решения.",
      "KEEP": "Отдельным файлом рядом с ботом индикаторы держать нельзя: движок вызывает ровно три метода стратегии, и индикаторы должны считаться в одном из них."
    },
    "hint": "Вспомни три функции, которые «пишем мы», из блока кода в уроке."
  },
  {
    "id": "entry_rule",
    "round": 1, "order": 4,
    "name": "entry_rule(df)",
    "what_ru": "Сигнал на покупку: быстрая EMA пересекла медленную снизу вверх",
    "code": [
      "cross_up = (df['ema_fast'] > df['ema_slow']) & (df['ema_fast'].shift(1) <= df['ema_slow'].shift(1))",
      "df['signal'] = cross_up.astype(int)"
    ],
    "tokens": {"astype(int)": "перевести Да/Нет в 1/0", "&": "логическое И (оба условия сразу)", "shift(1)": "значение на предыдущей свече"},
    "correct": "STRATEGY",
    "destination_ru": "Метод populate_entry_trend(): условие пишется в колонку enter_long",
    "why_correct": "Это единственное место, где живёт твоё преимущество. Каркас не придумает правило входа — он только корректно его исполнит и измерит.",
    "wrong": {
      "DROP": "Если выбросить правило входа, у Freqtrade не останется причины открывать сделки. Это ровно та строка таблицы урока, где написано «Пишешь сам / Пишешь сам».",
      "KEEP": "Правило входа — твоё, но жить оно должно внутри файла стратегии, иначе движок его не увидит. «Оставить своим» — про то, чего в каркасе нет вовсе."
    },
    "hint": "Кто в связке «ты + Freqtrade» отвечает за вопрос «когда входить»?"
  },
  {
    "id": "exit_rule",
    "round": 1, "order": 5,
    "name": "exit_rule(df)",
    "what_ru": "Сигнал на выход: обратное пересечение EMA",
    "code": [
      "cross_down = (df['ema_fast'] < df['ema_slow']) & (df['ema_fast'].shift(1) >= df['ema_slow'].shift(1))",
      "df['exit'] = cross_down.astype(int)"
    ],
    "tokens": {"astype(int)": "перевести Да/Нет в 1/0", "&": "логическое И"},
    "correct": "STRATEGY",
    "destination_ru": "Метод populate_exit_trend(): условие пишется в колонку exit_long",
    "why_correct": "Выход по сигналу — тоже часть гипотезы. Стоп-лосс и ROI каркас добавит отдельно, но «когда выходить по логике» решает твой код.",
    "wrong": {
      "DROP": "У каркаса есть стоп-лосс и ROI, но это выходы «по цене/времени», а не «по сигналу». Логику пересечения он за тебя не напишет.",
      "KEEP": "Как и вход, правило выхода должно быть внутри стратегии — в populate_exit_trend. Иначе движок никогда его не вызовет."
    },
    "hint": "Парная карточка ко входу. Куда уехал вход?"
  },
  {
    "id": "apply_fee",
    "round": 1, "order": 6,
    "name": "apply_fee(df, fee=0.0005)",
    "what_ru": "Вычитает комиссию 0,05 % при каждой смене позиции",
    "code": [
      "turnover = df['position'].diff().abs().fillna(0)",
      "df['net'] = df['ret'] - turnover * fee"
    ],
    "tokens": {"diff()": "разница с предыдущим значением", "abs()": "по модулю", "turnover": "оборот: сколько раз меняли позицию", "fee": "комиссия биржи в долях"},
    "correct": "DROP",
    "destination_ru": "Параметр fee в конфиге (или берётся с биржи автоматически); комиссия списывается движком на каждом ордере",
    "why_correct": "Комиссия — встроенный параметр. Твоя обязанность теперь не считать её, а ПРОВЕРИТЬ, что в отчёте бэктеста стоит честное значение, а не ноль (урок FT-09).",
    "wrong": {
      "STRATEGY": "В стратегии нет колонки «вычти комиссию» — движок сам применяет fee к каждому ордеру. Дублирование даст двойное списание.",
      "KEEP": "Комиссия одинакова для всех и известна бирже — тут нечего оставлять своим. Своей останется другая часть трения — проскальзывание (жди раунд ловушек)."
    },
    "hint": "Посмотри в таблице урока строку «Комиссии/проскальзывание». Там два разных ответа — про какой из них эта карточка?"
  },
  {
    "id": "compute_report",
    "round": 1, "order": 7,
    "name": "compute_report(df)",
    "what_ru": "Считает кривую капитала, доходность, макс. просадку, число сделок, долю прибыльных",
    "code": [
      "equity = (1 + df['net']).cumprod() * 1000",
      "max_dd = ((equity.cummax() - equity) / equity.cummax()).max()",
      "print(f'Доходность: {equity.iloc[-1]/1000-1:.1%}, просадка: {max_dd:.1%}')"
    ],
    "tokens": {"cumprod": "накопленное произведение (капитал шаг за шагом)", "cummax": "максимум на текущий момент (пик капитала)", "iloc[-1]": "последнее значение", ":.1%": "формат: проценты с одним знаком"},
    "correct": "DROP",
    "destination_ru": "Отчёт команды freqtrade backtesting: те же метрики плюс Sortino, Calmar, разбивка по парам и месяцам",
    "why_correct": "Отчёт бэктеста во Freqtrade богаче твоего в разы, и главное — считается одинаково для всех стратегий. Твоя работа переезжает из «посчитать» в «прочитать правильно» (FT-09, FT-14).",
    "wrong": {
      "STRATEGY": "Метрики не относятся к торговой логике: стратегия не знает про просадку, она только выставляет сигналы. Отчёт строит движок по итогам прогона.",
      "KEEP": "Считать просадку своим скриптом поверх отчёта — можно, но незачем: расхождение с встроенным отчётом породит только споры с самим собой."
    },
    "hint": "Что выдаёт Freqtrade после прогона бэктеста — и умеешь ли ты это уже читать?"
  },
  {
    "id": "kill_switch",
    "round": 1, "order": 8,
    "name": "kill_switch(daily_pnl, api_errors)",
    "what_ru": "Внешний сторож: при убытке дня > 2 % или 5 ошибках API подряд закрывает всё и блокирует торговлю до ручного разбора",
    "code": [
      "def kill_switch(daily_pnl, api_errors):",
      "    if daily_pnl < -0.02 or api_errors >= 5:",
      "        flatten_all(); block_trading(); alert('KILL')"
    ],
    "tokens": {"daily_pnl": "результат за день в долях", "api_errors": "число ошибок связи с биржей подряд", "flatten_all": "закрыть все позиции", "block_trading": "запретить новые сделки", "alert": "отправить тревогу"},
    "correct": "KEEP",
    "destination_ru": "Отдельный процесс рядом с ботом, со своим подключением к бирже (урок 4.4). Внутренние protections Freqtrade его НЕ заменяют",
    "why_correct": "У Freqtrade есть стоп-лосс и protections — но они живут ВНУТРИ бота. Если завис сам бот, зависли и они. Kill-switch должен уметь убить бота снаружи. Это последняя строка таблицы урока: «Kill-switch остаётся твоим».",
    "wrong": {
      "DROP": "Самая дорогая ошибка этого урока. Protections останавливают входы и режут просадку, но они — часть процесса бота. При инфраструктурной аварии (бот завис в цикле, биржа отдаёт мусор) внутренний предохранитель не сработает. Внешний сторож — твой и только твой.",
      "STRATEGY": "Стоп-лосс — да, в стратегию (атрибут stoploss). Но kill-switch — не про одну сделку, а про весь депозит и про сбои инфраструктуры. В файле стратегии для него нет ни места, ни доступа."
    },
    "hint": "Что произойдёт с защитами внутри бота, если сам бот перестанет работать?"
  },

  {
    "id": "hypothesis_card",
    "round": 2, "order": 9,
    "name": "HYPOTHESIS.md",
    "what_ru": "Паспорт гипотезы: почему пересечение EMA должно работать, кто платит, на каких данных проверяем (урок 1.5)",
    "code": [
      "# Гипотеза: после пробоя EMA21 быстрой EMA9 на 1h",
      "# толпа догоняет движение → продолжение 2–6 ч",
      "# Контрагент: поздние покупатели. Данные: BTC/USDT 1h, 2023–2025",
      "# Критерий отклонения: PF < 1.1 после комиссий"
    ],
    "tokens": {"PF": "профит-фактор: сумма прибылей / сумма убытков"},
    "correct": "KEEP",
    "destination_ru": "Файл рядом с проектом (journal/hypothesis.md); ни один механизм Freqtrade его не порождает",
    "why_correct": "Первый пункт списка «Чего Freqtrade НЕ делает»: он не ищет альфу. Hyperopt подбирает параметры ВНУТРИ твоей гипотезы, но не сочиняет её. Без паспорта гипотезы оптимизация превращается в перебор шума.",
    "wrong": {
      "DROP": "Это и есть заблуждение «фреймворк заменит голову». У Freqtrade нет команды «придумай стратегию». Hyperopt перебирает параметры того, что уже написал ты.",
      "STRATEGY": "Комментарий с гипотезой в файле стратегии — полезно, но недостаточно: критерии отклонения, данные и контрагент должны жить в журнале, который переживёт удаление файла стратегии."
    },
    "hint": "Есть ли во Freqtrade команда, которая сформулирует рыночную идею за тебя?"
  },
  {
    "id": "slippage_estimate",
    "round": 2, "order": 10,
    "name": "estimate_slippage(bps=2)",
    "what_ru": "Модель проскальзывания: 2 базисных пункта на каждое исполнение",
    "code": [
      "SLIPPAGE_BPS = 2",
      "df['net'] = df['net'] - turnover * SLIPPAGE_BPS / 10000"
    ],
    "tokens": {"SLIPPAGE_BPS": "проскальзывание в базисных пунктах (1 bps = 0,01 %)", "turnover": "оборот"},
    "correct": "KEEP",
    "destination_ru": "Исследовательский слой: отдельный прогон бэктеста с fee, завышенным на величину оценки (урок FT-13). Отдельного параметра slippage у Freqtrade нет",
    "why_correct": "Ловушка симметрии: «комиссия встроена — значит, и проскальзывание». Нет. Проскальзывание зависит от твоего объёма и ликвидности пары, и его оценка — твоя. Freqtrade даст инструмент (завысить fee на прогоне), но не число.",
    "wrong": {
      "DROP": "Комиссию можно было выкинуть, потому что она известна бирже. Проскальзывание бирже неизвестно — оно возникает из твоего ордера в твоём стакане. Выкинув оценку, ты получишь бэктест, завышенный на 25–50 % (FT-13).",
      "STRATEGY": "В стратегии нет крючка «вычти проскальзывание». Оценка делается снаружи прогоном с завышенным fee и записывается в журнал."
    },
    "hint": "Перечитай строку таблицы «Комиссии/проскальзывание»: там ДВА ответа. Какой относится к проскальзыванию?"
  },
  {
    "id": "smoke_test",
    "round": 2, "order": 11,
    "name": "test_30_candles()",
    "what_ru": "Просветный тест: искусственный ряд из 30 свечей с заранее известным числом сделок (урок ВК4)",
    "code": [
      "def test_30_candles():",
      "    df = make_synthetic(crosses_up=2, crosses_down=2)",
      "    df = strategy.populate_entry_trend(df, {})",
      "    assert df['enter_long'].sum() == 2"
    ],
    "tokens": {"make_synthetic": "сгенерировать искусственные свечи с известным ответом", "assert": "проверить утверждение; если ложно — остановиться с ошибкой", "sum()": "сумма (здесь — число сигналов)"},
    "correct": "KEEP",
    "destination_ru": "Файл tests/ рядом с проектом. Тест теперь проверяет ТВОЮ стратегию на каркасе, а не сам каркас",
    "why_correct": "Блок «Мост в Академию» из ВК4: эталонный тест остаётся. Freqtrade проверяет движок, но не проверяет, что твои условия входа считают то, что ты задумал.",
    "wrong": {
      "DROP": "lookahead-analysis ловит утечки будущего, но не ловит «я написал < вместо >». Тест с известным ответом — единственная защита от такой ошибки, и он твой.",
      "STRATEGY": "Тест вызывает методы стратегии снаружи. Внутри самой стратегии тестов не бывает — это отдельный файл."
    },
    "hint": "Кто проверит, что твоё условие входа срабатывает ровно там, где ты ожидаешь, — до бэктеста?"
  },
  {
    "id": "telegram_alert",
    "round": 2, "order": 12,
    "name": "send_alert(text)",
    "what_ru": "Отправляет сообщение в Telegram при сделке и ошибке",
    "code": [
      "def send_alert(text):",
      "    requests.post(f'https://api.telegram.org/bot{TOKEN}/sendMessage',",
      "                  json={'chat_id': CHAT_ID, 'text': text})"
    ],
    "tokens": {"requests.post": "отправить данные на сервер", "TOKEN": "секретный ключ бота", "chat_id": "номер твоего чата"},
    "correct": "DROP",
    "destination_ru": "Секция telegram в config.json: уведомления и команды /status, /profit, /stopentry из коробки (FT-19)",
    "why_correct": "Мониторинг — строка таблицы «FreqUI + Telegram». Встроенный бот умеет не только слать, но и принимать команды. Свой скрипт — лишний секрет в коде и лишняя точка отказа.",
    "wrong": {
      "STRATEGY": "Уведомления — не торговая логика. Стратегия не должна знать о Telegram; за это отвечает каркас по конфигу.",
      "KEEP": "Личным здесь может быть только РЕГЛАМЕНТ реакции на уведомления (урок П5), но не код отправки."
    },
    "hint": "Что идёт «в комплекте» с Freqtrade для наблюдения 24/7?"
  },
  {
    "id": "stoploss_rule",
    "round": 2, "order": 13,
    "name": "stop_loss(entry, price, pct=0.10)",
    "what_ru": "Закрывает позицию при убытке 10 % от цены входа",
    "code": [
      "if price <= entry * (1 - 0.10):",
      "    close_position(); reason = 'stop_loss'"
    ],
    "tokens": {"entry": "цена входа", "close_position": "закрыть позицию", "reason": "причина выхода"},
    "correct": "STRATEGY",
    "destination_ru": "Атрибут класса stoploss = -0.10 в файле стратегии; исполняет движок внутри свечи",
    "why_correct": "Стоп — часть торговых правил, поэтому задаётся в стратегии одной строкой. Сравни с kill-switch: тот — про сбои и весь депозит, живёт снаружи; стоп — про одну сделку, живёт внутри.",
    "wrong": {
      "DROP": "Число −10 % каркас не знает — его задаёшь ты. Выкинуть можно только твою реализацию проверки, а само правило переезжает в атрибут stoploss.",
      "KEEP": "Это соблазн после карточки kill-switch: «раз тот свой — и стоп свой». Нет. Стоп исполняет движок точнее и быстрее любого внешнего скрипта. Своим остаётся сторож на случай, если движок сам умер."
    },
    "hint": "Чем стоп-лосс отличается от kill-switch: одна сделка или весь бот?"
  }
]
```

**Описания корзин** (раскрываются при наведении):

- 🗑 ВЫКИНУТЬ: «Уже написано внутри Freqtrade. Примеры: `download-data`, движок бэктеста, `fee`, отчёт, Telegram/FreqUI, исполнение ордеров.»
- 📦 ПЕРЕНЕСТИ В СТРАТЕГИЮ: «Твоя торговая логика. Едет в файл `user_data/strategies/…py`: `populate_indicators`, `populate_entry_trend`, `populate_exit_trend`, атрибуты `stoploss`, `minimal_roi`.»
- 🔑 ОСТАВИТЬ СВОИМ: «Этого у каркаса нет и не будет. Гипотеза, внешний kill-switch, оценка проскальзывания, эталонный тест, журнал экспериментов.»

## 5. Логика и состояния

```
state = {
  round: 1|2, currentIndex, cards[], 
  placements: { cardId: { basket, attempts, usedHint, revealed } },
  startedAt, finishedAt
}
```

- Карточка считается решённой при верном броске или после «Показать ответ» (`revealed=true`, засчитывается в общий прогресс, но не в «с первой попытки»).
- Нельзя пропустить карточку: следующая открывается только после решения текущей (иначе игра превращается в угадайку по остатку).
- Раунд 2 доступен только после раунда 1; но при повторном прохождении — можно начать сразу с раунда 2.
- «Пройти заново» сбрасывает `placements`, но сохраняет историю попыток (для аналитики повторных ошибок).

## 6. Обратная связь — правила текстов

- Верно: тост 1–2 предложения (`why_correct`), автоскрытие через 6 сек или по клику; на обороте карточки — `destination_ru` остаётся видимым в корзине.
- Неверно: текст `wrong[basket]` + строка «Подсказка: … » (`hint`) появляется под карточкой; карточка не уходит.
- После 2 неверных: кнопка «Показать ответ» → карточка сама уезжает в верную корзину с тостом `why_correct`.
- Никаких звуков «ошибки»; допустима мягкая анимация покачивания.

## 7. Языковой слой

- Все токены из поля `tokens` кликабельны в блоке кода: клик → всплывающая карточка «токен — русская подпись». Подписи дублируются в глобальный словарь приложения (ключ `code_token:<token>`), чтобы переиспользоваться в других уроках.
- Режим «рус. подписи»: справа от каждой строки кода серым — короткий русский комментарий (генерируется из `tokens` первой встреченной в строке; если нет — строка без подписи).
- Названия функций (`load_candles`) не переводятся — но при наведении показывают `what_ru`.
- Термины в тостах со ссылкой на урок: «kill-switch» → урок 4.4, «lookahead-analysis» → FT-11, «protections» → FT-17, «профит-фактор» → FT-14. Реализовать как встроенные ссылки-чипы.

## 8. Аналитика (события)

| Событие | Поля |
|---|---|
| `ft01_start` | ts |
| `ft01_drop` | cardId, basket, correct(bool), attemptNo, roundNo |
| `ft01_hint` | cardId |
| `ft01_reveal` | cardId |
| `ft01_round_complete` | roundNo, firstTryCount, totalCards, durationSec |
| `ft01_complete` | firstTryCount(13), killSwitchWrongEver(bool), hypothesisWrongEver(bool), durationSec |
| `ft01_save_to_journal` | — |

Ключевая метрика для методолога: доля учеников, положивших `kill_switch` или `hypothesis_card` в ВЫКИНУТЬ хотя бы раз (ожидаем 40–60 % на первом прохождении; цель — падение до <20 % на повторном).

## 9. Критерии приёмки

1. Все 13 карточек и 3 корзины отображаются с полным русским контентом из JSON; ни одного английского слова вне блоков кода/имён функций.
2. Верный бросок любой карточки показывает `destination_ru` на обороте и тост `why_correct`.
3. Неверный бросок показывает текст именно для пары (карточка × корзина); проверить все 26 неверных комбинаций.
4. После 2 неверных попыток появляется «Показать ответ»; ответ засчитывается как `revealed`.
5. На мобильном (ширина ≤ 480 px) drag отключён, работают кнопки-корзины; все тексты читаемы без горизонтального скролла.
6. Финальная таблица содержит 13 строк, группировка 6 / 4 / 3 (DROP / STRATEGY / KEEP) — проверить, что итоговая фраза с числами формируется из данных, а не захардкожена.
7. Клик по любому токену из `tokens` открывает перевод; переключатель «рус. подписи» добавляет комментарии к строкам.
8. Прогресс сохраняется при перезагрузке страницы; «Пройти заново» сбрасывает раскладку.
9. События аналитики отправляются по списку раздела 8.
10. Доступность: корзины и карточки достижимы с клавиатуры (Tab, Enter — выбрать карточку, 1/2/3 — положить в корзину), aria-label на русском.

## 10. Открытые вопросы для владельца продукта

- Нужна ли «сложная» версия для повторного прохождения с перемешанным порядком карточек? (Рекомендую: да, флаг `shuffle` при `attempt > 1`.)
- Есть ли уже подсистема журнала (E5)? Если нет — кнопка «Сохранить в журнал» временно заменяется на «Скопировать таблицу в буфер».

---

# СПЕКА 2. FT-02 · «Диагност установки»

## 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft02_install_doctor` |
| Урок | 202 · FT-02 «Установка через Docker и воспроизводимое окружение» |
| Тип | ТРН (тренажёр действия с обратной связью) |
| Движок | **E1 «Терминал-переводчик»** — обязательная зависимость. Если E1 ещё не собран, этот интерактив становится его первым потребителем: реализовать E1 в объёме, описанном в разделе 7 |
| Целевое заблуждение | **«Паника от английского stack trace»**: красный английский текст = катастрофа, надо переустанавливать всё / бросать / писать в поддержку биржи. На деле в любом выводе есть ОДНА главная строка, и первая команда лечения почти всегда диагностическая, а не разрушительная |
| Что должен уметь после | В любом выводе установки найти главную строку; из 7 типовых ситуаций определить причину; назвать первую безопасную команду; отличать предупреждение от ошибки; не выполнять `sudo pip install` и не переустанавливать систему |
| Время прохождения | 8–12 минут |
| Опора на текст урока | Абзац «Частая ошибка Windows / Частая ошибка Linux…», блок «Числа» (три часа на установку = старый Python или системные пакеты), задание «Диагностика установки через агента» |

## 2. Размещение в уроке

После блока с кодом установки (`python3 -m venv .venv … freqtrade show-config`) и **перед** блоком «⚠ Важно: Никогда не запускай freqtrade trade…». Мотивировка: ученик только что увидел «идеальный» сценарий; тренажёр показывает 7 способов, которыми он ломается в реальности, до того как ученик столкнётся с ними один на один.

## 3. UX-поток

### Экран 0 — Выбор ОС и заставка
> **Заголовок:** Диагност установки: семь экранов, которые тебя ждут
> **Текст:** Установка Freqtrade у большинства ломается на одном из семи мест. Ни одно из них не требует переустанавливать компьютер. Твоя задача на каждом экране — найти главную строку, назвать причину и выбрать ПЕРВУЮ команду.
> **Выбор:** «Моя система: [Windows] [macOS] [Linux]» — влияет на пути, команды и формулировки (см. поле `os_variants`). Значение запоминается в профиле.
> **Кнопка:** «Открыть первый экран»

### Экран N — Разбор одного случая (7 случаев)

Раскладка: сверху — эмулятор терминала (E1) с реальным выводом; снизу — панель из четырёх шагов, открывающихся последовательно.

**Шаг A — «Насколько страшно?»** (3 сек): шкала 1–5 «Насколько тревожно выглядит этот экран?» (иконки лица). Одним тапом. Сохраняется как `panic_before`.

**Шаг B — «Найди главную строку».** Инструкция: «В этом выводе есть одна строка, которая объясняет всё. Кликни по ней». Терминал переходит в режим выбора строки. Верно → строка подсвечивается зелёным, рядом появляется её русский перевод крупно. Неверно → мягкая подсветка выбранной строки серым + подсказка: «Это [сопутствующий шум / контекст / последствие]. Главная строка обычно содержит слово Error, not found или начинается с названия проблемы. Попробуй ещё». После 2 неверных — кнопка «Подсветить».

**Шаг C — «Что случилось?»** 4 варианта причины по-русски (1 верный, 3 правдоподобных). При неверном выборе — текст `why_not`, вариант блекнет, можно выбрать снова.

**Шаг D — «Первая команда».** 4 варианта команды (в блоке кода, с русской подписью под каждой). Обязательно один вариант — **разрушительный или опасный** (переустановка, `sudo pip`, удаление папки, «написать в поддержку биржи»), он помечается после выбора красным пояснением «почему так делать нельзя никогда». Верная команда всегда либо диагностическая, либо минимально-локальная.

**Шаг E — Карточка диагноза** (итог экрана): 
```
┌ Карточка диагноза ──────────────────────┐
│ Симптом (главная строка):  …            │
│ Что это значит по-русски:  …            │
│ Причина:                    …            │
│ Первая команда:             …            │
│ Если не помогло:            …            │
└─────────────────────────────────────────┘
```
Кнопка «Сохранить в мои карточки» (складывается в личный справочник ошибок — часть E1). Затем шкала `panic_after` (1–5) с подписью «А теперь?».

### Экран 8 — Итог
- Таблица «7 экранов: было страшно / стало» — `panic_before` vs `panic_after` по каждому, средняя разница крупно: «Тревога упала с 3,9 до 1,6. Текст не изменился — изменилось, что ты в нём видишь».
- Список сохранённых карточек диагноза (7 штук) с кнопкой «Открыть справочник ошибок».
- «Правило трёх шагов», выведенное как вывод: **главная строка → причина → диагностическая команда. Переустановка — никогда не первый шаг.**
- Статистика: «Главная строка найдена с первой попытки: N из 7; причина — N из 7; команда — N из 7; опасных команд выбрано: N».
- Кнопки: «Пройти на другой ОС» · «Открыть дополнительные случаи (2)» · «Вернуться к уроку».

## 4. Контент — полные данные случаев

Поля: `id`, `order`, `title_ru` (не показывается до конца — иначе подсказка), `os_variants` (для каких ОС показывать; терминал берёт вариант по выбранной ОС), `terminal` (массив строк; каждая: `text`, `kind` ∈ `cmd|out|err|warn|noise`, `ru` — перевод, `key` — true для главной строки), `line_feedback` (для неверных кликов по видам строк), `causes` (4, один `correct`), `commands` (4, один `correct`, один `dangerous`), `if_not_helped_ru`, `card`.

> Примечание агенту: тексты сообщений соответствуют реальным выводам Python/pip/PowerShell/Docker на момент написания; перед публикацией сверить формулировки с актуальными версиями (особенно версии Python в сообщении pip). Изменение цифр версий допустимо, структура сообщений стабильна.

```json
[
  {
    "id": "false_alarm_warning",
    "order": 1,
    "title_ru": "Ложная тревога: жёлтое — не красное",
    "os_variants": ["windows","macos","linux"],
    "terminal": [
      {"text": "(.venv) $ pip install freqtrade", "kind": "cmd", "ru": "Установить пакет freqtrade"},
      {"text": "Collecting freqtrade", "kind": "out", "ru": "Собираю список файлов пакета"},
      {"text": "  Downloading freqtrade-2025.x-py3-none-any.whl (2.1 MB)", "kind": "out", "ru": "Скачиваю пакет"},
      {"text": "Collecting ccxt>=4.4 (from freqtrade)", "kind": "out", "ru": "Скачиваю зависимость — библиотеку связи с биржами"},
      {"text": "  ... (ещё 60 строк Collecting/Downloading)", "kind": "noise", "ru": "Обычный поток скачивания зависимостей"},
      {"text": "Installing collected packages: numpy, pandas, ccxt, ..., freqtrade", "kind": "out", "ru": "Устанавливаю скачанное"},
      {"text": "Successfully installed ccxt-4.4.x freqtrade-2025.x numpy-2.x pandas-2.x ...", "kind": "out", "ru": "Успешно установлено — вот эта строка и есть результат", "key": true},
      {"text": "WARNING: You are using pip version 24.0; however, version 25.1 is available.", "kind": "warn", "ru": "Предупреждение: у тебя не самая новая версия pip. Это не ошибка"},
      {"text": "You should consider upgrading via the 'python -m pip install --upgrade pip' command.", "kind": "warn", "ru": "Совет обновить pip. Можно проигнорировать"}
    ],
    "line_feedback": {
      "warn": "Это предупреждение (WARNING). Оно жёлтое, а не красное, и стоит ПОСЛЕ результата. Предупреждение сообщает о необязательном улучшении, а не о поломке.",
      "out": "Это обычный ход установки. Ищи строку, которая говорит об итоге.",
      "noise": "Это фон: десятки строк скачивания. Итог всегда ближе к концу."
    },
    "causes": [
      {"text": "Всё установилось. Предупреждение о версии pip — не ошибка, а совет", "correct": true},
      {"text": "Установка сломалась из-за старого pip, надо переустановить", "why_not": "WARNING ≠ ERROR. Строкой выше написано Successfully installed — установка завершена. Старый pip не мешает работе Freqtrade."},
      {"text": "Не хватило прав, часть пакетов не установилась", "why_not": "При нехватке прав pip пишет PermissionError или externally-managed-environment, и слова Successfully не будет."},
      {"text": "Скачалась не та версия freqtrade", "why_not": "В выводе нет ни слова о конфликте версий. Ты домысливаешь тревогу там, где её нет."}
    ],
    "commands": [
      {"text": "freqtrade --version", "ru": "Проверить, что команда доступна и вывести версию", "correct": true},
      {"text": "pip uninstall freqtrade && pip install freqtrade", "ru": "Удалить и поставить заново", "why_not": "Переустанавливать работающее — расход времени и первый симптом паники. Сначала проверь результат."},
      {"text": "python -m pip install --upgrade pip", "ru": "Обновить pip", "why_not": "Можно сделать когда-нибудь потом. Это не первая команда: ты ещё не проверил, работает ли то, ради чего всё делалось."},
      {"text": "Удалить папку .venv и начать сначала", "ru": "Снести окружение", "dangerous": true, "why_not": "Разрушительное действие на ровном месте. Правило: сначала диагностика, разрушение — никогда не первым шагом."}
    ],
    "if_not_helped_ru": "Если freqtrade --version не найден — смотри случай 2 (окружение не активировано).",
    "card": {
      "symptom": "WARNING: You are using pip version … после Successfully installed",
      "meaning": "Установка прошла; pip советует обновиться",
      "cause": "Нет проблемы",
      "first_cmd": "freqtrade --version"
    }
  },

  {
    "id": "venv_not_activated",
    "order": 2,
    "title_ru": "Команда не найдена: окружение не активировано",
    "os_variants": ["windows","macos","linux"],
    "terminal_by_os": {
      "windows": [
        {"text": "C:\\bots\\mybot> freqtrade --version", "kind": "cmd", "ru": "Показать версию freqtrade"},
        {"text": "\"freqtrade\" не является внутренней или внешней командой, исполняемой программой или пакетным файлом.", "kind": "err", "ru": "Система не знает такой команды: она не видит папку, где лежит freqtrade", "key": true}
      ],
      "macos": [
        {"text": "~/bots/mybot $ freqtrade --version", "kind": "cmd", "ru": "Показать версию freqtrade"},
        {"text": "zsh: command not found: freqtrade", "kind": "err", "ru": "Оболочка не нашла команду freqtrade", "key": true}
      ],
      "linux": [
        {"text": "~/bots/mybot $ freqtrade --version", "kind": "cmd", "ru": "Показать версию freqtrade"},
        {"text": "bash: freqtrade: command not found", "kind": "err", "ru": "Оболочка не нашла команду freqtrade", "key": true}
      ]
    },
    "pre_context_ru": "Минуту назад ты видел Successfully installed freqtrade. Открыл новое окно терминала — и вот.",
    "line_feedback": {"cmd": "Это твоя команда, а не ответ системы. Ответ — строкой ниже."},
    "causes": [
      {"text": "Виртуальное окружение не активировано в этом окне терминала: команда установлена, но система её не видит", "correct": true},
      {"text": "Установка не прошла, надо ставить заново", "why_not": "Ты видел Successfully installed. Установка прошла — внутрь .venv. Проблема в том, что это окно терминала про .venv не знает."},
      {"text": "Freqtrade несовместим с моей операционной системой", "why_not": "Freqtrade работает на всех трёх ОС. Сообщение говорит не о совместимости, а о том, что команда не найдена в путях поиска."},
      {"text": "Нужны права администратора", "why_not": "Нехватка прав даёт другое сообщение (Permission denied / Отказано в доступе). Здесь система просто не нашла файл."}
    ],
    "commands_by_os": {
      "windows": [
        {"text": ".venv\\Scripts\\activate", "ru": "Активировать окружение (в начале строки появится (.venv))", "correct": true},
        {"text": "pip install freqtrade", "ru": "Установить заново", "why_not": "Без активации ты поставишь второй экземпляр в системный Python, а команда в .venv по-прежнему будет не видна. Проблема удвоится."},
        {"text": "Добавить C:\\Python в PATH и перезагрузить компьютер", "ru": "Править системные пути", "why_not": "Слишком тяжёлое действие для локальной проблемы. Активация окружения меняет пути ровно для одного окна — этого достаточно."},
        {"text": "Переустановить Python", "ru": "Снести и поставить Python", "dangerous": true, "why_not": "Разрушительно и бесполезно: Python в порядке, freqtrade установлен. Не хватает одной строки активации."}
      ],
      "macos": [
        {"text": "source .venv/bin/activate", "ru": "Активировать окружение (в начале строки появится (.venv))", "correct": true},
        {"text": "pip3 install freqtrade", "ru": "Установить заново", "why_not": "Без активации поставишь второй экземпляр в системный Python. Проблема удвоится."},
        {"text": "sudo pip3 install freqtrade", "ru": "Установить с правами администратора", "dangerous": true, "why_not": "sudo pip — запрещённый приём: ломает системный Python и создаёт файлы, которые потом не удалить обычным пользователем. Никогда."},
        {"text": "brew reinstall python", "ru": "Переустановить Python через Homebrew", "why_not": "Python в порядке. Ты ищешь причину в самом дальнем месте, а она в текущем окне."}
      ],
      "linux": [
        {"text": "source .venv/bin/activate", "ru": "Активировать окружение (в начале строки появится (.venv))", "correct": true},
        {"text": "pip install freqtrade", "ru": "Установить заново", "why_not": "Без активации попадёшь либо в системный Python (и получишь случай 3), либо создашь дубликат."},
        {"text": "sudo pip install freqtrade", "ru": "Установить с правами администратора", "dangerous": true, "why_not": "sudo pip ломает системные пакеты, от которых зависит сама ОС. Это классический способ превратить мелкую проблему в переустановку системы."},
        {"text": "sudo apt install freqtrade", "ru": "Поставить через системный пакетный менеджер", "why_not": "Такого системного пакета нет; и даже если бы был — он не решает вопрос активации окружения."}
      ]
    },
    "if_not_helped_ru": "После активации в начале строки должно появиться (.venv). Если его нет — ты не в той папке: проверь командой dir/ls, что папка .venv существует рядом.",
    "card": {
      "symptom": "command not found: freqtrade / не является внутренней или внешней командой",
      "meaning": "Система не видит папку с командой",
      "cause": "Окружение .venv не активировано в этом окне",
      "first_cmd": "source .venv/bin/activate  (Windows: .venv\\Scripts\\activate)"
    }
  },

  {
    "id": "old_python",
    "order": 3,
    "title_ru": "Старый Python",
    "os_variants": ["windows","macos","linux"],
    "terminal": [
      {"text": "(.venv) $ pip install freqtrade", "kind": "cmd", "ru": "Установить пакет"},
      {"text": "ERROR: Ignored the following versions that require a different python version: 2025.1 Requires-Python >=3.11; 2025.2 Requires-Python >=3.11; ...", "kind": "err", "ru": "Пропущены версии freqtrade, которым нужен Python новее твоего (не ниже 3.11)", "key": true},
      {"text": "ERROR: Could not find a version that satisfies the requirement freqtrade (from versions: none)", "kind": "err", "ru": "Не нашлось ни одной подходящей версии — следствие строки выше"},
      {"text": "ERROR: No matching distribution found for freqtrade", "kind": "err", "ru": "Итог: нечего устанавливать — тоже следствие"}
    ],
    "line_feedback": {"err": "Это тоже ошибка, но это СЛЕДСТВИЕ. Причина названа в самой первой строке с ERROR: там написано, что именно не подходит."},
    "causes": [
      {"text": "Версия Python в окружении старее той, что требует Freqtrade (нужен 3.11 или новее)", "correct": true},
      {"text": "Пакет freqtrade удалили из репозитория", "why_not": "Первая строка прямо говорит: версии ЕСТЬ, но проигнорированы из-за Requires-Python. Пакет никуда не делся."},
      {"text": "Нет интернета", "why_not": "Без интернета pip пишет про сеть (Connection error, timeout). Здесь он успешно сходил в репозиторий и получил список версий."},
      {"text": "Опечатка в названии пакета", "why_not": "При опечатке не было бы строки про Requires-Python: pip не нашёл бы вообще ничего похожего."}
    ],
    "commands": [
      {"text": "python --version", "ru": "Узнать, какой Python внутри окружения", "correct": true},
      {"text": "pip install freqtrade==2024.1", "ru": "Поставить старую версию", "why_not": "Старые версии могут не поддерживать текущие биржи и содержат исправленные позже ошибки. Лечить нужно причину — Python, а не откатывать инструмент."},
      {"text": "pip install --upgrade pip", "ru": "Обновить pip", "why_not": "pip не при чём: он всё сделал правильно и честно сообщил о несовместимости версии Python."},
      {"text": "Удалить Python и поставить самый новый с сайта, снеся все старые проекты", "ru": "Полная переустановка", "dangerous": true, "why_not": "Разрушительно: другие проекты на компьютере могут зависеть от старого Python. Правильно — ПОСТАВИТЬ РЯДОМ Python 3.11+ и создать .venv на его основе, старый не трогать."}
    ],
    "if_not_helped_ru": "Если python --version показал 3.9/3.10 — установи Python 3.11+ (с python.org или через менеджер пакетов), затем создай окружение заново: python3.11 -m venv .venv (Windows: py -3.11 -m venv .venv). Верхнюю границу версии сверяй с документацией Freqtrade.",
    "card": {
      "symptom": "Requires-Python >=3.11 … No matching distribution found",
      "meaning": "Твой Python старее требуемого",
      "cause": "Окружение создано на старом Python",
      "first_cmd": "python --version → затем venv на python3.11+"
    }
  },

  {
    "id": "externally_managed",
    "order": 4,
    "title_ru": "pip не в venv: система защищает себя",
    "os_variants": ["linux","macos"],
    "terminal": [
      {"text": "$ pip install freqtrade", "kind": "cmd", "ru": "Установить пакет (обрати внимание: в начале строки НЕТ (.venv))"},
      {"text": "error: externally-managed-environment", "kind": "err", "ru": "Ошибка: это окружение управляется системой — ставить в него пакеты через pip запрещено", "key": true},
      {"text": "× This environment is externally managed", "kind": "err", "ru": "Повтор: окружение внешнее (системное)"},
      {"text": "╰─> To install Python packages system-wide, try apt install python3-xyz ...", "kind": "out", "ru": "Подсказка системы: для системных пакетов используйте apt…"},
      {"text": "    If you wish to install a non-Debian-packaged Python package, create a virtual environment using python3 -m venv path/to/venv.", "kind": "out", "ru": "…а для своих пакетов создайте виртуальное окружение — вот это и есть ответ"},
      {"text": "note: If you believe this is a mistake, please contact your Python installation or OS distribution provider. You can override this, at the risk of breaking your Python installation or OS, by passing --break-system-packages.", "kind": "warn", "ru": "Примечание: можно обойти флагом --break-system-packages, РИСКУЯ СЛОМАТЬ систему"}
    ],
    "line_feedback": {"out": "Это подсказка системы — полезная, но это уже совет, а не диагноз. Диагноз — короткая строка с error:.", "warn": "Это предупреждение о том, как обойти защиту с риском для системы. Оно объясняет, чего НЕ надо делать."},
    "causes": [
      {"text": "Ты запускаешь pip вне виртуального окружения, а система запрещает ставить пакеты в свой Python", "correct": true},
      {"text": "У пакета freqtrade несовместимая лицензия", "why_not": "Лицензии pip не проверяет. Слово managed относится к окружению, а не к пакету."},
      {"text": "Пакет требует прав администратора", "why_not": "Наоборот: система прямо говорит, что администраторский обход (--break-system-packages) опасен. Права здесь не решение."},
      {"text": "pip устарел", "why_not": "Это новое поведение свежих систем (PEP 668), а не признак устаревания. Свежий pip как раз и показывает это сообщение."}
    ],
    "commands": [
      {"text": "python3 -m venv .venv && source .venv/bin/activate", "ru": "Создать окружение и войти в него", "correct": true},
      {"text": "pip install --break-system-packages freqtrade", "ru": "Сломать защиту и поставить в системный Python", "dangerous": true, "why_not": "Название флага говорит само за себя: break system packages. Ты можешь сломать инструменты самой ОС. Система предупредила — послушай её."},
      {"text": "sudo pip install freqtrade", "ru": "Поставить от администратора", "dangerous": true, "why_not": "Та же ошибка с усилением: права администратора + запись в системный Python. После этого систему иногда проще переустановить."},
      {"text": "sudo apt install python3-freqtrade", "ru": "Поставить системным менеджером", "why_not": "Такого пакета в репозиториях нет, а если бы и был — версия безнадёжно отставала бы. Путь — venv."}
    ],
    "if_not_helped_ru": "Если python3 -m venv ругается на отсутствие модуля venv — установи его: sudo apt install python3-venv (это системный пакет, тут apt уместен).",
    "card": {
      "symptom": "error: externally-managed-environment",
      "meaning": "Ставишь пакет в системный Python, а не в своё окружение",
      "cause": "Не создано или не активировано .venv",
      "first_cmd": "python3 -m venv .venv && source .venv/bin/activate"
    }
  },

  {
    "id": "module_not_found",
    "order": 5,
    "title_ru": "Установлено — но не туда: два разных Python",
    "os_variants": ["windows","macos","linux"],
    "terminal": [
      {"text": "(.venv) $ python -c \"import freqtrade; print('ok')\"", "kind": "cmd", "ru": "Попросить Python подключить freqtrade и напечатать ok"},
      {"text": "Traceback (most recent call last):", "kind": "err", "ru": "Начало отчёта об ошибке (трассировка): дальше — путь, по которому Python дошёл до проблемы"},
      {"text": "  File \"<string>\", line 1, in <module>", "kind": "err", "ru": "Где именно: первая строка твоей команды"},
      {"text": "ModuleNotFoundError: No module named 'freqtrade'", "kind": "err", "ru": "Модуль не найден: этот Python не видит установленного freqtrade", "key": true}
    ],
    "pre_context_ru": "Ты точно видел Successfully installed. Окружение активировано — (.venv) на месте. И всё равно.",
    "line_feedback": {"err": "Строки Traceback и File — это дорога к ошибке, а не сама ошибка. Главная строка в трассировке ВСЕГДА последняя."},
    "causes": [
      {"text": "pip и python указывают на разные интерпретаторы: пакет установлен в один Python, а запускаешь ты другой", "correct": true},
      {"text": "Freqtrade нужно импортировать под другим именем", "why_not": "Имя модуля — freqtrade, оно верное. Проблема не в имени, а в том, в какой Python он установлен."},
      {"text": "Пакет скачался повреждённым", "why_not": "Повреждённый пакет даёт ошибки внутри импорта (ImportError с деталями), а не «модуль не найден». «Не найден» = его нет в путях ЭТОГО Python."},
      {"text": "Нужно перезагрузить компьютер", "why_not": "Python не требует перезагрузки для новых пакетов. Это ритуал из мира Windows-программ, здесь он ничего не меняет."}
    ],
    "commands_by_os": {
      "windows": [
        {"text": "where python && where pip", "ru": "Показать, откуда берутся python и pip — совпадают ли папки .venv", "correct": true},
        {"text": "python -m pip install freqtrade", "ru": "Поставить пакет ИМЕННО в тот Python, который запускаешь", "why_not": "Это правильная ВТОРАЯ команда. Но сначала подтверди диагноз: посмотри, куда указывают python и pip. Иначе можешь поставить третий экземпляр."},
        {"text": "pip install freqtrade --force-reinstall", "ru": "Принудительно переустановить", "why_not": "Переустановишь в тот же «не тот» Python. Флаг --force не меняет адресата."},
        {"text": "Удалить все версии Python и .venv, начать с нуля", "ru": "Полная зачистка", "dangerous": true, "why_not": "Разрушительно и не гарантирует результата: если не понять, как pip и python разошлись, разойдутся снова."}
      ],
      "macos": [
        {"text": "which python && which pip", "ru": "Показать, откуда берутся python и pip — совпадают ли папки .venv", "correct": true},
        {"text": "python -m pip install freqtrade", "ru": "Поставить пакет именно в запускаемый Python", "why_not": "Правильная вторая команда. Сначала — диагностика: подтверди, что пути расходятся."},
        {"text": "pip3 install freqtrade --force-reinstall", "ru": "Принудительно переустановить", "why_not": "Переустановишь туда же. --force не меняет адресата."},
        {"text": "sudo rm -rf .venv && brew reinstall python", "ru": "Снести окружение и Python", "dangerous": true, "why_not": "Разрушительно. Причина — расхождение путей, оно не лечится сносом."}
      ],
      "linux": [
        {"text": "which python && which pip", "ru": "Показать, откуда берутся python и pip — совпадают ли папки .venv", "correct": true},
        {"text": "python -m pip install freqtrade", "ru": "Поставить пакет именно в запускаемый Python", "why_not": "Правильная вторая команда. Сначала — диагностика."},
        {"text": "pip install freqtrade --force-reinstall", "ru": "Принудительно переустановить", "why_not": "Переустановишь туда же."},
        {"text": "sudo rm -rf .venv /usr/lib/python3*", "ru": "Удалить окружение и системный Python", "dangerous": true, "why_not": "Удаление системного Python ломает Linux целиком. Абсолютный запрет."}
      ]
    },
    "if_not_helped_ru": "Если which/where показывают разные папки — всегда ставь через python -m pip …: так пакет гарантированно попадает в тот Python, что запускаешь. Если пути одинаковые и всё равно не найден — проверь, не называется ли твой собственный файл freqtrade.py (он перекрывает пакет).",
    "card": {
      "symptom": "ModuleNotFoundError: No module named 'freqtrade'",
      "meaning": "Запускаемый Python не видит пакет",
      "cause": "pip и python указывают на разные интерпретаторы",
      "first_cmd": "which python && which pip  (Windows: where) → python -m pip install freqtrade"
    }
  },

  {
    "id": "powershell_policy",
    "order": 6,
    "title_ru": "Windows не даёт запустить активацию",
    "os_variants": ["windows"],
    "fallback_note_ru": "На macOS/Linux этот экран показывается с пометкой «Так это выглядит у пользователей Windows — пригодится, если будешь помогать другу или переедешь».",
    "terminal": [
      {"text": "PS C:\\bots\\mybot> .venv\\Scripts\\Activate.ps1", "kind": "cmd", "ru": "Активировать окружение в PowerShell"},
      {"text": ".venv\\Scripts\\Activate.ps1 : Невозможно загрузить файл C:\\bots\\mybot\\.venv\\Scripts\\Activate.ps1, так как выполнение сценариев отключено в этой системе.", "kind": "err", "ru": "PowerShell отказался запускать скрипт: выполнение сценариев выключено настройкой безопасности", "key": true},
      {"text": "Для получения дополнительных сведений см. about_Execution_Policies по адресу https://go.microsoft.com/fwlink/?LinkID=135170.", "kind": "out", "ru": "Ссылка на справку про политику выполнения"},
      {"text": "    + CategoryInfo          : Ошибка безопасности: (:) [], PSSecurityException", "kind": "err", "ru": "Класс ошибки: безопасность"},
      {"text": "    + FullyQualifiedErrorId : UnauthorizedAccess", "kind": "err", "ru": "Код: доступ не разрешён"}
    ],
    "line_feedback": {"err": "Это служебные строки классификации ошибки. Причина названа человеческим языком строкой выше."},
    "causes": [
      {"text": "Политика безопасности PowerShell по умолчанию запрещает выполнять любые скрипты, включая безобидный скрипт активации", "correct": true},
      {"text": "Файл Activate.ps1 повреждён или заражён", "why_not": "Файл создан командой venv минуту назад. Сообщение говорит о ПОЛИТИКЕ системы, а не о содержимом файла."},
      {"text": "Нужно запустить PowerShell от администратора", "why_not": "Администратор здесь не нужен: политику можно изменить для текущего пользователя. Запуск всего от администратора — вредная привычка."},
      {"text": "Freqtrade не поддерживает PowerShell", "why_not": "PowerShell ещё не дошёл до Freqtrade — он отказался выполнять скрипт активации окружения Python. Freqtrade тут ни при чём."}
    ],
    "commands": [
      {"text": "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned", "ru": "Разрешить локальные скрипты только для твоего пользователя", "correct": true},
      {"text": "Set-ExecutionPolicy Unrestricted", "ru": "Разрешить всё для всех", "dangerous": true, "why_not": "Снимает защиту для всех пользователей и всех скриптов из интернета. Достаточно RemoteSigned для CurrentUser — минимально необходимое разрешение."},
      {"text": "Отключить антивирус и повторить", "ru": "Выключить защиту", "dangerous": true, "why_not": "Антивирус не при чём, а отключённая защита на компьютере с будущими API-ключами — прямой путь к уроку 4.3 с плохим концом."},
      {"text": ".venv\\Scripts\\activate.bat", "ru": "Использовать вариант для cmd", "why_not": "Обходной путь сработает (в cmd, не в PowerShell), но не решает задачу и путает: сегодня cmd, завтра PowerShell. Лучше один раз настроить политику."}
    ],
    "if_not_helped_ru": "После команды закрой и заново открой PowerShell, затем повтори .venv\\Scripts\\Activate.ps1. Если в организации политика заблокирована групповыми настройками — используй cmd и activate.bat.",
    "card": {
      "symptom": "выполнение сценариев отключено в этой системе (PSSecurityException)",
      "meaning": "PowerShell запрещает запускать скрипты",
      "cause": "Политика выполнения по умолчанию",
      "first_cmd": "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
    }
  },

  {
    "id": "docker_permission",
    "order": 7,
    "title_ru": "Docker: нет доступа к службе",
    "os_variants": ["linux","macos","windows"],
    "terminal_by_os": {
      "linux": [
        {"text": "$ docker compose pull", "kind": "cmd", "ru": "Скачать образ freqtrade по описанию docker-compose.yml"},
        {"text": "permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get \"http://%2Fvar%2Frun%2Fdocker.sock/v1.45/...\": dial unix /var/run/docker.sock: connect: permission denied", "kind": "err", "ru": "Отказано в доступе к службе Docker: твой пользователь не имеет права с ней разговаривать", "key": true}
      ],
      "macos": [
        {"text": "$ docker compose pull", "kind": "cmd", "ru": "Скачать образ freqtrade"},
        {"text": "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?", "kind": "err", "ru": "Не удаётся подключиться к службе Docker. Она запущена?", "key": true}
      ],
      "windows": [
        {"text": "PS> docker compose pull", "kind": "cmd", "ru": "Скачать образ freqtrade"},
        {"text": "error during connect: this error may indicate that the docker daemon is not running: Get \"http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.45/...\": open //./pipe/docker_engine: The system cannot find the file specified.", "kind": "err", "ru": "Не удаётся подключиться: похоже, служба Docker не запущена", "key": true}
      ]
    },
    "line_feedback": {},
    "causes_by_os": {
      "linux": [
        {"text": "Docker установлен и работает, но твой пользователь не состоит в группе docker и не имеет права к нему обращаться", "correct": true},
        {"text": "Docker не установлен", "why_not": "Команда docker нашлась и попыталась подключиться к сокету — значит, программа есть. Проблема в правах на сокет."},
        {"text": "Образ freqtrade удалён из реестра", "why_not": "До реестра дело не дошло: команда не смогла даже поговорить с локальной службой Docker."},
        {"text": "Нужно запускать всё через sudo docker", "why_not": "sudo docker сработает, но это костыль: бот на VPS будет каждый раз требовать пароль, а скрипты автоперезапуска сломаются. Правильно — добавить пользователя в группу."}
      ],
      "macos": [
        {"text": "Приложение Docker Desktop не запущено — служба, к которой обращается команда, не работает", "correct": true},
        {"text": "Docker не установлен", "why_not": "Команда docker есть. Не запущена служба (демон), которую поднимает Docker Desktop."},
        {"text": "Образ freqtrade удалён из реестра", "why_not": "До реестра не дошло — нет связи с локальной службой."},
        {"text": "Нужен sudo", "why_not": "На macOS Docker Desktop работает от пользователя; sudo не запустит службу, которую нужно открыть как приложение."}
      ],
      "windows": [
        {"text": "Приложение Docker Desktop не запущено — служба, к которой обращается команда, не работает", "correct": true},
        {"text": "Docker не установлен", "why_not": "Команда docker есть и пытается подключиться. Не запущена служба."},
        {"text": "Файл docker_engine повреждён, нужна переустановка", "why_not": "cannot find the file — это канал связи со службой, он появляется, когда служба запущена. Файл не «повреждён» — его просто ещё нет."},
        {"text": "Нужно запустить PowerShell от администратора", "why_not": "Docker Desktop работает от пользователя. Администратор не запустит службу за тебя."}
      ]
    },
    "commands_by_os": {
      "linux": [
        {"text": "sudo usermod -aG docker $USER && newgrp docker", "ru": "Добавить себя в группу docker и обновить группы текущей сессии", "correct": true},
        {"text": "sudo docker compose pull", "ru": "Выполнить от администратора", "why_not": "Сработает один раз, но каждый запуск бота будет требовать sudo — автоперезапуск по уроку 4.2 сломается. Лечи причину, а не симптом."},
        {"text": "sudo chmod 777 /var/run/docker.sock", "ru": "Открыть сокет Docker всем", "dangerous": true, "why_not": "Даёт любому процессу на машине полный контроль над Docker, а через него — над системой. На VPS с ботом это дыра размером с депозит."},
        {"text": "sudo apt remove docker && sudo apt install docker.io", "ru": "Переустановить Docker", "why_not": "Переустановка не изменит членство пользователя в группе — ошибка вернётся."}
      ],
      "macos": [
        {"text": "open -a Docker", "ru": "Запустить Docker Desktop, дождаться значка «running» и повторить", "correct": true},
        {"text": "sudo docker compose pull", "ru": "Выполнить от администратора", "why_not": "Служба не запущена — sudo не поможет."},
        {"text": "brew reinstall --cask docker", "ru": "Переустановить Docker Desktop", "dangerous": true, "why_not": "Снос приложения ради того, чтобы его запустить. Сначала просто открой его."},
        {"text": "docker system prune -a", "ru": "Удалить все образы и контейнеры", "dangerous": true, "why_not": "Разрушительная команда очистки, и она тоже не выполнится без запущенной службы."}
      ],
      "windows": [
        {"text": "Запустить Docker Desktop из меню Пуск и дождаться статуса Engine running", "ru": "Поднять службу", "correct": true},
        {"text": "docker compose pull от администратора", "ru": "Повторить с правами", "why_not": "Служба не запущена — права не помогут."},
        {"text": "Переустановить Docker Desktop", "ru": "Снос и установка", "dangerous": true, "why_not": "Приложение просто не запущено. Переустановка ради запуска — паническое действие."},
        {"text": "Отключить WSL и включить заново", "ru": "Перенастроить подсистему Linux", "why_not": "Может понадобиться позже при других ошибках (WSL), но не первым шагом: сначала убедись, что Docker Desktop вообще запущен."}
      ]
    },
    "if_not_helped_ru": "Linux: после usermod полностью выйди из системы и войди снова (или перезапусти сессию SSH), затем проверь: docker run hello-world. macOS/Windows: если Docker Desktop не стартует — смотри его окно диагностики, там будет отдельная причина (обычно виртуализация/WSL).",
    "card": {
      "symptom": "permission denied … docker.sock / Cannot connect to the Docker daemon",
      "meaning": "Команда docker не может связаться со службой",
      "cause": "Linux: нет прав (группа docker). macOS/Windows: Docker Desktop не запущен",
      "first_cmd": "Linux: sudo usermod -aG docker $USER; macOS/Win: запустить Docker Desktop"
    }
  }
]
```

**Дополнительные случаи (открываются после итога, необязательные):**

```json
[
  {
    "id": "config_json_broken",
    "title_ru": "Сломанный config.json: лишняя запятая",
    "terminal": [
      {"text": "(.venv) $ freqtrade show-config -c user_data/config.json", "kind": "cmd", "ru": "Показать итоговый конфиг"},
      {"text": "... json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 12 column 5 (char 318)", "kind": "err", "ru": "Ошибка разбора JSON: на строке 12, позиция 5, ожидалось имя поля в двойных кавычках — почти всегда это лишняя запятая после последнего поля", "key": true}
    ],
    "causes": [
      {"text": "В config.json синтаксическая ошибка: лишняя запятая после последнего элемента или одинарные кавычки", "correct": true},
      {"text": "Файл конфига не найден", "why_not": "«Не найден» — другое сообщение (FileNotFoundError). Файл найден и прочитан, споткнулся разбор содержимого."},
      {"text": "Freqtrade не поддерживает эту версию конфига", "why_not": "До проверки версии не дошло — файл не удалось прочитать как JSON вообще."},
      {"text": "Не хватает прав на чтение файла", "why_not": "Тогда была бы PermissionError. Здесь файл прочитан."}
    ],
    "commands": [
      {"text": "Открыть user_data/config.json и посмотреть строку 12 (номер указан в ошибке)", "ru": "Идти по адресу из сообщения", "correct": true},
      {"text": "freqtrade new-config --config user_data/config.json", "ru": "Пересоздать конфиг визардом", "why_not": "Затрёт все твои правки ради одной запятой. Сначала посмотри строку 12."},
      {"text": "Удалить папку user_data", "ru": "Снести всё", "dangerous": true, "why_not": "Вместе с конфигом уйдут стратегии и скачанные данные. Никогда не первым шагом."},
      {"text": "pip install --upgrade freqtrade", "ru": "Обновить Freqtrade", "why_not": "Ошибка в твоём файле, не в программе."}
    ],
    "if_not_helped_ru": "Вставь содержимое файла в любой онлайн-валидатор JSON или попроси агента: «найди синтаксическую ошибку в этом JSON». Типовые причины: запятая перед } или ], комментарии // (в JSON их нет), одинарные кавычки.",
    "card": {"symptom": "JSONDecodeError: Expecting … line N column M", "meaning": "Файл конфига не читается как JSON", "cause": "Лишняя запятая / одинарные кавычки / комментарий", "first_cmd": "Открыть строку N в файле"}
  },
  {
    "id": "config_not_found",
    "title_ru": "Не та папка: конфиг не найден",
    "terminal": [
      {"text": "(.venv) ~ $ freqtrade backtesting --strategy SampleStrategy", "kind": "cmd", "ru": "Запустить бэктест (обрати внимание на ~ — ты в домашней папке)"},
      {"text": "freqtrade - ERROR - Config file \"config.json\" not found!", "kind": "err", "ru": "Файл config.json не найден в текущей папке", "key": true},
      {"text": "Please create a config file or check whether it exists.", "kind": "out", "ru": "Совет: создайте конфиг или проверьте, что он существует"}
    ],
    "causes": [
      {"text": "Команда запущена не из папки проекта (или без флага -c с путём к конфигу)", "correct": true},
      {"text": "Визард new-config не сохранил файл", "why_not": "Возможно, но проверяется одной командой — посмотреть содержимое папки. Куда более вероятно, что ты просто в другой папке: в начале строки ~ (домашняя), а не mybot."},
      {"text": "Freqtrade требует конфиг только в формате YAML", "why_not": "Нет: JSON — основной формат. Сообщение говорит про отсутствие файла, а не про формат."},
      {"text": "Нужно переустановить Freqtrade", "why_not": "Программа работает — она осмысленно сообщает, чего ей не хватает."}
    ],
    "commands": [
      {"text": "pwd && ls user_data/  (Windows: cd и dir user_data)", "ru": "Проверить, где я и есть ли конфиг", "correct": true},
      {"text": "freqtrade new-config", "ru": "Создать новый конфиг", "why_not": "Создашь второй конфиг в домашней папке и получишь два разных бота. Сначала найди первый."},
      {"text": "sudo freqtrade backtesting …", "ru": "Запустить от администратора", "dangerous": true, "why_not": "Права не при чём, а sudo для торгового бота — нарушение правил безопасности из урока 4.3."},
      {"text": "pip install --upgrade freqtrade", "ru": "Обновить", "why_not": "Обновление не переместит тебя в нужную папку."}
    ],
    "if_not_helped_ru": "Либо перейди в папку проекта (cd ~/bots/mybot), либо всегда указывай путь явно: -c user_data/config.json. Второй вариант надёжнее для скриптов и автозапуска.",
    "card": {"symptom": "Config file \"config.json\" not found!", "meaning": "Конфиг не в текущей папке", "cause": "Команда запущена не оттуда / нет флага -c", "first_cmd": "pwd && ls user_data/"}
  }
]
```

## 5. Логика и состояния

```
state = {
  os: 'windows'|'macos'|'linux',
  currentCase, 
  cases: { caseId: {
      panicBefore, panicAfter,
      lineAttempts, lineRevealed,
      causeAttempts, cmdAttempts,
      dangerousChosen (bool),
      cardSaved (bool),
      completedAt
  }},
  extrasUnlocked
}
```

- Шаги B → C → D строго последовательны; нельзя выбирать причину, не найдя главную строку (или не подсветив её после 2 промахов).
- Для случаев с `os_variants`, не включающих выбранную ОС (PowerShell на macOS/Linux): показывать экран с плашкой `fallback_note_ru`, шаг A/E (шкалы паники) для него не считать в среднюю.
- Если ученик выбрал `dangerous` команду: показать красный блок «Так делать нельзя никогда» + `why_not`, установить `dangerousChosen=true`, выбор остаётся доступным. В итоговой статистике — отдельная строка.
- Повтор на другой ОС: сбрасывает только `cases`, сохраняет справочник карточек (карточки не дублируются — обновляются полем `first_cmd` под новую ОС).

## 6. Тексты обратной связи — общие правила

- Шаг B, неверная строка: подставлять `line_feedback[kind]`; если для `kind` нет текста — общий: «Это не главная строка. Главная либо начинается с error/ERROR/имя ошибки, либо содержит not found / denied. В трассировке Python она всегда последняя».
- Шаг B, верно: над терминалом крупно русский перевод главной строки (`ru`) + подпись «Всё остальное в этом выводе — контекст».
- Шаг C/D верно: короткое подтверждение + сразу переход к следующему шагу (без лишних тостов).
- Шаг E: карточка формируется из `card` + `if_not_helped_ru`.

Финальная формула, показываемая на экране 8 и зашиваемая в справочник ошибок как первая запись:
> **Правило трёх шагов при любой ошибке:** 1) найти главную строку (в трассировке — последняя, у pip — первая с ERROR); 2) назвать причину своими словами; 3) первая команда — диагностическая (`--version`, `which/where`, `pwd/ls`) или минимальная локальная. Переустановка, `sudo pip`, удаление папок — никогда не первый шаг.

## 7. Требования к движку E1 «Терминал-переводчик» (минимальный объём для этого интерактива)

Если E1 ещё не реализован — реализовать в следующем объёме, с расчётом на переиспользование в FT-04, FT-08, FT-09, FT-11, FT-13, FT-16, FT-19, Py-01, Py-10, ВК3:

1. **Компонент `<TerminalView lines={...} mode={...} selectable={...} />`**
   - `lines[]`: `{text, kind: 'cmd'|'out'|'err'|'warn'|'noise', ru, key?, tokens?}`.
   - Раскраска по `kind`: cmd — жирный с префиксом-приглашением; err — красный; warn — жёлтый; noise — приглушённый серый, свёрнутая строка «… ещё N строк» с разворотом.
   - Режим `translate: 'en' | 'ru' | 'both'`: в `ru` каждая строка заменяется переводом (сохраняя цвет), в `both` — перевод выводится второй строкой под оригиналом мельче.
   - Клик по строке в обычном режиме → всплывающая карточка с переводом `ru`; в режиме `selectable` → событие `onLineSelect(index)`.
   - Клик по отдельному токену (если задан `tokens` или токен есть в глобальном словаре `code_token:*`) → карточка токена.
   - Копирование текста терминала должно копировать оригинал (англ.) без переводов — чтобы ученик мог вставить в поиск/агенту.

2. **Справочник ошибок («Мои карточки диагноза»)**: коллекция объектов `card` с полями `symptom, meaning, cause, first_cmd, if_not_helped, source_lesson, os`. Отдельная страница/панель со списком и поиском по симптому. Пополняется из этого интерактива и в будущем из FT-04/FT-09/Py-10.

3. **Глобальный словарь токенов** — общий с FT-01: `Traceback → отчёт об ошибке с путём к ней`, `ModuleNotFoundError → модуль не найден`, `permission denied → отказано в доступе`, `command not found → команда не найдена`, `venv → виртуальное окружение`, `pip → установщик пакетов Python`, `daemon → фоновая служба`, `socket → канал связи между программами`, `ERROR / error → ошибка`, `WARNING → предупреждение (не ошибка)`, `Requires-Python → требуемая версия Python`, `sudo → выполнить от имени администратора`, `PATH → список папок, где система ищет команды`.

## 8. Языковой слой (дополнительно к E1)

- Все варианты команд на шаге D показываются в блоке кода **с русской подписью под каждой** (поле `ru`) — ученик выбирает не по английскому тексту, а по смыслу.
- Сообщения PowerShell даются на русском намеренно (так они и выглядят в русской Windows) — это отдельное учебное наблюдение: «русский текст ошибки страшен не меньше английского, если не знать правило трёх шагов».
- Термины со ссылками на уроки: «виртуальное окружение» → FT-02 термины; «PEP 668 / externally-managed» → карточка-объяснение внутри интерактива (в курсе нет отдельного урока); «sudo» → урок 4.3 (безопасность); «Docker» → урок 4.2.

## 9. Аналитика (события)

| Событие | Поля |
|---|---|
| `ft02_start` | os |
| `ft02_panic` | caseId, phase(before/after), value(1–5) |
| `ft02_line_select` | caseId, lineIndex, correct, attemptNo |
| `ft02_line_reveal` | caseId |
| `ft02_cause` | caseId, optionIndex, correct, attemptNo |
| `ft02_command` | caseId, optionIndex, correct, dangerous, attemptNo |
| `ft02_card_saved` | caseId |
| `ft02_case_complete` | caseId, durationSec, panicDelta |
| `ft02_complete` | os, firstTryLine, firstTryCause, firstTryCmd, dangerousCount, avgPanicBefore, avgPanicAfter, durationSec |
| `ft02_extra_open` | caseId |

Ключевые метрики для методолога: (а) средняя `panicDelta` (цель ≥ 1,5 балла); (б) доля учеников, выбравших хотя бы одну `dangerous` команду (ожидание 30–50 % на первом прохождении; цель < 10 % при повторе); (в) доля верного нахождения главной строки в трассировке Python (случай 5) с первой попытки — прямой индикатор усвоения правила «последняя строка».

## 10. Критерии приёмки

1. Все 7 основных случаев + 2 дополнительных отображаются с полным контентом; для случаев с `*_by_os` подставляется вариант выбранной ОС; смена ОС на экране 0 меняет содержимое без перезагрузки.
2. Терминал (E1) раскрашивает строки по `kind`, сворачивает `noise`, переключается между режимами `англ./рус./оба`, показывает перевод по клику.
3. На шаге B верная строка определяется по флагу `key`; неверный клик показывает `line_feedback[kind]` или общий текст; после 2 промахов доступна «Подсветить».
4. На шаге C/D неверные варианты показывают свой `why_not`; вариант с `dangerous: true` дополнительно помечается красной плашкой «Так делать нельзя никогда».
5. Карточка диагноза формируется из данных и сохраняется в справочник; повторное сохранение не создаёт дубликат.
6. Экран итога показывает таблицу тревоги до/после с корректной средней (случаи с `fallback_note_ru` исключены из среднего), правило трёх шагов и статистику по первым попыткам.
7. Копирование текста из терминала даёт оригинал без переводов.
8. Мобильная версия: терминал с горизонтальной прокруткой длинных строк, варианты C/D — вертикальный список, всё управляется тапами.
9. Клавиатура: строки терминала в режиме выбора — Tab/Enter; варианты — стрелки/Enter; aria-label на русском.
10. События аналитики отправляются по списку раздела 9.
11. Тексты сообщений ошибок сверены с актуальными версиями pip/Python/Docker перед публикацией (чек-лист агента: обновить номера версий в `Requires-Python` и `v1.45` при необходимости, не меняя структуру).

## 11. Открытые вопросы

- Держать ли в списке случай с TA-Lib (ошибка сборки `ta_libc.h: No such file`)? Раньше это был случай №1 по частоте, но в актуальных сборках Freqtrade он встречается реже. Рекомендация: добавить как **третий дополнительный** случай с пометкой «встречается при ручной сборке», текст лечения — ссылка на официальный раздел Installation.
- Нужен ли «режим экзамена» (те же 7 случаев, но без шага B и без подсказок, с таймером 90 сек на случай) для повторного прохождения? Рекомендую включить флагом при `attempt ≥ 2`.

------------------------------------

# ТЗ на два интерактива трека FreqAI: FAI-06 и FAI-07

Общие соглашения для агента (действуют для обоих ТЗ):

- **Язык интерфейса** — только русский. Любой английский токен (`do_predict`, `DST`, `holdout`, `shuffle`, `σ`) — кликабельный чип «Ткни в непонятное» → карточка из общего глоссария приложения (термин, 1–2 предложения, ссылка на урок, где введён).
- **Персонаж** — Алексей (депозит 1000 $ / 100 000 ₽), как в Py-треке.
- **Числа** — берутся из урока или из детерминированного генератора с зафиксированным seed. Никаких «случайных» результатов при повторном открытии: одинаковые действия → одинаковые числа (это часть педагогики про воспроизводимость).
- **Интеграции**: E5 «Журнал внутри приложения» (записи с меткой времени и категорией), E7 «Линейка времени» (окна train/test/OOS), E4 «Ритуал» (напоминания, стрики). Если движки ещё не собраны — реализовать локальные заглушки с тем же интерфейсом (`journal.append(entry)`, `timeline.mount(...)`, `ritual.schedule(...)`), чтобы потом заменить без переписывания.
- **Телеметрия**: каждый интерактив шлёт события (см. разделы «Телеметрия»); идентификаторы событий — латиницей, `snake_case`.
- **Адаптив**: десктоп — две колонки; мобайл — колонки схлопываются в вертикальный поток, графики не уже 320 px, слайдеры с крупными хватами.

---

## Спека 1. FAI-06 «Удали кризис — получи спокойную ложь» (СИМ)

### 1.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `fai06_calm_lie` |
| Урок | FAI-06 «Аномальные наблюдения и качество входных данных» |
| Тип | СИМ с элементами ИГР (классификация аномалий) и РИТ (политика записывается до эксперимента) |
| Место в уроке | После блока «Подробнее», перед «Итог урока» (заменяет плейсхолдер `[Симулятор]`) |
| Время | 8–12 минут |
| Заблуждение | «Выброс = мусор: удалю всё необычное — модель станет лучше» |
| Целевой инсайт | Удаление рыночных экстремумов улучшает *бумажные* метрики, потому что из истории исчезает риск, а не потому, что модель стала лучше. На тесте, где обвал есть всегда, «спокойная» модель обманывает в обещании худшего дня в разы. Ошибки данных — наоборот — удалять правильно. Политика выбросов пишется ДО прогона и не меняется по результатам. |
| Критерий освоения | Ученик (а) во втором режиме верно классифицирует ≥ 4 из 5 аномалий как «ошибка данных / рыночное событие»; (б) в финальном вопросе выбирает правильный ответ; (в) не менял политику после открытия теста (или, если менял, — увидел флаг и объяснил в журнале). |

### 1.2. Педагогический сценарий (пошагово)

**Шаг 0. Вводная карточка** (1 экран):
> «Алексей готовит данные для модели FreqAI. Перед ним два года дневных свечей учебной монеты. Задача — решить, что делать с необычными днями, и записать решение ДО того, как модель обучится. Тест будущего закрыт: его откроем один раз в конце».

Кнопка «Начать».

**Шаг 1. Выбор режима** (две плитки):
- **Режим А «Кризис»** — в данных нет ошибок, только рыночные экстремумы. Вопрос: удалять ли обвалы?
- **Режим Б «Нулевой бар»** — в данных есть и обвалы, и технические ошибки биржи. Вопрос: как отличить?

Режим Б доступен после прохождения режима А (замок с подписью «Сначала пройди режим А»).

**Шаг 2. Политика выбросов (пишется первой).** Карточка «Моя политика — до эксперимента»:
- Радио (в режиме А):
  1. «Удалять все наблюдения дальше **k σ** от среднего» + слайдер k ∈ {2; 2,5; 3; 4; 5} (по умолчанию 3 — как в уроке).
  2. «Ничего не удалять».
- Радио (в режиме Б): те же два + третий: «Удалять/исправлять только ошибки данных; рыночные события оставлять».
- Поле «Почему» (≥ 20 символов).
- Кнопка «Записать политику» → создаётся запись в E5: `{type:"outlier_policy", lesson:"FAI-06", mode, rule, k, why, ts}`; политика **блокируется** (замок).

Пока политика не записана, кнопка «Применить к данным» неактивна с подсказкой «Политика выбросов фиксируется до обучения — так требует протокол урока».

**Шаг 3. Применение к данным.** Ряд отрисовывается; свечи, попавшие под правило, помечаются. Появляется список «Что убрано / что помечено»:
- В режиме А — просто список с датами и величиной движения.
- В режиме Б — для каждого помеченного наблюдения ученик обязан выбрать: «Ошибка данных» / «Рыночное событие» / «Не знаю». По каждому — мгновенная обратная связь после нажатия «Проверить классификацию» (см. тексты в 1.7). Если выбрана политика 1 (kσ), классификация всё равно проводится — как «разбор вслепую»: ученик видит, что kσ выкинул и рынок, и ошибки, и пропустил дубль.

**Шаг 4. Обучение → «На бумаге».** Кнопка «Обучить модель». Анимация 1,5 с (прогресс-бар «модель учится на 480 днях»). Открывается левая карточка метрик «На бумаге (обучающее окно после чистки)».

**Шаг 5. Открытие теста.** Правая часть графика затемнена и подписана «Тест: 230 дней будущего. Открывается один раз». Кнопка «Открыть тест». После нажатия:
- шторка уезжает, свечи теста «дорисовываются» слева направо (анимация 2 с);
- на днях 640–644 — обвал: свечи красные, увеличенные, короткая вибрация линии капитала;
- полоса «Худший день, который модель считала возможным» (горизонтальная линия на уровне −q99) — реальная свеча «пробивает» её (анимация пробоя);
- заполняется правая карточка «На тесте с реальным обвалом».

**Шаг 6. Вердикт + сравнение.** Появляется вердикт (цветной, см. 1.7) и кнопка «Сравнить с другими политиками». По нажатию — таблица трёх политик (в режиме Б — четырёх) с одинаковыми колонками. Над таблицей подпись: «В реальности второго теста нет: сравнение возможно только потому, что это тренажёр». Ниже — кнопка «Попробовать другую политику» → возвращает на шаг 2, но **поле журнала получает флаг** `changed_after_test: true`, и появляется жёлтый баннер: «Ты меняешь политику после того, как увидел тест. В реальном исследовании это подгонка (урок М42). В тренажёре — можно, но запиши, что именно ты понял».

**Шаг 7. Проверка понимания** (один вопрос, одиночный выбор):
> «Модель после удаления всех дней с движением > 3σ показала на бумаге просадку −5% вместо −14%. Что произошло?»
- «Модель научилась избегать обвалов» ✗
- «Из истории убрали дни с обвалом — просадка исчезла вместе с ними, а не была предсказана» ✓
- «Данные стали чище, значит модель точнее» ✗
- «Ничего не изменилось, разница — шум» ✗

После ответа — строка в журнал с чипом категории «Выброс = мусор» и полем «Что запомнил одной фразой» (необязательно).

### 1.3. Экран и компоненты

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Заголовок: Удали кризис — получи спокойную ложь          [Режим А|Б]     │
├──────────────────────────┬───────────────────────────────────────────────┤
│ ЛЕВАЯ ПАНЕЛЬ (30%)       │ ГРАФИК (70%)                                   │
│ ┌ Политика выбросов ──┐  │  цена/капитал, обучение | ▓▓ тест (закрыт) ▓▓  │
│ │ (o) удалять > [k]σ  │  │  маркеры аномалий: ◆ удалено ○ оставлено ▲ ошибка│
│ │ ( ) ничего          │  │  линия «худший день по модели» (−q99)          │
│ │ ( ) только ошибки   │  │  дорожка do_predict (0/1) под графиком         │
│ │ Почему: [........]  │  ├───────────────────────────────────────────────┤
│ │ [Записать политику] │  │  СПИСОК АНОМАЛИЙ (дата · движение · статус)     │
│ └─────────────────────┘  │  режим Б: [Ошибка данных][Рыночное][Не знаю]   │
│ [Применить к данным]     ├──────────────────────┬────────────────────────┤
│ [Обучить модель]         │ НА БУМАГЕ            │ НА ТЕСТЕ               │
│ [Открыть тест]  (1 раз)  │ точность направления │ точность направления   │
│                          │ худший день по модели│ худший день факт       │
│ Подсказки-чипы:          │ просадка стратегии   │ просадка стратегии     │
│ σ · do_predict · DST     │ убрано дней: N       │ РАЗРЫВ ОБЕЩАНИЯ: ×3,7  │
├──────────────────────────┴──────────────────────┴────────────────────────┤
│ ВЕРДИКТ  ·  [Сравнить с другими политиками]  ·  запись в журнал          │
└──────────────────────────────────────────────────────────────────────────┘
```

Компоненты:
- `PolicyCard` — форма политики с блокировкой.
- `SeriesChart` — свечи (или линия close + столбики доходности, переключатель), маркеры аномалий, шторка теста, линия −q99, дорожка `do_predict`.
- `AnomalyList` — таблица помеченных наблюдений; в режиме Б — с сегмент-кнопками классификации.
- `MetricsCard` ×2 — «На бумаге» / «На тесте», с дельта-стрелками между ними.
- `VerdictBanner`, `ComparisonTable`, `QuizCard`.

### 1.4. Данные: детерминированный генератор

Использовать PRNG `mulberry32(seed)`; seed зафиксировать в константе `FAI06_SEED` после подбора (см. 1.9 п. «настройка»).

**Ряд**: 730 дневных свечей. Базовая доходность дня `r_t = 0.0005 + 0.02 · z_t`, где `z_t` — стандартная нормальная (Бокс–Мюллер). Цена: `close_t = close_{t-1} · exp(r_t)`, `close_0 = 100`. Для свечей: `open = close_{t-1}`, `high = max(open, close)·(1+|0.004·z'|)`, `low = min(open, close)·(1−|0.004·z''|)`, `volume = 1000·(1+0.3·|z'''|)`.

**Окна**: обучение — дни 1–500 (первые 20 — прогрев признаков, считаем модель на 21–500); тест — дни 501–730.

**Внедряемые аномалии** (перезаписывают базовую доходность в указанные дни):

| ID | Дни | Значения r_t | Природа | Есть в режиме |
|---|---|---|---|---|
| A1 «обвал в обучении» | 210–214 | −0,09; −0,13; +0,07; −0,06; +0,05 | рынок | А, Б |
| A2 «новость» | 350 | +0,11 | рынок | А, Б |
| A3 «каскад ликвидаций» | 455–456 | −0,08; +0,06 | рынок | А, Б |
| B1 «обвал в тесте» | 640–644 | −0,08; −0,15; +0,04; −0,10; +0,06 | рынок | А, Б (всегда!) |
| E1 «нулевой бар» | 120 | close = 0 → r = −1,0; на день 121 r = +∞ | ошибка данных | Б |
| E2 «дубль свечи» | 402 | копия свечи дня 401 с той же меткой времени | ошибка данных | Б |
| E3 «жирный палец» | 460 | close ×100 на одну свечу; день 461 возвращает цену | ошибка данных | Б |

**Правило числовой безопасности**: перед любыми расчётами доходности клипуются в диапазон [−0,99; +9,9]; бесконечности заменяются на границы. Дубль свечи (E2) обнаруживается по совпадению метки времени — он не влияет на σ, но удваивает вес одного наблюдения в обучении (педагогический момент: «kσ его не увидит»).

**Признаки для модели** (считаются только по прошлому, `rolling`, без `center`, без `bfill`):
- `roc1 = r_t`, `roc5 = close_t/close_{t-5} − 1`, `vol20 = std(r_{t-19..t})`, `rsi14` (стандартная формула).
- Нормализация: `(x − mean_train)/std_train`, статистики **только по обучающему окну после применения политики**.

**Целевая переменная**: `y_t = 1`, если `r_{t+1} > 0`, иначе 0 (используется только в обучении; в тесте — для подсчёта точности постфактум).

### 1.5. Модель и стратегия (математика)

**Модель** — логистическая регрессия на 4 признаках + свободный член, обучение градиентным спуском: 300 итераций, шаг 0,05, инициализация нулями (детерминированно). Выход — `p_up`. Прогноз направления: `p_up > 0,5`.

**Фильтр выбросов** (политика 1): наблюдение исключается из обучения, если `|r_t − mean_train| > k · std_train`, где `mean_train`, `std_train` считаются по **сырому** обучающему окну (это то, что делает наивный исследователь). В режиме Б с ошибками E1/E3 сырое `std_train` раздуто (одна свеча −99% и одна +9900%), поэтому при k = 3 будут удалены только E1, E3 и, возможно, ничего больше — а A1 останется. Это **намеренный** побочный урок: «kσ на грязных данных не работает даже как фильтр» — вывести в вердикт для режима Б, политика 1.

**DST-подобная дорожка `do_predict`** (для уровня «Глубже», можно отключить флагом `showDoPredict`): для каждого дня теста `do_predict = 1`, если все нормализованные признаки по модулю ≤ максимума, наблюдавшегося в обучении после чистки; иначе 0. Подпись при наведении: «Модель считает этот день непохожим на всё, что видела, и отказывается предсказывать».

**Обещание худшего дня**: `worst_promised = quantile_0.01(r_train_after_policy)` (1-й процентиль доходности обучающего окна после чистки).

**Стратегия Алексея** (одинаковая для всех политик, чтобы отличие было только в данных):
- Позиция открыта, когда `p_up > 0,5` (и `do_predict = 1`, если дорожка включена; в противном случае позиция, открытая ранее, **не закрывается** — модель молчит, а сделка живёт).
- Размер позиции: `size = clamp(0.025 / std_train_after_policy, 0.25, 3.0)` (целевой дневной риск 2,5% депозита; плечо до ×3 — учебная утрировка, вынести в подпись «упрощение тренажёра»).
- Стоп на позицию: `stop = 3 · std_train_after_policy`. Срабатывание внутри дня по `low`; исполнение — по худшему из (уровень стопа, close дня) — имитация гэпа (урок FT-09: «стоп может проскочить глубже»).
- Капитал: `equity_{t+1} = equity_t · (1 + size · r_{t+1})` при открытой позиции.

**Метрики карточек**:

| Метрика (русское имя на экране) | Формула | «На бумаге» считается на | «На тесте» считается на |
|---|---|---|---|
| Точность направления | доля дней, где sign(p_up−0,5) совпал со sign(r_{t+1}) | обучающее окно после чистки | тест целиком |
| Худший день, который модель считала возможным | `worst_promised` | — (одно число, показывается в обеих карточках как линия) | — |
| Худший день факт | `min(r_t)` | обучающее окно после чистки | тест |
| Просадка стратегии | max DD кривой капитала | обучающее окно после чистки | тест |
| Убрано дней | count | — | — |
| **Разрыв обещания** | `|худший день факт теста| / |worst_promised|` | — | тест (ключевое число) |
| Молчание модели в обвале (если включено) | число дней B1 с `do_predict = 0` из 5 | — | тест |

### 1.6. Ожидаемые результаты (целевые диапазоны для настройки seed)

Агент подбирает `FAI06_SEED` перебором (0…9999) до выполнения всех условий ниже, затем фиксирует seed и снимает «золотые» значения в снапшот-тест.

**Режим А:**

| Политика | На бумаге: просадка | На бумаге: точность | Обещание худшего дня | Тест: худший день | Тест: просадка | Разрыв обещания | Вердикт |
|---|---|---|---|---|---|---|---|
| Удалять > 3σ | в диапазоне −3…−7% | ≥ точность «ничего» + 2 п.п. | −3,5…−5% | −15% | ≥ 1,6 × просадки при «ничего» | ≥ 3,0 | 🔴 «Спокойная ложь» |
| Ничего не удалять | −12…−18% | базовая | −11…−14% | −15% | базовая | 1,0…1,4 | 🟢 «Честно» |

Дополнительно проверить монотонность: при k = 2 разрыв ≥ разрыва при k = 3 ≥ разрыва при k = 4; при k = 5 удаляются ≤ 2 дней, вердикт — 🟡 «Почти ничего не изменилось».

**Режим Б:**

| Политика | Что удалено | На бумаге | Тест | Вердикт |
|---|---|---|---|---|
| Удалять > 3σ | E1, E3 (иногда день 121); A1 остаётся; E2 остаётся | точность ~ базовая, просадка честная, но модель обучена с дублем | разрыв 1,0–1,4 | 🟡 «Повезло: kσ на грязных данных поймал только самые дикие ошибки и не увидел дубль» |
| Ничего не удалять | ничего | std_train ≥ 0,5 (раздут), size = 0,25 (минимум), точность 48–52%, «обещание худшего дня» −99% | тест: просадка мала из-за микроскопической позиции, точность ~50% | 🟡 «Честно, но слепо: мусор сломал масштаб — модель не торгует, а гадает» |
| Только ошибки данных (E1, E2, E3 исправлены/удалены; A1, A2, A3 оставлены) | 3 ошибки | как «ничего» в режиме А | разрыв 1,0–1,4 | 🟢 «Правильная гигиена» |
| (скрытая для сравнения) Только ошибки + удалить A1 | — | самая красивая бумага | разрыв ≥ 3 | 🔴 показывается в таблице сравнения как «соблазн» |

Классификация в режиме Б — эталон: E1, E2, E3 → «Ошибка данных»; A1, A2, A3 → «Рыночное событие». Для показа в списке аномалий режима Б помечаются все дни с `|r| > 2,5σ_робастной` (σ по медианному абсолютному отклонению ×1,4826, чтобы список был осмысленным даже при грязных данных) плюс дубль (по метке времени) — итого ~7–9 строк.

### 1.7. Тексты обратной связи (готовые, русские)

**Классификация аномалий (режим Б)**:
- E1 верно: «Да. Цена не бывает нулём — это дыра в ленте биржи. Такое удаляют или заполняют предыдущим значением (не следующим! — иначе утечка будущего)».
- E1 ошибочно «рыночное»: «Нет. Обвал на −100% за день с полным восстановлением назавтра — так рынок не ходит. Это нулевой бар: сбой данных».
- E2 верно: «Да. Две свечи с одной меткой времени — дубль. kσ его не видит: значения обычные, а вес удвоен. Ловится только проверкой индекса (урок FT-08)».
- E3 верно: «Да. Цена ×100 на одну свечу и назад — «жирный палец» или сбой парсера. Ошибка данных».
- A1 верно: «Да. Пять дней подряд с минусами и отскоками — это обвал, а не ошибка. Именно такие дни модель обязана видеть».
- A1 ошибочно «ошибка»: «Нет. Обвал — самая дорогая информация в истории. Удалишь — модель будет уверена, что худший день −4%».
- A2 верно / ошибочно: аналогично, с текстом про «новость: одиночный день +11% при нормальном объёме и без отката — рыночное событие».
- Итог классификации: «Верно N из 6. Порог освоения — 4».

**Вердикты (режим А):**
- 🔴 «Спокойная ложь. На бумаге просадка −5% и худший день −4%: это не результат обучения — эти дни просто исчезли из истории. Тест принёс −15% за день, потому что обвалы в будущем есть всегда. Модель обещала одно, рынок сделал другое: разрыв обещания ×3,7. Именно от этого разрыва ломаются стопы, размер позиции и психика (урок 5.5: цифру худшего дня надо увидеть до запуска, а не после)».
- 🟢 «Честно. Бумага выглядит хуже: просадка −14%, худший день −13%. Зато тест не преподнёс сюрприза: разрыв обещания ×1,15. Стоп и размер позиции были построены под настоящий мир».
- 🟡 (k = 5) «Порог так высок, что убрано почти ничего. Разницы нет — и это нормально: не всякая фильтрация вредна, вредна та, что режет рынок».

**Вердикты (режим Б)** — из таблицы 1.6.

**Баннер смены политики после теста**: см. шаг 6.

**Подпись к дорожке do_predict в обвале**: «Модель замолчала на 4 из 5 дней обвала: она их «не узнала». Позиция при этом открыта, а стоп рассчитан из мира без обвалов».

### 1.8. Языковой слой

Обязательные чипы «Ткни в непонятное» (с русской карточкой):
`σ` (сигма — стандартное отклонение, «типичный размах дня»), `kσ`, `do_predict` (флаг FreqAI «модель согласна предсказывать»), `DST / DoM` (два детектора выбросов FreqAI: по расстоянию до похожих дней / по плотности соседей), `outlier` (выброс), `train / test` (обучение / тест), `holdout` (отложенная проверка), `quantile` (процентиль → «уровень, ниже которого 1% дней»), `bfill` (заполнение назад — берёт будущее), `drawdown` (просадка).

Все подписи метрик — русские; английский оригинал — во всплывающей подсказке (для сверки с документацией FreqAI).

### 1.9. Состояния, события, приёмка

**Стейт-машина**: `intro → mode_select → policy_draft → policy_locked → applied → (classified | skip) → trained → test_opened → verdict → compared → quiz → done`. Переход `compared → policy_draft` разрешён с флагом `changed_after_test`.

**Персистентность**: прогресс по режимам, ответы классификации, флаг смены политики, ответ квиза — в профиле ученика; записи — в E5.

**Телеметрия**: `fai06_start{mode}`, `fai06_policy_locked{rule,k}`, `fai06_classify{anomaly_id, answer, correct}`, `fai06_test_opened{policy}`, `fai06_policy_changed_after_test`, `fai06_quiz{correct}`, `fai06_done{score}`.

**Критерии приёмки**:
1. Одинаковые действия дают побитово одинаковые числа при перезагрузке (снапшот-тест на золотые значения для 6 комбинаций режим×политика).
2. Кнопка «Открыть тест» одноразовая в рамках одной политики; повторный тест возможен только через явную смену политики с флагом и баннером.
3. Кнопки «Применить»/«Обучить» недоступны до записи политики; в E5 появляется запись с `ts` раньше `ts` обучения.
4. Диапазоны из 1.6 выполняются на зафиксированном seed.
5. Ни один расчёт признаков не использует `shift(−n)`, `bfill`, `center=True`, статистики по всему ряду — проверить юнит-тестом: при удалении последних 100 свечей ряда значения признаков на оставшихся не меняются.
6. Числовая устойчивость: E1/E3 не дают NaN/Infinity ни в одной метрике.
7. Мобайл 360 px: график читается, слайдер k управляем.
8. Все английские токены на экране — чипы глоссария (линтер строк: список разрешённых латинских токенов).

**Не делать**: не показывать тест до записи политики; не «выравнивать» результаты под красивую историю — если ученик выбрал «ничего не удалять» в режиме А, ему честно показывается худшая бумага; не давать кнопку «сбросить holdout» без флага.

---

## Спека 2. FAI-07 «Ворота Capstone» (РИТ)

### 2.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `fai07_capstone_gates` |
| Урок | FAI-07 «FreqAI Capstone: модель под контролем базовой стратегии» |
| Тип | РИТ на движках E4 (ритуал/напоминания) + E7 (линейка времени) + E5 (журнал) |
| Место в уроке | Заменяет `[Симулятор]` после чек-листа из 6 пунктов; остаётся доступен из «Моих ритуалов» после урока |
| Время | Первое прохождение 15–25 мин (тренажёр); в режиме «Мой проект» — ведётся неделями |
| Заблуждение | «Финальный тест можно посмотреть ещё разок — я же только чуть-чуть подправлю» |
| Целевой инсайт | Holdout — расходуемый ресурс: одно открытие. Каждый повторный взгляд превращает его в train. Решение о результате holdout должно быть записано ДО открытия (предрегистрация). Новый holdout даёт только время (новые данные), не новая попытка. |
| Критерий освоения | В режиме «Тренажёр» ученик проходит шесть ворот, предрегистрирует решение, открывает holdout один раз и, столкнувшись с «соблазном», не нажимает повтор — либо нажимает и получает закрытие ворот с объяснением. В режиме «Мой проект» ворота открываются только по условиям, без «просто кликнуть». |

### 2.2. Два режима

- **Тренажёр** — учебные данные (можно взять из FAI-06: та же учебная монета, результаты бэктестов подставляются автоматически). Есть кнопка «Сбросить тренажёр». Соблазн после holdout моделируется намеренно.
- **Мой проект** — ученик вносит собственные данные (числа из своих прогонов Freqtrade/FreqAI). Кнопки «сбросить» нет. Счётчик открытий holdout сохраняется навсегда; новый holdout появляется только через «Ворота времени» (см. 2.6).

Переключатель режимов вверху; по умолчанию открывается Тренажёр, пока он не пройден.

### 2.3. Визуальная метафора

Вертикальный (на десктопе — горизонтальный) коридор из шести арок-ворот. Каждая арка: закрыта (серая решётка), «в работе» (жёлтая, решётка приподнята наполовину), открыта (зелёная, решётка поднята). За шестыми воротами — тяжёлая дверь «Holdout» с табличкой «Открытий: 0 / 1». За дверью — тёмный зал (данные, которых никто не видел). Персонаж Алексей стоит перед текущими воротами.

Открытие арки — анимация 0,6 с; при провале условия — решётка дрожит и не поднимается; при попытке второго открытия holdout — все шесть решёток падают одновременно (0,8 с, звук глухого удара, если звук включён), табличка меняется на «Использован. Это уже train».

### 2.4. Шесть ворот: условия, доказательства, автопроверки

Общее правило: **ворота открываются только выполнением условия**, а не отметкой галочки. Там, где автопроверка невозможна, требуется «доказательство»: число, дата, ссылка на запись журнала, вставленный фрагмент — и ручная аттестация с датой. Каждые ворота имеют кнопку «Что это значит?» → русское объяснение из урока.

**Ворота 1 — «Признаки: объяснимы, без будущего, 10–30 штук»**
- Ввод: таблица признаков (импорт из кода — вставить содержимое `populate_any_indicators`, парсер вытаскивает строки с `df['%-...']`; или ручной ввод). Для каждого признака два поля: «Рыночное объяснение» (≥ 15 символов) и тумблер «Известно в момент t: да/нет».
- Автопроверки: (а) 10 ≤ N ≤ 30; (б) ни один признак не помечен «нет»; (в) в вставленном коде нет токенов `shift(-`, `bfill`, `center=True`, `.mean()`/`.std()` без `rolling`/`ewm` в той же строке, `.iloc[` с положительным смещением вперёд; (г) ни один признак не начинается с `&` (цель попала в признаки). Каждый найденный токен подсвечивается с русской подписью («смотрит в будущее»).
- Тренажёр: предзаполнено 12 признаков, из них два дефектных (`%-close_next` через `shift(-1)` и `%-vol_all` через `std()` по всей истории) — ученик должен их найти и удалить/исправить. Ворота открываются, когда дефектов нет.
- Открытие: 🟢 «Признаки честные: N = 11, все объяснимы, будущего нет».

**Ворота 2 — «Валидация: walk-forward, без shuffle»**
- Компонент: E7 «Линейка времени». Ученик расставляет ≥ 3 пары окон (обучение → проверка) с шагом вперёд; тумблер «Перемешивание (shuffle)» должен быть ВЫКЛ; поле «Зазор (purge), дней» — необязательное, подсказка.
- Автопроверки: окна проверки строго позже своих обучающих; окна проверки не пересекаются между собой; ни одно окно проверки не заходит в holdout-зону (она выделена справа как «неприкосновенно»); shuffle выкл.
- Ошибки подсвечиваются красным на линейке с подписью («проверка раньше обучения — будущее в train», «два окна проверки перекрываются — одна и та же неделя оценена дважды», «включено перемешивание — время разрушено»).
- Тренажёр: предзаполнена одна ошибочная конфигурация (shuffle вкл, 2 окна с пересечением).

**Ворота 3 — «База: простая стратегия бьётся вне выборки»**
- Ввод: таблица «окно OOS × {база, модель}» с метриками PF и Sortino (минимум 2 окна; в Тренажёре подтягиваются 3 окна из учебных прогонов). Плюс IS-значение модели.
- Автопроверки: модель > базы по PF минимум в 2 из 3 OOS-окон (правило из FAI-04); OOS-PF модели ∈ [0,5; 1,0] × IS-PF — если OOS лучше IS, ворота **не открываются** с жёлтой подписью «OOS лучше in-sample — ищи утечку (FT-16)»; PF модели на OOS ≥ 1,1 (иначе «оптимизация выучила шум»).
- Тренажёр: три варианта данных на выбор — «честный» (проходит), «подогнанный» (OOS > IS — не проходит), «модель хуже базы» (не проходит). Ученик должен выбрать честный набор и объяснить, почему два других не проходят (мини-вопросы).

**Ворота 4 — «Выбросы: политика записана до экспериментов»**
- Автоимпорт: последняя запись E5 типа `outlier_policy` (из FAI-06 или созданная здесь). Показать текст политики и `ts`.
- Автопроверка: `ts_policy < ts_first_training_run` (в Тренажёре — метка первого обучения из FAI-06; в «Моём проекте» — ученик вводит дату первого прогона, и она фиксируется как неизменяемая). Если политика записана после — 🔴 «Политика появилась после эксперимента: это обоснование задним числом (М42). Ворота закрыты. Выход: зафиксируй политику сейчас и признай текущие прогоны исследовательскими — holdout для них уже не честен».
- Если политика менялась после теста (флаг `changed_after_test` из FAI-06) — ворота открываются жёлтыми с подписью «политика менялась после теста в тренажёре — в проекте так нельзя».

**Ворота 5 — «Мониторинг: доля верных направлений, отключение при деградации»**
- Конструктор правила из трёх обязательных частей: метрика (выпадающий: «доля верных направлений», «PF скользящий», «разрыв обещания худшего дня»), окно (20–200 наблюдений), порог (число), действие (единственный допустимый вариант в первый год — «отключить ML-слой → вернуться к базовой стратегии»; варианты «переобучить срочно», «поднять размер» — присутствуют, но при выборе дают красную подпись «это не мониторинг, это реакция на боль; см. П1/5.5»).
- Мини-симуляция «прогон мониторинга»: 300 дней синтетики, где точность модели плавно падает с 58% до 47% начиная с дня 150 (плюс шум). Скользящее окно ученика рисуется поверх. Проверка: правило срабатывает в диапазоне дней 170–260 (не раньше 150 — иначе «ловит шум», не позже 260 — «поздно: просадка уже съела квартал»). Показывает день срабатывания и «сколько убытка избежал / сколько ложных тревог».
- Ворота открываются, если правило полное, действие — «отключить», и симуляция дала срабатывание в допустимом диапазоне.

**Ворота 6 — «Dry-run: план 8 недель как для обычной стратегии»**
- Интеграция с E4: генерируется календарь 8 недель от выбранной даты старта с недельными целями из FT-20 (неделя 1 — инфраструктура; 2–3 — накопление; 4–5 — кризис-тест; 6–7 — Execution Deviation; 8 — чек-лист). Плюс поле «Критерий отключения ML-слоя во время dry-run» (переносится из ворот 5).
- Автопроверка: дата старта не раньше сегодняшнего дня; напоминание воскресного разбора создано в E4; ученик подтвердил галочкой каждую из 8 недель «понимаю цель недели» (это единственные галочки-аттестации в интерактиве, и они не про результат, а про план).
- Тренажёр: даты условные («неделя 1…8»), календарь не создаётся в реальном E4, а показывается макетом.

### 2.5. Дверь Holdout: церемония одного открытия

Доступна только при шести зелёных (жёлтые ворота 4 в тренажёре допускаются с предупреждением).

**Шаг А. Предрегистрация решения** (обязательно, до открытия):
Форма «Что я решу по результату, ещё не видя его»:
- «Если на holdout PF модели ≥ [__] И модель бьёт базу → отправляю в dry-run».
- «Если нет → возвращаю в лабораторию, и этот holdout для этой модели сгорел».
- Свободное поле «Чего я НЕ буду делать после просмотра» (≥ 20 символов; подсказка: «менять порог, признаки, окна…»).
- Запись в E5: `{type:"holdout_preregistration", pf_threshold, ts}`; блокировка.

**Шаг Б. Подтверждение**: модалка с текстом
> «Ты открываешь holdout. Это можно сделать один раз для этой модели. После просмотра любые изменения модели делают этот тест обучающей выборкой. Напечатай: **открываю один раз**».
Поле ввода фразы (точное совпадение без учёта регистра). Кнопка «Открыть» активируется только при совпадении.

**Шаг В. Открытие**: дверь распахивается (1 с), в зале появляется карточка результата:
- В Тренажёре — данные учебной модели (PF, Sortino, сравнение с базой, разрыв обещания худшего дня). Результат намеренно **пограничный**: PF = 1,18 при предрегистрированном пороге по умолчанию 1,2 (если ученик поставил порог ≤ 1,18 — результат проходит; если > 1,18 — не проходит). Это создаёт соблазн.
- В «Моём проекте» — ученик вводит свои числа; поля после ввода блокируются.
- Автоматический вердикт по предрегистрированному правилу: «По твоему же правилу: → лаборатория» / «→ dry-run». Счётчик: «Открытий: 1 / 1».

**Шаг Г. Соблазн (только Тренажёр)**: под результатом появляются три кнопки в стиле «полезных предложений»:
- «Снизить порог до 1,15 и посмотреть ещё раз»
- «Добавить один признак и перепроверить на holdout»
- «Принять решение по своему правилу»

Нажатие первой или второй → **все ворота закрываются** (анимация), табличка «Использован. Это уже train», баннер:
> «Ты только что превратил holdout в train. Дело не в кнопке — в намерении: как только результат влияет на настройку, следующий взгляд на те же данные уже ничего не проверяет. В реальном проекте так теряют единственную честную оценку. Что теперь: (1) записать в журнал, что модель «видела» holdout; (2) новые данные даст только время — заведи ритуал ожидания».
Кнопки: «Записать в журнал» (E5, чип «Финальный тест ещё разок»), «Открыть Ворота времени» (см. 2.6), «Пройти тренажёр заново» (сброс).

Нажатие третьей → 🟢 «Правило сработало вместо эмоции. Именно так выглядит дисциплина исследователя: решение написано до данных, данные его исполнили». Запись в журнал с чипом «Предрегистрация выполнена». Показать «стрик» Тренажёра: 1.

**Повторное нажатие на дверь** в любом режиме после открытия → тот же сценарий закрытия ворот (в «Моём проекте» — без кнопки сброса; с подписью «в проекте holdout один; следующий — через Ворота времени»).

### 2.6. «Ворота времени» (как появляется новый holdout)

Отдельная панель, доступная после использования holdout:
- Объяснение: «Новый honest-тест не создаётся кнопкой. Его создают только данные, которых ещё не существовало в момент последнего решения. Для дневной стратегии — минимум N недель новых свечей».
- Калькулятор: таймфрейм × требуемое число сделок (по умолчанию 30) × ожидаемая частота сделок (из dry-run плана) → дата, с которой накопится новый holdout. Пример: «1h, ~2,5 сделки/нед. → 12 недель → holdout будет честным с 14.09».
- Кнопка «Заморозить модель и ждать до [дата]» → E4 создаёт ритуал ожидания с напоминанием в назначенную дату и еженедельным вопросом «Модель не менялась? да/нет» (ответ «нет» — сбрасывает отсчёт с подписью «изменение модели обнуляет накопленный holdout»).
- В день наступления даты дверь Holdout получает табличку «Открытий: 0 / 1 (данные с [дата])».

Этот механизм — единственный путь получить второй holdout в режиме «Мой проект».

### 2.7. Персистентность и модель данных

```
capstone_project {
  mode: "trainer" | "project",
  gates: [ {id:1..6, status:"locked|in_progress|open|warning", evidence:{...}, opened_at} ],
  first_training_run_ts,            // неизменяемо после ввода
  outlier_policy_ref → journal id,
  holdout: { opens_used, prereg_ref, result, opened_at, burned:boolean, next_available_from },
  time_gate: { frozen_since, target_date, model_unchanged_confirmations:[...] },
  trainer_temptation_outcome: "resisted|yielded|none"
}
```
Хранить в профиле ученика; экспорт в JSON («взять чек-лист с собой» — можно положить рядом с `go_live_checklist.md` из FT-20).

### 2.8. Тексты «Что это значит?» (по воротам, кратко, русским)

1. «Признак — то, что модель видит в момент прогноза. Всё, что известно позже, — не признак, а утечка. 10–30 объяснимых признаков лучше сотни необъяснимых (FAI-02, FAI-04)».
2. «Проверка всегда позже обучения. Перемешивание ставит будущее в прошлое. Несколько окон подряд — walk-forward — дают не одну оценку, а серию (1.9, FAI-03)».
3. «Модель должна быть лучше простой стратегии там, где она этого ещё не видела. Если вне выборки она лучше, чем внутри, — в неё утекло будущее (FT-16, FAI-04)».
4. «Решение, что считать мусором, принимается до эксперимента. Иначе ты удаляешь то, что мешает красивому результату (FAI-06)».
5. «Автопереобучение не спасает от смены рынка. Нужен внешний измеритель качества и заранее назначенное действие — вернуться к базе (FAI-05, П1)».
6. «ML-слой проходит тот же 8-недельный dry-run, что и любая стратегия, с теми же допусками: Execution Deviation, чистый журнал вмешательств (FT-20, 4.5)».

### 2.9. Языковой слой

Чипы: `holdout` (отложенная проверка — «данные, которых не видел никто»), `walk-forward` (пошаговая проверка вперёд), `shuffle` (перемешивание), `purge` (зазор), `in-sample / out-of-sample` (внутри выборки / вне), `PF` (фактор прибыли), `Sortino`, `do_predict`, `%- / &s-` (префиксы признаков и целей FreqAI), `dry-run`, `Execution Deviation` (отклонение исполнения). Все системные тексты — русские; английский оригинал — в подсказке.

### 2.10. Телеметрия

`fai07_mode{trainer|project}`, `fai07_gate_attempt{gate, passed, reasons[]}`, `fai07_gate_open{gate}`, `fai07_prereg{threshold}`, `fai07_holdout_open{opens_used}`, `fai07_temptation{choice}`, `fai07_gates_slammed{reason}`, `fai07_time_gate_created{target_date}`, `fai07_time_gate_reset{cause}`.

Метрика курса: доля учеников, выбравших «Принять решение по своему правилу» с первой попытки в Тренажёре; доля проектов, где `opens_used` не превышает 1 через 30 дней.

### 2.11. Критерии приёмки

1. Ни одни ворота нельзя открыть кликом без выполнения условия; тест: попытка вызвать `openGate(i)` без валидного `evidence` возвращает ошибку и список причин на русском.
2. Ворота 1: парсер находит все четыре класса дефектов на тестовом фрагменте (`shift(-1)`, `bfill`, `center=True`, глобальные `mean()/std()`), не даёт ложных срабатываний на `shift(1)`, `rolling(20).mean()`.
3. Ворота 2: линейка отвергает пересечения, обратный порядок, shuffle, заход в holdout-зону — четыре юнит-теста.
4. Ворота 3: набор «подогнанный» (OOS > IS) не проходит; «честный» проходит; «хуже базы» не проходит.
5. Ворота 4: политика с `ts` позже первого прогона — не проходит.
6. Ворота 5: правило с порогом 55% и окном 30 срабатывает на дне ∈ [170; 260]; правило с окном 5 — срабатывает раньше 150 (ложная тревога) и не проходит; действие «поднять размер» — не проходит.
7. Дверь holdout: без предрегистрации — недоступна; без точной фразы — недоступна; после открытия `opens_used = 1`; любое повторное действие (кнопки-соблазны, повторный клик по двери, изменение полей ворот 1/3/5 после открытия) переводит `holdout.burned = true` и закрывает ворота.
8. В режиме «Мой проект» отсутствует любая функция сброса `opens_used`, кроме «Ворот времени» с наступившей датой; изменение модели (ответ «нет» на еженедельный вопрос) сбрасывает `frozen_since`.
9. Экспорт JSON содержит все `ts` и ссылки на записи журнала — воспроизводимость решения другим человеком (это и есть п. «конвейер воспроизводим по журналу» из самопроверки урока).
10. Мобайл: коридор ворот вертикальный, каждая арка — раскрывающаяся карточка; линейка времени E7 — с горизонтальным скроллом.

**Не делать**: не показывать результат holdout до предрегистрации; не давать «мягкий» выход из закрытых ворот («ну ладно, ещё разок»); не подменять условия ворот галочками «я подтверждаю»; не переводить интерфейс на английские метки ради краткости.

---

## Связки между двумя интерактивами (реализовать обязательно)

1. Запись `outlier_policy` из FAI-06 автоматически становится доказательством для ворот 4 в FAI-07 вместе с `ts` первого обучения и флагом `changed_after_test`.
2. «Разрыв обещания худшего дня» из FAI-06 доступен как одна из трёх метрик мониторинга в воротах 5.
3. Одноразовая кнопка «Открыть тест» в FAI-06 и дверь Holdout в FAI-07 используют один и тот же UI-паттерн (шторка + счётчик + фраза подтверждения на втором) — ученик должен узнать ритуал с первого взгляда.
4. Обе записи в E5 получают чипы категорий: «Выброс = мусор» и «Финальный тест ещё разок»; недельная сводка E5 показывает их рядом с «Два вопроса» из П1 — как одно семейство ошибок «решение после данных».

---------------------
# Спецификации интерактивов FT-03 и FT-04 для реализации

## 0. Общие требования к обоим интерактивам

| Параметр | Значение |
|---|---|
| Аудитория | Русскоязычный новичок без английского и без опыта программирования |
| Технология | Чисто клиентский компонент (без сети, без реального Freqtrade); данные интерактива — статический JSON, вшитый в компонент |
| Язык интерфейса | Только русский. Все английские токены (имена файлов, ключи JSON, папки) — кликабельны, режим **«Ткни в непонятное»**: клик → всплывающая карточка с русским названием, объяснением в одну фразу и ссылкой на термин урока |
| Персонаж | Алексей, депозит 1000 USDT (сквозной герой Py-уроков и FT-04 «dry_run_wallet: 1000») |
| Числа | Только из текста уроков FT-02/FT-03/FT-04 (1000 USDT, 3 слота, ~330 USDT на слот, комиссия 0,1%, пары BTC/ETH/SOL) |
| Адаптивность | Desktop: drag&drop мышью; mobile (≥360 px): тап по объекту → тап по цели; drag не обязателен |
| Доступность | Все действия доступны с клавиатуры (Tab/Enter/стрелки); контраст ≥ 4.5:1; обратная связь дублируется текстом, не только цветом |
| Состояние | Прогресс сохраняется в localStorage (ключ `ft03_state` / `ft04_state`); повтор доступен без ограничений; фиксируются попытка №1 и №2 |
| Телеметрия | События в общую аналитику (см. п. 3 каждой спеки) — нужны для метрики «повторные ошибки −50% ко второй попытке» |
| Кнопка «Пояснить» | В любой момент доступна панель «Зачем это» — 3 предложения, откуда взят интерактив в уроке |

---

## 1. FT-03 · «Собери user_data»

### 1.1. Паспорт

| Поле | Содержание |
|---|---|
| ID | `ft03_assemble_userdata` |
| Тип | ИГР (drag&drop-сортировка) + СИМ (симуляция обновления) + короткий РИТ-вопрос про git |
| Урок | 203 · FT-03 «Структура проекта и каталог user_data» |
| Место в уроке | После блока «▸ Глубже» и кода с деревом проекта, перед «Аналогией» про кухню ресторана |
| Ломаемое заблуждение | «Правки в ядре программы — нормально» и «стратегия существует в одном экземпляре, без версий». Ученик должен телом почувствовать: **всё, что лежит вне `user_data/`, исчезает при обновлении; всё, что внутри — переживает его; но переживёт ≠ сохранится с историей** |
| Длительность | 4–6 минут |
| Критерий освоения | Все 8 объектов разложены верно (максимум 2 подсказки), пройдена симуляция обновления, бонус-вопрос отвечен верно с первой или второй попытки |

### 1.2. Экран и состав

**Компоновка (desktop):** слева — «Стол» с 8 карточками-файлами (перемешаны случайно при каждом запуске); справа — дерево папок с зонами-приёмниками. Внизу — панель обратной связи и счётчик «Разложено N из 8».

**Дерево папок (зоны-приёмники):**

```
📁 freqtrade/                     ← ЯДРО ПРОГРАММЫ (зона-ловушка, серая, с замком)
   └─ strategy/interface.py
📁 user_data/                     ← корень (зона: сюда кладут config.json)
   ├─ 📁 strategies/
   ├─ 📁 data/
   │    └─ 📁 binance/
   ├─ 📁 backtest_results/
   ├─ 📁 hyperopt_results/
   ├─ 📁 notebooks/
   └─ 📁 logs/
```

Каждая папка при наведении показывает русскую подпись (из урока): `strategies` — «твои файлы стратегий (по одному классу на файл)»; `data/binance` — «скачанные свечи, раскладка по биржам; файлы не редактируем»; `backtest_results` — «отчёты прогонов с меткой времени»; `hyperopt_results` — «журнал оптимизаций»; `notebooks` — «исследовательские тетради»; `logs` — «логи dry-run и live»; `freqtrade/` — «ядро программы: обновляется целиком командой, твоего здесь нет».

**Карточки-файлы (8 штук):** каждая карточка — имя файла (англ., кликабельно), иконка типа, русская подпись мелким шрифтом.

```json
[
  {"id":"strategy","file":"MyStrategy.py","ru":"Моя стратегия (код с тремя populate-функциями)","target":"user_data/strategies","restorable":false,"git":true},
  {"id":"candles","file":"BTC_USDT-1h.feather","ru":"Скачанные часовые свечи биткоина","target":"user_data/data/binance","restorable":true,"git":false,"restore_cmd":"freqtrade download-data"},
  {"id":"config","file":"config.json","ru":"Настройки бота (визард new-config)","target":"user_data","restorable":false,"git":true,"git_note":"под git — только без ключей биржи"},
  {"id":"bt_report","file":"backtest-result-2025-06-01_12-00-00.zip","ru":"Отчёт одного прогона бэктеста","target":"user_data/backtest_results","restorable":true,"git":false,"restore_cmd":"freqtrade backtesting"},
  {"id":"notebook","file":"research_ema_rsi.ipynb","ru":"Исследовательская тетрадь с графиками","target":"user_data/notebooks","restorable":false,"git":true},
  {"id":"log","file":"freqtrade.log","ru":"Журнал работы бота","target":"user_data/logs","restorable":true,"git":false,"restore_cmd":"появится сам при следующем запуске"},
  {"id":"hyperopt","file":"strategy_MyStrategy_2025-06-02.fthypt","ru":"Журнал оптимизации параметров","target":"user_data/hyperopt_results","restorable":true,"git":false,"restore_cmd":"freqtrade hyperopt"},
  {"id":"core_patch","file":"interface.py (мой исправленный)","ru":"Файл ядра, куда Алексей вписал свою правку стоп-лосса","target":"__none__","restorable":false,"git":false,"trap":true}
]
```

### 1.3. Механика — три фазы

**Фаза 1. Раскладка (ИГР)**

1. Ученик перетаскивает карточку в папку. Приёмник подсвечивается при наведении.
2. Верно → карточка «встаёт» в дерево, зелёная вспышка, короткая подпись: «`data/binance/` — свечи живут здесь. Их нельзя править, зато можно перекачать командой».
3. Неверно → карточка возвращается на стол с мягкой тряской, панель показывает **почему именно эта папка не годится**, а не просто «нет». Тексты неверных размещений — таблица ниже. После 2-й ошибки по одному объекту появляется подсказка: подсвечивается правильная папка пунктиром (это считается «подсказкой», не ошибкой №3).
4. Особые случаи:
   - **`MyStrategy.py` → `freqtrade/strategy/`**: карточка *принимается* (!), зона-ловушка мигает жёлтым: «Бот её даже найдёт… пока. Продолжай — увидишь в фазе 2». Это намеренно: заблуждение ломается через последствие, а не через запрет.
   - **`interface.py (мой исправленный)`** — правильный ответ: перетащить в специальную корзину **«❌ Не класть никуда — переписать как свою стратегию»**, которая появляется внизу дерева. При попытке положить в `freqtrade/` — принимается (ловушка); при попытке положить в `user_data/strategies/` — отклоняется: «Это файл ядра, а не стратегия. Твоя правка стоп-лосса переносится в свой класс: `stoploss = -0.10` или `custom_stoploss()` в `user_data/strategies/MyStrategy.py`. Ядро не трогаем».
   - **`config.json` → `strategies/`**: «Конфиг — не стратегия. Freqtrade ищет его там, куда указал `--config`; стандарт урока: `user_data/config.json`».

Таблица типовых неверных размещений (агент реализует как словарь `wrong_feedback[item][folder]`; для незаданных пар — общий текст «Это папка для … (русская подпись). Спроси себя: этот файл — код, данные, результат или заметки?»):

| Файл | Папка | Текст обратной связи |
|---|---|---|
| `.feather` | `strategies/` | «Свечи — сырьё, а не код. В `strategies/` бот попытается загрузить их как стратегию и выдаст ошибку» |
| `.feather` | `backtest_results/` | «Это входные данные, а не результат. Бэктест их отсюда не найдёт и скажет: “No data found”» |
| `.zip`-отчёт | `data/` | «Отчёт — результат прогона, а не данные для прогона. Через месяц ты сам не отличишь, что здесь сырьё» |
| `.ipynb` | `strategies/` | «Тетрадь — для исследования. Бот попытается импортировать её как стратегию — и упадёт. Правило 4.1: исследование отдельно от боевой логики» |
| `.log` | любая, кроме `logs/` | «Логи пишутся автоматически в `logs/`. Положишь в другое место — бот всё равно создаст свой, и у тебя будет два» |
| `.fthypt` | `backtest_results/` | «Похоже, но нет: это журнал оптимизации, у него своя папка — иначе `hyperopt-show` его не увидит» |
| любой | `freqtrade/` (кроме ловушек) | Принимается с жёлтым предупреждением «Положено в ядро. Запомни это место» |

**Фаза 2. Симуляция обновления (СИМ)** — открывается, когда все 8 карточек размещены.

1. Появляется большая кнопка: **«Обновить Freqtrade»** с мини-терминалом (стиль E1, но статический): `pip install -U freqtrade` → строки `Downloading freqtrade-2026.x…`, `Installing…`, `Successfully installed`. Каждая строка при клике переводится.
2. Анимация: папка `freqtrade/` мерцает и **перезаписывается** (старая уезжает влево, новая приезжает справа, ~1,5 с). Папка `user_data/` не двигается, вокруг неё появляется зелёный контур «не тронута».
3. Всё, что ученик положил в `freqtrade/`, исчезает с анимацией растворения и звуком/вибрацией (если разрешено). Для каждого исчезнувшего — красная плашка:
   - `MyStrategy.py`: «Стратегия удалена вместе со старым ядром. Месяц работы — в ноль. Именно поэтому своё лежит только в `user_data/strategies/`».
   - `interface.py (исправленный)`: «Твоя правка ядра затёрта новой версией. Правки ядра не переживают ни одного обновления — их переносят в свой класс стратегии».
4. Если в ядро ничего не положено — вместо потерь показывается плашка: «Обновление прошло: ядро новое, всё твоё на месте. Так и должно быть — проверь, что ты понял почему» и переход к вопросу.
5. После анимации — **вопрос симуляции** (одиночный выбор): «Обновление затёрло папку `freqtrade/`. Что осталось у Алексея?» Варианты: (а) только config.json; (б) всё содержимое `user_data/`; (в) всё, кроме скачанных свечей; (г) ничего, нужно заново качать. Верный — (б). Объяснение: строка из урока «Ядро программы отделено от пользовательских данных: обновление не затирает твои стратегии и результаты».

**Фаза 3. Бонус: «Что нельзя восстановить командой?» (РИТ-вопрос про git)**

Второе заблуждение — «стратегия в одном экземпляре». Показываются те же 7 карточек (без ловушки) и две корзины:
- **«Под git — восстановить нельзя»**
- **«Не хранить — восстанавливается командой»**

Правильное разбиение по полю `restorable` из JSON: под git — `MyStrategy.py`, `config.json`, `research_ema_rsi.ipynb`; восстанавливается — свечи (`download-data`), отчёт (`backtesting`), лог (создаётся сам), hyperopt (`hyperopt`). При наведении на корзину «восстанавливается» показывается команда восстановления `restore_cmd` — русская подпись «одна команда — и файл снова есть».

Особая обратная связь для `config.json` в корзине «под git»: всплывает предупреждение «Верно — но **без ключей биржи**. Ключи в git = инцидент (урок 4.3). В учебном конфиге поля `key`/`secret` пустые — так и оставляй». Это мост к FT-04.

Итоговый экран: правило урока крупно — «**Всё, что можно восстановить командой, — можно не хранить. Всё, что нельзя (стратегии, правки, журнал экспериментов), — сразу под git**». Ниже — «Ты сегодня потерял бы: … / сохранил бы: …» по фактическим действиям ученика в фазе 1–2.

### 1.4. Подсчёт и обратная связь

- Очки: верное размещение с 1-й попытки — 2, со 2-й — 1, после подсказки — 0. Ловушки: правильно отправить `interface.py` в корзину — 3 очка; положить в ядро — 0 очков, но не блок (урок наступает в фазе 2). Бонус-фаза: по 1 очку за карточку.
- Максимум 25. Итог показывается **не как оценка**, а как «Разложено верно: N/8 · Потеряно при обновлении: файлов X · Под git отправлено верно: M/7».
- Никаких «провалов»: любая траектория ведёт к концу; заблуждение ломается последствием.

### 1.5. Языковой слой (обязательный)

Глоссарий токенов интерактива (клик по любому → карточка). Агент подключает к общему словарю приложения; если токен уже есть в словаре — переиспользовать.

| Токен | Русская карточка |
|---|---|
| `user_data` | Каталог пользовательских данных: всё, что создаёшь ты. Ядро его не трогает |
| `strategies` | Стратегии — файлы .py с твоей логикой входа/выхода |
| `data` | Данные — скачанные свечи; только читаем |
| `backtest_results` | Результаты бэктестов — отчёты прогонов по истории |
| `hyperopt_results` | Результаты оптимизации параметров |
| `notebooks` | Исследовательские тетради (Jupyter): графики, черновики |
| `logs` | Журнал работы бота |
| `.feather` | Формат файла со свечами: быстрый, бинарный, не для ручного редактирования |
| `.ipynb` | Файл тетради Jupyter |
| `.fthypt` | Файл результатов hyperopt |
| `.py` | Файл кода на Python |
| `pip install -U` | Команда обновления пакета до новой версии |
| `interface.py` | Файл ядра Freqtrade, описывающий контракт стратегии — не редактируется |
| `git` | Система хранения версий файлов: можно вернуться к любой прошлой правке |
| `config.json` | Файл настроек бота (биржа, пары, размер ставки, режим песочницы) |

### 1.6. Телеметрия

События: `ft03_start`, `ft03_place {item, folder, correct, attempt_n}`, `ft03_hint_shown {item}`, `ft03_core_trap {item}` (положил в ядро), `ft03_update_run {lost_items[]}`, `ft03_update_question {correct}`, `ft03_git_sort {item, bin, correct}`, `ft03_complete {score, duration_s, attempt_number}`.

### 1.7. Приёмочные критерии

1. 8 карточек перемешиваются при каждом запуске; повторный запуск не показывает подсказки заранее.
2. Размещение `MyStrategy.py` в `freqtrade/strategy/` **принимается** и приводит к исчезновению файла в фазе 2 с соответствующей плашкой.
3. `interface.py (исправленный)` не принимается в `user_data/strategies/`; принимается в корзину «не класть никуда» и в `freqtrade/` (ловушка).
4. Если ничего не положено в ядро, фаза 2 показывает «ничего не потеряно» и вопрос.
5. В бонус-фазе `config.json` в корзине «под git» выдаёт предупреждение о ключах.
6. Каждый английский токен на экране открывает русскую карточку.
7. На ширине 360 px все действия выполнимы тапами; порядок «объект → цель» подсказан текстом «Выбери файл, затем папку».
8. Состояние восстанавливается после перезагрузки страницы.

---

## 2. FT-04 · «Конфиг с 5 минами»

### 2.1. Паспорт

| Поле | Содержание |
|---|---|
| ID | `ft04_config_minesweeper` |
| Тип | ИГР (поиск ошибок с таймером и счётом) + СИМ на движке **E2 «Живой конфиг»** (фаза разминирования) |
| Урок | 204 · FT-04 «Конфигурация: что задаётся программой, стратегией и командой» |
| Место в уроке | Сразу после блока «Практика» («…попроси агента сгенерировать конфиг-заглушку №2 с 5 ошибками, а сам найди их глазами») — интерактив и есть эта заглушка, чтобы ученик не зависел от агента |
| Ломаемое заблуждение | «Настроил визардом — значит правильно». Конфиг, который *запускается*, может быть боевым, неисполнимым или дырявым; глазами проверяют пять мест до каждого запуска |
| Длительность | 5–8 минут |
| Критерий освоения | Найдены все 5 мин; ложных тревог ≤ 2; в фазе 2 панель риска стала зелёной по всем трём показателям |

### 2.2. Экран

**Левая панель (60%)** — конфиг Алексея в виде JSON с номерами строк, моноширинный шрифт, подсветка синтаксиса. Каждый **ключ** кликабелен для карточки «Ткни в непонятное»; каждая **строка** имеет чекбокс-флажок 🚩 слева (кликабельная зона — вся строка). Секции сворачиваемы, но по умолчанию раскрыты.

**Правая панель (40%)** — три блока:
1. **Шапка**: «Алексей · баланс на счёте: **1000 USDT** · стратегия: стоп −10%, таймфрейм 1h» (данные из FT-04/FT-05 — нужны для расчётов).
2. **Живой расчёт (E2)** — пересчитывается мгновенно при любом изменении конфига:
   - Режим: 🟢 **Песочница** / 🔴 **РЕАЛЬНЫЕ ДЕНЬГИ** (по `dry_run`)
   - USDT на одну сделку (по `stake_amount`: число → само число; `unlimited` → баланс × `tradable_balance_ratio` / `max_open_trades`, округление до целого)
   - Риск на сделку = USDT на сделку × 10% ; в % депозита; норма ≤ 2% (зелёный), 2–3% жёлтый, > 3% красный. Если USDT на сделку > баланс → надпись «сделка не откроется: не хватает средств»
   - Суммарный одновременный риск = риск на сделку × `max_open_trades`; норма ≤ 6%
   - Пары под угрозой: список пар из `whitelist`, которые не отсекает `blacklist` и которые входят в справочник «опасных» (leveraged `UP/DOWN`, стейбл-к-стейблу)
   - Срок жизни заявки на вход vs длина свечи: «600 мин = 10 свечей 1h — сигнал устареет» / «10 мин ≤ 1 свечи — ок»
3. **Счёт и таймер**: мягкий обратный отсчёт 3:00; истечение времени **не завершает** игру — просто исчезает бонус за время. Кнопка «Проверить» становится активной, когда поставлен хотя бы 1 флажок.

**Мобильная версия**: панели вертикально; расчёт закреплён внизу сжатой строкой «🟢 песочница · 330 $/сделка · риск 3,3 % · ⚠ 2 пары», раскрывается тапом.

### 2.3. Конфиг-заглушка №2 (данные)

```json
{
  "bot_name": "sandbox_02",
  "dry_run": false,
  "dry_run_wallet": 1000,
  "max_open_trades": 3,
  "stake_currency": "USDT",
  "stake_amount": 1500,
  "tradable_balance_ratio": 0.99,
  "fiat_display_currency": "USD",
  "unfilledtimeout": {
    "entry": 600,
    "exit": 600,
    "unit": "minutes"
  },
  "exchange": {
    "name": "binance",
    "key": "",
    "secret": "",
    "pair_whitelist": ["BTC/USDT", "ETH/USDT", "BTCUP/USDT", "SOL/USDT"],
    "pair_blacklist": []
  },
  "pairlists": [{"method": "StaticPairList"}],
  "entry_pricing": {"use_order_book": true, "order_book_top": 1},
  "exit_pricing":  {"use_order_book": true, "order_book_top": 1}
}
```

**Пять мин** (агент хранит как массив с id, номером строки, категорией, текстом объяснения, вариантами исправления):

| № | Строка | Мина | Почему опасно (текст обратной связи) | Варианты «разминирования» в фазе 2 |
|---|---|---|---|---|
| M1 | `"dry_run": false` | Боевой режим | «Один флаг — граница между песочницей и деньгами. Визард сам это не проверит. В обучении всегда `true`, и проверяется **глазами перед каждым запуском** (урок FT-02: “перед выстрелом проверь, заряжено ли”)» | Переключатель true/false |
| M2 | `"stake_amount": 1500` | Ставка больше баланса | «На счёте 1000, а на сделку заложено 1500. Freqtrade не сможет открыть ни одной позиции — бот будет молчать, а ты решишь, что сигналов нет. И арифметика риска: 1500 × 10 % стопа = 150 USDT = 15 % депозита на одну сделку против правила 1–2 %» | Поле числа + кнопка `unlimited`; панель показывает результат |
| M3 | `"BTCUP/USDT"` в whitelist | Leveraged-токен | «`BTCUP` — не биткоин, а токен с плечом: он тает при боковике и ведёт себя не как спот. В белом списке ему не место, а чёрный список должен отсекать такие по маске» | Удалить из списка (крестик) |
| M4 | `"entry": 600` (и `"exit": 600`) | Таймаут заявки 10 часов | «Лимитная заявка на вход будет ждать 600 минут = 10 свечей на таймфрейме 1h. Сигнал был по одной свече, а исполнение может случиться через полдня — уже в другом рынке. Для 1h-стратегии таймаут на вход — не длиннее свечи (10–30 минут); бэктест и живая торговля разъедутся» | Ползунок 1–600 мин с отметкой длины свечи |
| M5 | `"pair_blacklist": []` | Пустой чёрный список | «Чёрный список — фильтр, который работает даже когда ты забыл про белый. Пустой список пропустит стейбл-пары и leveraged-токены при первом же переходе на динамический отбор пар. Минимум из урока: `".*/USDC"`, `".*UP/USDT"`, `".*DOWN/USDT"`» | Чипы масок, добавляемые кликом |

Флажки на `"entry"` и `"exit"` считаются одной миной M4 (любой из них засчитывает; второй не даёт очков и не считается ложной тревогой).

**Приманки** (строки, которые новичок примет за ошибку; флаг на них = ложная тревога с обучающим объяснением, а не с насмешкой):

| Строка | Объяснение при ложной тревоге |
|---|---|
| `"key": ""`, `"secret": ""` | «Пусто — и правильно. Для песочницы ключи не нужны; заполненные ключи в учебном конфиге были бы ошибкой (FT-19, 4.3)» |
| `"tradable_balance_ratio": 0.99` | «Норма: 1 % баланса остаётся резервом на комиссии» |
| `"max_open_trades": 3` | «Норма для старта: 2–3 слота. Мина была бы при 20» |
| `"pairlists": StaticPairList` | «Для обучения — правильный выбор: список фиксирован, нет survivorship-смещения» |
| `"order_book_top": 1` | «Цена лимитки берётся с первого уровня стакана — стандарт» |
| `"dry_run_wallet": 1000` | «Размер виртуального кошелька — совпадает с депозитом Алексея» |

### 2.4. Механика — две фазы

**Фаза 1. Поиск мин (ИГР)**

1. Старт: 3-секундный экран «Алексей собрал конфиг визардом и хочет запустить бота. В нём 5 мин. Найди их до запуска». Кнопка «Начать» запускает таймер.
2. Ученик ставит флажки на подозрительные строки. Флажок сразу требует **выбрать причину** из выпадающего списка (6 вариантов, одинаковых для всех строк): «боевой режим вместо песочницы», «размер сделки не соответствует балансу», «опасная пара в списке», «заявка живёт слишком долго», «нет защитного фильтра пар», «ключи/секреты». Это заставляет назвать факт словами (принцип П1), а не тыкать наугад.
3. Флажок с верной строкой **и** верной причиной → строка становится красной с иконкой 💣, панель показывает объяснение мины, +20 очков; счётчик «Мин найдено: N/5».
4. Верная строка, неверная причина → строка жёлтая «Здесь действительно мина, но причина другая. Подумай, что именно сломается» — очки +10, можно сменить причину.
5. Ложная тревога → строка серая с пометкой «ложная тревога», −5 очков, объяснение из таблицы приманок. Ложные тревоги на приманках учитываются в телеметрии отдельно (это диагностика конкретных заблуждений).
6. Кнопка **«Проверить»** — досрочное завершение: показывает ненайденные мины с объяснениями (по 0 очков) и переходит к фазе 2. Если найдено 5/5 — переход автоматический с бонусом за оставшееся время (+1 очко за каждые 10 с, максимум +18).
7. Подсказки: после 90 с без нового флажка — мигает секция, в которой есть ненайденная мина (не строка). Подсказка снимает бонус за время.

**Фаза 2. Разминирование (СИМ на E2)**

1. Флажки исчезают, у каждой мины появляется элемент управления из таблицы (переключатель, поле, ползунок, чипы). Ученик правит значения; **правая панель пересчитывается мгновенно**.
2. Цель — три зелёных индикатора: режим «Песочница», риск на сделку ≤ 2 %, суммарный риск ≤ 6 %, плюс «пар под угрозой: 0» и «таймаут ≤ длины свечи».
3. Для M2 обязательный мини-эксперимент: кнопка `unlimited` показывает расчёт «(1000 × 0,99) / 3 ≈ 330 USDT на сделку → риск 33 USDT = 3,3 % — жёлтая зона». Панель добавляет подсказку: «`unlimited` удобно для песочницы, но правилу 1–2 % не соответствует. Введи число сам». Ввод 150 → «15 USDT = 1,5 % — зелёная зона» (это числа урока FT-17). Так интерактив одновременно закрывает «Проверь себя» урока (297–300 при балансе 900) и мост к сайзингу.
4. Для M5 при добавлении чипа `".*UP/USDT"` строка `BTCUP/USDT` в whitelist автоматически зачёркивается с подписью «отсечено чёрным списком» — ученик видит, что фильтр работает независимо от белого списка (даже если M3 ещё не исправлена).
5. Кнопка **«Запустить бота»** активна только при всех зелёных. По нажатию — статический терминал (стиль E1): `freqtrade trade -c user_data/config.json --strategy TutorialEmaRsi` → `Dry run is enabled` (кликабельно: «Песочница включена») → `Using max_open_trades: 3` → `Wallet: 1000 USDT`. Финальная плашка: «Конфиг разминирован. Правило: **пять мест глазами перед каждым запуском** — dry_run · stake · слоты · белый список · чёрный список».

### 2.5. Уровень 2 (для повторного прохождения)

Активируется кнопкой «Ещё раз, сложнее» после первого завершения; нужен для метрики «−50 % ошибок ко второй попытке». Другой конфиг, **7 мин**, таймер 4:00, без подсказок по секциям:

- `dry_run: false` (повтор — проверяем, закрепилось ли)
- `max_open_trades: 20`
- `stake_amount: "unlimited"` при 20 слотах → «50 USDT на слот: капитал размазан, комиссии съедят»
- `order_types` везде `market` («переплата taker-комиссии — 0,1 % против 0,075 % maker при каждом входе»)
- `"key": "AbC123…"` заполненный ключ в учебном конфиге («ключ в файле на диске = инцидент; для прода — переменные окружения `FREQTRADE__EXCHANGE__KEY`»)
- `pair_whitelist` с `"USDC/USDT"` (стейбл-к-стейблу — нулевая волатильность, комиссия больше движения)
- `unfilledtimeout.entry: 1` («1 минута — почти все лимитки отменятся; бот будет пропускать сигналы»)

Приманки уровня 2: `"fiat_display_currency": "RUB"`, `"tradable_balance_ratio": 0.95`, `VolumePairList` с фильтрами `PriceFilter`/`SpreadFilter 0.005`/`AgeFilter` (это норма для второго этапа — объяснить).

### 2.6. Подсчёт

| Событие | Очки |
|---|---|
| Мина найдена, причина верна | +20 |
| Мина найдена, причина неверна | +10 (+10 при исправлении причины) |
| Ложная тревога | −5 (не ниже 0 суммарно) |
| Бонус времени | +1 за 10 с остатка (макс. +18), обнуляется подсказкой |
| Фаза 2: все индикаторы зелёные | +20 |
| Фаза 2: `unlimited` попробован и заменён числом | +5 |

Итог показывается словами: «Найдено мин: 5/5 · Ложных тревог: 1 · Риск после разминирования: 1,5 % на сделку, 4,5 % суммарно». Числовой счёт — вторичен, мелким шрифтом.

### 2.7. Языковой слой (обязательный)

Карточки для всех ключей конфига (агент добавляет в общий словарь; текст — из урока FT-04):

| Ключ | Карточка |
|---|---|
| `dry_run` | Песочница: `true` — виртуальный кошелёк и реальные цены, ордера на биржу не уходят; `false` — реальные деньги |
| `dry_run_wallet` | Размер виртуального кошелька в песочнице |
| `max_open_trades` | Сколько сделок может быть открыто одновременно (слотов) |
| `stake_currency` | Валюта ставки — за что покупаем (USDT) |
| `stake_amount` | Сколько USDT кладём в одну сделку; `unlimited` — делит доступный баланс на число слотов |
| `tradable_balance_ratio` | Какая доля баланса доступна боту; остаток — резерв на комиссии |
| `fiat_display_currency` | В какой валюте показывать итоги в отчётах (только отображение) |
| `unfilledtimeout` | Срок жизни неисполненной лимитной заявки; после него заявка отменяется. `entry` — на вход, `exit` — на выход, `unit` — единица (минуты) |
| `exchange.name` | Имя биржи, к которой подключается бот |
| `key` / `secret` | Ключ и секрет API биржи. Для песочницы не нужны; в файле на диске хранить нельзя |
| `pair_whitelist` | Белый список: какие пары бот может торговать |
| `pair_blacklist` | Чёрный список: пары, которые бот никогда не возьмёт, даже если попадут в белый; поддерживает маски `.*UP/USDT` |
| `pairlists` / `StaticPairList` | Способ отбора пар; `StaticPairList` — фиксированный список вручную |
| `entry_pricing` / `exit_pricing` | Как бот выбирает цену лимитной заявки на вход/выход |
| `use_order_book` | Брать цену из стакана заявок |
| `order_book_top` | С какого уровня стакана брать цену (1 = лучшая цена) |
| `BTCUP` | Leveraged-токен: искусственная бумага с плечом на биткоин, тает в боковике |
| `.*UP/USDT` | Маска: любая пара, имя которой заканчивается на UP, к USDT |
| `taker` / `maker` | Комиссия за рыночную заявку (забирает ликвидность) / за лимитную (добавляет); maker дешевле |

### 2.8. Телеметрия

`ft04_start {level}`, `ft04_flag {line_key, reason, verdict: mine_ok|mine_wrong_reason|false_alarm, t_since_start}`, `ft04_hint_section {section}`, `ft04_phase1_done {found, false_alarms, time_left}`, `ft04_defuse {mine_id, new_value, risk_per_trade_pct, total_risk_pct}`, `ft04_unlimited_tried {slot_value}`, `ft04_launch {all_green}`, `ft04_complete {level, score, duration_s, attempt_number}`.

Отдельно агрегировать: доля учеников, флагнувших `"key": ""` как мину (индикатор, что урок 4.3 не перенесён), и доля не нашедших M5 (пустой blacklist — самая «невидимая» мина).

### 2.9. Приёмочные критерии

1. Флажок нельзя поставить без выбора причины; причину можно сменить.
2. Флаг на `entry` и на `exit` засчитывает одну мину M4, второй не штрафуется.
3. Ложная тревога на любой приманке показывает соответствующее объяснение, не общий текст.
4. Правая панель пересчитывается при каждом изменении в фазе 2 без нажатия кнопок; `unlimited` при балансе 1000, ratio 0,99, 3 слотах даёт 330; при 900/3 — 297.
5. Кнопка «Запустить бота» заблокирована, пока хотя бы один индикатор не зелёный; блокировка объясняется текстом «Не зелёно: …».
6. Истечение таймера не завершает фазу 1 и не скрывает конфиг.
7. Добавление чипа `.*UP/USDT` визуально отсекает `BTCUP/USDT` в белом списке.
8. Уровень 2 недоступен до завершения уровня 1; конфиг уровня 2 не совпадает с уровнем 1.
9. Все ключи JSON кликабельны и открывают русские карточки; в режиме «скрыть английский» справа от каждой строки показывается русская подпись ключа.
10. На 360 px строки конфига не переносятся так, чтобы флажок отрывался от значения (горизонтальная прокрутка внутри блока кода допускается).

---

## 3. Общие компоненты для переиспользования (для агента)

| Компонент | Используется в | Требования |
|---|---|---|
| `TokenTooltip` | оба | Обёртка над любым англ. токеном: клик/фокус → карточка (рус. название, 1 фраза, ссылка «термин урока»); словарь — общий JSON приложения, интерактив только добавляет свои записи |
| `FolderTree` | FT-03 (позже FT-08, FT-19) | Дерево с зонами-приёмниками, состояниями normal/hover/locked/flash-ok/flash-err, поддержка тап-режима |
| `DragCard` | FT-03 (позже FT-01, FT-06, FAI-02) | Карточка с drag&drop + fallback «выбрать → назначить» |
| `FakeTerminal` | оба (мини-версия E1) | Статический вывод построчно с задержкой 150 мс, каждая строка — `TokenTooltip` |
| `LiveConfigPanel` | FT-04 (ядро E2; позже FT-17, FT-18, 5.6) | Вход: объект конфига + параметры стратегии (stoploss, timeframe, баланс) → выход: режим, USDT/слот, риск/сделку, суммарный риск, список опасных пар, оценка таймаута. Чистая функция + отображение, пороги задаются пропсами |
| `ScoreStrip` | оба | Очки, счётчики «N из M», мягкий таймер; текстовая сводка важнее числа |

**Формулы `LiveConfigPanel`** (единственный источник истины для расчётов):

```
slot_usdt   = stake_amount == "unlimited"
              ? floor(balance * tradable_balance_ratio / max_open_trades)
              : stake_amount
feasible    = slot_usdt <= balance * tradable_balance_ratio
risk_trade  = slot_usdt * |stoploss|                 // stoploss = 0.10
risk_pct    = risk_trade / balance * 100
total_pct   = risk_pct * max_open_trades
zone(risk_pct):  ≤2 → green, ≤3 → yellow, иначе red
zone(total_pct): ≤6 → green, ≤9 → yellow, иначе red
timeout_ok  = unfilledtimeout.entry (в минутах) <= timeframe_minutes  // 60 для 1h
dangerous_pairs = whitelist.filter(p => matchesAny(p, DANGER_MASKS) && !matchesAny(p, blacklist))
DANGER_MASKS = [".*UP/USDT", ".*DOWN/USDT", ".*/USDC", "USDC/.*", ".*BULL/.*", ".*BEAR/.*"]
```

Оба интерактива не имеют состояния «провал»: любая траектория заканчивается объяснением. Заблуждение ломается последствием (файл исчез при обновлении; бот в боевом режиме с невозможной ставкой), а не запретом.

--------------

# Детальные спецификации для реализации: FT-07 и FT-08

Ниже — два самостоятельных технических задания. Каждое содержит: педагогическую цель, структуру экранов, механику, данные, тексты обратной связи, критерии освоения, зависимости от движков, критерии приёмки. Общие соглашения — в разделе 0.

---

## 0. Общие соглашения для обоих интерактивов

### 0.1. Аудитория и язык
- Ученик — русскоязычный новичок без английского. **Каждый английский токен** на экране (`DataFrame`, `shift`, `rolling`, `feather`, `PASS`, `exit code`…) обязан быть обёрнут в компонент `<Term>` из языкового слоя: клик/тап → русская карточка (одна фраза «что это» + одна фраза «зачем здесь» + ссылка на урок, где термин введён впервые).
- Глобальный переключатель в шапке интерактива: **«англ. / рус. подписи / оба»**. В режиме «рус.» имена переменных и команд остаются, но справа от каждой строки кода/терминала появляется русская подпись.
- Тон текстов — как в уроках: на «ты», короткие фразы, без канцелярита.

### 0.2. Сквозной персонаж
Все сценарные фразы — от лица Алексея (депозит 1000 $ в dry-run, стратегия `TutorialEmaRsi` из FT-05). Не вводить новых персонажей.

### 0.3. Зависимости от движков
| Движок | Используется в | Контракт (что должен предоставить движок) |
|---|---|---|
| **E1 «Терминал-переводчик»** | FT-08 (экран 2) | `<Terminal lines=[{text, ru, termIds[], level:"info"|"warn"|"fail"|"pass"}] hideEnglish={bool} />` — каждая строка кликабельна, подсветка по уровню, режим «скрыть английский» |
| **E6 «Охотник за утечкой»** | FT-07 (акт 3) | `<LeakHunter cases=[{id, code[], verdict, culpritLine, culpritToken, explainRu, fixCode[]}] onResult />` — предъявляет фрагмент, принимает вердикт + клик по строке/токену, показывает объяснение |
| **E4 «Ритуал»** (опц.) | FT-08 (экран 4) | `Ritual.attach(id:"pre-backtest-data-check")` — добавить ритуал в список ученика |
| **Языковой слой** | оба | `<Term id>`; словарь пополняется терминами из таблиц 1.9 и 2.9 |

Если движок ещё не собран — реализовать локальную заглушку с **тем же интерфейсом**, чтобы позже заменить без правок интерактива.

### 0.4. Технические рамки
- Клиентское веб-приложение (без бэкенда), детерминированная генерация данных по `seed` (для воспроизводимости и повторного прохождения с другим seed).
- Состояние интерактива — конечный автомат; прогресс сохраняется в `localStorage` под ключом `interactive:<ID>:<userId>`.
- Мобильный режим: горизонтальный скролл ленты, крупные тап-мишени (≥ 44 px), все действия доступны без hover.
- Производительность: генерация 500 свечей и все расчёты < 50 мс; анимации через `requestAnimationFrame`, отключаемы (`prefers-reduced-motion`).
- Аналитика: события `start`, `screen_enter`, `answer`, `hint_used`, `complete` с payload (см. в каждой спеке).

---

## 1. FT-07 · «Конвейер против рабочего»

### 1.1. Паспорт
| Поле | Значение |
|---|---|
| Урок | 207 · FT-07 «DataFrame и векторизация» (14 мин) |
| Тип | СИМ + АНИМ + ИГР (на движке E6) |
| Ломает заблуждение | **«Цикл понятнее и честнее»** — новичок после Py-06 доверяет `for` больше, чем непонятной «магии» столбцов |
| Место в уроке | После блока «▸ Подробнее» и до «Аналогия: Векторизация — конвейер…» (аналогия становится подписью к акту 1) |
| Опирается на | Py-05 (списки/индексы), Py-06 (цикл for), 1.6 (кассир vs сканер, числа 18,5 с / 3,2 мс), 1.7 (шесть источников утечки), FT-05 (контракт стратегии) |
| Готовит к | FT-11 (`lookahead-analysis`), FT-13 |
| Длительность | 8–11 минут: акт 1 — 2 мин, акт 2 — 3 мин, акт 3 — 4–6 мин |
| Критерий освоения | Акт 3: ≥ 10 из 12 карточек с верным вердиктом **и** верно указанным виновником для утечек |

### 1.2. Цели обучения (проверяемые)
После интерактива ученик:
1. Объясняет своими словами, чем векторная операция над столбцом отличается от цикла по строкам (акт 1).
2. Называет реальный порядок разницы во времени (в тысячи раз на большой истории) и понимает, что это не главная причина запрета циклов (акт 1 → акт 2).
3. Показывает пальцем, **где именно** цикл «подсматривает» в `i+1`, и видит фантомную прибыль от этого (акт 2).
4. Знает, что векторность сама по себе не спасает: `shift(-1)`, `bfill`, `center=True`, агрегат по всей истории — утечки и в векторном коде (акт 2, врезка).
5. Классифицирует 12 фрагментов кода на «честно / честно, но медленно / утечка» и указывает строку-виновника (акт 3).

### 1.3. Структура: три акта на одном экране (вкладки сверху, переключение только вперёд после завершения текущего акта; назад — свободно)

```
[ 1. Две линии ] → [ 2. Подсмотрел в i+1 ] → [ 3. Охотник за утечкой ]
```

---

### 1.4. Акт 1 — СИМ/АНИМ «Две линии»

**Цель акта:** увидеть механику. Никаких вопросов, только наблюдение и один ползунок.

**Раскладка (десктоп):**
```
┌──────────────────────────────┬──────────────────────────────┐
│  КОНВЕЙЕР (векторный расчёт) │  РАБОЧИЙ (цикл for)          │
│  код: 3 строки               │  код: 3 строки               │
│  таблица свечей N×5 колонок  │  таблица свечей N×5 колонок  │
│  ⏱ 0,000 с   [▶ Запустить]  │  ⏱ 0,000 с   [▶ Запустить]  │
└──────────────────────────────┴──────────────────────────────┘
  Число свечей: [30] [300] [3 000] [30 000] [1 000 000]   [▶▶ Запустить оба]
```
На мобильном панели идут одна под другой, кнопка «Запустить оба» закреплена снизу.

**Код в панелях (из урока, без изменений):**

Левая:
```python
df['ema_fast'] = df['close'].ewm(span=12).mean()
df['ema_slow'] = df['close'].ewm(span=26).mean()
df['enter_long'] = ((df['ema_fast'] > df['ema_slow']) & (df['volume'] > 0)).astype(int)
```
Правая (честный цикл, **без** утечки — утечка появится в акте 2):
```python
for i in range(1, len(df)):
    if df.ema_fast[i] > df.ema_slow[i] and df.volume[i] > 0:
        df.enter_long[i] = 1
```
Русские подписи справа (режим «рус. подписи»): «быстрая средняя по всему столбцу», «медленная средняя по всему столбцу», «сигнал = 1 там, где быстрая выше медленной и объём есть»; «для каждой свечи по очереди», «если у этой свечи быстрая выше медленной…», «…поставить сигнал этой свече».

**Таблица свечей:** колонки `date | close | ema_fast | ema_slow | volume | enter_long`. При N ≤ 300 показываются все строки (виртуальный скролл), при N > 300 — первые 20 + «… ещё N−40 …» + последние 20.

**Анимация «Конвейер» (по кнопке ▶):**
- Волна подсветки проходит по колонке `ema_fast` сверху вниз за фиксированные **400 мс** независимо от N (в этом и смысл), затем по `ema_slow`, затем `enter_long` заполняется целиком одной вспышкой. Итого ~1,2 с.
- Секундомер показывает **оценочное машинное время** (не время анимации), см. формулу ниже, с подписью «оценка по замеру из урока 1.6».

**Анимация «Рабочий» (по кнопке ▶):**
- Фигурка-курсор (иконка рабочего с коробкой) идёт по строкам: на каждой строке подсвечиваются три ячейки, затем заполняется `enter_long[i]`. Задержка на строку: N=30 → 120 мс (видно каждый шаг), N=300 → 12 мс, N ≥ 3 000 → анимация бежит 6 с и обрывается плашкой «…рабочий ещё несёт свечу № 4 217 из 30 000. Промотать до конца ▶▶».
- Секундомер — оценочное машинное время.

**Формула оценки (единая, из урока 1.6: 1 000 000 баров — цикл 18,5 с, вектор 3,2 мс):**
- `t_loop(N) = N × 18,5 мкс`
- `t_vec(N) = 0,25 мс + N × 3,0 нс` (фиксированный накладной расход + линейная часть; при N = 10⁶ даёт ≈ 3,2 мс)
- Отображать с адекватной единицей: мкс/мс/с; коэффициент ускорения `t_loop / t_vec` округлять до целого.

**Таблица под ползунком (обновляется при выборе N):**

| N свечей | ≈ сколько истории на 1h | Цикл | Вектор | Разница |
|---|---|---|---|---|
| 30 | сутки с хвостом | 0,6 мс | 0,25 мс | 2× |
| 300 | ~2 недели | 5,6 мс | 0,25 мс | 22× |
| 3 000 | ~4 месяца | 56 мс | 0,26 мс | 215× |
| 30 000 | ~3,5 года | 0,56 с | 0,34 мс | 1 600× |
| 1 000 000 | 2 года минутных свечей | 18,5 с | 3,2 мс | ~5 700× |

(последняя строка — прямые числа урока 1.6; таблица считается формулой, чтобы совпадать).

**Подпись-вывод под таблицей (появляется после запуска обоих на N ≥ 3 000):**
> «На 500 свечах разницу не заметишь. Hyperopt из FT-16 запускает бэктест сотни раз подряд — 200 прогонов × 18 секунд цикла = час ожидания вместо секунды. Но скорость — не главная причина. Главная — в следующем акте.»

**Кнопка перехода:** «Дальше: почему рабочий опасен →» активна после хотя бы одного запуска обеих панелей.

**Аналитика:** `screen_enter{act:1}`, `run{panel, N}`, `act_complete{act:1, runs}`.

---

### 1.5. Акт 2 — СИМ + мини-ИГР «Подсмотрел в i+1»

**Цель акта:** увидеть утечку глазами и её цену в деньгах; понять, что и векторный код умеет подсматривать.

**Шаг 2.1 — «Тот же рабочий, одна правка».**
Правая панель показывает цикл **из урока**:
```python
for i in range(len(df)-1):
    if df.close[i+1] > df.close[i]:
        df.enter_long[i] = 1
```
Подпись Алексея: «Я подумал: если следующая свеча выше — значит, надо было входить на этой. Логично же?»

Кнопка **[▶ Запустить рабочего]**. Анимация: рабочий стоит на строке `i`, **правая часть таблицы (строки i+1…N) затемнена штриховкой «будущее»**. На шаге проверки условия рабочий **поворачивает голову и тянет руку в затемнённую строку i+1** — строка вспыхивает красным, звук-щелчок (если звук включён), над рабочим бейдж «подсмотрел в i+1». Счётчик «подглядываний: 37 из 37 шагов».

**Шаг 2.2 — «Сколько это стоит».**
Под таблицей — два графика кривой капитала на **одних и тех же 300 свечах** (данные акта 1, seed общий):
- **синяя** «честно»: сигнал по `close[i] > ema_slow[i]`, исполнение по `open[i+1]`, комиссия 0,1 % за сторону (как в FT-05/FT-13);
- **красная** «телепат»: сигнал `close[i+1] > close[i]`, исполнение по `close[i]` — тот самый цикл.

Ожидаемая картинка на синтетическом случайном блуждании: красная — почти прямая вверх (+40…+80 % за 300 свечей), синяя — около нуля или в минусе после комиссий. Числа выводить фактические из расчёта, с подписью:
> «Красная кривая недостижима: чтобы её получить, боту нужно знать цену, которая появится через час. Это тот же Sharpe 9,8 из урока 1.7 — после исправления он превращается в −0,42.»

**Тумблер «Показать, что видел бот на свече i»** (аналог E3): при включении вся часть графика правее текущей свечи закрыта, и красная кривая пересчитывается «как в живой торговле» — она разваливается в шум. Тумблер можно двигать по ползунку `i`.

**Шаг 2.3 — «А вектор спасает?» (врезка-вопрос, один клик).**
Показать код:
```python
df['enter_long'] = (df['close'].shift(-1) > df['close']).astype(int)
```
Вопрос: «Это конвейер, циклов нет. Утечка есть?» — кнопки **[Нет, вектор честный] [Да, та же утечка]**.
- Верно «Да»: «Правильно. `shift(-1)` — это та же рука в будущую строку, только одним движением по всему столбцу. Векторность спасает от медленности, а не от подглядывания. Правило одно: **правая часть выражения использует только прошлое.**»
- Неверно: то же объяснение + мини-анимация: столбец `shift(-1)` рисуется как весь столбец `close`, сдвинутый **вверх** на одну строку — каждая строка получила значение из строки ниже (из будущего).

**Три правила (карточка-итог акта 2, остаётся закреплённой в акте 3):**
1. Смотри назад: `shift(1)`, `rolling(n)` — можно. `shift(-1)`, `center=True`, `bfill` — нельзя.
2. Статистика по всей истории (`.mean()`, `.std()`, `.max()`, `.rank(pct=True)` по столбцу) — знает будущее. Заменяй на `rolling(n).…`.
3. Цикл не запрещён законом — он запрещён привычкой: в нём слишком легко написать `i+1`. И он медленный.

**Кнопка:** «Дальше: поймай утечки сам →».

**Аналитика:** `leak_demo_run`, `future_toggle{i}`, `answer{q:"vector_shift", correct}`.

---

### 1.6. Акт 3 — ИГР «Охотник за утечкой: правая часть» (движок E6)

**Механика раунда:**
1. Предъявляется карточка с фрагментом кода (1–4 строки) и одной строкой контекста («в `populate_indicators`» / «в `populate_entry_trend`»).
2. Ученик выбирает вердикт из трёх кнопок:
   - 🟢 **Честно** (вектор, только прошлое)
   - 🟡 **Честно, но медленно** (цикл, смотрит назад — работать будет, но так не пишем)
   - 🔴 **Утечка** (знает будущее)
3. Если выбрал 🔴 — обязан **кликнуть строку** (в 4-строчных фрагментах) и **токен-виновник** (подсветка кандидатов при наведении). Без клика ответ не засчитывается.
4. Обратная связь: вердикт верно/неверно; объяснение на 1–2 фразы; блок **«Как починить»** с исправленным кодом (для 🔴 и 🟡); для 🔴 — мини-строка «Что бы случилось в live: …».
5. Всего 12 карточек, порядок перемешан по seed; первые 3 — гарантированно по одной каждого типа (обучающий разгон).

**Банк карточек (обязательный, ровно эти 12):**

| # | Код | Вердикт | Виновник | Объяснение (RU) | Как починить |
|---|---|---|---|---|---|
| 1 | `df['ema_fast'] = df['close'].ewm(span=12).mean()` | 🟢 | — | Экспоненциальная средняя считается только по прошлым закрытиям. | — |
| 2 | `df['enter_long'] = ((df['ema_fast'] > df['ema_slow']) & (df['volume'] > 0)).astype(int)` | 🟢 | — | Обе части сравнения — значения этой же свечи, объём фильтрует артефакты. | — |
| 3 | `for i in range(len(df)-1):`<br>`    if df.close[i+1] > df.close[i]:`<br>`        df.enter_long[i] = 1` | 🔴 | строка 2, `close[i+1]` | Свеча `i` получает сигнал по закрытию свечи `i+1`, которого в момент решения ещё нет. | `signal = df['close'] > df['close'].shift(1)` (смотрим на предыдущую) |
| 4 | `df['sig'] = (df['close'] > df['close'].shift(-1)).astype(int)` | 🔴 | `shift(-1)` | `shift(-1)` подтягивает значение следующей строки — будущее одним движением. | `shift(1)` |
| 5 | `df['z'] = (df['close'] - df['close'].mean()) / df['close'].std()` | 🔴 | `.mean()` (и `.std()`) | Среднее и разброс посчитаны по всей истории, включая свечи, которых ещё не было. Утечка из урока 1.7 № 2. | `df['close'].rolling(200).mean()` / `.rolling(200).std()` |
| 6 | `m = df['close'].rolling(50).mean()`<br>`s = df['close'].rolling(50).std()`<br>`df['z'] = (df['close'] - m) / s` | 🟢 | — | Окно из 50 **прошлых** свечей: в live у бота ровно эти данные и есть. | — |
| 7 | `df['ma'] = df['close'].rolling(20, center=True).mean()` | 🔴 | `center=True` | Центрированное окно берёт 10 свечей назад и 10 вперёд. Утечка № 4 из урока 1.7. | убрать `center=True` |
| 8 | `df['pct'] = df['close'].rank(pct=True)`<br>`df.loc[df['pct'] < 0.1, 'enter_long'] = 1` | 🔴 | строка 1, `rank(pct=True)` | Ранг «где эта цена среди всех цен истории» — нельзя знать, не увидев всю историю. | `df['close'].rolling(500).apply(lambda w: (w < w.iloc[-1]).mean())` или порог по rolling-квантилю |
| 9 | `df['prev_close'] = df['close'].shift(1)` | 🟢 | — | Сдвиг вниз: строка получает значение предыдущей свечи — прошлое. | — |
| 10 | `df['close'] = df['close'].bfill()` | 🔴 | `bfill()` | Пропуск заполняется **следующим** известным значением — будущим. Утечка № 3 из урока 1.7. | `ffill()` — или не заполнять, а искать причину пропуска (FT-08) |
| 11 | `for i in range(1, len(df)):`<br>`    if df.close[i] > df.close[i-1]:`<br>`        df.up[i] = 1` | 🟡 | — | Смотрит только назад (`i-1`) — честно. Но на миллионе свечей это 18 секунд вместо 3 миллисекунд, и одна опечатка `+` вместо `-` превращает его в карточку № 3. | `df['up'] = (df['close'] > df['close'].shift(1)).astype(int)` |
| 12 | `vmax = df['volume'].max()`<br>`df.loc[df['volume'] > 0.5 * vmax, 'enter_long'] = 1` | 🔴 | строка 1, `.max()` | Максимальный объём за всю историю известен только в конце истории. | `df['volume'].rolling(200).max()` |

**Тексты обратной связи (шаблоны):**
- Верно: «✓ Верно. {объяснение}»
- Неверный вердикт: «✗ Здесь {правильный вердикт}. {объяснение}» + анимация: для утечки — столбец-виновник подсвечивается, стрелка показывает, из какой строки пришло значение (снизу вверх = будущее).
- Верный вердикт «утечка», но неверный виновник: «Утечка есть, но не здесь. Смотри на {подсказка: “что сдвигает”, “что агрегирует”}» — вторая попытка на выбор виновника без потери балла за вердикт (балл за виновника теряется).
- Для 🟡, если ученик выбрал 🔴: «Это не утечка — цикл смотрит на `i-1`. Но привычка писать так рано или поздно родит `i+1`. Вердикт: честно, но медленно.» (засчитать как «почти»: 0,5 балла).
- Для 🟡, если выбрал 🟢: «Логически честно, да. Но это цикл: в 5 700 раз медленнее и одна опечатка до утечки. Отдельный вердикт для этого и нужен.» (0,5 балла).

**Подсказки:** одна кнопка «Подсказка» на карточку: подсвечивает все токены, которые *могут* быть виновниками (`shift`, `mean`, `std`, `max`, `rank`, `bfill`, `center`, `[i+1]`), без указания правильного. Использование фиксируется, балл не снимается (первое прохождение), при повторном прохождении подсказка снимает 0,5 балла.

**Итоговый экран акта 3:**
- Счёт: «X из 12», разбивка по типам: «утечки найдены: a/7, виновник указан верно: b/7».
- Бейдж при ≥ 10: «Охотник за утечкой, уровень 1 — карточки этого урока».
- Персональная строка: «Тебе чаще всего не даётся: {категория с наибольшим числом ошибок: сдвиги / агрегаты по истории / центрирование / циклы}».
- Кнопка **«Проверить мою стратегию так же»** → открывает описание команды `freqtrade lookahead-analysis` с пометкой «подробно — в FT-11»; в терминале-заглушке показать одну строку вывода с русской подписью.
- Кнопка «К практике урока» (задание «реализуй условие двумя способами»).

**При счёте < 10:** «Повторить с новым порядком» — карточки те же, порядок другой, объяснения ранее ошибочных карточек предъявляются заново перед ответом (режим «переучивание»).

**Аналитика:** `card_answer{cardId, verdict, correctVerdict, culpritOk, hintUsed, timeMs}`, `act_complete{act:3, score, byType}`.

---

### 1.7. Данные акта 1–2 (генерация)
- Синтетический ряд `N` часовых свечей, лог-нормальное случайное блуждание: `close[0]=65 000`, `σ = 0,4 %/ч`, `μ = 0`; `open[i] = close[i-1]`; `high/low` = close ± |N(0, 0,3 %)|, согласованы; `volume ~ LogNormal(ln 1200, 0,5)`, три случайные свечи с `volume = 0` (чтобы фильтр `volume > 0` имел смысл — в акте 1 по ним видно, что сигнал не ставится).
- Seed по умолчанию `ft07-<userId>`; кнопка «Другой рынок» пересеивает.
- Требование к акту 2: на 300 свечах «телепат» обязан показать ≥ +30 % (это гарантировано конструкцией — он всегда покупает перед ростом); если по seed «честная» кривая случайно > «телепата» (невозможно) — генерация ошибочна, тест должен это ловить.

### 1.8. Словарь терминов (пополнить языковой слой)
`DataFrame`, `df`, `столбец/колонка`, `ewm`, `span`, `mean`, `std`, `max`, `rolling`, `shift(1)`, `shift(-1)`, `center=True`, `bfill`, `ffill`, `rank(pct=True)`, `astype(int)`, `df.loc[...]`, `for / range / len` (ссылка на Py-06), `enter_long` (ссылка на FT-05), `volume > 0` (FT-05), `look-ahead` (1.7), `lookahead-analysis` (FT-11), «векторный расчёт» (1.6).

### 1.9. Критерии приёмки FT-07
- [ ] Акт 1: обе анимации запускаются на всех 5 значениях N; таблица времени совпадает с формулой; при N = 10⁶ показываются ровно 18,5 с / 3,2 мс / ~5 700×.
- [ ] Акт 1: анимация конвейера длится одинаково при любом N (проверяется таймером теста, допуск ±100 мс).
- [ ] Акт 2: при запуске цикла из урока каждая итерация подсвечивает строку i+1 красным; счётчик подглядываний = число итераций.
- [ ] Акт 2: «телепат» ≥ +30 % на 300 свечах при любом seed из 100 проверочных; при тумблере «показать, что видел бот» его кривая пересчитывается и теряет преимущество (итог в диапазоне −10…+10 %).
- [ ] Акт 3: все 12 карточек присутствуют, вердикты и виновники совпадают с таблицей 1.6; без клика по виновнику ответ 🔴 не принимается.
- [ ] Акт 3: карточки 3 и 11 никогда не идут подряд первыми двумя (иначе игрок различает их по памяти, а не по коду).
- [ ] Все английские токены обёрнуты в `<Term>`; режим «рус. подписи» даёт подпись каждой строке кода в актах 1–2 и каждой карточке акта 3.
- [ ] `prefers-reduced-motion`: анимации заменяются мгновенным финальным состоянием + текстовое описание «рабочий заглянул в строку i+1 на каждом шаге».
- [ ] Прогресс (акт, счёт, ошибки по типам) сохраняется и восстанавливается после перезагрузки.
- [ ] Прохождение с клавиатуры: Tab по кнопкам вердикта, Enter — выбрать, стрелки — выбор строки/токена виновника.

---

## 2. FT-08 · «Найди дыру в истории»

### 2.1. Паспорт
| Поле | Значение |
|---|---|
| Урок | 208 · FT-08 «Исторические данные: скачивание, проверка и пропуски» (12 мин) |
| Тип | ИГР + СИМ + Э1 (терминал) + РИТ-крючок |
| Ломает заблуждение | **«Скачал — значит данные хорошие»** |
| Место в уроке | После блока «▸ Глубже: Гигиена данных…» и перед аналогией про продукты для ресторана (аналогия — финальная подпись) |
| Опирается на | 0.7 (OHLC), 2.6 (чек-лист валидации), М27 (выброс — ошибка или рынок), FT-03 (data — read-only), FT-05 (`volume > 0`, `startup_candle_count`) |
| Готовит к | FT-09 (первый бэктест), FT-12 (`recursive-analysis`), FT-13 (анти-лжец-конвейер, шаг 1) |
| Длительность | 7–10 минут |
| Критерий освоения | Найдены D1–D3 с верным типом, ≤ 1 ложная тревога, прочитаны (кликнуты) ≥ 3 строки вывода `check_data.py` |
| Вне объёма | «Таймфрейм и статистика» (FT-08 (2)) — отдельная спека |

### 2.2. Цели обучения
1. Ученик находит глазами в 500 свечах: пропуск свечей, дубль метки времени, свечу с нулевым объёмом; бонус — нарушение `high < close`.
2. Отличает **дефект данных** от **реального рыночного события** (обвал с объёмом — не дефект).
3. Знает, что график «по индексу» склеивает дыру и она видна только по оси реального времени / в таблице.
4. Объясняет, что каждый дефект сделает с индикатором и бэктестом.
5. Читает вывод `check_data.py` (PASS/FAIL/WARN, код выхода) и понимает: скрипт — для контроля, глаза — для понимания; лечить — перекачкой, а не правкой файла.

### 2.3. Экраны (линейно, 0 → 4)

```
[0 Пролог] → [1 Лента: найди дефекты] → [2 check_data.py] → [3 Что это сделает с бэктестом] → [4 Ритуал]
```

---

### 2.4. Экран 0 — Пролог «Файл скачан»

- Терминал (E1), уже отработавшая команда:
  ```
  $ freqtrade download-data -c user_data/config.json --pairs BTC/USDT --timeframe 1h --timerange 20240301-20240321
  Downloading data for BTC/USDT ... 100%
  $ freqtrade list-data -c user_data/config.json
  Found 1 pair / 1 timeframe.
  BTC/USDT  1h  2024-03-01 00:00 → 2024-03-21 19:00  (500 candles)
  ```
  Каждая строка — с русской подписью (E1). Строка `500 candles` кликабельна: «Это только количество строк в файле. Сколько их **должно** быть за этот период — команда не проверяет.»
- Реплика Алексея: «Скачал. Пятьсот свечей, ошибок нет. Можно запускать бэктест?»
- Две кнопки: **[Да, запускай]** и **[Сначала посмотрю]**.
  - «Да»: короткая вспышка результата бэктеста: «Total profit +14,2 % · 9 сделок» и сразу плашка: «Три из девяти сделок открыты на свечах, которых на бирже не существовало. Разберёмся, откуда они взялись.» → переход к экрану 1. (Ученик проживает последствие, но без наказания.)
  - «Сначала посмотрю»: «Правильно. Файл — это ещё не история.» → экран 1.
- Аналитика: `prologue_choice{value}`.

---

### 2.5. Экран 1 — ИГР «Лента 500 свечей»

**Раскладка:**
```
┌ Панель инструментов ──────────────────────────────────────────┐
│ Вид: [График] [Таблица]   Ось времени: [по индексу] [реальная] │
│ Масштаб: [−] ●────── [+]    Найдено: ? из ?    ⏱ 03:12          │
├────────────────────────────────────────────────────────────────┤
│ ▁▂▃ свечи (OHLC) + столбики объёма снизу + ось дат             │
│ ← горизонтальный скролл / мини-карта всей ленты снизу →        │
├────────────────────────────────────────────────────────────────┤
│ Мои флажки (0):  [пусто]                     [Проверить находки] │
└────────────────────────────────────────────────────────────────┘
```

**Инструменты:**
- **Вид «График»**: свечи, объём, ось дат (каждые 24 свечи — подпись даты, при масштабе ×4 — каждые 6 часов). По умолчанию **ось «по индексу»** — как рисует `plot-dataframe`: свечи стоят вплотную, дыры **не видно**, только подписи дат «прыгают».
- **Ось «реальная»**: расстояние между свечами пропорционально времени — на месте дыры пустой промежуток шириной в 6 свечей, а дубль — две свечи на одной вертикали (нарисованы с лёгким сдвигом/наложением).
- **Вид «Таблица»**: колонки `№ | date (UTC) | open | high | low | close | volume | Δt`. Колонка `Δt` (разница с предыдущей меткой) **по умолчанию скрыта**; появляется по кнопке «Показать Δt» — это «подсказка № 1» (фиксируется в аналитике, балл не снимает).
- **Масштаб**: 1× (все 500 в один экран, свечи по 2 px — как реально смотрят «на глаз»), 4×, 12× (свеча читается).
- **Мини-карта**: полоска всей ленты с окном текущего просмотра и уже поставленными флажками.
- **Таймер** — информационный, без штрафа; показывается в итогах («ты искал 3:12, скрипт — 0,2 с»).

**Постановка флажка:** клик/тап по свече (график) или по строке (таблица) → всплывает выбор типа из чипов:
- 🕳 **Пропуск свечей** («между этой и предыдущей не хватает свечей»)
- 👯 **Дубль времени** («две свечи с одной меткой»)
- 0️⃣ **Нулевой объём** («свеча, в которую никто не торговал»)
- ⚠ **Цена вне свечи** («high ниже close / low выше open — так не бывает»)
- Флажок можно снять или сменить тип. Один флажок — одна свеча; для пропуска флажок ставится на **первую свечу после дыры** (принимается также последняя свеча перед дырой — оба варианта верны).
- Ограничение: не более **8 флажков** одновременно (защита от «пометить всё»); при попытке поставить 9-й: «Больше восьми находок — это уже не проверка, а стрельба по площади. Сними лишний.»

**Счётчик «Найдено: ? из ?»**: до первой проверки число дефектов **скрыто** (иначе ученик перестаёт искать после третьего). После первой проверки становится «Найдено: 2 из 4».

**Кнопка «Проверить находки»** (активна при ≥ 1 флажке): проверяет каждый флажок:
- ✓ верно (свеча и тип совпали),
- ~ «место верное, тип другой» (засчитывается половина; показать правильный тип),
- ✗ ложная тревога (флажок на «приманке» или на здоровой свече),
- пропущенные дефекты **не раскрываются** на первой проверке — только число. Даётся вторая попытка поиска. На второй проверке пропущенные подсвечиваются жёлтым с объяснением «как это можно было увидеть».

**Инжектируемые дефекты (по ТЗ + бонус) и приманки:**

| Код | Что | Как выглядит на графике «по индексу» | Как увидеть | Где в данных |
|---|---|---|---|---|
| **D1** | Пропуск 6 свечей (дыра 7 ч между метками) | Не видно; свечи вплотную; подпись даты перескакивает `00:00 → 07:00`; **скачок цены** между соседями заметнее обычного (генерируется как накопленное движение 6 шагов, ≈ 1–2 %) | Ось «реальная» → пустота; таблица `Δt = 7h` | случайный индекс 40…460 |
| **D2** | Дубль метки времени (две строки с одной `date`, OHLCV чуть различаются) | Две почти одинаковые свечи подряд | Ось «реальная» → наложение; таблица `Δt = 0h` | ≥ 40 свечей от D1 |
| **D3** | Нулевой объём: `volume = 0`, `open=high=low=close` (плоская «чёрточка») | Пустой столбик объёма, свеча без тела и теней | Виден в графике при масштабе ≥ 4×; таблица `volume = 0` | ≥ 40 от D1, D2 |
| **D4** (бонус) | `high < close` на одной свече (high подрезан ниже close) | Тело свечи «выше» верхней тени — визуально сломанная свеча | Масштаб 12× или таблица | ≥ 40 от остальных |
| **X1** (приманка) | Реальный обвал: свеча −9 %, `volume × 6`, OHLC согласованы, `Δt = 1h`; следующие 3 свечи — отскок | Огромная красная свеча | — | ≥ 40 от дефектов |
| **X2** (приманка) | Ночная свеча с очень малым, но **ненулевым** объёмом (5 % от медианы) | Короткий столбик объёма | — | любое место |

Обратная связь по приманкам:
- X1 помечен как дефект: «Это не ошибка данных — это рынок. Объём в 6 раз выше обычного, high/low согласованы, метка времени на месте. Урок М27: необычное ≠ ошибка. Удалишь такие свечи — получишь спокойную ложь (FAI-06).»
- X2: «Объём маленький, но не нулевой: ночью так бывает. Нулевой объём — это когда сделок не было **вообще**, и свеча плоская.»

**Генерация данных:** синтетика как в FT-07 (лог-нормальное блуждание, `close[0] = 65 000`, `σ = 0,4 %/ч`), 500 меток с `2024-03-01 00:00 UTC` шагом 1 ч; объём `LogNormal(ln 1200, 0,45)` × суточная сезонность (ночь UTC 00–06 → ×0,6). Дефекты и приманки инжектируются после генерации по seed с ограничениями из таблицы (не в первых/последних 30 свечах, ≥ 40 свечей между собой). Число дефектов: первое прохождение — ровно D1–D4; повторное («Новый файл») — случайно 3–5 из расширенного банка (варианты: дыра 4/6/12 свечей, 1–2 дубля, нулевой объём одиночный или серия из 3, `low > open`, отрицательный объём, нулевая цена `close = 0`).

**Подсказки (кнопка «Подсказка», до 3 за прохождение, фиксируются, балл не снимают на первом прохождении):**
1. «Переключи ось времени на реальную.»
2. «Открой таблицу и покажи колонку Δt — каждая свеча должна отстоять от предыдущей ровно на 1h.»
3. «Приблизь масштаб до 12× и пройди мини-картой участок за участком: ищи свечу без тела и без столбика объёма.»

---

### 2.6. Экран 2 — СИМ + E1 «check_data.py подтверждает»

**Вводная реплика:** «Ты нашёл {k} из 4 за {время}. Теперь то же самое сделает скрипт из практики урока.»

**Терминал (E1), кнопка [▶ Запустить]:** строки появляются с задержкой 150 мс, каждая кликабельна, уровни раскрашены.
```
$ python check_data.py user_data/data/binance/BTC_USDT-1h.feather
check_data v0.1 · timeframe 1h · 501 rows · 2024-03-01 00:00 → 2024-03-21 19:00 UTC

[FAIL] continuity     gap 7h  between 2024-03-12 00:00 and 2024-03-12 07:00 (6 candles missing, tolerance 3)
[FAIL] duplicates     1 duplicated timestamp: 2024-03-16 14:00
[PASS] price > 0      no zero/negative prices
[WARN] volume == 0    1 candle: 2024-03-08 03:00 (flat OHLC)
[FAIL] ohlc consistency  1 candle: high < close at 2024-03-19 11:00
[PASS] timerange      requested 20240301-20240321 covered
[PASS] monotonic      timestamps increasing (except duplicate above)

Result: 3 FAIL · 1 WARN · exit code 1
```
(даты подставляются из реальных позиций дефектов по seed; `501 rows` — потому что дубль добавил строку: это отдельная кликабельная подсказка «почему 501, а list-data сказала 500? …потому что дубль»).

**Русские карточки по клику (примеры, остальные по образцу):**
- `continuity` → «Непрерывность: каждая метка должна быть на 1h позже предыдущей. Допуск 3 периода — биржи иногда пропускают одну-две свечи на техработах. Здесь пропущено 6 — перекачивать сегмент.»
- `[FAIL]` → «Проверка не пройдена. Одного FAIL достаточно, чтобы код выхода стал 1.»
- `[WARN]` → «Предупреждение: не блокирует, но требует решения. Нулевой объём — не всегда ошибка, но стратегия обязана иметь фильтр `volume > 0` (FT-05).»
- `exit code 1` → «Код выхода. 0 — всё хорошо, 1 — стоп. В конвейере FT-13 бэктест после кода 1 не запускается.»
- `feather` → «Формат файла, в котором Freqtrade хранит свечи. Читается pandas за миллисекунды.»

**Режим «скрыть английский»** (тумблер E1): метки превращаются в `[ПРОВАЛ] непрерывность …`, `[ОК] цены > 0 …`.

**Сравнительная плашка под терминалом:**
> «Ты: {k} из 4 за {mm:ss}, ложных тревог: {f}. Скрипт: 4 из 4 за 0,2 с, ложных тревог: 0.
> Но про свечу −9 % 2024-03-{dd} скрипт промолчал — и правильно: это рынок, а не дефект. Скрипт проверяет то, что умеет; отличать обвал от ошибки — твоя работа (М27).»

**Развёртка «Тот же тест одной строкой pandas»** (сворачиваемый блок, код из урока):
```python
df = pd.read_feather('user_data/data/binance/BTC_USDT-1h.feather')
assert df['date'].diff().max() < pd.Timedelta('3h'), 'дыра в истории!'
assert not df.duplicated('date').any(), 'дубли свечей!'
```
Каждая строка с русской подписью; `assert` → термин: «проверь и остановись, если неправда».

**Условие перехода:** кликнуты ≥ 3 разные строки терминала (аналитика `terminal_line_click{key}`).

---

### 2.7. Экран 3 — СИМ «Что каждый дефект сделает с бэктестом»

Четыре вкладки-карточки (по дефектам), в каждой — маленькая визуализация «как есть / как надо» на 12 свечах вокруг дефекта, с индикатором EMA(5) и сигналом стратегии `TutorialEmaRsi`.

| Дефект | Визуализация «как есть» | Подпись Алексея | Кнопка «Вылечить» → «как надо» |
|---|---|---|---|
| **D1 дыра** | Бот считает EMA так, будто свечи 00:00 и 07:00 — соседи; на первой после дыры возникает сигнал; вход по «open t+1», а между сигналом и входом на самом деле 7 часов. Плашка: «бот думал, что прошёл 1 час — прошло 7» | «Три сделки из пролога были вот такими» | `download-data --timerange 20240311-20240313 --erase` → сегмент перекачан, сигнал исчезает |
| **D2 дубль** | Индикатор обновляется дважды на одной свече; счётчик сделок «прыгает»; таблица: в dry-run такой второй свечи не будет → результаты бэктеста и песочницы разойдутся уже здесь (мост к FT-10/FT-19, Execution Deviation) | «В живой торговле этой свечи не существует» | удалить дубль **перекачкой**, не правкой файла |
| **D3 нулевой объём** | Тумблер **«фильтр `volume > 0` в стратегии»**: выкл — на плоской свече возникает вход (RSI пересёк порог на несуществующей торговле); вкл — сигнал отсекается. Здесь урок FT-05 показывается в действии | «Вот зачем в каждом условии стоит `volume > 0`» | оставить свечу, включить фильтр (WARN, не FAIL) |
| **D4 high < close** | Стоп/ROI в бэктесте считаются внутри свечи по high/low (FT-09): бот «достигает» ROI, которого не было, или «не ловит» стоп | «Бэктест верит свече на слово» | перекачать свечу; если повторяется — сменить источник |

Общая плашка внизу (обязательная, красная рамка):
> «Файлы в `user_data/data/` — сырьё. Их **не редактируют руками** (FT-03, урок 2.6: сырой слой неизменяем). Лечение — перекачать сегмент. Правишь руками — теряешь воспроизводимость: через месяц не вспомнишь, что и зачем менял.»

Кнопка «Дальше».

---

### 2.8. Экран 4 — РИТ-крючок «Перед каждым бэктестом»

- Карточка ритуала (4 шага, чек-боксы, иллюстративно уже отмечены первые три из сегодняшнего прохождения):
  1. `download-data` — скачать/докачать
  2. `list-data` — что реально лежит на диске
  3. `check_data.py` → **exit code 0**
  4. Только теперь `backtesting`
- Кнопка **[Добавить в мои ритуалы]** → `Ritual.attach("pre-backtest-data-check")` (если E4 есть; иначе — сохранить флаг локально и показать «Появится в ритуалах, когда откроется FT-13»).
- Итог по интерактиву: найдено / ложных тревог / время / прочитано строк терминала / бейдж «Инспектор данных» при выполнении критерия освоения.
- Кнопка **«Новый файл»** — повторное прохождение с новым seed и расширенным банком дефектов (3–5 штук), счётчик «из ?» снова скрыт.
- Ссылка «Практика урока: напиши свой `check_data.py` с агентом» (промпт из урока).

---

### 2.9. Словарь терминов (пополнить языковой слой)
`download-data`, `list-data`, `--timerange`, `--timeframe`, `--erase`, `--pairs`, `feather`, `rows`, `candles`, `UTC`, `Δt`/`diff`, `duplicated`, `assert`, `PASS / FAIL / WARN`, `exit code`, `continuity`, `monotonic`, `OHLCV` (0.7), `startup_candle_count` (FT-05/FT-12), `plot-dataframe` (FT-15), «сырой слой / read-only» (2.6, FT-03).

### 2.10. Аналитика
`prologue_choice`, `tool_use{tool: axis_real|table|delta_col|zoom, first:bool}`, `flag_set{idx,type}`, `flag_remove`, `check_attempt{n, correct, halfCorrect, false, missed, elapsedSec}`, `hint_used{n}`, `terminal_line_click{key}`, `consequence_view{defect, toggled}`, `ritual_attached`, `complete{found, false, elapsedSec, replay:bool}`.

### 2.11. Критерии приёмки FT-08
- [ ] Генератор: 100 seed подряд дают 500 меток по 1h + ровно D1–D4 + X1–X2 с соблюдением расстояний ≥ 40 и границ 30…470; дубль добавляет строку (итого 501).
- [ ] В режиме «по индексу» дыра визуально неотличима (расстояние между свечами одинаково); в режиме «реальная ось» промежуток равен 6 ширинам свечи; дубль рисуется на одной вертикали.
- [ ] Колонка Δt скрыта по умолчанию; после раскрытия у D1 показывает `7h`, у D2 — `0h`, у всех остальных `1h`.
- [ ] Флажок пропуска засчитывается на любой из двух свечей, соседствующих с дырой.
- [ ] Первая проверка не раскрывает позиции пропущенных дефектов, только число; вторая — раскрывает с объяснением.
- [ ] X1/X2, помеченные как дефект, считаются ложной тревогой с указанным текстом; после этого X1 можно снять без потери прогресса.
- [ ] Терминал: даты в строках соответствуют реальным позициям дефектов текущего seed; `exit code 1`, если есть хоть один FAIL; при повторном прохождении с набором дефектов без FAIL (только WARN) выводится `exit code 0`.
- [ ] Переход с экрана 2 заблокирован, пока не кликнуты 3 разные строки.
- [ ] Экран 3, D3: тумблер `volume > 0` действительно убирает сигнал на плоской свече; D1: после «вылечить» EMA пересчитывается по непрерывным данным и сигнал исчезает.
- [ ] Критерий освоения вычисляется корректно: D1–D3 найдены с верным типом (полбалла за «место верное, тип другой» не засчитывается как выполнение), ложных тревог ≤ 1, кликов по терминалу ≥ 3.
- [ ] На ширине 360 px лента скроллится горизонтально, мини-карта видна, чипы типов помещаются в две строки, флажок ставится тапом без long-press.
- [ ] Все английские токены в терминале, таблице и командах — `<Term>`; режим «скрыть английский» переводит метки уровней и названия проверок.
- [ ] Повторное прохождение («Новый файл») использует расширенный банк и другое число дефектов; счётчик снова скрыт.

---

## 3. Что передать вместе с задачей агенту
1. Этот документ целиком (разделы 0, 1, 2).
2. Тексты уроков 207 и 208 (для сверки формулировок и чисел — интерактив обязан цитировать урок, а не пересказывать).
3. Интерфейсы E1/E6/E4 (или разрешение сделать заглушки с указанными контрактами).
4. Порядок сдачи: сначала FT-08 (проще, закрывает пустой урок целиком), затем FT-07 акты 1–2, затем акт 3 на E6 — чтобы банк карточек акта 3 сразу лёг в общий банк «Охотника за утечкой» и переиспользовался в FT-11 и FAI-02.

------------------------------------------
# Спецификации для реализации: FT-04 (2) «Слоты и риск» и FT-05 «Зона или пересечение?»

## 0. Общие соглашения (действуют для обоих интерактивов)

**0.1. Аудитория и язык.** Русскоязычный новичок без английского. Весь интерфейс — на русском. Любой английский токен (`stake_amount`, `rsi`, `shift(1)`, `enter_long`, `open` …) рендерится как кликабельный чип `data-term="…"` → всплывающая карточка: русское название, одна фраза «что это», пример, ссылка «где объяснено» (урок). Словарь терминов для обоих интерактивов — в разделе 3.

**0.2. Принцип «числа из урока».** Все значения по умолчанию и все контрольные результаты воспроизводят расчёты из уроков FT-04, FT-05, FT-17, FT-18, 0.12, 5.5. Отклонение от этих чисел = баг (см. приёмочные тесты).

**0.3. Три обязательных фазы в каждом интерактиве:**
1. **Предсказание до показа** (одна кнопка выбора) — ломаем заблуждение через собственную ошибку.
2. **Симуляция / отработка** — живой пересчёт или покадровое воспроизведение.
3. **Критерий освоения** — задача, которую нельзя «прокликать»; её решение записывается в прогресс ученика и открывает следующий блок урока.

**0.4. Движки.**
- **E2 «Живой конфиг»** — компонент `LiveConfig`: слева поля/ползунки, справа панель производных величин, снизу фрагмент `config.json`, обновляющийся синхронно. Все расчёты — в чистом модуле `risk_math` (без UI), покрытом юнит-тестами.
- **E3 «Плёнка бэктеста»** — компонент `BacktestFilm`: покадровое воспроизведение по свечам с кнопками «шаг ▸», «▶ авто», «⏸», ползунком свечи, режимом «затемнить будущее» (правая часть графика скрыта до текущей свечи) и попапом «Что видел бот на этой свече».

**0.5. Технические ограничения.** Без тяжёлых библиотек графиков (SVG/Canvas свои); мобильная раскладка — стек (панели друг под другом); управление с клавиатуры (ползунки — стрелки, шаг ×10 с Shift); `prefers-reduced-motion` → без автоанимации; состояние сохраняется в `localStorage` (черновик) и в прогрессе ученика (факт освоения).

**0.6. События аналитики** (единый формат `{interactive_id, event, payload, ts}`): `opened`, `prediction_made`, `param_changed` (троттлинг 500 мс), `stage_completed`, `mastery_passed`, `mastery_failed`, `term_clicked`.

---

## 1. FT-04 (2) «Слоты и риск»

### 1.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft04_slots_risk` |
| Урок | FT-04 «Конфигурация: что задаётся программой, стратегией и командой» |
| Место в уроке | Сразу после блока «Числа» (dry_run_wallet 1000, max_open_trades 3, unlimited → ~330 USDT) и перед «Аудит конфига глазами агента» |
| Тип | СИМ + мини-задача (ИГР) |
| Движок | E2 «Живой конфиг» |
| Целевое заблуждение | «`stake_amount: "unlimited"` — безопасный режим: бот сам всё поделит» |
| Что должен уметь после | 1) считать «USDT на слот», риск на сделку и суммарный риск из четырёх чисел конфига; 2) видеть, что `unlimited` при 3 слотах даёт 3,3% риска на сделку и 9,9% суммарного — выше правила 1–2% / 4–6% (FT-17); 3) подбирать `stake_amount` под бюджет риска |
| Время | 6–8 минут |
| Связи | FT-17 (сайзинг 1–2%, серия 10 стопов), FT-18 (три коррелированных лонга = один риск), 0.12 (асимметрия восстановления), 5.5 (ожидаемая серия убытков), 3.6 (стресс-тест) |

### 1.2. Сценарий (этапы)

**Этап 0 — Предсказание (обязателен, нельзя пропустить).**
Экран: карточка с вопросом и тремя кнопками.
> Кошелёк песочницы 1000 USDT, 3 слота, стоп −10%. Что безопаснее для депозита?
> ○ `stake_amount: "unlimited"` — бот сам разделит деньги
> ○ `stake_amount: 150` — фиксированная ставка
> ○ Одинаково: и там и там три сделки

После выбора — панель открывается с предустановками урока, а над ней плашка: «Твой ответ: … Проверим цифрами». Ответ сохраняется; финальный экран сравнит его с результатом.

**Этап 1 — Живой расчёт (свободная игра).**
Левая колонка — ползунки/переключатели; правая — производные величины с цветовыми зонами; низ — живой `config.json`. Любое движение ползунка мгновенно пересчитывает всё.

**Этап 2 — Сравнение «unlimited vs фиксированный»** (переключатель «Сравнить два режима» разворачивает правую панель в две колонки при одинаковых кошельке, слотах и стопе).

**Этап 3 — Задача на освоение** (см. 1.7).

**Этап 4 — Итог**: три буллета + сверка с предсказанием + фрагмент конфига «Мой безопасный старт» с кнопкой «Скопировать».

### 1.3. Входные параметры (левая колонка)

| Параметр | Элемент | Диапазон / шаг | По умолчанию | Подпись (рус.) |
|---|---|---|---|---|
| `dry_run_wallet` | ползунок + поле | 100–10 000, шаг 50 | **1000** | Кошелёк песочницы, USDT. Мелким: «≈ 100 000 ₽ — депозит Алексея из Py-уроков» |
| `max_open_trades` | ползунок | 1–20, шаг 1 | **3** | Сколько сделок может быть открыто одновременно (слоты) |
| `stake_amount` — режим | сегмент-переключатель | `"unlimited"` / число | **unlimited** | Ставка на сделку |
| `stake_amount` — число | ползунок + поле (активен только в режиме «число») | 10 – `dry_run_wallet`, шаг 10 | **150** | Фиксированная ставка, USDT |
| `stoploss` | ползунок | −2% … −20%, шаг 1% | **−10%** | Стоп-лосс стратегии (задаётся в файле стратегии, не в конфиге — подпись это подчёркивает) |
| `tradable_balance_ratio` | только чтение, раскрывается по клику «Дополнительно» | 0,90–1,00 | **0,99** | Доля кошелька, доступная боту |
| Серия стопов N | чипы | 5 / 7 / 10 | **10** | Для блока «Серия подряд» (см. 1.4, п. 5) |

### 1.4. Формулы (`risk_math`, чистые функции)

Обозначения: `W` — кошелёк, `r` — `tradable_balance_ratio`, `M` — `max_open_trades`, `S` — stake (число), `L = |stoploss|`, `N` — длина серии.

1. **Доступный баланс:** `A = W × r`.
2. **USDT на слот:**
   - unlimited: `slot = A / M` (упрощение: без учёта уже открытых позиций — так и написать в подсказке);
   - фиксированный: `slot = S`; число реально открываемых слотов `M_eff = min(M, floor(A / S))`. Если `M_eff < M` — предупреждение «Денег хватит только на `M_eff` из `M` слотов: остальные сигналы бот пропустит (insufficient balance)».
3. **Риск на сделку:** `risk1 = slot × L` (USDT) и `risk1_pct = risk1 / W`.
4. **Суммарный одновременный риск:** `riskAll = risk1 × M_eff`, `riskAll_pct = riskAll / W`. Подпись: «Если все позиции — коррелированные альты и BTC падает, стопы срабатывают вместе (FT-18)».
5. **Серия из N стопов подряд** (линейная модель, как в FT-17: ставка не пересчитывается): `dd_N = risk1 × N`, `dd_N_pct = dd_N / W`. Сноска: «упрощённо, без пересчёта ставки — оценка сверху для unlimited».
6. **Нужно отыграть** (0.12): `recovery = 1 / (1 − dd_N_pct) − 1`.
7. **Насколько вероятна серия N** (чипы винрейта 50% / 40%, q = 1 − winrate): `p_exact = q^N` — «шанс, что конкретные N сделок подряд — все стопы»; и `expected_max_streak(n_trades=100) = ln(100) / ln(1/q)` — «ожидаемая самая длинная серия за ~100 сделок» (100 ≈ год при 2–3 сделках в неделю, число из FT-04).
8. **Подсказка обратного расчёта:** `S_1% = A × 0.01 / L`, `S_2% = A × 0.02 / L` → строка «Чтобы уложиться в 1–2 % на сделку при стопе −L: `stake_amount` ≈ `S_1%`–`S_2%` USDT».
9. **Минимальный ордер биржи** (константа `MIN_NOTIONAL = 10`, конфигурируемая): если `slot < MIN_NOTIONAL` → предупреждение «Ниже минимального размера ордера биржи (~10 USDT на споте) — биржа отклонит заявку. Уточни лимит своей биржи».

**Контрольные значения (W=1000, r=0,99, M=3, L=10%):**

| Величина | unlimited | S = 150 |
|---|---|---|
| USDT на слот | 330 | 150 |
| Риск на сделку | 33 (3,3%) | 15 (1,5%) |
| Суммарный риск | 99 (9,9%) | 45 (4,5%) |
| Серия 10 стопов | −330 (−33%) | −150 (−15%) |
| Нужно отыграть | +49,3% | +17,6% |
| Серия 7 стопов | −231 (−23,1%) | −105 (−10,5%) |
| Ожид. макс. серия за 100 сделок | винрейт 50% → 6,6 ≈ 7; 40% → 9,0 ≈ 9 | то же |
| q^10 | 50% → 0,1 %; 40% → 0,6 % | то же |
| Подсказка stake 1–2% | — | 99–198 → показывать «≈ 100–200» |

Контроль из урока FT-04: W=900, unlimited, M=3 → slot = 297 (в уроке «297–300»).

### 1.5. Правая панель: производные величины и зоны

Каждая строка: название (рус.) · значение · цветовая плашка · подпись-объяснение в одну строку.

| Строка | Зелёная | Жёлтая | Красная | Подпись при красной |
|---|---|---|---|---|
| Риск на сделку, % депозита | ≤ 2% | 2–4% | > 4% | «Правило FT-17: stake × |стоп| ≤ 1–2% депозита» |
| Суммарный одновременный риск | ≤ 6% | 6–10% | > 10% | «Три коррелированных стопа разом — обвал BTC тянет альты (FT-18)» |
| Серия N стопов подряд | ≤ 10% | 10–20% | > 20% | «Серия из 7–10 стопов при винрейте 40–55% — норма, а не поломка (5.5)» |
| Нужно отыграть | ≤ 12% | 12–25% | > 25% | «Асимметрия восстановления (0.12)» |

Дополнительные строки без зон: «USDT на слот», «Реально откроется слотов: M_eff из M», «Ожидаемая самая длинная серия за ~100 сделок», «Подсказка: stake для 1–2%».

**Живой `config.json`** (низ панели, моноширинный, ключи — чипы-термины):
```json
{
  "dry_run": true,
  "dry_run_wallet": 1000,
  "max_open_trades": 3,
  "stake_currency": "USDT",
  "stake_amount": "unlimited",
  "tradable_balance_ratio": 0.99
}
```
и отдельной строкой ниже: `# в файле стратегии: stoploss = -0.10`. Кнопка «Скопировать». При переключении режима значение `"unlimited"` меняется на число.

### 1.6. Режим сравнения (Этап 2)

Две колонки «unlimited» и «фиксированный S» при общих W, M, L. Под таблицей — горизонтальная «шкала депозита» 0–100%: две полоски, показывающие `dd_N_pct` каждого режима, поверх — отметки 15% и 25% («рабочая / тревожная зона просадки, FT-09»). Под шкалой автоматически формируемая фраза:

> При кошельке **1000 USDT**, 3 слотах и стопе −10%: `unlimited` кладёт в сделку **330** и рискует **33 USDT (3,3%)**; серия из 10 стопов — **−33%**, отыгрывать **+49%**. Фиксированные **150** — **15 USDT (1,5%)**, серия — **−15%**, отыгрывать **+18%**. Одинаковое число сделок — разный риск.

### 1.7. Критерий освоения (Этап 3)

**Задача 1.** «Кошелёк 1000, стоп −10%. Подбери `stake_amount` и `max_open_trades` так, чтобы риск на сделку был ≤ 2 % и суммарный ≤ 6 %.»
Проверка: обе строки зелёные (`risk1_pct ≤ 0.02` и `riskAll_pct ≤ 0.06`), `M_eff == M`, `slot ≥ MIN_NOTIONAL`. Решений много (напр. 150×3, 200×3, 100×5); принимаются все.
Ловушки, которые распознаются и комментируются:
- ученик оставил `unlimited` и уменьшает `M` до 1 → slot 990, риск 9,9% → «unlimited с одним слотом — весь депозит в одной сделке»;
- ученик ставит `M = 20` с unlimited → slot 49,5, риск 0,5% зелёная, но суммарный 9,9% → «капитал размазан на 20 сделок, а суммарный риск не изменился: unlimited всегда держит в рынке ~99% кошелька».

**Задача 2 (после первой).** «Тот же кошелёк, стоп теперь −5%. Какой `stake_amount` даёт те же 1,5 % риска на сделку?» Поле ввода числа; принимается 290–310 (точно 297; допуск объяснить: «≈300»). Обратная связь: «Стоп вдвое короче — ставка вдвое больше при том же риске. Риск задаёт ставку, а не наоборот».

Обе задачи решены → `mastery_passed`, разблокировка следующего блока урока.

### 1.8. Финальный экран

- Плашка сверки: «Ты предсказал: … . Цифры показали: unlimited при 3 слотах = 3,3 % риска на сделку, 9,9 % суммарного — выше правил FT-17».
- Три буллета:
  1. «USDT на слот = кошелёк × 0,99 / слоты. `unlimited` — не безопасность, а формула».
  2. «Риск на сделку = ставка × |стоп|. Цель 1–2 %, суммарно 4–6 % (FT-17)».
  3. «Серия из 7–10 стопов случится обязательно (5.5). Считай её заранее, а не переживай потом».
- Карточка «Мой безопасный старт» — конфиг из решения задачи 1.

### 1.9. Приёмочные тесты

1. Все контрольные значения из таблицы 1.4 воспроизводятся с точностью ±0,5 USDT / ±0,1 п.п.
2. W=900, unlimited, M=3 → slot 297.
3. S=400, M=3, W=1000 → `M_eff = 2`, предупреждение о нехватке.
4. Без выбора в Этапе 0 панель не открывается.
5. Задача 1 не засчитывается при `M_eff < M` или `slot < 10`.
6. Изменение любого ползунка обновляет `config.json` за один кадр (≤ 16 мс на пересчёт).
7. Все английские ключи в панели и в JSON — кликабельные термины со всплывающей русской карточкой.
8. Клавиатура: все ползунки доступны Tab/стрелками; читалка экрана озвучивает значение и зону («риск на сделку 3,3 процента, красная зона»).

### 1.10. Что НЕ делать

- Не вводить формулу Келли и не считать «оптимальный» размер (это 3.3/М47).
- Не моделировать пересчёт unlimited-ставки по мере открытия позиций (усложняет, не меняет вывода).
- Не показывать доходность — интерактив только про риск.

---

## 2. FT-05 «Зона или пересечение?»

### 2.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft05_zone_vs_cross` |
| Урок | FT-05 «Первая стратегия: каркас и жизненный цикл» |
| Место в уроке | После блока «Числа» (разбор EMA16/EMA200, RSI<35, `rsi.shift(1) >= 35`) и перед «Ревью скелета стратегии по чек-листу ВК2» |
| Тип | СИМ (E3) + ИГР (конструктор условия) |
| Движок | E3 «Плёнка бэктеста» |
| Целевое заблуждение | «`rsi < 35` — нормальное условие входа. Бот войдёт один раз, когда RSI низкий» |
| Что должен уметь после | 1) объяснить, что условие вычисляется на каждой закрытой свече и «горит» всё время, пока RSI в зоне; 2) увидеть, что зона заново входит после каждого выхода внутри одного движения, а пересечение — один раз на движение; 3) собрать условие пересечения из чипов |
| Время | 8–10 минут |
| Связи | FT-04(2) (ставка 330/150), FT-06 (сигнал ≠ сделка), FT-17 (StoplossGuard лечит симптом), FT-18 (коррелированные пары), 1.7 (`shift(-1)` — утечка), Py-04 (сборка условия из чипов) |

### 2.2. Модель симуляции (что моделируем и почему так)

- **Данные:** 30 часовых свечей, синтетические. Колонка `rsi` задана явно (как в «просветном тесте» урока), цены сгенерированы согласованно. Фильтр `ema_fast > ema_slow` и `volume > 0` считаем выполненными на всём отрезке (показать серой плашкой «тренд-фильтр EMA16>EMA200 выполнен, объём > 0 — сосредоточимся на RSI»).
- **Три пары белого списка** из конфига FT-04: BTC/USDT, ETH/USDT, SOL/USDT. В симуляторе они движутся одинаково (коррелированный рынок, FT-18). На графике показана BTC/USDT; ETH и SOL — как две дополнительные «дорожки слотов» под графиком с подписью «тот же паттерн».
  Причина: Freqtrade по умолчанию держит **одну открытую сделку на пару** (термин-чип), поэтому три слота честно заполняются тремя парами, а не тремя сделками по одной паре.
- **Правила движка (как в Freqtrade):** сигнал считается по закрытой свече `t`; вход — по `open` свечи `t+1`; стоп −10 % срабатывает внутри свечи, если `low ≤ цена стопа`, исполнение по цене стопа; сигнал выхода `(rsi > 50) & (rsi.shift(1) <= 50)` исполняется по `open` следующей свечи; если у пары уже есть открытая сделка — сигнал входа отклоняется («уже есть сделка по паре»); если свободных слотов нет — «нет слота» (в этом наборе данных не возникает, но счётчик и логика обязательны); после закрытия сделки в свече `t` сигнал той же свечи `t` может дать новый вход в `t+1`.
- **Ставка:** по умолчанию 330 USDT на слот (unlimited из FT-04(2)); переключатель «ставка из FT-04(2): unlimited 330 / фикс 150». Комиссии не учитываются (сноска: «комиссии сделали бы зону ещё хуже — каждый лишний вход платит круг»).
- **Два условия входа:**
  - **«Зона»**: `rsi < 35`
  - **«Пересечение»**: `(rsi < 35) & (rsi.shift(1) >= 35)`
- **Два сценария цены:** А «Отскок» и Б «Нож».

### 2.3. Данные (зашить константами; `open[t] = close[t−1]`, `open[1] = 100.3`; `low = min(open, close) − 0.5`; `high = max(open, close) + 0.5`)

**Сценарий А «Отскок»**
```
close_A = [100.0, 99.4, 98.9, 98.5, 98.0, 97.6, 96.9, 96.3, 95.8, 96.0,
           96.4, 96.9, 96.6, 97.4, 98.3, 99.0, 98.6, 98.0, 97.4, 97.0,
           96.5, 96.2, 96.9, 97.8, 98.7, 99.6, 100.5, 100.2, 99.8, 99.5]
rsi_A   = [52, 48, 44, 41, 38, 36, 33, 31, 29, 30,
           32, 34, 34, 40, 45, 51, 47, 42, 38, 36,
           34, 33, 37, 42, 47, 52, 55, 53, 50, 48]
```

**Сценарий Б «Нож»** (первые 7 свечей совпадают с А)
```
close_B = [100.0, 99.4, 98.9, 98.5, 98.0, 97.6, 96.9, 95.5, 94.0, 92.5,
           91.0, 89.5, 88.0, 86.5, 85.0, 83.5, 82.0, 80.5, 79.0, 77.5,
           76.0, 74.5, 73.0, 71.5, 70.0, 69.5, 69.8, 69.4, 69.7, 69.5]
rsi_B   = [52, 48, 44, 41, 38, 36, 33, 30, 27, 25,
           23, 21, 20, 19, 18, 17, 17, 16, 16, 15,
           15, 14, 14, 13, 13, 15, 18, 19, 21, 22]
```

### 2.4. Ожидаемые результаты (эталон для приёмки; на одну пару / на три пары)

**Сценарий А, условие «зона»:** сигналов `enter_long` = 9 (свечи 7–13, 21–22); сделок 2 (вход по open 8 = 96,9 → выход по open 17 = 99,0, +2,17 %; вход по open 22 = 96,5 → выход по open 27 = 99,6, +3,21 %); отклонено «уже есть сделка по паре» = 7 (свечи 8–13, 22). Итого ×3 пары: 27 сигналов, 6 сделок, 21 отклонение, PnL ≈ +53 USDT при ставке 330 (+17,75 на пару).
**Сценарий А, «пересечение»:** сигналов 2 (7, 21); сделок 2 — те же самые; отклонений 0. ×3: 6 / 6 / 0, PnL тот же ≈ +53.
→ Вывод А: **сделки одинаковые**, разница только в 21 «лишнем» сигнале. Движок спас правилом «одна сделка на пару».

**Сценарий Б, «зона» (на пару):** сигналов 24 (7–30); сделки:
1. вход open 8 = 96,9, стоп 87,21 → стоп в свече 14 (low 86,0) → −33,0;
2. вход open 15 = 86,5, стоп 77,85 → стоп в свече 20 (low 77,0) → −33,0;
3. вход open 21 = 77,5, стоп 69,75 → стоп в свече 25 (low 69,5) → −33,0;
4. вход open 26 = 70,0, стоп 63,0 → не закрыта, на конец −0,71 % ≈ −2,4.
Итого на пару: 4 сделки, 3 стопа, реализовано −99, открытая −2,4; отклонено 20. ×3: 12 сделок, 9 стопов, **≈ −304 USDT (−30,4 % депозита)**, 72 сигнала, 60 отклонений.
**Сценарий Б, «пересечение»:** сигнал 1 (свеча 7); 1 сделка, стоп в свече 14, −33 на пару; ×3: **−99 USDT (−9,9 %)**; 3 сигнала, 0 отклонений.
При ставке 150: зона ≈ −138, пересечение −45 (совпадает с числом −45 из FT-17).

**Занятость слотов (на конец свечи, из 3):**
- А (оба условия): 8–16 → 3/3; 17–21 → 0/3; 22–26 → 3/3; 27–30 → 0/3.
- Б, зона: 8–13 → 3/3; 14 → 0; 15–19 → 3/3; 20 → 0; 21–24 → 3/3; 25 → 0; 26–30 → 3/3.
- Б, пересечение: 8–13 → 3/3; 14–30 → 0/3.

### 2.5. Экран

**Верх — график (E3):** свечи BTC/USDT (30 шт.), под ними линия RSI с горизонтальной чертой 35 и зоной ниже неё (бледная заливка), пунктир 50 (уровень выхода). Маркеры: ▲ вход (по open t+1), ▼ выход по сигналу, ✕ стоп; серые точки над свечами — сигнал `enter_long=1`, который был отклонён (с подписью при наведении: «уже есть сделка по паре» / «нет слота»). В режиме «затемнить будущее» всё правее текущей свечи скрыто.

**Под графиком — три дорожки слотов** «BTC/USDT · ETH/USDT · SOL/USDT»: заполненная ячейка = открытая сделка (зелёная), красная — сделка, закрытая стопом, пустая — слот свободен. Справа счётчик «Слотов занято: k/3».

**Правая боковая панель — счётчики** (обновляются по мере проигрывания):
- `enter_long` = 1 (сигналов): N
- Сделок открыто: N · закрыто по сигналу: N · по стопу: N
- Отклонено (уже есть сделка по паре): N · (нет слота): N
- Результат, USDT: ±N (и % депозита 1000)

**Низ — управление:**
- Сегмент «Условие входа»: `rsi < 35` (Зона) | `(rsi < 35) & (rsi.shift(1) >= 35)` (Пересечение). Код — чипы-термины.
- Сегмент «Сценарий»: А «Отскок» | Б «Нож».
- Транспорт E3: «шаг ▸», «▶», «⏸», «⟲ сначала», ползунок свечи 1–30, переключатель «затемнить будущее» (по умолчанию включён), переключатель «ставка: 330 / 150».
- Кнопка «Что видел бот на свече t» → попап:
  ```
  свеча 14 закрылась: rsi = 19, rsi.shift(1) = 20
  условие «зона»: 19 < 35 → True → enter_long = 1
  условие «пересечение»: 19 < 35 → True, 20 >= 35 → False → enter_long = 0
  BTC/USDT: сделка №1 закрыта стопом в этой свече → слот свободен
  «зона»: новый вход по open свечи 15 = 86.5
  ```

### 2.6. Сценарий прохождения

**Этап 0 — Предсказание.**
> В стратегии написано `rsi < 35`. Когда бот откроет сделку?
> ○ Один раз, когда RSI впервые опустится ниже 35
> ○ Каждую свечу, пока RSI ниже 35
> ○ Когда RSI начнёт расти после минимума

Верно второе; ответ фиксируется, панель открывается.

**Этап 1 — Сценарий А, оба условия.** Автопроигрывание «Зоны» (или пошагово). После свечи 30 — карточка результатов А. Затем кнопка «Теперь пересечение» → второй прогон → карточка сравнения:
> Сделки одинаковые: 6 и 6. Но «зона» зажгла `enter_long` 27 раз и 21 раз упёрлась в «уже есть сделка по паре». Движок спас тебя правилом «одна сделка на пару». Пока сделка открыта, разницы нет. **Разница появится, когда сделка закроется, а RSI останется в зоне.**

**Этап 2 — Сценарий Б, оба условия.** Тот же ход. Карточка сравнения:
> Нож: RSI ниже 35 с 7-й свечи до конца. «Зона» после каждого стопа входит снова на следующей свече: 12 сделок, 9 стопов, **−304 USDT (−30 %)**. «Пересечение» вошло один раз на движение: 3 сделки, **−99 USDT (−10 %)**. Слоты у «зоны» заняты 22 свечи из 23 — не новыми возможностями, а повторными входами в тот же нож. В FT-17 ты включишь StoplossGuard (пауза после 3 стопов) — он лечит симптом. Причина — условие входа.
Переключатель ставки 330 → 150 пересчитывает карточку (−138 / −45) с подписью «сайзинг из FT-04(2) уменьшает ущерб, но не число ошибочных входов».

**Этап 3 — Конструктор условия (критерий освоения).**
Задание: «Собери условие входа-пересечения из чипов». Поле сборки + банк чипов: `(`, `)`, `rsi`, `rsi`, `<`, `>=`, `>`, `35`, `35`, `&`, `.shift(1)`, `.shift(-1)`, `|`. Цель: `(rsi < 35) & (rsi.shift(1) >= 35)`; принимается и обратный порядок скобок.
Обратная связь по типовым ошибкам (проверка по структуре выражения, не по строке):
- нет `.shift(1)` → «Это условие зоны: горит каждую свечу под чертой»;
- `.shift(-1)` → «Заглядывание в будущее: следующей свечи ещё нет (1.7, FT-11)»;
- `>` вместо `>=` → «Почти: при RSI ровно 35 на прошлой свече пересечение не засчитается. В уроке — `>=`». Не засчитывать, дать исправить;
- `|` вместо `&` → «ИЛИ снова превращает условие в зону»;
- незакрытые скобки → «Каждое сравнение — в своих скобках: иначе Python поймёт `&` не так, как ты думаешь».
После правильной сборки — кнопка «Прогнать моё условие на сценарии Б» → результат совпадает с «пересечением» → `mastery_passed`, следующий блок урока открыт. Три неверные попытки подряд → подсказка-схема «сегодня в зоне И вчера ещё не был» без готового ответа.

**Этап 4 — Итог.**
- Сверка с предсказанием.
- Три буллета:
  1. «Условие входа считается заново на каждой закрытой свече. `rsi < 35` = сигнал каждую свечу в зоне».
  2. «Пока сделка открыта, лишние сигналы блокирует движок. Опасность — повторные входы после каждого выхода в том же движении».
  3. «Пересечение = «сегодня в зоне, а вчера ещё нет» — один вход на одно движение».
- Фрагмент кода стратегии с правильным условием (как в уроке, с `volume > 0` и EMA-фильтром) и ссылка «дальше: FT-05 (2) — порядок событий: свеча → сигнал → open t+1».

### 2.7. Реализация

- Модуль `zone_cross_sim` (чистые функции): `computeSignals(rsi, mode)`, `runEngine(candles, signals, {stopPct, stake, maxOpenTrades, pairs: 3})` → лента событий по свечам `{t, signal, action: 'entry'|'blocked_pair'|'blocked_slot'|'exit_signal'|'exit_stop', price, pnl}` и агрегаты. Проигрыватель E3 лишь визуализирует ленту, никаких вычислений в UI.
- Стоп проверяется на свече входа включительно; выход по сигналу/стопу освобождает слот в той же свече; новый вход возможен не раньше `t+1`.
- Отклонение «нет слота» реализовать и протестировать искусственно (юнит-тест с `maxOpenTrades = 2`): ожидаемо SOL не получит слот на свече 8.
- Парсер конструктора: токены → AST; сравнение с целевым AST с нормализацией порядка операндов `&`.
- Точность денег: округление до 0,1 USDT в отображении, полная точность внутри.

### 2.8. Приёмочные тесты

1. Все числа раздела 2.4 воспроизводятся (сигналы, сделки, стопы, цены входов/выходов, PnL ±0,5 USDT).
2. Сценарий А: оба условия дают идентичный список сделок.
3. Сценарий Б, «зона», BTC: входы по 96,9 / 86,5 / 77,5 / 70,0; стопы в свечах 14 / 20 / 25.
4. Занятость слотов по свечам совпадает с таблицей 2.4.
5. Ставка 150: Б зона ≈ −138, пересечение −45.
6. Конструктор: `(rsi.shift(1) >= 35) & (rsi < 35)` принимается; `(rsi < 35) & (rsi.shift(1) > 35)` — нет, с нужным сообщением; `(rsi < 35) & (rsi.shift(-1) >= 35)` — сообщение об утечке.
7. Без предсказания в Этапе 0 симуляция не запускается; без пройденного конструктора следующий блок урока не открывается.
8. Попап «Что видел бот» показывает `rsi`, `rsi.shift(1)`, оба условия с булевым результатом и действие движка для текущей свечи.
9. Все английские идентификаторы (`rsi`, `shift`, `enter_long`, `open`, `low`, `stoploss`, `max_open_trades`, названия пар) — чипы-термины с русскими карточками.
10. При `prefers-reduced-motion` автопроигрывание выключено, доступен только пошаговый режим.

### 2.9. Что НЕ делать

- Не вводить position stacking и не показывать несколько одновременных сделок по одной паре.
- Не сравнивать условия по доходности в сценарии А (она одинакова) — акцент на счётчиках сигналов и на сценарии Б.
- Не добавлять ROI-лестницу и трейлинг: они появятся в FT-17; здесь выход только по сигналу RSI>50 и по стопу.
- Не выводить «а если по close t?» — это отдельный интерактив FT-05 (2).

---

## 3. Словарь терминов для режима «Ткни в непонятное» (общий для обоих)

| Термин (чип) | Русское название | Карточка (одна фраза + пример) | Где объяснено |
|---|---|---|---|
| `dry_run_wallet` | Кошелёк песочницы | Виртуальные USDT для режима без реальных денег. Пример: 1000 | FT-04 |
| `max_open_trades` | Слоты (число одновременных сделок) | Сколько позиций бот может держать разом. Пример: 3 | FT-04 |
| `stake_amount` | Ставка на сделку | Сколько USDT кладётся в одну позицию; `"unlimited"` — доступный баланс ÷ слоты | FT-04 |
| `unlimited` | «Без ограничения» | Не «безопасно», а формула: 990 / 3 = 330 | FT-04 |
| `tradable_balance_ratio` | Доля оборотного баланса | Какая часть кошелька доступна боту; 0,99 — резерв 1% на комиссии | FT-17 |
| `stoploss` | Стоп-лосс | Максимальный убыток позиции; −0,10 = −10 %. Задаётся в стратегии | FT-05, FT-17 |
| `pair_whitelist` | Белый список пар | Что бот торгует: BTC/USDT, ETH/USDT, SOL/USDT | FT-04 |
| `rsi` | Индекс относительной силы | Индикатор 0–100; ниже 35 — «перепродано» | FT-05 |
| `.shift(1)` | Значение прошлой свечи | «Что было вчера»: `rsi.shift(1)` — RSI предыдущей свечи | Py-05, 1.6 |
| `.shift(-1)` | Значение следующей свечи | Заглядывание в будущее — запрещено | 1.7, FT-11 |
| `&` | И (для столбцов) | Оба условия должны быть истинны; каждое — в скобках | Py-04, FT-07 |
| `enter_long` | Сигнал входа | Колонка стратегии: 1 — «хочу купить на этой свече» | FT-05 |
| `open` / `close` / `low` | Цена открытия / закрытия / минимум свечи | Сигнал считается по `close` свечи t, вход — по `open` свечи t+1, стоп — если `low` коснулся уровня | 0.7, FT-05, FT-09 |
| `volume` | Объём | Фильтр `volume > 0` отсекает артефакты данных | FT-05 |
| Одна сделка на пару | Правило движка | По умолчанию Freqtrade не открывает вторую сделку по паре, пока первая не закрыта | FT-06 |
| `StoplossGuard` | Защита от серии стопов | Пауза входов после N стопов за окно; лечит симптом, не причину | FT-17 |
| USDT | Стейблкоин-доллар | Валюта котировки и ставки в конфиге | 0.10 |


--------------------

# ТЗ для агента-реализатора: два интерактива урока FT-05 / FT-06

Ниже — детальные спецификации двух интерактивов, построенных на общем движке **E3 «Плёнка бэктеста»**. Сначала описан общий движок (то, что делается один раз), затем каждый интерактив отдельно. Все тексты интерфейса даны на русском и готовы к вставке. Любой английский токен в интерфейсе обязан быть кликабельным (режим «Ткни в непонятное») — словарь приложен в конце.

---

## 0. Общий контекст и ограничения

| Параметр | Значение |
|---|---|
| Аудитория | Русскоязычный новичок без английского и без программирования |
| Сквозной герой | Алексей, депозит 1000 $ (dry_run_wallet = 1000, max_open_trades = 3, stake_amount = unlimited → ≈330 $ на сделку — цифры из FT-04) |
| Стратегия | `TutorialEmaRsi` из FT-05: таймфрейм 1h, EMA16/EMA200, RSI14, вход при пересечении RSI порога 35 сверху вниз, stoploss −10 %, ROI {0: 6 %, 240 мин: 2 %} |
| Биржа/комиссии | Binance spot, комиссия 0,1 % (число из FT-04) |
| Таймаут заявки | `unfilledtimeout` = 10 минут (значение по умолчанию Freqtrade; упоминается в FT-04) |
| Источник «250 сделок» | арифметика издержек из FT-13 |
| Платформа | Веб (браузер), адаптив от 360 px, без серверной части; состояние — в localStorage |
| Доступность | Управление с клавиатуры (← → пробел), режим «меньше анимации» (prefers-reduced-motion → все переходы мгновенные, кадры листаются вручную) |

**Единый набор свечей** для обоих интерактивов (BTC/USDT, 1h, время UTC). Значения RSI и флаг тренда предрасчитаны и хранятся в данных (пересчитывать RSI в браузере не нужно — для расчёта RSI14 требуется скрытая история, а мы показываем только окно).

```json
{
  "pair": "BTC/USDT",
  "timeframe": "1h",
  "fee_pct": 0.1,
  "stake_usdt": 330,
  "candles": [
    {"i": -3, "t": "11:00", "open": 65400, "high": 65520, "low": 65210, "close": 65300, "volume": 380, "rsi": 44, "ema_fast": 65010, "ema_slow": 63820, "trend_up": true},
    {"i": -2, "t": "12:00", "open": 65300, "high": 65380, "low": 64900, "close": 64950, "volume": 405, "rsi": 40, "ema_fast": 64980, "ema_slow": 63840, "trend_up": true},
    {"i": -1, "t": "13:00", "open": 64950, "high": 65050, "low": 64600, "close": 64700, "volume": 398, "rsi": 37, "ema_fast": 64930, "ema_slow": 63860, "trend_up": true},
    {"i":  0, "t": "14:00", "open": 64700, "high": 64760, "low": 64050, "close": 64180, "volume": 412, "rsi": 33, "ema_fast": 64820, "ema_slow": 63880, "trend_up": true, "signal_dip": true},
    {"i":  1, "t": "15:00", "open": 64180, "high": 64900, "low": 64090, "close": 64430, "volume": 455, "rsi": 36, "ema_fast": 64760, "ema_slow": 63900, "trend_up": true},
    {"i":  2, "t": "16:00", "open": 64430, "high": 64900, "low": 64400, "close": 64850, "volume": 420, "rsi": 41, "ema_fast": 64770, "ema_slow": 63920, "trend_up": true},
    {"i":  3, "t": "17:00", "open": 64850, "high": 65300, "low": 64800, "close": 65240, "volume": 470, "rsi": 47, "ema_fast": 64830, "ema_slow": 63940, "trend_up": true, "signal_breakout": true},
    {"i":  4, "t": "18:00", "open": 65240, "high": 65700, "low": 65150, "close": 65610, "volume": 510, "rsi": 52, "ema_fast": 64930, "ema_slow": 63960, "trend_up": true},
    {"i":  5, "t": "19:00", "open": 65610, "high": 66010, "low": 65500, "close": 65900, "volume": 530, "rsi": 56, "ema_fast": 65050, "ema_slow": 63980, "trend_up": true},
    {"i":  6, "t": "20:00", "open": 65900, "high": 66100, "low": 65650, "close": 65720, "volume": 460, "rsi": 53, "ema_fast": 65130, "ema_slow": 64000, "trend_up": true},
    {"i":  7, "t": "21:00", "open": 65720, "high": 65800, "low": 64900, "close": 65000, "volume": 610, "rsi": 46, "ema_fast": 65120, "ema_slow": 64020, "trend_up": true}
  ]
}
```

Внимание агенту: `"t"` — время **открытия** свечи. Свеча `i = 0` (14:00) закрывается в **15:00:00**. Во всех подписях пользователю показывать именно момент закрытия («свеча t закрылась в 15:00»).

Обозначения в интерфейсе: свеча сигнала — **t**, следующая — **t+1** и т. д. Русская подсказка при наведении на «t»: «t — просто номер свечи. t — та, на которой появился сигнал; t+1 — следующая за ней».

---

## 1. Движок E3 «Плёнка бэктеста» (общий компонент)

### 1.1. Назначение
Покадровое воспроизведение событий вокруг свечей с масками «что видел бот в этот момент». Используется в FT-05 (2), FT-06, а далее в FT-09, FT-10, FT-15, 1.6, 1.7, ВК2. Реализовать **один раз**, сцены описываются данными.

### 1.2. Компонентная модель (React/TS-псевдоинтерфейс; допустима любая реактивная либа, но контракт данных сохранить)

```ts
type Candle = { i: number; t: string; open: number; high: number; low: number; close: number;
                volume: number; rsi?: number; ema_fast?: number; ema_slow?: number; trend_up?: boolean };

type Marker = {
  id: string;
  kind: 'signal' | 'order' | 'fill' | 'trade' | 'exit' | 'note';
  candleIndex: number;          // к какой свече привязан
  anchor: 'close' | 'open' | 'inside' | 'span'; // где рисуется
  spanTo?: number;              // для kind='trade' — до какой свечи тянется полоса
  price?: number;               // отметка цены (горизонтальная пунктирная)
  label: string;                // русская подпись
  tone: 'neutral' | 'good' | 'bad' | 'warn';
};

type Frame = {
  id: string;
  cursorCandle: number;         // до какой свечи включительно бот «видит» данные
  cursorPhase: 'forming' | 'closed';  // свеча cursorCandle ещё идёт или уже закрыта
  clock: string;                // строка времени на табло, напр. "15:00:03"
  visibleMarkers: string[];     // какие маркеры показаны
  botPanel: BotPanelState;      // что показывает «голова бота»
  narration: string;            // текст под лентой, 1–3 предложения
  highlightPrices?: { candleIndex: number; field: 'open'|'close'|'high'|'low'; label: string }[];
  autoAdvanceMs?: number;       // для автоплея; если нет — только ручной шаг
};

type BotPanelState = {
  status: 'sleep' | 'compute' | 'decide' | 'send' | 'wait' | 'done';
  rows?: { label: string; value: string; ok?: boolean }[];   // чипы условий, значения индикаторов
};

type Scene = {
  id: string; title: string; candles: Candle[]; markers: Marker[]; frames: Frame[];
  glossaryTags: string[];  // какие термины подсветить
};
```

### 1.3. Слои экрана (сверху вниз)
1. **Табло времени** (слева) + **статус бота** (справа): иконка бота с подписью состояния («спит», «считает», «решает», «отправил заявку», «ждёт исполнения», «сделка открыта»).
2. **Лента свечей.** Свечи правее `cursorCandle` затемнены (маска «будущее») с подписью на маске: «Этого бот ещё не видит». Свеча `cursorCandle` в фазе `forming` рисуется полупрозрачной, пульсирующей, с подписью «свеча идёт».
3. **Дорожка событий** под лентой: четыре полосы «Сигнал / Заявка / Исполнение / Сделка» — маркеры ставятся на свою полосу над соответствующей свечой. Именно эта дорожка визуально разносит четыре события по времени.
4. **Панель бота** (карточка «Что видит бот»): чипы условий и значения индикаторов.
5. **Строка наррации** (крупный текст, 1–3 предложения).
6. **Управление:** «◀ Назад», «Шаг ▶», «▶▶ Авто», «⏸», ползунок скорости (×0,5 / ×1 / ×2), кнопка «Что видел бот в этот момент?» (усиливает маску: всё правее курсора скрывается полностью, панель бота разворачивается).

### 1.4. Поведение
- Кадры листаются строго последовательно; переход назад разрешён.
- В режиме «Авто» кадр держится `autoAdvanceMs` (по умолчанию 2 500 мс), при `prefers-reduced-motion` авто отключён.
- Маркер появляется с короткой анимацией «падает на полосу» (200 мс); при reduced-motion — мгновенно.
- Все числа цен показываются с пробелом-разделителем тысяч и знаком «$»: `64 180 $`.
- Любой английский токен в чипах (`enter_long`, `rsi`, `open`) рендерится через компонент `<Term key="enter_long">` — подчёркнутый пунктиром, по клику всплывает карточка из словаря (раздел 4).

### 1.5. Хуки для других движков
- `onFrame(frameId)` — телеметрия.
- `onComplete()` — вызывает проверку критерия освоения и предложение записать строку в журнал (E5), если E5 подключён; иначе показывает текст-итог.

---

## 2. Интерактив FT-05 (2) «Порядок событий: свеча → сигнал → open t+1»

### 2.1. Карточка интерактива

| Поле | Значение |
|---|---|
| ID | `ft05_event_order` |
| Тип | АНИМ (с одним интерактивным элементом — кнопка-эксперимент) |
| Урок | FT-05, блок «Как движок переваривает твои колонки», размещается сразу после кода стратегии |
| Заблуждение, которое ломаем | «Сигнал и исполнение — это одна цена и один момент» |
| Целевая мысль на выходе | «Сигнал рождается на закрытии свечи t. Сделка открывается на свече t+1 по другой цене. Если бэктест «торгует» свечу сигнала — он подглядывает, и результат фантомный» |
| Время прохождения | 3–4 минуты |
| Зависимости | E3; словарь терминов |
| Критерий освоения | Прошёл все кадры **и** правильно ответил на контрольный вопрос в конце (см. 2.6) |

### 2.2. Макет
Стандартный макет E3 (раздел 1.3). Дополнительно под управлением — кнопка-эксперимент **«А если по close t?»** (неактивна, пока не дойдёт до кадра 6). После нажатия под лентой раскрывается **Панель фантома** (2.5).

### 2.3. Маркеры сцены

| id | kind | свеча | anchor | price | label | tone |
|---|---|---|---|---|---|---|
| m_signal | signal | 0 | close | 64 180 | Сигнал (enter_long = 1) | warn |
| m_order | order | 1 | open | 64 180 | Заявка отправлена | neutral |
| m_fill | fill | 1 | open | 64 185 | Исполнено 64 185 $ | good |
| m_trade | trade | 1 → 5 | span | — | Сделка открыта | good |
| m_exit | exit | 5 | open | 65 610 | Выход по ROI +2 % | good |
| m_naive_entry | note | 0 | open | 64 700 | Наивный бэктест: «вход» здесь | bad |
| m_stop | note | — | — | 57 767 | Стоп −10 % (57 767 $) | bad (показывается тонкой линией с кадра 7) |

### 2.4. Кадры (обязательная последовательность)

| № | id | cursor | clock | Статус бота / панель | Наррация (текст 1:1) | Маркеры |
|---|---|---|---|---|---|---|
| 0 | f0_forming | 0, forming | 14:40:00 | «спит». Панель: «Свеча t идёт (14:00–15:00). Заявок нет. Бот получит эту свечу только после её закрытия». Дополнительная строка-ловушка: «RSI по незакрытой свече сейчас 31 — но это число ещё меняется. Freqtrade его стратегии **не показывает**» | Свеча t ещё не закрылась. Внутри свечи бот не считает и не торгует: он видит только закрытые свечи. Всё, что правее, — будущее. | — |
| 1 | f1_closed | 0, closed | 15:00:00 | «проснулся». Панель: «Свеча t закрылась: open 64 700 → close 64 180 (−0,80 %)» | Свеча t закрылась ровно в 15:00. Теперь её четыре числа — факт. Бот берёт всю историю до этой свечи включительно. | m_signal (пока без флажка, только подсветка close) |
| 2 | f2_indicators | 0, closed | 15:00:02 | «считает». Панель (rows): `ema_fast` = 64 820; `ema_slow` = 63 880; `rsi` (свеча t) = 33; `rsi` (свеча t−1) = 37; `volume` = 412 | Индикаторы пересчитаны по закрытым свечам. RSI упал с 37 до 33 — прошёл порог 35 сверху вниз. | — |
| 3 | f3_conditions | 0, closed | 15:00:02 | «решает». Панель-чипы, каждый загорается зелёным по очереди: `ema_fast > ema_slow` ✓ (тренд вверх); `rsi < 35` ✓ (33); `rsi.shift(1) >= 35` ✓ (37 — свеча назад); `volume > 0` ✓ → итог: `enter_long = 1` на свече t | Все четыре условия входа истинны. В колонке enter_long у свечи t появилась единица. Это и есть сигнал. Обрати внимание: сигнал — это число в таблице, а не сделка. | m_signal с флажком «Сигнал» на полосе «Сигнал» над свечой t |
| 3b | f3b_why_not_earlier | 0, closed | 15:00:02 | Панель: «Почему не на свече t−1? RSI = 37 — условие rsi < 35 ложно. Почему не внутри свечи t? Бот её не видел». | Сигнал мог появиться только здесь и только сейчас. Ни раньше (условие не выполнялось), ни внутри свечи (бот её не видел). | — |
| 4 | f4_order | 1, forming | 15:00:03 | «отправил заявку». Панель: «Открылась свеча t+1. Цена открытия open(t+1) = 64 180 $. Заявка: лимит по лучшей цене продавца — 64 185 $. Размер: 330 $ (1000 $ ÷ 3 слота)». Бегунок задержки 0,3 с | Только с открытием следующей свечи бот отправляет заявку. Между сигналом и заявкой прошли секунды и сменилась свеча. | m_order на полосе «Заявка» над свечой t+1 |
| 5 | f5_fill | 1, forming | 15:00:04 | «ждёт исполнения» → «сделка открыта». Панель: «Исполнено: 0,005141 BTC по 64 185 $. Комиссия 0,1 % = 0,33 $». | Биржа исполнила заявку по 64 185 $ — на 5 $ выше цены закрытия свечи сигнала (это спред, урок 0.4). Сигнал был на свече t по 64 180. Сделка — на свече t+1 по 64 185. Две разные свечи, две разные цены. | m_fill на полосе «Исполнение»; начало m_trade на полосе «Сделка» |
| 6 | f6_summary | 1, forming | 15:00:04 | Панель: сводная таблица «Событие → Свеча → Цена»: Сигнал → t → 64 180 (close); Заявка → t+1 → 64 185 (лимит); Исполнение → t+1 → 64 185; Сделка → с t+1 | Запомни порядок: закрылась свеча → посчитали → сигнал → открылась следующая → заявка → исполнение → сделка. Кнопка «А если по close t?» ниже покажет, что будет, если этот порядок нарушить. | Активируется кнопка эксперимента |
| 7 | f7_epilogue (авто-прокрутка t+2…t+5) | 5, closed | 19:00:00 | «сопровождает сделку». Панель: «Стоп −10 % = 57 767 $ (не задет). Через 240 минут в сделке цель ROI = +2 % → 65 469 $. Свеча t+5 открылась выше цели — выход по 65 610 $». | Дальше сделку ведут правила выхода: стоп и лестница ROI (подробно — FT-17). Итог этой сделки: +2,22 % до комиссий, ≈ +2,02 % после, +6,67 $ на 330 $. | m_trade растянут до t+5; m_exit; m_stop |

Формулы для табло (считать в коде, не хардкодить):
- количество = 330 / 64 185 = 0,005141 BTC;
- цель ROI после 240 мин = 64 185 × 1,02 = 65 468,7 → показывать 65 469 $;
- брутто = 65 610 / 64 185 − 1 = 2,220 %; нетто = брутто − 0,2 % (два плеча комиссии) = 2,02 %; в долларах = 330 × 0,0202 = 6,67 $.

### 2.5. Кнопка «А если по close t?» → Панель фантома

**Смысл эксперимента.** Показать, что происходит, если «сделка» ставится на ту же свечу, где родился сигнал (в коде это `pos = signal` без `.shift(1)` из урока 1.6, либо чтение `close` незакрытой свечи). Такой бэктест засчитывает позиции движение свечи t — движение, которое **и вызвало** сигнал.

Панель имеет два режима (переключатель-сегмент вверху панели):

**Режим 1 — «Наша стратегия: вход на откате»** (по умолчанию)
- На ленте появляется m_naive_entry: красная точка на **open свечи t = 64 700 $** с подписью «Наивный бэктест «вошёл» здесь — до того, как сигнал существовал».
- Таблица:

| | Честно (Freqtrade) | Наивно («по свече сигнала») |
|---|---|---|
| Свеча входа | t+1 | t |
| Цена входа | 64 185 $ | 64 700 $ |
| Выход (одинаковый) | 65 610 $ | 65 610 $ |
| Результат до комиссий | +2,22 % | +1,41 % |
| Разница | | **−0,81 п.п.** |

- Подпись: «Для стратегии на откате наивный бэктест **занизил** результат: он посадил тебя в падающую свечу t, хотя в жизни сигнал появился только после её закрытия. Знак ошибки минус — но это всё равно ошибка: результат не про реальные сделки».

**Режим 2 — «Тот же баг на стратегии пробоя»** (кнопка-переключатель «А если сигнал — пробой?»)
- Сигнал пробоя определяем просто: «закрытие свечи выше максимума предыдущей». Он срабатывает на свече t+3 (close 65 240 > high(t+2) 64 900). Маркер сигнала переезжает на t+3; честный вход — open(t+4) = 65 240 (+5 $ спред → 65 245 $); наивный — open(t+3) = 64 850 $; выход для сравнения фиксирован: 65 900 $ (open t+6).

| | Честно | Наивно |
|---|---|---|
| Свеча входа | t+4 | t+3 |
| Цена входа | 65 245 $ | 64 850 $ |
| Выход | 65 900 $ | 65 900 $ |
| Результат до комиссий | +1,00 % | +1,62 % |
| Фантом | | **+0,62 п.п.** |

- Ниже — **счётчик масштаба** (анимируется от 1 до 250 за 1,5 с): «Одна сделка: +0,62 п.п. фантома = 2,05 $ на 330 $. Стратегия делает 250 сделок за 1,5 года (FT-13): 250 × 2,05 $ ≈ **511 $** — половина депозита Алексея нарисована, а не заработана».
- Финальная подпись панели (одинаковая для обоих режимов): «Знак фантома зависит от типа сигнала. Сам фантом появляется всегда, когда сделка приписана свече сигнала. В уроке 1.7 такая ошибка превращала Шарп 9,8 в −0,42. В FT-11 ты научишься ловить её автоматически: `lookahead-analysis`».

### 2.6. Контрольный вопрос (после кадра 7, обязателен для зачёта)
Текст: «Сигнал появился на свече t с ценой закрытия 64 180 $. По какой цене и на какой свече Freqtrade откроет сделку в бэктесте?»
- A. На свече t по 64 180 $ — сигнал и сделка совпадают
- B. На свече t по 64 700 $ — по цене её открытия
- **C. На свече t+1 по цене её открытия — сигнал считается по закрытой свече, сделка идёт на следующей**
- D. Внутри свечи t, как только RSI стал ниже 35

Обратная связь при ошибке (без раскрытия правильного до второй попытки):
- A: «Закрытие свечи t бот узнаёт, когда свеча уже закрылась. Торговать «по close t» в этот момент нельзя — торги уже идут на свече t+1. Вернись к кадру 4».
- B: «Так делает наивный бэктест из панели фантома: он приписывает сделку свече, где родился сигнал. Freqtrade так не делает».
- D: «Внутри свечи t стратегия её не видит: Freqtrade отдаёт только закрытые свечи (кадр 0)».

Зачёт: ответ C с первой или второй попытки. При двух ошибках — показать разбор и перевести на кадр 4 с автоплеем.

### 2.7. Обязательные состояния и граничные случаи
- Пока не пройден кадр 6, кнопка «А если по close t?» показана, но неактивна с подсказкой «Досмотри до сводки».
- Переключение режимов панели фантома не сбрасывает кадр.
- Повторный вход: если интерактив уже пройден — открывать сразу кадр 6 с кнопкой «Пройти сначала».
- Ширина < 480 px: полосы событий сворачиваются в одну полосу с цветными маркерами и легендой; панель бота — аккордеон под лентой.

### 2.8. Телеметрия
`ft05_event_order.frame_viewed {frameId}`, `.phantom_opened {mode}`, `.mode_switched`, `.quiz_answered {choice, attempt}`, `.completed {durationSec}`. Цель по метрике курса: доля правильного ответа C с первой попытки — растёт от когорты к когорте.

### 2.9. Приёмочные тесты
1. Последовательный проход всех кадров кнопкой «Шаг»; на каждом кадре маска закрывает свечи правее курсора.
2. На кадре 0 маска показывает свечу t полупрозрачной; в панели виден текст про RSI 31 незакрытой свечи.
3. На кадре 3 все четыре чипа зелёные, значение `rsi.shift(1)` = 37.
4. На кадре 5 цена исполнения 64 185, а цена закрытия сигнала 64 180 подсвечена отдельно; количество BTC = 0,005141 (±0,000001).
5. Панель фантома, режим 1: разница −0,81 п.п.; режим 2: фантом +0,62 п.п., итог счётчика 511 $ (±2 $).
6. Контрольный вопрос: зачёт только при C; обратная связь соответствует таблице.
7. При `prefers-reduced-motion` авто отключён, переходы мгновенные, функциональность полная.
8. Каждый токен из списка `enter_long, rsi, ema_fast, ema_slow, volume, shift, open, close, high, low, ROI, stoploss, lookahead-analysis` открывает карточку словаря.

---

## 3. Интерактив FT-06 «Четыре шага одной сделки»

### 3.1. Карточка интерактива

| Поле | Значение |
|---|---|
| ID | `ft06_four_steps` |
| Тип | ТРН (тренажёр) с элементом ИГР (сценарии с предсказанием) |
| Урок | FT-06, после блока «Подробнее», перед «Глубже» |
| Заблуждение | «Сигнал был = сделка открылась» |
| Целевая мысль | «Между сигналом и сделкой стоят заявка и исполнение. Заявка может исполниться полностью, частично, по другой цене или отмениться. Бэктест схлопывает четыре события в одно — поэтому он расходится с жизнью» |
| Время | 6–8 минут |
| Зависимости | E3 (лента, маркеры, маска), drag&drop-компонент, словарь; опционально E5 (журнал) |
| Критерий освоения | (а) расстановка карточек с ≤ 2 ошибками; (б) верные предсказания в ≥ 3 из 4 сценариев; (в) правильный финальный ответ |

### 3.2. Структура: три части подряд
1. **Часть А «Расставь четыре события»** — drag&drop карточек на временную линию.
2. **Часть Б «Что случилось с заявкой?»** — 4 сценария (+1 бонусный), в каждом ученик предсказывает исход, затем смотрит анимацию факта.
3. **Часть В «Что схлопнул бэктест»** — сравнение реальности с бэктестом по всем сценариям, счёт совпадений, финальный вопрос.

Данные — те же свечи (раздел 0). Фокус — свеча t (закрылась 15:00:00) и свеча t+1 (15:00–16:00: open 64 180, high 64 900, low 64 090, close 64 430).

### 3.3. Часть А — временная линия и карточки

**Экран.** Сверху — лента E3 из трёх свечей (t−1, t, t+1) и полосы «t+2 … t+5» справа, маска будущего отключена (здесь ученик расставляет, а не смотрит глазами бота). Под лентой — **временная линия с пятью слотами** (широкие зоны с пунктирной рамкой):

| Слот | Подпись на слоте | Время | Что должно лежать |
|---|---|---|---|
| A | «Внутри свечи t» | 14:40 | *ничего* (ловушка) |
| B | «Свеча t закрылась» | 15:00:00 | Сигнал |
| C | «Открылась свеча t+1» | 15:00:03 | Заявка |
| D | «Секунды… минуты после (до 15:10 — срок жизни заявки)» | 15:00:04 → 15:10 | Исполнение |
| E | «Часы: свечи t+1 … t+5» | 15:00 → 19:00 | Сделка |

Внизу — **колода из четырёх карточек** (перемешаны при каждом запуске):
- **«Сигнал»** — подпись мелко: «число 1 в колонке enter_long»
- **«Заявка»** — «приказ бирже: купить по 64 185 $, 330 $»
- **«Исполнение»** — «биржа реально купила: сколько и по чём»
- **«Сделка»** — «открытая позиция, которую ведут стоп и ROI»

Каждая карточка на обороте (по клику «?») — одно предложение и русская расшифровка английского термина.

**Механика.** Перетаскивание (мышь/тач; альтернатива для клавиатуры: выбрать карточку → выбрать слот из списка). Проверка происходит **сразу при бросании**: правильно — карточка фиксируется, слот зеленеет, короткая реплика; неправильно — карточка отпрыгивает обратно, показывается объяснение, счётчик ошибок +1. Ученик не может перейти к части Б, пока все четыре карточки не легли.

**Тексты обратной связи (ошибки), формат «карточка → слот»:**

| Ошибка | Текст |
|---|---|
| любая → A | «Внутри незакрытой свечи бот ничего не делает. Freqtrade отдаёт стратегии только закрытые свечи. В 14:40 не существует ни сигнала, ни заявки — только идущая свеча». |
| Сделка → B | «Сделка не может появиться раньше заявки. На закрытии свечи t есть только число 1 в колонке enter_long — это сигнал, а не позиция». |
| Заявка → B | «Свеча t закрылась в 15:00:00, но заявку бот отправит только с открытием следующей свечи (через секунды). Заявка живёт на свече t+1». |
| Исполнение → B/C | «Исполнение — это ответ биржи, оно приходит после отправки заявки. Ещё нет заявки — нечему исполняться». |
| Сигнал → C/D/E | «Сигнал считается по закрытой свече t и появляется в момент её закрытия. Дальше он уже не «происходит» — он записан». |
| Сделка → C/D | «Сделка появляется, когда заявка исполнилась, и длится часами — пока её не закроют стоп, ROI или сигнал выхода. Ей нужен длинный слот». |
| Исполнение → E | «Исполнение — короткое событие (секунды, реже минуты). Длинная полоса — это уже жизнь сделки». |

**Тексты подтверждения (правильно):**
- Сигнал → B: «Да. Свеча закрылась → индикаторы → условия истинны → enter_long = 1».
- Заявка → C: «Да. Открылась t+1 — бот отправил приказ: купить 330 $ по 64 185 $».
- Исполнение → D: «Да. И вот тут начинается развилка: биржа может исполнить всё, часть, по другой цене — или не исполнить вовсе. Смотри часть Б».
- Сделка → E: «Да. Сделка — это то, что живёт часами и что видно в /status».

По завершении части А: реплика «Четыре события — четыре разных момента времени. В бэктесте они схлопываются в один. Сейчас увидишь, что теряется».

### 3.4. Часть Б — сценарии «Что случилось с заявкой?»

Общие входные данные (показываются на карточке-шапке): «Сигнал на свече t. Заявка: **лимитная**, 64 185 $, размер 330 $ = 0,005141 BTC. Срок жизни заявки (`unfilledtimeout`) — 10 минут. Свеча t+1 в итоге: open 64 180, low 64 090, high 64 900, close 64 430».

Каждый сценарий = **вопрос-предсказание → анимация факта → карточка итога**. Порядок фиксированный (от простого к сложному). Для каждого сценария ученик отвечает на две вещи:
1. «Сделка открылась?» — варианты: **Да, полностью / Да, частично / Нет**
2. «Цена входа?» — варианты: **64 185 $ / хуже 64 185 $ / сделки нет** (появляется после первого ответа)

Анимация факта строится на E3: курсор внутри свечи t+1 с минутной шкалой (15:00:00 → 15:10:00), маркеры «заявка», «исполнение», «отмена». Мини-стакан (3 уровня ask) справа для сценариев S2 и S4.

| Сценарий | Название | Что происходит (анимация) | Правильные ответы | Карточка итога |
|---|---|---|---|---|
| S1 | «Спокойный рынок» | 15:00:03 заявка → 15:00:04 в стакане на уровне 64 185 есть 0,02 BTC → исполнено 0,005141 BTC полностью | Да, полностью / 64 185 $ | «Сделка: 0,005141 BTC по 64 185 $, комиссия 0,33 $. Так выглядит случай, который бэктест описывает верно». |
| S2 | «В стакане мало» | 15:00:03 заявка → на уровне 64 185 всего 0,003 BTC → исполнено 0,003 BTC (192,56 $); остаток 0,002141 BTC ждёт → цена уходит к 64 300 → 15:10:03 остаток отменён по таймауту | Да, частично / 64 185 $ | «Сделка открыта, но на 193 $ вместо 330 $ (−42 % размера). Freqtrade оставляет частично исполненную позицию и снимает остаток. Прибыль по этой сделке будет на 42 % меньше, чем в бэктесте». |
| S3 | «Цена ушла» | 15:00:03 заявка 64 185 → 15:00:20 цена 64 250 и выше, в окне до 15:10 минимум 64 210 → 15:10:03 заявка отменена по `unfilledtimeout` | Нет / сделки нет | «Сигнал был. Сделки нет. Свеча t+1 закрылась 64 430 (+0,39 % от 64 180): бэктест засчитал бы сделку и её прибыль — в жизни ты стоял в стороне». |
| S4 | «Рыночная заявка, тонкий стакан» | Настройка `order_types.entry = market`. 15:00:03 → съедает уровни: 0,002 BTC по 64 185, 0,002 по 64 215, 0,001141 по 64 250 → средняя 64 211 $ | Да, полностью / хуже 64 185 $ | «Исполнено всё, но по 64 211 $: проскальзывание 26 $ (0,04 %) плюс комиссия тейкера. Гарантия входа куплена ценой». |
| S5 (бонус, кнопка «Ещё один — ночной») | «Биржа не отвечает» | 15:00:03 отправка → ошибка биржи (перегрузка) → повтор через 5 с → снова ошибка → 15:00:18 успех, лимит по актуальной лучшей цене 64 195 → исполнено | Да, полностью / хуже 64 185 $ | «Сделка есть, но на 15 секунд позже и на 10 $ дороже. Такие ночи и ловит dry-run (FT-19)». |

**Логика подсчёта:** сценарий засчитан, если оба ответа верны. S5 в критерий не входит.

**Тексты при неверном предсказании** (короткие, показываются перед анимацией факта): «Твой прогноз: … Смотри, как было на самом деле» — без осуждения; после анимации — пояснение из карточки итога.

**Мини-стакан** (только S2, S4): три строки «цена — объём BTC», исполненные объёмы зачёркиваются по мере съедания.

### 3.5. Часть В — «Что схлопнул бэктест»

**Экран.** Слева — «Реальность» (четыре события на своих местах, как расставил ученик в части А). Справа — «Бэктест». Кнопка **«Показать глазами бэктеста»** запускает анимацию: четыре карточки «Заявка», «Исполнение», «Сделка» **съезжаются и сливаются в одну точку** на open свечи t+1 с подписью «Сделка открыта по open(t+1) = 64 180 $, полный размер, мгновенно». Карточка «Сигнал» остаётся на close(t). Под точкой — список того, чего в бэктесте нет: «нет задержки», «нет частичного исполнения», «нет таймаута», «нет проскальзывания», «цена всегда open(t+1)».

Ниже — **таблица сверки по сценариям**, заполняется построчно с задержкой 400 мс:

| Сценарий | Реальность | Бэктест | Совпало? |
|---|---|---|---|
| S1 Спокойный рынок | 330 $ по 64 185 $ | 330 $ по 64 180 $ | ✓ (разница 5 $ — спред) |
| S2 В стакане мало | 193 $ по 64 185 $ | 330 $ по 64 180 $ | ✗ размер −42 % |
| S3 Цена ушла | сделки нет | 330 $ по 64 180 $, +0,39 % за свечу | ✗ сделки не было |
| S4 Рыночная заявка | 330 $ по 64 211 $ | 330 $ по 64 180 $ | ✗ цена хуже на 31 $ |

Счётчик крупно: **«Бэктест верно описал 1 сценарий из 4»**.

Подпись: «Это и есть источник разрыва «бэктест — жизнь». В уроке 4.5 его меряют одним числом — Execution Deviation, отклонение исполнения. В FT-19 ты увидишь его на своём dry-run. Бэктест не врёт — он упрощает. Твоя задача — знать, что именно он упростил».

**Финальный вопрос (обязателен):**
«В логе бота ты видишь: «15:00:02 — сигнал enter_long BTC/USDT». Что ты знаешь наверняка?»
- A. Сделка открыта по 64 180 $
- B. Сделка открыта, но цена могла быть другой
- **C. Пока только то, что условия входа стали истинными. Была ли сделка — покажет журнал исполнений**
- D. Бот купит на следующей свече, потому что так делает бэктест

Обратная связь:
- A: «Ты перепутал сигнал с исполнением. Сценарий S3: сигнал был, сделки не было».
- B: «Уже ближе, но «открыта» — тоже не факт: заявка могла отмениться по таймауту (S3) или исполниться частично (S2)».
- D: «Бэктест — упрощённая модель. В жизни между сигналом и сделкой стоят заявка и исполнение, и они могут не случиться».

### 3.6. Итог и связка с журналом (E5)
После зачёта — карточка «Вывод», одна строка редактируемого текста по умолчанию: «FT-06: сигнал ≠ сделка. Между ними — заявка и исполнение. Сценарий, который меня удивил: ___». Кнопка «Записать в журнал экспериментов» (если E5 подключён) или «Скопировать».

### 3.7. Состояния, граничные случаи
- Прогресс частей А/Б/В сохраняется в localStorage; при возврате — продолжить с текущей части.
- В части А допускается «Подсказка» после 3-й ошибки: подсветить правильный слот для карточки в руке (засчитывается как ошибка).
- Часть Б: нельзя пропустить сценарий; можно пересмотреть анимацию факта.
- Узкий экран: слоты линии — вертикальный список; карточки — снизу в горизонтальном скролле; drag заменяется на «нажми карточку → нажми слот».
- Клавиатура: Tab по карточкам, Enter — взять, стрелки — выбрать слот, Enter — положить.

### 3.8. Телеметрия
`ft06_four_steps.card_dropped {card, slot, correct}`, `.partA_done {errors}`, `.scenario_answered {id, opened, price, correctBoth}`, `.partB_done {score}`, `.collapse_viewed`, `.final_answered {choice, attempt}`, `.completed {durationSec}`, `.journal_written`.

### 3.9. Приёмочные тесты
1. Все 7 типов ошибочных бросков из таблицы 3.3 выдают свой текст; правильные — фиксируются.
2. Бросок в слот A любой карточки отклоняется с текстом-ловушкой.
3. S2: отображаемый размер 192,56 $ (округление до 193 $ в итоговой карточке), остаток отменяется ровно на отметке 15:10:03.
4. S3: ни один маркер «исполнение» не появляется; финальный маркер «отменено по таймауту»; в карточке итога число +0,39 %.
5. S4: средняя цена 64 211 (±1 $), проскальзывание 26 $.
6. Часть В: счётчик «1 из 4»; таблица совпадает с 3.5.
7. Критерий освоения: партия А ≤ 2 ошибок, Б ≥ 3/4, В — ответ C; при невыполнении показывается предложение пройти проблемную часть заново, зачёт не ставится.
8. Клавиатурный сценарий проходит полностью без мыши.

---

## 4. Словарь «Ткни в непонятное» (минимальный набор для обоих интерактивов)

Формат карточки: заголовок — токен; строка 1 — «что это по-русски»; строка 2 — пример из этого интерактива; ссылка — урок, где термин объяснён впервые.

| Токен | По-русски | Пример здесь | Урок |
|---|---|---|---|
| `open` / `close` / `high` / `low` | цена открытия / закрытия / максимум / минимум свечи | close свечи t = 64 180 $ | 0.7 |
| `volume` | объём торгов за свечу | 412 BTC на свече t; фильтр volume > 0 отсекает битые свечи | 0.5, FT-05 |
| `rsi` | индекс силы: 0–100, ниже 35 — «перепродано» в этой стратегии | 37 → 33 = пересечение порога сверху вниз | FT-05 |
| `ema_fast` / `ema_slow` | быстрая (16 свечей) и медленная (200 свечей) скользящие средние | 64 820 > 63 880 — тренд вверх | Py-12, FT-05 |
| `shift(1)` | «сдвинуть на одну свечу назад»: взять значение предыдущей свечи | rsi.shift(1) = RSI свечи t−1 = 37 | 1.6, Py-05 |
| `enter_long` | колонка-сигнал на покупку: 1 — входить, 0 — нет | на свече t стала 1 | FT-05 |
| `stoploss` | стоп-лосс: максимальный убыток сделки | −10 % → 57 767 $ | FT-05, FT-17 |
| `minimal_roi` / ROI | лестница целей прибыли по времени в сделке | через 240 мин цель +2 % | FT-05, FT-17 |
| `unfilledtimeout` | срок жизни неисполненной заявки, после него бот её снимает | 10 минут → отмена в 15:10:03 | FT-04, FT-06 |
| `limit` / `market` | лимитная заявка (жди свою цену) / рыночная (купи сейчас по любой) | S1–S3 лимит по 64 185; S4 рыночная → 64 211 | 0.9 |
| `order_types` | настройка в конфиге: какими заявками входить/выходить | entry = market в сценарии S4 | FT-04 |
| `entry_pricing` / `order_book_top` | по какой цене стакана ставить лимит | лучшая цена продавца → 64 185 | FT-04 |
| `dry_run` | песочница: реальные цены, виртуальные деньги | депозит Алексея 1000 $ виртуальный | FT-01 |
| `/status` | команда Telegram-бота: показать открытые сделки | сделка видна в /status, сигнал — нет | FT-19 |
| `lookahead-analysis` | проверка Freqtrade на подглядывание в будущее | ловит ошибку «сделка на свече сигнала» | FT-11 |
| Execution Deviation | отклонение исполнения: на сколько факт разошёлся с бэктестом | S2: размер −42 %; S3: сделки нет | 4.5 |
| t / t+1 | номер свечи: t — свеча сигнала, t+1 — следующая | сигнал на t, сделка на t+1 | FT-05 |

Словарь — единый JSON на приложение; компонент `<Term>` берёт карточку по ключу; при отсутствии ключа — рендерить токен с пометкой (тест приёмки: нет ни одного токена без карточки).

---

## 5. Допущения и что зафиксировано осознанно

1. **Значения RSI и EMA в данных предрасчитаны**, а не вычисляются в браузере: для честного RSI14 нужна скрытая история, которая не показывается. В интерфейсе — подпись «значения индикаторов взяты из расчёта стратегии».
2. **Спред 5 $** между close(t) = 64 180 и лимитом 64 185 — иллюстративный, нужен, чтобы «сигнал» и «исполнение» имели разные числа даже в идеальном случае (S1). Не преувеличивать: подпись «спред, урок 0.4».
3. **Выход по ROI на open(t+5)** — упрощение механики ROI (Freqtrade проверяет цель по времени в сделке и цене свечи). В интерфейсе стоит слово «упрощённо» и ссылка на FT-17.
4. **«Наивный бэктест»** в панели фантома определён как «сделка на свече сигнала» (в коде — отсутствие `.shift(1)` или чтение незакрытой свечи). Для стратегии на откате он занижает результат, для пробоя — завышает; интерактив показывает оба знака намеренно, чтобы ученик усвоил: суть ошибки — нарушенный порядок событий, а не знак.
5. В сценарии S2 поведение «частичное исполнение → остаток снят по таймауту, позиция остаётся уменьшенной» соответствует стандартной логике Freqtrade; подпись «так ведёт себя Freqtrade по умолчанию».
6. Число «250 сделок за 1,5 года» — из FT-13; «330 $ на сделку» — из FT-04 (1000 $, 3 слота, unlimited). Не менять без изменения текста уроков.

---

## 6. Порядок сборки для агента

1. Реализовать E3 по разделу 1 (типы, слои, маска, маркеры, управление, reduced-motion, `<Term>`).
2. Собрать сцену `ft05_event_order` как данные (JSON кадров из 2.4) + панель фантома (2.5) + вопрос (2.6). Прогнать тесты 2.9.
3. Реализовать drag&drop-слой и сценарный плеер поверх E3; собрать `ft06_four_steps` (3.3–3.6). Прогнать тесты 3.9.
4. Подключить словарь (раздел 4), прогнать проверку «нет токена без карточки».
5. Подключить телеметрию и хук E5 (если E5 ещё нет — заглушка «Скопировать»).

-------------------------

# Спецификации для реализации: FT-08 (2) «Таймфрейм и статистика» и FT-09 «Прочитай отчёт в правильном порядке»

Ниже — два самостоятельных технических задания для агента-разработчика. Оба написаны так, чтобы их можно было отдать в работу без дополнительных уточнений: цель, педагогический сценарий, расчётная модель с константами (и ссылками на уроки, откуда числа взяты), экраны, состояния, тексты, критерии приёмки и тест-значения.

---

## Общие требования к обоим интерактивам

| # | Требование | Пояснение |
|---|---|---|
| О1 | **Одно заблуждение — один интерактив** | FT-08(2) ломает «5m = больше сделок = лучше». FT-09 ломает «первая строка Total profit решает всё». Ничего сверх этого не добавлять. |
| О2 | **Числа только из уроков** | Все константы ниже снабжены ссылкой на урок. Если агенту нужно новое число — оно помечается флагом `convention: true` и выносится в конфиг для утверждения методологом, а не зашивается. |
| О3 | **Русскоязычный новичок без английского** | Любой английский токен (`Sortino`, `fee`, `5m`, `Max open trades`) обязан иметь всплывающую русскую карточку по клику/тапу («Ткни в непонятное»). Словарь токенов — в разделе каждого ТЗ; хранится одним JSON на приложение (`glossary_ft.json`), чтобы FT-09 и будущий движок E8 использовали один источник. |
| О4 | **Персонаж Алексей** | Депозит 1000 $ / 1000 USDT (Py-14, FT-04: `dry_run_wallet: 1000`). Все сценарные тексты — от его лица или про него. |
| О5 | **Обратная связь — через ошибку** | Неверное действие не блокируется молча: показывается короткая причина (1–2 строки) и ссылка на урок. Ошибка учитывается в счётчике, но не наказывает «баллами» без объяснения. |
| О6 | **Сохранение состояния** | Прогресс и итоговый результат сохраняются в localStorage/профиле ученика под ключами `ft08_tf_stats` и `ft09_report_order`. |
| О7 | **Адаптивность** | Мобильная раскладка: панели складываются вертикально; слайдеры — с крупными хэндлами; таблицы — горизонтальная прокрутка. |
| О8 | **Аналитика** | События отправляются в общий трекер интерактивов (список событий — в каждом ТЗ). |
| О9 | **Без внешних вызовов** | Никаких запросов к биржам/API. Всё считается на клиенте. |
| О10 | **Визуальный стиль** | Как у существующих интерактивов приложения (цвета зон: красная — тревожная, жёлтая — пограничная, зелёная — рабочая, фиолетовая — «подозрительно хорошо», синяя — информационная). |

---

# ТЗ №1. FT-08 (2) «Таймфрейм и статистика»

## 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft08_tf_stats` |
| Тип | СИМ (симуляция с ползунками) + короткое задание на «сборку статистики» |
| Урок-хозяин | FT-08 «Исторические данные: скачивание, проверка и пропуски» |
| Место в уроке | Сразу после таблицы таймфреймов (5m…1d) и перед блоком «⚠ Важно: три классических греха» |
| Заблуждение | «Возьму 5m — там сделок больше, значит статистика надёжнее и стратегия лучше» |
| Связанные уроки | 1.8 (трение, 14–20 bps за круг), 1.9 (чем меньше сделок, тем шире доверительный интервал), 1.10 (минимум ~100 сделок), М30–М31 (стандартная ошибка σ/√n, ширина интервала ∝ 1/√n), М10 (независимость наблюдений), FT-04 (25–35 сделок за 3 месяца на 3 парах), FT-09 (зоны числа сделок), FT-13 (арифметика издержек: 0,1 % taker, 0,05 % проскальзывание на сторону) |
| Целевое время | 6–8 минут |
| Движки | Не требует E1–E8. Использует общий глоссарий `glossary_ft.json`. |

## 2. Педагогическая идея (что должен «увидеть» ученик)

Честная цепочка из трёх утверждений — ни одно нельзя пропустить, иначе получится либо ложь, либо непонимание:

1. **Да, больше сделок сужает доверительный интервал винрейта** — это правда, и симуляция обязана её показать (иначе ученик уличит курс в подтасовке).
2. **Но каждая сделка стоит одинаково (трение ~0,3 % за круг), а типичный ход одной свечи падает с уменьшением таймфрейма** (σ масштабируется как корень из длительности). На 5m трение *больше*, чем типичное движение свечи. Счёт за трение растёт линейно по числу сделок, а точность — только как корень.
3. **Статистику на 1h добирают историей и числом пар, а не спуском таймфрейма.** Это и есть задание в конце.

Мини-открытие, которое ученик должен вынести числом: **чтобы отличить винрейт 55 % от монетки (50 %), нужно ≈380 сделок** (при 95 % интервале). Отсюда — почему в FT-09 «рабочая зона» 80–400 и почему 30 сделок «ни о чём».

## 3. Расчётная модель

### 3.1. Входные параметры (органы управления)

| Параметр | Элемент | Диапазон / шаги | По умолчанию | Источник |
|---|---|---|---|---|
| `tf` | Ползунок с 6 фиксированными позициями | 5m · 15m · 30m · 1h · 4h · 1d | **1h** | Таблица FT-08 |
| `pairs` | Степпер | 1…5 | **3** | FT-04 (whitelist из 3 пар) |
| `window_months` | Ползунок с позициями | 3 · 6 · 12 · 18 · 24 · 36 | **3** | FT-08: «скачать 3 месяца… грех»; практика FT-08: 2,5–3 года |
| `signal_rate` | Три пресета + «свой» | Редкий 0,25 % · **Обычный 0,5 %** · Частый 1 % · свой 0,1–2 % | **0,5 %** («1 сигнал на 200 свечей») | Калибровано на FT-04: 1h, 3 пары, 3 мес → ≈33 сделки |
| `winrate_obs` | Ползунок | 45…65 %, шаг 1 | **55 %** | 1.10, 5.5, П53: винрейт 55 % — сквозной пример курса |
| `friction_round` | Отображается, редактируется в «Подробнее» | 0,1–1,0 %, шаг 0,05 | **0,30 %** = комиссия 0,1 %×2 + проскальзывание 0,05 %×2 | FT-13 |
| `sigma_daily` | Константа, в «Подробнее» | — | **3,5 %** | 1.2: «волатильность σ ≈ 3,5 %» дневных доходностей BTC |

### 3.2. Формулы

```
minutes_per_tf = {5m:5, 15m:15, 30m:30, 1h:60, 4h:240, 1d:1440}
candles_per_year(tf) = 525_600 / minutes_per_tf[tf]
    // 5m: 105 120 · 15m: 35 040 · 30m: 17 520 · 1h: 8 760 · 4h: 2 190 · 1d: 365
    // отображать округлённо как в уроке: ~105 000, ~35 000, ~8 760, ~2 190, ~365

candles_window = candles_per_year(tf) * window_months / 12
trades_window  = round(candles_window * signal_rate * pairs)        // грубая модель, подпись обязательна
trades_year    = candles_per_year(tf) * signal_rate * pairs

// Доверительный интервал винрейта (М31, нормальная аппроксимация)
p  = winrate_obs
se = sqrt(p * (1 - p) / trades_window)
half_width = 1.96 * se
ci = [p - half_width, p + half_width]                                 // в процентных пунктах
coin_indistinguishable = (p - half_width) < 0.50                      // «неотличимо от монетки»
n_needed_for_coin = ceil( p*(1-p) * (1.96 / (p - 0.50))^2 )           // при p=55% → 380

// Типичный ход одной свечи (√T-масштабирование σ, урок 1.2/1.3)
sigma_candle(tf) = sigma_daily * sqrt(minutes_per_tf[tf] / 1440)
    // 5m: 0,21% · 15m: 0,36% · 30m: 0,51% · 1h: 0,71% · 4h: 1,43% · 1d: 3,5%

friction_ratio = friction_round / sigma_candle(tf)
    // 5m: 1,46 · 15m: 0,84 · 30m: 0,59 · 1h: 0,42 · 4h: 0,21 · 1d: 0,09

// Годовой счёт за трение в % депозита.
// Допущение (подписать!): stake = депозит / pairs  (режим unlimited при max_open_trades = pairs, FT-04)
friction_bill_year_pct = trades_year * friction_round / pairs
    // не зависит от pairs при этом допущении — это надо показать текстом
```

Ограничение честности: подпись под моделью сделок — *«Грубая модель: сделка на каждой N-й свече, независимо от таймфрейма. В жизни на 5m сигналов ещё больше, а слоты max_open_trades заняты — то есть реальная картина для 5m только хуже по трению»*.

### 3.3. Зоны (цвет + подпись)

**Число сделок в окне** (FT-09, таблица «Сделок за 1,5 года»; расширено для окон другой длины):

| Диапазон | Цвет | Подпись |
|---|---|---|
| < 30 | красный | «Статистика ни о чём» (FT-09) |
| 30–79 | жёлтый | «Хватит только для первых выводов» (FT-04: 25–35 за 3 мес — минимум для первых выводов) |
| 80–400 | зелёный | «Рабочая зона» (FT-09) |
| > 400 | синий | «Статистики достаточно — теперь проверь трение» |

**Трение относительно хода свечи** (`friction_ratio`; `convention: true`, вывести в конфиг):

| Диапазон | Цвет | Подпись |
|---|---|---|
| ≤ 0,25 | зелёный | «Трение — малая часть хода свечи» |
| 0,25–0,60 | жёлтый | «Каждая четвёртая–вторая свеча уходит на оплату трения» |
| 0,60–1,00 | оранжевый | «Сделка живёт на волоске: один ход свечи ≈ комиссия» |
| > 1,00 | красный | «Трение больше, чем типичный ход свечи. Урок 0.18: казино в красивой обёртке» |

**Годовой счёт за трение** (1.8: 109,5 % депозита в год при 1 460 операций; 0.18: ~40 %):

| Диапазон | Цвет |
|---|---|
| ≤ 20 % депозита/год | зелёный |
| 20–50 % | жёлтый |
| > 50 % | красный «Стратегия обязана заработать это сверх рынка, просто чтобы остаться при своих (0.18)» |

## 4. Экран и раскладка

```
┌──────────────────────────────────────────────────────────────────────┐
│ Заголовок: «Таймфрейм и статистика: где ловушка в словах             │
│           „на 5m больше сделок“»                                      │
│ Подзаголовок-провокация (реплика Алексея, аватар):                    │
│ «Возьму 5m — там сделок в 12 раз больше, чем на 1h.                   │
│  Значит, и статистика в 12 раз надёжнее. Логично же?»                 │
├──────────────────────────────────────────────────────────────────────┤
│ ПУЛЬТ (липкий сверху на мобиле)                                       │
│  Таймфрейм  [5m ─ 15m ─ 30m ─ (1h) ─ 4h ─ 1d]                          │
│  Пар в списке  [−] 3 [+]     История для теста  [3 ─ 6 ─ 12 ─ 18 ─ 24 ─ 36 мес]│
│  Частота сигнала  (Редкий)(Обычный ●)(Частый)(свой ▾)                 │
│  Наблюдаемый винрейт  [45 ─── 55 ─── 65 %]                             │
│  ▸ Подробнее: трение за круг 0,30 % · σ дня 3,5 %                     │
├─────────────────────┬────────────────────────┬───────────────────────┤
│ ПАНЕЛЬ А            │ ПАНЕЛЬ Б               │ ПАНЕЛЬ В              │
│ «Сколько сделок     │ «Сколько стоит одна    │ «Счёт за трение       │
│  и что они доказыва-│  сделка на этом ТФ»    │  за год»              │
│  ют»                │                        │                       │
│ Свечей в год: 8 760 │ Типичный ход свечи:    │ Сделок в год: 131     │
│ Свечей в окне: 2 190│   0,71 %               │ × 0,30 % / 3 слота    │
│ Сделок в окне: ~33  │ Трение за круг: 0,30 % │ = 13 % депозита       │
│ [зона: жёлтая]      │ ────────────────────   │ [зона: зелёная]       │
│                     │ Гистограмма-«стакан»:  │ Столбик «съедено      │
│ Интервал винрейта   │ столбик хода свечи vs  │ трением» на фоне      │
│ (95 %):             │ столбик трения         │ депозита 1000 $       │
│  38 % ◄──55──► 72 % │ Отношение: 0,42        │ = 131 $ в год         │
│ линейка с зоной 50% │ [зона: жёлтая]         │                       │
│ «Неотличимо от      │                        │                       │
│  монетки»           │                        │                       │
├─────────────────────┴────────────────────────┴───────────────────────┤
│ СТРОКА ВЕРДИКТА (обновляется живьём, 3 строки)                        │
│ ① Точность: интервал ±17 пп — «неотличимо от монетки». Нужно ≈380     │
│   сделок, чтобы отличить 55 % от 50 %.                                │
│ ② Цена сделки: трение = 0,42 хода свечи.                              │
│ ③ Счёт за год: 13 % депозита — приемлемо.                             │
├──────────────────────────────────────────────────────────────────────┤
│ ЗАДАНИЕ (появляется на шаге 4): «Собери ≥100 сделок (лучше ≥380),     │
│ не поднимаясь выше 20 % депозита в год на трение, — БЕЗ 5m и 15m»     │
│ Прогресс: сделок 33/100 ▮▮▯▯▯  трение 13 %/20 % ▮▮▮▮▮▮▯               │
└──────────────────────────────────────────────────────────────────────┘
```

Панели Б и В до шага 2–3 скрыты за кнопками (см. сценарий) — чтобы ученик сначала «согласился с Алексеем», а потом увидел цену.

## 5. Сценарий (машина состояний)

| Шаг | Состояние | Что видит ученик | Переход |
|---|---|---|---|
| 0 | `intro` | Заголовок, реплика Алексея, пульт с дефолтами (1h, 3 пары, 3 мес). Видна только Панель А. Кнопка «Проверим: сдвинь таймфрейм на 5m» подсвечивает ползунок. | Ученик ставит 5m |
| 1 | `panel_a_5m` | Панель А пересчиталась: сделок ~394, интервал ±4,9 пп (50,1–59,9 %), зона синяя. Всплывающая плашка: **«Пока Алексей прав: интервал сузился в 3,5 раза. Больше сделок → точнее оценка. Это честная математика (М31).»** Кнопка: «А сколько стоит каждая из этих 394 сделок?» | Клик по кнопке |
| 2 | `panel_b` | Раскрывается Панель Б с анимацией: столбик «ход свечи» уменьшается с 0,71 % до 0,21 %, столбик трения 0,30 % стоит. Отношение 1,46, зона красная. Плашка: **«Трение больше, чем свеча вообще ходит. На 1h — 0,42, на 5m — 1,46. Каждая сделка на 5m начинает жизнь в минусе на полторы свечи.»** Кнопка: «Посчитать счёт за год» | Клик |
| 3 | `panel_c` | Панель В: 1 577 сделок/год × 0,30 % / 3 = **158 % депозита в год**. Столбик «съедено» выше столбика депозита. Плашка: **«Чтобы Алексей остался при своих на 5m, стратегия должна заработать 158 % сверх рынка. На 1h тот же бот платит 13 %. Урок 1.8: 1 460 операций → 109,5 % депозита в год.»** Кнопка: «Так как же набрать статистику?» | Клик |
| 4 | `task` | Открывается задание. Все органы управления разблокированы, но позиции 5m/15m на ползунке помечены «✗ по условию задания» (при выборе — красная подсказка, задание не засчитывается). Цель: `trades_window ≥ 100` и `friction_bill ≤ 20 %`. Второй уровень: `≥ 380`. | При выполнении → шаг 5 |
| 5 | `done` | Итоговая карточка: «Решение Алексея: 1h · 5 пар · 36 месяцев → 657 сделок, интервал ±3,8 пп, счёт за трение 13 %/год». Три вывода урока. Кнопка «В урок → три классических греха». Сохранение результата. | — |

Дополнительно на любом шаге:
- Если `window_months ≤ 3` и `trades_window < 30` → бейдж «Грех №1 из урока: 3 месяца истории, статистика из ~N сделок».
- Если `winrate_obs` сдвинут так, что нижняя граница < 50 % → красная подпись «Неотличимо от монетки» на линейке интервала.
- Кнопка «Что здесь допущено?» открывает список допущений модели (независимые сделки — М10; stake = депозит/пары; √T-масштабирование σ; сделка на каждой N-й свече).

## 6. Тексты (готовые к вставке)

**Подсказки-факты (показываются по клику на «i» рядом с числом):**
- Свечей в год: «525 600 минут в году делим на длину свечи. 5m → ~105 000, 1h → 8 760, 1d → 365 (таблица урока).»
- Интервал винрейта: «Формула М31: p ± 1,96·√(p(1−p)/n). В 4 раза больше сделок — интервал в 2 раза уже. Не в 4.»
- Ход свечи: «Дневная σ BTC ≈ 3,5 % (урок 1.2). Часовая свеча ходит в √24 ≈ 4,9 раза меньше, пятиминутная — в √288 ≈ 17 раз меньше.»
- Трение: «0,1 % taker на вход + 0,1 % на выход + 0,05 % проскальзывание на сторону = 0,30 % за круг (FT-13). Это одинаково для 5m и 1d.»

**Три вывода на финальной карточке:**
1. «Больше сделок → точнее оценка: интервал сужается как √n. Это правда.»
2. «Но трение растёт как n, а ход свечи падает как √ТФ. На 5m одна свеча ходит меньше, чем стоит круг.»
3. «Статистику добирают историей (2–3 года) и парами, а не спуском таймфрейма. 1h — рабочая лошадка новичка не потому, что так модно.»

## 7. Языковой слой (токены для глоссария)

`5m/15m/1h/4h/1d` (таймфрейм = длительность одной свечи), `timeframe`, `winrate` (доля прибыльных сделок), `fee` (комиссия), `taker` (забирает ликвидность рыночной заявкой — 0.9), `slippage` (проскальзывание — 0.10), `stake`/`max_open_trades`/`unlimited` (FT-04), `startup_candle_count` (в допущениях, FT-08), `σ` (сигма — типичный размах, М9), `95 %-интервал` (М31).

## 8. Тест-значения для приёмки

| # | tf | pairs | window | rate | p | Ожидается |
|---|---|---|---|---|---|---|
| T1 | 1h | 3 | 3 | 0,5 % | 55 % | свечей/год 8 760; в окне 2 190; сделок **33**; интервал **±17,0 пп** [38 %; 72 %]; монетка = да; σ свечи 0,71 %; ratio **0,42**; сделок/год 131; счёт **13,1 %** |
| T2 | 5m | 3 | 3 | 0,5 % | 55 % | свечей/год 105 120; в окне 26 280; сделок **394**; интервал **±4,9 пп** [50,1 %; 59,9 %]; монетка = нет; σ 0,21 %; ratio **1,46**; сделок/год 1 577; счёт **157,7 %** |
| T3 | 1h | 5 | 36 | 0,5 % | 55 % | в окне 26 280; сделок **657**; интервал ±3,8 пп; счёт **13,1 %** (то же, что T1 — зафиксировать в подписи «счёт за год не зависит от числа пар при stake = депозит/пары») |
| T4 | 1d | 3 | 3 | 0,5 % | 55 % | в окне ≈91; сделок **1** (округление); зона красная; интервал не считается (n<5 → показывать «—» и подпись «слишком мало сделок для интервала») |
| T5 | любой | — | — | — | 55 % | `n_needed_for_coin` = **380** |
| T6 | любой | — | — | — | 60 % | `n_needed_for_coin` = ceil(0,24·(1,96/0,10)²) = **93** — показать, что при большем крае нужно меньше сделок |

Допуск: ±1 сделка на округление, ±0,1 пп на интервале.

## 9. Аналитика

`ft08_start`, `ft08_step{1..5}`, `ft08_tf_change{tf}`, `ft08_task_attempt{tf,pairs,window,trades,bill,ok}`, `ft08_task_success{level:100|380}`, `ft08_forbidden_tf_selected`, `ft08_assumptions_opened`, `ft08_complete{duration}`.

Метрика эффективности: доля учеников, выполнивших задание уровня ≥380; доля, открывших «допущения»; среднее число попыток задания.

## 10. Не делать

- Не моделировать реальные стратегии/индикаторы — это симуляция арифметики, не бэктест.
- Не вводить автокорреляцию, режимы рынка, спред-фильтры.
- Не давать «оценку прибыльности» — только точность, цена сделки и счёт за трение.

---

# ТЗ №2. FT-09 «Прочитай отчёт в правильном порядке»

## 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft09_report_order` |
| Тип | ТРН (тренажёр с проверкой порядка действий и классификацией зон) |
| Урок-хозяин | FT-09 «Первая историческая проверка стратегии» |
| Место в уроке | После таблицы «Метрика / тревожная зона / рабочая зона» и блока «⚠ Синдром „+80 % за вечер“» |
| Заблуждение | «Первая строка Total profit решает всё» |
| Связанные уроки | FT-09 (порядок: сделки → просадка → риск → прибыль → разбивки; таблица зон), FT-14 (причины выхода как диагноз, ловушка первой строки), 1.10 (Sharpe > 3 на дневных = ошибка/утечка; Стратегия А/Б), 1.11 (альфа vs бета: BTC +155 %, бот +80 %), 1.9 (мало сделок → широкий интервал), 4.5 (таблица сверки 120 сделок / 54,5 %), FT-11/FT-13 (детекторы лжеца), FT-17 (сайзинг и просадка), 5.5 (переживаемость просадки) |
| Целевое время | 10–14 минут (3 варианта отчёта) |
| Движок | **E8 «Двуязычный отчёт»** — тренажёр строится поверх него. Если E8 ещё не существует, агент реализует его минимальное ядро как отдельный модуль `report_metrics.ts/js` (см. §3), чтобы FT-14, 4.5, 5.1 переиспользовали его. |

## 2. Педагогическая идея

Ученик получает отчёт `freqtrade backtesting`, внешне похожий на реальный (моноширинный, английские метки), но **перемешанный** и с провокацией: строка `Total profit %` крупнее, зеленее и стоит первой. Он обязан:

1. Сначала проверить **паспорт прогона** (Fee, период, пары) — иначе всё остальное бессмысленно (FT-09: «Проверяй строку Fee в отчёте»).
2. Читать метрики **в порядке** сделки → просадка → риск-метрики → прибыль vs рынок → разбивки.
3. На каждом шаге **назвать зону** метрики (тревожная / пограничная / рабочая / подозрительно хорошо / не читается — мало сделок) **до того**, как карточка раскроет ответ.
4. В разбивках — поставить **флаги**: одна пара тянет всё? один месяц? открытые позиции делают результат? все выходы стопом?
5. Вынести **вердикт** из 7 вариантов с указанием следующего шага в конвейере.

Каждый неверный по порядку клик по `Total profit` считается «соблазном первой строки» — счётчик показывается в итоге.

## 3. Ядро E8: словарь метрик (модуль `report_metrics`)

Один JSON описывает каждую метрику отчёта: как она называется у Freqtrade, как по-русски, формула словами, к какому шагу чтения относится, функция зоны. Тренажёр рендерит из него карточки; будущие интерактивы (FT-14 «причины выхода», 4.5 «Execution Deviation») переиспользуют.

```json
{
  "metrics": [
    {
      "key": "total_trades",
      "ft_label": "Total/Daily Avg Trades",
      "ru_name": "Сделок всего",
      "formula": "Число закрытых сделок за период теста",
      "step": 1,
      "zone_fn": "zone_trades",
      "meaning": "Без числа сделок любая другая цифра отчёта — шум (1.9, FT-09).",
      "lesson_ref": "FT-09"
    },
    {
      "key": "max_dd_rel",
      "ft_label": "Max % of account underwater / Absolute Drawdown",
      "ru_name": "Максимальная просадка",
      "formula": "Худшее падение капитала от пика, в % (учитывает промежуточные пики)",
      "step": 2,
      "zone_fn": "zone_dd",
      "meaning": "Цена стратегии в страданиях. Сверяется с тем, что ты переживёшь, не выключив бота (5.5, FT-17).",
      "lesson_ref": "FT-09"
    },
    { "key": "sortino",  "ft_label": "Sortino",  "ru_name": "Сортино", "formula": "Доходность на единицу «плохой» волатильности (только падения)", "step": 3, "zone_fn": "zone_sortino", "meaning": "Стабильность заработка без штрафа за рост.", "lesson_ref": "1.10" },
    { "key": "sharpe",   "ft_label": "Sharpe",   "ru_name": "Шарп",    "formula": "(Средняя доходность − безриск) / её разброс, за год", "step": 3, "zone_fn": "zone_sharpe", "meaning": "Выше 3 на дневных данных — почти всегда ошибка или утечка (1.10).", "lesson_ref": "1.10" },
    { "key": "calmar",   "ft_label": "Calmar",   "ru_name": "Кальмар", "formula": "Годовая доходность / максимальная просадка", "step": 3, "zone_fn": "zone_calmar", "meaning": "Сколько процентов прибыли на 1 % худшей ямы.", "lesson_ref": "1.10" },
    { "key": "profit_factor", "ft_label": "Profit factor", "ru_name": "Профит-фактор", "formula": "Сумма всех прибылей / сумма всех убытков", "step": 3, "zone_fn": "zone_pf", "meaning": "1,0 — деньги в нуле минус комиссии.", "lesson_ref": "FT-09" },
    { "key": "win_rate", "ft_label": "Win  Draw  Loss  Win%", "ru_name": "Доля прибыльных", "formula": "Прибыльных сделок / всех сделок", "step": 3, "zone_fn": "zone_winrate", "meaning": "Сам по себе ничего не значит: 90 % побед могут быть убыточны (0.14, П27).", "lesson_ref": "FT-09" },
    { "key": "expectancy", "ft_label": "Expectancy (Ratio)", "ru_name": "Средний результат сделки", "formula": "Сколько в среднем приносит одна сделка (в единицах риска)", "step": 3, "zone_fn": "zone_info", "meaning": "Матожидание из 0.14 на языке отчёта.", "lesson_ref": "0.14" },
    { "key": "total_profit_pct", "ft_label": "Total profit %", "ru_name": "Итоговая доходность", "formula": "(Конечный баланс − стартовый) / стартовый", "step": 4, "zone_fn": "zone_profit_vs_market", "meaning": "Читается только рядом с изменением рынка за тот же период (1.11).", "lesson_ref": "1.11" },
    { "key": "cagr", "ft_label": "CAGR %", "ru_name": "Годовая доходность", "formula": "Доходность, приведённая к году", "step": 4, "zone_fn": "zone_info", "meaning": "Позволяет сравнивать периоды разной длины.", "lesson_ref": "FT-09" },
    { "key": "market_change", "ft_label": "Market change", "ru_name": "Изменение рынка (просто держать)", "formula": "Средний рост цен пар из списка за период — твой бенчмарк buy&hold", "step": 4, "zone_fn": "zone_info", "meaning": "Если стратегия ниже — ты платишь боту за то, что мог получить, купив и уйдя пить чай (1.11).", "lesson_ref": "1.11" },
    { "key": "best_month_share", "ft_label": "DAY BREAKDOWN (month)", "ru_name": "Доля лучшего месяца", "formula": "Прибыль лучшего месяца / вся прибыль", "step": 5, "zone_fn": "zone_best_month", "meaning": "> 50 % — это одна удача, а не стратегия.", "lesson_ref": "FT-09" },
    { "key": "best_pair_share", "ft_label": "BACKTESTING REPORT (per pair)", "ru_name": "Доля лучшей пары", "formula": "Прибыль лучшей пары / вся прибыль", "step": 5, "zone_fn": "zone_best_pair", "meaning": "«Не 2 ли пары приносят всё?» (FT-09).", "lesson_ref": "FT-09" },
    { "key": "exit_reasons", "ft_label": "EXIT REASON STATS", "ru_name": "Причины выхода", "formula": "Сколько сделок закрыто по ROI / стопу / сигналу / трейлингу", "step": 5, "zone_fn": "zone_exit", "meaning": "Если почти всё закрывается стопом, а прибыль делают редкие выходы — это «хвостовая» стратегия с особым риском (FT-14).", "lesson_ref": "FT-14" },
    { "key": "left_open_share", "ft_label": "LEFT OPEN TRADES REPORT", "ru_name": "Незакрытые позиции на конец теста", "formula": "Их плавающая прибыль / вся прибыль", "step": 5, "zone_fn": "zone_left_open", "meaning": "Включены в итог? Проверь, не делают ли они результат (FT-09).", "lesson_ref": "FT-09" }
  ],
  "passport": [
    { "key": "fee", "ft_label": "Fee", "ru_name": "Комиссия в тесте", "check": "fee > 0 и соответствует бирже (0,1 % taker для учебного конфига)", "lesson_ref": "FT-09, FT-13" },
    { "key": "timerange", "ft_label": "Backtesting from / to", "ru_name": "Период теста", "check": "≥ 12 месяцев, охват бычьего и медвежьего режима", "lesson_ref": "FT-16" },
    { "key": "pairs", "ft_label": "Pairs", "ru_name": "Список пар", "check": "Зафиксирован на дату начала теста, не «сегодняшний топ»", "lesson_ref": "FT-04, 2.6" },
    { "key": "max_open_trades", "ft_label": "Max open trades", "ru_name": "Одновременных позиций", "check": "Совпадает с конфигом (2–3 для обучения)", "lesson_ref": "FT-04" },
    { "key": "starting_balance", "ft_label": "Starting balance", "ru_name": "Стартовый капитал", "check": "1000 USDT — виртуальный кошелёк Алексея", "lesson_ref": "FT-04" }
  ]
}
```

### 3.1. Функции зон

Возвращают `{zone: 'red'|'yellow'|'green'|'purple'|'gray', label}`. Правило «мало сделок»: если `total_trades < 30`, все функции кроме `zone_trades` возвращают `gray` («не читается: мало сделок»).

| Функция | Источник | Правило |
|---|---|---|
| `zone_trades(n)` | FT-09 таблица | n<30 → red «статистика ни о чём»; 30–79 → yellow «маловато»; 80–400 → green «рабочая»; >400 → green (с подписью «проверь трение») |
| `zone_dd(dd, profit)` | FT-09 таблица + «⚠ трёхзначные без просадок — баг» | dd>25 → red «стопы/сайзинг не те»; 15–25 → yellow; 5–15 → green; dd<5 при profit>50 % → purple «подозрительно гладко»; dd<5 иначе → green |
| `zone_pf(pf)` | FT-09 таблица | <1,1 red; 1,1–1,29 yellow; 1,3–1,8 green; 1,81–2,5 yellow «очень хорошо — сверь с OOS»; >2,5 purple «на in-sample — подозрение на подгонку» |
| `zone_sortino(s)` | FT-09 таблица + 1.10 | <1 red; 1–1,49 yellow; 1,5–3 green; >3 purple |
| `zone_sharpe(s)` | 1.10 | <1 red «слабо»; 1–2 green «рабочая»; 2–3 yellow «отлично — проверь»; >3 purple «почти всегда ошибка или утечка» |
| `zone_calmar(c)` | 1.10 таблица | <1 red; 1–1,99 yellow; ≥2 green |
| `zone_winrate(w, n)` | FT-09 таблица | n<30 gray; 45–60 green «при R>1,2»; <40 или >70 → yellow «проверь соотношение выигрыш/убыток» |
| `zone_profit_vs_market(p, m)` | 1.11 | p<m → red «бета, не альфа»; p≥m → green; дополнительно p>150 % → purple (FT-09 «трёхзначные…») |
| `zone_best_month(share)` | FT-09 таблица | >50 red; 25–50 yellow; <25 green |
| `zone_best_pair(share)` | `convention: true` (по аналогии с лучшим месяцем) | >50 red; 34–50 yellow; <34 green (для 3 пар равномерно = 33 %) |
| `zone_exit(stop_share)` | FT-14, `convention: true` для порога | доля стопов >60 % → yellow «хвостовая стратегия»; иначе green |
| `zone_left_open(share)` | `convention: true` | >30 % прибыли из незакрытых → red; 10–30 yellow; <10 green |

## 4. Экран и раскладка

```
┌────────────────────────────────────────────────────────────────────────┐
│ «Алексей прогнал первый бэктест. Отчёт перед тобой. Прочитай его как   │
│  риск-аналитик, а не как болельщик.»          Вариант 1 из 3  ⏱ 04:12  │
├───────────────────────────────────────┬────────────────────────────────┤
│ ОТЧЁТ (моноширинный, «как в терминале»)│ ПОРЯДОК ЧТЕНИЯ                 │
│                                        │                                │
│ ▶ ПАСПОРТ ПРОГОНА (не перемешан)       │ ⓪ Условия прогона   [ ] [ ] [ ]│
│   Backtesting from  2024-01-01 00:00   │    ├ Fee ≠ 0 и как на бирже   │
│   Backtesting to    2025-06-01 00:00   │    ├ Период ≥ 12 мес           │
│   Max open trades   3                  │    └ Пары зафиксированы        │
│   Starting balance  1000 USDT          │    [Условия в порядке]         │
│   Fee               0.1%               │    [Отчёт недействителен ✗]    │
│   Pairs  BTC/USDT ETH/USDT SOL/USDT    │                                │
│                                        │ ① Сделки            ▢          │
│ ══════ ПЕРЕМЕШАННЫЕ КАРТОЧКИ ══════    │ ② Просадка          ▢          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓       │ ③ Риск-метрики      ▢▢ (≥2)    │
│ ┃ Total profit %   +38.42% ▲   ┃ ← круп-│ ④ Прибыль vs рынок  ▢          │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  но,  │ ⑤ Разбивки          ▢▢▢▢       │
│ │ Sortino              2.10   │ зелё-  │                                │
│ │ EXIT REASON STATS    ▾      │ ное    │ Соблазн первой строки: 0       │
│ │ Max % underwater    12.3%   │        │                                │
│ │ Profit factor        1.52   │        ├────────────────────────────────┤
│ │ Total/Daily Avg Trades 143/0.28 │    │ ПОДСКАЗКА ШАГА                 │
│ │ DAY BREAKDOWN (month) ▾     │        │ «Сначала — сколько сделок.     │
│ │ Market change      +22.0%   │        │  Без n любая цифра — шум.»     │
│ │ BACKTESTING REPORT (pairs) ▾│        │                                │
│ │ CAGR %              25.8%   │        │ [Вынести вердикт] (после ⑤ или │
│ │ Sharpe               1.60   │        │  сразу после ① если n<30)      │
│ │ Win Draw Loss  78 0 65 54.5%│        │                                │
│ │ LEFT OPEN TRADES REPORT ▾   │        │                                │
│ │ Calmar               2.10   │        │                                │
│ │ Expectancy (Ratio)  0.34    │        │                                │
└───────────────────────────────────────┴────────────────────────────────┘
```

- Любой английский токен в отчёте — с пунктирным подчёркиванием; клик → русская карточка из глоссария (не считается ходом).
- Переключатель над отчётом: «англ. / рус. подписи / оба». В режиме «рус.» справа от каждой метки появляется русское имя, английское остаётся (ученик должен научиться узнавать реальный вывод).
- Порядок карточек перемешивается детерминированно по seed варианта (чтобы повторное прохождение выглядело так же, а тесты были воспроизводимы). `Total profit %` **всегда** первая и визуально выделена.

## 5. Сценарий (машина состояний)

### Шаг ⓪ — Паспорт прогона
- Три чекбокса-условия. Ученик отмечает те, что выполнены.
- Кнопки: **«Условия в порядке → читаю дальше»** / **«Отчёт недействителен»**.
- Проверка: если в варианте `fee = 0` (или период < 12 мес, или пометка «pairs: сегодняшний топ по объёму») — правильный ответ «недействителен». Если ученик жмёт «в порядке» → карточка-стоп: *«Fee 0 % — комиссии в тесте нет. FT-09: „если тестировал с fee=0 — все выводы аннулируются“. Этот отчёт нельзя читать дальше.»* Вариант завершается вердиктом D.
- Если ученик жмёт «недействителен» на здоровом паспорте → подсказка: «Что именно не так? Fee 0,1 % как у binance-спот, период 17 месяцев, пары из конфига» — и возврат.

### Шаги ①–④ — Порядок и зоны
Для каждого шага:
1. Справа подсвечен активный слот и подсказка шага.
2. Ученик кликает карточку в отчёте.
   - **Верная карточка** → всплывает мини-панель зоны с кнопками: `Тревожная` · `Пограничная` · `Рабочая` · `Подозрительно хорошо` · `Не читается: мало сделок` (последняя всегда видна, но правильна только при n<30).
   - Ответ по зоне → карточка **переворачивается**: русское имя · формула словами · значение · цветная зона · одна строка смысла · ссылка «урок …». Если зона названа неверно — показывается и ответ, и разница: *«Ты назвал „рабочая“. По таблице FT-09 профит-фактор 3,1 на in-sample — „подозрительно хорошо“: перебор параметров даёт такое на шуме (1.10).»* Ошибка фиксируется.
   - Слот справа заполняется.
   - **Неверная карточка** (нарушен порядок) → карточка дрожит, подсказка: `«Сначала {название нужного шага}: {почему}»`. Если это `Total profit %` до шага ④ — счётчик «Соблазн первой строки» +1 и реплика: *«Первая строка. Именно на неё смотрят 9 из 10 новичков. Мошеннический и честный бэктест могут иметь одинаковую первую строку (FT-14).»*
3. Шаг ③ (риск-метрики) требует минимум **две** карточки из {Sortino, Sharpe, Calmar, Profit factor, Win%}; остальные можно открыть дополнительно. Шаг засчитывается кнопкой «Достаточно, дальше» или автоматически после 3 карточек.
4. Шаг ④: клик по `Total profit %` открывает сдвоенную карточку «стратегия +38,4 % vs рынок +22,0 %» (карточка `Market change` подтягивается автоматически). Зона — по `zone_profit_vs_market`.

**Ранний вердикт:** если на шаге ① `total_trades < 30`, справа появляется кнопка **«Достаточно — выношу вердикт»** с подсказкой «FT-09: при малой выборке выводы откладывают». Ученик может продолжить читать — тогда правильной зоной для всех метрик становится «Не читается: мало сделок».

### Шаг ⑤ — Разбивки (флаги)
Открываются четыре свёрнутые таблицы; каждая — с одним вопросом «да/нет», проверяемым по данным варианта:
- **По месяцам:** «Лучший месяц даёт больше половины всей прибыли?» (порог 50 %, FT-09).
- **По парам:** «Одна пара приносит больше половины прибыли?» (порог 50 %).
- **Причины выхода:** «Больше 60 % сделок закрыто стопом?»
- **Незакрытые позиции:** «Незакрытые сделки дают больше 30 % итоговой прибыли?»

Каждый ответ сверяется с расчётом; неверный — показать расчёт («SOL: +332 $ из 640 $ = 52 % → да»).

### Шаг ⑥ — Вердикт
Семь карточек-вариантов (порядок перемешан):

| Код | Формулировка | Следующий шаг |
|---|---|---|
| A | «Рабочий кандидат. Пропускаю на детекторы лжеца — стандартный конвейер» | → FT-11 lookahead-analysis, FT-13 |
| B | «Статистики мало. Расширить историю и список пар, потом вернуться» | → FT-08 |
| C | «Слишком хорошо. Сначала ищу баг/утечку, радоваться рано» | → FT-11, 1.10 |
| D | «Отчёт недействителен: условия прогона (комиссия / данные / пары)» | → FT-04, FT-08 |
| E | «Результат не воспроизводим: одна пара / один месяц / незакрытые позиции. Доработка гипотезы» | → FT-15 |
| F | «Это бета, а не альфа: стратегия хуже, чем просто держать. Переосмыслить» | → 1.11 |
| G | «Просадка неприемлема при этом сайзинге. Пересмотреть риск, потом всё заново» | → FT-17, 5.5 |

После выбора — разбор: правильный вердикт, почему, и что говорил бы риск-аналитик (2–3 предложения), затем таблица итогов варианта: порядок (ошибок N), зоны (верно k из m), флаги (верно j из 4), вердикт (✓/✗), соблазн первой строки (N).

### Завершение
- Сессия — 3 варианта, выбираются из банка так, чтобы среди них был **один здоровый (A)** и **два с разными ловушками**.
- **Критерий освоения:** в 3 вариантах подряд — 0 ошибок порядка, ≥80 % верных зон, верный вердикт. Иначе предлагается ещё один вариант (из непройденных).
- Финальная карточка: «Порядок чтения, который теперь твой: сделки → просадка → риск → прибыль → разбивки. Первая строка — последняя по важности.» Кнопка «Прочитать вывод backtesting» (существующий интерактив FT-14) как следующий шаг.

## 6. Банк вариантов

Общее для всех, если не указано иное: стратегия `DipBuyerBTCFilter`, таймфрейм 1h, пары BTC/USDT · ETH/USDT · SOL/USDT, `Max open trades 3`, `Starting balance 1000 USDT`, `Fee 0.1%`, период 2024-01-01 → 2025-06-01 (17 месяцев, как в примере команды FT-09).

| ID | Название (внутр.) | Ключевые числа | Верный вердикт | Откуда числа |
|---|---|---|---|---|
| V1 | Здоровый кандидат | сделок **143** (78/0/65, 54,5 %), profit **+38,4 %** (384 USDT), CAGR 25,8 %, market **+22,0 %**, DD **12,3 %**, Sortino 2,10, Sharpe 1,60, Calmar 2,10, PF 1,52, Expectancy 0,34; лучший месяц 19 %; пары BTC 31 % / ETH 36 % / SOL 33 %; выходы roi 61 · exit_signal 40 · stop_loss 38 · trailing 4; left open 1 сделка +4 USDT (1 %) | **A** | 54,5 % — из таблицы 4.5; зоны — FT-09 |
| V2 | «+120 % на 14 сделках» | сделок **14** (10/0/4), profit **+120 %**, market +22 %, DD 9 %, Sortino 3,9, PF 4,2; лучший месяц 71 % | **B** (доступен ранний вердикт после ①) | «Проверь себя» FT-09 |
| V3 | Одна счастливая пара | сделок 210, profit +64 % (640 USDT), market +30 %, DD 14 %, Sortino 1,9, PF 1,45; пары SOL **+332 USDT (52 %)**, BTC +154, ETH +154; лучший месяц 24 % | **E** | FT-09 «не 2 ли пары приносят всё» |
| V4 | Слишком красиво | сделок 96 (65/0/31, 68 %), profit **+187 %**, market +22 %, DD **4,1 %**, Sortino **4,8**, Sharpe **3,6**, PF **3,1**, лучший месяц 21 % | **C** | 1.10 (Sharpe >3), FT-09 (трёхзначные без просадок) |
| V5 | Fee = 0 | паспорт: **Fee 0.0%**; далее сделок 240, profit +51 %, DD 10 %, PF 1,6 | **D** (на шаге ⓪) | FT-09 «fee=0 — выводы аннулируются» |
| V6 | Бета, не альфа | период 2023-01-01 → 2023-12-31; сделок 118, profit **+80 %**, market **+155 %**, DD 18 %, Sortino 1,7, PF 1,4; лучший месяц 23 % | **F** | 1.11: «BTC +155 %, бот +80 %» |
| V7 | Просадка 31 % | сделок 160, profit +58 %, market +22 %, DD **31 %**, Sortino 1,1, Calmar 1,2, PF 1,3; лучший месяц 22 % | **G** | FT-09 (DD >25 %), FT-17 |
| V8 | Незакрытые делают результат | сделок 77 закрытых + **3 open**, profit +44 %, из них left open **+19 % (43 %)**, market +22 %, DD 11 %, PF 1,4 (по закрытым — 1,05) | **E** | FT-09 «Left open trades — включены в итог?» |
| V9 | Сегодняшний топ | паспорт: пометка `Pairs: VolumePairList top-3 (на 2025-06-01)`; сделок 130, profit +47 %, DD 13 % | **D** (survivorship, FT-04/2.6) | FT-04 «отобранный сегодня whitelist — survivorship-байас» |

Минимум для релиза — V1–V6; V7–V9 — расширение. Все числа держать в `variants_ft09.json`, чтобы методолог правил без кода.

## 7. Тексты обратной связи (ключевые)

- **Порядок, шаг ① пропущен:** «Сначала — число сделок. 14 сделок и 143 сделки дают одинаково красивую первую строку, но только одна из них — статистика (1.9).»
- **Порядок, шаг ② пропущен:** «Сначала — просадка. Доходность без просадки — реклама (1.10). +60 % при яме −35 % и +35 % при яме −6 % — это разные стратегии.»
- **Порядок, шаг ③ пропущен:** «Сначала — риск-метрики. Они говорят, какой ценой получена прибыль и не подозрительно ли она гладкая.»
- **Соблазн первой строки (первый раз):** «Вот она — первая строка. Она всегда крупнее и зеленее. Мы вернёмся к ней четвёртой.»
- **Соблазн (третий раз и далее):** «Третий раз. Запиши в дневник искажений (П44): „якорение на итоговой цифре“.»
- **Зона при n<30, названа любая кроме „не читается“:** «При 14 сделках профит-фактор 4,2 — это 2–3 удачные сделки, а не свойство стратегии. Таблица FT-09: винрейт „любой при малых n“ — тревожная зона.»
- **Вердикт A на V4:** «Осторожно. Sharpe 3,6, просадка 4 %, PF 3,1 на in-sample — урок 1.10: почти всегда ошибка или утечка. Правильный вердикт — C: сначала детекторы (FT-11), потом выводы.»
- **Вердикт F на V6 (верно):** «Да. Бот заработал +80 %, но рынок дал +155 %. При бете 0,7 ожидание было +108 %, альфа −28,5 % (1.11). Ты бы заплатил боту за то, что мог получить, просто купив BTC.»

## 8. Языковой слой (токены → глоссарий)

`Backtesting from/to`, `Max open trades`, `Starting balance`, `Final balance`, `Fee`, `Total/Daily Avg Trades`, `Absolute profit`, `Total profit %`, `CAGR %`, `Sortino`, `Sharpe`, `Calmar`, `Profit factor`, `Expectancy (Ratio)`, `Win/Draw/Loss`, `Max % of account underwater`, `Absolute Drawdown (Account)`, `Drawdown high/low/start/end`, `Market change`, `Best/Worst Pair`, `Best/Worst trade`, `Max Consecutive Wins/Loss`, `Rejected Entry signals`, `Entry/Exit Timeouts`, `EXIT REASON STATS` и значения `roi`, `stop_loss`, `exit_signal`, `trailing_stop_loss`, `force_exit`, `LEFT OPEN TRADES REPORT`, `BACKTESTING REPORT`, `DAY BREAKDOWN`, `in-sample / out-of-sample`, `USDT`.

Каждая карточка глоссария: русское имя · одна фраза «что это» · пример из текущего отчёта · ссылка на урок.

## 9. Тест-значения для приёмки

| # | Проверка | Ожидание |
|---|---|---|
| A1 | V1, `zone_trades(143)` | green «рабочая» |
| A2 | V1, `zone_dd(12.3, 38.4)` | green |
| A3 | V1, `zone_profit_vs_market(38.4, 22.0)` | green |
| A4 | V1, флаги ⑤ | все четыре — «нет» (19 % · 36 % · стопов 38/143 = 27 % · left open 1 %) |
| A5 | V2, `zone_trades(14)` | red; кнопка раннего вердикта видна |
| A6 | V2, `zone_pf(4.2)` при n=14 | gray «не читается» |
| A7 | V3, `best_pair_share` | 332/640 = 51,9 % → флаг «да», зона red |
| A8 | V4, `zone_sharpe(3.6)`, `zone_sortino(4.8)`, `zone_pf(3.1)`, `zone_dd(4.1,187)` | все purple |
| A9 | V5, паспорт | «Условия в порядке» → стоп-карточка, вердикт D принудительно |
| A10 | V6, `zone_profit_vs_market(80,155)` | red «бета, не альфа»; верный вердикт F |
| A11 | V7, `zone_dd(31,58)` | red; `zone_calmar(1.2)` yellow |
| A12 | V8, `left_open_share` | 19/44 = 43 % → red |
| A13 | Порядок: клик `Sortino` на шаге ① | отклонён, подсказка про сделки, слот не заполнен |
| A14 | Клик `Total profit %` на шаге ① | счётчик соблазна = 1, карточка не открывается |
| A15 | Перемешивание | при одинаковом seed порядок карточек идентичен; `Total profit %` всегда первая |
| A16 | Критерий освоения | 3 варианта подряд с 0 ошибок порядка, ≥80 % зон, верным вердиктом → статус «освоено» |

## 10. Аналитика

`ft09_start{variant}`, `ft09_passport{decision, correct}`, `ft09_step_click{step, key, correct_order}`, `ft09_zone_answer{key, answered, correct}`, `ft09_first_line_temptation{count}`, `ft09_flag{key, answered, correct}`, `ft09_verdict{chosen, correct}`, `ft09_variant_complete{order_errors, zone_acc, flags_acc, verdict_ok, duration}`, `ft09_mastered`.

Метрики эффективности (для сравнения с картой V15.1): среднее число «соблазнов первой строки» на первый и третий вариант (цель — падение ≥50 %); доля верных вердиктов на V4 и V6 (самые «неинтуитивные»).

## 11. Не делать

- Не генерировать отчёты случайно — только из банка (иначе зоны и вердикты станут спорными).
- Не считать метрики из сделок — они заданы в варианте; тренажёр учит читать, а не вычислять (вычисление — FT-14 и будущие интерактивы).
- Не добавлять Sharpe/Sortino-формулы с аннуализацией в интерфейс — только словесная формула из словаря.
- Не разрешать «пропустить шаг» — порядок и есть навык.

---

## Интеграционные заметки для агента

1. **Общий глоссарий** `glossary_ft.json` создаётся в этом спринте и наполняется токенами обоих ТЗ; формат карточки: `{token, ru_name, one_liner, example, lesson_ref}`.
2. **Модуль `report_metrics`** из FT-09 — это и есть минимальное ядро движка E8. Экспортировать: словарь метрик, функции зон, рендер карточки метрики (лицо/оборот), рендер паспорта. FT-14 «Причины выхода как диагноз» и 4.5 «Навигатор Execution Deviation» подключатся к нему следующей волной.
3. **Числа под флагом `convention: true`** (пороги для лучшей пары, доли стопов, незакрытых позиций, зоны отношения трение/свеча) вынести в `zones_config.json` и показать методологу списком до релиза.
4. Оба интерактива готовы к встраиванию в «Ритуал» (E4) позже: FT-09 может стать еженедельным «прочитай свой отчёт» с реальными данными dry-run ученика, когда появится импорт результатов.

-------------------------
# Спецификации для реализации: FT-09 (2) и FT-10

Ниже — два ТЗ в едином формате. Оба интерактива рассчитаны на русскоязычного новичка, все английские токены обязаны иметь русскую карточку в режиме «Ткни в непонятное» (раздел 6 общих принципов). Числа берутся из текстов уроков 1.11, 4.5, 5.2, FT-09, FT-10, FT-13.

---

## Спека 1. FT-09 (2) — «Стратегия против buy&hold»

### 1.1. Цель и заблуждение

| | |
|---|---|
| **Заблуждение** | «+40% за период — это успех». Новичок читает первую строку отчёта `Total profit` и не сравнивает с пассивным удержанием той же пары. |
| **Целевой инсайт** | Результат стратегии = течение (бета × рынок) + гребки (альфа). Один и тот же бот в бычьем окне проигрывает удержанию, в медвежьем — выигрывает. Оценка без бенчмарка и без окна — не оценка. |
| **Тип** | СИМ + мини-квиз на входе и выходе. |
| **Место в уроке** | FT-09, блок «Подробнее», п.1: «Сравнивай не с нулём, а с buy&hold той же пары за тот же период». Ссылки: 1.11 (альфа/бета, критерии бенчмарка), 1.10 (Sharpe/MaxDD), FT-09 практика «три периода». |
| **Движки** | Не требует. Использует общий языковой слой (глоссарий). |

### 1.2. Данные

**Принцип:** офлайн, детерминированно, без внешних API.

- Генератор синтетических **дневных** цен пары «BTC/USDT-учебная» на 1000 дней (≈2,7 года) с сидом `seed = 20240101`, PRNG `mulberry32`. Дневные бары достаточны для визуала; таймфрейм стратегии в подписи — 1h (как в FT-05), но эквити агрегируется по дням.
- Режимы вшиты в генератор (кусочные параметры дрейфа/волатильности), чтобы воспроизвести три окна из практики FT-09:
  - `R1` «Старый период» дни 0–364: боковик с двумя коррекциями, итог ≈ +10%, σ_day 3,2%;
  - `R2` «Бычий 2024» дни 365–729: тренд вверх, итог ≈ +120%, σ_day 3,0%, одна просадка −22%;
  - `R3` «Коррекция 2025H1» дни 730–999: итог ≈ −30%, σ_day 3,8%, каскад −15% за 2 дня (стресс-дни для расчёта беты в хвосте).
- **Стратегия** считается честно на этих же данных (не рисуется руками): лонг-онли, экспозиция `e_t ∈ {0,1}`, правило `EMA16 > EMA200` по close (дневная версия учебной `TutorialEmaRsi`), позиция применяется с `shift(1)`, издержки 20 bps за оборот (14–20 bps из 1.8) списываются при смене экспозиции. Дополнительно: стоп −10% от цены входа и ROI +6% → выход, вход снова по правилу. Так бета естественно получается ~0,6–0,7 (в рынке ≈ 60–70% времени), что совпадает с числами урока 1.11.
- Ряды, которые считаются один раз при загрузке: `price[]`, `ret_m[]` (простые дневные), `equity_strat[]`, `ret_s[]`, `exposure[]`.
- Целевые контрольные значения генератора (закрепить тестом): на окне `R2` стратегия даёт **+35…+45%** при рынке **+110…+130%**; на `R3` стратегия **−3…+8%** при рынке **−25…−35%**. Подобрать сид/параметры один раз и зафиксировать.

### 1.3. Экран и компоненты

Макет (desktop: две колонки 60/40; mobile: стек):

**A. Заголовок-провокация** (вверху, до графика):
«Бот заработал **+40%** за год. Это успех?» — две кнопки «Да» / «Нет, надо сравнить». Выбор логируется, график открывается после любого ответа. При «Да» — после раскрытия появляется бейдж «Ты ответил "да". Посмотри на серую кривую».

**B. График эквити** (компонент `EquityCompare`):
- Две кривые, нормированные к 100 на левой границе окна: синяя «Бот», серая «Просто держать (buy&hold)».
- Заливка между кривыми: зелёная, где бот выше, красная — где ниже.
- Полупрозрачная полоса экспозиции внизу графика (тёмная = бот в позиции, светлая = в кэше) с подписью «Когда бот был в рынке».
- Стресс-дни (худшие 5% дневных доходностей рынка) помечены красными штрихами на оси X (для беты в хвосте).
- Тултип по наведению: дата, бот %, держать %, разница п.п.

**C. Ползунок периода** (компонент `RangeSlider`, две ручки, шаг 1 день, мин. ширина 60 дней). Под ним три пресета-кнопки: «Старый период», «Бычий 2024», «Коррекция 2025H1», «Весь период». Изменение окна пересчитывает всё мгновенно.

**D. Панель «Два взгляда»** (справа), две карточки:

*«Что видит новичок»* — одна большая цифра: «Бот: +40,3%». И всё.

*«Что видит квант»* — таблица:

| Метрика | Бот | Держать | Вердикт |
|---|---|---|---|
| Доходность за окно | | | ← стрелка кто выше |
| Макс. просадка | | | ✓ если `DD_бот < 0,5·DD_держать` |
| Шарп (годовой, √365) | | | ✓ если `Sharpe_бот > Sharpe_держать` |
| Бета к рынку | β | — | подпись «бот = 0,7 биткоина» |
| Бета в стресс-дни | β_stress | — | подпись, если β_stress > β: «в кризис держит рынок сильнее» |
| **Альфа за окно** | α | — | зелёная/красная |

Итоговый вердикт (одна фраза, по критериям 1.11): «Бот опережает пассивное удержание» (оба ✓ и α>0) / «Скрытая покупка рынка с плечом меньше единицы» (α<0) / «Смешанный результат: меньше риска, меньше дохода» (DD ✓, доходность ✗, α≈0).

**E. Панель «Течение и гребки»** (компонент `AlphaBetaBars`): горизонтальная составная полоса результата бота: серый сегмент «Течение реки: β × рынок = 0,7 × 120% = +84%», синий/красный сегмент «Гребки: α = +40% − 84% = −44%». Аналогия лодки из 1.11 в одну строку под полосой. Знак сегмента альфы меняет цвет.

**F. Переключатель «Подробнее»** (свёрнут по умолчанию): диаграмма рассеяния дневных доходностей (X — рынок, Y — бот), линия регрессии, подпись «наклон = β, пересечение = α дневная», `t`-статистика альфы с подписью «|t| > 2 — альфа значима; у тебя |t| = 0,8 — это шум».

**G. Вкладка «Калькулятор из урока 1.11»** (вторая вкладка компонента): три поля — «Рынок вырос на, %», «Бот заработал, %», «Бета бота» — с дефолтами **155 / 80 / 0,7**. Выход: «Ожидаемая от рынка: 0,7 × 155 = 108,5%. Альфа: 80 − 108,5 = **−28,5%**. Бот отработал хуже пассивного удержания». Числа берутся из урока дословно. Кнопка «Подставить моё окно» переносит значения из вкладки с кривыми.

### 1.4. Формулы (единый учебный контракт)

Все расчёты — на окне `[a, b]`, дневные простые доходности.

- `R_total = equity[b] / equity[a] − 1` для обоих рядов.
- `MaxDD` — от пиков внутри окна, относительная.
- `Sharpe = mean(r) / std(r, ddof=1) · √365`, безрисковая = 0 (ориентир урока 1.10; при `std=0` — «н/д»).
- `β = cov(ret_s, ret_m) / var(ret_m)` (OLS на дневных простых доходностях).
- `β_stress` — то же на подмножестве дней, где `ret_m ≤ quantile(ret_m, 0,05)`; если дней < 8 — показывать «мало данных».
- **Альфа за окно (основная, как в «Числах» урока 1.11):** `α_окно = R_total_бот − β · R_total_держать`. Явно подписать в тултипе: «учебное разложение из урока 1.11; строгая годовая альфа — во вкладке "Подробнее"».
- В «Подробнее»: `α_daily` — свободный член OLS, `α_annual = (1+α_daily)^365 − 1`, `t = α_daily / SE(α_daily)`.
- Вердикт по 1.11: `Sharpe_бот > Sharpe_держать` **и** `DD_бот < 0,5·DD_держать` **и** `α_окно > 0`.

### 1.5. Задания (критерий освоения)

Три задания в нижней ленте, выполняются ползунком; каждое проверяется автоматически:

1. «Найди окно длиной ≥ 180 дней, где бот **проигрывает** удержанию, хотя сам в плюсе». Проверка: `R_бот > 0 ∧ R_бот < R_держать`.
2. «Найди окно, где бот **выигрывает** у удержания». Проверка: `R_бот > R_держать`.
3. «Объясни результат задания 1 одной фразой» — выбор из 4 вариантов (правильный: «В бычьем окне бот отдал часть роста, потому что был в рынке только часть времени — низкая бета»; дистракторы: «Стратегия сломалась», «Комиссии съели всё», «Нужно было брать плечо»).

Финальный квиз (из «Проверь себя» урока 1.11): «Стратегия +35% при BTC +60% и корреляции 0,92. Верный диагноз?» — правильный: «Скрытая бета: результат объясняется рынком». Три выполненных задания + квиз = блок отмечен пройденным.

### 1.6. Тексты обратной связи (реактивные подписи под графиком)

- Если `R_бот > 0 ∧ α_окно < 0`: «Плюс есть, альфы нет: ты платишь боту за то, что мог получить, просто купив и уйдя пить чай (1.11)».
- Если `R_бот < R_держать ∧ DD_бот < 0,5·DD_держать`: «Меньше дохода, но вдвое меньше боли. Это осознанный размен, а не провал — если ты его выбрал заранее».
- Если `R_держать < 0 ∧ R_бот > R_держать`: «Вот где живёт альфа: бот вышел в кэш, пока рынок падал».
- Если ширина окна < 120 дней: жёлтая плашка «Короткое окно — бета и Шарп на нём ненадёжны (М30)».

### 1.7. Языковой слой

Токены с карточками: `buy&hold` («просто купить и держать, ничего не делая»), `альфа`, `бета`, `Sharpe`, `MaxDD`, `OLS/регрессия`, `t-статистика`, `экспозиция`. Режим «рус.» заменяет подписи осей и легенды на русские; английское слово остаётся в скобках.

### 1.8. Технические требования и приёмка

- Пересчёт при движении ползунка ≤ 30 мс на 1000 точек; расчёты в чистом TS/JS, без воркера.
- Детерминированность: при `seed = 20240101` контрольные значения (п. 1.2) воспроизводятся; тест закреплён.
- Регрессионные тесты формул на синтетике: если `ret_s = 0,7·ret_m` точно, то `β = 0,7 ± 1e-9`, `α_daily = 0`; если стратегия всегда в кэше — `β = 0`, `Sharpe` = «н/д».
- Калькулятор 1.11 при дефолтах выводит ровно «108,5%» и «−28,5%».
- Мобильная ширина 360 px: график, потом две карточки, потом ползунок; ползунок управляется клавиатурой (стрелки, шаг 1 день; Shift — 30 дней).
- Телеметрия: ответ на вопрос A, число сдвигов ползунка до выполнения задания 1, время до вердикта, результат квиза.

---

## Спека 2. FT-10 — «Бэктест vs реальность: 8 расхождений»

### 2.1. Цель и заблуждение

| | |
|---|---|
| **Заблуждение** | «Бэктест — это обещание доходности». Новичок считает, что цифра из отчёта воспроизведётся в dry-run/live. |
| **Целевой инсайт** | Бэктест — модель исполнения с восемью упрощениями, и **все они знакопостоянны**: реальность смещена вниз. Разрыв измерим (Execution Deviation, 4.5) и управляем: часть его — свойство рынка, часть — твои настройки (тип ордера, размер, таймаут). |
| **Тип** | СИМ (агрегатный режим) + покадровая плёнка (E3) + ИГР (сборка списка «8 причин → как измерить» из практики урока). |
| **Место в уроке** | FT-10 целиком; практика урока («минимум восемь причин, для каждой — как измерить»). Ссылки: FT-06 (сигнал/заявка/исполнение/сделка), 0.10 (стакан, проскальзывание), 1.8 (модель издержек `fee + half_spread + k·sqrt(Q/ADV)`), 4.5 (ExecDev: <10% норма, 10–25% серая зона, >25% стоп), 5.2 (закон квадратного корня), FT-13 (арифметика 250 сделок). |
| **Движки** | E3 «Плёнка бэктеста» — для покадрового режима. Ниже описан контракт E3 и автономный запасной режим, если E3 ещё не собран. |

### 2.2. Восемь расхождений — единый справочник

Это ядро интерактива: одна таблица данных используется и для панели ползунков, и для водопада, и для игры.

| № | id | Название (рус.) | Что предполагает бэктест | Что в реальности | Ползунок / переключатель | Как измерить в dry-run (из практики урока) |
|---|---|---|---|---|---|---|
| 1 | `latency` | Задержка между сигналом и ордером | Исполнение ровно по `open(t+1)` | За 0,5–60 с цена уходит; для трендовых входов — в среднем против тебя | «Задержка, с» 0,5 → 60, лог-шкала | `latency_ms = fill_ts − signal_ts` по журналу |
| 2 | `spread` | Спред | Одна цена | Покупаешь по ask, продаёшь по bid: полспреда на сторону | «Спред, bps» 1 → 50 | Средний спред пары в момент входов |
| 3 | `impact` | Влияние объёма на цену | «Мой ордер не двигает рынок» | Проскальзывание ∝ √(размер / объём бара) | **«Размер ордера / объём бара»** 0,1% → 50%, лог-шкала (главный ползунок) | `slippage_bps` vs размер ордера |
| 4 | `partial` | Частичное исполнение | Всё или ничего | Лимитка исполняется на 40–100% | «Доля исполнения лимитки» 30 → 100% | Доля частичных филлов |
| 5 | `timeout` | Неисполнение лимитки | Коснулась уровня → исполнена | Не дошла → отмена по таймауту: сделка пропущена или ушла маркетом | Режим «лимит/маркет» + `unfilledtimeout` 1 → 30 мин + «при таймауте: пропустить / маркетом» | Доля отменённых заявок |
| 6 | `reject` | Отказы и ошибки API | Заявка всегда принята | Rate-limit, сбой сети: сделка не открылась | «Вероятность отказа, %» 0 → 5 | Счётчик ошибок в логе |
| 7 | `gap` | Гэп через стоп | Стоп исполняется по уровню | Свеча открылась ниже стопа — выход по факту, хуже уровня | вкл/выкл + «размер гэпа σ» | Факт. цена стопа − уровень стопа |
| 8 | `pause` | Паузы торгов / дыры в данных | Каждая свеча торгуется | Техработы, нулевой объём — ордер ждёт следующей свечи | вкл/выкл | Свечи с `volume = 0` в истории |

Все восемь при включении **не могут** улучшать результат в среднем (монотонность — приёмочный тест). Сверх этого — константа `fee`: taker/maker раздельно, по умолчанию 0,1% / 0,075% (FT-04).

### 2.3. Данные и модель исполнения

**Лента.** Синтетические часовые свечи, 2000 штук (≈83 дня), сид фиксирован. Для каждой свечи: `open, high, low, close, volume` плюс служебные поля `spread_bps_t` (растёт в стресс-часы), `paused_t` (12 свечей с `volume=0`), `stress_t` (флаг каскада). Внутри каждой свечи генерируется **минутный путь** из 60 точек, согласованный с OHLC (броуновский мост, растянутый так, чтобы max/min совпали с high/low), — он нужен для задержки, частичных исполнений и таймаутов.

**Сигналы.** Одна фиксированная стратегия (учебная `TutorialEmaRsi`, FT-05): около **60 сигналов входа** на ленте. Список сигналов одинаков для обеих моделей и вычисляется один раз — это принцип «один и тот же сигнал прогоняется дважды».

**Модель А — «Идеал» (как движок бэктеста, по FT-10 «Подробнее»):**
- вход по `open(t+1)` минус `fee_taker` (или `fee_maker` при лимите — считаем, что лимитка «коснулась → исполнена»);
- выход: стоп −10% внутри свечи по уровню, ROI +6%/+2% по open следующей, сигнал выхода по open следующей;
- объём ордера не влияет на цену, все ордера исполнены полностью.

**Модель Б — «Реальность»:** для каждого сигнала последовательно применяется цепочка (порядок фиксирован, каждый шаг пишет строку в журнал сделки):

1. `pause`: если `paused_{t+1}` — ордер переносится на первую неприостановленную свечу.
2. `reject`: с вероятностью `p_reject` (детерминированный PRNG по номеру сделки) сделка пропускается; запись «отказ API».
3. `latency`: цена ордера = точка минутного пути на `t+1 + L`. Ожидаемый компонент против трейдера задаётся как `drift = 0,15·σ_bar·sqrt(L/3600)` в сторону, невыгодную входу (отражает урок 2.2/1.8: делай-кост); остальное — шум пути.
4. `spread`: к цене покупки `+ spread_bps/2`, к цене продажи `− spread_bps/2`.
5. `impact`: `slip_bps = k · σ_bar_bps · sqrt(Q/V_bar)`, `k = 0,5` (закон квадратного корня, 5.2/1.8), где `Q/V_bar` — значение главного ползунка; применяется к обеим сторонам.
6. Лимитный режим: ордер по цене `bid` в момент отправки; исполнен, если минутный путь в течение `unfilledtimeout` касается уровня; доля исполнения `partial` (равномерно 30–100% при включённом ползунке); при неисполнении — либо пропуск, либо маркет с taker-комиссией и полным `impact`.
7. `gap`: если следующая свеча открылась ниже уровня стопа — выход по `open` (или по `open − gap_σ·σ` в стресс-часы), а не по уровню.
8. Комиссии: maker/taker в зависимости от фактического типа исполнения.

Результат каждой сделки: `pnl_ideal`, `pnl_real`, и **разложение разницы по восьми причинам** (`delta[id]`), полученное последовательным применением шагов (разница после шага − до шага). Сумма `delta` равна `pnl_ideal − pnl_real` с точностью до округления — это приёмочный инвариант.

**Агрегаты:** `R_ideal`, `R_real`, `ExecDev = (R_real − R_ideal)/R_ideal` (если `R_ideal ≤ 0` — показывать «не вычисляется, разница в п.п.: …»), число сделок в обеих моделях (в реальности меньше — пропуски), средний слиппедж, доля пропущенных.

### 2.4. Экран и режимы

Три вкладки: **«Разрыв»** (по умолчанию), **«Покадрово»** (E3), **«Восемь причин»** (игра).

**Вкладка «Разрыв»:**

- **Левая колонка — панель управления**: пресет пары (см. 2.5) и восемь строк-переключателей из таблицы 2.2, каждая с чекбоксом «включить» и своим ползунком; главный ползунок «Размер ордера / объём бара» выделен крупнее и вынесен первым. Кнопки «Всё выключить (= бэктест)» и «Реалистичный дефолт».
- **Верх центра — две кривые эквити**: пунктирная зелёная «Бэктест (идеал)» и сплошная синяя «Реальность»; зона между ними красная с подписью «разрыв». Маркеры пропущенных сделок (серые крестики на нижней ленте).
- **Центр — водопад** (компонент `GapWaterfall`): стартовый столбец `R_ideal`, восемь красных ступеней по `Σ delta[id]` (подписи на русском, отсортированы по величине), финальный столбец `R_real`. Наведение на ступень подсвечивает соответствующую строку панели слева.
- **Низ центра — шкала Execution Deviation** (компонент `ExecDevGauge`): дуга с зонами из 4.5: 0–10% зелёная «норма», 10–25% жёлтая «серая зона: модель слиппеджа оптимистична», >25% красная «стоп: масштабировать нельзя». Подпись значения и фраза зоны. Рядом маленькая карточка «Числа урока 4.5: бэктест +12,0%, бумага +10,2% → −15%, серая зона».
- **Правая колонка — «Что это значит»**: три реактивных вывода (см. 2.6) и мини-таблица «Бэктест / Реальность»: сделок, средний слип bps, доля пропусков, комиссия за круг.

**Вкладка «Покадрово» (E3):**
- Две синхронные дорожки над одной свечной лентой: верх «Идеал», низ «Реальность». Кнопки E3: «шаг», «пауза», «к следующей сделке», «что видел бот в этот момент» (правая часть графика затемнена — стандартная функция E3).
- В момент сделки под лентой раскрывается **карточка расхождения**: слева цена входа идеала, справа — реальности, между ними цепочка чипов с дельтами по шагам («задержка −8 bps», «спред −5», «объём −22», «частичный фил 60%»…). Незадействованные причины — серые чипы.
- Внизу счётчик: «Сделка 14/60 · накоплено: идеал +8,4% · реальность +5,1% · разрыв 3,3 п.п.».
- На минутном пути внутри свечи (E3 умеет зумить бар) рисуются точки: «сигнал», «ордер отправлен», «исполнено (идеал)», «исполнено (реальность)», «стоп-уровень», «факт стопа».

**Вкладка «Восемь причин» (ИГР):**
- Это практика урока в интерактиве. Слева восемь карточек-причин (перемешаны), справа восемь карточек «как измерить» (перемешаны). Ученик соединяет пары перетаскиванием (или тапами на мобильном). Проверка: подсветка правильных/неправильных, объяснение к каждой ошибке из колонки «Что в реальности».
- Второй этап: «Расставь причины по силе удара на **твоей** текущей конфигурации» — drag-сортировка восьми чипов, проверяется против фактических `Σ delta[id]` из вкладки «Разрыв» (допуск: соседние позиции считаются верными, если разница между дельтами < 15% от суммы). Это заставляет вернуться к ползункам и посмотреть на водопад.

### 2.5. Пресеты (профили пары и сценарии урока)

| Пресет | Q/V | Спред bps | Задержка, с | Fee taker/maker | Отказы | Ожидаемый ExecDev |
|---|---|---|---|---|---|---|
| «Ликвидная пара (BTC/USDT)» | 0,5% | 2 | 1,5 | 0,10/0,075 | 0,5% | 5–9% (зелёная) |
| «Средний альт» | 3% | 8 | 3 | 0,10/0,075 | 1% | 12–20% (серая) |
| «Тонкий альт» | 15% | 25 | 5 | 0,10/0,075 | 2% | >25% (красная) |
| «Бегемот в бассейне (5.2)» | 50% | 25 | 5 | — | — | результат уходит в минус; подпись «слип 0,02% → 0,18%, +45% → −12% — как в уроке 5.2» (значения показываются как цитата урока, факт на ленте — свой) |
| «Как в уроке 4.5» | подбирается так, чтобы ExecDev ≈ −15% | | | | | подпись «серая зона» |
| «Только комиссии = бэктест» | всё выкл. | — | — | 0,10 | — | 0% (инвариант) |

Значения диапазонов слиппеджа и комиссий сверены с таблицей урока 1.8 (BTC/ETH 0,01–0,03%, альты 0,05–0,30%).

### 2.6. Тексты обратной связи (реактивные)

- При включении любого расхождения впервые: «Заметь знак: каждое упрощение бэктеста работает **в одну сторону** — вверх для отчёта, вниз для тебя (FT-10)».
- `impact` — доминирующая ступень водопада: «Твой главный враг — размер. Слип растёт как корень из доли объёма: удвоил ордер — слип вырос в 1,4 раза (5.2). Это и есть ёмкость стратегии».
- Режим «лимит» с коротким таймаутом и «пропустить»: «Ты сэкономил на комиссии, но потерял N сделок из 60. Лимитка — это риск неисполнения (1.8)».
- Режим «лимит» + «маркетом при таймауте»: «Худшее из двух миров: ждал, не дождался, заплатил taker и полный слип».
- ExecDev в красной зоне: «Бумажный результат не воспроизводится. Увеличивать капитал нельзя — сначала чинить модель исполнения (4.5)».
- Все выключены: «Это и есть бэктест: чистая модель. Она полезна, чтобы **сравнивать гипотезы между собой**, а не чтобы обещать доходность».

### 2.7. Критерий освоения

1. Довести ExecDev до красной зоны, меняя **только** главный ползунок (осознать роль размера).
2. Вернуть ExecDev в зелёную зону на пресете «Средний альт», меняя любые настройки, **кроме** выключения причин (найти рабочую конфигурацию: меньший ордер, лимитка с разумным таймаутом).
3. Игра «Восемь причин»: 8/8 пар и сортировка по силе с допуском.
4. Контрольный вопрос (из «Проверь себя» урока): «Какое упрощение смещает результат вверх?» — правильный: «Исполнение по open следующего бара без учёта влияния объёма на цену»; дистракторы: «Учёт комиссий», «Таймаут заявок», «Стоп-лосс».

### 2.8. Контракт с движком E3 и запасной режим

Интерактив ожидает от E3:

```ts
interface E3Replay {
  load(tape: Candle[], intrabar?: MinutePath[]): void;
  addLane(id: string, series: TradeEvent[]): void;        // «ideal», «real»
  onFrame(cb: (t: number) => void): void;                  // шаг по свечам
  onTradeEvent(cb: (laneId, ev: TradeEvent) => void): void;
  setMask(mode: 'seen-by-bot' | 'full'): void;             // затемнение будущего
  zoomBar(t: number): void;                                // показать минутный путь
  annotate(t: number, marks: Mark[]): void;                // точки сигнал/ордер/фил/стоп
}
```

`TradeEvent = { t_signal, t_order, t_fill, price_ideal?, price_real?, deltas: Record<CauseId, number>, status: 'filled'|'partial'|'skipped'|'rejected' }`.

Если E3 недоступен: вкладка «Покадрово» рендерится встроенным упрощённым плеером (список сделок + карточка расхождения + статичный минутный путь одной свечи), без затемнения будущего. Флаг сборки `E3_AVAILABLE`.

### 2.9. Языковой слой

Обязательные карточки: `backtest`, `dry-run`, `fee`, `maker/taker`, `slippage`, `spread`, `bps`, `unfilledtimeout`, `partial fill`, `reject`, `rate-limit`, `Execution Deviation`, `ExecDev`, `open(t+1)`. В режиме «рус.» все подписи ползунков, водопада и легенд — на русском; английский токен сохраняется в скобках один раз в панели.

### 2.10. Технические требования и приёмка

- Полный пересчёт двух моделей на 2000 свечей × 60 сделок при движении ползунка ≤ 60 мс; минутные пути генерируются один раз при загрузке (2000 × 60 точек = 120k чисел, `Float32Array`).
- Детерминированность: сид фиксирован; PRNG для отказов индексирован номером сделки, чтобы включение других причин не меняло, какие именно сделки отвергнуты.
- **Инварианты (тесты):**
  - все причины выключены ⇒ `R_real === R_ideal` побитово; ExecDev = 0;
  - монотонность: увеличение `Q/V`, `spread`, `latency`, `p_reject` при прочих равных не увеличивает `R_real` (проверка на сетке значений);
  - разложение: `Σ_id Σ_trades delta[id] = R_ideal − R_real` с точностью 1e-6 в п.п.;
  - число сделок «Реальность» ≤ «Идеал» всегда;
  - пресет «Ликвидная пара» даёт ExecDev в зелёной зоне, «Тонкий альт» — в красной (закрепить диапазоны из 2.5).
- Edge-кейсы: `R_ideal ≤ 0` → шкала показывает «н/д» и разницу в п.п.; окно без сделок → сообщение «сигналов нет, нечего сравнивать».
- Мобильная вёрстка: панель управления сворачивается в «шторку», водопад горизонтально скроллится, покадровый режим — только по одной дорожке за раз с переключателем «Идеал/Реальность».
- Доступность: все ползунки — `<input type=range>` с `aria-valuetext` на русском; водопад дублируется таблицей для скринридера.
- Телеметрия: значения ползунков в момент прохождения каждого критерия, число попыток в игре «Восемь причин», выбранный пресет, время в покадровом режиме.

### 2.11. Что НЕ входит в объём

- Реальные данные бирж и API.
- Моделирование фандинга и шортов (первый год курса — спот, лонг-онли).
- Оптимизация параметров стратегии (это FT-16). Стратегия и сигналы фиксированы намеренно: интерактив про исполнение, а не про сигнал.
------------------------------------------

# Детальные спецификации для реализации: FT-11 и FT-12

Обе спеки написаны для одного агента-исполнителя и **делят общий фундамент** (раздел 0). Читать в порядке: 0 → FT-11 → FT-12.

---

## 0. Общий фундамент для обоих интерактивов

### 0.1. Методические инварианты (не нарушать)
1. **Один интерактив = одно заблуждение.** FT-11: «код работает — значит утечки нет». FT-12: «индикатор сразу правильный».
2. **Все тексты на русском.** Любой английский токен в коде/терминале доступен через режим «Ткни в непонятное» (движок E1): клик → всплывающая карточка «что это — зачем — где в уроке». Без этого режима интерактив считается не принятым.
3. **Числа не выдумываются**, а вычисляются на синтетических данных с зафиксированным seed; каждая цифра на экране подписана «синтетические данные для тренировки». Числа из уроков (Sharpe 9,8 → −0,42 из 1.7; «запас 200 vs 600» из FT-12; правило «≥ самого длинного окна» и `startup_candle_count = 400`) цитируются как ориентиры, не как результат симуляции.
4. **Сквозной персонаж Алексей**, депозит 1000 USDT (= `dry_run_wallet` из FT-04). Стратегии «написал ИИ-агент по ТЗ Алексея» — мостик к ВК3 (галлюцинации) и ВК2 (ревью).
5. **Честность механики.** Эмулятор бэктеста всегда исполняет сигнал свечи t по `open` свечи t+1 (как Freqtrade). Никаких «исполнений по close».
6. Интерактивы **не утверждают прибыльность**: финальные подписи явно говорят «зелёный отчёт ≠ прибыль».

### 0.2. Общие модули (реализовать один раз, положить в `sim-core/`)

| Модуль | Содержимое | Требования |
|---|---|---|
| `sim-core/prng.ts` | `mulberry32(seed)` | Детерминизм: одинаковый seed → байт-в-байт одинаковые ряды на любой платформе |
| `sim-core/series.ts` | `genCandles({n, seed, drift, vol, impulses[]})` → массив `{t, open, high, low, close, volume}` | Геометрическое блуждание по `close`; `open[t]=close[t-1]`; `high/low` = close ± |шум|; `volume>0` везде (нужен фильтр урока); задаваемые импульсы (индекс, сила) для «интересных» участков |
| `sim-core/pandas-lite.ts` | `shift(arr,k)` (k может быть отрицательным), `rollingMean(arr,w,{center,minPeriods})`, `bfill`, `ffill`, `sma(arr,p)`, `emaTalib(arr,p)`, `rsiWilder(close,p)`, `atrWilder(h,l,c,p)`, `zscoreFull(arr)` | Семантика **точно как pandas/TA-Lib** (см. тесты 0.4). `NaN` — обычный `NaN` JS |
| `sim-core/backtest-lite.ts` | `runBacktest({candles, enter[], exit[], stoploss, roi, feeSide})` → `{trades[], stats:{n, pf, totalPct, winRate}}` | Вход по `open[t+1]` при `enter[t]==1`; одна позиция за раз; выход: (а) внутрисвечной стоп по `low` (для лонга), (б) ROI по `high`, (в) `exit[t]==1` → выход по `open[t+1]`; комиссия `feeSide=0.001` на сторону; PF = Σприбылей/Σубытков; при Σубытков=0 показывать «∞ (нет убытков)» |
| `sim-core/chart.ts` | SVG/canvas-график: свечи или линия цены, до 3 индикаторных линий, вертикальная перетаскиваемая «шторка», заштрихованные зоны, маркеры сигналов ▲▼, две «сигнальные ленты» под графиком | ≤ 1600 точек без лагов; тач-перетаскивание; клавиши ←/→ двигают шторку на 1 свечу, Shift+←/→ на 10 |
| `sim-core/terminal.ts` (E1) | Эмулятор терминала: команда + вывод; каждая строка/токен кликабельны → карточка перевода; переключатель «англ. / рус. подписи / оба»; кнопка «Скрыть английский» | Словарь один на приложение (`glossary.json`), пополняется из «Терминов урока» |

### 0.3. Формулы индикаторов (обязательные, соответствуют TA-Lib — то, что использует Freqtrade)
- **SMA(p)**: первые p−1 значений NaN; далее среднее последних p.
- **EMA(p)** (TA-Lib): α = 2/(p+1); первые p−1 значений NaN; `EMA[p-1] = SMA(первые p)`; далее `EMA[t] = α·close[t] + (1−α)·EMA[t−1]`.
- **RSI(p)** (Wilder): gains/losses по разностям close; первые p значений NaN; стартовые средние = SMA(p) прироста и убыли; далее сглаживание RMA с α = 1/p; `RSI = 100 − 100/(1 + avgGain/avgLoss)`; при avgLoss=0 → 100.
- **ATR(p)** (Wilder): TR = max(h−l, |h−c₋₁|, |l−c₋₁|); seed SMA(p), далее RMA α=1/p.
- **Остаточный вес стартового значения** через n шагов после seed: `w(n) = (1−α)^n`. **Готовность** = `1 − w(n)`. Для SMA готовность = 100 % сразу после p свечей (не рекурсивна).

### 0.4. Обязательные юнит-тесты `pandas-lite` (падают — интерактив не собирается)
```
shift([1,2,3], 1)                      → [NaN,1,2]
shift([1,2,3], -1)                     → [2,3,NaN]
rollingMean([1,2,3,4,5], 3)            → [NaN,NaN,2,3,4]
rollingMean([1,2,3,4,5], 3, center)    → [NaN,2,3,4,NaN]
bfill([NaN,1,NaN,NaN,4])               → [1,1,4,4,4]
ffill([NaN,1,NaN,NaN,4])               → [NaN,1,1,1,4]
sma([1,2,3,4,5], 3)                    → [NaN,NaN,2,3,4]
emaTalib([1,2,3,4,5,6], 3)             → [NaN,NaN,2,3,4,5]      // seed SMA=2, α=0.5
w(n): p=200, n=200 → 0.135 ; n=400 → 0.018 ; n=460 → 0.010 (±0.001)
w(n): p=14 (RMA), n=14 → 0.354 ; n=64 → 0.009
```

---

## FT-11 · «Смести окно — сломай телепата»

### 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `FT11-LOOKAHEAD` |
| Урок | FT-11 «Проверка на подсматривание в будущее» (урок 211); опирается на 1.7, FT-05, FT-13 |
| Тип | СИМ (этапы 1–2) + ИГР (этапы 3–4) |
| Ломаемое заблуждение | «Код запустился и нарисовал красивый бэктест — значит утечки нет» |
| Движки | E6 «Охотник за утечкой» (этап 3, банк кейсов), E1 «Терминал-переводчик» (этап 2 и 4), фрагмент E3 (шторка «что видел бот») |
| Место в уроке | После блока «▸ Глубже», перед «Практикой» |
| Время прохождения | 8–12 мин |
| Персонаж | Алексей, 1000 USDT |
| Волна сборки | W-B |

### 2. Учебная цель и критерии освоения

**Ученик после интерактива:**
1. объясняет своими словами механику `lookahead-analysis`: «история обрезается в момент сигнала, стратегия прогоняется заново; если сигнал или значения индикаторов изменились — стратегия смотрела в будущее»;
2. по двум сигнальным лентам («бэктест видел всё» vs «бот вживую») отличает честную стратегию от утекающей;
3. находит в коде строку-виновника трёх типов: `shift(-1)`, `rolling(..., center=True)`, `bfill()` — и знает правку каждой;
4. называет границы инструмента: не ловит survivorship-отбор пар и нормализацию, сделанную **до** передачи данных в стратегию; не доказывает прибыльность.

**Системный критерий «освоено»:** пройдены все 4 этапа; вердикты по трём стратегиям верны (допускается 1 исправление); три виновника найдены суммарно не более чем с 3 подсказками; финальный вопрос — верно с первой попытки. Иначе статус «пройдено, повторить через 3 дня» (крючок для E4).

### 3. Данные

- `N = 140` часовых свечей; seed фиксирован (`FT11_SEED = 20240611`, менять запрещено без пересдачи приёмочных тестов); свечи 0–19 — зона «прогрев» (заштрихована серым, подпись «индикаторы греются — сигналов нет», ссылка «почему — в следующем уроке FT-12»).
- Импульсы: два восходящих (индексы ~45 и ~95, +4–6 % за 3–4 свечи) и один нисходящий (~70). Нужны, чтобы у утечек были «сочные» сделки.
- Все `volume > 0`.

### 4. Четыре стратегии (код показывается ученику как есть, с русскими комментариями по тумблеру)

Общее: `stoploss = -0.05`, `minimal_roi = {'0': 0.03}`, комиссия 0,1 % на сторону, вход по `open[t+1]`. Периоды укорочены (подпись: «периоды укорочены для наглядности; логика — как в FT-05»).

**А — честная (`HonestDip`)**
```python
def populate_indicators(self, df, metadata):
    df['ema_fast'] = ta.EMA(df, timeperiod=5)
    df['ema_slow'] = ta.EMA(df, timeperiod=20)
    df['rsi'] = ta.RSI(df, timeperiod=7)
    return df

def populate_entry_trend(self, df, metadata):
    df.loc[
        (df['ema_fast'] > df['ema_slow']) &
        (df['rsi'] < 40) &
        (df['rsi'].shift(1) >= 40) &      # пересечение, как в FT-05
        (df['volume'] > 0),
        'enter_long'] = 1
    return df
```

**Б — утечка `shift(-1)` (`NextCandlePeek`)**
```python
def populate_indicators(self, df, metadata):
    df['ema_fast'] = ta.EMA(df, timeperiod=5)
    df['ema_slow'] = ta.EMA(df, timeperiod=20)
    df['rsi'] = ta.RSI(df, timeperiod=7)
    df['next_close'] = df['close'].shift(-1)          # ← ВИНОВНИК (строка 6)
    return df

def populate_entry_trend(self, df, metadata):
    df.loc[
        (df['ema_fast'] > df['ema_slow']) &
        (df['rsi'] < 45) &
        (df['next_close'] > df['close']) &            # использует виновника
        (df['volume'] > 0),
        'enter_long'] = 1
    return df
```

**В — утечка `center=True` (`CenteredMean`)**
```python
def populate_indicators(self, df, metadata):
    df['ema_fast'] = ta.EMA(df, timeperiod=5)
    df['ema_slow'] = ta.EMA(df, timeperiod=20)
    df['sma_c'] = df['close'].rolling(7, center=True).mean()   # ← ВИНОВНИК (строка 5)
    return df

def populate_entry_trend(self, df, metadata):
    df.loc[
        (df['ema_fast'] > df['ema_slow']) &
        (df['close'] < df['sma_c']) &                 # «ниже средней» — но средняя знает t+1..t+3
        (df['volume'] > 0),
        'enter_long'] = 1
    return df
```

**Г — утечка `bfill()` (`Informative4hLeak`, открывается на этапе 3 как «бонус-кейс»)**
```python
def populate_indicators(self, df, metadata):
    df['ema_fast'] = ta.EMA(df, timeperiod=5)
    df['ema_slow'] = ta.EMA(df, timeperiod=20)
    ema_4h = ta.EMA(df, timeperiod=5)
    df['ema_4h'] = ema_4h.where(df.index % 4 == 3)    # значение есть только на закрытии 4-часового блока
    df['ema_4h'] = df['ema_4h'].bfill()               # ← ВИНОВНИК (строка 6): часы 0–2 берут закрытие, которого ещё нет
    return df

def populate_entry_trend(self, df, metadata):
    df.loc[
        (df['close'] > df['ema_4h']) &
        (df['close'].shift(1) <= df['ema_4h'].shift(1)) &
        (df['volume'] > 0),
        'enter_long'] = 1
    return df
```

Выход для всех: `exit_long = (ema_fast < ema_slow)`.

**Приёмочные ограничения на данные + стратегии** (агент подбирает seed/импульсы, пока не выполнятся; после фиксации seed не менять):
- А: ≥ 4 входа; ленты «видел всё» и «вживую» **совпадают в 100 % свечей**.
- Б, В, Г: ≥ 5 входов в прогоне «видел всё»; **PF ≥ 2,0** в прогоне «видел всё»; **PF ≤ 1,2** в прогоне «вживую»; доля расходящихся входов ≥ 80 %.
- После починки Б/В/Г: ленты совпадают в 100 % свечей.

### 5. Два режима прогона (ядро симуляции)

```
run_full(strategy):  индикаторы и сигналы на всех N свечах       → enter_full[t], ind_full[t]
run_live(strategy):  для каждого t в [0..N-1]:
                        df_t = candles[0..t]
                        enter_live[t] = signal(strategy, df_t)[t]     # последняя строка
                        ind_live[t]   = indicators(strategy, df_t)[t]
```
`run_live` — O(N²) на 140 свечах, считается за доли секунды, кэшируется на старте. Это и есть «бот вживую»: на закрытии свечи t у него есть только свечи ≤ t.

**Эмуляция `lookahead-analysis`** (как реальный инструмент — обрезка в точке каждой сделки):
```
entries = [t | enter_full[t]==1][:20]              # как --targeted-trade-amount по умолчанию
biased_entry = count(t in entries | enter_live[t] != enter_full[t])
biased_indicators = {col | ∃ t in entries: ind_live[t][col] ≠ ind_full[t][col] (с допуском 1e-9, NaN≠число)}
has_bias = biased_entry > 0 or biased_indicators ≠ ∅
```
Аналогично для выходов (`biased_exit`).

### 6. Пользовательский сценарий по экранам

#### Экран 0 · Интро (одна карточка)
> **Три стратегии Алексея.** ИИ-агент написал ему три стратегии. Все три показали красивый бэктест. Одна честная, две — телепаты: подсматривают в будущее. Твоя задача — сломать телепатов. Инструмент: та же проверка, которую делает `freqtrade lookahead-analysis`, только руками.
Кнопка «Начать». Справа мини-бейджи трёх стратегий (значения вычисляются): «А · бэктест +X % · PF Y · сделок N», аналогично Б, В. Бейджи специально показаны ДО разоблачения — ученик должен увидеть, что телепаты выглядят лучше.

#### Экран 1 · «Шторка: что видел бот» (СИМ)
Раскладка (десктоп): слева график 70 %, справа панель «Свеча t» 30 %. Мобильный: панель под графиком.

- Вкладки **А / Б / В** над графиком.
- График: линия цены, `ema_fast`/`ema_slow` (и `sma_c` для В, `next_close` для Б как пунктир), маркеры ▲ входов прогона «видел всё».
- **Шторка** — вертикальная линия; всё правее затемнено, надпись на затемнении: «Бот этого ещё не видел». Стартовая позиция — первая свеча входа стратегии.
- **Лента 1** «Бэктест (видел всю историю)»: клетки по свечам, зелёные ▲ где `enter_full=1`.
- **Лента 2** «Бот вживую (история обрезана на каждой свече)»: пустая до нажатия кнопки **«Прогнать свеча за свечой ▶»**. Нажатие — анимация 1,5 с слева направо: клетки заполняются `enter_live`; клетка, где `enter_live ≠ enter_full`, вспыхивает красным с ⚡ и остаётся красной.
- Панель «Свеча t» (t = позиция шторки): таблица `колонка | видел всё | вживую | Δ`; расхождения красным; NaN показывается как «— (значения нет: следующей свечи ещё нет)».
- Счётчик над лентами: «Совпадений: X из N · Расхождений на входах: Y».
- Подсказка при первом расхождении (тултип у ⚡): «В бэктесте здесь вход, а вживую — тишина. Значит, вход зависел от свечей правее шторки».

Перетаскивание шторки — единственный обязательный жест до «Прогнать». Если ученик 20 с не двигает шторку — мягкая подсказка «Потяни шторку влево-вправо: правая часть — будущее, которого у бота нет».

#### Экран 2 · «Твой вердикт → терминал» (ИГР-микро + E1)
- Три карточки А/Б/В с переключателем **«Чисто / Утечка»**. Кнопка «Проверить инструментом» активна после трёх выборов.
- Нажатие → эмулятор терминала (E1):
```
$ freqtrade lookahead-analysis -c user_data/config.json \
    --strategy-list HonestDip NextCandlePeek CenteredMean \
    --timerange 20240601-20240607
...
| strategy       | has_bias | total_signals | biased_entry_signals | biased_exit_signals | biased_indicators        |
|----------------|----------|---------------|----------------------|---------------------|--------------------------|
| HonestDip      | False    | 4             | 0                    | 0                   |                          |
| NextCandlePeek | True     | 7             | 7                    | 0                   | next_close               |
| CenteredMean   | True     | 6             | 6                    | 1                   | sma_c                    |
```
Все числа берутся из расчёта раздела 5 (не хардкод). Каждая колонка кликабельна (см. словарь, раздел 8). Кнопка «Скрыть английский» заменяет заголовки: `has_bias → Есть утечка`, `total_signals → Сигналов проверено`, `biased_entry_signals → Входов с утечкой`, `biased_exit_signals → Выходов с утечкой`, `biased_indicators → Колонки-подозреваемые`.
- Сверка вердиктов: верно — зелёная галка; неверно — «Ты сказал «чисто», а инструмент нашёл 7 расходящихся входов из 7. Вернись на шторку и посмотри свечу t=…» (кнопка возврата на экран 1 с шторкой на первом расхождении). После исправления — дальше.
- Подпись под терминалом: «Инструмент делает то же, что ты делал шторкой: обрезает историю в точке каждой сделки и прогоняет стратегию заново».

#### Экран 3 · «Найди строку-виновника» (E6, банк кейсов)
Для Б, затем В, затем Г (бонус, помечен «ещё один частый случай — из FT-05»).

- Слева код стратегии (12–16 строк, нумерация). Тумблер «Русские подписи» добавляет справа от каждой строки короткое пояснение (`df['close'].shift(-1)` → «взять close следующей свечи»).
- Задание: «Кликни строку, из-за которой стратегия видит будущее». Подсказка сверху: «Инструмент назвал колонку-подозреваемого: `next_close`».
- Логика попыток: до 3 кликов. Неверно #1 → «Не здесь. Виновник создаёт или меняет колонку, которая попала в подозреваемые». Неверно #2 → подсветить два кандидата (виновник + строка использования). Неверно #3 → раскрыть с объяснением; засчитать «с подсказкой».
- Верно → **карточка объяснения** (тексты фиксированы):
  - `shift(-1)`: «Минус в `shift` значит «покажи следующую свечу». В бэктесте она есть — бот «угадывает». Вживую её нет: там NaN, условие ложно, бот молчит. Отсюда 7 расхождений из 7. Ровно эта ошибка в уроке 1.7 давала Sharpe 9,8, а после правки — −0,42».
  - `center=True`: «Центрированное окно из 7 свечей смотрит на 3 свечи назад и 3 вперёд. На последней свече вперёд смотреть некуда — pandas ставит NaN, а в бэктесте средняя «знала» три будущие цены».
  - `bfill()`: «`bfill` заполняет пропуск **следующим** известным значением. Часы 0–2 четырёхчасового блока получили закрытие, которое случится на 3-м часу. Классическая ошибка информативной пары из FT-05».
- **Почини:** чипы замены для виновной строки (ученик выбирает один):
  - Б: `shift(1)` · `shift(-1)` (оставить) · «удалить условие целиком»; верные: `shift(1)` **или** удалить (оба принимаются, с разной подписью: «`shift(1)` — теперь условие «прошлая свеча ниже текущей»: честно, но это уже другая гипотеза»).
  - В: `center=False` · `min_periods=1` (ловушка: NaN исчезнет, а будущее останется) · оставить; верный: `center=False`.
  - Г: `ffill()` · `bfill()` · `dropna()`; верный: `ffill()` (подпись: «берём последнее **закрывшееся** значение — в Freqtrade за это отвечает `merge_informative_pair` со сдвигом»).
- После верной правки — кнопка «Прогнать снова»: ленты пересчитываются и совпадают; бейдж стратегии обновляется: «PF было Y → стало Y′» (Y′ ≤ 1,2 по ограничениям). Подпись: «Телепат без телепатии. Красивый бэктест держался на одной строке».

#### Экран 4 · «Границы и итог»
Карточка «Что `lookahead-analysis` НЕ ловит» (три пункта с иконками):
1. Список пар, отобранный сегодня по объёму (ошибка выжившего, 2.6 / FT-04) — данные честные, выборка нет.
2. Нормализацию/скейлер, посчитанные **до** передачи данных в стратегию (в стратегии всё выглядит чисто).
3. Недогретые индикаторы — это отдельная проверка `recursive-analysis`, следующий урок (FT-12).

Финальный вопрос (одиночный выбор):
«Стратегия прошла `lookahead-analysis` зелёным (has_bias = False). Что это доказывает?»
- «Стратегия прибыльна» ✗ → «Нет: проверка исключает один класс самообмана, о прибыли она молчит».
- «Сигналы стратегии не зависят от будущих свечей — и только это» ✓
- «Данные и список пар честные» ✗ → «Выборку пар и внешнюю нормализацию инструмент не видит».
- «Индикаторы прогреты правильно» ✗ → «Это `recursive-analysis` — FT-12».

Кнопка «Добавить в мой конвейер анти-лжец» (крючок E4/FT-13): создаёт пункт «lookahead-analysis зелёный» в чек-листе ученика с датой. Кнопка «Открыть словарь урока».

### 7. Состояния и обратная связь (сводно)

| Событие | Реакция |
|---|---|
| Шторка не двигалась 20 с | Мягкая подсказка |
| Прогон «вживую» завершён без расхождений (А) | «Совпадений 140 из 140. Честная стратегия ведёт себя одинаково с историей и без неё» |
| Прогон с расхождениями | Красные ⚡, счётчик, тултип у первого |
| Вердикт неверный | Возврат на шторку в точку расхождения |
| 3 неверных клика по коду | Раскрытие + пометка «с подсказкой» |
| Выбран чип-ловушка `min_periods=1` | «NaN пропал, но `center=True` остался — ленты всё ещё расходятся» + прогон показывает расхождения |
| Повторное прохождение | Seed тот же, но порядок вкладок А/Б/В перемешивается, чтобы вердикт нельзя было запомнить по позиции |

### 8. Словарь «Ткни в непонятное» (минимальный набор для этого интерактива; формат `glossary.json`)

`lookahead-analysis`, `recursive-analysis`, `has_bias`, `total_signals`, `biased_entry_signals`, `biased_exit_signals`, `biased_indicators`, `--strategy-list`, `--timerange`, `populate_indicators`, `populate_entry_trend`, `enter_long`, `exit_long`, `df`/`dataframe`, `shift`, `rolling`, `center=True`, `min_periods`, `bfill`, `ffill`, `dropna`, `NaN`, `ta.EMA`, `ta.RSI`, `timeperiod`, `where`, `index % 4`, `PF`/profit factor, `open t+1`. Каждая карточка: 1 фраза «что это», 1 фраза «зачем здесь», ссылка «впервые — в уроке …».

### 9. Телеметрия
События: `ft11_start`, `cut_drag{count}`, `replay_run{strategy, mismatches}`, `verdict{strategy, choice, correct}`, `terminal_open`, `culprit_click{strategy, line, correct, attempt}`, `fix_choice{strategy, chip, correct}`, `rerun_after_fix{strategy, pf_before, pf_after}`, `final_question{choice, correct}`, `stage_time{stage, sec}`, `add_to_pipeline`.
Метрики эффективности: доля верных вердиктов с первой попытки; среднее число подсказок на виновника; доля верного финального вопроса; при повторном прохождении — снижение ошибок ≥ 50 %.

### 10. Технические требования
- Только клиент (JS/TS), без сети и бэкенда; никаких реальных вызовов Freqtrade/бирж.
- Все расчёты синхронные, кэш `run_live` на старте; общее время инициализации ≤ 300 мс на мобильном.
- Доступность: шторка управляется клавиатурой; ленты имеют текстовую альтернативу («свеча 47: бэктест — вход, вживую — нет»); контраст ≥ 4,5:1; красный дублируется значком ⚡.
- Адаптив от 360 px: график 100 % ширины, панель «Свеча t» под ним, код на этапе 3 с горизонтальной прокруткой и увеличенной зоной клика по строке (вся строка, ≥ 44 px высоты).

### 11. Приёмочные тест-кейсы
1. Юнит-тесты 0.4 зелёные.
2. Для seed `FT11_SEED`: А — 0 расхождений; Б, В, Г — расхождений входов ≥ 80 %, PF «видел всё» ≥ 2,0, PF «вживую» ≤ 1,2.
3. После правок (`shift(1)`/удаление, `center=False`, `ffill`) — 0 расхождений у каждой.
4. Чип `min_periods=1` для В → расхождения сохраняются (> 0).
5. Таблица терминала совпадает с расчётом (снапшот-тест).
6. Все токены из раздела 8 открывают карточку; режим «Скрыть английский» переименовывает 6 заголовков таблицы.
7. Клавиатурное прохождение всех четырёх экранов без мыши.

### 12. Что НЕ делать
- Не показывать «бэктест по close» как альтернативу (это FT-05, не размывать фокус).
- Не хардкодить числа таблицы/бейджей.
- Не называть результат «доказательством прибыльности/безопасности».
- Не добавлять четвёртую-пятую утечку в основной поток (Г — только бонус на этапе 3): один интерактив — одно заблуждение.

---

## FT-12 · «Прогрев духовки»

### 1. Паспорт

| Поле | Значение |
|---|---|
| ID | `FT12-WARMUP` |
| Урок | FT-12 «Рекурсивная проверка и startup_candle_count» (урок 212); опирается на FT-05 (`startup_candle_count = 200`), FT-08 (данные), FT-13 (конвейер) |
| Тип | АНИМ (этап 1) + СИМ (этапы 2–4) + микро-ТРН (этап 4) |
| Ломаемое заблуждение | «Индикатор правильный с первой свечи; `startup_candle_count` — формальность» |
| Движки | общий `sim-core/chart`; E1 для эмулятора `recursive-analysis` (этап 5); крючок E4 (конвейер FT-13) |
| Место в уроке | После блока «▸ Подробнее», перед «▸ Глубже» |
| Время | 7–10 мин |
| Волна | W-D (но использует уже собранный chart-kit из FT-11) |

### 2. Учебная цель и критерии освоения

**Ученик после интерактива:**
1. видит и объясняет: EMA — рекурсивна, «помнит» стартовое значение; вес стартового значения тает как (1−α)^n, поэтому линия «догоняет» истинную постепенно;
2. понимает, что `startup_candle_count` — запас свечей до начала теста; при запасе меньше периода индикатор = NaN (сигналов нет), при запасе ≈ период — линия только что родилась и врёт;
3. знает эмпирические множители: SMA — ×1, EMA — ×2,3 (для 99 %), RSI/ATR (сглаживание Уайлдера) — ×4,6; отсюда правило урока «≥ самого длинного окна, с множителем»;
4. умеет диагностировать артефакт прогрева двойным прогоном (200 vs 600) и знает команду `recursive-analysis`.

**Системный критерий «освоено»:** этап 4 (подбор startup) решён не более чем с 2 попыток; финальный вопрос верен; на селекторе индикаторов ученик открыл минимум 2 индикатора.

### 3. Данные
- `N = 1600` часовых свечей, seed `FT12_SEED = 20240612`; умеренный тренд с тремя разворотами, чтобы пересечения цены с EMA200 в тестовом окне давали 8–15 сигналов.
- **Начало теста** `T0 = 1300`; тестовое окно `[1300, 1600)` — 300 свечей.
- **Эталон («истинная линия»)**: индикатор, посчитанный от свечи 0 (1300 свечей прогрева; для EMA200 остаточный вес ≈ e^(−12,9) ≈ 0). На экране называется «линия с полной историей».
- **Линия бота**: индикатор, посчитанный от свечи `T0 − startup` (то, что реально получит стратегия при заданном `startup_candle_count`).
- Учебная стратегия для подсчёта сигналов: вход `close` пересекает индикаторную линию снизу вверх; выход — сверху вниз; stop −5 %, ROI 3 %, комиссия 0,1 %/сторона; вход по `open[t+1]`. Для RSI: вход RSI пересекает 30 снизу вверх, выход — 70 сверху вниз. Для ATR сигналов нет — показываем только расхождение значений (подпись «ATR — фильтр риска, не сигнал»).

### 4. Расчёты

```
alpha(ind): EMA(p) → 2/(p+1); RSI/ATR(p) → 1/p; SMA → не применимо
seed_index(startup, p) = (T0 - startup) + p - 1        # свеча, на которой TA-Lib даёт первое значение
n(t) = t - seed_index                                   # шагов с рождения линии
readiness(t) = 1 - (1-alpha)^n(t)  при n≥0; иначе «нет значения» (NaN)
SMA: readiness = 100% при t ≥ seed_index, иначе NaN
relDiff(t) = |ind_bot[t] - ind_ref[t]| / |ind_ref[t]|   (для RSI — абсолютная разница в пунктах)
falseSignals = count(t in test | enter_bot[t] != enter_ref[t] or exit_bot[t] != exit_ref[t])
stats_bot = runBacktest(test window, сигналы линии бота); stats_ref = runBacktest(test window, сигналы эталона)
```
Порог «линия ещё не точна»: `relDiff > 0.1 %` для EMA/SMA; `> 1 пункт` для RSI; `> 2 %` для ATR (подбираются агентом визуально и фиксируются в конфиге интерактива).

Справочные числа для карточек (вычислять формулой, не хардкодить):
- EMA200: готовность 86,5 % через 200 шагов после seed, 98,2 % через 400, 99 % через ≈ 460 → нужный `startup ≈ 200 + 460 = 660`.
- RSI14 / ATR14: 64,6 % через 14 шагов, 99 % через ≈ 64 → `startup ≈ 80`.
- SMA200: 100 % при `startup ≥ 200`.

### 5. Пользовательский сценарий по экранам

#### Экран 0 · Интро
> **Духовка включена — но ещё холодная.** Алексей поставил в стратегию EMA200 и `startup_candle_count = 5`. Бэктест что-то посчитал. Посмотрим, что именно он считал первые двести свечей.
Иконка духовки с индикатором температуры (визуальная метафора урока). Кнопка «Включить».

#### Экран 1 · Анимация «линия догоняет» (АНИМ)
- График: цена (серая), **эталон** (серый пунктир, подпись «с полной историей»), **линия бота** (оранжевая, подпись «что видит бот при startup = N»). Вертикальная линия «Начало теста»; слева от неё зона прогрева (тёплая штриховка), ширина зоны = startup.
- Кнопка **▶ Запустить** (стартовое startup = 200 — значение из FT-05). Анимация 3–4 с: слева направо от начала окна бота. Пока n < 0 — вместо линии бегущая подпись «EMA200: значения нет (свечей меньше периода)». На seed — линия рождается из SMA (короткий «щелчок» и подпись «родилась из простой средней 200 свечей»), затем плавно сходится к эталону.
- **Датчик «Готовность индикатора»**: полукруглая шкала 0–100 % (`readiness(t)`), рядом оцифровка «остаточный вес стартового значения: (1−α)^n = 13,5 %». Под датчиком формула одной строкой: `EMA_t = α·close_t + (1−α)·EMA_{t−1}, α = 2/(200+1)`.
- **Зона ложных сигналов**: на тестовом участке свечи, где `relDiff > порога` — красная штриховка; поверх — метка **«сигналы здесь ложные»** (если в зоне есть расхождения сигналов) или «линия ещё не точна (Δ 0,4 %)» (если расхождение есть, а сигналы совпали). Счётчик справа: «Ложных сигналов в тесте: X из Y · Расхождение на первой свече теста: Z %».
- По завершении анимации — карточка: «При startup = 200 линия появилась ровно на первой свече теста и в этот момент ещё ни разу не пересчиталась: её готовность 0 %. Всё, что бэктест насчитает в начале, — свойство прогрева, не рынка».

#### Экран 2 · Ползунок `startup_candle_count` (СИМ)
- Ползунок 5 → 800 с шагом 5 и засечками: **5**, **200** (= период), **400** (значение из урока), **600** (двойной прогон), **660** (99 %). Обоснование расширения диапазона сверх 400: ученик должен сам увидеть, где линия достигает 99 %; засечка 400 подписана «ориентир урока».
- Живой пересчёт (без анимации): ширина зоны прогрева, линия бота, датчик готовности **на первой свече теста**, счётчик ложных сигналов, штриховка.
- Правая панель «Итог теста» — две колонки: «Линия бота» vs «Эталон»: сделок, PF, доходность окна. Цветовая отметка, если сделок отличается более чем на 1 или PF более чем на 15 %.
- Текстовые состояния ползунка:
  - `startup < 200`: «Индикатор = NaN на первых (200 − startup) свечах теста: бот вообще не торгует, а потом торгует по только что родившейся линии».
  - `200 ≤ startup < 400`: «Линия есть, но помнит стартовую среднюю: готовность X %».
  - `400 ≤ startup < 660`: «Готовность X % — большинство сигналов уже совпадают, но проверь двойным прогоном».
  - `≥ 660`: «Готовность ≥ 99 %: линия практически не отличается от эталона».

#### Экран 3 · Селектор индикатора (СИМ)
Переключатель **EMA200 · RSI14 · ATR14 · SMA200**. График и датчик пересчитываются под выбранный индикатор (для RSI — вторая ось 0–100; для ATR — отдельная панель; для SMA датчик прыгает 0 → 100 % на 200-й свече прогрева).
Таблица под графиком (значения формулой):

| Индикатор | Рекурсивен? | α | Свечей до 99 % после seed | Рекомендуемый запас |
|---|---|---|---|---|
| SMA200 | нет | — | 0 (точна после 200) | 200 (×1) |
| EMA200 | да | 2/201 | ≈ 460 | ≈ 660 (×2,3 + период) |
| RSI14 | да (сглаживание Уайлдера) | 1/14 | ≈ 64 | ≈ 80 (×4,6 + период) |
| ATR14 | да (сглаживание Уайлдера) | 1/14 | ≈ 64 | ≈ 80 |

Подпись: «Правило урока «запас ≥ самого длинного окна» — минимум. Рекурсивным индикаторам нужен множитель. `startup_candle_count = 400` из урока для EMA200 даёт ≈ 86 % готовности — рабочий компромисс, если биржа не отдаёт больше истории; проверяй двойным прогоном». Сноска: «Слишком большой запас упирается в лимит свечей за запрос у некоторых бирж — сверяйся с документацией».

#### Экран 4 · «Двойной прогон» (микро-ТРН, из текста урока)
- Две кнопки: **«Прогнать с запасом 200»** и **«Прогнать с запасом 600»** (индикатор — EMA200). Каждая выдаёт карточку: сделок / PF / доходность окна. Если карточки различаются (по правилу экрана 2) — надпись: «Результаты разошлись. Рынок один и тот же, данные одни и те же — значит, это артефакт прогрева, а не рынок».
- Задание: **«Подбери минимальный `startup_candle_count`, при котором результат теста совпадает с эталоном: разница ≤ 1 сделка и PF в пределах ±10 %»**. Ученик двигает ползунок и жмёт «Проверить». До 3 попыток; после второй неверной — подсказка «Посмотри таблицу множителей на экране 3»; после третьей — раскрыть (правильный диапазон вычисляется из данных; ожидаемо 400–660).
- Обратная связь при успехе: «Ты нашёл запас, при котором тест перестал зависеть от прогрева. Именно это и проверяет `recursive-analysis`».

#### Экран 5 · Эмулятор `recursive-analysis` (E1)
```
$ freqtrade recursive-analysis -c user_data/config.json \
    --strategy TutorialEmaRsi --timerange 20240601-20240614 \
    --startup-candle 100 200 400 600

| indicators | 100      | 200      | 400     | 600     |
|------------|----------|----------|---------|---------|
| ema_slow   | nan      | -1.842%  | -0.221% | -0.031% |
| rsi        | -0.412%  | -0.003%  | 0.000%  | 0.000%  |
| ema_fast   | 0.000%   | 0.000%   | 0.000%  | 0.000%  |
```
Проценты — из расчёта `relDiff` на первой свече теста относительно эталона (не хардкод; знак по фактическому отклонению). Строки кликабельны; режим «Скрыть английский»: `indicators → Индикатор`, `nan → нет значения`. Подпись: «Проценты — на сколько значение индикатора на первой свече теста отличается от значения с большим запасом. Большие проценты у длинных рекурсивных индикаторов — сигнал поднять `startup_candle_count`; `nan` — запас меньше периода».

Финальный вопрос:
«Ты прогнал бэктест с `startup_candle_count` 200 и 600. Результаты разошлись на 30 %. Что это значит?»
- «Рынок за это время изменился» ✗ → «Данные и период те же; менялся только запас прогрева».
- «Индикатор недогрет или рекурсивен — расхождение создано прогревом, не рынком» ✓
- «Стратегия смотрит в будущее» ✗ → «Это другая проверка — `lookahead-analysis` из FT-11».
- «Стратегия прибыльна при 600» ✗ → «О прибыли прогрев ничего не говорит».

Кнопка «Добавить в мой конвейер анти-лжец» → пункт «recursive-analysis зелёный; startup ≥ период × множитель» (E4/FT-13). Мостик вперёд: «Индикаторы прогреты, будущее не подсмотрено — следующий лжец: комиссии и спред (FT-13)».

### 6. Состояния и обратная связь

| Событие | Реакция |
|---|---|
| ▶ на экране 1 | Анимация; при n<0 бегущая подпись «значения нет» |
| Ползунок на 5 | Явное предупреждение красным: «Первые 195 свечей теста бот слеп» |
| Ползунок ≥ 660 (EMA200) | Датчик зелёный; штриховка исчезает |
| Выбор SMA200 | Датчик скачком 100 %; подпись «не рекурсивна — после 200 свечей значение точное» |
| Выбор ATR14 | Сигнальные ленты скрыты, только расхождение значений |
| Двойной прогон совпал (случайно данные так легли) | Не должно случиться по приёмке (см. тесты); если случилось — ошибка сборки |
| Успех подбора | Подпись + переход к терминалу |

### 7. Словарь «Ткни в непонятное» (минимум)
`startup_candle_count`, `recursive-analysis`, `--startup-candle`, `indicators`, `nan`, `EMA`, `SMA`, `RSI`, `ATR`, `α (alpha)`, «рекурсивный индикатор», «сглаживание Уайлдера (RMA)», «seed / стартовое значение», «эталон / полная история», `timeperiod`, `--timerange`, «PF».

### 8. Телеметрия
`ft12_start`, `anim_play{startup}`, `slider_change{startup, readiness, falseSignals}`, `indicator_switch{ind}`, `dual_run{startup, trades, pf}`, `tune_attempt{startup, correct, attempt}`, `terminal_open`, `final_question{choice, correct}`, `stage_time`, `add_to_pipeline`.
Метрики: доля решивших подбор ≤ 2 попыток; доля открывших ≥ 2 индикатора; верность финального вопроса.

### 9. Технические требования
- Клиент, без сети. Все прогоны для ползунка предрасчитать: 160 значений startup × 4 индикатора × (расчёт индикатора + бэктест 300 свечей) — ≤ 200 мс на старте, дальше мгновенно.
- Датчик готовности — формула, не измерение (иначе «плавает» от данных); relDiff — измерение. Оба показываются рядом с подписью «расчёт по формуле» / «измерено на данных».
- Доступность: ползунок с клавиатуры (←/→ шаг 5, PageUp/Down шаг 50), значения озвучиваются `aria-valuetext` («запас 400 свечей, готовность 86 %, ложных сигналов 3»); анимация с кнопкой «Пропустить» и уважением `prefers-reduced-motion`.
- Адаптив от 360 px: график сверху, датчик и панель итога — ниже; таблица экрана 3 с горизонтальной прокруткой.

### 10. Приёмочные тест-кейсы
1. Юнит-тесты 0.4 зелёные, включая `w(n)` и `emaTalib`.
2. Для `FT12_SEED`, EMA200: при startup=5 индикатор NaN на первых 195 свечах теста; при 200 — readiness на T0 = 0 %; при 400 — 86,5 % ± 0,1; при 660 — ≥ 99 %.
3. Двойной прогон 200 vs 600: расхождение по сделкам ≥ 2 **или** по PF ≥ 15 % (иначе перегенерировать импульсы данных и перефиксировать seed).
4. Существует минимальный startup в диапазоне 400–700, при котором выполняется критерий задания экрана 4; при 800 критерий выполняется.
5. RSI14: при startup=80 relDiff ≤ 1 пункт на T0; SMA200: при startup=200 relDiff = 0.
6. Таблица `recursive-analysis` совпадает с расчётом (снапшот); `nan` появляется ровно там, где startup < период.
7. Все токены раздела 7 открывают карточки; «Скрыть английский» работает.
8. Клавиатурное прохождение всех экранов.

### 11. Что НЕ делать
- Не изображать «прогрев» как «плохие данные» — данные честные, проблема в запасе истории (иначе смешивается с FT-08).
- Не превращать экран 3 в справочник по 20 индикаторам: ровно четыре, по одному на класс (простая средняя / EMA / Уайлдер-сигнал / Уайлдер-риск).
- Не давать «правильный startup» как константу: ответ — диапазон, вычисленный из данных, с правилом-множителем как обобщением.
- Не смешивать с look-ahead: сообщение «это другая проверка» появляется ровно один раз (в финальном вопросе).

---

## Порядок работ для агента (обе спеки)

1. `sim-core` + юнит-тесты 0.4 → приёмка модулей.
2. FT-11: генератор данных и четыре стратегии → добиться ограничений раздела 4 → зафиксировать seed → экраны 1–4 → словарь → тесты раздела 11.
3. FT-12 (переиспользуя chart и pandas-lite): данные → проверка кейсов 2–5 раздела 10 → экраны 0–5 → словарь → тесты.
4. Общий прогон «без мыши» и на 360 px; проверка, что ни одно число на экранах не хардкожено (grep по литералам PF/процентов в компонентах должен быть пустым, кроме справочных цитат из уроков, помеченных `quote:`).

----------------------------

# Спецификации для реализации: интерактивы урока FT-13 «Комиссии, спред и модель издержек»

## 0. Общий контекст (читать обоим интерактивам)

**Место в уроке.** FT-13 — последний урок перед hyperopt (FT-16). В тексте урока две ключевые мысли, под каждую — свой интерактив:

| Мысль урока | Цитата-опора | Интерактив |
|---|---|---|
| Издержки умножаются на число сделок и съедают большую часть «бумажной» прибыли | «250 сделок… +100% брутто… −50% комиссий… ещё −25% проскальзывание… итог +25% вместо +100%» | **FT-13a «Арифметика трения на моей стратегии»** (СИМ) |
| Оптимизация допустима только после конвейера проверок | «Шаг 1…Шаг 7. Только теперь hyperopt» | **FT-13b «Конвейер анти-лжец»** (РИТ, движок E4) |

**Числа урока, которые обязаны воспроизводиться точно (принцип 5):**
- 250 сделок за 1,5 года; комиссия taker 0,1 % за сторону (0,2 % за круг); средний профит на сделку +0,4 %; проскальзывание 0,05 % за сторону.
- 250 × 0,4 % = +100 % брутто; 250 × 0,2 % = −50 %; 250 × 0,1 % = −25 %; нетто +25 %.
- Стоп-тест: `--fee 0.0035` = тариф 0,1 % + оценка проскальзывания ~0,25 % на сторону.
- Робастность ±20 % (урок 1.12): падение метрики не более 20 % от центрального значения.
- Здоровый OOS = 50–70 % от in-sample; OOS лучше IS → искать утечку (FT-16).
- Минимум сделок для выводов: 30 — тревожная зона, 80+ — рабочая (FT-09).

**Сквозной персонаж.** Все демо-данные подписаны как «стратегия Алексея `DipBuyerBTCFilter`», депозит 1000 USDT (dry_run_wallet из FT-04).

**Языковой слой (обязателен, раздел 6 общего ТЗ).** Любой английский токен в обоих интерактивах кликабелен → всплывающая русская карточка. Минимальный словарь для FT-13:
`fee`, `taker`, `maker`, `slippage`, `bps`, `PF / profit factor`, `hyperopt`, `lookahead-analysis`, `recursive-analysis`, `in-sample / out-of-sample (OOS)`, `startup_candle_count`, `timerange`, `--fee`, `spaces`, `epochs`, `loss-функция`, `survivorship`, `whitelist`. Карточка = термин по-русски + одно предложение + ссылка на урок, где введён (0.9, 0.10, 1.8, 1.9, 1.12, FT-08, FT-11, FT-12, FT-16).

---

## 1. FT-13a «Арифметика трения на моей стратегии»

### 1.1 Карточка
- **ID:** `ft13_friction_calc`
- **Тип:** СИМ (симуляция с ползунками и живым пересчётом)
- **Место в уроке:** сразу после блока «Числа: Арифметика издержек на вкус», до блока «Чек-лист анти-лжец».
- **Целевое заблуждение:** «Комиссия 0,1 % — мелочь, на результат не влияет».
- **Время работы:** 4–6 минут.
- **Зависимости от движков:** нет (автономный). Опциональная связь с FT-13b (передача чисел в шаг 4).

### 1.2 Цель и критерий освоения
Ученик должен **увидеть и потрогать руками**, что издержки — не «процент от депозита», а «процент от оборота × число сделок», и что при частой торговле они съедают большинство бумажной прибыли.

**Критерий освоения (фиксируется приложением):** ученик самостоятельно, двигая ползунки, находит конфигурацию, при которой стратегия из пресета урока становится **убыточной только из-за издержек** (нетто < 0 при брутто > 0), И конфигурацию, где доля съеденного < 30 %. После обоих событий открывается блок «Мост в Freqtrade» и кнопка «Передать в конвейер».

### 1.3 Входы и формулы

**Входы (ползунки + числовое поле рядом с каждым):**

| Параметр | Обозн. | Диапазон | Шаг | По умолчанию (пресет урока) |
|---|---|---|---|---|
| Сделок за период | `N` | 10…3000 | 10 (логарифм. шкала) | 250 |
| Длина периода, мес | `T` | 1…36 | 1 | 18 |
| Комиссия за одну сторону, % | `fee_side` | 0…0,20 | 0,005 | 0,10 |
| Проскальзывание за одну сторону, % | `slip_side` | 0…0,50 | 0,005 | 0,05 |
| Средний брутто-профит на сделку, % | `avg_gross` | −1,0…+5,0 | 0,05 | 0,40 |
| Переключатель исполнения | `exec_mode` | taker / maker | — | taker |

Под ползунком `fee_side` живая подпись: «за круг (вход + выход): **0,20 %**».
Под `slip_side`: «за круг: **0,10 %**».

**Формулы (режим по умолчанию — аддитивный, как в тексте урока):**
```
round_fee   = 2 * fee_side
round_slip  = 2 * slip_side
round_cost  = round_fee + round_slip           # «круг издержек»

gross       = N * avg_gross                    # брутто
fee_total   = N * round_fee                    # съедено комиссией
slip_total  = N * round_slip                   # съедено проскальзыванием
net         = gross - fee_total - slip_total   # нетто

eaten_share = (fee_total + slip_total) / gross   # если gross > 0, иначе «—»
breakeven   = round_cost                        # минимальный avg_gross для нуля
edge_ratio  = avg_gross / round_cost            # «во сколько раз эдж перекрывает трение»
per_year    = x * 12 / T                        # аннуализация любого x
```
Все проценты хранить в долях (0.001), показывать в %. Округление вывода: до 1 знака для итогов, до 2 — для подписей ползунков.

**Проверка пресета урока (тест обязателен):** N=250, fee 0,10, slip 0,05, avg 0,40 → gross +100,0; fee −50,0; slip −25,0; net +25,0; eaten 75 %; breakeven 0,30 %; edge_ratio 1,33.

**Зоны оценки (цветовая шкала, показывать текстом, не только цветом):**

| `edge_ratio` | Зона | Подпись |
|---|---|---|
| < 1,0 | 🔴 «Трение съело всё» | «Брутто есть, нетто нет: стратегия кормит биржу» |
| 1,0–1,5 | 🟠 «На грани» | «Пресет урока живёт здесь: любое ухудшение исполнения — и минус» |
| 1,5–3,0 | 🟡 «Рабочая зона новичка» | «Эдж перекрывает трение, но запас тонкий» |
| > 3,0 | 🟢 «Запас прочности» | «Издержки — заметная, но не решающая статья» |

### 1.4 Пресеты (кнопки над панелью)

| Кнопка | N | T | fee | slip | avg | Что показывает |
|---|---|---|---|---|---|---|
| **«Пример урока»** | 250 | 18 | 0,10 | 0,05 | 0,40 | +100 → +25 |
| «Скальпинг 5m» | 2400 | 12 | 0,10 | 0,08 | 0,15 | edge_ratio 0,42 — глубокий минус при положительном брутто |
| «Свинг 4h» | 60 | 18 | 0,10 | 0,05 | 2,50 | edge_ratio 8,3 — те же 0,1 % почти не видны |
| «Maker-исполнение» | 250 | 18 | 0,02 | 0,05 | 0,40 | fee падает, но появляется плашка про неисполнение (см. 1.7) |
| «Мой отчёт» | — | — | — | — | — | открывает форму ручного ввода из отчёта бэктеста (1.9) |

При выборе пресета ползунки **анимированно** переезжают (300 мс), столбцы перестраиваются.

### 1.5 Экран (одна страница, две колонки на десктопе, одна — на мобиле)

**Левая колонка «Настройки»:** пресеты → пять ползунков → переключатель taker/maker.

**Правая колонка «Что осталось от прибыли»:**
1. **Водопадная диаграмма** (4 столбца): «Брутто» (серый, вверх) → «Комиссия» (красный, вниз) → «Проскальзывание» (оранжевый, вниз) → «Нетто» (зелёный если > 0, красный если < 0). Над каждым — число в %. Ось — % к депозиту за период. Столбец «Нетто» при < 0 уходит ниже нулевой линии.
2. **Строка сводки:** «Трение съело **75 %** прибыли. Точка безубыточности: **0,30 %** на сделку. Запас прочности: **×1,3** — 🟠 на грани».
3. **Формула словами** (динамически подставляются числа): «250 сделок × 0,40 % = +100 %. Минус 250 × 0,20 % комиссии = −50 %. Минус 250 × 0,10 % проскальзывания = −25 %. Итого **+25 %**.» — это перенос расчёта из текста урока один в один, чтобы ученик узнал его.
4. **Переключатель масштаба:** «за период (18 мес)» / «в год». По умолчанию — за период.
5. **Свёрнутые блоки (аккордеон):** «Мост в Freqtrade» и «Почему так» (открываются по критерию освоения или по клику после 60 с).

### 1.6 Сценарий взаимодействия (обязательные микро-события)

1. **Вход.** Загружен пресет урока. Подсказка-тултип на столбце «Комиссия»: «Это те самые "мелкие 0,1 %". Потяни ползунок сделок».
2. **Событие A — «Умножение».** Ученик двигает `N`. Столбцы «Комиссия» и «Проскальзывание» растут линейно, «Нетто» уходит вниз. При пересечении нуля нетто — короткая вспышка столбца и надпись: «Брутто по-прежнему **+X %**, но денег меньше, чем было. Это и есть овертрейдинг из урока 0.18».
3. **Событие B — «Мелочь».** Ученик пробует уменьшить `fee_side` до 0. Подпись под ползунком: «Комиссия 0 бывает только у maker-ордеров (0.9) — и у них другая цена: часть сигналов не исполнится».
4. **Событие C — «Порог».** Ученик двигает `avg_gross` к `breakeven`. При |avg_gross − breakeven| < 0,02 % — пунктирная линия безубытка подсвечивается: «Здесь эдж равен трению. Стратегия работает, чтобы платить бирже».
5. **Критерий освоения выполнен** → разворачивается «Мост в Freqtrade» и появляется кнопка «Передать числа в конвейер анти-лжец (шаг 4)».

### 1.7 Тексты обратной связи (появляются в строке сводки, не модалками)

- При `net < 0 && gross > 0`: «Каждая сделка в среднем прибыльна, а счёт тает. Так выглядит стратегия, которую убил не рынок, а частота».
- При `N < 30`: «Меньше 30 сделок — калькулятор считает честно, но выводы делать нельзя: статистика из FT-09 ещё не набрана».
- При `exec_mode = maker` (плашка постоянно): «Maker-комиссия ниже, но бэктест Freqtrade считает лимитку исполненной при касании цены (FT-09). В жизни часть сигналов пропадёт — это не учтено в этом расчёте. Нулевые издержки закладывать нельзя (урок 1.8)».
- При `slip_side = 0`: «Проскальзывание 0 — только на бумаге. Отдельного параметра slippage в Freqtrade нет: его закладывают завышением fee (см. мост ниже)».
- При `edge_ratio > 3` и `N > 500`: «Редкая пара: большой эдж и много сделок. Такие результаты в бэктесте чаще всего означают утечку (FT-11), а не грааль».

### 1.8 Блок «Мост в Freqtrade» (текст + две копируемые команды)

Показывает, как числа калькулятора превращаются в флаг `--fee`:

```
# fee в Freqtrade задаётся ЗА СТОРОНУ; slippage-параметра нет —
# проскальзывание закладываем в fee

честный прогон:  --fee {fee_side}                 # пример урока: --fee 0.0010
стоп-тест:       --fee {fee_side + slip_estimate}  # урок: 0.001 + 0.0025 = --fee 0.0035
```
`slip_estimate` по умолчанию 0,25 % (из урока), редактируемое поле. Подпись: «Если стоп-тест с завышенным fee уводит PF ниже 1,1 — стратегия не выдерживает трения. Hyperopt тут не поможет — он подгонит параметры под прошлое, а комиссия останется».

Кнопка **«Передать в конвейер»** → отправляет `{N, avg_gross, fee_side, slip_estimate, net}` в FT-13b, шаг 4 (предзаполнение полей, см. 2.11).

### 1.9 Режим «Мой отчёт»
Форма из четырёх полей, подписанных именами строк отчёта FT-09: `Total trades` → N; `Avg profit %` → avg_gross (пояснение: «это уже НЕТТО-профит после fee из отчёта, укажи fee, чтобы восстановить брутто»); `Fee` из отчёта → fee_side; период → T. Расчёт: `avg_gross_recon = avg_profit_report + round_fee_report`. Дальше — обычные ползунки, но с меткой «данные из твоего отчёта». Валидация: N < 30 → предупреждение, но не блок.

### 1.10 Состояние и хранение
`{ preset, N, T, fee_side, slip_side, avg_gross, exec_mode, mastery: {went_negative, found_safe}, last_seen }` — localStorage / профиль. Событие освоения пишется в прогресс урока.

### 1.11 Критерии приёмки
1. Пресет урока воспроизводит +100 / −50 / −25 / +25 с точностью до 0,1.
2. Изменение любого ползунка обновляет диаграмму и текст без задержки (< 50 мс).
3. Все зоны и статусы дублируются текстом (доступность, дальтонизм).
4. Каждый английский токен в интерфейсе открывает русскую карточку.
5. Отрицательный нетто визуально уходит под ноль, а не обрезается.
6. `gross ≤ 0` → «доля съеденного» показывает «—» и подпись «брутто не положительное — трение тут ни при чём, сигнала нет».
7. Кнопка «Передать в конвейер» появляется только после критерия освоения; передача предзаполняет шаг 4 в FT-13b.
8. Мобильная раскладка: ползунки над диаграммой, диаграмма не уже 280 px.

### 1.12 Что НЕ делать
- Не добавлять сложный процент в основной режим — это сломает узнаваемость расчёта из урока. (Допустимо V2-переключатель «Глубже: капитализация» с формулой `(1 + avg_gross − round_cost)^N − 1`, скрытый по умолчанию.)
- Не моделировать долю неисполненных maker-ордеров числом — только плашка-предупреждение (моделирование — тема усиления урока 1.8).
- Не выдумывать «типичные» тарифы бирж в интерфейсе: только «проверь на своей бирже» (как в тексте FT-04).

---

## 2. FT-13b «Конвейер анти-лжец»

### 2.1 Карточка
- **ID:** `ft13_antiliar_pipeline`
- **Тип:** РИТ (повторяемый ритуал на движке E4 с записью в E5)
- **Место в уроке:** после блока «Сборка анти-лжец-конвейера», перед практикой. Повторно вызывается из FT-16 (перед hyperopt) и FT-20 (чек-лист допуска читает его статусы).
- **Целевое заблуждение:** «Сначала оптимизирую, потом проверю» / «зелёный бэктест = чисто».
- **Время первого прохождения в тренировочном режиме:** 10–12 минут; реального — в течение дней (поля заполняются по мере прогонов).

### 2.2 Цель и критерий освоения
Приучить: hyperopt — **не кнопка, а последний шаг**, физически недоступный, пока шаги 1–6 не доказаны числами. Ритуал повторяется после каждой правки стратегии.

**Критерий освоения:** (а) пройден тренировочный проход на данных Алексея до вердикта шага 7 включительно; (б) ученик хотя бы один раз столкнулся с красным вердиктом и выбрал корректное действие (вернуться к шагу, а не «принять риск»); (в) счётчик «попыток обойти конвейер» показан ученику в итогах.

### 2.3 Требования к движку E4 (интерфейс, который должен предоставить движок)

```json
RitualDefinition {
  id, title, lessonOwner,
  steps: [ StepDefinition ],
  cycles: { count: 2, cycle2Label: "Повтор на out-of-sample" },
  lockedAction: { id, label, unlockWhen: "steps[1..6].status in [green, yellow_ack]" },
  invalidationTriggers: [ Trigger ],
  streakMetric: "completed_pipelines",
  antiMetric: "bypass_attempts",
  journalExport: { target: "E5.experiments", tags: [...] }
}
StepDefinition {
  index, title, dependsOn: [indices],
  fields: [ {name, label, type: number|select|text|bool|multiselect, unit, hint, required} ],
  validator: RuleSet → {status: green|yellow|red, message, journalTag?},
  helpLink: lessonId,
  redAction: "block_next" | "warn",
  yellowRequiresAck: true
}
```
Статусы шага: `grey` (не начат/зависимости не выполнены), `in_progress`, `green`, `yellow` (допустимо с осознанным подтверждением — `yellow_ack`), `red` (блокирует следующие), `stale` (инвалидирован триггером — требует повтора). Движок хранит историю всех вердиктов с датами.

**Правило движка: статус меняется только через «Проверить» после заполнения обязательных полей. Чекбокса «сделано» не существует.**

### 2.4 Определение семи шагов

| # | Шаг (из урока) | Зависит от | Обязательные поля | Правило вердикта |
|---|---|---|---|---|
| 1 | Данные проверены (FT-08) | — | месяцев истории; дыр > 3 периодов (шт.); дублей (шт.); покрывает ли timerange (да/нет) | 🟢 дыр=0 ∧ дублей=0 ∧ покрывает ∧ мес ≥ 18 · 🟡 12 ≤ мес < 18 · 🔴 дыры/дубли/не покрывает/мес < 12 |
| 2 | lookahead-analysis зелёный (FT-11) | 1 | timerange прогона (мес); расхождений найдено (шт.); [опц.] вставка вывода | 🟢 расхождений=0 ∧ мес ≥ 3 · 🟡 расхождений=0 ∧ мес < 3 («короткое окно — детектор мог не увидеть») · 🔴 расхождений > 0 |
| 3 | recursive-analysis зелёный (FT-12) | 1 | макс. отклонение индикатора, %; startup_candle_count; самое длинное окно индикатора | 🟢 откл ≤ 1 % ∧ startup ≥ окно · 🟡 1 % < откл ≤ 5 % · 🔴 откл > 5 % ∨ startup < окно |
| 4 | Честный fee + оценка проскальзывания | 1 | fee в конфиге/отчёте, %; тариф биржи за сторону, %; PF честного прогона; fee стоп-теста; PF стоп-теста; число сделок | 🟢 fee_конф ≥ тариф ∧ PF_стоп ≥ 1,1 ∧ сделок ≥ 80 · 🟡 30 ≤ сделок < 80 ∨ 1,0 ≤ PF_стоп < 1,1 · 🔴 fee_конф < тариф ∨ PF_стоп < 1,0 ∨ сделок < 30 |
| 5 | Соседние таймфреймы | 4 | базовый ТФ + PF; ТФ-сосед 1 + PF; ТФ-сосед 2 + PF | 🟢 оба соседа PF ≥ 0,6·PF_база ∧ ≥ 1,0 · 🟡 один сосед ниже · 🔴 хотя бы один сосед PF < 1,0 |
| 6 | Робастность ±20 % (1.12) | 4 | 1–3 параметра: имя, базовое значение, PF при −20 %, PF база, PF при +20 % | по каждому: 🟢 min(PF−, PF+) ≥ 0,8·PF_база · 🟡 0,6–0,8 · 🔴 < 0,6 или < 1,0 → тег журнала «параметр под угрозой подгонки». Статус шага = худший из параметров |
| 7 | Hyperopt (FT-16) — **замок** | 1–6 | spaces (мультивыбор); loss-функция (селект); epochs; in-sample timerange; OOS timerange; PF_IS; PF_OOS; сделок OOS | предупреждения до запуска: roi/stoploss в spaces → 🟡-плашка; profit-loss → 🟡; epochs > 400 → 🟡; параметров > 4 → 🟡; пересечение IS/OOS → 🔴 (нельзя сохранить). Вердикт после: `r = PF_OOS / PF_IS`: 🟢 0,5 ≤ r ≤ 0,7 · 🟡 0,7 < r ≤ 1,0 («лучше ожидаемого, проверь ещё окно») · 🔴 r > 1,0 («OOS лучше IS — ищи утечку»: автоматически переводит шаги 2–3 в `stale`) · 🔴 PF_OOS < 1,1 («в мусор: вернись к базовым параметрам») · сделок OOS < 30 → вердикт не выдаётся, подпись «выборка не набрана» |

**Пояснения к каждому шагу (показываются в панели шага):**
- Шаг 1: команда `freqtrade list-data`, ссылка на `check_data.py` из FT-08. Подсказка при 🔴: «перекачай сегмент `download-data --erase`».
- Шаг 2: полная команда `freqtrade lookahead-analysis -c … --strategy … --timerange …`. При 🔴 — три подсказки-чипа из урока: `shift(-1)`, `bfill`, `center=True`, плюс ссылка на E6 «Охотник за утечкой» (если собран).
- Шаг 3: команда `recursive-analysis`; при 🔴 по startup — «подними startup_candle_count минимум до длины окна (FT-12: лучше с запасом ×2)».
- Шаг 4: кнопка «Посчитать в Арифметике трения» (открывает FT-13a с числами); при 🔴 по PF_стоп — жёсткий текст: «Стратегия не выдерживает трения. Это конец конвейера для этой версии: hyperopt подгонит параметры, а комиссия останется. Вернись к гипотезе (1.5)».
- Шаг 5: подсказка про пересчёт данных под соседний ТФ (45m/2h из урока — «грубый тест»).
- Шаг 6: ссылка на тренажёр «плато или пик» (1.12).
- Шаг 7: три запрета FT-16 показываются ДО заполнения полей как плашка.

### 2.5 Зависимости и инвалидация
- Шаг недоступен (`grey`, с подписью «ждёт шаг N»), пока все зависимости не `green`/`yellow_ack`.
- 🟡 требует явного подтверждения: модалка «Ты принимаешь риск: [текст вердикта]. Причина одной строкой →» — строка обязательна, уходит в журнал E5 с тегом `yellow_ack`. Без причины — не пропускает.
- 🔴 блокирует зависимые шаги; кнопка «Принять риск» отсутствует по дизайну.
- **Триггеры инвалидации** (переводят шаги в `stale`, поля сохраняются, вердикт снимается):
  1. Тумблер «Я изменил стратегию или конфиг» (ученик щёлкает сам) → шаги 2–7 `stale`. Текст: «FT-11: утечка легко возвращается одной правкой. Протокол повторяется».
  2. Прошло > 30 дней с проверки данных → шаг 1 `stale` («докачай хвост истории»).
  3. Вердикт шага 7 = «OOS лучше IS» → шаги 2–3 `stale` автоматически.
  4. Изменение значения в поле уже зелёного шага → этот шаг и зависимые `stale` до повторной «Проверить».

### 2.6 Кнопка «Запустить hyperopt» (замок) и антиметрика
- Кнопка видна **с первого экрана**, справа вверху, с иконкой замка и подписью «Заблокировано: 6 шагов». Тултип перечисляет незакрытые шаги.
- Клик по заблокированной кнопке → **не** ошибка, а обучающий экран: «Что произойдёт, если запустить сейчас», содержащий: список незакрытых шагов; одну строку из FT-16: «3 параметра × 16 значений = 4096 комбинаций; на чистом шуме лучшая из них покажет PF ~1,5»; счётчик «Попыток обойти конвейер: N» (растёт). После 3-й попытки — дополнительная строка: «Это желание записывается в журнал и обсуждается с уставом, а не исполняется (FT-20)» и автозапись в E5 с тегом `bypass_attempt`.
- Замок открывается автоматически при выполнении условия; анимация открытия + текст «Теперь оптимизация — эксперимент, а не лотерея».

### 2.7 Цикл 2 (OOS) и завершение
После вердикта шага 7 (любого, кроме «в мусор») конвейер разворачивает **цикл 2**: шаги 2–6 копируются с меткой «на out-of-sample с найденными параметрами», статусы `grey`, поля предзаполнены OOS-timerange из шага 7. Шаг 1 не повторяется. Конвейер считается **завершённым** (streak +1), когда цикл 2 зелёный/жёлтый-подтверждённый. На экране итога: дата, версия стратегии (ручное поле «метка версии/коммит»), сводка вердиктов, число `yellow_ack`, число `bypass_attempts` за этот конвейер. Кнопка «Экспортировать в чек-лист допуска FT-20» (см. 2.11).

Вердикт «в мусор» завершает конвейер со статусом «стратегия отклонена» — это тоже засчитывается в историю как **успешное применение протокола** (отдельная метрика `rejected_by_pipeline`), с текстом из урока 2.6: «Отклонение без сожалений — норма конвейера».

### 2.8 Тренировочный режим «Пройти на данных Алексея»
Кнопка на первом экране. Все поля предзаполнены, но статусы `grey` — ученик обязан нажать «Проверить» на каждом шаге и прочитать вердикт. Данные:

| Шаг | Предзаполнение | Ожидаемый вердикт |
|---|---|---|
| 1 | 30 мес, дыр 0, дублей 0, покрывает | 🟢 |
| 2 | 4 мес, расхождений 0 | 🟢 |
| 3 | откл 0,3 %, startup 400, окно 200 | 🟢 |
| 4 | fee 0,10 / тариф 0,10 / PF 1,45 / стоп-fee 0,35 / PF 1,18 / 250 сделок | 🟢 (числа урока) |
| 5 | 1h PF 1,45; 45m PF 1,22; 2h PF 0,96 | 🔴 — **намеренно**: ученик видит блок, нажимает подсказку, «исправляет» (тренировочная кнопка «Пересчитать с volume-фильтром» подставляет 2h PF 1,05) → 🟡 → должен написать причину → `yellow_ack` |
| 6 | rsi_buy 35: PF 1,20 / 1,45 / 1,31; stoploss −0,10: 1,38 / 1,45 / 1,40 | rsi 🟡 (0,83 и 0,90 → зелёный по правилу ≥0,8 — сделать 1,12 при −20 %, чтобы получить 🟡 0,77), stoploss 🟢 → шаг 🟡 |
| 7 | spaces: buy; Sharpe; 200 epochs; IS 2023-01–2024-06; OOS 2024-07–2025-01; PF_IS 1,62; PF_OOS 0,98; сделок 41 | 🔴 «в мусор» — ученик проживает главный урок: после всего конвейера hyperopt-результат отклонён, и это нормально |

Второй тренировочный набор (по кнопке «Ещё раз с другим исходом»): шаг 7 с PF_OOS 1,05 при PF_IS 1,62 (r=0,65) → 🟢 → цикл 2 → завершение. Один из вариантов шага 7 должен давать r > 1,0, чтобы ученик увидел автоинвалидацию шагов 2–3.

Тренировочный проход не пишется в личный журнал E5, но пишется в прогресс урока.

### 2.9 Экран
- **Вертикальный конвейер** слева: 7 карточек-шагов, соединённых линией; цвет статуса + иконка; у заблокированных — замок и «ждёт шаг N». Над конвейером тумблер «Я изменил стратегию/конфиг» и метка версии стратегии.
- **Панель активного шага** справа: заголовок, одно предложение «зачем» (из урока), команда Freqtrade (копируемая, токены кликабельны), поля ввода, кнопка «Проверить», область вердикта с подсказками.
- **Шапка**: кнопка-замок «Запустить hyperopt», счётчики «Полных конвейеров: N», «Отклонено протоколом: N», «Попыток обойти: N».
- **Низ**: лента истории (E4) — прошлые конвейеры со сводкой вердиктов.
- Мобильная версия: конвейер сворачивается в горизонтальную полосу из 7 точек над панелью шага.

### 2.10 Ключевые тексты (готовые строки)
- Заголовок: «Конвейер анти-лжец: hyperopt открывается последним».
- Подзаголовок: «Он скучный и отнимает вечер. Он же отличает исследователя от игрока в красивые графики» (цитата урока).
- Пустое состояние: «Ни один шаг не проверен. Кнопка hyperopt заблокирована — так и должно быть».
- Вердикт 🟢: «Шаг закрыт числом, не галочкой».
- Вердикт 🟡: «Допустимо с оговоркой. Напиши причину — она уйдёт в журнал экспериментов».
- Вердикт 🔴: «Дальше нельзя. Не потому что правила, а потому что следующий шаг будет измерять ложь».
- Замок при клике: «Оптимизация до проверок не находит альфу — она находит самую удачную комбинацию шума».
- Завершение: «Конвейер пройден. Результат — не процент прибыли, а доказательство, что эксперимент корректен (FT-20)».

### 2.11 Интеграции
- **FT-13a → шаг 4:** приём `{N, avg_gross, fee_side, slip_estimate}`; поля «число сделок», «fee» предзаполняются, остальное — ручной ввод из реального прогона.
- **E5 (журнал экспериментов):** каждый вердикт шага → запись `{ritual: ft13, cycle, step, status, fields, message, date}`; теги: `yellow_ack`, `overfit_risk` (из шага 6), `leak_suspect` (шаг 7, r>1), `rejected_by_pipeline`, `bypass_attempt`.
- **FT-20 «Чек-лист допуска 20/20»:** пункты «lookahead-analysis зелёный», «recursive-analysis зелёный», «fee честный, проскальзывание оценено», «100+ сделок», «OOS пройдена», «робастность ±20 %» **читают статус из последнего завершённого конвейера FT-13b** и закрываются только при `green`/`yellow_ack` не старше даты последней инвалидации. Это реализация правила FT-20 «пункт закрывается при выполнении условия, не кликом».
- **FT-16:** перед своим интерактивом «4096 монеток» показывает виджет-состояние конвейера; если замок закрыт — ссылка «сначала конвейер».
- **E1 (терминал-переводчик), опционально:** в шагах 2 и 3 поле «вставь вывод команды» → парсер извлекает число расхождений / максимальное отклонение и подставляет в поля; при неудаче парсинга — ручной ввод. Не блокирующая зависимость.
- **E6 (охотник за утечкой):** ссылка из 🔴-вердикта шага 2.

### 2.12 Схема данных (сохраняемое состояние)
```json
{
  "ritualId": "ft13_antiliar_pipeline",
  "pipelines": [{
    "id": "uuid", "startedAt": "", "finishedAt": null,
    "strategyLabel": "DipBuyerBTCFilter v3", "trainingMode": false,
    "cycle": 1,
    "steps": {
      "1": {"status": "green", "fields": {...}, "verdict": {...}, "checkedAt": ""},
      "2": {"status": "stale", ...}, ...
    },
    "cycle2Steps": {...},
    "yellowAcks": [{"step": 5, "reason": "", "at": ""}],
    "bypassAttempts": 2,
    "outcome": null | "completed" | "rejected"
  }],
  "metrics": {"completed_pipelines": 0, "rejected_by_pipeline": 0, "bypass_attempts_total": 0}
}
```

### 2.13 Телеметрия
Время на шаг; распределение вердиктов по шагам; доля учеников, дошедших до замка; `bypass_attempts` на ученика (цель: падает от первого конвейера ко второму); доля `yellow_ack` с содержательной причиной (длина > 15 символов); доля завершивших цикл 2; доля «отклонено протоколом» (ожидаемо высокая — это здоровый показатель, не баг).

### 2.14 Критерии приёмки и тест-кейсы
1. Ни один шаг нельзя перевести в `green` без заполнения обязательных полей и нажатия «Проверить».
2. Шаг 7 недоступен, пока хотя бы один из шагов 1–6 не `green`/`yellow_ack`; попытка клика увеличивает `bypass_attempts` и показывает обучающий экран.
3. 🔴 на любом шаге блокирует зависимые; кнопки «принять риск» нет.
4. 🟡 без причины не подтверждается.
5. Тумблер «изменил стратегию» переводит шаги 2–7 в `stale`, поля не стираются.
6. Шаг 7: пересечение IS и OOS timerange не сохраняется (валидация дат).
7. Шаг 7: `PF_OOS/PF_IS > 1,0` → шаги 2–3 автоматически `stale` с текстом про утечку.
8. Тренировочный проход на данных Алексея даёт вердикты ровно по таблице 2.8; ученик обязан пройти через 🔴 на шаге 5 и написать причину для 🟡.
9. Пресет урока в шаге 4 (fee 0,10; стоп-fee 0,35; PF 1,18; 250 сделок) → 🟢.
10. Завершённый конвейер экспортирует статусы в FT-20; после инвалидации соответствующие пункты FT-20 снова открываются.
11. Все английские токены в командах и названиях шагов кликабельны.
12. Вердикт «в мусор» засчитывается как `rejected_by_pipeline`, а не как провал ученика (тон текста — поддерживающий).

### 2.15 Что НЕ делать
- Не запускать Freqtrade из приложения и не эмулировать «настоящие» результаты команд — конвейер работает с числами, которые ученик приносит из своего окружения (или из тренировочного набора).
- Не заменять числовые поля чекбоксами «сделал» — это убивает ритуал.
- Не давать обходной путь «пропустить шаг» даже под предлогом «для теста»; для этого есть тренировочный режим.
- Не показывать доходность как метрику успеха конвейера; единственные метрики успеха — полные конвейеры, отклонения по протоколу и падение попыток обхода.
- Не менять пороги правил из текста урока (18 мес, 80 сделок, PF 1,1, 0,8 при ±20 %, OOS 0,5–0,7) без пометки «отступление от урока» — они должны совпадать с тем, что ученик только что прочитал.

---

## 3. Порядок сборки
1. **FT-13a** — автономен, 1 итерация: формулы + пресеты + водопад + мост (`--fee`) + режим «Мой отчёт».
2. **E4: базовые сущности** (шаги, поля, валидаторы, статусы, зависимости, инвалидация, замок, история) — если E4 ещё не собран, конвейер FT-13b — хороший первый потребитель движка, так как содержит все его механики (зависимости, `yellow_ack`, `stale`, замок, циклы).
3. **FT-13b** на E4 + тренировочный набор Алексея + экспорт в E5.
4. Связки: FT-13a → шаг 4; FT-13b → FT-20 (чтение статусов); FT-16 → виджет состояния конвейера.
5. Опционально: парсер вывода команд через E1 для шагов 2–3.

--------------------------------------
# Спецификации интерактивов урока FT-17 «Стоп-лосс, минимальная доходность и функции обратного вызова»

Два интерактива, один урок, две разные ошибки новичка. Ниже — детальные ТЗ для агента-реализатора. Общие принципы: все числа взяты из текста урока 217 (FT-17) и уроков-доноров (0.12, 1.10, 3.6, 5.5); интерфейс полностью на русском; каждый английский токен из кода/конфига — кликабелен (режим «Ткни в непонятное»).

---

## Общее для обоих интерактивов

### Место в уроке
- **FT-17a «Три контура защиты»** вставляется после блока «▸ Подробнее» (атрибуты `stoploss`, трейлинг, `protections`) и до блока «▸ Глубже» (сайзинг).
- **FT-17b «Серия из 10 стопов на моём депозите»** вставляется после блока «▸ Глубже» / перед блоком «Числа» — так ученик сначала руками получает −15% и −33%, а потом читает те же цифры в тексте.

### Зависимости от движков
| Движок | Что берём |
|---|---|
| **E2 «Живой конфиг»** | Панель ползунков → мгновенный пересчёт правой панели (риск на сделку, суммарный риск) |
| **E8 «Двуязычный отчёт»** | Таблица метрик с русским именем, формулой и зоной (тревожная/рабочая) из FT-09; компонент «веер траекторий» |
| **Языковой слой** | Словарь токенов: `stoploss`, `trailing_stop`, `trailing_stop_positive`, `trailing_stop_positive_offset`, `trailing_only_offset_is_reached`, `StoplossGuard`, `lookback_period_candles`, `trade_limit`, `stop_duration_candles`, `MaxDrawdown`, `max_allowed_drawdown`, `CooldownPeriod`, `stake_amount`, `unlimited`, `max_open_trades`, `tradable_balance_ratio`, `Calmar`, `MaxDD` |

### Формат словарной карточки (для языкового слоя)
```json
{
  "token": "trailing_stop_positive_offset",
  "ru_name": "порог включения подтяжки",
  "ru_short": "С какой прибыли (в долях) трейлинг начинает подтягивать стоп. 0.03 = после +3%.",
  "example": "trailing_stop_positive_offset = 0.03 → до +3% работает обычный стоп −10%, после +3% стоп подтягивается на 1.5% ниже максимума",
  "lesson_ref": "FT-17",
  "interactive_ref": "FT-17a, режим «+ трейлинг»"
}
```
Карточки для всех токенов из таблицы выше — часть поставки (файл `glossary_ft17.json`).

### Детерминизм
Все случайные величины — из seeded-генератора (mulberry32 или аналог). Seed по умолчанию `20240517`, кнопка «Другая история» меняет seed и показывает его номер. Одинаковый seed → одинаковая картинка у всех учеников (важно для обсуждений и для тестов приёмки).

---

# FT-17a · «Три контура защиты»

## 1. Цель и ломаемое заблуждение

**Заблуждение:** «Защиты (трейлинг, StoplossGuard, MaxDrawdown) — это способ увеличить прибыль. Чем больше защит включу, тем больше заработаю».

**Целевой инсайт (формулируется учеником в конце сам):** защиты — это *размен*: они срезают часть прибыли ради среза хвоста просадки. Правильный результат включения защиты — прибыль ↓ (или ≈), MaxDD ↓↓, **Calmar ↑**. Если защита улучшила *и* прибыль, *и* просадку одновременно — это повод искать подгонку, а не радоваться (мост в FT-16 и П24).

**Вторичный инсайт:** три контура закрывают *разные* риски (одна сделка / отдать профит на развороте / тильт-режим рынка) — их нельзя заменить друг другом.

## 2. Структура: три экрана-стадии

| Стадия | Тип | Что делает ученик | Время |
|---|---|---|---|
| **A. Одна сделка** | АНИМ | Смотрит одну трендовую сделку под тремя переключателями; видит, где закрылась позиция и почему | 2–3 мин |
| **B. Мини-бэктест** | СИМ | Те же переключатели на 90-дневной синтетической истории; читает таблицу (E8) и сам заполняет вывод «какой размен получил» | 4–5 мин |
| **C. Ловушка подгонки** | ИГР (MVP+) | Кнопка «оптимизировать защиты под историю» → красивый in-sample, провал на out-of-sample | 2 мин |

Стадия C — опциональная для первой сборки, но крайне желательна: она превращает интерактив из «показать механику» в «сломать заблуждение».

## 3. Стадия A — анимация одной сделки

### 3.1. Синтетический ценовой ход (фиксированный, не случайный)
Часовые свечи, 48 штук, цена входа нормирована к 100. Ход спроектирован так, чтобы три режима давали *разные* точки выхода:

```
Свечи 1–4:   боковик 99–101 (сигнал на свече 4, вход по open свечи 5 = 100.0)
Свечи 5–14:  восходящий тренд до 108 (медленно, откаты ≤1.5%)
Свечи 15–16: резкий откат до 105.5 (low свечи 16 = 105.4)
Свечи 17–26: продолжение роста до 113
Свечи 27–30: разворот: 113 → 109 → 104 → 96 (low свечи 30 = 95.2)
Свечи 31–48: медленный боковик 94–97
```
Массив OHLC — константа в коде (`scenario_A.json`), не генерируется.

### 3.2. Модель исполнения (строго как в Freqtrade-бэктесте, урок FT-09/FT-10)
- Вход по `open` свечи t+1 после сигнала.
- `stoploss` проверяется **внутри свечи по low** (worst case): если `low ≤ entry × (1 + stoploss)` → выход по стоп-цене.
- ROI-таблица из урока: `{'0': 0.06, '240': 0.02}` — проверяется по `high` свечи (Freqtrade считает ROI достигнутым, если high коснулся цели); выход по цене цели.
- Трейлинг: параметры из урока `trailing_stop_positive = 0.015`, `offset = 0.03`, `only_offset_is_reached = True`. Логика: пока `max_profit < 0.03` — действует обычный стоп; как только достигнут offset — стоп = `max_high × (1 − 0.015)`, пересчитывается каждую свечу по high, никогда не опускается.
- Порядок проверки внутри свечи: сначала стоп/трейлинг по low, потом ROI по high (консервативно; отметить в подписи «допущение бэктеста»).

**Важно для стадии A:** чтобы демонстрация не была тривиальной, ROI +6% с нулевой задержкой в стадии A **отключён** (переключатель «ROI» отдельно, по умолчанию выкл. с подписью «ROI-лестницу отключили, чтобы увидеть работу стопов; включи — и сделка закроется на +6% на свече 9»). Это честно: ученик видит и то, и другое.

### 3.3. Переключатели и ожидаемые исходы (предрасчитанные, зафиксировать в тестах)
| Режим | Где закрылась | Результат | Что «забрали» | Что «потеряли» |
|---|---|---|---|---|
| Только стоп −10% | свеча 30, стоп 90.0 не задет (low 95.2) → позиция живёт до конца окна, выход по сигналу/концу на 96 | **−4.0%** | ничего: весь ход +13% отдан на развороте | вся прибыль движения |
| Стоп + трейлинг | offset +3% достигнут на свече 7; на свече 16 стоп подтянут к 108×0.985 = 106.4 → **low 105.4 выбивает** | **+6.4%** | часть первого хода | вторую волну до 113 (ранний выход из тренда) |
| Стоп + трейлинг + StoplossGuard | для одной сделки — идентично предыдущему; в панели подпись «StoplossGuard действует на *следующие* входы, не на эту сделку → смотри стадию B» | +6.4% | — | — |
| + ROI (доп. тумблер) | свеча 9, high коснулся 106 | **+6.0%** | быстрый выход | 7 из 13 пунктов движения |

Числа проверить при реализации на конкретном OHLC-массиве; допускается подгонка массива под эти исходы, но **не наоборот**.

### 3.4. Экран стадии A
- **Верх (70% высоты):** свечной график 48 свечей. Линии: цена входа (серая пунктирная), текущая стоп-линия (красная, ступенчатая — видно, как трейлинг её подтягивает), ROI-цель (зелёная пунктирная, если включена). Маркеры входа (▲) и выхода (■) с подписью причины по-русски: «стоп», «трейлинг», «ROI», «сигнал/конец окна».
- **Низ слева:** три тумблера-контура + доп. тумблер ROI. Каждый тумблер — с русской подписью и токеном: «Жёсткий стоп `stoploss = -0.10`», «Трейлинг `trailing_stop`», «Пауза после серии `StoplossGuard`». Токен кликабелен.
- **Низ справа — «Счётчик размена»:** три строки: `Результат сделки`, `Забрано из движения` (в п.п. и %), `Отдано рынку` (в п.п.). Пересчитывается при каждом переключении.
- **Кнопки управления анимацией:** ▶ / ⏸ / «шаг» / ползунок скорости. Анимация идёт свеча за свечой, стоп-линия двигается на глазах. При выходе — короткая пауза и всплывающая плашка «Почему закрылась: …».
- **Кнопка «Показать все три сразу»:** три мини-графика в ряд с маркерами выхода — для сравнения одним взглядом.

### 3.5. Тексты обратной связи (стадия A)
- После режима «только стоп»: «Стоп −10% не сработал — цена не дошла до 90. Но и прибыль +13% на пике сделка не сохранила: без трейлинга и ROI выход только по сигналу. Стоп защищает от катастрофы одной сделки, а не от «отдать заработанное».»
- После «+ трейлинг»: «Трейлинг забрал +6.4% — и выкинул из сделки перед второй волной до 113. Это цена контура: ранний выход из трендов. Считать, что трейлинг «увеличивает прибыль», нельзя: он *меняет форму* результата.»
- После «+ StoplossGuard»: «На одной сделке ничего не изменилось — и это правильно. StoplossGuard смотрит на *серию* стопов и запрещает новые входы. Его работу видно только на истории → стадия B.»

## 4. Стадия B — мини-бэктест на 90 днях

### 4.1. Синтетическая история (детерминированная, seed)
Часовые свечи, 90 дней = 2160 свечей, одна условная пара. Генератор — режимный (три фазы), чтобы StoplossGuard и MaxDrawdown было где сработать:

```
Дни 1–30:  умеренный тренд вверх, дрейф +0.04%/ч, σ 0.6%   (трейлинг забирает, стопов мало)
Дни 31–50: пила (боковик с ложными пробоями), σ 0.9%, дрейф 0  (серии стопов → StoplossGuard)
Дни 51–60: обвал −22% за 6 дней с гэпами вниз (low пробивает стоп глубже уровня)  (MaxDrawdown-окно)
Дни 61–90: медленное восстановление +12%, σ 0.5%
```
Сигнал входа — упрощённая учебная стратегия урока: `ema16 > ema200` (на синтетике использовать ema16/ema96, чтобы был прогрев) и RSI-пересечение 35 снизу. Число сделок за 90 дней должно получиться **35–55** (проверить генератором; если меньше 30 — ослабить порог RSI до 40 и подписать это).

Все сделки — стейк 150 USDT при депозите 1000 (сайзинг из урока), `max_open_trades = 3` (одна пара → фактически 1 позиция; для стадии B допустимо смоделировать «3 пары» как три независимо сдвинутые копии ряда с общим обвалом в дни 51–60 — это одновременно готовит FT-18 про корреляцию). MVP: одна пара, `max_open_trades = 1`; MVP+: три коррелированные пары.

### 4.2. Модель контуров в бэктесте
- **Контур 1 — стоп:** как в стадии A. Плюс гэпы: если `open` свечи уже ниже стоп-цены — исполнение по `open` (реальный убыток глубже −10%; показать отдельной строкой «стопов, исполненных хуже уровня: N, средний перелёт −x.x п.п.» — мост в «Числа» урока про −10% → −12%).
- **Контур 2 — трейлинг:** параметры урока.
- **Контур 3 — protections** (три тумблера внутри одной группы, по умолчанию все три включаются вместе как в коде урока):
  - `CooldownPeriod stop_duration_candles=2`
  - `StoplossGuard lookback=24, trade_limit=3, stop_duration=12, only_per_pair=False`
  - `MaxDrawdown lookback=144, trade_limit=20, max_allowed_drawdown=0.10`
  
  Семантика: protections блокируют **новые входы** на указанное число свечей; открытые позиции живут по своим правилам (это прямо повторяет ответ «Проверь себя» из урока). MaxDrawdown: считать просадку по закрытым сделкам за lookback-окно, срабатывает только если сделок в окне ≥ `trade_limit`.

### 4.3. Метрики (E8, с русскими именами и зонами из FT-09)
| Метрика | Формула | Зона тревоги | Зона нормы |
|---|---|---|---|
| Итог за период, % | (баланс_конец / 1000 − 1)×100 | — | — |
| Годовая доходность (CAGR) | (1+r)^(365/90) − 1 | — | — |
| Макс. просадка (MaxDD), % | max(пик − текущий)/пик по кривой баланса | > 25% | 5–15% |
| **Calmar** | CAGR / \|MaxDD\| | < 1 | > 2 (ориентир 1.10) |
| Число сделок | count | < 30 | 80–400 (за 1.5 года; тут 90 дней — подписать пересчёт) |
| Profit factor | Σприбылей / Σубытков | < 1.1 | 1.3–1.8 |
| Причины выхода | доли ROI / стоп / трейлинг / сигнал | «всё стопом» | сбалансировано |
| Макс. серия стопов подряд | count | — | сверка с FT-17b |
| Часов в блокировке входов | Σ свечей с активной protection | — | — |
| Пропущено сигналов из-за блокировки | count | — | — |

Подпись под Calmar: «Calmar = годовая доходность ÷ максимальная просадка. Именно эта метрика показывает, оправдан ли размен: прибыль может упасть, но если просадка упала сильнее — Calmar растёт».

### 4.4. Экран стадии B
- **Слева (E2, ползунки):** `stoploss` (−0.05…−0.20, шаг 0.01), `trailing_stop_positive` (0.005…0.05), `trailing_stop_positive_offset` (0.01…0.08), `StoplossGuard.trade_limit` (2…6), `StoplossGuard.stop_duration_candles` (4…48), `MaxDrawdown.max_allowed_drawdown` (0.05…0.25). Кнопка «Сбросить к значениям урока». Тумблеры контуров те же, что в стадии A.
- **Центр:** кривая баланса; **обязательно** наложение до 3 кривых для сравнения (ученик «закрепляет» конфигурацию кнопкой «зафиксировать как вариант A/B/C» — это ключ к пониманию размена). Под кривой — полоса просадки (drawdown-underwater chart) и цветные отрезки блокировок входов (StoplossGuard — оранжевый, MaxDrawdown — красный, Cooldown — серый).
- **Справа:** таблица метрик по закреплённым вариантам A/B/C, колонки рядом. Строка Calmar выделена. Рядом с каждой метрикой стрелка ▲▼ и дельта относительно варианта A.
- **Панель риска (E2, всегда видна):** «Риск на сделку: 150 × 10% = 15 USDT (1.5% депозита)» — пересчитывается от ползунка стопа. «Суммарный одновременный риск: 3 × 1.5% = 4.5%». Это готовит FT-17b.

### 4.5. Сценарий прохождения (обязательная последовательность)
1. **Шаг 1 «Только стоп».** Ученик закрепляет вариант A. Система показывает результат и подпись: «Запиши мысленно три числа: итог, MaxDD, Calmar».
2. **Шаг 2 «+ трейлинг».** Вариант B. Ожидаемый эффект на seed по умолчанию: итог **↑ или ≈** (трейлинг в трендовой фазе спасает часть прибыли), MaxDD ↓, Calmar ↑. Подпись честно оговаривает: «Здесь трейлинг помог и прибыли — потому что в истории есть трендовая фаза. В пилообразной фазе он бы резал раньше времени. Это зависит от режима рынка, а не свойство контура».
3. **Шаг 3 «+ protections».** Вариант C. **Требование к генератору:** на seed по умолчанию итог должен получиться **ниже**, чем у B (пропущены сделки после обвала на восстановлении), MaxDD — **заметно ниже**, Calmar — **выше**. Если генератор даёт иное — переподобрать параметры генератора (не protections!) до получения этого паттерна; это дидактическая инвариантность, зафиксировать в тестах.
4. **Шаг 4 — вопрос с выбором** (обязательный gate):
   > «Что произошло при включении protections?»
   > a) Стратегия стала прибыльнее — защиты надо включать всегда
   > b) Прибыль упала, просадка упала сильнее, Calmar вырос — это размен хвоста на часть дохода ✓
   > c) Стало хуже — защиты бесполезны
   
   Объяснение при ошибке a: «Посмотри строку «Итог»: она ниже, чем у варианта B. Защиты не добавили денег — они срезали хвост просадки (см. дни 51–60). Что выросло — это Calmar». При ошибке c: «Посмотри MaxDD: в варианте B она −X%, в C — −Y%. Спроси себя по уроку 5.5: какую из них ты пересидел бы, не выключив бота руками?»
5. **Шаг 5 — свободный ввод** (1–2 предложения): «Какой размен ты получил? Что отдал, что купил?» Сохраняется в журнал (E5) как запись «FT-17a: размен». Не проверяется автоматически, но показывается ученику при повторном заходе и в FT-20.

### 4.6. Мост «поживи в просадке»
Кнопка «Пережил бы?» на строке MaxDD: пересчитывает просадку в рубли для депозита, который ученик ввёл в FT-17b (или 100 000 ₽ по умолчанию), и показывает фразу из урока 5.5: «На экране в этот момент −X ₽ при полностью исправной стратегии. Эту цифру нужно принять ДО запуска».

## 5. Стадия C — ловушка подгонки (MVP+)

- Кнопка «🔧 Подобрать параметры защит под эту историю». Система перебирает сетку (`trade_limit` 2–6 × `stop_duration` 4–48 × `max_allowed_drawdown` 0.05–0.25, ~200 комбинаций, считает быстро) и выбирает вариант с максимальным итогом на днях 1–90. Показывает вариант D: «итог +Z%, MaxDD −W% — лучше и B, и C по обоим показателям!» с зелёным конфетти (намеренно).
- Через 2 секунды появляется кнопка «Проверить на следующих 60 днях» → генерируется продолжение истории тем же генератором (другая фаза, seed+1). Варианты C (параметры урока) и D прогоняются на OOS. Требование к генератору: D должен на OOS проиграть C по Calmar (обычно — заметно; если на конкретном seed нет — интерактив честно пишет «на этот раз повезло; нажми «Другая история»» и повторяет; но seed по умолчанию должен давать провал D).
- Финальная плашка: «Параметры защит, подобранные оптимизатором под прошлое, «идеально» останавливают бота в прошлом. Задавай `trade_limit` и `max_allowed_drawdown` из своей толерантности к серии стопов (урок 5.5), а не из перебора» — дословная связка с ⚠ Важно урока.

## 6. Критерии освоения FT-17a
- Ученик прошёл gate шага 4 (правильный ответ, число попыток логируется).
- Заполнено поле свободного ввода «размен».
- Хотя бы раз кликнут любой токен словаря (телеметрия языкового слоя).

## 7. Тесты приёмки (для агента)
1. Стадия A, режим «только стоп»: выход на свече 30 по сигналу/окну, результат −4.0% ±0.3.
2. Стадия A, «+трейлинг»: выход на свече 16, +6.4% ±0.3, стоп-линия визуально ступенчатая, после свечи 7.
3. Стадия A, «+ROI»: выход на свече 9, +6.0%.
4. Стадия B, seed 20240517: сделок 35–55; порядок Calmar: C > B > A; итог: C < B; MaxDD: C < B < A.
5. Стадия B: изменение `stoploss` ползунком мгновенно меняет строку «Риск на сделку» (15 USDT при −0.10; 22.5 при −0.15).
6. Стадия C, seed по умолчанию: D побеждает C на in-sample по итогу и MaxDD; D проигрывает C на OOS по Calmar.
7. Все токены из словаря кликабельны, карточка открывается ≤200 мс, текст на русском.
8. Полный проход на мобильном (≥360px): графики стекуются вертикально, таблица метрик скроллится горизонтально, тумблеры не менее 44px.

## 8. Телеметрия
`ft17a_stage_view {stage}`, `ft17a_toggle {contour, on}`, `ft17a_variant_pin {A|B|C}`, `ft17a_gate_answer {choice, attempt}`, `ft17a_free_text {len}`, `ft17a_overfit_click`, `ft17a_oos_result {calmar_C, calmar_D}`, `glossary_click {token}`.

---

# FT-17b · «Серия из 10 стопов на моём депозите»

## 1. Цель и ломаемое заблуждение

**Заблуждение:** «Сайзинг — второстепенная настройка; главное — хороший сигнал и защиты. `stake_amount: unlimited` — удобно и безопасно, бот сам всё поделит».

**Целевой инсайт:** одна и та же стратегия с одной и той же серией из 10 стопов оставляет депозит либо живым (−15%), либо на грани выживания системы (−33%) — и различает их только размер позиции. Сайзинг — главный предохранитель; всё остальное — надстройки (дословно из урока).

**Вторичные инсайты:** (а) серия из 10 стопов — не «невезение», а неизбежность за сотни сделок; (б) асимметрия восстановления (урок 0.12) делает −33% в 2.5 раза дороже −15% по требуемому отыгрышу; (в) три коррелированные позиции — один риск (мост в FT-18).

## 2. Входные параметры (E2-панель)

| Параметр | Диапазон | По умолчанию | Примечание |
|---|---|---|---|
| Депозит `dry_run_wallet` | 300…100 000 USDT | **1000** | Кнопка «в рублях» — курс задаётся числом (по умолчанию 90 ₽), показывает второй экран цифр |
| Режим стейка | «фиксированный» / `unlimited` | оба **одновременно** (два веера рядом) | Это сердце интерактива — сравнение, а не выбор |
| `stake_amount` (фикс.) | 10…депозит | **150** | Подпись живая: «риск на сделку = 150 × 10% = 15 USDT = 1.5%» |
| `max_open_trades` | 1…10 | **3** | Для `unlimited`: стейк = депозит × `tradable_balance_ratio` / слоты = 1000×0.99/3 ≈ **330** |
| `tradable_balance_ratio` | 0.90…1.00 | 0.99 | |
| `stoploss` | −0.03…−0.25 | **−0.10** | |
| Средняя прибыльная сделка, % стейка | 3…30 | **10** (1R) | Подпись: «усреднённая сделка с учётом ROI/трейлинга; при 1R и винрейте 50% EV ≈ 0 до комиссий — веер ровный, смотрим на риск, а не на доход» |
| Винрейт | 30…65% | пресеты **40%** и **50%** (из урока) + ползунок | |
| Длина ряда (сделок) | 50…1000 | **200** | |
| Число траекторий | 100…1000 | **300** | |

Все токены кликабельны (словарь общий с FT-17a).

## 3. Три сцены

### Сцена 1 — «Худший день»: детерминированная серия из 10 стопов
Никакой случайности. Две колонки, анимация по одному стопу за шаг (можно «сразу всё»).

- **Фиксированный стейк 150:** 10 × 15 USDT = **−150 USDT (−15.0%)**. Баланс 1000 → 850. Столбик слева тает ровными ступенями.
- **`unlimited`, 3 слота:** стейк пересчитывается от текущего баланса перед каждой сделкой: 330 → −33; 967 → стейк 319 → −31.9 … Итог после 10 стопов ≈ **−28.5% геометрически** (0.967^10 ≈ 0.715). Подпись: «В уроке округлено до −33%: если все три слота были заняты одновременно и стопы легли на один и тот же баланс — 10 × 33 = −330. Реальность между −28% и −33% в зависимости от того, успевает ли бот пересчитать стейк». Показать оба числа явно — иначе внимательный ученик поймает расхождение с текстом.
- **Строка «Чтобы вернуться в ноль»** (урок 0.12): 850 → +17.6%; 715 → +39.9% (или 670 → +49.3% при −33%). Формула `1/(1−DD) − 1` показана.
- **Плашка «Мир или голова?» (мост в П1/5.5):** «Стратегия исправна. Просто выпала серия. При −15% ты это пересидишь; при −33% — вопрос уже не о стратегии, а о выживании системы. Разница — только в размере позиции».
- **Кнопка «Коррелированный обвал: три стопа разом»** (мост в FT-18 и 3.6): один шаг — все три слота закрыты по стопу одновременно: фикс. −45 USDT (−4.5%), unlimited −100 USDT (−10%). Подпись: «Лимит по числу сделок ≠ лимит по риску: три альткоина в обвал биткоина — одна позиция втрое больше».

### Сцена 2 — «Насколько это вероятно»: калькулятор серии
Две панели чисел, пересчитываются от винрейта:

1. **«Следующие 10 сделок — все стопы»:** `q^10`. При 50%: 0.5^10 = **0.098% (≈0.1%)**; при 40%: 0.6^10 = **0.6%**. Это числа урока — показать первыми и подписать «именно так считает урок: вероятность конкретной серии в конкретном месте».
2. **«Где-то за N сделок встретится серия ≥10»:** считается **Монте-Карло на тех же траекториях сцены 3** (не формулой) + справочно формула ожидаемой макс. серии из урока 5.5: `ln(N)/ln(1/q)`. При N=200, винрейт 50%: ожидаемая макс. серия ≈ 7.6; P(серия ≥10) ≈ 9%. При 40%: ожидаемая ≈ 10.4; P(≥10) ≈ 45%. При N=500 и 40% — P ≈ 80%+. Ползунок N наглядно тянет вероятность к 100%: подпись «за сотни сделок — неизбежно» (цитата урока).
3. **Гистограмма максимальных серий** по траекториям с вертикальной чертой «10».

Текст-ловушка: «0.1% звучит как «никогда». Но бот делает 200 сделок в год три года подряд — и «никогда» превращается в «в течение работы почти наверняка». Готовить сайзинг надо под серию, которая *будет*, а не под ту, что «маловероятна».»

### Сцена 3 — веер траекторий (E8)
Два веера рядом (фикс. 150 / unlimited), одни и те же последовательности исходов (одинаковый seed → у обеих колонок одинаковые серии побед/поражений — принципиально: различие только в сайзинге).

- Каждая траектория: 200 сделок, исход по винрейту, прибыль `+win% × стейк`, убыток `stoploss × стейк`. Для unlimited стейк пересчитывается от баланса; для фиксированного — 150 пока баланс ≥ 150, далее весь остаток (и пометка «стейк урезан»).
- Комиссия: тумблер «учесть комиссию 0.2% за круг» (по умолчанию вкл., урок 0.18/1.8).
- Отрисовка: 300 полупрозрачных линий, медиана жирная, коридор 5–95 процентилей закрашен. Ось Y — баланс в % от старта (и в ₽ по тумблеру).
- **Панель распределения под каждым веером:** медиана итога; 5-й процентиль итога; **95-й процентиль MaxDD** (та самая «граница нормальной просадки» из урока 5.5); доля траекторий с MaxDD > 20% / > 30% / > 50%; доля «разорений» (баланс < 50% старта — подписать как условный порог, при котором по 0.12 нужно +100%).
- **Строка сравнения:** «При одинаковых сделках `unlimited` даёт 95%-просадку X% против Y% у стейка 150. Медианный итог отличается на Z п.п.» — ученик видит, что unlimited поднимает и медианный доход (при EV>0) — интерактив не врёт, что unlimited «всегда хуже»; он показывает *цену*.
- **Ползунок «Мой лимит просадки»** (по умолчанию 20%): закрашивает траектории, пробившие лимит, красным, и пишет: «При лимите 20% ты выключил бы исправного бота руками в X% историй при `unlimited` и в Y% при стейке 150» — прямая сшивка с 5.5 и П1.

### Сцена 4 — «Обратная задача: подбери стейк под серию» (короткий тренажёр)
Поле: «Какую серию стопов ты готов пережить с просадкой не больше ___%?» (по умолчанию 10 стопов / 20%). Система считает `r ≤ 1 − (1−DD)^(1/k)` (формула урока М12): при 10 и 20% → r ≤ 2.2% на сделку → при стопе −10% стейк ≤ 22% депозита… и тут же уточняет **правилом урока 1–2%**: «Формула даёт потолок; устав FT-17 режет его до 1–2% → стейк 100–200 USDT при депозите 1000 и стопе −10%». Ученик двигает ползунок стейка, пока панель риска не станет зелёной. Полученное число предлагается **записать в свой конфиг** (кнопка «скопировать `"stake_amount": 150`») и в устав (E5-запись «FT-17b: мой стейк = …, риск = …%»).

## 4. Расчётные требования
- MC на 300×200 должен считаться ≤150 мс (Web Worker; 1000×1000 ≤1 с с индикатором).
- Одинаковый seed для обеих колонок; пересчёт всех сцен при смене любого параметра.
- Для сцены 1 (детерминированной) — точные значения: фикс. −150.00; unlimited: последовательность балансов при пересчёте стейка от `balance×0.99/3` печатается в таблицу (10 строк), чтобы ученик мог проверить руками.
- Округление: проценты до 0.1, USDT до 1, рубли до 100.

## 5. Обязательные тексты (русский, без английских терминов в теле)
- Заголовок сцены 1: «Одна и та же серия — два разных депозита».
- Ключевая фраза (появляется после сцены 3, фиксированная): «Сайзинг — главный предохранитель, остальное — надстройки». Рядом — ссылка «почему так: урок 3.3 (Келли), 5.5 (серии), 0.12 (асимметрия)».
- Подпись при винрейте ≥ 60% и выигрыше 1R: «При таком EV `unlimited` выглядит привлекательно. Помни урок 3.3: винрейт из бэктеста завышен подгонкой; сайзинг считают от худшего сценария, а не от красивого среднего».

## 6. Критерии освоения
- Пройдена сцена 1 и нажата кнопка «Коррелированный обвал».
- Gate-вопрос после сцены 3:
  > «Что различает −15% и −33% при одинаковой серии стопов?»
  > a) Качество сигнала b) Наличие трейлинга c) **Размер позиции** ✓ d) Везение
- Сцена 4 завершена: выбран стейк, панель риска зелёная (1–2%), значение сохранено в E5.

## 7. Тесты приёмки
1. Сцена 1, депозит 1000, стейк 150, стоп −0.10: итог ровно −150 USDT, −15.0%, «до нуля» +17.6%.
2. Сцена 1, unlimited, 3 слота, ratio 0.99: первый стейк 330; итог 10 стопов в диапазоне −28…−29% (пересчёт) и отдельно показано −33% (без пересчёта); «до нуля» ≈ +40% / +49%.
3. Сцена 1, «обвал»: −45 / −100 USDT.
4. Сцена 2: при 50% показано 0.1% (0.098%), при 40% — 0.6%; P(серия≥10 за 200) для 40% в диапазоне 40–50% по MC; для 50% — 7–12%.
5. Сцена 3: последовательности исходов идентичны в обеих колонках при одном seed (проверка: первые 20 исходов траектории №1 совпадают).
6. Сцена 3, 50% / 1R / 200 сделок / комиссия вкл.: 95-й процентиль MaxDD у unlimited строго больше, чем у стейка 150 (ожидаемо ~2 раза).
7. Изменение `stoploss` с −0.10 на −0.20 мгновенно удваивает «риск на сделку» в панели (30 USDT, 3.0%) и красит её в красный (порог 2%).
8. Кнопка «скопировать в конфиг» отдаёт валидный JSON-фрагмент.

## 8. Телеметрия
`ft17b_param_change {name, value}`, `ft17b_scene_complete {scene}`, `ft17b_correlated_click`, `ft17b_gate_answer {choice, attempt}`, `ft17b_limit_slider {dd_limit}`, `ft17b_stake_chosen {stake, risk_pct}`, `ft17b_copy_config`, `glossary_click {token}`.

---

## Связки между двумя интерактивами и уроком (чтобы агент не разорвал контекст)

1. Депозит и стоп, введённые в FT-17b, подставляются в «панель риска» FT-17a и наоборот (общий стор `ft17.params`).
2. Метрика «Макс. серия стопов подряд» из бэктеста FT-17a показывается в FT-17b сцене 2 как «в твоём мини-бэктесте было N подряд» — связь «что было в одной истории» ↔ «что бывает в тысяче историй».
3. Запись E5 из FT-17b («мой стейк») подтягивается в чек-лист допуска FT-20 (пункт «stake соответствует 1–2%») и в конструктор устава 5.6 (`risk_per_trade_pct`).
4. Ни один из интерактивов не содержит `hyperopt` для protections как «правильного пути»; единственное место, где перебор вообще появляется, — стадия C FT-17a, и он там заканчивается провалом на OOS. Это дидактически принципиально.
5. Kill-switch (урок 4.4) в обоих интерактивах упоминается одной постоянной сноской: «Ничто из показанного не заменяет внешний kill-switch: он страхует инфраструктуру, не рынок».

-----------------------------------------------

# ТЗ на реализацию двух интерактивов урока FT-16 «Hyperopt: поиск параметров без самообмана»

**A. «4096 монеток»** (СИМ) · **B. «Walk-forward: гуляют ли параметры»** (СИМ)

Документ для агента-разработчика. Всё, что помечено ❗ — обязательно к реализации в первой версии; ◇ — желательно / вторая итерация.

---

## 0. Общая рамка (одна на оба интерактива)

### 0.1. Педагогическая цель и место в уроке

| | A «4096 монеток» | B «Walk-forward» |
|---|---|---|
| Ломаемое заблуждение | «Лучший результат перебора = найденная альфа» | «Одна оптимизация на всём периоде — достаточно» |
| Ключевая фраза урока, которую интерактив *проживает* | «На in-sample из 120 сделок даже ЧИСТО СЛУЧАЙНАЯ стратегия покажет "лучшей" комбинации PF ~1.5+ просто за счёт дисперсии» | «Если P1, P2, P3 похожи (rsi_buy гуляет 33–36, а не 25..40), а OOS держатся — параметры стабильны. Если разбросаны — сигнала нет» |
| Порог, который ученик должен запомнить числом | Здоровый OOS = 50–70 % от IS; лучше IS → ищи утечку | Три окна; параметры в узком диапазоне; OOS PF держится ≥ 2 из 3 окон |
| Мосты на другие уроки (показываются как ссылки-чипы) | 1.10 (ожидаемый максимум Шарпа на шуме √(2 ln N), Deflated Sharpe), 1.12 (плато vs пик), М36 (множественные проверки) | 1.9 (walk-forward, efficiency > 0.5), 1.12 (±20 %), 5.4 / П34 (деградация альфы и смена режима), FT-13 (конвейер анти-лжец) |
| Позиция в уроке | Сразу после блока «▸ Глубже» и «Числа» (математика подгонки на пальцах) | После блока «Walk-forward в исполнении Freqtrade», перед «Планировщиком walk-forward» |

Оба интерактива — про **предсказание до наблюдения** (predict → observe → explain). В каждом ученик сначала фиксирует свою догадку, потом видит факт, потом получает объяснение. Догадка сохраняется и сравнивается.

### 0.2. Сквозной персонаж и числа

- Депозит не нужен (речь о PF и параметрах), но подписи используют стратегию урока **DipBuyerBTCFilter** и её параметры: `rsi_buy` (IntParameter 25..40, default 35), `ema_period` (10..30), период RSI.
- Комиссия по умолчанию **0,1 % за сторону** (0,2 % за круг) — как в уроке FT-13. Переключатель «без комиссий» есть, но по умолчанию выключен.
- Таймфрейм симуляции — **1h** (рабочая лошадка новичка из FT-08); в год ≈ 8 760 свечей.

### 0.3. Общий вычислительный модуль `hyperoptSimCore` ❗

Оба интерактива используют один модуль (Web Worker, typed arrays, seeded PRNG — например mulberry32). Модуль обязан быть детерминированным: одинаковый `seed` → одинаковый результат.

**0.3.1. Генератор рядов (три режима данных)**

| Режим | ID | Как генерируется | Зачем |
|---|---|---|---|
| Чистый шум («монетка») | `noise` | Геометрическое случайное блуждание: `logP_t = logP_{t-1} + ε_t`, ε ~ N(0, σ²), σ = 0,7 %/час, дрейф 0 | Показать, что перебор находит «альфу» там, где её нет |
| Настоящий край | `edge` | Тот же шум + компонент возврата к среднему: `logP_t = logP_{t-1} − φ·(logP_{t-1} − MA_200(logP)) + ε_t`. φ калибруется (ориентир 0,01–0,03) так, чтобы дип-покупка имела реальное преимущество | Показать, как выглядит *честный* результат: OOS 50–70 % от IS, параметры кластеризуются |
| Край, который умер (только для B) | `regime_change` | Режим `edge` первые 24 месяца, далее φ = 0 (чистый шум) с даты `T_break` | Показать деградацию альфы: окна 1–2 работают, окно 3 рассыпается |

Общая длина ряда: A — 18 месяцев (12 IS + 6 OOS); B — 36 месяцев (2023-01-01 … 2025-12-31 по подписям на линейке E7). Плюс 200 свечей разогрева до старта (EMA200, см. FT-12) — на линейке не показываются, но в подсказке упоминаются.

**0.3.2. Стратегия-эталон (упрощённый DipBuyerBTCFilter)**

- Индикаторы: `RSI(rsi_period)`, `EMA(ema_period)` (быстрая), `EMA(200)` (медленная, фиксирована).
- Вход (лонг) на свече t: `EMA_fast > EMA_200` и `RSI_t < rsi_buy` и `RSI_{t-1} ≥ rsi_buy` (именно пересечение — как в FT-05). Исполнение по **open t+1**.
- Выход: стоп −10 % (проверка по low внутри свечи), ROI +6 % (по high), либо сигнал `EMA_fast < EMA_200` → выход по open t+1. Стоп и ROI **не оптимизируются** (правило урока).
- Одна позиция за раз (`max_open_trades = 1`) — упрощение, о нём говорит подсказка.
- Комиссия 0,1 % на вход и на выход.

**0.3.3. Метрики на выходе одного прогона**

`trades`, `PF` (сумма прибылей / сумма убытков), `totalReturn`, `maxDD`, `winRate`, `sharpe` (по дневным приращениям капитала, ×√365), `sortino`, `calmar`, а также массив сделок (для кривой капитала). Правило: PF при нулевых убытках → `Infinity`, но комбинация помечается флагом `insufficient` и в рейтингах не участвует; **минимум сделок для участия — 30** (ползунок 10…60, подпись «правило минимума сделок из урока: 15 сделок за 18 месяцев — шум»).

**0.3.4. Производительность** ❗

- Индикаторы считаются один раз на каждое уникальное значение параметра (16 RSI-периодов, 16 EMA), комбинации только сочетают готовые массивы.
- Ориентир: 4 096 прогонов по 8 760 свечей за ≤ 3 с на среднем ноутбуке, ≤ 8 с на телефоне; результаты стримятся в UI пакетами по 64 прогона (для «живой» гистограммы).
- Fallback: если Worker недоступен или прогон > 12 с — автоматически перейти на сетку 8×8×8 = 512 с плашкой «На этом устройстве считаем 512 комбинаций вместо 4096 — вывод не меняется».

**0.3.5. Калибровочные приёмочные тесты модуля** (прогонять на 200 сидах, скрипт в репозитории)

| Режим | Условие | Доля сидов |
|---|---|---|
| `noise`, N=4096, IS 12 мес, fee 0,1 % | медиана PF (среди комбинаций с ≥30 сделками) ∈ [0,85; 1,00] | ≥ 90 % |
| `noise` | PF лучшей комбинации ≥ 1,4 | ≥ 90 % |
| `noise` | PF победителя на OOS ∈ [0,8; 1,2] | ≥ 80 % |
| `noise` | корреляция Пирсона (IS-PF, OOS-PF) по всем комбинациям: \|r\| < 0,15 | ≥ 85 % |
| `edge` | PF лучшей комбинации на IS ∈ [1,5; 1,9] | ≥ 80 % |
| `edge` | OOS-PF победителя / IS-PF ∈ [0,5; 0,8] | ≥ 80 % |
| `edge` | корреляция (IS-PF, OOS-PF) r > 0,4 | ≥ 80 % |
| `regime_change` (B, 3 окна) | OOS-PF окон 1 и 2 > 1,15, окна 3 < 1,0 | ≥ 80 % |
| `edge` (B) | размах `rsi_buy` по трём окнам ≤ 4 пунктов, `ema_period` ≤ 6 | ≥ 75 % |
| `noise` (B) | размах `rsi_buy` ≥ 8 пунктов | ≥ 70 % |

Если калибровка не сходится — двигать φ и σ, а не пороги вердиктов.

### 0.4. Интеграция с движками

- **E7 «Линейка времени»** ❗ — обязательна. Ожидаемый API: `setWindows([{id, trainFrom, trainTo, testFrom, testTo, sealed}])`, события `onChange(windows)`, `onSealBroken(windowId)`, счётчик `finalTestOpenCount`, подсветка запрещённых конфигураций (пересечение train/test одного окна; пересечение OOS разных окон; test раньше train). В A линейка почти статична (один сдвиг: разрыв печати); в B — главный орган управления.
- **E5 «Журнал»** ◇ — по завершении прогона в журнал экспериментов пишется строка (см. 1.9 и 2.9).
- **E8 «Двуязычный отчёт»** ◇ — «отчёт победителя» в A оформляется как таблица бэктеста freqtrade с русскими подписями и зонами (тревожная/рабочая) из FT-09.
- **Языковой слой «Ткни в непонятное»** ❗ — все английские токены кликабельны. Минимальный словарь для обоих интерактивов:

| Токен | Русская карточка (1–2 фразы) |
|---|---|
| hyperopt | Встроенный перебор параметров Freqtrade: много бэктестов подряд, выбор лучшего по формуле |
| in-sample (IS) | Отрезок истории, на котором подбирали параметры. Результат здесь — всегда завышен |
| out-of-sample (OOS) | Отрезок, которого перебор не видел. Единственная честная проверка |
| profit factor (PF) | Сумма прибылей ÷ сумма убытков. 1,0 — ноль минус комиссии |
| loss function | Формула, по которой перебор решает, что «лучше»: Шарп, Сортино, Калмар или просто прибыль |
| epochs | Число проб перебора. Больше проб — выше шанс найти красивый шум |
| walk-forward | Оптимизация на одном окне, проверка на следующем, сдвиг, повтор |
| holdout / final test | Кусок истории, который открывают один раз. Второй взгляд превращает его в train |
| overfitting / подгонка | Параметры, идеально описывающие прошлое и не предсказывающие будущее |
| IntParameter | Объявление целочисленного параметра стратегии с диапазоном для перебора |
| SharpeHyperOptLoss | Формула качества «доходность ÷ колебания» — рабочий дефолт урока |
| seed | Зерно генератора случайности: одно зерно — один и тот же «шум» при повторе |

---

## 1. Спецификация A — «4096 монеток»

### 1.1. Одна фраза

Ученик сам перебирает 3 параметра × 16 значений на **заведомо случайном ряде**, видит «победителя» с PF ≈ 1,5, «продаёт» его себе красивым отчётом, срывает печать с out-of-sample — и наблюдает, как победитель рассыпается. Затем то же на ряде с настоящим краем — и видит разницу.

### 1.2. Экран и компоновка (десктоп; мобайл — вертикальный стек в том же порядке)

```
┌───────────────────────────────────────────────────────────────┐
│ [Шаг 1/6]  Заголовок шага  ·  прогресс-точки                   │
├──────────────┬────────────────────────────────┬───────────────┤
│ ПАНЕЛЬ       │ СЦЕНА                          │ ПАНЕЛЬ        │
│ НАСТРОЕК     │ (гистограмма / отчёт /         │ РЕЗУЛЬТАТОВ   │
│ • данные     │  scatter / кривая капитала)    │ • победитель  │
│ • параметры  │                                │ • топ-10      │
│ • сделок ≥   │                                │ • твоя догадка│
│ • комиссия   │                                │ • вердикт     │
├──────────────┴────────────────────────────────┴───────────────┤
│ E7: ─────── IN-SAMPLE 12 мес ───────┃🔒 OUT-OF-SAMPLE 6 мес 🔒 │
│ Открытий финального теста: 0                                   │
└───────────────────────────────────────────────────────────────┘
```

### 1.3. Панель настроек ❗

| Элемент | Значения | По умолчанию | Примечание |
|---|---|---|---|
| Данные | «Чистый шум (монетка)» / «Стратегия с настоящим краем» | шум | Второй режим заблокирован до шага 5 (замочек с подписью «сначала монетка») |
| `rsi_buy` — порог входа | диапазон 25…40, шаг 1 | 16 значений | Показывается как «16 значений» |
| `ema_period` — быстрая EMA | 10…25, шаг 1 | 16 значений | |
| `rsi_period` — период RSI | 7…22, шаг 1 | 16 значений | |
| Значений на параметр | 4 / 8 / 16 | 16 | Меняет все три диапазона равномерно (прореживание); живой счётчик «Комбинаций: k³ = …» (64 / 512 / 4096). Нужен для шага 4 |
| Минимум сделок | 10…60 | 30 | Комбинации ниже порога серые в гистограмме и не участвуют в топе |
| Комиссия | 0 % / 0,1 % за сторону | 0,1 % | Смена — пересчёт без нового зерна |
| Зерно (seed) | «Новый шум» | фиксированное `20240601` | Первое прохождение всегда на фиксированном зерне (воспроизводимость скриншотов/тестов) |

### 1.4. Сценарий по шагам ❗

**Шаг 0 — Догадка (до любого расчёта).**
Текст: «Перед тобой 12 месяцев часовых свечей. Цена — *монетка*: следующий шаг никак не зависит от предыдущего, заработать на ней нельзя в принципе. Ты переберёшь 4096 настроек стратегии DipBuyerBTCFilter. Каким будет PF *лучшей* из 4096?»
Ползунок догадки 0,5…3,0 (шаг 0,05) + чекбокс «на новых данных лучшая тоже будет прибыльной» (да/нет). Кнопка «Записать догадку». Без догадки дальше нельзя.

**Шаг 1 — Прогон на шуме.**
Кнопка «Оптимизировать на шуме (4096 прогонов)». Сцена: гистограмма PF (бины 0,05, ось X 0,4…2,2) растёт по мере прихода пакетов; счётчик «прогонов: 1 280 / 4 096»; лидерборд топ-10 обновляется, лучший подсвечен золотом с короной «победитель». Вертикальные линии: медиана (подпись «медиана: 0,93 — комиссия делает своё»), лучший (подпись «лучший: 1,54»), пунктир на PF = 1,0.
По окончании — карточка: «Лучшая комбинация: rsi_buy = 31, ema_period = 19, rsi_period = 11 · PF 1,54 · 97 сделок. Твоя догадка: 1,10. Ты недооценил перебор на 0,44.» (или «Ты угадал»). Кнопка «Посмотреть отчёт победителя».

**Шаг 2 — Соблазн (отчёт победителя).**
Сцена: таблица в стиле вывода `freqtrade backtesting` (E8): Total profit %, Profit factor, Win rate, Max DD, число сделок, лучший месяц, Sortino — все со значениями победителя и зонами из FT-09 (большинство попадёт в «рабочую зону» — это и есть ловушка). Мини-кривая капитала IS плавно вверх. Подпись рядом, курсивом, с маленькой иконкой чата: «Именно такой отчёт присылают в чатах со словами "грааль найден"».
Единственная активная кнопка: **«Проверить на новых данных»** — с предупреждением на ховере «Разорвёт печать out-of-sample. Это можно сделать честно ровно один раз».

**Шаг 3 — Разрыв печати.**
При нажатии E7 анимирует снятие замка, счётчик «Открытий финального теста: 1». Сцена: кривая капитала победителя продолжается за границу IS в OOS: становится плоской/падающей. Рядом два числа крупно: «IS: PF 1,54 → OOS: PF 0,96». Топ-10 в правой панели получает вторую колонку OOS-PF — все ≈ 1,0.
Затем плавный переход к главному кадру — **диаграмма рассеяния** всех 4096 точек: X = IS-PF, Y = OOS-PF, серые точки, победитель золотой, диагональ пунктиром с подписью «если бы прошлое предсказывало будущее — точки легли бы сюда». В углу: «корреляция r = 0,03 — ноль».
Вердикт-плашка (красная): «Ты нашёл не альфу, а правый хвост распределения из 4096 бросков. In-sample PF — верхняя граница, завышенная просто числом попыток».

**Шаг 4 — Почему так: число попыток.**
Подключается ползунок «значений на параметр». Инструкция: «Прогони 4 → 8 → 16». Сцена: три наложенные гистограммы (64 / 512 / 4096) — медиана стоит на месте, а «лучший» уползает вправо. Таблица:

| Значений | Комбинаций N | Лучший PF (факт) | Ожидаемый максимум Шарпа на шуме ≈ √(2 ln N) |
|---|---|---|---|
| 4 | 64 | … | 2,9 |
| 8 | 512 | … | 3,5 |
| 16 | 4096 | … | 4,1 |

Подпись: «Формула из урока 1.10: чем больше попыток, тем выше планка, которую нужно перепрыгнуть. Deflated Sharpe — та же мысль числом». Чип-ссылка на 1.10.

**Шаг 5 — А как выглядит настоящий край?**
Разблокируется режим «Стратегия с настоящим краем». Печать OOS восстанавливается (новый ряд — новый holdout; счётчик открытий обнуляется с подписью «новые данные — новая печать»). Ученик повторяет шаги 1–3 сам (без принудительного отчёта, но кнопка «отчёт» доступна). Ожидаемая картина: гистограмма сдвинута вправо, лучший IS PF ≈ 1,7, OOS ≈ 1,2 (≈ 60–70 %), scatter с наклоном, r ≈ 0,5.
Вердикт (зелёный): «OOS = 68 % от IS. Здоровый OOS — 50–70 % от in-sample. Лучше in-sample — ищи утечку данных».
◇ Дополнительно: клик по победителю показывает «соседей» (±20 % по каждому параметру) и их PF — плато (все ≈ 1,5–1,7), мост на 1.12. В режиме шума те же соседи «рваные» (0,7 … 1,5).

**Шаг 6 — Проверка переноса (мастерство).**
Три вопроса с одним верным ответом, с мгновенной обратной связью и объяснением:
1. «Hyperopt на 400 эпох на шуме дал лучшую комбинацию с PF 1,6. Что ты знаешь о её OOS?» → *Ничего хорошего: ожидаемо около 1,0; 1,6 — верхняя граница, завышенная перебором.*
2. «После hyperopt OOS-PF = 1,45 при IS-PF = 1,40. Твоё действие?» → *Искать утечку данных (informative-мерж, bfill, whitelist из выживших): OOS лучше IS — подозрение, а не радость.*
3. «Ты прогнал hyperopt на всём периоде до сегодняшнего дня. Как проверить результат?» → *Никак честно: OOS не осталось; параметры можно только гонять в dry-run как новый holdout.*

**Критерий освоения** ❗: догадка записана; оба режима прогнаны; печать сорвана ≥ 1 раз; ≥ 2 из 3 ответов верны. При выполнении — флаг `ft16_coins_completed`, запись в прогресс, разблокировка планировщика walk-forward (интерактив B) с подписью «теперь — три окна».

### 1.5. Состояния и запреты

- Пока идёт прогон — кнопки настроек заблокированы, есть «Остановить».
- Повторное нажатие «Проверить на новых данных» на том же ряде и тех же параметрах — разрешено, но счётчик растёт и появляется плашка: «Открытий: 2. В реальной работе второй взгляд на holdout превращает его в train (урок 1.9)». На третьем — плашка красная и предлагает «Новый шум».
- Смена параметров сетки *после* срыва печати без смены зерна → E7 подсвечивает OOS жёлтым: «OOS уже видел этот ряд».
- Комбинации с `trades < минимум` — серые, вне рейтинга; если победитель по «сырому» PF имел мало сделок, показать сноску «PF 2,8 при 12 сделках — исключён правилом минимума сделок».

### 1.6. Тексты обратной связи (микрокопи, ID → текст)

- `guess_lower` — «Ты недооценил перебор на {Δ}. Так работает мозг: 4096 попыток — это много, а видим мы только победителя».
- `guess_hit` — «Твоя догадка совпала с фактом ±0,1. Теперь проверь вторую часть догадки — переживёт ли победитель новые данные».
- `noise_oos` — «IS {pf_is} → OOS {pf_oos}. Разница — не "рынок изменился", а статистика перебора».
- `edge_oos_ok` — «OOS = {ratio}% от IS. Это норма для настоящего края: 50–70 %».
- `edge_oos_high` — «OOS = {ratio}% от IS — лучше in-sample. На синтетике это случайность; на реальных данных — сигнал искать утечку».
- `seal_second` — «Второй взгляд на holdout: в реальном исследовании его уже нельзя считать честным».

### 1.7. Визуальные требования

- Гистограмма: цвет столбцов — нейтральный; столбцы правее PF 1,4 не «зелёные», чтобы не подсказывать, что это хорошо. Победитель — золотая метка.
- Scatter: 4096 точек — canvas, не SVG; hover по точке показывает параметры и оба PF.
- Кривая капитала: граница IS/OOS — вертикальная линия с иконкой замка; OOS-часть рисуется с задержкой 600 мс после разрыва печати (пауза-ожидание).
- Цвет + форма + текст для всех вердиктов (доступность). Режим «меньше анимаций» отключает стриминг гистограммы (показ сразу).

### 1.8. Телеметрия

`ft16a_guess {pf_guess, oos_guess}` · `ft16a_run {mode, N, seed, best_pf, median_pf, trades_best, ms}` · `ft16a_seal_break {count, pf_is, pf_oos}` · `ft16a_scatter_view {r}` · `ft16a_grid_change {k}` · `ft16a_quiz {q, correct}` · `ft16a_complete`.

### 1.9. Запись в журнал экспериментов (E5) ◇

`«FT-16 · 4096 монеток · режим: {шум|край} · seed {seed} · N={N} · победитель rsi_buy={..} ema={..} rsi_p={..} · IS PF {..} → OOS PF {..} ({ratio}%) · открытий holdout: {n} · вывод: {текст вердикта}»`

---

## 2. Спецификация B — «Walk-forward: гуляют ли параметры»

### 2.1. Одна фраза

Ученик расставляет три окна оптимизации на линейке времени, прогоняет hyperopt-перебор в каждом, видит найденные `rsi_buy`/`ema_period` как точки на карте параметров и склеенную OOS-кривую. Узкий кластер и живой OOS → «зона доверия»; разброс по всему диапазону → «сигнала нет»; кластер, который рассыпается в третьем окне → «край умер». Отдельная кнопка показывает, почему «одна оптимизация на всём периоде» ничего не проверяет.

### 2.2. Экран

```
┌─────────────────────────────────────────────────────────────────────┐
│ E7 ЛИНЕЙКА 2023-01 ─────────────────────────────────────── 2025-12  │
│  Окно 1  [IS ████████████][OOS ▒▒▒]                                  │
│  Окно 2         [IS ████████████][OOS ▒▒▒]                           │
│  Окно 3                [IS ████████████][OOS ▒▒▒]                    │
│  ⚠ конфликты: нет        Открытий финального теста: 0                │
├──────────────┬──────────────────────────────────┬──────────────────┤
│ НАСТРОЙКИ    │ КАРТА ПАРАМЕТРОВ                 │ ТАБЛИЦА ОКОН     │
│ • данные     │ 3 мини-теплокарты rsi×ema        │ P_rsi P_ema IS OOS│
│ • параметры  │ + общая плоскость с 3 точками    │ trades вердикт    │
│ • loss-функц.│   и «облаком разброса»           │                  │
│ • мин. сделок│                                  │ ВЕРДИКТ-БЕЙДЖ    │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ СКЛЕЕННАЯ OOS-КРИВАЯ (три сегмента разным штрихом) vs IS-кривые      │
├─────────────────────────────────────────────────────────────────────┤
│ [Прогнать walk-forward]  [А если оптимизировать на всём периоде?]   │
│ Журнал прогонов (до 5, сравнение бок о бок)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3. Настройки ❗

| Элемент | Значения | По умолчанию |
|---|---|---|
| Данные | «Чистый шум» / «Настоящий край» / «Край, который умер» | край (сначала показываем, как выглядит хорошо) |
| `rsi_buy` | 25…40, шаг 1 (16) | весь диапазон |
| `ema_period` | 10…30, шаг 1 (21) | весь диапазон |
| Loss-функция | Sharpe (дефолт) / Sortino / Calmar / «Только прибыль» | Sharpe — ровно как таблица loss-функций в уроке |
| Минимум сделок в окне | 10…60 | 30 |
| Окна на E7 | 3 окна, дефолт из урока: IS 2023-01…2024-06 → OOS 2024-07…2024-12; IS 2023-07…2024-12 → OOS 2025-01…2025-06; IS 2024-01…2025-06 → OOS 2025-07…2025-12 | пресеты «rolling 18/6» (дефолт), «anchored (расширяющееся IS)», «свой» |
| Зерно | «Новый ряд» | фиксированное |

Сетка 16 × 21 = 336 комбинаций на окно, ×3 окна = 1 008 прогонов — быстро (< 1 с). Это позволяет анимацию «окно за окном» без ожидания.

### 2.4. Правила линейки E7 в этом интерактиве ❗

- Каждое окно: IS и OOS; OOS начинается строго с конца IS (зазор ◇ настраиваемый 0…7 дней — «purge/embargo» из 1.9, показывать как подсказку).
- Запрещено и подсвечивается красным: пересечение IS и OOS одного окна; пересечение OOS разных окон (тогда OOS перестаёт быть независимым — подпись «эти две проверки считают одни и те же данные дважды»); OOS раньше IS; IS короче 6 месяцев (жёлтая подсказка «мало сделок для перебора»).
- Минимальная длина OOS — 3 месяца, иначе жёлтая подсказка «на 3 месяцах будет ~20–40 сделок: интервал доверия широкий».
- Кнопка «Прогнать» неактивна при красных конфликтах.

### 2.5. Что делает прогон (алгоритм)

Для каждого окна k = 1..3 последовательно (с анимацией 0,8–1,2 с на окно):
1. На IS_k перебрать 336 комбинаций, отфильтровать по минимуму сделок, выбрать P_k = argmax loss-функции (Sharpe/Sortino/Calmar/Profit). Записать IS-метрику и IS-PF.
2. Прогнать P_k на OOS_k → OOS-PF, OOS-Sharpe, OOS-trades, отрезок кривой капитала.
3. Нарисовать теплокарту k (rsi × ema, цвет — значение loss-функции), звёздочку в оптимуме, рядом контур «плато ±20 %» (ячейки в пределах 80 % от максимума).
4. На общую плоскость параметров добавить точку k (цвет окна). После трёх точек — заливка их выпуклой оболочки («облако разброса») с подписью «размах rsi_buy: {a}–{b}, ema: {c}–{d}».
5. Достроить сегмент OOS-кривой (склеенная кривая из 1.9): сегменты идут встык, каждый — своим штрихом; над ней полупрозрачно — три IS-кривые для контраста «обещание vs факт».

Затем — вычислить вердикт (2.6) и заполнить таблицу:

| Окно | P_rsi | P_ema | IS-PF | OOS-PF | OOS-сделок | Вердикт окна |
|---|---|---|---|---|---|---|

(шаблон намеренно совпадает с «таблицей-шаблоном» из задачи для ИИ-агента в уроке).

Дополнительно: **WF-efficiency** = Sharpe склеенной OOS-кривой / среднее IS-Sharpe трёх окон (формула из 1.9), с подписью «> 0,5 приемлемо».

### 2.6. Логика вердикта ❗

Обозначения: `spread_rsi = max(P_rsi) − min(P_rsi)` (диапазон 15), `spread_ema` (диапазон 20); `oos_ok_k = OOS-PF_k > 1,1 и OOS-trades_k ≥ min`.

| Вердикт | Условие | Бейдж | Текст |
|---|---|---|---|
| **Зона доверия** | spread_rsi ≤ 4 **и** spread_ema ≤ 6 **и** oos_ok ≥ 2 из 3 **и** WF-eff > 0,5 | зелёный, ● | «Параметры держатся в узком диапазоне ({a}–{b}), OOS живой в {n} окнах из 3. Это не гарантия прибыли — это отсутствие признаков подгонки. Следующий шаг: ±20 % (1.12) и dry-run» |
| **Сигнала нет** | spread_rsi ≥ 8 **или** spread_ema ≥ 10, **и** oos_ok ≤ 1 | красный, ▲ | «Оптимум прыгает по всему диапазону: в каждом окне перебор ловит свой шум. OOS около 1,0. Параметры не стабильны — гипотезу в архив» |
| **Край умер** | окна 1–2 в кластере (их spread укладывается в зелёные пороги) и oos_ok, окно 3: OOS-PF < 1,0 | оранжевый, ◆ | «Первые два окна — рабочие, третье рассыпалось при похожих параметрах. Так выглядит деградация альфы (5.4, П34): не крути параметры — проверь, не сменился ли режим» |
| **Неопределённо** | всё остальное | серый, ■ | «Картина смешанная: {что именно}. Продли данные или добавь окно. Не принимай решение по трём точкам» |

Порог `1,1` и разбросы вынести в конфиг интерактива (`verdictThresholds`), чтобы методолог мог подкрутить после калибровки.

### 2.7. Сценарий по шагам ❗

**Шаг 0 — Догадка.** Две карточки: «Одна оптимизация на всём периоде 2023–2025» и «Три окна walk-forward». Вопрос: «Если у стратегии есть настоящий край, как будут выглядеть найденные rsi_buy в трёх окнах?» Варианты: «одинаковые ±2», «разбросаны по всему диапазону», «неважно, главное — лучший результат». Записать.

**Шаг 1 — Прогон на «настоящем крае» (дефолт).** Ученик нажимает «Прогнать walk-forward», смотрит анимацию окно за окном. Ожидаемый вердикт — зелёный. Сравнение с догадкой.

**Шаг 2 — Прогон на «чистом шуме».** Смена данных, прогон. Ожидаемо — красный: три точки разлетелись, склеенная OOS-кривая около нуля, а IS-кривые «красивые». Обратная связь `wf_noise`: «Заметь: в каждом окне in-sample по-прежнему выглядит отлично. Подгонка не видна внутри окна — она видна между окнами».

**Шаг 3 — «Край, который умер».** Прогон. Оранжевый вердикт. Подсказка: «Именно это ты увидишь на реальном рынке чаще всего: конкуренты выторговали край (М15, 5.4). Правильная реакция — снижать долю и искать замену, а не переоптимизировать».

**Шаг 4 — Анти-паттерн.** Кнопка «А если оптимизировать на всём периоде?». Линейка E7 перерисовывается: одно IS на все 36 месяцев, OOS отсутствует; счётчик и плашка красным: «Финального теста нет: вся история съедена оптимизацией». Показать найденный «лучший» с IS-PF (будет высоким в любом режиме данных). Подпись: «Число красивое. Проверить его нечем. В режиме "шум" ты только что получил тот же отчёт, что и в режиме "край", — и не сможешь их различить». ◇ Дополнительно — кнопка «сравнить с тремя окнами» накладывает вердикты рядом.

**Шаг 5 — Loss-функция.** На данных «край» переключить loss на «Только прибыль» и прогнать: оптимум уезжает к комбинациям с малым числом сделок / лотерейным профилем, разброс растёт. Обратная связь `wf_profit_loss`: «"Максимальная прибыль" ищет лотерейные билеты. Риск-скорректированная функция (Sharpe/Sortino/Calmar) — рабочий дефолт из таблицы урока». Если минимум сделок выключен (10) — ещё заметнее; предложить поднять до 30 и увидеть разницу.

**Шаг 6 — Свои окна.** Ученику предлагается сделать anchored-вариант (расширяющееся IS) и одну намеренно «плохую» конфигурацию (OOS окна 2 наезжает на OOS окна 3) — E7 должен подсветить конфликт красным и объяснить. Задание считается выполненным, когда ученик сам собрал ≥ 1 валидную нестандартную конфигурацию и запустил её.

**Шаг 7 — Мастерство: «прочитай таблицу».** Показать 3 случайно сгенерированные таблицы окон (только числа, без цветов и подсказок; генерируются из тех же режимов данных) — ученик выбирает вердикт из трёх (доверие / нет сигнала / край умер). Нужно ≥ 2 из 3. Затем один вопрос переноса: «Параметры трёх окон: rsi_buy 34, 35, 33; OOS-PF 1,3 / 1,25 / 1,2. Что дальше?» → *тест ±20 % (1.12), потом dry-run — а не hyperopt ещё раз.*

**Критерий освоения** ❗: прогнаны все три режима данных; нажата кнопка анти-паттерна; собрана ≥ 1 своя валидная конфигурация окон; ≥ 2 из 3 таблиц классифицированы верно. Флаг `ft16_wf_completed`.

### 2.8. Журнал прогонов (внутри интерактива) ❗

До 5 последних прогонов с колонками: режим данных, loss, окна (пресет), P_k по окнам, OOS-PF по окнам, WF-eff, вердикт. Клик — восстанавливает состояние сцены. Это тренирует привычку «веди журнал всех проверенных конфигураций» из 1.10.

### 2.9. Запись в E5 ◇

`«FT-16 · walk-forward · данные: {режим} · loss: {..} · окна: {пресет} · P_rsi {..,..,..} · P_ema {..,..,..} · OOS-PF {..,..,..} · WF-eff {..} · вердикт: {..}»`

### 2.10. Микрокопи (ID → текст)

- `wf_edge_ok` — «Три окна — три похожих ответа. Это лучшее, что может сказать история: "подгонки не видно"».
- `wf_noise` — «Внутри каждого окна in-sample красив. Разница видна только между окнами — поэтому одно окно ничего не доказывает».
- `wf_regime` — «Кластер был, край был — и кончился. Это не повод "перенастроить": режим сменился».
- `wf_all_period` — «Вся история потрачена на поиск. Проверить найденное нечем: OOS не существует».
- `wf_profit_loss` — «Оптимум сместился к редким большим сделкам. "Только прибыль" выбирает лотерею; риск-скорректированная функция — рабочий дефолт».
- `wf_overlap` — «OOS двух окон пересекаются: одну и ту же проверку ты считаешь дважды».
- `wf_short_oos` — «На 3 месяцах OOS ~20–40 сделок: доверительный интервал широк. Смотри направление, а не десятые доли PF».

### 2.11. Визуальные требования

- Три теплокарты одного масштаба цвета (общий min/max по трём окнам), чтобы «яркое» окно не выглядело лучше только из-за автошкалы.
- Плоскость параметров: оси подписаны по-русски («порог RSI для входа», «период быстрой EMA»); точки окон — цвет + номер; облако разброса — полупрозрачная заливка; пунктирная рамка «зелёная зона» размером 4 × 6 вокруг центроида (видно, попадают ли точки).
- Склеенная OOS-кривая — сплошная линия с вертикальными разделителями на границах окон; IS-кривые — тонкие полупрозрачные над ней, чтобы контраст «обещание/факт» читался без слов.
- Вердикт — цвет + значок + текст; для дальтоников значки разные.

### 2.12. Телеметрия

`ft16b_guess {choice}` · `ft16b_run {mode, loss, preset, P[], oos_pf[], wf_eff, verdict, ms}` · `ft16b_all_period_click` · `ft16b_window_conflict {type}` · `ft16b_custom_windows_valid` · `ft16b_classify {case, correct}` · `ft16b_complete`.

---

## 3. Общие нефункциональные требования

1. **Детерминизм и тесты** ❗: снимок результатов для фиксированного зерна хранится в тестах (golden files); любое изменение симулятора, меняющее golden — осознанный коммит с пояснением. Юнит-тесты на: PF при нулевых убытках, фильтр минимума сделок, конфликты окон E7 (все 4 типа), вердикты (по 3 синтетических кейса на каждый).
2. **Производительность**: см. 0.3.4; UI не блокируется, прогресс виден в течение первых 300 мс.
3. **Мобайл**: вертикальный стек; линейка E7 — с горизонтальным скроллом и «ручками» не меньше 40 px; scatter на 4096 точек — canvas с dpr.
4. **Доступность**: все ползунки управляются с клавиатуры; вердикты продублированы текстом; режим «меньше анимаций».
5. **Локализация**: интерфейс только на русском; английские идентификаторы (`rsi_buy`, `ema_period`, `SharpeHyperOptLoss`, `--spaces buy`) показываются моноширинным и кликабельны через «Ткни в непонятное».
6. **Честность чисел**: нигде не показывать проценты прибыли как «доход»; подписи — «результат на прошлом», «результат на новых данных».
7. **Сохранение состояния**: последний прогон и догадки — в локальном хранилище прогресса; повторный вход восстанавливает шаг.

---

## 4. Критерии приёмки (чек-лист для ревью)

**A «4096 монеток»**
- [ ] Догадка обязательна до первого прогона и сравнивается с фактом
- [ ] На фиксированном зерне в режиме «шум»: лучший IS-PF ≥ 1,4, OOS победителя 0,8–1,2, r < 0,15
- [ ] Печать OOS срывается анимированно; счётчик открытий растёт; второе открытие даёт предупреждение
- [ ] Scatter IS/OOS на 4096 точек с диагональю и r
- [ ] Таблица N = 64/512/4096 с √(2 ln N) и фактическим лучшим PF
- [ ] Режим «край»: OOS/IS в 50–80 %, зелёный вердикт с текстом про 50–70 %
- [ ] Все английские токены кликабельны и переведены
- [ ] Квиз 3 вопроса; флаг завершения при ≥ 2/3

**B «Walk-forward»**
- [ ] Дефолтные окна совпадают с датами из урока
- [ ] Четыре типа конфликтов окон подсвечиваются и блокируют прогон
- [ ] Прогон окно за окном: теплокарта → звёздочка → точка на плоскости → OOS-сегмент
- [ ] Таблица окон повторяет шаблон из урока (P_rsi, P_ema, IS-PF, OOS-PF, OOS-trades, вердикт)
- [ ] Три режима данных дают три разных вердикта на фиксированном зерне (зелёный / красный / оранжевый)
- [ ] Кнопка «на всём периоде» убирает OOS и даёт красную плашку
- [ ] Смена loss на «только прибыль» заметно меняет оптимум и разброс
- [ ] Классификация 3 таблиц вслепую; флаг завершения при ≥ 2/3 и ≥ 1 валидной своей конфигурации

---

## 5. Открытые вопросы к продукту (решить до старта разработки)

1. Использовать ли в A отчёт победителя через E8 (зависимость от готовности E8) или временную локальную таблицу с теми же зонами FT-09?
2. Нужен ли в B режим «утечка» (bfill в признаке → OOS > IS) как четвёртый тип данных — это прямой мост к FT-11, но удлиняет сценарий.
3. Пороги вердиктов B (spread ≤ 4/6, OOS-PF > 1,1) — фиксируем после калибровки на 200 сидах или отдаём методологу как редактируемый конфиг сразу?
4. Записывать ли результаты интерактивов в общий «Журнал экспериментов» E5 в первой версии или ограничиться внутренним журналом прогонов B.

------------------------
# Детальные спеки для реализации: FT-14 «Причины выхода как диагноз» и FT-15 «Форензика одной сделки»

---

## 0. Общие соглашения для обоих интерактивов (обязательны)

| Пункт | Требование |
|---|---|
| Стек | Изолированный компонент с чистым состоянием (React/Vue/Web Component — по стеку приложения). Никаких сетевых запросов: все данные — из фикстур в репозитории. |
| Данные | Фикстуры — статические JSON в `/fixtures/ft14/` и `/fixtures/ft15/`, сгенерированные один раз скриптом с фиксированным seed (mulberry32) и закоммиченные. Скрипт генерации тоже коммитится (`scripts/gen_ft14.py`, `scripts/gen_ft15.py`) и содержит `assert` на все целевые агрегаты, перечисленные ниже. Числа в текстах обратной связи **читаются из фикстуры**, не хардкодятся. |
| Пометка данных | Везде, где показаны свечи/сделки: бейдж «Учебные данные (синтетика, стилизована под SOL/USDT 1h)». Не выдавать за реальную историю. |
| Язык | Только русский. Любой английский токен (`roi`, `stop_loss`, `exit_signal`, `enter_long`, `minimal_roi`, `plot-dataframe`, `open`, `close`, `shift(1)`) рендерится через общий сервис языкового слоя («Ткни в непонятное»): клик → карточка «что это — где объяснено (урок) — где прожито (интерактив)». Переключатель «англ / рус / оба» — общий компонент E8. |
| Формат чисел | Русская локаль: `1 000 USDT`, `−10,8 %`, `+38 %`. Знак минус — типографский «−». |
| Персонаж | Алексей, dry-run кошелёк 1 000 USDT, `max_open_trades: 3`, `stake_amount: unlimited` → ~330 USDT на сделку (из FT-04). Все USDT-суммы считаются от stake 330. |
| Персистентность | Прогресс — в общем хранилище прогресса приложения (ключи `ft14.state`, `ft15.state`). Записи журнала — через API движка E5 (`journal.append(entry)`). |
| Телеметрия | Через общую шину событий: `interactive.event({id, name, payload, ts})`. Перечень событий — в каждом разделе. |
| Доступность | Все клики по графику дублируются клавиатурой (стрелки ← → по свечам, Enter — выбрать). Донат-диаграмма имеет текстовый эквивалент (таблица). Цвета не единственный носитель смысла (иконки + подписи). Контраст ≥ 4,5:1. |
| Адаптив | Desktop — две колонки; мобильный (< 768 px) — одна колонка, график сверху, карточка снизу, липкая панель шагов. |
| Анти-требования | Не автозаполнять поля, которые ученик должен прочитать сам. Не считать бэктест в браузере — только предрасчитанные таблицы. Не показывать «правильный ответ» раньше 3-й неудачной попытки. Не использовать конфетти/анимации «победы» при подгонке (в FT-15 зелёный отчёт после ловушки должен выглядеть буднично-убедительно, а не празднично — иначе ученик запомнит подгонку как награду). |

---

# Часть 1. FT-14 · «Причины выхода как диагноз»

## 1.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft14_exit_reason_diagnosis` |
| Урок | FT-14 «Метрики стратегии и разбор причин выхода» |
| Тип | ВИЗ + мини-ИГР (один вопрос-ловушка на входе) |
| Движок | E8 «Двуязычный отчёт» (таблица Exit Reason Stats с русскими именами, формулами и зонами) |
| Ломает заблуждение | «Причины выхода — второстепенно; смотрю на итоговую прибыль» |
| Место в уроке | Сразу после существующего интерактива «Прочитай вывод backtesting», в блоке «Протокол чтения отчёта», пункт 3 «Причины выходов: баланс ROI / стоп / сигнал» |
| Длительность | 6–8 минут |
| Опора на текст урока | «Причины выхода дают диагноз: система, где 90 % сделок закрываются стопом, а 10 % тянут результат, — это “хвостовая” стратегия»; «Ловушка первой строки отчёта: Total profit. Мошеннический бэктест и честный могут иметь одинаковую первую строку»; формула ожидаемой серии убытков `ln(N)/ln(1/q)` (урок 5.5); зоны метрик из таблицы FT-09 |

## 1.2. Педагогическая цель и критерий освоения

**Цель:** ученик видит, что две стратегии с *идентичными* Total profit и Profit Factor имеют противоположные риск-профили, и что различие обнаруживается только в распределении причин выхода. После интерактива ученик умеет по трём долям (ROI / стоп / сигнал) поставить один из диагнозов и назвать, что проверять дальше.

**Критерий освоения (гейт на «выполнено»):**
1. Ответил на вопрос-ловушку шага 1 (любой ответ — фиксируется, гейта нет).
2. Открыл все три профиля (A, B, C).
3. Прошёл проверку шага 4 «Поставь диагноз» — 3 из 3 карточек правильно (до 2 попыток на карточку).

## 1.3. Сценарий прохождения (5 шагов, линейно с возможностью вернуться)

### Шаг 1. «Одинаковая первая строка» (ловушка, 30 сек)
Экран показывает **только первые строки двух отчётов** (E8-формат, свёрнуты до 3 строк):

```
Стратегия B                          Стратегия C
Total profit %   +38,0 %             Total profit %   +38,0 %
Total trades     120                 Total trades     120
Profit factor    1,66                Profit factor    1,66
```

Вопрос: «Алексей выбирает, что запустить в dry-run на 8 недель. Какую?»
Варианты: **B** / **C** / **Они одинаковые — без разницы** / **Данных недостаточно**.

Обратная связь (не блокирует):
- B или C или «одинаковые»: «Ты выбрал по первой строке. Сейчас увидишь, что в этих строках не видно».
- «Данных недостаточно»: «Верно. Три строки совпадают, а стратегии противоположны. Смотри, чего не хватает».

Телеметрия: `ft14.step1.answer {choice}`.

### Шаг 2. «Разворачиваем отчёт» (главный экран, 2–3 мин)
Раскрывается полный вид (макет ниже). Появляется третий профиль **A** («Всё стопом»). Ученик переключается между A / B / C, донат и таблица меняются с анимацией перетекания долей (300 мс).

Подсказка-маяк (один раз): «Нажми на любой сектор — увидишь сделки этого типа».

### Шаг 3. «Два теста, которых нет в отчёте» (1–2 мин)
Под графиком две кнопки-переключателя, действующие на **все три профиля одновременно** (сравнительная таблица 3 колонки):

- **«Убрать 5 лучших сделок»** → пересчёт Total profit по каждому профилю. Ожидаемый вывод: C остаётся в плюсе, B уходит в минус, A глубже в минус.
- **«Показать ожидаемую серию убытков»** → строка с формулой из 5.5: `ln(120) / ln(1/q)` и результатом для каждого профиля.

Подпись под тестами: «Ни одного из этих чисел нет в стандартном отчёте бэктеста. Их считает человек — по распределению причин выхода».

### Шаг 4. «Поставь диагноз» (проверка, 1–2 мин)
Три карточки (порядок перемешан), каждая — донат без подписи профиля + четыре числа (Total profit, WR, доля стопов, доля сигнала). Ученик перетаскивает/выбирает диагноз из трёх: «Стоп делает всю работу» / «Хвостовая» / «Сбалансированная». До 2 попыток на карточку. После 2-й ошибки — раскрывается правильный ответ с объяснением (карточка помечается «с подсказкой»).

### Шаг 5. «Свободный режим» (необязательно, конструктор)
Ползунки долей и средних; живой диагноз по правилам (см. 1.6). Кнопка «Записать вывод в журнал» (E5, тип `insight`, урок FT-14).

## 1.4. Макет главного экрана (шаг 2)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [A Всё стопом] [B Хвостовая] [C Сбалансированная]   [англ|рус|оба] │
├───────────────────────────┬─────────────────────────────────────────┤
│  ДОНАТ (причины выхода)   │  ДИАГНОЗ                                 │
│   ROI ●  стоп ●  сигнал ● │  ▸ Что это значит                        │
│   центр: 120 сделок       │  ▸ Риск-профиль                          │
│   +38,0 % · PF 1,66       │  ▸ Психология оператора                  │
│                           │  ▸ Что проверить дальше (ссылки)         │
├───────────────────────────┴─────────────────────────────────────────┤
│  E8-ТАБЛИЦА  «EXIT REASON STATS» (кликабельные заголовки → формула, │
│  зона, русское имя)                                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Мини-кривая капитала (equity) выбранного профиля · подсветка       │
│  самой длинной серии убытков красным отрезком                       │
├─────────────────────────────────────────────────────────────────────┤
│  [Убрать 5 лучших сделок]   [Показать ожидаемую серию убытков]      │
│  Сравнительная таблица A | B | C  (появляется после нажатия)        │
└─────────────────────────────────────────────────────────────────────┘
```

**Донат:** три сектора — ROI (зелёный, иконка «цель»), стоп-лосс (красный, иконка «щит»), сигнал выхода (синий, иконка «стрелка выхода»). Наведение → тултип: `Стоп-лосс (stop_loss) · 84 выхода (70 %) · средняя −2,0 % · сумма −554 USDT`. Клик по сектору → под таблицей раскрывается список сделок этого типа (первые 10 + «показать все»): № · пара · длительность · результат %.

**E8-таблица** (точное соответствие структуре вывода Freqtrade, чтобы ученик узнавал её потом в терминале):

```
=========================== EXIT REASON STATS ===========================
| Причина выхода   | Выходов | Побед / Ничьих / Пораж. | Ср. прибыль % | Сумм. прибыль USDT | Сумм. прибыль % |
| roi              |      46 |   46 /  0 /  0  (100 %) |        +4,4 % |            +668    |        +66,8 %  |
| exit_signal      |      34 |   26 /  0 /  8   (76 %) |        +2,3 % |            +258    |        +25,8 %  |
| stop_loss        |      40 |    0 /  0 / 40    (0 %) |        −4,1 % |            −541    |        −54,1 %  |
| ИТОГО            |     120 |   72 /  0 / 48   (60 %) |        +1,0 % |            +385    |        +38,5 %  |
```

В режиме «рус.» первая колонка: «Достигнут ROI», «Сигнал выхода», «Стоп-лосс». В режиме «оба»: `roi · Достигнут ROI`. Клик по заголовку столбца → карточка E8: русское имя, формула, зона (тревожная / рабочая) из таблицы FT-09, ссылка на урок.

Под таблицей — серая строка глоссария: «В реальном отчёте встречаются также `trailing_stop_loss` (стоп, который подтягивался за ценой — урок FT-17), `force_exit` (закрыл руками — FT-19), `emergency_exit`. В учебных профилях их нет».

## 1.5. Данные: фикстуры трёх профилей

Файл `fixtures/ft14/profiles.json`. Каждый профиль — массив из 120 сделок:

```json
{
  "meta": {"wallet_usdt": 1000, "stake_usdt": 330, "period": "12 учебных месяцев", "seed": 1414},
  "profiles": {
    "A": {"title": "Всё стопом", "trades": [ {"id": 1, "pair": "SOL/USDT", "month": 3,
            "exit_reason": "stop_loss", "profit_pct": -1.2, "duration_min": 120}, ... ]},
    "B": {...}, "C": {...}
  }
}
```

**Целевые агрегаты (генератор обязан `assert` их с допусками):**

| Параметр | A «Всё стопом» | B «Хвостовая» | C «Сбалансированная» |
|---|---|---|---|
| Сделок | 120 | 120 | 120 |
| стоп-лосс: доля / средняя | 94 (78 %) / −1,2 % | 84 (70 %) / −2,0 % | 40 (33 %) / −4,1 % |
| ROI: доля / средняя | 16 (13 %) / +3,0 % | 12 (10 %) / +2,0 % | 46 (38 %) / +4,4 % |
| сигнал выхода: доля / состав | 10 (8 %): 7 × +1,8 %, 3 × −0,6 % | 24 (20 %): 5 × +26 %, 15 × +8,8 %, 4 × −1,0 % | 34 (28 %): 26 × +3,5 %, 8 × −1,6 % |
| **Total profit** | **≈ −18 %** (±1 п.п.) | **+38,0 %** (±0,3 п.п.) | **+38,0 %** (±0,3 п.п.) — генератор подстраивает средние так, чтобы B и C совпали до десятых |
| **Profit factor** | ≈ 0,53 | **1,66** (±0,03) | **1,66** (±0,03) |
| Win rate | 19 % | 27 % | 60 % |
| Без 5 лучших сделок | ≈ −27 % | **≈ −5 %** (обязательно < 0) | **≈ +28 %** (обязательно > +20 %) |
| Max DD (relative), задаётся порядком сделок | 20–28 % | 18–25 % | 7–12 % |
| Лучший месяц даёт от прибыли | н/п | > 50 % | < 25 % |
| Средняя длительность стоп / ROI / сигнал | 2 ч / 6 ч / 30 ч | 3 ч / 5 ч / 70 ч | 9 ч / 7 ч / 20 ч |

Требования к порядку сделок (для кривой капитала и DD): в B убытки кластеризованы (генератор должен обеспечить фактическую максимальную серию убытков ≥ 12), в C — перемешаны (фактическая серия ≤ 7), в A — ≥ 15. Фактическая серия хранится в `profiles[X].stats.max_loss_streak` и подсвечивается на кривой.

Если ключевые совпадения (Total profit и PF у B и C) не сходятся с допуском — **сборка падает**. Это принципиально: весь интерактив держится на равенстве первых строк.

## 1.6. Логика и формулы

```
total_profit_pct = Σ(profit_pct_i) × stake / wallet
win_rate         = wins / N
profit_factor    = Σ(positive) / |Σ(negative)|
expected_streak  = ln(N) / ln(1 / q),  q = 1 − win_rate      // урок 5.5, округлять до целого вверх
without_top5     = (Σ(profit_pct_i) − Σ(top 5 profit_pct)) × stake / wallet
best_month_share = max(month_profit) / Σ(positive month_profit)
```

Ожидаемые серии по формуле (показывать в шаге 3 с подстановкой): A: `ln 120 / ln(1/0,81) ≈ 23`; B: `≈ 15`; C: `≈ 5`.

**Движок диагноза** (используется и для профилей, и для свободного режима; правила проверяются сверху вниз, срабатывает первое подходящее; флаги накапливаются):

| Условие | Флаг | Диагноз |
|---|---|---|
| `share_stop ≥ 0,65 и total ≤ 0` | `STOP_DOMINATES` | «Стоп делает всю работу» |
| `share_roi ≥ 0,90 и share_stop ≤ 0,03` | `TOO_SMOOTH` | «Подозрительно ровно» (см. П24 — только в свободном режиме) |
| `share_signal = 0` | `EXIT_SIGNAL_DEAD` | добавочная строка: «Сигнал выхода не сработал ни разу — проверь `populate_exit_trend`» |
| `total > 0 и (win_rate < 0,35 или without_top5 < 0)` | `TAIL` | «Хвостовая» |
| `share_roi ≤ 0,10 и minimal_roi задан` | `ROI_UNREACHABLE` | добавочная строка: «ROI-лестница почти недостижима — цель выше типичного хода или стоп срабатывает раньше» |
| иначе при `total > 0` | `BALANCED` | «Сбалансированная» |
| иначе | `NEGATIVE_MIXED` | «Убыточна при рабочем распределении выходов — проблема в сигнале входа, не в выходах» |

## 1.7. Тексты диагнозов (RU, показываются справа)

**A · «Стоп делает всю работу»**
- *Что это значит.* 78 % сделок закрыл стоп-лосс на −1,2 %. Стоп срабатывает раньше, чем успевает сработать хоть что-то ещё: ROI дотянулись 13 % сделок, сигнал выхода — 8 %. У стратегии фактически один механизм выхода — защитный.
- *Риск-профиль.* Стоп стоит **внутри обычного часового шума** цены: типичный ход свечи 1h у альткоина 1,5–2 %, а стоп — 1,2 %. Это не защита, а комиссия за вход.
- *Психология оператора.* При винрейте 19 % ожидаемая серия убытков на 120 сделках — около **23 подряд**. Ни один устав (5.6) такое не выдержит.
- *Что проверить дальше.* (1) Сравни стоп с волатильностью пары (FT-17). (2) Проверь, достижима ли ROI-лестница: какой средний ход цены за среднюю длительность сделки? (3) Форензика трёх худших стопов — сработали на движении или на шуме? (FT-15).

**B · «Хвостовая»**
- *Что это значит.* Первая строка та же, что у C: +38 %, PF 1,66. Но 70 % сделок закрыл стоп, а весь результат сделали 20 сделок с выходом по сигналу — из них **пять** принесли больше, чем вся стратегия целиком.
- *Риск-профиль.* Убери 5 лучших сделок — итог **−5 %**. Стратегия зависит от редких длинных трендов; лучший месяц дал больше половины прибыли. Такие системы честные, но хрупкие к периоду: год без трендов — год убытков.
- *Психология оператора.* Винрейт 27 % → ожидаемая серия ≈ **15 стопов подряд**. По уроку 5.5 это надо увидеть и принять ДО запуска: −15 стопов по −2 % на stake 330 — это −99 USDT, −10 % кошелька, при полностью исправной стратегии.
- *Что проверить дальше.* (1) Поведение по месяцам: сколько месяцев в минусе? (2) Проскальзывание на выходах по сигналу — хвост забирается лимиткой или маркетом? (FT-13). (3) Готов ли ты сам смотреть на 15 красных подряд (П20, П5).

**C · «Сбалансированная»**
- *Что это значит.* Три механизма выхода работают все: 38 % ROI, 33 % стоп, 28 % сигнал. Ни один не тянет результат в одиночку.
- *Риск-профиль.* Без 5 лучших сделок итог **+28 %** — результат распределён. Лучший месяц дал меньше четверти прибыли. Просадка 7–12 % — рабочая зона FT-09.
- *Психология оператора.* Винрейт 60 % → ожидаемая серия ≈ 5 стопов подряд. Это переживаемо без устава-героя.
- *Что проверить дальше.* (1) Не подогнана ли ROI-лестница: если её нашёл hyperopt по `roi`-пространству — красный флаг (FT-16). (2) Робастность ±20 % по стопу и ROI (1.12). (3) Устойчивость по парам — не две ли пары дают всё?

**Общая плашка под всеми диагнозами:** «Total profit, число сделок и PF у B и C совпадают до десятых. Различие видно только здесь — в причинах выхода и в двух тестах, которых нет в отчёте».

## 1.8. Шаг 3 — сравнительная таблица (появляется по кнопкам)

| | A | B | C |
|---|---|---|---|
| Total profit | −18 % | +38 % | +38 % |
| Без 5 лучших сделок | −27 % | **−5 %** | **+28 %** |
| Win rate | 19 % | 27 % | 60 % |
| Ожидаемая серия убытков (`ln 120 / ln(1/q)`) | 23 | 15 | 5 |
| Фактическая самая длинная серия (из данных) | из фикстуры | из фикстуры | из фикстуры |
| Лучший месяц даёт | — | > 50 % | < 25 % |

Каждое число кликабельно → всплывает расчёт с подстановкой.

## 1.9. Шаг 5 — свободный режим (конструктор)

Ползунки: доля стопов (0–100 %), доля ROI (0–100 %) — доля сигнала вычисляется как остаток; средняя стопа (−0,5…−12 %), средняя ROI (+0,5…+12 %), средняя сигнала (−5…+30 %); N сделок (20–500). Вывод: Total profit, WR (для сигнала: считаем 80 % положительными, если средняя > 0 — упрощение, показано подписью), PF, ожидаемая серия, диагноз по правилам 1.6. При `N < 30` — жёлтая плашка: «Меньше 30 сделок — любые выводы преждевременны (FT-09)». Кнопка «Записать вывод в журнал» → E5 `{lesson:'FT-14', type:'insight', text, params}`.

## 1.10. Интеграция с E8

Интерфейс: `E8Report.render({rows, columns, lang, zones})`, где `columns` — массив `{key, en, ru, formula_ru, zone_fn}`. Зоны для строк Exit Reason: доля стопов > 65 % → тревожная; ROI < 10 % при заданном `minimal_roi` → тревожная; сигнал = 0 → тревожная; иначе рабочая. Зона подсвечивает строку фоном и иконкой (не только цветом).

## 1.11. Телеметрия

`ft14.step1.answer {choice}`, `ft14.profile.open {profile}`, `ft14.sector.click {profile, reason}`, `ft14.test.top5`, `ft14.test.streak`, `ft14.diagnosis.attempt {card, choice, correct, attempt_no}`, `ft14.free.change {params}` (троттлинг 2 с), `ft14.journal.write`, `ft14.complete {duration_s, hints_used}`.

## 1.12. Критерии приёмки (DoD)

- [ ] Генератор фикстур падает, если Total profit B и C различаются > 0,3 п.п. или PF > 0,03; `without_top5(B) < 0`, `without_top5(C) > 20 %`.
- [ ] Первый экран показывает только 3 строки для B и C, профиль A скрыт до шага 2.
- [ ] Переключение профилей анимирует донат и синхронно перерисовывает E8-таблицу, кривую капитала и диагноз.
- [ ] Переключатель «англ/рус/оба» меняет первую колонку таблицы и имена в тултипах доната; все английские токены кликабельны и открывают карточку языкового слоя.
- [ ] Обе кнопки шага 3 строят сравнительную таблицу для всех трёх профилей; клик по числу раскрывает формулу с подстановкой.
- [ ] Шаг 4: перемешанный порядок карточек, ≤ 2 попытки, раскрытие ответа с объяснением после второй ошибки.
- [ ] Свободный режим: сумма долей всегда 100 %; диагноз меняется по правилам 1.6; при N < 30 показана плашка.
- [ ] Клавиатурная навигация по профилям, секторам и карточкам; таблица — текстовый эквивалент доната для скринридера.
- [ ] Мобильная раскладка в одну колонку без горизонтального скролла таблицы (таблица переключается в карточный вид).
- [ ] Все тексты — из `i18n/ru/ft14.json`, числа подставляются из фикстуры.

Тест-кейсы: (1) выбрать «B» в шаге 1 → сообщение про первую строку; (2) открыть только A и B, попытаться перейти к шагу 4 → блок «открой все профили»; (3) шаг 4, две ошибки подряд на карточке B → раскрыт ответ «Хвостовая», карточка помечена; (4) свободный режим: доля стопов 95 %, средняя −1 %, N 100 → диагноз «Стоп делает всю работу», серия ≈ 26.

---

# Часть 2. FT-15 · «Форензика одной сделки»

## 2.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft15_trade_forensics` |
| Урок | FT-15 «Графики и расследование отдельных сделок» |
| Тип | ТРН (тренажёр заполнения карточки) + встроенная ловушка ИГР |
| Движок | E3 «Плёнка бэктеста» (свечи + панели индикаторов + маркеры сделок + затемнение будущего + пошаговое воспроизведение); E5 «Журнал» (строка на каждую сделку); языковой слой |
| Ломает заблуждение | «Стратегию можно дорабатывать по картинке: вижу плохой вход — добавлю условие» |
| Место в уроке | После блока «Глубже» (визуальная подгонка), вместо/рядом с практикой «Выбери три лучшие и три худшие сделки» |
| Длительность | 12–15 минут |
| Стратегия-носитель | `TutorialEmaRsi` из FT-05: 1h; вход `ema16 > ema200 & rsi < 35 & rsi.shift(1) >= 35 & volume > 0`; выход по сигналу `ema16 < ema200`; `stoploss = −0,10`; `minimal_roi = {0: 0,06, 240: 0,02}`; `startup_candle_count = 200` |
| Опора на текст урока | Протокол форензики (5 пунктов); «график — рентген, а не пластическая операция»; «не ищи глазами “где бы ещё войти”»; связь с FT-06 (сигнал ≠ исполнение), FT-13 (проскальзывание), FT-16 (подгонка), 1.10/1.12 |

## 2.2. Педагогическая цель и критерий освоения

**Цель.** Ученик руками восстанавливает цепочку «сигнальная свеча → значения индикаторов → сработавшее условие → исполнение → причина выхода» для 6 сделок и обнаруживает главное: **условие входа было одинаково истинным и в трёх лучших, и в трёх худших сделках**. Отличие — в том, что случилось *после* входа, чего в момент решения знать было нельзя. Отсюда — почему условие «по картинке» убирает худшие сделки на истории и не работает на новых данных.

**Критерий освоения:**
1. Все 6 карточек заполнены и проверены (поля с ≤ 3 попытками; после 3-й — раскрытие с объяснением и пометка «с подсказкой»).
2. Сводка «6 сделок — одно условие» просмотрена.
3. Ловушка пройдена до конца (применил условие → увидел зелёный отчёт → увидел проверку на невиданных данных). Если ученик не нажал ловушку сам — она предлагается как обязательный финальный шаг.
4. Записано минимум 6 строк в журнал (по одной на сделку) + одна итоговая.

## 2.3. Сценарий

### Шаг 0. Вводная (15 сек)
«Алексей прогнал `TutorialEmaRsi` на учебном ряде SOL/USDT 1h за 4 месяца: 22 сделки, +11,6 %. Перед тобой три лучшие и три худшие. Твоя задача — не улучшить стратегию, а **понять, почему сработало то, что сработало**». Кнопка «Начать с лучшей сделки».

В шапке с самого начала видна кнопка с мягким свечением: **«✨ Сделать красивее: добавить условие»**. Она активна всегда (ловушка добровольна), но при нажатии до завершения ≥ 3 карточек показывает предупреждение «Сначала разбери хотя бы три сделки — иначе ты будешь править то, чего не понял» и возвращает; нажатие фиксируется в телеметрии (`ft15.trap.early_click`).

### Шаг 1–6. Карточки сделок
Порядок: T1, T2, T3 (лучшие), T4, T5, T6 (худшие). Вкладки сверху: зелёные/красные бейджи с результатом. Для каждой сделки E3 автоматически перематывает график к окну `[entry_signal_idx − 60, exit_idx + 12]` с маркерами.

### Шаг 7. Сводка «6 сделок — одно условие»
Таблица 6 строк × поля карточек. Подсвечена колонка «Условие входа»: во всех шести — ✔ все четыре множителя истинны. Текст: «В момент входа лучшие и худшие сделки были **неотличимы**. Всё, что их различает, произошло позже. Любое условие, которое ты сейчас придумаешь “чтобы убрать T4–T6”, придумано с знанием будущего».

### Шаг 8. Ловушка (обязательный финал, если не нажата раньше)
См. 2.7.

### Шаг 9. Честный выход
Две кнопки: «Записать как гипотезу в журнал (проверю по протоколу FT-16)» и «Завершить». Итоговая запись в журнал.

## 2.4. Макет экрана карточки

```
┌──────────────────────────────────────────────────────────────────────┐
│ [T1 +6,0 %] [T2 +2,0 %] [T3 +4,1 %] | [T4 −10,8 %] [T5 −10,0 %] [T6 −6,3 %]   ✨ Сделать красивее │
├─────────────────────────────────────────────┬────────────────────────┤
│  E3: свечи 1h + EMA16 (оранж.) + EMA200     │  КАРТОЧКА ФОРЕНЗИКИ    │
│  (синяя); маркеры ▲ вход ✖ выход;           │  1. Сигнальная свеча   │
│  горизонтали: стоп −10 %, ROI +6 %, +2 %    │     [клик по графику]  │
│  панель RSI(14) с чертой 35                 │  2. Свеча исполнения   │
│  ─ управление: ◀ шаг ▶ | ⏸ | «к сигналу»    │     [клик по графику]  │
│    «к выходу» | ☐ «Что видел бот в этот     │  3. Индикаторы на      │
│    момент» (затемнить будущее)              │     сигнальной свече   │
│  ─ тултип свечи: дата · O/H/L/C · EMA16 ·   │     RSI(t) [__,_]      │
│    EMA200 · RSI · RSI(t−1) · объём          │     RSI(t−1) [__,_]    │
│                                             │     EMA16 vs EMA200 ○○ │
│                                             │  4. Сработавшее условие│
│                                             │     ☐☐☐☐ (4 множителя) │
│                                             │  5. Причина выхода ○○○ │
│                                             │     + ступень ROI      │
│                                             │  6. Цена сигнала vs    │
│                                             │     исполнения (авто)  │
│                                             │  7. Проблема реализации│
│                                             │     ○○○○               │
│                                             │  8. Строка в журнал    │
│                                             │     [________________] │
│                                             │  [Проверить карточку]  │
└─────────────────────────────────────────────┴────────────────────────┘
```

Под графиком — свёрнутый блок «Код условия входа» (из FT-05) с языковым слоем: каждая строка имеет русскую подпись справа; наведение на `rsi.shift(1) >= 35` подсвечивает на графике свечу t−1.

## 2.5. Поля карточки: ввод, проверка, обратная связь

| # | Поле | Ввод | Проверка | Обратная связь на ошибку |
|---|---|---|---|---|
| 1 | Сигнальная свеча | Клик по свече (режим «выбор свечи», курсор-перекрестие) | `idx == entry_signal_idx` | Если `idx == entry_signal_idx + 1`: «Это свеча **исполнения**. Бот принял решение по предыдущей закрытой свече — сигнал считается по `close` свечи t, а сделка открывается по `open` свечи t+1 (FT-06)». Иначе: «На этой свече условие входа не выполнялось: RSI = …, RSI(t−1) = … (нужно пересечение 35 сверху вниз)». |
| 2 | Свеча исполнения | Клик | `idx == entry_signal_idx + 1` | «Исполнение всегда на следующей свече после сигнала — по её цене открытия». |
| 3 | RSI(t), RSI(t−1) | Два числовых поля (ученик читает из тултипа) | допуск ±0,5 | «Прочитай значение в подсказке над сигнальной свечой — включи режим “Что видел бот”, чтобы будущие свечи не мешали». EMA16 vs EMA200: радио «выше / ниже», проверка по фикстуре. |
| 4 | Сработавшее условие | 4 чекбокса: `ema16 > ema200`, `rsi < 35`, `rsi(t−1) ≥ 35`, `volume > 0` — «отметь, какие были истинны» | все 4 отмечены | Если отмечены не все: «Вход возможен только когда истинны **все четыре** — они соединены `&`. Значит, на сигнальной свече все четыре были истинны — иначе сделки бы не было». Ключевое сообщение для T4–T6: «Обрати внимание: у худшей сделки условие входа было выполнено **так же полно**, как у лучшей». |
| 5 | Причина выхода | Радио: «ROI (ступень 0 → +6 %)», «ROI (ступень 240 мин → +2 %)», «Стоп-лосс −10 %», «Сигнал выхода (EMA16 < EMA200)» | по фикстуре `exit_reason` + `roi_step` | Для ROI: «Смотри длительность: ступень 240 включается после 4 часов в сделке, цель падает до +2 %». Для сигнала: «Найди свечу, где оранжевая EMA16 опустилась под синюю EMA200». |
| 6 | Цена сигнала vs исполнения | Авто после заполнения полей 1–2: `close(t)` → `open(t+1)`, разница в % с знаком | — | Подпись: «Это разрыв между “решил” и “купил” — ещё до комиссии и проскальзывания (FT-13)». |
| 7 | Проблема реализации | Радио: «Нет проблемы», «Вход хуже сигнальной цены на > 0,3 %», «Стоп исполнен глубже уровня (гэп через −10 %)», «Убыточная позиция держалась долго — сигнал выхода пришёл поздно» | по `issue_tag` | Объяснение из фикстуры (`issue_explain`). |
| 8 | Строка в журнал | Свободный текст ≥ 20 символов | длина | Плейсхолдер: «T4: сигнал 04:00, RSI 27,9→… вход по правилам; стоп в первые 3 часа на новости; исполнение хуже уровня на 0,8 %». Сохраняется в E5: `{lesson:'FT-15', type:'experiment', trade_id, text}`. |

«Проверить карточку» проверяет все поля разом, подсвечивает ошибочные; попытки считаются по полю. Поля 6 и 8 не имеют попыток.

## 2.6. Данные: фикстура `fixtures/ft15/`

**`series.json`** — синтетический ряд 1h, 5 800 свечей: `is` (in-sample, ~2 900 свечей, «март–июнь») и `oos` (~2 900, «июль–сентябрь»), с предрасчитанными `ema16`, `ema200`, `rsi14`. Генератор: геометрическое блуждание с 3–4 трендовыми участками и 2 резкими падениями (для гэпа через стоп), волатильность свечи 1,5–2 % — чтобы стоп −10 % срабатывал в разумной доле сделок.

**`trades_is.json`** — 22 сделки in-sample; **`trades_oos.json`** — 14 сделок OOS. Схема сделки:

```json
{"id": "T4", "entry_signal_idx": 1742, "entry_fill_idx": 1743,
 "entry_signal_close": 152.30, "entry_fill_open": 152.95,
 "exit_idx": 1746, "exit_price": 136.42, "exit_reason": "stop_loss",
 "roi_step": null, "profit_pct": -10.8, "duration_min": 180,
 "ind": {"ema16": 151.1, "ema200": 149.8, "rsi_t": 27.9, "rsi_t1": 36.2, "volume_t": 18400},
 "issue_tag": "stop_gap", "issue_explain": "Свеча №1746 открылась ниже уровня стопа: бэктест исполняет стоп по худшей цене свечи, реальный убыток −10,8 % вместо −10 %.",
 "entry_hour_utc": 4}
```

**Шесть выбранных сделок (генератор обязан их обеспечить, допуски ±0,3 п.п. по результату):**

| ID | Результат | Причина выхода | Длит. | RSI(t)/RSI(t−1) | issue_tag | Час входа |
|---|---|---|---|---|---|---|
| T1 | +6,0 % | ROI ступень 0 | 9 ч | 33,1 / 36,4 | none | 13 |
| T2 | +2,0 % | ROI ступень 240 | 5 ч | 34,2 / 35,6 | `fill_worse` (вход хуже на 0,4 %) | 10 |
| T3 | +4,1 % | сигнал выхода | 38 ч | 31,8 / 37,0 | none | 16 |
| T4 | −10,8 % | стоп-лосс | 3 ч | 27,9 / 36,2 | `stop_gap` | 4 |
| T5 | −10,0 % | стоп-лосс | 27 ч | 29,3 / 35,1 | none | 11 |
| T6 | −6,3 % | сигнал выхода | 51 ч | 31,0 / 38,3 | `late_exit` | 5 |

Инвариант, проверяемый генератором: у всех 22 IS-сделок на `entry_signal_idx` все четыре множителя истинны (иначе это не сделки стратегии).

**`trap.json`** — предрасчитанные результаты фильтров (никакого бэктеста в браузере):

| Фильтр | Формулировка для ученика | Убирает из худших | IS: сделок / Total / PF / WR | OOS: сделок / Total / PF |
|---|---|---|---|---|
| — (база) | без фильтров | — | 22 / +11,6 % / 1,42 / 50 % | 14 / +6,9 % / 1,31 |
| F1 | «RSI на сигнальной свече ≥ 30» | T4, T5 | 19 / +26,9 % / 2,1 / 58 % | 11 / +3,8 % / 1,15 |
| F2 | «Не входить с 02:00 до 07:00 UTC» | T4, T6 | 18 / +25,1 % / 2,0 / 56 % | 9 / −1,4 % / 0,94 |
| F1+F2 | оба | T4, T5, T6 | 17 / +36,8 % / 3,1 / 71 % | 8 / +1,2 % / 1,05 |
| F3 | «EMA200 растёт (выше, чем 24 свечи назад)» | T5, T6 | 16 / +29,0 % / 2,4 / 63 % | 11 / +7,4 % / 1,33 |
| F1+F3, F2+F3, F1+F2+F3 | … | … | предрасчёт | OOS не лучше базы ни в одной комбинации; число сделок ≤ 9 |

Все 8 комбинаций хранятся полностью (для каждой — метрики IS и OOS и список оставшихся сделок). Обязательное свойство фикстуры: **ни одна комбинация не улучшает OOS Total profit больше чем на +0,5 п.п. относительно базы при одновременном сокращении числа сделок ≥ 20 %**; F3 — «не хуже, но не лучше» (специально: правдоподобная гипотеза, которая всё равно требует протокола).

## 2.7. Ловушка «Сделать красивее» — детальный сценарий

1. **Экран выбора.** Заголовок: «Какое условие убрало бы худшие сделки?» Список F1, F2, F3 с чекбоксами. Под каждым — живая подпись «убирает: T4, T5» (из `trap.json`) и превью IS-метрик при текущей комбинации. Кнопка «Применить к стратегии».
2. **Экран «Стало красивее».** Обычный E8-отчёт IS (без анимаций победы): Total profit +36,8 %, PF 3,1, WR 71 %, 17 сделок. Кривая капитала — ровнее. Внизу мелкий счётчик: «Условий, добавленных по картинке: 2». Единственная кнопка: **«Проверить на данных, которых на картинке не было»** (без возможности пропустить).
3. **Экран разоблачения.** Два столбца IS | OOS. OOS: 8 сделок, +1,2 %, PF 1,05 — против базы 14 сделок, +6,9 %, PF 1,31. Текст:
   > «На истории, которую ты видел, фильтр убрал ровно те три сделки, которые ты хотел убрать. На новых данных он убрал 6 из 14 сделок — половину из них прибыльных — и результат стал **хуже базовой версии**. Это не рынок поменялся. Это условие с самого начала описывало три конкретные свечи, а не закономерность (1.10, FT-16 «4096 монеток»)».
   Ниже — три строки: «Почему это подгонка: (1) условие придумано **после** просмотра результата; (2) оно уточняет ровно те сделки, которые не понравились; (3) число сделок упало на 40 % — статистика стала слабее, не сильнее».
4. **Специальный случай F3.** Если выбран только F3: разоблачение мягче — «OOS не ухудшился (+7,4 % против +6,9 %), но и не улучшился, а сделок стало меньше. Гипотеза “фильтр по наклону EMA200” имеет рыночный смысл — поэтому она заслуживает не применения по картинке, а протокола: записать → тест на других парах → ±20 % (1.12) → walk-forward (FT-16)». Кнопка «Записать как гипотезу».
5. **Возврат к честному пути.** Кнопки: «Откатить фильтр» (обязательна; ловушка не оставляет стратегию изменённой) и «Записать как гипотезу в журнал» → E5 `{lesson:'FT-15', type:'hypothesis', text: 'Фильтр F1+F2 ...', status:'to_test'}` с автотекстом-шаблоном гипотезы по М32 (метрика, порог, окно, дата фиксации).

Повторное нажатие ловушки разрешено (можно перебрать все 7 комбинаций); счётчик «условий по картинке» накапливается и показывается в итоговой сводке как «Попыток подгонки: N».

## 2.8. Режим «Что видел бот в этот момент» (E3)

Чекбокс. При включении: всё справа от выбранной свечи затемняется (маска 85 %), маркер выхода и уровни исчезают, панель RSI обрезается по t, тултипы будущих свечей не открываются. При заполнении полей 1–3 режим включается автоматически с подписью «Ты видишь ровно то, что видел бот, — до свечи t включительно». При переходе к полю 5 (причина выхода) режим выключается с анимацией «плёнка проигрывается» (E3 step-play от t+1 до exit_idx, 120 мс/свеча, с остановкой на свече выхода и подсветкой сработавшего уровня).

## 2.9. Интеграция с движками

**E3 (обязательные методы):**
`load({candles, indicators:[{key,panel,color}], levels:[{price,label,kind}], trades})`, `seekTo(idx)`, `setViewport(from,to)`, `setRevealCutoff(idx|null)`, `play(from,to,speed)`, `pause()`, `highlightCandle(idx)`, `highlightTrade(id)`, `onCandleClick(cb)`, `setPickMode(bool)`. Панели: основная (свечи + EMA) и нижняя (RSI с горизонталью 35). Тултип свечи должен включать `RSI(t−1)` (специально для этого тренажёра) — параметр `tooltipExtra: [{label:'RSI(t−1)', fn}]`.

**E5:** `journal.append({lesson, type:'experiment'|'hypothesis'|'insight', trade_id?, text, meta})`; `journal.list({lesson:'FT-15'})` — для итоговой сводки.

**Языковой слой:** токены `enter_long`, `exit_long`, `roi`, `stop_loss`, `exit_signal`, `minimal_roi`, `stoploss`, `ema_fast/ema_slow`, `shift(1)`, `open`, `close`, `volume`, `plot-dataframe`, `timerange` — все со ссылками на FT-05/FT-06/FT-14/FT-17.

## 2.10. Итоговая сводка (шаг 7 + после ловушки)

Таблица 6 строк: сделка · результат · сигнальная свеча · RSI(t)/RSI(t−1) · условие входа (✔✔✔✔) · причина выхода · проблема реализации · попытки. Под ней три вывода (генерируются из данных):
1. «Условие входа: 6 из 6 — все четыре множителя истинны. Картинка не отличает будущий стоп от будущего ROI».
2. «Проблемы реализации найдены в N из 6 сделок (гэп через стоп, вход хуже сигнала, поздний выход) — это **и есть** законная добыча форензики: она про исполнение, не про сигнал».
3. «Попыток подгонки по картинке: K. Гипотез записано в журнал: M».

## 2.11. Телеметрия

`ft15.card.open {trade_id}`, `ft15.field.attempt {trade_id, field, correct, attempt_no}`, `ft15.field.reveal {trade_id, field}`, `ft15.reveal_mode.toggle {on}`, `ft15.journal.write {trade_id}`, `ft15.trap.early_click {cards_done}`, `ft15.trap.apply {filters}`, `ft15.trap.oos_shown {filters, is_total, oos_total}`, `ft15.trap.hypothesis_saved {filters}`, `ft15.trap.revert`, `ft15.complete {duration_s, reveals, trap_attempts}`.

Ключевая метрика курса (из ТЗ-3): доля учеников, чьё первое действие после карточек — нажатие ловушки *без* предварительного просмотра сводки; ожидаем падение от урока к уроку в связке с FT-16.

## 2.12. Edge cases

- Ученик кликает свечу за пределами окна сделки → мягкая подсказка «сделка целиком — в подсвеченном диапазоне; нажми “к сигналу”».
- Клик по свече при включённом затемнении справа → подсвеченная область недоступна для выбора (курсор «запрет»), текст «этой свечи бот ещё не видел».
- Два одновременных открытых поля ввода на мобильном → карточка становится «шторкой» снизу, график сжимается до 40 % высоты.
- Перезагрузка страницы посреди карточки → состояние восстанавливается (заполненные поля, попытки, ловушка).
- Ловушка нажата после завершения всех карточек, но сводка не просмотрена → сводка показывается перед экраном выбора фильтров.

## 2.13. Критерии приёмки (DoD)

- [ ] Генератор фикстур `assert`: у всех IS-сделок на сигнальной свече истинны все четыре условия; шесть выбранных сделок соответствуют таблице 2.6 (результат ±0,3 п.п., причина, issue_tag, час входа); `trap.json` содержит все 8 комбинаций; ни одна не улучшает OOS > +0,5 п.п. при потере ≥ 20 % сделок; F3 даёт OOS в пределах ±1 п.п. от базы.
- [ ] Поле 1 различает «сигнальная» и «свеча исполнения» с отдельными сообщениями; поле 2 принимает только t+1.
- [ ] Поля 3 не автозаполняются; тултип E3 показывает RSI(t−1).
- [ ] Поле 4 для худших сделок показывает сообщение о полном совпадении условия входа.
- [ ] Режим затемнения включается автоматически на полях 1–3 и «проигрывает плёнку» на поле 5.
- [ ] Ловушка недоступна до 3 разобранных карточек (с сообщением и телеметрией), обязательна в финале, не пропускает экран OOS, всегда откатывает фильтр.
- [ ] Экран «Стало красивее» без праздничных анимаций; экран разоблачения содержит сравнение IS|OOS и три причины подгонки; для F3 — мягкий вариант.
- [ ] Каждая карточка пишет строку в E5; итоговая сводка читает журнал и показывает счётчики.
- [ ] Все английские токены в коде и отчётах кликабельны через языковой слой; переключатель «англ/рус/оба» применяется к E8-отчётам ловушки.
- [ ] Клавиатура: выбор свечи стрелками + Enter; фокус-порядок карточки сверху вниз.

**Тест-кейсы:** (1) T4, клик по свече 1743 → сообщение про свечу исполнения, попытка 1 из 3. (2) T1, отметить 3 из 4 чекбоксов → сообщение про `&`. (3) Нажать ловушку после 1 карточки → отказ + событие `trap.early_click`. (4) Выбрать F1+F2 → IS +36,8 %, кнопка только одна → OOS +1,2 % против +6,9 %. (5) Выбрать только F3 → мягкое разоблачение с кнопкой «Записать как гипотезу»; запись в E5 с `type:'hypothesis'`. (6) Перезагрузка на T5 с 2 заполненными полями → поля и счётчик попыток восстановлены.

---

## 3. Связки между двумя интерактивами и с остальным курсом

| Откуда | Куда | Как |
|---|---|---|
| FT-14 диагноз A «Стоп делает всю работу» | FT-15 | ссылка «Форензика трёх худших стопов» открывает FT-15 (если пройден — на сводку) |
| FT-15 поле 7 «Стоп исполнен глубже уровня» | FT-14 таблица E8 | тултип: «в отчёте это одна строка `stop_loss` — глубина гэпа в ней не видна» |
| FT-15 ловушка | FT-16 «4096 монеток» | текст разоблачения ссылается; счётчик «условий по картинке» передаётся в FT-16 как стартовое число «уже потраченных проб» (через прогресс-хранилище `ft15.trap_attempts`) |
| FT-15 гипотеза в журнале | R12 «Правило одного изменения», FT-20 | запись со статусом `to_test` появляется в чек-листе FT-20 как открытый пункт |
| Оба | E5 еженедельная сводка | категории `experiment`/`hypothesis`/`insight` учитываются в «сводке паттернов» |

----------------
# ТЗ на реализацию двух интерактивов: FT-18 и FT-19

Документ для агента-реализатора. Оба интерактива входят в трек Freqtrade Academy и опираются на тексты уроков 217–220, 145 (П1), 149 (П5), 182 (П38), 48 (4.4), 46 (4.2), 44 (3.6). Все числа взяты из текстов уроков — не заменять «более красивыми».

---

## 0. Общие требования к обоим интерактивам

**0.1. Аудитория и язык.** Русскоязычный новичок без английского. Каждый английский токен (`max_open_trades`, `/forceexit`, `stop_loss`, `ExchangeError`) обязан быть кликабельным: клик → всплывающая карточка «что это по-русски + одна фраза-пример». Словарь карточек — общий для приложения (слой «Ткни в непонятное», раздел 6 методологии); если общий словарь ещё не построен, компонент принимает `glossary: Record<token, {ru, example}>` пропом и содержит локальный дефолт для всех токенов, которые сам показывает.

**0.2. Сквозной персонаж.** Алексей, депозит `1000 USDT` (≈100 000 ₽), стратегия `DipBuyerBTCFilter`, таймфрейм 1h, dry-run. Пары: ETH/USDT, SOL/USDT, AVAX/USDT (whitelist из FT-04 + AVAX из урока 3.1).

**0.3. Формат поставки.** Самодостаточный компонент (React/Vue — по стеку приложения), без внешних сетевых вызовов, детерминированный при заданном `seed`. Пропсы: `seed`, `initialState?`, `onEvent(telemetry)`, `onComplete(result)`, `engines?: {journal?: E5Api, ritual?: E4Api, terminal?: E1Api}`. Если движок не передан — используется локальный фолбэк (localStorage), поведение не меняется.

**0.4. Принцип «один интерактив = одно заблуждение».** У каждого интерактива есть один финальный вопрос-проверка; интерактив считается пройденным (событие `mastery_reached`) только при правильном ответе на него после собственных действий, а не при простом «докликал до конца».

**0.5. Определение готовности (общее).** (а) все приёмочные тесты разделов 1.8 и 2.14 проходят; (б) ноль английских слов без карточки перевода; (в) работает на экране 360 px шириной; (г) полное прохождение укладывается в заявленное время; (д) повторное прохождение с другим `seed` даёт другие числа шума, но те же качественные выводы.

---

## 1. FT-18 · «Три лонга = один риск»

### 1.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft18_three_longs_one_risk` |
| Урок-хозяин | 218 · FT-18 «Ограничение размера позиции и защитные механизмы» |
| Тип | СИМ (симуляция с управляемым сценарием) |
| Ломаемое заблуждение | «Лимит по числу сделок (`max_open_trades`) = лимит по риску» |
| Цель | Ученик видит, что при росте корреляции альткоинов к BTC три позиции по 150 USDT ведут себя как одна позиция на ~450–540 USDT, и учится задавать размер позиции от бюджета риска (1–2 % на сделку, 4–6 % суммарно), а не от числа слотов |
| Критерий освоения | (1) собрал конфигурацию, где худший одновременный убыток в обвале ≤ 6 % депозита; (2) верно ответил на финальный вопрос (п. 1.5, шаг 6) |
| Длительность | 6–8 минут |
| Место в уроке | Сразу после блока «Глубже» (фраза «три лонга по трём альткоинам в обвал биткоина — это одна позиция втрое больше») и перед «Проверь себя» |
| Зависимости | Нет обязательных. Опционально: правая панель конфига может переиспользовать E2 «Живой конфиг» |

### 1.2. Числа из уроков, которые интерактив обязан воспроизвести

- Депозит 1000 USDT, `stake_amount` 150, `stoploss` −10 % → риск на сделку 15 USDT (1,5 %) — урок 217.
- Три одновременных стопа в коррелированном обвале: −45 USDT (−4,5 %) — «в пределах правил Фазы 3» — урок 217.
- `stake_amount: unlimited` при 3 слотах ≈ 333 USDT/слот; серия из 10 стопов = −33 % — урок 217.
- Правило: `stake × |stoploss| ≤ 1–2 %` депозита; суммарный одновременный риск ≤ 4–6 % — урок 217.
- Корреляции в кризис стремятся к 1; портфель «11 % на бумаге» показывает 21 % — урок 44 (3.6).
- Стопы могут исполниться хуже уровня из-за гэпа: «−10 % в отчёте иногда превращается в −12 %» — урок 209.
- Параметры защит из урока 218: `StoplossGuard {lookback 96, trade_limit 3, stop_duration 48}`, `MaxDrawdown {lookback 240, trade_limit 5, max_allowed_drawdown 0.10}`.

### 1.3. Модель

**1.3.1. Параметры (управляются учеником).**

| Параметр | Диапазон / значения | По умолчанию | Отображение |
|---|---|---|---|
| `deposit` | фикс. | 1000 USDT | текст |
| `max_open_trades` (N) | 1…5 | 3 | ползунок с делениями |
| `stake_mode` | `fixed` / `unlimited` | `fixed` | переключатель; при `unlimited` stake = `deposit × 0.99 / N`, показывается вычисленное число |
| `stake` | 50…500 шаг 10 | 150 | ползунок, активен только в `fixed` |
| `stoploss` | −3 % … −15 % шаг 1 | −10 % | ползунок |
| `rho` (корреляция к BTC) | 0.0 … 1.0 шаг 0.05 | 0.30 в режиме «штиль», 0.90 в режиме «обвал» | ползунок с подписями «штиль ≈ 0,2–0,3», «крах ≈ 0,8–1,0» |
| `btc_move` | −30 % … +5 % шаг 1 | −3 % (штиль) / −15 % (обвал) | ползунок |
| `gap` (проскок стопа) | 0 / +2 / +5 п.п. | 0 | три кнопки; подпись «стоп исполнился хуже уровня на …» |
| `protections` | вкл/выкл StoplossGuard, вкл/выкл MaxDrawdown | обе выкл | чекбоксы |

**1.3.2. Активы.** Пять альткоинов, первые N участвуют: ETH (β=1.1), SOL (β=1.4), AVAX (β=1.5), LINK (β=1.3), DOGE (β=1.6). β — чувствительность к BTC (объясняется карточкой: «на 1 % падения BTC монета в среднем падает на β %»). Все позиции — лонги, открыты в баре 0 по одной цене 100 (нормировано).

**1.3.3. День симуляции.** 24 часовых бара. Путь BTC: бары 0–7 — шум; бары 8–10 — обвал суммарно на `btc_move` (распределение 40/40/20 % движения по трём барам); бары 11–23 — шум и частичный отскок (+20 % от величины падения, чтобы показать «стоп на дне»). Шум BTC: нормальный, σ=0.8 %/бар, детерминированный от `seed`.

**1.3.4. Доходность альткоина за бар:**

`r_i,t = β_i · ρ · r_BTC,t + β_i · √(1 − ρ²) · σ_idio · ε_i,t`, где `σ_idio = 1.2 %`, `ε ~ N(0,1)` от seed.

При ρ = 1 монеты — копии BTC с множителем β; при ρ = 0 обвал BTC их не касается. Формула показывается ученику в упрощённом виде в карточке: «доля общего с BTC движения = ρ, остальное — собственный шум монеты».

**1.3.5. Стоп.** Срабатывает на первом баре, где накопленная доходность позиции ≤ `stoploss`. Убыток позиции = `stake × (|stoploss| + gap)`. Позиции без стопа закрываются в баре 23 по рынку (плавающий результат показывается отдельно, в итог худшего убытка не входит).

**1.3.6. Показатели правой панели (пересчитываются мгновенно при любом изменении):**

- «Лимит по сделкам»: `N позиций`.
- «Риск на сделку»: `stake × |stoploss|` в USDT и % депозита; зона: ≤ 2 % зелёная, 2–3 % жёлтая, > 3 % красная.
- «Суммарный риск, если стопы сработают вместе»: `N × stake × (|stoploss| + gap)`; зона: ≤ 6 % зелёная, 6–10 % жёлтая, > 10 % красная.
- «Эквивалент одной позиции в BTC»: `Σ_i stake_i × β_i × ρ` USDT. Подпись: «При текущей корреляции твои N позиций двигаются как одна позиция на X USDT в биткоине».
- «Фактический убыток в этом дне»: сумма по сработавшим стопам + сработавшие защиты.
- «Что случилось» — лента событий дня (бар, монета, «стоп», «защита включилась»).

**1.3.7. Монте-Карло (кнопка «1000 таких дней»).** 1000 прогонов с текущими параметрами, разные ε (seed + индекс). Выход: гистограмма «сколько стопов сработало одновременно (в пределах одних 3 баров обвала)»: 0/1/2/3…N, и распределение убытка дня (5-й, 50-й, 95-й процентили). Считать в веб-воркере или чанками по 100, чтобы UI не замирал; лимит 1,5 с.

**1.3.8. Режим «штиль» дополнительно** считает «ложных стопов из 1000 спокойных дней» — чтобы при ужесточении `stoploss` ученик видел цену: сжал стоп до −3 % → в штиль вылетаешь чаще. (Это защита от «решения» шага 5 через слишком узкий стоп.)

**1.3.9. Защиты.** Если `StoplossGuard` включён: после 3-го стопа в пределах 96 баров (внутри дня — всегда) появляется бейдж «Новые входы заблокированы на 48 свечей» и в ленте — событие; убыток при этом уже реализован. `MaxDrawdown` включён: при убытке дня ≥ 10 % депозита — бейдж «Бот остановлен: просадка окна 10 %». Ключевой текст обратной связи (обязателен): *«Защита сработала после третьего стопа — 45 USDT уже потеряны. Защиты ограничивают продолжение серии, а не первый удар. Первый удар ограничивает только размер позиции».*

### 1.4. Экран

Одна страница, три зоны; на мобильном зоны идут вертикально.

- **Зона A (верх, слева) — «Пульт».** Ползунки из 1.3.1, сгруппированные: «Конфиг бота» (N, stake_mode, stake, stoploss, protections) и «Рынок» (ρ, btc_move, gap). Над «Рынком» — переключатель пресетов «Штиль / Обвал». Кнопки: «Прогнать день», «Перебросить шум», «1000 таких дней».
- **Зона B (верх, справа) — «Что видит риск-офицер».** Показатели из 1.3.6 крупными цифрами с цветовыми зонами. Опционально: под ними фрагмент `config.json` (`max_open_trades`, `stake_amount`, `stoploss`) — живое обновление (E2, если доступен).
- **Зона C (низ) — «День».** Четыре мини-графика в ряд: BTC и N альткоинов (нормировано 100 = цена входа), горизонтальная линия стопа, маркер бара срабатывания. Под графиками — лента событий. При Монте-Карло зона C заменяется гистограммой с кнопкой «вернуться к дню».
- **Зона D (плавающая) — пошаговый гид** (шаги 1–6) с кнопкой «Дальше», активной только после выполнения условия шага.

### 1.5. Сценарий прохождения (гид)

| Шаг | Что установлено автоматически | Что делает ученик | Условие перехода | Ожидаемые показания (seed=по умолчанию, допуск ±) |
|---|---|---|---|---|
| 1 «Штиль» | N=3, stake 150, SL −10 %, ρ=0.30, BTC −3 %, gap 0 | нажимает «Прогнать день», затем «1000 таких дней» | оба нажаты | стопов одновременно: чаще всего 0; P(≥2 одновременно) < 5 %. Текст: «Три позиции ведут себя как три разных ставки. Пока». |
| 2 «Обвал» | BTC −15 % | тянет ρ с 0.30 до 0.90 руками | ρ ≥ 0.85 и день прогнан | все три стопа в барах 8–10; убыток 45 USDT = 4,5 %; «эквивалент одной позиции» ≈ 540 USDT. Всплывает ключевая карточка: «Лимит был «3 сделки». Риск оказался «одна позиция на 540 USDT». Число сделок не диверсифицирует то, что падает вместе». |
| 3 «Unlimited» | без изменений | переключает `stake_mode` → unlimited; включает gap +2 | оба сделаны, день прогнан | stake ≈ 330; убыток 3 × 330 × 0,12 ≈ 119 USDT = 11,9 % (красная зона). Текст сравнения с шагом 2: «Тот же обвал, тот же бот, другой сайзинг: 4,5 % против 11,9 %». |
| 4 «Защиты» | как шаг 3 | включает StoplossGuard и MaxDrawdown, прогоняет день | день прогнан с защитами | убыток не изменился (119 USDT), появились бейджи; текст из 1.3.9. Монте-Карло показывает: медиана убытка та же, хвост серии (последующие дни) — не моделируем, подпись «защиты работают завтра, не сегодня». |
| 5 «Почини» | ρ=0.90, BTC −15 %, gap +2 зафиксированы (заблокированы) | свободно меняет N, stake_mode, stake, stoploss | суммарный риск ≤ 6 % **и** в режиме «штиль» ложных стопов ≤ 15 % дней | пример решений: N=3, stake 160 (3×160×0,12 = 57,6 = 5,8 %); N=2, stake 200 (48 = 4,8 %). Решение «SL −3 %, stake 150» отклоняется: штиль-стопы > 15 % → подсказка «Узкий стоп покупает защиту от обвала ценой постоянных ложных выходов — это другой риск, а не его отсутствие». |
| 6 «Проверка» | — | отвечает на вопрос | верный ответ | Вопрос: «Друг говорит: у меня max_open_trades = 5, я диверсифицирован. Он торгует пять альткоинов лонг, stake 200, стоп −10 %, депозит 1000. Худший одновременный убыток при обвале BTC с ρ→1 и проскоке стопа +2 п.п.?» Варианты: 20 USDT / 100 USDT / 120 USDT / «зависит от того, какие монеты». Верно: 120 USDT (12 %). Пояснение: 5 × 200 × 0,12. Отвлекающий «зависит от монет» разбирается: «при ρ→1 не зависит: они одна монета». |

Кнопка «Свободный режим» после шага 6 снимает блокировки.

### 1.6. Тексты обратной связи (ключевые, дословно использовать)

- При ρ ≥ 0.8 и N ≥ 3: «Ты держишь не N позиций. Ты держишь одну — размером Σ stake·β·ρ = X USDT — и она называется «биткоин с плечом».»
- При суммарном риске в красной зоне: «Правило Фазы 3: суммарный одновременный риск 4–6 %. У тебя X %. Уменьши stake или число слотов — стоп трогать в последнюю очередь.»
- При переходе fixed → unlimited: «`unlimited` не «безопаснее» — он делит баланс на слоты и молча делает риск на сделку 3,3 % вместо 1,5 %.»
- При включении защит: см. 1.3.9.
- Финальная карточка: «Лимит по числу сделок ограничивает *сколько раз* ты можешь ошибиться. Бюджет риска ограничивает *сколько это стоит*. Первое без второго — не риск-менеджмент.»

### 1.7. Состояния и граничные случаи

- N=1: зона «эквивалент» показывает «1 позиция», Монте-Карло — просто вероятность стопа. Текст шага 2 адаптируется: «с одной позицией корреляция ничего не меняет — но и диверсификации нет».
- ρ=0 и BTC −30 %: альты не падают; текст: «нереалистично для крипты: в кризис ρ растёт, а не падает (урок 3.6)».
- Положительный `btc_move`: стопы не срабатывают; показывать плавающий плюс серым; шаги гида требуют отрицательного движения (ползунок в шагах 2–5 ограничен).
- `stake × N > deposit` невозможно: при fixed ползунок stake ограничен сверху `deposit × 0.99 / N`.
- Отсутствие E2: правая панель — статичный JSON-текст с подстановкой чисел.

### 1.8. Приёмочные тесты

| № | Вход | Ожидаемый выход |
|---|---|---|
| T1 | N=3, stake 150, SL −10, gap 0, ρ=1.0, BTC −15 | 3 стопа в барах 8–10; убыток ровно 45.00; суммарный риск 4,5 % зелёный |
| T2 | как T1, unlimited, gap +2 | stake 330.00; убыток 118.80 (±0.01); зона красная |
| T3 | как T1, ρ=0.0, любой seed из 20 | ни один стоп не зависит от бара 8–10; P(3 одновременных) по МК < 1 % |
| T4 | как T1 + StoplossGuard | убыток 45.00; бейдж появился после 3-го стопа, не раньше |
| T5 | шаг 5, N=3, stake 160, SL −10, gap +2 | суммарный риск 5,76 % → условие пройдено |
| T6 | шаг 5, N=3, stake 150, SL −3, gap +2 | суммарный ≤ 6 %, но штиль-стопы > 15 % → условие не пройдено, показана подсказка |
| T7 | N=5, stake 200, SL −10, gap +2, ρ=1 | 120.00 = ответ шага 6 |
| T8 | 1000 прогонов | завершается ≤ 1,5 с, UI не блокируется (кнопки кликабельны) |
| T9 | один и тот же seed дважды | идентичные пути и события |
| T10 | язык | ни один из токенов `max_open_trades, stake_amount, stoploss, unlimited, StoplossGuard, MaxDrawdown, gap` не отображается без карточки |

### 1.9. Телеметрия (`onEvent`)

`step_enter{step}`, `param_change{name, from, to}`, `day_run{params, loss, stops}`, `mc_run{params, p_all_stops, p95_loss}`, `fix_attempt{params, passed, reason}`, `final_answer{choice, correct}`, `mastery_reached`, `time_spent`.

---

## 2. FT-19 · «Пульт оператора: ночь в Telegram»

### 2.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft19_night_shift_telegram` |
| Урок-хозяин | 219 · FT-19 «Сухой прогон и сравнение с исторической проверкой» (блок про Telegram-пульт и регламент оператора) |
| Тип | ТРН (тренажёр решений) + РИТ (устанавливает ритуалы R1 «Два вопроса» и R2 «Белый список ночи») |
| Ломаемое заблуждение | «Уведомление = приказ действовать» |
| Цель | Ученик проживает одну ночь оператора dry-run бота: получает 5 сценариев тревоги, учится (1) собирать факты командами уровня 0, (2) отличать «мир изменился» от «голова тревожится», (3) применять команды по уровням, (4) писать строку в журнал, (5) спать, когда мир не изменился |
| Критерий освоения | Ночь завершена с «чистым журналом»: все команды уровня ≥ 1 сопровождены названным фактом из мира; ни одного `/forceexit` без факта; ≥ 4 из 5 сценариев решены на оценку «верно» |
| Длительность | 15–20 минут (ночь) + 3 минуты (подготовка) + 3 минуты (утренний разбор) |
| Зависимости | E5 «Журнал» (записи вмешательств), E4 «Ритуал» (установка R1, R2, утренней сводки), E1 «Терминал-переводчик» (перевод сообщений бота). Все три — с локальным фолбэком |

### 2.2. Педагогическая рамка (обязательно отразить в UI-текстах)

1. **Протокол П1 «мир или голова».** Перед любой командой уровня ≥ 1: «Назови факт — что изменилось в мире?» → «Подождёт ли до утра?» → строка в журнал. «Мир» = данные, биржа, связь, код, деньги на счетах. «Голова» = страх, минус на экране, новости, чужие скриншоты.
2. **Уровни команд** — таблица из урока 219 (п. 2.4).
3. **Белый список ночи (П5)** — 2–3 события, которые вправе разбудить. Всё остальное — утренняя сводка. Правило полуночи: после 00:00 не принимается ни одного решения вне белого списка.
4. **Проблема стоматолога (П38)** — каждое лишнее «гляну одним глазком» ночью стоит сна и даёт только шум. В тренажёре это измеряется.
5. **Регламент FT-20** — чек-лист допуска требует чистого журнала вмешательств. Результат ночи пишется в E5 и виден в FT-20.

### 2.3. Архитектура

**Три экрана, один сквозной стейт.**

- **Экран 1 «Вечер, 22:30 — подготовка».** (а) Карточка состояния бота: dry-run, кошелёк 1000 USDT, PnL недели +1,8 %, открыты #11 ETH/USDT (+1,2 %), #12 SOL/USDT (−3,4 %). (б) Конструктор белого списка (п. 2.6). (в) Тренировка команд уровня 0 (нажать `/status`, `/profit`, `/daily`, «Здоровье», «Лог» — каждую хотя бы раз, иначе кнопка «Лечь спать» неактивна). (г) Показ панели «Телефон на ночь: только белый список». Кнопка «Лечь спать 23:00».
- **Экран 2 «Ночь 23:00–07:00».** Основной тренажёр (п. 2.7–2.9).
- **Экран 3 «Утро 07:00 — разбор».** Хронология ночи, оценки, журнал, стоимость ночи, установка ритуалов (п. 2.10–2.12).

**Сущности стейта:** `clock` (симулированное время), `botState` (позиции, ордера, heartbeat, лог), `exchangeState` (доступна/техработы/задержка API), `events[]` (таймлайн сценариев и шума), `factsOpened: Set<factId>` (какие факты ученик реально посмотрел), `journal[]`, `sleep` (0–100), `touches` (число открытий телефона ночью), `whitelist`, `scores{scenario→…}`.

**Интеграция с движками:**
- E1: сообщения бота хранятся парой `{en, ru}`; режим отображения «оба» (по умолчанию) / «только рус.» / «как в реальном Freqtrade». В режиме «оба» английская строка сверху мелко, русская снизу; токены EN кликабельны. Если E1 нет — локальный словарь ~40 токенов.
- E5: `journal.append(entry)` по схеме п. 2.11; `journal.list({source:'ft19'})` для утреннего экрана.
- E4: `ritual.install(def)` для R1, R2, «утренняя сводка» (п. 2.12); `ritual.isInstalled(id)`.

### 2.4. Команды пульта и уровни

Команды показываются как кнопки-чипы в нижней панели чата. Подпись чипа — по-русски, под ней мелко английская команда (кликабельна как токен).

| Чип (RU) | Команда | Уровень | Что требует | Ответ симулятора |
|---|---|---|---|---|
| Позиции | `/status` | 0 | — | таблица открытых сделок: пара, №, вход, текущая цена, PnL %, открытые ордера, «цена обновлена N мин назад» |
| Сводка | `/profit` | 0 | — | PnL сегодня/неделя, число сделок, баланс |
| По дням | `/daily` | 0 | — | 7 строк |
| Здоровье | внешний монитор (Healthchecks-стиль) | 0 | — | «последний пинг бота: N мин назад» + статус биржи (ссылка «страница статуса биржи») |
| Лог | `/logs` (последние 10 строк) | 0 | — | строки лога EN/RU |
| Страница биржи | открыть статус-страницу | 0 | — | «работает штатно» / «техработы до 06:00 UTC» |
| Не входить | `/stopentry` | 1 | причина ≥ 10 символов, автозапись в журнал | «Новые входы приостановлены; открытые позиции живут по правилам» |
| Отменить ордер #… | `/cancel_open_order <id>` | 2 | протокол R1 | «Ордер отменён» / «Не удалось: …» |
| Закрыть позицию #… | `/forceexit <id>` | 2 | протокол R1 | «Закрыто по рынку» / «Отклонено: биржа недоступна» |
| Закрыть всё | `/forceexit all` | 2 | протокол R1 + подтверждение вторым тапом | как выше |
| Перезапустить бота | `/restart` | 2 | протокол R1 | через 20–40 сим-секунд: «Бот запущен, позиций: N» либо «нет ответа» (если сценарий требует повтора) |
| Остановить бота | `/stop` | 2 | протокол R1 | «Бот остановлен. Позиции остаются открытыми без управления!» (предупреждение красным) |
| Изменить настройки | правка config.json | 3 | недоступно ночью (00:00–06:00): чип серый с подписью «правило полуночи + правило одного изменения (урок 5.6)» | — |
| Подождать 10 минут | (управление временем) | 0 | — | сдвиг часов; события могут продолжиться |
| Спать дальше | (управление временем) | 0 | — | перемотка до следующего разрешённого будильника |

**Правило полуночи в коде:** после 00:00 команды уровня 2 доступны только если текущий активный сценарий помечен движком как `whitelisted` **по списку ученика**. Если ученик открыл телефон по не-белому событию и пытается L2 — чип активен, но протокол R1 не даст назвать факт из мира (список фактов пуст), и внизу модалки: «Ты проснулся не по белому списку. Что именно изменилось в мире?».

### 2.5. Протокол-модалка R1 «Мир или голова» (спецификация)

Открывается при нажатии любого чипа уровня 2 (и в сокращённом виде — уровня 1).

Шаг 1. «Назови факт — что конкретно изменилось в мире?»
- Список чипов-фактов формируется **только из `factsOpened`** — того, что ученик реально посмотрел в эту ночь командами уровня 0. Не открыл лог — чипа «5 ошибок API подряд» нет. Это ключевая механика: нельзя назвать факт, который не проверил.
- Каждый факт помечен движком как `world` или `head`. Примеры `head`: «SOL закрыта по стопу −10 %», «ETH в минусе», «в чате пишут про разворот», «мне тревожно». Примеры `world`: «нет пинга 16 мин», «ордер #13 висит 42 мин при таймауте 10», «биржа: техработы до 06:00».
- Поле свободного текста (необязательное, ≤ 140 символов).
- Кнопка «Дальше» активна только при выбранном факте класса `world`. При выборе `head`-факта под ним появляется подпись: «Это событие в голове: рынок против позиции — штатная работа стратегии. Факт поломки не назван» и кнопка «Вернуться спать».

Шаг 2. «Если принять это решение завтра утром выспавшимся — оно будет тем же?» — два варианта: «Да → подождёт до утра» (закрывает модалку, создаёт запись в журнал с `action: 'отложено до утра'`, оценка сценария по ветке «отложил»); «Нет → действую сейчас» (выполняет команду).

Шаг 3 (автоматически). Создаётся запись журнала (п. 2.11) с предзаполненными полями; ученик может добавить одно слово-чувство.

Для уровня 1 модалка сокращена до поля причины и автозаписи.

### 2.6. Конструктор белого списка R2

Ученику предлагаются 9 карточек-событий; нужно выбрать 2–3 (иначе кнопка «Готово» неактивна; при 4+ — подсказка «список длиннее трёх — это не список, это будильник каждые полчаса»).

| Карточка | Класс | Комментарий движка (показывается утром) |
|---|---|---|
| Нет связи с биржей / нет пинга бота > 15 минут | world ✔ | эталон из П5 |
| Сработал kill-switch / бот сам остановился | world ✔ | эталон |
| Бот отправил или удерживает приказ, которого не должен (зависший ордер, ошибка отмены) | world ✔ | эталон |
| Биржа объявила техработы / остановила торги | world ✔ | допустимо |
| Позиция закрылась по стопу | head ✘ | «стоп — штатная работа» |
| Позиция в минусе больше 3 % | head ✘ | |
| Странный сигнал / вход на непривычной паре | head ✘ | |
| Новость про запрет/крах | head ✘ | |
| Тишина больше 2 часов | head ✘ | «тишина без потери пинга — норма для 1h» |

Выбор сохраняется в профиль (`ritual.setPreference('night_whitelist', ...)`) и используется движком ночи: события, попадающие в список, «будят» (телефон вибрирует, экран загорается), не попадающие — уходят в свёрнутую «утреннюю сводку» с бейджем-счётчиком. Ученик всё равно может нажать «Открыть телефон» по не-белому событию — это фиксируется как `touch_non_whitelist` и стоит сна.

Утром движок сравнивает список ученика с эталоном и показывает: «Твой список разбудил тебя N раз; из них требовали действия M. Эталонный разбудил бы K раз, действия требовали K». (Прямая отсылка к числу из П5: 34 уведомления, 0 действий.)

### 2.7. Пять сценариев ночи

Общие правила для всех сценариев: у каждого есть `time`, сообщения бота `{en, ru}`, набор фактов (что покажут команды уровня 0), «верное действие», градация альтернатив, «итог через 7 дней» для журнала. Порядок фиксирован (учебная драматургия), кроме сценария 5, где вариант A/B выбирается по `seed` и меняется при повторе.

Форматы английских сообщений — в стиле Telegram-уведомлений Freqtrade (агенту: не гарантировать побайтовую точность реальному формату, но сохранять узнаваемую структуру: заголовок с эмодзи, пара, номер сделки, поля `Exit Reason`, `Profit`).

**Сценарий 3 идёт первым по времени — 00:30 «Зависший ордер».**
- Сообщение (×3, с интервалом 5 мин): EN `⚠️ AVAX/USDT (#13) entry order partially filled (40%). Cancelling remaining order failed: ExchangeError (order not found)` / RU «⚠️ AVAX/USDT (#13): заявка на вход исполнена частично (40 %). Не удалось отменить остаток: ошибка биржи (ордер не найден)».
- Белый список: совпадает с «бот удерживает приказ, которого не должен».
- Факты уровня 0: `/status` → #13, открытый ордер живёт 42 мин, `unfilledtimeout` = 10 мин (обе величины показаны и переведены), частичная позиция 60 USDT; «Лог» → три строки `Failed to cancel order`; «Здоровье» → пинг 3 мин назад; биржа — штатно.
- Верно (100 %): «Отменить ордер #13» через R1 с фактом «ордер висит 42 мин при таймауте 10, отмена не удаётся» → ответ «Ордер отменён, позиция #13: 60 USDT, стоп активен» → журнал → спать.
- Допустимо (70 %): `/restart` с тем же фактом (перезапуск сбрасывает зависшее состояние) — комментарий утром: «сработало, но это более грубый инструмент: сначала точечная отмена».
- Ошибка (30 %): `/forceexit all` — закрыты и ETH #11 (+1,2 %) и частичная #13; комментарий: «факт был про один ордер, действие — про весь портфель».
- Ошибка (0 %): ничего не сделать до утра — утром: за 6 часов бот дважды пытался довыставить ордер, позиция #13 удвоилась; комментарий: «бот в неопределённом состоянии — это мир, а не голова».
- Итог через 7 дней (в журнал): «#13 закрыта по ROI +2,1 % на следующий день».

**Сценарий 1 — 02:40 «Стоп».**
- Сообщение: EN `⚠️ Exit SOL/USDT (#12) · Exit Reason: stop_loss · Profit: -10.1% (-15.2 USDT) · Duration: 9:12` / RU «⚠️ Выход SOL/USDT (#12) · Причина: стоп-лосс · Результат: −10,1 % (−15,2 USDT) · В сделке: 9 ч 12 мин».
- Белый список: не совпадает с эталоном. Если ученик добавил «стоп» в список — телефон будит.
- Факты: `/status` → ETH #11 +0,9 %; `/profit` → неделя +0,3 % после стопа; «Лог» → чисто; «Здоровье» → пинг 2 мин; биржа штатно; BTC −1,2 % за сутки.
- Верно (100 %): не открывать телефон (если не в списке) **или** открыть, посмотреть уровень 0, закрыть без действий; опционально строка в журнал «02:40 — стоп SOL, мир не менялся, разбор утром» (журнальная запись без действия оценивается +, не требуется).
- Ошибка (40 %): `/stopentry` с причиной «серия убытков» — комментарий утром: «один стоп — не серия; StoplossGuard считает серии сам».
- Ошибка (0 %): `/forceexit 11` или `/stop` — R1 не пропустит без world-факта; если ученик выбрал head-факт и всё же нажал «Вернуться спать» — норма; попытка фиксируется как `attempted_L2_on_head`.
- Итог через 7 дней: «Стратегия закрыла неделю +2,8 %; после этого стопа бот открыл 2 сделки с итогом +22 USDT — при `/stopentry` они были бы пропущены».

**Сценарий 2 — 03:15 «Ошибка API / потеря связи».**
- Сообщение внешнего монитора: EN `❌ freqtrade-alexey: no ping for 16 minutes` / RU «❌ Бот Алексея: нет пинга 16 минут». Затем — тишина от самого бота.
- Белый список: совпадает («нет связи > 15 мин»).
- Факты: `/status` → «бот не отвечает (таймаут)»; «Лог» (доступен, читается с сервера) → 5 строк подряд `Connection reset by peer` / `502 Bad Gateway`; «Здоровье» → пинг 16 мин назад; биржа — штатно (значит проблема на нашей стороне/сети).
- Верно (100 %): `/restart` через R1 с фактом «нет пинга 16 мин, 5 ошибок связи подряд» → через 30 сим-секунд «Бот запущен. Позиций: 1 (ETH #11)» → `/status` подтверждение → журнал → спать. Также верно: «Подождать 10 минут» → на 26-й минуте по-прежнему нет пинга → рестарт (полный балл при рестарте до 30-й минуты недоступности).
- Ветка усложнения (в 30 % прогонов по seed): первый `/restart` даёт «нет ответа»; второй — успех. Учит повторить, а не паниковать.
- Ошибка (0 %): ничего не делать до утра — утром: 4 часа открытая позиция без контроля; комментарий из урока 4.2: «бот, о падении которого ты узнаёшь утром, — это открытая позиция без присмотра».
- Ошибка (30 %): `/forceexit all` при отсутствии связи — ответ «Отклонено: бот не отвечает»; комментарий: «кнопка паники требует того же канала, который и упал; сначала связь».
- Итог через 7 дней: «После рестарта работал без сбоев; причина — обновление сети у провайдера VPS».

**Сценарий 4 — 04:20 «Падение биржи».**
- Сообщение бота: EN `⚠️ Outdated history for pair ETH/USDT, last candle 25 min old` / RU «⚠️ Данные по ETH/USDT устарели: последняя свеча получена 25 минут назад».
- Белый список: совпадает, только если ученик выбрал «биржа объявила техработы»; иначе — сводка утром (и это допустимый исход, см. градацию).
- Факты: «Здоровье» → пинг 1 мин (бот жив); «Страница биржи» → «Плановые технические работы, торги остановлены до 06:00 UTC»; `/status` → ETH #11 +1,5 %, «цена обновлена 25 мин назад»; «Лог» → повторяющиеся `Outdated history`.
- Верно (100 %): `/stopentry` с причиной «биржа на техработах до 06:00; риск гэпа на открытии» → журнал → спать. Утром напоминание «снять `/stopentry` после проверки». (Комментарий: почему уровень 1, а не 2 — открытую позицию всё равно нечем закрыть, а вот новые входы на гэпе — реальный риск.)
- Допустимо (70 %): ничего не делать (стоп-лосс на позиции есть, защиты работают после возобновления); комментарий: «переживаемо, но `/stopentry` дешевле гэпа».
- Ошибка (30 %): `/forceexit 11` — ответ «Отклонено биржей: торги остановлены»; комментарий: «во время техработ не работает ничего, включая панику; это и есть повод для запасного маршрута из урока 5.7 — но не в 4 утра».
- Итог через 7 дней: «Торги возобновились в 06:03 с гэпом −2,1 % на ETH; стоп не задет; `/stopentry` снят в 09:10».

**Сценарий 5 — 05:30 «Тишина».**
- Вариант A (seed чётный): уведомлений нет с 04:20. На экране телефона появляется «пузырь-зуд»: «Тихо уже больше часа… гляну одним глазком?» с кнопками «Открыть» / «Спать». Факты, если открыть: всё штатно, пинг 6 мин.
 - Верно (100 %): «Спать». Открытие без белого события — `touch_non_whitelist`, оценка 60 %; действия уровня ≥ 1 — 0 % (R1 не даст world-факт).
- Вариант B (seed нечётный): монитор: «❌ нет пинга 35 минут» + лог: `Heartbeat missing` — совпадает с белым списком.
 - Верно: `/restart` через R1 (аналогично сценарию 2). Отличие от сценария 2 — нет явных ошибок API в логе; факт называется по пингу. Учит: «тишина сама по себе — не событие; тишина + потерянный пинг — событие».
- Итог через 7 дней (A): «Ночь прошла штатно; бот открыл сделку в 06:00 по сигналу». (B): «После рестарта — штатно; причина — зависание процесса при ротации логов».

**Бонусный сценарий (только при повторном прохождении, 06:10) «Kill-switch».** Сообщение: «🛑 Kill-switch: дневной убыток −2,1 % ≥ порога −2 %. Все ордера отменены, позиции закрыты, торговля заблокирована на 24 часа» (урок 4.4). Верно: ничего не запускать заново; журнал; утренний разбор. Ошибка: `/restart` с намерением «продолжить» — R1 требует факт; факт «kill-switch сработал» — world, но подсказка: «мир изменился в сторону «стой», а не «запусти». Действие — разбор, не рестарт».

### 2.8. Шумовые сообщения («голова»)

Приходят в отдельные чаты в той же ленте телефона, помечены иконкой не-бота. Не входят ни в один белый список; каждое открытие = `touch_noise`.

- 23:40, чат «Крипто-друзья»: «пять красных свечей подряд по SOL — сейчас точно развернёт, держитесь!» (П53).
- 01:50, канал новостей: «СРОЧНО: страна X готовит запрет криптобирж».
- 03:50, друг: скриншот «+300 % за ночь на мемкоине» (П43/П54).
- 05:00, друг: «Ты спишь? У меня бот выключен на всякий случай» (П2, «выключаю по выходным»).

Если ученик после шумового сообщения делает команду ≥ 1 — R1 предлагает только head-факты; попытка фиксируется как `action_after_noise`.

### 2.9. Модель времени и сна

- Часы идут только при нажатии «Спать дальше» (перемотка до следующего разрешённого будильника или до 07:00) или «Подождать 10 минут». Во время открытого телефона часы стоят (кроме сим-задержек команд 20–40 сек).
- «Сон» стартует со 100. Списания: пробуждение по белому событию −8 (неизбежно), открытие телефона не по белому событию −12, каждое лишнее действие уровня ≥ 1 без факта −15, чтение шумового чата −5, `/forceexit all` −20 (независимо от исхода — это стресс). Ниже 40 — интерфейс телефона слегка «дрожит», подпись «решения после недосыпа — как за рулём с 0,5 ‰ (П13)». Сон не блокирует действия — только визуализирует цену.
- Утром показывается «Цена ночи»: сон, число касаний, число касаний по белому списку, действия без факта.

### 2.10. Оценивание и утренний разбор

По каждому сценарию: балл 0–100 по градации 2.7 + модификаторы: факт назван и относится к миру (+0/обязательное условие для L2), журнальная запись есть (−20, если действие ≥ L1 без записи — невозможно по механике, но возможно при «отложил до утра» без заметки — не штрафуем), лишние касания (−5 за каждое сверх двух).

Итоговые статусы:
- «Чистая ночь» — все сценарии ≥ 70 и ни одной L2 без world-факта → критерий освоения выполнен, в E5 пишется флаг `ft19_clean_night=true` (его читает чек-лист FT-20, пункт «журнал вмешательств чист»).
- «Ночь с помарками» — 1 сценарий < 70 → предложение повторить с другим seed.
- «Продлить dry-run» — любой `/forceexit`/`/stop` по head-мотиву или 2+ сценария < 70 → текст из FT-20: «Допуск не проходит: ручное вмешательство «по чутью» — сигнал, что психология ещё не готова к live; продлить dry-run и отработать протокол П1».

Экран разбора: вертикальная хронология 23:00→07:00, для каждого события — что пришло, что сделал, оценка, «что бы стоило», «итог через 7 дней». Ниже — сводка белого списка (п. 2.6), «Цена ночи» (п. 2.9), список записей журнала. Финальный вопрос (обязателен для `mastery_reached`): «Ночью пришло уведомление «позиция закрыта по стопу». Ошибок в логе нет, пинг свежий, биржа работает. Действие по регламенту?» — варианты: «/stopentry до утра», «/forceexit остальных, пока не поздно», «строка в журнал, разбор утром», «перезапустить бота». Верно — третье.

### 2.11. Схема записи журнала (E5)

```
{
  source: 'ft19',
  sim_time: '03:15',            // время в симуляции
  real_ts: ISO,                  // реальное время записи
  scenario_id: 'api_loss',
  world_or_head: 'world' | 'head' | 'none',
  fact: 'нет пинга 16 мин; 5 ошибок связи подряд',   // выбранный чип + свободный текст
  waited_until_morning: boolean,
  command: '/restart' | '/stopentry' | 'none' | ...,
  level: 0|1|2,
  feeling: 'тревога',            // одно слово, необязательно
  outcome_7d: 'после рестарта работал без сбоев…',     // заполняет симулятор при разборе
  score: 100
}
```

Категории искажений (для сводки паттернов E5): `action_bias` (действие без факта), `recency` (реакция на один стоп как на серию), `availability` (действие после шумового чата), `automation_bias` (не отреагировал на потерю пинга).

### 2.12. Установка ритуалов (E4)

На экране разбора три карточки «прикрутить к себе»:

1. **R1 «Два вопроса перед касанием».** `ritual.install({id:'two_questions', trigger:'app:intervene_click', modal: R1Spec})` — после установки любая кнопка «вмешаться» в других тренажёрах курса перехватывается той же модалкой; счётчик «касаний без факта» ведётся глобально.
2. **R2 «Белый список ночи».** Сохраняет список ученика; `ritual.schedule({id:'whitelist_review', cron:'weekly', prompt:'Пересмотреть белый список?'})`.
3. **«Утренняя сводка».** `ritual.schedule({id:'morning_digest', time:'09:00', checklist:['/profit прочитан','лог ошибок пуст','пинг свежий','запись в журнал сделана'], streak:true})`.

При отсутствии E4 карточки показывают инструкцию и сохраняют выбор локально; телеметрия `ritual_install_attempt{id, engine_available:false}`.

### 2.13. Граничные случаи

- Ученик не открывает телефон всю ночь (жмёт «Спать дальше» до 07:00): сценарии 3, 2, 5B проваливаются (0 %), остальные — 100 %. Итог — «Продлить dry-run» с текстом: «Слепая вера (automation bias, П2): три события мира прошли мимо».
- Ученик открывает телефон на каждое событие: статус «Ночь с помарками», текст про стоматолога.
- Пустой белый список запрещён (минимум 2). Белый список без ни одного world-события (например, «стоп» + «новость»): движок ночи не будит ни в одном world-сценарии → утром это главный вывод разбора.
- Повторное прохождение: seed меняется автоматически, сценарий 5 — другой вариант, добавляется бонусный сценарий; белый список предлагается пересобрать с показом эталона.
- Смена языка отображения посреди ночи разрешена и не влияет на стейт.
- Офлайн/перезагрузка страницы: стейт ночи сохраняется в localStorage по `seed`, восстанавливается с того же момента.

### 2.14. Приёмочные тесты

| № | Действие | Ожидание |
|---|---|---|
| T1 | Экран 1: выбран 1 пункт белого списка | «Лечь спать» неактивна; подсказка «минимум 2» |
| T2 | Ночь, 02:40, в белом списке нет «стоп» | телефон не будит; событие в счётчике сводки; при «Спать дальше» переход к 03:15 |
| T3 | 02:40, ученик открыл телефон, нажал «Закрыть позицию #11» | R1 открыт; доступные факты только head-класса; «Дальше» неактивна; событие `attempted_L2_on_head` |
| T4 | 03:15, не открыт «Лог» и «Здоровье», нажат `/restart` | в R1 нет ни одного world-факта → действие невозможно; после открытия «Здоровье» чип «нет пинга 16 мин» появляется |
| T5 | 03:15, «Подождать 10 минут» ×2, затем `/restart` с world-фактом | балл 100 (недоступность 26 мин < 30) |
| T6 | 00:30, `/forceexit all` с world-фактом | команда исполняется; балл 30; в журнале запись с командой; ETH #11 закрыта, что отражено в `/status` |
| T7 | 04:20, `/forceexit 11` | ответ «Отклонено биржей»; балл 30; сон −20 |
| T8 | Прохождение: все сценарии верно, 0 касаний вне списка | статус «Чистая ночь»; в E5 флаг `ft19_clean_night=true`; `mastery_reached` после верного финального ответа |
| T9 | Те же действия с фолбэком (без E4/E5/E1) | идентичное поведение; записи в localStorage; карточки токенов из локального словаря |
| T10 | seed=1 и seed=2 | сценарий 5 — разные варианты; порядок сценариев 3→1→2→4→5 сохранён |
| T11 | Ширина 360 px | чат читаем, чипы команд прокручиваются горизонтально, R1 помещается без скролла по горизонтали |
| T12 | Все сообщения бота в режиме «как в реальном Freqtrade» | каждое английское слово — токен с карточкой |

### 2.15. Телеметрия (`onEvent`)

`whitelist_set{items}`, `night_event{scenario, whitelisted}`, `phone_open{scenario|noise, whitelisted}`, `fact_opened{factId, cls}`, `command{cmd, level, scenario, fact_cls, waited}`, `r1_blocked{reason}`, `attempted_L2_on_head`, `action_after_noise`, `scenario_score{scenario, score}`, `night_result{status, sleep, touches}`, `journal_written{count}`, `ritual_install_attempt{id, engine_available}`, `final_answer{choice, correct}`, `mastery_reached`, `time_spent`.

**Метрика для дашборда курса (из методологии):** доля кликов уровня 2 без названного факта (`r1_blocked / (commands L2 + r1_blocked)`) — должна падать от первого прохождения ко второму; доля учеников с установленным R1 через 30 дней.
--------------------------------------------
# Спецификации для агента-реализатора: FT-19 (2) «Открыл 0.0.0.0» и FT-20 «Восемь недель dry-run»

## 0. Общие требования к обоим интерактивам

| Требование | Содержание |
|---|---|
| **Аудитория** | Новичок без английского. Любой английский токен (ключ конфига, команда, сообщение бота) — кликабелен → всплывает русская карточка (режим «Ткни в непонятное»). Словарь токенов приведён в каждом спеке; он подключается к общему глоссарию приложения, не дублируется локально. |
| **Персонаж** | Алексей, депозит 1000 USDT (≈100 000 ₽), стратегия `DipBuyerBTCFilter`, таймфрейм 1h, три пары BTC/ETH/SOL к USDT, `stake_amount: 150`, `max_open_trades: 3`, `stoploss: -0.10`, `minimal_roi: {0: 0.06, 240: 0.02}`. Все числа берутся из текстов FT-04, FT-05, FT-17, FT-20 — не выдумывать. |
| **Архитектура** | Ядро интерактива — чистая детерминированная функция состояния (reducer + seeded RNG), отделённая от UI. UI — компонент в текущем стеке приложения, реализующий общий контракт интерактивов (`onProgress`, `onComplete`, `saveState`/`restoreState`). |
| **Сохранение** | Состояние сохраняется после каждого действия; повторное открытие продолжает с места остановки; кнопка «Начать заново» с подтверждением. |
| **Обратная связь** | Каждый неверный шаг → короткое объяснение «почему» + ссылка на урок/термин. Каждый верный шаг → подтверждение с числом/следствием, не просто «правильно». |
| **Телеметрия** | События `interactive_start`, `step`, `mistake{type}`, `hint_used`, `complete{score, duration}`; для FT-20 дополнительно `intervention{has_fact}`, `decision{final}`. |
| **Доступность** | Все действия — с клавиатуры; цвета дублируются иконкой/текстом (зоны «норма/серая/стоп» — не только цвет). |

---

# Спек 1. FT-19 (2) «Открыл 0.0.0.0»

## 1.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft19_open_0000` |
| Урок | FT-19 «Сухой прогон и сравнение с исторической проверкой» |
| Место в уроке | Сразу после блока «⚠ Важно: Две ошибки доступа» и таблицы уровней команд |
| Тип | ИГР (мини-игра с обратной связью) на движке **E2 «Живой конфиг»** |
| Целевое заблуждение | «Безопасность — потом, сейчас же dry-run, денег нет» |
| Длительность | 4–7 минут (базовый режим), +3 мин сложный режим |
| Пререквизиты | FT-04 (конфиг), 4.3 (права API-ключа), П1 (протокол «мир или голова») |
| Критерий освоения | Найдены и корректно починены все 4 дыры базового режима не более чем с 2 ложными пометками; на финальном вопросе выбран верный ответ |

## 1.2. Цель обучения

После интерактива ученик:
1. с первого взгляда узнаёт четыре типовые дыры секций `api_server` и `telegram`;
2. понимает **последствие** каждой дыры как конкретный сценарий атаки (не абстрактное «небезопасно»), включая «dry-run — не защита: пульт от бота всё равно публичный, а завтра этот же конфиг станет боевым»;
3. знает правильные значения: `127.0.0.1` + SSH-туннель, сгенерированный длинный пароль, сгенерированный JWT/ws-token, привязка Telegram к собственному `chat_id`, пустые ключи биржи в dry-run.

## 1.3. Сюжет

> Воскресенье, неделя 1 dry-run-кампании. Алексей скопировал `config.json` на VPS и уже занёс палец над `freqtrade trade`. Ты — риск-офицер. У тебя одна минута… нет, столько, сколько нужно: найди дыры до запуска.

Финальная реплика (после починки): «Запуск разрешён. Этот же конфиг через 8 недель поедет в микро-лайв с `dry_run: false` — и дыры поехали бы вместе с ним».

## 1.4. Экран (макет)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Заголовок: Проверь конфиг перед запуском      [Подсказка ●●●] [Счёт]│
├──────────────────────────────┬──────────────────────────────────────┤
│ ЛЕВАЯ ПАНЕЛЬ (E2)            │ ПРАВАЯ ПАНЕЛЬ «Что видит интернет»   │
│ config.json (структурный     │                                      │
│ редактор, ~18 строк)         │  Поверхность атаки:  ████████ 4/4    │
│  каждая строка:              │  ┌─ Сканер портов ──┐               │
│  [метка-флажок] key: value   │  │ 203.0.113.7:8080 │ ОТКРЫТ ⚠      │
│  клик по value → редактор    │  └──────────────────┘               │
│  клик по key → рус. карточка │  Кто может отдать /forceexit:       │
│                              │   • любой, кто найдёт бота в TG ⚠   │
│                              │   • любой, кто знает пароль admin ⚠ │
│                              │  Сценарий атаки: [Показать ▶]        │
├──────────────────────────────┴──────────────────────────────────────┤
│ НИЖНЯЯ ЛЕНТА: пометки игрока (чипы) · [Проверить пометки]           │
└─────────────────────────────────────────────────────────────────────┘
```

**Правая панель пересчитывается мгновенно** при любом изменении конфига (контракт E2): число открытых дыр, список «кто может управлять ботом», статус сканера, индикатор «уровень риска» (шкала 0–4 с подписями: 4 — «публичный пульт», 0 — «чисто»).

## 1.5. Исходный конфиг (fixture)

Показывается **русифицированный структурный вид**, а не сырой JSON (ключи остаются английскими, значения редактируются через контролы). Внутреннее представление:

```json
{
  "bot_name": "sandbox_01",
  "dry_run": true,
  "dry_run_wallet": 1000,
  "max_open_trades": 3,
  "stake_amount": 150,
  "stake_currency": "USDT",
  "exchange": {
    "name": "binance",
    "key": "",
    "secret": "",
    "pair_whitelist": ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
  },
  "api_server": {
    "enabled": true,
    "listen_ip_address": "0.0.0.0",
    "listen_port": 8080,
    "username": "freqtrader",
    "password": "admin",
    "jwt_secret_key": "somethingrandom",
    "ws_token": "sercet_Ws_t0ken"
  },
  "telegram": {
    "enabled": true,
    "token": "7123456789:AAF...redacted",
    "chat_id": ""
  }
}
```

### Дыры базового режима (обязательные, 4 шт.)

| # | Путь | Плохое значение | Принимаемое исправление (валидатор) | Ложная починка (не принимается) |
|---|---|---|---|---|
| H1 | `api_server.listen_ip_address` | `"0.0.0.0"` | ровно `"127.0.0.1"` | `"localhost"` — принимается с примечанием «работает, но каноничная запись 127.0.0.1»; любой публичный IP — отказ; смена порта — отказ («порт не лечит открытый адрес») |
| H2 | `api_server.password` | `"admin"` | длина ≥ 16, не из словаря `{admin, password, freqtrade, freqtrader, 12345678, qwerty…}`, не совпадает с `username`; кнопка «Сгенерировать» даёт 24-символьный | `"Admin123"`, `"password1"` — отказ с текстом про словари |
| H3 | `api_server.jwt_secret_key` (и `ws_token`) | `"somethingrandom"` — значение из примера документации | ≥ 32 символа случайных (кнопка «Сгенерировать»); `ws_token` — аналогично ≥ 16 | любая «человеческая» фраза («мойсекрет2026») — отказ: «подбирается словарём» |
| H4 | `telegram.chat_id` | `""` (пусто) | непустой числовой ID (кнопка «Узнать свой chat_id → @userinfobot», в игре — «Вставить мой chat_id» подставляет `123456789`) | добавить чужой/несколько ID — отказ: «бот должен отвечать только тебе» |

> Каноничная формулировка урока: «Telegram-бот без ограничения chat_id: любой, кто найдёт бота, сможет послать /forceexit». Игра воспроизводит именно эту трактовку.

### Ложные цели (red herrings — помечать их **нельзя**)

`listen_port: 8080` («порт не проблема, проблема адрес»), `telegram.enabled: true`, `api_server.enabled: true`, `username: "freqtrader"` (слабый логин — не дыра сам по себе; засчитывается как «замечание», не как ошибка, если помечен, штраф не начисляется, но и балл не даётся), `dry_run: true`, `exchange.key: ""` («пусто — правильно для dry-run»).

### Сложный режим (после базового, опционально, +1 дыра, +2 ловушки)

| # | Путь | Плохое значение | Исправление |
|---|---|---|---|
| H5 | `exchange.key` / `exchange.secret` | заполнены реальными ключами при `dry_run: true` | опустошить оба; объяснение: «ключи для песочницы не нужны (FT-02); ключ на диске в открытом виде — уже инцидент (FT-04); когда понадобятся — через переменные окружения `FREQTRADE__EXCHANGE__KEY`» |

Ловушки сложного режима: `"listen_ip_address": "192.168.1.10"` (домашняя сеть — всё равно не localhost) и `"password": "Fr3qtr@de!"` (10 символов, «выглядит сложным» — короткий).

## 1.6. Механика — этапы

### Этап A. «Найди» (пометки)
- Клик по строке → чип-пометка «подозрительно» (макс. 6 одновременно).
- Кнопка «Проверить пометки» доступна всегда. Результат: каждая пометка окрашивается: ✅ дыра / ⚪ не дыра, но замечание / ❌ ложная тревога.
- Штраф: каждая ❌ — −10 баллов; более 3 ❌ за игру — вывод: «Ты помечаешь наугад. Перечитай таблицу команд урока» + подсветка правой панели «смотри, что реально видит интернет».
- После проверки непомеченные дыры **не раскрываются** — игрок продолжает искать; после 2 проверок доступна подсказка (см. 1.8).

### Этап B. «Почини» (правка)
- Клик по значению найденной дыры → контекстный редактор (поле ввода + кнопка «Сгенерировать» там, где уместно + кнопка «Почему это дыра?»).
- Валидатор из таблицы 1.5. При отказе — текст причины, значение не сохраняется.
- Правая панель мгновенно снимает соответствующий пункт «кто может управлять».
- **Защита от побочного вреда:** если игрок меняет поле, не являющееся дырой, и делает конфиг опаснее (`dry_run → false`, `stake_amount → 1000`, whitelist добавить `BTCUP/USDT`), панель немедленно вспыхивает красным с текстом: «Стоп. Ты только что перевёл бота на реальные деньги / нарушил риск 1–2% (FT-17)». Откат кнопкой. Это засчитывается как ошибка типа `collateral`.

### Этап C. «Сценарий атаки» (после каждой починки, 3 кадра, ~15 с, можно пропустить)
Короткая анимация-комикс «что было бы». Один сценарий на дыру:

| Дыра | Кадр 1 | Кадр 2 | Кадр 3 |
|---|---|---|---|
| H1 | Робот-сканер обходит интернет, находит `203.0.113.7:8080` | Открывает панель FreqUI — форма логина | «Пульт найден. Осталось подобрать пароль» |
| H2 | Словарь паролей: `admin` — первая строка | Вход выполнен за 0,2 с | На экране чужие руки жмут `/forceexit all` — три позиции Алексея закрыты в минус по рынку |
| H3 | Злоумышленник копирует `somethingrandom` из документации | Подписывает себе токен доступа без пароля вообще | «Пароль сменил, а JWT из примера оставил — дверь заперта, ключ под ковриком» |
| H4 | Кто-то ищет ботов в Telegram по имени | Шлёт `/status` — бот отвечает: показывает депозит и позиции | Шлёт `/forceexit all` — бот исполняет |
| H5 (сложн.) | Скрипт-грабитель находит репозиторий с `config.json` | Проверяет права ключа: `withdraw: true` | «Секунды. Не минуты» (текст урока 4.3) |

Финальная подпись в каждом сценарии: **«Сегодня это dry-run — потеряны только нервы. Через 8 недель тот же конфиг — реальный депозит»**.

### Этап D. «Итог»
- Правая панель: «Поверхность атаки 0/4 · Чисто». Иллюстрация SSH-туннеля: ноутбук ⇄ туннель ⇄ VPS:8080, интернет снаружи — «глухая стена». Команда из урока с переводом: `ssh -L 8080:127.0.0.1:8080 user@vps` → «пробрось мой порт 8080 внутрь сервера по защищённому каналу».
- Чек-лист «Перед каждым запуском» (5 пунктов, копируется в журнал E5 как заметка и отмечается в чек-листе допуска FT-20, пункт «Безопасность конфига»).
- Контрольный вопрос (1 из 3 случайных):
  1. «Ты поставил `127.0.0.1`, но хочешь смотреть FreqUI с телефона в кафе. Что делать?» ✓ SSH-туннель / ✗ вернуть 0.0.0.0 «на часик» / ✗ открыть порт и поставить пароль посложнее.
  2. «Пароль сменён на 30 символов, `jwt_secret_key` остался из документации. Насколько закрыта дверь?» ✓ Не закрыта: подписать себе токен можно без пароля / ✗ Закрыта на 90% / ✗ Закрыта полностью.
  3. «В dry-run ключи биржи не нужны. Зачем тогда вообще думать о безопасности сейчас?» ✓ Пульт управления ботом уже публичен, а конфиг наследуется микро-лайвом / ✗ Незачем, денег нет / ✗ Только ради оценки в курсе.

## 1.7. Счёт

- Старт 100. Найденная дыра +0 (обязательна), верная починка с 1-й попытки +0; неверная попытка починки −5; ложная пометка −10; подсказка −8; побочный вред −15 (с откатом).
- Итог отображается как «Риск-офицер: 100/100» и звание: 90+ «Дверь заперта», 70–89 «Заперта, но ключ искал долго», <70 «Пройди ещё раз: атакующему хватит одной дыры».
- Прохождение засчитывается при любом счёте, если все 4 дыры закрыты.

## 1.8. Подсказки (3 уровня, по возрастанию)

1. Направление: «Посмотри на правую панель: если сканер видит порт — виноват адрес, а не порт».
2. Секция: «Одна дыра в `api_server` — не пароль».
3. Строка: подсветка конкретной строки без ответа.

## 1.9. Тексты карточек «Почему это дыра?» (обязательные строки)

- **0.0.0.0** — «Это адрес „слушать все сетевые интерфейсы“. На VPS у него есть публичный IP — значит, панель управления ботом видна всему интернету. Урок: слушать только `127.0.0.1`, снаружи заходить через SSH-туннель».
- **admin** — «Первая строка любого словаря паролей. Автоматические сканеры перебирают его за доли секунды. Нужен длинный сгенерированный пароль».
- **somethingrandom** — «Это значение из примера официальной документации — его знают все, кто читал документацию, включая атакующих. С известным JWT-секретом можно подписать себе токен доступа и войти без пароля».
- **chat_id пустой** — «Без привязки к твоему chat_id бот отвечает любому, кто напишет ему первым, включая команду `/forceexit all`. Свой chat_id даёт @userinfobot — вставь его и никому не показывай токен бота».
- **ключи биржи в dry-run** — «Песочнице ключи не нужны (FT-02). Ключ в файле на диске — уже инцидент (4.3): файл утекает через бэкап, репозиторий, скриншот».

## 1.10. Языковой слой (токены → карточки)

`api_server` (сервер управления), `listen_ip_address` (какие адреса слушать), `listen_port` (порт), `username`/`password`, `jwt_secret_key` (секрет для подписи токенов входа), `ws_token` (токен потокового канала панели), `telegram.token` (ключ бота от BotFather), `chat_id` (номер твоего чата), `dry_run`, `exchange.key/secret`, `/forceexit`, `/status`, `ssh -L`, `FreqUI`, `SSH-туннель`, `0.0.0.0`, `127.0.0.1 / localhost`.

## 1.11. Модель данных

```json
{
  "id": "ft19_open_0000",
  "mode": "basic|hard",
  "config": { "...": "см. fixture" },
  "holes": [
    {"id":"H1","path":"api_server.listen_ip_address","bad":"0.0.0.0",
     "validator":"ipLocalhost","attackScenario":"scan_panel","points":25},
    {"id":"H2","path":"api_server.password","bad":"admin",
     "validator":"strongSecret:16","attackScenario":"dict_login","points":25},
    {"id":"H3","path":"api_server.jwt_secret_key","bad":"somethingrandom",
     "validator":"randomSecret:32","attackScenario":"jwt_forge","points":25,
     "linked":[{"path":"api_server.ws_token","validator":"randomSecret:16"}]},
    {"id":"H4","path":"telegram.chat_id","bad":"",
     "validator":"ownChatId","attackScenario":"tg_stranger","points":25}
  ],
  "redHerrings":["api_server.listen_port","telegram.enabled","api_server.enabled","dry_run","exchange.key"],
  "remarks":["api_server.username"],
  "collateralRules":[
    {"path":"dry_run","if":"false","msg":"..."},
    {"path":"stake_amount","if":">20 && stake*0.10/dry_run_wallet>0.02","msg":"..."}
  ],
  "state":{"marks":[],"fixed":[],"attempts":{},"hintsUsed":0,"score":100,"collateral":0}
}
```

## 1.12. Интеграция с E2 «Живой конфиг»

Используется компонент E2 в режиме `security`: те же примитивы (структурный рендер JSON, клик-карточки ключей, мгновенный пересчёт правой панели), правая панель — плагин `AttackSurfacePanel` вместо `RiskPanel`. Валидаторы регистрируются в общем реестре E2 (`ipLocalhost`, `strongSecret`, `randomSecret`, `ownChatId`) — они же пригодятся в FT-20 (мини-проверка недели 1) и R7 «Устав как код».

## 1.13. Приёмочные тесты

1. Конфиг-fixture рендерится; правая панель показывает 4/4 и три пункта «кто может управлять».
2. Пометка `listen_port` → ❌, счёт −10; пометка `username` → ⚪, счёт без изменений.
3. `listen_ip_address = "localhost"` → принято с примечанием; `"10.0.0.5"` → отказ.
4. `password = "Admin123"` → отказ с текстом про словарь; `"Fr3qtr@de!"` (10 симв.) → отказ «короткий»; сгенерированный → принято, панель снимает пункт.
5. Починка H2 без H3 → панель всё ещё показывает «вход без пароля возможен» (JWT).
6. `chat_id = "123456789"` → принято; `"123, 456"` → отказ.
7. Установка `dry_run=false` → красный баннер, ошибка `collateral`, кнопка отката возвращает `true`.
8. После 4 починок → этап D, чек-лист записан в E5, флаг `ft20.checklist.infra.security = done` установлен.
9. Сложный режим: заполненные ключи → дыра H5; пустые → принято.
10. Состояние восстанавливается после перезагрузки страницы на любом этапе.

---

# Спек 2. FT-20 «Восемь недель dry-run»

## 2.1. Паспорт

| Поле | Значение |
|---|---|
| ID | `ft20_eight_weeks` |
| Урок | FT-20 «Итоговый проект Freqtrade: от гипотезы до сухого прогона» |
| Место в уроке | После блока «Программа 8-недельного dry-run», до чек-листа допуска (чек-лист урока становится финалом интерактива) |
| Тип | СИМ (понедельная симуляция) + РИТ (E4: воскресный разбор, регламент наблюдения) + журнал (E5) |
| Целевое заблуждение | «Dry-run — формальность: подождать 8 недель и включить реал» |
| Длительность | 15–25 минут; допускается прохождение по частям (сохранение после каждой недели) |
| Пререквизиты | FT-19, FT-19(2), 4.5 (Execution Deviation), П1, П5, П8, П38, 5.6 |
| Критерий освоения | (а) ни одного вмешательства без факта «мир» либо осознанный отказ от микро-лайва при его наличии; (б) верное финальное решение по чек-листу; (в) ученик отличает ED 8% (норма) от 30% (стоп) в контрольном вопросе |

## 2.2. Что интерактив должен доказать ученику (на его собственных руках)

1. Dry-run проверяет **систему + оператора**, а не «идёт ли прибыль»: главные метрики — uptime, сигналы факт/ожидание, Execution Deviation, чистота журнала вмешательств.
2. Вмешательство «по чутью» портит одновременно (а) статистику (ED становится несравнимым), (б) операционный блок чек-листа, (в) собственное состояние — и всё это видно на приборах, а не в нравоучении.
3. Решение о микро-лайве принимает чек-лист утром, а не впечатление недели. 19/20 — это «не готов».

## 2.3. Модель симуляции (ядро)

### 2.3.1. Параметры стратегии (константы, из уроков)

```json
{
  "wallet": 1000, "stake": 150, "maxOpenTrades": 3, "stoploss": -0.10,
  "pairs": ["BTC/USDT","ETH/USDT","SOL/USDT"], "timeframe":"1h",
  "backtest": {
    "tradesPerWeekMean": 2.8,
    "outcomeDist": [
      {"p":0.30,"ret":0.06,"reason":"roi"},
      {"p":0.25,"ret":0.03,"reason":"roi"},
      {"p":0.20,"ret":-0.015,"reason":"exit_signal"},
      {"p":0.15,"ret":-0.06,"reason":"exit_signal"},
      {"p":0.10,"ret":-0.10,"reason":"stop_loss"}
    ],
    "feeRoundTrip": 0.002,
    "expectedWeekDD_p95": -0.08,
    "expectedMaxStreakLoss": 8
  }
}
```
Ожидание на сделку ≈ +0,35% брутто / ≈ +0,15% нетто (согласуется с арифметикой FT-13: «средний профит на сделку +0,4%»). Агент может подстроить веса, сохраняя: EV нетто слабо положительное, недельный шум большой, P95 недельной просадки ≈ −8% депозита (число из урока: «готовность к просадке −8% недели»).

### 2.3.2. Генерация недели

- Seeded RNG (`seed` выбирается: «Сценарий урока» — фиксированный seed, воспроизводящий кейс из «Проверь себя»; «Случайный рынок» — новый seed).
- Режим недели: `flat | trend_up | trend_down | spike | crash`. Ограничения плана (из урока): недели 4–5 гарантированно содержат `flat` или `spike/crash` (первый кризис-тест); хотя бы одна неделя за кампанию — `crash` с ночным стопом.
- Число сделок недели ~ Poisson(2,8), модифицируется режимом: `flat ×0.5`, `spike ×1.6`.
- Для каждой сделки генерируются **две реализации**:
  - `backtestPnL` — по `outcomeDist` (это «что показал бы бэктест на тех же датах»);
  - `dryPnL = backtestPnL − friction`, где `friction` = проскальзывание 0,03–0,15% на сторону (в `spike/crash` до 0,4%) + с вероятностью 7% лимитная заявка не исполнилась → сделка **пропущена** в dry-run (нет в статистике, но есть в бэктесте) + с вероятностью 3% частичное исполнение (pnl ×0,5).
- Аптайм недели: базово 100%; события инфраструктуры вычитают часы.

### 2.3.3. Переменные состояния

```ts
type CampaignState = {
  week: 1|…|8, seed: number,
  uptimePct: number[],            // по неделям
  signalsExpected: number[], signalsActual: number[],
  trades: Trade[],                // {week, pair, backtestPnL, dryPnL, reason, skipped, forcedExit?}
  equityDry: number, equityBacktest: number,
  ed: number | null,              // cumulative Execution Deviation, null если < 5 сделок или "несравнимо"
  edComparable: boolean,          // false после правки параметров
  emotion: number,                // 1..10, старт 2
  peeksThisWeek: number, peeksTotal: number,
  journal: JournalEntry[],        // E5
  interventions: Intervention[],  // {week, command, hasWorldFact, factText, atNight, cost}
  paramsTouchedAfterFinalBacktest: boolean,
  rituals: {sundayReview: boolean[], dailyProfitDone: boolean[]},
  checklist: ChecklistItem[20],
  counterfactual: {equityDry, ed, interventions:0}  // "призрак": та же неделя без вмешательств
}
```

### 2.3.4. Execution Deviation

- `ED = (ΣdryPnL − ΣbacktestPnL) / |ΣbacktestPnL|` по сделкам, **присутствующим в бэктесте** (пропущенные сделки учитываются как dryPnL = 0 — это и есть «пропуски из-за неисполнения»).
- Показывается с недели 3 или при ≥ 5 сделках; до этого — «мало данных».
- Зоны из урока 4.5: `|ED| < 10%` норма (зелёная), `10–25%` серая («модель исполнения оптимистична — уточнять»), `> 25%` стоп («масштабировать нельзя»).
- Честная игра даёт ED 5–12% (целевой диапазон — покрыть тестами).
- Ручной `/forceexit` закрывает открытые позиции по «рынку»: `dryPnL = текущий нереализованный − 1,0%`; сделка помечается `forcedExit`, её `backtestPnL` остаётся бэктестовым → ED уходит вверх.
- Любая правка `stoploss/roi/rsi_buy/stake` → `edComparable = false`, прибор показывает «— (несравнимо: параметры изменены после финального бэктеста)» и чек-лист «стоп/ROI не тронуты» краснеет.

### 2.3.5. Шкала состояния (1–10, из П19)

| Событие | Δ |
|---|---|
| Ночное уведомление (стоп/ошибка) | +1; если открыл терминал ночью +1 доп. |
| Неделя с просадкой > 4% депозита | +1; > 8% → +2 |
| Серия ≥ 3 стопов | +1 |
| Социальное событие (скриншот друга, чат «бот сломался») | +2 |
| Каждое подглядывание сверх регламента | +0,5 |
| Записал строку в журнал / вечерний дебрифинг | −1 |
| Воскресный разбор выполнен | −1 |
| Выбор «спать / прогулка» в ночном событии | −1 |
| Вмешательство без факта (после — короткое облегчение, потом откат) | −1 сразу, +2 на следующей неделе |
Клэмп 1–10. Подписи зон: 1–2 «спокойствие», 3–5 «рабочее напряжение», 6–8 «скрытое напряжение — решения не принимаются», 9–10 «тильт — терминал закрыт». При ≥ 7 кнопки вмешательства визуально «зудят» (лёгкая анимация «рука тянется») — чтобы ученик почувствовал давление, но выбор остаётся за ним.

## 2.4. Экран (макет)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Неделя ●●●○○○○○  3 из 8 · «Накопление сделок»        [Журнал] [Устав]│
├───────────────────────────┬───────────────────────────────────────────┤
│ ПУЛЬТ (Telegram-эмулятор) │ ПРИБОРЫ КАМПАНИИ                         │
│ 09:00 /profit → сводка    │ Uptime: 99,4%  ▮▮▮▮▮▮▮▮▮▯                │
│ 14:12 Позиция открыта     │ Сигналы: ожид. 2–4 / факт 3 ✓            │
│   SOL/USDT 150 USDT       │ Сделок: 8  · открыто 1                   │
│ 03:12 ⚠ Стоп SOL −10%     │ Execution Deviation: 6,8% ● норма        │
│ [Открыть FreqUI сейчас]   │  ├ норма <10 ─┼─ серая 10–25 ─┼─ стоп ┤   │
│ (подглядываний: 1/2)      │ Состояние: 4/10 ▮▮▮▮▯▯▯▯▯▯               │
│                           │ Кривая: dry (синяя) / ожидание (серая    │
│                           │ полоса ±шум) / призрак без вмешательств  │
├───────────────────────────┴───────────────────────────────────────────┤
│ СОБЫТИЕ НЕДЕЛИ (модальная карточка)                                   │
│ ...текст... [Выбор 1] [Выбор 2] [Выбор 3]                             │
├───────────────────────────────────────────────────────────────────────┤
│ ЖУРНАЛ (E5): вмешательства · недели · дебрифинг     [Воскресный разбор]│
└───────────────────────────────────────────────────────────────────────┘
```

## 2.5. Ход одной недели (сценарий)

1. **Понедельник — план недели.** Карточка: цель недели по программе урока (см. 2.6), ожидание сигналов (диапазон), напоминание регламента: «/profit — раз в день; FreqUI — воскресенье; ночью — только белый список».
2. **События (1–2 на неделю)** из банка 2.7 с учётом режима недели. Каждое событие → выбор → эффекты → запись в журнал (автоматическая для фактов, ручная для решений).
3. **Кнопка «Открыть FreqUI сейчас»** доступна всегда: первые 2 нажатия в неделю — «плановые» (утро/вечер, П12), каждое следующее — «подглядывание» (счётчик П6, +0,5 к состоянию, показывает только шум: «за 4 часа изменение −0,3%»).
4. **Перехват вмешательств (R1).** Любой выбор с `isIntervention` открывает модалку «Два вопроса»:
   - Вопрос 1 «Назови факт — что изменилось в мире?» — список чекбоксов, сформированный из реальных фактов текущей недели (например, «нет связи с биржей 15+ минут», «цены бота не совпадают с биржей», «ошибка API 5 раз подряд», «я сам менял код») + «Не могу назвать факт».
   - Вопрос 2 «Подождёт ли до утра?» да/нет.
   - Если факт назван и он **истинный для этого события** → кнопка «Действовать» (вмешательство с фактом, журнал: «мир»). Если факт не назван или ложный → кнопка «Всё равно вмешаться (по чутью)» — активна, но помечена; журнал: «голова». Кнопка «Отложить до утра» → событие переходит в утреннюю сводку с другим набором выборов.
5. **Воскресный разбор (E4-ритуал).** Пять галочек П2 с автозаполненными значениями из симуляции: журнал ошибок пуст? сделки совпадают с планом (сигналы факт/ожид)? результат в пределах ожидаемой болтанки (недельный PnL vs P95)? издержки не выросли (ED)? биржа/инструмент правила не меняли (событие)? Ученик ставит галочки; неверная галочка (например, «издержки не выросли» при ED 22%) → мягкая правка: «Прибор говорит иначе: 22% — серая зона». Пропуск ритуала (кнопка «Пропустить неделю») → флаг регламента, чек-лист «Регламент соблюдён» теряет неделю.
6. **Трёхстрочный вечерний дебрифинг (П8)** — раз в неделю, обязательный минимум: «Главное решение недели / Правило или эмоция / Чувство одним словом». Свободный текст, сохраняется в E5.
7. **Карточка закрытия недели**: uptime, сигналы, сделки, PnL dry vs ожидание, ED, состояние, строки журнала, статус недели по программе (✓ / ⚠). Кнопка «Следующая неделя».

## 2.6. Недельные цели (из программы урока) и авто-оценка

| Неделя | Цель (текст урока) | Условие «✓» |
|---|---|---|
| 1 | Инфраструктура живёт 7 дней без рестартов; ночные уведомления проверены; регламент написан; безопасность конфига | uptime ≥ 95%, обработано событие «тест ночного алерта», выбран регламент из 3 шаблонов, мини-проверка конфига (переиспользует валидаторы FT-19(2): 3 строки, 1 дыра) |
| 2–3 | Накопление сделок; ежедневно /profit; еженедельно /daily | ≥ 4 сделок суммарно, воскресные разборы выполнены |
| 4–5 | Первый кризис-тест; записывать эмоции (П5) | пройдено кризисное событие, дебрифинг записан, вмешательств без факта — 0 |
| 6–7 | Сверка ED по каждой сделке | открыта таблица «сделка: dry vs бэктест», ученик отметил 2 самых больших расхождения и выбрал причину (проскальзывание / пропуск исполнения / частичное / ручной выход) |
| 8 | Чек-лист допуска; письменное решение утром | пройден финал (2.8) |

## 2.7. Банк событий (минимум 14; поля: id, недели, режим, текст, выборы, эффекты, обратная связь)

Формат выбора: `{label, isIntervention, trueFacts[], effects{uptime, emotion, ed, journalAuto}, feedback}`.

| ID | Недели / режим | Текст (сокр.) | Выборы → эффекты |
|---|---|---|---|
| E01 `night_alert_test` | 1 | «02:40. Ты сам настроил тестовое уведомление. Оно пришло. Что ставишь в белый список ночи?» | Выбор 2–3 событий из 6 чипов (нет связи 15+ мин; сработал kill-switch; бот отправил приказ, которого не мог; минус 3%; странный сигнал; новость про запрет). Верно: первые три. Неверные — объяснение П5 |
| E02 `api_error_burst` | 2–7, любой | «14:05. Лог: 5 ошибок API подряд, бот перешёл в safe mode, соединение восстановилось через 12 минут» | A «Записать факт, проверить логи вечером» (не вмеш., uptime −0,1%) · B «Перезапустить контейнер немедленно» (вмеш. **с фактом** «ошибки API 5 подряд» → ок, журнал „мир“) · C «/forceexit all — мало ли» (вмеш., факт про API истинный, но действие несоразмерное → принимается как «с фактом», ED +3%, feedback: «Факт был, но соразмерность — часть протокола: ошибка API не требует закрытия позиций») |
| E03 `stuck_order` | 3–7 | «Лимитная заявка на ETH висит 40 минут, `unfilledtimeout` не сработал из-за рестарта» | A «Отменить заявку вручную, записать» (вмеш. с фактом «заявка зависла дольше таймаута» → ок) · B «Ничего не делать» (сигнал пропущен, ED +1%) · C «Поднять `unfilledtimeout` в конфиге прямо сейчас» (правка параметров → `edComparable=false`, R12) |
| E04 `night_stop` | 4–8, `crash`/`spike` | «03:12. Позиция SOL закрыта по стопу −10% (−15 USDT). Рынок в целом спокойный, ошибок в логе нет» (= кейс «Проверь себя» FT-19) | A «Записать в журнал и спать» (−1 состояние) · B «Открыть терминал одним глазком» (+1, подглядывание) · C «/forceexit остальных, пока не поздно» (вмеш., фактов нет → «по чутью», ED +4%, оператор-блок красный) |
| E05 `three_stops_row` | 4–7 | «Три стопа за сутки на разных парах. StoplossGuard поставил паузу входов на 12 свечей. Друг в чате: „бот сломался“» | A «Сверить серию с ожидаемой (макс. серия ≈ 8): в норме, записать» · B «Отключить бота до понедельника» (вмеш. без факта; пропуск восстановления: призрак покажет упущенное) · C «Уменьшить stake до 75 „пока не устаканится“» (правка параметров) |
| E06 `flat_week` | 4–5, `flat` | «Неделя без единого сигнала. Ожидание было 2–4. Скучно» (П6) | A «Открыть журнал, записать, что скука — норма» (−1) · B «Добавить второй индикатор, чтобы сигналов стало больше» (правка кода после финального бэктеста → допуск аннулирован, R12) · C «Открыть FreqUI 5 раз за день» (+2,5, 5 подглядываний) |
| E07 `friend_screenshot` | 3–7 | «Друг присылает скриншот +300% за неделю на мемкоине. Твой dry-run: +1,9% за месяц» (П43) | A «Сверить со своим мандатом: цель, лимиты, горизонт» · B «Добавить мемкоин в whitelist» (правка) · C «Увеличить stake до 300» (правка + риск 3% → чек-лист «stake 1–2%» красный) |
| E08 `exchange_down` | 5–7 | «Биржа сообщила о техработах на 2 часа; бот пишет ошибки соединения; позиция открыта» | A «Записать факт, проверить после техработ» · B «Нажать /stop до окончания работ» (вмеш. с фактом «биржа сообщила о техработах» — ок) · C «Вручную выставить стоп на другой бирже» (несоразмерно; feedback про 5.7 — на другой бирже нет позиции) |
| E09 `logs_disk` | 2–3 | «VPS: диск заполнен на 91%. В `user_data/logs` 6 ГБ» (4.2) | A «Включить ротацию логов» (чек-лист „логи ротируются“ ✓) · B «Удалить логи руками и забыть» (через 2 недели событие повторится) · C «Игнорировать» (на неделе 6 uptime −30%: бот упал) |
| E10 `killswitch_drill` | 3 или 5 | «Учения: проверь внешний kill-switch (4.4). Он должен убить бота целиком» | A «Провести учения в воскресенье, записать время срабатывания» (чек-лист ✓) · B «Потом, он же простой» (чек-лист ✗ до конца) |
| E11 `evening_idea` | 2–7 | «21:40. Устал. В голову пришла „гениальная идея“ поменять ROI-лестницу» (П12) | A «Записать идею в журнал, утром перечитать» (−1) · B «Поменять сейчас, вечер же спокойный» (правка → аннулирование) |
| E12 `gap_crash` | 5–7, `crash` | «Гэп −7% на открытии свечи. Стоп исполнился по −11,8% вместо −10% (FT-09)» | A «Записать как факт исполнения, включить в сверку ED» · B «Поставить стоп ближе, −5%» (правка) · C «/forceexit всего „чтобы не повторилось“» (без факта) |
| E13 `tax_export` | 6 | «Пора настроить экспорт сделок для будущей 3-НДФЛ (4.6)» | A «Настроить экспорт CSV раз в месяц» (чек-лист „выписки“ ✓) · B «Это же dry-run, потом» (✗; feedback: настройка наследуется) |
| E14 `trusted_person` | 7 | «Кто, кроме тебя, знает, где kill-switch и как остановить бота, если ты в больнице?» (П43) | A «Рассказать доверенному лицу, записать инструкцию» (✓) · B «Никто и не нужен» (✗) |
| E15 `great_week` | 3–6, `trend_up` | «Лучшая неделя: +6,4%. Шёпот: „ставь вдвое“» (П3) | A «Риск — по расписанию устава; записать» · B «Удвоить stake» (правка + риск) · C «Снять половину „прибыли“ dry-run» (безвредно; feedback про одну сумму) |

Правила банка: недели 4–5 обязательно получают одно из E04/E05/E06/E12; E01 всегда неделя 1; E09/E10/E13/E14 — по одному разу на кампанию; на неделю не более 2 событий; ночные события помечены `atNight`.

## 2.8. Финал: чек-лист 20/20 и решение

### 2.8.1. Состав чек-листа (ровно 20 пунктов, автозаполнение из состояния)

| Блок | Пункт | Правило закрытия |
|---|---|---|
| Бэктест (4) | lookahead-analysis зелёный; recursive-analysis зелёный; честный fee + оценка проскальзывания; OOS + робастность ±20% | предзакрыты с меткой «лаборатория FT-13/FT-16» (если в приложении есть результаты FT-11/FT-13/FT-16 — импортировать их статус и даты) |
| Инфраструктура (5) | dry-run непрерывно 4+ недели | uptime ≥ 98% в неделях 5–8 и нет незапланированных перезапусков |
| | логи ротируются | E09-A |
| | Telegram и FreqUI работают | неделя 1 ✓ |
| | безопасность конфига | FT-19(2) пройден или мини-проверка недели 1 без дыр |
| | kill-switch описан и протестирован | E10-A |
| Риск (3) | stake 1–2% депозита | `stake·0.10/wallet ∈ [0.01;0.02]` на конец кампании |
| | суммарный риск ≤ 6% | `maxOpenTrades·stake·0.10/wallet ≤ 0.06` |
| | стоп/ROI/параметры не тронуты после финального бэктеста | `paramsTouchedAfterFinalBacktest == false` |
| Оператор (4) | журнал вмешательств ведётся | ≥ 1 запись на каждое событие с выбором |
| | каждое вмешательство имело факт «мир» | `interventions.every(hasWorldFact)` |
| | регламент наблюдения соблюдён ≥ 2 недели подряд | 2 подряд недели: воскресный разбор ✓ и подглядываний ≤ 2 |
| | доверенное лицо знает, где kill-switch | E14-A |
| Юр/налоги (2) | налоговая модель понята | мини-вопрос финала (1 из 2, из урока 4.6: спецбаза 13/15%, сроки 30 апреля / 15 июля) |
| | выписки сохраняются | E13-A |
| Психология (2) | готовность к −N% недели подтверждена письменно | показывается худшая неделя кампании и P95 (−8%); поле «Подтверждаю, что переживу неделю −8% (−80 USDT / ~8 000 ₽) не трогая бота» — свободный текст ≥ 20 символов + чекбокс |
| | сумма микро-лайва — та, потерю которой допускаю | выбор из карточек: «100–200 тыс ₽, ≤5% капитала» ✓ / «всё, что есть» ✗ / «кредитные» ✗ (5.1) |

Отдельный **допуск вне чек-листа**: ED < 10% (норма) — показывается рядом как «Ворота 21».

### 2.8.2. Экран решения

«Понедельник, неделя 9, 09:00. Ты выспался. Перед тобой чек-лист» — три кнопки: **Продолжить dry-run / Вернуть в доработку / Микро-лайв**.

Логика оценки выбора:
- 20/20 и ED < 10 → верно «Микро-лайв». Феедбэк: лестница 5.1 (микро-депозит, риск 1–2%, параллельный dry-run, транши +20–25%).
- ED ≥ 25 или `edComparable=false` или тронуты параметры → верно «Вернуть в доработку».
- Остальное (19/20, ED серая, оператор-блок красный) → верно «Продолжить dry-run» + конкретный список незакрытых пунктов.
- Если ученик выбрал «Микро-лайв» при незакрытых пунктах → показывается **«Три способа обмануть чек-лист»** из урока с подсветкой того, который он применил («сделок мало, но все удачные» / «доработаю потом» / «депозит маленький»), и вопрос: «Пункт X закрыт?» — да/нет. Решение не принимается, пока ученик сам не переставит выбор или не нажмёт «Настаиваю» (тогда прохождение засчитывается как «не освоено», предлагается перепройти сценарий урока).

### 2.8.3. Призрак (обязательная сцена финала)

Две кривые: «твоя кампания» и «та же кампания без вмешательств по чутью и без правок». Подпись с числами: «Твои вмешательства: N. Стоили: X USDT и +Y п.п. к Execution Deviation. Ни одно не имело факта „мир“» (или «Все имели факт — призрак совпадает с тобой»). Это связка с П1 («девять из десяти спасений стоили денег»).

### 2.8.4. Контрольный вопрос (обязательный, из урока)

«Dry-run прошёл 8 недель, ED 8%, но дважды хотелось вмешаться „по чутью“ и один раз ночью нажат /forceexit без факта. Вердикт?» ✓ «Допуск не проходит: операционный блок требует чистого журнала; продлить dry-run и отработать протокол П1» / ✗ «Проходит: ED в норме» / ✗ «Проходит с оговоркой: один раз не считается».

## 2.9. Режим «Сценарий урока» (фиксированный seed)

Заранее заданная последовательность: нед.1 E01+E09; нед.2 E02; нед.3 E07+E10; нед.4 E06; нед.5 E04 (`crash`)+E12; нед.6 E13+E03; нед.7 E14+E15; нед.8 — сверка и финал. Честное прохождение даёт ED ≈ 8% и 20/20. Один `/forceexit` в E04-C даёт ED ≈ 12% и оператор-блок красный — ровно кейс из урока. Это seed для приёмочных тестов.

## 2.10. Интеграция с движками

- **E4 «Ритуал»**: воскресный разбор и «/profit раз в день» регистрируются как ритуалы кампании; после завершения интерактива приложение предлагает «прикрутить» их к реальному расписанию ученика (напоминания вс 19:00 и ежедневно 09:00) — стрик продолжается уже вне симуляции.
- **E5 «Журнал»**: записи симуляции пишутся в общий журнал с тегом `sim:ft20` в разделы «вмешательства» (П1), «вечерний дебрифинг» (П8), «дневник искажений» (П44 — при вмешательстве без факта предлагается чип категории: action bias / recency / automation bias / algorithm aversion / sunk cost; выбор не обязателен).
- **R1** — модалка «Два вопроса» берётся из общего компонента, не переписывается.
- **R12** — «правило одного изменения»: любая правка параметров в симуляции блокируется на неделю с текстом «эффект первой правки ещё не измерен»; вторая правка в ту же неделю невозможна.
- **FT-19(2)** — мини-проверка недели 1 переиспользует валидаторы `ipLocalhost`, `strongSecret`, `ownChatId`.
- **4.5 «Калькулятор Execution Deviation»** — прибор ED использует тот же расчётный модуль и те же зоны.

## 2.11. Языковой слой (токены → карточки)

`dry-run`, `uptime`, `Execution Deviation`, `/profit`, `/daily`, `/status`, `/stopentry`, `/forceexit`, `/stop`, `FreqUI`, `StoplossGuard`, `safe mode`, `unfilledtimeout`, `stake_amount`, `max_open_trades`, `stoploss`, `minimal_roi`, `whitelist`, `kill-switch`, `VPS`, `CSV`, `P95` («уровень, хуже которого бывает лишь 5% недель»). Сообщения Telegram-эмулятора выводятся сразу по-русски с оригинальной командой в скобках.

## 2.12. Схемы данных (сокращённо)

```json
{
  "event": {
    "id":"E04","weeks":[4,5,6,7,8],"regimes":["crash","spike"],"atNight":true,
    "title":"03:12 · Стоп по SOL","text":"...",
    "trueFacts":[],
    "choices":[
      {"id":"A","label":"Записать в журнал и спать","isIntervention":false,
       "effects":{"emotion":-1,"journalAuto":"Стоп SOL −10% — штатная работа. Мир не изменился."},
       "feedback":"Верно. Стоп в пределах плана — не событие..."},
      {"id":"C","label":"/forceexit остальных","isIntervention":true,
       "command":"forceexit","effects":{"edDelta":0.04,"emotion":-1,"emotionNextWeek":2},
       "feedback":"Ты закрыл две позиции по рынку ночью. Фактов не было..."}
    ]
  },
  "intervention":{"week":5,"command":"forceexit","hasWorldFact":false,"factText":null,"atNight":true,"costUsdt":-9.4,"edDelta":0.04},
  "checklistItem":{"id":"op_fact","block":"operator","title":"Каждое вмешательство имело факт «мир»","rule":"interventions.every(i=>i.hasWorldFact)","done":false,"closedAtWeek":null,"evidence":"Вмешательство нед.5: /forceexit без факта"}
}
```

## 2.13. Приёмочные тесты

1. **Детерминизм:** два прогона с одним seed и одинаковыми выборами дают идентичное состояние.
2. **Сценарий урока, честная игра:** ED в [5%; 12%], чек-лист 20/20, верное решение «Микро-лайв»; призрак совпадает с игроком.
3. **Сценарий урока + E04-C:** ED > 10%, пункт «каждое вмешательство имело факт» ✗, оператор-блок красный; верное решение «Продолжить dry-run»; призрак показывает разницу ≥ 5 USDT.
4. **E02-B (рестарт при ошибках API):** вмешательство записано с `hasWorldFact=true`; чек-лист оператора не страдает.
5. **Любая правка параметров (E03-C, E06-B, E07-B/C, E11-B, E12-B, E15-B):** `edComparable=false`, прибор ED показывает «несравнимо», пункт «стоп/ROI не тронуты» ✗, повторная правка в ту же неделю заблокирована (R12).
6. **Подглядывания:** 3-е нажатие «Открыть FreqUI» в неделе увеличивает счётчик и состояние на +0,5; две недели подряд с ≤ 2 подглядываниями и выполненным разбором закрывают пункт «регламент».
7. **E09-C:** на неделе 6 uptime падает ниже 98% → пункт «непрерывность 4+ недели» ✗.
8. **Модалка R1:** без выбранного факта кнопка «Действовать» недоступна, доступна «Всё равно вмешаться (по чутью)»; выбор ложного факта (например, «нет связи» при событии E04, где связь была) трактуется как «без факта» с пояснением.
9. **Финал при 19/20 и выборе «Микро-лайв»:** появляется блок «Три способа обмануть чек-лист», решение не фиксируется до пересмотра.
10. **Психология:** текст подтверждения < 20 символов не закрывает пункт.
11. **Сохранение:** закрыть вкладку на неделе 4 во время модалки события → после восстановления модалка открыта в том же состоянии.
12. **Ритуалы:** после `complete` в E4 появляются два ритуала с предложением активировать напоминания; в E5 — записи с тегом `sim:ft20`.
13. **Языковой слой:** каждый токен из 2.11, встречающийся в UI, кликабелен и показывает карточку.

## 2.14. Метрики эффективности (для проверки после внедрения)

- доля прохождений без вмешательств «по чутью» (цель: рост от первого ко второму прохождению ≥ 30 п.п.);
- доля верных финальных решений при 19/20;
- средняя дельта «состояния» на кризисной неделе у тех, кто пишет дебрифинг, против тех, кто пропускает;
- доля учеников, активировавших ритуалы E4 после симуляции и удержавших их 30 дней.
