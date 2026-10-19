import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import ReplyForm from "./reply-form";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function getThread(id: string) {
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("discussion_threads")
    .select("id, title, body, author_name, tags, reply_count, created_at")
    .eq("id", id)
    .maybeSingle();
  return thread;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return { title: "Thread not found | SiteFlow Discussions" };

  const excerpt = thread.body.trim().slice(0, 155).replace(/\s+\S*$/, "") + "…";

  return {
    title: `${thread.title} | SiteFlow Discussions`,
    description: excerpt,
    alternates: { canonical: `/discussions/${thread.id}` },
    openGraph: {
      title: thread.title,
      description: excerpt,
      url: `/discussions/${thread.id}`,
      type: "article",
    },
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const thread = await getThread(id);
  if (!thread) notFound();

  const { data: replies } = await supabase
    .from("discussion_replies")
    .select("id, author_name, body, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/discussions" className="text-sm text-slate hover:text-ink">
            ← Back to Discussions
          </Link>
          <Link
            href="/discussions/new"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Create new
          </Link>
        </div>

        <article className="mt-4 rounded-xl border border-line bg-white p-6">
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
            <span>{thread.author_name}</span>
            <span>·</span>
            <span>{timeAgo(thread.created_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {thread.tags.map((t: string) => (
              <Link
                key={t}
                href={`/discussions?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-flow-bg px-2 py-0.5 text-xs font-medium text-flow"
              >
                {t}
              </Link>
            ))}
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {thread.body}
          </div>
        </article>

        <h2 className="mt-8 text-lg font-bold">
          {thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}
        </h2>

        <div className="mt-3 flex flex-col gap-3">
          {replies && replies.length > 0 ? (
            replies.map((reply) => (
              <div key={reply.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2 text-xs text-slate">
                  <span className="font-semibold text-ink">{reply.author_name}</span>
                  <span>·</span>
                  <span>{timeAgo(reply.created_at)}</span>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-ink">{reply.body}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate">No replies yet — be the first to reply.</p>
          )}
        </div>

        <div className="mt-6">
          <ReplyForm threadId={thread.id} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
