// Cloudflare Pages Function: POST /api/lume/pair
// Saves a Lume Portal device config, keyed by the 6-character pairing
// code shown on the device. The code is the key: no account or password
// in v1 (32^6 combinations make guessing impractical).

import { validCode, normalizeConfig, jsonResponse } from '../../_lib/lume.js';

export async function onRequest(context) {
  var kv = context.env && context.env.LUME_KV;
  if (!kv) return jsonResponse({ ok: false, error: 'storage_unavailable' }, 503);
  if (context.request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }
  var text = '';
  try {
    text = await context.request.text();
  } catch (e) {
    return jsonResponse({ ok: false, error: 'bad_body' }, 400);
  }
  if (text.length > 16384) return jsonResponse({ ok: false, error: 'body_too_large' }, 413);
  var body = null;
  try {
    body = JSON.parse(text);
  } catch (e) {
    return jsonResponse({ ok: false, error: 'bad_json' }, 400);
  }
  if (!body || !validCode(body.code)) {
    return jsonResponse({ ok: false, error: 'invalid_code' }, 400);
  }
  var cfg = normalizeConfig(body.config);
  await kv.put('config:' + body.code, JSON.stringify(cfg));
  return jsonResponse({ ok: true });
}
