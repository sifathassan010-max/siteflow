import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import SitemapValidatorForm from "./sitemap-validator-form";

export const metadata: Metadata = {
  title: "Check If a Sitemap.xml Is Valid — Free Sitemap Validator | SiteFlow",
  description:
    "Paste a sitemap.xml URL to check it against the sitemaps.org protocol: well-formed XML, correct namespace, URL and size limits, broken loc entries, and more. Free, no signup required.",
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Sitemap validator — check a sitemap.xml is valid</h1>
    <p className="mt-2 max-w-lg text-slate">
      Paste a sitemap URL and this checks it against the sitemaps.org
      protocol — well-formed XML, correct root element and namespace, the
      50,000-URL and 50MB limits, broken links, and bad priority or
      changefreq values.
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
          <SitemapValidatorForm />
        </div>
        <AdBanner />
      </PublicToolShell>
    );
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}
      <div className="mt-6">
        <SitemapValidatorForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
