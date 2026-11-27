import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPaidCents,
  configPriceCents,
  resolvePaidAmount,
} from "./patreon-amount.ts";

const member = (attrs: Record<string, unknown>, included: unknown[] = []) => ({
  data: { type: "member", attributes: attrs },
  included: included as Array<{ type: string; attributes?: Record<string, unknown> }>,
});

test("reads currently_entitled_amount_cents", () => {
  assert.equal(extractPaidCents(member({ currently_entitled_amount_cents: 3599 })), 3599);
});

test("falls back to will_pay_amount_cents when entitled is 0", () => {
  assert.equal(
    extractPaidCents(member({ currently_entitled_amount_cents: 0, will_pay_amount_cents: 3999 })),
    3999
  );
});

test("annual cadence is divided to monthly", () => {
  assert.equal(
    extractPaidCents(member({ currently_entitled_amount_cents: 43188, pledge_cadence: 12 })),
    3599
  );
});

test("non-USD campaign is ignored", () => {
  const p = member({ currently_entitled_amount_cents: 3599 }, [
    { type: "campaign", attributes: { currency: "EUR" } },
  ]);
  assert.equal(extractPaidCents(p), null);
});

test("USD campaign is accepted", () => {
  const p = member({ currently_entitled_amount_cents: 3599 }, [
    { type: "campaign", attributes: { currency: "USD" } },
  ]);
  assert.equal(extractPaidCents(p), 3599);
});

test("garbage / out of range amounts are ignored", () => {
  assert.equal(extractPaidCents(member({ currently_entitled_amount_cents: 5 })), null);
  assert.equal(extractPaidCents(member({ currently_entitled_amount_cents: 99999999 })), null);
  assert.equal(extractPaidCents(member({ currently_entitled_amount_cents: "abc" })), null);
  assert.equal(extractPaidCents({}), null);
});

test("string cents are accepted", () => {
  assert.equal(extractPaidCents(member({ currently_entitled_amount_cents: "3599" })), 3599);
});

test("config price: chatbot builder 39.99, unknown null", () => {
  assert.equal(configPriceCents(["Chatbot Builder"]), 3999);
  assert.equal(configPriceCents(["Something Else"]), null);
});

test("resolvePaidAmount order: payload > config > default", () => {
  assert.deepEqual(resolvePaidAmount(member({ currently_entitled_amount_cents: 3599 }), ["Chatbot Builder"]), {
    cents: 3599,
    source: "payload",
  });
  assert.deepEqual(resolvePaidAmount(member({}), ["Chatbot Builder"]), { cents: 3999, source: "config" });
  assert.deepEqual(resolvePaidAmount(member({}), ["All Access"]), { cents: 3999, source: "default" });
});

test("two of our tiers at once: payload sum is ignored, config price used", () => {
  const p = member({ currently_entitled_amount_cents: 6499 });
  assert.deepEqual(resolvePaidAmount(p, ["Chatbot Builder", "Chatbot API"]), {
    cents: 3999,
    source: "config",
  });
});
