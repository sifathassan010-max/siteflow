"use client";

import { useRouter } from "next/navigation";

export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${projectName}"? This also deletes all its scan history.`)) return;
    const res = await fetch(`/api/seo/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tools/seo");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-slate transition hover:border-red-300 hover:text-red-600"
    >
      Delete project
    </button>
  );
}
