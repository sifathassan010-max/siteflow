import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidTagSelection } from "@/lib/discussion-tags";
import { countWords, NEW_THREAD_MIN_WORDS } from "@/lib/discussion-word-count";

const PAGE_SIZE = 25;

// GET /api/discussions/threads?q=search&tag=seo&page=0
// Public — no login required to read.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const page = Math.max(0, Number(searchParams.get("page") ?? 0) || 0);

  let query = supabase
    .from("discussion_threads")
    .select("id, title, author_name, tags, reply_count, created_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: threads, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ threads, count: count ?? 0, page, pageSize: PAGE_SIZE });
}

// POST — create a new thread. Requires login. 1,000-word minimum on the
// body, 5–10 tags chosen from the site's suggested list (see
// src/lib/discussion-tags.ts) — no freeform tags.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { title, body, tags } = await request.json();

  if (!title || typeof title !== "string" || title.trim().length < 5) {
    return NextResponse.json(
      { error: "Title must be at least 5 characters." },
      { status: 400 }
    );
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: "Title is too long (200 characters max)." }, { status: 400 });
  }
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "Thread body is required." }, { status: 400 });
  }

  const wordCount = countWords(body);
  if (wordCount < NEW_THREAD_MIN_WORDS) {
    return NextResponse.json(
      {
        error: `New threads need at least ${NEW_THREAD_MIN_WORDS} words (currently ${wordCount}).`,
      },
      { status: 400 }
    );
  }

  if (!isValidTagSelection(tags)) {
    return NextResponse.json(
      { error: "Pick between 5 and 10 tags from the suggested list." },
      { status: 400 }
    );
  }

  // Author display name: pull from the poster's own profile (allowed under
  // existing RLS since auth.uid() = id) and denormalize it onto the thread
  // so public readers can see who posted without a public-profile policy.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const authorName =
    profile?.username || profile?.full_name || profile?.email?.split("@")[0] || "SiteFlow user";

  const { data: thread, error } = await supabase
    .from("discussion_threads")
    .insert({
      user_id: user.id,
      author_name: authorName,
      title: title.trim(),
      body: body.trim(),
      word_count: wordCount,
      tags,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thread });
}
