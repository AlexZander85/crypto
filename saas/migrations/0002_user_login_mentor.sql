-- Миграция 0002 (§7/§10/§13 промта v2.0):
--   users.last_login_at — время последнего входа (auth.js обновляет при magic-confirm/OAuth);
--   mentor_usage — дневные лимиты AI-наставника по тарифам (free 3 / lite 5 / pro 10 / max 100).
-- Существующие таблицы не трогаются (§7).

ALTER TABLE users ADD COLUMN last_login_at INTEGER;

CREATE TABLE IF NOT EXISTS mentor_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,                            -- 'YYYY-MM-DD' (UTC)
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS login_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  user_id TEXT,
  provider TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_events_ts ON login_events(ts);
