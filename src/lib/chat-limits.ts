// Server-only. Supabase-backed chat limits for the Chatbot Builder:
//  - paid accounts: 15,000 messages / UTC month and 500 / UTC day (all bots)
//  - trial accounts: unchanged (50 lifetime, handled by checkUsageLimit)
//  - public embed visitors: per (bot, session) and per (bot, IP hash) rate limits
//  - free demo preview: per-user daily cap
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit } from "@/lib/usage";
import {
  PAID_DAILY_LIMIT,
  PAID_MONTHLY_LIMIT,
  PREVIEW_DAILY_LIMIT,
  VISITOR_PER_DAY,
  VISITOR_PER_MINUTE,
  evaluateCaps,
  nextUtcMidnight,
  secondsUntil,
  startOfNextUtcMonth,
  startOfUtcDay,
  startOfUtcMonth,
  pickClientIp,
  type CapReason,
} from "@/lib/chat-limits-core";

export type ChatAllowance =
  | { allowed: true }
  | {
      allowed: false;
      kind: "trial_exhausted";
      used: number;
      limit: number;
    }
  | {
      allowed: false;
      kind: "cap";
      reason: CapReason;
      retryAfterSeconds: number;
    };

async function countChatEvents(userId: string, sinceIso: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool", "chatbot")
    .gte("created_at", sinceIso);
  return count ?? 0;
}

// Single entry point for "may this account's bot answer one more message?".
// Used by the dashboard test chat and the public embed chat.
export async function checkChatAllowance(userId: string): Promise<ChatAllowance> {
  const base = await checkUsageLimit(userId, "chatbot");

  // Trial (not paid+active): existing lifetime cap.
  if ("used" in base) {
    if (base.allowed) return { allowed: true };
    return { allowed: false, kind: "trial_exhausted", used: base.used, limit: base.limit };
  }

  // Paid + active: monthly and daily caps (UTC).
  const now = new Date();
  const [month, day] = await Promise.all([
    countChatEvents(userId, startOfUtcMonth(now).toISOString()),
    countChatEvents(userId, startOfUtcDay(now).toISOString()),
  ]);
  const result = evaluateCaps({ month, day }, now);
  if (result.allowed) return { allowed: true };
  return {
    allowed: false,
    kind: "cap",
    reason: result.reason,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

// Numbers for the owner dashboard meter.
export async function getChatUsageSummary(userId: string) {
  const now = new Date();
  const [month, day] = await Promise.all([
    countChatEvents(userId, startOfUtcMonth(now).toISOString()),
    countChatEvents(userId, startOfUtcDay(now).toISOString()),
  ]);
  return {
    month,
    monthLimit: PAID_MONTHLY_LIMIT,
    day,
    dayLimit: PAID_DAILY_LIMIT,
    dayResetsInSeconds: secondsUntil(nextUtcMidnight(now), now),
    monthResetsInSeconds: secondsUntil(startOfNextUtcMonth(now), now),
  };
}

function hashValue(value: string): string {
  const key = process.env.RATE_LIMIT_SALT || "siteflow-rate-limit";
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

export type VisitorRate =
  | { allowed: true }
  | { allowed: false; reason: "minute" | "day"; retryAfterSeconds: number };

// Atomic check+record via the check_visitor_rate() SQL function
// (supabase/schema-chatbot-v9.sql). Fails OPEN if the function is missing
// or errors, so a missed SQL step never takes chatbots offline — the error is
// logged so it is visible in Vercel logs.
export async function checkVisitorRate(
  botId: string,
  sessionId: string,
  request: Request
): Promise<VisitorRate> {
  const ip = pickClientIp((n) => request.headers.get(n));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_visitor_rate", {
    p_bot: botId,
    p_session: hashValue(`s:${sessionId}`),
    p_ip: hashValue(`ip:${ip}`),
    p_per_minute: VISITOR_PER_MINUTE,
    p_per_day: VISITOR_PER_DAY,
  });

  if (error || !data) {
    console.error("check_visitor_rate failed (is schema-chatbot-v9.sql run?):", error?.message);
    return { allowed: true };
  }

  const r = data as { allowed: boolean; reason?: "minute" | "day"; retry_after?: number };
  if (r.allowed) return { allowed: true };
  return {
    allowed: false,
    reason: r.reason === "day" ? "day" : "minute",
    retryAfterSeconds: Math.max(1, Math.round(r.retry_after ?? 60)),
  };
}

// Free demo preview: per-user daily cap. Counts free_chatbot_preview events.
export async function checkPreviewAllowance(userId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool", "free_chatbot_preview")
    .gte("created_at", startOfUtcDay(new Date()).toISOString());
  const used = count ?? 0;
  return {
    allowed: used < PREVIEW_DAILY_LIMIT,
    used,
    limit: PREVIEW_DAILY_LIMIT,
    retryAfterSeconds: secondsUntil(nextUtcMidnight(new Date()), new Date()),
  };
}
