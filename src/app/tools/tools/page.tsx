import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Free Website & SEO Tools for Small Business | SiteFlow",
  description:
    "Free tools for small business websites: sitemap finder, validator, generator, URL extractor, sitemap comparison, a meta tag checker, and an AI chatbot demo. No signup required to preview.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Website & SEO Tools for Small Business | SiteFlow",
    description: "Sitemap tools, a meta tag checker, and an AI chatbot demo — free, no signup to preview.",
    url: "/tools",
  },
};

const FREE_TOOLS = [
  {
    name: "Meta tag checker",
    tagline: "Paste any URL and check its title tag, meta description, and social preview tags.",
    href: "/tools/free/meta-tags",
  },
  {
    name: "Chatbot demo",
    tagline: "Try a live demo of SiteFlow's AI chatbot builder before training one on your site.",
    href: "/tools/free/chatbot-preview",
  },
  {
    name: "Sitemap finder",
    tagline: "Enter a domain to locate its XML sitemap and see what's inside it.",
    href: "/tools/free/sitemap-checker",
  },
  {
    name: "Sitemap validator",
    tagline: "Check a sitemap.xml against the sitemaps.org protocol for errors.",
    href: "/tools/free/sitemap-validator",
  },
  {
    name: "Sitemap generator",
    tagline: "Crawl a site's internal links and build a ready-to-use sitemap.xml.",
    href: "/tools/free/sitemap-generator",
  },
  {
    name: "Sitemap URL extractor",
    tagline: "Pull every URL out of a sitemap or sitemap index into a plain list.",
    href: "/tools/free/sitemap-url-extractor",
  },
  {
    name: "Sitemap comparison",
    tagline: "Compare two sitemaps to see which URLs are missing from each.",
    href: "/tools/free/sitemap-url-comparison",
  },
];

export default function FreeToolsPage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free tools for your website
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate">
            No signup required to preview any tool below — create a free
            account only if you want to save your work.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-line p-6 transition hover:border-ink/20 hover:shadow-sm"
            >
              <h2 className="text-lg font-bold">{tool.name}</h2>
              <p className="mt-2 text-sm text-slate">{tool.tagline}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-ink/70 group-hover:text-ink">
                Try it →
              </span>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
