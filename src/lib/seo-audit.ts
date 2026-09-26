// Server-only. Shared internal-link extraction utility, used by the
// chatbot trainer (site-crawler.ts) and the free sitemap generator
// (sitemap-utils.ts) to follow same-hostname links while crawling a site.
import * as cheerio from "cheerio";

// Extracts same-hostname links from a page's HTML, for crawling.
export function extractInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const found = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, base);
      if (resolved.hostname !== base.hostname) return;
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      resolved.hash = "";
      // Skip obvious non-page assets.
      if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|ico|xml)$/i.test(resolved.pathname)) return;
      found.add(resolved.toString());
    } catch {
      // ignore unparseable hrefs (mailto:, tel:, javascript:, etc.)
    }
  });

  return Array.from(found);
}
