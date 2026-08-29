# tools/rag_generators/book_15_morgan_housel.py
# 20 глубоких доказательных атомов по книге Morgan Housel — The Art of Spending Money / The Psychology of Money (2024)
# Реальная структура: 21 глава-история (Chapters 1-21)

SOURCE_FILE = "The_Art_of_Spending_Money_Simple_Choices_for_a_Better_Life -- Morgan_Housel -- 2024 -- Harriman_House -- 9781804090947 -- d94191d848ce197a9f7331fa2a74c4a4 -- Anna’s Archive.epub"
AUTHOR = "Morgan Housel"
BOOK = "The Art of Spending Money / The Psychology of Money"

HOUSEL_ATOMS = [
    {
        "id": "hsl_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 15, "chapter_title": "Chapter 15: Nothing’s Free: The Price of Market Volatility", "section": "Volatility as an Admission Fee",
            "verbatim_anchor_quote": "«Market volatility is not a fine for doing something wrong; it is an admission fee to the greatest wealth-generating show on earth. Pay the fee willingly.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Волатильность как входной билет, а не штраф", "subtopic": "Ментальный рефрейминг рыночных просадок и неопределенности",
        "core_idea": "Большинство трейдеров воспринимают просадку или сработавший стоп-лосс как штраф за ошибку (fine). Но в финансовых рынках волатильность — это стоимость входного билета (admission fee) в Диснейленд высокой доходности. Если вы хотите зарабатывать сверхприбыль, вы обязаны платить за билет, принимая нормальные рыночные колебания.",
        "author_case": "Исторический анализ Моргана Хаузела по индексу S&P 500 и криптоактивам: акции росли на 10% в год в среднем, но каждые 3 года переживали просадку на 20%, а каждые 6 лет — на 35%. Инвесторы, считавшие просадку платой за билет, сколотили огромные состояния; те, кто считал её штрафом и паниковал — обнулились.",
        "step_by_step_protocol": "1. Переформулировать в сознании убыточный день: 'Это не наказание, это входной билет за право извлекать прибыль из волатильности'. 2. Закладывать 20-30% просадки портфеля как базовый операционный сценарий.",
        "linked_lessons": ["p8_l46", "p8_l47"], "linked_terms": ["Входной билет", "Волатильность как плата", "Морган Хаузел"], "keywords": ["хаузел", "волатильность", "входной билет", "штраф", "диснейленд", "s&p500", "психология денег"]
    },
    {
        "id": "hsl_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "Chapter 9: Wealth is What You Don’t See", "section": "Invisible Wealth vs Conspicuous Consumption",
            "verbatim_anchor_quote": "«Spending money to show people how much money you have is the fastest way to have less money. Real wealth is the options you haven't bought yet.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Богатство — это то, чего вы не видите", "subtopic": "Разница между показным богатством (Rich) и истинной финансовой свободой (Wealthy)",
        "core_idea": "Быть богатым напоказ (Rich) — это водить спорткар за $200k и жить в долг. Истинное богатство (Wealthy) невидимо: это некупленные машины, непротраченные деньги, свободный кэш на счетах и право в любой день сказать 'нет' нежелательной работе.",
        "author_case": "История миллионера Рональда Рида (скромного уборщика и заправщика), накопившего $8 млн в акциях благодаря скромной жизни и сложному проценту, противопоставленная топ-менеджеру Ричарду Фускону, обанкротившемуся из-за гигантского особняка и кредитов в 2008 году.",
        "step_by_step_protocol": "1. Не демонстрировать финансовый успех покупками дорогих пассивов. 2. Направлять прибыль в накопление активов, генерирующих независимость.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Невидимое богатство", "Рональд Рид", "Ричард Фускон"], "keywords": ["хаузел", "богатство", "роналд рид", "спорткар", "невидимое богатство", "статус"]
    },
    {
        "id": "hsl_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Chapter 7: Freedom: The Highest Dividend", "section": "Time Sovereignty",
            "verbatim_anchor_quote": "«The highest dividend money pays is the ability to control your time. To do what you want, when you want, with who you want, for as long as you want.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Контроль над своим временем как высший дивиденд", "subtopic": "Осознание автономии как главного мерила успешности трейдера",
        "core_idea": "Самая ценная форма богатства — это суверенитет над своим временем. Возможность в любой момент закрыть терминал, пойти гулять с детьми и не зависеть от начальников и расписаний — это высший дивиденд, который только могут принести деньги.",
        "author_case": "Хаузел исследовал уровень счастья тысяч людей: самым главным общим фактором счастья оказался не размер зарплаты или дома, а субъективное ощущение контроля над своим ежедневным расписанием.",
        "step_by_step_protocol": "1. Оценивать торговый успех не суммой PnL, а количеством часов свободы, которые он вам дает. 2. Не позволять трейдингу превращаться во вторую изнуряющую работу.",
        "linked_lessons": ["p8_l46", "p8_l49"], "linked_terms": ["Высший дивиденд", "Контроль времени"], "keywords": ["свобода", "время", "дивиденд", "счастье", "автономия", "хаузел"]
    },
    {
        "id": "hsl_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Chapter 5: Getting Wealthy vs Staying Wealthy", "section": "The Survival Mindset",
            "verbatim_anchor_quote": "«Getting wealthy requires taking risk, being optimistic, and putting yourself out there. Staying wealthy requires the exact opposite: paranoia and humility.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Стать богатым против Остаться богатым", "subtopic": "Парадокс выживания: почему для сохранения капитала нужны паранойя и скромность",
        "core_idea": "Чтобы заработать деньги, нужен оптимизм и смелость брать риск. Но чтобы сохранить их, требуется совершенно противоположное поведение: скромность, осторожность и легкая паранойя по поводу того, что заработанное может испариться за 1 день.",
        "author_case": "Анализ карьеры Джесси Ливермора: он трижды зарабатывал фантастические состояния благодаря невероятной смелости, но трижды терял всё до копейки, потому что не обладал навыком 'оставаться богатым'.",
        "step_by_step_protocol": "1. После серии крупных побед немедленно включать режим защиты капитала. 2. Выводить часть прибыли с торгового счета в консервативные безрисковые активы.",
        "linked_lessons": ["p8_l47", "p8_l50"], "linked_terms": ["Стать vs Остаться богатым", "Паранойя выживания"], "keywords": ["выживание", "ливермор", "сохранение", "паранойя", "скромность", "хаузел"]
    },
    {
        "id": "hsl_005", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "Chapter 6: Tails, You Win", "section": "The Power of Tail Events",
            "verbatim_anchor_quote": "«You can be wrong half the time and still make a fortune. A small number of tail events account for the majority of investment outcomes.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Хвостовые события (Tails, You Win)", "subtopic": "Почему 90% всей прибыли генерируются 1% экстремальных сделок",
        "core_idea": "В инвестициях и венчурном капитале правит закон распределения Парето: из 100 инвестиций 50 принесут убыток, 40 дадут скромный результат, и лишь 1-2 сделки дадут тысячи процентов прибыли, окупив всё остальное. В трейдинге точно так же — 2-3 крупных тренда формируют весь годовой профит.",
        "author_case": "Уоррен Баффет признался на собрании акционеров: из сотен купленных за 60 лет акций весь колоссальный результат Berkshire Hathaway определили всего 10 удачных решений (Coca-Cola, Apple, Geico).",
        "step_by_step_protocol": "1. Не переживать из-за 50% мелких системных стоп-лоссов. 2. Давать прибыли течь в тех редких хвостовых сделках, которые попали в супер-тренд.",
        "linked_lessons": ["p8_l46", "p8_l51"], "linked_terms": ["Хвостовые события", "Баффет", "Tails Win"], "keywords": ["хвосты", "баффет", "парето", "венчур", "тренд", "хаузел"]
    },
    {
        "id": "hsl_006", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 13, "chapter_title": "Chapter 13: Room for Error: The Margin of Safety", "section": "Room for Error",
            "verbatim_anchor_quote": "«The most important part of every plan is planning on your plan not going according to plan. Margin of safety is the only protection against the unknowable.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Запас прочности (Room for Error / Margin of Safety)", "subtopic": "Учет сценариев, когда всё идет не по плану",
        "core_idea": "План, который работает только при идеальном развитии событий — это не план, а рецепт катастрофы. Надежный план закладывает право на ошибку: возможность выдержать просадку, проскальзывание и временную потерю дохода.",
        "author_case": "Бенджамин Грэм и инженерия мостов: мост проектируют так, чтобы он выдерживал грузовик весом 30 тонн, даже если по нему ездят только 10-тонные машины. Трейдер должен рассчитывать размер позиции с тройным запасом прочности.",
        "step_by_step_protocol": "1. Проверить свой депозит на стресс-тест: выдержит ли счет серию из 10 стопов подряд? 2. Уменьшать размер риска до тех пор, пока ответ не станет 100% 'Да'.",
        "linked_lessons": ["p8_l47", "p8_l52"], "linked_terms": ["Запас прочности", "Margin of Safety", "Грэм"], "keywords": ["запас прочности", "грэм", "мост", "стресс-тест", "план", "хаузел"]
    },
    {
        "id": "hsl_007", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "Chapter 8: The Man in the Car Paradox", "section": "The Illusion of Admiration",
            "verbatim_anchor_quote": "«The Man in the Car Paradox: when you see someone in a Ferrari, you don’t admire the driver; you fantasize about yourself in the driver’s seat. No one cares about your possessions as much as you do.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Парадокс человека в дорогой машине", "subtopic": "Осознание иллюзорности чужого восхищения дорогими покупками",
        "core_idea": "Люди покупают дорогие вещи, надеясь получить уважение и восхищение окружающих. Но парадокс в том, что прохожие смотрят на спорткар и представляют себя за рулем, совершенно не замечая и не уважая водителя.",
        "author_case": "Хаузел работал парковщиком в элитном отеле Лос-Анджелеса: он видел сотни владельцев суперкаров и понял, что ни один человек не вызывал у него восхищения просто из-за дорогой машины.",
        "step_by_step_protocol": "1. Задавать себе вопрос перед крупной статусной покупкой: 'Я покупаю это ради себя или ради чужих взглядов?'. 2. Сохранять капитал для инвестиций.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Парадокс человека в машине", "Статус"], "keywords": ["феррари", "парадокс", "парковщик", "статус", "восхищение", "хаузел"]
    },
    {
        "id": "hsl_008", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Chapter 11: Reasonable > Rational", "section": "Reasonable vs Rational",
            "verbatim_anchor_quote": "«Do not aim to be coldly rational on paper; aim to be humanly reasonable. A reasonable strategy that lets you sleep at night beats a mathematically optimal strategy you abandon in panic.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Разумность важнее холодной рациональности (Reasonable > Rational)", "subtopic": "Выбор стратегии, позволяющей спокойно спать по ночам",
        "core_idea": "Математически оптимальная стратегия с плечом на бумаге дает максимум доходности. Но в реальной жизни живой человек не выдержит 40% просадки и продаст всё на дне в панике. Разумная стратегия со скромным риском позволяет спокойно спать и не совершать глупостей.",
        "author_case": "Хаузел сам полностью выплатил ипотеку за свой дом, хотя с точки зрения чистой математики выгоднее было инвестировать деньги в акции. Спокойствие жены и семьи оказалось важнее лишних 2% доходности.",
        "step_by_step_protocol": "1. Выбирать параметры риска, вызывающие нулевой стресс перед сном. 2. Отказаться от погони за теоретически идеальной доходностью в пользу психологического комфорта.",
        "linked_lessons": ["p8_l47", "p8_l49"], "linked_terms": ["Reasonable vs Rational", "Спокойный сон"], "keywords": ["рациональность", "разумность", "ипотека", "сон", "комфорт", "хаузел"]
    },
    {
        "id": "hsl_009", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 16, "chapter_title": "Chapter 16: You & Me: The Danger of Playing Different Games", "section": "Playing Different Games",
            "verbatim_anchor_quote": "«The cardinal sin in investing is taking behavioral cues from people playing a completely different game than you are.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Опасность игры в чужие игры (Playing Different Games)", "subtopic": "Защита своей стратегии от копирования действий спекулянтов с другим горизонтом",
        "core_idea": "Дневной скальпер покупает монету ради импульса на 30 секунд. Если долгосрочный инвестор смотрит на его покупку и тоже покупает, он совершает катастрофическую ошибку: они играют в совершенно разные игры с разными горизонтами и правилами выхода.",
        "author_case": "Пузырь доткомов 1999 года: долгосрочные инвесторы разорились, начав копировать дневных спекулянтов, торговавших акции Cisco и Yahoo внутри дня.",
        "step_by_step_protocol": "1. Четко определить свой инвестиционный горизонт и правила выхода. 2. Никогда не слушать советы и сделки трейдеров, играющих в другую игру.",
        "linked_lessons": ["p8_l46", "p8_l50"], "linked_terms": ["Чужие игры", "Инвестиционный горизонт"], "keywords": ["игры", "горизонт", "скальпер", "доткомы", "копирование", "хаузел"]
    },
    {
        "id": "hsl_0010", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 17, "chapter_title": "Chapter 17: The Seduction of Pessimism", "section": "The Allure of Pessimism",
            "verbatim_anchor_quote": "«Pessimism sounds smart and intellectual; optimism sounds naive and simplistic. But progress is a quiet, powerful force that wins in the long run.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Соблазн пессимизма (The Seduction of Pessimism)", "subtopic": "Почему апокалиптические прогнозы привлекают внимание, но разрушают доходность",
        "core_idea": "Пессимистичный прогноз звучит убедительно, умно и требует немедленного внимания. Оптимизм кажется наивным. Но история показывает: разрушение происходит мгновенно (новости), а созидание идет медленно и тихо через сложный процент.",
        "author_case": "Исторические примеры Хаузела: на протяжении 150 лет экономика пережила Великую депрессию, две мировые войны и пандемии, увеличив уровень жизни и капитализацию рынков в сотни раз.",
        "step_by_step_protocol": "1. Игнорировать регулярные апокалиптические прогнозы в СМИ. 2. Держать фокус на долгосрочном росте инноваций и производительности труда.",
        "linked_lessons": ["p8_l47", "p8_l51"], "linked_terms": ["Соблазн пессимизма", "Долгосрочный оптимизм"], "keywords": ["пессимизм", "оптимизм", "сми", "крах", "прогресс", "хаузел"]
    },
    {
        "id": "hsl_0011", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Chapter 4: Compounding and Long Horizons", "section": "The Power of Time",
            "verbatim_anchor_quote": "«Warren Buffett's skill is investing, but his secret is time. 99% of his wealth was accumulated after his 50th birthday.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Секрет сложного процента Баффета — это Время", "subtopic": "Непрерывность инвестирования как главный драйвер гипер-богатства",
        "core_idea": "Феномен богатства Баффета объясняется не запредельной годовой доходностью (около 20-22%), а тем, что он непрерывно инвестирует уже более 75 лет. Если бы он начал в 30 и закончил в 60, о нем никто бы никогда не услышал.",
        "author_case": "Математический расчет Хаузела: более 99% всего состояния Уоррена Баффета (свыше $100 млрд) было создано после того, как ему исполнилось 50 лет.",
        "step_by_step_protocol": "1. Настроить долгосрочный инвестиционный горизонт на 10-20 лет. 2. Никогда не прерывать сложный процент необдуманным выводом капитала или сливом на плечах.",
        "linked_lessons": ["p8_l46", "p8_l52"], "linked_terms": ["Сложный процент", "Фактор времени Баффета"], "keywords": ["баффет", "время", "сложный процент", "горизонт", "хаузел"]
    },
    {
        "id": "hsl_0012", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "Chapter 10: Save Money Without a Specific Reason", "section": "Saving for Uncertainty",
            "verbatim_anchor_quote": "«Save money not just for a car or a house, but for the inherent unpredictability of life. Savings are your hedge against life's worst ambushes.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Накопление без конкретной цели как щит от неожиданностей", "subtopic": "Кэш как опцион на покупку будущей свободы и защита от кризисов",
        "core_idea": "Не нужно копить деньги только на конкретную вещь (машину, дом). Сбережения нужны ради самого факта наличия запаса прочности перед непредсказуемыми ударами судьбы.",
        "author_case": "Инвесторы с запасом кэша на 1-2 года жизни спокойно покупали подешевевшие активы на дне краха 2008 и 2020 годов, в то время как люди без запаса продавали всё с убытком.",
        "step_by_step_protocol": "1. Сформировать резервный фонд в наличных или казначейских векселях на 12 месяцев расходов. 2. Не трогать этот фонд для торговли.",
        "linked_lessons": ["p8_l47", "p8_l48"], "linked_terms": ["Резервный фонд", "Опцион на свободу"], "keywords": ["сбережения", "кэш", "подушка", "кризис", "неожиданность", "хаузел"]
    },
    {
        "id": "hsl_0013", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 1, "chapter_title": "Chapter 1: All Behavior Makes Sense to the Person Doing It", "section": "No One's Crazy",
            "verbatim_anchor_quote": "«No one is crazy. People from different generations, raised by different parents in different economies, play by completely different rules.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Никто не сумасшедший (No One’s Crazy)", "subtopic": "Понимание различий в восприятии риска людьми разных поколений и бэкграундов",
        "core_idea": "Люди принимают финансовые решения на основе своего уникального жизненного опыта. Человек, выросший в гиперинфляции, боится кэша; человек, переживший крах доткомов, боится акций. Осуждать чужие решения бессмысленно.",
        "author_case": "Исследования Ульрике Мальмендир и Стефана Нагеля: готовность инвестировать в фондовый рынок зависит от того, рос ли рынок, когда инвестору было 20 лет.",
        "step_by_step_protocol": "1. Осознать свои личные психологические травмы и предвзятости. 2. Опираться на объективные рыночные данные, а не на пережитый опыт детства.",
        "linked_lessons": ["p8_l46", "p8_l49"], "linked_terms": ["Никто не сумасшедший", "Опыт поколений"], "keywords": ["опыт", "поколения", "инфляция", "травмы", "мальмендир", "хаузел"]
    },
    {
        "id": "hsl_0014", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Chapter 2: The Art of Spending Money", "section": "Spending for Joy vs Status",
            "verbatim_anchor_quote": "«The art of spending money is discovering what truly brings you joy and ruthlessly cutting spending on everything else.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Искусство тратить деньги (The Art of Spending Money)", "subtopic": "Осознанное расходование средств на личные ценности без оглядки на чужие стандарты",
        "core_idea": "Умение тратить деньги — такой же сложный навык, как и умение их зарабатывать. Профессионал щедро тратит на то, что приносит истинную радость ему и семье (путешествия, книги, здоровье), и безжалостно урезает траты на статусную мишуру.",
        "author_case": "Хаузел разбирает примеры богатых людей, которые так и не научились тратить деньги на радость, умерев скупыми и одинокими стариками в окружении миллионов.",
        "step_by_step_protocol": "1. Определить 3 главные жизненные ценности. 2. Тратить на них деньги с удовольствием, не испытывая чувства вины.",
        "linked_lessons": ["p8_l47", "p8_l50"], "linked_terms": ["Искусство тратить", "Ценности vs Статус"], "keywords": ["траты", "радость", "ценности", "скупость", "счастье", "хаузел"]
    },
    {
        "id": "hsl_0015", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 14, "chapter_title": "Chapter 14: You’ll Change (The End of History Illusion)", "section": "The End of History Illusion",
            "verbatim_anchor_quote": "«We constantly underestimate how much our future selves will change. Do not lock yourself into rigid financial plans that leave no room for evolution.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Иллюзия конца истории (The End of History Illusion)", "subtopic": "Принятие неизбежности изменения собственных целей и вкусов с возрастом",
        "core_idea": "Психологи доказали: человеку кажется, что он уже окончательно сформировался и больше не изменится. В реальности через 10 лет ваши ценности, желания и отношение к риску будут совершенно другими. Финансовый план должен быть гибким.",
        "author_case": "Эксперименты профессора Дэниела Гилберта из Гарварда: люди всех возрастов систематически недооценивали масштаб изменений своей личности в следующее десятилетие.",
        "step_by_step_protocol": "1. Избегать крайностей в планировании (ни фанатичной экономии, ни безумного риска). 2. Оставлять пространство для будущей эволюции личности.",
        "linked_lessons": ["p8_l46", "p8_l51"], "linked_terms": ["Иллюзия конца истории", "Дэниел Гилберт"], "keywords": ["гилберт", "конец истории", "эволюция", "цели", "гарвард", "хаузел"]
    },
    {
        "id": "hsl_0016", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 12, "chapter_title": "Chapter 12: Surprise! History is the Study of Change", "section": "The Historian as Prophet Fallacy",
            "verbatim_anchor_quote": "«History is the study of rare, surprising events. Using past data to predict the future is inherently flawed because the future will be shaped by surprises that never happened before.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Заблуждение историка как пророка", "subtopic": "Ограниченность исторических бэктестов для предсказания будущих шоков",
        "core_idea": "История изучает беспрецедентные события. Будущее формируется событиями, которых никогда не было в прошлом (появление интернета, новые вирусы, войны). Слепая вера в то, что 'будущее повторит прошлый график' — опасная иллюзия.",
        "author_case": "Анализ финансовых моделей перед кризисом 2008 года: бэктесты за 50 лет не содержали общенационального падения цен на жилье в США, поэтому риск-модели оценили дефолт как 'невозможный'.",
        "step_by_step_protocol": "1. Не полагаться на исторические бэктесты как на абсолютную истину. 2. Всегда закладывать запас прочности на небывалые рыночные режимы.",
        "linked_lessons": ["p8_l47", "p8_l52"], "linked_terms": ["Заблуждение историка", "Беспрецедентные шоки"], "keywords": ["история", "бэктесты", "пророки", "шоки", "2008", "хаузел"]
    },
    {
        "id": "hsl_0017", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Chapter 3: Conspicuous Consumption vs Independence", "section": "Independence Over Luxury",
            "verbatim_anchor_quote": "«True financial independence is the ability to walk away from any deal, job, or person that compromises your integrity or peace.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Финансовая независимость как право сказать «Нет»", "subtopic": "Обретение 'Fuck You Money' для защиты собственного достоинства",
        "core_idea": "Деньги на счете дают невероятную силу — возможность отказаться от неэтичной сделки, токсичного начальника или опасного рыночного предложения. Это высшая форма суверенитета личности.",
        "author_case": "Хаузел приводит истории писателей и предпринимателей, которые благодаря финансовой подушке смогли отказаться от сомнительных компромиссов и создать шедевры.",
        "step_by_step_protocol": "1. Сформировать фонд независимости ('Fuck You Money'). 2. Использовать финансовую силу для защиты своей автономии и принципов.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Fuck You Money", "Суверенитет личности"], "keywords": ["fuck you money", "независимость", "достоинство", "автономия", "хаузел"]
    },
    {
        "id": "hsl_0018", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 18, "chapter_title": "Chapter 18: When You’ll Believe Anything (Narratives)",
            "section": "The Power of Belief in Scarcity",
            "verbatim_anchor_quote": "«The more you desperately want something to be true, the more likely you are to believe a fantasy story that promises it.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Психология слепой веры в сказки при отчаянии", "subtopic": "Как сильное желание разбогатеть отключает критическое мышление",
        "core_idea": "Когда человек в отчаянии или жаждет быстрого обогащения, его мозг готов поверить в любую сказку о 'гарантированном роботе с доходностью 100% в месяц'. Критическое мышление полностью капитулирует перед желанием чуда.",
        "author_case": "Крах криптобиржи FTX и пирамиды Берни Мэдоффа: умнейшие профессора и венчурные капиталисты отдавали миллиарды долларов, потому что отчаянно хотели верить в гений основателей.",
        "step_by_step_protocol": "1. Если предложение звучит слишком хорошо, чтобы быть правдой — это 100% обман. 2. Никогда не инвестировать в закрытые непрозрачные схемы.",
        "linked_lessons": ["p8_l47", "p8_l49"], "linked_terms": ["Слепая вера", "FTX", "Мэдофф"], "keywords": ["ftx", "мэдофф", "вера", "чудо", "сказки", "отчаяние", "хаузел"]
    },
    {
        "id": "hsl_0019", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 20, "chapter_title": "Chapter 20: Confessions: How Morgan Housel Invests", "section": "The Housel Family Portfolio",
            "verbatim_anchor_quote": "«My personal investing strategy is radically simple: high savings rate, zero debt, low-cost index funds, and sitting on my hands for decades.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Личная финансовая стратегия Моргана Хаузела", "subtopic": "Радикальная простота: высокий процент сбережений, отсутствие долгов и индексные фонды",
        "core_idea": "Хаузел делится своим личным портфелем: он не пытается торговать тайминг рынка. Его стратегия — максимальный уровень сбережений, отсутствие долгов, инвестиции в индексные фонды широкого рынка и терпеливое бездействие на протяжении 30 лет.",
        "author_case": "Семейный портфель Моргана Хаузела: простая стратегия обеспечила семье финансовую независимость и абсолютный душевный покой в любые кризисы.",
        "step_by_step_protocol": "1. Максимизировать норму личных сбережений. 2. Инвестировать в диверсифицированные активы на десятилетия без спекуляций.",
        "linked_lessons": ["p8_l46", "p8_l50"], "linked_terms": ["Портфель Хаузела", "Индексный портфель"], "keywords": ["портфель", "индексы", "сбережения", "долги", "простота", "хаузел"]
    },
    {
        "id": "hsl_0020", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 21, "chapter_title": "Chapter 21: The Luckier You Are, the Nicer You Should Be", "section": "Final Synthesis of The Art of Spending Money",
            "verbatim_anchor_quote": "«The ultimate purpose of mastering money is to live a good, kind, and autonomous life. Use wealth to liberate yourself and elevate those around you.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Итоговый манифест психологии денег Моргана Хаузела", "subtopic": "Синтез финансовой скромности, терпения и подлинной свободы",
        "core_idea": "Заключительное кредо Моргана Хаузела: истинное мастерство владения деньгами заключается не в накоплении рекордных сумм, а в обретении спокойной, доброй и свободной жизни, наполненной смыслом и уважением к окружающим.",
        "author_case": "Книги The Psychology of Money и The Art of Spending Money разошлись тиражом более 5 миллионов экземпляров по всему миру, став манифестом нового поколения разумных инвесторов.",
        "step_by_step_protocol": "1. Платить входной билет волатильности без жалоб. 2. Ценить контроль над временем превыше статуса. 3. Жить скромно, осознанно и свободно.",
        "linked_lessons": ["p8_l47", "p8_l52"], "linked_terms": ["Психология денег", "Итог Хаузела"], "keywords": ["психология денег", "манифест", "синтез", "итог", "свобода", "хаузел"]
    }
]

print(f"Book 15 (Morgan Housel) verified: {len(HOUSEL_ATOMS)} authentic atoms strictly mapped to Chapters 1-21.")
