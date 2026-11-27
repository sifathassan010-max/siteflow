import { createAdminClient } from "@/lib/supabase/admin";
import {
  tiersToUnlockedTools,
  tiersToUnlockedApiTools,
  isReferralTierTitle,
} from "@/lib/patreon-config";
import { resolvePaidAmount } from "@/lib/patreon-amount";
import { sendAffiliatePing, flagReferralTier } from "@/lib/affiliate-ping";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Patreon signs each webhook with MD5 HMAC in this header.
function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const secret = process.env.PATREON_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("md5", secret).update(rawBody).digest("hex");

  // Timing-safe comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-patreon-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-patreon-event") ?? "";
  const payload = JSON.parse(rawBody);

  const included: Array<{ id: string; type: string; attributes: Record<string, unknown> }> =
    payload.included ?? [];

  // Find the patron's email from the included "user" object.
  const userObj = included.find((item) => item.type === "user");
  const email = userObj?.attributes?.email as string | undefined;

  if (!email) {
    // Nothing we can match to a SiteFlow account — acknowledge and stop.
    return NextResponse.json({ ok: true, note: "No email in payload" });
  }

  const supabase = createAdminClient();

  // Find the SiteFlow user with this email.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, referred_by_slug")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    // This person pledged on Patreon but hasn't registered on SiteFlow yet.
    // Nothing to update on our end.
    return NextResponse.json({ ok: true, note: "No matching SiteFlow user" });
  }

  let unlockedTools: string[] = [];
  let unlockedApiTools: string[] = [];
  let status: "active" | "canceled" = "active";
  let tierTitles: string[] = [];

  if (event === "members:pledge:delete") {
    // Pledge canceled — revoke everything, dashboard AND API access.
    unlockedTools = [];
    unlockedApiTools = [];
    status = "canceled";
  } else {
    // Find all tier titles this member is currently entitled to.
    tierTitles = included
      .filter((item) => item.type === "tier")
      .map((item) => (item.attributes?.title as string) ?? "");
    unlockedTools = tiersToUnlockedTools(tierTitles);
    unlockedApiTools = tiersToUnlockedApiTools(tierTitles);
    status = unlockedTools.length > 0 || unlockedApiTools.length > 0 ? "active" : "canceled";
  }

  // 1) Access first, using only columns that have always existed — a
  //    problem with the newer billing columns below can never block access.
  await supabase
    .from("subscriptions")
    .update({
      unlocked_tools: unlockedTools,
      api_unlocked_tools: unlockedApiTools,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  const hasChatbot = status === "active" && unlockedTools.includes("chatbot");
  const isReferralTier = hasChatbot && tierTitles.some((t) => isReferralTierTitle(t));
  const paid = hasChatbot ? resolvePaidAmount(payload, tierTitles) : null;

  // 2) What the customer actually pays (cents) + tier name, for affiliate
  //    commission. Best-effort: needs schema-chatbot-v12.sql; if that was not
  //    run the update just errors and is ignored.
  await supabase
    .from("subscriptions")
    .update({
      paid_amount_cents: paid ? paid.cents : null,
      paid_amount_source: paid ? paid.source : null,
      tier_title: hasChatbot ? tierTitles.filter(Boolean).join(", ").slice(0, 200) : null,
    })
    .eq("user_id", profile.id);

  // Referral-tier guard: someone on the cheaper referral tier with NO
  // referrer on their account keeps full access (never lock a paying
  // customer) but is flagged for owner review, and no affiliate ping goes out.
  if (isReferralTier && !profile.referred_by_slug) {
    await flagReferralTier(supabase, {
      userId: profile.id,
      email,
      tierTitle: tierTitles.filter((t) => isReferralTierTitle(t))[0] ?? "",
      reason: "no_referrer",
      paidAmountCents: paid ? paid.cents : null,
    });
  }

  // Affiliate commission notification — ping to the private
  // siteflow-affiliates site so it can credit whoever referred this person,
  // the instant their pledge goes active for the chatbot builder plan.
  // Ongoing monthly renewals are caught separately by that site's own daily
  // reconciliation cron (see /api/affiliates/export-active-subscriptions)
  // since Patreon's webhook doesn't cleanly signal "this month's charge
  // succeeded" the way a Stripe invoice.paid event would.
  if (profile.referred_by_slug && hasChatbot && paid) {
    const membershipId = (payload.data?.id as string | undefined) ?? crypto.randomUUID();
    const ping = await sendAffiliatePing({
      slug: profile.referred_by_slug,
      customerEmail: email,
      sourceEventId: `patreon:${membershipId}:${event}`,
      paidAmountCents: paid.cents,
      paidSource: paid.source,
    });
    if (isReferralTier && ping.matched === false) {
      await flagReferralTier(supabase, {
        userId: profile.id,
        email,
        tierTitle: tierTitles.filter((t) => isReferralTierTitle(t))[0] ?? "",
        reason: "affiliate_not_matched",
        paidAmountCents: paid.cents,
      });
    }
  }

  return NextResponse.json({ ok: true, unlockedTools, unlockedApiTools, status });
}
