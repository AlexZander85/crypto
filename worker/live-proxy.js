// КриптоНавигатор · прокси живых данных (Cloudflare Worker, бесплатный тариф)
// Деплой: npx wrangler deploy worker/live-proxy.js --name crypto-navigator-live
// Затем в приложении: localStorage.setItem('cn_live_api_base', 'https://crypto-navigator-live.<твой>.workers.dev')
//
// Маршруты (ответ всегда в едином формате приложения):
//   GET /api/live/orderbook?symbol=BTCUSDT
//   GET /api/live/klines?symbol=BTCUSDT&tf=1h&limit=48
//   GET /api/live/funding?symbol=BTCUSDT
//   GET /api/live/fng
//   GET /api/live/btc-fees
//   GET /api/live/global
//
// Кэш 45 сек на маршрут (память инстанса), цепочки источников с фолбэком.

const CACHE_TTL_MS = 45_000;
const cache = new Map();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra }
  });
}

async function getJSON(url, headers = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': 'CryptoNavigator-Live/1.0', ...headers }, cf: { cacheTtl: 30 } });
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  return r.json();
}

// ---------- нормализаторы ----------
function normOrderbookOKX(d) {
  const row = d.data && d.data[0];
  if (!row) throw new Error('OKX: пустой стакан');
  return {
    source: 'okx', ts: +row.ts || Date.now(),
    bids: row.bids.map(x => [+x[0], +x[1]]),
    asks: row.asks.map(x => [+x[0], +x[1]])
  };
}
function normOrderbookKraken(d) {
  const k = Object.keys(d.result || {})[0];
  if (!k) throw new Error('Kraken: пустой стакан');
  const row = d.result[k];
  return {
    source: 'kraken', ts: Date.now(),
    bids: row.bids.map(x => [+x[0], +x[1]]),
    asks: row.asks.map(x => [+x[0], +x[1]])
  };
}
function normKlinesOKX(d) {
  // OKX отдаёт новые свечи первыми — разворачиваем в хронологию
  return {
    source: 'okx', ts: Date.now(),
    candles: (d.data || []).slice().reverse().map(c => ({
      t: +c[0], o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5]
    }))
  };
}
function normFundingOKX(d) {
  const row = d.data && d.data[0];
  if (!row) throw new Error('OKX: нет фандинга');
  return {
    source: 'okx', ts: +row.fundingTime || Date.now(),
    rate: +row.fundingRate,
    nextRate: row.nextFundingRate !== '' && row.nextFundingRate != null ? +row.nextFundingRate : null
  };
}
function normFNG(d) {
  const list = (d.data || []).map(x => ({ ts: +x.timestamp * 1000, value: +x.value, label: x.value_classification }));
  if (!list.length) throw new Error('FNG: пусто');
  return { source: 'alternative.me', ts: list[0].ts, current: list[0], history: list };
}
function normFees(d) {
  return {
    source: 'mempool.space', ts: Date.now(),
    fastest: d.fastestFee, halfHour: d.halfHourFee, hour: d.hourFee, economy: d.economyFee, minimum: d.minimumFee
  };
}
function normGlobal(d) {
  const g = d.data || {};
  return {
    source: 'coingecko', ts: Date.now(),
    btcDominance: g.market_cap_percentage && g.market_cap_percentage.btc,
    ethDominance: g.market_cap_percentage && g.market_cap_percentage.eth,
    totalMcapUsd: g.total_market_cap && g.total_market_cap.usd,
    mcapChange24h: g.market_cap_change_percentage_24h_usd,
    coins: g.active_cryptocurrencies
  };
}

// ---------- маршруты ----------
async function route(path, q) {
  switch (path) {
    case '/api/live/orderbook': {
      try {
        return normOrderbookOKX(await getJSON('https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=50'));
      } catch (e) {
        return normOrderbookKraken(await getJSON('https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=50'));
      }
    }
    case '/api/live/klines': {
      const limit = Math.min(+(q.get('limit')) || 48, 100);
      return normKlinesOKX(await getJSON('https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1H&limit=' + limit));
    }
    case '/api/live/funding':
      return normFundingOKX(await getJSON('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP'));
    case '/api/live/fng':
      return normFNG(await getJSON('https://api.alternative.me/fng/?limit=30&format=json'));
    case '/api/live/btc-fees':
      return normFees(await getJSON('https://mempool.space/api/v1/fees/recommended'));
    case '/api/live/global':
      return normGlobal(await getJSON('https://api.coingecko.com/api/v3/global'));
    case '/api/live/news': {
      const FEEDS = [
        { id: 'forklog', name: 'ForkLog', lang: 'ru', url: 'https://forklog.com/feed' },
        { id: 'beincrypto', name: 'BeInCrypto RU', lang: 'ru', url: 'https://ru.beincrypto.com/feed/' },
        { id: 'coindesk', name: 'CoinDesk', lang: 'en', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
        { id: 'decrypt', name: 'Decrypt', lang: 'en', url: 'https://decrypt.co/feed' },
        { id: 'sec', name: 'SEC', lang: 'en', reg: true, url: 'https://www.sec.gov/news/pressreleases.rss' }
      ];
      const items = [];
      for (const f of FEEDS) {
        try {
          const rss = await getJSON('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(f.url));
          if (rss.status !== 'ok') continue;
          (rss.items || []).slice(0, 15).forEach(it => items.push({
            title: (it.title || '').trim(), url: it.link || '', source: f.name, feedId: f.id,
            lang: f.lang, reg: !!f.reg, published_at: it.pubDate || '',
            snippet: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 300), categories: it.categories || []
          }));
        } catch (e) {}
      }
      items.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
      return { source: 'worker', ts: Date.now(), items: items };
    }
    default:
      return null;
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/live/')) return json({ error: 'not found' }, 404);

    const key = url.pathname + url.search;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return json({ ...hit.data, cached: true }, 200, { 'X-Live-Cache': 'hit' });
    }
    try {
      const data = await route(url.pathname, url.searchParams);
      if (!data) return json({ error: 'not found' }, 404);
      cache.set(key, { ts: Date.now(), data });
      return json(data, 200, { 'X-Live-Cache': 'miss' });
    } catch (e) {
      if (hit) return json({ ...hit.data, cached: true, stale: true }, 200, { 'X-Live-Cache': 'stale' });
      return json({ error: 'upstream unavailable', detail: String(e && e.message || e) }, 502);
    }
  }
};
