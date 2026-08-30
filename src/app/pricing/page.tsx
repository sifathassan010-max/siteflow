import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";
import { TOOL_PLANS, BUNDLE_PLAN, API_TOOL_PLANS, API_BUNDLE_PLAN } from "@/lib/pricing-data";
import { PatreonBuyButton } from "@/components/patreon-buy-button";

export const metadata: Metadata = {
  title: "Pricing — Simple Plans for Small Business Website Tools | SiteFlow",
  description:
    "See SiteFlow's pricing for the AI chatbot builder, SEO audit tool, lead-capture forms, and analytics. Start free on any tool, pay only for what you use, or bundle everything.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "SiteFlow Pricing — Chatbot, SEO, Forms & Analytics Plans",
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

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-3 text-slate">
            Start free on any tool. Pay only for what you use, or get
            everything in one plan.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-2xl border border-line bg-white p-6"
            >
              <h3 className="font-bold">{plan.name}</h3>
              <p className="mt-3 text-3xl font-bold">
                ${plan.monthlyPrice}
                <span className="text-base font-medium text-slate">/mo</span>
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
                Start free trial
              </Link>
              <PatreonBuyButton
                wrapperClassName="mt-2"
                className="w-full rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-hover"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border-2 border-brand bg-brand-bg p-8 sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-brand">{BUNDLE_PLAN.name}</h3>
              <p className="mt-1 text-sm text-slate">
                Everything your website needs, one price.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate">
                {BUNDLE_PLAN.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <div>
                <p className="text-4xl font-bold">
                  ${BUNDLE_PLAN.monthlyPrice}
                  <span className="text-base font-medium text-slate">/mo</span>
                </p>
              </div>
              <Link
                href="/login"
                className="rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white"
              >
                Start your free trial
              </Link>
              <PatreonBuyButton className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover" />
            </div>
          </div>
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {API_TOOL_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-2xl border border-line bg-white p-6"
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

        <div className="mt-8 rounded-2xl border-2 border-brand bg-brand-bg p-8 sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-brand">{API_BUNDLE_PLAN.name}</h3>
              <p className="mt-1 text-sm text-slate">
                One API key, every tool&apos;s endpoints unlocked.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate">
                {API_BUNDLE_PLAN.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <div>
                <p className="text-4xl font-bold">
                  ${API_BUNDLE_PLAN.monthlyPrice}
                  <span className="text-base font-medium text-slate">/mo</span>
                </p>
                <p className="text-xs text-slate">
                  {API_BUNDLE_PLAN.callsPerMonth.toLocaleString()} calls/month per tool
                </p>
              </div>
              <Link
                href="/login"
                className="rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white"
              >
                Create account
              </Link>
              <PatreonBuyButton className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover" />
            </div>
          </div>
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
