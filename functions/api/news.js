// Cloudflare Pages Function: GET /api/news[?code=XXXXXX]
// Agrega os RSS no servidor (sem problema de CORS), devolve JSON limpo e
// guarda em cache por 10 minutos. Se a agregação falhar ou vier vazia,
// serve o último cache válido para o Portal nunca ficar sem notícias.
// Com ?code= válido e pareado (config Lume Portal em KV), usa os feeds
// da config (ids habilitados + RSS personalizados) em vez dos 11 padrões.
// Sem código, código inválido, sem pareamento ou qualquer erro: os 11
// padrões — o comportamento de sempre, sem exceção.

import { aggregate } from '../_lib/aggregate.js';
import { validCode } from '../_lib/lume.js';

export async function onRequest(context) {
  var cache = caches.default;
  var url = new URL(context.request.url);
  var code = url.searchParams.get('code') || '';
  var useCode = validCode(code);
  var cacheKey = new Request(
    'https://portal-news.local/api/news' + (useCode ? '?code=' + code : ''),
    { method: 'GET' }
  );

  try {
    var fresh;
    if (useCode) {
      var cfg = null;
      try {
        var kv = context.env && context.env.LUME_KV;
        if (kv) {
          var raw = await kv.get('config:' + code);
          if (raw) { try { cfg = JSON.parse(raw); } catch (e) { cfg = null; } }
        }
      } catch (e) { cfg = null; }
      fresh = cfg && cfg.feeds ? await aggregate(fetch, cfg.feeds) : await aggregate(fetch);
    } else {
      fresh = await aggregate(fetch);
    }
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
