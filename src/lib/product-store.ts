// Server-only. Writes/reads the Shopify catalog (bot_products / bot_stores).
// Callers MUST have verified that the bot belongs to the logged-in user first:
// these helpers use the service-role client.
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PRODUCTS_PAID, MAX_PRODUCTS_TRIAL, type ProductRecord } from "@/lib/shopify-core";

export const PRODUCT_IMPORT_COOLDOWN_MS = 30_000;
const UPSERT_CHUNK = 200;

export function maxProductsFor(isPaid: boolean): number {
  return isPaid ? MAX_PRODUCTS_PAID : MAX_PRODUCTS_TRIAL;
}

export type StoreRow = {
  store_url: string;
  currency: string | null;
  source: "shopify" | "csv";
  product_count: number;
  total_found: number | null;
  capped: boolean;
  last_synced_at: string;
  last_error: string | null;
};

export async function getStore(botId: string): Promise<StoreRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bot_stores")
    .select("store_url, currency, source, product_count, total_found, capped, last_synced_at, last_error")
    .eq("bot_id", botId)
    .maybeSingle();
  if (error) {
    console.error("bot_stores read failed:", error.message);
    return null;
  }
  return (data as StoreRow | null) ?? null;
}

// Inserts/updates products tagged with this sync id (old rows stay until finishSync).
export async function upsertProducts(botId: string, syncId: string, products: ProductRecord[]): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  for (let i = 0; i < products.length; i += UPSERT_CHUNK) {
    const rows = products.slice(i, i + UPSERT_CHUNK).map((p) => ({
      bot_id: botId,
      external_id: p.external_id,
      title: p.title,
      handle: p.handle,
      url: p.url,
      price: p.price,
      price_max: p.price_max,
      compare_at_price: p.compare_at_price,
      currency: p.currency,
      available: p.available,
      vendor: p.vendor,
      product_type: p.product_type,
      tags: p.tags,
      description: p.description,
      image_url: p.image_url,
      variants: p.variants,
      options: p.options,
      sync_id: syncId,
      synced_at: now,
    }));
    const { error } = await admin.from("bot_products").upsert(rows, { onConflict: "bot_id,external_id" });
    if (error) {
      console.error("bot_products upsert failed:", error.message);
      return false;
    }
  }
  return true;
}

export async function countProducts(botId: string, syncId?: string): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from("bot_products").select("id", { count: "exact", head: true }).eq("bot_id", botId);
  if (syncId) q = q.eq("sync_id", syncId);
  const { count, error } = await q;
  if (error) {
    console.error("bot_products count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function finishSync(args: {
  botId: string;
  syncId: string;
  storeUrl: string;
  currency: string | null;
  source: "shopify" | "csv";
  totalFound: number | null;
  capped: boolean;
  // false = keep products from older syncs (used for partial imports, so a
  // half-finished re-sync never shrinks the catalog). Needs schema-chatbot-v13.sql.
  prune?: boolean;
}): Promise<number | null> {
  const admin = createAdminClient();
  const params = {
    p_bot: args.botId,
    p_sync: args.syncId,
    p_store_url: args.storeUrl,
    p_currency: args.currency,
    p_source: args.source,
    p_total_found: args.totalFound,
    p_capped: args.capped,
  };
  const prune = args.prune !== false;
  // v13 adds p_prune. Only send it when we need it (prune=false), so a missing
  // v13 never breaks normal full syncs; a partial sync without v13 falls back
  // to the old pruning behaviour instead of failing.
  let { data, error } = await admin.rpc(
    "finish_bot_products_sync",
    prune ? params : { ...params, p_prune: false }
  );
  if (error && !prune) {
    ({ data, error } = await admin.rpc("finish_bot_products_sync", params));
  }
  if (error) {
    console.error("finish_bot_products_sync failed:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

export async function clearProducts(botId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("clear_bot_products", { p_bot: botId });
  if (error) {
    console.error("clear_bot_products failed:", error.message);
    return false;
  }
  return true;
}

// Remember why the last sync failed (only if the bot already has a store row).
export async function recordStoreError(botId: string, message: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("bot_stores").update({ last_error: message.slice(0, 300) }).eq("bot_id", botId);
}
