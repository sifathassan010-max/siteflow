"use client";

import { useState } from "react";

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5 stars">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-8 w-8 transition-colors ${filled ? "text-amber-400" : "text-line"}`}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [allowPublish, setAllowPublish] = useState<"" | "yes" | "no">("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedAsPublic, setSubmittedAsPublic] = useState<boolean | null>(null);

  const wantsPublish = allowPublish === "yes";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    if (!liked.trim()) {
      setError("Tell us what you like about SiteFlow.");
      return;
    }
    if (!improve.trim()) {
      setError("Tell us what we could improve.");
      return;
    }
    if (wantsPublish && !consentGiven) {
      setError(
        "Please check the consent box below to allow us to feature your feedback, or choose \"No, keep my feedback private\"."
      );
      return;
    }
    if (wantsPublish && !displayName.trim()) {
      setError("Add a display name so we know how to credit your testimonial.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          liked,
          improve,
          additionalComments,
          allowPublish: wantsPublish,
          consentGiven: wantsPublish ? consentGiven : false,
          displayName,
          companyName,
          websiteUrl,
          role,
          photoUrl,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      setSubmittedAsPublic(wantsPublish);
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  if (submittedAsPublic !== null) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-ink">Thank you for your feedback! We really appreciate it.</h2>
        <p className="mt-2 text-sm text-slate">
          {submittedAsPublic
            ? "Since you agreed to be featured, our team will review it — if approved, it may appear on our Reviews page."
            : "Your feedback will stay private and won't be shown publicly anywhere."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-line bg-white p-5 sm:p-6"
    >
      <div>
        <label className="text-xs font-semibold text-slate">Rating</label>
        <div className="mt-2">
          <StarPicker value={rating} onChange={setRating} />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">What do you like about SiteFlow?</label>
        <textarea
          value={liked}
          onChange={(e) => setLiked(e.target.value)}
          rows={3}
          maxLength={3000}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">What could we improve?</label>
        <textarea
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
          rows={3}
          maxLength={3000}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">
          Tell us anything else you&apos;d like us to know (optional)
        </label>
        <textarea
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          rows={2}
          maxLength={3000}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-lg border border-line bg-canvas p-4">
        <p className="text-sm font-semibold text-ink">
          Would you allow us to feature your feedback as a testimonial on the SiteFlow website?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="allow-publish"
              checked={allowPublish === "yes"}
              onChange={() => setAllowPublish("yes")}
            />
            Yes, you may feature my feedback
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="allow-publish"
              checked={allowPublish === "no"}
              onChange={() => {
                setAllowPublish("no");
                setConsentGiven(false);
              }}
            />
            No, keep my feedback private
          </label>
        </div>

        {wantsPublish && (
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            <div>
              <label className="text-xs font-semibold text-slate">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate">Company/business name (optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate">Website URL (optional)</label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate">Job title/role (optional)</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate">Photo URL (optional)</label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5"
              />
              I give SiteFlow permission to display this testimonial on its website and marketing
              materials.
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
