// Cloudflare Pages Function for / only.
// Already-paired devices store a dashboard URL of the form /?code=XXXXXX.
// Keep them working after the dashboard moved to /preview/: redirect to
// /preview/ preserving the full original query string. Without ?code=,
// fall through to the static marketing page.
export async function onRequest(context) {
  var url = new URL(context.request.url);
  if (url.searchParams.has('code')) {
    return Response.redirect(url.origin + '/preview/' + url.search, 302);
  }
  return context.next();
}
