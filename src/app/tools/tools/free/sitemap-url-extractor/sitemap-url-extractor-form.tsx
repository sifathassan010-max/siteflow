"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type ExtractResult = {
  url: string;
  urlCount: number;
  childSitemapsRead: number;
  truncated: boolean;
  urls: string[];
};

export default function SitemapUrlExtractorForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/tools/sitemap-url-extractor", {
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

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.urls.join("\n")], { type: "text/plain" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "sitemap-urls.txt";
    a.click();
    URL.revokeObjectURL(href);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.urls.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          required
          placeholder="https://example.com/sitemap.xml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-line px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "Extracting…" : "Extract URLs"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold">
              {result.urlCount.toLocaleString()} URL{result.urlCount === 1 ? "" : "s"} found
            </h3>
            <p className="mt-1 text-sm text-slate">
              {result.childSitemapsRead > 0
                ? `That was a sitemap index — read ${result.childSitemapsRead} child sitemap${result.childSitemapsRead === 1 ? "" : "s"}.`
                : "Extracted directly from the sitemap."}
              {result.truncated && " List was capped for this free tool."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDownload}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Download .txt
              </button>
              <button
                onClick={handleCopy}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-auto rounded-xl border border-line bg-white p-4">
            <ul className="flex flex-col gap-1 text-sm">
              {result.urls.map((u, i) => (
                <li key={i} className="break-all text-slate">
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
