import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { normalizeUrlInput, fetchText, extractAllUrls } from "@/lib/sitemap-utils";

const MAX_DISPLAY = 500;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { urlA, urlB } = await request.json();

  if (!urlA || typeof urlA !== "string" || !urlB || typeof urlB !== "string") {
    return NextResponse.json({ error: "Missing one or both sitemap URLs" }, { status: 400 });
  }

  const targetA = normalizeUrlInput(urlA);
  const targetB = normalizeUrlInput(urlB);
  if (!targetA || !targetB) {
    return NextResponse.json({ error: "One of those doesn't look like a valid URL" }, { status: 400 });
  }

  const [fetchedA, fetchedB] = await Promise.all([
    fetchText(targetA.toString()),
    fetchText(targetB.toString()),
  ]);

  if (!fetchedA.ok) {
    return NextResponse.json({ error: `First sitemap: ${fetchedA.error}` }, { status: 400 });
  }
  if (!fetchedB.ok) {
    return NextResponse.json({ error: `Second sitemap: ${fetchedB.error}` }, { status: 400 });
  }

  const [resultA, resultB] = await Promise.all([
    extractAllUrls(fetchedA.text),
    extractAllUrls(fetchedB.text),
  ]);

  const setA = new Set(resultA.urls);
  const setB = new Set(resultB.urls);

  const onlyInA = resultA.urls.filter((u) => !setB.has(u));
  const onlyInB = resultB.urls.filter((u) => !setA.has(u));
  const common = resultA.urls.filter((u) => setB.has(u));

  await supabase.from("usage_events").insert({
    user_id: user.id,
    tool: "free_sitemap_url_comparison",
    event_type: "compare",
    quantity: 1,
  });

  return NextResponse.json({
    urlA: targetA.toString(),
    urlB: targetB.toString(),
    countA: resultA.urls.length,
    countB: resultB.urls.length,
    commonCount: common.length,
    onlyInACount: onlyInA.length,
    onlyInBCount: onlyInB.length,
    onlyInA: onlyInA.slice(0, MAX_DISPLAY),
    onlyInB: onlyInB.slice(0, MAX_DISPLAY),
    truncated: onlyInA.length > MAX_DISPLAY || onlyInB.length > MAX_DISPLAY,
  });
}
