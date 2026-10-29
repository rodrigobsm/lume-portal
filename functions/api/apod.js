// Cloudflare Pages Function: GET /api/apod
// Tela N do painel: uma foto espacial por dia, determinística.
// Fonte: NASA Image Library (images-api.nasa.gov) — sem chave, sem
// rate limit prático. O APOD (planetary/apod) foi abandonado em
// 2026-10-28: devolvia o placeholder "NASA Science" + logo para TODAS
// as datas testadas (jan–out/2026), com qualquer chave, então pular
// dias não adiantaria nada.
// Determinismo: o dia do ano (UTC) escolhe o tema (nebula/galaxy/
// star) e o índice dentro da página de 100 resultados — a mesma data
// dá sempre a mesma foto, sem estado no servidor. A URL preferida é
// ~medium.jpg (1280px, exata para o Portal); ~large.jpg e o primeiro
// link servem de fallback.
// Cache de 1h no edge (chave apod-v2, para não herdar o cache do
// placeholder do APOD); se a NASA falhar, serve o último cacheado;
// sem cache, ok:false e o painel pula a tela em silêncio.

var QUERIES = ['nebula', 'galaxy', 'star'];
var PAGE_SIZE = 100;

function pickImageUrl(item) {
  var links = (item && item.links) || [];
  var large = null, first = null;
  for (var i = 0; i < links.length; i++) {
    var href = links[i].href || '';
    if (!href) continue;
    if (!first) first = href;
    if (href.indexOf('~medium.jpg') !== -1) return href;
    if (href.indexOf('~large.jpg') !== -1) large = href;
  }
  return large || first;
}

function dayOfYearUTC(now) {
  var start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86400000);
}

async function fetchDailyPhoto() {
  var now = new Date();
  var doy = dayOfYearUTC(now);
  var q = QUERIES[doy % QUERIES.length];
  // 8s por tentativa: sem timeout, uma NASA lenta faz as tentativas
  // somarem mais que o limite da Function e a borda mata o worker
  // com um 502 genérico antes da função responder.
  var res = await fetch('https://images-api.nasa.gov/search?q=' + encodeURIComponent(q) + '&media_type=image&page_size=' + PAGE_SIZE, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumePortal/1.0)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('NASA Image Library HTTP ' + res.status);
  var j = await res.json();
  var items = (j && j.collection && j.collection.items) || [];
  if (!items.length) throw new Error('NASA Image Library sem itens');
  // A partir do índice do dia, anda para frente até achar um item com
  // título e URL (quase sempre o primeiro); volta ao início se preciso.
  var startIdx = Math.floor(doy / QUERIES.length) % items.length;
  for (var k = 0; k < items.length; k++) {
    var item = items[(startIdx + k) % items.length];
    var data = (item.data && item.data[0]) || {};
    var url = pickImageUrl(item);
    if (data.title && url) {
      return {
        date: (data.date_created || '').slice(0, 10),
        title: data.title,
        media_type: 'image',
        url: url,
        copyright: data.center || 'NASA'
      };
    }
  }
  throw new Error('NASA Image Library sem dados');
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/apod-v2', { method: 'GET' });

  var lastErr = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var apod = await fetchDailyPhoto();
      var body = JSON.stringify({ ok: true, time: new Date().toISOString(), apod: apod });
      var res = new Response(body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        }
      });
      context.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < 1) await sleep(600);
    }
  }

  var cached = await cache.match(cacheKey);
  if (cached) return cached;
  // Status 200 (não 502): no domínio customizado, a camada de proxy da
  // Cloudflare substitui o corpo de uma resposta 502 pela página de
  // erro genérica; com 200 o JSON chega intacto e o painel só olha ok.
  return new Response(JSON.stringify({ ok: false, error: 'APOD indisponível', detail: String(lastErr && lastErr.message || lastErr) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
