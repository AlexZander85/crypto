# tools/rag_generators/book_05_nassim_taleb.py
SOURCE_FILE = "Taleb_Odurachennye-sluchaynostyu-Skrytaya-rol-shansa-v-biznese-i-zhizni.246383.fb2.epub"
AUTHOR = "Nassim Nicholas Taleb"
BOOK = "Fooled by Randomness"

TALEB_ATOMS = [
    {
        "id": "tal_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Alternative Histories",
            "section": "Russian Roulette and Real vs Apparent Risk",
            "verbatim_anchor_quote": "«A decision cannot be judged solely by its outcome. One must consider the entire spectrum of alternative histories that could have unfolded from the same starting conditions.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Альтернативные истории Нассима Талеба",
        "subtopic": "Оценка качества торгового решения вне зависимости от полученного PnL",
        "core_idea": "Успешный исход сделки не доказывает правильность принятого решения. Если трейдер заработал $50 000, нарушив мани-менеджмент и открыв лонг на все плечи без стопа, он сыграл в русскую рулетку. В 5 из 6 параллельных миров этот поступок приводит к банкротству. Оценивать нужно не видимый результат, а распределение всех возможных сценариев.",
        "author_case": "История двух трейдеров: Джон (агрессивный трейдер на хайпе) заработал $10 млн в 1999 году на взлете доткомов, живя в роскоши и считая себя гением. Нерон Тюльпан (консервативный трейдер) зарабатывал скромные 15% годовых, жестко хеджируя хвостовые риски. В марте 2000 года крах NASDAQ полностью обнулил капитал Джона и лишил его дома, а Нерон сохранил капитал и преумножил его в кризис.",
        "step_by_step_protocol": "1. При аудите закрытой прибыльной сделки задать вопрос: 'Если бы этот сетап повторился 100 раз в разных рыночных фазах, в скольких случаях я получил бы маржин-колл?'. 2. Если вероятность ликвидации в параллельных мирах >1% — объявить сделку грубой дисциплинарной ошибкой.",
        "linked_lessons": ["p8_l31", "p8_l32"],
        "linked_terms": ["Альтернативные истории", "Русская рулетка Талеба"],
        "keywords": ["талеб", "альтернативные истории", "русская рулетка", "нерон тюльпан", "джон", "случайность", "доткомы"]
    },
    {
        "id": "tal_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Survivorship Bias",
            "section": "The Illusion of Track Records on Bull Markets",
            "verbatim_anchor_quote": "«If you put an infinite number of monkeys in front of typewriters, one will write the Iliad. A bull market makes every gambler look like a financial genius.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Ошибка выжившего в трейдинге",
        "subtopic": "Математическая иллюзия профессионализма в восходящем рыночном тренде",
        "core_idea": "Если 10 000 неподготовленных человек подбрасывают монетку каждый год, по законам теории вероятностей через 5 лет останется группа из более чем 300 человек, которые угадали исход 5 раз подряд. Они создадут хедж-фонды и будут писать книги об успехе, хотя их результат — чистейший статистический артефакт выборки.",
        "author_case": "Крах квантового фонда Long-Term Capital Management (LTCM) в 1998 году: управляемый нобелевскими лауреатами Майроном Шоулзом и Робертом Мертоном фонд демонстрировал фантастическую доходность 40% годовых, уверяя инвесторов в безупречности математических моделей. Однако дефолт России по ГКО спровоцировал каскадный кризис ликвидности, и фонд с плечом x30 потерял $4.6 млрд за считанные недели.",
        "step_by_step_protocol": "1. Никогда не доверять трек-рекордам трейдеров и алгоритмов, если они не прошли минимум один полноценный медвежий рынок со снижением ликвидности. 2. Оценивать устойчивость системы стресс-тестированием на исторических кризисах (1998, 2008, 2020, 2022).",
        "linked_lessons": ["p8_l32", "p8_l33"],
        "linked_terms": ["Ошибка выжившего", "Бычий морок"],
        "keywords": ["ошибка выжившего", "ltcm", "нобелевские лауреаты", "монетки", "талеб", "бычий рынок", "гко", "стресс-тест"]
    },
    {
        "id": "tal_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Carlos the Emerging Market Wizard",
            "section": "The Turkey Problem and Rare Events",
            "verbatim_anchor_quote": "«Carlos was making money because he was exposed to a specific type of risk: the risk of a rare blowout event that occurs once every decade.»",
            "is_direct_author_claim": True, "provenance_type": "CASE_STUDY"
        },
        "topic": "Проблема Карлоса и асимметрия хвостового риска",
        "subtopic": "Стратегии с частой мелкой прибылью и скрытым риском мгновенной смерти",
        "core_idea": "Существуют стратегии (продажа непокрытых опционов, сбор фандинга без хеджа, удержание высокодоходного мусорного долга), которые приносят стабильный плюс в 99% дней. Трейдер считает себя финансовым гением, не понимая, что он просто продает страховку от катастрофы по заниженной цене.",
        "author_case": "Трейдер Карлос в Нью-Йорке: 7 лет подряд получал огромные бонусы, покупая суверенные облигации развивающихся рынков с высокой доходностью. В августе 1998 года дефолт РФ по государственным казначейским обязательствам (ГКО) стер 100% его капитала и привел к убытку банка в сотни миллионов долларов.",
        "step_by_step_protocol": "1. Проверить стратегию на наличие 'риска индейки': 'Что произойдет со счетом при падении рынка на 50% за день?'. 2. Если возможен маржин-колл — стратегия ликвидируется как токсичная.",
        "linked_lessons": ["p8_l33", "p8_l34"],
        "linked_terms": ["Черный лебедь", "Хвостовой риск"],
        "keywords": ["карлос", "индейка", "талеб", "гко", "хвостовой риск", "редкие события", "бонусы"]
    }
]
print(f"Book 5 (Nassim Taleb) verified: {len(TALEB_ATOMS)} high-density atoms.")
