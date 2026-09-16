"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// SiteFlow's own chat widget, on SiteFlow's own marketing/app pages.
//
// This used to be a plain <Script> in the root layout. That was the cause
// of a long-running bug: the root layout also wraps /embed/[id] — the page
// the chat panel itself loads inside its iframe — so widget.js ran again
// *inside* the open chat panel. That inner copy drew its own launcher
// bubble over the panel and, when clicked, opened another chat panel on
// top of the first one (and so on, one nesting level per click). The outer
// bubble was hiding correctly the whole time; what stayed visible was the
// nested copy.
//
// So the script is only ever mounted when BOTH are true:
//   1. the current path is not an /embed/* route (the widget must never
//      load on the pages that are meant to be embedded), and
//   2. this document is the top-level window, not an iframe — which also
//      covers anyone who embeds a SiteFlow page some other way.
//
// The <noscript> iframe fallback that used to sit next to the script is
// gone on purpose: with JavaScript disabled it would have nested the same
// way (an /embed page rendering another /embed iframe, forever) and it
// added a 600px chat iframe to every single page for those visitors.
const WIDGET_SRC =
  "https://siteflow-omega.vercel.app/embed/aa2d30e3-bccc-4a1c-90e1-b885cef18043/widget.js";

const WIDGET_SCRIPT_ID = "siteflow-site-widget-loader";

function isEmbedPath(pathname: string | null) {
  return !!pathname && pathname.startsWith("/embed");
}

export default function SiteChatWidget() {
  const pathname = usePathname();

  useEffect(() => {
    if (isEmbedPath(pathname)) return;
    // Inside an iframe: never load the launcher.
    if (typeof window === "undefined" || window.self !== window.top) return;
    // Already loaded once in this page load — widget.js also guards itself,
    // but don't even add a second <script> tag.
    if (document.getElementById(WIDGET_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, [pathname]);

  return null;
}
