# Lume Portal

Dashboard de notícias e informações para o **Meta Portal de 1ª geração** (10,1",
horizontal), que a Meta descontinuou em 2022 — o app quiosque **Lume Portal**
ressuscita o aparelho como tela de informações sempre ligada, configurável por
aparelho, em português ou inglês.

> O código do app Android vive num repositório local separado (não publicado
> aqui). Este repositório contém toda a parte web: o painel, o site público,
> a página de configuração e o backend de pareamento (Cloudflare Pages +
> Workers KV). O APK é hospedado aqui em `public/downloads/`.

## URLs de produção

| O quê | URL |
|---|---|
| Site público (inglês) | https://lumeportal.travustech.ai/ |
| Painel (dashboard) | https://lumeportal.travustech.ai/preview/ |
| Configuração por aparelho | https://lumeportal.travustech.ai/pair/ |
| Download do APK (sempre a última versão) | https://lumeportal.travustech.ai/downloads/lume-portal.apk |
| Domínio reserva (mesmo projeto) | https://portal-news-6t7.pages.dev/ |

Aparelhos já pareados continuam funcionando: `/?code=XXXXXX` redireciona (302)
para `/preview/?code=XXXXXX`. **O Immortal (ou qualquer visualizador) deve
apontar para `/preview/`** — a raiz virou o site público.

## O painel

Um único arquivo (`public/preview/index.html`, JS ES5, Chart.js via CDN),
feito para leitura a ~3 m do sofá: foto em tela cheia com zoom lento contínuo
(Ken Burns), manchete digitada (typewriter), barra de progresso e topo fixo
(clima à esquerda, alerta NWS no centro, relógio + data à direita).

**Notícias** — 11 fontes RSS, agregadas no servidor (`functions/api/news.js`):
G1 Brasil, CNN Brasil, Agência Brasil, G1 Mundo, BBC Brasil, Canaltech, Olhar
Digital, Tecnoblog, G1 Tecnologia, Fox News (EUA) e Fox 5 Atlanta (local).
Mix por categoria, sem repetir a mesma fonte em sequência, preferência por
itens das últimas 48 h com imagem. Catálogo recarregado a cada 10 min, com
cache em `localStorage` e tela de "sem conexão" (nunca fica em branco).

**Telas especiais** — sequência `C, W, K, B, A, M, F`: o bloco de abertura
mostra as 7 em sequência; depois, uma a cada 4 notícias.

- **C — Câmbio**: US$ 1 = R$ X em destaque, EUR/GBP/JPY por US$ 1,
  BTC/ETH/SOL/BNB/XRP/DOGE em US$ com variação de 24 h; fontes BCE (fiat) e
  CoinGecko (cripto); gráfico do dólar na última semana.
- **W — Clima**: temperatura gigante, sensação térmica, umidade, vento,
  nascer/pôr do sol e previsão de 7 dias (Open-Meteo).
- **K — Relógio mundial**: 5 relógios analógicos (Atlanta, Los Angeles,
  Brasília, Londres, Tóquio) com ponteiro de segundos dourado, hora digital e
  data.
- **B — Bíblia**: versículo aleatório de 40 passagens conhecidas, via
  bible-api.com (Almeida em PT, WEB em EN), sem repetir o anterior; fallback
  com 8 versos fixos.
- **A — Qualidade do ar**: AQI (EPA) com número gigante, categoria,
  recomendação de saúde, 6 poluentes (PM2.5, PM10, ozônio, NO₂, CO, SO₂) e
  gráfico do AQI ao longo do dia (Open-Meteo).
- **M — Mercados**: 8 índices (EUA, Brasil, Europa, Ásia) via Yahoo Finance
  (`functions/api/markets.js`), com mini-gráficos do último mês.
- **F — Você sabia?**: padrão [Wikipedia, Wikipedia, Quiz] — fatos "neste
  dia" em PT (ou EN) com foto do artigo; a cada 3º, quiz do Open Trivia DB
  (traduzido via MyMemory em PT; em EN, no original).

**Duração dos slides** — única para todas as telas (notícias + especiais),
configurável por aparelho (5/10/15/20/25/30/60 s, padrão 15 s).

**Idiomas (i18n)** — o painel é todo traduzido: `pt-BR` (padrão) e `en-US`,
via dicionário `I18N` + `t()`. Em PT, manchetes em inglês (EUA/Local) são
traduzidas no navegador via MyMemory (grátis, sem chave), com cache local; se
a API falhar, mostra o original. Em EN, as manchetes dos feeds brasileiros
são traduzidas para o inglês via MyMemory (pt|en), com cache; as manchetes
em inglês aparecem no original e feeds customizados não são traduzidos. Uma
nova língua = um novo objeto no dicionário.

**Alertas NWS** — `api.weather.gov/alerts/active`, severidade Extreme/Severe;
em PT, nomes de eventos traduzidos por mapa; em EN, nome cru do weather.gov
(`functions/api/alerts.js?lang=en`).

## O app Android (Lume Portal)

App quiosque nativo (WebView em tela cheia) para o Portal. Pacote
`com.travustech.lumeportal`, minSdk 28, targetSdk 29, **só permissão
INTERNET**. Não usa MAC real (inacessível a app sideloaded no Android 9/10)
nem é screensaver do sistema (o Portal não oferece essa opção a terceiros):
é um app em primeiro plano, com opção de virar home via ADB.

- **Pareamento**: o app gera um código de 6 caracteres (alfabeto
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789` — sem 0/O/1/I/L), digitado em `/pair/`.
- **Long-press** em qualquer ponto do WebView reexibe a tela de pairing
  (código, status, URL, botão de voltar que recarrega o painel).
- **Instalação** (o APK instala por cima das versões anteriores, sem perder
  o pareamento — mesma chave de debug em todas as versões):

```bash
curl -L -o lume-portal.apk https://lumeportal.travustech.ai/downloads/lume-portal.apk \
  && adb install -r lume-portal.apk \
  && adb shell am start -n com.travustech.lumeportal/.MainActivity
```

Pré-requisitos: `platform-tools` (adb) no PATH, Portal com ADB ativado
(Settings > Debug > ADB Enabled), conexão USB-C, `adb devices` reconhecendo
o aparelho.

**Versões** (nome do arquivo versionado a cada release — o Portal/aplicativo
de download pode cachear o nome antigo):

| Versão | O que mudou |
|---|---|
| v1 | Primeira entrega: pairing + WebView quiosque |
| v1.1 | Domínio `lumeportal.travustech.ai`, migração da URL antiga, long-press para o pairing, logo e ícone |
| v1.2 | URL padrão aponta para `/preview/` |
| v1.3 | Trava de scroll/zoom do WebView (sem barras, sem overscroll) |
| v1.4 | Trava de arrasto no nível do gesto (arrastar não move mais o conteúdo) |

Build manual (Gradle não funciona atrás do proxy da VM de build): aapt2
compile+link → javac → d8 → zip → zipalign → apksigner, com o debug keystore
local (fora do versionamento — sem ele, a instalação por cima perde o
pareamento).

## Pareamento e configuração por aparelho

Backend em Cloudflare Pages Functions + Workers KV (namespace `lume-portal`,
binding `LUME_KV` no projeto Pages, production + preview).

- `GET /api/lume/config?code=XXXXXX` → `{paired:false}` ou
  `{paired:true, config, dashboardUrl}` (dashboardUrl =
  `https://lumeportal.travustech.ai/preview/?code=XXXXXX`).
- `POST /api/lume/pair {code, config}` → valida e salva em KV como
  `config:<CODE>`. Sem autenticação na v1 — o código é a chave.

**Configuração** (validação compartilhada em `functions/_lib/lume.js`):

- `language`: `en-US` | `pt-BR` (padrão `en-US` no formulário, `pt-BR` no painel
  sem código)
- `city`: `{name, lat, lon}` (padrão Acworth, GA — 34.0658, -84.6769)
- `clockFormat`: `12h` | `24h`; `tempUnit`: `C` | `F`
- `slideDuration`: 5/10/15/20/25/30/60 (qualquer outro valor normaliza para 15)
- `screens`: `{C, W, K, B, A, M, F}` (booleanos)
- `screenOrder`: ordem dos especiais (ex.: `["C","W","K","B","A","M","F"]`;
  sem ele, a ordem padrão; códigos desconhecidos são ignorados e os que
  faltam vão para o fim)
- `worldClock`: até 5 `{name, timezone}` para o relógio mundial (sem ele,
  as 5 cidades padrão: Atlanta, Los Angeles, Brasília, Londres, Tóquio)
- `feeds`: `{enabled: [...ids conhecidos, máx. 30], custom: [{name, url,
  category}]}` (custom: máx. 30; categorias `brasil|mundo|tech|eua|atlanta`)
- Corpo limitado a 16 KB; chaves desconhecidas são removidas.

A página `/pair/` é mobile-first, com abas (Device, Weather, Screens, World
clock, Feeds), busca de cidade com autocomplete (Open-Meteo Geocoding, sem
chave), ordem dos slides com drag-and-drop (ou setas, no celular) e feeds
RSS customizados sem limite fixo de linhas. Ela aceita `?code=XXXXXX` na
URL: abre a config pronta para editar — é o fluxo do QR code exibido na
tela de pairing do app. O código fica salvo no cookie `lumePairCode` (1
ano): sem `?code=`, a página abre já preenchida e carrega a config sozinha.

**Semântica importante**: o app para de sondar a config após o pareamento e
o painel busca a config só no carregamento (teto de 4 s; se falhar, usa o
cache `portalNewsLume:<CODE>`). **Mudar a config no site só vale no próximo
carregamento do painel** (reabrir o app, ou long-press → voltar ao painel).
Sem `?code=` (ou código inválido/não pareado), o painel usa os 11 feeds
padrão, Acworth, 12 h e °C.

## Publicação (Cloudflare Pages)

Conta **Travus Tech, Inc.**, projeto `portal-news`. Deploy direto via script
(sem integração automática GitHub → Cloudflare):

```bash
python3 ~/workspace/custom-connectors/custom.cloudflare/bin/deploy-pages.py ~/workspace/portal-news
```

O script sobe `public/` + `functions/` e a propagação leva ~20–25 s. O token
da API precisa de **Pages Edit + Account Read + Workers KV Storage Read/Edit**
(sem a permissão de KV, a API devolve 401). Detalhe da API REST: o PATCH de
binding do projeto usa objeto por nome
(`{"LUME_KV": {"namespace_id": "..."}}`), não array como no wrangler.toml.

## Desenvolvimento local

```bash
node server.mjs        # servidor local na porta 8901
```

Checagem de sintaxe do script inline do painel (o painel é um único HTML):

```bash
python3 -c "
import re
html = open('public/preview/index.html').read()
blocks = [m for m in re.findall(r'<script>(.*?)</script>', html, re.S)]
open('/tmp/dash.js','w').write(max(blocks, key=len))
" && node --check /tmp/dash.js
```

## Estrutura

- `public/index.html` — site público (inglês) com demo ao vivo em iframe
- `public/preview/index.html` — **o painel**
- `public/pair/index.html` — página de configuração por aparelho (inglês)
- `public/downloads/` — APK estável (`lume-portal.apk`) + cópias versionadas
- `public/assets/` — logos Lume e TravusTech
- `functions/api/news.js` — agregador RSS (cache 10 min)
- `functions/api/og.js`, `alerts.js`, `markets.js`, `pollen.js` — APIs de apoio
- `functions/api/lume/config.js`, `pair.js` — pareamento e config
- `functions/_lib/aggregate.js`, `lume.js` — agregação e validação
- `functions/index.js` — redirect 302 `/?code=` → `/preview/?code=`

## Analytics

Google Analytics (`G-KGXSLWW669`) no `<head>` das três páginas (site, painel
e config). O painel dentro do iframe da demo e nos Portais também gera
pageviews — são loads reais; para separar tráfego de marketing de tráfego
dos aparelhos, filtrar por caminho/host no GA.

## Limitações conhecidas

- **RSS do G1 Brasil** servia itens de 2018–2023 (filtro de 48 h o exclui do
  catálogo atual) — problema pré-existente do feed, a acompanhar.
- **Pólen**: Open-Meteo CAMS retorna nulo para Acworth e pollen.com bloqueia
  scraping; a seção do painel já existe e aparece sozinha quando
  `/api/pollen` responder — falta uma fonte com chave (ex.: Tomorrow.io).
- **Fuso do Open-Meteo fixo em America/New_York** (nascer/pôr do sol de
  outras cidades saem em horário de NY); NWS cobre só EUA; vento sempre em
  mph.
- **NWS em EN com alerta real ainda não observado** (sem alerta ativo nos
  testes); o caminho de código está deployado.
- Fontes sem RSS público ou bloqueadas (não re-adicionar sem verificar):
  TecMundo (HTTP 204), CNN americana (feeds congelados desde 2023), 11Alive
  (0 itens em produção), AJC/WSB (sem RSS público).

