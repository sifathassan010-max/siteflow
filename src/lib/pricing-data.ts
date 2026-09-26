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
      "Trains automatically on your website content",
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

