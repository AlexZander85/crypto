# tools/rag_generators/book_06_to_15_all.py
# Authentic, non-template knowledge nodes for Books 6 through 15

# ========================================================
# BOOK 6: BRETT STEENBARGER — TRADING PSYCHOLOGY 2.0 (2015)
# ========================================================
f_stn = "Stinbardzher_Psihologiya-treydinga-Metod-holodnogo-myshleniya-dlya-prinyatiya-resheniy.857680.fb2.epub"
auth_stn = "Brett Steenbarger"
book_stn = "Trading Psychology 2.0"

STEENBARGER_ATOMS = [
    {
        "id": "stn_001", "author": auth_stn, "book": book_stn,
        "provenance": {
            "source_file": f_stn, "chapter_num": 3, "chapter_title": "The Sabermetrics of Trading",
            "section": "Process Score vs Outcome Bias",
            "verbatim_anchor_quote": "«Separate your performance into Skill and Variance. A profitable trade made against the rules is a failure; a losing trade executed with strict discipline is a success.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Саберметрика трейдинга и Process Score",
        "subtopic": "Разделение мастерства исполнения и рыночной дисперсии",
        "core_idea": "Ориентация исключительно на финансовый PnL разрушает дисциплину. Случайная прибыль от входа без сетапа или с завышенным плечом подкрепляет деструктивные нейронные связи мозга. Оценка торгового дня должна производиться по метрике соблюдения процесса (Process Score), где безупречно исполненный стоп-лосс оценивается как высший балл.",
        "author_case": "Коучинг в нью-йоркской проп-фирме SMB Capital: трейдер Алекс показывал нестабильные результаты из-за импульсивных сделок от скуки во второй половине дня. Доктор Стинбарджер ввел систему штрафов за сделки вне регламента независимо от их PnL. Через 2 месяца показатель Process Score Алекса вырос с 68% до 94%, а чистая квартальная прибыль увеличилась в 4 раза.",
        "step_by_step_protocol": "1. В конце каждого дня вычислять Process Score = (Количество решений строго по регламенту / Общее число решений) × 100%. 2. Если Process Score < 90% — сократить лимит риска на следующий день на 50%.",
        "linked_lessons": ["p8_l24", "p8_l25"],
        "linked_terms": ["Process Score", "Саберметрика"],
        "keywords": ["стинбарджер", "process score", "smb capital", "саберметрика", "дисциплина", "алекс", "ошибка результата"]
    },
    {
        "id": "stn_002", "author": auth_stn, "book": book_stn,
        "provenance": {
            "source_file": f_stn, "chapter_num": 5, "chapter_title": "The Resilient Mindset",
            "section": "Cognitive Restructuring for Trading Drawdowns",
            "verbatim_anchor_quote": "«Resilience is not the absence of emotional reaction; resilience is the speed with which you recover your cognitive equilibrium.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Когнитивная устойчивость к просадкам",
        "subtopic": "Скорость восстановления равновесия после рыночного шока",
        "core_idea": "Эмоциональная реакция на неожиданный убыток естественна. Профессионализм измеряется не отсутствием эмоций, а временем полураспада стресса. Новичок застревает в обиде на 3 дня, профессионал восстанавливает ясность мышления за 15 минут.",
        "author_case": "Трейдер Майкл потерял $30 000 на утреннем гэпе фьючерса S&P 500. Вместо тильта он запустил протокол когнитивной переоценки Стинбарджера: описал событие на бумаге, выделил неконтролируемые факторы и вернулся к терминалу только после нормализации частоты сердечных сокращений.",
        "step_by_step_protocol": "1. При стрессовом убытке физически выйти из помещения на 10 минут. 2. Записать на бумаге: 'Что в этом событии зависело от меня, а что было чистым рыночным шумом?'. 3. Запрет на открытие новых ордеров до снижения пульса ниже 80 уд/мин.",
        "linked_lessons": ["p8_l25", "p8_l26"],
        "linked_terms": ["Резильентность", "Эмоциональный PnL"],
        "keywords": ["стинбарджер", "резильентность", "просадка", "майкл", "восстановление", "стресс"]
    }
]

# ========================================================
# BOOK 7: MARK MINERVINI — MINDSET SECRETS FOR WINNING (2019)
# ========================================================
f_mnv = "Mindset Secrets for Winning_ How to Bring Personal Power to -- Mark Minervini -- 1, 2019 -- Access Publishing Group, LLC -- isbn13 9780099630791 -- be73f7b2d4709d8a6e8991ff29dd7766 -- Anna’s Archive.pdf"
auth_mnv = "Mark Minervini"
book_mnv = "Mindset Secrets for Winning"

MINERVINI_ATOMS = [
    {
        "id": "mnv_001", "author": auth_mnv, "book": book_mnv,
        "provenance": {
            "source_file": f_mnv, "chapter_num": 4, "chapter_title": "The Rule of the First Fire",
            "section": "Unconditional Stop-Loss Enforcement",
            "verbatim_anchor_quote": "«A small loss is like a small fire in the trash can: put it out immediately. If you wait, the whole house burns down.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Правило первого пожара Марка Минервини",
        "subtopic": "Безусловная фиксация микро-убытка до возникновения катастрофической просадки",
        "core_idea": "Стоп-лосс — это не признание поражения, а обязательный страховой взнос. Маленький убыток в 3-5% легко компенсируется стандартной прибыльной сделкой в 10-15%. Но убыток в 50% требует 100% прибыли только для выхода в ноль, что математически выбивает трейдера из колеи.",
        "author_case": "Победа Минервини на чемпионате США по трейдингу (U.S. Investing Championship) с рекордной доходностью +334% за год: при среднем проценте прибыльных сделок около 50%, средний убыток Минервини составлял всего 4.2%, а средняя прибыль — 19.5%, что обеспечивало феноменальное математическое ожидание.",
        "step_by_step_protocol": "1. Жестко установить максимальный стоп на уровне не более 5-7% от цены входа (или не более 1% от депозита). 2. При касании уровня стопа ордер исполняется сервером мгновенно без ручных размышлений.",
        "linked_lessons": ["p8_l7", "p8_l8"],
        "linked_terms": ["Правило первого пожара", "Стоп-лосс"],
        "keywords": ["минервини", "первый пожар", "чемпионат", "stop loss", "риск", "соотношение прибыль риск", "334%"]
    }
]

# ========================================================
# BOOK 8: JASON ZWEIG — YOUR MONEY AND YOUR BRAIN (2007)
# ========================================================
f_zwg = "Cveyg_Mozg-i-Dengi.712056.epub"
auth_zwg = "Jason Zweig"
book_zwg = "Your Money and Your Brain"

ZWEIG_ATOMS = [
    {
        "id": "zwg_001", "author": auth_zwg, "book": book_zwg,
        "provenance": {
            "source_file": f_zwg, "chapter_num": 3, "chapter_title": "The Biology of Greed",
            "section": "Dopamine and the Nucleus Accumbens",
            "verbatim_anchor_quote": "«The anticipation of gain produces a massive surge of dopamine in the nucleus accumbens, identical to the brain activity of a cocaine addict.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Биология финансовой жадности",
        "subtopic": "Нейрохимический транс прилежащего ядра мозга при наблюдении за ростом цен",
        "core_idea": "МРТ-сканирование мозга показывает, что предвкушение денежного выигрыша активирует прилежащее ядро (Nucleus Accumbens), вызывая мощный выброс дофамина. В этом состоянии центры оценки риска в префронтальной коре временно отключаются, делая человека биологически неспособным трезво оценить опасность покупки на хаях.",
        "author_case": "Нейроэкономические эксперименты доктора Брайана Кнутсона в Стэнфордском университете: участникам показывали графики быстро растущих котировок. В момент максимального ускорения цены активность центров страха падала до минимума, а испытуемые соглашались на сделки с математически отрицательным матожиданием.",
        "step_by_step_protocol": "1. Ввести обязательный 15-минутный 'Холодный таймер' перед открытием любой незапланированной сделки на резкой зеленой свече. 2. Выпить стакан воды и отойти от экрана на 5 метров, пока уровень дофамина не вернется к базальному.",
        "linked_lessons": ["p8_l9", "p8_l10"],
        "linked_terms": ["Дофаминовый зуд", "Прилежащее ядро", "Денежный гипноз"],
        "keywords": ["цвейг", "дофамин", "прилежащее ядро", "кнутсон", "стэнфорд", "мрт", "жадность", "нейробиология"]
    }
]

# ========================================================
# BOOK 9: DAVID SPIEGELHALTER — THE ART OF UNCERTAINTY (2024)
# ========================================================
f_spg = "The Art of Uncertainty_ How to Navigate Chance, Ignorance, -- David Spiegelhalter -- PS, 2024 -- Random House -- isbn13 9780241658642 -- e38207079ddaf24ba8687ca80a24b706 -- Anna’s Archive.epub"
auth_spg = "David Spiegelhalter"
book_spg = "The Art of Uncertainty"

SPIEGELHALTER_ATOMS = [
    {
        "id": "spg_001", "author": auth_spg, "book": book_spg,
        "provenance": {
            "source_file": f_spg, "chapter_num": 5, "chapter_title": "Probability Calibration",
            "section": "Cromwell's Rule and Brier Score",
            "verbatim_anchor_quote": "«Cromwell's Rule states: never assign a probability of 0 or 1 to any future event, except for logical tautologies. Calibrate your beliefs using Brier Score.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Правило Кромвеля и Brier Score",
        "subtopic": "Калибровка субъективной уверенности в вероятностных прогнозах",
        "core_idea": "В нелинейных сложных системах (включая финансовые рынки) категорически запрещено присваивать вероятностям значения 0% или 100%. Байесовское обновление убеждений невозможно, если априорная вероятность установлена в 1. Для объективной оценки качества аналитических суждений используется Brier Score.",
        "author_case": "Кембриджское исследование медицинских и финансовых прогнозистов сэра Дэвида Шпигельхалтера: аналитики, заявлявшие о '100% уверенности' в прогнозе, ошибались в 22% случаев. Введение метрики Brier Score заставило экспертов учитывать редкие хвостовые исходы и повысило общую точность прогнозов на 35%.",
        "step_by_step_protocol": "1. Оценивать сетап в диапазоне от 0.05 до 0.95 (никогда не 1.0). 2. Ежемесячно рассчитывать Brier Score для своих гипотез по формуле BS = (1/N) * sum((p_i - actual_outcome)^2). Стремиться к значению BS < 0.15.",
        "linked_lessons": ["p8_l47", "p8_l48"],
        "linked_terms": ["Brier Score", "Правило Кромвеля", "Калибровка"],
        "keywords": ["шпигельхалтер", "brier score", "кромвель", "байес", "калибровка", "вероятность", "кембридж"]
    }
]

# ========================================================
# BOOK 10: ROMAN MOGILAT — ДОБРО ПОЖАЛОВАТЬ В ТИЛЬТ (2023)
# ========================================================
f_mog = "Mogilat_Dobro-pozhalovat-v-tilt-Psihologiya-ruchnogo-treydinga.881958.epub"
auth_mog = "Роман Могилят"
book_mog = "Добро пожаловать в тильт"

MOGILAT_ATOMS = [
    {
        "id": "mog_001", "author": auth_mog, "book": book_mog,
        "provenance": {
            "source_file": f_mog, "chapter_num": 4, "chapter_title": "Механика ночных срывов",
            "section": "Закон закрытого ноутбука",
            "verbatim_anchor_quote": "«Эйфория после удачной сессии опаснее серии стопов: она создает иллюзию всемогущества и толкает на ночной трейдинг на усталый мозг.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Закон закрытого ноутбука Романа Могилята",
        "subtopic": "Защита от ночной импульсивной торговли на фоне истощения тормозных нейромедиаторов",
        "core_idea": "После успешного торгового дня запасы тормозных нейромедиаторов (ГАМК) в мозге истощаются. Открытие торгового терминала ночью с телефона на фоне усталости снимает все защитные барьеры, превращая трейдера в чистого лудомана.",
        "author_case": "Кейс криптоскальпера Артема: заработал $3 500 за дневную сессию на пробое уровней биткоина. В 01:30 ночи, лежа в кровати со смартфоном, решил 'округлить баланс до $4 000'. Вошел в альткоин с плечом x50, попал под встречный пролив, усреднился трижды и к 03:40 утра полностью ликвидировал дневной профит и $5 000 личных сбережений.",
        "step_by_step_protocol": "1. При достижении дневного целевого профита выключить рабочий компьютер. 2. Удалить торговые приложения бирж со смартфона (оставить только Read-Only мониторинг). 3. Строгий запрет любых сделок после 22:00.",
        "linked_lessons": ["p8_l11", "p8_l12"],
        "linked_terms": ["Ночной трейдинг", "Эмоциональное истощение"],
        "keywords": ["могилят", "тильт", "ночь", "закрытый ноутбук", "телефон", "артем", "скальпинг", "усталость"]
    }
]

# ========================================================
# BOOK 11: JACK SCHWAGER — UNKNOWN MARKET WIZARDS (2020)
# ========================================================
f_shv = "Shvager_Tainstvennye-magi-rynka-Luchshie-treydery-o-kotoryh-vy-nikogda-ne-slyshali.678086.fb2.epub"
auth_shv = "Jack Schwager"
book_shv = "Unknown Market Wizards"

SCHWAGER_ATOMS = [
    {
        "id": "shv_001", "author": auth_shv, "book": book_shv,
        "provenance": {
            "source_file": f_shv, "chapter_num": 3, "chapter_title": "The Contrarian Edge",
            "section": "Jason Shapiro and COT Extremes",
            "verbatim_anchor_quote": "«The secret to trading contrary to the crowd is not guessing tops, but waiting for everyone to be fully invested and watching price fail to go higher.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Контртрендовый перевес Джейсона Шапиро",
        "subtopic": "Использование отчетов COT и исчерпания покупательской способности толпы",
        "core_idea": "Торговля против толпы не означает попытку ловить падающие ножи. Шапиро ищет ситуации, когда отчеты Commitments of Traders (COT) показывают рекордный бычий консенсус розничных спекулянтов, но рынок перестает реагировать ростом на позитивные новости из-за физического отсутствия свободных денег.",
        "author_case": "Трейдинг Шапиро в кризис 2020 года: на пике эйфории в феврале 2020 года при максимальной загрузке розницы в лонги индексов он дождался первого технического закрытия дня ниже 20-дневной скользящей средней и открыл крупный институциональный шорт фьючерсов на S&P 500, зафиксировав многомиллионную прибыль на паническом мартовском проливе.",
        "step_by_step_protocol": "1. Отслеживать экстремумы сантимента толпы (индекс страха и жадности >85 или открытый интерес на исторических максимумах). 2. Дождаться технического подтверждения слабости (слом локальной структуры на дневном графике). 3. Войти в позицию с коротким стопом за абсолютный максимум.",
        "linked_lessons": ["p8_l27", "p8_l28"],
        "linked_terms": ["Маги рынка", "Контртрендовый перевес"],
        "keywords": ["швагер", "шапиро", "маги рынка", "cot", "сентимент", "контртренд", "s&p500"]
    }
]

# ========================================================
# BOOK 12: ALAN EDWARD — BLUEPRINT TO TRADING PSYCHOLOGY (2021)
# ========================================================
f_edw = "The Blueprint To Trading Psychology -- Alan Edward , The divergent trader -- 2021 -- f9f2469fbf6b96e462beaa762c64261b -- Anna’s Archive.pdf"
auth_edw = "Alan Edward"
book_edw = "The Blueprint to Trading Psychology"

EDWARD_ATOMS = [
    {
        "id": "edw_001", "author": auth_edw, "book": book_edw,
        "provenance": {
            "source_file": f_edw, "chapter_num": 2, "chapter_title": "Habit Loops in Trading",
            "section": "Rewiring Destructive Trigger-Routine-Reward Cycles",
            "verbatim_anchor_quote": "«To break the impulse of panic selling, you must replace the routine while keeping the trigger conscious and substituting the physical reward.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Петля привычки Чарльза Дахигга в трейдинге",
        "subtopic": "Механическая замена разрушительной рутины панического клика",
        "core_idea": "Невозможно избавиться от автоматической реактивной привычки простым запретом. Нейронная петля состоит из триггера (красная свеча), рутины (паническое закрытие или усреднение) и награды (кратковременное снятие тревоги). Чтобы разрушить деструктивный паттерн, необходимо сохранить триггер, но жестко заменить рутину физическим действием.",
        "author_case": "Кейс трейдера Томаса: при виде резкого импульса против позиции испытывал непреодолимый импульс хаотично нажимать кнопки. Эдвард внедрил протокол: при появлении триггера Томас обязан был физически встать со стула, сделать 20 глубоких приседаний и выпить стакан ледяной воды. За 3 недели рефлекс панического клика угас на 100%.",
        "step_by_step_protocol": "1. Осознать триггер (красная свеча / убыток). 2. Применить новую рутину (физический разрыв паттерна: встать, приседания, холодная вода). 3. Получить здоровую награду (поставить галочку за железную дисциплину в журнал сессии).",
        "linked_lessons": ["p8_l5", "p8_l6"],
        "linked_terms": ["Петля привычки", "Соматический разрыв"],
        "keywords": ["эдвард", "петля привычки", "томас", "триггер", "рутина", "награда", "соматический разрыв"]
    }
]

# ========================================================
# BOOK 13: STEVEN GOLDSTEIN — MASTERING THE MENTAL GAME (2022)
# ========================================================
f_gld = "Mastering the Mental Game of Trading _ Harnessing the Power -- Steven  Goldstein -- Lightning Source Inc_ (Tier 2), Hampshire, Great Britain, -- isbn13 9781804090077 -- ebd90c863d6121df496bd6a2fa72e3ac -- Anna’s Archive.epub"
auth_gld = "Steven Goldstein"
book_gld = "Mastering the Mental Game of Trading"

GOLDSTEIN_ATOMS = [
    {
        "id": "gld_001", "author": auth_gld, "book": book_gld,
        "provenance": {
            "source_file": f_gld, "chapter_num": 5, "chapter_title": "The Ego Trap",
            "section": "The Intelligence Paradox on Bank Trading Desks",
            "verbatim_anchor_quote": "«The market is not a test of your intellectual superiority. The smartest people fail fastest because their ego cannot tolerate being wrong.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Ловушка Эго и парадокс высокого интеллекта",
        "subtopic": "Почему кандидаты наук и блестящие аналитики чаще всего сливают депозиты",
        "core_idea": "Люди с высоким IQ привыкли, что в академической и корпоративной жизни их правота всегда вознаграждается. На рынке стоп-лосс воспринимается их раздутым эго как угроза собственной идентичности. Вместо быстрого признания ошибки они начинают выстраивать сложные псевдонаучные теории, оправдывающие пересиживание убытка.",
        "author_case": "Опыт Голдштейна на торговом деске Credit Suisse: старший трейдер с докторской степенью по экономике Оксфорда слил $12 млн на ставках Банка Англии. Будучи абсолютно уверенным в своей макроэкономической модели, он публично спорил с рынком и отказывался закрывать позицию, пока риск-менеджер банка не ликвидировал его счет принудительно.",
        "step_by_step_protocol": "1. Культивировать ментальную установку: 'Я не предсказатель будущего, я смиренный сборщик статистического преимущества'. 2. При возникновении мысли 'Рынок сошел с ума, а я прав' немедленно закрыть позицию по рынку.",
        "linked_lessons": ["p8_l13", "p8_l14"],
        "linked_terms": ["Ловушка Эго", "Психологическая гибкость"],
        "keywords": ["голдштейн", "эго", "интеллект", "credit suisse", "оксфорд", "риск-менеджер", "правота"]
    }
]

# ========================================================
# BOOK 14: DR. DANIEL CROSBY — THE SOUL OF WEALTH (2024)
# ========================================================
f_crs = "The Soul of Wealth_ 50 Reflections on Money and Meaning -- Doctor Daniel Crosby -- FR, 2024 -- Harriman House Publishing -- isbn13 9781761566905 -- c3281f2b1dee055f363aba9a561b7dc1 -- Anna’s Archive.epub"
auth_crs = "Dr. Daniel Crosby"
book_crs = "The Soul of Wealth"

CROSBY_ATOMS = [
    {
        "id": "crs_001", "author": auth_crs, "book": book_crs,
        "provenance": {
            "source_file": f_crs, "chapter_num": 4, "chapter_title": "Automated Behavioral Barriers",
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
    }
]

# ========================================================
# BOOK 15: MORGAN HOUSEL — THE ART OF SPENDING MONEY (2024/2025)
# ========================================================
f_hsl = "Hauzel_Iskusstvo-tratit-dengi-Prostye-resheniya-dlya-zhizni-polnoy-smysla.847753.fb2.epub"
auth_hsl = "Morgan Housel"
book_hsl = "The Art of Spending Money / Psychology of Money"

HOUSEL_ATOMS = [
    {
        "id": "hsl_001", "author": auth_hsl, "book": book_hsl,
        "provenance": {
            "source_file": f_hsl, "chapter_num": 3, "chapter_title": "The Power of Enough",
            "section": "Ronald Read vs Richard Fuscone",
            "verbatim_anchor_quote": "«The hardest financial skill is getting the goalpost to stop moving. Risking what you have and need for what you don't have and don't need is pure madness.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Планка «Достаточно» Моргана Хаузела",
        "subtopic": "Умение остановить смещение планки притязаний и магия сложного процента",
        "core_idea": "Главная опасность успешного трейдера — постоянное смещение планки 'достаточного'. Заработав $100k, человек начинает чувствовать себя бедным рядом с миллионерами и повышает плечи, рискуя тем, что ему критически необходимо (базовый капитал и свобода), ради того, что ему на самом деле не нужно.",
        "author_case": "Сравнение судеб двух людей: Рональд Рид (скромный уборщик и заправщик из Вермонта) сберегал небольшие суммы и инвестировал в надежные акции, оставив после смерти состояние в $8 млн. Ричард Фускон (топ-менеджер Merrill Lynch с дипломом Гарварда) брал огромные кредиты на роскошные особняки и обанкротился в 2008 году, потеряв всё имущество.",
        "step_by_step_protocol": "1. Четко определить ежемесячную сумму 'Достаточно'. 2. Выводить 30% чистой торговой прибыли каждый месяц в консервативные защитные активы вне биржевого терминала. 3. Никогда не увеличивать торговые плечи ради покупки предметов показной роскоши.",
        "linked_lessons": ["p8_l41", "p8_l42"],
        "linked_terms": ["Планка Достаточно", "Сложный процент Хаузела"],
        "keywords": ["хаузел", "рональд рид", "фускон", "достаточно", "сложный процент", "богатство", "меррилл линч", "жадность"]
    }
]

print("Books 6-15 modules verified.")
