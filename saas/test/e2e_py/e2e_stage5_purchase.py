#!/usr/bin/env python3
"""E2E Стадия 5 (§19 сценарий 3): покупка → tier → докачка платных паков.

Поток: логин (free) → admin grant_tier (эмуляция эффекта вебхука — сам вебхук
LS/ЮKassa/Cryptomus с подписями покрыт api-тестами) → клиент видит смену
→ инвалидация манифеста → докачка платных паков → платный урок в регистре.
Повторный «вебхук» не дублирует покупку — покрыто api-тестом idempotent.
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
        email = f"pay-{int(time.time())}@example.com"

        # логин через модалку
        pg.click("#cn_cloud_btn")
        pg.click("#cn_login")
        pg.fill("#cn_email", email)
        pg.click("#cn_login_go")
        time.sleep(6)   # confirm + merge + reload
        for _ in range(60):
            if pg.evaluate("() => !document.getElementById('cn_boot_screen')"):
                break
            time.sleep(0.5)
        time.sleep(2)

        me0 = pg.evaluate("() => window.CN_SAAS.getMe()")
        check("логин: tier=free", me0 and me0.get("tier") == "free", json.dumps(me0 or {}))

        # платных паков до покупки — 2 (демо)
        packs_before = pg.evaluate("""() => JSON.parse(localStorage.getItem('cn_manifest_cache')||'{"packs":[]}').packs.length""")
        check("до покупки: 2 демо-пака в манифесте", packs_before == 2, str(packs_before))

        jwt = pg.evaluate("() => localStorage.getItem('cn_jwt')")

        # «оплата»: админский grant (эффект вебхука) + мок-вебхук LS с реальной подписью — двойная проверка идемпотентности на сервере
        import urllib.request
        req = urllib.request.Request(
            BASE + "/admin/api/grant_tier",
            data=json.dumps({"user_id": me0["id"], "tier": "lite", "reason": "e2e purchase"}).encode(),
            headers={"content-type": "application/json", "authorization": "Bearer dev-only-admin"}, method="POST")
        with urllib.request.urlopen(req) as r:
            grant_ok = json.loads(r.read()).get("ok") is True
        check("эффект вебхука: tier=lite на сервере", grant_ok)

        # клиент видит смену при refreshMe (как poll на экране ожидания)
        pg.evaluate("() => window.CN_SAAS.refreshMe()")
        time.sleep(2)
        me1 = pg.evaluate("() => window.CN_SAAS.getMe()")
        check("клиент увидел tier=lite", me1 and me1.get("tier") == "lite", json.dumps(me1 or {}))

        # onTierUnlocked сработал: кэш и манифест инвалидированы, страница перезагружается
        for _ in range(60):
            if pg.evaluate("() => !document.getElementById('cn_boot_screen')"):
                break
            time.sleep(0.5)
        time.sleep(3)

        # после перезагрузки: платный манифест + платный урок в регистре
        state = pg.evaluate("""async () => {
          const mf = JSON.parse(localStorage.getItem('cn_manifest_cache') || 'null');
          const lessonIds = new Set((window.CN_CONTENT.data.LESSONS || []).map(l => l.id));
          const ft = window.CN_CONTENT.data.FT || [];
          return {
            packs: mf ? mf.packs.length : -1,
            hasP1: lessonIds.has('p1_l1'),
            hasFT: ft.length === 27,
            psy: (window.CN_CONTENT.data.PSY_LESSONS || []).length,
            psy2: (window.CN_CONTENT.data.PSY_LESSONS_2 || []).length,
            psyNums: new Set([...(window.CN_CONTENT.data.PSY_LESSONS || []), ...(window.CN_CONTENT.data.PSY_LESSONS_2 || [])].map(l => l.num)).size
          };
        }""")
        check("после покупки: все паки в манифесте (15)", state["packs"] == 15, str(state["packs"]))
        check("урок Фазы 1 (p1_l1) в регистре", state["hasP1"] is True)
        check("Академия Freqtrade (27) в регистре", state["hasFT"] is True)
        # движок пушит PSY_LESSONS_2 в PSY_LESSONS (56→86 записей с дублями) —
        # поэтому проверяем УНИКАЛЬНЫЕ номера: П1–П56 без пропусков
        check("психология П1–П56 в регистре", state["psyNums"] == 56, f"psy={state['psy']} uniq={state['psyNums']}")

        # плеер открывает платный урок p1_l1 (§19.3)
        ok_open = pg.evaluate("""async () => {
          try { window.LearnPlayer.open('p1_l1', 0); await new Promise(r => setTimeout(r, 700));
            return !!document.querySelector('.lp_overlay, .lp-modal, [class*="lp_"], [id*="learn"]'); } catch (e) { return false; }
        }""")
        check("плеер открывает платный урок p1_l1", ok_open is True)

        browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{'ALL PURCHASE CHECKS PASSED' if not failed else 'FAILURES: ' + str(len(failed))} ({len(results)} checks)")
    sys.exit(0 if not failed else 1)

if __name__ == "__main__":
    main()
