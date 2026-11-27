// Run with: node --experimental-strip-types --test src/lib/chat-limits-core.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCaps, startOfUtcMonth, startOfUtcDay, nextUtcMidnight, startOfNextUtcMonth,
  pickClientIp, normalizeSessionId, extractTokenUsage, PAID_DAILY_LIMIT, PAID_MONTHLY_LIMIT,
} from "./chat-limits-core.ts";

const NOW = new Date("2026-11-15T13:30:00Z");

test("under both caps is allowed", () => {
  assert.deepEqual(evaluateCaps({ month: 100, day: 10 }, NOW), { allowed: true });
});
test("day cap hits at exactly 500, not 499", () => {
  assert.equal(evaluateCaps({ month: 0, day: PAID_DAILY_LIMIT - 1 }, NOW).allowed, true);
  const r = evaluateCaps({ month: 0, day: PAID_DAILY_LIMIT }, NOW);
  assert.equal(r.allowed, false);
  if (!r.allowed) {
    assert.equal(r.reason, "daily");
    assert.equal(r.retryAfterSeconds, 10.5 * 3600);
  }
});
test("month cap wins when both exhausted; resets on the 1st UTC", () => {
  const r = evaluateCaps({ month: PAID_MONTHLY_LIMIT, day: PAID_DAILY_LIMIT }, NOW);
  assert.equal(r.allowed, false);
  if (!r.allowed) {
    assert.equal(r.reason, "monthly");
    assert.equal(r.retryAfterSeconds, (startOfNextUtcMonth(NOW).getTime() - NOW.getTime()) / 1000);
  }
});
test("UTC boundaries, incl. December rollover", () => {
  assert.equal(startOfUtcMonth(NOW).toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(startOfUtcDay(NOW).toISOString(), "2026-11-15T00:00:00.000Z");
  assert.equal(nextUtcMidnight(NOW).toISOString(), "2026-11-16T00:00:00.000Z");
  assert.equal(startOfNextUtcMonth(new Date("2026-12-31T23:59:59Z")).toISOString(), "2027-01-01T00:00:00.000Z");
});
test("client ip parsing", () => {
  const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;
  assert.equal(pickClientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(pickClientIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(pickClientIp(h({})), "unknown");
});
test("session id validation", () => {
  assert.equal(normalizeSessionId(" abc "), "abc");
  assert.equal(normalizeSessionId(""), null);
  assert.equal(normalizeSessionId("x".repeat(101)), null);
  assert.equal(normalizeSessionId(5), null);
});
test("token usage extraction is defensive", () => {
  assert.deepEqual(extractTokenUsage({ usage: { prompt_tokens: 1200, completion_tokens: 80 } }, "m"),
    { model: "m", promptTokens: 1200, completionTokens: 80 });
  assert.deepEqual(extractTokenUsage({}, "m"), { model: "m", promptTokens: null, completionTokens: null });
  assert.deepEqual(extractTokenUsage({ usage: { prompt_tokens: -1, completion_tokens: "x" } }, "m"),
    { model: "m", promptTokens: null, completionTokens: null });
});
