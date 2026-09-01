#!/usr/bin/env python3
"""E2E Стадия 4 (§19 сценарий 2): демо-гейтинг Стадии B.

Гость на ПРОДАКШН-сборке (без инлайн-контента):
  - JS-регистр: ни одного платного урока (Ф0+П1–П8 = demo only)
  - Cache Storage: только демо-паки
  - хаб «Моё обучение»: карточка «🔒 Полная программа» + кнопка → тарифы
  - тарифы: 4 карточки из /api/pay/prices
  - paid-пак без JWT → 401 (server-side, уже покрыт api-тестами)
"""
import json
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8787"

def wait_boot(page):
    page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60000)
    for _ in range(120):
        if page.evaluate("() => !document.getElementById('cn_boot_screen')"):
            break
        time.sleep(0.5)
    time.sleep(1)
    if page.evaluate("() => !!document.getElementById('cn_welcome_back')"):
        page.click("#cn_welcome_skip")
        time.sleep(0.5)
    return True

def main():
    results = []
    def check(name, cond, extra=""):
        results.append((name, bool(cond)))
        print(f"  {'PASS' if cond else 'FAIL'}  {name}{'  — ' + extra if extra else ''}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_context().new_page()
        wait_boot(pg)
        out = pg.evaluate("""async () => {
          const res = {};
          res.stageB = window.CN_BUILD.stageB;
          // --- аудит JS-регистра: платные id не должны существовать нигде ---
          const paidIds = ['p1_l1', 'p3_l1', 'm_chto_voobsche_takoe_veroyatnost', 'ps_l27', 'ps_l56', 'ft01', 'fai07'];
          res.paidInRegisters = {};
          for (const [k, v] of Object.entries(window.CN_CONTENT.data)) {
            if (Array.isArray(v)) {
              const ids = new Set(v.map(x => x && x.id).filter(Boolean));
              for (const pid of paidIds) if (ids.has(pid)) { (res.paidInRegisters[k] = res.paidInRegisters[k] || []).push(pid); }
            }
          }
          res.paidInRegisters = Object.keys(res.paidInRegisters).length ? res.paidInRegisters : null;
          // --- демо-состав (движок пушит П1–П8 в LESSONS: 20+8=28 после инициализации) ---
          res.lessons = (window.CN_CONTENT.data.LESSONS || []).length;
          res.lessonsAllDemo = (window.CN_CONTENT.data.LESSONS || []).every(l => l.phase === 0 || (l.id.startsWith('ps_') && parseInt(l.num.slice(1)) <= 8));
          res.psy = (window.CN_CONTENT.data.PSY_LESSONS || []).length;      // 8 (П1–П8)
          res.hasLiteracy = !!window.CN_CONTENT.data.CRYPTO_LITERACY_EXAM;
          res.psyIdsOk = (window.CN_CONTENT.data.PSY_LESSONS || []).every(l => ['П1','П2','П3','П4','П5','П6','П7','П8'].includes(l.num));
          // --- аудит кэша ---
          try {
            const c = await caches.open('cn-v1-packs');
            const keys = await c.keys();
            res.cachedPacks = keys.map(k => decodeURIComponent(k.url).match(/pack\\/ru\\/([a-z0-9_]+)/i)).filter(Boolean).map(m => m[1]);
          } catch (e) { res.cachedPacks = 'ERR:' + e.message; }
          // --- платные id в DOM ---
          res.domPaid = document.documentElement.innerHTML.includes('ps_l27') || document.documentElement.innerHTML.includes('ft01"');
          // --- Learn-first: открыть хаб ---
          window.LearnPlayer.openHome();
          await new Promise(r => setTimeout(r, 1500));
          res.lockCard = !!document.getElementById('cn_lock_card');
          return res;
        }""")
        time.sleep(1)

        print(json.dumps({k: out[k] for k in ['stageB', 'lessons', 'lessonsAllDemo', 'psy', 'hasLiteracy', 'psyIdsOk', 'cachedPacks', 'paidInRegisters', 'lockCard', 'domPaid']}, ensure_ascii=False, indent=1))
        check("сборка Стадии B (без инлайн-контента)", out["stageB"] is True)
        check("LESSONS содержит только Ф0+П1–П8", out["lessonsAllDemo"] is True, f"len={out['lessons']}")
        check("PSY_LESSONS = 8 (только П1–П8)", out["psy"] == 8, str(out["psy"]))
        check("диагностический экзамен в демо", out["hasLiteracy"] is True)
        check("П1–П8 без пропусков", out["psyIdsOk"] is True)
        check("кэш: только демо-паки", out["cachedPacks"] in (["core_demo", "books"], ["books", "core_demo"]), json.dumps(out["cachedPacks"]))
        check("JS-регистр: платных уроков нет", out["paidInRegisters"] is None, json.dumps(out["paidInRegisters"]))
        check("DOM: платных уроков нет", out["domPaid"] is False)

        # карточка замка в хабе
        check("карточка «🔒 Полная программа» в хабе", out["lockCard"] is True)
        if out["lockCard"]:
            pg.click("#cn_lock_open")
            time.sleep(1)
            check("кнопка замка открывает тарифы", pg.evaluate("() => !!document.getElementById('cn_tariffs_back')"))
            cards = pg.evaluate("() => document.querySelectorAll('#cn_tariffs_grid > div').length")
            check("4 карточки тарифов (Демо+3)", cards >= 4, str(cards))
            # кнопки оплаты рендерятся
            btns = pg.evaluate("() => document.querySelectorAll('[data-cn-pay]').length")
            check("кнопки оплаты рендерятся", btns >= 5, str(btns))
            pg.click("#cn_tariffs_x")

        browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{'ALL GATING CHECKS PASSED' if not failed else 'FAILURES: ' + str(len(failed))} ({len(results)} checks)")
    sys.exit(0 if not failed else 1)

if __name__ == "__main__":
    main()
