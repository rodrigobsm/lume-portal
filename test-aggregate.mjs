// Teste local do agregador: busca os feeds reais, agrega e grava uma amostra
// em /tmp/portal-news-sample.json para o servidor de teste servir em /api/news.
import { aggregate } from './functions/_lib/aggregate.js';
import fs from 'node:fs';

var data = await aggregate();
console.log('TOTAL: ' + data.count + ' notícias');
data.feeds.forEach(function (f) {
  console.log('- ' + f.source + ' [' + f.category + '] ok=' + f.ok + ' itens=' + f.items + (f.error ? ' ERRO=' + f.error : ''));
});
console.log('--- amostra (10 primeiras) ---');
data.items.slice(0, 10).forEach(function (it, i) {
  console.log((i + 1) + '. [' + it.source + '/' + it.category + '] ' + it.title + (it.image ? ' [IMG]' : ' [SEM IMG]'));
});
var byCat = {};
data.items.forEach(function (it) { byCat[it.category] = (byCat[it.category] || 0) + 1; });
console.log('--- distribuição ---');
console.log(JSON.stringify(byCat));
fs.writeFileSync('/tmp/portal-news-sample.json', JSON.stringify(data));
console.log('Amostra salva em /tmp/portal-news-sample.json');
