import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { normalizeUrlInput, fetchText, parseSitemapXml, validateSitemap } from "@/lib/sitemap-utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const target = normalizeUrlInput(url);
  if (!target) {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }

  const fetched = await fetchText(target.toString());
  if (!fetched.ok) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }

  const parsed = parseSitemapXml(fetched.text);
  const issues = validateSitemap(fetched.text, parsed);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;

  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_sitemap_validator",
    event_type: "check",
    quantity: 1,
  });

  return NextResponse.json({
    url: target.toString(),
    kind: parsed.kind,
    urlCount: parsed.entries.length,
    childSitemapCount: parsed.sitemaps.length,
    truncated: fetched.truncated,
    valid: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  });
}
