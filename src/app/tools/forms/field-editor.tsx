"use client";

import { FIELD_TYPES, FormField, defaultField } from "@/lib/form-types";

export default function FieldEditor({
  fields,
  onChange,
}: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}) {
  function updateField(index: number, patch: Partial<FormField>) {
    const next = fields.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = fields.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addField() {
    onChange([...fields, defaultField()]);
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                onClick={() => moveField(index, -1)}
                disabled={index === 0}
                className="rounded border border-line px-1.5 text-xs text-slate transition hover:border-ink/30 disabled:opacity-30"
                aria-label="Move field up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveField(index, 1)}
                disabled={index === fields.length - 1}
                className="rounded border border-line px-1.5 text-xs text-slate transition hover:border-ink/30 disabled:opacity-30"
                aria-label="Move field down"
              >
                ↓
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field label, e.g. Company name"
                  className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm"
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, { type: e.target.value as FormField["type"] })
                  }
                  className="rounded-lg border border-line px-2 py-1.5 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {field.type === "select" && (
                <input
                  type="text"
                  value={(field.options ?? []).join(", ")}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Options, comma separated: Small, Medium, Large"
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
                />
              )}

              <label className="flex items-center gap-2 text-xs text-slate">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
            </div>

            <button
              type="button"
              onClick={() => removeField(index)}
              className="rounded-lg border border-line px-2 py-1 text-xs text-slate transition hover:border-red-300 hover:text-red-600"
              aria-label="Remove field"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="rounded-lg border border-dashed border-line px-4 py-2 text-sm font-semibold text-slate transition hover:border-ink/30 hover:text-ink"
      >
        + Add field
      </button>
    </div>
  );
}
