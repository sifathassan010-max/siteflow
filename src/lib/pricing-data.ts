// ============================================================
// PRICING CONFIG
// Edit prices and feature bullet points here. The /pricing page
// reads directly from this file — no need to touch any component
// code to update numbers or feature lists.
// ============================================================

export type PricingPlan = {
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number; // price for 3 months, billed once
  features: string[]; // <-- TYPE YOUR FEATURE BULLET POINTS HERE
};

export const TOOL_PLANS: PricingPlan[] = [
  {
    name: "Chatbot builder",
    monthlyPrice: 25,
    quarterlyPrice: 60,
    features: [
      // Add/remove lines freely, each becomes one bullet point.
      "Feature coming soon",
    ],
  },
  {
    name: "SEO tool",
    monthlyPrice: 25,
    quarterlyPrice: 60,
    features: ["Feature coming soon"],
  },
  {
    name: "Forms & Lead Capture",
    monthlyPrice: 25,
    quarterlyPrice: 60,
    features: ["Feature coming soon"],
  },
  {
    name: "Analytics",
    monthlyPrice: 25,
    quarterlyPrice: 60,
    features: ["Feature coming soon"],
  },
];

export const BUNDLE_PLAN: PricingPlan = {
  name: "All 4 tools",
  monthlyPrice: 55,
  quarterlyPrice: 149,
  features: [
    "Everything in all 4 tools above",
    // Add more bundle-only perks here if you want any.
  ],
};

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
  {
    name: "SEO API",
    monthlyPrice: 25,
    callsPerMonth: 1000,
    features: ["Single-page SEO audit", "Score + issue list as JSON", "1,000 calls/month"],
  },
  {
    name: "Forms API",
    monthlyPrice: 25,
    callsPerMonth: 1000,
    features: ["Retrieve form submissions/leads", "Structured JSON", "1,000 calls/month"],
  },
  {
    name: "Analytics API",
    monthlyPrice: 25,
    callsPerMonth: 1000,
    features: ["Pageviews & top pages summary", "Structured JSON", "1,000 calls/month"],
  },
];

export const API_BUNDLE_PLAN: ApiPricingPlan = {
  name: "All Access API",
  monthlyPrice: 55,
  callsPerMonth: 1000,
  features: [
    "1,000 calls/month for EACH of the 4 tools above",
    "One API key, every endpoint",
  ],
};
