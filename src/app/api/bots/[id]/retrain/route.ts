import { createClient } from "@/lib/supabase/server";
import { crawlSiteForTraining } from "@/lib/site-crawler";
import { isPaidForTool } from "@/lib/usage";
import { buildTrainingData } from "@/lib/training-core";
import { crawlNotes, maxPagesFor, normalizeWebsiteInput, storeChunks } from "@/lib/training";
import { NextResponse } from "next/server";

// Crawling up to 16 pages: ~4 pages at a time, 40s crawl budget, then
// chunking + saving. 60s is the Vercel Hobby ceiling we stay under.
export const maxDuration = 60;

// One retrain per bot every 30 seconds — stops button-mashing from turning
// into repeated crawls of someone's website.
const RETRAIN_COOLDOWN_MS = 30_000;

// Re-crawls the bot's website_url and replaces its knowledge, so the bot
// stays current after the business updates their site.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id, website_url, last_trained_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const websiteUrl = normalizeWebsiteInput(bot.website_url);
  if (!websiteUrl) {
    return NextResponse.json(
      { error: "This bot has no website URL attached — nothing to retrain from." },
      { status: 400 }
    );
  }

  if (bot.last_trained_at) {
    const wait = RETRAIN_COOLDOWN_MS - (Date.now() - new Date(bot.last_trained_at).getTime());
    if (wait > 0) {
      const seconds = Math.ceil(wait / 1000);
      return NextResponse.json(
        { error: `Please wait ${seconds}s before retraining again.` },
        { status: 429, headers: { "Retry-After": String(seconds) } }
      );
    }
  }

  const isPaid = await isPaidForTool(user.id, "chatbot");
  const maxPages = maxPagesFor(isPaid);
  const crawl = await crawlSiteForTraining(websiteUrl, maxPages);

  if (crawl.pagesText.length === 0) {
    return NextResponse.json(
      {
        error: crawl.rootError
          ? `Couldn't crawl that URL: ${crawl.rootError}. Check the address is public and try again.`
          : "Couldn't crawl that URL right now — the site may be unreachable. Try again shortly.",
      },
      { status: 502 }
    );
  }

  const training = buildTrainingData(crawl.pagesText);

  // Chunks first. If saving them fails we fall back to 'full' mode (first
  // 12,000 chars), so the bot keeps answering instead of ending up half-updated.
  let mode = training.mode;
  const stored = await storeChunks(bot.id, mode === "chunked" ? training.chunks : []);
  if (!stored) mode = "full";

  const { data: updated, error } = await supabase
    .from("bots")
    .update({
      site_content: training.siteContent,
      content_mode: mode,
      core_content: mode === "chunked" ? training.coreContent : null,
      content_chars: training.totalChars,
      trained_pages: training.pages,
      last_trained_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, trained_pages, last_trained_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notes = crawlNotes(crawl, training, maxPages);
  if (!stored && training.mode === "chunked") {
    notes.push("Large-site search is temporarily unavailable, so the bot is using the first part of your content only.");
  }

  return NextResponse.json({
    bot: updated,
    pagesTrained: training.pages.length,
    maxPages,
    mode,
    totalChars: training.totalChars,
    notes,
  });
}
