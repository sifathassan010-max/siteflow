import Script from "next/script";

// Monetag ad script. Rendered above the tool box on FREE tool pages only
// (never on paid tool pages or the dashboard) — import this and drop
// <AdBannerTop /> right after the page's intro text, before the tool's
// main content box. Pairs with <AdBanner /> (Clickadilla) at the bottom of
// the same pages.
export default function AdBannerTop() {
  return (
    <div className="mt-6">
      <Script
        src="https://quge5.com/88/tag.min.js"
        data-zone="270443"
        data-cfasync="false"
        strategy="afterInteractive"
      />
    </div>
  );
}
