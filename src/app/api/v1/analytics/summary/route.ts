import { authenticateApiRequest } from "@/lib/api-auth";
import { checkApiUsageLimit, logApiUsage } from "@/lib/api-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const MAX_DAYS = 90;

// GET /api/v1/analytics/summary?siteId=...&days=7
// Auth: Authorization: Bearer sk_live_...
// Returns pageview/visitor counts and top pages for ONE of the caller's
// own analytics sites (created in the dashboard analytics tool) over the
// requested window — e.g. for an agent asked "how's traffic looking this
// week?". This does not create/edit sites — that still happens in the
// dashboard.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const usage = await checkApiUsageLimit(auth.userId, "analytics");
  if (!usage.allowed) {
    const message =
      usage.reason === "no_plan"
        ? "This API key's account doesn't have an active Analytics API plan. Subscribe at siteflow-omega.vercel.app/pricing."
        : `Monthly quota exceeded (${usage.used}/${usage.limit} calls this month). Resets at the start of next month.`;
    return NextResponse.json({ error: message }, { status: 402 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const daysParam = Number(searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), MAX_DAYS) : 7;

  if (!siteId) {
    return NextResponse.json({ error: "Missing required query param: siteId" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ownership check — an API key can only read data for sites belonging
  // to the same account it authenticates as.
  const { data: site } = await admin
    .from("analytics_sites")
    .select("id, name, domain")
    .eq("id", siteId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "No analytics site with that id on this account." }, { status: 404 });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await admin
    .from("analytics_events")
    .select("path, visitor_hash, created_at")
    .eq("site_id", siteId)
    .gte("created_at", since);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = events ?? [];
  const uniqueVisitors = new Set(rows.map((e) => e.visitor_hash).filter(Boolean)).size;

  const pathCounts = new Map<string, number>();
  for (const e of rows) {
    pathCounts.set(e.path, (pathCounts.get(e.path) ?? 0) + 1);
  }
  const topPages = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  await logApiUsage(auth.userId, "analytics", "analytics_summary");

  return NextResponse.json({
    site: { id: site.id, name: site.name, domain: site.domain },
    windowDays: days,
    pageviews: rows.length,
    uniqueVisitors,
    topPages,
  });
}
