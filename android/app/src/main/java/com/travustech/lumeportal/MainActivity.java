package com.travustech.lumeportal;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.SecureRandom;
import java.util.EnumMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String PREFS = "lume_portal";
    private static final String KEY_CODE = "pairing_code";
    private static final String KEY_URL = "dashboard_url";
    private static final String OLD_HOST = "portal-news-6t7.pages.dev";
    private static final String NEW_HOST = "lumeportal.travustech.ai";
    private static final String DEFAULT_DASHBOARD_URL = "https://" + NEW_HOST + "/preview/";
    private static final String CONFIG_URL_TEMPLATE =
            "https://" + NEW_HOST + "/api/lume/config?code=%s";
    private static final String PAIR_URL_TEMPLATE =
            "https://" + NEW_HOST + "/pair/?code=%s";
    private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final long POLL_INTERVAL_MS = 15000;

    private WebView webView;
    private View pairingView;
    private View errorView;
    private String pairingCode;
    private String lastUrl;
    private boolean paired;
    private Handler pollHandler;
    private Runnable pollRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        pairingView = findViewById(R.id.pairing_view);
        errorView = findViewById(R.id.error_view);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // Kiosk lockdown: dragging from the screen edges must never move the
        // page or show scroll bars. No scroll indicators, no overscroll
        // glow/edge effect, no pinch zoom - taps still reach the dashboard.
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showError();
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Lock page scrolling without touching the dashboard code:
                // the dashboard is a single-page app that loads once, so one
                // injection persists. This only removes scrolling, not taps.
                view.evaluateJavascript(
                        "document.documentElement.style.overflow='hidden';"
                                + "document.body.style.overflow='hidden';",
                        null);
            }
        });

        // Long-press anywhere on the dashboard brings the pairing screen back.
        // Taps keep navigating the dashboard (side tap zones advance/back), so
        // double-tap was rejected: it would advance twice before any overlay.
        // The long-click listener suppresses WebView's own long-press actions
        // (text selection, context menus); the detector below shows the screen.
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });
        final GestureDetector longPressDetector = new GestureDetector(this,
                new GestureDetector.SimpleOnGestureListener() {
                    @Override
                    public void onLongPress(MotionEvent e) {
                        showPairingAgain();
                    }
                });
        // Drag lock: the Portal's WebView visually stretches/pulls content
        // on drag gestures even with scrollbars off, OVER_SCROLL_NEVER and
        // overflow:hidden, because it still receives the full drag stream.
        // So once a gesture moves beyond the system touch slop, swallow it:
        // that MOVE and every later event of the gesture return true, and
        // the WebView never sees a drag. Taps (DOWN+UP without significant
        // movement) still reach the WebView, and a finger held still still
        // fires the long-press above.
        final int touchSlop = ViewConfiguration.get(this).getScaledTouchSlop();
        final float[] downPos = new float[2];
        final boolean[] dragDetected = new boolean[1];
        webView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        dragDetected[0] = false;
                        downPos[0] = event.getX();
                        downPos[1] = event.getY();
                        break;
                    case MotionEvent.ACTION_MOVE:
                        if (!dragDetected[0]) {
                            float dx = event.getX() - downPos[0];
                            float dy = event.getY() - downPos[1];
                            if (dx * dx + dy * dy > touchSlop * touchSlop) {
                                dragDetected[0] = true;
                            }
                        }
                        if (dragDetected[0]) {
                            return true;
                        }
                        break;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        boolean wasDrag = dragDetected[0];
                        dragDetected[0] = false;
                        if (wasDrag) {
                            return true;
                        }
                        break;
                    default:
                        break;
                }
                return longPressDetector.onTouchEvent(event);
            }
        });

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        pairingCode = prefs.getString(KEY_CODE, null);
        if (pairingCode == null) {
            pairingCode = generateCode();
            prefs.edit().putString(KEY_CODE, pairingCode).apply();
        }

        // One-time migration: already-paired devices move to the new domain.
        String storedUrl = prefs.getString(KEY_URL, null);
        if (storedUrl != null && !storedUrl.isEmpty()) {
            String migrated = migrateDomain(storedUrl);
            if (!migrated.equals(storedUrl)) {
                prefs.edit().putString(KEY_URL, migrated).apply();
                storedUrl = migrated;
            }
        }

        Button openButton = findViewById(R.id.open_dashboard);
        openButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (paired) {
                    // Back to dashboard: a fresh load picks up any config
                    // newly saved on the setup site.
                    String url = getSharedPreferences(PREFS, MODE_PRIVATE)
                            .getString(KEY_URL, null);
                    loadUrl(url != null && !url.isEmpty()
                            ? url : DEFAULT_DASHBOARD_URL);
                } else {
                    loadUrl(DEFAULT_DASHBOARD_URL);
                }
            }
        });

        if (storedUrl != null && !storedUrl.isEmpty()) {
            paired = true;
            loadUrl(storedUrl);
        } else {
            showPairing(false);
            startPolling();
        }

        Button retryButton = findViewById(R.id.retry_button);
        retryButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (lastUrl != null) {
                    loadUrl(lastUrl);
                }
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    @Override
    public void onBackPressed() {
        // Kiosk: back button does nothing.
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        stopPolling();
        super.onDestroy();
    }

    private void showPairing(boolean alreadyPaired) {
        TextView codeView = findViewById(R.id.pairing_code);
        codeView.setText(pairingCode);
        TextView statusView = findViewById(R.id.pairing_status);
        statusView.setText(alreadyPaired
                ? R.string.pairing_status_paired : R.string.pairing_status);
        // Green once paired, gold while waiting - a quick status read.
        statusView.setTextColor(alreadyPaired ? 0xFF4CAF50 : 0xFFF5B942);
        // Full config URL as text, plus a QR code encoding exactly the
        // same URL, in both states (waiting and paired).
        String pairUrl = String.format(PAIR_URL_TEMPLATE, pairingCode);
        TextView urlView = findViewById(R.id.pairing_url);
        urlView.setText(pairUrl);
        View qrCard = findViewById(R.id.pairing_qr_card);
        ImageView qrView = findViewById(R.id.pairing_qr);
        Bitmap qr = makeQrBitmap(pairUrl, 800);
        if (qr != null) {
            qrView.setImageBitmap(qr);
            qrCard.setVisibility(View.VISIBLE);
        } else {
            qrCard.setVisibility(View.GONE);
        }
        Button openButton = findViewById(R.id.open_dashboard);
        openButton.setText(alreadyPaired
                ? R.string.back_to_dashboard : R.string.open_dashboard);
        pairingView.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);
        errorView.setVisibility(View.GONE);
    }

    private void showPairingAgain() {
        // Re-shown on demand after pairing: polling stays stopped.
        showPairing(true);
    }

    private void showWeb() {
        pairingView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        errorView.setVisibility(View.GONE);
    }

    private void showError() {
        pairingView.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    private void loadUrl(String url) {
        lastUrl = url;
        showWeb();
        webView.loadUrl(url);
    }

    private static String migrateDomain(String url) {
        if (url != null && url.contains(OLD_HOST)) {
            return url.replace(OLD_HOST, NEW_HOST);
        }
        return url;
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    // QR code for the setup URL, rendered locally with ZXing (no network
    // needed for the code itself). Error correction M plus a 2-module
    // margin, plus the white card padding in the layout, keep the code
    // scannable; the bitmap is rendered large (800px) so it stays crisp
    // at any display density, and the ImageView scales it to the
    // responsive qr size from dimens.
    private Bitmap makeQrBitmap(String text, int sizePx) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 2);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            BitMatrix matrix = new QRCodeWriter().encode(
                    text, BarcodeFormat.QR_CODE, sizePx, sizePx, hints);
            int[] pixels = new int[sizePx * sizePx];
            for (int y = 0; y < sizePx; y++) {
                for (int x = 0; x < sizePx; x++) {
                    pixels[y * sizePx + x] = matrix.get(x, y) ? 0xFF000000 : 0xFFFFFFFF;
                }
            }
            Bitmap bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
            bitmap.setPixels(pixels, 0, sizePx, 0, 0, sizePx, sizePx);
            return bitmap;
        } catch (WriterException e) {
            return null;
        }
    }

    private void startPolling() {
        if (pollHandler != null) {
            return;
        }
        pollHandler = new Handler();
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (paired) {
                    return;
                }
                pollConfig();
                if (pollHandler != null && !paired) {
                    pollHandler.postDelayed(this, POLL_INTERVAL_MS);
                }
            }
        };
        pollHandler.post(pollRunnable);
    }

    private void stopPolling() {
        if (pollHandler != null && pollRunnable != null) {
            pollHandler.removeCallbacks(pollRunnable);
        }
        pollHandler = null;
        pollRunnable = null;
    }

    private void pollConfig() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(String.format(CONFIG_URL_TEMPLATE, pairingCode));
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);
                    conn.setRequestMethod("GET");
                    int status = conn.getResponseCode();
                    if (status != 200) {
                        return; // Backend does not exist yet: ignore silently.
                    }
                    InputStream in = conn.getInputStream();
                    BufferedReader reader =
                            new BufferedReader(new InputStreamReader(in, "UTF-8"));
                    StringBuilder body = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                    }
                    JSONObject json = new JSONObject(body.toString());
                    if (!json.optBoolean("paired", false)) {
                        return;
                    }
                    final String dashboardUrl =
                            migrateDomain(json.optString("dashboardUrl", null));
                    if (dashboardUrl == null || dashboardUrl.isEmpty()) {
                        return;
                    }
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            paired = true;
                            getSharedPreferences(PREFS, MODE_PRIVATE)
                                    .edit()
                                    .putString(KEY_URL, dashboardUrl)
                                    .apply();
                            stopPolling();
                            loadUrl(dashboardUrl);
                        }
                    });
                } catch (Exception e) {
                    // Silently ignore: no network, no backend, bad JSON.
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        }).start();
    }
}
