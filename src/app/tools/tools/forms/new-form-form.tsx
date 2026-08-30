"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";
import FieldEditor from "./field-editor";
import { DEFAULT_FIELDS, FormField } from "@/lib/form-types";

export default function NewFormForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fields, notify_email: notifyEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/tools/forms/${data.form.id}`);
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
        <label className="text-xs font-semibold text-slate">Form name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Contact form"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">
          Notify email (optional)
        </label>
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate">
          Stored for later — email notifications aren&apos;t wired up yet, submissions
          always land in your dashboard either way.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Fields</label>
        <div className="mt-1">
          <FieldEditor fields={fields} onChange={setFields} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create form"}
      </button>
    </form>
  );
}
