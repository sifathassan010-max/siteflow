// Server-only. Reuses the SEO tool's internal-link-following logic
// (extractInternalLinks) but pulls plain visible text per page instead of
// running SEO scoring — this is what trains a chatbot's knowledge, not
// what audits a page. Used on bot create and on the retrain button.
import * as cheerio from "cheerio";
import { extractInternalLinks } from "./seo-audit";

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "SiteFlow-BotBuilder/1.0";
const MAX_CHARS_PER_PAGE = 3000;

export type CrawledPage = { url: string; chars: number };

async function fetchPage(url: string): Promise<{ html: string; text: string } | null> {
  try {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) return null;

    const res = await fetch(target.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_CHARS_PER_PAGE);
    return { html, text };
  } catch {
    return null;
  }
}

// Crawls up to maxPages starting from rootUrl, following internal links
// breadth-first. Returns the combined training text (ready to store as
// site_content) plus a per-page breakdown for the "trained on" list shown
// in the dashboard.
export async function crawlSiteForTraining(
  rootUrl: string,
  maxPages: number
): Promise<{ combinedText: string; pages: CrawledPage[] }> {
  const visited = new Set<string>();
  const queue: string[] = [rootUrl];
  const pages: CrawledPage[] = [];
  const chunks: string[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift()!;
    const normalized = next.replace(/\/$/, "");
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const fetched = await fetchPage(next);
    if (!fetched) continue;

    if (fetched.text) {
      pages.push({ url: next, chars: fetched.text.length });
      chunks.push(`--- PAGE: ${next} ---\n${fetched.text}`);
    }

    if (pages.length < maxPages) {
      const links = extractInternalLinks(fetched.html, next);
      for (const link of links) {
        const linkNormalized = link.replace(/\/$/, "");
        if (!visited.has(linkNormalized) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }
  }

  return { combinedText: chunks.join("\n\n"), pages };
}
