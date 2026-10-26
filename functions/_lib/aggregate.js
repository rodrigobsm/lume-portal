// Agregador de notícias em português para o Portal News.
// Sem dependências: roda em Cloudflare Workers e em Node 18+.
// Fontes: RSS públicos, gratuitos e legalmente acessíveis. Nada é inventado:
// título, fonte, data, URL e foto vêm direto do feed de cada veículo.

export var FEEDS = [
  { id: 'g1-brasil', name: 'G1', url: 'https://g1.globo.com/rss/g1/brasil/', category: 'brasil' },
  { id: 'cnn-brasil', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/', category: 'brasil' },
  { id: 'agencia-brasil', name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'brasil' },
  { id: 'g1-mundo', name: 'G1', url: 'https://g1.globo.com/rss/g1/mundo/', category: 'mundo' },
  { id: 'bbc-brasil', name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', category: 'mundo' },
  { id: 'fox-news', name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml', category: 'eua' },
  { id: 'fox5-atlanta', name: 'Fox 5 Atlanta', url: 'https://www.fox5atlanta.com/rss/category/local-news', category: 'atlanta' },
  { id: 'canaltech', name: 'Canaltech', url: 'https://canaltech.com.br/rss/', category: 'tech' },
  { id: 'olhar-digital', name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/', category: 'tech' },
  { id: 'tecnoblog', name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/', category: 'tech' },
  { id: 'g1-tecnologia', name: 'G1', url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'tech' }
];

// Lume Portal per-device feeds: { enabled: [known feed ids], custom: [{name,url,category}] }.
// Stored configs are already normalized by /api/lume/pair, but this validates
// again so a raw override can never inject a bad feed. Absent override => all 11.
function resolveFeeds(override) {
  if (!override || typeof override !== 'object') return FEEDS;
  var list = [];
  if (Array.isArray(override.enabled)) {
    FEEDS.forEach(function (f) { if (override.enabled.indexOf(f.id) !== -1) list.push(f); });
  } else {
    list = FEEDS.slice();
  }
  if (Array.isArray(override.custom)) {
    override.custom.slice(0, 10).forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var name = typeof c.name === 'string' ? c.name.trim() : '';
      var url = typeof c.url === 'string' ? c.url.trim() : '';
      var cat = ['brasil', 'mundo', 'tech', 'eua', 'atlanta'].indexOf(c.category) !== -1 ? c.category : 'brasil';
      if (!name || !/^https?:\/\//i.test(url) || url.length > 500) return;
      list.push({ name: name, url: url, category: cat });
    });
  }
  return list;
}

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(parseInt(n, 10)); })
    .replace(/&#x([0-9a-fA-F]+);/g, function (m, n) { return String.fromCharCode(parseInt(n, 16)); });
}

function stripTags(s) { return (s || '').replace(/<[^>]*>/g, ' '); }

function cleanText(s) {
  return stripTags(decodeEntities(s || '')).replace(/\s+/g, ' ').trim();
}

function tagContent(xml, tag) {
  var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i');
  var m = xml.match(re);
  return m ? m[1] : '';
}

function attrValue(tagStr, attr) {
  var m = tagStr.match(new RegExp(attr + '\\s*=\\s*"([^"]*)"', 'i')) ||
          tagStr.match(new RegExp(attr + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? m[1] : '';
}

function extractImage(itemXml) {
  var m = itemXml.match(/<media:content[^>]*>/i);
  if (m) { var u = attrValue(m[0], 'url'); if (u) return u; }
  m = itemXml.match(/<media:thumbnail[^>]*>/i);
  if (m) { var t = attrValue(m[0], 'url'); if (t) return t; }
  var enc = itemXml.match(/<enclosure[^>]*>/i);
  if (enc) {
    var type = attrValue(enc[0], 'type');
    var eu = attrValue(enc[0], 'url');
    if (eu && (!type || type.indexOf('image') === 0)) return eu;
  }
  m = itemXml.match(/<img[^>]*src\s*=\s*"([^"]+)"/i) || itemXml.match(/<img[^>]*src\s*=\s*'([^']+)'/i);
  if (m) return m[1];
  return '';
}

function extractLink(itemXml) {
  var t = tagContent(itemXml, 'link');
  if (t) return cleanText(t);
  var m = itemXml.match(/<link[^>]*href\s*=\s*"([^"]+)"/i) || itemXml.match(/<link[^>]*href\s*=\s*'([^']+)'/i);
  return m ? m[1] : '';
}

function parseDate(itemXml) {
  var raw = cleanText(tagContent(itemXml, 'pubDate') || tagContent(itemXml, 'dc:date') || tagContent(itemXml, 'updated') || tagContent(itemXml, 'published'));
  if (!raw) return null;
  var d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function parseFeed(xml, sourceName, category) {
  var items = [];
  var blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var title = cleanText(tagContent(b, 'title'));
    if (!title) continue;
    var link = extractLink(b);
    if (!link) continue;
    var date = parseDate(b);
    items.push({
      title: title,
      link: link,
      image: extractImage(b),
      source: sourceName,
      category: category,
      published_at: date ? date.toISOString() : null,
      published_ts: date ? date.getTime() : 0
    });
  }
  return items;
}

function normKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9à-ú]/gi, '');
}

// RSS entrega miniatura: tenta subir para a versão maior da mesma imagem.
// WordPress (-300x200), BBC ichef (640 -> 1536) e parâmetro w= pequeno.
function upgradeImageURL(u) {
  if (!u) return u;
  var out = u;
  out = out.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|gif))$/i, '$1');
  out = out.replace(/ichef\.bbci\.co\.uk\/news\/\d+\//, 'ichef.bbci.co.uk/news/1536/');
  out = out.replace(/ichef\.bbci\.co\.uk\/images\/ic\/\d+x\d+\//, 'ichef.bbci.co.uk/images/ic/1536x864/');
  var wm = out.match(/([?&]w=)(\d+)/);
  if (wm && parseInt(wm[2], 10) < 1280) { out = out.replace(/([?&]w=)\d+/, '$11280'); }
  return out;
}

// Embaralha sem deixar o mesmo site em sequência: a ordem fica aleatória
// mas nunca repetitiva (sem blocos de um único veículo). A cada escolha,
// só entram fontes que ainda permitem completar o resto sem repetição,
// então nem no fim da lista sobra um par repetido.
function shuffleMixed(arr) {
  var pool = arr.slice();
  var out = [];
  var lastSource = '';
  function counts(list) {
    var c = {};
    for (var i = 0; i < list.length; i++) { c[list[i].source] = (c[list[i].source] || 0) + 1; }
    return c;
  }
  while (pool.length) {
    var feas = [];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].source === lastSource) continue;
      var rest = pool.slice(0, i).concat(pool.slice(i + 1));
      var c = counts(rest);
      var m = 0;
      for (var k in c) { if (c[k] > m) m = c[k]; }
      if (m <= (rest.length + 1) / 2) feas.push(i);
    }
    var pick;
    if (feas.length) {
      pick = feas[Math.floor(Math.random() * feas.length)];
    } else {
      var cands = [];
      for (var j = 0; j < pool.length; j++) { if (pool[j].source !== lastSource) cands.push(j); }
      pick = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 0;
    }
    var it = pool.splice(pick, 1)[0];
    out.push(it);
    lastSource = it.source;
  }
  return out;
}

function fetchWithTimeout(fetchImpl, url, ms) {
  if (typeof AbortController === 'undefined') {
    return fetchImpl(url, { headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' } });
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
  return fetchImpl(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    signal: ctrl.signal
  }).then(function (res) { clearTimeout(timer); return res; }, function (err) { clearTimeout(timer); throw err; });
}

export async function aggregate(fetchImpl, feedsOverride) {
  var doFetch = fetchImpl || fetch;
  var feeds = resolveFeeds(feedsOverride);
  var results = await Promise.all(feeds.map(async function (f) {
    try {
      var res = await fetchWithTimeout(doFetch, f.url, 8000);
      if (!res.ok) return { feed: f, items: [], error: 'HTTP ' + res.status };
      var xml = await res.text();
      return { feed: f, items: parseFeed(xml, f.name, f.category), error: null };
    } catch (e) {
      return { feed: f, items: [], error: String((e && e.message) || e) };
    }
  }));

  // Deduplicação por título normalizado + link.
  var seen = {};
  var all = [];
  results.forEach(function (r) {
    r.items.forEach(function (it) {
      var k = normKey(it.title).slice(0, 80) + '|' + it.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (seen[k]) return;
      seen[k] = true;
      all.push(it);
    });
  });

  // Prioriza últimas 48h; se o volume for baixo, usa tudo (nunca tela vazia).
  var now = Date.now();
  var fresh = all.filter(function (it) { return it.published_ts && (now - it.published_ts) <= 48 * 3600 * 1000; });
  var pool = fresh.length >= 12 ? fresh : all.slice();
  pool.sort(function (a, b) { return b.published_ts - a.published_ts; });

  var byCat = { brasil: [], mundo: [], tech: [], eua: [], atlanta: [] };
  pool.forEach(function (it) { if (byCat[it.category]) byCat[it.category].push(it); });
  Object.keys(byCat).forEach(function (c) { byCat[c] = byCat[c].slice(0, 15); });

  // Mistura aproximada 30% Brasil / 20% Mundo / 20% Tech / 20% EUA / 10% Atlanta, sem repetição consecutiva.
  var pattern = ['brasil', 'brasil', 'brasil', 'mundo', 'mundo', 'tech', 'tech', 'eua', 'eua', 'atlanta'];
  var idx = { brasil: 0, mundo: 0, tech: 0, eua: 0, atlanta: 0 };
  var mixed = [];
  var guard = 0;
  while (mixed.length < 40 && guard < 200) {
    guard++;
    var progressed = false;
    for (var p = 0; p < pattern.length; p++) {
      var c = pattern[p];
      if (idx[c] < byCat[c].length) {
        mixed.push(byCat[c][idx[c]++]);
        progressed = true;
        if (mixed.length >= 40) break;
      }
    }
    if (!progressed) break;
  }

  // Foto grande é o centro do layout: prioriza itens com imagem.
  var withImg = mixed.filter(function (it) { return it.image; });
  var withoutImg = mixed.filter(function (it) { return !it.image; });
  var finalItems = withImg.slice();
  if (finalItems.length < 12) {
    finalItems = finalItems.concat(withoutImg.slice(0, 20 - finalItems.length));
  }
  finalItems = finalItems.slice(0, 40).map(function (it) {
    return {
      title: it.title,
      link: it.link,
      image: upgradeImageURL(it.image),
      source: it.source,
      category: it.category,
      published_at: it.published_at
    };
  });
  finalItems = shuffleMixed(finalItems);

  return {
    generated_at: new Date().toISOString(),
    count: finalItems.length,
    items: finalItems,
    feeds: results.map(function (r) {
      return { source: r.feed.name, category: r.feed.category, ok: !r.error, items: r.items.length, error: r.error };
    })
  };
}
