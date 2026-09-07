import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";
import TestimonialCard from "@/components/testimonial-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reviews — What Our Users Say | SiteFlow",
  description:
    "See what small business owners using SiteFlow's chatbot, SEO, forms, and analytics tools have to say about their experience.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "Reviews — What Our Users Say | SiteFlow",
    description: "See what people using SiteFlow have to say about their experience.",
    url: "/reviews",
  },
};

// Public — no login required to VIEW reviews. RLS's "public read approved
// testimonials" policy is what actually restricts the query to
// status='approved' && allow_publish && consent_given rows. Logging in is
// only required to LEAVE feedback — this page checks the session so a
// logged-in visitor sees a real "Give Feedback" link straight to their
// dashboard instead of being told to log in when they already are.
export default async function ReviewsPage() {
  const supabase = await createClient();
  const [{ data: testimonials }, { data: userData }] = await Promise.all([
    supabase
      .from("testimonials")
      .select("id, rating, liked, display_name, company_name, role, website_url, photo_url")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const reviews = testimonials ?? [];
  const isLoggedIn = !!userData.user;
  const feedbackHref = isLoggedIn ? "/dashboard/feedback" : "/login";
  const feedbackLabel = isLoggedIn ? "Give feedback" : "Log in to leave feedback";

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What our users are saying
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate">
            See what people using SiteFlow have to say about their experience.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <p className="font-semibold text-ink">
              Be one of the first to share your SiteFlow experience.
            </p>
            <p className="mt-2 text-sm text-slate">
              {isLoggedIn
                ? "Use \"Give Feedback\" from your dashboard — your testimonial could be the first one shown here."
                : "Log in and use \"Give Feedback\" from your dashboard — your testimonial could be the first one shown here."}
            </p>
            <Link
              href={feedbackHref}
              className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              {feedbackLabel}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate">Used SiteFlow yourself?</p>
              <Link
                href={feedbackHref}
                className="mt-2 inline-block rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                {feedbackLabel}
              </Link>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
