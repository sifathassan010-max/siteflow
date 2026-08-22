import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { TOOLS, FREE_TOOLS } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";

// Auto-served at /sitemap.xml by Next.js. Only lists pages a logged-out
// visitor can actually land on and that are worth indexing — no /dashboard,
// /api, /auth, /embed, or per-user dynamic tool pages (those are gated,
// unique per account, and shouldn't be in search results at all).
//
// Discussion threads are added dynamically below — every published thread
// gets its own sitemap entry automatically, no manual step needed when a
// new one is posted. Capped at the most recent 1,000; split into a proper
// sitemap index if the thread count ever grows past that.
// Regenerated at most once per hour — without this, Next.js may generate
// this file once at build time and cache it, meaning new discussion
// threads or newly added free tools wouldn't show up here until the next
// deploy. Given new content gets published daily, that gap matters.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let threadPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createAdminClient();
    const { data: threads } = await supabase
      .from("discussion_threads")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);

    threadPages = (threads ?? []).map((thread) => ({
      url: `${SITE_URL}/discussions/${thread.id}`,
      lastModified: new Date(thread.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // If the discussions table doesn't exist yet (schema not run) or the
    // query fails for any reason, fall back to just the static pages
    // instead of breaking the whole sitemap.
    threadPages = [];
  }

  return [...staticPages, ...toolPages, ...freeToolPages, ...threadPages];
}
