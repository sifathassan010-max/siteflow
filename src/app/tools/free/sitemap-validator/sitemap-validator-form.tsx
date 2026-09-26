"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

type Issue = { level: "error" | "warning"; message: string };

type ValidateResult = {
  url: string;
  kind: string;
  urlCount: number;
  childSitemapCount: number;
  truncated: boolean;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  issues: Issue[];
};

export default function SitemapValidatorForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ValidateResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/tools/sitemap-validator", {
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
          {loading ? "Validating…" : "Validate"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  result.valid ? "bg-flow" : "bg-red-500"
                }`}
              />
              <h3 className="font-semibold">
                {result.valid ? "Valid sitemap" : "Not valid — issues found"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate">
              {result.kind === "sitemapindex"
                ? `Sitemap index with ${result.childSitemapCount} child sitemap${result.childSitemapCount === 1 ? "" : "s"}.`
                : `${result.urlCount.toLocaleString()} URL${result.urlCount === 1 ? "" : "s"} found.`}{" "}
              {result.errorCount} error{result.errorCount === 1 ? "" : "s"}, {result.warningCount} warning
              {result.warningCount === 1 ? "" : "s"}.
              {result.truncated && " (Only the first portion of a very large file was checked.)"}
            </p>
          </div>

          {result.issues.length > 0 && (
            <div className="rounded-xl border border-line bg-white p-4">
              <h3 className="font-semibold">Details</h3>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        issue.level === "error" ? "bg-red-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-slate">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
