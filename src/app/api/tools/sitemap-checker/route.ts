import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  normalizeUrlInput,
  discoverSitemaps,
  fetchText,
  parseSitemapXml,
} from "@/lib/sitemap-utils";

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

  const root = normalizeUrlInput(url);
  if (!root) {
    return NextResponse.json({ error: "That doesn't look like a valid domain or URL" }, { status: 400 });
  }

  const { found } = await discoverSitemaps(root);

  const results = [];
  for (const candidate of found.slice(0, 10)) {
    const fetched = await fetchText(candidate.url);
    if (!fetched.ok) {
      results.push({ url: candidate.url, source: candidate.source, reachable: false, error: fetched.error });
      continue;
    }
    const parsed = parseSitemapXml(fetched.text);
    results.push({
      url: candidate.url,
      source: candidate.source,
      reachable: true,
      kind: parsed.kind,
      urlCount: parsed.entries.length,
      childSitemapCount: parsed.sitemaps.length,
      contentType: fetched.contentType,
    });
  }

  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_sitemap_checker",
    event_type: "check",
    quantity: 1,
  });

  return NextResponse.json({
    domain: root.origin,
    found: results.length > 0,
    sitemaps: results,
  });
}
