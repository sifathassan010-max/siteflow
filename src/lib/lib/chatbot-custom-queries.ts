// Shared types + validation for the chatbot builder's "custom queries"
// feature: clickable FAQ-style questions an owner writes themselves, each
// with its own text color and a plain-text (non-AI) answer. Used by the
// create-bot form, the edit/settings form, and both API routes so the
// client and server never disagree on shape.

export type CustomQuery = {
  question: string;
  color: string;
  description: string;
};

// Preset swatches shown in the color palette. Owners can also pick a
// custom color via the native color input next to the swatches.
export const CUSTOM_QUERY_COLOR_PALETTE = [
  "#0f172a", // ink
  "#4f46e5", // brand
  "#2563eb", // blue
  "#0891b2", // cyan
  "#059669", // emerald
  "#65a30d", // lime
  "#ca8a04", // amber
  "#ea580c", // orange
  "#dc2626", // red
  "#db2777", // pink
  "#9333ea", // purple
  "#475569", // slate
];

export const DEFAULT_CUSTOM_QUERY_COLOR = "#4f46e5";

export function emptyCustomQuery(): CustomQuery {
  return { question: "", color: DEFAULT_CUSTOM_QUERY_COLOR, description: "" };
}

// Free-trial accounts get one query + its description. Paid accounts
// (active subscription unlocking the chatbot tool, or the all-access
// bundle) can add as many as they want — the 200 ceiling below is just a
// sanity limit against runaway payloads, not a real product limit.
export const FREE_CUSTOM_QUERY_LIMIT = 1;
const PAID_CUSTOM_QUERY_LIMIT = 200;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Server-side sanitizer — never trust isPaid or the array shape from the
// client. Drops anything without a question (an answer with no question
// isn't useful), clamps question length, and enforces the trial cap.
// Description is intentionally NOT length-capped — the product spec calls
// for unlimited-length answers.
export function sanitizeCustomQueries(raw: unknown, isPaid: boolean): CustomQuery[] {
  if (!Array.isArray(raw)) return [];

  const cleaned: CustomQuery[] = raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      question:
        typeof item.question === "string" ? item.question.trim().slice(0, 200) : "",
      color:
        typeof item.color === "string" && HEX_COLOR.test(item.color)
          ? item.color
          : DEFAULT_CUSTOM_QUERY_COLOR,
      description: typeof item.description === "string" ? item.description.trim() : "",
    }))
    .filter((q) => q.question.length > 0);

  const limit = isPaid ? PAID_CUSTOM_QUERY_LIMIT : FREE_CUSTOM_QUERY_LIMIT;
  return cleaned.slice(0, limit);
}
