"use client";

import { useState, useEffect } from "react";

export default function EmbedCodeBox({ formId }: { formId: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embedUrl = `${origin}/embed/form/${formId}`;
  const snippet = `<iframe
  src="${embedUrl}"
  style="width: 100%; max-width: 480px; height: 560px; border: none; border-radius: 16px;"
  title="Form"
></iframe>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-slate">
        Paste this into your site&apos;s HTML wherever you want the form to
        appear:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-canvas p-3 text-xs">
        {snippet}
      </pre>
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
