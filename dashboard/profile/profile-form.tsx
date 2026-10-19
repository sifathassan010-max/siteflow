"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";

export default function ProfileForm({
  initialFullName,
  initialUsername,
  initialCompanyName,
  initialWebsiteUrl,
  initialCountry,
}: {
  initialFullName: string;
  initialUsername: string;
  initialCompanyName: string;
  initialWebsiteUrl: string;
  initialCountry: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [username, setUsername] = useState(initialUsername);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [country, setCountry] = useState(initialCountry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username,
          company_name: companyName,
          website_url: websiteUrl,
          country,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSaving(false);
        return;
      }

      setSaved(true);
      setSaving(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <div>
        <label className="text-xs font-semibold text-slate">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Company name (optional)</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Website name (optional)</label>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="example.com"
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select a country…</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save"}
      </button>
    </form>
  );
}
