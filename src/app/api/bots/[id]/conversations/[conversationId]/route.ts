import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Returns the full transcript for one conversation. RLS on bot_messages
// already scopes this to conversations belonging to bots the caller owns,
// but we double-check bot ownership up front for a clean 404 either way.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  const { id, conversationId } = await params;
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

  const { data: conversation } = await supabase
    .from("bot_conversations")
    .select("id, bot_id")
    .eq("id", conversationId)
    .eq("bot_id", id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("bot_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages });
}
