import { createAdminClient } from "@/lib/supabase/admin";
import { tiersToUnlockedTools, tiersToUnlockedApiTools } from "@/lib/patreon-config";
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

  if (event === "members:pledge:delete") {
    // Pledge canceled — revoke everything, dashboard AND API access.
    unlockedTools = [];
    unlockedApiTools = [];
    status = "canceled";
  } else {
    // Find all tier titles this member is currently entitled to.
    const tierTitles = included
      .filter((item) => item.type === "tier")
      .map((item) => (item.attributes?.title as string) ?? "");
    unlockedTools = tiersToUnlockedTools(tierTitles);
    unlockedApiTools = tiersToUnlockedApiTools(tierTitles);
    status = unlockedTools.length > 0 || unlockedApiTools.length > 0 ? "active" : "canceled";
  }

  await supabase
    .from("subscriptions")
    .update({
      unlocked_tools: unlockedTools,
      api_unlocked_tools: unlockedApiTools,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  // Affiliate commission notification — fire-and-forget ping to the private
  // siteflow-affiliates site so it can credit whoever referred this person,
  // the instant their pledge goes active for the chatbot builder plan.
  // Ongoing monthly renewals are caught separately by that site's own daily
  // reconciliation cron (see /api/affiliates/export-active-subscriptions
  // below) since Patreon's webhook doesn't cleanly signal "this month's
  // charge succeeded" the way a Stripe invoice.paid event would.
  if (profile.referred_by_slug && status === "active" && unlockedTools.includes("chatbot")) {
    const webhookUrl = process.env.AFFILIATE_WEBHOOK_URL;
    const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      const membershipId = (payload.data?.id as string | undefined) ?? crypto.randomUUID();
      // Must be awaited: on Vercel the function is frozen as soon as the
      // response is returned, so a fire-and-forget fetch can get dropped.
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-siteflow-webhook-secret": webhookSecret,
          },
          body: JSON.stringify({
            slug: profile.referred_by_slug,
            customerEmail: email,
            occurredAt: new Date().toISOString(),
            // Dedupe key so a Patreon retry of this same webhook delivery
            // never double-credits the affiliate.
            sourceEventId: `patreon:${membershipId}:${event}`,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Best-effort. If this fails, the affiliate site's daily
        // reconciliation cron still picks this customer up.
      }
    }
  }

  return NextResponse.json({ ok: true, unlockedTools, unlockedApiTools, status });
}
