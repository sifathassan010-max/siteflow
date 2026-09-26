"use client";

import {
  WIDGET_POSITION_OPTIONS,
  WIDGET_OFFSET_MIN,
  WIDGET_OFFSET_MAX,
  type WidgetPosition,
} from "@/lib/chatbot-widget-position";

// The last option in the chatbot builder: which corner of the customer's
// website the floating widget appears in, plus how far from that corner's
// two edges it sits. Four tick-box options for the corner (only one at a
// time), and two independent sliders for distance — horizontal and
// vertical are separate because an owner may want the widget pulled in
// further from the side edge than from the top/bottom edge (e.g. to clear
// a floating "back to top" button on one axis only), or vice versa.
export default function WidgetPositionPicker({
  value,
  onChange,
  offsetX,
  offsetY,
  onOffsetXChange,
  onOffsetYChange,
}: {
  value: WidgetPosition;
  onChange: (next: WidgetPosition) => void;
  offsetX: number;
  offsetY: number;
  onOffsetXChange: (next: number) => void;
  onOffsetYChange: (next: number) => void;
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

      <div className="mt-4 grid gap-4 sm:max-w-xs sm:grid-cols-2">
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>Distance from side</span>
            <span className="text-ink">{offsetX}px</span>
          </label>
          <input
            type="range"
            min={WIDGET_OFFSET_MIN}
            max={WIDGET_OFFSET_MAX}
            value={offsetX}
            onChange={(e) => onOffsetXChange(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>Distance from top/bottom</span>
            <span className="text-ink">{offsetY}px</span>
          </label>
          <input
            type="range"
            min={WIDGET_OFFSET_MIN}
            max={WIDGET_OFFSET_MAX}
            value={offsetY}
            onChange={(e) => onOffsetYChange(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-slate">
        How far the widget sits from the corner's two edges — set
        independently, so one side can be pulled in further than the other.
      </p>
    </div>
  );
}
