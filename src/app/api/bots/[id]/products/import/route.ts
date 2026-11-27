import { createClient } from "@/lib/supabase/server";
import { isPaidForTool } from "@/lib/usage";
import { importShopifyProducts, type ImportErrorCode } from "@/lib/shopify-import";
import { normalizeCurrency, normalizeStoreUrl } from "@/lib/shopify-core";
import {
  PRODUCT_IMPORT_COOLDOWN_MS,
  finishSync,
  getStore,
  maxProductsFor,
  recordStoreError,
  upsertProducts,
} from "@/lib/product-store";
import { NextResponse } from "next/server";

// Pages through the store's products.json (max ~8 requests for 2,000 products)
// within a 45s budget, then saves in batches. 60s = Vercel Hobby ceiling.
export const maxDuration = 60;

const ERROR_TEXT: Record<ImportErrorCode, { status: number; message: string }> = {
  not_shopify: {
    status: 422,
    message:
      "This doesn't look like a Shopify store with a public product feed. Upload your Shopify product export (CSV) instead.",
  },
  password: {
    status: 422,
    message:
      "The store is password protected, so we can't read its products. Turn the password off for a moment, or upload your Shopify product export (CSV).",
  },
  blocked: { status: 400, message: "That address isn't allowed. Enter your public store address." },
  rate_limited: {
    status: 429,
    message: "Shopify is limiting requests right now. Wait a minute and try again.",
  },
  unreachable: {
    status: 502,
    message: "Couldn't reach that store right now. Check the address and try again shortly.",
  },
  empty: { status: 422, message: "The store is reachable but has no published products." },
};

// Imports (or re-syncs) the catalog of a Shopify store by URL.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

  let body: { storeUrl?: unknown; currency?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body = re-sync with the saved store
  }

  const existing = await getStore(bot.id);
  const origin = normalizeStoreUrl(body.storeUrl ?? existing?.store_url);
  if (!origin) {
    return NextResponse.json({ error: "Enter your store address, e.g. mystore.com" }, { status: 400 });
  }

  if (existing?.last_synced_at) {
    const wait = PRODUCT_IMPORT_COOLDOWN_MS - (Date.now() - new Date(existing.last_synced_at).getTime());
    if (wait > 0) {
      const seconds = Math.ceil(wait / 1000);
      return NextResponse.json(
        { error: `Please wait ${seconds}s before syncing again.` },
        { status: 429, headers: { "Retry-After": String(seconds) } }
      );
    }
  }

  const isPaid = await isPaidForTool(user.id, "chatbot");
  const cap = maxProductsFor(isPaid);
  const currencyOverride = normalizeCurrency(body.currency) ?? (existing?.store_url === origin ? existing.currency : null);

  const result = await importShopifyProducts(origin, cap, { currencyOverride });
  if (!result.ok) {
    const e = ERROR_TEXT[result.code];
    if (existing) await recordStoreError(bot.id, e.message);
    return NextResponse.json({ error: e.message, code: result.code }, { status: e.status });
  }

  const syncId = crypto.randomUUID();
  const saved = await upsertProducts(bot.id, syncId, result.products);
  const count = saved
    ? await finishSync({
        botId: bot.id,
        syncId,
        storeUrl: origin,
        currency: result.currency,
        source: "shopify",
        totalFound: result.capped ? null : result.products.length,
        capped: result.capped,
        // Partial import: keep the products we did not re-fetch this time.
        prune: !result.partial,
      })
    : null;
  if (count === null) {
    return NextResponse.json(
      { error: "Imported the products but couldn't save them. Try again." },
      { status: 500 }
    );
  }

  const notes: string[] = [];
  if (result.capped) {
    notes.push(
      `Your store has more than ${cap.toLocaleString()} products. We imported the first ${cap.toLocaleString()}${
        isPaid ? "." : " (the trial limit; paid plans import up to 2,000)."
      }`
    );
  }
  if (result.partial) {
    notes.push("The import stopped early (the store was slow or rate-limited). Re-sync to try again.");
  }
  if (!result.currency) {
    notes.push("We couldn't detect your store currency, so prices are shown without one. Enter it (e.g. USD) and re-sync.");
  }

  return NextResponse.json({
    count,
    capped: result.capped,
    partial: result.partial,
    currency: result.currency,
    storeUrl: origin,
    source: "shopify",
    notes,
  });
}
