// Cloudflare Pages Function: GET /api/sports
// Scores from ESPN's public scoreboard API (no key, no account) + team
// lists for the /pair/ favorite-team picker. Two modes:
//   ?leagues=nfl,nba,bra  -> today's games per league, normalized
//   ?teams=nfl             -> team list {id, abbr, name, logo}
// A league that fails just drops out (partial results); all-fail falls
// back to the edge cache, then 200 + {ok:false} (custom-domain 502
// lesson: never answer 502, the proxy replaces the body). The panel
// skips the Sports screen silently when there are no games.

var LEAGUES = {
  nfl: { path: 'football/nfl', name: 'NFL' },
  nba: { path: 'basketball/nba', name: 'NBA' },
  mlb: { path: 'baseball/mlb', name: 'MLB' },
  nhl: { path: 'hockey/nhl', name: 'NHL' },
  mls: { path: 'soccer/usa.1', name: 'MLS' },
  bra: { path: 'soccer/bra.1', name: 'Brasileirão' },
  epl: { path: 'soccer/eng.1', name: 'Premier League' },
  laliga: { path: 'soccer/esp.1', name: 'La Liga' }
};

var UA = 'Mozilla/5.0 (compatible; LumePortal/1.0)';

function teamLogo(t) {
  if (!t) return '';
  if (typeof t.logo === 'string' && t.logo) return t.logo;
  if (Array.isArray(t.logos) && t.logos.length && t.logos[0].href) return t.logos[0].href;
  return '';
}

// One scoreboard event -> normalized game, or null if unusable.
function normGame(ev, leagueId) {
  if (!ev || typeof ev !== 'object') return null;
  var comp = (ev.competitions && ev.competitions[0]) || {};
  var home = null;
  var away = null;
  (comp.competitors || []).forEach(function (c) {
    if (!c || !c.team) return;
    var t = {
      abbr: c.team.abbreviation || '',
      name: c.team.displayName || c.team.shortDisplayName || '',
      logo: teamLogo(c.team),
      score: (c.score === undefined || c.score === null) ? '' : String(c.score)
    };
    if (c.homeAway === 'home') home = t;
    else if (c.homeAway === 'away') away = t;
  });
  if (!home || !away || !home.abbr || !away.abbr) return null;
  var st = (ev.status && ev.status.type) || {};
  return {
    league: leagueId,
    date: ev.date || '',
    state: st.state || '',
    detail: st.detail || '',
    shortDetail: st.shortDetail || '',
    home: home,
    away: away
  };
}

async function fetchLeague(id) {
  try {
    var res = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + LEAGUES[id].path + '/scoreboard', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    var j = await res.json();
    var games = [];
    (j.events || []).forEach(function (ev) {
      var g = normGame(ev, id);
      if (g) games.push(g);
    });
    return { id: id, name: LEAGUES[id].name, games: games };
  } catch (e) {
    return null;
  }
}

async function fetchTeams(id) {
  try {
    var res = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + LEAGUES[id].path + '/teams', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    var j = await res.json();
    var raw = [];
    try { raw = j.sports[0].leagues[0].teams || []; } catch (e) { raw = []; }
    var teams = [];
    raw.forEach(function (entry) {
      var t = entry && entry.team;
      if (!t || !t.abbreviation) return;
      teams.push({
        id: String(t.id || t.abbreviation),
        abbr: t.abbreviation,
        name: t.displayName || t.shortDisplayName || t.abbreviation,
        logo: teamLogo(t)
      });
    });
    teams.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
    return teams;
  } catch (e) {
    return null;
  }
}

function okResponse(obj, maxAge, cache, cacheKey, context) {
  var res = new Response(JSON.stringify(obj), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=' + maxAge,
      'Access-Control-Allow-Origin': '*'
    }
  });
  if (cache && cacheKey) context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local' + url.pathname + url.search, { method: 'GET' });

  // Team list for one league (used by /pair/).
  var teamsLeague = url.searchParams.get('teams');
  if (teamsLeague) {
    if (!LEAGUES[teamsLeague]) {
      return new Response(JSON.stringify({ ok: false, error: 'unknown_league' }), {
        status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    try {
      var teams = await fetchTeams(teamsLeague);
      if (!teams || !teams.length) throw new Error('no teams');
      return okResponse({ ok: true, league: teamsLeague, teams: teams }, 86400, cache, cacheKey, context);
    } catch (e) {
      var cached = await cache.match(cacheKey);
      if (cached) return cached;
      return new Response(JSON.stringify({ ok: false, error: 'teams_unavailable' }), {
        status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }

  // Scores for the requested leagues.
  var ids = (url.searchParams.get('leagues') || '').split(',').map(function (s) { return s.trim(); })
    .filter(function (id) { return !!LEAGUES[id]; });
  if (!ids.length) {
    return new Response(JSON.stringify({ ok: false, error: 'no_leagues' }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  try {
    var parts = await Promise.all(ids.map(fetchLeague));
    var leagues = parts.filter(function (x) { return x !== null; });
    if (!leagues.length) throw new Error('ESPN sem dados');
    return okResponse({ ok: true, time: new Date().toISOString(), leagues: leagues }, 300, cache, cacheKey, context);
  } catch (e) {
    var cachedScores = await cache.match(cacheKey);
    if (cachedScores) return cachedScores;
    return new Response(JSON.stringify({ ok: false, error: 'sports_unavailable' }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
