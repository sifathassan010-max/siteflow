import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import AdBannerTop from "@/components/ad-banner-top";
import SitemapUrlExtractorForm from "./sitemap-url-extractor-form";

export const metadata: Metadata = {
  title: "Extract All URLs From a Sitemap.xml — Free Tool | SiteFlow",
  description:
    "Pull every URL out of a sitemap.xml or sitemap index into a plain list you can copy or download as a .txt file. Free, no signup required to preview.",
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Sitemap URL extractor — pull every URL from a sitemap</h1>
    <p className="mt-2 max-w-lg text-slate">
      Paste a sitemap URL (a regular sitemap or a sitemap index) and get
      every listed page URL back as a plain list you can copy or download.
    </p>
  </>
);

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PublicToolShell>
        {INTRO}
        <AdBannerTop />
        <div className="mt-6">
          <SitemapUrlExtractorForm />
        </div>
        <AdBanner />
      </PublicToolShell>
    );
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}
      <AdBannerTop />
      <div className="mt-6">
        <SitemapUrlExtractorForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
