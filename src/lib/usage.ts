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

export async function checkUsageLimit(userId: string, tool: string) {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .single();

  // Paid + active subscribers for this tier (or the bundle) skip limits entirely.
  const isPaidActive =
    subscription?.status === "active" &&
    (subscription.tier === tool || subscription.tier === "bundle");

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
