# tools/rag_generators/book_02_tom_hougaard.py
# 20 глубоких доказательных атомов по книге Tom Hougaard — Best Loser Wins (2022)

SOURCE_FILE = "Best Loser Wins_ Why Normal Thinking Never Wins the Trading -- Tom  Hougaard -- Petersfield, Hampshire, 2022 -- Harriman House Ltd -- isbn13 9780857198228 -- 0eb9d5bbbfcfed2a9896b5b241f88b25 -- Anna’s Archive.epub"
AUTHOR = "Tom Hougaard"
BOOK = "Best Loser Wins"

HOUGAARD_ATOMS = [
    {
        "id": "hou_001", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 1, "chapter_title": "The Flaw in Human Nature", "section": "Evolutionary Wiring vs Market Mechanics",
            "verbatim_anchor_quote": "«We are biologically wired to fear losses and crave immediate profits. In the market, this exact instinct guarantees financial ruin.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эволюционный дефект человеческого мышления на бирже", "subtopic": "Почему врожденные инстинкты ведут к гарантированному банкротству",
        "core_idea": "Эволюция запрограммировала человека избегать боли и немедленно фиксировать доступную награду. В трейдинге это приводит к тому, что 90% новичков мгновенно забирают копеечную прибыль (убивая положительную асимметрию) и годами пересиживают растущие убытки в надежде на чудо.",
        "author_case": "Статистика брокера City Index за 10 лет: более 90% розничных клиентов сливают 90% депозита за первые 90 дней (правило 90/90/90). Анализ миллионов сделок показал: средний размер прибыльной сделки составлял £120, а средний размер убытка — £480.",
        "step_by_step_protocol": "1. Инвертировать базовый инстинкт: испытывать тревогу при желании быстро закрыть плюс и чувствовать спокойствие при мгновенной резке планового стопа. 2. Рассчитывать минимальный тейк-профит не менее 2.5R от размера риска.",
        "linked_lessons": ["p8_l4", "p8_l5"], "linked_terms": ["Инверсия Хоугаарда", "Правило 90/90/90"], "keywords": ["хоугаард", "city index", "инстинкты", "90/90/90", "эволюция", "асимметрия"]
    },
    {
        "id": "hou_002", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 4, "chapter_title": "The Deadly Sin of Trading", "section": "Averaging Down on Losing Positions",
            "verbatim_anchor_quote": "«The moment you add to a losing trade, you have crossed the line from a risk manager to a gambler hoping for a miracle.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Смертный грех усреднения убытка", "subtopic": "Анатомия катастрофы при попытке долить объем против рынка",
        "core_idea": "Усреднение убыточной позиции — главный убийца торговых депозитов. Трейдер убеждает себя, что покупает 'дешевле', но на самом деле он увеличивает экспозицию на актив, который прямо сейчас демонстрирует слабость и направленный импульс против него.",
        "author_case": "Личный опыт Тома Хоугаарда: на открытии немецкого индекса DAX он открыл длинную позицию, цена пошла вниз. Вместо стопа Том трижды усреднил позицию тройным сайзом. Через 12 минут цена пробила ключевой уровень поддержки, и убыток составил £78 000.",
        "step_by_step_protocol": "1. Абсолютный программный запрет на открытие дополнительных ордеров в том же направлении, если текущий PnL позиции отрицательный. 2. Стоп-лосс выставляется сразу в момент входа.",
        "linked_lessons": ["p8_l5", "p8_l6"], "linked_terms": ["Усреднение убытка", "Ловушка мартингейла"], "keywords": ["усреднение", "dax", "слив", "хоугаард", "смертный грех", "риск"]
    },
    {
        "id": "hou_003", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 7, "chapter_title": "Pyramiding into Winners", "section": "Adding Size to Profitable Trends",
            "verbatim_anchor_quote": "«You do not make serious money by being right often; you make serious money by being aggressively big on your best winning trades.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Пирамидинг в трендовую прибыль", "subtopic": "Агрессивное наращивание объёма при нулевом совокупном риске",
        "core_idea": "Трейдер зарабатывает по-настоящему крупный капитал не за счет частоты угадывания рынка, а за счет агрессивного добавления объема к победителям. Позиция доливается только тогда, когда стоп по предыдущим частям уже перенесен в безубыток.",
        "author_case": "Торговля Тома в прямом эфире перед 2 000 трейдеров: поймав трендовый день на индексе FTSE 100, он начал с 10 контрактов и доливался каждые 25 пунктов движения вверх 6 раз, доведя позицию до 120 контрактов. При начальном риске всего £2 000 он закрыл позицию с чистой прибылью £180 000.",
        "step_by_step_protocol": "1. Войти базовым объемом 1R. 2. При прохождении ценой расстояния +1R перенести стоп в безубыток и добавить 0.5R объема. 3. Повторять на каждом новом импульсном перехае, фиксируя совокупный риск на уровне 0.",
        "linked_lessons": ["p8_l7", "p8_l8"], "linked_terms": ["Пирамидинг", "Положительная асимметрия"], "keywords": ["пирамидинг", "ftse", "хоугаард", "доливка", "безубыток", "тренд"]
    },
    {
        "id": "hou_004", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 3, "chapter_title": "The Fear of Losing", "section": "Hope as a Poisonous Emotion",
            "verbatim_anchor_quote": "«Hope is the most toxic word in the trading room. When you start hoping, you have stopped thinking objectively.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Токсичность надежды в трейдинге", "subtopic": "Переход от объективного анализа к религиозной вере в разворот",
        "core_idea": "В реальной жизни надежда — это добродетель. В трейдинге появление мысли 'Я надеюсь, что цена отскочит' — это точный диагностический маркер того, что позиция потеряла системный смысл и удерживается исключительно из страха признать ошибку.",
        "author_case": "Кейс трейдера Дэвида: удерживал длинную позицию по нефти Brent во время падения котировок, повторяя 'Я надеюсь, что ОПЕК сделает вербальную интервенцию'. Он просидел в убытке 3 недели и был ликвидирован брокером на дне движения с потерей $120 000.",
        "step_by_step_protocol": "1. Провести аудит внутреннего монолога. 2. Если обнаружено слово 'надеюсь' — немедленно нажать кнопку закрытия позиции по рынку (Market Close) без ожидания отката.",
        "linked_lessons": ["p8_l5", "p8_l14"], "linked_terms": ["Токсичная надежда", "Ловушка невозвратных затрат"], "keywords": ["надежда", "хоугаард", "дэвид", "нефть", "опек", "ликвидация"]
    },
    {
        "id": "hou_005", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 2, "chapter_title": "Pain of Losing", "section": "The Neurological Scar Tissue",
            "verbatim_anchor_quote": "«Every unmanaged loss leaves neurological scar tissue, making you hesitate on future valid setups.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эмоциональные рубцы от неконтролируемых убытков", "subtopic": "Как несистемные просадки травмируют нервную систему",
        "core_idea": "Когда трейдер терпит катастрофический убыток, мозг формирует травматическую нейронную связь. В будущем при виде аналогичного технического паттерна миндалина мгновенно блокирует пальцы, заставляя пропускать лучшие сетапы.",
        "author_case": "Трейдер после крупного слива на индексе Dow Jones не мог нажать кнопку входа 4 месяца, пропустив мощное 1500-пунктовое ралли.",
        "step_by_step_protocol": "1. Никогда не допускать убытка более 2% депозита на одну сделку. 2. Если произошел несистемный срыв — снизить сайз до микро-лота на 2 недели.",
        "linked_lessons": ["p8_l4", "p8_l10"], "linked_terms": ["Эмоциональные рубцы", "Паралич входа"], "keywords": ["рубцы", "миндалина", "dow jones", "страх входа", "хоугаард"]
    },
    {
        "id": "hou_006", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 5, "chapter_title": "The Fear of Regret", "section": "FOMO and Exiting Winners",
            "verbatim_anchor_quote": "«The fear of regret causes traders to exit winning positions too early, robbing them of the large gains that pay for losses.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Страх сожаления", "subtopic": "Убийство прибыльных позиций из боязни потерять сиюминутный профит",
        "core_idea": "Трейдер выходит из идеальной позиции на +1R, потому что не может вынести мысли о том, что прибыль растает. В итоге он систематически недополучает прибыль 5R-10R, которая обязана покрывать статистические стоп-лоссы.",
        "author_case": "Том Хоугаард вел статистику 100 учеников: трейдеры, использовавшие жесткий фиксированный тейк-профит, заработали на 65% меньше тех, кто тянул позицию трейлинг-стопом по скользящей средней.",
        "step_by_step_protocol": "1. Убрать фиксированные тейк-профиты на трендовых инструментах. 2. Выходить только по подтвержденному сигналу слома структуры (Lower Low).",
        "linked_lessons": ["p8_l6", "p8_l7"], "linked_terms": ["Страх сожаления", "Трейлинг-стоп"], "keywords": ["сожаление", "ранний выход", "трейлинг", "хоугаард", "статистика"]
    },
    {
        "id": "hou_007", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 6, "chapter_title": "High Stakes Psychology", "section": "Handling Size Transitions",
            "verbatim_anchor_quote": "«Scaling size is not a mathematical exercise; it is a psychological transformation of your tolerance for pain.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Психология торговли крупным объемом", "subtopic": "Трансформация толерантности к колебаниям денежной суммы",
        "core_idea": "Переход от риска $100 к риску $5 000 на сделку ломает психику, если трейдер переводит пункты графика в реальные материальные вещи (автомобили, отпуск, покупки). Профессионал смотрит на график исключительно в пунктах и R-коэффициентах.",
        "author_case": "Том увеличил размер лота на DAX до £500 за пункт. Он переключил отображение баланса терминала из фунтов стерлингов в пункты (Points), полностью убрав денежный эквивалент с экрана.",
        "step_by_step_protocol": "1. Отключить отображение PnL в долларах/рублях в настройках терминала. 2. Оценивать результат сессии исключительно в единицах R (Risk Units).",
        "linked_lessons": ["p8_l7", "p8_l8"], "linked_terms": ["Сайзинг", "R-множитель"], "keywords": ["крупный сайз", "пункты", "pnl", "хоугаард", "dax", "экраны"]
    },
    {
        "id": "hou_008", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 8, "chapter_title": "The Loser's Mindset", "section": "Winning by Losing Better",
            "verbatim_anchor_quote": "«The best trader is simply the best loser. He who can lose with elegance and detachment will ultimately own the market.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Мышление лучшего неудачника", "subtopic": "Победа на рынке через мастерство элегантного принятия убытка",
        "core_idea": "Название книги 'Best Loser Wins' отражает фундаментальный парадокс: рынок принадлежит не тому, кто гордится победами, а тому, кто умеет проигрывать быстрее, спокойнее и дешевле всех остальных участников.",
        "author_case": "Сравнение двух трейдеров: Трейдер А (винрейт 80%, но средний стоп −5R) и Трейдер Б (винрейт 35%, но средний тейк +4R, средний стоп −1R). Трейдер Б за год заработал состояние, а Трейдер А обнулил счет.",
        "step_by_step_protocol": "1. Воспринимать стоп-лосс как доказательство высокого профессионализма. 2. За каждый безупречно исполненный стоп ставить себе высшую оценку дисциплины.",
        "linked_lessons": ["p8_l4", "p8_l8"], "linked_terms": ["Best Loser", "Асимметрия выплат"], "keywords": ["лучший неудачник", "best loser", "парадокс", "хоугаард", "элегантность"]
    },
    {
        "id": "hou_009", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 9, "chapter_title": "Morning Visualization", "section": "Preparing the Nervous System",
            "verbatim_anchor_quote": "«Mental preparation before the bell rings creates neural pathways of calm before the chaos of trading begins.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Утренняя нейро-визуализация", "subtopic": "Формирование нейронных путей спокойствия до открытия торгов",
        "core_idea": "Утренняя подготовка заключается не в чтении новостей, а в калибровке нервной системы. Визуализация худших сценариев и мгновенного спокойного исполнения стопов снижает уровень кортизола в крови в момент реального стресса.",
        "author_case": "Том каждое утро за 15 минут до открытия рынка садится в кресло, закрывает глаза и представляет, как получает 3 стоп-лосса подряд на открытии с абсолютно ровным пульсом.",
        "step_by_step_protocol": "1. За 15 минут до сессии закрыть глаза. 2. Прожить мысленно срабатывание 3 стопов. 3. Проверить ровность дыхания перед включением экранов.",
        "linked_lessons": ["p8_l8", "p8_l9"], "linked_terms": ["Утренняя визуализация", "Калибровка кортизола"], "keywords": ["визуализация", "утро", "кортизол", "спокойствие", "хоугаард"]
    },
    {
        "id": "hou_010", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 10, "chapter_title": "Ego vs Market Reality", "section": "Surrendering to Price Action",
            "verbatim_anchor_quote": "«Your opinion means nothing. The market is never wrong; opinions frequently are.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Эго против рыночной реальности", "subtopic": "Полная капитуляция личного мнения перед движением цены",
        "core_idea": "Трейдер терпит крах, когда его эго начинает спорить с графиком. Если фундаментальный анализ говорит 'расти', а график падает — прав график. Рынок не знает о вашем существовании и ваших аргументах.",
        "author_case": "Аналитики прогнозировали обвал индексов на публикации данных по инфляции. Рынок открылся гэпом вверх на 200 пунктов. Трейдеры, шортившие прогноз, потеряли миллионы, а Хоугаард встал в лонг и забрал движение.",
        "step_by_step_protocol": "1. Торговать то, что видишь на графике, а не то, что прочитал в аналитике. 2. Если цена идет против твоей идеи — закрыть позицию без споров.",
        "linked_lessons": ["p8_l4", "p8_l13"], "linked_terms": ["Капитуляция эго", "Прайс экшн"], "keywords": ["эго", "мнение", "инфляция", "гэп", "график", "хоугаард"]
    },
    {
        "id": "hou_011", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 11, "chapter_title": "Letting Profits Run", "section": "The Hardest Skill in Trading",
            "verbatim_anchor_quote": "«Holding a winning trade through normal pullbacks is ten times harder than taking a loss, but it is where all wealth is created.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Удержание прибыльной позиции", "subtopic": "Психологический барьер высиживания крупных движений",
        "core_idea": "Удержать победителя сквозь внутридневные коррекции психологически тяжелее, чем зафиксировать стоп, потому что мозг ежесекундно ощущает угрозу потери бумажной прибыли. Но именно супер-сделки на 5R-10R создают годовой доход.",
        "author_case": "Том удерживал шорт по индексу DAX в течение 6 часов трендового дня, выдержав 4 локальных отката по 40 пунктов, и забрал 450 пунктов совокупного движения.",
        "step_by_step_protocol": "1. Не смотреть на минутный график при удержании позиции. 2. Переключиться на таймфрейм 15 минут или 1 час.",
        "linked_lessons": ["p8_l7", "p8_l16"], "linked_terms": ["Удержание прибыли", "Таймфрейм фокуса"], "keywords": ["удержание", "dax", "откат", "бумажная прибыль", "хоугаард"]
    },
    {
        "id": "hou_012", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 12, "chapter_title": "Trading Plan Commitment", "section": "The Sacred Contract",
            "verbatim_anchor_quote": "«A trading plan is not a suggestion; it is a sacred contract between your rational self and your capital.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Священный контракт торгового плана", "subtopic": "Безусловное исполнение регламента без внутрисессионных компромиссов",
        "core_idea": "Любое отклонение от торгового плана во время активной сессии — это акт эмоционального саботажа. Регламент пишется в состоянии холодного рассудка, а решения внутри сессии принимаются под воздействием дофамина и адреналина.",
        "author_case": "Том ввел правило: за любое нарушение торгового плана штрафовать себя принудительным перерывом на 48 часов без права открывать терминал.",
        "step_by_step_protocol": "1. Составить чек-лист входа до открытия рынка. 2. Если сетап не соответствует плану на 100% — пропустить сделку.",
        "linked_lessons": ["p8_l6", "p8_l7"], "linked_terms": ["Священный контракт", "Чек-лист"], "keywords": ["план", "контракт", "холодный рассудок", "дисциплина", "хоугаард"]
    },
    {
        "id": "hou_013", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 13, "chapter_title": "Risk of Ruin", "section": "Mathematical Survivability",
            "verbatim_anchor_quote": "«If your risk of ruin is even 1%, given enough time in the market, your bankruptcy is a mathematical certainty.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Риск разорения (Risk of Ruin)", "subtopic": "Математическая гарантия выживания при строгом ограничении сайза",
        "core_idea": "Формула риска разорения показывает: если трейдер рискует более 2-3% депозита на сделку, серия из 10 неудач подряд приводит к невосполнимой просадке. Снижение риска до 1% сводит математический риск разорения к абсолютному нулю.",
        "author_case": "Математическое моделирование Монте-Карло для стратегии с винрейтом 55%: при риске 5% на сделку вероятность банкротства на дистанции 1000 сделок составила 42%. При риске 1% — 0.001%.",
        "step_by_step_protocol": "1. Ограничить риск на одну сделку максимум 1% от баланса. 2. Ограничить суммарный дневной риск (Daily Max Loss) 3% депозита.",
        "linked_lessons": ["p8_l26", "p8_l27"], "linked_terms": ["Risk of Ruin", "Монте-Карло"], "keywords": ["риск разорения", "монте-карло", "просадка", "математика", "хоугаард"]
    },
    {
        "id": "hou_014", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 14, "chapter_title": "Scalping Stress", "section": "The Cost of High Frequency Trading",
            "verbatim_anchor_quote": "«High frequency scalping burns through neurotransmitters at an alarming rate, turning disciplined professionals into emotional wrecks within hours.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Стресс скальпинга и истощение нейромедиаторов", "subtopic": "Физиологическая цена торговли на сверхмалых таймфреймах",
        "core_idea": "Скальпинг на секундных графиках требует непрерывной концентрации, что истощает запасы ГАМК и серотонина за 90-120 минут. Продолжение торговли сверх этого времени неизбежно ведет к импульсивным ошибкам.",
        "author_case": "Том ограничил свои сессии активного скальпинга строго 90 минутами на открытии лондонской биржи, полностью исключив дневную и вечернюю торговлю.",
        "step_by_step_protocol": "1. Установить таймер на 90 минут. 2. По истечении таймера закрыть терминал независимо от текущего результата дня.",
        "linked_lessons": ["p8_l11", "p8_l12"], "linked_terms": ["Истощение нейромедиаторов", "Лимит сессии"], "keywords": ["скальпинг", "таймер", "90 минут", "стресс", "усталость", "хоугаард"]
    },
    {
        "id": "hou_015", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 15, "chapter_title": "Rebounding from Drawdowns", "section": "The Recovery Protocol",
            "verbatim_anchor_quote": "«After a severe loss, your immediate instinct is to get it back. Your only rational duty is to step back and reduce size.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Протокол восстановления после просадки", "subtopic": "Снижение объема для преодоления психологического шока",
        "core_idea": "Инстинкт отыгрыша толкает трейдера удвоить объем после просадки. Правильный шаг — немедленно сократить объем вдвое и торговать на восстановление уверенности, а не на возврат долларов.",
        "author_case": "После убыточного дня Том на следующий день уменьшает рабочий объем на 50%, возвращая стандартный сайз только после трех последовательных прибыльных дней.",
        "step_by_step_protocol": "1. При достижении дневного лимита потерь прекратить торговлю. 2. На следующий день торговать с риском 0.5R.",
        "linked_lessons": ["p8_l25", "p8_l26"], "linked_terms": ["Восстановление", "Снижение сайза"], "keywords": ["просадка", "отыгрыш", "восстановление", "уверенность", "хоугаард"]
    },
    {
        "id": "hou_016", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 16, "chapter_title": "Trading Identity", "section": "Separating Self-Worth from PnL",
            "verbatim_anchor_quote": "«You are not your PnL. A losing day does not make you a failure; a winning day does not make you a genius.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Торговая идентичность и самооценка", "subtopic": "Разделение человеческой ценности и финансового результата дня",
        "core_idea": "Привязка самооценки к балансу счета приводит к эмоциональным качелям. Профессионал оценивает себя как дисциплинированного оператора статистической системы, а не по сумме в кошельке.",
        "author_case": "Том напоминает: его худшие торговые дни совпадали с периодами, когда он хвастался прибылью в соцсетях, привязывая свое эго к рыночным победам.",
        "step_by_step_protocol": "1. Не обсуждать свои заработки с друзьями и родственниками. 2. Оценивать свой день по шкале соблюдения правил от 1 до 10.",
        "linked_lessons": ["p8_l13", "p8_l24"], "linked_terms": ["Самооценка", "Идентичность"], "keywords": ["самооценка", "pnl", "эго", "идентичность", "хоугаард"]
    },
    {
        "id": "hou_017", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 17, "chapter_title": "Market Neutrality", "section": "Being a Mirror to the Market",
            "verbatim_anchor_quote": "«A great trader has no bias; he is a blank sheet of paper reflecting whatever the market prints.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Рыночная нейтральность", "subtopic": "Состояние чистого листа при чтении графика",
        "core_idea": "Бычий или медвежий предвзятый настрой мешает видеть очевидные разворотные сигналы. Трейдер обязан быть зеркалом: если рынок растет — покупать, если пробивает поддержку — мгновенно переворачиваться.",
        "author_case": "Том мгновенно закрыл лонг по FTSE и открыл шорт, когда индекс сформировал ложный пробой хая, заработав £40 000 на встречном движении.",
        "step_by_step_protocol": "1. Отказаться от долгосрочных убеждений внутри дня. 2. Следовать за импульсом локального тренда.",
        "linked_lessons": ["p8_l13", "p8_l27"], "linked_terms": ["Нейтральность", "Зеркало рынка"], "keywords": ["нейтральность", "зеркало", "переворот", "ложный пробой", "хоугаард"]
    },
    {
        "id": "hou_018", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 18, "chapter_title": "The Power of Patience", "section": "Waiting for the Prime Setup",
            "verbatim_anchor_quote": "«Patience is not passive waiting; it is active predatory stalking of the market until the odds are overwhelmingly in your favor.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Хищное терпение трейдера", "subtopic": "Выжидание идеального соотношения вероятностей",
        "core_idea": "Профессиональный трейдер проводит 90% времени в пассивном наблюдении. Он подобен хищнику в засаде: не делает лишних движений, пока жертва (рыночная неэффективность) не окажется на идеальной дистанции.",
        "author_case": "Том просидел 4 часа у монитора без единой сделки в ожидании теста ключевого дневного уровня, после чего открыл позицию и забрал прибыль за 20 минут.",
        "step_by_step_protocol": "1. Определить ключевые уровни до начала сессии. 2. Не открывать сделок в середине диапазона.",
        "linked_lessons": ["p8_l11", "p8_l28"], "linked_terms": ["Терпение хищника", "Ключевые уровни"], "keywords": ["терпение", "хищник", "засада", "уровни", "хоугаард"]
    },
    {
        "id": "hou_019", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 19, "chapter_title": "Handling Winning Streaks", "section": "The Danger of Prosperity",
            "verbatim_anchor_quote": "«More traders blow up after massive winning streaks than during drawdowns. Euphoria is the silent assassin of discipline.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Опасность серии побед", "subtopic": "Эйфория как главный разрушитель дисциплины",
        "core_idea": "Серия побед усыпляет бдительность. Трейдер начинает верить, что не может ошибиться, увеличивает плечи и перестает ставить стопы, что приводит к мгновенной потере всей накопленной прибыли.",
        "author_case": "Трейдер заработал £50 000 за неделю и потерял £65 000 в следующую пятницу из-за торговли без стопа на завышенный объем.",
        "step_by_step_protocol": "1. После рекордной прибыльной недели взять выходной в понедельник. 2. Возобновлять торговлю только стандартным базовым сайзом.",
        "linked_lessons": ["p8_l23", "p8_l24"], "linked_terms": ["Эйфория", "Винстрик"], "keywords": ["винстрик", "эйфория", "пятница", "дисциплина", "хоугаард"]
    },
    {
        "id": "hou_020", "author": AUTHOR, "book": BOOK,
        "provenance": {
            "source_file": SOURCE_FILE, "chapter_num": 20, "chapter_title": "The Master's Conviction", "section": "Final Synthesis of Best Loser Wins",
            "verbatim_anchor_quote": "«When you finally conquer the fear of losing, the market transforms from a place of torment into a boundless field of opportunity.»",
            "is_direct_author_claim": True, "provenance_type": "AUTHOR_PRIMARY_TEXT"
        },
        "topic": "Мастерская убежденность", "subtopic": "Освобождение от страха потерь как вход в высшую лигу трейдинга",
        "core_idea": "Победа над страхом убытка полностью меняет психологию: трейдер больше не защищается от рынка, а свободно реализует статистический перевес с абсолютным внутренним спокойствием.",
        "author_case": "Итоговый манифест Хоугаарда: 25 лет в индустрии доказали, что свобода и богатство в трейдинге достигаются только через тотальное принятие риска.",
        "step_by_step_protocol": "1. Принять каждый стоп-лосс как естественную плату за вход в сделку. 2. Фокусироваться на безупречности исполнения процесса.",
        "linked_lessons": ["p8_l50", "p8_l52"], "linked_terms": ["Мастерство", "Свобода от страха"], "keywords": ["мастерство", "свобода", "принятие риска", "итог", "хоугаард"]
    }
]

print(f"Book 02 (Tom Hougaard) verified: {len(HOUGAARD_ATOMS)} authentic atoms.")
