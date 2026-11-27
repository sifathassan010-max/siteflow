// Server-only helper for enforcing free/trial limits per tool.
// Every paid tool's API route should call checkUsageLimit() before doing
// the expensive work (calling Grok, crawling a site, etc.), and logUsage()
// after successfully completing it.
import { createAdminClient } from "@/lib/supabase/admin";

// Placeholder limits — replace with real numbers once you decide them.
const TRIAL_LIMITS: Record<string, number> = {
  chatbot: 50, // messages during trial
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

  // Paid + active subscribers who own this specific tool skip limits.
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

export type UsageMeta = {
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
};

export async function logUsage(
  userId: string,
  tool: string,
  eventType: string,
  quantity = 1,
  meta?: UsageMeta
) {
  const supabase = createAdminClient();
  const base = { user_id: userId, tool, event_type: eventType, quantity };

  if (meta) {
    // prompt_tokens / completion_tokens / model come from
    // supabase/schema-chatbot-v9.sql. If that hasn't been run yet, fall back
    // to a plain insert so the message is STILL counted against the caps.
    const { error } = await supabase.from("usage_events").insert({
      ...base,
      model: meta.model ?? null,
      prompt_tokens: meta.promptTokens ?? null,
      completion_tokens: meta.completionTokens ?? null,
    });
    if (!error) return;
    console.error("usage_events insert with token columns failed, retrying plain:", error.message);
  }

  const { error } = await supabase.from("usage_events").insert(base);
  if (error) console.error("usage_events insert failed:", error.message);
}
