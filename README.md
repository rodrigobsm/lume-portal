# Lume Portal

A news and information dashboard for the **first-generation Meta Portal**
(10.1", landscape), which Meta discontinued in 2022. The native kiosk app
**Lume Portal** brings the device back as an always-on information display,
configured per device, in English or Portuguese.

Lume Portal is **open source (MIT)** and community-built. See
[CONTRIBUTING.md](CONTRIBUTING.md) if you want to improve it, and
[DISCLAIMER.md](DISCLAIMER.md) for the full disclaimer and privacy notes.

## Production URLs

| What | URL |
|---|---|
| Public website (English) | https://lumeportal.travustech.ai/ |
| Dashboard | https://lumeportal.travustech.ai/preview/ |
| Per-device setup | https://lumeportal.travustech.ai/pair/ |
| APK download (always the latest version) | https://lumeportal.travustech.ai/downloads/lume-portal.apk |
| Fallback domain (same project) | https://portal-news-6t7.pages.dev/ |

Already-paired devices keep working: `/?code=XXXXXX` redirects (302) to
`/preview/?code=XXXXXX`. **Any viewer (Immortal or otherwise) must point
at `/preview/`** — the root is the public website.

## The dashboard

A single file (`public/preview/index.html`, ES5-style JS, Chart.js via
CDN), designed to be read from ~3 m away from the sofa: full-screen photo
with a slow continuous zoom (Ken Burns), typewriter headline, progress
bar, and a fixed top bar (weather left, NWS alert center, clock + date
right).

**News** — 11 RSS sources, aggregated server-side (`functions/api/news.js`):
G1 Brasil, CNN Brasil, Agência Brasil, G1 Mundo, BBC Brasil, Canaltech,
Olhar Digital, Tecnoblog, G1 Tecnologia, Fox News (US), and Fox 5 Atlanta
(local). Mixed by category, never two items from the same source in a row,
preferring items from the last 48 h with an image. The catalog refreshes
every 10 min, with a `localStorage` cache and an offline screen (never a
blank screen).

**Special screens** — sequence `C, W, K, B, A, M, F, P, D, N, L`:
the opening block shows all 11 in sequence; afterwards, one special
after every `newsPerBlock` news items (default 4).

- **C — Currency**: US$ 1 = R$ X in large type, EUR/GBP/JPY per US$ 1,
  BTC/ETH/SOL/BNB/XRP/DOGE in US$ with 24 h change; sources: ECB/Frankfurter
  (fiat) and CoinGecko (crypto); dollar chart for the last week.
- **W — Weather**: giant temperature, feels-like, humidity, wind,
  sunrise/sunset, and a 7-day forecast (Open-Meteo).
- **K — World clock**: 5 analog clocks (Atlanta, Los Angeles, Brasília,
  London, Tokyo) with a gold second hand, digital time and date.
- **B — Bible**: a random verse from 40 curated passages, via
  bible-api.com (Almeida in PT, WEB in EN), never repeating the previous
  one; fallback with 8 hardcoded verses.
- **A — Air quality**: US AQI (EPA) in giant type, category, health
  recommendation, 6 pollutants (PM2.5, PM10, ozone, NO₂, CO, SO₂), and an
  AQI chart for the day (Open-Meteo).
- **M — Markets**: 8 indices (US, Brazil, Europe, Asia) via Yahoo Finance
  (`functions/api/markets.js`), with mini-charts for the last month.
- **F — Did you know?**: pattern [Wikipedia, Wikipedia, Quiz] — "on this
  day" facts in PT (or EN) with the article's photo; every 3rd one, a quiz
  from Open Trivia DB (translated via MyMemory in PT; in EN, in the
  original).
- **P — Photos**: personal photos and videos from a public Google Drive
  folder (config `photosFolder`, set on `/pair/`). Each appearance shows
  the next item in filename order, looping; the index advances in memory
  and persists per device, so a reload resumes where it stopped, and a
  new folder restarts from its first photo (photos keep advancing even
  where the viewing WebView blocks storage; only a reload then restarts
  from the first photo). Photos are shown directly with a plain `<img>`
  (Drive thumbnail URL); videos play muted with a plain `<video>` until
  they end (60s cap), streamed through `functions/api/media.js` so the
  Drive API key never reaches the client — no Drive iframe or Drive UI.
  A bottom-left overlay shows the capture/upload date and, for photos
  with GPS EXIF, the reverse-geocoded city/state/country (cached per
  place; raw coordinates are never displayed). The topbar weather is hidden on this screen (like the other specials), and the next video is
  preloaded in the background while other slides show, so playback
  starts without a buffering stall. The list is fetched
  server-side (`functions/api/photos.js`, Drive API v3) and refreshed
  every 30 min; a failed or empty folder skips the screen silently. The
  screen appears only when a folder is configured.
- **D — Countdown**: a big day counter to a configured event (title +
  date + optional photo, set on `/pair/`), with hours/minutes/seconds
  ticking below. The screen appears only when a title and a real date
  are configured; clearing either removes it.
- **N — NASA photo**: a daily space photo from NASA's Image Library
  (keyless). The day of the year deterministically picks the photo
  (theme rotates nebula/galaxy/star), so the same date always shows
  the same photo. This replaced NASA's APOD API, which now returns a
  "NASA Science" placeholder for every date.
- **L — Lottery**: Powerball and Mega Millions (US) plus Georgia
  Fantasy 5, with official logos and brand colors, current estimated
  jackpots, cash values, next draw dates, and the latest drawn balls.
  Data is scraped from LotteryUSA (there is no official free API);
  the panel keeps the last good data if a scrape fails.

**Slide duration** — a single duration for all screens (news + specials),
configurable per device (5/10/15/20/25/30/60 s, default 15 s).

**Languages (i18n)** — the dashboard is fully translated: `pt-BR`
(default) and `en-US`, via an `I18N` dictionary + `t()`. In PT, English
headlines (US/local) are translated in the browser via MyMemory (free, no
key), with a local cache; if translation fails, the original is shown. In
EN, headlines from the Brazilian feeds are translated to English via
MyMemory (pt|en), with a cache; English headlines appear in the original
and custom feeds are not translated. A new language is a new object in the
dictionary.

**Headline translation fallback** — MyMemory's anonymous free tier
(5,000 chars/day) does not sustain a 24/7 dashboard: under load it answers
HTTP 429 and headlines stay untranslated. When MyMemory fails, the
dashboard falls back to Google's unofficial web translation endpoint
(`translate.googleapis.com`, no key). That endpoint is unofficial and can
change or stop working without notice; it is a fallback only, and the
MyMemory path is untouched. If you need guaranteed translation volume, get
a free MyMemory key (50,000 chars/day) or proxy a paid provider
server-side — see `functions/api/` for where a server-side translator
would plug in.

**NWS alerts** — `api.weather.gov/alerts/active`, Extreme/Severe severity;
in PT, event names are translated via a map; in EN, the raw weather.gov
name (`functions/api/alerts.js?lang=en`).

## The Android app (Lume Portal)

A native kiosk app (full-screen WebView) for the Portal. Package
`com.travustech.lumeportal`, minSdk 28, targetSdk 29, **INTERNET
permission only**. It does not use the real MAC (unavailable to a
sideloaded app on Android 9/10) and it is not a system screensaver (the
Portal does not offer that option to third parties): it is a foreground
app, with an option to become the home screen via ADB.

- **Pairing**: the app generates a 6-character code (alphabet
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789` — no 0/O/1/I/L), typed at `/pair/`.
- **Long-press** anywhere on the WebView re-opens the pairing screen
  (code, status, URL, back button that reloads the dashboard). The
  pairing screen also shows a QR code for the full setup URL, generated
  on-device.
- **Install** (the APK installs over previous versions without losing the
  pairing — same debug key in every version):

```bash
curl -L -o lume-portal.apk https://lumeportal.travustech.ai/downloads/lume-portal.apk \
  && adb install -r lume-portal.apk \
  && adb shell am start -n com.travustech.lumeportal/.MainActivity
```

Prerequisites: `platform-tools` (adb) in PATH, Portal with ADB enabled
(Settings > Debug > ADB Enabled), USB-C connection, `adb devices`
recognizing the device.

**Versions** (the file name is versioned on every release — a download
app may cache the old name):

| Version | What changed |
|---|---|
| v1 | First delivery: pairing + kiosk WebView |
| v1.1 | `lumeportal.travustech.ai` domain, old-URL migration, long-press to pairing, logo and icon |
| v1.2 | Default URL points to `/preview/` |
| v1.3 | WebView scroll/zoom lock (no bars, no overscroll) |
| v1.4 | Gesture-level drag lock (dragging no longer moves content) |
| v1.5 | Pairing screen redesign: full setup URL as text + on-device QR code, color-coded status, responsive layout |
| v1.6 | Reload on resume: returning to the app reloads the dashboard when paired, so a new config applies without restarting the app |

The app source lives in `android/` in this repo (see
[`android/README.md`](android/README.md)). Manual build (Gradle does not
work behind the build VM's proxy): aapt2 compile+link → javac → d8 → zip
→ zipalign → apksigner, with a local debug keystore (not versioned —
without it, installing over loses the pairing).

## Pairing and per-device configuration

Backend in Cloudflare Pages Functions + Workers KV (namespace
`lume-portal`, binding `LUME_KV` on the Pages project, production +
preview).

- `GET /api/lume/config?code=XXXXXX` → `{paired:false}` or
  `{paired:true, config, dashboardUrl}` (dashboardUrl =
  `https://lumeportal.travustech.ai/preview/?code=XXXXXX`).
- `POST /api/lume/pair {code, config}` → validates and stores under KV
  as `config:<CODE>`. No authentication in v1 — the code is the key (see
  [DISCLAIMER.md](DISCLAIMER.md): keep your device's code private).

**Configuration** (shared validation in `functions/_lib/lume.js`):

- `language`: `en-US` | `pt-BR` (form default `en-US`; dashboard without a
  code defaults to `pt-BR`)
- `city`: `{name, lat, lon}` (default Acworth, GA — 34.0658, -84.6769)
- `clockFormat`: `12h` | `24h`; `tempUnit`: `C` | `F`
- `slideDuration`: 5/10/15/20/25/30/60 (any other value normalizes to 15)
- `newsPerBlock`: news slides in a row before a special screen, 1–8 (any other value normalizes to 4)
- `screens`: `{C, W, K, B, A, M, F, P, D, N, L}` (booleans)
- `screenOrder`: order of the specials (e.g.
  `["C","W","K","B","A","M","F","P","D","N","L"]`; without it, the default order;
  unknown codes are ignored and missing ones go to the end)
- `photosFolder`: a Google Drive folder ID, or a full folder link (the
  ID is extracted). Empty = no Photos screen. The folder must be shared
  as "Anyone with the link can view".
- `countdown`: `{title, date, photo}` for the Countdown screen (title up
  to 80 chars, a real `YYYY-MM-DD` date, optional photo URL). Missing
  title or an invalid date = no Countdown screen.
- `worldClock`: up to 5 `{name, timezone}` for the world clock (without
  it, the 5 default cities: Atlanta, Los Angeles, Brasília, London, Tokyo)
- `feeds`: `{enabled: [...known ids, max 30], custom: [{name, url,
  category}]}` (custom: max 30; categories `brasil|mundo|tech|eua|atlanta`)
- Body limited to 16 KB; unknown keys are stripped.

The `/pair/` page is mobile-first, with tabs (Device, Weather, Screens,
World clock, Feeds), city search with autocomplete (Open-Meteo Geocoding,
no key), slide order with drag-and-drop (or arrows, on phones), and custom
RSS feeds with no fixed row limit. The Device tab holds the optional
Photos folder and the Countdown event (title, date, photo). It accepts `?code=XXXXXX` in the URL:
it opens the config ready to edit — that is the flow of the QR code shown
on the app's pairing screen. The code is saved in the `lumePairCode`
cookie (1 year): without `?code=`, the page opens pre-filled and loads the
config on its own.

**Important semantics**: the app stops polling the config after pairing,
and the dashboard fetches the config only on load (4 s cap; on failure it
uses the `portalNewsLume:<CODE>` cache). **Changing the config on the
site only applies on the next dashboard load** (reopen the app, or
long-press → back to dashboard). Without `?code=` (or with an invalid /
unpaired code), the dashboard uses the 11 default feeds, Acworth, 12 h,
and °C.

## Deployment (Cloudflare Pages)

Account **Travus Tech, Inc.**, project `portal-news`. Maintainers deploy
directly (no automatic GitHub → Cloudflare integration). The deploy
uploads `public/` + `functions/`; static propagation takes ~20–30 s, but
**Functions can take longer to propagate** — after a deploy, verify a
Functions behavior (not just static markers) before calling it done.

A deploy needs a Cloudflare API token with **Pages Edit + Account Read +
Workers KV Storage Read/Edit** (without the KV permission, the API returns
401). REST API detail: the project's KV binding PATCH uses an object
keyed by binding name (`{"LUME_KV": {"namespace_id": "..."}}`), not the
wrangler.toml array shape.

The Photos screen needs one more server-side setting: a Google Drive API
key as the Pages environment variable `GOOGLE_DRIVE_API_KEY` (Google
Cloud Console → enable the Google Drive API → create an API key,
restricted to the Drive API). The key never appears in client code; it
only lets the server list public folders. Without it, `/api/photos`
answers `{ok:false, error:'no_key'}` and the dashboard skips the Photos
screen. Self-hosters set their own key.

The NASA screen needs no key (NASA Image Library is keyless), and
neither does the lottery screen (public scrape).

Contributors do not need a Cloudflare account or token: develop locally
and send a pull request (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Local development

```bash
node server.mjs        # local server on port 8901
```

Syntax check for the dashboard's inline script (the dashboard is a single
HTML file):

```bash
python3 -c "
import re
html = open('public/preview/index.html').read()
blocks = [m for m in re.findall(r'<script>(.*?)</script>', html, re.S)]
open('/tmp/dash.js','w').write(max(blocks, key=len))
" && node --check /tmp/dash.js
```

## Structure

- `public/index.html` — public website (English) with a live demo iframe
- `public/preview/index.html` — **the dashboard**
- `public/pair/index.html` — per-device setup page (English)
- `public/downloads/` — stable APK (`lume-portal.apk`) + versioned copies
- `public/assets/` — Lume and TravusTech logos
- `functions/api/news.js` — RSS aggregator (10 min cache)
- `functions/api/photos.js` — Drive folder listing for the Photos screen
- `functions/api/media.js` — video streaming proxy for the Photos screen
- `functions/api/og.js`, `alerts.js`, `markets.js`, `pollen.js` — support APIs
- `functions/api/apod.js` — daily space photo from the NASA Image Library (deterministic by day of year, no key); `lottery.js` — Powerball/Mega Millions/Fantasy 5 jackpots scraped from LotteryUSA
- `functions/api/lume/config.js`, `pair.js` — pairing and config
- `functions/_lib/aggregate.js`, `lume.js` — aggregation and validation
- `functions/index.js` — 302 redirect `/?code=` → `/preview/?code=`
- `android/` — the Android kiosk app source
- `LICENSE`, `DISCLAIMER.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md` — license and community documents

## Analytics

Google Analytics (`G-KGXSLWW669`) in the `<head>` of the three pages
(website, dashboard, and setup). The dashboard inside the demo iframe and
on Portals also generates pageviews — those are real loads; to separate
marketing traffic from device traffic, filter by path/host in GA. See
[DISCLAIMER.md](DISCLAIMER.md) for the privacy notes.

## Known limitations (the honest list)

- **G1 Brasil RSS** served items dated 2018–2023 (the 48 h filter excludes
  it from the current catalog) — a pre-existing feed problem, to monitor.
- **Pollen**: Open-Meteo CAMS returns null for Acworth and pollen.com
  blocks scraping; the dashboard section already exists and appears on
  its own when `/api/pollen` answers — a key-based source is still missing
  (e.g. Tomorrow.io).
- **Open-Meteo timezone fixed at America/New_York** (sunrise/sunset for
  other cities show in NY time); NWS covers the US only; wind is always
  in mph.
- **NWS in EN with a real alert not yet observed** (no active alert during
  testing); the code path is deployed.
- **Pairing codes are the only key in v1** — anyone who knows a device's
  code can view and change its settings. Keep codes private.
- **Photos (v1 limits)**: only the first 100 items in a folder (Drive
  API page size, photos and videos combined); the folder must be public
  ("Anyone with the link can view") or listing fails and the screen is
  skipped; listing needs the
  server-side Drive API key (see Deployment). Anyone with the folder link
  can view the photos, and anyone near the Portal can see them on screen.
- **Lottery**: no official free API — jackpots are scraped from
  LotteryUSA pages, so a site redesign can break parsing; the panel
  keeps the last good data and the function serves a stale cache on
  failure.
- **NASA photo**: not the official Astronomy Picture of the Day —
  APOD's API now returns a placeholder for every date, so the screen
  shows a deterministic daily pick from NASA's Image Library instead
  (same NASA photos, different selection).
- **Config applies on the next dashboard load only** (see above).
- **Third-party feeds and APIs can break without notice** (rate limits,
  discontinued feeds, changed formats). The dashboard degrades to
  fallbacks and cached content; it never guarantees a feed.
- Sources with no public RSS or blocked (do not re-add without checking):
  TecMundo (HTTP 204), US CNN (feeds frozen since 2023), 11Alive (0 items
  in production), AJC/WSB (no public RSS).

## Disclaimer

Lume Portal is an independent community project — **not affiliated with,
endorsed by, or sponsored by Meta**. "Meta Portal" and "Portal" are
trademarks of Meta Platforms, Inc., used here only to identify compatible
hardware. Installing the app modifies device settings and is
**use-at-your-own-risk** (reversible by uninstalling, but no guarantees;
may void warranty). See [DISCLAIMER.md](DISCLAIMER.md) for the full text
and privacy notes.

## License

MIT — see [LICENSE](LICENSE).
