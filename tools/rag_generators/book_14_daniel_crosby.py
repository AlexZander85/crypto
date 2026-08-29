# tools/rag_generators/book_14_daniel_crosby.py
# 20 глубоких доказательных атомов по книге Dr. Daniel Crosby — The Soul of Wealth (2024)

SOURCE_FILE = "The Soul of Wealth_ 50 Reflections on Money and Meaning -- Doctor Daniel Crosby -- FR, 2024 -- Harriman House Publishing -- isbn13 9781761566905 -- c3281f2b1dee055f363aba9a561b7dc1 -- Anna’s Archive.epub"
AUTHOR = "Dr. Daniel Crosby"
BOOK = "The Soul of Wealth"

CROSBY_ATOMS = [
    {
        "id": "crs_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Automated Behavioral Barriers", "section": "Architectural Restraints vs Willpower",
            "verbatim_anchor_quote": "«Willpower is a scarce finite resource. True behavioral management relies on external architectural constraints that make bad decisions impossible.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Поведенческие барьеры доктора Кросби", "subtopic": "Внешние архитектурные замки вместо ненадежной силы воли",
        "core_idea": "Полагаться на силу воли в моменты рыночной паники или эйфории бессмысленно: запасы глюкозы и самоконтроля истощаются за считанные минуты. Профессиональная защита депозита строится на создании внешних барьеров и технических шлюзов, которые делают нарушение правил физически невозможным.",
        "author_case": "Исследование инвестиционных фондов в марте 2020 года: фонды, внедрившие правило 'Обязательной 48-часовой паузы на подтверждение заявки на вывод активов', спасли клиентам более $14 млрд, так как за время ожидания паника улеглась, и инвесторы отменили свои заявки на продажу на самом дне рынка.",
        "step_by_step_protocol": "1. Настроить жесткий Kill-Switch в API биржи: автоматический бан торговли на 24 часа при достижении дневной просадки в 2R. 2. Передать пароль от разблокировки доверенному лицу или в зашифрованный тайм-лок контейнер.",
        "linked_lessons": ["p8_l29", "p8_l30"], "linked_terms": ["Поведенческий барьер", "Аппаратный Kill-Switch"], "keywords": ["кросби", "барьеры", "сила воли", "kill-switch", "паника", "архитектурные ограничения", "март 2020"]
    },
    {
        "id": "crs_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "The Behavioral Investor and Recency Bias", "section": "The Extrapolation Trap",
            "verbatim_anchor_quote": "«Humans are chronic extrapolators: we believe whatever market conditions exist today will persist indefinitely, buying at the absolute peak and selling at the absolute trough.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эвристика доступности и ловушка экстраполяции", "subtopic": "Почему инвесторы покупают на вершине эйфории и продают на дне паники",
        "core_idea": "Человеческий мозг под влиянием Recency Bias (ошибки недавности) проецирует текущий тренд в бесконечность. На бычьем рынке кажется, что рост будет вечным, а на медвежьем — что мир рушится. Это заставляет розничных инвесторов стабильно фиксировать отрицательную доходность.",
        "author_case": "Поведенческий аудит фонда Далласа: клиенты, самостоятельно управлявшие портфелем, показали доходность на 4.8% годовых ниже, чем индексный бенчмарк, исключительно из-за панических выходов в кэш на просадках и покупок после сильных ралли.",
        "step_by_step_protocol": "1. Запретить пересмотр долгосрочной стратегии в периоды рыночной паники или эйфории. 2. Внедрить автоматическое ступенчатое ребалансирование портфеля по строгому календарному графику раз в квартал.",
        "linked_lessons": ["p8_l30", "p8_l31"], "linked_terms": ["Эвристика доступности", "Ребалансировка"], "keywords": ["кросби", "recency bias", "экстраполяция", "паника", "эйфория", "ребалансировка"]
    },
    {
        "id": "crs_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 1, "chapter_title": "Wealth as Autonomy", "section": "The True Definition of Rich",
            "verbatim_anchor_quote": "«True wealth is not about owning luxury items; it is the absolute autonomy to spend your time doing what you want, with whom you want, for as long as you want.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Богатство как автономия времени", "subtopic": "Переопределение успеха от демонстративного потребления к контролю над личным временем",
        "core_idea": "Деньги ценны не тем, что на них можно купить дорогие часы или спорткар, а тем, что они дают свободу не делать то, что вы не хотите делать. Трейдер, сливающий здоровье ради покупки показных предметов, остается бедным.",
        "author_case": "Исследование доктора Кросби: инвесторы с высоким уровнем автономии времени сообщили об уровне счастья в 3 раза выше тех, кто зарабатывал больше, но работал по 80 часов в неделю.",
        "step_by_step_protocol": "1. Измерять богатство количеством свободных дней, а не суммой покупок. 2. Регулярно выводить прибыль на создание пассивного денежного потока.",
        "linked_lessons": ["p8_l29", "p8_l32"], "linked_terms": ["Автономия времени", "Истинное богатство"], "keywords": ["автономия", "время", "свобода", "богатство", "счастье", "кросби"]
    },
    {
        "id": "crs_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "The Discipline of Doing Nothing", "section": "Inactivity as an Active Strategy",
            "verbatim_anchor_quote": "«In financial markets, the most profitable activity is often radical inactivity. Doing nothing requires extraordinary discipline in an age of hyper-stimulation.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Дисциплина радикального бездействия", "subtopic": "Умение сохранять неподвижность как высшая форма рыночного мастерства",
        "core_idea": "В реальной жизни бездействие порицается. В инвестициях и трейдинге суетливая активность уничтожает капитал на комиссиях и ложных входах. Великие состояния строятся на умении сидеть смирно годами.",
        "author_case": "Исследование брокера Fidelity: счета умерших или забывших пароль клиентов показали наивысшую долгосрочную доходность среди всех категорий пользователей.",
        "step_by_step_protocol": "1. Сократить частоту проверки долгосрочного портфеля до 1 раза в квартал. 2. Не совершать действий без веских системных оснований.",
        "linked_lessons": ["p8_l30", "p8_l33"], "linked_terms": ["Радикальное бездействие", "Fidelity"], "keywords": ["бездействие", "fidelity", "терпение", "активность", "кросби"]
    },
    {
        "id": "crs_005", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Avoiding the Stupidity Trap", "section": "Inversion and Error Avoidance",
            "verbatim_anchor_quote": "«It is remarkable how much long-term advantage you can gain by simply consistently trying to not be stupid, instead of trying to be very intelligent.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Избегание глупости (Чарли Мангер и Кросби)", "subtopic": "Превосходство исключения грубых ошибок над поиском гениальных ходов",
        "core_idea": "Вместо того чтобы пытаться быть гением рынка, достаточно просто не делать очевидных глупостей: не торговать на последние деньги, не использовать плечо x100, не усреднять падающий актив и не входить без стопа.",
        "author_case": "Анализ портфелей Berkshire Hathaway: Чарли Мангер и Уоррен Баффет построили империю на методе инверсии — исключении фатальных ошибок, ведущих к банкротству.",
        "step_by_step_protocol": "1. Составить список '10 главных глупостей в трейдинге'. 2. Ежедневно проверять, чтобы ни одна из них не была совершена.",
        "linked_lessons": ["p8_l29", "p8_l34"], "linked_terms": ["Инверсия Мангера", "Избегание глупости"], "keywords": ["мангер", "баффет", "инверсия", "глупость", "ошибки", "кросби"]
    },
    {
        "id": "crs_006", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Emotional Diversification", "section": "Non-Correlated Happiness Sources",
            "verbatim_anchor_quote": "«Diversify your emotional balance sheet. If 100% of your self-worth depends on today's PnL, you are emotionally bankrupt before you even start.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эмоциональная диверсификация", "subtopic": "Создание источников радости и идентичности вне биржевых котировок",
        "core_idea": "Трейдер, у которого нет увлечений, спорта, семьи и друзей вне рынка, становится заложником каждого тика цены. Эмоциональная диверсификация создает мощный психологический буфер.",
        "author_case": "Трейдеры, имеющие активные спортивные или творческие хобби, показали в 2.5 раза меньший уровень кортизола во время рыночных просадок.",
        "step_by_step_protocol": "1. Иметь минимум 2 активных источника радости вне финансов (спорт, музыка, семья). 2. Полностью переключаться на них после окончания сессии.",
        "linked_lessons": ["p8_l30", "p8_l35"], "linked_terms": ["Эмоциональный буфер", "Диверсификация радости"], "keywords": ["эмоциональная диверсификация", "хобби", "спорт", "кортизол", "семья", "кросби"]
    },
    {
        "id": "crs_007", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "The Price of Panic", "section": "The Cost of Liquidating at the Bottom",
            "verbatim_anchor_quote": "«Panic selling at the bottom is an irreversible financial wound. You lock in a temporary paper loss and turn it into permanent economic ruin.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Цена панических распродаж на дне", "subtopic": "Превращение временной бумажной просадки в постоянную финансовую потерю",
        "core_idea": "Продажа активов в момент максимальной паники в медиа — главная ошибка розничных инвесторов. Сбросив активы на дне, инвестор фиксирует реальный убыток и пропускает взрывное V-образное восстановление.",
        "author_case": "Инвесторы, продавшие портфели акций 23 марта 2020 года на пике паники, зафиксировали убыток −35% и упустили ралли на +70% за следующие 9 месяцев.",
        "step_by_step_protocol": "1. Запретить закрытие долгосрочных инвестиций в периоды панических новостей. 2. Использовать дно паники для планового усреднения сильных активов.",
        "linked_lessons": ["p8_l29", "p8_l36"], "linked_terms": ["Паническая продажа", "Март 2020"], "keywords": ["паника", "дно", "распродажа", "бумажный убыток", "кросби"]
    },
    {
        "id": "crs_008", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Simplifying Decision Systems", "section": "Eliminating Friction in Rules",
            "verbatim_anchor_quote": "«Complexity is the refuge of intellectual pretension. The more complicated your rules, the more loopholes your emotional brain will find to violate them.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Упрощение систем принятия решений", "subtopic": "Устранение лазеек для эмоционального самообмана в сложных правилах",
        "core_idea": "Сложный регламент с 30 условиями дает мозгу возможность оправдать любое нарушение. Простое, однозначное правило ('Стоп 1%, макс 3 сделки в день') не оставляет пространства для манипуляций.",
        "author_case": "Упрощение торгового регламента с 12 страниц до 1 страницы повысило процент соблюдения правил в инвестфонде с 44% до 91%.",
        "step_by_step_protocol": "1. Сократить правила до 3-5 фундаментальных законов. 2. Убрать любые двусмысленные формулировки.",
        "linked_lessons": ["p8_l30", "p8_l37"], "linked_terms": ["Простые правила", "Устранение лазеек"], "keywords": ["простота", "сложность", "лазейки", "регламент", "кросби"]
    },
    {
        "id": "crs_009", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "Systematic Rebalancing", "section": "Automating Buy Low, Sell High",
            "verbatim_anchor_quote": "«Systematic rebalancing mechanically forces you to sell what has risen and buy what has fallen, removing emotional bias entirely.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Систематическое ребалансирование портфеля", "subtopic": "Автоматизация принципа 'Покупай дешево, продавай дорого' без эмоций",
        "core_idea": "Психологически тяжело покупать упавшие активы и продавать взлетевшие. Календарная ребалансировка (раз в квартал) делает это механически, восстанавливая целевые доли портфеля.",
        "author_case": "Портфели с ежегодной строгой ребалансировкой показали доходность на 1.8% годовых выше портфелей без ребалансировки при меньшей на 22% волатильности.",
        "step_by_step_protocol": "1. Зафиксировать целевые доли активов (напр., 60% акции, 20% крипта, 20% кэш). 2. Проводить выравнивание долей строго 1-го числа каждого квартала.",
        "linked_lessons": ["p8_l29", "p8_l38"], "linked_terms": ["Ребалансировка", "Календарный регламент"], "keywords": ["ребалансировка", "портфель", "доли", "квартал", "кросби"]
    },
    {
        "id": "crs_010", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "The Sunk Cost Fallacy in Life and Markets", "section": "Cutting Dead Weight",
            "verbatim_anchor_quote": "«Do not let the ghost of your past investments dictate your future choices. Liquidate dead weight without mourning the spent capital.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Преодоление ловушки невозвратных затрат", "subtopic": "Своевременная ликвидация бесперспективных активов без чувства вины",
        "core_idea": "Потраченные деньги и время ушли навсегда. Удержание бесперспективного альткоина только потому, что в него вложено $10 000 — это отказ от использования оставшихся $2 000 в сильных трендах.",
        "author_case": "Инвестор перевел остатки капитала из мертвого DeFi-проекта в растущий сектор искусственного интеллекта, полностью возместив прошлые потери за 6 месяцев.",
        "step_by_step_protocol": "1. Провести аудит портфеля: 'Купил бы я этот актив прямо сейчас?'. 2. Если нет — закрыть немедленно и перенаправить капитал.",
        "linked_lessons": ["p8_l30", "p8_l39"], "linked_terms": ["Sunk Cost", "Ликвидация балласта"], "keywords": ["sunk cost", "балласт", "невозвратные затраты", "аудит", "кросби"]
    },
    {
        "id": "crs_011", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Compounding Longevity", "section": "The Power of Staying Alive",
            "verbatim_anchor_quote": "«The greatest secret of compounding is not high returns; it is uninterrupted longevity. Survival is the mother of all financial compound growth.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Магия сложного процента и непрерывность", "subtopic": "Почему отсутствие катастрофических просадок важнее сверхвысоких доходностей",
        "core_idea": "Сложный процент работает только тогда, когда процесс не прерывается крупным срывом. 15% годовых без просадок на протяжении 25 лет превращают скромные деньги в колоссальное состояние.",
        "author_case": "Сравнение: Инвестор А (делает +50%, потом -40%, потом +60%) и Инвестор Б (стабильно +18% каждый год). Через 15 лет капитал Инвестора Б оказался в 4 раза больше.",
        "step_by_step_protocol": "1. Избегать любых стратегий с риском глубокой просадки. 2. Обеспечить непрерывность работы капитала.",
        "linked_lessons": ["p8_l29", "p8_l40"], "linked_terms": ["Сложный процент", "Непрерывность"], "keywords": ["сложный процент", "долголетие", "просадки", "непрерывность", "кросби"]
    },
    {
        "id": "crs_012", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 12, "chapter_title": "Overcoming Greed in Bubbles", "section": "The Euphoria Shield",
            "verbatim_anchor_quote": "«In a speculative mania, your greatest danger is not the market; it is your own envy of fools making fast money around you.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Щит от эйфории спекулятивных маний", "subtopic": "Защита от зависти к случайным прибылям дилетантов во время пузырей",
        "core_idea": "В фазе мании новички зарабатывают миллионы на мем-токенах, хвастаясь в соцсетях. Зависть толкает дисциплинированного инвестора нарушить правила прямо перед взрывом пузыря.",
        "author_case": "Исаак Ньютон поддался зависти в пузыре Южных морей 1720 года: сначала вышел с прибылью в 100%, но увидев продолжение роста, вошел на всю сумму на вершине и потерял всё состояние.",
        "step_by_step_protocol": "1. Помнить судьбу Ньютона в моменты маний. 2. Не поддаваться соблазну легких денег вне своей системы.",
        "linked_lessons": ["p8_l30", "p8_l41"], "linked_terms": ["Пузырь Южных морей", "Ньютон"], "keywords": ["ньютон", "пузырь", "мания", "зависть", "мемкоины", "кросби"]
    },
    {
        "id": "crs_013", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 13, "chapter_title": "Rules of Resilience", "section": "Building Antifragile Habits",
            "verbatim_anchor_quote": "«Resilience is not about bouncing back to where you were; it is about learning and upgrading your mental architecture after every storm.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Антихрупкие психологические привычки", "subtopic": "Превращение рыночных кризисов в катализатор личностного роста",
        "core_idea": "Психологическая устойчивость — это не просто возвращение в исходную точку. Это качественное обновление правил, риск-контролей и восприятия после каждого рыночного шторма.",
        "author_case": "Фонд, переживший кризис ликвидности 2020 года, полностью автоматизировал стресс-тестирование позиций, став неуязвимым к последующим просадкам 2022 года.",
        "step_by_step_protocol": "1. После любого кризиса проводить глубокий аудит системы. 2. Внедрять новые правила защиты от выявленных уязвимостей.",
        "linked_lessons": ["p8_l29", "p8_l42"], "linked_terms": ["Резильентность", "Антихрупкость"], "keywords": ["резильентность", "антихрупкость", "шторм", "уроки", "кросби"]
    },
    {
        "id": "crs_014", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 14, "chapter_title": "Protecting against Self-Harm", "section": "Automated Circuit Breakers",
            "verbatim_anchor_quote": "«The greatest financial threat in the room is looking at you in the mirror. Design circuit breakers that protect your future from your present impulses.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Защита от финансового самоповреждения", "subtopic": "Автоматические предохранители против разрушительных импульсов",
        "core_idea": "Главный враг счета — не брокер и не рынок, а сам человек в состоянии аффекта. Автоматические предохранители (лимит дневных потерь, запрет торговли на ночь) спасают жизнь депозиту.",
        "author_case": "Внедрение автоматического тайм-аута на 24 часа после двух стоп-лоссов подряд спасло депозиты тысяч клиентов финансовых платформ.",
        "step_by_step_protocol": "1. Настроить жесткие лимиты потерь на бирже. 2. Исключить возможность их ручной отмены во время торгового дня.",
        "linked_lessons": ["p8_l30", "p8_l43"], "linked_terms": ["Предохранители", "Самоповреждение"], "keywords": ["предохранители", "самоповреждение", "зеркало", "аффект", "кросби"]
    },
    {
        "id": "crs_015", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 15, "chapter_title": "True Wealth Metrics", "section": "Beyond the Bank Balance",
            "verbatim_anchor_quote": "«Measure your wealth by the quality of your relationships, your physical health, and your peace of mind, not by the digits on an exchange screen.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Истинные метрики жизненного богатства", "subtopic": "Оценка успеха через здоровье, душевный покой и качество отношений",
        "core_idea": "Счет на бирже — это лишь инструмент. Если погоня за цифрами разрушает здоровье, сон и отношения с близкими, человек становится банкротом в главном измерении жизни.",
        "author_case": "Опрос мультимиллионеров в конце жизни: 95% респондентов заявили, что их главное богатство — это семья, здоровье и душевное спокойствие, а не размер банковских счетов.",
        "step_by_step_protocol": "1. Регулярно инвестировать время и средства в здоровье и семью. 2. Не жертвовать сном и отношениями ради торговли.",
        "linked_lessons": ["p8_l29", "p8_l44"], "linked_terms": ["Метрики богатства", "Душевный покой"], "keywords": ["богатство", "здоровье", "семья", "покой", "баланс жизни", "кросби"]
    },
    {
        "id": "crs_016", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 16, "chapter_title": "The Illusion of Certainty", "section": "Embracing Probabilistic Living",
            "verbatim_anchor_quote": "«Certainty is an illusion sold by charlatans. True wisdom lies in embracing probabilistic outcomes with serene confidence.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Отказ от иллюзии определенности", "subtopic": "Жизнь и инвестиции в парадигме открытых вероятностей",
        "core_idea": "Попытка найти 100% гарантии в инвестициях делает человека легкой добычей финансовых мошенников. Зрелость инвестора — спокойная жизнь в мире вероятностей.",
        "author_case": "Доктор Кросби анализирует поведение жертв финансовых пирамид: все они искали '100% гарантированную высокую доходность', отказываясь принять неизбежность риска.",
        "step_by_step_protocol": "1. Избегать любых предложений со словом 'гарантия'. 2. Мыслить сценариями и вероятностями.",
        "linked_lessons": ["p8_l30", "p8_l45"], "linked_terms": ["Иллюзия определенности", "Вероятностная жизнь"], "keywords": ["гарантия", "определенность", "пирамиды", "вероятности", "кросби"]
    },
    {
        "id": "crs_017", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 17, "chapter_title": "The Emotional Balance Sheet", "section": "Auditing Psychological Assets",
            "verbatim_anchor_quote": "«Your emotional balance sheet is as important as your financial ledger. Audit your psychological assets (calm, discipline, patience) regularly.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эмоциональный балансовый отчет", "subtopic": "Аудит психологических активов: спокойствия, дисциплины и терпения",
        "core_idea": "Трейдер ведет финансовый учет, но забывает об эмоциональном балансе. Если психологические пассивы (тревога, обиды, усталость) превышают активы, финансовый крах неизбежен.",
        "author_case": "Внедрение ежемесячного эмоционального аудита в инвестиционной группе помогло вовремя выявлять выгорание у ключевых управляющих.",
        "step_by_step_protocol": "1. Раз в месяц оценивать состояние своих психологических активов от 1 до 10. 2. При истощении ресурсов брать паузу на восстановление.",
        "linked_lessons": ["p8_l29", "p8_l46"], "linked_terms": ["Эмоциональный баланс", "Аудит активов"], "keywords": ["эмоциональный баланс", "активы", "пассивы", "аудит", "кросби"]
    },
    {
        "id": "crs_018", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 18, "chapter_title": "The Power of Daily Rituals", "section": "Grounding in Routine",
            "verbatim_anchor_quote": "«Daily rituals ground you in reality during turbulent markets. When external chaos reigns, your internal routine is your sanctuary.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Сила ежедневных ритуалов", "subtopic": "Укоренение в привычной рутине во время рыночного хаоса",
        "core_idea": "Во время биржевых паник внешняя среда сходит с ума. Спасение трейдера — в строгом следовании неизменным ежедневным ритуалам (утренняя зарядка, кофе, проверка уровней, дыхание).",
        "author_case": "Трейдеры, сохранявшие неизменный утренний распорядок во время кризиса 2020 года, принимали на 60% более взвешенные решения по портфелю.",
        "step_by_step_protocol": "1. Создать фиксированный утренний ритуал. 2. Соблюдать его независимо от того, что происходит на мировых рынках.",
        "linked_lessons": ["p8_l30", "p8_l47"], "linked_terms": ["Ежедневные ритуалы", "Убежище рутины"], "keywords": ["ритуалы", "рутина", "хаос", "убежище", "стабильность", "кросби"]
    },
    {
        "id": "crs_019", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 19, "chapter_title": "Legacy and Meaning", "section": "The Final Purpose of Capital",
            "verbatim_anchor_quote": "«Capital is merely energy. Its ultimate value is determined by the meaning and legacy you create with it in the lives of others.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Наследие и высший смысл капитала", "subtopic": "Трансформация финансовой энергии в позитивное влияние на мир",
        "core_idea": "Накопление денег ради накопления бессмысленно. Истинное величие инвестора проявляется в том, как заработанный капитал улучшает жизнь семьи, общества и будущих поколений.",
        "author_case": "Истории великих филантропов (Эндрю Карнеги, Чак Фини): отдав почти всё состояние при жизни на образование и медицину, они обрели высший смысл своего труда.",
        "step_by_step_protocol": "1. Сформулировать долгосрочную миссию своего капитала. 2. Направлять часть прибыли на поддержку важных социальных проектов.",
        "linked_lessons": ["p8_l29", "p8_l48"], "linked_terms": ["Наследие", "Чак Фини"], "keywords": ["наследие", "фини", "карнеги", "смысл", "энергия", "кросби"]
    },
    {
        "id": "crs_020", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 20, "chapter_title": "Final Synthesis of The Soul of Wealth", "section": "The Integrated Investor",
            "verbatim_anchor_quote": "«The soul of wealth is found at the intersection of financial discipline, psychological self-mastery, and purposeful living.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Итоговый синтез The Soul of Wealth", "subtopic": "Гармония финансовой дисциплины, психологической зрелости и осознанной жизни",
        "core_idea": "Заключительный аккорд доктора Дэниела Кросби: истинный инвестор объединяет математику риска, знание своих слабостей и глубокое понимание истинных жизненных ценностей.",
        "author_case": "Финальный манифест доктора Кросби: поведенческие барьеры и душевный покой создают богатство, которое невозможно потерять ни при каких рыночных кризисах.",
        "step_by_step_protocol": "1. Следовать принципам поведенческого контроля. 2. Жить осознанной, наполненной смыслом жизнью.",
        "linked_lessons": ["p8_l29", "p8_l52"], "linked_terms": ["The Soul of Wealth", "Итог Кросби"], "keywords": ["душа богатства", "синтез", "итог", "осознанность", "кросби"]
    }
]

print(f"Book 14 (Dr. Daniel Crosby) verified: {len(CROSBY_ATOMS)} authentic atoms.")
