"use client";

import Link from "next/link";
import { useState } from "react";

const TOOLS = [
  { name: "Chatbot", href: "/tools/chatbot" },
  { name: "SEO", href: "/tools/seo" },
  { name: "Forms & Leads", href: "/tools/forms" },
  { name: "Analytics", href: "/tools/analytics" },
];

const FREE_TOOLS = [
  { name: "Meta tag checker", href: "/tools/free/meta-tags" },
  { name: "Chatbot preview", href: "/tools/free/chatbot-preview" },
];

export default function Nav() {
  const [freeOpen, setFreeOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Site<span className="text-brand">Flow</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="text-ink/80 transition hover:text-ink"
            >
              {tool.name}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setFreeOpen(true)}
            onMouseLeave={() => setFreeOpen(false)}
          >
            <button
              className="flex items-center gap-1 text-ink/80 transition hover:text-ink"
              onClick={() => setFreeOpen((v) => !v)}
            >
              Free tools
              <svg width="10" height="6" viewBox="0 0 10 6" className="mt-0.5">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
            {freeOpen && (
              <div className="absolute left-0 top-full w-56 rounded-xl border border-line bg-white p-2 shadow-lg">
                {FREE_TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="block rounded-lg px-3 py-2 text-sm text-ink/80 transition hover:bg-canvas hover:text-ink"
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:block"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Try SiteFlow free
          </Link>
        </div>
      </div>
    </header>
  );
}
