"use client";

import { useEffect } from "react";

// One-time cleanup for a Monetag "Multitag" push-notification service
// worker that got installed in visitors' browsers before it was swapped
// out for Vignette Banner. Service workers, once registered, keep running
// independently of the site's code — deleting the script tag or the
// public/sw.js file doesn't remove it from browsers that already have it.
// This forcibly unregisters ANY service worker on this origin (SiteFlow
// doesn't use one on purpose) and clears any caches it created, so
// affected visitors self-heal the next time they load the site. Safe to
// leave in permanently — a no-op once nobody has a stray worker left.
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });

    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }, []);

  return null;
}
