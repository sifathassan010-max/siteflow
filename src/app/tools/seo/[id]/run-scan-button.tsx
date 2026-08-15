"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PATREON_JOIN_URL } from "@/lib/patreon-config";

export default function RunScanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitHit, setLimitHit] = useState(false);

  async function handleScan() {
    setLoading(true);
    setError("");
    setLimitHit(false);

    try {
      const res = await fetch(`/api/seo/projects/${projectId}/scan`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLimitHit(res.status === 402);
        setLoading(false);
        return;
      }

      router.refresh();
      setLoading(false);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleScan}
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {loading ? "Scanning… this can take up to a minute" : "Run new scan"}
      </button>
      {error && (
        <div className="mt-2">
          <p className="text-sm text-red-600">{error}</p>
          {limitHit && (
            <a
              href={PATREON_JOIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-brand hover:underline"
            >
              Subscribe on Patreon →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
