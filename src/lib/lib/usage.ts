// Server-only helper for enforcing free/trial limits per tool.
// Every paid tool's API route should call checkUsageLimit() before doing
// the expensive work (calling Grok, crawling a site, etc.), and logUsage()
// after successfully completing it.
import { createAdminClient } from "@/lib/supabase/admin";

// Placeholder limits — replace with real numbers once you decide them.
const TRIAL_LIMITS: Record<string, number> = {
  chatbot: 50, // messages during trial
  seo: 10, // pages scanned during trial
  forms: 100, // submissions during trial
  analytics: 1000, // pageviews during trial
};

export type UsageCheck =
  | { allowed: true } // paid + active for this tool — no cap
  | { allowed: boolean; used: number; limit: number }; // trial — capped

export async function checkUsageLimit(userId: string, tool: string): Promise<UsageCheck> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, unlocked_tools")
    .eq("user_id", userId)
    .single();

  // Paid + active subscribers who own this specific tool (or bought the
  // bundle, which just means all 4 tools are in unlocked_tools) skip limits.
  const isPaidActive =
    subscription?.status === "active" &&
    (subscription.unlocked_tools ?? []).includes(tool);

  if (isPaidActive) return { allowed: true as const };

  const { count } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool", tool);

  const limit = TRIAL_LIMITS[tool] ?? 0;
  const used = count ?? 0;

  return {
    allowed: used < limit,
    used,
    limit,
  } as const;
}

// Lighter-weight check than checkUsageLimit() for spots that just need a
// yes/no ("does this account get the paid version of this tool?") rather
// than trial usage numbers — e.g. gating how many custom chatbot queries
// someone can save. Anonymous/no-account callers should treat this as
// false rather than calling it.
export async function isPaidForTool(userId: string, tool: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, unlocked_tools")
    .eq("user_id", userId)
    .single();

  return (
    subscription?.status === "active" &&
    (subscription.unlocked_tools ?? []).includes(tool)
  );
}

export async function logUsage(
  userId: string,
  tool: string,
  eventType: string,
  quantity = 1
) {
  const supabase = createAdminClient();
  await supabase
    .from("usage_events")
    .insert({ user_id: userId, tool, event_type: eventType, quantity });
}
