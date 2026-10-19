// Where the chat widget floats on the customer's website. Used by the
// avatar/position pickers in the builder, both bot API routes, and the
// widget.js loader script that actually positions the floating iframe.

export type WidgetPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export const WIDGET_POSITION_OPTIONS: { value: WidgetPosition; label: string }[] = [
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
];

export const DEFAULT_WIDGET_POSITION: WidgetPosition = "bottom-right";

const VALID_POSITIONS: WidgetPosition[] = WIDGET_POSITION_OPTIONS.map((o) => o.value);

export function sanitizeWidgetPosition(raw: unknown): WidgetPosition {
  return VALID_POSITIONS.includes(raw as WidgetPosition)
    ? (raw as WidgetPosition)
    : DEFAULT_WIDGET_POSITION;
}

// CSS `top`/`left`/`right`/`bottom` offsets (in px, from the viewport edge)
// for a given position, used by the widget.js loader script. Horizontal
// and vertical are independent — an owner may want the widget pulled in
// further from the side edge than from the top/bottom edge, or vice versa.
export const WIDGET_OFFSET_MIN = 0;
export const WIDGET_OFFSET_MAX = 200;
export const WIDGET_OFFSET_DEFAULT = 24;

export function sanitizeWidgetOffset(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return WIDGET_OFFSET_DEFAULT;
  return Math.min(WIDGET_OFFSET_MAX, Math.max(WIDGET_OFFSET_MIN, Math.round(n)));
}

export function cssOffsetsForPosition(
  position: WidgetPosition,
  offsetX = WIDGET_OFFSET_DEFAULT,
  offsetY = WIDGET_OFFSET_DEFAULT
) {
  const vertical = position.startsWith("top") ? { top: offsetY } : { bottom: offsetY };
  const horizontal = position.endsWith("left") ? { left: offsetX } : { right: offsetX };
  return { ...vertical, ...horizontal };
}
