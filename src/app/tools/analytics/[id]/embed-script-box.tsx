"use client";

import { useState, useEffect } from "react";

export default function EmbedScriptBox({ siteId }: { siteId: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const snippet = `<script defer src="${origin}/embed/analytics/${siteId}/script.js"></script>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-slate">
        Paste this once into your site&apos;s <code>&lt;head&gt;</code> — it
        tracks every page automatically, including client-side navigation:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-canvas p-3 text-xs">{snippet}</pre>
      <button
        onClick={handleCopy}
        disabled={!origin}
        className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30 disabled:opacity-50"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}
