// Cron §12.2: 03:00 UTC — свёртка суток в stats_daily + чистка events > 180 дней.
// Дашборд читает только свёртку (§13) — быстро даже на 30 днях.
export async function scheduled(event, env, ctx) {
  const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10); // вчерашний день
  const dayStart = Date.parse(day + 'T00:00:00Z');
  const dayEnd = dayStart + 86400000;

  const q = (sql, ...binds) => env.DB.prepare(sql).bind(...binds);
  const one = async (sql, ...binds) => (await q(sql, ...binds).first());

  try {
    const stats = {
      signup_count: await one("SELECT COUNT(*) AS n FROM events WHERE type='signup' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      logins: await one("SELECT COUNT(*) AS n FROM events WHERE type='login' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      dau: await one('SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE ts >= ? AND ts < ? AND user_id IS NOT NULL', dayStart, dayEnd),
      pack_downloads: await one("SELECT COUNT(*) AS n FROM events WHERE type='pack_download' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      errors_count: await one("SELECT COUNT(*) AS n FROM events WHERE type='app_error' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      revenue_minor: await one("SELECT COALESCE(SUM(amount_minor),0) AS n FROM purchases WHERE status='paid' AND created_at >= ? AND created_at < ?", dayStart, dayEnd),
      mentor_calls: await one("SELECT COUNT(*) AS n FROM events WHERE type='mentor_call' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      live_fetches: await one("SELECT COUNT(*) AS n FROM events WHERE type='live_fetch' AND ts >= ? AND ts < ?", dayStart, dayEnd),
      live_cache_hits: await one("SELECT COUNT(*) AS n FROM events WHERE type='live_fetch' AND json_extract(meta,'$.cache_hit') = 1 AND ts >= ? AND ts < ?", dayStart, dayEnd)
    };
    // mentor_calls_by_feature: отдельные метрики
    const feats = await env.DB.prepare("SELECT json_extract(meta,'$.feature') AS feature, COUNT(*) AS n FROM events WHERE type='mentor_call' AND ts >= ? AND ts < ? GROUP BY feature").bind(dayStart, dayEnd).all();
    // perf p95
    const perf = await env.DB.prepare("SELECT json_extract(meta,'$.fcp_ms') AS ms FROM events WHERE type='perf' AND ts >= ? AND ts < ? AND json_extract(meta,'$.fcp_ms') IS NOT NULL").bind(dayStart, dayEnd).all();
    const msArr = perf.results.map(r => r.ms).sort((a, b) => a - b);
    const p95 = msArr.length ? msArr[Math.floor(msArr.length * 0.95)] : 0;

    const rows = [
      ['signup_count', stats.signup_count?.n ?? 0],
      ['logins', stats.logins?.n ?? 0],
      ['dau', stats.dau?.n ?? 0],
      ['pack_downloads', stats.pack_downloads?.n ?? 0],
      ['errors_count', stats.errors_count?.n ?? 0],
      ['revenue_minor', stats.revenue_minor?.n ?? 0],
      ['mentor_calls', stats.mentor_calls?.n ?? 0],
      ['live_fetches', stats.live_fetches?.n ?? 0],
      ['live_cache_hit_rate', stats.live_fetches?.n ? Math.round((stats.live_cache_hits?.n ?? 0) / stats.live_fetches.n * 100) : 0],
      ['perf_fcp_p95_ms', p95]
    ];
    for (const f of feats.results) {
      if (f.feature) rows.push([`mentor_calls_${String(f.feature).slice(0, 24)}`, f.n]);
    }

    const stmts = rows.map(([metric, value]) =>
      q(`INSERT INTO stats_daily (day, metric, value) VALUES (?, ?, ?)
         ON CONFLICT(day, metric) DO UPDATE SET value = excluded.value`, day, metric, value));
    await env.DB.batch(stmts);
  } catch { /* cron не падает воркеру */ }

  try {
    // чистка events старше 180 дней (§12.2)
    const cutoff = Date.now() - 180 * 86400000;
    await env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(cutoff).run();
    await env.DB.prepare('DELETE FROM auth_tokens WHERE expires_at < ?').bind(Date.now() - 30 * 86400000).run();
  } catch { /* не падаем */ }
}
