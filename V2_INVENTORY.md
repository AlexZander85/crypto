# Инвентарь v2 (эталон для регрессии v3)

Снят: ветка v3-upgrade, база = main @ 769f716. Рантайм-снимок (puppeteer) + статический подсчёт игр.

## Счётчики (ПОСЛЕ каждого потока v3 все значения должны быть ≥ этих)

| Метрика | v2 |
|---|---|
| Строк index.html | 30281 |
| Уроки (LESSONS.length) | 121 |
| Термины (TERMS.length) | 205 |
| Симуляторы (id^=sim_) | 34 |
| Игры (widget_g*) | 18 |
| Боссы | 8 (id 0–7, уникальные) |
| Уроки с квизом | 85 |
| Вопросы квизов уроков | 85 |
| Numeric-вопросы | 0 |
| MicroRecall-блоки | 0 |
| Image-блоки | 6 |
| interactive_inline виджеты | 58 |
| Ошибки страницы | 0 |

## Маркерные grep-проверки v2 (должны присутствовать после каждого потока)

NSDR · «Смешанная» (интерливинг) · feynman · shuffledOptions · вайбкодинг · «Найм в фонд» · Brier · Наставник · interactive_inline · showConsolidationScreen · startInterleavingSession · Детектив · speedrun · «Учебная модель»

## Дельта-маркеры v3 (подтверждено отсутствие/частичность в v2)

- numeric-вопросы: 0 · microRecall: 0 · cn_mistakes: нет · whale_sonar: нет
- Freqtrade/Hummingbot: урок p4_l8 есть, но без VectorBT-матрицы и практики с AI-агентом
- Hyperliquid: урок p4_l9 есть, но без Agent Wallets / On-chain Vaults / связки 40/40/20
- «Костёр» как слово отсутствует — NSDR-консолидация реализована как showConsolidationScreen (стрик, таймеры 5/10)

## Полные списки id

- Уроки (121): p0_l1, p0_l2, p0_l3, p0_l4, p0_l5, p0_l6, p0_l7, p0_l8, p0_l9, p0_l10, p0_l11, p0_l12, p0_l13, p0_l14, p0_l15, p0_l16, p0_l17, p0_l18, p0_l19, p0_l20, p1_l1, p1_l2, p1_l3, p1_l4, p1_l5, p1_l6, p1_l7, p1_l8, p1_l9, p1_l10, p1_l11, p1_l12, p2_l1, p2_l2, p2_l3, p2_l4, p2_l5, p2_l6, p3_l1, p3_l2, p3_l3, p3_l4, p3_l5, p3_l6, p4_l1, p4_l2, p4_l3, p4_l4, p4_l5, p4_l6, p4_l7, p4_l8, p4_l9, p5_l1, p5_l2, p5_l3, p5_l4, p5_l5, p5_l6, p5_l7, p6_l1, p6_l2, p6_l3, p6_l4, p6_l5, p6_l6, p6_l17, p6_l7, p6_l8, p6_l9, p6_l10, p6_l11, p6_l13, m_chto_voobsche_takoe_veroyatnost, m_veroyatnost_ne_predskazyvaet_konkretnyy, m_nezavisimye_sobytiya_i_oshibka, m_chto_takoe_uslovnaya_veroyatnost, m_chto_takoe_srednee, m_matematicheskoe_ozhidanie, m_kak_mozhno_vyigryvat_chasche, m_razbros_rezultatov, m_standartnoe_otklonenie_bez_strashnoy, m_zakon_bolshih_chisel, m_reshenie_eto_ne_prognoz, m_risk_i_razmer_stavki, m_ty_torguesh_ne_s, m_u_kazhdogo_uchastnika_svoi, m_chto_proizoydet_esli_vse, m_igra_s_koordinaciey, m_igra_s_nulevoy_summoy, m_informaciya_tozhe_imeet_cennost, m_pochemu_prostoe_preimuschestvo_ischezaet, m_dilemma_chto_vygodno_odnomu, m_rynok_kak_igra_s, m_finalnyy_integracionnyy_urok, m_generalnaya_sovokupnost_i_vyborka, m_parametr_i_ocenka, m_pochemu_srednee_mozhet_obmanyvat, m_mediana_i_kvantili, m_vybrosy_oshibka_ili_realnost, m_raspredelenie_rezultatov, m_asimmetriya_i_hvosty_zachem, m_standartnaya_oshibka_pochemu_ocenki, m_doveritelnyy_interval_bez_strashnoy, m_gipoteza_kazhetsya_zdes_est, m_nulevaya_gipoteza_i_alternativnaya, m_p_value_chto_eto, m_uroven_znachimosti_i_oshibka, m_mnozhestvennye_proverki_esli_dolgo, m_korrelyaciya_dva_ryada_dvizhutsya, m_prichina_i_sovpadenie, m_regressiya_na_palcah, m_oshibka_prognoza_i_ostatki, m_pereobuchenie_na_palcah, m_obuchayuschaya_i_testovaya_vyborka, m_sluchaynost_i_doverie_k, m_finalnaya_karta_matematicheskoy_statisti, vc_l1, vc_l2, vc_l3, vc_l4
- Симуляторы (34): sim_115fz, sim_alphabeta, sim_arbitrage, sim_boss, sim_calendar, sim_candle, sim_candle_widget_container, sim_chaos, sim_eoa, sim_execdev, sim_firsttrade, sim_fund, sim_kelly, sim_killswitch, sim_liq, sim_lookahead, sim_meme, sim_ob, sim_overfit, sim_phase_chips, sim_portfolio, sim_position_sizer, sim_predarb, sim_psychology, sim_recovery, sim_restaking, sim_risk_reward, sim_ruble2btc, sim_scaling, sim_sentiment, sim_stationarity, sim_tax, sim_walkforward, sim_whale
- Игры (18): g01_blockrace, g02_mm_minute, g03_liqcorridor, g05_fattails, g06_leakdiff, g10_kellyfan, g11_cointribbon, g12_corrstorm, g13_inframap, g14_fifoqueue, g15_vault, g17_asic, g18_staking, g19_il, g20_payoff, g21_polyarb, g22_airdrop, g23_rwa
- Боссы: 0, 1, 2, 3, 4, 5, 6, 7
