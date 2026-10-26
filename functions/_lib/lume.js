// Shared validation/normalization for Lume Portal device configs.
// Used by /api/lume/config and /api/lume/pair. Keep in sync with the
// known feeds in functions/_lib/aggregate.js (name + category).

export var CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export var FEED_IDS = [
  'g1-brasil', 'cnn-brasil', 'agencia-brasil', 'g1-mundo', 'bbc-brasil',
  'fox-news', 'fox5-atlanta', 'canaltech', 'olhar-digital', 'tecnoblog',
  'g1-tecnologia'
];

export var SCREEN_KEYS = ['C', 'W', 'K', 'B', 'A', 'M', 'F'];

export var FEED_CATEGORIES = ['brasil', 'mundo', 'tech', 'eua', 'atlanta'];

export function validCode(code) {
  return typeof code === 'string' && CODE_RE.test(code);
}

function isNum(n) { return typeof n === 'number' && isFinite(n); }

function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

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
  var screens = {};
  var ssrc = (src.screens && typeof src.screens === 'object') ? src.screens : {};
  SCREEN_KEYS.forEach(function (k) { screens[k] = ssrc[k] !== false; });
  cfg.screens = screens;
  var fsrc = (src.feeds && typeof src.feeds === 'object') ? src.feeds : {};
  var enabled = Array.isArray(fsrc.enabled)
    ? fsrc.enabled.filter(function (id) { return FEED_IDS.indexOf(id) !== -1; }).slice(0, 30)
    : FEED_IDS.slice();
  var custom = [];
  if (Array.isArray(fsrc.custom)) {
    fsrc.custom.slice(0, 10).forEach(function (c) {
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
