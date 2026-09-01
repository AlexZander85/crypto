// Учёт нейронов Workers AI — дашборд «Нейроны» в админке (§ «Нейроны»).
// Ловим usage (токены) из каждого ответа модели, считаем нейроны по тарифам
// владельца (нейронов за 1M токенов: input / cached input / output),
// пишем в D1 (neuron_usage, агрегат по дню UTC + модель).
// Лимит Workers Free — 10 000 нейронов/день (env.NEURON_DAILY_LIMIT).
import { MODEL_WHITELIST } from './mentor.js';

// Тарифы владельца (нейронов за миллион токенов). Источник истины — официальная
// страница pricing Workers AI (developers.cloudflare.com/workers-ai/platform/pricing, 09.2026).
// Только модели, доступные на Workers Free плане. SKU — ключи MODEL_WHITELIST.
export const NEURON_PRICING = {
  'cf-gpt-oss-120b':       { model: '@cf/openai/gpt-oss-120b',             label: 'GPT OSS 120B',       in: 31818, cached: 0,    out: 68182 },
  'cf-glm-4.7-flash':      { model: '@cf/zai-org/glm-4.7-flash',           label: 'GLM 4.7 Flash',      in: 5500,  cached: 0,    out: 36400 },
  'cf-qwen3.8-27b':        { model: '@cf/qwen/qwen3.8-27b',                label: 'Qwen 3.8 27B',       in: 40909, cached: 0,    out: 290909 },
  'cf-gemma-4-26b-a4b-it': { model: '@cf/google/gemma-4-26b-a4b-it',       label: 'Gemma 4 26B A4B',    in: 9091,  cached: 0,    out: 27273 }
};

export const DAILY_LIMIT_DEFAULT = 10000;

export function dailyLimit(env) {
  const n = parseInt(env && env.NEURON_DAILY_LIMIT, 10);
  return Number.isFinite(n) && n > 0 ? n : DAILY_LIMIT_DEFAULT;
}

// Расчёт нейронов за вызов: in/cached/out токены → нейроны (2 знака после запятой).
export function calcNeurons(sku, inTok, cachedTok, outTok) {
  const p = NEURON_PRICING[sku] || { in: 0, cached: 0, out: 0 };
  const n = (Number(inTok) || 0) / 1e6 * p.in
    + (Number(cachedTok) || 0) / 1e6 * p.cached
    + (Number(outTok) || 0) / 1e6 * p.out;
  return Math.round(n * 100) / 100;
}

// Нормализация usage из ответа Workers AI. Поля зависят от схемы модели,
// поэтому проверяем несколько известных вариантов имён.
export function extractUsage(out) {
  try {
    const u = out && typeof out === 'object' ? out.usage : null;
    if (!u || typeof u !== 'object') return null;
    const num = v => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
    const inTok = num(u.prompt_tokens ?? u.input_tokens);
    const cached = num(u.cached_prompt_tokens ?? u.cached_tokens ?? u.prompt_tokens_cached);
    const outTok = num(u.completion_tokens ?? u.output_tokens);
    if (!inTok && !outTok) return null;
    return { in: inTok, cached: Math.min(cached, inTok), out: outTok, estimated: 0 };
  } catch { return null; }
}

// Оценка токенов, если модель не вернула usage: кириллица ~2 символа/токен, латиница ~4.
// Помечаем estimated=1 — на дашборде видно, что это оценка, а не точные данные модели.
export function estimateTokens(text) {
  const s = String(text || '');
  const cyr = (s.match(/[\u0400-\u04FF]/g) || []).length;
  const other = s.length - cyr;
  return Math.max(1, Math.ceil(cyr / 2 + other / 4));
}

// Запись расхода в D1. Атомарный upsert по (day, model); нейроны копим с округлением
// до целого на уровне агрегата, чтобы дашборд сходился с квотой.
export async function recordUsage(env, sku, usage) {
  if (!env.DB || !usage) return;
  const p = NEURON_PRICING[sku] ? sku : (MODEL_WHITELIST[sku] ? sku : null);
  if (!p) return; // неизвестная модель — не пишем (белый список и так не пропустит)
  const day = new Date().toISOString().slice(0, 10);
  const neurons = calcNeurons(sku, usage.in, usage.cached, usage.out);
  await env.DB.prepare(
    `INSERT INTO neuron_usage (day, model, requests, in_tokens, cached_tokens, out_tokens, neurons)
     VALUES (?, ?, 1, ?, ?, ?, ?)
     ON CONFLICT(day, model) DO UPDATE SET
       requests = requests + 1,
       in_tokens = in_tokens + excluded.in_tokens,
       cached_tokens = cached_tokens + excluded.cached_tokens,
       out_tokens = out_tokens + excluded.out_tokens,
       neurons = neurons + excluded.neurons`
  ).bind(day, sku, usage.in, usage.cached, usage.out, neurons).run();
}

// Снимок для дашборда «Нейроны»: сегодня по моделям + история по дням.
export async function snapshot(env, days = 14) {
  const today = new Date().toISOString().slice(0, 10);
  const limit = dailyLimit(env);
  const since = new Date(Date.now() - Math.max(1, days) * 86400000).toISOString().slice(0, 10);

  const [todayRows, history] = await env.DB.batch([
    env.DB.prepare('SELECT model, requests, in_tokens, cached_tokens, out_tokens, neurons FROM neuron_usage WHERE day = ?').bind(today),
    env.DB.prepare("SELECT day, SUM(neurons) AS neurons, SUM(requests) AS requests FROM neuron_usage WHERE day >= ? GROUP BY day ORDER BY day").bind(since)
  ]);

  const raw = todayRows.results || [];
  const totalNeuronsToday = raw.reduce((s, r) => s + Math.round(r.neurons || 0), 0);

  const rows = raw.map(r => {
    const requests = r.requests || 0;
    const neurons = Math.round(r.neurons || 0);
    const avg = requests ? Math.round((neurons / requests) * 10) / 10 : 0;
    const remainingNow = Math.max(0, limit - totalNeuronsToday);
    return {
      sku: r.model,
      model: NEURON_PRICING[r.model]?.model || r.model,
      label: NEURON_PRICING[r.model]?.label || r.model,
      requests,
      in_tokens: r.in_tokens || 0,
      cached_tokens: r.cached_tokens || 0,
      out_tokens: r.out_tokens || 0,
      neurons,
      share_pct: totalNeuronsToday ? Math.round(neurons / totalNeuronsToday * 100) : 0,
      avg_neurons: avg,       // средняя цена задачи этой моделью
      tasks_left: avg > 0 ? Math.max(0, Math.floor(remainingNow / avg)) : null // на сколько задач хватит остатка
    };
  });

  const requestsToday = rows.reduce((s, r) => s + r.requests, 0);
  const avgPerTask = requestsToday ? Math.round((totalNeuronsToday / requestsToday) * 10) / 10 : 0;
  const remaining = Math.max(0, limit - totalNeuronsToday);

  return {
    limit,
    today: {
      neurons: totalNeuronsToday,
      requests: requestsToday,
      in_tokens: rows.reduce((s, r) => s + r.in_tokens, 0),
      cached_tokens: rows.reduce((s, r) => s + r.cached_tokens, 0),
      out_tokens: rows.reduce((s, r) => s + r.out_tokens, 0)
    },
    remaining,
    usage_pct: limit ? Math.min(100, Math.round(totalNeuronsToday / limit * 100)) : 0,
    avg_per_task: avgPerTask,
    tasks_left: avgPerTask > 0 ? Math.floor(remaining / avgPerTask) : null,
    by_model: rows,
    by_day: (history.results || []).map(r => ({
      day: r.day, neurons: Math.round(r.neurons || 0), requests: r.requests || 0
    })),
    pricing: Object.fromEntries(Object.entries(NEURON_PRICING).map(([k, v]) => [k, { label: v.label, model: v.model, in: v.in, cached: v.cached, out: v.out }]))
  };
}
