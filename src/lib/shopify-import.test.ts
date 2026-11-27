// Run with: node --experimental-strip-types --test src/lib/shopify-import.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { importShopifyProducts } from "./shopify-import.ts";
import { SafeFetchError, type SafeFetchResult } from "./safe-fetch.ts";

type Reply = Partial<SafeFetchResult> | Error | (() => Partial<SafeFetchResult>);

function fake(routes: Record<string, Reply | Reply[]>, log: string[] = []) {
  const counters: Record<string, number> = {};
  return (async (url: string | URL): Promise<SafeFetchResult> => {
    const u = String(url);
    log.push(u);
    const key = Object.keys(routes).find((k) => u.startsWith(k));
    if (!key) return { ok: false, status: 404, url: u, contentType: "text/html", text: "", truncated: false, bodySkipped: true };
    let r = routes[key];
    if (Array.isArray(r)) {
      const i = counters[key] ?? 0;
      counters[key] = i + 1;
      r = r[Math.min(i, r.length - 1)];
    }
    if (typeof r === "function") r = r();
    if (r instanceof Error) throw r;
    return { ok: true, status: 200, url: u, contentType: "application/json", text: "", truncated: false, bodySkipped: false, ...r };
  }) as unknown as typeof import("./safe-fetch.ts").safeFetch;
}

const prod = (n: number) => ({
  id: n,
  title: `P${n}`,
  handle: `p-${n}`,
  variants: [{ title: "Default Title", price: "10.00", available: true }],
  options: [],
});
const page = (from: number, count: number) => JSON.stringify({ products: Array.from({ length: count }, (_, i) => prod(from + i)) });
const noSleep = async () => {};
const O = "https://shop.test";

test("pages through products.json until a short page; reads currency from meta.json", async () => {
  const log: string[] = [];
  const f = fake(
    {
      [`${O}/meta.json`]: { text: '{"currency":"gbp"}' },
      [`${O}/products.json?limit=250&page=1`]: { text: page(1, 250) },
      [`${O}/products.json?limit=250&page=2`]: { text: page(251, 250) },
      [`${O}/products.json?limit=250&page=3`]: { text: page(501, 37) },
    },
    log
  );
  const r = await importShopifyProducts(O, 2000, { fetcher: f, sleep: noSleep });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.products.length, 537);
  assert.equal(r.currency, "GBP");
  assert.equal(r.capped, false);
  assert.equal(r.partial, false);
  assert.equal(r.products[0].url, `${O}/products/p-1`);
  assert.equal(log.filter((u) => u.includes("products.json")).length, 3);
});

test("hard cap: stops at the cap, reports capped, does not fetch endlessly", async () => {
  const log: string[] = [];
  const routes: Record<string, Reply> = { [`${O}/meta.json`]: { text: "{}" } };
  for (let p = 1; p <= 20; p++) routes[`${O}/products.json?limit=250&page=${p}`] = { text: page((p - 1) * 250 + 1, 250) };
  const r = await importShopifyProducts(O, 600, { fetcher: fake(routes, log), sleep: noSleep });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.products.length, 600);
  assert.equal(r.capped, true);
  assert.ok(log.filter((u) => u.includes("products.json")).length <= 4);
});

test("exactly cap products and a short last page is NOT capped", async () => {
  const f = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json?limit=250&page=1`]: { text: page(1, 100) } });
  const r = await importShopifyProducts(O, 100, { fetcher: f, sleep: noSleep });
  assert.ok(r.ok && !r.capped && r.products.length === 100);
});

test("404 -> not_shopify; redirect to /password -> password; 401 -> password", async () => {
  const f404 = fake({ [`${O}/products.json`]: { ok: false, status: 404, text: "" } });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: f404, sleep: noSleep }), { ok: false, code: "not_shopify" });

  const fPw = fake({ [`${O}/products.json`]: { url: `${O}/password`, contentType: "text/html", bodySkipped: true } });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: fPw, sleep: noSleep }), { ok: false, code: "password" });

  const f401 = fake({ [`${O}/products.json`]: { ok: false, status: 401 } });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: f401, sleep: noSleep }), { ok: false, code: "password" });

  const fHtml = fake({ [`${O}/products.json`]: { contentType: "text/html", bodySkipped: true } });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: fHtml, sleep: noSleep }), { ok: false, code: "not_shopify" });
});

test("429 is retried with backoff and then succeeds", async () => {
  const sleeps: number[] = [];
  const f = fake({
    [`${O}/meta.json`]: { text: "{}" },
    [`${O}/products.json?limit=250&page=1`]: [{ ok: false, status: 429 }, { ok: false, status: 429 }, { text: page(1, 5) }],
  });
  const r = await importShopifyProducts(O, 100, { fetcher: f, sleep: async (ms) => void sleeps.push(ms) });
  assert.ok(r.ok && r.products.length === 5);
  assert.deepEqual(sleeps, [1000, 2000]);
});

test("429 forever on page 1 -> rate_limited; 429 on a later page -> partial result kept", async () => {
  const always = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json`]: { ok: false, status: 429 } });
  assert.deepEqual(await importShopifyProducts(O, 100, { fetcher: always, sleep: noSleep }), { ok: false, code: "rate_limited" });

  const later = fake({
    [`${O}/meta.json`]: { text: "{}" },
    [`${O}/products.json?limit=250&page=1`]: { text: page(1, 250) },
    [`${O}/products.json?limit=250&page=2`]: { ok: false, status: 429 },
  });
  const r = await importShopifyProducts(O, 2000, { fetcher: later, sleep: noSleep });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.products.length, 250);
    assert.equal(r.partial, true);
  }
});

test("truncated page (too big) restarts with smaller pages", async () => {
  const log: string[] = [];
  const f = fake(
    {
      [`${O}/meta.json`]: { text: "{}" },
      [`${O}/products.json?limit=250&page=1`]: { truncated: true, text: '{"products":[{"id"' },
      [`${O}/products.json?limit=100&page=1`]: { text: page(1, 100) },
      [`${O}/products.json?limit=100&page=2`]: { text: page(101, 20) },
    },
    log
  );
  const r = await importShopifyProducts(O, 2000, { fetcher: f, sleep: noSleep });
  assert.ok(r.ok && r.products.length === 120);
});

test("SSRF block and network errors map to codes; empty store -> empty", async () => {
  const blocked = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json`]: new SafeFetchError("blocked", "no") });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: blocked, sleep: noSleep }), { ok: false, code: "blocked" });
  const down = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json`]: new SafeFetchError("network", "x") });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: down, sleep: noSleep }), { ok: false, code: "unreachable" });
  const empty = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json`]: { text: '{"products":[]}' } });
  assert.deepEqual(await importShopifyProducts(O, 10, { fetcher: empty, sleep: noSleep }), { ok: false, code: "empty" });
});

test("duplicate ids and unusable products are skipped", async () => {
  const text = JSON.stringify({ products: [prod(1), prod(1), { id: 2, title: "", handle: "x" }, prod(3)] });
  const f = fake({ [`${O}/meta.json`]: { text: "{}" }, [`${O}/products.json`]: { text } });
  const r = await importShopifyProducts(O, 100, { fetcher: f, sleep: noSleep });
  assert.ok(r.ok && r.products.length === 2);
});

test("currencyOverride wins over meta.json", async () => {
  const f = fake({ [`${O}/meta.json`]: { text: '{"currency":"USD"}' }, [`${O}/products.json`]: { text: page(1, 1) } });
  const r = await importShopifyProducts(O, 10, { fetcher: f, sleep: noSleep, currencyOverride: "bdt" });
  assert.ok(r.ok && r.currency === "BDT" && r.products[0].currency === "BDT");
});
