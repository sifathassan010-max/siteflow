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
// Deliberately minimal: no names, no plan pricing, nothing beyond what's
// needed to attribute and dedupe a commission. Protected by a shared
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

  const { data, error } = await supabase
    .from("profiles")
    .select("email, referred_by_slug, subscriptions!inner(status, unlocked_tools, updated_at)")
    .not("referred_by_slug", "is", null)
    .eq("subscriptions.status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    email: string;
    referred_by_slug: string;
    subscriptions: { status: string; unlocked_tools: string[]; updated_at: string } | { status: string; unlocked_tools: string[]; updated_at: string }[];
  };

  const active = (data as Row[])
    .map((row) => {
      const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      return { email: row.email, slug: row.referred_by_slug, sub };
    })
    .filter((row) => row.sub && row.sub.unlocked_tools?.includes("chatbot"))
    .map((row) => ({
      customerEmail: row.email,
      slug: row.slug,
      updatedAt: row.sub!.updated_at,
    }));

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), active });
}
