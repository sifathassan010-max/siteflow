"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";

export default function NewSiteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analytics/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/tools/analytics/${data.site.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4"
    >
      <div>
        <label className="text-xs font-semibold text-slate">Site name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My main website"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Domain</label>
        <input
          type="text"
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate">
          For your own reference — the tracking script isn&apos;t restricted
          to this domain.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create site"}
      </button>
    </form>
  );
}
