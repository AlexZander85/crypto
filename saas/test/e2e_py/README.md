# E2E-приёмка SaaS (Playwright, Python)

Сценарии §19 промта PROMPT_SAAS_CLOUDFLARE_V2.md. Запуск из `saas/`:

```bash
npx wrangler dev --port 8787 &      # терминал 1
python3 -m pip install playwright && playwright install chromium
python3 test/e2e_py/e2e_stage_a.py         # §19.8 эквивалентность Стадии A (нужна сборка npm run build:stage-a)
python3 test/e2e_py/e2e_stage3_sync.py     # §19.1 двойное устройство (синк P1–P4)
python3 test/e2e_py/e2e_stage4_gating.py   # §19.2 демо-гейтинг Стадии B
python3 test/e2e_py/e2e_stage5_purchase.py # §19.3 покупка → tier → докачка паков
```

Каждый скрипт печатает PASS/FAIL по чекам и выходит с кодом 0/1 (для CI).
