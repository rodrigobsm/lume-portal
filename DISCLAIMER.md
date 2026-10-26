# Disclaimer

**Lume Portal is an independent, community-built project. It is not
affiliated with, authorized by, endorsed by, or sponsored by Meta
Platforms, Inc.**

"Meta", "Meta Portal", and "Portal" are trademarks of Meta Platforms, Inc.
They are used here only to identify the hardware this software is
compatible with (nominative use). Lume Portal is not a Meta product and
ships no Meta code.

Other names and marks that appear in the dashboard (news publishers such as
G1, CNN, BBC, and Fox, and the services listed below) belong to their
respective owners. Their appearance does not imply endorsement of, or
affiliation with, Lume Portal.

## Use at your own risk

Meta Portal devices are discontinued and receive no official support.
Installing Lume Portal means sideloading an app over ADB and installing an
APK from outside any app store. By installing or using Lume Portal you
accept that:

- This may **void any remaining warranty** or violate the device's terms
  of use.
- Modifying a device always carries some risk, up to and including making
  it unusable. Lume Portal does **not** root the device, unlock the
  bootloader, or modify system partitions — it installs as a regular app
  and can optionally be set as the home screen via ADB. Uninstalling the
  app (`adb uninstall com.travustech.lumeportal`) restores the stock
  behavior. Even so, **no outcome is guaranteed**.
- You are responsible for the device, the settings you apply, and any
  other software you install on it. Lume Portal does not vet third-party
  apps or feeds.

The software is provided "AS IS", without warranty of any kind, under the
terms of the [MIT License](LICENSE). To the maximum extent permitted by
law, Travus Tech Inc., the maintainers, and the contributors accept no
liability for any damage, data loss, or other harm arising from its use.
By using, modifying, or redistributing Lume Portal, you agree to hold
Travus Tech Inc., the maintainers, and the contributors harmless from any
claim, damage, or expense arising from your use or misuse of the software.

## Informational content only

Everything the dashboard shows — news headlines, weather, exchange rates,
cryptocurrency prices, market indices, air quality, weather alerts, Bible
verses, and trivia — is **informational only**. It is not financial,
medical, legal, or safety advice, and it is not a substitute for official
sources. In an emergency, rely on official alerts and local authorities,
not on a dashboard screen.

The dashboard depends on third-party feeds and APIs (news publishers' RSS
feeds, Open-Meteo, Yahoo Finance, the European Central Bank / Frankfurter,
CoinGecko, MyMemory and the Google Translate web endpoint used as a
translation fallback, bible-api.com, Wikipedia, Open Trivia DB, and the US
National Weather Service). Those services can change, rate-limit, break, or
disappear without notice, and their data can be delayed or wrong. No
availability, accuracy, or freshness of any feed is guaranteed.

## Third-party content

Headlines, photos, verses, and facts shown by the dashboard belong to their
publishers and authors and are displayed under their respective terms.
Bible text comes from bible-api.com (WEB translation, public domain, in
English; Almeida in Portuguese). Photos come from Pexels and Wikimedia
Commons under their respective licenses. Lume Portal claims no ownership
over third-party content. If you are a rights holder and believe something
is shown incorrectly, please open an issue (see below) and it will be
addressed promptly.

## Privacy

Lume Portal has **no accounts and no passwords**:

- Device settings (language, city, clock and temperature preferences,
  enabled screens and their order, news sources) are stored in Cloudflare
  Workers KV under an anonymous 6-character pairing code. No names, email
  addresses, or other personal data are collected or stored by the project.
- **The pairing code is the only key.** Anyone who knows a device's code
  can view and change that device's settings — version 1 has no additional
  authentication. Keep your device's code private, and do not reuse it
  anywhere else: it is not a password and it is not a credential for any
  other service.
- The public website (home, `/pair/`, and `/preview/`) uses Google
  Analytics for aggregate pageviews. You can block it with any standard
  tracker blocker; the dashboard itself works without it.
- The dashboard calls third-party APIs directly from the device (weather,
  markets, news aggregation, translation). Those providers' privacy
  policies apply to those requests, and your device's IP address may be
  visible to them.
- No personal data is sold, and the dashboard shows no ads.

## Reporting issues

If you believe any content here infringes your rights, or you represent
Meta or any publisher with a concern, please open an issue on this
repository or contact contact@travustech.com. Reports are answered
promptly, including takedown requests for content shown by the dashboard.

---

*This document explains the project's position in plain language. It is
not legal advice. If you need legal certainty for your own use, consult a
licensed attorney.*
