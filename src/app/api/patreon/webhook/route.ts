import { createAdminClient } from "@/lib/supabase/admin";
import { tiersToUnlockedTools } from "@/lib/patreon-config";
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
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    // This person pledged on Patreon but hasn't registered on SiteFlow yet.
    // Nothing to update on our end.
    return NextResponse.json({ ok: true, note: "No matching SiteFlow user" });
  }

  let unlockedTools: string[] = [];
  let status: "active" | "canceled" = "active";

  if (event === "members:pledge:delete") {
    // Pledge canceled — revoke everything.
    unlockedTools = [];
    status = "canceled";
  } else {
    // Find all tier titles this member is currently entitled to.
    const tierTitles = included
      .filter((item) => item.type === "tier")
      .map((item) => (item.attributes?.title as string) ?? "");
    unlockedTools = tiersToUnlockedTools(tierTitles);
    status = unlockedTools.length > 0 ? "active" : "canceled";
  }

  await supabase
    .from("subscriptions")
    .update({
      unlocked_tools: unlockedTools,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id);

  return NextResponse.json({ ok: true, unlockedTools, status });
}
