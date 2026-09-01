#!/usr/bin/env python3
"""E2E Стадия 3 (§19 сценарий 1): двойное устройство.

Устройство A (контекст 1): гость «проходит уроки» (пишет cn_* ключи через
localStorage.setItem — перехват синка видит их), регистрируется (magic-link,
dev-режим) → капсула сливается и уходит на сервер.
Устройство B (контекст 2): логин тем же email → pull-merge → проверяем,
что cn_learned / cn_learn_pos / стрик приехали.
Плюс: политики P4 не синхронизируются, P2 — max-wins.
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
    # приветствие SaaS (первый визит) — закрываем, если появилось
    if page.evaluate("() => !!document.getElementById('cn_welcome_back')"):
        page.click("#cn_welcome_skip")
        time.sleep(0.5)
    return True

def login(page, email):
    """Логин через панель «☁» с учётом reload после слияния."""
    page.click("#cn_cloud_btn")
    page.click("#cn_login")
    page.fill("#cn_email", email)
    page.click("#cn_login_go")
    # после слияния страница перезагружается (движок перечитывает localStorage)
    for _ in range(40):
        if page.evaluate("() => !document.getElementById('cn_login_back')"):
            break
        time.sleep(0.5)
    time.sleep(1.2)  # reload происходит через 0.7 с
    for _ in range(60):
        if page.evaluate("() => !document.getElementById('cn_boot_screen')"):
            break
        time.sleep(0.5)
    time.sleep(1.5)

def main():
    results = []
    def check(name, cond, extra=""):
        results.append((name, bool(cond)))
        print(f"  {'PASS' if cond else 'FAIL'}  {name}{'  — ' + extra if extra else ''}")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        email = f"sync-{int(time.time())}@example.com"

        # ---------- Устройство A: гость + прогресс + регистрация ----------
        ctxA = browser.new_context()
        pa = ctxA.new_page()
        check("A: boot завершился", wait_boot(pa))
        time.sleep(1)

        # гость пишет прогресс как живой пользователь (перехват Storage.setItem)
        pa.evaluate("""() => {
          localStorage.setItem('cn_learned', JSON.stringify({p0_l1:1, p0_l2:1, p0_l3:1}));
          localStorage.setItem('cn_learn_pos', JSON.stringify({lessonId:'p0_l3', stepIdx:2, ts: Date.now()}));
          localStorage.setItem('cn_user_xp', '120');
          localStorage.setItem('cn_streak_count', '5');
          localStorage.setItem('cn_jwt_test_noise', '1');           // не cn_ → не синкается
          localStorage.setItem('cn_news_cache', JSON.stringify({x:1}));  // P4 → не синкается
          localStorage.setItem('cn_quiz', JSON.stringify({best: 7, streak: 2}));
        }""")
        # регистрация через модалку SaaS-слоя (после слияния — reload)
        login(pa, email)
        check("A: логин выполнен (JWT)", pa.evaluate("() => !!localStorage.getItem('cn_jwt')"))
        meA = pa.evaluate("() => window.CN_SAAS && window.CN_SAAS.getMe()")
        check("A: /api/me получен", meA and meA.get("email") == email, json.dumps(meA or {}))
        # ждём pushProgress после слияния
        time.sleep(3)
        saasA = pa.evaluate("() => JSON.parse(localStorage.getItem('cn_sync_ts') || '0') > 0")
        check("A: метка успешного синка", saasA)

        # ---------- Устройство B: чистый контекст, логин тем же email ----------
        ctxB = browser.new_context()
        pb = ctxB.new_page()
        check("B: boot завершился", wait_boot(pb))
        login(pb, email)
        check("B: логин выполнен (JWT)", pb.evaluate("() => !!localStorage.getItem('cn_jwt')"))
        time.sleep(3)
        state = pb.evaluate("""() => ({
          learned: JSON.parse(localStorage.getItem('cn_learned') || 'null'),
          pos: JSON.parse(localStorage.getItem('cn_learn_pos') || 'null'),
          xp: localStorage.getItem('cn_user_xp'),
          streak: localStorage.getItem('cn_streak_count'),
          p4: localStorage.getItem('cn_news_cache'),
          quiz: JSON.parse(localStorage.getItem('cn_quiz') || 'null')
        })""")
        check("B: cn_learned приехал (P1 map-merge)", state["learned"] == {"p0_l1": 1, "p0_l2": 1, "p0_l3": 1}, json.dumps(state["learned"] or {}))
        check("B: cn_learn_pos приехал (LWW)", (state["pos"] or {}).get("lessonId") == "p0_l3", json.dumps(state["pos"] or {}))
        check("B: cn_user_xp приехал (P2 max)", state["xp"] == "120", str(state["xp"]))
        check("B: cn_streak_count приехал", state["streak"] == "5", str(state["streak"]))
        check("B: P4 (cn_news_cache) НЕ синхронизировался", state["p4"] is None, str(state["p4"]))
        check("B: cn_quiz.best приехал (P2)", (state["quiz"] or {}).get("best") == 7, json.dumps(state["quiz"] or {}))

        # ---------- P2 max-wins: на B xp больше (300) → A после pull+reload видит 300 ----------
        pb.evaluate("() => localStorage.setItem('cn_user_xp', '300')")
        time.sleep(6.5)  # debounce 5s → B запушил 300
        pa.evaluate("() => window.CN_SAAS.pullAndReload()")
        time.sleep(4)    # reload + старт
        for _ in range(30):
            if pa.evaluate("() => !document.getElementById('cn_boot_screen')"):
                break
            time.sleep(0.5)
        time.sleep(1)
        xpA = pa.evaluate("() => localStorage.getItem('cn_user_xp')")
        check("P2 max-wins: A получил 300 (не затёрто 120)", xpA == "300", str(xpA))

        # панель: бейдж тарифа
        pa.click("#cn_cloud_btn")
        badge = pa.evaluate("() => document.querySelector('#cn_panel .cn-badge') ? document.querySelector('#cn_panel .cn-badge').textContent : ''")
        check("A: панель показывает тариф", "Демо" in badge, badge)

        browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{'ALL SYNC CHECKS PASSED' if not failed else 'FAILURES: ' + str(len(failed))} ({len(results)} checks)")
    sys.exit(0 if not failed else 1)

if __name__ == "__main__":
    main()
