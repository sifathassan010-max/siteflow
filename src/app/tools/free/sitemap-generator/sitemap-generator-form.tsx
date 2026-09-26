"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type GenerateResult = {
  domain: string;
  pageCount: number;
  truncated: boolean;
  maxPages: number;
  xml: string;
};

export default function SitemapGeneratorForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/tools/sitemap-generator", {
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
    const blob = new Blob([result.xml], { type: "application/xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(href);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {loading ? "Crawling…" : "Generate"}
        </button>
      </form>
      {loading && (
        <p className="mt-2 text-xs text-slate">
          This crawls the site page by page, so larger sites can take a minute or so.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold">
              {result.pageCount} page{result.pageCount === 1 ? "" : "s"} found on {result.domain}
            </h3>
            <p className="mt-1 text-sm text-slate">
              {result.truncated
                ? `Stopped at the ${result.maxPages}-page free-tier limit — there may be more pages on the site.`
                : "The crawl finished without hitting the free-tier page limit."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDownload}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Download sitemap.xml
              </button>
              <button
                onClick={handleCopy}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                {copied ? "Copied!" : "Copy XML"}
              </button>
            </div>
          </div>

          <pre className="max-h-80 overflow-auto rounded-xl border border-line bg-white p-4 text-xs text-slate">
            {result.xml}
          </pre>
        </div>
      )}
    </div>
  );
}
