import type { Metadata } from "next";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | SiteFlow",
  description:
    "How SiteFlow collects, uses, and protects data from your account, your website visitors, and your chatbot, forms, and analytics.",
  alternates: { canonical: "/legal/privacy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 22, 2026";
const SUPPORT_EMAIL = "sifathassan010@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ink">
          <section>
            <p>
              This Privacy Policy explains how SiteFlow, operated by Necro Animation Studio, a
              sole proprietorship based in Bangladesh, collects, uses, and protects data. It
              applies to (1) SiteFlow account holders, and (2) visitors who interact with a
              chatbot, form, or analytics script that a SiteFlow customer has embedded on their
              own website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">1. Information we collect</h2>
            <p className="mt-3 font-semibold">From SiteFlow account holders:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account information: name, email address, and login credentials.</li>
              <li>
                Content you provide to configure your tools — for example, pages or text you use
                to train a chatbot, form field definitions, or the domain you connect for
                analytics.
              </li>
              <li>Billing information needed to process payment for paid plans.</li>
            </ul>
            <p className="mt-3 font-semibold">From your website visitors, on your behalf:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Chatbot conversations submitted through a chatbot you've embedded.</li>
              <li>Form submissions (such as name, email, or message fields you've configured).</li>
              <li>
                Analytics events (such as page views and referrers) collected without cookies, for
                sites where you've installed the SiteFlow analytics script.
              </li>
            </ul>
            <p className="mt-3">
              For visitor data, you (the SiteFlow customer) are the party who decides what's
              collected and why, and you're responsible for telling your own visitors about it —
              for example, in your own site's privacy policy. We process that data on your
              instructions, as your service provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. How we use information</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>To provide, maintain, and improve the tools you've signed up for;</li>
              <li>To operate the chatbot, forms, and analytics features you configure;</li>
              <li>To process payments for paid plans;</li>
              <li>To respond to support requests sent to our support email; and</li>
              <li>To detect, prevent, and address fraud, abuse, or security issues.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data, or the data collected through your embedded chatbot,
              forms, or analytics, to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Where data is stored</h2>
            <p className="mt-3">
              SiteFlow stores account and application data using third-party infrastructure
              providers (such as our hosting and database providers). Those providers may store
              data outside Bangladesh. We take reasonable steps to keep data secure regardless of
              where it's stored.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Cookies</h2>
            <p className="mt-3">
              Our own analytics tool is designed to work without cookies. The SiteFlow website and
              dashboard itself may use strictly necessary cookies or local storage to keep you
              logged in and remember basic preferences. We don't use third-party advertising
              cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Your rights</h2>
            <p className="mt-3">
              Depending on where you live, you may have rights to access, correct, export, or
              delete your personal data, or to object to certain processing. To exercise any of
              these rights, contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
                {SUPPORT_EMAIL}
              </a>
              . We honor rights that apply under the law of your jurisdiction, in addition to
              anything described in this policy.
            </p>
            <p className="mt-3">
              If you're a visitor to a website that uses a SiteFlow chatbot, form, or analytics
              script and you want data about you removed, you can also contact the owner of that
              website directly, since they control what's collected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Data retention</h2>
            <p className="mt-3">
              We keep account data for as long as your account is active, and chatbot
              conversations, form submissions, and analytics data for as long as the related tool
              or account remains active, unless you delete it sooner or ask us to delete it. We
              may retain limited records after account closure where needed for legal, billing, or
              security reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Security</h2>
            <p className="mt-3">
              We take reasonable technical and organizational measures to protect the data we
              hold. No method of transmission or storage is completely secure, and we can't
              guarantee absolute security. We do not currently hold SOC 2, SOC 3, ISO 27001,
              HIPAA, or similar third-party security certifications. For a detailed account of
              the specific controls we do have in place, see our{" "}
              <a href="/security" className="text-brand underline">
                Security page
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Children</h2>
            <p className="mt-3">
              SiteFlow is intended for business use and is not directed at children. We don't
              knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Changes to this policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. If we make material changes,
              we'll update the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">10. Governing law</h2>
            <p className="mt-3">
              This Privacy Policy is governed by the laws of Bangladesh, without prejudice to any
              mandatory data protection or consumer rights you're entitled to under the law of
              your own jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">11. Contact</h2>
            <p className="mt-3">
              Questions about this Privacy Policy can be sent to{" "}
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
