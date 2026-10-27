// Cloudflare Pages Function: GET /api/photos?folder=<drive-folder-id>
// Lists image files in a public Google Drive folder (Drive API v3) and
// returns direct thumbnail URLs. The dashboard displays each photo with
// a plain <img> — no Drive iframe, no Drive UI anywhere.
// Requires GOOGLE_DRIVE_API_KEY in the Pages project environment
// (server-side only, never in client code). Without it, the dashboard
// simply skips the Photos screen: {ok:false, error:'no_key'}.

import { jsonResponse } from '../_lib/lume.js';

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var folder = (url.searchParams.get('folder') || '').trim();
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(folder)) {
    return jsonResponse({ ok: false, error: 'bad_folder' }, 400);
  }
  var key = context.env && context.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return jsonResponse({ ok: false, error: 'no_key' });
  var q = "'" + folder + "' in parents and mimeType contains 'image/' and trashed = false";
  var api = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
    '&orderBy=name&pageSize=100&fields=files(id,name,mimeType)&key=' + encodeURIComponent(key);
  var res;
  try {
    res = await fetch(api);
  } catch (e) {
    return jsonResponse({ ok: false, error: 'drive_network' });
  }
  if (!res.ok) return jsonResponse({ ok: false, error: 'drive_' + res.status });
  var data = await res.json();
  var photos = (data.files || []).map(function (f) {
    return { id: f.id, name: f.name, url: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w1920' };
  });
  return jsonResponse({ ok: true, count: photos.length, photos: photos });
}
