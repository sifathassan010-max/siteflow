// ============================================================
// PRICING CONFIG
// Edit prices and feature bullet points here. The /pricing page
// reads directly from this file — no need to touch any component
// code to update numbers or feature lists.
// ============================================================

export type PricingPlan = {
  name: string;
  monthlyPrice: number;
  // Price shown ONLY to visitors who arrived through an affiliate link
  // (sf_ref cookie / referred account) AND only once the referral Patreon
  // tier is configured. Sold as a separate Patreon tier.
  referralMonthlyPrice?: number;
  features: string[]; // <-- TYPE YOUR FEATURE BULLET POINTS HERE
};

export const TOOL_PLANS: PricingPlan[] = [
  {
    name: "Chatbot builder",
    monthlyPrice: 39.99,
    referralMonthlyPrice: 35.99,
    features: [
      // Add/remove lines freely, each becomes one bullet point.
      "15,000 messages per month, up to 500 per day",
      "Trains automatically on up to 16 pages of your website",
      "Animated GIF / rotating avatar on the chat bubble",
      "Custom persona & instructions",
      "Fast or thorough AI model, your choice",
      "Up to 6 quick-prompt suggestion buttons",
      "Custom widget color & logo",
      "Escalation contact for questions it can't answer",
      "Embeddable widget, copy-paste install",
      "Captures leads from conversations",
      "Full conversation history log",
    ],
  },
];

// ============================================================
// API PLANS — for developers and AI agents calling SiteFlow's tools
// programmatically instead of through the dashboard. See src/app/api/v1/**
// for the actual endpoints and /api-docs for the reference. Sold as
// separate Patreon tiers from the dashboard plans above (see
// src/lib/patreon-config.ts) — a customer can have either, both, or
// neither.
// ============================================================
export type ApiPricingPlan = {
  name: string;
  monthlyPrice: number;
  callsPerMonth: number;
  features: string[];
};

export const API_TOOL_PLANS: ApiPricingPlan[] = [
  {
    name: "Chatbot API",
    monthlyPrice: 25,
    callsPerMonth: 1000,
    features: ["Query one of your trained bots", "Structured JSON replies", "1,000 calls/month"],
  },
];

