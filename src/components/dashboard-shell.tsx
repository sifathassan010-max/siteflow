"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TOOLS, FREE_TOOLS, TOP_LINKS, SIDEBAR_LINKS } from "@/lib/site-config";
import SiteFooter from "@/components/site-footer";

export default function DashboardShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [freeOpen, setFreeOpen] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Site<span className="text-brand">Flow</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link
              href="/dashboard"
              prefetch={false}
              className={
                pathname === "/dashboard"
                  ? "text-brand"
                  : "text-ink/80 transition hover:text-ink"
              }
            >
              Dashboard
            </Link>

            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                prefetch={false}
                className={
                  pathname === tool.href
                    ? "text-brand"
                    : "text-ink/80 transition hover:text-ink"
                }
              >
                {tool.name}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setFreeOpen(true)}
              onMouseLeave={() => setFreeOpen(false)}
            >
              <button className="flex items-center gap-1 text-ink/80 transition hover:text-ink">
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
                      prefetch={false}
                      className="block rounded-lg px-3 py-2 text-sm text-ink/80 transition hover:bg-canvas hover:text-ink"
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {TOP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={
                  pathname === link.href
                    ? "text-brand"
                    : "text-ink/80 transition hover:text-ink"
                }
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate sm:block">{email}</span>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="hidden w-48 shrink-0 sm:block">
          <nav className="flex flex-col gap-1">
            {SIDEBAR_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={
                  "rounded-lg px-3 py-2 text-sm font-medium transition " +
                  (pathname === link.href
                    ? "bg-brand-bg text-brand"
                    : "text-ink/70 hover:bg-white hover:text-ink")
                }
              >
                {link.name}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink/70 transition hover:bg-white hover:text-ink"
            >
              Log out
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SiteFooter />
    </div>
  );
}
