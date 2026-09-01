/* ===== learn_player_stage8: ЭТАП 8 — Трек «основа + факультатив» (начало) ===== */
/* =========================================================================
   КриптоНавигатор v13.0 · ЭТАП 8 поверх Этапов 1–7 Learn Player.
   ТЗ: «lesson_restructure_core_elective.md» (v2, Learn Player Edition), П1+П2.

   ПРИНЦИП ЭТАПА 8 (утверждён владельцем, v2):
   «Трек „основа + факультатив" живёт ТОЛЬКО в режиме „Обучение".
    Стандартный просмотрщик (вкладки, каталог, ридер, страница тестов)
    не затрагивается вообще — ни одного символа вне блока плеера.»

   КРИТЕРИЙ АРХИТЕКТУРЫ: удалить секцию stage8 и CSS-блок трека —
   плеер работает как Этап 7, приложение как v12.9. Ни одной правки
   существующих тел функций: только обёртки `var _trk = fn; fn = …`
   (тот же паттерн, что у Этапов 2–7), новые функции, новые LS-ключи
   cn_track_* (коллизий нет — проверено по v12.9), window.CNTracks наружу.
   Контент уроков и банков заморожен (§0.1 ТЗ плеера). Чтение LS/глобалов:
   cn_lessons, cn_phase_tests, cn_learned, cn_learn_pos — только чтение.
   ========================================================================= */

/* ---------- 8.1 ДАННЫЕ ТРЕКОВ (литерал CN_TRACKS из приложения П1 — копия целиком) ---------- */
var CN_TRACKS = {
  version: 13,
  profileKey: 'cn_track_profile',      /* 'sprint' | 'architect' */
  filterKey: 'cn_lessons_filter',      /* 'all' | 'core' | 'elective' (зарезервировано П1, кодом не используется) */
  dismissedKey: 'cn_elective_dismissed', /* зарезервировано П1, кодом не используется (см. TRK.offersKey) */

  coreStages: [
    { id: 'A', title: 'Рынок и деньги', phaseLabel: 'Фаза 0', gate: 'p0',
      lessons: [
      'p0_l1', 'p0_l2', 'p0_l3', 'p0_l4', 'p0_l5', 'p0_l6',
      'p0_l7', 'p0_l8', 'p0_l9', 'p0_l10', 'p0_l11', 'p0_l12',
      'p0_l13', 'p0_l14', 'p0_l15', 'p0_l16', 'p0_l18', 'p0_l20',
      ] },

    { id: 'B', title: 'Статистика и бэктест', phaseLabel: 'Фаза 1 + 2.6 (качество данных)', gate: 'p1',
      lessons: [
      'p1_l1', 'p1_l2', 'p1_l3', 'p1_l5', 'p1_l6', 'p1_l7',
      'p1_l8', 'p1_l9', 'p2_l6', 'p1_l10', 'p1_l11', 'p1_l12',
      ] },

    { id: 'C', title: 'Риск и портфель', phaseLabel: 'Фаза 3', gate: 'p3',
      lessons: [
      'p3_l1', 'p3_l2', 'p3_l3', 'p3_l4', 'p3_l5', 'p3_l6',
      ] },

    { id: 'D', title: 'Продакшн', phaseLabel: 'Фаза 4', gate: 'p4',
      lessons: [
      'p4_l1', 'p4_l2', 'p4_l3', 'p4_l4', 'p4_l5', 'p4_l6',
      'p4_l7', 'p4_l8',
      ] },

    { id: 'E', title: 'Первый бот (Академия Freqtrade)', phaseLabel: 'FT-01–FT-20', gate: 'ft_project',
      lessons: [
      'ft01', 'ft02', 'ft03', 'ft04', 'ft05', 'ft06',
      'ft07', 'ft08', 'ft09', 'ft10', 'ft11', 'ft12',
      'ft13', 'ft14', 'ft15', 'ft16', 'ft17', 'ft18',
      'ft19', 'ft20',
      ] },

    { id: 'F', title: 'Живой запуск', phaseLabel: 'Фаза 5', gate: 'p5',
      lessons: [
      'p5_l1', 'p5_l2', 'p5_l3', 'p5_l4', 'p5_l5', 'p5_l6',
      'p5_l7',
      ] },

    { id: 'PSY', title: 'Псих-минимум оператора (вплетён в D–F)', phaseLabel: 'Психология 8/56', gate: null,
      lessons: [
      'ps_l1', 'ps_l2', 'ps_l20', 'ps_l3', 'ps_l4', 'ps_l10',
      'ps_l14', 'ps_l55',
      ],
      anchors: {
        ps_l1: 'p4_l5',
        ps_l2: 'p4_l5',
        ps_l20: 'p5_l1',
        ps_l3: 'p5_l5',
        ps_l4: 'p5_l5',
        ps_l10: 'p5_l5',
        ps_l14: 'p5_l5',
        ps_l55: 'p5_l6'
      } }
  ],

  electives: [
    { id: 'MF-A1', name: "Матфак · Вероятностная интуиция", after: 'p0_l13', priority: '🔥',
      why: "Закрепляет 0.13 до сдачи теста Фазы 0",
      lessons: [
      'm_chto_voobsche_takoe_veroyatnost', 'm_veroyatnost_ne_predskazyvaet_konkretnyy', 'm_nezavisimye_sobytiya_i_oshibka', 'm_chto_takoe_uslovnaya_veroyatnost',
      ] },
    { id: 'MF-A2', name: "Матфак · Среднее, разброс, ставки", after: 'p0_l15', priority: '🔥',
      why: "Закрепляет 0.14–0.15 (EV и дисперсия)",
      lessons: [
      'm_chto_takoe_srednee', 'm_matematicheskoe_ozhidanie', 'm_kak_mozhno_vyigryvat_chasche', 'm_razbros_rezultatov', 'm_standartnoe_otklonenie_bez_strashnoy',
      ] },
    { id: 'MF-A3', name: "Матфак · Решения при проигрышах", after: 'p0_l18', priority: '⭐',
      why: "ЗБЧ, решение ≠ прогноз, размер ставки",
      lessons: [
      'm_zakon_bolshih_chisel', 'm_reshenie_eto_ne_prognoz', 'm_risk_i_razmer_stavki',
      ] },
    { id: 'MF-B1', name: "Матфак · Игровая механика рынка", after: 'p1_l5', priority: '⭐',
      why: "Кто твой контрагент и почему эдж исчезает — фон для гипотез",
      lessons: [
      'm_ty_torguesh_ne_s', 'm_u_kazhdogo_uchastnika_svoi', 'm_chto_proizoydet_esli_vse', 'm_igra_s_koordinaciey', 'm_igra_s_nulevoy_summoy', 'm_informaciya_tozhe_imeet_cennost',
      'm_pochemu_prostoe_preimuschestvo_ischezaet', 'm_dilemma_chto_vygodno_odnomu', 'm_rynok_kak_igra_s', 'm_finalnyy_integracionnyy_urok',
      ] },
    { id: 'MF-B2', name: "Матфак · Хвосты распределений", after: 'p1_l2', priority: '🔥',
      why: "Глубже про толстые хвосты из 1.2",
      lessons: [
      'm_raspredelenie_rezultatov', 'm_asimmetriya_i_hvosty_zachem',
      ] },
    { id: 'MF-B3', name: "Матфак · Переобучение", after: 'p1_l7', priority: '🔥',
      why: "Прямое усиление 1.7 (look-ahead) и 1.12",
      lessons: [
      'm_pereobuchenie_na_palcah', 'm_obuchayuschaya_i_testovaya_vyborka',
      ] },
    { id: 'MF-B4', name: "Матфак · Статвывод и выборки", after: 'p1_l12', priority: '⭐',
      why: "Почему оценки «плавают» — фундамент робастности",
      lessons: [
      'm_generalnaya_sovokupnost_i_vyborka', 'm_parametr_i_ocenka', 'm_pochemu_srednee_mozhet_obmanyvat', 'm_mediana_i_kvantili', 'm_vybrosy_oshibka_ili_realnost', 'm_standartnaya_oshibka_pochemu_ocenki',
      'm_doveritelnyy_interval_bez_strashnoy',
      ] },
    { id: 'MF-B5', name: "Матфак · Гипотезы и p-value", after: 'p1_l12', priority: '🔥',
      why: "Анти-самообман при поиске эджа",
      lessons: [
      'm_gipoteza_kazhetsya_zdes_est', 'm_nulevaya_gipoteza_i_alternativnaya', 'm_p_value_chto_eto', 'm_uroven_znachimosti_i_oshibka', 'm_mnozhestvennye_proverki_esli_dolgo', 'm_sluchaynost_i_doverie_k',
      ] },
    { id: 'MF-B6', name: "Матфак · Корреляция и регрессия", after: 'p1_l12', priority: '⭐',
      why: "Фон для 3.1 (коинтеграция) и анализа остатков",
      lessons: [
      'm_korrelyaciya_dva_ryada_dvizhutsya', 'm_prichina_i_sovpadenie', 'm_regressiya_na_palcah', 'm_oshibka_prognoza_i_ostatki',
      ] },
    { id: 'MF-C1', name: "Матфак · Z-оценка и ЦПТ", after: 'p3_l2', priority: '🔥',
      why: "Z-score спреда из 3.2 на глубоком уровне",
      lessons: [
      'm_z_ocenka', 'm_cpt_centralnaya_predelnaya_teorema',
      ] },
    { id: 'MF-C2', name: "Матфак · Критерий Келли", after: 'p3_l3', priority: '🔥',
      why: "Математика под 3.3 (дробный Келли)",
      lessons: [
      'm_kelly_criterion',
      ] },
    { id: 'MF-F1', name: "Матфак · Регрессия к среднему", after: 'p5_l4', priority: '⭐',
      why: "Связь с Alpha Decay (5.4)",
      lessons: [
      'm_regressiya_k_srednemu',
      ] },
    { id: 'MF-F2', name: "Матфак · Финальная карта", after: 'p5_l7', priority: '⭐',
      why: "Замыкает матфак, готовит к 3 финальным тестам",
      lessons: [
      'm_finalnaya_karta_matematicheskoy_statisti',
      ] },
    { id: 'PS-1', name: "Психология · Иллюзии бэктеста", after: 'p1_l7', priority: '🔥',
      why: "Ошибка выжившего и ловушка индейки — сразу к look-ahead",
      lessons: [
      'ps_l23', 'ps_l24',
      ] },
    { id: 'PS-2', name: "Психология · Единицы риска", after: 'p3_l3', priority: '⭐',
      why: "Мышление в R для сайзинга",
      lessons: [
      'ps_l31',
      ] },
    { id: 'PS-3', name: "Психология · Ночная смена", after: 'p4_l5', priority: '⭐',
      why: "Сон, телефон и рынок 24/7 перед paper trading",
      lessons: [
      'ps_l5',
      ] },
    { id: 'PS-4', name: "Психология · Вероятностное мышление", after: 'p3_l6', priority: '⭐',
      why: "Альтернативные истории Талеба, правило Кромвеля",
      lessons: [
      'ps_l22', 'ps_l25',
      ] },
    { id: 'PS-5', name: "Психология · Ранние уколы реальности", after: 'p5_l1', priority: '⭐',
      why: "Качели, письмо из будущего, оценка процессов",
      lessons: [
      'ps_l6', 'ps_l7', 'ps_l8',
      ] },
    { id: 'PS-6', name: "Психология · Химия эмоций", after: 'p5_l1', priority: '⭐',
      why: "Дофамин, гормоны, ментальный капитал, физиология",
      lessons: [
      'ps_l9', 'ps_l11', 'ps_l12', 'ps_l13',
      ] },
    { id: 'PS-7', name: "Психология · Спектр тильта", after: 'p5_l5', priority: '🔥',
      why: "Пять лиц злости, страх, жадность, ремонт по Тендлеру",
      lessons: [
      'ps_l15', 'ps_l16', 'ps_l17', 'ps_l18', 'ps_l19', 'ps_l21',
      ] },
    { id: 'PS-8', name: "Психология · Мастерство и режимы", after: 'p5_l4', priority: '🔥',
      why: "Дюймовый червя, петля привычки, саберметрика, смена режимов",
      lessons: [
      'ps_l30', 'ps_l32', 'ps_l33', 'ps_l34',
      ] },
    { id: 'PS-9', name: "Психология · Дневник искажений", after: 'p5_l4', priority: '🔥',
      why: "Инструмент журнала когнитивных ошибок приложения",
      lessons: [
      'ps_l44',
      ] },
    { id: 'PS-10', name: "Психология · Термостат и рост", after: 'p5_l2', priority: '🔥',
      why: "Подсознание против выросшего депозита, репетиции, ясность",
      lessons: [
      'ps_l26', 'ps_l27', 'ps_l28', 'ps_l29',
      ] },
    { id: 'PS-11', name: "Психология · Капитал и смысл", after: 'p5_l3', priority: '⭐',
      why: "40/40/20 без груза выживания, Crosby, «достаточно», свобода",
      lessons: [
      'ps_l35', 'ps_l36', 'ps_l37', 'ps_l38', 'ps_l39', 'ps_l40',
      ] },
    { id: 'PS-12', name: "Психология · Искажения алго-оператора", after: 'p5_l6', priority: '🔥',
      why: "Ошибка игрока, доступность, статус-кво (П55 — уже в ядре)",
      lessons: [
      'ps_l53', 'ps_l54', 'ps_l56',
      ] },
    { id: 'PS-13', name: "Психология · Продвинутый трек", after: 'p5_l7', priority: '⭐',
      why: "Стресс-лаб, крупный капитал, команда, выгорание, манифест",
      lessons: [
      'ps_l41', 'ps_l42', 'ps_l43', 'ps_l45', 'ps_l46', 'ps_l47',
      'ps_l48', 'ps_l49', 'ps_l50', 'ps_l51', 'ps_l52',
      ] },
    { id: 'BN-1', name: "Бонусы · Торгуй вероятностями (Polymarket)", after: 'p0_l15', priority: '💤',
      why: "Рынки предсказаний как практикум вероятностей",
      lessons: [
      'p6_l6', 'p6_l17',
      ] },
    { id: 'BN-2', name: "Бонусы · Опционы", after: 'p0_l16', priority: '💤',
      why: "Call/Put после деривативов",
      lessons: [
      'p6_l5',
      ] },
    { id: 'BN-3', name: "Бонусы · Кто ест твою сделку (MEV)", after: 'p0_l10', priority: '⭐',
      why: "Сэндвич-атаки и защита — продление темы слиппеджа",
      lessons: [
      'v4_mev',
      ] },
    { id: 'BN-4', name: "Бонусы · Пассивный доход?", after: 'p0_l18', priority: '⭐',
      why: "Майнинг, стейкинг, DeFi, стейбл — откуда доходность",
      lessons: [
      'p6_l1', 'p6_l2', 'p6_l3', 'p6_l14',
      ] },
    { id: 'BN-5', name: "Бонусы · Ловушки нулевых", after: 'p0_l18', priority: '⭐',
      why: "Мемкоины и шиткоин-чеклист",
      lessons: [
      'p0_l17', 'p0_l19',
      ] },
    { id: 'BN-6', name: "Бонусы · Бесплатные монеты?", after: 'p0_l20', priority: '💤',
      why: "Airdrop, рождение токена, краны",
      lessons: [
      'p6_l8', 'p6_l15', 'p6_l9',
      ] },
    { id: 'BN-7', name: "Бонусы · Культурный слой", after: 'p0_l3', priority: '💤',
      why: "NFT и GameFi — по интересу",
      lessons: [
      'p6_l4', 'p6_l7',
      ] },
    { id: 'BN-8', name: "Бонусы · Polymarket продвинутый", after: 'p3_l6', priority: '💤',
      why: "CLOB, UMA, стратегии хвостов",
      lessons: [
      'p6_l10', 'p6_l11',
      ] },
    { id: 'BN-9', name: "Бонусы · Зрелые рынки", after: 'p3_l4', priority: '💤',
      why: "RWA и DAO как класс активов",
      lessons: [
      'p6_l13', 'p6_l16',
      ] },
    { id: 'VB-1', name: "Вайбкодинг · Самопис с ИИ-агентом", after: 'p4_l8', priority: '🔥',
      why: "Альтернатива модулю E: свой бот с LLM-агентом; ВК4 — мост в FT",
      lessons: [
      'vc_l1', 'vc_l2', 'vc_l3', 'vc_l4',
      ] },
    { id: 'EG-1', name: "Эдж · Альтернативные данные (Фаза 2)", after: 'p1_l11', priority: '🔥',
      why: "Сентимент, NLP, ончейн, киты, OBI + аттестация Тест Фазы 2",
      lessons: [
      'p2_l1', 'p2_l2', 'p2_l3', 'p2_l4', 'p2_l5',
      ] },
    { id: 'FA-1', name: "FreqAI · Машинное обучение", after: 'ft20', priority: '⭐',
      why: "Продвинутая траектория после итогового проекта",
      lessons: [
      'fai01', 'fai02', 'fai03', 'fai04', 'fai05', 'fai06',
      'fai07',
      ] },
    { id: 'LL-1', name: "LLM-агенты в трейдинге", after: 'p4_l7', priority: '⭐',
      why: "ReAct, Function Calling, галлюцинации",
      lessons: [
      'v4_llm',
      ] },
    { id: 'P4-1', name: "Perp-DEX", after: 'p4_l2', priority: '⭐',
      why: "Hyperliquid/dYdX — альтернативная инфраструктура",
      lessons: [
      'p4_l9',
      ] },
    { id: 'P1-1', name: "ACF/PACF", after: 'p1_l3', priority: '⭐',
      why: "Автокорреляция глубже — для исследователей",
      lessons: [
      'p1_l4',
      ] },
  ],

  coreTests: ['p0','p1','p3','p4','p5'],
  allTests:  ['p0','p1','p2','p3','p4','p5'],
  electiveAttestations: {
    p2:       'Тест Фазы 2 — аттестация блока EG-1 «Эдж»',
    psy:      'Аттестация психологии (181 вопрос, порог 70%)',
    math:     '3 финальных теста матфакультатива (порог 80%)',
    fai:      'FAI-07 FreqAI Capstone',
    capstone: 'Capstone Exam (38 вопросов, порог 85%) — аттестация маршрута «Архитектор»'
  }
};

(function initTrackSets(){
  var core = [];
  CN_TRACKS.coreStages.forEach(function(s){ (s.lessons || []).forEach(function(id){ core.push(id); }); });
  CN_TRACKS.coreSet = {};                       /* id -> 1 */
  core.forEach(function(id){ CN_TRACKS.coreSet[id] = 1; });
  CN_TRACKS.coreCount = core.length;            /* ожидается 79 */
  CN_TRACKS.blockOf = {};                       /* elective id -> block id */
  CN_TRACKS.electivesByAnchor = {};             /* anchor id -> [blocks] */
  CN_TRACKS.electives.forEach(function(b){
    b.lessons.forEach(function(id){ CN_TRACKS.blockOf[id] = b.id; });
    if(!CN_TRACKS.electivesByAnchor[b.after]) CN_TRACKS.electivesByAnchor[b.after] = [];
    CN_TRACKS.electivesByAnchor[b.after].push(b);
  });
  /* self-test: биективность 79+134=213, все id существуют, дублей нет */
  var seen = {}, dup = [], total = 0, missing = [];
  function see(id){ if(seen[id]) dup.push(id); seen[id] = 1; total++; }
  core.forEach(see);
  CN_TRACKS.electives.forEach(function(b){ b.lessons.forEach(see); });
  Object.keys(seen).forEach(function(id){ if(!lessonById(id)) missing.push(id); });
  if(dup.length || total !== 213 || missing.length || CN_TRACKS.coreCount !== 79){
    console.error('[CNTracks] self-test FAILED', { dup: dup, total: total, missing: missing });
  } else {
    console.info('[CNTracks] self-test OK: 79 core + 134 elective = 213, все id существуют');
  }
  try{ V10.smoke.add('trk:data', !dup.length && total === 213 && !missing.length && CN_TRACKS.coreCount === 79, 'Этап 8: 79+134=213, все id существуют'); }catch(e){}
})();
