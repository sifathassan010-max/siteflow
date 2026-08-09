import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import RunScanButton from "./run-scan-button";
import ScanResults from "./scan-results";
import DeleteProjectButton from "./delete-project-button";

export default async function SeoProjectPage({
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

  const { data: project } = await supabase
    .from("seo_projects")
    .select("id, name, root_url, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) notFound();

  const { data: scans } = await supabase
    .from("seo_scans")
    .select("id, overall_score, pages, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const latestScan = scans?.[0] ?? null;
  const olderScans = scans?.slice(1) ?? [];

  return (
    <DashboardShell email={user.email ?? ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-slate">{project.root_url}</p>
        </div>
        <DeleteProjectButton projectId={project.id} projectName={project.name} />
      </div>

      <div className="mt-6">
        <RunScanButton projectId={project.id} />
      </div>

      <div className="mt-8">
        {!latestScan ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-sm text-slate">
            No scans yet — click &quot;Run new scan&quot; above to audit this site.
          </p>
        ) : (
          <ScanResults
            overallScore={latestScan.overall_score}
            pages={latestScan.pages}
            scannedAt={latestScan.created_at}
          />
        )}
      </div>

      {olderScans.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate">Scan history</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {olderScans.map((scan) => (
              <li
                key={scan.id}
                className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-2.5 text-sm"
              >
                <span className="text-slate">
                  {new Date(scan.created_at).toLocaleString()}
                </span>
                <span className="font-semibold">{scan.overall_score}/100</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardShell>
  );
}
