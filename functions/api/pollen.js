// Cloudflare Pages Function: GET /api/pollen
// Tenta buscar o índice de pólen de Acworth (ZIP 30101) no Pollen.com
// (sem chave). O endpoint bloqueia parte do tráfego automatizado; se
// falhar, devolve ok:false e o cliente esconde a seção de pólen da
// tela de qualidade do ar (o AQI continua funcionando normal).

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function pick() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== null && arguments[i] !== undefined) return arguments[i];
  }
  return null;
}

function extract(j) {
  var day = null;
  if (j) {
    if (j.Days && j.Days.length) day = j.Days[0];
    else if (j.days && j.days.length) day = j.days[0];
    else if (j.current) day = j.current;
    else if (j.forecast && j.forecast.length) day = j.forecast[0];
  }
  if (!day) return null;
  var tree = pick(num(day.Tree && day.Tree.Index), num(day.tree), num(day.TreeIndex));
  var grass = pick(num(day.Grass && day.Grass.Index), num(day.grass), num(day.GrassIndex));
  var weed = pick(num(day.Weed && day.Weed.Index), num(day.weed), num(day.WeedIndex));
  var index = pick(num(day.Index), num(day.index));
  if (index === null && tree === null && grass === null && weed === null) return null;
  return { ok: true, city: 'Acworth, GA', index: index, tree: tree, grass: grass, weed: weed };
}

export async function onRequest(context) {
  try {
    var res = await fetch('https://www.pollen.com/api/forecast/current/pollen/30101', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://www.pollen.com/'
      }
    });
    if (!res.ok) throw new Error('Pollen ' + res.status);
    var j = await res.json();
    var data = extract(j);
    if (!data) throw new Error('Pollen sem dados');
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
