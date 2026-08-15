import Link from "next/link";
import Nav from "@/components/nav";
import { TOOL_PLANS, BUNDLE_PLAN } from "@/lib/pricing-data";
import { PATREON_JOIN_URL } from "@/lib/patreon-config";

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
              <p className="mt-1 text-xs text-slate">
                or ${plan.quarterlyPrice} billed every 3 months
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
              <a
                href={PATREON_JOIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Subscribe on Patreon
              </a>
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
                <p className="text-xs text-slate">
                  or ${BUNDLE_PLAN.quarterlyPrice} billed every 3 months
                </p>
              </div>
              <Link
                href="/login"
                className="rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition hover:bg-white"
              >
                Start your free trial
              </Link>
              <a
                href={PATREON_JOIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Subscribe on Patreon
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate">
          SiteFlow
        </div>
      </footer>
    </div>
  );
}
