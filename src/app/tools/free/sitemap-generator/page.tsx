import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import AdBannerTop from "@/components/ad-banner-top";
import SitemapGeneratorForm from "./sitemap-generator-form";

export const metadata: Metadata = {
  title: "Generate a Sitemap.xml From Any Website — Free Sitemap Generator | SiteFlow",
  description:
    "Crawl a website and generate a ready-to-use sitemap.xml from its internal links — no software install. Free for sites up to 150 pages, no signup required to preview.",
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Sitemap generator — build a sitemap.xml by crawling a site</h1>
    <p className="mt-2 max-w-lg text-slate">
      Enter a domain and this crawls its internal links (up to 150 pages on
      the free tier) and builds a ready-to-download sitemap.xml — handy for
      sites that don't have one yet or whose sitemap has gone stale.
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
          <SitemapGeneratorForm />
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
        <SitemapGeneratorForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
