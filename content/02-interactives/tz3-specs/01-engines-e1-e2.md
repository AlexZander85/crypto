<!--
Источник: fable_new_adventure_spec.md (поставка эксперта 2026-09-06), строки 1–526.
Дословно, без правок. Разбиение — scripts/split_adventure_spec.py.
-->

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

