import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { normalizeUrlInput, fetchText, extractAllUrls } from "@/lib/sitemap-utils";

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

  const { urls, childSitemapsRead, truncated } = await extractAllUrls(fetched.text);

  if (urls.length === 0 && childSitemapsRead === 0) {
    return NextResponse.json(
      { error: "No URLs found — that doesn't look like a valid sitemap or sitemap index." },
      { status: 400 }
    );
  }

  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_sitemap_url_extractor",
    event_type: "extract",
    quantity: 1,
  });

  return NextResponse.json({
    url: target.toString(),
    urlCount: urls.length,
    childSitemapsRead,
    truncated,
    urls,
  });
}
