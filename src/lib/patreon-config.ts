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

// ------------------------------------------------------------
// REFERRAL TIER ($35.99/mo) — a separate Patreon tier, sold only to
// visitors who arrived through an affiliate link. Same tools as the
// normal "Chatbot Builder" tier.
//
// The Patreon tier for affiliate visitors MUST be created with exactly this
// name (case doesn't matter, spacing does).
export const REFERRAL_TIER_TITLE = "Chatbot Builder Affiliate";

// Same Patreon page as everything else: the patron picks the tier there.
// If you later get a direct link to the affiliate tier, put it here instead.
export const PATREON_REFERRAL_JOIN_URL = PATREON_JOIN_URL;

export function isReferralTierConfigured(): boolean {
  return (
    PATREON_REFERRAL_JOIN_URL.startsWith("https://") &&
    !REFERRAL_TIER_TITLE.toLowerCase().startsWith("your input")
  );
}

export const TIER_TOOL_MAP: Record<string, string[]> = {
  "chatbot builder": ["chatbot"],
  "all access": ["chatbot"],
  [REFERRAL_TIER_TITLE.trim().toLowerCase()]: ["chatbot"],
};

// ------------------------------------------------------------
// LIST PRICES (USD / month). Used ONLY as a fallback for affiliate
// commission when Patreon's payload has no usable paid amount.
// "all access" has no fixed price here — if Patreon sends no amount for it
// the full price is used (and the commission row is marked as a default).
// ------------------------------------------------------------
export const FULL_PRICE_CENTS = 3999;
export const REFERRAL_PRICE_CENTS = 3599;

export function isReferralTierTitle(title: string): boolean {
  return title.trim().toLowerCase() === REFERRAL_TIER_TITLE.trim().toLowerCase();
}

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
// $39.99/mo = 1,000 calls/mo (same price for everyone, no affiliate discount) for that one tool's API.
// ============================================================
export const TIER_API_TOOL_MAP: Record<string, string[]> = {
  "chatbot api": ["chatbot"],
  "all access api": ["chatbot"],
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
