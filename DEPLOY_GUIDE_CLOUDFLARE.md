# ИНСТРУКЦИЯ: Деплой «КриптоНавигатор» на бесплатном Cloudflare
Для: владелец (+ агент-помощник). Версия: 24.08.2026 · База: PROJECT_SAAS_CLOUDFLARE.md
Правило безопасности: **секреты (ключи, пароли) вводишь ТОЛЬКО ты руками в дашборде. Агенту они не передаются** — он готовит код и команды, ты выполняешь шаги с ключами.

---

## 0. ЧТО ПОНАДОБИТСЯ
- Аккаунт github.com (есть) и аккаунт dash.cloudflare.com (регистрация бесплатна, карта не нужна);
- Для удобства: установленный Node.js LTS + в консоли `npm i -g wrangler` (CLI Cloudflare) и разовый вход `wrangler login`;
- Опционально сейчас, понадобится позже: свой домен (~10 $/год) и бесплатные аккаунты Resend (письма), Lemon Squeezy + ЮKassa (платежи).

## 1. МИНИМАЛЬНЫЙ ПУТЬ ЗА ВЕЧЕР (только статика, без базы)
Это этап «выложить демо и проходить самому». База и API добавляются позже (этапы 3+), ничего переделывать не придётся.

### Способ А — через GitHub (рекомендую: авто-деплой навсегда)
1. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**;
2. Выбери репозиторий `AlexZander85/crypto`, ветка `main`;
3. Настройка сборки: Build command — **пусто**, Output directory — **/** ;
4. Save and Deploy. Через минуту сайт живёт на адресе вида `crypto-xyz.pages.dev`;
5. Проверь: открой адрес → загрузился главный экран приложения; открой `index.html` напрямую тоже работает.

### Способ Б — прямой аплоад без Git
`npx wrangler pages deploy . --project-name=cryptonavigator` из папки проекта. Минус: обновлять руками. Используй А.

### Привычки этого этапа
- Каждый пуш в `main` = автоматическое обновление сайта; ветки агента дают preview-ссылки — смотри изменения ДО вливания;
- Прогресс учеников живёт в браузере на этом адресе — **не удаляй проект Pages** и не меняй адрес без необходимости;
- Замер скорости сразу: Lighthouse мобильный на главной (цель ≥90) — это твой базовый уровень до всех оптимизаций.

## 2. ДОМЕН И ЯЗЫКИ
1. Купи домен (любой регистратор) → dash.cloudflare.com → **Add a site** → введи домен → план Free → замени у регистратора серверы имён на выданные Cloudflare (2 шт.);
2. Workers & Pages → твой проект → **Custom domains → Set up** → привяжи `cryptonavigator.app` (и www);
3. HTTPS включится автоматически; редирект www→основной включается там же;
4. Соцпревью и ссылки в README после этого меняются на свой домен.

## 3. БАЗА ДАННЫХ D1 + ТАБЛИЦЫ
1. dash → **Storage & Databases → D1 → Create database** → имя `cn_db`, регион auto;
2. Скопируй `database_id` из карточки базы;
3. Схема: возьми SQL-блок из `PROJECT_SAAS_CLOUDFLARE.md` §5, сохрани как `migrations/0001_init.sql` в репо;
4. Примени: `npx wrangler d1 execute cn_db --remote --file=migrations/0001_init.sql`;
5. Привязка к приложению: в конфиге проекта (файл `wrangler.jsonc` или настройки Pages → Functions → Bindings) добавь `d1_databases: [{binding:"DB", database_name:"cn_db", database_id:"…"}]`. После этого в функциях доступно `env.DB`.

## 4. API НА PAGES FUNCTIONS (тот же деплой, тот же домен)
Вместо отдельного сервиса делаем **Pages Functions**: папка `functions/api/` в репо — каждый файл становится эндпоинтом.
```
functions/
  api/
    auth/magic-request.js      POST
    auth/oauth/google.js       GET   ← редирект на Google, возврат с кодом
    auth/register.js           POST
    me.js                      GET
    progress.js                GET/PUT
    content/manifest.js        GET
    live/[[path]].js           GET   ← прокси живых данных (стакан/новости/F&G)
    mentor/[[action]].js       POST  ← вызов Workers AI (тариф Макс)
    pay/yookassa/webhook.js    POST
    pay/lemonsqueezy/webhook.js POST
    feedback.js                POST
admin/                        ← страницы админки (за Access, см. §7)
```
Правило маршрутов: всё, что начинается с `/api/`, обслуживают Functions; статика приложения лежит рядом и не конфликтует.
Лимиты те же бесплатные: 100k запросов/день на проект.

## 5. СЕКРЕТЫ И ПЕРЕМЕННЫЕ (вводишь только ты)
dash → проект → Settings → **Variables and Secrets** → Add. Тип Secret для всего чувствительного:
| Имя | Значение | Откуда |
|---|---|---|
| JWT_SECRET | длинная случайная строка (сгенерируй `openssl rand -hex 32`) | твои руки |
| ADMIN_EMAIL | твой email для админки | твои руки |
| RESEND_API_KEY | ключ от Resend | Resend dashboard |
| GOOGLE_CLIENT_ID / SECRET | из Google Cloud Console (OAuth) | Google Console |
| GITHUB_CLIENT_ID / SECRET | из GitHub Developer settings (OAuth App) | GitHub |
| YOOKASSA_SHOP_ID / SECRET | из личного кабинета ЮKassa | ЮKassa |
| LS_SIGNING_KEY | из Lemon Squeezy | Lemon Squeezy |
Правило: агент в коде обращается к ним как `env.JWT_SECRET` и никогда не видит значений. Ротация любого секрета — здесь же, без правки кода.

## 6. OAUTH И ПЛАТЕЖИ — ТОЧНЫЕ АДРЕСА ОБРАТНЫХ ВЫЗОВОВ
- Google OAuth: Authorized redirect URI = `https://<твой-домен>/api/auth/oauth/google`;
- GitHub OAuth: Authorization callback URL = тот же путь с github;
- ЮKassa вебхук: `https://<домен>/api/pay/yookassa/webhook` (события payment.succeeded);
- Lemon Squeezy: Webhook endpoint = `/api/pay/lemonsqueezy/webhook`, подписка — включить signing secret;
- Resend: подтвердить домен (DNS-записи добавятся автоматически после привязки домена в §2).
Пока бэкенд не готов — эти шаги пропусти, вернёшься на этапе оплаты.

## 7. ЗАЩИТА АДМИНКИ (Cloudflare Access, бесплатно до 50 мест)
1. dash → **Zero Trust** (левое меню) → Access → Applications → Add application → Self-hosted;
2. Application domain: твой домен, path `/admin*`;
3. Policy: Include → Emails → твой email;
4. Save. Теперь `/admin*` требует одноразовый код на твою почту до открытия страницы.
Секреты админ-API: переменная ADMIN_SECRET из §5; функции проверяют её ИЛИ валидный Access-JWT.

## 8. КРОН (суточная свёртка статистики) 
В конфиге проекта:
```
"triggers": { "crons": ["0 2 * * *"] }
```
Функция-обработчик запускается ежедневно в 02:00 UTC и пишет свёртку за вчера в stats_daily. Настройка делается один раз вместе с внедрением телеметрии.

## 9. ЧТО ДЕЛАЕТ АГЕНТ, А ЧТО ТЫ (разделение ролей)
Агент: код функций, миграции SQL, скрипты, исправления по твоим багам, подготовка команд деплоя.
Ты: все действия с секретами и доступами (§5–§7), клики в дашбордах внешних сервисов, подтверждение платежей, финальное «задеплой».
Перед сдачей этапа агент обязан выдать: список новых переменных окружения (имена+назначение, БЕЗ значений), готовый SQL-файл миграции, чек-лист ручных шагов для тебя.

## 10. ЧЕК-ЛИСТ ПРИЁМКИ КАЖДОГО ДЕПЛОЯ
1. Сайт открывается, консоль браузера чистая;
2. Регистрация/вход проходит, письмо приходит (если подключено);
3. Прошёл урок → перезагрузил страницу → прогресс на месте; открыл с телефона → прогресс синкнулся;
4. Живой рынок (когда подключён): источники зелёные или честный «кэш от HH:MM»;
5. Оплата тестовая прошла → тариф сменился → вебхук не задвоился;
6. `/admin*` просит Access-код; чужой email не пускает;
7. Ошибок в воркер-логах нет (dash → Workers logs).

## 11. ТИПОВЫЕ ГРАБЛИ
- **Обновил контент, а у пользователей старое** — это immutable-кэш пакетов: новая версия = новое имя файла + новый manifest (так и задумано);
- **404 на /api/*** — Functions не задеплоились: папка functions должна быть в корне репозитория ветки main;
- **CORS-ошибки при локальной разработке** — тестируй через `wrangler pages dev .` (тот же домен), а не с file://;
- **Вебхук не приходит** — проверь точный путь и что секрет провайдера совпадает с env; логи функции покажут статус;
- **Случайно попали служебные файлы на сайт** — они не должны быть в git (см. .gitignore); Pages отдаёт только то, что в репозитории.

## 12. БЭКАПЫ
- Код = git (истина в репо);
- База раз в неделю: `npx wrangler d1 export cn_db --remote --output=backup-YYYY-MM-DD.sql` (хранить вне репо);
- Перед каждой миграцией схемы — обязательный экспорт.

---
Конец инструкции. Этапы выполняются по мере роста проекта: §1 можно сделать сегодня вечером; §3–§8 — когда дойдёт до соответствующих модулей проекта.

---

# ЧАСТЬ 2 (v2): Деплой SaaS v12.9 по PROMPT_SAAS_CLOUDFLARE_V2.md

Эта часть заменяет этапы 3+ части 1. Ветка `feat/saas-v12` (после приёмки влить в `main`).

## S1. Что уже готово в репо (сделал агент)
- контент-конвейер v2 (15 паков из index_v12.9.html, инвариант 213 уроков),
- сборка фронта v2 (шелл + app.js без контента + SaaS-слой),
- весь API воркера (auth/progress/content/pay/mentor/live/telemetry/admin),
- cron-свёртка, админка `/admin`, PWA, миграции D1 0001–0003,
- тесты: `npm test` (70 проверок) + Playwright-сценарии `saas/test/e2e_py/`.

## S2. Разовые действия в Cloudflare (твои руки)
```bash
cd saas && npm install
npx wrangler login            # браузер → разрешить
npx wrangler d1 create cn     # скопируй database_id
npx wrangler r2 bucket create cn-packs
npx wrangler kv namespace create KV   # скопируй id
```
Впиши `database_id` и KV `id` в `saas/wrangler.jsonc` (там же `account_id`), затем:
```bash
npx wrangler d1 migrations apply DB --remote
npm run build && npm run content:update -- --remote
npx wrangler deploy
```
Проверь: `https://cryptonavigator-api.<твой-аккаунт>.workers.dev` открывает курс; гость
видит только Ф0+П1–П8.

## S3. Секреты — ТОЛЬКО через wrangler secret put (или дашборд)
```bash
npx wrangler secret put JWT_SECRET              # длинная случайная строка
npx wrangler secret put ADMIN_SECRET            # для /admin/api/*
npx wrangler secret put RESEND_API_KEY          # письма magic-link (resend.com)
npx wrangler secret put TURNSTILE_SECRET        # капча (после добавления виджета)
npx wrangler secret put YOOKASSA_SHOP_ID        # прод-магазин ЮKassa
npx wrangler secret put YOOKASSA_SECRET
npx wrangler secret put YOOKASSA_WEBHOOK_SECRET
npx wrangler secret put LS_SIGNING_SECRET       # Lemon Squeezy
npx wrangler secret put CRYPTOMUS_API_KEY
npx wrangler secret put CRYPTOMUS_MERCHANT_ID
```
Не секреты (значения можно менять в дашборде Variables): `PRICES_JSON` (цены и кнопки
тарифов), `LS_TIER_MAP`/`YK_TIER_MAP` (маппинг продуктов → тарифы), `TIER_DOWNGRADE`
(даунгрейд после истечения «Макс»). `MENTOR_MOCK_MODEL` на проде НЕ выставлять.

## S4. Вебхуки провайдеров
- Lemon Squeezy: `https://<домен>/api/pay/lemonsqueezy/webhook` (подпись X-Signature);
- ЮKassa: `https://<домен>/api/pay/yookassa/webhook` (+ заголовок `x-webhook-secret`);
- Cryptomus: `https://<домен>/api/pay/crypto/webhook`.
Продукты/варианты LS привяжи к тарифам в `LS_TIER_MAP`; чекаут-ссылки — в
`PRICES_JSON[t].pay.lemonsqueezy`.

## S5. Домен, Access, ротация
- Домен: dash → Workers → твой воркер → Custom Domains → `cryptonavigator.app`.
- Cloudflare Access: Zero Trust → Access → Applications → защитить `/admin*`
  (email-политика «Only you») — второй слой поверх ADMIN_SECRET.
- Ротация JWT_SECRET раз в квартал: `npx wrangler secret put JWT_SECRET` —
  все сессии инвалидируются, пользователи просто перелогинятся.

## S6. Обновление контента (ежедневный цикл)
Правишь `index_v13.html` локально → кладёшь в корень репо →
```bash
cd saas && npm run content:update -- --src index_v13.html
```
Передеплой НЕ нужен. Если инварианты (213 уроков / 301 термин / бюджеты) нарушены —
сборка упадёт с внятной ошибкой; чини источник, не «чинь» данные.

## S7. Проверки после деплоя
1. `curl https://<домен>/api/health` → `{"ok":true}`.
2. Гость: видит Ф0+П1–П8; «🌍 Живой рынок» — витрина FNG+комиссии; платный пак → 401.
3. Секретный вход: письмо приходит, прогресс синхронизируется между двумя браузерами.
4. Тестовый платёж каждого провайдера (sandbox) меняет тариф; повторный вебхук не дублирует.
5. Наставник: реальный AI-ответ на тарифах (лимиты 3/5/10/100 в день).
6. `/admin` — под Access + секретом: обзор, AI-расход, пользователи, контент, действия.
7. PWA: на телефоне «Установить приложение» → офлайн-старт с иконки.
8. gitleaks по диффу чист; `npm test` зелёный.
