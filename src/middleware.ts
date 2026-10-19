import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Only the logged-in dashboard is hard-gated here. Tool pages under /tools
// are publicly viewable (marketing/try-it-out UI) — each page decides for
// itself what to show a logged-out visitor, and only actual actions (create
// a bot, run a scan, etc.) require login, enforced by the API routes and by
// each form redirecting to /login on a 401 response.
const PROTECTED_PREFIXES = ["/dashboard"];

// Affiliate attribution: captures ?ref=SLUG from any incoming URL (e.g. an
// affiliate's link) into a long-lived cookie so we know who to credit if this
// visitor registers later. Read back in src/app/register/page.tsx.
const REF_COOKIE = "sf_ref";
const REF_COOKIE_DAYS = 90;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session cookie if needed — required for SSR auth to work.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    const clean = ref.trim().toLowerCase().slice(0, 64);
    if (/^[a-z0-9-]{2,64}$/.test(clean)) {
      response.cookies.set(REF_COOKIE, clean, {
        maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|sitemap.xml|robots.txt).*)",
  ],
};
