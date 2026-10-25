// Cloudflare Pages Function: GET /api/markets
// Busca os principais índices mundiais no Yahoo Finance (sem chave) e
// devolve JSON limpo com preço, variação do dia e closes do último mês
// para os mini-gráficos. Cache de 5 minutos; se falhar, o cliente usa
// o último dado salvo no navegador.

var SYMS = [
  { sym: '%5EGSPC', name: 'S&P 500', region: 'EUA' },
  { sym: '%5EDJI', name: 'Dow Jones', region: 'EUA' },
  { sym: '%5EIXIC', name: 'Nasdaq', region: 'EUA' },
  { sym: '%5EBVSP', name: 'Ibovespa', region: 'BRASIL' },
  { sym: '%5EFTSE', name: 'FTSE 100', region: 'EUROPA' },
  { sym: '%5EGDAXI', name: 'DAX', region: 'EUROPA' },
  { sym: '%5EN225', name: 'Nikkei 225', region: 'ÁSIA' },
  { sym: '%5EHSI', name: 'Hang Seng', region: 'ÁSIA' }
];

async function fetchOne(s) {
  try {
    var res = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/' + s.sym + '?range=1mo&interval=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return null;
    var j = await res.json();
    var r = j.chart && j.chart.result && j.chart.result[0];
    if (!r) return null;
    var meta = r.meta || {};
    var closes = ((r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [])
      .filter(function (v) { return v !== null && v !== undefined; });
    var price = meta.regularMarketPrice !== undefined && meta.regularMarketPrice !== null ? meta.regularMarketPrice : closes[closes.length - 1];
    var prev = meta.chartPreviousClose !== undefined && meta.chartPreviousClose !== null ? meta.chartPreviousClose : meta.previousClose;
    if (prev === undefined || prev === null) prev = closes[closes.length - 2];
    if (price === undefined || prev === undefined || prev === 0) return null;
    return {
      name: s.name,
      region: s.region,
      price: price,
      prev: prev,
      changePct: (price - prev) / prev * 100,
      spark: closes.slice(-22)
    };
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/markets', { method: 'GET' });

  try {
    var parts = await Promise.all(SYMS.map(fetchOne));
    var indices = parts.filter(function (x) { return x !== null; });
    if (!indices.length) throw new Error('Yahoo sem dados');
    var body = JSON.stringify({ ok: true, time: new Date().toISOString(), indices: indices });
    var res = new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      }
    });
    context.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    var cached = await cache.match(cacheKey);
    if (cached) return cached;
    return new Response(JSON.stringify({ ok: false, error: 'Mercados indisponíveis' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
