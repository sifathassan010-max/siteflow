import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, logUsage } from "@/lib/usage";
import { dailyVisitorHash } from "@/lib/analytics-hash";
import { NextResponse } from "next/server";

const MAX_PATH_CHARS = 500;
const MAX_REFERRER_CHARS = 500;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// PUBLIC route — no auth check. This is what the embedded tracking script
// calls on every pageview of a customer's site, from that site's own
// domain — hence the CORS headers above. Usage is metered against the SITE
// OWNER's account, same pattern as the chatbot/forms embeds.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: site } = await admin
    .from("analytics_sites")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Unknown site" }, { status: 404, headers: CORS_HEADERS });
  }

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, MAX_PATH_CHARS) : "/";
  const referrer =
    typeof body?.referrer === "string" ? body.referrer.slice(0, MAX_REFERRER_CHARS) : null;

  const usage = await checkUsageLimit(site.user_id, "analytics");
  if (!usage.allowed) {
    // Fail quietly — a tracking script hitting a cap shouldn't ever surface
    // an error to the site owner's visitors.
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const visitorHash = dailyVisitorHash(ip, userAgent);

  const { error } = await admin.from("analytics_events").insert({
    site_id: site.id,
    path,
    referrer,
    visitor_hash: visitorHash,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS });
  }

  await logUsage(site.user_id, "analytics", "pageview");

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
