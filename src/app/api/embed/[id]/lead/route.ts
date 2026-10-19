import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// PUBLIC route — a visitor submitting their contact info through the
// widget's "Leave your info" form. Tied to their conversation when we can
// find one, but still saved even if the session lookup fails — a lead
// without a linked transcript is still worth more than no lead at all.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: bot } = await admin.from("bots").select("id").eq("id", id).maybeSingle();
  if (!bot) {
    return NextResponse.json({ error: "This chatbot no longer exists." }, { status: 404 });
  }

  const { name, email, message, sessionId } = await request.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  let conversationId: string | null = null;
  if (sessionId && typeof sessionId === "string") {
    const { data: conversation } = await admin
      .from("bot_conversations")
      .select("id")
      .eq("bot_id", id)
      .eq("visitor_session", sessionId)
      .maybeSingle();
    conversationId = conversation?.id ?? null;
  }

  const { error } = await admin.from("bot_leads").insert({
    bot_id: id,
    conversation_id: conversationId,
    name: typeof name === "string" ? name.trim().slice(0, 200) || null : null,
    email: email.trim().slice(0, 200),
    message: typeof message === "string" ? message.trim().slice(0, 1000) || null : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
