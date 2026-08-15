"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type CompareResult = {
  urlA: string;
  urlB: string;
  countA: number;
  countB: number;
  commonCount: number;
  onlyInACount: number;
  onlyInBCount: number;
  onlyInA: string[];
  onlyInB: string[];
  truncated: boolean;
};

export default function SitemapUrlComparisonForm() {
  const router = useRouter();
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/sitemap-url-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlA, urlB }),
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          required
          placeholder="First sitemap URL, e.g. https://example.com/sitemap-old.xml"
          value={urlA}
          onChange={(e) => setUrlA(e.target.value)}
          className="rounded-lg border border-line px-4 py-2.5"
        />
        <input
          type="text"
          required
          placeholder="Second sitemap URL, e.g. https://example.com/sitemap.xml"
          value={urlB}
          onChange={(e) => setUrlB(e.target.value)}
          className="rounded-lg border border-line px-4 py-2.5"
        />
        <button
          type="submit"
          disabled={loading}
          className="self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold">Summary</h3>
            <p className="mt-1 text-sm text-slate">
              First sitemap: {result.countA.toLocaleString()} URLs. Second sitemap:{" "}
              {result.countB.toLocaleString()} URLs. {result.commonCount.toLocaleString()} URL
              {result.commonCount === 1 ? "" : "s"} in both.
              {result.truncated && " (Displayed lists were capped for this free tool.)"}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold">
              Only in the first sitemap ({result.onlyInACount.toLocaleString()})
            </h3>
            {result.onlyInA.length === 0 ? (
              <p className="mt-1 text-sm text-slate">None — every URL there is also in the second.</p>
            ) : (
              <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-auto text-sm">
                {result.onlyInA.map((u, i) => (
                  <li key={i} className="break-all text-slate">
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold">
              Only in the second sitemap ({result.onlyInBCount.toLocaleString()})
            </h3>
            {result.onlyInB.length === 0 ? (
              <p className="mt-1 text-sm text-slate">None — every URL there is also in the first.</p>
            ) : (
              <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-auto text-sm">
                {result.onlyInB.map((u, i) => (
                  <li key={i} className="break-all text-slate">
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
