import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { TAG_GROUPS } from "@/lib/discussion-tags";

export const metadata: Metadata = {
  title: "Discussions — Ask Questions & Share Tips for Small Business Websites | SiteFlow",
  description:
    "Browse threads from small business website owners on chatbots, SEO, lead forms, and analytics — read without an account, or log in to post your own.",
  alternates: { canonical: "/discussions" },
  openGraph: {
    title: "SiteFlow Discussions — Community Q&A for Small Business Websites",
    description: "Read and search threads on small business website tools. No login required to browse.",
    url: "/discussions",
  },
};

const PAGE_SIZE = 25;
const POPULAR_TAGS = TAG_GROUPS.flatMap((g) => g.tags).slice(0, 10);

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("discussion_threads")
    .select("id, title, author_name, tags, reply_count, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (q) query = query.ilike("title", `%${q}%`);
  if (tag) query = query.contains("tags", [tag]);

  const { data: threads } = await query;

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Discussions</h1>
            <p className="mt-1 text-sm text-slate">
              Ask questions, share tips, and talk shop with other small
              business website owners. Anyone can read — you need an account
              to post.
            </p>
          </div>
          <Link
            href="/discussions/new"
            className="shrink-0 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Create new
          </Link>
        </div>

        <form method="get" className="mt-6 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search threads by title…"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
          />
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            Search
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_TAGS.map((t) => (
            <Link
              key={t}
              href={t === tag ? "/discussions" : `/discussions?tag=${encodeURIComponent(t)}`}
              className={
                "rounded-full px-3 py-1 text-xs font-semibold transition " +
                (t === tag
                  ? "bg-brand text-white"
                  : "bg-brand-bg text-brand hover:bg-brand hover:text-white")
              }
            >
              {t}
            </Link>
          ))}
        </div>

        {(q || tag) && (
          <p className="mt-4 text-sm text-slate">
            {threads?.length ?? 0} result{threads?.length === 1 ? "" : "s"}
            {q && <> for &ldquo;{q}&rdquo;</>}
            {tag && <> tagged &ldquo;{tag}&rdquo;</>} —{" "}
            <Link href="/discussions" className="font-semibold text-ink underline">
              clear
            </Link>
          </p>
        )}

        <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
          {threads && threads.length > 0 ? (
            threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/discussions/${thread.id}`}
                className="block px-5 py-4 transition hover:bg-canvas"
              >
                <h2 className="font-semibold text-ink">{thread.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
                  <span>{thread.author_name}</span>
                  <span>·</span>
                  <span>{timeAgo(thread.created_at)}</span>
                  <span>·</span>
                  <span>
                    {thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {thread.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-flow-bg px-2 py-0.5 text-xs font-medium text-flow"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate">
              {q || tag
                ? "No threads match that search."
                : "No threads yet — be the first to start one."}
            </p>
          )}
        </div>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate">
          SiteFlow
        </div>
      </footer>
    </div>
  );
}
