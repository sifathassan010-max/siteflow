// Server-only. Shared by the SEO tool's scan route. Reuses the same
// fetch+cheerio approach as the free meta-tag checker, but goes deeper
// (word count, image alt coverage, viewport tag, scoring) and can follow
// internal links to audit more than one page per run.
import * as cheerio from "cheerio";

export type PageAudit = {
  url: string;
  statusCode: number | null;
  title: string;
  metaDescription: string;
  h1Count: number;
  h1Text: string;
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasViewport: boolean;
  score: number;
  issues: string[];
  error?: string;
};

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "SiteFlow-SEOTool/1.0";

function scorePage(a: Omit<PageAudit, "score" | "issues" | "url" | "statusCode" | "error">) {
  let score = 100;
  const issues: string[] = [];

  if (!a.title) {
    score -= 20;
    issues.push("Missing title tag");
  } else if (a.title.length < 30 || a.title.length > 60) {
    score -= 5;
    issues.push(`Title tag is ${a.title.length} characters (aim for 30–60)`);
  }

  if (!a.metaDescription) {
    score -= 15;
    issues.push("Missing meta description");
  } else if (a.metaDescription.length < 120 || a.metaDescription.length > 160) {
    score -= 5;
    issues.push(`Meta description is ${a.metaDescription.length} characters (aim for 120–160)`);
  }

  if (a.h1Count === 0) {
    score -= 10;
    issues.push("No H1 heading found");
  } else if (a.h1Count > 1) {
    score -= 10;
    issues.push(`${a.h1Count} H1 headings found (should be exactly 1)`);
  }

  if (a.imagesTotal > 0 && a.imagesMissingAlt > 0) {
    const ratio = a.imagesMissingAlt / a.imagesTotal;
    score -= Math.round(ratio * 10);
    issues.push(`${a.imagesMissingAlt} of ${a.imagesTotal} images missing alt text`);
  }

  if (!a.hasCanonical) {
    score -= 5;
    issues.push("Missing canonical link tag");
  }

  if (!a.hasOgTags) {
    score -= 5;
    issues.push("Missing Open Graph tags (affects social share previews)");
  }

  if (!a.hasViewport) {
    score -= 10;
    issues.push("Missing viewport meta tag (affects mobile rendering)");
  }

  if (a.wordCount < 300) {
    score -= 10;
    issues.push(`Only ${a.wordCount} words of visible text (thin content, aim for 300+)`);
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

export async function analyzePage(url: string): Promise<PageAudit> {
  let html: string;
  let statusCode: number | null = null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    statusCode = res.status;
    if (!res.ok) {
      return {
        url,
        statusCode,
        title: "",
        metaDescription: "",
        h1Count: 0,
        h1Text: "",
        wordCount: 0,
        imagesTotal: 0,
        imagesMissingAlt: 0,
        hasCanonical: false,
        hasOgTags: false,
        hasViewport: false,
        score: 0,
        issues: [`Page returned status ${statusCode}`],
        error: `HTTP ${statusCode}`,
      };
    }
    html = await res.text();
  } catch {
    return {
      url,
      statusCode: null,
      title: "",
      metaDescription: "",
      h1Count: 0,
      h1Text: "",
      wordCount: 0,
      imagesTotal: 0,
      imagesMissingAlt: 0,
      hasCanonical: false,
      hasOgTags: false,
      hasViewport: false,
      score: 0,
      issues: ["Couldn't reach this page (timed out or unreachable)"],
      error: "fetch_failed",
    };
  }

  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const h1Count = $("h1").length;
  const h1Text = $("h1").first().text().trim();
  const hasCanonical = $('link[rel="canonical"]').length > 0;
  const hasOgTags =
    $('meta[property="og:title"]').length > 0 && $('meta[property="og:description"]').length > 0;
  const hasViewport = $('meta[name="viewport"]').length > 0;

  const images = $("img");
  const imagesTotal = images.length;
  let imagesMissingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || !alt.trim()) imagesMissingAlt += 1;
  });

  const bodyText = $("body").clone();
  bodyText.find("script, style, noscript").remove();
  const wordCount = bodyText
    .text()
    .split(/\s+/)
    .filter(Boolean).length;

  const base = { title, metaDescription, h1Count, h1Text, wordCount, imagesTotal, imagesMissingAlt, hasCanonical, hasOgTags, hasViewport };
  const { score, issues } = scorePage(base);

  return { url, statusCode, ...base, score, issues };
}

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

// Crawls up to maxPages starting from rootUrl (breadth-first over internal
// links found on each page). Sequential on purpose — polite to the target
// site and keeps this within a single serverless function's time budget.
export async function crawlSite(rootUrl: string, maxPages: number): Promise<PageAudit[]> {
  const visited = new Set<string>();
  const queue: string[] = [rootUrl];
  const results: PageAudit[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const next = queue.shift()!;
    const normalized = next.replace(/\/$/, "");
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const audit = await analyzePage(next);
    results.push(audit);

    if (!audit.error && results.length < maxPages) {
      try {
        const res = await fetch(next, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        const html = await res.text();
        const links = extractInternalLinks(html, next);
        for (const link of links) {
          const linkNormalized = link.replace(/\/$/, "");
          if (!visited.has(linkNormalized) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } catch {
        // If we can't re-fetch for link extraction, just move on — the
        // page audit itself already succeeded and was recorded above.
      }
    }
  }

  return results;
}
