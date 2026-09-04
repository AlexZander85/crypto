/* __EXP_LIB__ — мини-библиотека для W-11/W-12 (guard: window.__EXP_LIB__; исходник L1147), gauss/цвета/setupBox/quantile
 * Источник: fable_viget.md. Guard-обёрнут: можно включать до виджетов один раз. */
window.__EXP_LIB__ = window.__EXP_LIB__ || (function () {
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  // нормальное распределение (Бокс–Мюллер) на детерминированном rnd
  const gauss = rnd => {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const CSS = `
.xw{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#222a45);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:100%;box-sizing:border-box;overflow:hidden}
.xw *{box-sizing:border-box}
.xw-goal{font-size:13px;color:var(--mut,#9aa3c7);margin:0 0 10px}
.xw-goal b{color:var(--txt,#eef1ff)}
.xw-task{background:rgba(6,182,212,.08);border-left:3px solid var(--acc2,#06b6d4);border-radius:6px;padding:8px 10px;margin:0 0 12px;font-size:13px}
.xw-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.xw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.xw canvas{display:block;width:100%;height:240px;background:#070a18;border:1px solid var(--line,#222a45);border-radius:8px}
.xw-btn{background:#141a33;color:var(--txt,#eef1ff);border:1px solid var(--line,#2a3355);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;line-height:1.2}
.xw-btn:hover{border-color:var(--acc2,#06b6d4)}
.xw-btn.on{background:rgba(6,182,212,.18);border-color:var(--acc2,#06b6d4)}
.xw-btn:disabled{opacity:.45;cursor:default}
.xw-range{flex:1 1 160px;min-width:120px;accent-color:var(--acc2,#06b6d4)}
.xw-lbl{font-size:13px;color:var(--mut,#9aa3c7)}
.xw-mono{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);color:var(--txt,#eef1ff)}
.xw-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-top:10px}
.xw-stat{background:#0b0f22;border:1px solid var(--line,#222a45);border-radius:8px;padding:8px 10px;min-width:0}
.xw-stat .k{font-size:11px;color:var(--mut,#9aa3c7);text-transform:uppercase;letter-spacing:.04em}
.xw-stat .v{font-size:17px;font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xw-aha{margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;border:1px solid transparent;transition:background .4s,border-color .4s;min-height:2.6em}
.xw-aha.ok{background:rgba(34,197,94,.10);border-color:var(--ok,#22c55e)}
.xw-aha.warn{background:rgba(234,179,8,.10);border-color:var(--warn,#eab308)}
.xw-aha.bad{background:rgba(239,68,68,.12);border-color:var(--bad,var(--err,#ef4444))}
.xw-aha.neutral{background:#0b0f22;border-color:var(--line,#222a45)}
.xw-note{font-size:12px;color:var(--mut,#9aa3c7);margin-top:8px}
.xw-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#141a33;border:1px solid var(--line,#2a3355);color:var(--mut,#9aa3c7)}
.xw-flash{animation:xwflash .7s ease}
@keyframes xwflash{0%{box-shadow:0 0 0 0 rgba(6,182,212,.75)}100%{box-shadow:0 0 0 14px rgba(6,182,212,0)}}
.xw-shake{animation:xwshake .5s ease}
@keyframes xwshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
`;
  function ensureCss() {
    if (document.getElementById('xw-css')) return;
    const s = document.createElement('style'); s.id = 'xw-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return {
      txt: v('--txt', '#eef1ff'), mut: v('--mut', '#9aa3c7'), line: v('--line', '#222a45'),
      acc: v('--acc2', '#06b6d4'), ok: v('--ok', '#22c55e'),
      bad: v('--bad', v('--err', '#ef4444')), warn: v('--warn', '#eab308')
    };
  }
  // чистка прошлого запуска + фабрика таймеров/RAF/наблюдателя размера
  function setupBox(box) {
    if (box._expTimers) box._expTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
    if (box._expRaf) cancelAnimationFrame(box._expRaf);
    if (box._expRO) box._expRO.disconnect();
    box._expTimers = []; box._expRaf = null; box._expRO = null;
    const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
    const raf = fn => { box._expRaf = requestAnimationFrame(fn); return box._expRaf; };
    const stopRaf = () => { if (box._expRaf) cancelAnimationFrame(box._expRaf); box._expRaf = null; };
    const observe = cb => {
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => cb()); ro.observe(box); box._expRO = ro;
    };
    return { later, raf, stopRaf, observe };
  }
  // HiDPI: CSS-размер задаётся стилями, буфер — по dpr
  function fitCanvas(cv) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '11px system-ui, sans-serif';
    return { ctx, w, h };
  }
  const sgn = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  function quantile(sorted, q) { // q ∈ [0,1], интерполяция типа 7 (как numpy)
    const n = sorted.length; if (!n) return NaN;
    const pos = (n - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function artifact(box, id, data) {
    box._expArtifact = { id, data, at: new Date().toISOString() };
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: box._expArtifact }));
  }
  function pulse(el, cls = 'xw-flash') { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  // пунктирная вертикаль с подписью — часто нужна
  function vline(ctx, x, y0, y1, color, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.restore();
  }
  function tag(ctx, text, x, y, color, align = 'left') { // подпись на плашке
    ctx.save(); ctx.font = '11px system-ui, sans-serif'; const wdt = ctx.measureText(text).width + 8;
    const x0 = align === 'left' ? x : align === 'right' ? x - wdt : x - wdt / 2;
    ctx.fillStyle = 'rgba(4,7,20,.85)'; ctx.fillRect(x0, y - 8, wdt, 16);
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + 4, y); ctx.restore();
  }
  return { mulberry32, gauss, ensureCss, colors, setupBox, fitCanvas, sgn, pct, quantile, artifact, pulse, vline, tag };
})();
