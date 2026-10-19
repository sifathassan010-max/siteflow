import Script from "next/script";

// Clickadilla ad script + banner slot. Rendered under the tool box on
// FREE tool pages only (never on paid tool pages or the dashboard) —
// import this and drop <AdBanner /> at the bottom of each free tool's
// page.tsx, right after the tool's main content box.
export default function AdBanner() {
  return (
    <div className="mt-8">
      <Script
        async
        src="https://js.wpadmngr.com/static/adManager.js"
        data-admpid="452827"
        strategy="afterInteractive"
      />
      <div data-banner-id="1498937" />
    </div>
  );
}
