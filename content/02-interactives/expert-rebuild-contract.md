# ТЗ-2 · Контракт кода эксперта для перекодирования виджетов (выписка для сборки)

> **Полный текст ТЗ** — `V15.1-EXPERT-TZ-INTERACTIVES-REBUILD.md` (корень репо): 48 позиций W-01…W-48, 4 тира, партии P1–P4, критерии приёмки. Этот файл — рабочая выписка для сборщика: контракт интеграции + реестр замен.
> **Суть направления:** эксперт сам кодит замены существующим виджетам (в отличие от спек, по которым кодит агент). Судьба каждого старого виджета: заменён кодом эксперта / оставлен / удалён при сборке E4–E5.

## 1. Контракт интеграции (что приходит от эксперта)

- Поставка: markdown-файл с блоками ```js; блок = самодостаточная функция-рендер:
  `window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {}; window.EXPERT_WIDGETS['<id виджета>'] = function(box){ … };`
- Ограничения: vanilla JS (ES2017), без библиотек/CDN/`fetch`/`import`/`alert`; Canvas 2D, SVG, CSS-анимации, `requestAnimationFrame` — можно; все DOM-id с префиксом виджета, поиск только внутри `box`; состояние — в замыкании; инлайновый `onclick=` — запрещён (только addEventListener/делегирование).
- Чистота повторного рендера: таймеры в `box._expTimers` (очистка в начале функции), rAF в `box._expRaf`.
- Детерминизм учебных сценариев: seeded RNG `mulberry32(seed)` (код в ТЗ §2.3); «новый раунд» = новый seed.
- Тема: тёмная палитра приложения — `--bg #0d1022`, панель `#040714`, `--txt #eef1ff`, `--mut #9aa3c7`, `--acc2 #06b6d4`, `--ok #22c55e`, `--err/--bad #ef4444`, `--warn #eab308`, `--mono` для цифр/кода. Адаптив от 360px.
- Числа — канон курса (ТЗ-1 §0 / ТЗ-2 §1): $1000 · 0,10%/0,02% · 2 б.п. · фандинг 0,03%/8 ч · риск 1% · 55% / R 1.3 · ED 10/25 · 8 недель ≥50 сделок · −33%→+50% · ln(n)/−ln(q) · 72/ставка · 20% на площадку · 40/40/20 (обе).

## 2. Хук диспатчера (наша сторона — задача T-4.7)

Во всех точках рендера виджетов (renderPhase0Widget, движок MATH_WIDGETS, психо-рендер, renderCStreamWidget, CN_W2-attach, v4) перед штатным рендером:

```js
if(window.EXPERT_WIDGETS && typeof window.EXPERT_WIDGETS[id] === 'function'){
  window.EXPERT_WIDGETS[id](box); return true; // штатный рендер не вызывается
}
```

Откат одного виджета: `delete window.EXPERT_WIDGETS[id]` (или заглушка `= null`). Старый код не удаляется до подтверждения метриками.

## 3. Реестр замен (48 позиций, кратко; полные карточки — в ТЗ-2)

| Пакет | Тир | id виджетов (ключи EXPERT_WIDGETS) |
|---|---|---|
| P1 | Матфак 13 | `widget_m_chto_voobsche_takoe_veroyatnost`, `widget_m_zakon_bolshih_chisel`, `widget_m_matematicheskoe_ozhidanie`, `widget_m_razbros_rezultatov`, `widget_m_asimmetriya_i_hvosty_zachem`, `widget_m_cpt_centralnaya_predelnaya_teorema`, `widget_m_doveritelnyy_interval_bez_strashnoy`, `widget_m_p_value_chto_eto`, `widget_m_korrelyaciya_dva_ryada_dvizhutsya`, `widget_m_regressiya_k_srednemu`, `widget_m_kelly_criterion`, `widget_m_mediana_i_kvantili`, `widget_m_pereobuchenie_na_palcah` |
| P2 | Психология П1–П14, 14 | `widget_ps_l1_night_alerts` … `widget_ps_l14_tilt_web` (полный список — ТЗ-2 §4, W-14…W-27) |
| P3 | Фаза 0, 13+5 | `widget_p0_l1`, `widget_p0_l2`, `widget_p0_l4`, `widget_p0_l5`, `widget_p0_l8`, `widget_p0_l10`, `widget_p0_l11`, `widget_p0_l13`, `widget_p0_l14`, `widget_p0_l16`, `widget_p0_l18`, `widget_p0_l19`(+`_dd`/`_steps`), `widget_p0_l20_phish` + доп: `widget_g01_blockrace`, `widget_g02_mm_minute`, `widget_v4_seed`, `widget_v4_regime`, `widget_v4_riskmgr` |
| P4 | Рынки предсказаний 3 | `widget_p610_clob`, `widget_p617_uma`, `widget_g17_asic` |

## 4. Резерв (судьба решается сборкой — НЕ ждать кода эксперта)

`ps_l43/44/46/47/49/53–56` · `p6_l5_theta`, `p6_l11_steps`, `g21_polyarb` · `ft14_backtest_reader` · `vc1/vc2/vc3` · p1-остатки (`p1_l2_qq`, `p1_l6_bridge`, `p1_l9_anim`…) · CAPSTREAM c2–c7 (уже canvas — апгрейд отдельным решением) · `art_memecoin_3click` · 32 m-виджета сверх Тира 1.

## 5. Приёмка каждого блока (автоматизируется, задача T-4.7)

1. `node --check` на извлечённый блок;
2. рендер в изоляции (харнесс ТЗ-2 §2.4 приложить к `tools/`);
3. двойной рендер — без дублей и ускорения анимаций;
4. ширина 360px — без горизонтального скролла;
5. скан на `alert(`, `fetch(`, `onclick=`, `document.getElementById` вне `box`;
6. сверка чисел с каноном;
7. замена — по одному виджету на коммит, контроль метрик завершения урока, откат при падении.
