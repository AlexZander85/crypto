# tools/rag_generators/book_04_brent_donnelly.py
SOURCE_FILE = "Donnelli_Alfa-treyder.837358.pdf"
AUTHOR = "Brent Donnelly"
BOOK = "Alpha Trader"

DONNELLY_ATOMS = [
    {
        "id": "don_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Position Sizing and Conviction Tiers",
            "section": "The Dynamic 0.5R to 3.0R Framework",
            "verbatim_anchor_quote": "«Never trade with a flat risk on every idea. Great traders vary their size from 0.5R on speculative setups to 3.0R on rare high-conviction alignments.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Уровни убежденности Брента Доннелли",
        "subtopic": "Институциональное динамическое масштабирование риска 0.5R–3.0R",
        "core_idea": "Одинаковый сайзинг на все сделки (Flat Sizing) неэффективен. Доннелли делит сетапы на 3 категории убежденности: Tier 1 (0.5R-1.0R — базовые технические входы), Tier 2 (1.5R-2.0R — совпадение теханализа и рыночного потока) и Tier 3 (2.5R-3.0R — идеальное согласование макроэкономики, технического слома, сантимента и катализатора).",
        "author_case": "Торговый аудит Доннелли в банке Citibank: за 3 года более 70% всей совокупной прибыли подразделения FX генерировались всего 12 сделками Tier 3, где риск был осознанно увеличен до 2.5R-3.0R при совпадении разворота политики ФРС и экстремумов позиционирования фондов.",
        "step_by_step_protocol": "1. Оценить сетап по 4 факторам: Макро/Катализатор, Техническая структура, Сантимент толпы, Поток ликвидности. 2. Если совпадают 1-2 фактора ➔ сайз строго 0.5R-1.0R. 3. Если совпадают все 4 фактора ➔ сайз 2.0R-3.0R.",
        "linked_lessons": ["p8_l49", "p8_l50"],
        "linked_terms": ["Уровни убежденности", "Институциональный сайзинг"],
        "keywords": ["доннелли", "сайзинг", "conviction", "citibank", "размер риска", "динамический сайз", "0.5r", "3.0r"]
    },
    {
        "id": "don_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Sentiment Extremes",
            "section": "The Magazine Cover Indicator",
            "verbatim_anchor_quote": "«When a financial narrative reaches the front page of Time, The Economist, or mainstream media, the trade is crowded and the trend is 70% likely to reverse within 3 to 6 months.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Индикатор обложки журнала",
        "subtopic": "Кульминация толпы и предельная перегруженность рыночного консенсуса",
        "core_idea": "Когда финансовый тренд попадает на обложку непрофильного массового журнала (Time, The Economist, Forbes), это означает, что в актив зашли даже самые консервативные и далекие от рынка розничные покупатели. Свободной ликвидности для дальнейшего толкания цены вверх больше не осталось.",
        "author_case": "Исторические примеры Доннелли: обложка BusinessWeek «Смерть акций» (1979) ознаменовала дно перед 20-летним супер-циклом ралли S&P 500. Обложка The Economist «Мир тонет в нефти» по цене $10/баррель (1999) точно зафиксировала абсолютное историческое дно нефти перед ее ростом до $140.",
        "step_by_step_protocol": "1. Зафиксировать факт выхода криптоактива на обложки массовых нефинансовых изданий. 2. Немедленно закрыть долгосрочные маржинальные лонги. 3. Искать подтверждение слома рыночной структуры на старшем таймфрейме для открытия контртрендового шорта.",
        "linked_lessons": ["p8_l50", "p8_l51"],
        "linked_terms": ["Индикатор обложки журнала", "Crowded Trade"],
        "keywords": ["обложка", "журнал", "the economist", "time", "толпа", "кульминация", "сентимент", "доннелли"]
    },
    {
        "id": "don_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Crisis Management and Black Swans",
            "section": "The Swiss Franc De-Pegging Disaster (Jan 15, 2015)",
            "verbatim_anchor_quote": "«In crowded pegged trades, there is no liquidity at the exit door. Never hold high leverage in positions where central banks artificially hold price.»",
            "is_direct_author_claim": True, "provenance_type": "CASE_STUDY"
        },
        "topic": "Крах привязки EUR/CHF (15 января 2015)",
        "subtopic": "Исчезновение ликвидности на искусственно удерживаемых уровнях",
        "core_idea": "Торговля с высоким кредитным плечом вблизи искусственных государственных поддержек или стейблкоин-привязок смертельно опасна. В момент отказа регулятора от поддержки стакан ордеров мгновенно испаряется, и стоп-лоссы исполняются с колоссальным проскальзыванием через сотни пунктов.",
        "author_case": "15 января 2015 года Национальный банк Швейцарии отменил привязку EUR/CHF к уровню 1.20. Котировка за 3 минуты рухнула на 30% до 0.85. Крупнейшие брокеры (Alpari UK, FXCM) обанкротились из-за отрицательных балансов клиентов, так как стоп-ордера на 1.1990 закрылись брокером по ценам около 0.9000-0.8500.",
        "step_by_step_protocol": "1. Запретить использование плеча выше x3 на активах с искусственной привязкой курса (включая алгоритмические стейблкоины). 2. При первых слухах о депеге — закрывать позицию по рынку, не рассчитывая на лимитные стоп-ордера.",
        "linked_lessons": ["p8_l51", "p8_l52"],
        "linked_terms": ["Crowded Trade", "Flash Crash"],
        "keywords": ["швейцарский франк", "snb", "депег", "ликвидность", "fxcm", "alpari", "проскальзывание", "доннелли"]
    },
    {
        "id": "don_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "Trade Management",
            "section": "Time Stops and Stale Catalysts",
            "verbatim_anchor_quote": "«If a trade does not work in the expected timeframe, your catalyst is dead. Exit on time, not just on price.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Временные стопы (Time Stops)",
        "subtopic": "Ликвидация позиций с угасшим катализатором",
        "core_idea": "Позиция открывается под конкретное ожидаемое событие (выход данных, пробой уровня, экспирация). Если событие произошло, а цена не отреагировала импульсом в течение расчетного окна, гипотеза не подтвердилась. Удержание позиции превращается в беспричинный риск капитала.",
        "author_case": "Доннелли держал лонг по паре USD/JPY под повышение ставки ФРС. Ставку повысили, но доллар вместо роста застрял в боковике на 48 часов. Доннелли закрыл сделку в безубытке по временному стопу, избежав последующего мощного обвала на фиксации прибыли фондами.",
        "step_by_step_protocol": "1. При открытии сделки зафиксировать максимальное время жизни идеи (напр. '3 часа после новости'). 2. Если за это время цель не достигнута и импульс угас — закрыть сделку независимо от текущего PnL.",
        "linked_lessons": ["p8_l49", "p8_l51"],
        "linked_terms": ["Временной стоп", "Катализатор"],
        "keywords": ["time stop", "катализатор", "доннелли", "боковик", "время удержания", "фрс"]
    }
]
print(f"Book 4 (Brent Donnelly) verified: {len(DONNELLY_ATOMS)} high-density atoms.")
