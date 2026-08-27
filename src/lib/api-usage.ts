// Server-only. Enforces the "$25 = 1,000 calls/month" API plans.
// Every src/app/api/v1/** route calls checkApiUsageLimit() before doing
// the expensive work, then logApiUsage() after a successful response.
//
// Unlike src/lib/usage.ts (dashboard trial limits, which are a lifetime
// cap during a free trial), this is a monthly cap for paying API
// customers — the count resets naturally every calendar month because it
// only counts usage_events from the start of the current month onward.
import { createAdminClient } from "@/lib/supabase/admin";

export const API_TOOLS = ["chatbot", "seo", "forms", "analytics"] as const;
export type ApiTool = (typeof API_TOOLS)[number];

// Calls per month included with a single-tool API plan ($25/mo). The
// "All Access API" plan ($55/mo) grants this same 1,000/mo allowance per
// tool, for every tool at once — a discount on buying all four
// individually ($100/mo), not a combined/shared pool.
export const MONTHLY_CALL_LIMIT = 1000;

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export type ApiUsageCheck =
  | { allowed: true; used: number; limit: number }
  | { allowed: false; used: number; limit: number; reason: "no_plan" | "quota_exceeded" };

export async function checkApiUsageLimit(userId: string, tool: ApiTool): Promise<ApiUsageCheck> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("status, api_unlocked_tools")
    .eq("user_id", userId)
    .single();

  const hasApiPlanForTool =
    subscription?.status === "active" && (subscription.api_unlocked_tools ?? []).includes(tool);

  if (!hasApiPlanForTool) {
    return { allowed: false, used: 0, limit: 0, reason: "no_plan" };
  }

  const { count } = await admin
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool", `api_${tool}`)
    .gte("created_at", startOfCurrentMonthIso());

  const used = count ?? 0;

  if (used >= MONTHLY_CALL_LIMIT) {
    return { allowed: false, used, limit: MONTHLY_CALL_LIMIT, reason: "quota_exceeded" };
  }

  return { allowed: true, used, limit: MONTHLY_CALL_LIMIT };
}

export async function logApiUsage(userId: string, tool: ApiTool, endpoint: string) {
  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    tool: `api_${tool}`,
    event_type: endpoint,
    quantity: 1,
  });
}

// Used by the dashboard API-keys settings page to show "347 / 1,000 calls
// used this month" per tool, regardless of whether the user is subscribed.
export async function getMonthlyApiUsageSummary(userId: string) {
  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("api_unlocked_tools, status")
    .eq("user_id", userId)
    .single();

  const unlocked = new Set(
    subscription?.status === "active" ? subscription.api_unlocked_tools ?? [] : []
  );

  const summary: Record<ApiTool, { unlocked: boolean; used: number; limit: number }> = {
    chatbot: { unlocked: false, used: 0, limit: MONTHLY_CALL_LIMIT },
    seo: { unlocked: false, used: 0, limit: MONTHLY_CALL_LIMIT },
    forms: { unlocked: false, used: 0, limit: MONTHLY_CALL_LIMIT },
    analytics: { unlocked: false, used: 0, limit: MONTHLY_CALL_LIMIT },
  };

  await Promise.all(
    API_TOOLS.map(async (tool) => {
      summary[tool].unlocked = unlocked.has(tool);
      const { count } = await admin
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("tool", `api_${tool}`)
        .gte("created_at", startOfCurrentMonthIso());
      summary[tool].used = count ?? 0;
    })
  );

  return summary;
}
