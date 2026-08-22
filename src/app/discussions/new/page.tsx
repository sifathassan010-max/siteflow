"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";
import { TAG_GROUPS, MIN_TAGS, MAX_TAGS } from "@/lib/discussion-tags";
import { countWords, NEW_THREAD_MIN_WORDS } from "@/lib/discussion-word-count";

export default function NewThreadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = useMemo(() => countWords(body), [body]);
  const wordsRemaining = Math.max(0, NEW_THREAD_MIN_WORDS - wordCount);
  const canSubmit =
    title.trim().length >= 5 &&
    wordCount >= NEW_THREAD_MIN_WORDS &&
    tags.length >= MIN_TAGS &&
    tags.length <= MAX_TAGS;

  function toggleTag(tag: string) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/discussions/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, tags }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/discussions/${data.thread.id}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/discussions" className="text-sm text-slate hover:text-ink">
          ← Back to Discussions
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Start a new thread</h1>
        <p className="mt-1 text-sm text-slate">
          New threads need at least {NEW_THREAD_MIN_WORDS.toLocaleString()} words
          and 5–10 tags. You&apos;ll need to be logged in to post — if you
          aren&apos;t, we&apos;ll send you to log in when you submit.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold text-slate">Title</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your thread about?"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate">Body</label>
              <span
                className={
                  "text-xs font-medium " + (wordsRemaining > 0 ? "text-slate" : "text-flow")
                }
              >
                {wordCount.toLocaleString()} words
                {wordsRemaining > 0 &&
                  ` — ${wordsRemaining.toLocaleString()} more needed`}
              </span>
            </div>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              placeholder="Write your post…"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate">
                Tags — pick {MIN_TAGS}–{MAX_TAGS}
              </label>
              <span className="text-xs text-slate">{tags.length} selected</span>
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {TAG_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-ink/60">{group.group}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => {
                      const selected = tags.includes(tag);
                      const disabled = !selected && tags.length >= MAX_TAGS;
                      return (
                        <button
                          type="button"
                          key={tag}
                          disabled={disabled}
                          onClick={() => toggleTag(tag)}
                          className={
                            "rounded-full px-3 py-1 text-xs font-semibold transition " +
                            (selected
                              ? "bg-brand text-white"
                              : disabled
                              ? "bg-canvas text-slate/50"
                              : "bg-brand-bg text-brand hover:bg-brand hover:text-white")
                          }
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post thread"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
