// Run with: node --experimental-strip-types --test src/lib/profile-validation.test.ts
// Note: this file is excluded from the Next.js build's type-check (see
// tsconfig.json "exclude") because it's meant to run standalone via Node's
// test runner, not as part of the app bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProfileInput } from "./profile-validation";

test("all fields empty is valid — nothing is mandatory", () => {
  const result = validateProfileInput({});
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, {
      full_name: null,
      username: null,
      company_name: null,
      website_url: null,
      country: null,
    });
  }
});

test("trims whitespace and accepts a fully valid submission", () => {
  const result = validateProfileInput({
    full_name: "  Jane Doe  ",
    username: "jane_doe1",
    company_name: "  Acme Inc  ",
    website_url: "example.com",
    country: "Bangladesh",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.full_name, "Jane Doe");
    assert.equal(result.data.username, "jane_doe1");
    assert.equal(result.data.company_name, "Acme Inc");
    assert.equal(result.data.website_url, "https://example.com/");
    assert.equal(result.data.country, "Bangladesh");
  }
});

test("rejects an invalid username format", () => {
  const result = validateProfileInput({ username: "a" }); // too short
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.includes("Username")));
  }
});

test("rejects a username with spaces or symbols", () => {
  const result = validateProfileInput({ username: "not a valid username!" });
  assert.equal(result.ok, false);
});

test("normalizes a website URL without a scheme", () => {
  const result = validateProfileInput({ website_url: "mysite.io" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.website_url, "https://mysite.io/");
});

test("rejects a garbage website value", () => {
  const result = validateProfileInput({ website_url: "not a url at all!!" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((e) => e.includes("website")));
});

test("rejects a country not in the known list", () => {
  const result = validateProfileInput({ country: "Wakanda" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((e) => e.includes("country")));
});

test("rejects an over-length full name", () => {
  const result = validateProfileInput({ full_name: "x".repeat(101) });
  assert.equal(result.ok, false);
});

test("collects multiple errors at once rather than stopping at the first", () => {
  const result = validateProfileInput({ username: "!", country: "Nowhereland" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errors.length, 2);
});
