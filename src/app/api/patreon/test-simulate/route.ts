import { createAdminClient } from "@/lib/supabase/admin";
import {
  tiersToUnlockedTools,
  isReferralTierTitle,
  REFERRAL_TIER_TITLE,
} from "@/lib/patreon-config";
import { configPriceCents } from "@/lib/patreon-amount";
import { sendAffiliatePing, flagReferralTier } from "@/lib/affiliate-ping";
import { NextResponse } from "next/server";

// TEMPORARY DIAGNOSTIC ROUTE — lets you verify the Patreon -> Supabase
// update logic AND the affiliate commission path without a real paying
// subscriber. Protected by your existing PATREON_WEBHOOK_SECRET so randoms
// can't grant themselves free access.
//
// USAGE (visit in browser, as one long URL):
//   /api/patreon/test-simulate?secret=YOUR_SECRET&email=test@example.com&tier=Chatbot%20Builder
//
// Referral tier (35.99):
//   ...&tier=referral
//   (same as typing the exact referral tier name from patreon-config.ts)
//
// Custom paid amount in dollars (overrides the tier's list price):
//   ...&tier=Chatbot%20Builder&paid=20
//
// To simulate a cancellation instead, use tier=cancel

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const email = searchParams.get("email");
  const tierParam = searchParams.get("tier");
  const paidParam = searchParams.get("paid");

  if (secret !== process.env.PATREON_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Wrong secret" }, { status: 401 });
  }
  if (!email || !tierParam) {
    return NextResponse.json(
      { error: "Add ?email=...&tier=... to the URL" },
      { status: 400 }
    );
  }

  // "referral" is a shortcut for the configured referral tier name.
  const tier = tierParam.trim().toLowerCase() === "referral" ? REFERRAL_TIER_TITLE : tierParam;

  let paidOverrideCents: number | null = null;
  if (paidParam !== null && paidParam !== "") {
    const dollars = Number(paidParam);
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 1000) {
      return NextResponse.json({ error: "paid must be dollars between 1 and 1000, e.g. paid=35.99" }, { status: 400 });
    }
    paidOverrideCents = Math.round(dollars * 100);
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, referred_by_slug")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: `No SiteFlow account found with email ${email}. Register one first.` },
      { status: 404 }
    );
  }

  const unlockedTools = tier === "cancel" ? [] : tiersToUnlockedTools([tier]);
  const status = unlockedTools.length > 0 ? "active" : "canceled";
  const hasChatbot = status === "active" && unlockedTools.includes("chatbot");
  const isReferralTier = hasChatbot && isReferralTierTitle(tier);

  const paidCents = hasChatbot
    ? paidOverrideCents ?? configPriceCents([tier]) ?? 3999
    : null;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      unlocked_tools: unlockedTools,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Billing columns (need schema-chatbot-v12.sql). Reported, not fatal.
  let billingColumns = "saved";
  {
    const { error: e2 } = await supabase
      .from("subscriptions")
      .update({
        paid_amount_cents: paidCents,
        paid_amount_source: paidCents !== null ? "simulate" : null,
        tier_title: hasChatbot ? tier.slice(0, 200) : null,
      })
      .eq("user_id", profile.id);
    if (e2) billingColumns = `NOT saved (run schema-chatbot-v12.sql first): ${e2.message}`;
  }

  let guard = "n/a";
  if (isReferralTier && !profile.referred_by_slug) {
    await flagReferralTier(supabase, {
      userId: profile.id,
      email,
      tierTitle: tier,
      reason: "no_referrer",
      paidAmountCents: paidCents,
    });
    guard = "referral tier but NO referrer on this account -> access unlocked, flagged in referral_tier_flags, no affiliate ping";
  }

  // Same affiliate ping the real Patreon webhook sends, so this route tests
  // the full commission path. The result is reported in the response.
  let affiliatePing = "not sent (no referred_by_slug on this profile, or not an active chatbot subscription)";
  if (profile.referred_by_slug && hasChatbot && paidCents !== null) {
    const ping = await sendAffiliatePing({
      slug: profile.referred_by_slug,
      customerEmail: email,
      sourceEventId: `test-simulate:${profile.id}:${Date.now()}`,
      paidAmountCents: paidCents,
      paidSource: "simulate",
    });
    affiliatePing = `${ping.status}: ${ping.detail}`;
    if (isReferralTier && ping.matched === false) {
      await flagReferralTier(supabase, {
        userId: profile.id,
        email,
        tierTitle: tier,
        reason: "affiliate_not_matched",
        paidAmountCents: paidCents,
      });
      guard = "referral tier but affiliate site found no approved affiliate -> flagged in referral_tier_flags";
    }
  }

  return NextResponse.json({
    ok: true,
    affiliatePing,
    simulatedFor: email,
    tierUsed: tier,
    paidAmountUsd: paidCents !== null ? paidCents / 100 : null,
    expectedCommissionUsd: paidCents !== null ? Math.floor((paidCents * 30 + 50) / 100) / 100 : null,
    billingColumns,
    referralGuard: guard,
    result: { unlockedTools, status },
    note: "Check Supabase Table Editor -> subscriptions to confirm this matches.",
  });
}
