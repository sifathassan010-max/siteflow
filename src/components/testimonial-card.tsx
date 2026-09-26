// Read-only star display — e.g. ★★★★☆. Used by TestimonialCard below and
// nowhere else, so it's not worth its own file.
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${n <= rating ? "text-amber-400" : "text-line"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
        </svg>
      ))}
    </div>
  );
}

export type PublicTestimonial = {
  id: string;
  rating: number;
  liked: string;
  display_name: string | null;
  company_name: string | null;
  role: string | null;
  website_url: string | null;
  photo_url: string | null;
};

// Shown on both /reviews and the homepage testimonials section. Only ever
// fed rows that already passed the "approved + allow_publish + consent"
// public RLS policy — this component doesn't re-check anything, it just
// displays what it's given.
export default function TestimonialCard({ testimonial }: { testimonial: PublicTestimonial }) {
  const roleLine = [testimonial.role, testimonial.company_name].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-6">
      <Stars rating={testimonial.rating} />
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{testimonial.liked}</p>

      <div className="mt-5 flex items-center gap-3">
        {testimonial.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={testimonial.photo_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand">
            {(testimonial.display_name ?? "?").trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {testimonial.display_name ?? "SiteFlow customer"}
          </p>
          {roleLine && <p className="truncate text-xs text-slate">{roleLine}</p>}
          {testimonial.website_url && (
            <a
              href={testimonial.website_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="truncate text-xs text-brand hover:underline"
            >
              {testimonial.website_url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
