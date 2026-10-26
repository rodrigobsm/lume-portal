# Portal News — Smart News Screensaver

Dashboard de notícias em português para Meta Portal (10,1", horizontal) via Immortal.

## Estrutura

- `public/index.html` — frontend leve, sem dependências, compatível com navegadores
  antigos (JS ES5, flexbox, sem build). Foto ~72% da tela, painel escuro com
  manchete, fonte, horário, relógio, data e clima de Acworth, GA.
  - Rotação automática a cada 15s, atualização do catálogo a cada 10 min. Toque na esquerda/direita da tela avança/volta a notícia (setas do teclado também funcionam).
 - Layout tela cheia: foto ocupa 100% da tela (cover, sem barras). Topo fixo (não gira com a notícia): clima atual à esquerda (ícone + temperatura em cima, descrição abaixo, sem cidade), relógio + data à direita, sem QR Code, tudo sobre degradê superior. Embaixo, sobre degradê preto: fonte, manchete grande (~90px) para leitura a ~3m com auto-fit (diminui sozinha se não couber, mas nunca abaixo do tamanho do relógio, ~61px; em último caso o bloco cresce para cima, nada cortado), horário relativo (há X min, com selo AGORA nas notícias com menos de 30 min) e contador maior na mesma linha. Sem previsão semanal no topo — a previsão de 7 dias vive num slide próprio de clima em tela cheia, um dos 4 slides especiais: com foto de fundo conforme o clima atual (sol, nuvens, chuva, tempestade, neve, neblina, noite), temperatura atual grande, sensação térmica, umidade, vento, nascer/pôr do sol e 7 colunas de previsão (dia, ícone, máxima/mínima, chance de chuva); dura 20s e nesse slide o mini-clima do topo some, ficando só o relógio. Os 4 slides especiais (câmbio, clima, relógio mundial, bíblia) abrem primeiro, em sequência, e depois um especial entra a cada 4 notícias, rodando entre eles na mesma ordem. Slide de câmbio em tela cheia: dólar/real em destaque (US$ 1 = R$ X, com variação), euro, libra e iene por US$ 1, e BTC, ETH, SOL, BNB, XRP e DOGE em US$ com variação de 24h; fontes BCE (fiat) e CoinGecko (cripto), foto de notas de dólar ao fundo (mais escura), e gráfico da flutuação do dólar na última semana em Chart.js ao lado do destaque. Relógio mundial: 5 relógios analógicos (Atlanta, Los Angeles, Brasília, Londres, Tóquio) com hora digital + data embaixo de cada um, foto da Terra vista da Apollo 17 com zoom. Tela bíblica: 8 versículos NVI rotativos sobre a Santa Ceia; a posição fica salva no navegador, então muda a cada aparição mesmo após recarregar. Manchetes em inglês (EUA/Local) são traduzidas para PT-BR no navegador via MyMemory (grátis, sem chave), com cache local; sem tradução, mostra o original em inglês. Alerta meteorológico do NWS no topo quando houver aviso severo em Acworth (o selo só aparece com alerta ativo). Efeitos: manchete digitada (typewriter com cursor dourado, ~1,8s por slide) e foto com zoom lento contínuo em direção ao centro (Ken Burns, 1.0 → 1.25 durante os 15s do slide, em todos os slides). Todas as fontes ampliadas para leitura do sofá.
 - Ordem aleatória: o catálogo é embaralhado a cada atualização sem deixar o mesmo site em sequência.
 - Foto em alta: o agregador tenta subir a miniatura do RSS (WordPress, BBC ichef, parâmetro w=) e o frontend busca a og:image da matéria via /api/og, trocando para a foto original quando disponível; se falhar, mantém a do RSS com o overlay de pontinhos para baixa resolução.
 - Painel: logo da fonte + nome, clima atual em °C com ícone e descrição (sem QR Code, sem previsão semanal).
  - Cache em localStorage + tela de "sem conexão" (nunca fica em branco).
- `functions/api/news.js` — Cloudflare Pages Function: agrega os RSS no servidor,
  devolve JSON e guarda em cache por 10 minutos (serve o cache se as fontes falharem).
- `functions/_lib/aggregate.js` — agregador sem dependências (RSS → JSON):
  dedupe, filtro de recentes, mistura 30% Brasil / 20% Mundo / 20% Tech /
  20% EUA / 10% Atlanta,
  prioriza itens com imagem.

## Fontes RSS

- Brasil: G1, CNN Brasil, Agência Brasil
- Mundo: G1 Mundo, BBC Brasil
- Tecnologia: Canaltech, Olhar Digital, Tecnoblog, G1 Tecnologia
- EUA: Fox News
- Atlanta (local): Fox 5 Atlanta

## Clima

Open-Meteo (gratuito, sem chave): Acworth, GA (34.0658, -84.6769), °C.

## Publicação (Cloudflare Pages, gratuito)

```bash
npx wrangler login            # uma vez: autoriza a conta Cloudflare no navegador
npx wrangler pages deploy public --project-name portal-news
```

A URL pública é `https://lumeportal.travustech.ai` (o domínio padrão
`https://portal-news-6t7.pages.dev` continua funcionando como fallback).
A raiz do site é a página de divulgação do Lume Portal; o painel em si
vive em `https://lumeportal.travustech.ai/preview/` (quem já pareou um
aparelho continua funcionando: `/?code=XXXXXX` redireciona para
`/preview/?code=XXXXXX`). A configuração por aparelho está em
`https://lumeportal.travustech.ai/pair/` e o APK em
`https://lumeportal.travustech.ai/downloads/lume-portal.apk`.

## Immortal (Meta Portal)

No app Immortal, adicione a URL pública como página/screensaver e deixe o
Portal em orientação horizontal. A página inicia sozinha, sem cliques ou login.

## Novas telas (2026-10-25)

Sequência de especiais passou de 4 para 7: câmbio (C), clima (W), relógio
mundial (K), bíblia (B), qualidade do ar (A), mercados (M) e você sabia? (F).
O bloco de abertura mostra os 7 em sequência; depois, um especial entra a
cada 4 notícias, rodando na mesma ordem. Todas duram 20s e escondem o
mini-clima do topo.

- Ar (A): AQI dos EUA, PM2.5, PM10, ozônio, NO₂, CO e SO₂ de Acworth via
  Open-Meteo Air Quality (sem chave). Layout: número gigante do AQI com
  selo de categoria colorido e recomendação de saúde, 6 caixas de poluentes
  com ícones, e gráfico do AQI ao longo do dia (horas de hoje, com marcador
  da hora atual). A seção de pólen (árvores/grama/ervas, índice Pollen.com
  via /api/pollen) fica oculta quando a fonte não responde — o Pollen.com
  bloqueia tráfego automatizado (testado em 2026-10-25, inclusive a partir
  da rede da Cloudflare). Para ter pólen, será preciso uma fonte com chave
  (ex.: Tomorrow.io).
- Mercados (M): 8 índices via Yahoo Finance através de /api/markets (sem
  chave, cache de 5 min): S&P 500, Dow Jones e Nasdaq (EUA), Ibovespa
  (Brasil), FTSE 100 e DAX (Europa), Nikkei 225 e Hang Seng (Ásia). Cada
  cartão mostra valor, variação do dia e mini-gráfico SVG com os closes do
  último mês. Se a API falhar, usa o último dado salvo no navegador.
- Você sabia? (F): roda em padrão [Wikipédia, Wikipédia, Quiz]. Os
  fatos da Wikipédia em português ("neste dia") trazem um evento
  histórico do dia de hoje, sorteado sem repetir o anterior, com a tag
  "NESTE DIA · ano" em dourado e a foto do artigo relacionado ao fundo
  (imagem original do artigo, preferindo foto a bandeira SVG; se a foto
  falhar, cai para a lâmpada). A cada terceiro fato, um quiz do Open
  Trivia DB: pergunta e resposta traduzidas para PT-BR via MyMemory (o
  mesmo sistema das manchetes, com o mesmo cache); o quiz só aparece se
  pergunta E resposta traduzirem, senão cai para um fato da Wikipédia.
  O quiz mostra o rótulo "QUIZ", a pergunta, a tag da categoria em
  português e a linha dourada "Resposta: ...", com foto do Pexels por
  categoria (ciência, computadores, história, geografia, animais,
  esportes, arte, mitologia, conhecimentos gerais, entretenimento).
  Pré-carregado antes de aparecer. Se a Wikipédia falhar, tenta um
  artigo aleatório; em último caso, usa uma das 34 curiosidades curadas
  guardadas no código.
