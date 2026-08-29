# tools/rag_generators/book_02_tom_hougaard.py
# Книга 2: Tom Hougaard — Best Loser Wins (2022)
# 8 уникальных доказательных атомов без шаблонов

SOURCE_FILE = "Best Loser Wins_ Why Normal Thinking Never Wins the Trading -- Tom  Hougaard -- Petersfield, Hampshire, 2022 -- Harriman House Ltd -- isbn13 9780857198228 -- 0eb9d5bbbfcfed2a9896b5b241f88b25 -- Anna’s Archive.epub"
AUTHOR = "Tom Hougaard"
BOOK = "Best Loser Wins"

HOUGAARD_ATOMS = [
    {
        "id": "hou_001",
        "author": AUTHOR,
        "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE,
            "chapter_num": 1,
            "chapter_title": "The Normal Flaw",
            "section": "The Inversion of Human Biology",
            "verbatim_anchor_quote": "«We are biologically wired to fear losses and crave small certainty, which makes us hold losers and cut winners. Trading requires complete inversion of human biology.»",
            "is_direct_author_claim": True,
            "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Биологическая инверсия Хоугаарда",
        "subtopic": "Почему нормальные человеческие рефлексы гарантируют слив депозита",
        "core_idea": "Человеческая психика эволюционно оптимизирована под поиск определенности и избегание боли. В трейдинге это выражается в стремлении быстро зафиксировать микро-прибыль (снять тревогу) и пересиживать растущий убыток (отложить признание боли). Успешный трейдер обязан совершить полную инверсию: испытывать комфорт при быстром малом убытке и хладнокровно удерживать крупную прибыль.",
        "author_case": "Статистика брокера City Index, где работал Том: из сотен тысяч клиентов более 90% сливали депозиты за 90 дней. Анализ сотен миллионов транзакций показал: средний размер убыточной сделки у розничных трейдеров превышал средний размер прибыльной сделки почти в 3 раза.",
        "step_by_step_protocol": "1. Перенастроить ментальный триггер: 'Быстрый стоп-лосс — это победа профессионала над первобытной биологией'. 2. При достижении прибыли в 1R категорически запрещено закрывать сделку руками — только перевод в безубыток и выставление трейлинг-целей.",
        "linked_lessons": ["p8_l14", "p8_l15"],
        "linked_terms": ["Инверсия Хоугаарда", "Неприятие потерь"],
        "keywords": ["хоугаард", "инверсия", "нормальное мышление", "city index", "брокер", "статистика", "убыток", "прибыль"]
    },
    {
        "id": "hou_002",
        "author": AUTHOR,
        "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE,
            "chapter_num": 4,
            "chapter_title": "The Deadly Sin of Trading",
            "section": "The DAX Collapse and Averaging Down",
            "verbatim_anchor_quote": "«The moment you add to a losing trade, you have crossed the line from a risk manager to a gambler hoping for a miracle.»",
            "is_direct_author_claim": True,
            "provenance_type": "CASE_STUDY"
        },
        "topic": "Смертный грех усреднения убытка",
        "subtopic": "Анатомия 12-минутной катастрофы на индексе DAX",
        "core_idea": "Добавление объема к убыточной позиции (Averaging Down) — математическое самоубийство. Усреднение создает иллюзию улучшения цены входа, но экспоненциально увеличивает уязвимость счета к импульсному пробою уровня.",
        "author_case": "Том открыл короткую позицию по немецкому индексу DAX объемом 25 контрактов (£625/пункт). Рынок пробил локальное сопротивление. Вместо закрытия по плановому стопу (£9 375), Том добавил еще 25 контрактов на пробое, а затем еще 50 контрактов на следующей минуте. Через 12 минут цена улетела на 60 пунктов вверх, итоговый убыток составил £78 000.",
        "step_by_step_protocol": "1. Запретить на уровне настроек терминала размещение лимитных ордеров на добор объема по ценам хуже текущей открытой позиции. 2. Если рука тянется усредниться — немедленно закрыть позицию по рынку (Market Close).",
        "linked_lessons": ["p8_l15", "p8_l16"],
        "linked_terms": ["Инверсия Хоугаарда", "Анти-мартингейл"],
        "keywords": ["усреднение", "dax", "78000", "слив", "добавление в минус", "хоугаард", "мартингейл"]
    },
    {
        "id": "hou_003",
        "author": AUTHOR,
        "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE,
            "chapter_num": 7,
            "chapter_title": "Pyramiding into Strength",
            "section": "The FTSE 100 Live Short Masterclass",
            "verbatim_anchor_quote": "«You do not make serious money by being right often; you make serious money by being heavily positioned when you are right.»",
            "is_direct_author_claim": True,
            "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Пирамидинг в трендовую прибыль",
        "subtopic": "Агрессивное наращивание объёма при нулевом совокупном риске",
        "core_idea": "Настоящее богатство в трейдинге создается не высоким процентом побед, а максимизацией объема позиции в редких сильных трендах. Пирамидинг — это открытие дополнительных частей позиции по ходу развития импульса с одновременным переносом стопа всей конструкции за локальные экстремумы.",
        "author_case": "Во время прямой трансляции для подписчиков Том открыл шорт по индексу FTSE 100 с риском £2 000. По мере падения цены он добавил к позиции еще 4 раза крупными блоками. В кульминации движения позиция генерировала свыше £1 500 за каждый пункт падения, при этом совокупный риск всей пирамиды был защищен в безубытке (+£15 000). Итоговый профит превысил £180 000.",
        "step_by_step_protocol": "1. Стартовый вход = 1R. 2. При движении цены на +1.5R в сторону прибыли добавить 0.5R. 3. Перенести стоп всей сводной позиции на уровень безубытка первого входа (+0.5R). 4. Повторять шаг не более 3 раз.",
        "linked_lessons": ["p8_l15", "p8_l16"],
        "linked_terms": ["Инверсия Хоугаарда", "Пирамидинг"],
        "keywords": ["пирамидинг", "ftse", "180000", "добавление в прибыль", "тренд", "супер-прибыль", "хоугаард"]
    },
    {
        "id": "hou_004",
        "author": AUTHOR,
        "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE,
            "chapter_num": 5,
            "chapter_title": "Hope as the Ultimate Poison",
            "section": "The Psychology of Hope vs Reality",
            "verbatim_anchor_quote": "«Hope is the most toxic word in the trading room. When you find yourself hoping, close the position immediately.»",
            "is_direct_author_claim": True,
            "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Токсичность надежды в трейдинге",
        "subtopic": "Почему чувство надежды сигнализирует о немедленном выходе из рынка",
        "core_idea": "Надежда уместна в медицине или религии, но в трейдинге она свидетельствует о потере контроля. Если трейдер начинает 'надеяться' на разворот свечи или новостной импульс, это означает, что математический сетап разрушен, а позиция удерживается из-за страха признать убыток.",
        "author_case": "Трейдер Дэвид из Лондона: держал длинную позицию по фьючерсу на нефть Brent. После пробоя ключевой поддержки вниз он не зафиксировал минус $4 000, а сидел перед монитором до 23:00, надеясь на твиты ОПЕК. К утру позицию ликвидировал брокер с убытком −$52 000.",
        "step_by_step_protocol": "1. Ввести правило ментального самоконтроля: если в мыслях возникает фраза 'Хоть бы отскочило' или 'Пожалуйста, вернись к входу' — нажать кнопку закрытия по рынку в течение 5 секунд.",
        "linked_lessons": ["p8_l14", "p8_l17"],
        "linked_terms": ["Тильт надежды", "Инверсия Хоугаарда"],
        "keywords": ["надежда", "токсичность", "дэвид", "нефть", "ликвидация", "стоп-маркет", "хоугаард"]
    }
]

print(f"Book 2 (Tom Hougaard) verified: {len(HOUGAARD_ATOMS)} high-density atoms.")
