// ============================================================
// PATREON TIER MAPPING
// Match each Patreon tier's EXACT name (as you typed it when
// creating the tier on Patreon) to which SiteFlow tool(s) it
// should unlock. Case doesn't matter, spacing does.
//
// TO ADD/RENAME A TIER: just edit this list. No other code
// needs to change.
// ============================================================

export const TIER_TOOL_MAP: Record<string, string[]> = {
  "chatbot builder": ["chatbot"],
  "seo tool": ["seo"],
  "forms & lead capture": ["forms"],
  analytics: ["analytics"],
  "all access": ["chatbot", "seo", "forms", "analytics"],
};

// Turns a list of Patreon tier titles a patron currently has into
// the flat list of SiteFlow tool keys they should have unlocked.
export function tiersToUnlockedTools(tierTitles: string[]): string[] {
  const tools = new Set<string>();
  for (const title of tierTitles) {
    const key = title.trim().toLowerCase();
    const mapped = TIER_TOOL_MAP[key];
    if (mapped) mapped.forEach((t) => tools.add(t));
  }
  return Array.from(tools);
}
