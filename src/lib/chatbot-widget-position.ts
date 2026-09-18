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
// for a given position, used by the widget.js loader script.
export function cssOffsetsForPosition(position: WidgetPosition, margin = 24) {
  const vertical = position.startsWith("top") ? { top: margin } : { bottom: margin };
  const horizontal = position.endsWith("left") ? { left: margin } : { right: margin };
  return { ...vertical, ...horizontal };
}
