import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Keep this generous but bounded — it gets pasted into every chat request
// as context, so bigger isn't free (costs tokens on every message).
const MAX_SITE_CONTENT_CHARS = 6000;

// Soft cap so one account can't spin up unlimited bots during testing.
// Bump this later if you want tiered limits per plan.
const MAX_BOTS_PER_USER = 5;

async function crawlWebsite(url: string): Promise<string | null> {
  try {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) return null;

    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "SiteFlow-BotBuilder/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();

    const text = $("body").text().replace(/\s+/g, " ").trim();
    return text.slice(0, MAX_SITE_CONTENT_CHARS);
  } catch {
    // Crawl failing isn't fatal — the bot just falls back to persona-only.
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: bots, error } = await supabase
    .from("bots")
    .select("id, name, persona, website_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bots });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { name, persona, website_url: websiteUrl } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Bot name is required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("bots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_BOTS_PER_USER) {
    return NextResponse.json(
      { error: `You've hit the limit of ${MAX_BOTS_PER_USER} bots per account.` },
      { status: 400 }
    );
  }

  let siteContent: string | null = null;
  if (websiteUrl && typeof websiteUrl === "string" && websiteUrl.trim()) {
    siteContent = await crawlWebsite(websiteUrl.trim());
  }

  const { data: bot, error } = await supabase
    .from("bots")
    .insert({
      user_id: user.id,
      name: name.trim(),
      persona:
        persona && typeof persona === "string" && persona.trim()
          ? persona.trim()
          : "You are a helpful, friendly assistant for this business.",
      website_url: websiteUrl && typeof websiteUrl === "string" ? websiteUrl.trim() : null,
      site_content: siteContent,
    })
    .select("id, name, persona, website_url, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bot,
    crawled: siteContent !== null,
    note:
      websiteUrl && siteContent === null
        ? "Bot created, but couldn't crawl that URL — it'll answer from its persona only. You can edit it later."
        : undefined,
  });
}
