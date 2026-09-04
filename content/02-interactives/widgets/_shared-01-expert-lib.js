/* EXPERT_LIB — мини-движок для W-29/W-30 (guard: window.EXPERT_LIB)
 * Источник: fable_viget.md. Guard-обёрнут: можно включать до виджетов один раз. */
window.EXPERT_LIB = window.EXPERT_LIB || (function () {
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  // очистка прошлого запуска + фабрики таймеров/кадров
  const setup = box => {
    if (box._expTimers) box._expTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
    if (box._expRaf) cancelAnimationFrame(box._expRaf);
    box._expTimers = []; box._expRaf = null;
    return {
      later: (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; },
      raf: fn => { box._expRaf = requestAnimationFrame(fn); }
    };
  };
  const tokens = el => {
    const g = getComputedStyle(el), v = (n, f) => (g.getPropertyValue(n).trim() || f);
    return { txt: v('--txt', '#eef1ff'), mut: v('--mut', '#9aa3c7'), line: v('--line', 'rgba(154,163,199,.28)'),
      acc: v('--acc2', '#06b6d4'), ok: v('--ok', '#22c55e'), bad: v('--bad', '#ef4444'), warn: v('--warn', '#eab308') };
  };
  const fitCanvas = (cv, H) => {
    const W = Math.max(320, Math.floor(cv.getBoundingClientRect().width)) || 320;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px'; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, W, H };
  };
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const artifact = (box, id, data) => {
    box.dataset.artifact = JSON.stringify(data);
    box.dispatchEvent(new CustomEvent('expert-artifact', { bubbles: true, detail: { widget: id, data } }));
  };
  const baseCSS = p => `
.@@{color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,rgba(154,163,199,.28));border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;max-width:100%;box-sizing:border-box;overflow:hidden}
.@@ *{box-sizing:border-box}
.@@ canvas{width:100%;display:block;border-radius:8px;background:rgba(255,255,255,.025)}
.@@ button{font:inherit;color:var(--txt,#eef1ff);background:rgba(6,182,212,.12);border:1px solid var(--acc2,#06b6d4);border-radius:8px;padding:8px 12px;cursor:pointer;transition:transform .12s,background .15s;text-align:left}
.@@ button:hover{background:rgba(6,182,212,.22)}.@@ button:active{transform:scale(.97)}
.@@ button.pri{background:var(--acc2,#06b6d4);color:#04121a;font-weight:600}
.@@ button.ghost{border-color:var(--line,rgba(154,163,199,.35));background:transparent;color:var(--mut,#9aa3c7)}
.@@ button.bad{border-color:var(--bad,#ef4444);background:rgba(239,68,68,.12)}
.@@ button:disabled{opacity:.45;cursor:default;transform:none}
.@@ .mut{color:var(--mut,#9aa3c7)}.@@ .mono{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-size:12px;word-break:break-all}
.@@ .goal{font-size:13px;color:var(--mut,#9aa3c7)}.@@ .goal b{color:var(--txt,#eef1ff)}
.@@ .btns{display:flex;flex-wrap:wrap;gap:8px}
.@@ .msg{border-left:3px solid var(--line,rgba(154,163,199,.35));padding:8px 10px;border-radius:0 8px 8px 0;background:rgba(255,255,255,.03);min-height:42px;font-size:13px}
.@@ .msg.ok{border-color:var(--ok,#22c55e)}.@@ .msg.bad{border-color:var(--bad,#ef4444)}
.@@ .msg.aha{border-color:var(--warn,#eab308);background:rgba(234,179,8,.08);animation:@@glow 1.2s ease 2}
@keyframes @@glow{0%{box-shadow:0 0 0 0 rgba(234,179,8,.5)}100%{box-shadow:0 0 0 14px rgba(234,179,8,0)}}
.@@ .track{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--mut,#9aa3c7)}.@@ .track b{color:var(--txt,#eef1ff)}.@@ .track .done{color:var(--ok,#22c55e)}
.@@ input[type=text],.@@ input[type=number]{font:inherit;color:var(--txt,#eef1ff);background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(154,163,199,.35));border-radius:8px;padding:7px 9px;width:100%}
.@@ label{display:block;font-size:13px;color:var(--mut,#9aa3c7)}
.@@ .foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:12px;color:var(--mut,#9aa3c7)}
`.replace(/@@/g, p);
  return { mulberry32, setup, tokens, fitCanvas, roundRect, ease, artifact, baseCSS };
})();
