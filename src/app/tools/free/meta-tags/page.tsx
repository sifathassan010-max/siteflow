import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import PublicToolShell from "@/components/public-tool-shell";
import AdBanner from "@/components/ad-banner";
import MetaCheckerForm from "./meta-checker-form";

export const metadata: Metadata = {
  title: "Free Meta Tag Checker — Preview Title, Description & OG Tags | SiteFlow",
  description:
    "Paste any URL and check its title tag, meta description, and social share preview tags at a glance. Free, no signup required.",
  alternates: { canonical: "/tools/free/meta-tags" },
  openGraph: {
    title: "Free Meta Tag Checker — Preview Title, Description & OG Tags | SiteFlow",
    description: "Check any page's title tag, meta description, and social preview tags.",
    url: "/tools/free/meta-tags",
  },
};

const INTRO = (
  <>
    <h1 className="text-2xl font-bold">Free meta tag checker</h1>
    <p className="mt-2 max-w-lg text-slate">
      Paste any URL and check its title tag, meta description, and social
      preview tags at a glance.
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
          <MetaCheckerForm />
        </div>
        <AdBanner />
      </PublicToolShell>
    );
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      {INTRO}
      <div className="mt-6">
        <MetaCheckerForm />
      </div>

      <AdBanner />
    </DashboardShell>
  );
}
