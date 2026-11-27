// Run with: node --experimental-strip-types --test src/lib/site-crawler.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { crawlSiteForTraining, extractText } from "./site-crawler.ts";
import { SafeFetchError, type SafeFetchResult } from "./safe-fetch.ts";

function page(links: string[], body: string, title = "T") {
  return `<html><head><title>${title}</title><meta name="description" content="D"></head><body><nav>NAVJUNK</nav><h1>${body}</h1><p>para</p>${links
    .map((l) => `<a href="${l}">x</a>`)
    .join("")}<script>var x=1</script></body></html>`;
}
function fakeFetcher(site: Record<string, string | number | "blocked">, log: string[] = []) {
  return (async (url: string | URL): Promise<SafeFetchResult> => {
    const u = String(url);
    log.push(u);
    const v = site[u];
    if (v === "blocked") throw new SafeFetchError("blocked", "That address is not allowed.");
    if (v === undefined) return { ok: false, status: 404, url: u, contentType: "text/html", text: "", truncated: false, bodySkipped: false };
    if (typeof v === "number") return { ok: false, status: v, url: u, contentType: "text/html", text: "", truncated: false, bodySkipped: false };
    return { ok: true, status: 200, url: u, contentType: "text/html", text: v, truncated: false, bodySkipped: false };
  }) as unknown as typeof import("./safe-fetch.ts").safeFetch;
}

test("extractText adds spaces between blocks, drops nav/script, prepends title+description", () => {
  const t = extractText(page([], "Welcome"));
  assert.match(t, /^Title: T\. Description: D/);
  assert.ok(!t.includes("NAVJUNK"));
  assert.ok(!t.includes("var x"));
  assert.match(t, /Welcome para/);
});

test("crawls up to maxPages breadth-first, root first, query URLs last", async () => {
  const site: Record<string, string> = { "https://a.com/": page(["/a", "/b", "/c?sort=1", "/d", "/e"], "root") };
  for (const p of ["a", "b", "d", "e"]) site[`https://a.com/${p}`] = page([], p);
  site["https://a.com/c?sort=1"] = page([], "c");
  const log: string[] = [];
  const r = await crawlSiteForTraining("https://a.com/", 4, { fetcher: fakeFetcher(site, log) });
  assert.equal(r.pagesText.length, 4);
  assert.equal(r.pagesText[0].url, "https://a.com/");
  assert.ok(!r.pagesText.some((p) => p.url.includes("?")));
  assert.equal(r.reachedPageLimit, true);
});

test("never exceeds the page limit even with concurrency", async () => {
  const links = Array.from({ length: 30 }, (_, i) => `/p${i}`);
  const site: Record<string, string> = { "https://a.com/": page(links, "root") };
  for (const l of links) site[`https://a.com${l}`] = page([], l);
  const r = await crawlSiteForTraining("https://a.com/", 16, { fetcher: fakeFetcher(site) });
  assert.equal(r.pagesText.length, 16);
});

test("skips failing pages and keeps going; dedupes trailing-slash / hash duplicates", async () => {
  const site: Record<string, string | number> = {
    "https://a.com/": page(["/x", "/x/", "/x#top", "/broken", "/ok"], "root"),
    "https://a.com/x": page([], "x"),
    "https://a.com/broken": 500,
    "https://a.com/ok": page([], "ok"),
  };
  const r = await crawlSiteForTraining("https://a.com/", 16, { fetcher: fakeFetcher(site) });
  assert.deepEqual(r.pagesText.map((p) => p.url), ["https://a.com/", "https://a.com/x", "https://a.com/ok"]);
  assert.equal(r.rootError, null);
});

test("root blocked by SSRF policy -> no pages and a clear error", async () => {
  const r = await crawlSiteForTraining("http://169.254.169.254/", 16, { fetcher: fakeFetcher({ "http://169.254.169.254/": "blocked" }) });
  assert.equal(r.pagesText.length, 0);
  assert.equal(r.rootError, "That address is not allowed.");
});

test("root unreachable (404) -> rootError set", async () => {
  const r = await crawlSiteForTraining("https://a.com/", 16, { fetcher: fakeFetcher({}) });
  assert.equal(r.pagesText.length, 0);
  assert.equal(r.rootError, "Status 404");
});

test("time budget stops the crawl", async () => {
  const links = Array.from({ length: 20 }, (_, i) => `/p${i}`);
  const site: Record<string, string> = { "https://a.com/": page(links, "root") };
  for (const l of links) site[`https://a.com${l}`] = page([], l);
  const slow = (async (u: string | URL) => {
    await new Promise((r) => setTimeout(r, 120));
    return fakeFetcher(site)(u);
  }) as unknown as typeof import("./safe-fetch.ts").safeFetch;
  const r = await crawlSiteForTraining("https://a.com/", 16, { fetcher: slow, budgetMs: 300 });
  assert.equal(r.timedOut, true);
  assert.ok(r.pagesText.length >= 1 && r.pagesText.length < 16);
});

test("redirect root (example.com -> www.example.com) keeps crawling on the final host", async () => {
  const fetcher = (async (u: string | URL): Promise<SafeFetchResult> => {
    const url = String(u);
    const map: Record<string, string> = {
      "https://www.a.com/": page(["/about"], "home"),
      "https://www.a.com/about": page([], "about"),
    };
    const finalUrl = url === "https://a.com/" ? "https://www.a.com/" : url;
    const html = map[finalUrl];
    return { ok: !!html, status: html ? 200 : 404, url: finalUrl, contentType: "text/html", text: html ?? "", truncated: false, bodySkipped: false };
  }) as unknown as typeof import("./safe-fetch.ts").safeFetch;
  const r = await crawlSiteForTraining("https://a.com/", 16, { fetcher });
  assert.deepEqual(r.pagesText.map((p) => p.url), ["https://www.a.com/", "https://www.a.com/about"]);
});
