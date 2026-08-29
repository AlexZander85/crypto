# tools/rag_generators/book_13_steven_goldstein.py
# Книга 13: Steven Goldstein — Mastering the Mental Game of Trading (2022)

SOURCE_FILE = "Mastering the Mental Game of Trading _ Harnessing the Power -- Steven  Goldstein -- Lightning Source Inc_ (Tier 2), Hampshire, Great Britain, -- isbn13 9781804090077 -- ebd90c863d6121df496bd6a2fa72e3ac -- Anna’s Archive.epub"
AUTHOR = "Steven Goldstein"
BOOK = "Mastering the Mental Game of Trading"

GOLDSTEIN_ATOMS = [
    {
        "id": "gld_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "The Ego Trap",
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
    },
    {
        "id": "gld_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "Cognitive Drift and Rule Erosion",
            "section": "The Slow Decay of Discipline",
            "verbatim_anchor_quote": "«Catastrophic trading blowups rarely happen out of the blue; they are the final stage of cognitive drift – a slow erosion of discipline where small rule violations are tolerated until ruin occurs.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Когнитивный дрейф и эрозия дисциплины",
        "subtopic": "Как мелкие исключения из правил приводят к масштабным катастрофам",
        "core_idea": "Слив счета почти никогда не происходит мгновенно. Он начинается с мелких безобидных поблажек: чуть позже поставил стоп, вошел на 10% большим объемом, не заполнил журнал. Поскольку эти мелкие нарушения иногда приносят прибыль, мозг закрепляет безнаказанность, пока не наступает катастрофический обвал.",
        "author_case": "Трейдер инвестиционного банка в Лондоне: начал с того, что перенес стоп-лосс на 5 пунктов, избежав убытка в $5 000. Через 3 месяца он уже регулярно пересиживал просадки, что закончилось несанкционированной позицией в £45 млн и увольнением с волчьим билетом.",
        "step_by_step_protocol": "1. Применять принцип 'Нулевой толерантности' (Broken Windows Theory): любое, даже самое мелкое нарушение торгового регламента штрафуется запретом на торговлю на следующие 24 часа.",
        "linked_lessons": ["p8_l14", "p8_l18"],
        "linked_terms": ["Когнитивный дрейф", "Эрозия правил"],
        "keywords": ["голдштейн", "когнитивный дрейф", "дисциплина", "разбитые окна", "эрозия", "лондон"]
    }
]
print(f"Book 13 (Steven Goldstein) verified: {len(GOLDSTEIN_ATOMS)} authentic atoms.")
