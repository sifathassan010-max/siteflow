// Server-only. Finds the catalog products that match a visitor message and
// returns the "product" section of the system prompt (or null).
// Used by the dashboard test chat and the public embed chat. The API tier
// (/api/v1/chatbot/query, MCP) is deliberately untouched.
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROMPT_PRODUCTS,
  buildProductSection,
  buildSearchQuery,
  fallbackKeywords,
  type PromptProduct,
} from "@/lib/shopify-core";

export type BotProductFields = {
  id: string;
  product_count?: number | null;
  shop_url?: string | null;
};

const COLUMNS =
  "title, url, price, price_max, compare_at_price, currency, available, vendor, product_type, description, options";

type Row = {
  title: string;
  url: string;
  price: number | string | null;
  price_max: number | string | null;
  compare_at_price: number | string | null;
  currency: string | null;
  available: boolean;
  vendor: string | null;
  product_type: string | null;
  description: string | null;
  options: unknown;
};

// numeric columns come back as numbers or strings depending on the driver
const num = (v: number | string | null): number | null => (v === null || v === undefined ? null : Number(v));

function toPrompt(r: Row): PromptProduct {
  return {
    title: r.title,
    url: r.url,
    price: num(r.price),
    price_max: num(r.price_max),
    compare_at_price: num(r.compare_at_price),
    currency: r.currency,
    available: r.available,
    vendor: r.vendor,
    product_type: r.product_type,
    description: r.description,
    options: r.options,
  };
}

export async function loadProductSection(
  bot: BotProductFields,
  message: string,
  previousUserMessage: string | null
): Promise<string | null> {
  const total = bot.product_count ?? 0;
  if (total <= 0) return null;
  try {
    const query = buildSearchQuery(message, previousUserMessage);
    if (!query) return buildProductSection([], bot.shop_url ?? null, total, false);

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("search_bot_products", {
      p_bot: bot.id,
      p_query: query,
      p_limit: PROMPT_PRODUCTS,
    });
    if (error) {
      console.error("search_bot_products failed:", error.message);
      return null; // degrade: chat works without products
    }
    let rows = (data ?? []) as Row[];

    if (rows.length === 0) {
      // No full-text hit (typo, other language, model numbers…): title substring
      // on the 3 longest keywords. Keywords are letters/digits only, so they are
      // safe inside a PostgREST filter.
      const keywords = fallbackKeywords(message);
      if (keywords.length > 0) {
        const { data: fb, error: fbError } = await admin
          .from("bot_products")
          .select(COLUMNS)
          .eq("bot_id", bot.id)
          .or(keywords.map((k) => `title.ilike.%${k}%`).join(","))
          .order("available", { ascending: false })
          .limit(PROMPT_PRODUCTS);
        if (fbError) console.error("bot_products fallback failed:", fbError.message);
        else rows = (fb ?? []) as Row[];
      }
    }
    return buildProductSection(rows.map(toPrompt), bot.shop_url ?? null, total, true);
  } catch (err) {
    console.error("loadProductSection error:", err);
    return null;
  }
}
