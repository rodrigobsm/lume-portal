// Cloudflare Pages Function: GET /api/apod
// NASA Astronomy Picture of the Day, limpo para a tela N do painel.
// Usa NASA_API_KEY (secret do Pages) quando existir, senão DEMO_KEY.
// DEMO_KEY é instável (500 intermitente), então tenta até 2 vezes.
// Em dia de vídeo, devolve o thumbnail (thumbs=true) em vez do vídeo.
// Cache de 1h no edge; se a NASA falhar, serve o último cacheado;
// sem cache, ok:false e o painel pula a tela em silêncio.

async function fetchApod(key) {
  // 8s por tentativa: sem timeout, uma NASA lenta faz as tentativas
  // somarem mais que o limite da Function e a borda mata o worker
  // com um 502 genérico antes da função responder.
  var res = await fetch('https://api.nasa.gov/planetary/apod?api_key=' + key + '&thumbs=true', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumePortal/1.0)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('NASA HTTP ' + res.status);
  var j = await res.json();
  if (!j || !j.title || (!j.url && !j.thumbnail_url)) throw new Error('NASA sem dados');
  var isVideo = j.media_type === 'video';
  return {
    date: j.date || '',
    title: j.title,
    media_type: j.media_type || 'image',
    // Vídeo: thumbnail é a imagem segura; foto: hdurl, senão url.
    url: isVideo ? (j.thumbnail_url || j.url) : (j.hdurl || j.url),
    copyright: j.copyright || ''
  };
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/apod', { method: 'GET' });
  var key = (context.env && context.env.NASA_API_KEY) ? context.env.NASA_API_KEY : 'DEMO_KEY';

  var lastErr = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var apod = await fetchApod(key);
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
  return new Response(JSON.stringify({ ok: false, error: 'APOD indisponível', detail: String(lastErr && lastErr.message || lastErr) }), {
    status: 502,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
