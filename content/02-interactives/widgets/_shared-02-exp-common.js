/* exp_common — общий слой для W-35/W-36 (guard: window.EXPERT_COMMON)
 * Источник: fable_viget.md. Guard-обёрнут: можно включать до виджетов один раз. */
(function(){
  if (window.EXPERT_COMMON) return;

  // детерминированный ГПСЧ
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const CSS = `
  .exp-card{background:linear-gradient(180deg,#0d1022,#040714);border:1px solid var(--line,#1e2540);border-radius:12px;padding:14px;color:var(--txt,#eef1ff);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:100%;box-sizing:border-box}
  .exp-card *{box-sizing:border-box}
  .exp-title{font-weight:700;font-size:16px;margin-bottom:4px}
  .exp-goal{color:var(--mut,#9aa3c7);font-size:13px}
  .exp-task{margin:10px 0;padding:8px 10px;border-left:3px solid var(--acc2,#06b6d4);background:rgba(6,182,212,.08);border-radius:0 8px 8px 0;font-size:13px}
  .exp-formula{margin:8px 0 6px;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;color:var(--mono,var(--txt,#eef1ff));background:#0b0f20;border:1px solid var(--line,#1e2540);border-radius:8px;padding:6px 10px;overflow-x:auto;white-space:nowrap}
  .exp-canvas{display:block;width:100%;height:auto;border-radius:8px;background:#070a18;border:1px solid var(--line,#1e2540);touch-action:pan-y}
  .exp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
  .exp-btn{background:#12172c;border:1px solid var(--line,#1e2540);color:var(--txt,#eef1ff);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;font-size:13px;transition:border-color .15s}
  .exp-btn:hover{border-color:var(--acc2,#06b6d4)}
  .exp-btn.primary{background:var(--acc2,#06b6d4);color:#04121a;border-color:transparent;font-weight:600}
  .exp-btn.active{border-color:var(--acc2,#06b6d4);box-shadow:inset 0 0 0 1px var(--acc2,#06b6d4)}
  .exp-btn:disabled{opacity:.45;cursor:default}
  .exp-slider{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--mut,#9aa3c7);min-width:140px;flex:1 1 140px}
  .exp-slider input{width:100%;accent-color:var(--acc2,#06b6d4)}
  .exp-slider b{color:var(--txt,#eef1ff);font-family:ui-monospace,Menlo,Consolas,monospace}
  .exp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-top:10px;font-size:12px;color:var(--mut,#9aa3c7)}
  .exp-stat{background:#0b0f20;border:1px solid var(--line,#1e2540);border-radius:8px;padding:6px 8px}
  .exp-stat b{display:block;font:600 15px/1.3 ui-monospace,Menlo,Consolas,monospace;color:var(--mono,var(--txt,#eef1ff))}
  .exp-aha{margin-top:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--ok,#22c55e);background:rgba(34,197,94,.08);font-size:13px;animation:expPulse .9s ease-out}
  .exp-aha.bad{border-color:var(--bad,var(--err,#ef4444));background:rgba(239,68,68,.08)}
  .exp-aha.warn{border-color:var(--warn,#eab308);background:rgba(234,179,8,.08)}
  @keyframes expPulse{from{box-shadow:0 0 0 0 rgba(34,197,94,.55)}to{box-shadow:0 0 0 14px rgba(34,197,94,0)}}
  .exp-prompt{margin-top:10px;padding:10px;border-radius:8px;border:1px dashed var(--warn,#eab308);background:rgba(234,179,8,.07);font-size:13px}
  .exp-artifact{margin-top:10px;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:var(--mut,#9aa3c7);word-break:break-word}
  .exp-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut,#9aa3c7);margin-top:6px}
  .exp-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle}
  .exp-check{font-size:12px;color:var(--mut,#9aa3c7);margin-right:10px}
  .exp-check.done{color:var(--ok,#22c55e)}
  .exp-check::before{content:"☐ "} .exp-check.done::before{content:"☑ "}
  @media (max-width:420px){.exp-card{padding:10px}.exp-btn{padding:6px 9px;font-size:12px}}`;

  function ensureStyle(){
    if (document.getElementById('exp-w-style')) return;
    const s = document.createElement('style'); s.id = 'exp-w-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // жизненный цикл: чистим прошлый запуск, выдаём безопасные later/raf/onResize
  function lifecycle(box){
    if (box._expTimers) box._expTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
    if (box._expRaf) cancelAnimationFrame(box._expRaf);
    if (box._expCleanup) box._expCleanup();
    box._expTimers = []; box._expRaf = null; box._expCleanup = null;
    const later = (fn, ms, rep) => { const t = rep ? setInterval(fn, ms) : setTimeout(fn, ms); box._expTimers.push(t); return t; };
    const raf = fn => { if (box._expRaf) cancelAnimationFrame(box._expRaf); box._expRaf = requestAnimationFrame(ts => { box._expRaf = null; fn(ts); }); };
    const onResize = fn => {
      window.addEventListener('resize', fn);
      const prev = box._expCleanup;
      box._expCleanup = () => { if (prev) prev(); window.removeEventListener('resize', fn); };
    };
    return { later, raf, onResize };
  }

  // канвас под devicePixelRatio; высота = ширина × ratio в пределах [minH,maxH]
  function fitCanvas(canvas, ratio, minH, maxH){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, canvas.clientWidth || (canvas.parentNode && canvas.parentNode.clientWidth) || 320);
    const h = Math.round(Math.min(maxH, Math.max(minH, w * ratio)));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  const cssVar = (name, fb) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; };
  const palette = () => ({
    txt: cssVar('--txt', '#eef1ff'), mut: cssVar('--mut', '#9aa3c7'), line: cssVar('--line', '#1e2540'),
    acc: cssVar('--acc2', '#06b6d4'), ok: cssVar('--ok', '#22c55e'),
    bad: cssVar('--bad', cssVar('--err', '#ef4444')), warn: cssVar('--warn', '#eab308')
  });

  const fmtPct = (x, d) => (x * 100).toFixed(d === undefined ? 1 : d).replace('.', ',') + '%';
  const fmtNum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  const fmtSigned = (n, d) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d === undefined ? 0 : d).replace('.', ',');
  const niceCeil = v => { const e = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, v)))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };

  // артефакт: строка в карточке + событие для профиля ученика
  const artifact = (box, el, text, detail) => {
    if (el) el.textContent = 'Артефакт: ' + text;
    box.dispatchEvent(new CustomEvent('expert:artifact', { bubbles: true, detail: Object.assign({ text }, detail || {}) }));
  };

  window.EXPERT_COMMON = { mulberry32, ensureStyle, lifecycle, fitCanvas, palette, fmtPct, fmtNum, fmtSigned, niceCeil, artifact };
  window.EXPERT_WIDGETS = window.EXPERT_WIDGETS || {};
  window.EXPERT_ENGINES = window.EXPERT_ENGINES || {};
})();
