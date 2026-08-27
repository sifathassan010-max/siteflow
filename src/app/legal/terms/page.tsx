import type { Metadata } from "next";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Terms of Service | SiteFlow",
  description:
    "The terms that govern your use of SiteFlow's chatbot builder, SEO tool, forms, and analytics.",
  alternates: { canonical: "/legal/terms" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 22, 2026";
const SUPPORT_EMAIL = "sifathassan010@gmail.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ink">
          <section>
            <h2 className="text-lg font-bold">1. Who you're contracting with</h2>
            <p className="mt-3">
              SiteFlow is a software platform operated by Necro Animation Studio, a sole
              proprietorship based in Bangladesh. SiteFlow is a brand and product name, not a
              separate incorporated company, limited company, or other legal entity — Necro
              Animation Studio is the business you are entering into an agreement with when you
              use SiteFlow.
            </p>
            <p className="mt-3">
              In these Terms, &quot;SiteFlow,&quot; &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to Necro Animation
              Studio, and &quot;you&quot; refers to the person or business using SiteFlow.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. The service</h2>
            <p className="mt-3">
              SiteFlow provides website tools for small businesses, including an AI chatbot
              builder, an SEO audit tool, lead-capture forms, and privacy-friendly analytics.
              Some tools are free to use, and some are paid, as described on our{" "}
              <a href="/pricing" className="text-brand underline">
                Pricing
              </a>{" "}
              page. We may add, change, or remove features or tools at any time, and we'll do our
              best to give notice of any change that materially affects paid functionality you're
              relying on.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Accounts</h2>
            <p className="mt-3">
              You need an account to use most of SiteFlow's tools. You're responsible for keeping
              your login credentials secure and for all activity that happens under your account.
              Let us know right away at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              if you believe your account has been accessed without your permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Your content</h2>
            <p className="mt-3">
              You retain ownership of the content you upload or connect to SiteFlow (for example,
              the pages a chatbot is trained on, form submissions, or site data). You give us
              permission to store, process, and transmit that content solely as needed to provide
              the service to you. You're responsible for making sure you have the right to use and
              share any content you provide, and for how that content is used once your chatbot,
              form, or embed is live on your website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Acceptable use</h2>
            <p className="mt-3">You agree not to use SiteFlow to:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Break any applicable law, or the rights of any third party;</li>
              <li>
                Send spam, or collect personal data from visitors without a lawful basis to do so;
              </li>
              <li>Distribute malware, or attempt to gain unauthorized access to our systems;</li>
              <li>
                Train or deploy a chatbot to impersonate a real person, or to deceive or defraud
                visitors; or
              </li>
              <li>Resell or sublicense the service itself without our prior written consent.</li>
            </ul>
            <p className="mt-3">
              We may suspend or terminate accounts that violate this section, with notice where
              reasonably possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Paid plans, billing, and cancellation</h2>
            <p className="mt-3">
              Paid subscriptions are currently processed through Patreon, a third-party payment
              provider — subscribing sends you to Patreon to complete and manage your payment,
              rather than through an in-app checkout on siteflow. Prices and the tiers each
              subscription unlocks are shown on our{" "}
              <a href="/pricing" className="text-brand underline">
                Pricing
              </a>{" "}
              page. Because billing runs through Patreon, you cancel a paid plan through your
              Patreon subscription settings, not from SiteFlow account settings. Cancelling stops
              future billing but does not itself entitle you to a refund for the current billing
              period — see our{" "}
              <a href="/legal/refund" className="text-brand underline">
                Refund Policy
              </a>{" "}
              for how refunds work. See our{" "}
              <a href="/subprocessors" className="text-brand underline">
                Subprocessors
              </a>{" "}
              page for how Patreon handles your billing data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. No uptime or certification guarantees</h2>
            <p className="mt-3">
              SiteFlow is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not currently
              hold SOC 2, SOC 3, ISO 27001, HIPAA, or similar third-party security certifications,
              and we don't represent otherwise anywhere on the site. We work to keep the service
              secure and available, but we don't guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Limitation of liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, Necro Animation Studio will not be liable
              for indirect, incidental, or consequential damages arising from your use of
              SiteFlow. Nothing in these Terms limits any liability that cannot legally be limited
              or excluded under the mandatory law of your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Changes to these Terms</h2>
            <p className="mt-3">
              We may update these Terms from time to time. If we make material changes, we'll
              update the &quot;Last updated&quot; date above. Continuing to use SiteFlow after a change
              takes effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">10. Governing law</h2>
            <p className="mt-3">
              These Terms are governed by the laws of Bangladesh, without regard to conflict-of-law
              principles. This does not remove any mandatory consumer protection or other
              statutory rights that cannot legally be excluded under the law of the country where
              you live or use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">11. Contact</h2>
            <p className="mt-3">
              Questions about these Terms can be sent to{" "}
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
