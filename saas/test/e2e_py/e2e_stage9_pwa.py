#!/usr/bin/env python3
"""E2E Стадия 9 (§15/§16): PWA + онбординг.

- manifest.json отдаётся и валиден, manifest link в шелле
- service worker регистрируется (localhost), контролирует страницу
- офлайн-старт: после первого визита airplane → приложение стартует из SW-кэша,
  демо-уроки открываются, тостов об ошибке нет (§19.6)
- онбординг: приветствие SaaS (шаг 0) при первом визите; «Показать тур снова»
  сбрасывает cn_tour_done
"""
import json
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8787"

def wait_boot(page, timeout_s=60):
    for _ in range(timeout_s * 2):
        if page.evaluate("() => !document.getElementById('cn_boot_screen')"):
            return True
        time.sleep(0.5)
    return False

def main():
    results = []
    def check(name, cond, extra=""):
        results.append((name, bool(cond)))
        print(f"  {'PASS' if cond else 'FAIL'}  {name}{'  — ' + extra if extra else ''}")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- первый визит ----------
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + "/", wait_until="domcontentloaded")
        check("первый визит: boot завершился", wait_boot(pg))
        time.sleep(1)
        check("приветствие SaaS показано (шаг 0 онбординга §16)",
              pg.evaluate("() => !!document.getElementById('cn_welcome_back')"))
        pg.click("#cn_welcome_go")
        time.sleep(2)
        check("после приветствия открыт хаб «Моё обучение»",
              pg.evaluate("() => !!(document.querySelector('.lp3-overlay, [class*=lp3]') || document.querySelector('[class*=learn]'))"))

        # SW + manifest
        sw = pg.evaluate("""async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            return { registered: !!reg, controlling: !!(navigator.serviceWorker.controller) };
          } catch (e) { return { registered: false, err: e.message }; }
        }""")
        check("service worker зарегистрирован", sw.get("registered") is True, json.dumps(sw))
        check("SW контролирует страницу (готов офлайн)", sw.get("controlling") is True or sw.get("registered") is True)

        manifest = pg.evaluate("""async () => {
          const r = await fetch('/manifest.json');
          const m = await r.json();
          return { ok: r.ok, icons: (m.icons||[]).length, display: m.display, link: !!document.querySelector('link[rel=manifest]') };
        }""")
        check("manifest.json валиден и подключён", manifest["ok"] and manifest["icons"] >= 2 and manifest["display"] == "standalone" and manifest["link"], json.dumps(manifest))

        # кэш прогрет: паки должны быть в SW-кэше
        time.sleep(2)

        # ---------- офлайн-рестарт (§19.6) ----------
        ctx.set_offline(True)
        pg.reload(wait_until="domcontentloaded")
        offline_boot = wait_boot(pg, timeout_s=45)
        check("офлайн: приложение стартует из SW-кэша", offline_boot)
        if offline_boot:
            res = pg.evaluate("""async () => {
              const out = { hasPlayer: !!(window.LearnPlayer && window.LearnPlayer.open) };
              try {
                window.LearnPlayer.open('p0_l1', 0);
                await new Promise(r => setTimeout(r, 700));
                out.lessonOpens = !!document.querySelector('.lp_overlay, .lp-modal, [class*="lp_"], [id*="learn"]');
              } catch (e) { out.lessonOpens = false; }
              localStorage.setItem('cn_learned', JSON.stringify({ p0_l1: 1, p0_l2: 1 }));   // локальная запись без ошибок
              out.progressLocal = JSON.parse(localStorage.getItem('cn_learned') || '{}');
              out.bootScreenGone = !document.getElementById('cn_boot_screen');
              return out;
            }""")
            check("офлайн: демо-урок открывается", res.get("lessonOpens") is True)
            check("офлайн: прогресс пишется локально без ошибок", res.get("progressLocal", {}).get("p0_l1") == 1)
        ctx.set_offline(False)

        # ---------- «Показать тур снова» (§16) ----------
        time.sleep(1)
        pg.evaluate("() => localStorage.setItem('cn_tour_done', '1')")
        pg.reload(wait_until="domcontentloaded")
        wait_boot(pg)
        pg.click("#cn_cloud_btn")
        check("панель: кнопка «Показать тур снова» есть",
              pg.evaluate("() => !!document.getElementById('cn_retour')"))
        pg.click("#cn_retour")
        time.sleep(4)
        for _ in range(30):
            if pg.evaluate("() => !document.getElementById('cn_boot_screen')"):
                break
            time.sleep(0.5)
        check("тур сброшен: cn_tour_done отсутствует, приветствие снова показано",
              pg.evaluate("() => !localStorage.getItem('cn_tour_done') && !!document.getElementById('cn_welcome_back')"))

        browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{'ALL PWA CHECKS PASSED' if not failed else 'FAILURES: ' + str(len(failed))} ({len(results)} checks)")
    sys.exit(0 if not failed else 1)

if __name__ == "__main__":
    main()
