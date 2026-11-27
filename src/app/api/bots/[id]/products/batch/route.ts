import { createClient } from "@/lib/supabase/server";
import { isPaidForTool } from "@/lib/usage";
import {
  PRODUCT_BATCH_MAX,
  buildProductRecord,
  normalizeCurrency,
  normalizeStoreUrl,
  type LooseProduct,
  type ProductRecord,
} from "@/lib/shopify-core";
import { countProducts, finishSync, maxProductsFor, upsertProducts } from "@/lib/product-store";
import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Receives the products parsed from a Shopify product-export CSV. The browser
// parses the file and sends <=250 products per request (so a big export never
// hits Vercel's 4.5 MB body limit). EVERYTHING is re-sanitized here: nothing
// from the client is trusted, and the product link is rebuilt from the store
// address, never taken from the request. The last request has final=true and
// swaps the new catalog in (products from older syncs are removed).
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

  let body: {
    syncId?: unknown;
    storeUrl?: unknown;
    currency?: unknown;
    products?: unknown;
    final?: unknown;
    totalProducts?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.syncId !== "string" || !UUID_RE.test(body.syncId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const origin = normalizeStoreUrl(body.storeUrl);
  if (!origin) {
    return NextResponse.json({ error: "Enter your store address, e.g. mystore.com" }, { status: 400 });
  }
  if (!Array.isArray(body.products) || body.products.length > PRODUCT_BATCH_MAX) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const currency = normalizeCurrency(body.currency);
  const syncId = body.syncId.toLowerCase();

  const isPaid = await isPaidForTool(user.id, "chatbot");
  const cap = maxProductsFor(isPaid);

  const alreadyInSync = await countProducts(bot.id, syncId);
  const totalForBot = await countProducts(bot.id);
  // Old catalog + a full new one can coexist until the final swap; beyond that is abuse.
  if (totalForBot + body.products.length > cap * 2 + PRODUCT_BATCH_MAX) {
    return NextResponse.json({ error: "Too many products. Start the upload again." }, { status: 400 });
  }

  const records: ProductRecord[] = [];
  const seen = new Set<string>();
  for (const raw of body.products) {
    if (!raw || typeof raw !== "object") continue;
    const rec = buildProductRecord(raw as LooseProduct, origin, currency);
    if (!rec || seen.has(rec.external_id)) continue;
    seen.add(rec.external_id);
    records.push(rec);
  }

  const room = Math.max(0, cap - alreadyInSync);
  const accepted = records.slice(0, room);

  if (accepted.length > 0) {
    const ok = await upsertProducts(bot.id, syncId, accepted);
    if (!ok) return NextResponse.json({ error: "Couldn't save the products. Try again." }, { status: 500 });
  }

  if (body.final !== true) {
    return NextResponse.json({ accepted: accepted.length });
  }

  const inSync = await countProducts(bot.id, syncId);
  if (inSync === 0) {
    // never wipe an existing catalog with an empty upload
    return NextResponse.json({ error: "No usable products were found in that file." }, { status: 400 });
  }
  const claimedTotal =
    typeof body.totalProducts === "number" && Number.isFinite(body.totalProducts)
      ? Math.min(Math.max(Math.floor(body.totalProducts), 0), 1_000_000)
      : inSync;
  const capped = claimedTotal > inSync;

  const count = await finishSync({
    botId: bot.id,
    syncId,
    storeUrl: origin,
    currency,
    source: "csv",
    totalFound: capped ? claimedTotal : inSync,
    capped,
  });
  if (count === null) {
    return NextResponse.json({ error: "Couldn't finish saving the products. Try again." }, { status: 500 });
  }

  const notes: string[] = [];
  if (capped) {
    notes.push(
      `Your file has ${claimedTotal.toLocaleString()} products. We imported the first ${cap.toLocaleString()}${
        isPaid ? "." : " (the trial limit; paid plans import up to 2,000)."
      }`
    );
  }
  return NextResponse.json({ accepted: accepted.length, count, capped, source: "csv", storeUrl: origin, currency, notes });
}
