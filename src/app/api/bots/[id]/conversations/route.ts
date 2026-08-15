import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Lists conversations for a bot the logged-in user owns, most recent first,
// with a message count and preview so the dashboard list is cheap to render.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const { data: conversations, error } = await supabase
    .from("bot_conversations")
    .select("id, started_at, last_message_at, bot_messages(content, role, created_at)")
    .eq("bot_id", id)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summarized = (conversations ?? []).map((c) => {
    const msgs = (c.bot_messages ?? []) as { content: string; role: string; created_at: string }[];
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstUserMessage = sorted.find((m) => m.role === "user");
    return {
      id: c.id,
      started_at: c.started_at,
      last_message_at: c.last_message_at,
      message_count: sorted.length,
      preview: firstUserMessage?.content?.slice(0, 120) ?? "(no visitor message yet)",
    };
  });

  return NextResponse.json({ conversations: summarized });
}
