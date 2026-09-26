import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import AdBannerTop from "@/components/ad-banner-top";
import SitemapCheckerForm from "./sitemap-checker-form";

export const metadata: Metadata = {
  title: "Find a Website's Sitemap.xml — Free Sitemap Finder | SiteFlow",
  description:
    "Enter any domain to find its XML sitemap. Checks robots.txt and common sitemap paths, then reports how many URLs each sitemap contains. Free, no signup required.",
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Sitemap finder — locate any site's sitemap.xml</h1>
    <p className="mt-2 max-w-lg text-slate">
      Enter a domain and this tool checks robots.txt plus the common sitemap
      locations to find where a site's XML sitemap actually lives, then
      reports what's inside it.
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
          <SitemapCheckerForm />
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
        <SitemapCheckerForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
