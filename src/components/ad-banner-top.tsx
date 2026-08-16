import Script from "next/script";

// Monetag Vignette Banner (single zone — replaced the earlier Multitag setup
// on purpose, since Multitag's Push Notification format was following
// visitors across the whole site instead of staying on free tool pages
// only. Vignette Banner is page-scoped, like the rest of the ads here).
// Rendered above the tool box on FREE tool pages only (never on paid tool
// pages or the dashboard) — import this and drop <AdBannerTop /> right
// after the page's intro text, before the tool's main content box. Pairs
// with <AdBanner /> (Clickadilla) at the bottom of the same pages.
export default function AdBannerTop() {
  return (
    <div className="mt-6">
      <Script id="monetag-vignette-banner" strategy="afterInteractive">
        {`(function(s){s.dataset.zone='11586041',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
      </Script>
    </div>
  );
}
