// Pure helpers (no I/O) for reading what a Patreon member actually pays and
// turning it into an affiliate commission. Unit-tested in
// patreon-amount.test.ts. Imports use ".ts" so `node --experimental-strip-types`
// can run the tests.

import {
  FULL_PRICE_CENTS,
  REFERRAL_PRICE_CENTS,
  TIER_TOOL_MAP,
  TIER_API_TOOL_MAP,
  isReferralTierTitle,
} from "./patreon-config.ts";

export type PaidSource = "payload" | "config" | "default";

export type PaidAmount = {
  cents: number;
  source: PaidSource;
};

// Sanity bounds for a monthly price in cents. Anything outside is treated as
// garbage and ignored (never trust a number blindly with money attached).
const MIN_CENTS = 100; // $1
const MAX_CENTS = 100_000; // $1,000

type PayloadLike = {
  data?: { type?: string; attributes?: Record<string, unknown> };
  included?: Array<{ type: string; attributes?: Record<string, unknown> }>;
};

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && /^\d{1,9}$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

// Patreon API v2 member attributes: `currently_entitled_amount_cents` is what
// the patron is currently entitled to / pays per cycle. `will_pay_amount_cents`
// is the next-cycle amount. Both are in the CAMPAIGN currency.
// If `pledge_cadence` is present and > 1 (annual = 12) the amount covers that
// many months, so it is divided down to a monthly figure.
export function extractPaidCents(payload: PayloadLike): number | null {
  const attrs = payload.data?.attributes;
  if (!attrs) return null;

  // If the campaign currency is known and is not USD, the cents are not USD.
  const campaign = payload.included?.find((i) => i.type === "campaign");
  const currency = campaign?.attributes?.currency;
  if (typeof currency === "string" && currency.toUpperCase() !== "USD") return null;

  let cents = toInt(attrs.currently_entitled_amount_cents);
  if (cents === null || cents <= 0) cents = toInt(attrs.will_pay_amount_cents);
  if (cents === null || cents <= 0) return null;

  const cadence = toInt(attrs.pledge_cadence);
  if (cadence !== null && cadence > 1 && cadence <= 12) cents = Math.round(cents / cadence);

  if (cents < MIN_CENTS || cents > MAX_CENTS) return null;
  return cents;
}

// Config fallback: referral tier -> 35.99, other known paid tier -> 39.99.
export function configPriceCents(tierTitles: string[]): number | null {
  if (tierTitles.some((t) => isReferralTierTitle(t))) return REFERRAL_PRICE_CENTS;
  const known = tierTitles.map((t) => t.trim().toLowerCase());
  if (known.includes("chatbot builder")) return FULL_PRICE_CENTS;
  return null;
}

// A patron holding two of OUR tiers at once (e.g. Chatbot Builder + Chatbot
// API) has ONE pledge amount = the sum of both. That sum is not the price of
// the dashboard plan, so in that case the payload amount is not used.
function countKnownTiers(tierTitles: string[]): number {
  return tierTitles.filter((t) => {
    const k = t.trim().toLowerCase();
    return k in TIER_TOOL_MAP || k in TIER_API_TOOL_MAP;
  }).length;
}

export function resolvePaidAmount(payload: PayloadLike, tierTitles: string[]): PaidAmount {
  const fromPayload = countKnownTiers(tierTitles) > 1 ? null : extractPaidCents(payload);
  if (fromPayload !== null) return { cents: fromPayload, source: "payload" };
  const fromConfig = configPriceCents(tierTitles);
  if (fromConfig !== null) return { cents: fromConfig, source: "config" };
  return { cents: FULL_PRICE_CENTS, source: "default" };
}
