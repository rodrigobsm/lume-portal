// Cloudflare Pages Function: GET /api/alerts
// Alertas meteorológicos do NWS (Serviço Nacional de Meteorologia dos EUA)
// para o ponto de Acworth, GA. Só retorna avisos severos (Extreme/Severe),
// para o selo não aparecer por qualquer comunicado de rotina. Se o NWS
// falhar, devolve alert:null e o selo fica escondido — nunca quebra a página.

var NWS_URL = 'https://api.weather.gov/alerts/active?point=34.0658,-84.6769';
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

export async function onRequest(context) {
  try {
    var res = await fetch(NWS_URL, {
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
      alert = { event: PT[p.event] || p.event, severity: p.severity };
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
