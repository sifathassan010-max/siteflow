import type { Metadata } from "next";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Refund Policy | SiteFlow",
  description: "SiteFlow's refund policy for paid plans.",
  alternates: { canonical: "/legal/refund" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 22, 2026";
const SUPPORT_EMAIL = "sifathassan010@gmail.com";

export default function RefundPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Refund Policy</h1>
        <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ink">
          <section>
            <p>
              SiteFlow is operated by Necro Animation Studio. This Refund Policy covers paid
              subscriptions to any SiteFlow tool (Chatbot builder, SEO, Forms &amp; Leads,
              Analytics, or the All 4 tools bundle).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">1. Free trials</h2>
            <p className="mt-3">
              Every paid tool can be tried for free before you pay. Use the free trial to confirm
              a tool fits your needs before upgrading — this is the main way we'd like you to
              avoid needing a refund in the first place.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. 7-day money-back guarantee</h2>
            <p className="mt-3">
              If you're not happy with a paid tool, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              within 7 days of your first charge for that subscription, with the email address on
              your account and the date of the charge, and we'll refund that charge in full — no
              detailed explanation required. This guarantee applies once per subscription's first
              billing cycle; it isn't a rolling refund window for every renewal charge.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Other refund requests</h2>
            <p className="mt-3">
              Outside the 7-day window described above, if something goes wrong — for example,
              you were charged in error, charged after cancelling, or a tool you paid for didn't
              work as described — contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              with the email address on your account and the date of the charge. We'll review
              these requests case by case and let you know the outcome.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Cancellations</h2>
            <p className="mt-3">
              Paid subscriptions are currently processed through Patreon, so cancellation happens
              through your Patreon subscription settings rather than SiteFlow account settings —
              see our{" "}
              <a href="/legal/terms" className="text-brand underline">
                Terms of Service
              </a>{" "}
              for details. Cancelling stops future billing, but doesn't automatically refund the
              current billing period unless it falls under Section 2 or 3 above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Your statutory rights</h2>
            <p className="mt-3">
              Nothing in this policy limits any refund, cancellation, or consumer protection right
              that cannot legally be excluded under the mandatory law of your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Contact</h2>
            <p className="mt-3">
              Refund questions can be sent to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
            <p className="mt-3 text-slate">SiteFlow is a brand operated by Necro Animation Studio.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
