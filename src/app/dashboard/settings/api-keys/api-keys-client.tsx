"use client";

import { useEffect, useState, useCallback } from "react";

type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type ToolUsage = { unlocked: boolean; used: number; limit: number };
type UsageSummary = {
  chatbot: ToolUsage;
  seo: ToolUsage;
  forms: ToolUsage;
  analytics: ToolUsage;
};

const TOOL_LABELS: Record<keyof UsageSummary, string> = {
  chatbot: "Chatbot API",
  seo: "SEO API",
  forms: "Forms API",
  analytics: "Analytics API",
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return fetch("/api/keys")
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error ?? "Couldn't load API keys.");
          return;
        }
        setKeys(data.keys ?? []);
        setUsage(data.usage ?? null);
      })
      .catch(() => setError("Couldn't load API keys."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keys")
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load API keys.");
          return;
        }
        setKeys(data.keys ?? []);
        setUsage(data.usage ?? null);
      })
      .catch(() => !cancelled && setError("Couldn't load API keys."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/keys", { method: "POST", body: JSON.stringify({}) });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create a new key.");
      return;
    }
    setNewRawKey(data.key.rawKey);
    load();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? Anything using it will stop working immediately.")) return;
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      {usage && (
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Usage this month</h2>
          <div className="mt-4 flex flex-col gap-4">
            {(Object.keys(usage) as (keyof UsageSummary)[]).map((tool) => {
              const t = usage[tool];
              const pct = t.unlocked ? Math.min(100, Math.round((t.used / t.limit) * 100)) : 0;
              return (
                <div key={tool}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{TOOL_LABELS[tool]}</span>
                    <span className="text-slate">
                      {t.unlocked ? `${t.used.toLocaleString()} / ${t.limit.toLocaleString()} calls` : "Not subscribed"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${t.unlocked ? "bg-brand" : "bg-line"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate">
            Don&apos;t see a plan you expected here?{" "}
            <a href="/pricing" className="text-brand underline">
              View API plans
            </a>
            .
          </p>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Your API keys</h2>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create new key"}
          </button>
        </div>

        {newRawKey && (
          <div className="mt-4 rounded-lg border border-brand bg-brand-bg p-4">
            <p className="text-xs font-semibold text-brand">
              Copy this key now — it won&apos;t be shown again.
            </p>
            <code className="mt-2 block break-all rounded-md bg-white px-3 py-2 text-xs">
              {newRawKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newRawKey);
              }}
              className="mt-2 rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand transition hover:bg-white"
            >
              Copy to clipboard
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-slate">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            No API keys yet. Create one to start calling SiteFlow&apos;s tools
            programmatically.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {k.name} <span className="text-slate">— {k.key_prefix}…</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate">
                    Created {formatDate(k.created_at)} · Last used {formatDate(k.last_used_at)}
                    {k.revoked_at && <span className="ml-2 text-red-600">Revoked</span>}
                  </p>
                </div>
                {!k.revoked_at && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
