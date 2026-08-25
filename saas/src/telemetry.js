// Телеметрия §20.2: единый контракт track(type, user_id?, meta).
// Пишет через ctx.waitUntil — не замедляет ответ. В логах нет контента диалогов.

export function track(ctx, type, userId = null, meta = {}) {
  try {
    const row = {
      ts: Date.now(),
      type,
      user_id: userId,
      meta: JSON.stringify(meta || {})
    };
    ctx.waitUntil(
      ctx.env.DB.prepare(
        'INSERT INTO events (ts, type, user_id, meta) VALUES (?, ?, ?, ?)'
      ).bind(row.ts, row.type, row.user_id, row.meta).run()
    );
  } catch {
    // телеметрия никогда не ломает основной поток
  }
}
