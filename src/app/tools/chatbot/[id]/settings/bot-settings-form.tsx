"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Bot = {
  id: string;
  name: string;
  persona: string;
  website_url: string | null;
  quick_prompts: string[];
  widget_color: string;
  logo_url: string | null;
  escalation_contact: string | null;
  model: string;
  trained_pages: { url: string; chars: number }[];
  last_trained_at: string | null;
};

const MODEL_OPTIONS = [
  { value: "llama-3.1-8b-instant", label: "Fast (llama-3.1-8b-instant)" },
  { value: "llama-3.3-70b-versatile", label: "Thorough (llama-3.3-70b-versatile)" },
];

export default function BotSettingsForm({ bot }: { bot: Bot }) {
  const router = useRouter();

  const [persona, setPersona] = useState(bot.persona);
  const [quickPromptsText, setQuickPromptsText] = useState(bot.quick_prompts.join("\n"));
  const [widgetColor, setWidgetColor] = useState(bot.widget_color);
  const [logoUrl, setLogoUrl] = useState(bot.logo_url ?? "");
  const [escalationContact, setEscalationContact] = useState(bot.escalation_contact ?? "");
  const [model, setModel] = useState(bot.model);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const [retraining, setRetraining] = useState(false);
  const [retrainError, setRetrainError] = useState("");
  const [trainedPages, setTrainedPages] = useState(bot.trained_pages);
  const [lastTrainedAt, setLastTrainedAt] = useState(bot.last_trained_at);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          quick_prompts: quickPromptsText
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
          widget_color: widgetColor,
          logo_url: logoUrl,
          escalation_contact: escalationContact,
          model,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Something went wrong");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setSaveError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrain() {
    setRetraining(true);
    setRetrainError("");
    try {
      const res = await fetch(`/api/bots/${bot.id}/retrain`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRetrainError(data.error ?? "Retrain failed");
      } else {
        setTrainedPages(data.bot.trained_pages ?? []);
        setLastTrainedAt(data.bot.last_trained_at ?? null);
      }
    } catch {
      setRetrainError("Something went wrong. Try again.");
    } finally {
      setRetraining(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
        <div>
          <label className="text-xs font-semibold text-slate">Persona / instructions</label>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate">
            Quick Prompts (one per line, shown before a visitor's first message)
          </label>
          <textarea
            value={quickPromptsText}
            onChange={(e) => setQuickPromptsText(e.target.value)}
            rows={3}
            placeholder={"What are your hours?\nDo you offer refunds?"}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate">Up to 6 prompts. Leave blank to hide.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate">Widget color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-line"
              />
              <input
                type="text"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate">Logo URL (optional)</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yoursite.com/logo.png"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate">
            Escalation contact (email or contact-page URL)
          </label>
          <input
            type="text"
            value={escalationContact}
            onChange={(e) => setEscalationContact(e.target.value)}
            placeholder="support@yoursite.com"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate">
            Shown as &quot;Talk to a human&quot; in the widget, and the bot
            points visitors here when it doesn&apos;t know an answer.
          </p>
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </form>

      {bot.website_url && (
        <div className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-slate">Website training</h2>
          <p className="mt-2 text-sm text-slate">
            Trained on {trainedPages.length} page{trainedPages.length === 1 ? "" : "s"} from{" "}
            {bot.website_url}
            {lastTrainedAt && ` · last trained ${new Date(lastTrainedAt).toLocaleString()}`}
          </p>

          {trainedPages.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-xs text-slate">
              {trainedPages.map((p, i) => (
                <li key={i} className="truncate">
                  {p.url}
                </li>
              ))}
            </ul>
          )}

          {retrainError && <p className="mt-2 text-sm text-red-600">{retrainError}</p>}

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
          >
            {retraining ? "Retraining…" : "Retrain / resync from website"}
          </button>
        </div>
      )}
    </div>
  );
}
