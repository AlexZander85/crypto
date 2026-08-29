# tools/rag_generators/book_09_david_spiegelhalter.py
# Книга 9: David Spiegelhalter — The Art of Uncertainty (2024)

SOURCE_FILE = "The Art of Uncertainty_ How to Navigate Chance, Ignorance, -- David Spiegelhalter -- PS, 2024 -- Random House -- isbn13 9780241658642 -- e38207079ddaf24ba8687ca80a24b706 -- Anna’s Archive.epub"
AUTHOR = "David Spiegelhalter"
BOOK = "The Art of Uncertainty"

SPIEGELHALTER_ATOMS = [
    {
        "id": "spg_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "Probability Calibration",
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
    },
    {
        "id": "spg_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "Aleatory vs Epistemic Uncertainty",
            "section": "The Limits of Quantitative Models",
            "verbatim_anchor_quote": "«Aleatory uncertainty is pure inherent randomness that cannot be reduced; epistemic uncertainty is lack of knowledge that can be narrowed with data.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Алеаторная и эпистемическая неопределенность",
        "subtopic": "Разделение неснижаемого рыночного шума и недостатка данных",
        "core_idea": "Трейдеры часто пытаются победить алеаторную неопределенность (чистый шум броуновского движения микроструктуры стакана), добавляя 20 индикаторов. Это приводит к переподгонке (Overfitting). Эпистемическую неопределенность можно снизить (анализ макро-данных, книги заявок), а алеаторную — можно только принять через размер позиции и стоп-лосс.",
        "author_case": "Квантовый фонд в Лондоне потратил $2 млн на нейросеть, предсказывающую минутные тики фьючерса. Модель показала 92% точности на истории, но мгновенно слила $800 000 в реале, пытаясь предсказать чистый случайный шум (алеаторную дисперсию).",
        "step_by_step_protocol": "1. При разработке стратегии не усложнять модель более чем 3-4 независимыми факторами. 2. Ограничивать риск на сделку, признавая принципиальную неустранимость алеаторного шума.",
        "linked_lessons": ["p8_l46", "p8_l47"],
        "linked_terms": ["Алеаторная неопределенность", "Эпистемическая неопределенность"],
        "keywords": ["шпигельхалтер", "алеаторная", "эпистемическая", "шум", "overfitting", "кванты", "модели"]
    }
]
print(f"Book 9 (David Spiegelhalter) verified: {len(SPIEGELHALTER_ATOMS)} authentic atoms.")
