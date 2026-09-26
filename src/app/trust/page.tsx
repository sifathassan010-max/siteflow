import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "SiteFlow Trust Center — Security, Privacy & Transparency",
  description:
    "How SiteFlow handles customer data, the infrastructure providers we use, our current security practices, and where to find our legal and privacy documentation.",
  alternates: { canonical: "/trust" },
  robots: { index: true, follow: true },
};

function StatusCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-5">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-slate">{children}</p>
    </div>
  );
}

function StatusLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-line p-5 transition hover:border-ink/20 hover:shadow-sm"
    >
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-slate">{description}</p>
    </Link>
  );
}

function LinkCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-line p-5">
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-slate">{description}</p>
      </div>
      <Link href={href} className="mt-4 inline-block text-sm font-medium text-brand underline">
        {cta}
      </Link>
    </div>
  );
}

const SUPPORT_EMAIL = "sifathassan010@gmail.com";

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">SiteFlow Trust Center</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate">
          We believe trust starts with transparency. This page explains how SiteFlow handles
          customer data, the infrastructure providers we use, our current security practices,
          and where to find our legal and privacy documentation.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusLinkCard title="Security" description="Security practices and controls" href="/security" />
          <StatusLinkCard title="Privacy" description="How we handle customer data" href="/legal/privacy" />
          <StatusLinkCard
            title="Infrastructure & Subprocessors"
            description="See the services that power SiteFlow."
            href="/subprocessors"
          />
          <StatusCard title="Compliance">No independent security certifications currently held</StatusCard>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold text-ink">Compliance &amp; certifications</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow is currently an early-stage SaaS and does not currently hold SOC 2, SOC 3,
            ISO 27001, HIPAA, or other independent security certifications. We&apos;d rather tell
            you that plainly than dress up a page with badges we can&apos;t back up. We&apos;ll
            update this page if our certification or independent audit status changes.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <LinkCard
            title="Security"
            description="Learn how SiteFlow protects accounts, data, application access, and infrastructure."
            href="/security"
            cta="View Security"
          />
          <LinkCard
            title="Privacy"
            description="Read how SiteFlow collects, uses, stores, and protects personal information."
            href="/legal/privacy"
            cta="View Privacy Policy"
          />
          <LinkCard
            title="Subprocessors"
            description="See the third-party service providers that help us operate SiteFlow and why."
            href="/subprocessors"
            cta="View Subprocessors"
          />
          <LinkCard
            title="Terms of Service"
            description="The terms that govern your use of SiteFlow."
            href="/legal/terms"
            cta="View Terms"
          />
          <LinkCard
            title="Refund Policy"
            description="How refunds and cancellations work for paid plans."
            href="/legal/refund"
            cta="View Refund Policy"
          />
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold text-ink">Security and privacy questions</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Reach us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
              {SUPPORT_EMAIL}
            </a>
            . For security vulnerability reports, please include enough technical detail for us
            to reproduce and investigate the issue.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
