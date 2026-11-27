// Server-only. Shared by the real Patreon webhook and /api/patreon/test-simulate
// so both send EXACTLY the same affiliate ping and apply the same
// referral-tier guard.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaidSource } from "./patreon-amount";

export type PingResult = {
  status: "sent" | "skipped" | "failed";
  detail: string;
  // true/false = the affiliate site said whether an approved affiliate
  // matched; null = unknown (not sent / failed / unreadable reply).
  matched: boolean | null;
};

export async function sendAffiliatePing(args: {
  slug: string;
  customerEmail: string;
  sourceEventId: string;
  paidAmountCents: number;
  paidSource: PaidSource | "simulate";
}): Promise<PingResult> {
  const webhookUrl = process.env.AFFILIATE_WEBHOOK_URL;
  const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    return {
      status: "skipped",
      detail: "AFFILIATE_WEBHOOK_URL / AFFILIATE_WEBHOOK_SECRET missing in this project's env vars",
      matched: null,
    };
  }
  // Must be awaited: on Vercel the function is frozen as soon as the
  // response is returned, so a fire-and-forget fetch can get dropped.
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-siteflow-webhook-secret": webhookSecret,
      },
      body: JSON.stringify({
        slug: args.slug,
        customerEmail: args.customerEmail,
        occurredAt: new Date().toISOString(),
        // Dedupe key so a Patreon retry never double-credits the affiliate.
        sourceEventId: args.sourceEventId,
        // What the customer actually pays per month, in USD cents. The
        // affiliate site computes the commission from this.
        paidAmountCents: args.paidAmountCents,
        amountSource: args.paidSource === "simulate" ? "payload" : args.paidSource,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    let matched: boolean | null = null;
    try {
      const j = JSON.parse(text) as { ok?: boolean; note?: string };
      if (res.ok && j.ok) matched = !/no matching approved affiliate/i.test(j.note ?? "");
    } catch {
      /* unreadable reply -> unknown */
    }
    return { status: res.ok ? "sent" : "failed", detail: `HTTP ${res.status} ${text.slice(0, 200)}`, matched };
  } catch (e) {
    // Best-effort. The affiliate site's daily reconciliation cron still
    // picks this customer up.
    return { status: "failed", detail: e instanceof Error ? e.message : String(e), matched: null };
  }
}

// Referral-tier guard: the customer keeps their access either way; this just
// leaves a row in `referral_tier_flags` for the owner to review. Errors are
// swallowed (e.g. SQL v12 not run yet) so it can never break the webhook.
export async function flagReferralTier(
  supabase: SupabaseClient,
  args: {
    userId: string;
    email: string;
    tierTitle: string;
    reason: "no_referrer" | "affiliate_not_matched";
    paidAmountCents: number | null;
  }
): Promise<void> {
  try {
    await supabase.from("referral_tier_flags").upsert(
      {
        user_id: args.userId,
        email: args.email,
        tier_title: args.tierTitle.slice(0, 200),
        reason: args.reason,
        paid_amount_cents: args.paidAmountCents,
      },
      { onConflict: "user_id,reason", ignoreDuplicates: true }
    );
  } catch {
    /* best effort */
  }
}
