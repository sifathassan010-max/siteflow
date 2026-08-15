import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import SitemapUrlComparisonForm from "./sitemap-url-comparison-form";

export const metadata: Metadata = {
  title: "Compare Two Sitemaps for Missing URLs — Free Sitemap Diff Tool | SiteFlow",
  description:
    "Compare two sitemap.xml files to see which URLs are only in one — useful after a migration, redesign, or staging-to-production launch. Free, no signup required to preview.",
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Sitemap comparison — diff two sitemaps</h1>
    <p className="mt-2 max-w-lg text-slate">
      Paste two sitemap URLs and see exactly which pages are only in the
      first, only in the second, and common to both — handy for catching
      pages a site migration or redesign accidentally dropped.
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
        <div className="mt-6">
          <SitemapUrlComparisonForm />
        </div>
        <AdBanner />
      </PublicToolShell>
    );
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}
      <div className="mt-6">
        <SitemapUrlComparisonForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
