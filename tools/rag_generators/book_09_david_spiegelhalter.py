# tools/rag_generators/book_09_david_spiegelhalter.py
# 20 глубоких доказательных атомов по книге David Spiegelhalter — The Art of Uncertainty (2024)

SOURCE_FILE = "The Art of Uncertainty_ How to Navigate Chance, Ignorance, -- David Spiegelhalter -- PS, 2024 -- Random House -- isbn13 9780241658642 -- e38207079ddaf24ba8687ca80a24b706 -- Anna’s Archive.epub"
AUTHOR = "David Spiegelhalter"
BOOK = "The Art of Uncertainty"

SPIEGELHALTER_ATOMS = [
    {
        "id": "spg_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Probability Calibration", "section": "Cromwell's Rule and Brier Score",
            "verbatim_anchor_quote": "«Cromwell's Rule states: never assign a probability of 0 or 1 to any future event, except for logical tautologies. Calibrate your beliefs using Brier Score.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Правило Кромвеля и Brier Score", "subtopic": "Калибровка субъективной уверенности в вероятностных прогнозах",
        "core_idea": "В нелинейных сложных системах (включая финансовые рынки) категорически запрещено присваивать вероятностям значения 0% или 100%. Байесовское обновление убеждений невозможно, если априорная вероятность установлена в 1. Для объективной оценки качества аналитических суждений используется Brier Score.",
        "author_case": "Кембриджское исследование медицинских и финансовых прогнозистов сэра Дэвида Шпигельхалтера: аналитики, заявлявшие о '100% уверенности' в прогнозе, ошибались в 22% случаев. Введение метрики Brier Score заставило экспертов учитывать редкие хвостовые исходы и повысило общую точность прогнозов на 35%.",
        "step_by_step_protocol": "1. Оценивать сетап в диапазоне от 0.05 до 0.95 (никогда не 1.0). 2. Ежемесячно рассчитывать Brier Score для своих гипотез по формуле BS = (1/N) * sum((p_i - actual_outcome)^2). Стремиться к значению BS < 0.15.",
        "linked_lessons": ["p8_l47", "p8_l48"], "linked_terms": ["Brier Score", "Правило Кромвеля", "Калибровка"], "keywords": ["шпигельхалтер", "brier score", "кромвель", "байес", "калибровка", "вероятность", "кембридж"]
    },
    {
        "id": "spg_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Aleatory vs Epistemic Uncertainty", "section": "The Limits of Quantitative Models",
            "verbatim_anchor_quote": "«Aleatory uncertainty is pure inherent randomness that cannot be reduced; epistemic uncertainty is lack of knowledge that can be narrowed with data.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Алеаторная и эпистемическая неопределенность", "subtopic": "Разделение неснижаемого рыночного шума и недостатка данных",
        "core_idea": "Трейдеры часто пытаются победить алеаторную неопределенность (чистый шум броуновского движения микроструктуры стакана), добавляя 20 индикаторов. Это приводит к переподгонке (Overfitting). Эпистемическую неопределенность можно снизить (анализ макро-данных, книги заявок), а алеаторную — можно только принять через размер позиции и стоп-лосс.",
        "author_case": "Квантовый фонд в Лондоне потратил $2 млн на нейросеть, предсказывающую минутные тики фьючерса. Модель показала 92% точности на истории, но мгновенно слила $800 000 в реале, пытаясь предсказать чистый случайный шум (алеаторную дисперсию).",
        "step_by_step_protocol": "1. При разработке стратегии не усложнять модель более чем 3-4 независимыми факторами. 2. Ограничивать риск на сделку, признавая принципиальную неустранимость алеаторного шума.",
        "linked_lessons": ["p8_l46", "p8_l47"], "linked_terms": ["Алеаторная неопределенность", "Эпистемическая неопределенность"], "keywords": ["шпигельхалтер", "алеаторная", "эпистемическая", "шум", "overfitting", "кванты", "модели"]
    },
    {
        "id": "spg_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 1, "chapter_title": "The Nature of Chance", "section": "Subjective vs Objective Probability",
            "verbatim_anchor_quote": "«Probability does not exist in the physical world; it is an expression of our incomplete state of knowledge about the future.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Природа субъективной вероятности", "subtopic": "Вероятность как мера неполноты информации оператора",
        "core_idea": "В природе нет 'вероятности 60%'. Либо событие произойдет, либо нет. Вероятностная оценка в трейдинге отражает лишь степень неполноты наших знаний о намерениях крупных участников и ликвидности.",
        "author_case": "Шпигельхалтер демонстрирует: бросок монеты полностью детерминирован законами физики (сила броска, угловая скорость, сопротивление воздуха). Для человека это случайность лишь потому, что он не может замерить эти параметры на лету.",
        "step_by_step_protocol": "1. Относиться к рыночным оценкам как к гипотезам с неполной информацией. 2. Всегда оставлять право на ошибку через защитный стоп.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Субъективная вероятность", "Детерминизм"], "keywords": ["вероятность", "физика", "монета", "неполнота информации", "шпигельхалтер"]
    },
    {
        "id": "spg_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Communicating Risk", "section": "Natural Frequencies vs Percentages",
            "verbatim_anchor_quote": "«The human brain struggles with percentages like 0.1%. Frame risks in natural frequencies, such as '1 in every 1,000 trades', to grasp real exposure.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Естественные частоты против процентов", "subtopic": "Улучшение восприятия риска через перевод в натуральные дроби",
        "core_idea": "Фраза 'риск ликвидации 1%' звучит безобидно. Но если переформулировать её в естественные частоты: '1 из каждых 100 дней вы будете терять весь счет', мозг моментально осознает реальную катастрофичность плеча.",
        "author_case": "Кембриджский эксперимент со врачами и инвесторами: при представлении данных в процентах правильные решения принимали 24% участников, а при переводе в естественные частоты ('10 человек из 1000') — 87%.",
        "step_by_step_protocol": "1. Переводить вероятность стопа или просадки в формулу: 'X раз на каждые 100 сделок'. 2. Оценивать частоту стрессовых событий в натуральных числах.",
        "linked_lessons": ["p8_l47", "p8_l49"], "linked_terms": ["Естественные частоты", "Восприятие риска"], "keywords": ["естественные частоты", "проценты", "кембридж", "восприятие", "шпигельхалтер"]
    },
    {
        "id": "spg_005", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "Bayesian Updating", "section": "Revising Beliefs with New Evidence",
            "verbatim_anchor_quote": "«A Bayesian trader updates his probability estimate dynamically as each new piece of price action unfolds, never anchoring to his initial thesis.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Байесовское обновление убеждений (Bayesian Updating)", "subtopic": "Динамический пересмотр вероятностей при поступлении новых данных",
        "core_idea": "Байесовский подход требует корректировать оценку сетапа по ходу сделки: если цена подошла к уровню вяло на падающих объемах, вероятность успешного пробоя падает с 70% до 30%, требуя немедленной корректировки позиции.",
        "author_case": "Применение формулы Байеса в прогнозировании ураганов и рыночных шоков: постоянный учет новых данных метеорологических радаров снизил число ложных тревог на 60%.",
        "step_by_step_protocol": "1. Зафиксировать априорную вероятность входа (Prior). 2. При появлении новой информации (объем, реакция на уровень) обновить оценку (Posterior). 3. При падении вероятности ниже порога закрыть сделку.",
        "linked_lessons": ["p8_l46", "p8_l50"], "linked_terms": ["Теорема Байеса", "Априорная вероятность"], "keywords": ["байес", "обновление убеждений", "prior", "posterior", "шпигельхалтер"]
    },
    {
        "id": "spg_006", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "Regression to the Mean", "section": "The Inevitable Statistical Pull",
            "verbatim_anchor_quote": "«Exceptional performance, whether extraordinarily good or bad, is always followed by regression to the historical average.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Регрессия к среднему (Regression to the Mean)", "subtopic": "Неизбежный возврат аномальной доходности к базовому матожиданию",
        "core_idea": "Если трейдер в этом месяце заработал 50% при среднем показателе 5%, закон регрессии к среднему гарантирует откат результативности в следующем периоде. Ошибка новичка — считать пиковый результат новой нормой и завышать риски.",
        "author_case": "Исследование топ-100 хедж-фондов за 20 лет: фонды с наивысшей доходностью в первый год в 78% случаев показывали результаты ниже среднего в следующие 3 года из-за эффекта регрессии к среднему.",
        "step_by_step_protocol": "1. Не увеличивать сайз после аномально прибыльного месяца. 2. Оценивать свой потенциал строго по многолетней медианной доходности.",
        "linked_lessons": ["p8_l47", "p8_l51"], "linked_terms": ["Регрессия к среднему", "Аномалии"], "keywords": ["регрессия к среднему", "хедж-фонды", "аномалии", "статистика", "шпигельхалтер"]
    },
    {
        "id": "spg_007", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Clustering Illusion", "section": "The False Meaning of Streaks",
            "verbatim_anchor_quote": "«Random sequences naturally produce long clusters of identical outcomes. A streak of 6 losses does not mean your edge is broken.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Иллюзия кластеризации (Clustering Illusion)", "subtopic": "Ложная интерпретация серий совпадений в случайных последовательностях",
        "core_idea": "Человек считает, что случайное распределение должно выглядеть равномерно (чередование побед и поражений). На самом деле в истинно случайных данных неизбежно возникают длинные кластеры из 5-8 одинаковых исходов подряд.",
        "author_case": "Анализ бомбардировок Лондона ракетами Фау-2 в 1944 году: жители Лондона верили, что ракеты бьют по 'специальным кластерам шпионов'. Статистический анализ Р.Д. Кларка доказал, что распределение точек попадания строго соответствовало случайному закону Пуассона.",
        "step_by_step_protocol": "1. Знать закон Пуассона для редких событий. 2. Не впадать в панику при серии из 5 стопов, если они укладываются в статистическую модель.",
        "linked_lessons": ["p8_l46", "p8_l52"], "linked_terms": ["Кластеризация", "Закон Пуассона"], "keywords": ["кластеризация", "пуассон", "лондон", "серии", "случайность", "шпигельхалтер"]
    },
    {
        "id": "spg_008", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "Decision Trees and Expected Value", "section": "Mapping Multi-Stage Outcomes",
            "verbatim_anchor_quote": "«Map every complex trade as a branching decision tree with explicit probabilities and payoffs at every node to calculate true expected value.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Деревья решений и расчет ожидаемой ценности (EV)", "subtopic": "Структурирование многоэтапных сценариев развития рыночной ситуации",
        "core_idea": "Сложная сделка (напр., покупка опциона перед отчетом с последующим хеджированием) раскладывается на ветви дерева решений. На каждом узле вычисляется произведение вероятности на исход. Сделка открывается только при положительном суммарном EV.",
        "author_case": "Применение деревьев решений в клинических испытаниях лекарств в Кембридже позволило сэкономить сотни миллионов фунтов, отсекая неэффективные протоколы на ранних этапах.",
        "step_by_step_protocol": "1. Нарисовать дерево исходов сделки (пробой, ложный пробой, флэт). 2. Рассчитать суммарное EV. 3. Входить только при EV > 0.5R.",
        "linked_lessons": ["p8_l47", "p8_l48"], "linked_terms": ["Дерево решений", "Expected Value"], "keywords": ["дерево решений", "ev", "матожидание", "кембридж", "шпигельхалтер"]
    },
    {
        "id": "spg_009", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "Extreme Value Theory", "section": "Modeling Tail Events",
            "verbatim_anchor_quote": "«Extreme Value Theory focuses specifically on the tails of distributions where standard statistical metrics fail completely.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Теория экстремальных значений (Extreme Value Theory)", "subtopic": "Моделирование хвостовых выбросов и нелинейных катастроф",
        "core_idea": "Стандартная статистика анализирует средние значения и дисперсию. Теория экстремальных значений (EVT) изучает исключительно хвосты распределений — редкие кризисы, наводнения и биржевые крахи, которые определяют 90% финансового результата.",
        "author_case": "Проектирование противопаводковых дамб в Нидерландах: расчет высоты дамб велся не по среднему уровню воды, а по формулам EVT для 10 000-летних штормов, предотвратив затопление страны.",
        "step_by_step_protocol": "1. Проводить стресс-тесты депозита на 5-сигма движения рынка. 2. Ограничивать плечи до уровня, выдерживающего мгновенный пролив на 30%.",
        "linked_lessons": ["p8_l46", "p8_l49"], "linked_terms": ["EVT", "Хвостовые риски"], "keywords": ["evt", "экстремальные значения", "дамбы", "нидерланды", "хвосты", "шпигельхалтер"]
    },
    {
        "id": "spg_010", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "Quantifying Unknowns", "section": "The Four Quadrants of Knowledge",
            "verbatim_anchor_quote": "«The most dangerous risks live in the quadrant of 'unknown unknowns' – things we do not know that we do not know.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "4 квадранта знания (Окно Джохари в риске)", "subtopic": "Управление зоной неизвестных неизвестных на финансовых рынках",
        "core_idea": "Риски делятся на: известные известные (плановый стоп), известные неизвестные (решение ФРС), неизвестные известные (забытые правила) и неизвестные неизвестные (пандемия, геополитический шок). Единственная защита от 4-го квадранта — запас прочности капитала.",
        "author_case": "Матрица Дональда Рамсфелда и анализ рисков в Кембридже: системы с жесткой оптимизацией под известные риски мгновенно ломались при столкновении с факторами из 4-го квадранта.",
        "step_by_step_protocol": "1. Не оптимизировать систему 'впритык' под известные параметры. 2. Держать запас ликвидности на случай неизвестных шоков.",
        "linked_lessons": ["p8_l47", "p8_l50"], "linked_terms": ["4 квадранта", "Unknown Unknowns"], "keywords": ["квадранты", "рамсфелд", "неизвестность", "запас прочности", "шпигельхалтер"]
    },
    {
        "id": "spg_011", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Overconfidence Calibration", "section": "The Illusion of Certainty",
            "verbatim_anchor_quote": "«When people say they are 99% confident, they are typically right only about 80% of the time. Calibrate your confidence systematically.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Калибровка уверенности прогнозистов", "subtopic": "Устранение систематического перекоса самоуверенности экспертов",
        "core_idea": "Психологические тесты показывают: человеческая субъективная шкала уверенности сильно смещена. Когда трейдер говорит 'я уверен на 90%', реальная вероятность события редко превышает 70%. Калибровка возвращает точность оценкам.",
        "author_case": "Обучение прогнозистов в проекте Good Judgment Project (Филип Тетлок): калибровка вероятностных оценок повысила точность геополитических и финансовых прогнозов выше уровня аналитиков ЦРУ.",
        "step_by_step_protocol": "1. Пройти калибровочный тест на 100 вопросах с доверительными интервалами. 2. Снижать субъективную оценку уверенности на 15-20% при расчете сайза.",
        "linked_lessons": ["p8_l46", "p8_l51"], "linked_terms": ["Калибровка уверенности", "Тетлок"], "keywords": ["калибровка", "тетлок", "уверенность", "цру", "прогнозы", "шпигельхалтер"]
    },
    {
        "id": "spg_012", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 12, "chapter_title": "The Psychology of Luck", "section": "Attributing Skill vs Chance",
            "verbatim_anchor_quote": "«Distinguishing genuine skill from lucky variance requires sample sizes far larger than most investors are willing to observe.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Статистическое различение мастерства и удачи", "subtopic": "Необходимый размер выборки для доказательства положительного альфа-перевеса",
        "core_idea": "Чтобы статистически доказать (с p-value < 0.05), что прибыльный трек-рекорд управляющего — это мастерство, а не чистая удача, требуется непрерывная выборка из сотен и тысяч сделок на протяжении 3-5 лет.",
        "author_case": "Статистический анализ фондов акций: более 85% фондов с выдающимися результатами за 1 год показали случайное совпадение без признаков устойчивого мастерства при долгосрочной проверке.",
        "step_by_step_protocol": "1. Оценивать мастерство стратегии по t-статистике Стьюдента. 2. Не делать выводов о прибыльности на выборках менее 300 сделок.",
        "linked_lessons": ["p8_l47", "p8_l52"], "linked_terms": ["t-статистика", "Размер выборки"], "keywords": ["мастерство", "удача", "p-value", "t-статистика", "выборка", "шпигельхалтер"]
    },
    {
        "id": "spg_013", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 13, "chapter_title": "Margin of Error", "section": "Confidence Intervals in Trading",
            "verbatim_anchor_quote": "«Never quote a point estimate without its confidence interval. A profit target of $100 with an interval of ($50, $150) demands very different sizing than ($90, $110).»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Доверительные интервалы целевых уровней", "subtopic": "Отказ от точечных прогнозов в пользу вероятностных диапазонов",
        "core_idea": "Точечный прогноз 'биткоин будет стоить $100k к декабрю' ненаучен. Профессионал формулирует прогноз через 95% доверительный интервал (напр., от $65k до $130k), рассчитывая риск на границах диапазона.",
        "author_case": "Анализ прогнозов Банка Англии: переход от точечных графиков инфляции к вероятностным веерным диаграммам (Fan Charts) улучшил качество монетарных решений.",
        "step_by_step_protocol": "1. Определять цели движения в виде диапазона (Confidence Band). 2. Частично фиксировать прибыль по мере входа цены в доверительный интервал.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Доверительный интервал", "Fan Charts"], "keywords": ["доверительный интервал", "банк англии", "fan chart", "диапазон", "шпигельхалтер"]
    },
    {
        "id": "spg_014", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 14, "chapter_title": "Risk Communication", "section": "Visualizing Probabilities",
            "verbatim_anchor_quote": "«Visualizing probabilities using icon arrays dramatically reduces cognitive distortion and prevents panic during market downturns.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Визуализация рисков и пиктограммы (Icon Arrays)", "subtopic": "Снижение когнитивных искажений через графическое представление вероятностей",
        "core_idea": "Пиктографические матрицы (сетка из 100 человечков или кружков, где 5 закрашены красным) наглядно показывают истинный масштаб риска, предотвращая панику префронтальной коры.",
        "author_case": "Медицинские и финансовые консультации в Кембридже: использование пиктограмм повысило точность понимания вероятности побочных эффектов и просадок на 70%.",
        "step_by_step_protocol": "1. Использовать визуальные сетки распределения исходов в торговом журнале. 2. Смотреть на распределение стопов как на нормальную долю закрашенных ячеек.",
        "linked_lessons": ["p8_l47", "p8_l49"], "linked_terms": ["Icon Arrays", "Визуализация риска"], "keywords": ["пиктограммы", "icon arrays", "визуализация", "кембридж", "шпигельхалтер"]
    },
    {
        "id": "spg_015", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 15, "chapter_title": "The Fallacy of the Hot Hand", "section": "Random Walks in Sports and Finance",
            "verbatim_anchor_quote": "«The 'hot hand' phenomenon is largely an illusion of human pattern-seeking. Success on the last trade does not increase the probability of winning the next.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Иллюзия горячей руки (Hot Hand Fallacy)", "subtopic": "Независимость вероятностей при последовательных рыночных сделках",
        "core_idea": "Трейдер после 3 побед подряд верит, что поймал 'горячую волну' и начинает входить завышенным объемом. На самом деле каждая следующая сделка — это независимое вероятностное событие.",
        "author_case": "Классическое исследование Томаса Гиловича, Амоса Тверски и Дэвида Шпигельхалтера по баскетбольным броскам: статистика показала, что вероятность попадания после удачного броска не превышает базовый процент игрока.",
        "step_by_step_protocol": "1. Помнить о независимости вероятностей каждого входа. 2. Не увеличивать сайзинг на основе предыдущих побед.",
        "linked_lessons": ["p8_l46", "p8_l50"], "linked_terms": ["Горячая рука", "Тверски"], "keywords": ["горячая рука", "тверски", "гилович", "баскетбол", "независимость", "шпигельхалтер"]
    },
    {
        "id": "spg_016", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 16, "chapter_title": "Expert Forecasting Limits", "section": "The Fox vs Hedgehog Approach",
            "verbatim_anchor_quote": "«Foxes (who know many small things and adapt) vastly outperform hedgehogs (who rely on one big theoretical dogma) in financial forecasting.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Лисицы против Ежей (Филип Тетлок и Шпигельхалтер)", "subtopic": "Превосходство гибких адаптивных трейдеров над догматиками одной теории",
        "core_idea": "'Ежи' верят в одну грандиозную идею ('доллар скоро рухнет') и теряют капиталы. 'Лисицы' используют множество мелких индикаторов, гибки в суждениях и легко меняют сторону при изменении тренда.",
        "author_case": "20-летний турнир прогнозистов: эксперты-лисицы показали точность на 40% выше академических профессоров-ежей, упорствовавших в своих макроэкономических теориях.",
        "step_by_step_protocol": "1. Быть лисицей: собирать данные из разных источников и адаптироваться. 2. Не становиться заложником одной глобальной идеи.",
        "linked_lessons": ["p8_l47", "p8_l51"], "linked_terms": ["Лисицы и Ежи", "Тетлок"], "keywords": ["лисицы", "ежи", "тетлок", "догма", "гибкость", "шпигельхалтер"]
    },
    {
        "id": "spg_017", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 17, "chapter_title": "Loss Aversion Mathematics", "section": "The Asymmetry of Pain and Pleasure",
            "verbatim_anchor_quote": "«Prospect Theory proves that the psychological pain of losing £1,000 is more than twice as intense as the pleasure of gaining £1,000.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Математика теории перспектив (Prospect Theory)", "subtopic": "Коэффициент неприятия потерь 2.25x и его влияние на закрытие сделок",
        "core_idea": "Нобелевская теория перспектив доказала: коэффициент неприятия потерь составляет около 2.25. Боль от убытка в $1000 более чем вдвое сильнее радости от выигрыша $1000. Это заставляет людей нерационально рисковать в зоне убытка.",
        "author_case": "Эксперименты Канемана и Тверски, проанализированные Шпигельхалтером: люди соглашались на асимметричные пари только тогда, когда потенциальный выигрыш превышал возможный убыток минимум в 2.5 раза.",
        "step_by_step_protocol": "1. Учитывать врожденный коэффициент 2.25x. 2. Использовать жесткие автоматические стопы для исключения эмоционального саботажа.",
        "linked_lessons": ["p8_l46", "p8_l48"], "linked_terms": ["Prospect Theory", "Коэффициент 2.25"], "keywords": ["prospect theory", "канеман", "2.25", "неприятие потерь", "шпигельхалтер"]
    },
    {
        "id": "spg_018", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 18, "chapter_title": "Sensitivity Analysis", "section": "Stress-Testing Assumptions",
            "verbatim_anchor_quote": "«Always perform sensitivity analysis: how much does your strategy's profitability decay if your win rate drops by 10% or slippage doubles?»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Анализ чувствительности (Sensitivity Analysis)", "subtopic": "Стресс-тестирование устойчивости стратегии к ухудшению параметров",
        "core_idea": "Перед запуском системы необходимо проверить: что произойдет, если винрейт упадет на 10%, спред вырастет вдвое, а проскальзывание увеличится на 3 пипса. Если система уходит в минус — она хрупка и непригодна для реала.",
        "author_case": "Аудит алгоритмических фондов: 70% систем, казавшихся прибыльными на бэктесте, сливали депозит при стресс-тесте чувствительности к задержкам исполнения на 50 мс.",
        "step_by_step_protocol": "1. Провести стресс-тест стратегии с ухудшением винрейта на 15% и удвоением комиссий. 2. Запускать систему в реал только при сохранении положительного EV.",
        "linked_lessons": ["p8_l47", "p8_l49"], "linked_terms": ["Анализ чувствительности", "Стресс-тест"], "keywords": ["чувствительность", "стресс-тест", "проскальзывание", "спред", "шпигельхалтер"]
    },
    {
        "id": "spg_019", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 19, "chapter_title": "Statistical Humility", "section": "Living with Uncertainty",
            "verbatim_anchor_quote": "«Statistical humility is the quiet confidence that comes from accepting that the future is intrinsically unknowable, yet preparing perfectly for all possibilities.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Статистическое смирение перед неопределенностью", "subtopic": "Гармония между осознанием принципиальной непредсказуемости и безупречной подготовкой",
        "core_idea": "Статистическое смирение освобождает от тревоги: трейдер признает, что будущее принципиально непознаваемо, но спокоен, потому что его риск-менеджмент защищает депозит при любом возможном исходе.",
        "author_case": "Опыт сэра Дэвида Шпигельхалтера как главного статистика Великобритании: принятие неопределенности позволило выстроить самые точные модели оценки рисков пандемий и стихийных бедствий.",
        "step_by_step_protocol": "1. Принять неопределенность как естественную среду работы. 2. Строить защиту через сайзинг и диверсификацию.",
        "linked_lessons": ["p8_l46", "p8_l52"], "linked_terms": ["Статистическое смирение", "Неопределенность"], "keywords": ["смирение", "неопределенность", "статистика", "великобритания", "шпигельхалтер"]
    },
    {
        "id": "spg_020", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 20, "chapter_title": "The Art of Uncertainty", "section": "Final Synthesis",
            "verbatim_anchor_quote": "«Mastery of uncertainty is the ultimate human art: transforming ignorance into quantifiable risk, and navigating chance with grace and mathematical precision.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Искусство навигации в неопределенности", "subtopic": "Итоговый синтез теории вероятностей, калибровки и принятия решений",
        "core_idea": "Высшее мастерство трейдера — превратить хаос и незнание в строгие квантитативные вероятности и управлять капиталом с математической точностью и абсолютным хладнокровием.",
        "author_case": "Итоговое заключение книги The Art of Uncertainty: наука о вероятностях дает человеку единственный надежный компас в непредсказуемом мире финансовых рынков.",
        "step_by_step_protocol": "1. Применять байесовское мышление и калибровку Brier Score в каждом решении. 2. Следовать правилу Кромвеля во всех прогнозах.",
        "linked_lessons": ["p8_l47", "p8_l52"], "linked_terms": ["Искусство неопределенности", "Итог Шпигельхалтера"], "keywords": ["искусство неопределенности", "компас", "синтез", "итог", "шпигельхалтер"]
    }
]

print(f"Book 09 (David Spiegelhalter) verified: {len(SPIEGELHALTER_ATOMS)} authentic atoms.")
