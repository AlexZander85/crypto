// AI-наставник §10 (промта v2.0). Контракт продиктован приложением v12.9, не изобретать:
//   POST /api/mentor/ask { action, lessonId, lessonText, deviceId, payload }
//   action ∈ feynman|rephrase|socratic|taskgen|hint|critic|sparring (клиент шлёт tasker/
//   critique/revise/diagnose/spar/explain — сервер нормализует к общей обработке)
//   ответ: { text } или { text, json } (feynman: {verdict, advice, gaps})
//   429 лимит · 402 не тот тариф · 501 ai_not_configured · 502 модель
// Гейтинг: free 3/день, lite 5, pro 10, max 100 (D1 mentor_usage, инкремент тем же запросом).
// Авторизация: JWT пользователя; гость — по deviceId (витрина 3/день, §1).
import { json, readJson, bearer, rateLimit } from './util.js';
import { verifyJWT } from './util.js';
import { ragSearch } from './rag.js';

// §10.2 — белый список SKU Workers AI. Стадия 11 (09.2026): каталог обновлён —
// только современные модели поколения 2026 по выбору владельца; старое поколение
// (llama-3.x, mistral-7b, qwen2.5, gemma-7b) снято с листинга.
// Значения в localStorage клиента с устаревшими id мигрируют на дефолт
// (mentorModelGet на фронте, getActiveSku на сервере — оба валидируют по белому списку).
export const MODEL_WHITELIST = {
  'cf-glm-5.3-flash': '@cf/zai-org/glm-5.3-flash',
  'cf-glm-4.7-flash': '@cf/zai-org/glm-4.7-flash',
  'cf-deepseek-v4-flash': '@cf/deepseek-ai/deepseek-v4-flash-0731',
  'cf-qwen3.8-27b': '@cf/qwen/qwen3.8-27b',
  'cf-gemma-4-26b-a4b-it': '@cf/google/gemma-4-26b-a4b-it'
};
export const DEFAULT_SKU = 'cf-glm-5.3-flash';       // новейшая генерация, дефолт для всех
const FALLBACK_SKU = 'cf-deepseek-v4-flash';          // ретрай другой моделью (§10.1), другое семейство

const TIER_LIMITS = { free: 3, lite: 5, pro: 10, max: 100 };

// Серверный выходной фильтр — тот же бан-лист, что в клиенте (§10.1: дублируется обязательно)
const BANNED = ['покупай', 'продавай', 'цена вырастет', 'будет рост', 'рекомендую открыть позицию', 'сигнал к покупке', 'сигнал к продаже'];
const FILTER_STUB = 'Здесь я останусь при материале урока: давай разберём то, что в нём есть.';
function applyFilter(text) {
  const clean = String(text || '');
  for (const b of BANNED) {
    if (clean.toLowerCase().includes(b.toLowerCase())) return { text: FILTER_STUB, filtered: 1 };
  }
  return { text: clean, filtered: 0 };
}

const ACTION_INSTRUCTIONS = {
  feynman: 'Проверь объяснение ученика методом Фейнмана. Ответь СТРОГО валидным JSON без markdown-обёрток: {"verdict":"understood|partial|missed","advice":"короткий совет","gaps":["пробел 1","пробел 2"]}. verdict=understood, если объяснение по сути верно и полно; partial — есть пробелы; missed — идея не понята.',
  rephrase: 'Переформулируй мысль урока проще, другими словами, сохранив смысл. Без финансового совета.',
  socratic: 'Отвечай сократовским вопросом-подсказкой, не выдавая готовый ответ. Если ученик сдался (giveUp) — дай короткое направление мысли.',
  taskgen: 'Придумай одну короткую практическую задачу по материалу урока и укажи эталонный ответ.',
  hint: 'Дай двухступенчатую подсказку: сначала наводящий вопрос, затем (после «—») минимальную опору. Без спойлеров.',
  critic: 'Разбери гипотезу ученика: сильные стороны, риски, что проверить. Без финансового совета.',
  sparring: 'Возьми роль скептичного спарринг-партнёра: задай 1 жёсткий вопрос по убеждению ученика и объясни, почему он важен.',
  explain: 'Объясни выделенный фрагмент простым языком по материалу урока.',
  tasker: 'Сгенерируй одну мини-задачу по материалу урока с эталонным ответом.',
  critique: 'Сделай краткую критику гипотезы: что проверить, где слабое место.',
  revise: 'Предложи улучшение текста устава/плана: конкретно и по делу.',
  diagnose: 'Объясни ошибку в ответе на вопрос: почему выбранный вариант неверен и почему верен правильный.'
};

function buildMessages(action, lessonText, payload) {
  const sys = 'Ты — наставник обучающего курса по криптотрейдингу «КриптоНавигатор». Отвечай ТОЛЬКО по материалу урока. Никакого финансового совета, призывов покупать/продавать, прогнозов цены. Обращение на «ты». Язык — русский. Отвечай кратко и по делу.';
  const payloadStr = payload && typeof payload === 'object' && Object.keys(payload).length
    ? '\n\nДанные от ученика (JSON): ' + JSON.stringify(payload).slice(0, 2500)
    : '';
  const lesson = String(lessonText || '').slice(0, 8000);
  const user = `Материал урока:\n${lesson || '(материал урока недоступен — отвечай общими словами о методе учёбы)'}${payloadStr}\n\nЗадача: ${ACTION_INSTRUCTIONS[action] || 'Ответь на вопрос ученика по материалу урока.'}`;
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ];
}

function isMockModel(env) {
  // dev-фикстура приёмки (§19.4): детерминированные ответы модели.
  // Только ENV=dev + MENTOR_MOCK_MODEL=1; на проде не выставлять.
  return env.ENV === 'dev' && env.MENTOR_MOCK_MODEL === '1';
}

async function runModel(env, sku, messages) {
  if (isMockModel(env)) {
    const user = messages[messages.length - 1].content;
    if (user.includes('__TEST_FILTER__')) return 'Отличный вопрос! Сигнал к покупке — покупай прямо сейчас.';
    if (user.includes('Задача: feynman') || user.includes('Проверь объяснение ученика методом Фейнмана')) {
      return JSON.stringify({ verdict: 'partial', advice: 'Ты верно ухватил идею, но добавь пример из практики.', gaps: ['нет примера', 'не названа цель'] });
    }
    return 'По материалу урока: разбери определение и закрепи его на маленьком примере. Это учебный ответ тестового режима.';
  }
  if (!env.AI) throw Object.assign(new Error('ai_not_configured'), { code: 'ai_not_configured' });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000); // таймаут 15 с (§10.1)
  try {
    const out = await Promise.race([
      env.AI.run(MODEL_WHITELIST[sku] || sku, { messages, signal: ctrl.signal }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('model_timeout')), 15000))
    ]);
    const text = typeof out === 'string' ? out : (out && (out.response || out.text || out.result)) || '';
    if (!text) throw new Error('empty_model_output');
    return String(text);
  } finally { clearTimeout(t); }
}

async function getActiveSku(env) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model').first();
    if (row && MODEL_WHITELIST[row.value]) return row.value;
  } catch { /* таблицы может не быть до миграций */ }
  return DEFAULT_SKU;
}

export async function setActiveSku(env, sku) {
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('ai_model', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(sku, Date.now()).run();
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// инкремент тем же запросом — атомарно (§10.1)
async function bumpUsage(env, subjectId) {
  const day = todayUTC();
  const row = await env.DB.prepare(
    `INSERT INTO mentor_usage (user_id, day, n) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1 RETURNING n`
  ).bind(subjectId, day).first();
  return row ? row.n : 1;
}

async function currentUsage(env, subjectId) {
  const row = await env.DB.prepare('SELECT n FROM mentor_usage WHERE user_id = ? AND day = ?')
    .bind(subjectId, todayUTC()).first();
  return row ? row.n : 0;
}

// POST /api/mentor/ask
export async function ask(ctx, req) {
  const { env } = ctx;
  if (!env.AI && !isMockModel(env)) return json({ error: 'ai_not_configured' }, 501);
  const body = await readJson(req);
  const action = String(body?.action || '').slice(0, 24);
  const lessonId = String(body?.lessonId || '').slice(0, 64);
  const lessonText = String(body?.lessonText || '');
  const deviceId = String(body?.deviceId || '').slice(0, 64);
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : null;

  if (!action) return json({ error: 'bad_request' }, 400);

  // авторизация: JWT → пользователь; иначе гость по deviceId (витрина §1)
  let subjectId = null, tier = 'free';
  const claims = await verifyJWT(bearer(req), env.JWT_SECRET);
  if (claims) {
    subjectId = 'u:' + claims.sub;
    const u = await env.DB.prepare('SELECT access_tier, access_expires_at FROM users WHERE id = ?').bind(claims.sub).first();
    tier = u?.access_tier || 'free';
    if (tier === 'max' && u?.access_expires_at && u.access_expires_at < Date.now()) tier = env.TIER_DOWNGRADE || 'free';
  } else if (deviceId) {
    subjectId = 'g:' + deviceId;
    tier = 'free';
  } else {
    return json({ error: 'unauthorized' }, 401);
  }

  // грубый rate-limit поверх дневной квоты (защита от перебора deviceId)
  if (!(await rateLimit(env, `mentor:${subjectId}`, 40, 3600))) return json({ error: 'rate_limited' }, 429);

  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const used = await bumpUsage(env, subjectId);
  if (used > limit) return json({ error: 'limit', used, limit }, 402);

  // RAG-режим (payload.__rag) — серверный контур Стадии 7; здесь честный флаг в телеметрии
  const isRag = !!(payload && payload.__rag);

  // RAG-режим (§10.3): BM25-поиск по 302 атомам → контекст с provenance в промпт.
  // Доступен любому авторизованному запросу наставника (витрина книги и так бесплатна);
  // полный контур «Макс» ограничен квотой 100/день тем же счётчиком.
  let ragSources = [];
  let ragContext = '';
  if (isRag) {
    const q = (payload && (payload.query || payload.question || payload.explanation)) || '';
    const rag = ragSearch(String(q).slice(0, 500), lessonId, 3);
    ragContext = rag.context;
    ragSources = rag.sources;
  }

  // Приоритет модели: выбор пользователя (кнопки в панели настроек, body.model,
  // валидируется по белому списку) → активная модель из админки (settings.ai_model) → DEFAULT_SKU.
  const clientSku = String(body?.model || '').slice(0, 48);
  const sku = MODEL_WHITELIST[clientSku] ? clientSku : await getActiveSku(env);
  const messages = buildMessages(action, lessonText, payload);
  if (ragContext) {
    messages[1].content += '\n\nРелевантные фрагменты доказательной базы книг (ссылайся честно: если этого нет в фрагментах — так и скажи):\n' + ragContext;
  }
  let text = null, usedSku = sku, retried = false;
  try {
    text = await runModel(env, sku, messages);
  } catch (e) {
    if (e && e.code === 'ai_not_configured') return json({ error: 'ai_not_configured' }, 501);
    // один ретрай другой моделью из белого списка (§10.1), потом честный 502
    try {
      retried = true;
      usedSku = FALLBACK_SKU;
      text = await runModel(env, FALLBACK_SKU, messages);
    } catch (e2) {
      try {
        const { track } = await import('./telemetry.js');
        track({ env, ctx }, 'mentor_call', claims ? claims.sub : null, { feature: action, ok: 0, model: usedSku, rag: isRag ? 1 : 0, err: 1 });
      } catch (e3) {}
      return json({ error: 'model_failed' }, 502);
    }
  }

  // автороллбэк активной модели при её недоступности (§10.2)
  if (retried) {
    try { await setActiveSku(env, FALLBACK_SKU); } catch { /* не критично */ }
  }

  const filteredRes = applyFilter(text);
  let respText = filteredRes.text, respJson = undefined;

  if (action === 'feynman') {
    // вердикт в формате json: {verdict, advice, gaps}
    try {
      const m = String(text).match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      respJson = {
        verdict: ['understood', 'partial', 'missed'].includes(parsed.verdict) ? parsed.verdict : 'partial',
        advice: String(parsed.advice || '').slice(0, 1200),
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 6).map(g => String(g).slice(0, 200)) : []
      };
      respText = '';
    } catch {
      // модель не вернула JSON — честный partial с текстовым советом
      respJson = { verdict: 'partial', advice: respText.slice(0, 1200) || 'Разбери объяснение ещё раз по шагам.', gaps: [] };
      respText = '';
    }
  }

  try {
    const { track } = await import('./telemetry.js');
    track({ env, ctx }, 'mentor_call', claims ? claims.sub : null, {
      feature: action, ok: 1, filtered: filteredRes.filtered,
      chars_in: lessonText.length, chars_out: respText.length,
      model: usedSku, rag: isRag ? 1 : 0
    });
  } catch { /* телеметрия не ломает ответ */ }

  return json({ text: respText, ...(respJson ? { json: respJson } : {}), ...(isRag ? { rag: { sources: ragSources } } : {}) });
}
