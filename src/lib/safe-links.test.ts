// Run with: node --experimental-strip-types --test src/lib/safe-links.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitLinks, toSafeHttpUrl, restrictReplyLinks, extractHosts } from "./safe-links.ts";

const links = (t: string) => splitLinks(t).filter((p) => p.type === "link");

test("toSafeHttpUrl accepts http(s) only", () => {
  assert.equal(toSafeHttpUrl("https://shop.com/products/a"), "https://shop.com/products/a");
  assert.equal(toSafeHttpUrl("javascript:alert(1)"), null);
  assert.equal(toSafeHttpUrl("data:text/html,<script>"), null);
  assert.equal(toSafeHttpUrl("ftp://x.com/a"), null);
  assert.equal(toSafeHttpUrl("https://user:pw@evil.com/"), null);
  assert.equal(toSafeHttpUrl("https://localhost/"), null);
  assert.equal(toSafeHttpUrl("not a url"), null);
});

test("bare URL becomes a link, trailing punctuation stays text", () => {
  const parts = splitLinks("Try https://shop.com/products/blue-hoodie. It is great!");
  assert.deepEqual(parts, [
    { type: "text", text: "Try " },
    { type: "link", text: "https://shop.com/products/blue-hoodie", href: "https://shop.com/products/blue-hoodie" },
    { type: "text", text: ". It is great!" },
  ]);
});

test("URL in parentheses: closing paren is not part of the URL, balanced paren is", () => {
  const a = links("(see https://shop.com/a)");
  assert.equal((a[0] as { href: string }).href, "https://shop.com/a");
  const b = links("https://en.wikipedia.org/wiki/Foo_(bar) ok");
  assert.equal((b[0] as { href: string }).href, "https://en.wikipedia.org/wiki/Foo_(bar)");
});

test("markdown link shows its label; label that looks like a URL is replaced by the real target", () => {
  const ok = links("[Blue hoodie](https://shop.com/products/blue)");
  assert.deepEqual(ok[0], { type: "link", text: "Blue hoodie", href: "https://shop.com/products/blue" });
  const sneaky = links("[https://shop.com](https://evil.example/phish)");
  assert.deepEqual(sneaky[0], { type: "link", text: "https://evil.example/phish", href: "https://evil.example/phish" });
});

test("javascript: markdown link is not linked", () => {
  assert.equal(links("[click](javascript:alert(1))").length, 0);
  assert.equal(links("click javascript:alert(1)").length, 0);
});

test("HTML in text is never interpreted (no link, plain text parts only)", () => {
  const parts = splitLinks('<a href="https://x.com">x</a> <script>alert(1)</script>');
  for (const p of parts) assert.ok(p.type === "text" || p.href.startsWith("http"));
  assert.ok(parts.map((p) => p.text).join("").includes("<script>"));
});

test("text without links is returned as a single text part", () => {
  assert.deepEqual(splitLinks("Hello there"), [{ type: "text", text: "Hello there" }]);
  assert.deepEqual(splitLinks(""), []);
});

test("restrictReplyLinks keeps allowed hosts (www/subdomain tolerant), removes others", () => {
  const allowed = extractHosts("store https://www.shop.com and link: https://shop.com/products/a");
  assert.ok(allowed.has("shop.com"));
  const out = restrictReplyLinks(
    "Buy https://shop.com/products/a or https://evil.example/x. Also [Hoodie](https://evil.example/y) and [Cap](https://cdn.shop.com/c).",
    allowed
  );
  assert.equal(
    out,
    "Buy https://shop.com/products/a or (link removed). Also Hoodie and [Cap](https://cdn.shop.com/c)."
  );
});

test("restrictReplyLinks does not match lookalike hosts", () => {
  const allowed = new Set(["shop.com"]);
  assert.ok(restrictReplyLinks("https://notshop.com/a", allowed).includes("(link removed)"));
  assert.ok(restrictReplyLinks("https://shop.com.evil.io/a", allowed).includes("(link removed)"));
});
