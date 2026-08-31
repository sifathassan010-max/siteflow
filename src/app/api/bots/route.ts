import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { crawlSiteForTraining } from "@/lib/site-crawler";
import { isPaidForTool } from "@/lib/usage";
import { sanitizeCustomQueries } from "@/lib/chatbot-custom-queries";
import { sanitizeBotAvatarConfig } from "@/lib/chatbot-bot-avatars";
import { sanitizeWidgetPosition } from "@/lib/chatbot-widget-position";

// Multi-page crawling can take a while — give this route more room than
// the default 10s (Vercel Hobby plan supports up to 60s via maxDuration).
export const maxDuration = 60;

// Keep this generous but bounded — it gets pasted into every chat request
// as context, so bigger isn't free (costs tokens on every message).
const MAX_SITE_CONTENT_CHARS = 12000;

// How many pages to follow from the root URL when training a new bot.
const MAX_TRAINING_PAGES = 5;

// Soft cap so one account can't spin up unlimited bots during testing.
// Bump this later if you want tiered limits per plan.
const MAX_BOTS_PER_USER = 5;

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

  const {
    name,
    persona,
    website_url: websiteUrl,
    custom_queries: customQueriesInput,
    avatar_config: avatarConfigInput,
    widget_position: widgetPositionInput,
  } = await request.json();

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

  const isPaid = await isPaidForTool(user.id, "chatbot");
  const customQueries = sanitizeCustomQueries(customQueriesInput, isPaid);
  const avatarConfig = sanitizeBotAvatarConfig(avatarConfigInput, isPaid);
  const widgetPosition = sanitizeWidgetPosition(widgetPositionInput);

  let siteContent: string | null = null;
  let trainedPages: { url: string; chars: number }[] = [];
  if (websiteUrl && typeof websiteUrl === "string" && websiteUrl.trim()) {
    const { combinedText, pages } = await crawlSiteForTraining(
      websiteUrl.trim(),
      MAX_TRAINING_PAGES
    );
    if (combinedText) {
      siteContent = combinedText.slice(0, MAX_SITE_CONTENT_CHARS);
      trainedPages = pages;
    }
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
      trained_pages: trainedPages,
      last_trained_at: siteContent ? new Date().toISOString() : null,
      custom_queries: customQueries,
      avatar_config: avatarConfig,
      widget_position: widgetPosition,
    })
    .select("id, name, persona, website_url, custom_queries, avatar_config, widget_position, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bot,
    crawled: siteContent !== null,
    pagesTrained: trainedPages.length,
    note:
      websiteUrl && siteContent === null
        ? "Bot created, but couldn't crawl that URL — it'll answer from its persona only. You can edit it later."
        : undefined,
  });
}
