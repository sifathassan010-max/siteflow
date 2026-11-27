// Server-only. Pulls plain visible text from a customer's site to train a
// chatbot. Used on bot create and on the retrain button.
//
//  - every fetch goes through safeFetch (SSRF protection, size/time limits)
//  - breadth-first, 4 pages at a time with a short pause between waves
//    (concurrent but polite), shared overall time budget
//  - URLs with query strings are crawled last (calendar/sort-param traps)
import * as cheerio from "cheerio";
import { extractInternalLinks } from "./seo-audit.ts";
import { safeFetch, SafeFetchError } from "./safe-fetch.ts";
import { MAX_CHARS_PER_PAGE, cutAtWord } from "./training-core.ts";

const PAGE_TIMEOUT_MS = 8000;
const PAGE_MAX_BYTES = 1_500_000;
const CONCURRENCY = 4;
const WAVE_PAUSE_MS = 150;
// Routes run with maxDuration = 60s; stop starting new waves after this so
// there is time left to chunk + save.
export const DEFAULT_CRAWL_BUDGET_MS = 40_000;

export type CrawledPage = { url: string; chars: number };
export type CrawledPageText = { url: string; text: string };

export type CrawlResult = {
  pagesText: CrawledPageText[];
  pages: CrawledPage[];
  reachedPageLimit: boolean;
  timedOut: boolean;
  rootError: string | null; // set when nothing could be fetched
};

type Fetched = { finalUrl: string; html: string; text: string };

export function extractText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, template").remove();
  // cheerio's .text() glues block elements together ("HomeAbout"); add spaces.
  $("br").replaceWith(" ");
  $("p, div, li, h1, h2, h3, h4, h5, h6, tr, td, th, section, article, main, header, footer, dd, dt, label, button, a, span").append(" ");
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = ($('meta[name="description"]').attr("content") ?? "").replace(/\s+/g, " ").trim();
  const body = $("body").text().replace(/\s+/g, " ").trim();
  const head = [title && `Title: ${title}.`, description && `Description: ${description}`]
    .filter(Boolean)
    .join(" ");
  return cutAtWord([head, body].filter(Boolean).join(" "), MAX_CHARS_PER_PAGE);
}

type Fetcher = typeof safeFetch;

async function fetchPage(
  url: string,
  fetcher: Fetcher
): Promise<{ result: Fetched | null; error: string | null }> {
  try {
    const res = await fetcher(url, {
      timeoutMs: PAGE_TIMEOUT_MS,
      maxBytes: PAGE_MAX_BYTES,
      requireContentType: /html|xml/i,
    });
    if (!res.ok || res.bodySkipped) {
      return { result: null, error: res.ok ? "Not an HTML page" : `Status ${res.status}` };
    }
    return { result: { finalUrl: res.url, html: res.text, text: extractText(res.text) }, error: null };
  } catch (err) {
    if (err instanceof SafeFetchError) {
      return {
        result: null,
        error: err.code === "blocked" || err.code === "invalid_url" ? err.message : "Couldn't reach that URL",
      };
    }
    return { result: null, error: "Couldn't reach that URL" };
  }
}

function normalize(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Crawls up to maxPages starting from rootUrl, following internal links
// breadth-first. Returns each page's text (for chunking) plus the per-page
// breakdown shown in the dashboard.
export async function crawlSiteForTraining(
  rootUrl: string,
  maxPages: number,
  opts: { budgetMs?: number; fetcher?: Fetcher } = {}
): Promise<CrawlResult> {
  const fetcher = opts.fetcher ?? safeFetch; // tests inject a fake
  const deadline = Date.now() + (opts.budgetMs ?? DEFAULT_CRAWL_BUDGET_MS);
  const seen = new Set<string>([normalize(rootUrl)]);
  const primary: string[] = [rootUrl]; // no query string
  const secondary: string[] = []; // with query string
  const pagesText: CrawledPageText[] = [];
  let attempts = 0;
  const maxAttempts = maxPages * 3;
  let rootError: string | null = null;
  let timedOut = false;
  let isFirstWave = true;

  while (pagesText.length < maxPages && attempts < maxAttempts) {
    if (Date.now() > deadline) {
      timedOut = true;
      break;
    }
    const slots = Math.min(CONCURRENCY, maxPages - pagesText.length, maxAttempts - attempts);
    const wave: string[] = [];
    while (wave.length < slots) {
      const next = primary.shift() ?? secondary.shift();
      if (!next) break;
      wave.push(next);
    }
    if (wave.length === 0) break;
    attempts += wave.length;

    const fetched = await Promise.all(wave.map((u) => fetchPage(u, fetcher)));

    for (let i = 0; i < wave.length; i++) {
      const { result, error } = fetched[i];
      if (!result) {
        if (isFirstWave && i === 0) rootError = error;
        continue;
      }
      if (pagesText.length >= maxPages) break;
      const pageUrl = result.finalUrl;
      // a redirect may land on an already-collected page
      if (pagesText.some((p) => normalize(p.url) === normalize(pageUrl))) continue;
      seen.add(normalize(pageUrl));

      if (result.text) pagesText.push({ url: pageUrl, text: result.text });

      for (const link of extractInternalLinks(result.html, pageUrl)) {
        const key = normalize(link);
        if (seen.has(key)) continue;
        seen.add(key);
        (link.includes("?") ? secondary : primary).push(link);
      }
    }
    isFirstWave = false;
    if (pagesText.length < maxPages) await sleep(WAVE_PAUSE_MS);
  }

  return {
    pagesText,
    pages: pagesText.map((p) => ({ url: p.url, chars: p.text.length })),
    reachedPageLimit: pagesText.length >= maxPages && (primary.length > 0 || secondary.length > 0),
    timedOut,
    rootError: pagesText.length === 0 ? rootError : null,
  };
}
