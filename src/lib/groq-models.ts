// Groq periodically deprecates and shuts down model IDs (see
// https://console.groq.com/docs/deprecations). `llama-3.1-8b-instant` and
// `llama-3.3-70b-versatile` — the two models this app used to offer —
// were shut down on 2026-08-16. Requests to a shut-down model ID fail on
// Groq's side (not a key/rate-limit issue), which is what was showing up
// as "The bot is having trouble right now" for every visitor.
//
// DEPRECATED_MODEL_REMAP lets already-saved bots (with the old model
// string sitting in the `model` column from before this fix) keep working
// without a database migration — every request resolves through
// `resolveGroqModel` first.

export const GROQ_MODEL_OPTIONS = [
  { value: "openai/gpt-oss-20b", label: "Fast (openai/gpt-oss-20b)" },
  { value: "openai/gpt-oss-120b", label: "Thorough (openai/gpt-oss-120b)" },
] as const;

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

const DEPRECATED_MODEL_REMAP: Record<string, string> = {
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
};

const VALID_MODEL_IDS: Set<string> = new Set(GROQ_MODEL_OPTIONS.map((m) => m.value));

// Always call this right before sending `model` to Groq's API — covers
// bots created before this fix (old model string still in the database)
// as well as any unrecognized/empty value.
export function resolveGroqModel(rawModel: unknown): string {
  const value = typeof rawModel === "string" ? rawModel : "";
  if (DEPRECATED_MODEL_REMAP[value]) return DEPRECATED_MODEL_REMAP[value];
  if (VALID_MODEL_IDS.has(value)) return value;
  return DEFAULT_GROQ_MODEL;
}
