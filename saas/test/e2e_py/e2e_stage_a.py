#!/usr/bin/env python3
"""E2E Стадия A (§19 сценарий 8): эквивалентность SaaS-сборки локальному v12.9.

Прогон 1: собранный SaaS на wrangler dev (http://localhost:8787)
Прогон 2: локальный эталон file://index_v12.9.html
Сценарий обоих прогонов идентичен: загрузка → плеер открывает p0_l1 →
прошагать вперёд → проверить инварианты (LearnPlayer, регистры, прогресс).
"""
import json
import sys
import time
from playwright.sync_api import sync_playwright

SAAS_URL = "http://localhost:8787/"
LOCAL_FILE = "file:///home/z/my-project/repo-crypto/index_v12.9.html"

SCENARIO = """
async () => {
  const out = {};
  out.hasLearnPlayer = !!(window.LearnPlayer && typeof window.LearnPlayer.open === 'function');
  out.hasMentor = typeof window.MENTOR !== 'undefined';
  try { out.lessons = window.CN_CONTENT ? window.CN_CONTENT.ensure('LESSONS').length : -1; } catch(e){ out.lessons = 'ERR'; }
  try { out.psy = window.CN_CONTENT ? window.CN_CONTENT.ensure('PSY_LESSONS').length : 'N/A'; } catch(e){ out.psy = 'ERR'; }
  try { out.ft = window.CN_CONTENT ? window.CN_CONTENT.ensure('FT').length : 'N/A'; } catch(e){ out.ft = 'ERR'; }
  try { out.terms = window.CN_CONTENT ? window.CN_CONTENT.ensure('TERMS_RAW').length : 'N/A'; } catch(e){ out.terms = 'ERR'; }
  try { out.quizPsy = window.CN_CONTENT ? window.CN_CONTENT.ensure('QUIZ_PSY').length : 'N/A'; } catch(e){ out.quizPsy = 'ERR'; }
  out.bootScreenGone = !document.getElementById('cn_boot_screen');
  window.LearnPlayer.open('p0_l1', 0);
  await new Promise(r => setTimeout(r, 700));
  out.playerOpen = !!document.querySelector('.lp_overlay, .lp-modal, [class*="lp_"], [id*="learn"]');
  try {
    for (let i = 0; i < 3; i++) { window.LearnPlayer.next(); await new Promise(r => setTimeout(r, 250)); }
    out.playerAdvanced = true;
  } catch(e) { out.playerAdvanced = 'ERR: ' + e.message; }
  try { out.learnPos = JSON.parse(localStorage.getItem('cn_learn_pos') || 'null'); } catch(e){ out.learnPos = null; }
  out.learnPosLesson = out.learnPos && out.learnPos.lessonId || (out.learnPos && out.learnPos.id) || null;
  try { window.LearnPlayer.openHome(); await new Promise(r => setTimeout(r, 600)); out.homeOpen = true; } catch(e){ out.homeOpen = 'ERR'; }
  out.cnKeys = Object.keys(localStorage).filter(k => k.startsWith('cn_')).length;
  out.title = document.title.slice(0, 60);
  return out;
}
"""

def run(page, url, label):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.on("console", lambda m: errors.append(m.text[:200]) if m.type == "error" and "favicon" not in m.text else None)
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    for _ in range(120):
        if page.evaluate("() => !document.getElementById('cn_boot_screen')"):
            break
        time.sleep(0.5)
    time.sleep(2.0)
    res = page.evaluate(SCENARIO)
    res["js_errors"] = errors[:8]
    print(f"\n===== {label} =====")
    print(json.dumps(res, ensure_ascii=False, indent=1))
    return res

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        saas = run(page, SAAS_URL, "SAAS (сборка v2, Стадия A)")
        ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
        page2 = ctx2.new_page()
        local = run(page2, LOCAL_FILE, "LOCAL v12.9 (эталон)")

        print("\n===== СРАВНЕНИЕ =====")
        ok = True
        for k in ["hasLearnPlayer", "hasMentor", "bootScreenGone", "playerOpen", "playerAdvanced", "homeOpen", "learnPosLesson"]:
            same = saas.get(k) == local.get(k)
            ok = ok and same
            print(f"  {'✓' if same else '✗'} {k}: saas={saas.get(k)} local={local.get(k)}")
        # регистры на SaaS = константы v12.9 (движок мутирует LESSONS пушами: 76+48+6+56+27)
        expect = {"lessons": 213, "psy": 56, "ft": 27, "terms": 301, "quizPsy": 160}
        for k, v in expect.items():
            same = saas.get(k) == v
            ok = ok and same
            print(f"  {'✓' if same else '✗'} register {k}: saas={saas.get(k)} ожидалось {v}")
        print(f"  cnKeys saas={saas.get('cnKeys')} local={local.get('cnKeys')}")
        fatal = [e for e in saas.get("js_errors", []) if "favicon" not in e and "Failed to fetch" not in e and "ERR_CONNECTION" not in e and "404" not in e]
        print(f"  js_errors saas: {len(fatal)} → {fatal[:3]}")
        print("\n" + ("EQUIVALENCE OK" if ok and not fatal else "EQUIVALENCE FAIL"))
        browser.close()
        sys.exit(0 if ok and not fatal else 1)

if __name__ == "__main__":
    main()
