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
