// Server-only. Decides WHAT website knowledge goes into a chat prompt.
//  - content_mode 'full'    -> the whole site_content (<= 12,000 chars), as before
//  - content_mode 'chunked' -> small "core info" block + the best-matching
//    chunks for this visitor message (Postgres full-text search), ~6 chunks.
// Used by the dashboard test chat and the public embed chat. The API tier
// (/api/v1/chatbot/query, MCP) deliberately still uses site_content directly.
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FULL_MODE_MAX_CHARS,
  TOP_CHUNKS,
  buildSearchQuery,
  extractKeywords,
  formatKnowledgeBlock,
  type KnowledgeChunk,
} from "@/lib/training-core";

export type BotKnowledgeFields = {
  id: string;
  content_mode?: string | null;
  site_content: string | null;
  core_content?: string | null;
};

type ChunkRow = { page_url: string; content: string };

async function searchChunks(
  botId: string,
  message: string,
  previousUserMessage: string | null
): Promise<KnowledgeChunk[]> {
  const admin = createAdminClient();
  const query = buildSearchQuery(message, previousUserMessage);
  if (!query) return [];

  const { data, error } = await admin.rpc("search_bot_chunks", {
    p_bot: botId,
    p_query: query,
    p_limit: TOP_CHUNKS,
  });
  if (error) {
    console.error("search_bot_chunks failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ChunkRow[];
  if (rows.length > 0) return rows.map((r) => ({ page_url: r.page_url, content: r.content }));

  // No full-text hit (other language, typo, numbers…): cheap substring fallback
  // on the 3 longest keywords. Keywords are letters/digits only, so they are
  // safe to put into a PostgREST filter.
  const keywords = extractKeywords(message, 12)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  if (keywords.length === 0) return [];
  const { data: fallback, error: fbError } = await admin
    .from("bot_chunks")
    .select("page_url, content")
    .eq("bot_id", botId)
    .or(keywords.map((k) => `content.ilike.%${k}%`).join(","))
    .order("chunk_index", { ascending: true })
    .limit(Math.min(4, TOP_CHUNKS));
  if (fbError) {
    console.error("bot_chunks fallback failed:", fbError.message);
    return [];
  }
  return ((fallback ?? []) as ChunkRow[]).map((r) => ({ page_url: r.page_url, content: r.content }));
}

// Returns the text for the "WEBSITE CONTENT" part of the system prompt, or null.
export async function loadKnowledge(
  bot: BotKnowledgeFields,
  message: string,
  previousUserMessage: string | null
): Promise<string | null> {
  // Hard cap here too: protects against oversized values written straight to the DB.
  const full = bot.site_content ? bot.site_content.slice(0, FULL_MODE_MAX_CHARS) : null;

  if (bot.content_mode !== "chunked") return full;

  try {
    const chunks = await searchChunks(bot.id, message, previousUserMessage);
    const block = formatKnowledgeBlock(bot.core_content ?? null, chunks);
    if (block) return block;
  } catch (err) {
    console.error("loadKnowledge error:", err);
  }
  // Retrieval failed or nothing to show: degrade to a slice of the legacy text.
  return full ? full.slice(0, 4000) : null;
}
