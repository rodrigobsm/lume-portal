// Cloudflare Pages Function: GET /api/alerts[?point=lat,lon][&lang=en]
// Alertas meteorológicos do NWS (Serviço Nacional de Meteorologia dos EUA)
// para o ponto de Acworth, GA por padrão. Só retorna avisos severos (Extreme/Severe),
// para o selo não aparecer por qualquer comunicado de rotina. Se o NWS
// falhar, devolve alert:null e o selo fica escondido — nunca quebra a página.
// Lume Portal passa ?point= com a cidade da config; ponto inválido ou
// ausente cai para Acworth, o comportamento de sempre.
// ?lang=en devolve o nome do evento em inglês cru do weather.gov; sem ele,
// o nome é traduzido pelo mapa PT abaixo (comportamento de sempre).

var DEFAULT_POINT = '34.0658,-84.6769';
var UA = 'PortalNews/1.0 (contact@travustech.com)';

var PT = {
  'Tornado Warning': 'Alerta de Tornado',
  'Tornado Watch': 'Vigilância de Tornado',
  'Severe Thunderstorm Warning': 'Tempestade Severa',
  'Severe Thunderstorm Watch': 'Vigilância de Tempestade',
  'Severe Weather Statement': 'Alerta de Tempo Severo',
  'Flash Flood Warning': 'Enchente Repentina',
  'Flash Flood Watch': 'Vigilância de Enchente',
  'Flood Warning': 'Alerta de Enchente',
  'Flood Watch': 'Vigilância de Enchente',
  'High Wind Warning': 'Vento Forte',
  'Winter Storm Warning': 'Tempestade de Inverno',
  'Winter Storm Watch': 'Vigilância de Tempestade de Inverno',
  'Red Flag Warning': 'Risco de Incêndio'
};

function pointFrom(requestUrl) {
  try {
    var p = new URL(requestUrl).searchParams.get('point') || '';
    var m = p.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if (!m) return DEFAULT_POINT;
    var lat = parseFloat(m[1]);
    var lon = parseFloat(m[2]);
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return DEFAULT_POINT;
    return lat + ',' + lon;
  } catch (e) { return DEFAULT_POINT; }
}

export async function onRequest(context) {
  try {
    var res = await fetch('https://api.weather.gov/alerts/active?point=' + pointFrom(context.request.url), {
      headers: { 'User-Agent': UA, 'Accept': 'application/geo+json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var feats = (data.features || []).filter(function (f) {
      var s = f.properties && f.properties.severity;
      return s === 'Extreme' || s === 'Severe';
    });
    feats.sort(function (a, b) {
      var ra = a.properties.severity === 'Extreme' ? 0 : 1;
      var rb = b.properties.severity === 'Extreme' ? 0 : 1;
      return ra - rb;
    });
    var alert = null;
    if (feats.length) {
      var p = feats[0].properties;
      var langEn = false;
      try { langEn = new URL(context.request.url).searchParams.get('lang') === 'en'; } catch (e) {}
      alert = { event: langEn ? p.event : (PT[p.event] || p.event), severity: p.severity };
    }
    return new Response(JSON.stringify({ alert: alert }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ alert: null }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
