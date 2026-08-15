import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { normalizeUrlInput, crawlSiteForSitemap, buildSitemapXml } from "@/lib/sitemap-utils";

// Free tier keeps the crawl small — the paid SEO tool's crawler goes
// deeper. This just needs to be enough for a small marketing site.
const MAX_PAGES = 150;

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

  const { pages, truncated } = await crawlSiteForSitemap(root.toString(), MAX_PAGES);

  if (pages.length === 0) {
    return NextResponse.json(
      { error: "Couldn't crawl any pages from that site. Check it's correct and publicly accessible." },
      { status: 400 }
    );
  }

  const xml = buildSitemapXml(pages);

  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_sitemap_generator",
    event_type: "generate",
    quantity: 1,
  });

  return NextResponse.json({
    domain: root.origin,
    pageCount: pages.length,
    truncated,
    maxPages: MAX_PAGES,
    xml,
  });
}
