import { createAdminClient } from "@/lib/supabase/admin";
import { tiersToUnlockedTools } from "@/lib/patreon-config";
import { NextResponse } from "next/server";

// TEMPORARY DIAGNOSTIC ROUTE — lets you verify the Patreon -> Supabase
// update logic actually works, without needing a real paying subscriber.
// Protected by your existing PATREON_WEBHOOK_SECRET so randoms can't grant
// themselves free access. Safe to delete this whole route once you trust
// the system, or keep it — it's harmless as long as the secret stays secret.
//
// USAGE (visit in browser, as one long URL):
//   /api/patreon/test-simulate?secret=YOUR_SECRET&email=test@example.com&tier=Chatbot%20Builder
//
// To simulate a cancellation instead, use tier=cancel

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const email = searchParams.get("email");
  const tier = searchParams.get("tier");

  if (secret !== process.env.PATREON_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Wrong secret" }, { status: 401 });
  }
  if (!email || !tier) {
    return NextResponse.json(
      { error: "Add ?email=...&tier=... to the URL" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
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

  return NextResponse.json({
    ok: true,
    simulatedFor: email,
    tierUsed: tier,
    result: { unlockedTools, status },
    note: "Check Supabase Table Editor -> subscriptions to confirm this matches.",
  });
}
