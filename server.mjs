// Servidor local de teste: serve public/ e responde /api/news com a amostra
// gerada pelo test-aggregate.mjs, simulando a Pages Function.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

var root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
var sample = fs.readFileSync('/tmp/portal-news-sample.json');

var server = http.createServer(function (req, res) {
  var pathname = req.url.split('?')[0];
  if (pathname === '/api/news') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(sample);
    return;
  }
  var file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
    res.end(data);
  });
});

server.listen(8901, function () {
  console.log('Portal News local em http://localhost:8901/');
});
