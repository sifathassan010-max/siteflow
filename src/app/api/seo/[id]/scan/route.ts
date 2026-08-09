import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, logUsage } from "@/lib/usage";
import { crawlSite } from "@/lib/seo-audit";
import { NextResponse } from "next/server";

// Crawling + fetching several pages sequentially can take a while — give
// this route more room than the default 10s. (Hobby plan supports up to 60s
// via maxDuration.)
export const maxDuration = 60;

// Hard ceiling per single scan, independent of trial/paid limits — keeps
// any one run within the function's time budget.
const MAX_PAGES_PER_SCAN = 8;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("seo_projects")
    .select("id, root_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const usage = await checkUsageLimit(user.id, "seo");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error:
          "You've used all your SEO scan pages on the trial. Upgrade to keep scanning.",
      },
      { status: 402 }
    );
  }

  // Paid+active accounts get { allowed: true } with no `limit`/`used` fields
  // (see checkUsageLimit) — treat that as "no cap", otherwise respect
  // whatever's left of the trial pool.
  const remaining =
    "limit" in usage && "used" in usage
      ? Math.max(0, usage.limit - usage.used)
      : MAX_PAGES_PER_SCAN;
  const pagesToScan = Math.max(1, Math.min(MAX_PAGES_PER_SCAN, remaining));

  const pages = await crawlSite(project.root_url, pagesToScan);

  if (pages.length === 0) {
    return NextResponse.json(
      { error: "Couldn't scan that site — check the URL is correct and publicly reachable." },
      { status: 400 }
    );
  }

  const overallScore = Math.round(
    pages.reduce((sum, p) => sum + p.score, 0) / pages.length
  );

  const { data: scan, error } = await supabase
    .from("seo_scans")
    .insert({
      project_id: project.id,
      user_id: user.id,
      overall_score: overallScore,
      pages,
    })
    .select("id, overall_score, pages, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logUsage(user.id, "seo", "page_scan", pages.length);

  return NextResponse.json({ scan });
}
