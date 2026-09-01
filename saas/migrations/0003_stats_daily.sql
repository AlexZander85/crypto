-- Миграция 0003 (§12.2/§13): свёртка телеметрии stats_daily для дашборда.
-- Пишется cron'ом 03:00 UTC; дашборд читает только свёртку (быстро даже на 30 днях).

CREATE TABLE IF NOT EXISTS stats_daily (
  day TEXT NOT NULL,                            -- 'YYYY-MM-DD' (UTC)
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (day, metric)
);
CREATE INDEX IF NOT EXISTS idx_stats_daily_metric ON stats_daily(metric, day);
