import { NextResponse } from "next/server";

// PUBLIC route — serves a small JS file, not a page. Customers add:
//   <script defer src="https://yoursite.com/embed/analytics/SITE_ID/script.js"></script>
// This sends one pageview on load, plus one on every client-side route
// change (covers React/Vue/etc. single-page apps via pushState/popstate),
// without using cookies or any client-side storage.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;

  const script = `
(function () {
  var siteId = ${JSON.stringify(id)};
  var endpoint = ${JSON.stringify(`${origin}/api/embed/analytics/${id}/track`)};

  function send() {
    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: location.pathname + location.search,
          referrer: document.referrer || null,
        }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  send();

  // Cover client-side navigation in single-page apps.
  var origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    send();
  };
  window.addEventListener("popstate", send);
})();
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
