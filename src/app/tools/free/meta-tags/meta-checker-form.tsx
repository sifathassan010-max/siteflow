"use client";

import { useState } from "react";

type CheckResult = {
  url: string;
  title: { value: string; check: { status: string; message: string } };
  description: { value: string; check: { status: string; message: string } };
  ogTitle: { value: string; present: boolean };
  ogDescription: { value: string; present: boolean };
  canonical: { value: string; present: boolean };
  h1: { count: number; text: string; good: boolean };
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === "good" ? "bg-flow" : status === "warn" ? "bg-yellow-500" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function MetaCheckerForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/meta-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-line px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={result.title.check.status} />
              <h3 className="font-semibold">Title tag</h3>
            </div>
            <p className="mt-1 text-sm text-slate">{result.title.check.message}</p>
            {result.title.value && (
              <p className="mt-2 rounded bg-canvas px-3 py-2 text-sm">{result.title.value}</p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={result.description.check.status} />
              <h3 className="font-semibold">Meta description</h3>
            </div>
            <p className="mt-1 text-sm text-slate">{result.description.check.message}</p>
            {result.description.value && (
              <p className="mt-2 rounded bg-canvas px-3 py-2 text-sm">
                {result.description.value}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={result.h1.good ? "good" : "warn"} />
              <h3 className="font-semibold">H1 heading</h3>
            </div>
            <p className="mt-1 text-sm text-slate">
              {result.h1.count === 0
                ? "No H1 found — every page should have exactly one."
                : result.h1.count === 1
                ? `Exactly one H1 found: "${result.h1.text}"`
                : `${result.h1.count} H1 tags found — should be exactly one.`}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={result.ogTitle.present && result.ogDescription.present ? "good" : "warn"} />
              <h3 className="font-semibold">Social preview tags (Open Graph)</h3>
            </div>
            <p className="mt-1 text-sm text-slate">
              og:title {result.ogTitle.present ? "present" : "missing"}, og:description{" "}
              {result.ogDescription.present ? "present" : "missing"} — these control how the
              page looks when shared on social media.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={result.canonical.present ? "good" : "warn"} />
              <h3 className="font-semibold">Canonical URL</h3>
            </div>
            <p className="mt-1 text-sm text-slate">
              {result.canonical.present
                ? "Present — helps avoid duplicate-content SEO issues."
                : "Missing — consider adding one, especially if this content is reachable at more than one URL."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
