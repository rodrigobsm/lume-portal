// Cloudflare Pages Function: GET /api/og?url=<article URL>
// Busca a página da matéria e devolve a imagem og:image / twitter:image
// (geralmente a foto original em alta, enquanto o RSS entrega só a miniatura).
// Best-effort: qualquer falha devolve { image: null } e o frontend mantém
// a foto do RSS. Sucessos ficam em cache por 1 hora.

export async function onRequest(context) {
  var target = '';
  try {
    target = new URL(context.request.url).searchParams.get('url') || '';
  } catch (e) {}
  if (!/^https?:\/\//i.test(target)) {
    return new Response(JSON.stringify({ image: null }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/og?url=' + encodeURIComponent(target), { method: 'GET' });
  try {
    var hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch (e) {}

  var image = null;
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000);
    var res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      var html = await res.text();
      var metas = html.match(/<meta\b[^>]*>/gi) || [];
      for (var i = 0; i < metas.length; i++) {
        var tag = metas[i];
        if (/property=["']og:image["']/i.test(tag) || /name=["']twitter:image["']/i.test(tag)) {
          var cm = tag.match(/content=["']([^"']+)["']/i);
          if (cm && cm[1]) {
            var raw = cm[1].replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&#x26;/gi, '&');
            try { image = new URL(raw, target).href; } catch (e) { image = raw; }
            break;
          }
        }
      }
    }
  } catch (e) {}

  var out = new Response(JSON.stringify({ image: image }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
  if (image) {
    try { context.waitUntil(cache.put(cacheKey, out.clone())); } catch (e) {}
  }
  return out;
}
