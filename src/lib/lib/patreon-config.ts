// ============================================================
// PATREON TIER MAPPING
// Match each Patreon tier's EXACT name (as you typed it when
// creating the tier on Patreon) to which SiteFlow tool(s) it
// should unlock. Case doesn't matter, spacing does.
//
// TO ADD/RENAME A TIER: just edit this list. No other code
// needs to change.
// ============================================================

// Your Patreon page — every "subscribe/upgrade" button on the site links
// here. Change this one line to change it everywhere.
export const PATREON_JOIN_URL = "https://www.patreon.com/15895599/join";

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

// ============================================================
// API TIERS — for developers / AI agents calling SiteFlow's tools
// programmatically (see src/app/api/v1/**), rather than logging into
// the dashboard. Sold and billed separately from the tiers above, so a
// customer can have dashboard access, API access, both, or neither.
// $25/mo = 1,000 calls/mo for that one tool's API.
// $55/mo (All Access API) = 1,000 calls/mo for EACH of the four tools.
// ============================================================
export const TIER_API_TOOL_MAP: Record<string, string[]> = {
  "chatbot api": ["chatbot"],
  "seo api": ["seo"],
  "forms api": ["forms"],
  "analytics api": ["analytics"],
  "all access api": ["chatbot", "seo", "forms", "analytics"],
};

export function tiersToUnlockedApiTools(tierTitles: string[]): string[] {
  const tools = new Set<string>();
  for (const title of tierTitles) {
    const key = title.trim().toLowerCase();
    const mapped = TIER_API_TOOL_MAP[key];
    if (mapped) mapped.forEach((t) => tools.add(t));
  }
  return Array.from(tools);
}
