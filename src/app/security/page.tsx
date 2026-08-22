import type { Metadata } from "next";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "SiteFlow Security — How We Protect Your Data",
  description:
    "Learn how SiteFlow protects customer data, secures accounts, manages third-party services, and responds to security concerns.",
  alternates: { canonical: "/security" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 22, 2026";
const SUPPORT_EMAIL = "sifathassan010@gmail.com";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-5">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-slate">{children}</p>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Security at SiteFlow</h1>
        <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

        <p className="mt-8 text-sm leading-relaxed text-ink">
          Security is built into how we design and operate SiteFlow. We&apos;re an early-stage
          SaaS, so we don&apos;t claim certifications we don&apos;t currently hold. Instead, this
          page is meant to be a plain, accurate account of the controls, infrastructure, and
          third-party services we actually use to run the platform.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Security at a glance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card title="Secure connections">
              SiteFlow is served over HTTPS/TLS, provided by our hosting platform, Vercel.
            </Card>
            <Card title="Authentication">
              Accounts are authenticated through Supabase Auth. New accounts must confirm their
              email address before the account is usable.
            </Card>
            <Card title="Access controls">
              Every database table SiteFlow uses has Row Level Security (RLS) enabled, so a
              logged-in user can only read or write their own data by default.
            </Card>
            <Card title="Data separation">
              The privileged key that can bypass RLS is only ever used in server-side code (API
              routes and webhooks) — it's never sent to the browser.
            </Card>
            <Card title="Third-party infrastructure">
              We rely on established providers — Vercel, Supabase, Groq, and Patreon — for
              hosting, database/auth, AI inference, and billing, rather than running our own
              servers for those functions.
            </Card>
            <Card title="Security monitoring">
              We don't yet run a dedicated 24/7 security monitoring setup of our own — see the
              &quot;Security monitoring&quot; section below for specifics.
            </Card>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Data in transit</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow uses HTTPS/TLS to protect data transmitted between your browser and the
            platform. We haven&apos;t independently verified or documented the specific TLS
            configuration beyond what Vercel provides by default, so we describe it at that
            level rather than citing specific cipher suites or protocol versions.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Data at rest</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Application and account data is stored in Supabase, our database provider. Customer
            data stored there benefits from whatever storage-level security and encryption
            Supabase provides as part of its own infrastructure — we haven&apos;t independently
            audited or certified this ourselves, so please refer to{" "}
            <a
              href="https://supabase.com/security"
              className="text-brand underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase&apos;s own security documentation
            </a>{" "}
            for specifics.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Authentication &amp; account security</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
            <li>Accounts are created and authenticated through Supabase Auth (email + password).</li>
            <li>
              New accounts must confirm their email address via a confirmation link before the
              account is fully usable.
            </li>
            <li>Passwords must be at least 8 characters.</li>
            <li>
              Changing your email or password from account settings requires re-entering your
              current password first.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            We don&apos;t currently offer multi-factor authentication (MFA), OAuth/social login,
            or a self-service &quot;forgot password&quot; flow — if you&apos;re locked out of your
            account, contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            and we&apos;ll help you regain access.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Access control</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow uses Supabase Row Level Security (RLS) on every table it stores data in.
            Policies are scoped so a logged-in user can only select, insert, update, or delete
            rows tied to their own account. Public-facing widgets (chatbot, forms, and analytics
            embeds) that need to write data on behalf of an anonymous website visitor do so
            through server-side API routes using a separate, privileged service key — that key
            is never exposed to any browser.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">What customer data we store</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Depending on which tools you use, SiteFlow may store:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
            <li>Account information — email address, and optional profile fields (name, username, company, website URL, country).</li>
            <li>Subscription/billing status synced from Patreon (plan tier and status — not payment card details).</li>
            <li>Chatbot configuration (persona, trained website content, quick prompts, appearance) and chatbot conversation transcripts and leads submitted through a bot's widget.</li>
            <li>Form definitions you create, and the submissions visitors make through them.</li>
            <li>SEO projects and the scan results generated for the URLs you submit.</li>
            <li>Analytics: page paths and referrers for sites you connect, plus a one-way daily-rotating hash of visitor IP + user agent (never the raw IP) used only to estimate unique visitors.</li>
            <li>Discussion posts and replies you choose to publish publicly on the Discussions board.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">AI &amp; customer data</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow's chatbot tool uses Groq (Groq Cloud), a third-party AI inference provider
            running open-weight language models (currently Llama 3.1), to generate chatbot
            replies.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
            <li>
              When a visitor messages your chatbot, we send Groq the bot&apos;s configured
              persona, the website content you trained it on, your escalation contact (if set),
              and the visitor&apos;s message text (plus a short window of recent conversation
              history) so it can generate a reply.
            </li>
            <li>SiteFlow itself stores the resulting conversation transcript, tied to an anonymous per-visitor session identifier rather than a real name.</li>
            <li>
              We haven&apos;t independently verified whether Groq retains or trains on request
              data beyond what&apos;s needed to serve the response — please refer to{" "}
              <a
                href="https://groq.com/privacy-policy/"
                className="text-brand underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Groq&apos;s own privacy documentation
              </a>{" "}
              for that.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Infrastructure</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2">Data potentially processed</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">Vercel</td>
                  <td className="py-3 pr-4 text-slate">Hosting and application delivery</td>
                  <td className="py-3 text-slate">All traffic to the site and its API routes</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">Supabase</td>
                  <td className="py-3 pr-4 text-slate">Database, authentication, and backend storage</td>
                  <td className="py-3 text-slate">Account, tool, and customer data described above</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-medium">Groq</td>
                  <td className="py-3 pr-4 text-slate">AI inference for the chatbot tool</td>
                  <td className="py-3 text-slate">Chatbot persona, trained content, and visitor messages</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Patreon</td>
                  <td className="py-3 pr-4 text-slate">Subscription billing and payment processing</td>
                  <td className="py-3 text-slate">Email address and plan/tier status (SiteFlow never handles card details directly)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate">
            GitHub is used to store SiteFlow&apos;s source code during development. It doesn&apos;t
            receive customer data and isn&apos;t part of the production data path.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Backups &amp; recovery</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow relies on the backup and recovery capabilities provided by Supabase for the
            database. We haven&apos;t independently configured or verified a separate backup
            schedule on top of that, and we don&apos;t currently have a formal, tested
            disaster-recovery procedure of our own. We&apos;re continuing to build this out as the
            platform grows — we won&apos;t promise a specific recovery time or guarantee zero data
            loss until we have.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Security monitoring</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow is an early-stage platform and doesn&apos;t currently maintain a dedicated
            24/7 security operations function. We monitor the application through the logging and
            error-reporting capabilities available through our hosting and infrastructure
            providers, and we review things manually as the team is small right now.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Report a security issue</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            If you believe you&apos;ve found a security vulnerability in SiteFlow, please report
            it responsibly so we can investigate and address it. Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            with:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
            <li>The affected URL or feature</li>
            <li>A description of the issue</li>
            <li>Steps to reproduce it</li>
            <li>What you think the potential impact is</li>
            <li>Screenshots or a proof of concept, where that helps</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Please don&apos;t access, modify, delete, or disclose another user&apos;s data while
            investigating a suspected vulnerability.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Where we're headed</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            SiteFlow is continuously improving its security practices as the platform grows.
            Over time that may include stronger access controls, additional monitoring, a
            self-service password reset flow, independent security testing, and more formal
            security policies. We don&apos;t have a fixed date for any of these yet, and we won&apos;t
            claim a certification timeline we can&apos;t back up.
          </p>
        </section>

        <p className="mt-10 text-xs text-slate">Last updated: {LAST_UPDATED}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
