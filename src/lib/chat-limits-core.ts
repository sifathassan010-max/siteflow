// Pure (no I/O, no imports) chat-limit logic so it can be unit tested with
// `node --experimental-strip-types --test src/lib/chat-limits-core.test.ts`.
// The Supabase-touching wrapper lives in src/lib/chat-limits.ts.

// LOCKED plan limits (Chatbot Builder). 1 message = 1 visitor message answered,
// counted across ALL of the account's bots, in UTC.
export const PAID_MONTHLY_LIMIT = 15000;
export const PAID_DAILY_LIMIT = 500;

// Per-visitor abuse limits on the public embed route.
export const VISITOR_PER_MINUTE = 8;
export const VISITOR_PER_DAY = 100;

// Free demo (/tools chatbot-preview) — per logged-in user, per UTC day.
export const PREVIEW_DAILY_LIMIT = 30;

export function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function startOfNextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function secondsUntil(target: Date, now: Date): number {
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

export type CapReason = "monthly" | "daily";

export type CapResult =
  | { allowed: true }
  | { allowed: false; reason: CapReason; retryAfterSeconds: number };

// Monthly is checked first: if both are exhausted the longer wait is the
// honest one to report.
export function evaluateCaps(
  used: { month: number; day: number },
  now: Date = new Date(),
  limits: { month: number; day: number } = {
    month: PAID_MONTHLY_LIMIT,
    day: PAID_DAILY_LIMIT,
  }
): CapResult {
  if (used.month >= limits.month) {
    return {
      allowed: false,
      reason: "monthly",
      retryAfterSeconds: secondsUntil(startOfNextUtcMonth(now), now),
    };
  }
  if (used.day >= limits.day) {
    return {
      allowed: false,
      reason: "daily",
      retryAfterSeconds: secondsUntil(nextUtcMidnight(now), now),
    };
  }
  return { allowed: true };
}

// Message shown to the BOT OWNER (dashboard test chat).
export function ownerCapMessage(reason: CapReason): string {
  return reason === "monthly"
    ? `You've used all ${PAID_MONTHLY_LIMIT.toLocaleString("en-US")} messages included this month. The count resets on the 1st at 00:00 UTC.`
    : `You've reached today's limit of ${PAID_DAILY_LIMIT.toLocaleString("en-US")} messages. The count resets at 00:00 UTC.`;
}

// Message shown to an anonymous VISITOR on the owner's website. Deliberately
// vague about plan numbers — visitors don't need to see billing details.
export const VISITOR_CAP_MESSAGE =
  "This chatbot is temporarily unavailable. Please contact the site owner directly.";

export function visitorRateMessage(reason: "minute" | "day"): string {
  return reason === "minute"
    ? "You're sending messages too quickly. Please wait a moment and try again."
    : "You've reached the daily message limit for this chatbot. Please try again tomorrow.";
}

// First hop of x-forwarded-for (Vercel puts the real client first), falling
// back to x-real-ip. Returns "unknown" if nothing usable is present.
export function pickClientIp(get: (name: string) => string | null): string {
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

// Session ids come from the client: cap length so a hostile client can't
// stuff huge strings into the rate table.
export function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 100) return null;
  return s;
}

export type TokenUsage = {
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

// Groq returns OpenAI-style `usage`. Be defensive: it can be missing.
export function extractTokenUsage(data: unknown, model: string): TokenUsage {
  const usage = (data as { usage?: Record<string, unknown> } | null)?.usage;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  return {
    model,
    promptTokens: num(usage?.prompt_tokens),
    completionTokens: num(usage?.completion_tokens),
  };
}
