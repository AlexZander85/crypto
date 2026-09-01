# КриптоНавигатор SaaS — платный онлайн-сервис на бесплатном стеке Cloudflare

Стадии 0–10 по `PROMPT_SAAS_CLOUDFLARE_V2.md` выполнены. Базис — `index_v12.9.html`
(213 уроков, режим «🎓 Обучение» Learn Player, адаптивная система, AI-наставник).

```
Пользователь → https://<воркер>.workers.dev (один origin — ноль CORS)
Cloudflare Worker «cryptonavigator-api»
 ├─ ститика (assets → saas/public): шелл index.html, app.js (движок без контента),
 │   saas-front.js (SaaS-слой), manifest.json, service-worker.js, admin.html
 ├─ /api/*      auth · progress · content · pay · mentor · live · telemetry · feedback
 ├─ /admin/*    полный админ-API (ADMIN_SECRET + Cloudflare Access) + admin.html
 └─ cron 03:00  свёртка stats_daily + чистка events > 180 дней
D1 (users/purchases/progress/subscriptions/mentor_usage/stats_daily/…) · KV (манифест, rate-limit)
R2 (контент-паки, приватно) · Workers AI (наставник) · Vectorize (опционально)
```

### AI-наставник — модели (Стадия 11, каталог 09.2026)
Только современные SKU Workers AI, дефолт `@cf/zai-org/glm-5.3-flash`: GLM 5.3 Flash,
GLM 4.7 Flash, DeepSeek V4 Flash (ретрай), Qwen 3.8 27B, Gemma 4 26B A4B.
Белый список — `MODEL_WHITELIST` в `src/mentor.js`; выбор пользователя (⚙️ панель наставника)
едет в `body.model` и валидируется сервером; смена активной модели — через `POST /admin/api/ai_model`
без передеплоя. Подробности — `DEPLOY_GUIDE_CLOUDFLARE.md` §S3.1.

## Быстрый старт (локально)

```bash
cd saas
npm install
npm run build           # сборка Стадии B: шелл + app.js (контент только из паков)
npm run migrate:local   # миграции D1 (0001–0003)
npm run packs:upload    # паки → локальный R2 + манифест → KV
npm run dev             # http://localhost:8787  (конфиг без AI-биндинга)
npm run dev:ai          # то же с реальным Workers AI (нужен wrangler login)
npm test                # 70 API-проверок на локальных D1/KV/R2
```

## Команды

| Команда | Что делает |
|---|---|
| `npm run build` | сборка фронта v2 из `../index_v12.9.html` (Стадия B, бюджеты §5.4) |
| `npm run build:stage-a` | сборка с инлайн-фолбэком контента (приёмка эквивалентности) |
| `npm run extract` | контент v12.9 → паки `content/ru/` + `content/manifest.json` |
| `npm run content:update -- --src index_v13.html` | extract + upload в R2/KV **без передеплоя** (§4.4) |
| `npm run deploy` | деплой воркера (после `npm run build`) |

## Приёмка (чек-лист §20)

- **API-тесты**: `npm test` → 70/70 (auth, progress+stale, гейтинг паков 401/403,
  водяной знак, вебхуки LS/ЮKassa/Cryptomus с подписями и идемпотентностью,
  mentor-лимиты 402 + feynman-вердикт + серверный фильтр, live-гейтинг,
  RAG provenance, полный админ-API, GDPR-удаление, cron-свёртка).
- **Playwright e2e** (`test/e2e_py/README.md`): эквивалентность Стадии A локальному
  v12.9 · двойное устройство (синк P1–P4) · демо-гейтинг Стадии B · покупка →
  tier → докачка платных паков · PWA и офлайн-старт.
- **gitleaks**: чисто (ложные срабатывания на именах localStorage-ключей задокументированы
  в `.gitleaksignore`); при пересборке проверять дифф: `/tmp/gitleaks detect --log-opts="master..HEAD"`.
- **Бюджеты §5.4** проверяются в сборке: шелл 37.5 КБ brotli (≤40), app.js 0.67 МБ (≤1.1),
  паки ≤150 КБ (макс core_p8 80.3), демо-набор ~52 КБ (≤250).

## Структура

```
saas/
  src/            воркер: index.js (роутер+cron), auth, progress, content, payments,
                  payments-crypto, mentor, rag, live, telemetry, admin, admin-ai, cron
  layer/          saas-front.js — SaaS-слой (auth-UI, синк по политикам §8.2,
                  Learn-first, замки, тарифы, ожидание оплаты, телеметрия)
  tools/          extract-content v2, build-app v2, lib-structures, upload-packs,
                  peek-structures, gen-icons
  content/ru/     15 паков + manifest.json (версия ru.<hash>, карта регистров)
  migrations/     0001 (схема) · 0002 (last_login_at, mentor_usage) · 0003 (stats_daily)
  public/         шелл, app.js, saas-front.js, manifest, service-worker, admin.html, иконки
  test/           api.test.mjs (70) · e2e_py/ (5 Playwright-сценариев §19)
  wrangler.jsonc       деплой-конфиг (с AI-биндингом и cron)
  wrangler.test.jsonc  локальный/тестовый конфиг (без AI — не требует токена)
```

## Ключевые факты реализации

- **Движок мутирует контентные массивы** (`LESSONS.push.apply(LESSONS, MATH…)`) — поэтому
  регистры собираются из паков ДО выполнения app.js; в Стадии A регистры целиком из
  инлайн-фолбэка (частичная сборка затеняет фолбэк).
- **DOMContentLoaded переотправляется** бут-загрузчиком — 4 подписчика v12.9 без
  readyState-проверки срабатывают при динамической вставке движка.
- **Синк прогресса**: после слияния немедленный `location.reload()` — движок держит
  прогресс в памяти и `save()` перетёр бы слитые ключи.
- **Контент обновляется без передеплоя** (`npm run content:update`): клиенты видят новую
  версию манифеста и докачивают только изменившиеся паки (хэш-версионированный кэш).
- **Гость без сети**: демо-паки в SW-кэше; в Стадии A (до продаж) движок работает и
  вообще без паков — байт-эквивалент локального v12.9.
