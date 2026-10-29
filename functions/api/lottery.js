// Cloudflare Pages Function: GET /api/lottery
// Loterias sem API pública gratuita: lê as páginas do lotteryusa.com
// (HTML público, ~330-450 KB) e extrai próximo prêmio, próximo sorteio
// e últimos números. Powerball + Mega Millions (EUA) + Fantasy 5 (Geórgia).
// Scrape é frágil por natureza: cada jogo é validado sozinho; se um
// falhar, os outros ainda voltam; se todos falharem, ok:false e o
// painel pula a tela em silêncio (ou usa o último cache, 15 min).

var GAMES = [
  { id: 'powerball', name: 'Powerball', url: 'https://www.lotteryusa.com/powerball/' },
  { id: 'mega', name: 'Mega Millions', url: 'https://www.lotteryusa.com/mega-millions/' },
  { id: 'fantasy5', name: 'Georgia Fantasy 5', url: 'https://www.lotteryusa.com/georgia/fantasy-5/' }
];

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

// Extrai um jogo do HTML. Devolve null se faltar prêmio, próximo
// sorteio ou os 5 números principais.
export function parseLotteryPage(html) {
  if (typeof html !== 'string' || !html) return null;

  // Prêmio do próximo sorteio: caixa "Next est. jackpot".
  var jIdx = html.indexOf('Next est. jackpot');
  if (jIdx === -1) return null;
  var jWin = html.slice(jIdx, jIdx + 1500);
  var jM = jWin.match(/c-state-short-info__subtitle">\s*(\$[\d,]+(?:\.\d+)?\s*(?:Million|Billion)?)/);
  if (!jM) return null;
  var jackpot = clean(jM[1]);
  var cash = '';
  var cM = jWin.match(/Cash value:\s*(\$[\d,]+(?:\.\d+)?\s*(?:Million|Billion)?)/);
  if (cM) cash = clean(cM[1]);

  // Próximo sorteio: <time> logo após o ícone "next draw icon".
  var nIdx = html.indexOf('alt="next draw icon"');
  if (nIdx === -1) return null;
  var nWin = html.slice(nIdx, nIdx + 1200);
  var nM = nWin.match(/<time[^>]*>\s*([^<]+?)\s*<\/time>/);
  if (!nM) return null;
  var nextDraw = clean(nM[1]);

  // Últimos números: primeiro c-draw-card__ball-box (o sorteio mais
  // recente). Data do sorteio vem do cabeçalho do mesmo cartão.
  var bIdx = html.indexOf('c-draw-card__ball-box');
  if (bIdx === -1) return null;
  var dateWin = html.slice(Math.max(0, bIdx - 2500), bIdx);
  var dM = dateWin.match(/c-draw-card__draw-date-dow">\s*([^<]*?)\s*<\/span>[\s\S]{0,300}?c-draw-card__draw-date-sub">\s*([^<]+?)\s*<\/span>/);
  var latestDate = dM ? clean((dM[1] + ' ' + dM[2]).replace(/\s+,/g, ',')) : '';
  var boxEnd = html.indexOf('</ul>', bIdx);
  if (boxEnd === -1) return null;
  var box = html.slice(bIdx, boxEnd);
  var balls = [];
  var ballRe = /<li class="c-ball c-ball--sm">(\d+)<\/li>/g;
  var bm;
  while ((bm = ballRe.exec(box)) !== null) balls.push(bm[1]);
  if (balls.length < 5) return null;
  // Bônus (Powerball/Mega Ball) tem classe de cor própria (--red/--yellow);
  // Fantasy 5 não tem bônus.
  var bonus = null;
  var boM = box.match(/c-result__bonus">[\s\S]{0,400}?<span class="c-ball[^"]*">(\d+)<\/span>/);
  if (boM) bonus = boM[1];

  return { jackpot: jackpot, cash: cash, nextDraw: nextDraw, latestDate: latestDate, balls: balls, bonus: bonus };
}

async function fetchGame(g) {
  try {
    var res = await fetch(g.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LumePortal/1.0)',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return null;
    var html = await res.text();
    var parsed = parseLotteryPage(html);
    if (!parsed) return null;
    parsed.id = g.id;
    parsed.name = g.name;
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  var cache = caches.default;
  var cacheKey = new Request('https://portal-news.local/api/lottery', { method: 'GET' });

  try {
    var parts = await Promise.all(GAMES.map(fetchGame));
    var games = parts.filter(function (x) { return x !== null; });
    if (!games.length) throw new Error('LotteryUSA sem dados');
    var body = JSON.stringify({ ok: true, time: new Date().toISOString(), games: games });
    var res = new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=900',
        'Access-Control-Allow-Origin': '*'
      }
    });
    context.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    var cached = await cache.match(cacheKey);
    if (cached) return cached;
    return new Response(JSON.stringify({ ok: false, error: 'Loteria indisponível' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
