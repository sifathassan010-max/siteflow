import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";
import { TOOL_PLANS, API_TOOL_PLANS } from "@/lib/pricing-data";
import { PatreonBuyButton } from "@/components/patreon-buy-button";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isReferralTierConfigured } from "@/lib/patreon-config";

export const metadata: Metadata = {
  title: "Pricing — Simple Plans for Small Business Website Tools | SiteFlow",
  description:
    "See SiteFlow's pricing for the AI chatbot builder. Start free, pay only for what you use.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "SiteFlow Pricing — Chatbot Plans",
    description: "Simple, transparent pricing for small business website tools. Start free.",
    url: "/pricing",
  },
};

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-flow">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Is this visitor an affiliate-referred one? Either they arrived through a
// ?ref= link (sf_ref cookie, set in src/middleware.ts) or they are logged in
// with an account that was referred. Never throws: any failure = not referred.
async function isReferredVisitor(): Promise<boolean> {
  try {
    const jar = await cookies();
    const ref = jar.get("sf_ref")?.value ?? "";
    if (/^[a-z0-9-]{2,64}$/.test(ref)) return true;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by_slug")
      .eq("id", auth.user.id)
      .maybeSingle();
    return !!profile?.referred_by_slug;
  } catch {
    return false;
  }
}

function money(n: number) {
  return n.toFixed(2);
}

export default async function PricingPage() {
  // The $35.99 price is only ever shown when the referral Patreon tier is
  // really set up (name + join URL in patreon-config.ts); otherwise a visitor
  // could see a price they cannot buy.
  const showReferralPrice = isReferralTierConfigured() && (await isReferredVisitor());

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-3 text-slate">
            Start free on any tool. Pay only for what you use.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-5">
          {TOOL_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex w-full max-w-sm flex-1 flex-col rounded-2xl border border-line bg-white p-6 sm:min-w-[280px]"
            >
              <h3 className="font-bold">{plan.name}</h3>
              {showReferralPrice && plan.referralMonthlyPrice !== undefined ? (
                <p className="mt-3 text-3xl font-bold">
                  ${money(plan.referralMonthlyPrice)}
                  <span className="text-base font-medium text-slate">/mo</span>
                  <span className="ml-2 text-base font-medium text-slate line-through">
                    ${money(plan.monthlyPrice)}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-3xl font-bold">
                  ${money(plan.monthlyPrice)}
                  <span className="text-base font-medium text-slate">/mo</span>
                </p>
              )}
              {showReferralPrice && plan.referralMonthlyPrice !== undefined && (
                <p className="mt-1 text-xs text-slate">Referral price — applied through the referral plan on Patreon.</p>
              )}
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-slate">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-5 rounded-full border border-line px-4 py-2 text-center text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                Start free trial
              </Link>
              <PatreonBuyButton
                referral={showReferralPrice && plan.referralMonthlyPrice !== undefined}
                wrapperClassName="mt-2"
                className="w-full rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-hover"
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate">
          <Link href="/trust" className="underline hover:text-ink">
            Security &amp; Privacy — view our Trust Center
          </Link>
        </p>

        <div id="api" className="mt-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            API access for developers &amp; AI agents
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate">
            Call SiteFlow&apos;s tools programmatically with an API key
            instead of the dashboard — a flat monthly rate, no metered
            surprises. See the{" "}
            <Link href="/api-docs" className="text-brand underline">
              API docs
            </Link>{" "}
            for endpoints.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {API_TOOL_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex w-full max-w-sm flex-1 flex-col rounded-2xl border border-line bg-white p-6 sm:min-w-[280px]"
            >
              <h3 className="font-bold">{plan.name}</h3>
              <p className="mt-3 text-3xl font-bold">
                ${plan.monthlyPrice}
                <span className="text-base font-medium text-slate">/mo</span>
              </p>
              <p className="mt-1 text-xs text-slate">
                {plan.callsPerMonth.toLocaleString()} calls/month
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-slate">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-5 rounded-full border border-line px-4 py-2 text-center text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                Create account
              </Link>
              <PatreonBuyButton
                wrapperClassName="mt-2"
                className="w-full rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-hover"
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate">
          After subscribing, generate your key from{" "}
          <Link href="/dashboard/settings/api-keys" className="underline hover:text-ink">
            Dashboard → API keys
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
