// Shared types + server-side validation for the customer feedback →
// testimonial → admin approval → public review system. See
// supabase/schema-testimonials.sql for the full data model and why
// "private feedback" and "public testimonial" are one table, not two.

export type TestimonialStatus = "private" | "pending" | "approved" | "rejected";

export type TestimonialSubmission = {
  rating: number;
  liked: string;
  improve: string;
  additionalComments: string;
  allowPublish: boolean;
  consentGiven: boolean;
  displayName: string;
  companyName: string;
  websiteUrl: string;
  role: string;
  photoUrl: string;
};

export const MAX_ANSWER_LENGTH = 3000;
export const MAX_NAME_LENGTH = 100;
export const MAX_URL_LENGTH = 300;

// websiteUrl/photoUrl render as an <a href>/<img src> on the public
// /reviews page and homepage — only allow http(s) so a malicious
// "javascript:" or "data:" value can never be stored.
function sanitizeUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().slice(0, MAX_URL_LENGTH);
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

export function emptyTestimonialSubmission(): TestimonialSubmission {
  return {
    rating: 0,
    liked: "",
    improve: "",
    additionalComments: "",
    allowPublish: false,
    consentGiven: false,
    displayName: "",
    companyName: "",
    websiteUrl: "",
    role: "",
    photoUrl: "",
  };
}

export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: string[] };

// Never trust the client. Called by POST /api/testimonials — turns a raw
// request body into either a clean row to insert, or a list of human
// -readable problems. `status` is decided HERE, server-side, from
// allowPublish + consentGiven — the client can't set it directly.
export function validateTestimonialSubmission(raw: unknown, userId: string): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Invalid request body."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push("Pick a star rating from 1 to 5.");
  }

  const liked = typeof body.liked === "string" ? body.liked.trim() : "";
  if (!liked) errors.push("Tell us what you like about SiteFlow.");
  if (liked.length > MAX_ANSWER_LENGTH) errors.push("That answer is too long.");

  const improve = typeof body.improve === "string" ? body.improve.trim() : "";
  if (!improve) errors.push("Tell us what we could improve.");
  if (improve.length > MAX_ANSWER_LENGTH) errors.push("That answer is too long.");

  const additionalComments =
    typeof body.additionalComments === "string"
      ? body.additionalComments.trim().slice(0, MAX_ANSWER_LENGTH)
      : "";

  const allowPublish = body.allowPublish === true;
  const consentGiven = body.consentGiven === true;

  // The core rule: saying "yes, feature me" isn't enough on its own — the
  // consent checkbox must also be explicitly checked, or this can't be on
  // the public track. We reject rather than silently downgrading to
  // private, so the user gets a clear chance to fix it instead of a
  // confusing "why is my testimonial private" surprise later.
  if (allowPublish && !consentGiven) {
    errors.push(
      "Please check the consent box to allow us to feature your feedback, or choose \"No, keep my feedback private\" above."
    );
  }

  let displayName = "";
  let companyName = "";
  let websiteUrl = "";
  let role = "";
  let photoUrl = "";

  if (allowPublish) {
    displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, MAX_NAME_LENGTH) : "";
    if (!displayName) {
      errors.push("Add a display name so we know how to credit your testimonial.");
    }
    companyName =
      typeof body.companyName === "string" ? body.companyName.trim().slice(0, MAX_NAME_LENGTH) : "";
    websiteUrl = sanitizeUrl(body.websiteUrl);
    role = typeof body.role === "string" ? body.role.trim().slice(0, MAX_NAME_LENGTH) : "";
    photoUrl = sanitizeUrl(body.photoUrl);
  }

  if (errors.length > 0) return { ok: false, errors };

  const status: TestimonialStatus = allowPublish && consentGiven ? "pending" : "private";

  return {
    ok: true,
    data: {
      user_id: userId,
      rating,
      liked,
      improve,
      additional_comments: additionalComments || null,
      allow_publish: allowPublish,
      consent_given: consentGiven,
      display_name: displayName || null,
      company_name: companyName || null,
      website_url: websiteUrl || null,
      role: role || null,
      photo_url: photoUrl || null,
      status,
    },
  };
}
