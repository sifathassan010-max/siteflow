import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import NewSiteForm from "./new-site-form";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sites } = await supabase
    .from("analytics_sites")
    .select("id, name, domain, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-2 max-w-lg text-slate">
        Add a site, drop one script tag on it, and see pageviews, top pages,
        and referrers here — no cookies, nothing that needs a consent banner.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-sm font-semibold text-slate">Your sites</h2>

          {!sites || sites.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-sm text-slate">
              No sites yet — add one to the right to get your tracking script.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {sites.map((site) => (
                <li key={site.id}>
                  <Link
                    href={`/tools/analytics/${site.id}`}
                    className="block rounded-xl border border-line bg-white p-4 transition hover:border-ink/30"
                  >
                    <p className="font-semibold">{site.name}</p>
                    <p className="mt-1 text-sm text-slate">{site.domain}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Add a site</h2>
          <div className="mt-3">
            <NewSiteForm />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
