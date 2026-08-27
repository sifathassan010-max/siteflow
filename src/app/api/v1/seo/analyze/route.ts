import { authenticateApiRequest } from "@/lib/api-auth";
import { checkApiUsageLimit, logApiUsage } from "@/lib/api-usage";
import { analyzePage } from "@/lib/seo-audit";
import { NextResponse } from "next/server";

// POST /api/v1/seo/analyze
// Body: { "url": "https://example.com" }
// Auth: Authorization: Bearer sk_live_...
// Runs the same single-page SEO audit as the dashboard SEO tool, scoped to
// the calling API key's monthly quota rather than the account owner's
// dashboard-plan usage.
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const usage = await checkApiUsageLimit(auth.userId, "seo");
  if (!usage.allowed) {
    const message =
      usage.reason === "no_plan"
        ? "This API key's account doesn't have an active SEO API plan. Subscribe at siteflow-omega.vercel.app/pricing."
        : `Monthly quota exceeded (${usage.used}/${usage.limit} calls this month). Resets at the start of next month.`;
    return NextResponse.json({ error: message }, { status: 402 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.url);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid http(s) URL" }, { status: 400 });
  }

  const audit = await analyzePage(target.toString());

  await logApiUsage(auth.userId, "seo", "seo_analyze");

  return NextResponse.json({
    url: audit.url,
    statusCode: audit.statusCode,
    score: audit.score,
    title: audit.title,
    metaDescription: audit.metaDescription,
    h1Count: audit.h1Count,
    h1Text: audit.h1Text,
    wordCount: audit.wordCount,
    imagesTotal: audit.imagesTotal,
    imagesMissingAlt: audit.imagesMissingAlt,
    hasCanonical: audit.hasCanonical,
    hasOgTags: audit.hasOgTags,
    hasViewport: audit.hasViewport,
    issues: audit.issues,
  });
}
