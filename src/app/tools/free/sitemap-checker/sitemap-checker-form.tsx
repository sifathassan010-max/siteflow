"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type SitemapResult = {
  url: string;
  source: "robots.txt" | "common path";
  reachable: boolean;
  error?: string;
  kind?: string;
  urlCount?: number;
  childSitemapCount?: number;
  contentType?: string;
};

type CheckResult = {
  domain: string;
  found: boolean;
  sitemaps: SitemapResult[];
};

export default function SitemapCheckerForm() {
  const router = useRouter();
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
      const res = await fetch("/api/tools/sitemap-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
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
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-line px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "Checking…" : "Find sitemap"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-3">
          {!result.found && (
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-sm text-slate">
                No sitemap found for <span className="font-medium text-ink">{result.domain}</span> —
                checked robots.txt and the common sitemap paths. The site may not have one,
                or it's hosted somewhere non-standard.
              </p>
            </div>
          )}

          {result.sitemaps.map((s) => (
            <div key={s.url} className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    s.reachable ? "bg-flow" : "bg-red-500"
                  }`}
                />
                <h3 className="break-all font-semibold">{s.url}</h3>
              </div>
              <p className="mt-1 text-sm text-slate">
                Found via {s.source === "robots.txt" ? "robots.txt" : "common sitemap path"}
              </p>
              {s.reachable ? (
                <p className="mt-2 text-sm text-slate">
                  {s.kind === "sitemapindex"
                    ? `Sitemap index — links to ${s.childSitemapCount} child sitemap${s.childSitemapCount === 1 ? "" : "s"}.`
                    : `${s.urlCount?.toLocaleString()} URL${s.urlCount === 1 ? "" : "s"} listed.`}
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-600">{s.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
