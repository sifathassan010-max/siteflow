"use client";

import { useEffect, useState } from "react";

type Testimonial = {
  id: string;
  user_id: string;
  rating: number;
  liked: string;
  improve: string;
  additional_comments: string | null;
  allow_publish: boolean;
  consent_given: boolean;
  display_name: string | null;
  company_name: string | null;
  website_url: string | null;
  role: string | null;
  photo_url: string | null;
  status: "private" | "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

const FILTERS = ["all", "pending", "approved", "rejected", "private"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<Testimonial["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  private: "bg-canvas text-slate",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminTestimonialsClient() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const qs = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/admin/testimonials${qs}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load testimonials.");
          return;
        }
        setError("");
        setTestimonials(data.testimonials ?? []);
      })
      .catch(() => !cancelled && setError("Couldn't load testimonials."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleAction(id: string, action: "approved" | "rejected" | "delete") {
    setBusyId(id);
    setError("");
    const res =
      action === "delete"
        ? await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" })
        : await fetch(`/api/admin/testimonials/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action }),
          });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "That action failed.");
      return;
    }
    reload();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setLoading(true);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? "border-ink bg-ink text-white"
                : "border-line text-ink hover:bg-canvas"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading…</p>
      ) : testimonials.length === 0 ? (
        <p className="mt-6 text-sm text-slate">Nothing here.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{"★".repeat(t.rating)}</span>
                    <span className="text-line">{"★".repeat(5 - t.rating)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate">Submitted {formatDate(t.created_at)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate">Likes</p>
                  <p className="text-sm text-ink">{t.liked}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate">Could improve</p>
                  <p className="text-sm text-ink">{t.improve}</p>
                </div>
                {t.additional_comments && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate">Anything else</p>
                    <p className="text-sm text-ink">{t.additional_comments}</p>
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-lg bg-canvas p-3 text-xs text-slate">
                <p>
                  Publish permission: <span className="font-medium text-ink">{t.allow_publish ? "Yes" : "No"}</span>{" "}
                  · Consent checkbox: <span className="font-medium text-ink">{t.consent_given ? "Checked" : "Not checked"}</span>
                </p>
                {t.allow_publish && (
                  <p className="mt-1">
                    {t.display_name && <span className="font-medium text-ink">{t.display_name}</span>}
                    {t.role && <> · {t.role}</>}
                    {t.company_name && <> · {t.company_name}</>}
                    {t.website_url && (
                      <>
                        {" · "}
                        <a href={t.website_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                          {t.website_url}
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>

              {(t.status === "pending" || t.status === "rejected") && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(t.id, "approved")}
                    disabled={busyId === t.id}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
                  >
                    Approve
                  </button>
                  {t.status === "pending" && (
                    <button
                      onClick={() => handleAction(t.id, "rejected")}
                      disabled={busyId === t.id}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(t.id, "delete")}
                    disabled={busyId === t.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}

              {t.status === "approved" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(t.id, "rejected")}
                    disabled={busyId === t.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
                  >
                    Unpublish (reject)
                  </button>
                  <button
                    onClick={() => handleAction(t.id, "delete")}
                    disabled={busyId === t.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}

              {t.status === "private" && (
                <div className="mt-4">
                  <button
                    onClick={() => handleAction(t.id, "delete")}
                    disabled={busyId === t.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
