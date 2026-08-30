import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import EmbedScriptBox from "./embed-script-box";
import StatsDashboard from "./stats-dashboard";
import DeleteSiteButton from "./delete-site-button";

export default async function AnalyticsSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("analytics_sites")
    .select("id, name, domain, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) notFound();

  return (
    <DashboardShell email={user.email ?? ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="mt-1 text-slate">{site.domain}</p>
        </div>
        <DeleteSiteButton siteId={site.id} siteName={site.name} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="text-sm font-semibold text-slate">Stats</h2>
          <div className="mt-3">
            <StatsDashboard siteId={site.id} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Tracking script</h2>
          <div className="mt-3">
            <EmbedScriptBox siteId={site.id} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
