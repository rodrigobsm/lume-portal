// Cloudflare Pages Function: GET /api/news
// Agrega os RSS no servidor (sem problema de CORS), devolve JSON limpo e
// guarda em cache por 10 minutos. Se a agregação falhar ou vier vazia,
// serve o último cache válido para o Portal nunca ficar sem notícias.

import { aggregate } from '../_lib/aggregate.js';

export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/news', { method: 'GET' });

  try {
    var fresh = await aggregate(fetch);
    if (fresh.count > 0) {
      var res = new Response(JSON.stringify(fresh), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
          'Access-Control-Allow-Origin': '*'
        }
      });
      context.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    }
  } catch (e) {
    // cai para o cache abaixo
  }

  var cached = await cache.match(cacheKey);
  if (cached) return cached;

  return new Response(JSON.stringify({
    generated_at: new Date().toISOString(),
    count: 0,
    items: [],
    error: 'Nenhuma fonte disponível no momento'
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
