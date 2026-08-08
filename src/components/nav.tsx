"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TOOLS, FREE_TOOLS, TOP_LINKS } from "@/lib/site-config";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const [freeOpen, setFreeOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });

    // Keep the nav in sync if login/logout happens in another tab/page.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }

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

          {TOP_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink/80 transition hover:text-ink"
            >
              {link.name}
            </Link>
          ))}

          {user && (
            <Link href="/dashboard" className="text-ink/80 transition hover:text-ink">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {/* Avoid flashing "Log in" before we've actually checked the session */}
          {!checked ? (
            <div className="h-9 w-24" />
          ) : user ? (
            <>
              <span className="hidden text-sm text-slate sm:block">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
