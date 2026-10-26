# Security policy

## Supported versions

Only the latest release (the APK served at `/downloads/lume-portal.apk`
and the current `main` branch) receives fixes. Older APK versions are not
patched.

## Reporting a vulnerability

Please open an issue on this repository describing the problem, or use
GitHub's private vulnerability reporting for this repo if it is available.
Do not publish an exploit before it has been addressed.

Reports are triaged by the maintainers; there is no guaranteed response
time, and no bug bounty.

## What to know before reporting

- **Pairing codes are not credentials.** A 6-character device code is an
  identifier, not a password: anyone who knows it can view and change that
  device's settings (see [DISCLAIMER.md](DISCLAIMER.md)). That is the
  documented behavior of version 1, not a vulnerability — but if you find a
  way to enumerate codes or reach another device's data without knowing
  its code, that *is* worth reporting.
- The dashboard depends on third-party feeds and APIs. Problems inside
  those services (a broken feed, a rate limit, a wrong forecast) should be
  reported to the provider; this repo can only work around them.
- Never include secrets in an issue or pull request: no API keys, tokens,
  passwords, keystores, or signing keys. The project's debug keystore is
  intentionally not in this repository.
