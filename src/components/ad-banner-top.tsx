"use client";

import { useEffect, useRef } from "react";

// Monetag ad tag. Rendered above the tool box on FREE tool pages only
// (never on paid tool pages or the dashboard) — import this and drop
// <AdBannerTop /> right after the page's intro text, before the tool's
// main content box. Pairs with <AdBanner /> (Clickadilla) at the bottom of
// the same pages.
//
// Throttled: the tag only (re)loads at most once every 3–5 minutes
// (randomized within that window), tracked in localStorage across page
// navigations. Without this, every free-tool page mounts its own copy of
// the component and re-fires the script on each navigation, which is what
// made the ad feel constant. Visiting/switching between free tool pages
// inside the throttle window simply won't reload the tag.

const STORAGE_KEY = "sf_monetag_next_load";
const MIN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function randomInterval() {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

function loadMonetagTag() {
  const target = [document.documentElement, document.body].filter(Boolean).pop();
  if (!target) return;
  const script = document.createElement("script");
  script.dataset.zone = "11627802";
  script.src = "https://nap5k.com/tag.min.js";
  target.appendChild(script);
}

export default function AdBannerTop() {
  const attempted = useRef(false);

  useEffect(() => {
    // Guard against double-invocation in dev / re-renders — only ever
    // attempt once per mounted instance.
    if (attempted.current) return;
    attempted.current = true;

    let nextAllowed = 0;
    try {
      nextAllowed = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fall back to
      // loading every time rather than throwing.
      loadMonetagTag();
      return;
    }

    const now = Date.now();
    if (now >= nextAllowed) {
      loadMonetagTag();
      try {
        localStorage.setItem(STORAGE_KEY, String(now + randomInterval()));
      } catch {
        // ignore write failures
      }
    }
  }, []);

  return null;
}
