import Script from "next/script";

// Monetag ad tag. Rendered above the tool box on FREE tool pages only
// (never on paid tool pages or the dashboard) — import this and drop
// <AdBannerTop /> right after the page's intro text, before the tool's
// main content box. Pairs with <AdBanner /> (Clickadilla) at the bottom of
// the same pages.
export default function AdBannerTop() {
  return (
    <div className="mt-6">
      <Script id="monetag-tag" strategy="afterInteractive">
        {`(function(s){s.dataset.zone='11627802',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
      </Script>
    </div>
  );
}
