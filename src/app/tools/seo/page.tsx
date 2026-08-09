import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import NewProjectForm from "./new-project-form";

function ScoreDot({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? "bg-flow" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default async function SeoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("seo_projects")
    .select("id, name, root_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: latestScans } = projectIds.length
    ? await supabase
        .from("seo_scans")
        .select("project_id, overall_score, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestScoreByProject = new Map<string, number | null>();
  for (const scan of latestScans ?? []) {
    if (!latestScoreByProject.has(scan.project_id)) {
      latestScoreByProject.set(scan.project_id, scan.overall_score);
    }
  }

  return (
    <DashboardShell email={user.email ?? ""}>
      <h1 className="text-2xl font-bold">SEO tool</h1>
      <p className="mt-2 max-w-lg text-slate">
        Add a site, run a scan, and get a scored on-page SEO audit across
        multiple pages — not just one URL at a time.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-sm font-semibold text-slate">Your projects</h2>

          {!projects || projects.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-sm text-slate">
              No projects yet — add your site to the right and run your first
              scan.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {projects.map((project) => {
                const score = latestScoreByProject.get(project.id) ?? null;
                return (
                  <li key={project.id}>
                    <Link
                      href={`/tools/seo/${project.id}`}
                      className="flex items-center justify-between rounded-xl border border-line bg-white p-4 transition hover:border-ink/30"
                    >
                      <div>
                        <p className="font-semibold">{project.name}</p>
                        <p className="mt-1 text-sm text-slate">{project.root_url}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <ScoreDot score={score} />
                        {score === null ? (
                          <span className="text-slate">Not scanned yet</span>
                        ) : (
                          <span className="font-semibold">{score}/100</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate">Add a site</h2>
          <div className="mt-3">
            <NewProjectForm />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
