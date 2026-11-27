"use client";

import { useState } from "react";
import { PATREON_JOIN_URL, PATREON_REFERRAL_JOIN_URL } from "@/lib/patreon-config";

// First click reveals a short notice explaining the Patreon checkout.
// Second click on the same button follows through to Patreon.
export function PatreonBuyButton({
  className,
  wrapperClassName,
  referral = false,
}: {
  className: string;
  wrapperClassName?: string;
  // true = go to the referral tier's Patreon page ($35.99). Only passed by
  // /pricing for affiliate visitors once PATREON_REFERRAL_JOIN_URL is set.
  referral?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => {
          if (expanded) {
            const url =
              referral && PATREON_REFERRAL_JOIN_URL.startsWith("https://")
                ? PATREON_REFERRAL_JOIN_URL
                : PATREON_JOIN_URL;
            window.open(url, "_blank", "noopener,noreferrer");
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
