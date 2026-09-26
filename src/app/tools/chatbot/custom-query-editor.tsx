"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CUSTOM_QUERY_COLOR_PALETTE,
  emptyCustomQuery,
  type CustomQuery,
} from "@/lib/chatbot-custom-queries";

// Shared by the "create a new bot" form and the "edit bot" settings form.
// Free-trial accounts can fill in the first query + its description; the
// "Add another query" button stays visible for everyone (so free users
// know the option exists), but clicking it just shows an upgrade notice
// instead of adding a row until the account is paid.
export default function CustomQueryEditor({
  queries,
  onChange,
  isPaid,
}: {
  queries: CustomQuery[];
  onChange: (next: CustomQuery[]) => void;
  isPaid: boolean;
}) {
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

  function updateQuery(index: number, patch: Partial<CustomQuery>) {
    onChange(queries.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuery(index: number) {
    onChange(queries.filter((_, i) => i !== index));
    setShowUpgradeNotice(false);
  }

  function handleAddClick() {
    if (!isPaid && queries.length >= 1) {
      setShowUpgradeNotice(true);
      return;
    }
    setShowUpgradeNotice(false);
    onChange([...queries, emptyCustomQuery()]);
  }

  return (
    <div>
      <label className="text-xs font-semibold text-slate">
        Add query or question (optional)
      </label>
      <p className="mt-1 text-xs text-slate">
        Visitors see this as a clickable question in your chat widget. When
        they click it, the description appears instantly — it&apos;s your
        own written answer, not an AI reply.
      </p>

      <div className="mt-3 flex flex-col gap-4">
        {queries.map((query, index) => (
          <div key={index} className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate">Query {index + 1}</p>
              <button
                type="button"
                onClick={() => removeQuery(index)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>

            <input
              type="text"
              value={query.question}
              onChange={(e) => updateQuery(index, { question: e.target.value })}
              placeholder="e.g. Do you offer refunds?"
              className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />

            <div className="mt-2">
              <p className="text-xs text-slate">Text color</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {CUSTOM_QUERY_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateQuery(index, { color })}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color}`}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      query.color === color ? "border-ink" : "border-transparent"
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={query.color}
                  onChange={(e) => updateQuery(index, { color: e.target.value })}
                  title="Custom color"
                  className="h-6 w-6 cursor-pointer rounded border border-line"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="text-xs font-semibold text-slate">Description</label>
              <textarea
                value={query.description}
                onChange={(e) => updateQuery(index, { description: e.target.value })}
                rows={3}
                placeholder="Shown to visitors after they click the question above. No length limit."
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddClick}
        className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
      >
        + Add another query
      </button>

      {showUpgradeNotice && (
        <p className="mt-2 rounded-lg bg-brand-bg px-3 py-2 text-xs leading-relaxed text-slate">
          You must become a paid user to add more queries.{" "}
          <Link href="/pricing" className="font-semibold text-brand hover:underline">
            See the pricing →
          </Link>
        </p>
      )}
    </div>
  );
}
