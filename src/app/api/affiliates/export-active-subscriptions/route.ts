import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Read-only export for the private siteflow-affiliates site's daily
// reconciliation cron. Returns every SiteFlow customer who (a) was
// attributed to an affiliate at signup and (b) currently has an ACTIVE
// paid subscription to the chatbot builder tool. The affiliate site uses
// this to top up recurring monthly commissions even when Patreon's webhook
// doesn't fire a clean "renewed this month" event.
//
// Deliberately minimal: no names, nothing beyond what's needed to attribute
// a commission and compute it (the amount the customer actually pays). Protected by a shared
// secret — set the SAME value for AFFILIATE_EXPORT_SECRET here and
// SITEFLOW_EXPORT_SECRET on the affiliate site.

function isAuthorized(request: Request) {
  const provided = request.headers.get("x-affiliate-export-secret");
  const expected = process.env.AFFILIATE_EXPORT_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  type Sub = {
    status: string;
    unlocked_tools: string[];
    updated_at: string;
    paid_amount_cents?: number | null;
    paid_amount_source?: string | null;
  };
  type Row = {
    email: string;
    referred_by_slug: string;
    subscriptions: Sub | Sub[];
  };

  // Newer columns (schema-chatbot-v12.sql) first; if they do not exist yet
  // fall back to the old select so the daily cron never breaks.
  let rows: Row[] | null = null;
  const withAmount = await supabase
    .from("profiles")
    .select(
      "email, referred_by_slug, subscriptions!inner(status, unlocked_tools, updated_at, paid_amount_cents, paid_amount_source)"
    )
    .not("referred_by_slug", "is", null)
    .eq("subscriptions.status", "active");
  if (!withAmount.error) {
    rows = withAmount.data as unknown as Row[];
  } else {
    const legacy = await supabase
      .from("profiles")
      .select("email, referred_by_slug, subscriptions!inner(status, unlocked_tools, updated_at)")
      .not("referred_by_slug", "is", null)
      .eq("subscriptions.status", "active");
    if (legacy.error) {
      return NextResponse.json({ error: legacy.error.message }, { status: 500 });
    }
    rows = legacy.data as unknown as Row[];
  }

  const active = rows
    .map((row) => {
      const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      return { email: row.email, slug: row.referred_by_slug, sub };
    })
    .filter((row) => row.sub && row.sub.unlocked_tools?.includes("chatbot"))
    .map((row) => ({
      customerEmail: row.email,
      slug: row.slug,
      updatedAt: row.sub!.updated_at,
      // What this customer pays per month (USD cents), as last recorded from
      // Patreon. null = unknown (old row from before Stage 4); the affiliate
      // site then uses the default full price and marks the row as such.
      paidAmountCents: row.sub!.paid_amount_cents ?? null,
      // 'simulate' (test-simulate route) is a real amount, just not from Patreon:
      // report it as 'payload' so the affiliate ledger does not mislabel it 'default'.
      amountSource:
        row.sub!.paid_amount_source === "simulate" ? "payload" : row.sub!.paid_amount_source ?? null,
    }));

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), active });
}
