// Run with: node --experimental-strip-types --test src/lib/safe-fetch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";
import {
  isBlockedIp,
  validateUrlSyntax,
  createSafeFetch,
  safeFetch,
  SafeFetchError,
  type UrlPolicy,
} from "./safe-fetch.ts";

test("blocks private / loopback / link-local / reserved IPv4", () => {
  for (const ip of [
    "0.0.0.0", "10.1.2.3", "127.0.0.1", "127.255.0.9", "169.254.169.254", "172.16.0.1",
    "172.31.255.255", "192.168.1.1", "100.64.0.1", "100.127.255.255", "192.0.0.5", "198.18.0.1",
    "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
  ]) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
});

test("allows normal public IPv4", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1"]) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test("blocks private / special IPv6 forms", () => {
  for (const ip of [
    "::", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1", "64:ff9b::a00:1", "2002:7f00:1::1", "2002:0a00:0001::", "fec0::1", "2001::1",
  ]) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
});

test("allows public IPv6 and mapped public IPv4", () => {
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8", "64:ff9b::808:808"]) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test("garbage is blocked", () => {
  assert.equal(isBlockedIp("not-an-ip"), true);
  assert.equal(isBlockedIp(""), true);
});

test("URL syntax: scheme, creds, port, hostnames", () => {
  const bad = [
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://user:pw@example.com/",
    "http://example.com:8080/",
    "http://example.com:6379/",
    "http://localhost/",
    "http://localhost./",
    "http://foo.localhost/",
    "http://intranet/",
    "http://router.local/",
    "http://metadata.google.internal/",
    "http://127.0.0.1/",
    "http://2130706433/", // decimal form of 127.0.0.1, normalized by URL parser
    "http://0x7f.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "not a url",
  ];
  for (const u of bad) {
    assert.throws(() => validateUrlSyntax(u), SafeFetchError, u);
  }
  for (const u of ["https://example.com/", "http://example.com/a?b=1", "https://sub.example.co.uk:443/x", "http://8.8.8.8/"]) {
    assert.doesNotThrow(() => validateUrlSyntax(u), u);
  }
});

test("strict safeFetch refuses a local server (no network reached)", async () => {
  const server = http.createServer((_req, res) => res.end("secret"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as AddressInfo).port;
  try {
    await assert.rejects(() => safeFetch(`http://127.0.0.1:${port}/`), (e: unknown) => {
      return e instanceof SafeFetchError && e.code === "blocked";
    });
    await assert.rejects(() => safeFetch(`http://localhost:${port}/`), SafeFetchError);
  } finally {
    server.close();
  }
});

// ---- Behaviour tests (redirects / size / timeout / gzip) with a TEST-ONLY permissive policy ----
const TEST_POLICY: UrlPolicy = { allowedPorts: null, checkHostnames: false, isIpAllowed: () => true };
const testFetch = createSafeFetch(TEST_POLICY);

function startServer(handler: http.RequestListener) {
  return new Promise<{ base: string; close: () => void }>((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ base: `http://127.0.0.1:${port}`, close: () => { server.closeAllConnections(); server.close(); } });
    });
  });
}

test("reads body, content-type and final URL", async () => {
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end("<h1>hello</h1>");
  });
  try {
    const r = await testFetch(`${s.base}/x`);
    assert.equal(r.ok, true);
    assert.equal(r.text, "<h1>hello</h1>");
    assert.equal(r.url, `${s.base}/x`);
    assert.match(r.contentType, /text\/html/);
  } finally { s.close(); }
});

test("follows redirects and stops at the limit", async () => {
  const s = await startServer((req, res) => {
    if (req.url === "/a") { res.statusCode = 302; res.setHeader("location", "/b"); return res.end(); }
    if (req.url === "/b") { res.setHeader("content-type", "text/plain"); return res.end("done"); }
    res.statusCode = 302; res.setHeader("location", req.url + "x"); res.end();
  });
  try {
    const ok = await testFetch(`${s.base}/a`);
    assert.equal(ok.text, "done");
    assert.equal(ok.url, `${s.base}/b`);
    await assert.rejects(() => testFetch(`${s.base}/loop`, { maxRedirects: 3 }), (e: unknown) => {
      return e instanceof SafeFetchError && e.code === "too_many_redirects";
    });
  } finally { s.close(); }
});

test("every redirect hop is re-validated (hostname redirect to localhost is refused)", async () => {
  const hopPolicy: UrlPolicy = { allowedPorts: null, checkHostnames: true, isIpAllowed: () => true };
  const hopFetch = createSafeFetch(hopPolicy);
  const s = await startServer((_req, res) => {
    res.statusCode = 302;
    res.setHeader("location", "http://localhost/admin");
    res.end();
  });
  try {
    await assert.rejects(() => hopFetch(`${s.base}/`), (e: unknown) => {
      return e instanceof SafeFetchError && e.code === "blocked";
    });
  } finally { s.close(); }
});

test("body is truncated at maxBytes", async () => {
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "text/plain");
    res.end("a".repeat(100_000));
  });
  try {
    const r = await testFetch(`${s.base}/`, { maxBytes: 5000 });
    assert.equal(r.truncated, true);
    assert.equal(r.text.length, 5000);
  } finally { s.close(); }
});

test("gzip is decoded and the cap applies AFTER decompression (zip bomb)", async () => {
  const big = Buffer.alloc(5_000_000, 97);
  const gz = zlib.gzipSync(big);
  assert.ok(gz.length < 20_000);
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "text/plain");
    res.setHeader("content-encoding", "gzip");
    res.end(gz);
  });
  try {
    const r = await testFetch(`${s.base}/`, { maxBytes: 100_000 });
    assert.equal(r.truncated, true);
    assert.equal(r.text.length, 100_000);
  } finally { s.close(); }
});

test("small gzip body decodes fully", async () => {
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.setHeader("content-encoding", "gzip");
    res.end(zlib.gzipSync("<p>hi there</p>"));
  });
  try {
    const r = await testFetch(`${s.base}/`);
    assert.equal(r.text, "<p>hi there</p>");
    assert.equal(r.truncated, false);
  } finally { s.close(); }
});

test("content-type filter skips the body", async () => {
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "application/pdf");
    res.end("%PDF-1.4 ...");
  });
  try {
    const r = await testFetch(`${s.base}/`, { requireContentType: /html/i });
    assert.equal(r.bodySkipped, true);
    assert.equal(r.text, "");
    assert.equal(r.ok, true);
  } finally { s.close(); }
});

test("slow server hits the total timeout", async () => {
  const s = await startServer((_req, res) => {
    res.setHeader("content-type", "text/plain");
    res.write("start");
    // never ends
  });
  try {
    const t0 = Date.now();
    await assert.rejects(() => testFetch(`${s.base}/`, { timeoutMs: 400 }), (e: unknown) => {
      return e instanceof SafeFetchError && e.code === "timeout";
    });
    assert.ok(Date.now() - t0 < 2000);
  } finally { s.close(); }
});

test("non-2xx reports ok=false with status", async () => {
  const s = await startServer((_req, res) => { res.statusCode = 404; res.end("nope"); });
  try {
    const r = await testFetch(`${s.base}/`);
    assert.equal(r.ok, false);
    assert.equal(r.status, 404);
  } finally { s.close(); }
});

test("DNS-time check: a hostname that RESOLVES to loopback is refused at connect (rebinding guard)", async () => {
  const s = await startServer((_req, res) => res.end("secret"));
  const port = Number(new URL(s.base).port);
  // hostname checks off, so only the connect-time lookup check can stop it
  const lookupOnly = createSafeFetch({ allowedPorts: null, checkHostnames: false, isIpAllowed: (ip) => !isBlockedIp(ip) });
  try {
    await assert.rejects(() => lookupOnly(`http://localhost:${port}/`), (e: unknown) => {
      return e instanceof SafeFetchError && e.code === "blocked";
    });
  } finally { s.close(); }
});
