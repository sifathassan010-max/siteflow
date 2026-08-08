"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FieldEditor from "../field-editor";
import { FormField } from "@/lib/form-types";

export default function EditFormFields({
  formId,
  initialName,
  initialFields,
  initialNotifyEmail,
}: {
  formId: string;
  initialName: string;
  initialFields: FormField[];
  initialNotifyEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fields, notify_email: notifyEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSaving(false);
        return;
      }

      setSaved(true);
      setSaving(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This also deletes all its submissions.`)) return;
    const res = await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/tools/forms");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold text-slate">Form name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Fields</label>
        <div className="mt-1">
          <FieldEditor fields={fields} onChange={setFields} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-slate transition hover:border-red-300 hover:text-red-600"
        >
          Delete form
        </button>
      </div>
    </div>
  );
}
