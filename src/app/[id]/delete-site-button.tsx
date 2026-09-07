"use client";

import { useRouter } from "next/navigation";

export default function DeleteSiteButton({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${siteName}"? This also deletes all its analytics data.`)) return;
    const res = await fetch(`/api/analytics/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tools/analytics");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-slate transition hover:border-red-300 hover:text-red-600"
    >
      Delete site
    </button>
  );
}
