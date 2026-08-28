# КриптоНавигатор SaaS — API на Cloudflare Workers

Вертикальный срез по `PROJECT_SAAS_CLOUDFLARE.md` (этапы 1–2 + каркас 4 + телеметрия §20):
auth без паролей (magic-link + OAuth), облачный прогресс, контент-гейтинг, вебхуки платежей, телеметрия.

## Фронтенд-интеграция (§12.1/12.3/§8)

Продукт-файл не трогается. Сборка: `node tools/build-app.mjs` берёт `../index.html` (или `index_v9.html`,
`--src <файл>`), добавляет один тег `<script src="/integration.js">` → `public/index.html`.
Тот же воркер отдаёт статику (wrangler assets) и API — один origin, ноль CORS.

`public/integration.js` (аддитивный слой, всё в try/catch — офлайн-режим не ломается):
- **Вход без пароля**: плавающая панель «☁ Вход» → модалка magic-link; в dev ссылка подтверждается
  fetch'ем на месте; в проде письмо открывает HTML-страницу автолога (токен → localStorage, возврат в курс).
- **Слияние прогресса (§8)**: при входе серверный state объединяется с локальным — union ключей cn_*,
  локальный приоритет на конфликте. Ничего не затирается.
- **Авто-синк**: перехват `localStorage.setItem` для cn_* → debounce 5с; flush при скрытии вкладки.
- **Content-loader (MVP)**: манифест + версия в localStorage (`cn_content_version`), паки в Cache Storage
  (`cn-content-v1`). Живая подмена массивов движка — следующий шаг (нужны хуки в движке).

E2E-сценарий §12.6: `node test/e2e.mjs` — два устройства: локальный прогресс до регистрации → вход →
слился в облако → второе устройство вошло → тот же прогресс на месте. 8/8.

## Обновление контента (ты редактируешь index.html → SaaS актуализируется)

Весь цикл — одна команда из `saas/`:

```bash
npm run content:update
```

Что происходит:
1. `extract-content.mjs` читает источник (`../index.html`; если его нет — `../index_v9.html`; можно `--src <файл>`),
   вырезает LESSONS/MATH/PSY/TERMS/TESTS/earning, проверяет целостность
   (134 урока с квизами, 205 терминов, П1–П8) и brotli-бюджет каждого пака (≤150KB, §21.1);
2. считает SHA-256 хэш каждого пака → точечный дифф с прошлым запуском
   (пишутся и грузятся только изменившиеся паки; в отчёте видно: `изменён / без изменений / новый`);
3. версия манифеста = хэш всех паков (`ru.82c6e594`) — меняется только при реальном изменении контента;
4. `upload-packs.mjs` грузит паки в R2 и манифест в KV (`manifest:ru`).

**Передеплой воркера не нужен**: API отдаёт манифест из KV, клиенты видят новую версию
и перезапрашивают только изменённые паки (у каждого свой hash-версионный ключ для кэша).
Если KV пуст/бит — воркер падает на статический импорт `content/manifest.json` (идёт в бандле).

Локальная проверка без загрузки: `npm run extract` — покажет дифф и версию.

## Контент-паки (реальные, §3/§12.2)

`npm run extract` → `npm run packs:upload` — вырезает контент из `index_v9.html` в паки и грузит в R2:

| Пак | Доступ | Содержимое | Brotli |
|---|---|---|---|
| `core_demo` | всем | Фаза 0 (20 уроков) + Психология П1–П40 (60 уроков) | 78.7KB |
| `core_p0…p8` | paid | 166 уроков по фазам (бюджет §21.1 ≤150KB brotli — макс 58.0KB) | 12–58.0KB |
| `terms` | paid | глоссарий, 205 терминов | 24.2KB |
| `tests` | paid | 7 фазовых аттестаций (включая 120 ситуаций Психологии) + 2 мат-теста | 21.5KB |
| `earning` | paid | 20 способов заработка | 10.4KB |

166 уроков = LESSONS(76) + MATH(44) + PSY(40) + Вайбкодинг(4) + БОН(2) — сходится с фактом продукта.
Скрипт проверяет целостность (205 терминов, П1–П40, квизы у всех 166 уроков) и brotli-бюджет каждого пака — сборка падает при нарушении.

## Структура

```
saas/
  wrangler.jsonc        ← D1 + KV + R2 биндинги; dev-секреты ТОЛЬКО для локалки
  migrations/0001_init.sql  ← схема §5 + events/admin_actions/settings/auth_tokens (§20)
  src/
    index.js            ← роутер (§6 API)
    util.js             ← json/cors, JWT HS256 (WebCrypto), rate-limit (KV)
    auth.js             ← magic-request/confirm, OAuth google/github, Turnstile-хук, /api/me
    progress.js         ← GET/PUT, last-write-wins по updated_at
    content.js          ← манифест по тарифу, выдача паков, водяной знак wm, rate-limit 30/час
    payments.js         ← LemonSqueezy (HMAC X-Signature) + ЮKassa (общий секрет), идемпотентно по external_id
    payments-crypto.js  ← крипто-оплата (Cryptomus): инвойс + вебхук, MD5(base64+key), чистая JS-реализация MD5
    telemetry.js        ← track() через ctx.waitUntil (§20.2)
    admin.js            ← overview + grant_tier (Bearer ADMIN_SECRET; на проде + Cloudflare Access)
  tools/
    extract-content.mjs ← вырезание контента из index_v9.html в паки (+ brotli-бюджет, §12.2)
    upload-packs.mjs    ← загрузка паков в R2 (--local / --remote)
    peek-structures.mjs ← разведка структур данных приложения
  content/ru/*.json     ← 13 реальных паков (источник истины после extract)
  test/api.test.mjs     ← 33 приёмочных проверки против wrangler dev
  public/_headers       ← заголовки безопасности §22.3 (для Pages)
```

## Оплата криптой (Cryptomus, §4.4)

- `POST /api/pay/crypto/invoice` (JWT) `{tier}` → инвойс в Cryptomus, pending-покупка в БД, `{url, uuid}`.
- `POST /api/pay/crypto/webhook` — проверка `sign = MD5(base64(body без sign) + PAYMENT_API_KEY)`;
  `paid|paid_over` → tier из нашей pending-записи (не доверяем эху провайдера), идемпотентно;
  `cancel|fail|system_fail` → покупка помечается failed. Возвраты — вручную в дашборде Cryptomus (нет API).
- Ключи: `CRYPTOMUS_MERCHANT_ID`, `CRYPTOMUS_API_KEY`; цены — `CRYPTO_PRICE_JSON`.
- Без ключей: инвойс честно `501 not_configured`. BTCPay Server добавляется как второй адаптер позже.

## Запуск и проверка

```bash
cd saas
npm install
npm run migrate:local     # применить схему к локальной D1
npm test                  # поднимает wrangler dev и гоняет 27 проверок (ALL CHECKS PASSED)
npm run dev               # ручной режим: http://localhost:8787/api/health
```

Dev-режим без почтового ключа честен: `POST /api/auth/magic-request` возвращает `dev_link`
в ответе (только `ENV=dev`). Никогда не имитирует отправку письма.

## Деплой (когда появится аккаунт Cloudflare)

1. `npx wrangler login`
2. Создать ресурсы: `wrangler d1 create cn`, `wrangler kv namespace create KV`, `wrangler r2 bucket create cn-packs`
   — вписать реальные id в `wrangler.jsonc`.
3. Секреты: `npx wrangler secret put JWT_SECRET` (и по необходимости RESEND_API_KEY,
   LS_SIGNING_SECRET, YOOKASSA_WEBHOOK_SECRET, TURNSTILE_SECRET, ADMIN_SECRET, OAUTH_*_ID/SECRET).
4. `npm run migrate:remote` → `npm run deploy`.
5. Маршрут `cryptonavigator.app/api/*` → этот воркер (дашборд домена → Workers Routes).

## Что осознанно НЕ сделано (следующие шаги)

- `extract-content.mjs` (§12.2): вырезание LESSONS/TERMS/TESTS из index.html в паки + загрузка в R2.
- OAuth-ключи Google/GitHub: флоу реализован, без ключей честно отвечает `501 oauth_not_configured`.
- Turnstile/Resend: включаются ключами, без них — dev-режим.
- ЮKassa: на проде добавить IP-allowlist поверх общего секрета (§22.3).
- Админ-экраны (§20.4), cron-свёртка, live-рынок (§18), PWA (§24), онбординг (§25), SEO-страницы (§23.4).
