// Shared validation/normalization for Lume Portal device configs.
// Used by /api/lume/config and /api/lume/pair. Keep in sync with the
// known feeds in functions/_lib/aggregate.js (name + category).

export var CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export var FEED_IDS = [
  'g1-brasil', 'cnn-brasil', 'agencia-brasil', 'g1-mundo', 'bbc-brasil',
  'fox-news', 'fox5-atlanta', 'canaltech', 'olhar-digital', 'tecnoblog',
  'g1-tecnologia'
];

export var SCREEN_KEYS = ['C', 'W', 'K', 'B', 'A', 'M', 'F', 'P', 'D', 'N', 'L', 'S'];

// Sports leagues offered on /pair/ (id -> ESPN sport/league path lives
// in functions/api/sports.js). Defaults mirror the project's US + Brazil
// audience; an empty leagues list hides the Sports screen.
export var SPORT_LEAGUES = ['nfl', 'nba', 'mlb', 'nhl', 'mls', 'bra', 'epl', 'laliga'];
export var SPORT_DEFAULT_LEAGUES = ['nfl', 'nba', 'mlb', 'bra'];

export var FEED_CATEGORIES = ['brasil', 'mundo', 'tech', 'eua', 'atlanta'];

export function validCode(code) {
  return typeof code === 'string' && CODE_RE.test(code);
}

function isNum(n) { return typeof n === 'number' && isFinite(n); }

function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

// Accepts a full Drive folder link (…/drive/folders/<ID>, …?id=<ID>) or a
// bare folder ID; anything else normalizes to '' (no photos screen).
function driveFolderId(v) {
  if (typeof v !== 'string') return '';
  var s = v.trim();
  if (!s) return '';
  var m = s.match(/\/folders\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m) return m[1].slice(0, 100);
  if (/^[A-Za-z0-9_-]{10,100}$/.test(s)) return s;
  return '';
}

export function normalizeConfig(input) {
  var cfg = {};
  var src = (input && typeof input === 'object') ? input : {};
  cfg.language = (src.language === 'pt-BR' || src.language === 'en-US') ? src.language : 'en-US';
  var city = (src.city && typeof src.city === 'object') ? src.city : {};
  var lat = isNum(city.lat) ? city.lat : 34.0658;
  var lon = isNum(city.lon) ? city.lon : -84.6769;
  if (lat < -90) lat = -90;
  if (lat > 90) lat = 90;
  if (lon < -180) lon = -180;
  if (lon > 180) lon = 180;
  cfg.city = { name: str(city.name, 80) || 'Acworth, GA', lat: lat, lon: lon };
  cfg.clockFormat = (src.clockFormat === '24h') ? '24h' : '12h';
  cfg.tempUnit = (src.tempUnit === 'F') ? 'F' : 'C';
  var DURATIONS = [5, 10, 15, 20, 25, 30, 60];
  cfg.slideDuration = DURATIONS.indexOf(src.slideDuration) !== -1 ? src.slideDuration : 15;
  // News slides in a row before a special screen (1-8, default 4).
  var npb = parseInt(src.newsPerBlock, 10);
  cfg.newsPerBlock = (npb >= 1 && npb <= 8) ? npb : 4;
  cfg.photosFolder = driveFolderId(src.photosFolder);
  // Countdown event: needs a title and a real YYYY-MM-DD date; an
  // optional photo URL (http/https) overrides the default background.
  // Anything incomplete normalizes to null (no countdown screen).
  var cd = (src.countdown && typeof src.countdown === 'object') ? src.countdown : {};
  var cdTitle = str(cd.title, 80).trim();
  var cdDate = (typeof cd.date === 'string') ? cd.date.trim() : '';
  var cdOk = /^\d{4}-\d{2}-\d{2}$/.test(cdDate);
  if (cdOk) {
    var pp = cdDate.split('-');
    var dd = new Date(parseInt(pp[0], 10), parseInt(pp[1], 10) - 1, parseInt(pp[2], 10));
    cdOk = !isNaN(dd.getTime()) && dd.getFullYear() === parseInt(pp[0], 10) && dd.getMonth() === parseInt(pp[1], 10) - 1 && dd.getDate() === parseInt(pp[2], 10);
  }
  var cdPhoto = (typeof cd.photo === 'string' && /^https?:\/\//i.test(cd.photo.trim())) ? cd.photo.trim().slice(0, 500) : '';
  cfg.countdown = (cdTitle && cdOk) ? { title: cdTitle, date: cdDate, photo: cdPhoto } : null;
  // Sports: leagues the user wants (absent = defaults; present but
  // empty = hide the Sports screen). Favorite team: {league, abbr,
  // name} or null; the panel highlights that team's games.
  var spsrc = (src.sports && typeof src.sports === 'object') ? src.sports : null;
  var leagues = (spsrc && Array.isArray(spsrc.leagues))
    ? spsrc.leagues.filter(function (id) { return SPORT_LEAGUES.indexOf(id) !== -1; }).slice(0, 8)
    : SPORT_DEFAULT_LEAGUES.slice();
  var fav = null;
  if (spsrc && spsrc.favorite && typeof spsrc.favorite === 'object') {
    var fLeague = spsrc.favorite.league;
    var fAbbr = (typeof spsrc.favorite.abbr === 'string') ? spsrc.favorite.abbr.trim().toUpperCase() : '';
    var fName = str(spsrc.favorite.name, 80).trim();
    if (SPORT_LEAGUES.indexOf(fLeague) !== -1 && /^[A-Z0-9]{2,5}$/.test(fAbbr)) {
      fav = { league: fLeague, abbr: fAbbr, name: fName };
    }
  }
  cfg.sports = { leagues: leagues, favorite: fav };
  var screens = {};
  var ssrc = (src.screens && typeof src.screens === 'object') ? src.screens : {};
  SCREEN_KEYS.forEach(function (k) { screens[k] = ssrc[k] !== false; });
  cfg.screens = screens;
  // Slide order: keep only known codes, dedupe, append any missing codes
  // at the end, so old configs without screenOrder stay valid (default order).
  var order = [];
  if (Array.isArray(src.screenOrder)) {
    src.screenOrder.forEach(function (k) {
      if (SCREEN_KEYS.indexOf(k) !== -1 && order.indexOf(k) === -1) order.push(k);
    });
  }
  SCREEN_KEYS.forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
  cfg.screenOrder = order;
  // World-clock cities: up to 5 {name, timezone} entries. Timezone strings
  // are sanitized here; the dashboard skips entries Intl rejects.
  var wc = [];
  if (Array.isArray(src.worldClock)) {
    src.worldClock.slice(0, 5).forEach(function (w) {
      if (!w || typeof w !== 'object') return;
      var name = str(w.name, 80).trim();
      var tz = typeof w.timezone === 'string' ? w.timezone.trim() : '';
      if (!name || !tz || tz.length > 80 || !/^[A-Za-z0-9_\/+-]+$/.test(tz)) return;
      wc.push({ name: name, timezone: tz });
    });
  }
  cfg.worldClock = wc;
  var fsrc = (src.feeds && typeof src.feeds === 'object') ? src.feeds : {};
  var enabled = Array.isArray(fsrc.enabled)
    ? fsrc.enabled.filter(function (id) { return FEED_IDS.indexOf(id) !== -1; }).slice(0, 30)
    : FEED_IDS.slice();
  var custom = [];
  if (Array.isArray(fsrc.custom)) {
    fsrc.custom.slice(0, 30).forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var name = str(c.name, 60).trim();
      var url = typeof c.url === 'string' ? c.url.trim() : '';
      var cat = FEED_CATEGORIES.indexOf(c.category) !== -1 ? c.category : 'brasil';
      if (!name || !/^https?:\/\//i.test(url) || url.length > 500) return;
      custom.push({ name: name, url: url, category: cat });
    });
  }
  cfg.feeds = { enabled: enabled, custom: custom };
  return cfg;
}

export function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
