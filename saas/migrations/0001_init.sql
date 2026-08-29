-- Миграция 0001: схема §5 + телеметрия §20 + auth-токены
-- users.access_tier: 'free' | 'lite' | 'pro' | 'max'

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  provider TEXT NOT NULL,                       -- 'email' | 'google' | 'github'
  created_at INTEGER NOT NULL,
  access_tier TEXT NOT NULL DEFAULT 'free',
  locale TEXT NOT NULL DEFAULT 'ru',
  access_expires_at INTEGER,                    -- для подписки «Макс»; NULL = навсегда
  access_changed_at INTEGER
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,                       -- 'lemonsqueezy' | 'yookassa' | 'crypto'
  external_id TEXT UNIQUE,                      -- идемпотентность вебхука
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,                         -- 'pending' | 'paid' | 'refunded'
  tier TEXT,                                    -- какой тариф куплен
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  state TEXT NOT NULL,                          -- объект cn_* целиком (JSON)
  app_version TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  lesson_id TEXT,
  score INTEGER,
  comment TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  provider TEXT NOT NULL,
  external_id TEXT UNIQUE,
  status TEXT NOT NULL,                         -- 'active' | 'past_due' | 'canceled'
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  current_period_end INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  canceled_at INTEGER
);

-- Телеметрия §20.2
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT,
  meta TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events(type, ts);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);

-- Действия админа §20.4.5
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_user TEXT,
  detail TEXT
);

-- Настройки (например активная модель ИИ §20.8)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Одноразовые токены magic-link (альтернатива KV — D1 надёжнее для аудита)
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,                       -- хэш токена, не сырой
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email);
