"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBotForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, persona, website_url: websiteUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/tools/chatbot/${data.bot.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4"
    >
      <div>
        <label className="text-xs font-semibold text-slate">Bot name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Support Assistant"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">
          Persona / instructions
        </label>
        <textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="e.g. You're a friendly support agent for a coffee shop. Answer questions about hours, menu, and orders."
          rows={4}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate">
          Leave blank for a generic helpful assistant.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">
          Website URL (optional)
        </label>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yoursite.com"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate">
          If given, we&apos;ll crawl this page so the bot can answer from your
          own content.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create bot"}
      </button>
    </form>
  );
}
