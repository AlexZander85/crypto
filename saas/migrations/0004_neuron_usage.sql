-- Миграция 0004: учёт нейронов Workers AI — дашборд «Нейроны» в админке.
-- Ловим usage (токены) из каждого ответа модели, считаем нейроны по тарифам владельца
-- (нейроны за 1M токенов: in / cached / out), агрегируем по дню (UTC) и модели.
-- Лимит Workers Free — 10 000 нейронов/день (env.NEURON_DAILY_LIMIT, можно менять без передеплоя).

CREATE TABLE IF NOT EXISTS neuron_usage (
  day TEXT NOT NULL,                            -- 'YYYY-MM-DD' (UTC)
  model TEXT NOT NULL,                          -- SKU из белого списка (cf-glm-5.3-flash, …)
  requests INTEGER NOT NULL DEFAULT 0,          -- вызовов модели за день
  in_tokens INTEGER NOT NULL DEFAULT 0,         -- суммарные input-токены
  cached_tokens INTEGER NOT NULL DEFAULT 0,     -- суммарные cached input-токены
  out_tokens INTEGER NOT NULL DEFAULT 0,        -- суммарные output-токены
  neurons INTEGER NOT NULL DEFAULT 0,           -- суммарные нейроны (округление до целого при апсейте)
  PRIMARY KEY (day, model)
);
CREATE INDEX IF NOT EXISTS idx_neuron_usage_day ON neuron_usage(day);
