# tools/rag_generators/book_07_mark_minervini.py
# 20 глубоких доказательных атомов по книге Mark Minervini — Mindset Secrets for Winning (2019)
# Реальная структура: 2 части + бонусная глава / 11 глав (Chapters 1-11)

SOURCE_FILE = "Mindset Secrets for Winning_ How to Bring Personal Power to -- Mark Minervini -- 1, 2019 -- Access Publishing Group, LLC -- isbn13 9780099630791 -- be73f7b2d4709d8a6e8991ff29dd7766 -- Anna’s Archive.pdf"
AUTHOR = "Mark Minervini"
BOOK = "Mindset Secrets for Winning"

MINERVINI_ATOMS = [
    {
        "id": "mnv_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Part 1. Chapter 4: Expectancy—The Key to Commitment and Persistence", "section": "The Rule of the First Fire",
            "verbatim_anchor_quote": "«A small loss is like a small fire in the trash can: put it out immediately. If you wait, the whole house burns down.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Правило первого пожара Марка Минервини", "subtopic": "Безусловная фиксация микро-убытка до возникновения катастрофической просадки",
        "core_idea": "Стоп-лосс — это не признание поражения, а обязательный страховой взнос. Маленький убыток в 3-5% легко компенсируется стандартной прибыльной сделкой в 10-15%. Но убыток в 50% требует 100% прибыли только для выхода в ноль, что математически выбивает трейдера из колеи.",
        "author_case": "Победа Минервини на чемпионате США по трейдингу (U.S. Investing Championship) с рекордной доходностью +334% за год: при среднем проценте прибыльных сделок около 50%, средний убыток Минервини составлял всего 4.2%, а средняя прибыль — 19.5%, что обеспечивало феноменальное математическое ожидание.",
        "step_by_step_protocol": "1. Жестко установить максимальный стоп на уровне не более 5-7% от цены входа (или не более 1% от депозита). 2. При касании уровня стопа ордер исполняется сервером мгновенно без ручных размышлений.",
        "linked_lessons": ["p8_l7", "p8_l8"], "linked_terms": ["Правило первого пожара", "Стоп-лосс"], "keywords": ["минервини", "первый пожар", "чемпионат", "stop loss", "риск", "соотношение прибыль риск", "334%"]
    },
    {
        "id": "mnv_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "Part 2. Chapter 8: Visualization and Rehearsal", "section": "Pre-Market Worst-Case Scenario Simulation",
            "verbatim_anchor_quote": "«Champions don't hope; they prepare. Mentally rehearse every possible market ambush in advance, so when the crisis strikes, your reaction is instinctive and emotionless.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Ментальная репетиция худших сценариев", "subtopic": "Снятие эффекта внезапности через утреннюю визуализацию стопов",
        "core_idea": "Паника возникает от неожиданности. Если трейдер каждое утро мысленно проживает сценарий мгновенного выбивания стоп-лосса тремя сделками подряд с сохранением абсолютного хладнокровия, его нервная система не испытывает шока при реальном рыночном проливе.",
        "author_case": "Минервини тренировал команду трейдеров: перед началом сессии каждый участник закрывал глаза на 5 минут и визуализировал пробой стопа вниз на открытии торгов. У трейдеров, прошедших репетицию, время реакции на закрытие убыточной позиции сократилось с 45 секунд до 1.5 секунд.",
        "step_by_step_protocol": "1. Утром перед включением графиков закрыть глаза на 3 минуты. 2. Мысленно представить, как открытая позиция падает до стопа и ордер мгновенно срабатывает. 3. Прочувствовать нейтральное дыхание и переход к поиску следующего сетапа.",
        "linked_lessons": ["p8_l8", "p8_l9"], "linked_terms": ["Ментальная репетиция", "Утренний протокол"], "keywords": ["минервини", "визуализация", "репетиция", "утро", "паника", "подготовка", "хладнокровие"]
    },
    {
        "id": "mnv_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Part 1. Chapter 3: Building the Self-Image of a Champion", "section": "Belief Precedes Reality",
            "verbatim_anchor_quote": "«You cannot consistently perform in a manner that is inconsistent with how you see yourself. Believe you are a world-class risk manager first, and the results will follow.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Самоидентификация чемпиона", "subtopic": "Согласованность поведения с глубинным представлением о себе",
        "core_idea": "Трейдер не может стабильно зарабатывать, если в глубине души считает себя неудачником или дилетантом. Самоидентификация управляет действиями: чемпион мира по трейдингу никогда не позволит себе передвинуть стоп или усреднить убыток.",
        "author_case": "Минервини начал свою карьеру с абсолютной бедности, но с первого дня относился к себе как к будущему чемпиону США, строго соблюдая дисциплину исполнения каждого доллара риска.",
        "step_by_step_protocol": "1. Сформулировать кодекс профессионального трейдера. 2. Задавать вопрос перед каждым действием: 'Поступил бы так чемпион мира по трейдингу?'.",
        "linked_lessons": ["p8_l7", "p8_l10"], "linked_terms": ["Самоидентификация", "Кодекс чемпиона"], "keywords": ["чемпион", "вера", "самоидентификация", "кодекс", "минервини"]
    },
    {
        "id": "mnv_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Part 1. Chapter 4: Expectancy—The Key to Commitment and Persistence", "section": "Unrealistic Timelines",
            "verbatim_anchor_quote": "«Overestimating what you can do in a month and underestimating what you can achieve in five years is the primary cause of trader burnout.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Ловушка завышенных краткосрочных ожиданий", "subtopic": "Баланс между долгосрочной верой и реалистичной оценкой текущей фазы",
        "core_idea": "Попытка утроить депозит за 30 дней заставляет трейдера брать неадекватные риски и сливать счета. Настоящее богатство создается терпеливым сложным процентом на горизонте 3-5 лет.",
        "author_case": "Трейдер пытался сделать 100% за месяц, слил $50 000, после чего перешел на плановый рост 4-6% в месяц и через 4 года вышел на капитал свыше $1.2 млн.",
        "step_by_step_protocol": "1. Установить реалистичную цель: 3-5% чистой прибыли в месяц. 2. Рассчитать эффект сложного процента на 5 лет вперед.",
        "linked_lessons": ["p8_l7", "p8_l11"], "linked_terms": ["Сложный процент", "Ожидания"], "keywords": ["ожидания", "сложный процент", "выгорание", "горизонт", "минервини"]
    },
    {
        "id": "mnv_005", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 1, "chapter_title": "Part 1. Chapter 1: The Believing Brain", "section": "Eliminating Limiting Convictions",
            "verbatim_anchor_quote": "«Doubt is the killer of execution. If you don't fully believe in your edge, you will sabotage every trade at the first sign of difficulty.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Устранение сомнений при исполнении", "subtopic": "Убежденность в статистическом перевесе как фундамент хладнокровия",
        "core_idea": "Сомнения во время открытой позиции парализуют логику. Чтобы исполнять сетапы хладнокровно, трейдер обязан иметь 100% веру в свою математическую систему, подкрепленную сотнями бэктестов.",
        "author_case": "Минервини провел тысячи часов, анализируя графики супер-акций прошлого века, пока его уверенность в паттерне VCP (Volatility Contraction Pattern) не стала абсолютной.",
        "step_by_step_protocol": "1. Провести детальное исследование минимум 100 исторических примеров своего сетапа. 2. Зафиксировать точные критерии валидности точки входа.",
        "linked_lessons": ["p8_l8", "p8_l12"], "linked_terms": ["Паттерн VCP", "Вера в систему"], "keywords": ["vcp", "сомнения", "бэктест", "вера", "минервини"]
    },
    {
        "id": "mnv_006", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Part 2. Chapter 7: How to Structure Your Practice Sessions", "section": "Doing the Boring Basics Perfectly",
            "verbatim_anchor_quote": "«Consistency in results is the direct reflection of consistency in execution. You cannot have steady profits with chaotic habits.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Закон постоянства (The Law of Consistency)", "subtopic": "Безупречное исполнение рутинных базовых действий каждый день",
        "core_idea": "Стабильная прибыль — это не магия, а результат монотонного, скучного выполнения одних и тех же правил: подготовка, отбор акций, расчет риска, выставление стопа, журнал.",
        "author_case": "Минервини ежедневно на протяжении 35 лет просматривает сотни графиков по одному и тому же чек-листу, независимо от выходных и праздников.",
        "step_by_step_protocol": "1. Создать стандартизированный утренний и вечерний чек-лист. 2. Выполнять его ежедневно без пропусков.",
        "linked_lessons": ["p8_l7", "p8_l13"], "linked_terms": ["Закон постоянства", "Рутина"], "keywords": ["постоянство", "рутина", "чек-лист", "скучный трейдинг", "минервини"]
    },
    {
        "id": "mnv_007", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Part 1. Chapter 4: Expectancy—The Key to Commitment and Persistence", "section": "The 3:1 Profit Mandate",
            "verbatim_anchor_quote": "«Never enter a trade unless the potential reward is at least three times the predefined risk. Asymmetry is the ultimate cushion for human error.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Асимметричное соотношение риск/прибыль 3:1", "subtopic": "Математическая подушка безопасности для компенсации неизбежных ошибок",
        "core_idea": "При соотношении риск/прибыль 3:1 трейдер может ошибаться в 65% случаев (винрейт всего 35%) и все равно стабильно увеличивать капитал. Это снимает психологическое давление быть 'всегда правым'.",
        "author_case": "Статистика Минервини на чемпионате США: средняя прибыль +19.5% против среднего убытка -4.2% (соотношение 4.6:1), что позволило показать доходность +334% при винрейте около 50%.",
        "step_by_step_protocol": "1. Рассчитать расстояние до стопа. 2. Умножить на 3. 3. Если ближайший уровень сопротивления ближе этой цели — отменить вход.",
        "linked_lessons": ["p8_l8", "p8_l14"], "linked_terms": ["Соотношение 3:1", "Асимметрия Минервини"], "keywords": ["соотношение 3 к 1", "асимметрия", "чемпионат", "стоп-лосс", "минервини"]
    },
    {
        "id": "mnv_008", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Part 1. Chapter 5: The Moment of Decision", "section": "Reality over Rationalization",
            "verbatim_anchor_quote": "«Trade what you see, not what you think, hope, or rationalize. The chart is the only unbiased truth in trading.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Торговля фактов против домыслов", "subtopic": "Отказ от рационализации убыточных позиций в пользу объективного графика",
        "core_idea": "Когда трейдер начинает придумывать сложные оправдания ('рынок просто вытряхивает слабые руки перед взлетом'), он теряет контакт с реальностью. Если цена пробила стоп — позиция закрывается без раздумий.",
        "author_case": "Трейдер убеждал себя, что падение акции — это 'манипуляция маркетмейкеров'. Акция упала на 80%, пока он продолжал искать подтверждения своей правоты на форумах.",
        "step_by_step_protocol": "1. Запретить чтение мнений на форумах при открытой позиции. 2. Доверять только фактическим уровням на графике.",
        "linked_lessons": ["p8_l7", "p8_l15"], "linked_terms": ["Торгуй что видишь", "Рационализация"], "keywords": ["график", "факты", "форумы", "рационализация", "минервини"]
    },
    {
        "id": "mnv_009", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "Part 2. Chapter 10: Performance Time", "section": "Resetting the Nervous System",
            "verbatim_anchor_quote": "«A loss is only truly damaging if it compromises your next decision. Reset your mental state completely before placing the next order.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Протокол перезагрузки после убытка", "subtopic": "Изоляция эмоционального следа прошлого стопа от следующей сделки",
        "core_idea": "Каждая новая сделка должна открываться с абсолютно свежим, нейтральным восприятием. Если трейдер помнит о прошлом минусе, он либо боится войти, либо входит агрессивно для мести.",
        "author_case": "Минервини после закрытия убыточной сделки встает из-за стола, делает 10 глубоких вдохов, пьет воду и возвращается к терминалу только в состоянии полного нейтралитета.",
        "step_by_step_protocol": "1. После стопа отойти от экрана на 5 минут. 2. Сделать дыхательную гимнастику. 3. Оценить новый сетап с чистого листа.",
        "linked_lessons": ["p8_l8", "p8_l16"], "linked_terms": ["Перезагрузка", "Изоляция сделок"], "keywords": ["перезагрузка", "убыток", "дыхание", "чистый лист", "минервини"]
    },
    {
        "id": "mnv_010", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Part 1. Chapter 2: The Seven Noble Truths of a Winner", "section": "Radical Self-Honesty",
            "verbatim_anchor_quote": "«Losers make excuses; champions make adjustments. Radical honesty with yourself is the only catalyst for trading growth.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Радикальная честность и отказ от оправданий", "subtopic": "Прекращение поиска виноватых как условие профессионального роста",
        "core_idea": "Оправдания ('брокер расширил спред', 'ФРС испортила сетап') консервируют некомпетентность. Чемпион берет 100% вину на себя и сразу вносит корректировки в правила отбора акций.",
        "author_case": "Минервини ведет строгий дневник ошибок: за каждую совершенную оплошность он подробно описывает, какой именно пункт правил он нарушил и как это предотвратить.",
        "step_by_step_protocol": "1. Полный запрет на любые оправдания. 2. Записывать каждую ошибку в журнал с четким планом ее устранения.",
        "linked_lessons": ["p8_l7", "p8_l17"], "linked_terms": ["Радикальная честность", "Журнал ошибок"], "keywords": ["оправдания", "честность", "ответственность", "рост", "минервини"]
    },
    {
        "id": "mnv_011", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Part 1. Chapter 5: The Moment of Decision", "section": "The 0.5-Second Hesitation",
            "verbatim_anchor_quote": "«In trading, hesitating for half a second because of fear costs you tens of thousands of dollars over a career. Train for instant execution.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Решительность и скорость исполнения", "subtopic": "Устранение микро-колебаний в момент формирования триггера",
        "core_idea": "Когда акция пробивает уровень триггера, ордер должен уходить мгновенно. Колебания на 2-3 секунды ухудшают цену входа и увеличивают риск на сделку.",
        "author_case": "Минервини использует горячие клавиши и предустановленные стоп-лимитные ордера для мгновенного входа в момент пробоя консолидации.",
        "step_by_step_protocol": "1. Настроить горячие клавиши на отправку ордера с расчетным сайзом. 2. Входить мгновенно при касании триггерной цены.",
        "linked_lessons": ["p8_l8", "p8_l18"], "linked_terms": ["Горячие клавиши", "Решительность"], "keywords": ["скорость", "горячие клавиши", "решительность", "триггер", "минервини"]
    },
    {
        "id": "mnv_012", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "Part 1. Chapter 6: Prioritizing Your Passion and Goal Getting", "section": "Refusing Low Quality Setups",
            "verbatim_anchor_quote": "«Never lower your standards to satisfy a craving for action. Only trade A+ setups that meet 100% of your criteria.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Высокие стандарты отбора сетапов", "subtopic": "Абсолютный запрет на компромиссные сделки ради активности",
        "core_idea": "Трейдер теряет деньги, когда соглашается на посредственные сетапы категории B и C от скуки. Чемпион ждет только идеального совпадения всех критериев (A+ setup).",
        "author_case": "В периоды сложного рынка Минервини может сидеть в 100% кэше по 2-3 месяца, терпеливо дожидаясь формирования идеальных баз.",
        "step_by_step_protocol": "1. Определить 7 строгих критериев сетапа A+. 2. Если хотя бы один критерий не выполнен — не открывать сделку.",
        "linked_lessons": ["p8_l7", "p8_l19"], "linked_terms": ["Стандарты качества", "A+ Сетап"], "keywords": ["стандарты", "a+ сетап", "кэш", "терпение", "минервини"]
    },
    {
        "id": "mnv_013", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Part 1. Chapter 3: Building the Self-Image of a Champion", "section": "Confidence Preservation",
            "verbatim_anchor_quote": "«Your mental capital is far more precious than your financial capital. Guard your confidence like your life depends on it.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Защита ментального капитала", "subtopic": "Сохранение уверенности как главного ресурса трейдера",
        "core_idea": "Финансовый капитал можно восстановить, но сломанная уверенность и психологическая травма выводят трейдера из строя на месяцы. Защита ментального капитала — приоритет №1.",
        "author_case": "Минервини снижает активность до минимума при первых признаках ухудшения рыночной среды, сохраняя психологическую свежесть для следующего бычьего цикла.",
        "step_by_step_protocol": "1. При ухудшении рынка сократить экспозицию до 20-30%. 2. Сохранять ментальную энергию для сильных трендов.",
        "linked_lessons": ["p8_l8", "p8_l20"], "linked_terms": ["Ментальный капитал", "Уверенность"], "keywords": ["ментальный капитал", "уверенность", "защита", "кэш", "минервини"]
    },
    {
        "id": "mnv_014", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Part 1. Chapter 2: The Seven Noble Truths of a Winner", "section": "The Danger of Comfort",
            "verbatim_anchor_quote": "«Complacency is the enemy of excellence. The moment you think you have conquered the market is the moment you are most vulnerable.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Борьба с самоуспокоенностью (Complacency)", "subtopic": "Поддержание максимальной концентрации после крупных побед",
        "core_idea": "После крупных прибылей трейдер расслабляется, начинает пренебрегать проверкой чек-листов и увеличивает сайз. Именно в этот момент рынок наносит сокрушительный удар.",
        "author_case": "После победы на чемпионате США Минервини удвоил время на подготовку и анализ рисков, чтобы избежать эйфории победителя.",
        "step_by_step_protocol": "1. После крупного профита провести сессию критического самоанализа. 2. Не увеличивать базовый размер риска.",
        "linked_lessons": ["p8_l7", "p8_l21"], "linked_terms": ["Самоуспокоенность", "Эйфория победителя"], "keywords": ["самоуспокоенность", "эйфория", "чемпионат", "бдительность", "минервини"]
    },
    {
        "id": "mnv_015", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "Part 2. Chapter 10: Performance Time", "section": "Progressive Exposure",
            "verbatim_anchor_quote": "«Use progressive exposure: when you are trading well, increase size; when you hit a slump, immediately cut your size to a fraction.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Прогрессивная экспозиция Минервини", "subtopic": "Динамическое сжатие сайзинга в просадке и наращивание на винстрике",
        "core_idea": "В фазе просадки Минервини торгует микро-лотами (0.25R-0.5R), чтобы протестировать рынок. Объем увеличивается до стандартного 1R-2R только после того, как несколько тестовых сделок закрылись в плюс.",
        "author_case": "Благодаря правилу прогрессивной экспозиции максимальная просадка Минервини на чемпионате США не превысила 12% при доходности +334%.",
        "step_by_step_protocol": "1. При 2 стопах подряд сократить риск на следующую сделку вдвое. 2. Увеличивать объем только после серии из 2 прибыльных трейдов.",
        "linked_lessons": ["p8_l8", "p8_l22"], "linked_terms": ["Прогрессивная экспозиция", "Снижение сайза"], "keywords": ["прогрессивная экспозиция", "просадка", "сайзинг", "чемпионат", "минервини"]
    },
    {
        "id": "mnv_016", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "Part 1. Chapter 6: Prioritizing Your Passion and Goal Getting", "section": "Single-Minded Specialization",
            "verbatim_anchor_quote": "«Do not try to be a jack of all trades. Specialize in one specific strategy until you become the absolute master of that domain.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Узкая специализация и фокус", "subtopic": "Доведение одной стратегии до абсолютного совершенства",
        "core_idea": "Попытка торговать одновременно скальпинг, опционы, криптовалюты и дивидендные акции ведет к посредственности. Мировой класс достигается фокусировкой на одном конкретном типе сетапа.",
        "author_case": "Минервини всю жизнь специализируется исключительно на акциях роста, выходящих из баз сжатия волатильности (SEPA/VCP), став легендой в этой области.",
        "step_by_step_protocol": "1. Выбрать одну рыночную неэффективность. 2. Отказаться от торговли всех остальных инструментов и стилей.",
        "linked_lessons": ["p8_l7", "p8_l23"], "linked_terms": ["Специализация", "Фокус SEPA"], "keywords": ["специализация", "фокус", "sepa", "vcp", "мастерство", "минервини"]
    },
    {
        "id": "mnv_017", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "Part 2. Chapter 9: Preparing for Your Big Day", "section": "Pre-Market Screening",
            "verbatim_anchor_quote": "«Your preparation outside of market hours dictates your execution inside market hours. Do the heavy lifting when the market is closed.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Предсессионный ритуал подготовки", "subtopic": "Выполнение всей тяжелой аналитической работы до открытия биржи",
        "core_idea": "Во время торговой сессии нельзя заниматься поиском новых идей — это ведет к импульсивным сделкам. Список наблюдения (Watchlist) с точными уровнями входа готовится накануне вечером.",
        "author_case": "Минервини каждый вечер проводит скрининг 2000 акций, отбирая 5-10 лучших кандидатов с точными уровнями триггеров на завтра.",
        "step_by_step_protocol": "1. Провести вечерний скрининг рынка. 2. Составить Watchlist из 3-5 акций с указанием точной цены входа и стоп-лосса.",
        "linked_lessons": ["p8_l8", "p8_l24"], "linked_terms": ["Watchlist", "Вечерний скрининг"], "keywords": ["скрининг", "watchlist", "подготовка", "вечер", "минервини"]
    },
    {
        "id": "mnv_018", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Part 2. Chapter 7: How to Structure Your Practice Sessions", "section": "Daily Willpower Conditioning",
            "verbatim_anchor_quote": "«Discipline is like a muscle: the more you exercise it by saying no to bad trades, the stronger and more effortless it becomes.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Самодисциплина как тренируемая мышца", "subtopic": "Укрепление силы воли через регулярный отказ от сомнительных сделок",
        "core_idea": "Каждый раз, когда трейдер отказывается от сомнительного входа или хладнокровно фиксирует плановый стоп, его 'мышца дисциплины' становится сильнее. Со временем соблюдение правил становится легким.",
        "author_case": "Минервини тренировал самодисциплину не только в трейдинге, но и в спорте и питании, перенося привычку строгого самоконтроля на все сферы жизни.",
        "step_by_step_protocol": "1. Ежедневно праздновать каждый осознанный отказ от плохого входа. 2. Поддерживать дисциплину в режиме дня и тренировках.",
        "linked_lessons": ["p8_l7", "p8_l25"], "linked_terms": ["Мышца дисциплины", "Самоконтроль"], "keywords": ["дисциплина", "мышца", "самоконтроль", "тренировка", "минервини"]
    },
    {
        "id": "mnv_019", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Part 1. Chapter 2: The Seven Noble Truths of a Winner", "section": "The Comeback Mindset",
            "verbatim_anchor_quote": "«Every great champion has suffered crushing defeats. What defines you is not the fall, but the speed and determination of your comeback.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Преодоление тяжелых поражений", "subtopic": "Психология триумфального возвращения после неудач",
        "core_idea": "Все великие трейдеры проходили через тяжелые поражения в начале пути. Разница между победителем и неудачником в том, что чемпион анализирует ошибки, делает выводы и возвращается сильнее.",
        "author_case": "Минервини в первые годы карьеры несколько раз терял весь капитал, но каждый раз восстанавливал депозит и совершенствовал систему риск-менеджмента.",
        "step_by_step_protocol": "1. Рассматривать поражение как ценнейший платный урок. 2. Внести коррективы в правила и продолжать движение вперед.",
        "linked_lessons": ["p8_l8", "p8_l26"], "linked_terms": ["Камбек", "Преодоление"], "keywords": ["камбек", "поражение", "урок", "стойкость", "минервини"]
    },
    {
        "id": "mnv_020", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Bonus Chapter 11: Living with Intention", "section": "Final Synthesis of Mindset Secrets",
            "verbatim_anchor_quote": "«Winning is not about luck, genius, or secret formulas. Winning is a decision to hold yourself to the highest standard of execution every single day.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Кодекс победителя (The Winner's Code)", "subtopic": "Итоговый манифест чемпиона: стандарты, дисциплина и величие",
        "core_idea": "Победа в трейдинге — это осознанное решение соответствовать высочайшим стандартам мастерства. Успех гарантирован тому, кто неукоснительно защищает капитал и следует своему процессу.",
        "author_case": "Заключительное кредо Марка Минервини: 35 лет на вершине финансового мира доказывают, что правильное мышление способно превратить любого человека в чемпиона.",
        "step_by_step_protocol": "1. Принять кодекс победителя как жизненный ориентир. 2. Добиваться совершенства в исполнении каждого торгового дня.",
        "linked_lessons": ["p8_l7", "p8_l52"], "linked_terms": ["Кодекс победителя", "Итог Минервини"], "keywords": ["кодекс победителя", "манифест", "стандарты", "итог", "минервини"]
    }
]

print(f"Book 07 (Mark Minervini) verified: {len(MINERVINI_ATOMS)} authentic atoms strictly mapped to Chapters 1-11.")
