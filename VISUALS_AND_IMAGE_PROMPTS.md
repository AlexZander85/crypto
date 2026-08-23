# ВИЗУАЛИЗАЦИИ И СИМУЛЯТОРЫ — план усиления тренажёра
Комpanion-файл к `AUDIT_CONTENT_PEDAGOGY_2026-08-23.md`. Дата: 23.08.2026.
Формат каждого пункта: **что** → **где вставить** → **механика** → **какой навык закрепляет** → приоритет (P0/P1/P2).

## 0. Принципы отбора
1. Визуализация обязана показывать то, что текстом понимается плохо: динамику во времени, одновременность процессов, распределения, компаундирование.
2. Интерактив = принудительное извлечение (Active Recall): игрок решает, система показывает расхождение с реальностью, затем дебрифинг в 2–3 строки.
3. Ошибки в мини-играх — это целевая зона развития (~15% ошибок): игра должна позволять ошибаться дёшево и сразу видеть последствия.
4. Никаких новых абстракций ради красоты: каждый виджет привязан к конкретному уроку и квизу.

---

## 1. НОВЫЕ СИМУЛЯТОРЫ И МИНИ-ИГРЫ

### Фаза 0 (ядро новичка — высший приоритет)
**G-01 «Гонка блоков»** → урок 0.1, рядом с widget_p0_l1.
Механика: сеть из 8 узлов анимированно пересылает транзакции; появляется «жуликоватый блок» от одного узла. Игрок выбирает: (а) принять блок, (б) отвергнуть по правилам протокола, (в) подождать следующий блок. Показывается форк и его orphan-судьба. Дебрифинг: узлы не голосуют — каждый проверяет правила; действительная цепочка — та, которую протокол считает канонической.
Закрепляет: исправленную модель консенсуса (вместо «голосования большинства» из аудита §2). P0.

**G-02 «Маркетмейкер на минуту»** → уроки 0.4/0.9 (после спреда и стакана).
Механика: ты выставляешь bid и ask вокруг «справедливой» цены, которая дрейфует (случайное блуждание со сдвигом при новостных тиках). Поток заявок: часть «безобидная», часть «токсичная» (приходит перед движением цены). Счётчик: заработанный спред − инвентарные потери. После 60 секунд — разбор: почему узкий спред на токсичном потоке разоряет.
Закрепляет: происхождение спреда, adverse selection на интуитивном уровне, почему maker-ликвидность не бесплатна. Это готовит к Post-Only логике Фазы 3. P0.

**G-03 «Ликвидационный коридор»** → урок 0.16, апгрейд widget_p0_l16.
Механика: 2D-полотно: цена идёт случайным блужданием, справа вертикальная красная стена ликвидации; между ценой и стеной заштрихованная буферная зона MMR. Ползунок плеча двигает стену ближе/дальше в реальном времени; кнопка «прогнать месяц» рисует 50 траекторий и % выживших.
Закрепляет: MMR-оговорку из аудита (ликвидация раньше «плечо × движение»), связь плечо→вероятность выживания статистически, а не на одном примере. P0.

**G-04 «Веер из 500 траекторий»** → урок 0.15, апгрейд сравнения стратегий А/Б.
Механика: вместо двух кривых капитала — Монте-Карло веер: медиана + 10–90 перцентиль для стабильной и волатильной стратегий при одинаковой средней доходности. Ползунок горизонта (10/50/200 сделок). Видно, как у стратегии Б нижний перцентиль уходит в глубокий минус.
Закрепляет: дисперсия = риск хвоста, а не «болтанка нервов»; подготовка к языку перцентилей в Фазах 1–3. P1.

### Фаза 1 (research-конвейер)
**G-05 «Слайдер толстых хвостов»** → урок 1.2, апгрейд widget_fattails.
Механика: наложение нормального распределения и t-распределения с ползунком степеней свободы; под графиком живой счётчик «ожидаемых дней ±15% за 10 лет» для каждой кривой; кнопки-маркеры реальных крахов ложатся на хвосты.
Закрепляет: эксцесс через частоты событий, а не формулу; лечит «раз в 85 лет»-нестыковку наглядной арифметикой. P1.

**G-06 «Найди утечку: diff-игра»** → урок 1.7, апгрейд inline-фрагментов.
Механика: 20 строк кода бэктеста; игрок кликом помечает подозрительные строки; подсчёт precision/recall; после сдачи — зелёная подсветка настоящих утечек (shift(-1), Z-score по всей выборке, ресемплинг label=left…) с объяснением каждой.
Закрепляет: детекцию look-ahead как навык чтения кода, а не списка. P1.

**G-07 «Карта плато параметров»** → урок 1.12, апгрейд робастности ±20%.
Механика: тепловая карта Sharpe на сетке двух параметров (окно MA × порог z). Генерируются два режима: «пик» (одна яркая клетка) и «плато» (область). Игрок должен решить: какой режим годен и почему. Кнопка «показать OOS» перекрашивает карту — пик исчезает, плато остаётся.
Закрепляет: робастность как свойство области, а не точки. P1.

### Фаза 2 (alpha research)
**G-08 «Санкей потоков»** → урок 2.3, апгрейд on-chain виджета.
Механика: анимированная диаграмма потоков между кластерами (киты → биржи → холодные кошельки); переключатели периода (спокойный/памп/крах) меняют толщину потоков; рядом гейдж Netflow. Мини-задача: «по картинке угадай, что случится со стаканом на следующей сессии».
Закрепляет: netflow как баланс давления, а не магический сигнал. P1.

**G-09 «Ловец спуфинга»** → урок 2.5 (у виджета уже есть фильтр спуфинга — сделать отдельным мини-режимом).
Механика: стакан обновляется в записи-реплее (30 секунд); крупные слои появляются и снимаются; игрок жмёт «СПОФ» в момент, когда считает слой фиктивным; скоринг с таймстемпами; разбор: слой снят до касания цены = признак.
Закрепляет: микроструктурную наблюдательность; защита от сигналов «толстый bid = поддержка». P2.

### Фаза 3 (риск)
**G-10 «Келли-веер»** → урок 3.3, апгрейд kelly-сима.
Механика: Монте-Карло 1000 траекторий для Full/Half/Quarter Kelly с полосами перцентилей и метками «доля траекторий с просадкой >50%». Исправленные константы из аудита (43.75%/75%) выводятся прямо на экране формулой g(kf)/g(f*)=2k−k².
Закрепляет: дробный Келли как trade-off рост/просадка с честными числами. P0 (вместе с правкой контента К4).

**G-11 «Резиновая лента коинтеграции»** → урок 3.1/3.2.
Механика: спред двух активов рисуется как растяжимая лента вокруг оси среднего; z-score гейдж сбоку; зоны входа/выхода/стопа покрашены; кнопки сценариев: «нормальный ретёрн», «расхождение», «breakdown коинтеграции» — последний рвёт ленту и меняет среднее.
Закрепляет: mean reversion интуитивно + главный риск парного трейдинга (смена режима). P1.

**G-12 «Матрица корреляций: штиль vs крах»** → урок 3.6, апгрейд стресс-теста.
Механика: тепловая матрица 6×6 активов; слайдер «стресс дня» плавно морфит корреляции к единице по строкам рисковых активов; рядом кривая портфеля «диверсифицированного» и «реально ведущего себя как одна позиция».
Закрепляет: correlation breakdown до того, как ты увидишь его на своих деньгах. P1.

### Фаза 4 (продакшн)
**G-13 «Карта инфраструктуры: точка отказа»** → урок 4.2, расширение Chaos-сима.
Механика: граф бот→VPS(Docker)→API биржи→БД→Telegram-алерты. Игрок кликает узел и выбирает поломку (WS отвалился / диск полон / ключ истёк / часовой пояс съехал). Сценарий проигрывается: что заметит мониторинг, что произойдёт с позицией без Kill-Switch и с ним.
Закрепляет: отказоустойчивость как цепочку, а не список терминов; практика решения «бот упал ночью». P1.

**G-14 «FIFO-очередь налогов»** → урок 4.6, апгрейд налогового сима (после правки шкалы НДФЛ!).
Механика: покупки-лотки встают в очередь как вагончики с ценой и датой; продажа забирает вагоны слева; итоговая база и налог считаются по полной прогрессии 13/15/18/20/22; переключатель «FIFO / по стоимости единицы» показывает разницу.
Закрепляет: метод учёта через осязаемую очередь лотов. P0 (в связке с контентной правкой К5).

### Фаза 5 (живые деньги)
**G-15 «Строитель крепости хранения»** → урок 5.7 (+ примирение с 5.3).
Механика: бюджет 6 млн ₽ распределяется по ячейкам: холодный кошелёк / CEX-A / CEX-B / DeFi-протокол; валидатор правил из урока 5.7 (≤20% на контрагента, ≤30–40% суммарно на площадках); после подтверждения — карточка сценария «биржа X заморожена на месяц» и перерасчёт доступного капитала.
Закрепляет: лимиты контрагента на практике; попутно чинит педагогический конфликт К7 — 40/40/20 становится структурой стратегий, а крепость — структурой хранения. P0.

**G-16 «Дневник просадки»** → урок 5.5, микро-надстройка над психологией.
Механика: на кривой капитала игрока отмечаются точки решений; в точке предлагается выбрать эмоцию (страх/FOMO/месть/спокойствие) и действие; журнал копится и подсвечивает паттерны («твои худшие сделки идут после серии минусов»).
Закрепляет: самонаблюдение как навык риск-менеджмента. P2.

### Фаза 6 (заполнение пустой бонусной фазы — все P1)
**G-17 «ASIC под напряжением»** → Б1. Калькулятор-игра: хешрейт, тариф на электричество, курс BTC, сложность сети, халвинг-слайдер; выход: срок окупаемости и зона «когда майнинг = благотворительность энергокомпании».
**G-18 «Стейкинг: ставка против курса»** → Б2. Два ползунка (APY, изменение цены токена) → итог в деньгах; пресеты «ETH 3%», «малая сеть 12%», «LST в деpegе».
**G-19 «IL-исследователь»** → Б3. Кривая непостоянных потерь: ползунок отношения цен x; маркеры √2→−5.72%, ×4→−20%; вторая линия — «доходность пула за период» для сравнения IL против собранных комиссий.
**G-20 «Payoff-конструктор опционов»** → Б5. Перетаскивание страйка и премии; переключатели Long/Short × Call/Put; PnL-«бабочка» строится вживую; подпись риска честно разделяет short call (неограниченный) и short put (ограниченный).
**G-21 «Полимаркет-сканер арбитража»** → Б10/Б11. Лента рынков с YES+NO котировками; категории с разными feeRate (Crypto 0.07 / Sports 0.05 / Politics 0.04 / Geopolitics 0 — актуальные значения из документации); игрок решает, где есть арбитраж ПОСЛЕ комиссий.
**G-22 «Дроп или ловушка?»** → Б8. Карточки сайтов-эйрдропов: легитимный запрос vs «подпиши approve»/«введи seed»/фейк-домен; мгновенный вердикт и разбор.
**G-23 «RWA-цепочка доверия»** → Б13. Интерактивная схема SPV→кастодиан→оракул NAV→токен: клик по звену ломает его и показывает, что происходит с держателем токена.

---

## 2. АПГРЕЙДЫ УЖЕ СУЩЕСТВУЮЩИХ СИМУЛЯТОРОВ (коротко)
1. `sim_ruble2btc` — проверить покрытие всех шагов из рекомендации прошлого аудита (пополнение → пара → Bid/Ask → Market/Limit → исполнение → комиссия биржи → баланс → вывод → комиссия сети) и добавить финальный чек «во что обошёлся круг» в ₽ и bps.
2. Стакан (`sim_ob`) — добавить расчёт slippage bps с цветовой шкалой и запись действий для бейджа (из технического аудита; если ещё закрыто — игнорировать пункт).
3. Свечной конструктор — паттерны держать только в продвинутом режиме с дисклеймером «паттерн не гарантирует направление» (если ещё сделано).
4. Calendar-сим — заменить причинные формулировки «событие вызвало +8%» на окна реакции 1д/7д/30д + предупреждение о корреляции≠причинности.
5. Все симуляторы с «учебными моделями» — единый бейдж «🧪 Учебная модель» в углу (арбитраж, scaling, kill-switch, portfolio MaxDD) со ссылкой на ограничения.

---

## 3. ИНФОГРАФИКА ДЛЯ ГЕНЕРАЦИИ В GPT IMAGE

### 3.0 Общий стиль-гайд (вставлять в конец каждого промта)
> Style: modern flat vector infographic with subtle isometric depth, dark fintech theme, deep navy background (#0B1220), neon accents: green #22C55E, red #F43F5E, blue #38BDF8, amber #F59E0B. Clean sans-serif labels, generous whitespace, high contrast, crisp edges, no photorealism, no clutter, professional trading-app aesthetic, 16:9 (или указано иначе).

**Важно про текст:** GPT Image стабильно портит кириллицу и длинные числа. Правила:
- в промте просить МИНИМУМ текста, подписи — на английском или вообще без них;
- точные цифры/подписи на русском добавлять поверх в приложении (HTML-caption под картинкой) — я дал готовые подписи для каждого места;
- числа вида «+400%» допустимы, но проверяй после генерации и перегенерируй при искажении;
- для серии картинок сохраняй единообразие фразой "same visual style as the previous image in this series".

### 3.1 Карточки вставки + промты

---
**IMG-01 → урок 0.7 «Японская свеча», после concept-блока**
Подпись в приложении: «Тело = Open→Close. Тени = экстремумы периода.»
Prompt:
```
Educational diagram of a single Japanese candlestick anatomy, large green bullish candle and a smaller red bearish candle side by side on a dark chart grid, labeled thin lines pointing to BODY (Open-Close), UPPER WICK (High), LOWER WICK (Low), tiny OHLC price tags, minimal text, flat vector style
```
---
**IMG-02 → уроки 0.9–0.10 «Стакан и проскальзывание»**
Подпись: «Рыночный ордер съедает уровни: средняя цена хуже лучшей — это slippage.»
Prompt:
```
Vertical order book visualization: stacked red ask levels above and green bid levels below with a glowing spread gap in the middle, a large translucent market-order arrow sweeping through several ask levels leaving them faded, small bps scale on the right edge, dark fintech theme
```
---
**IMG-03 → урок 0.12 «Асимметрия потерь»**
Подпись: «−10% → нужно +11%; −50% → +100%; −90% → +900%.»
Prompt:
```
Descending staircase infographic showing loss recovery asymmetry: five descending steps each darker red than previous, on every step an upward arrow of increasing length in green returning to a single baseline level at top left, ratios like -10%/+11% to -90%/+900% as short numeric tags, isometric perspective, clean vector
```
---
**IMG-04 → урок 0.20 «Безопасность seed-фразы»**
Подпись: «Показывать можно: адрес, TXID, QR. Никогда никому: seed, приватный ключ, пароль.»
Prompt:
```
Two-column security poster: left column titled PUBLIC with icons of wallet address card, transaction receipt, QR code in green frames; right column titled SECRET with crossed-out icons of twelve-word paper phrase, golden key, padlock password field in red frames with warning stripes, big shield icon in center, minimal flat vector
```
---
**IMG-05 → урок 0.17 «Анатомия пампа и дампа»**
Подпись: «1 Накопление → 2 Разгон → 3 Эйфория → 4 Дамп. Инсайдеры продают толпе.»
Prompt:
```
Four-phase pump and dump lifecycle timeline: price curve rising slowly in phase 1 accumulation, steep hype spike in phase 2 with megaphone icons, euphoric peak phase 3 with crowd icons, vertical crash phase 4 with red arrow down; small whale silhouette selling bags to crowd silhouettes near the peak; numbered phase badges 1-4, dark theme vector
```
---
**IMG-06 → урок 0.18 «Трение съедает депозит»**
Подпись: «0.2% за круг × 200 кругов ≈ 40% депозита только на издержки.»
Prompt:
```
Iceberg metaphor infographic: small visible iceberg tip labeled FEES 0.2%, massive underwater ice body below waterline growing wider with each of many small circular trade arrows spiraling down it, faint year timeline along the depth axis, cold blue-green palette accents, flat vector
```
---
**IMG-07 → урок 1.2 «Толстые хвосты»**
Подпись: «Нормальный мир против крипторынка: крайние дни случаются в разы чаще.»
Prompt:
```
Overlaid probability distributions chart: smooth symmetric normal bell curve in blue, fatter-tailed distribution in amber with visibly raised tails, tail zones shaded red with tiny candlestick crash icons placed inside tails, legend dots only no long text, dark grid background
```
---
**IMG-08 → урок 1.9 «Конвейер проверки стратегии»**
Подпись: «Train → Holdout → Final Test → Walk-Forward. Финальные данные касаются один раз.»
Prompt:
```
Horizontal research pipeline diagram: three consecutive data blocks TRAIN, HOLDOUT, FINAL TEST colored blue then amber then red with a one-way lock icon on final block, followed by rolling walk-forward window strip made of repeating small train-test pairs sliding rightward along time axis arrow, isometric flat vector
```
---
**IMG-09 → урок 3.3 «Дробный Келли»**
Подпись: «Full Kelly: максимум роста, дикие просадки. Quarter Kelly: ~44% роста, спит спокойно.»
Prompt:
```
Growth versus risk trade-off chart: three logarithmic equity growth curves from same starting point, full kelly curve steep but with deep sawtooth drawdowns in red, half kelly moderate in amber, quarter kelly smoothest in green, small inset formula tag g=2k-k^2, percentile band shading around curves, dark theme
```
---
**IMG-10 → урок 3.6 «Корреляции в крах»**
Подпись: «В спокойствии диверсификация работает. В крах всё падает вместе.»
Prompt:
```
Side-by-side correlation heatmaps: left calm market 6x6 grid mostly cool blue cells with scattered warm spots, right crash day same grid almost uniformly hot red cells glowing, between them a lightning bolt transition arrow, portfolio value mini-charts under each heatmap diverging, dark fintech vector
```
---
**IMG-11 → урок 4.3 «Гигиена API-ключа»**
Подпись: «Trade-only. Withdrawal OFF. IP whitelist. Ключ — не пароль, его срок короткий.»
Prompt:
```
API key safety checklist card styled like a hardware access badge: central key icon with toggle switches set to TRADE ON, WITHDRAWAL OFF, IP WHITELIST ON, small server rack and shield icons around, red prohibition sign over withdrawal banknote icon, clean layout, flat vector
```
---
**IMG-12 → уроки 5.3+5.7 «Капитал 5 млн: структура и хранение»**
Подпись: «40% база / 40% эдж / 20% резерв. На одном контрагенте ≤20%.»
Prompt:
```
Isometric vault allocation diagram: large vault room divided into three compartments sized 40/40/20 percent with different asset icons inside (stablecoin stack, rocket strategy icon, reserve safe), outside the vault four separate exchange pedestals each holding a small share with a 20 percent cap marker line, connecting bridges, dark navy scene
```
---
**IMG-13 → урок 3.5 / Б-фаза «Механика фандинга»**
Подпись: «Раз в интервал лонги платят шортам при положительной ставке — и наоборот.»
Prompt:
```
Clock-face funding rate diagram: circular clock divided into interval segments marked 8H and 1H variants, center perpetual futures contract icon, long traders silhouettes on one side paying coin stream toward short traders silhouettes on other side when rate positive, reversed flow arrow dashed for negative rate, minimal labels, dark vector
```
---
**IMG-14 → бонус Б3 «Непостоянные потери»**
Подпись: «Цена актива x2 → IL −5.7%; x4 → −20%. Комиссии пула должны перекрыть это.»
Prompt:
```
Impermanent loss curve chart: x-axis ratio of price change 1x to 5x, y-axis loss percent down to minus twenty, single smooth amber U-shaped curve dipping below zero baseline with two glowing marker points at x2 and x4, comparison dashed green line of holding strategy flat at zero, small liquidity pool icon, dark grid
```

### 3.2 Порядок генерации
1. Сначала IMG-01…IMG-06 (Фаза 0) — они дадут тебе откалиброванный стиль.
2. Зафиксируй удачный стиль фразой-якорем и используй её в остальных промтах серии.
3. Каждую картинку проверяй на искажённые цифры; цифры критичные (проценты) лучше продублировать HTML-подписью под изображением.
4. Хранение: `assets/infographics/` внутри проекта; в уроках — блок типа image с caption из этого файла.

---

## 4. СВОДНЫЙ ПРИОРИТЕТ ВНЕДРЕНИЯ
| Волна | Что | Зачем |
|---|---|---|
| Волна 1 (с P0-правками аудита) | G-01, G-03, G-10, G-14, G-15 + IMG-03, IMG-04 | Закрывают самые опасные пробелы понимания новичка |
| Волна 2 (с P1-правками) | G-02, G-05, G-06, G-11, G-12, G-13 + IMG-01, IMG-02, IMG-05–IMG-10 | Основная визуальная масса курса |
| Волна 3 (достройка бонусов) | G-17…G-23 + IMG-13, IMG-14 + мини-аттестация Ф6 | Бонус-фаза становится полноценным факультативом |
| Волна 4 | G-04, G-07, G-08, G-09, G-16 + IMG-11, IMG-12 | Полировка для Фаз 2–5 |
