// Upcoming space launches worldwide (The Space Devs Launch Library 2,
// free, no key). Returns the next ~30 launches sorted by liftoff, with
// a US flag per launch; the panel picks the hero (next US launch) and
// groups the rest by day. Edge-cached 1h so LL2 sees ~1 req/hour.
// Restored 2026-10-31: the panel calls this same-origin endpoint instead
// of LL2 directly, because direct calls from the Portal's old WebView
// proved unreliable (shared-IP throttle). On total failure the last good
// snapshot is served; the panel drops launches that already flew.
export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/launches-v1', { method: 'GET' });
  var lastErr = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30', {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json', 'User-Agent': 'LumePortal/1.0' }
      });
      if (!res.ok) throw new Error('LL2 HTTP ' + res.status);
      var j = await res.json();
      var launches = (j.results || []).map(function (l) {
        if (!l || !l.net) return null;
        var pad = l.pad || {};
        var loc = pad.location || {};
        var status = l.status || {};
        var abbrev = (status.abbrev || '').toLowerCase();
        var rocket = (l.rocket && l.rocket.configuration) || {};
        return {
          name: l.name || '',
          mission: (l.mission && l.mission.name) || '',
          rocket: rocket.name || '',
          provider: (l.launch_service_provider && l.launch_service_provider.name) || '',
          padName: pad.name || '',
          padLocation: loc.name || '',
          country: loc.country_code || '',
          net: l.net,
          status: abbrev === 'go' ? 'go' : (abbrev === 'tbd' ? 'tbd' : 'other'),
          statusName: status.name || '',
          image: l.image || null,
          isUS: loc.country_code === 'USA'
        };
      }).filter(function (x) { return !!x; }).sort(function (a, b) { return new Date(a.net) - new Date(b.net); });
      var body = JSON.stringify({ ok: true, launches: launches });
      var out = new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
      context.waitUntil(cache.put(cacheKey, out.clone()));
      return out;
    } catch (e) {
      lastErr = e;
      if (String(e).indexOf('429') !== -1) break; // throttled: retrying only burns quota
      await new Promise(function (r) { setTimeout(r, 600); });
    }
  }
  var cached = await cache.match(cacheKey);
  if (cached) return cached;
  return new Response(JSON.stringify({ ok: false, detail: String(lastErr) }), { headers: { 'Content-Type': 'application/json' } });
}
