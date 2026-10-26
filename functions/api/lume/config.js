// Cloudflare Pages Function: GET /api/lume/config?code=XXXXXX
// Returns the stored Lume Portal device config, or {paired:false}.
// Polled by the Lume Portal app every 15s while waiting for setup.

import { validCode, jsonResponse } from '../../_lib/lume.js';

export async function onRequest(context) {
  var kv = context.env && context.env.LUME_KV;
  if (!kv) return jsonResponse({ ok: false, error: 'storage_unavailable' }, 503);
  var url = new URL(context.request.url);
  var code = url.searchParams.get('code') || '';
  if (!validCode(code)) return jsonResponse({ ok: false, error: 'invalid_code' }, 400);
  var raw = await kv.get('config:' + code);
  if (!raw) return jsonResponse({ paired: false });
  var cfg = null;
  try { cfg = JSON.parse(raw); } catch (e) { cfg = null; }
  if (!cfg) return jsonResponse({ paired: false });
  return jsonResponse({
    paired: true,
    config: cfg,
    dashboardUrl: 'https://lumeportal.travustech.ai/?code=' + code
  });
}
