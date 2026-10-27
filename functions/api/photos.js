// Cloudflare Pages Function: GET /api/photos?folder=<drive-folder-id>
// Lists image AND video files in a public Google Drive folder (Drive API
// v3), in filename order, looping. Photos are shown directly with a
// plain <img> (Drive thumbnail URL); videos play muted with a plain
// <video> whose src is /api/media (server-side proxy — the API key
// never reaches the client). No Drive iframe, no Drive UI anywhere.
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
  var q = "'" + folder + "' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false";
  var api = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
    '&orderBy=name&pageSize=100&fields=files(id,name,mimeType,videoMediaMetadata)&key=' + encodeURIComponent(key);
  var res;
  try {
    res = await fetch(api);
  } catch (e) {
    return jsonResponse({ ok: false, error: 'drive_network' });
  }
  if (!res.ok) return jsonResponse({ ok: false, error: 'drive_' + res.status });
  var data = await res.json();
  var photos = [];
  var videos = [];
  var items = (data.files || []).map(function (f) {
    var isVideo = (f.mimeType || '').indexOf('video/') === 0;
    var item;
    if (isVideo) {
      item = {
        id: f.id, name: f.name, kind: 'video',
        url: '/api/media?id=' + encodeURIComponent(f.id),
        poster: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w1920'
      };
      if (f.videoMediaMetadata && typeof f.videoMediaMetadata.durationMillis === 'number') {
        item.durationMs = f.videoMediaMetadata.durationMillis;
      }
      videos.push(item);
    } else {
      item = {
        id: f.id, name: f.name, kind: 'image',
        url: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w1920'
      };
      photos.push(item);
    }
    return item;
  });
  return jsonResponse({ ok: true, count: items.length, photos: photos, videos: videos, items: items });
}
