import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/discussions/threads/[id]/replies
// Requires login. No word-count minimum (that's only on new threads).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { body } = await request.json();

  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Reply can't be empty." }, { status: 400 });
  }

  const { data: thread } = await supabase
    .from("discussion_threads")
    .select("id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const authorName =
    profile?.username || profile?.full_name || profile?.email?.split("@")[0] || "SiteFlow user";

  const { data: reply, error } = await supabase
    .from("discussion_replies")
    .insert({
      thread_id: threadId,
      user_id: user.id,
      author_name: authorName,
      body: body.trim(),
    })
    .select("id, author_name, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reply });
}
