# Lume Portal

Kiosk WebView app for Meta Portal (1st gen). Fullscreen, sticky immersive
mode, screen kept on, back button disabled. On first launch it shows a
6-character pairing code; the user enters that code on the setup website
and the app then loads their personal dashboard.

- Package: `com.travustech.lumeportal`
- App label: Lume Portal
- minSdk 28, targetSdk 29, compileSdk 29
- All user-visible text is US English (en-US).
- Permissions: INTERNET only. No MAC address, location, or microphone
  access (a sideloaded app cannot read the real Wi-Fi MAC on Android 9/10
  anyway — it gets null or 02:00:00:00:00:00).

## Behavior

- First run: native pairing screen with a randomly generated 6-character
  code (alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, no confusing 0/O/1/I),
  persisted in SharedPreferences under `pairing_code`. The screen shows the
  Lume logo, a "Pair this device" title, the large code, a QR code encoding
  the full setup URL (`https://lumeportal.travustech.ai/pair/?code=XXXXXX`,
  also shown as monospace text below the code), a status line (gold
  "Waiting for setup…" / green "Paired"), and the action button, with the
  small TravusTech wordmark at the bottom. The QR is rendered locally with
  ZXing core (error correction M, white card as quiet zone — no network
  needed for the code itself). The layout is responsive: a single centered
  column by default, a two-column layout in landscape (code side + QR
  side), sizes from `values` / `values-sw600dp` / `values-sw720dp` dimens
  buckets, and a ScrollView safety net so nothing is cut off on short
  displays.
- Launcher icon: legacy PNGs generated from `assets/lume-icon.png`
  (full-bleed art, no adaptive icon): mdpi 48, hdpi 72, xhdpi 96,
  xxhdpi 144, xxxhdpi 192, as `ic_launcher` in `res/mipmap-*`.
  `assets/lume-logo.png` is the pairing-screen logo source (downscaled to
  1200px wide in `res/drawable/lume_logo.png`); the TravusTech wordmark
  (`res/drawable/travus_logo.png`) was rendered from its SVG source via
  cairosvg (the SVG's artwork bleeds ~2px past its viewBox, so it was
  rendered on an expanded canvas and trimmed to content).
- "Open dashboard" loads `https://lumeportal.travustech.ai/preview/` immediately
  (usable before any backend exists).
- Every 15 seconds the app GETs
  `https://lumeportal.travustech.ai/api/lume/config?code=XXXXXX`.
  Failures and non-200s are silently ignored. A JSON response with
  `paired=true` and a `dashboardUrl` string makes the app load that URL,
  persist it as `dashboard_url`, and stop polling.
- Later launches with a stored `dashboard_url` skip the pairing screen
  and load it directly. On launch, a stored URL on the old host
  (`portal-news-6t7.pages.dev`) is rewritten to `lumeportal.travustech.ai`
  and re-persisted (one-time migration).
- Long-press anywhere on the dashboard brings the pairing screen back:
  it shows the stored code, a "Paired" status, the setup-site URL, and a
  "Back to dashboard" button that reloads the stored dashboard URL (a
  fresh load picks up any config newly saved on the site). Config polling
  is NOT restarted. Double-tap was rejected for this: dashboard taps
  navigate (side tap zones advance/back), so a double-tap would advance
  twice before any overlay appears; long-press has no such conflict.
- WebView load failures show a native retry screen with a Retry button.

## Build

The Gradle wrapper is present (`gradlew`, AGP 7.4.2, Gradle 7.5.1), but
in this VM Gradle is unreliable: the wrapper distribution download fails
with a Java/proxy `NoSuchElementException`, and the Gradle daemon IPC
over loopback fails in this sandbox. The working build is manual:

```sh
export JAVA_HOME=~/jdk-17 ANDROID_HOME=~/android-sdk
export PATH=$JAVA_HOME/bin:$PATH
BT=$ANDROID_HOME/build-tools/29.0.3
AJ=$ANDROID_HOME/platforms/android-29/android.jar
ZX=libs/zxing-core-3.5.3.jar
$BT/aapt2 compile --dir app/src/main/res -o build/compiled.zip
$BT/aapt2 link build/compiled.zip -I $AJ \
  --manifest app/src/main/AndroidManifest.xml --java build/gen \
  -o build/base.apk
javac -source 8 -target 8 -bootclasspath $AJ -cp $AJ:$ZX -d build/obj \
  $(find app/src/main/java -name '*.java') $(find build/gen -name '*.java')
$BT/d8 --lib $AJ --output build/dex $(find build/obj -name '*.class') $ZX
cd build/dex && zip -q ../base.apk classes.dex && cd ../..
$BT/zipalign -f 4 build/base.apk build/aligned.apk
$BT/apksigner sign --ks keystore/debug.keystore \
  --ks-key-alias lumeportal --ks-pass pass:android --key-pass pass:android \
  --out lume-portal-debug.apk build/aligned.apk
```

The debug keystore (`keystore/debug.keystore`, alias `lumeportal`,
password `android`) is project-local and git-ignored, so rebuilds keep
the same signing key. The ZXing core jar (`libs/zxing-core-3.5.3.jar`,
from Maven Central) is committed in the repo so QR builds stay
reproducible.

## Install (Meta Portal via ADB)

```sh
adb install -r lume-portal-debug.apk
adb shell am start -n com.travustech.lumeportal/.MainActivity
```

NOT tested on a real Portal — no Portal hardware is available in this
environment. On-device testing is still required.
