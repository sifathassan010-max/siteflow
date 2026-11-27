import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { crawlSiteForTraining } from "@/lib/site-crawler";
import { buildTrainingData, type TrainingData } from "@/lib/training-core";
import { crawlNotes, maxPagesFor, normalizeWebsiteInput, storeChunks } from "@/lib/training";
import { isPaidForTool } from "@/lib/usage";
import { sanitizeCustomQueries } from "@/lib/chatbot-custom-queries";
import { sanitizeBotAvatarConfig } from "@/lib/chatbot-bot-avatars";
import { sanitizeWidgetPosition, sanitizeWidgetOffset } from "@/lib/chatbot-widget-position";

// Multi-page crawling can take a while — give this route more room than
// the default 10s (Vercel Hobby plan supports up to 60s via maxDuration).
export const maxDuration = 60; // 40s crawl budget + chunking/saving

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
    widget_offset_x: widgetOffsetXInput,
    widget_offset_y: widgetOffsetYInput,
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
  const widgetOffsetX = sanitizeWidgetOffset(widgetOffsetXInput);
  const widgetOffsetY = sanitizeWidgetOffset(widgetOffsetYInput);

  const websiteNormalized = normalizeWebsiteInput(websiteUrl);
  const maxPages = maxPagesFor(isPaid);
  let training: TrainingData | null = null;
  let notes: string[] = [];
  let rootError: string | null = null;
  if (websiteNormalized) {
    const crawl = await crawlSiteForTraining(websiteNormalized, maxPages);
    if (crawl.pagesText.length > 0) training = buildTrainingData(crawl.pagesText);
    notes = crawlNotes(crawl, training, maxPages);
    rootError = crawl.rootError;
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
      website_url: websiteNormalized,
      site_content: training ? training.siteContent : null,
      // Starts as 'full' (always safe); flipped to 'chunked' below once the
      // chunks are saved.
      content_mode: "full",
      content_chars: training ? training.totalChars : 0,
      trained_pages: training ? training.pages : [],
      last_trained_at: training ? new Date().toISOString() : null,
      custom_queries: customQueries,
      avatar_config: avatarConfig,
      widget_position: widgetPosition,
      widget_offset_x: widgetOffsetX,
      widget_offset_y: widgetOffsetY,
    })
    .select(
      "id, name, persona, website_url, custom_queries, avatar_config, widget_position, widget_offset_x, widget_offset_y, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let mode: "full" | "chunked" = "full";
  if (training && training.mode === "chunked") {
    const stored = await storeChunks(bot.id, training.chunks);
    if (stored) {
      const { error: modeError } = await supabase
        .from("bots")
        .update({ content_mode: "chunked", core_content: training.coreContent })
        .eq("id", bot.id)
        .eq("user_id", user.id);
      if (!modeError) mode = "chunked";
    }
    if (mode !== "chunked") {
      notes.push("Large-site search is temporarily unavailable, so the bot is using the first part of your content only.");
    }
  }

  if (websiteNormalized && !training) {
    notes.push(
      rootError
        ? `Bot created, but couldn't crawl that URL (${rootError}). It'll answer from its persona only. You can retrain later.`
        : "Bot created, but couldn't crawl that URL — it'll answer from its persona only. You can edit it later."
    );
  }

  return NextResponse.json({
    bot,
    crawled: training !== null,
    pagesTrained: training ? training.pages.length : 0,
    maxPages,
    mode,
    notes,
    note: notes.length > 0 ? notes.join(" ") : undefined,
  });
}
