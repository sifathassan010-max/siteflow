import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Captures ?ref=SLUG from any incoming URL (e.g. an affiliate's link) and
// stores it in a long-lived cookie so we know who to credit if this visitor
// registers later — even if they land on /pricing first and only sign up
// a few days after. Read back in src/app/register/page.tsx at signup time.
const REF_COOKIE = "sf_ref";
const REF_COOKIE_DAYS = 90;

export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();

  // Keep it slug-shaped so nothing weird ends up in the cookie.
  const clean = ref.trim().toLowerCase().slice(0, 64);
  if (!/^[a-z0-9-]{2,64}$/.test(clean)) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(REF_COOKIE, clean, {
    maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

// Run on every page (not API routes/static assets) so a ?ref= on any
// landing page — home, pricing, a blog post — gets captured.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
