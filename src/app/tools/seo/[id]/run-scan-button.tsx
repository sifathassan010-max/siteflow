"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunScanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleScan() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/seo/projects/${projectId}/scan`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
