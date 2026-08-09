"use client";

import { useState } from "react";
import { FormField } from "@/lib/form-types";

export default function EmbedFormWidget({
  formId,
  formName,
  fields,
}: {
  formId: string;
  formName: string;
  fields: FormField[];
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function setValue(id: string, value: string | boolean) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/embed/form/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-lg font-semibold">Thanks!</p>
        <p className="text-sm text-slate">Your submission was received.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-semibold">{formName}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="text-xs font-semibold text-slate">
              {field.label || field.id}
              {field.required && " *"}
            </label>

            {field.type === "textarea" ? (
              <textarea
                required={field.required}
                rows={3}
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            ) : field.type === "select" ? (
              <select
                required={field.required}
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.id])}
                  onChange={(e) => setValue(field.id, e.target.checked)}
                />
                Yes
              </label>
            ) : (
              <input
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                required={field.required}
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => setValue(field.id, e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit"}
        </button>
      </form>

      <div className="border-t border-line bg-canvas px-4 py-2 text-center">
        <p className="text-xs text-slate">Powered by SiteFlow</p>
      </div>
    </div>
  );
}
