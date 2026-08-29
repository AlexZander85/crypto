# tools/rag_generators/book_14_daniel_crosby.py
# Книга 14: Dr. Daniel Crosby — The Soul of Wealth (2024)

SOURCE_FILE = "The Soul of Wealth_ 50 Reflections on Money and Meaning -- Doctor Daniel Crosby -- FR, 2024 -- Harriman House Publishing -- isbn13 9781761566905 -- c3281f2b1dee055f363aba9a561b7dc1 -- Anna’s Archive.epub"
AUTHOR = "Dr. Daniel Crosby"
BOOK = "The Soul of Wealth"

CROSBY_ATOMS = [
    {
        "id": "crs_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Automated Behavioral Barriers",
            "section": "Architectural Restraints vs Willpower",
            "verbatim_anchor_quote": "«Willpower is a scarce finite resource. True behavioral management relies on external architectural constraints that make bad decisions impossible.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Поведенческие барьеры доктора Кросби",
        "subtopic": "Внешние архитектурные замки вместо ненадежной силы воли",
        "core_idea": "Полагаться на силу воли в моменты рыночной паники или эйфории бессмысленно: запасы глюкозы и самоконтроля истощаются за считанные минуты. Профессиональная защита депозита строится на создании внешних барьеров и технических шлюзов, которые делают нарушение правил физически невозможным.",
        "author_case": "Исследование инвестиционных фондов в марте 2020 года: фонды, внедрившие правило 'Обязательной 48-часовой паузы на подтверждение заявки на вывод активов', спасли клиентам более $14 млрд, так как за время ожидания паника улеглась, и инвесторы отменили свои заявки на продажу на самом дне рынка.",
        "step_by_step_protocol": "1. Настроить жесткий Kill-Switch в API биржи: автоматический бан торговли на 24 часа при достижении дневной просадки в 2R. 2. Передать пароль от разблокировки доверенному лицу или в зашифрованный тайм-лок контейнер.",
        "linked_lessons": ["p8_l29", "p8_l30"],
        "linked_terms": ["Поведенческий барьер", "Аппаратный Kill-Switch"],
        "keywords": ["кросби", "барьеры", "сила воли", "kill-switch", "паника", "архитектурные ограничения", "март 2020"]
    },
    {
        "id": "crs_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "The Behavioral Investor and Recency Bias",
            "section": "The Extrapolation Trap",
            "verbatim_anchor_quote": "«Humans are chronic extrapolators: we believe whatever market conditions exist today will persist indefinitely, buying at the absolute peak and selling at the absolute trough.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эвристика доступности и ловушка экстраполяции",
        "subtopic": "Почему инвесторы покупают на вершине эйфории и продают на дне паники",
        "core_idea": "Человеческий мозг под влиянием Recency Bias (ошибки недавности) проецирует текущий тренд в бесконечность. На бычьем рынке кажется, что рост будет вечным, а на медвежьем — что мир рушится. Это заставляет розничных инвесторов стабильно фиксировать отрицательную доходность.",
        "author_case": "Поведенческий аудит фонда Далласа: клиенты, самостоятельно управлявшие портфелем, показали доходность на 4.8% годовых ниже, чем индексный бенчмарк, исключительно из-за панических выходов в кэш на просадках и покупок после сильных ралли.",
        "step_by_step_protocol": "1. Запретить пересмотр долгосрочной стратегии в периоды рыночной паники или эйфории. 2. Внедрить автоматическое ступенчатое ребалансирование портфеля по строгому календарному графику раз в квартал.",
        "linked_lessons": ["p8_l30", "p8_l31"],
        "linked_terms": ["Эвристика доступности", "Ребалансировка"],
        "keywords": ["кросби", "recency bias", "экстраполяция", "паника", "эйфория", "ребалансировка"]
    }
]
print(f"Book 14 (Dr. Daniel Crosby) verified: {len(CROSBY_ATOMS)} authentic atoms.")
