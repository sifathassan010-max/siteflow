"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/lib/form-types";

type Submission = { id: string; data: Record<string, string | boolean>; created_at: string };

export default function SubmissionsTable({
  formId,
  fields,
}: {
  formId: string;
  fields: FormField[];
}) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forms/${formId}/submissions`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setSubmissions(data.submissions ?? []);
      })
      .catch(() => !cancelled && setError("Couldn't load submissions"));
    return () => {
      cancelled = true;
    };
  }, [formId]);

  function downloadCsv() {
    if (!submissions || submissions.length === 0) return;
    const headers = ["Submitted at", ...fields.map((f) => f.label || f.id)];
    const rows = submissions.map((s) => [
      new Date(s.created_at).toISOString(),
      ...fields.map((f) => String(s.data[f.id] ?? "")),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!submissions) return <p className="text-sm text-slate">Loading submissions…</p>;

  if (submissions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line p-6 text-sm text-slate">
        No submissions yet — once your embed is live, they&apos;ll show up here.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate">{submissions.length} submission(s)</p>
        <button
          onClick={downloadCsv}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/30"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-slate">
            <tr>
              <th className="px-3 py-2 font-semibold">Submitted</th>
              {fields.map((f) => (
                <th key={f.id} className="px-3 py-2 font-semibold">
                  {f.label || f.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-slate">
                  {new Date(s.created_at).toLocaleString()}
                </td>
                {fields.map((f) => (
                  <td key={f.id} className="px-3 py-2">
                    {f.type === "checkbox" ? (s.data[f.id] ? "Yes" : "No") : String(s.data[f.id] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
