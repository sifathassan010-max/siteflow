import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { TOOLS, FREE_TOOLS } from "@/lib/site-config";

// Auto-served at /sitemap.xml by Next.js. Only lists pages a logged-out
// visitor can actually land on and that are worth indexing — no /dashboard,
// /api, /auth, /embed, or per-user dynamic tool pages (those are gated,
// unique per account, and shouldn't be in search results at all).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/discussions`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  const toolPages: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: `${SITE_URL}${tool.href}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const freeToolPages: MetadataRoute.Sitemap = FREE_TOOLS.map((tool) => ({
    url: `${SITE_URL}${tool.href}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...toolPages, ...freeToolPages];
}
