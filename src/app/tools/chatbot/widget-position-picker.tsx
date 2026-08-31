"use client";

import {
  WIDGET_POSITION_OPTIONS,
  type WidgetPosition,
} from "@/lib/chatbot-widget-position";

// The last option in the chatbot builder: which corner of the customer's
// website the floating widget appears in. Four tick-box options, but only
// one can be selected at a time — the widget can only live in one corner.
export default function WidgetPositionPicker({
  value,
  onChange,
}: {
  value: WidgetPosition;
  onChange: (next: WidgetPosition) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate">Widget Position</label>
      <p className="mt-1 text-xs text-slate">
        Choose which corner of your website the chat widget appears in.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
        {WIDGET_POSITION_OPTIONS.map((option) => {
          const checked = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                checked
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink hover:bg-canvas"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-white bg-white" : "border-line"
                }`}
              >
                {checked && (
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3 text-ink"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
