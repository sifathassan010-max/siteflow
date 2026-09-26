"use client";

import { useState } from "react";
import { PATREON_JOIN_URL } from "@/lib/patreon-config";

// First click reveals a short notice explaining the Patreon checkout.
// Second click on the same button follows through to Patreon.
export function PatreonBuyButton({
  className,
  wrapperClassName,
}: {
  className: string;
  wrapperClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => {
          if (expanded) {
            window.open(PATREON_JOIN_URL, "_blank", "noopener,noreferrer");
          } else {
            setExpanded(true);
          }
        }}
        className={className}
      >
        Buy
      </button>
      {expanded && (
        <p className="mt-2 rounded-lg bg-brand-bg px-3 py-2 text-left text-xs leading-relaxed text-slate">
          We&apos;re a new independent SaaS and are temporarily using Patreon
          to handle subscription payments. We plan to introduce standard
          payment options as SiteFlow grows.
        </p>
      )}
    </div>
  );
}
