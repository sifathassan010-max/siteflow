// Server-only. Shared by the 5 free sitemap tools (checker, validator,
// generator, URL extractor, URL comparison). Original implementation of the
// public sitemaps.org protocol — not copied from any third-party tool.
import * as cheerio from "cheerio";
import { extractInternalLinks } from "./seo-audit";

export const FETCH_TIMEOUT_MS = 10000;
export const USER_AGENT = "SiteFlow-SitemapTools/1.0";

// Practical safety cap. Real sitemaps can be up to 50MB per the spec, but
// that's more than a free browser-based tool needs to hold in memory.
export const MAX_XML_CHARS = 15_000_000;

export const SITEMAP_PROTOCOL_MAX_URLS = 50000;
export const SITEMAP_PROTOCOL_MAX_BYTES = 50 * 1024 * 1024;

const COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/wp-sitemap.xml",
  "/sitemap/sitemap.xml",
];

const VALID_CHANGEFREQ = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);

// Turns whatever a visitor typed ("example.com", "www.example.com/",
// "http://example.com") into a normalized URL, defaulting to https when no
// scheme was given.
export function normalizeUrlInput(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export type FetchResult =
  | { ok: true; text: string; status: number; contentType: string; truncated: boolean }
  | { ok: false; error: string };

export async function fetchText(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `That URL returned an error (status ${res.status})` };
    }
    const text = await res.text();
    const truncated = text.length > MAX_XML_CHARS;
    return {
      ok: true,
      text: truncated ? text.slice(0, MAX_XML_CHARS) : text,
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      truncated,
    };
  } catch {
    return { ok: false, error: "Couldn't reach that URL. Check it's correct and publicly accessible." };
  }
}

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

export type SitemapIndexEntry = { loc: string; lastmod?: string };

export type ParsedSitemap = {
  kind: "urlset" | "sitemapindex" | "unknown";
  wellFormed: boolean;
  entries: SitemapEntry[];
  sitemaps: SitemapIndexEntry[];
};

// Parses raw sitemap XML text into either a list of page entries (urlset) or
// a list of child sitemaps (sitemapindex). Tolerant by design — a malformed
// document still gets read as far as cheerio's forgiving XML parser can go,
// since "how broken is it" is exactly what the validator tool reports on.
export function parseSitemapXml(xml: string): ParsedSitemap {
  let $: ReturnType<typeof cheerio.load>;
  try {
    $ = cheerio.load(xml, { xmlMode: true });
  } catch {
    return { kind: "unknown", wellFormed: false, entries: [], sitemaps: [] };
  }

  const hasUrlset = $("urlset").length > 0;
  const hasIndex = $("sitemapindex").length > 0;

  if (hasIndex) {
    const sitemaps: SitemapIndexEntry[] = [];
    $("sitemapindex > sitemap").each((_, el) => {
      const loc = $(el).find("loc").first().text().trim();
      if (!loc) return;
      const lastmod = $(el).find("lastmod").first().text().trim();
      sitemaps.push({ loc, lastmod: lastmod || undefined });
    });
    return { kind: "sitemapindex", wellFormed: true, entries: [], sitemaps };
  }

  if (hasUrlset) {
    const entries: SitemapEntry[] = [];
    $("urlset > url").each((_, el) => {
      const loc = $(el).find("loc").first().text().trim();
      if (!loc) return;
      const lastmod = $(el).find("lastmod").first().text().trim();
      const changefreq = $(el).find("changefreq").first().text().trim();
      const priority = $(el).find("priority").first().text().trim();
      entries.push({
        loc,
        lastmod: lastmod || undefined,
        changefreq: changefreq || undefined,
        priority: priority || undefined,
      });
    });
    return { kind: "urlset", wellFormed: true, entries, sitemaps: [] };
  }

  return { kind: "unknown", wellFormed: $("*").length > 0, entries: [], sitemaps: [] };
}

export type ValidationIssue = { level: "error" | "warning"; message: string };

// Checks a parsed sitemap against the sitemaps.org protocol rules that
// actually matter for indexing — not every pedantic edge case, just the
// ones that will get a sitemap rejected or partially ignored by crawlers.
export function validateSitemap(xml: string, parsed: ParsedSitemap): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!parsed.wellFormed) {
    issues.push({ level: "error", message: "This isn't well-formed XML — it couldn't be parsed at all." });
    return issues;
  }

  if (parsed.kind === "unknown") {
    issues.push({
      level: "error",
      message: "Root element isn't <urlset> or <sitemapindex> — this doesn't look like a sitemap.",
    });
    return issues;
  }

  const hasNamespace = /xmlns\s*=\s*["']https?:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(xml);
  if (!hasNamespace) {
    issues.push({
      level: "warning",
      message: "Missing (or non-standard) sitemaps.org namespace declaration on the root element.",
    });
  }

  const byteSize = new TextEncoder().encode(xml).length;
  if (byteSize > SITEMAP_PROTOCOL_MAX_BYTES) {
    issues.push({
      level: "error",
      message: `File is ${(byteSize / (1024 * 1024)).toFixed(1)}MB uncompressed — over the 50MB protocol limit.`,
    });
  }

  if (parsed.kind === "urlset") {
    if (parsed.entries.length === 0) {
      issues.push({ level: "error", message: "<urlset> has no <url> entries." });
    }
    if (parsed.entries.length > SITEMAP_PROTOCOL_MAX_URLS) {
      issues.push({
        level: "error",
        message: `Contains ${parsed.entries.length.toLocaleString()} URLs — over the 50,000 limit for a single sitemap.`,
      });
    }

    const seen = new Set<string>();
    let duplicates = 0;
    let invalidLocs = 0;
    let invalidPriority = 0;
    let invalidChangefreq = 0;

    for (const entry of parsed.entries) {
      if (seen.has(entry.loc)) duplicates++;
      seen.add(entry.loc);

      try {
        const u = new URL(entry.loc);
        if (!["http:", "https:"].includes(u.protocol)) invalidLocs++;
      } catch {
        invalidLocs++;
      }

      if (entry.priority !== undefined) {
        const p = Number(entry.priority);
        if (Number.isNaN(p) || p < 0 || p > 1) invalidPriority++;
      }

      if (entry.changefreq !== undefined && !VALID_CHANGEFREQ.has(entry.changefreq.toLowerCase())) {
        invalidChangefreq++;
      }
    }

    if (duplicates > 0) {
      issues.push({ level: "warning", message: `${duplicates} duplicate <loc> URL(s) found.` });
    }
    if (invalidLocs > 0) {
      issues.push({ level: "error", message: `${invalidLocs} <loc> value(s) aren't valid absolute URLs.` });
    }
    if (invalidPriority > 0) {
      issues.push({
        level: "warning",
        message: `${invalidPriority} <priority> value(s) outside the valid 0.0–1.0 range.`,
      });
    }
    if (invalidChangefreq > 0) {
      issues.push({
        level: "warning",
        message: `${invalidChangefreq} <changefreq> value(s) aren't one of the recognized values.`,
      });
    }
  }

  if (parsed.kind === "sitemapindex" && parsed.sitemaps.length === 0) {
    issues.push({ level: "error", message: "<sitemapindex> has no <sitemap> entries." });
  }

  return issues;
}

// Reads robots.txt for "Sitemap:" directives, then falls back to probing
// the handful of conventional sitemap paths. Returns every candidate URL
// that actually resolved with a 2xx response.
export async function discoverSitemaps(rootUrl: URL): Promise<
  { candidates: string[]; found: { url: string; source: "robots.txt" | "common path" }[] }
> {
  const candidates = new Set<string>();
  const found: { url: string; source: "robots.txt" | "common path" }[] = [];

  const robotsUrl = `${rootUrl.origin}/robots.txt`;
  const robotsRes = await fetchText(robotsUrl);
  if (robotsRes.ok) {
    const lines = robotsRes.text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
      if (match) candidates.add(match[1].trim());
    }
    for (const c of candidates) found.push({ url: c, source: "robots.txt" });
  }

  for (const path of COMMON_SITEMAP_PATHS) {
    const candidate = `${rootUrl.origin}${path}`;
    if (candidates.has(candidate)) continue;
    try {
      const res = await fetch(candidate, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        candidates.add(candidate);
        found.push({ url: candidate, source: "common path" });
      }
    } catch {
      // ignore — just means this common path isn't in use
    }
  }

  return { candidates: Array.from(candidates), found };
}

// Breadth-first crawl of internal links starting at rootUrl, used by the
// sitemap generator. Deliberately reuses the SEO tool's link-extraction
// logic rather than re-implementing HTML parsing.
export async function crawlSiteForSitemap(
  rootUrl: string,
  maxPages: number
): Promise<{ pages: string[]; truncated: boolean }> {
  const visited = new Set<string>();
  const queue: string[] = [rootUrl];
  const pages: string[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift()!;
    const normalized = next.replace(/\/$/, "");
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      const res = await fetch(next, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html")) continue;

      const html = await res.text();
      pages.push(next);

      if (pages.length < maxPages) {
        const links = extractInternalLinks(html, next);
        for (const link of links) {
          const linkNormalized = link.replace(/\/$/, "");
          if (!visited.has(linkNormalized) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    } catch {
      // skip pages that fail to fetch; crawl continues with the rest
    }
  }

  return { pages, truncated: queue.length > 0 };
}

export function buildSitemapXml(urls: string[]): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = urls.map((u) => `  <url>\n    <loc>${escape(u)}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// Extracts every page URL from a sitemap, recursing one level into a
// sitemap index (fetching each child sitemap in turn) so callers always
// get back a flat list of page URLs regardless of which kind was passed in.
export async function extractAllUrls(
  rootXml: string,
  maxChildSitemaps = 20,
  maxTotalUrls = 5000
): Promise<{ urls: string[]; childSitemapsRead: number; truncated: boolean }> {
  const parsed = parseSitemapXml(rootXml);

  if (parsed.kind === "urlset") {
    const urls = parsed.entries.map((e) => e.loc);
    return {
      urls: urls.slice(0, maxTotalUrls),
      childSitemapsRead: 0,
      truncated: urls.length > maxTotalUrls,
    };
  }

  if (parsed.kind === "sitemapindex") {
    const urls: string[] = [];
    let childSitemapsRead = 0;
    let truncated = false;

    for (const child of parsed.sitemaps.slice(0, maxChildSitemaps)) {
      if (urls.length >= maxTotalUrls) {
        truncated = true;
        break;
      }
      const childRes = await fetchText(child.loc);
      if (!childRes.ok) continue;
      childSitemapsRead++;
      const childParsed = parseSitemapXml(childRes.text);
      for (const entry of childParsed.entries) {
        if (urls.length >= maxTotalUrls) {
          truncated = true;
          break;
        }
        urls.push(entry.loc);
      }
    }

    if (parsed.sitemaps.length > maxChildSitemaps) truncated = true;

    return { urls, childSitemapsRead, truncated };
  }

  return { urls: [], childSitemapsRead: 0, truncated: false };
}
