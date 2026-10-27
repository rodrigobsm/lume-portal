// Cloudflare Pages Function: GET /api/media?id=<drive-file-id>
// Streams a video file from Google Drive to the dashboard's <video>
// element. The Drive API key stays server-side (X-Goog-Api-Key header);
// the client only ever sees this same-origin URL. Byte-range requests
// are forwarded so the browser can stream progressively; the upstream
// body is passed through without buffering.

import { jsonResponse } from '../_lib/lume.js';

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var id = (url.searchParams.get('id') || '').trim();
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    return jsonResponse({ ok: false, error: 'bad_id' }, 400);
  }
  var key = context.env && context.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return jsonResponse({ ok: false, error: 'no_key' }, 503);
  var headers = { 'X-Goog-Api-Key': key };
  var range = context.request.headers.get('range');
  if (range) headers['Range'] = range;
  var res;
  try {
    res = await fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', { headers: headers });
  } catch (e) {
    return jsonResponse({ ok: false, error: 'drive_network' }, 502);
  }
  if (!res.ok) return jsonResponse({ ok: false, error: 'drive_' + res.status }, res.status);
  var out = new Headers();
  var ct = res.headers.get('content-type');
  if (ct) out.set('Content-Type', ct);
  var cl = res.headers.get('content-length');
  if (cl) out.set('Content-Length', cl);
  var cr = res.headers.get('content-range');
  if (cr) out.set('Content-Range', cr);
  var ar = res.headers.get('accept-ranges');
  if (ar) out.set('Accept-Ranges', ar);
  out.set('Cache-Control', 'no-store');
  return new Response(res.body, { status: res.status, headers: out });
}
