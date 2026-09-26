import { createClient } from "@/lib/supabase/server";
import { crawlSiteForTraining } from "@/lib/site-crawler";
import { NextResponse } from "next/server";

// Same duration allowance as bot creation — multi-page crawling is
// sequential and can take a while.
export const maxDuration = 60;

const MAX_SITE_CONTENT_CHARS = 12000;
const MAX_TRAINING_PAGES = 5;

// Re-crawls the bot's website_url and replaces its site_content, so the
// bot's knowledge stays current after the business updates their site.
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
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  if (!bot.website_url) {
    return NextResponse.json(
      { error: "This bot has no website URL attached — nothing to retrain from." },
      { status: 400 }
    );
  }

  const { combinedText, pages } = await crawlSiteForTraining(bot.website_url, MAX_TRAINING_PAGES);

  if (!combinedText) {
    return NextResponse.json(
      { error: "Couldn't crawl that URL right now — the site may be unreachable. Try again shortly." },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("bots")
    .update({
      site_content: combinedText.slice(0, MAX_SITE_CONTENT_CHARS),
      trained_pages: pages,
      last_trained_at: now,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, trained_pages, last_trained_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bot: updated, pagesTrained: pages.length });
}
