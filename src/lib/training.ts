// Server-only. Saves training results: chunks go to bot_chunks through the
// service-role-only replace_bot_chunks() function (atomic replace).
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_PAGES_PAID,
  MAX_PAGES_TRIAL,
  type TrainingChunk,
  type TrainingData,
} from "@/lib/training-core";
import type { CrawlResult } from "@/lib/site-crawler";

export function maxPagesFor(isPaid: boolean): number {
  return isPaid ? MAX_PAGES_PAID : MAX_PAGES_TRIAL;
}

// Caller must already have verified that the bot belongs to the logged-in user.
export async function storeChunks(botId: string, chunks: TrainingChunk[]): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("replace_bot_chunks", {
    p_bot: botId,
    p_chunks: chunks,
  });
  if (error) {
    console.error("replace_bot_chunks failed:", error.message);
    return false;
  }
  return true;
}

// Adds https:// when the owner typed "yoursite.com". Returns null if unusable.
export function normalizeWebsiteInput(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Friendly one-liner for the dashboard after a crawl.
export function crawlNotes(
  crawl: CrawlResult,
  training: TrainingData | null,
  maxPages: number
): string[] {
  const notes: string[] = [];
  if (crawl.reachedPageLimit) {
    notes.push(`Trained on the first ${maxPages} pages found (your plan's limit).`);
  }
  if (crawl.timedOut) {
    notes.push("The crawl stopped early because your site was slow to respond. Retrain to try again.");
  }
  if (training && training.droppedForSize > 0) {
    notes.push(`${training.droppedForSize} page(s) were skipped because the stored-text limit was reached.`);
  }
  return notes;
}
