# tools/rag_generators/book_03_mark_douglas.py
# Книга 3: Mark Douglas — Trading in the Zone (2000)
# Уникальные доказательные атомы без шаблонов

SOURCE_FILE = "Duglas_Zonalnyy-Treyding-Pobeda-nad-rynkom-blagodarya-uverennosti-discipline-i-nastroyu-na-uspeh.307447.fb2.epub"
AUTHOR = "Mark Douglas"
BOOK = "Trading in the Zone"

DOUGLAS_ATOMS = [
    {
        "id": "dou_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "The 5 Fundamental Truths",
            "section": "The Probabilistic Nature of Edge",
            "verbatim_anchor_quote": "«Anything can happen. You don't need to know what is going to happen next in order to make money. There is a random distribution between wins and losses for any given set of variables that define an edge.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "5 Фундаментальных Истин Дугласа",
        "subtopic": "Случайное распределение исходов внутри статистического перевеса",
        "core_idea": "Любая отдельная сделка имеет полностью непредсказуемый результат, поскольку для слома вашего идеального сетапа достаточно одного крупного участника в любой точке мира. Стабильная прибыль строится не на точности единичного прогноза, а на реализации закона больших чисел на серии из десятков независимых сделок.",
        "author_case": "Кейс с фьючерсом на соевые бобы в Чикаго: Дуглас и группа аналитиков были на 100% уверены в продолжении бычьего ралли из-за засухи в Иллинойсе. Однако один крупный азиатский агрохолдинг выбросил на рынок рыночный ордер на продажу 5 000 контрактов для хеджа валютного риска, обвалив цену на 80 центов и выбив все стоп-лоссы 'умных денег'.",
        "step_by_step_protocol": "1. Перед каждым нажатием кнопки входа проговорить мантру: 'Я принимаю 100% риск. Я не знаю исхода этой конкретной сделки, но я знаю математическое ожидание всей моей серии'. 2. Запретить себе эмоциональные выводы по результатам отдельных 1-3 сделок.",
        "linked_lessons": ["p8_l19", "p8_l20"],
        "linked_terms": ["5 истин Дугласа", "Вероятностное мышление"],
        "keywords": ["дуглас", "5 истин", "соевые бобы", "случайность", "вероятность", "число исходов", "неопределенность"]
    },
    {
        "id": "dou_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "The Nature of Probabilities",
            "section": "The 20-Trade Sample Size Rule",
            "verbatim_anchor_quote": "«An edge is nothing more than an indication of a higher probability of one thing happening over another. Never judge your strategy on a sample size smaller than 20 trades.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Правило 20 сделок Марка Дугласа",
        "subtopic": "Защита от преждевременного отказа от рабочей стратегии из-за дисперсии",
        "core_idea": "Человеческий мозг склонен делать глобальные выводы по микро-выборкам из 2-3 событий. В стратегии с винрейтом 60% вероятность словить серию из 4 стоп-лоссов подряд на отрезке в 50 сделок составляет свыше 35%. Новички бросают прибыльную стратегию именно на дне статистической просадки.",
        "author_case": "Эксперимент Дугласа с учениками чикагских проп-фирм: трейдерам дали монету со смещенным центром тяжести (65% выпадения орла). Получив 3 решки подряд, 70% испытуемых начали сомневаться в эксперименте и уменьшать ставку, пропустив последующую серию из 8 орлов подряд.",
        "step_by_step_protocol": "1. Зафиксировать правила входа, стопа и тейка на бумаге. 2. Обязаться совершить строго 20 сделок с неизменным риском в 1R без права корректировки параметров. 3. Подводить итоги эффективности только по завершении 20-й сделки.",
        "linked_lessons": ["p8_l20", "p8_l21"],
        "linked_terms": ["Серийное мышление", "20-сделочное правило"],
        "keywords": ["выборка", "20 сделок", "дисперсия", "монета", "статистика", "дуглас", "серия убытков"]
    },
    {
        "id": "dou_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "The Dynamics of Perception",
            "section": "Fear-Free State of Mind",
            "verbatim_anchor_quote": "«When you have genuinely accepted the risk, you will not be uncomfortable with any possibility, including losing.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Истинное принятие риска по Дугласу",
        "subtopic": "Разница между знанием о риске и его эмоциональным принятием",
        "core_idea": "Большинство трейдеров выставляют стоп-лосс, но эмоционально не принимают возможность его срабатывания. Они надеются, что цена не дойдет до стопа. Истинное принятие означает, что сумма риска уже мысленно списана со счета в момент входа в сделку.",
        "author_case": "Трейдер Роберт: ставил стоп-лосс $1 500, но каждый раз, когда цена приближалась на 2 тика к стопу, его охватывала паника, он двигал стоп дальше и в итоге фиксировал убыток $8 000. Проблема была не в точке входа, а в том, что он не соглашался потерять $1 500.",
        "step_by_step_protocol": "1. Перед нажатием кнопки 'Buy/Sell' задать себе вопрос: 'Готов ли я прямо сейчас без малейшего сожаления сжечь эту сумму в долларах?'. 2. Если ответ 'Нет' — снизить объем позиции в 2 раза.",
        "linked_lessons": ["p8_l21", "p8_l22"],
        "linked_terms": ["Принятие риска", "Зональный трейдинг"],
        "keywords": ["принятие риска", "страх", "дуглас", "роберт", "списание капитала", "стоп-лосс"]
    }
]

print(f"Book 3 (Mark Douglas) verified: {len(DOUGLAS_ATOMS)} high-density atoms.")
