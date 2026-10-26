# Contributing to Lume Portal

Contributions are welcome — bug fixes, new screens, new feeds, new
languages, Portal model support, documentation. This is a small project:
small, well-described pull requests get merged fastest.

## Ground rules

- **License:** by contributing you agree that your contribution is
  released under the project's [MIT License](LICENSE) (inbound =
  outbound). Only submit code and content you have the right to share.
- **No secrets, ever:** no API keys, tokens, passwords, keystores, or
  signing keys in code, issues, or pull requests. The project's debug
  keystore is intentionally not in this repository.
- **Be kind:** see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Security issues:** see [SECURITY.md](SECURITY.md) — do not publish an
  exploit in an issue.

## How to contribute

1. Fork the repo and create a branch for your change.
2. Describe **what** and **why** in the pull request, and what you tested
   (a Portal screenshot beats a paragraph when the change is visual).
3. Keep the change focused. A PR that does one thing well is easier to
   review than one that does five.

## Project layout

- `public/preview/index.html` — the dashboard (single file, ES5-style JS,
  Chart.js via CDN, no build step, no framework). Keep it that way: the
  dashboard must stay a file that can be opened and read.
- `public/pair/index.html` — the per-device setup page.
- `public/index.html` — the public website.
- `functions/` — Cloudflare Pages Functions (RSS aggregation, markets,
  alerts, pairing backend). Shared validation lives in
  `functions/_lib/lume.js`.
- `android/` — the native kiosk app. Its own
  [`android/README.md`](android/README.md) documents the manual build
  chain (aapt2 → javac → d8 → zipalign → apksigner, JDK 17, Android SDK
  29). Note: an APK you build signs with **your** debug key, so it will
  not install over the published APK without uninstalling first — that is
  expected.

## Local development

```bash
node server.mjs        # local server on port 8901
```

Syntax-check the dashboard's inline script before pushing (the dashboard
is a single HTML file):

```bash
python3 -c "
import re
html = open('public/preview/index.html').read()
blocks = [m for m in re.findall(r'<script>(.*?)</script>', html, re.S)]
open('/tmp/dash.js','w').write(max(blocks, key=len))
" && node --check /tmp/dash.js
```

## Style notes

- **Sofa readability wins.** The dashboard is read from ~3 m away: if a
  change makes text smaller or denser, it is probably wrong.
- **Live data over fixed lists** where a free API exists, with a sane
  fallback when the API fails (see the headline-translation fallback in
  the README).
- **No new hard dependencies** on the dashboard without a good reason.
- **Do not add feeds that were removed for cause** (see "Known
  limitations" in the README) without verifying they work from
  production first.
- **Do not delete the demo config.** The website's live demo runs on a
  Cloudflare KV config code (`DEMUSA`); it is not in this repo, but
  maintainers: never delete it, or the demo silently reverts to the
  Portuguese defaults.
- **Version APK file names on every release** (`lume-portal-vX.Y.apk`
  plus the stable `lume-portal.apk`) — download apps cache the old name.

## What maintainers do (contributors: no action needed)

Deploying to Cloudflare Pages, rotating the demo config, and signing
release APKs are maintainer tasks. You do not need a Cloudflare account or
token to contribute — develop locally and send a pull request.
