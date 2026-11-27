// Server-only. Pulls a Shopify store's catalog from the public
// {origin}/products.json endpoint (paged, max 250 per page) through safeFetch
// (SSRF protection, size/time limits). Pure normalizing lives in shopify-core.ts.
// Unit-tested with a fake fetcher in shopify-import.test.ts.
import { safeFetch, SafeFetchError, type SafeFetchResult } from "./safe-fetch.ts";
import {
  fromShopifyJson,
  normalizeCurrency,
  parseProductsJson,
  type ProductRecord,
} from "./shopify-core.ts";

type Fetcher = typeof safeFetch;

// products.json pages can be big (descriptions + images). Try 250 per page
// first; if a page does not fit the size cap, restart with smaller pages.
const PAGE_LIMITS = [250, 100, 40];
const PAGE_MAX_BYTES = 8_000_000;
const PAGE_TIMEOUT_MS = 12_000;
const PAGE_PAUSE_MS = 250;
const BACKOFF_MS = [1000, 2000, 4000];
export const DEFAULT_IMPORT_BUDGET_MS = 45_000; // route maxDuration is 60s

export type ImportErrorCode =
  | "not_shopify" // 404 / not JSON: not Shopify, or products.json disabled
  | "password" // storefront password page
  | "blocked" // SSRF policy
  | "rate_limited" // Shopify kept answering 429
  | "unreachable"
  | "empty"; // Shopify store, but no products

export type ImportResult =
  | {
      ok: true;
      products: ProductRecord[];
      capped: boolean; // more products exist than the cap
      partial: boolean; // stopped early (time / a failed later page)
      currency: string | null;
    }
  | { ok: false; code: ImportErrorCode };

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isPasswordUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().startsWith("/password");
  } catch {
    return false;
  }
}

// GET with exponential backoff on 429 / 503. Throws SafeFetchError for network/SSRF problems.
async function getWithBackoff(
  fetcher: Fetcher,
  url: string,
  deadline: number,
  sleep: (ms: number) => Promise<void>
): Promise<SafeFetchResult> {
  let attempt = 0;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SafeFetchError("timeout", "Import ran out of time.");
    const res = await fetcher(url, {
      timeoutMs: Math.min(PAGE_TIMEOUT_MS, remaining),
      maxBytes: PAGE_MAX_BYTES,
      requireContentType: /json/i,
    });
    if ((res.status === 429 || res.status === 503) && attempt < BACKOFF_MS.length) {
      const wait = BACKOFF_MS[attempt++];
      if (Date.now() + wait >= deadline) return res;
      await sleep(wait);
      continue;
    }
    return res;
  }
}

// Best effort: shop currency from {origin}/meta.json. null if unavailable.
export async function fetchShopCurrency(
  origin: string,
  fetcher: Fetcher = safeFetch
): Promise<string | null> {
  try {
    const res = await fetcher(`${origin}/meta.json`, {
      timeoutMs: 5000,
      maxBytes: 200_000,
      requireContentType: /json/i,
    });
    if (!res.ok || res.bodySkipped) return null;
    const data = JSON.parse(res.text) as { currency?: unknown };
    return normalizeCurrency(data.currency);
  } catch {
    return null;
  }
}

export async function importShopifyProducts(
  origin: string,
  cap: number,
  opts: { fetcher?: Fetcher; budgetMs?: number; sleep?: (ms: number) => Promise<void>; currencyOverride?: string | null } = {}
): Promise<ImportResult> {
  const fetcher = opts.fetcher ?? safeFetch;
  const sleep = opts.sleep ?? defaultSleep;
  const deadline = Date.now() + (opts.budgetMs ?? DEFAULT_IMPORT_BUDGET_MS);

  // Currency first (cheap) so every record carries it.
  const currency = normalizeCurrency(opts.currencyOverride) ?? (await fetchShopCurrency(origin, fetcher));

  for (let li = 0; li < PAGE_LIMITS.length; li++) {
    const limit = PAGE_LIMITS[li];
    const isLastLimit = li === PAGE_LIMITS.length - 1;
    const byId = new Map<string, ProductRecord>();
    let capped = false;
    let partial = false;
    let restart = false;
    const maxPages = Math.ceil(cap / limit) + 1;

    for (let page = 1; page <= maxPages; page++) {
      let res: SafeFetchResult;
      try {
        res = await getWithBackoff(fetcher, `${origin}/products.json?limit=${limit}&page=${page}`, deadline, sleep);
      } catch (err) {
        if (page > 1) {
          partial = true;
          break;
        }
        if (err instanceof SafeFetchError && (err.code === "blocked" || err.code === "invalid_url")) {
          return { ok: false, code: "blocked" };
        }
        return { ok: false, code: "unreachable" };
      }

      if (page === 1) {
        if (isPasswordUrl(res.url) || res.status === 401 || res.status === 403) {
          return { ok: false, code: "password" };
        }
        if (res.status === 429 || res.status === 503) return { ok: false, code: "rate_limited" };
        if (res.status === 404 || res.bodySkipped) return { ok: false, code: "not_shopify" };
        if (!res.ok) return { ok: false, code: "unreachable" };
      } else if (!res.ok || res.bodySkipped) {
        partial = true;
        break;
      }

      if (res.truncated) {
        // Page did not fit the size cap: retry the whole import with smaller pages.
        if (!isLastLimit) {
          restart = true;
          break;
        }
        partial = true;
        break;
      }

      const raw = parseProductsJson(res.text);
      if (raw === null) {
        if (page === 1) return { ok: false, code: "not_shopify" };
        partial = true;
        break;
      }
      if (raw.length === 0) break;

      for (let i = 0; i < raw.length; i++) {
        const rec = fromShopifyJson(raw[i], origin, currency);
        if (!rec || byId.has(rec.external_id)) continue;
        if (byId.size >= cap) {
          capped = true;
          break;
        }
        byId.set(rec.external_id, rec);
      }
      if (capped) break;
      if (byId.size >= cap && raw.length === limit) {
        // exactly at the cap and the page was full: there may be more
        capped = true;
        break;
      }
      if (raw.length < limit) break; // last page

      if (Date.now() + PAGE_PAUSE_MS >= deadline) {
        partial = true;
        break;
      }
      await sleep(PAGE_PAUSE_MS);
    }

    if (restart) continue;

    if (byId.size === 0) return { ok: false, code: partial ? "unreachable" : "empty" };
    return { ok: true, products: [...byId.values()], capped, partial, currency };
  }
  return { ok: false, code: "unreachable" };
}
