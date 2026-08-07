import Link from "next/link";
import Nav from "@/components/nav";
import FlowDiagram from "@/components/flow-diagram";

const TOOLS = [
  {
    name: "Chatbot",
    tagline: "Train an AI chatbot on your own site content and answer visitors instantly, day or night.",
    href: "/tools/chatbot",
    color: "brand" as const,
  },
  {
    name: "Forms & Leads",
    tagline: "Drag-and-drop forms plus on-site capture widgets that turn visitors into leads.",
    href: "/tools/forms",
    color: "flow" as const,
  },
  {
    name: "SEO",
    tagline: "Scan your pages, catch what's holding back your ranking, fix it before customers bounce.",
    href: "/tools/seo",
    color: "brand" as const,
  },
  {
    name: "Analytics",
    tagline: "Privacy-friendly traffic insight, no cookie banner required, no data sold.",
    href: "/tools/analytics",
    color: "flow" as const,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-flow">
            For small business websites
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            One flow. Every tool your website needs to turn visitors into customers.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate">
            Chatbot, forms, SEO, and analytics, built for people running a small
            business site, not a dev team.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Try SiteFlow free
            </Link>
            <Link
              href="/tools"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
            >
              See free tools
            </Link>
          </div>

          <div className="mt-16 flex justify-center">
            <FlowDiagram />
          </div>
        </section>

        <section className="border-y border-line bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight">
              Four tools. One login. One price if you want it all.
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-2xl border border-line p-6 transition hover:border-ink/20 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{tool.name}</h3>
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (tool.color === "brand"
                          ? "bg-brand-bg text-brand"
                          : "bg-flow-bg text-flow")
                      }
                    >
                      Free trial
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate">{tool.tagline}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-ink/70 group-hover:text-ink">
                    Try it →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-slate">
            Start free on any tool. Pay only for what you use, or get everything
            in one plan.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-8 text-left">
              <p className="text-sm font-semibold text-slate">Per tool</p>
              <p className="mt-2 text-3xl font-bold">
                $25<span className="text-base font-medium text-slate">/mo</span>
              </p>
              <p className="mt-2 text-sm text-slate">
                Pick any single tool, cancel anytime.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-brand bg-brand-bg p-8 text-left">
              <p className="text-sm font-semibold text-brand">All 4 tools</p>
              <p className="mt-2 text-3xl font-bold">
                $55<span className="text-base font-medium text-slate">/mo</span>
              </p>
              <p className="mt-2 text-sm text-slate">
                Everything your website needs, one price.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Start your free trial
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate">
          SiteFlow
        </div>
      </footer>
    </div>
  );
}
