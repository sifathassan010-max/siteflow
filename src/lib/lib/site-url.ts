// Single source of truth for the site's public base URL. Reads
// NEXT_PUBLIC_SITE_URL if it's set (do this once a real custom domain is
// connected), otherwise falls back to the current live Vercel URL so
// sitemap.xml/robots.txt still work correctly today.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://siteflow-omega.vercel.app";
